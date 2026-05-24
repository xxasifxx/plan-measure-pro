
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
      (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected','draft')) OR
      (OLD.status = 'rejected'  AND NEW.status = 'draft')
    ) THEN
      RAISE EXCEPTION 'Illegal daily_report status transition: % -> %', OLD.status, NEW.status;
    END IF;

    -- Only the report's author can withdraw a submitted report back to draft.
    IF OLD.status = 'submitted' AND NEW.status = 'draft' THEN
      IF auth.uid() IS NULL OR auth.uid() <> OLD.user_id THEN
        RAISE EXCEPTION 'Only the report author may withdraw a submitted report';
      END IF;
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

-- Owner RLS already covers status IN ('draft','rejected'); add a narrow
-- policy that lets the owner flip 'submitted' -> 'draft' (the trigger
-- enforces the destination must be 'draft').
DROP POLICY IF EXISTS "Owner withdraws own submitted report" ON public.daily_reports;
CREATE POLICY "Owner withdraws own submitted report"
  ON public.daily_reports FOR UPDATE
  USING (auth.uid() = user_id AND status = 'submitted')
  WITH CHECK (auth.uid() = user_id);
