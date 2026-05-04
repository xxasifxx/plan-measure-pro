
-- 1. is_bid flag on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_bid boolean NOT NULL DEFAULT false;

-- 2. schedule_activities
CREATE TABLE public.schedule_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  wbs_code text NOT NULL,
  name text NOT NULL,
  baseline_start date,
  baseline_end date,
  baseline_quantity numeric DEFAULT 0,
  percent_complete numeric DEFAULT 0,
  pay_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view activities" ON public.schedule_activities FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage activities" ON public.schedule_activities FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()));
CREATE TRIGGER trg_sched_act_updated BEFORE UPDATE ON public.schedule_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. rocks
CREATE TABLE public.rocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  quarter text NOT NULL,
  owner_user_id uuid,
  title text NOT NULL,
  target text,
  status text NOT NULL DEFAULT 'on_track',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view rocks" ON public.rocks FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage rocks" ON public.rocks FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()));
CREATE TRIGGER trg_rocks_updated BEFORE UPDATE ON public.rocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. scorecard_metrics
CREATE TABLE public.scorecard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  week_start date NOT NULL,
  metric_key text NOT NULL,
  value numeric DEFAULT 0,
  target numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, week_start, metric_key)
);
ALTER TABLE public.scorecard_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view scorecard" ON public.scorecard_metrics FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage scorecard" ON public.scorecard_metrics FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()));

-- 5. annotation_photos
CREATE TABLE public.annotation_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  annotation_id uuid,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  ai_suggested_pay_item_id uuid,
  ai_confidence numeric,
  ai_rationale text,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.annotation_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view photos" ON public.annotation_photos FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Members upload photos" ON public.annotation_photos FOR INSERT WITH CHECK (public.is_project_member(auth.uid(), project_id) AND auth.uid() = uploaded_by);
CREATE POLICY "Project creators manage photos" ON public.annotation_photos FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()));
CREATE POLICY "Uploaders update own" ON public.annotation_photos FOR UPDATE USING (auth.uid() = uploaded_by);

-- Storage bucket for annotation photos
INSERT INTO storage.buckets (id, name, public) VALUES ('annotation-photos', 'annotation-photos', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Members read annotation photos" ON storage.objects FOR SELECT USING (bucket_id = 'annotation-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Members upload annotation photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'annotation-photos' AND auth.uid() IS NOT NULL);
