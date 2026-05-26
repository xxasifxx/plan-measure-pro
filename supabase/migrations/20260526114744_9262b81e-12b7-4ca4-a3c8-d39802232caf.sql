
ALTER TABLE public.schedule_activities
  ADD COLUMN IF NOT EXISTS manual_finish boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remaining_duration_days numeric;

CREATE OR REPLACE FUNCTION public.replace_project_schedule(
  p_project_id uuid,
  p_acts jsonb,
  p_rels jsonb,
  p_meta jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_creator boolean;
  act jsonb;
  rel jsonb;
  id_map jsonb := '{}'::jsonb;
  new_id uuid;
  ext_id text;
  parent_ext text;
  parent_uuid uuid;
  inserted_acts int := 0;
  inserted_rels int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.projects WHERE id = p_project_id AND created_by = auth.uid())
    INTO is_creator;
  IF NOT is_creator AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only the project creator may replace the schedule';
  END IF;

  -- Wipe existing
  DELETE FROM public.activity_relationships WHERE project_id = p_project_id;
  DELETE FROM public.schedule_activities WHERE project_id = p_project_id;

  -- Pass 1: insert activities, build ext_id -> uuid map
  FOR act IN SELECT * FROM jsonb_array_elements(p_acts) LOOP
    ext_id := act->>'ext_id';
    new_id := gen_random_uuid();
    id_map := id_map || jsonb_build_object(ext_id, new_id::text);

    INSERT INTO public.schedule_activities(
      id, project_id, wbs_code, activity_id, name, activity_type,
      baseline_start, baseline_end, duration_days, percent_complete,
      actual_start, actual_finish, sort_order, manual_finish
    ) VALUES (
      new_id, p_project_id,
      COALESCE(act->>'wbs_code', 'NEW'),
      act->>'activity_id',
      COALESCE(act->>'name', 'Activity'),
      COALESCE(act->>'activity_type', 'task'),
      NULLIF(act->>'baseline_start','')::date,
      NULLIF(act->>'baseline_end','')::date,
      COALESCE((act->>'duration_days')::numeric, 0),
      COALESCE((act->>'percent_complete')::numeric, 0),
      NULLIF(act->>'actual_start','')::date,
      NULLIF(act->>'actual_finish','')::date,
      COALESCE((act->>'sort_order')::int, 0),
      COALESCE((act->>'manual_finish')::boolean, false)
    );
    inserted_acts := inserted_acts + 1;
  END LOOP;

  -- Pass 2: set parent_wbs_id via map
  FOR act IN SELECT * FROM jsonb_array_elements(p_acts) LOOP
    parent_ext := act->>'parent_ext_id';
    IF parent_ext IS NOT NULL AND id_map ? parent_ext THEN
      parent_uuid := (id_map->>parent_ext)::uuid;
      UPDATE public.schedule_activities
        SET parent_wbs_id = parent_uuid
        WHERE id = (id_map->>(act->>'ext_id'))::uuid;
    END IF;
  END LOOP;

  -- Pass 3: relationships
  FOR rel IN SELECT * FROM jsonb_array_elements(p_rels) LOOP
    IF NOT (id_map ? (rel->>'pred_ext_id')) THEN CONTINUE; END IF;
    IF NOT (id_map ? (rel->>'succ_ext_id')) THEN CONTINUE; END IF;
    INSERT INTO public.activity_relationships(
      project_id, pred_activity_id, succ_activity_id, rel_type, lag_days
    ) VALUES (
      p_project_id,
      (id_map->>(rel->>'pred_ext_id'))::uuid,
      (id_map->>(rel->>'succ_ext_id'))::uuid,
      COALESCE(rel->>'rel_type', 'FS'),
      COALESCE((rel->>'lag_days')::numeric, 0)
    );
    inserted_rels := inserted_rels + 1;
  END LOOP;

  -- Meta
  IF p_meta IS NOT NULL AND p_meta <> 'null'::jsonb THEN
    INSERT INTO public.project_schedule_meta(project_id, data_date, calendar)
    VALUES (
      p_project_id,
      NULLIF(p_meta->>'data_date','')::date,
      COALESCE(p_meta->'calendar', '{"workdays":[1,2,3,4,5]}'::jsonb)
    )
    ON CONFLICT (project_id) DO UPDATE
      SET data_date = EXCLUDED.data_date,
          calendar  = EXCLUDED.calendar,
          updated_at = now();
  END IF;

  RETURN jsonb_build_object('activities', inserted_acts, 'relationships', inserted_rels);
END;
$$;
