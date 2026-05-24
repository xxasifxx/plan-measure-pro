
-- Archive of prior daily report snapshots (kept on rejection/reopen)
CREATE TABLE public.daily_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL,
  project_id uuid NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_reason text,
  reject_reason text
);
CREATE INDEX idx_daily_report_snapshots_report ON public.daily_report_snapshots(daily_report_id, archived_at DESC);

ALTER TABLE public.daily_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view snapshots"
  ON public.daily_report_snapshots FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

-- Snapshots are only inserted by triggers; no direct INSERT/UPDATE/DELETE policies.

-- In-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications are inserted only by triggers (SECURITY DEFINER); no INSERT policy.

-- Status-change side effects: notifications + snapshot archive
CREATE OR REPLACE FUNCTION public.daily_reports_status_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  re_user uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Archive prior snapshot when reopening a rejected report
    IF OLD.status = 'rejected' AND NEW.status = 'draft' THEN
      INSERT INTO public.daily_report_snapshots (daily_report_id, project_id, snapshot, archived_reason, reject_reason)
      VALUES (OLD.id, OLD.project_id, OLD.snapshot, 'reopen_after_reject', OLD.reject_reason);
    END IF;

    -- Notify REs when a report is submitted
    IF NEW.status = 'submitted' THEN
      FOR re_user IN
        SELECT ur.user_id
        FROM public.user_roles ur
        WHERE ur.role = 'resident_engineer'
          AND public.is_project_member(ur.user_id, NEW.project_id)
      LOOP
        INSERT INTO public.notifications (user_id, project_id, kind, payload)
        VALUES (re_user, NEW.project_id, 'report_submitted',
          jsonb_build_object('daily_report_id', NEW.id, 'report_date', NEW.report_date, 'inspector_id', NEW.user_id));
      END LOOP;
    END IF;

    -- Notify inspector on approve/reject
    IF NEW.status IN ('approved', 'rejected') THEN
      INSERT INTO public.notifications (user_id, project_id, kind, payload)
      VALUES (NEW.user_id, NEW.project_id,
        CASE WHEN NEW.status = 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
        jsonb_build_object('daily_report_id', NEW.id, 'report_date', NEW.report_date,
                           'reject_reason', NEW.reject_reason));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the existing status transition trigger if missing, and add side-effects trigger
DROP TRIGGER IF EXISTS trg_daily_reports_status_transition ON public.daily_reports;
CREATE TRIGGER trg_daily_reports_status_transition
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.daily_reports_status_transition();

DROP TRIGGER IF EXISTS trg_daily_reports_status_side_effects ON public.daily_reports;
CREATE TRIGGER trg_daily_reports_status_side_effects
  AFTER UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.daily_reports_status_side_effects();

-- Backfill: give every existing admin the resident_engineer role so the RE queue is usable
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'resident_engineer'::app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
