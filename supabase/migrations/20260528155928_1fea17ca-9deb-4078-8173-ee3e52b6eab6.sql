
-- M-8: allow project members to read profiles of others they share a project with
CREATE POLICY "Members view co-member profiles"
ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_members pm_self
    JOIN public.project_members pm_other ON pm_other.project_id = pm_self.project_id
    WHERE pm_self.user_id = auth.uid()
      AND pm_other.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = profiles.id
      AND p.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.created_by = profiles.id
      AND public.is_project_member(auth.uid(), p.id)
  )
);
