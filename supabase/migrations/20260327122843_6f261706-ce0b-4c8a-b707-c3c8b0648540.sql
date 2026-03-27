
CREATE TABLE public.geo_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page integer NOT NULL,
  control_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  transform_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_error_ft numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(project_id, page)
);

ALTER TABLE public.geo_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view geo calibrations"
  ON public.geo_calibrations FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project creators can manage geo calibrations"
  ON public.geo_calibrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = geo_calibrations.project_id AND projects.created_by = auth.uid()));

CREATE POLICY "Users can manage own geo calibrations"
  ON public.geo_calibrations FOR ALL TO authenticated
  USING (auth.uid() = user_id);
