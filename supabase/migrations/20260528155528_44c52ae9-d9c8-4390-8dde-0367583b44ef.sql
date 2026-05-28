
-- Lock down the 6-arg overload of replace_project_schedule
REVOKE EXECUTE ON FUNCTION public.replace_project_schedule(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_schedule(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;

-- Clean up overlapping RLS on geo_calibrations: keep one SELECT-for-members + one ALL-for-creators
DROP POLICY IF EXISTS "Users can manage own geo calibrations" ON public.geo_calibrations;
DROP POLICY IF EXISTS "Project creators can manage geo calibrations" ON public.geo_calibrations;
DROP POLICY IF EXISTS "Project members can view geo calibrations" ON public.geo_calibrations;

CREATE POLICY "Members view geo calibrations"
ON public.geo_calibrations
FOR SELECT TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Creators manage geo calibrations"
ON public.geo_calibrations
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = geo_calibrations.project_id AND p.created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = geo_calibrations.project_id AND p.created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
