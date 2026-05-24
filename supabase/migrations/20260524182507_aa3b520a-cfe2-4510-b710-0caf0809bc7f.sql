
ALTER TABLE public.documents
  ADD COLUMN deleted_at timestamptz NULL,
  ADD COLUMN deleted_by uuid NULL;

CREATE INDEX IF NOT EXISTS idx_documents_project_deleted
  ON public.documents (project_id, deleted_at);
