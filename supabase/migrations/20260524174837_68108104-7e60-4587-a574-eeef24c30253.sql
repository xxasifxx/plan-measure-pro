
-- ============================================================================
-- 1) Folder + document tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.document_folders(id) ON DELETE RESTRICT,
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  system_kind text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_folders_system_kind_chk CHECK (
    system_kind IS NULL OR system_kind IN (
      'plans','specs','rfis','submittals','shop_drawings',
      'change_orders','daily_reports','photos','as_builts','correspondence'
    )
  )
);

-- Case-insensitive uniqueness within (project, parent). Use partial indexes to
-- handle NULL parent_id (top-level folders).
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_folders_top_name
  ON public.document_folders(project_id, lower(name))
  WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_folders_child_name
  ON public.document_folders(project_id, parent_id, lower(name))
  WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_folders_project ON public.document_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON public.document_folders(parent_id);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.document_folders(id) ON DELETE RESTRICT,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  replaces_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  source_kind text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_replaces ON public.documents(replaces_document_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_document_folders_updated ON public.document_folders;
CREATE TRIGGER trg_document_folders_updated
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent deleting a folder that still contains files or subfolders.
CREATE OR REPLACE FUNCTION public.document_folders_block_nonempty_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.documents WHERE folder_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete folder "%": it still contains documents. Move or delete them first.', OLD.name;
  END IF;
  IF EXISTS (SELECT 1 FROM public.document_folders WHERE parent_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete folder "%": it still contains subfolders. Move or delete them first.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_document_folders_block_nonempty ON public.document_folders;
CREATE TRIGGER trg_document_folders_block_nonempty
  BEFORE DELETE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.document_folders_block_nonempty_delete();

-- ============================================================================
-- 2) RLS
-- ============================================================================
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Folders: members read; PM (project creator) or admin writes.
DROP POLICY IF EXISTS "Members view folders" ON public.document_folders;
CREATE POLICY "Members view folders" ON public.document_folders
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "PMs manage folders" ON public.document_folders;
CREATE POLICY "PMs manage folders" ON public.document_folders
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = document_folders.project_id AND p.created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = document_folders.project_id AND p.created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Documents: members read.
DROP POLICY IF EXISTS "Members view documents" ON public.documents;
CREATE POLICY "Members view documents" ON public.documents
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));

-- PM / admin full write.
DROP POLICY IF EXISTS "PMs manage documents" ON public.documents;
CREATE POLICY "PMs manage documents" ON public.documents
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = documents.project_id AND p.created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = documents.project_id AND p.created_by = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Inspectors (any project member who isn't PM/admin) can ONLY insert into
-- folders whose system_kind is 'photos' or 'daily_reports'.
DROP POLICY IF EXISTS "Inspectors upload to photos and daily_reports" ON public.documents;
CREATE POLICY "Inspectors upload to photos and daily_reports" ON public.documents
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND public.is_project_member(auth.uid(), project_id)
    AND EXISTS (
      SELECT 1 FROM public.document_folders f
      WHERE f.id = documents.folder_id
        AND f.project_id = documents.project_id
        AND f.system_kind IN ('photos','daily_reports')
    )
  );

-- ============================================================================
-- 3) Storage bucket + policies
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents','project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {project_id}/{document_id}.{ext}
-- Anyone on the project can read; PM/admin can write/delete; inspectors can
-- upload blobs (the documents-row RLS gates which folders they end up in).
DROP POLICY IF EXISTS "Members read project documents" ON storage.objects;
CREATE POLICY "Members read project documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Members upload project documents" ON storage.objects;
CREATE POLICY "Members upload project documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "PMs manage project documents storage" ON storage.objects;
CREATE POLICY "PMs manage project documents storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = ((storage.foldername(name))[1])::uuid
          AND p.created_by = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "PMs update project documents storage" ON storage.objects;
CREATE POLICY "PMs update project documents storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = ((storage.foldername(name))[1])::uuid
          AND p.created_by = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================================
-- 4) Seed standard folders for a project (idempotent)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_project_standard_folders(_project_id uuid, _user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seeds text[][] := ARRAY[
    ARRAY['Plans','plans'],
    ARRAY['Specs','specs'],
    ARRAY['RFIs','rfis'],
    ARRAY['Submittals','submittals'],
    ARRAY['Shop Drawings','shop_drawings'],
    ARRAY['Change Orders','change_orders'],
    ARRAY['Daily Reports','daily_reports'],
    ARRAY['Photos','photos'],
    ARRAY['As-Builts','as_builts'],
    ARRAY['Correspondence','correspondence']
  ];
  s text[];
BEGIN
  FOREACH s SLICE 1 IN ARRAY seeds LOOP
    INSERT INTO public.document_folders (project_id, name, is_system, system_kind, created_by)
    VALUES (_project_id, s[1], true, s[2], _user)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Auto-seed on new project
CREATE OR REPLACE FUNCTION public.projects_seed_folders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_project_standard_folders(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_seed_folders ON public.projects;
CREATE TRIGGER trg_projects_seed_folders
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_seed_folders();

-- ============================================================================
-- 5) Backfill existing projects: seed folders, surface legacy PDFs
-- ============================================================================
DO $$
DECLARE
  p RECORD;
  plans_id uuid;
  specs_id uuid;
BEGIN
  FOR p IN SELECT id, created_by, pdf_storage_path, specs_storage_path FROM public.projects LOOP
    PERFORM public.seed_project_standard_folders(p.id, p.created_by);

    SELECT id INTO plans_id FROM public.document_folders
      WHERE project_id = p.id AND system_kind = 'plans' LIMIT 1;
    SELECT id INTO specs_id FROM public.document_folders
      WHERE project_id = p.id AND system_kind = 'specs' LIMIT 1;

    IF p.pdf_storage_path IS NOT NULL AND plans_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.documents WHERE storage_path = p.pdf_storage_path) THEN
      INSERT INTO public.documents (project_id, folder_id, name, storage_path, mime_type, uploaded_by, source_kind)
      VALUES (p.id, plans_id, COALESCE(NULLIF(regexp_replace(p.pdf_storage_path, '^.*/', ''), ''), 'Plan.pdf'),
              p.pdf_storage_path, 'application/pdf', p.created_by, 'legacy_plan_pdf');
    END IF;

    IF p.specs_storage_path IS NOT NULL AND specs_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.documents WHERE storage_path = p.specs_storage_path) THEN
      INSERT INTO public.documents (project_id, folder_id, name, storage_path, mime_type, uploaded_by, source_kind)
      VALUES (p.id, specs_id, COALESCE(NULLIF(regexp_replace(p.specs_storage_path, '^.*/', ''), ''), 'Specs.pdf'),
              p.specs_storage_path, 'application/pdf', p.created_by, 'legacy_specs_pdf');
    END IF;
  END LOOP;
END;
$$;
