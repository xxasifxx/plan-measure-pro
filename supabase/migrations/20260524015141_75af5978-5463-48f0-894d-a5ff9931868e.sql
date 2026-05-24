
-- 2. Extend daily_reports
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.daily_reports
  DROP CONSTRAINT IF EXISTS daily_reports_status_chk;
ALTER TABLE public.daily_reports
  ADD CONSTRAINT daily_reports_status_chk
  CHECK (status IN ('draft','submitted','approved','rejected'));

CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports(project_id, status, report_date DESC);

-- 3. Comments table
CREATE TABLE IF NOT EXISTS public.daily_report_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_report_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view report comments" ON public.daily_report_comments;
CREATE POLICY "Members view report comments"
  ON public.daily_report_comments FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

DROP POLICY IF EXISTS "Members add comments on accessible reports" ON public.daily_report_comments;
CREATE POLICY "Members add comments on accessible reports"
  ON public.daily_report_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_project_member(auth.uid(), project_id)
  );

-- 4. Status transition trigger
CREATE OR REPLACE FUNCTION public.daily_reports_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft'     AND NEW.status = 'submitted') OR
      (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected')) OR
      (OLD.status = 'rejected'  AND NEW.status = 'draft')
    ) THEN
      RAISE EXCEPTION 'Illegal daily_report status transition: % -> %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'submitted' THEN
      NEW.submitted_at := COALESCE(NEW.submitted_at, now());
      NEW.approved_at := NULL; NEW.approved_by := NULL;
      NEW.rejected_at := NULL; NEW.rejected_by := NULL; NEW.reject_reason := NULL;
    ELSIF NEW.status = 'approved' THEN
      NEW.approved_at := now();
      NEW.approved_by := auth.uid();
    ELSIF NEW.status = 'rejected' THEN
      IF NEW.reject_reason IS NULL OR length(trim(NEW.reject_reason)) = 0 THEN
        RAISE EXCEPTION 'reject_reason is required when rejecting a daily report';
      END IF;
      NEW.rejected_at := now();
      NEW.rejected_by := auth.uid();
    ELSIF NEW.status = 'draft' THEN
      NEW.submitted_at := NULL;
      NEW.approved_at := NULL; NEW.approved_by := NULL;
      NEW.rejected_at := NULL; NEW.rejected_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_reports_status_transition ON public.daily_reports;
CREATE TRIGGER trg_daily_reports_status_transition
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.daily_reports_status_transition();

-- 5. RLS — replace permissive policy
DROP POLICY IF EXISTS "Users manage own reports" ON public.daily_reports;

DROP POLICY IF EXISTS "Owner inserts own draft report" ON public.daily_reports;
CREATE POLICY "Owner inserts own draft report"
  ON public.daily_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_project_member(auth.uid(), project_id) AND status = 'draft');

DROP POLICY IF EXISTS "Owner updates own draft report" ON public.daily_reports;
CREATE POLICY "Owner updates own draft report"
  ON public.daily_reports FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft','rejected'))
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner deletes own draft report" ON public.daily_reports;
CREATE POLICY "Owner deletes own draft report"
  ON public.daily_reports FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

DROP POLICY IF EXISTS "RE updates submitted report" ON public.daily_reports;
CREATE POLICY "RE updates submitted report"
  ON public.daily_reports FOR UPDATE
  USING (
    public.is_project_member(auth.uid(), project_id)
    AND public.has_role(auth.uid(), 'resident_engineer')
    AND status = 'submitted'
  )
  WITH CHECK (
    public.is_project_member(auth.uid(), project_id)
    AND public.has_role(auth.uid(), 'resident_engineer')
  );

DROP POLICY IF EXISTS "Project creator updates report" ON public.daily_reports;
CREATE POLICY "Project creator updates report"
  ON public.daily_reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = daily_reports.project_id AND created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = daily_reports.project_id AND created_by = auth.uid()));

-- 6. Approved-only flattening view
CREATE OR REPLACE VIEW public.v_approved_pay_item_quantities AS
SELECT
  dr.project_id,
  dr.report_date,
  dr.user_id        AS inspector_id,
  dr.approved_at,
  dr.approved_by,
  (item->>'pay_item_id')::uuid       AS pay_item_id,
  item->>'item_code'                 AS item_code,
  item->>'name'                      AS pay_item_name,
  item->>'unit'                      AS unit,
  COALESCE((item->>'delta_quantity')::numeric, 0)    AS delta_quantity,
  COALESCE((item->>'new_cumulative')::numeric, 0)    AS new_cumulative,
  item->>'notes'                     AS notes
FROM public.daily_reports dr
CROSS JOIN LATERAL jsonb_array_elements(dr.snapshot) AS item
WHERE dr.status = 'approved';

COMMENT ON VIEW public.v_approved_pay_item_quantities IS
  'Approved pay-item quantities. Source of truth for PM dashboards, exports, and P6 round-trip — never reads pending or rejected snapshots.';
