
-- 1) Lock approval to REs at the DB layer.
--    Project creators (PMs) can no longer update daily_reports rows; only the
--    inspector (own draft/rejected) and REs (submitted -> approved/rejected) can.
DROP POLICY IF EXISTS "Project creator updates report" ON public.daily_reports;

-- Defense-in-depth: hard guard inside the status-transition trigger so even a
-- service-role bypass cannot mark a report approved without an RE caller.
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

    IF NEW.status IN ('approved','rejected') THEN
      IF auth.uid() IS NULL
         OR NOT public.has_role(auth.uid(), 'resident_engineer')
         OR NOT public.is_project_member(auth.uid(), NEW.project_id) THEN
        RAISE EXCEPTION 'Only a Resident Engineer assigned to this project may approve or reject reports';
      END IF;
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

-- 2) Project-local day bucketing.
--    Add work_date to annotations so evening East-Coast edits land on the
--    intended calendar day rather than the UTC bucket.
ALTER TABLE public.annotations
  ADD COLUMN IF NOT EXISTS work_date date;

-- Backfill existing rows using America/New_York (project timezone).
UPDATE public.annotations
   SET work_date = (created_at AT TIME ZONE 'America/New_York')::date
 WHERE work_date IS NULL;

-- Default to today's project-local date for new rows that don't supply it.
ALTER TABLE public.annotations
  ALTER COLUMN work_date SET DEFAULT ((now() AT TIME ZONE 'America/New_York')::date);

ALTER TABLE public.annotations
  ALTER COLUMN work_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_annotations_project_user_workdate
  ON public.annotations(project_id, user_id, work_date);
