
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.resource_type AS ENUM ('labor','material','equipment','nonlabor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CALENDARS ============
CREATE TABLE IF NOT EXISTS public.schedule_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  hours_per_day numeric NOT NULL DEFAULT 8,
  workweek jsonb NOT NULL DEFAULT '{"0":0,"1":8,"2":8,"3":8,"4":8,"5":8,"6":0}'::jsonb,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedule_calendars_project ON public.schedule_calendars(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_calendars_default
  ON public.schedule_calendars(project_id) WHERE is_default;

ALTER TABLE public.schedule_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view calendars" ON public.schedule_calendars
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage calendars" ON public.schedule_calendars
  FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = schedule_calendars.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = schedule_calendars.project_id AND p.created_by = auth.uid()));

CREATE TRIGGER trg_schedule_calendars_updated
  BEFORE UPDATE ON public.schedule_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RESOURCES ============
CREATE TABLE IF NOT EXISTS public.schedule_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  resource_code text,
  resource_type public.resource_type NOT NULL DEFAULT 'labor',
  unit text NOT NULL DEFAULT 'hr',
  cost_per_unit numeric NOT NULL DEFAULT 0,
  max_units_per_day numeric NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedule_resources_project ON public.schedule_resources(project_id);
ALTER TABLE public.schedule_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view resources" ON public.schedule_resources
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage resources" ON public.schedule_resources
  FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = schedule_resources.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = schedule_resources.project_id AND p.created_by = auth.uid()));

CREATE TRIGGER trg_schedule_resources_updated
  BEFORE UPDATE ON public.schedule_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RESOURCE ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS public.activity_resource_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  budgeted_units numeric NOT NULL DEFAULT 0,
  actual_units numeric NOT NULL DEFAULT 0,
  remaining_units numeric NOT NULL DEFAULT 0,
  budgeted_cost numeric NOT NULL DEFAULT 0,
  actual_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ara_project ON public.activity_resource_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_ara_activity ON public.activity_resource_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_ara_resource ON public.activity_resource_assignments(resource_id);

ALTER TABLE public.activity_resource_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view assignments" ON public.activity_resource_assignments
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage assignments" ON public.activity_resource_assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = activity_resource_assignments.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = activity_resource_assignments.project_id AND p.created_by = auth.uid()));

CREATE TRIGGER trg_ara_updated
  BEFORE UPDATE ON public.activity_resource_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BASELINES ============
CREATE TABLE IF NOT EXISTS public.schedule_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  notes text,
  captured_by uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_baselines_project ON public.schedule_baselines(project_id);
ALTER TABLE public.schedule_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view baselines" ON public.schedule_baselines
  FOR SELECT USING (public.is_project_member(auth.uid(), project_id));
CREATE POLICY "Project creators manage baselines" ON public.schedule_baselines
  FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = schedule_baselines.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = schedule_baselines.project_id AND p.created_by = auth.uid()));

CREATE TABLE IF NOT EXISTS public.baseline_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id uuid NOT NULL REFERENCES public.schedule_baselines(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL,
  activity_code text,
  wbs_code text,
  name text,
  baseline_start date,
  baseline_end date,
  duration_days numeric,
  total_float_days numeric,
  percent_complete numeric,
  budgeted_cost numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_baseline_activities_baseline ON public.baseline_activities(baseline_id);

ALTER TABLE public.baseline_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view baseline activities" ON public.baseline_activities
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.schedule_baselines b
    WHERE b.id = baseline_activities.baseline_id
    AND public.is_project_member(auth.uid(), b.project_id)
  ));
CREATE POLICY "Project creators manage baseline activities" ON public.baseline_activities
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.schedule_baselines b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = baseline_activities.baseline_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.schedule_baselines b
    JOIN public.projects p ON p.id = b.project_id
    WHERE b.id = baseline_activities.baseline_id AND p.created_by = auth.uid()
  ));

-- ============ EXTEND schedule_activities ============
ALTER TABLE public.schedule_activities
  ADD COLUMN IF NOT EXISTS calendar_id uuid,
  ADD COLUMN IF NOT EXISTS constraint_type text,
  ADD COLUMN IF NOT EXISTS constraint_date date,
  ADD COLUMN IF NOT EXISTS primary_resource_id uuid;

-- Constraint type validation via trigger (avoid CHECK to keep it flexible)
CREATE OR REPLACE FUNCTION public.schedule_activities_validate_constraint()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.constraint_type IS NOT NULL AND NEW.constraint_type NOT IN
    ('SNET','SNLT','FNET','FNLT','MSO','MFO','ASAP','ALAP') THEN
    RAISE EXCEPTION 'Invalid constraint_type %', NEW.constraint_type;
  END IF;
  IF NEW.constraint_type IN ('SNET','SNLT','FNET','FNLT','MSO','MFO') AND NEW.constraint_date IS NULL THEN
    RAISE EXCEPTION 'constraint_date required for constraint_type %', NEW.constraint_type;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_schedule_activities_validate_constraint ON public.schedule_activities;
CREATE TRIGGER trg_schedule_activities_validate_constraint
  BEFORE INSERT OR UPDATE ON public.schedule_activities
  FOR EACH ROW EXECUTE FUNCTION public.schedule_activities_validate_constraint();

-- ============ RPC: capture_baseline ============
CREATE OR REPLACE FUNCTION public.capture_baseline(
  p_project_id uuid, p_name text, p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_baseline_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND created_by = v_uid)
     AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Only the project creator may capture a baseline';
  END IF;

  INSERT INTO public.schedule_baselines(project_id, name, notes, captured_by)
  VALUES (p_project_id, p_name, p_notes, v_uid)
  RETURNING id INTO v_baseline_id;

  INSERT INTO public.baseline_activities(
    baseline_id, activity_id, activity_code, wbs_code, name,
    baseline_start, baseline_end, duration_days, total_float_days,
    percent_complete, budgeted_cost
  )
  SELECT
    v_baseline_id, a.id, a.activity_id, a.wbs_code, a.name,
    COALESCE(a.baseline_start, a.early_start),
    COALESCE(a.baseline_end, a.early_finish),
    a.duration_days, a.total_float_days,
    a.percent_complete,
    COALESCE((
      SELECT SUM(ara.budgeted_cost)
      FROM public.activity_resource_assignments ara
      WHERE ara.activity_id = a.id
    ), 0)
  FROM public.schedule_activities a
  WHERE a.project_id = p_project_id;

  RETURN v_baseline_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_baseline(p_baseline_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project uuid;
BEGIN
  SELECT project_id INTO v_project FROM public.schedule_baselines WHERE id = p_baseline_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'Baseline not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project AND created_by = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.schedule_baselines WHERE id = p_baseline_id;
END;
$$;

-- ============ Extended replace_project_schedule ============
CREATE OR REPLACE FUNCTION public.replace_project_schedule(
  p_project_id uuid,
  p_acts jsonb,
  p_rels jsonb,
  p_meta jsonb,
  p_calendars jsonb DEFAULT '[]'::jsonb,
  p_resources jsonb DEFAULT '[]'::jsonb,
  p_assignments jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_creator boolean;
  act jsonb; rel jsonb; cal jsonb; res jsonb; asg jsonb;
  id_map jsonb := '{}'::jsonb;
  cal_map jsonb := '{}'::jsonb;
  res_map jsonb := '{}'::jsonb;
  new_id uuid; ext_id text; parent_ext text; parent_uuid uuid;
  cal_ext text; cal_uuid uuid;
  res_ext text;
  inserted_acts int := 0; inserted_rels int := 0;
  inserted_cals int := 0; inserted_res int := 0; inserted_asgs int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.projects WHERE id = p_project_id AND created_by = auth.uid()) INTO is_creator;
  IF NOT is_creator AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only the project creator may replace the schedule';
  END IF;

  -- Wipe existing in dependency order
  DELETE FROM public.activity_resource_assignments WHERE project_id = p_project_id;
  DELETE FROM public.activity_relationships WHERE project_id = p_project_id;
  DELETE FROM public.schedule_activities WHERE project_id = p_project_id;
  DELETE FROM public.schedule_resources WHERE project_id = p_project_id;
  DELETE FROM public.schedule_calendars WHERE project_id = p_project_id;

  -- Calendars
  FOR cal IN SELECT * FROM jsonb_array_elements(p_calendars) LOOP
    cal_ext := cal->>'ext_id';
    new_id := gen_random_uuid();
    cal_map := cal_map || jsonb_build_object(cal_ext, new_id::text);
    INSERT INTO public.schedule_calendars(id, project_id, name, is_default, hours_per_day, workweek, exceptions)
    VALUES (
      new_id, p_project_id,
      COALESCE(cal->>'name','Standard'),
      COALESCE((cal->>'is_default')::boolean, false),
      COALESCE((cal->>'hours_per_day')::numeric, 8),
      COALESCE(cal->'workweek', '{"0":0,"1":8,"2":8,"3":8,"4":8,"5":8,"6":0}'::jsonb),
      COALESCE(cal->'exceptions', '[]'::jsonb)
    );
    inserted_cals := inserted_cals + 1;
  END LOOP;

  -- Resources
  FOR res IN SELECT * FROM jsonb_array_elements(p_resources) LOOP
    res_ext := res->>'ext_id';
    new_id := gen_random_uuid();
    res_map := res_map || jsonb_build_object(res_ext, new_id::text);
    INSERT INTO public.schedule_resources(id, project_id, name, resource_code, resource_type, unit, cost_per_unit, max_units_per_day)
    VALUES (
      new_id, p_project_id,
      COALESCE(res->>'name','Resource'),
      res->>'resource_code',
      COALESCE((res->>'resource_type')::public.resource_type, 'labor'::public.resource_type),
      COALESCE(res->>'unit','hr'),
      COALESCE((res->>'cost_per_unit')::numeric, 0),
      COALESCE((res->>'max_units_per_day')::numeric, 8)
    );
    inserted_res := inserted_res + 1;
  END LOOP;

  -- Activities pass 1
  FOR act IN SELECT * FROM jsonb_array_elements(p_acts) LOOP
    ext_id := act->>'ext_id';
    new_id := gen_random_uuid();
    id_map := id_map || jsonb_build_object(ext_id, new_id::text);
    cal_ext := act->>'calendar_ext_id';
    cal_uuid := NULL;
    IF cal_ext IS NOT NULL AND cal_map ? cal_ext THEN
      cal_uuid := (cal_map->>cal_ext)::uuid;
    END IF;

    INSERT INTO public.schedule_activities(
      id, project_id, wbs_code, activity_id, name, activity_type,
      baseline_start, baseline_end, duration_days, percent_complete,
      actual_start, actual_finish, sort_order, manual_finish,
      calendar_id, constraint_type, constraint_date
    ) VALUES (
      new_id, p_project_id,
      COALESCE(act->>'wbs_code','NEW'),
      act->>'activity_id',
      COALESCE(act->>'name','Activity'),
      COALESCE(act->>'activity_type','task'),
      NULLIF(act->>'baseline_start','')::date,
      NULLIF(act->>'baseline_end','')::date,
      COALESCE((act->>'duration_days')::numeric, 0),
      COALESCE((act->>'percent_complete')::numeric, 0),
      NULLIF(act->>'actual_start','')::date,
      NULLIF(act->>'actual_finish','')::date,
      COALESCE((act->>'sort_order')::int, 0),
      COALESCE((act->>'manual_finish')::boolean, false),
      cal_uuid,
      NULLIF(act->>'constraint_type',''),
      NULLIF(act->>'constraint_date','')::date
    );
    inserted_acts := inserted_acts + 1;
  END LOOP;

  -- Activities pass 2: parents
  FOR act IN SELECT * FROM jsonb_array_elements(p_acts) LOOP
    parent_ext := act->>'parent_ext_id';
    IF parent_ext IS NOT NULL AND id_map ? parent_ext THEN
      parent_uuid := (id_map->>parent_ext)::uuid;
      UPDATE public.schedule_activities SET parent_wbs_id = parent_uuid
        WHERE id = (id_map->>(act->>'ext_id'))::uuid;
    END IF;
  END LOOP;

  -- Relationships
  FOR rel IN SELECT * FROM jsonb_array_elements(p_rels) LOOP
    IF NOT (id_map ? (rel->>'pred_ext_id')) THEN CONTINUE; END IF;
    IF NOT (id_map ? (rel->>'succ_ext_id')) THEN CONTINUE; END IF;
    INSERT INTO public.activity_relationships(project_id, pred_activity_id, succ_activity_id, rel_type, lag_days)
    VALUES (
      p_project_id,
      (id_map->>(rel->>'pred_ext_id'))::uuid,
      (id_map->>(rel->>'succ_ext_id'))::uuid,
      COALESCE(rel->>'rel_type','FS'),
      COALESCE((rel->>'lag_days')::numeric, 0)
    );
    inserted_rels := inserted_rels + 1;
  END LOOP;

  -- Resource assignments
  FOR asg IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    IF NOT (id_map ? (asg->>'activity_ext_id')) THEN CONTINUE; END IF;
    IF NOT (res_map ? (asg->>'resource_ext_id')) THEN CONTINUE; END IF;
    INSERT INTO public.activity_resource_assignments(
      project_id, activity_id, resource_id,
      budgeted_units, actual_units, remaining_units,
      budgeted_cost, actual_cost
    ) VALUES (
      p_project_id,
      (id_map->>(asg->>'activity_ext_id'))::uuid,
      (res_map->>(asg->>'resource_ext_id'))::uuid,
      COALESCE((asg->>'budgeted_units')::numeric, 0),
      COALESCE((asg->>'actual_units')::numeric, 0),
      COALESCE((asg->>'remaining_units')::numeric, 0),
      COALESCE((asg->>'budgeted_cost')::numeric, 0),
      COALESCE((asg->>'actual_cost')::numeric, 0)
    );
    inserted_asgs := inserted_asgs + 1;
  END LOOP;

  IF p_meta IS NOT NULL AND p_meta <> 'null'::jsonb THEN
    INSERT INTO public.project_schedule_meta(project_id, data_date, calendar)
    VALUES (
      p_project_id,
      NULLIF(p_meta->>'data_date','')::date,
      COALESCE(p_meta->'calendar', '{"workdays":[1,2,3,4,5]}'::jsonb)
    )
    ON CONFLICT (project_id) DO UPDATE
      SET data_date = EXCLUDED.data_date,
          calendar = EXCLUDED.calendar,
          updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'activities', inserted_acts,
    'relationships', inserted_rels,
    'calendars', inserted_cals,
    'resources', inserted_res,
    'assignments', inserted_asgs
  );
END;
$$;
