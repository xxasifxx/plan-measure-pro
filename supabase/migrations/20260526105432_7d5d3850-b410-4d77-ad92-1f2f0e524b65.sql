-- Extend schedule_activities with P6 fields
ALTER TABLE public.schedule_activities
  ADD COLUMN IF NOT EXISTS parent_wbs_id uuid NULL REFERENCES public.schedule_activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_id text NULL,
  ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS duration_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_start date NULL,
  ADD COLUMN IF NOT EXISTS actual_finish date NULL,
  ADD COLUMN IF NOT EXISTS early_start date NULL,
  ADD COLUMN IF NOT EXISTS early_finish date NULL,
  ADD COLUMN IF NOT EXISTS late_start date NULL,
  ADD COLUMN IF NOT EXISTS late_finish date NULL,
  ADD COLUMN IF NOT EXISTS total_float_days numeric NULL,
  ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_schedule_activities_parent ON public.schedule_activities(parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_project ON public.schedule_activities(project_id);

-- Relationships table
CREATE TABLE IF NOT EXISTS public.activity_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  pred_activity_id uuid NOT NULL REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  succ_activity_id uuid NOT NULL REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  rel_type text NOT NULL DEFAULT 'FS' CHECK (rel_type IN ('FS','SS','FF','SF')),
  lag_days numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pred_activity_id, succ_activity_id, rel_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_rel_project ON public.activity_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_rel_pred ON public.activity_relationships(pred_activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_rel_succ ON public.activity_relationships(succ_activity_id);

ALTER TABLE public.activity_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view relationships"
  ON public.activity_relationships FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project creators manage relationships"
  ON public.activity_relationships FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid()));

-- Schedule meta
CREATE TABLE IF NOT EXISTS public.project_schedule_meta (
  project_id uuid PRIMARY KEY,
  data_date date NULL,
  calendar jsonb NOT NULL DEFAULT '{"workdays":[1,2,3,4,5]}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_schedule_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view schedule meta"
  ON public.project_schedule_meta FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project creators manage schedule meta"
  ON public.project_schedule_meta FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid()));

CREATE TRIGGER update_project_schedule_meta_updated_at
  BEFORE UPDATE ON public.project_schedule_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();