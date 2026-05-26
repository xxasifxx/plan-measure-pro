
-- 1. STORAGE POLICIES ----------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read project PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own PDFs" ON storage.objects;

CREATE POLICY "Members read project PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.pdf_storage_path = storage.objects.name
      AND public.is_project_member(auth.uid(), p.id)
  )
);

CREATE POLICY "Users upload own project PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Project creators delete project PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.pdf_storage_path = storage.objects.name
      AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can read specs PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload specs PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read specs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload specs" ON storage.objects;

CREATE POLICY "Members read specs PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'specs-pdfs'
  AND public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Project creators upload specs PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'specs-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Project creators delete specs PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'specs-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members read annotation photos" ON storage.objects;
DROP POLICY IF EXISTS "Members upload annotation photos" ON storage.objects;

CREATE POLICY "Members read annotation photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'annotation-photos'
  AND public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Members upload annotation photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'annotation-photos'
  AND public.is_project_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "PMs manage project documents storage" ON storage.objects;
DROP POLICY IF EXISTS "PMs update project documents storage" ON storage.objects;

CREATE POLICY "PMs delete project documents storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ((storage.foldername(storage.objects.name))[1])::uuid
        AND p.created_by = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "PMs update project documents storage"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = ((storage.foldername(storage.objects.name))[1])::uuid
        AND p.created_by = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 2. PROFILES ------------------------------------------------------------
DROP POLICY IF EXISTS "Project creators can search profiles" ON public.profiles;

CREATE POLICY "Project creators view member profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.user_id = profiles.id
      AND p.created_by = auth.uid()
  )
);

-- 3. INVITATIONS ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own invitations" ON public.invitations;

-- 4. DEMO REQUESTS -------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit demo requests" ON public.demo_requests;

CREATE POLICY "Anyone can submit demo requests"
ON public.demo_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  length(name) BETWEEN 1 AND 120
  AND length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(organization) BETWEEN 1 AND 200
  AND length(role) BETWEEN 1 AND 120
  AND (message IS NULL OR length(message) <= 4000)
);

-- 5. SECURITY DEFINER function privileges --------------------------------
DO $$
DECLARE
  r record;
  trigger_only text[] := ARRAY[
    'handle_new_user',
    'assign_owner_role',
    'daily_reports_status_transition',
    'daily_reports_status_side_effects',
    'projects_seed_folders',
    'seed_project_standard_folders'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    IF r.proname = ANY(trigger_only) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- 6. REALTIME authorization ----------------------------------------------
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members subscribe to project channels" ON realtime.messages;

CREATE POLICY "Members subscribe to project channels"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'project:%'
  AND public.is_project_member(
    auth.uid(),
    NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
  )
);
