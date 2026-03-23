-- Allow project creators to search profiles by email (needed for TeamManager)
CREATE POLICY "Project creators can search profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects WHERE created_by = auth.uid()
  )
);