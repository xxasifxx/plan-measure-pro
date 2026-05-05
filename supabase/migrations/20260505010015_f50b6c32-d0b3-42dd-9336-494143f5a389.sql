
CREATE TABLE public.activity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, user_id)
);
ALTER TABLE public.activity_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view assignments" ON public.activity_assignments FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage assignments" ON public.activity_assignments FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = activity_assignments.project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = activity_assignments.project_id AND created_by = auth.uid()));

CREATE TABLE public.activity_pay_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.schedule_activities(id) ON DELETE CASCADE,
  pay_item_id uuid NOT NULL REFERENCES public.pay_items(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, pay_item_id)
);
ALTER TABLE public.activity_pay_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view activity pay items" ON public.activity_pay_items FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage activity pay items" ON public.activity_pay_items FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = activity_pay_items.project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = activity_pay_items.project_id AND created_by = auth.uid()));

CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  report_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, report_date)
);
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view project reports" ON public.daily_reports FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Users manage own reports" ON public.daily_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.is_project_member(auth.uid(), project_id));
CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_activity_assignments_user ON public.activity_assignments(user_id, project_id);
CREATE INDEX idx_activity_pay_items_activity ON public.activity_pay_items(activity_id);
CREATE INDEX idx_daily_reports_project_date ON public.daily_reports(project_id, report_date);
