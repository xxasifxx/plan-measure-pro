
-- =============================================================
-- A) seed_demo_users(): idempotent fixture for demo accounts
-- =============================================================
CREATE OR REPLACE FUNCTION public.seed_demo_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_pm_id          uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';
  v_re_id          uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002';
  v_insp_id        uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0003';
  v_instance_id    uuid := '00000000-0000-0000-0000-000000000000';
  v_password_hash  text := extensions.crypt('DemoPass123!', extensions.gen_salt('bf'));
  v_created        int  := 0;
BEGIN
  -- Only admins (or service_role bypassing RLS via SECURITY DEFINER) may call.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins may seed demo users';
  END IF;

  -- Helper: insert a user + identity if missing
  PERFORM 1;

  -- PM
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_pm_id) THEN
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES
      (v_instance_id, v_pm_id, 'authenticated', 'authenticated',
       'demo.pm@njta.test', v_password_hash, now(),
       jsonb_build_object('provider','email','providers',array['email']),
       jsonb_build_object('full_name','Demo PM'),
       now(), now(), '', '', '', '');
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_pm_id::text, v_pm_id,
            jsonb_build_object('sub', v_pm_id::text, 'email', 'demo.pm@njta.test', 'email_verified', true),
            'email', now(), now(), now());
    v_created := v_created + 1;
  END IF;

  -- RE
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_re_id) THEN
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES
      (v_instance_id, v_re_id, 'authenticated', 'authenticated',
       'demo.re@njta.test', v_password_hash, now(),
       jsonb_build_object('provider','email','providers',array['email']),
       jsonb_build_object('full_name','Demo Resident Engineer'),
       now(), now(), '', '', '', '');
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_re_id::text, v_re_id,
            jsonb_build_object('sub', v_re_id::text, 'email', 'demo.re@njta.test', 'email_verified', true),
            'email', now(), now(), now());
    v_created := v_created + 1;
  END IF;

  -- Inspector
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_insp_id) THEN
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES
      (v_instance_id, v_insp_id, 'authenticated', 'authenticated',
       'demo.inspector@njta.test', v_password_hash, now(),
       jsonb_build_object('provider','email','providers',array['email']),
       jsonb_build_object('full_name','Demo Inspector'),
       now(), now(), '', '', '', '');
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_insp_id::text, v_insp_id,
            jsonb_build_object('sub', v_insp_id::text, 'email', 'demo.inspector@njta.test', 'email_verified', true),
            'email', now(), now(), now());
    v_created := v_created + 1;
  END IF;

  -- Profiles (handle_new_user trigger normally fills these, but be defensive)
  INSERT INTO public.profiles (id, full_name, email)
  VALUES
    (v_pm_id,   'Demo PM',                  'demo.pm@njta.test'),
    (v_re_id,   'Demo Resident Engineer',   'demo.re@njta.test'),
    (v_insp_id, 'Demo Inspector',           'demo.inspector@njta.test')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  -- Roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_pm_id,   'admin'),
    (v_pm_id,   'project_manager'),
    (v_re_id,   'resident_engineer'),
    (v_insp_id, 'inspector')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'pm_user_id', v_pm_id,
    're_user_id', v_re_id,
    'inspector_user_id', v_insp_id,
    'created', v_created
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_users() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.seed_demo_users() TO service_role;


-- =============================================================
-- B) replace_project_schedule (7-arg overload): include
--    primary_resource_id + remaining_duration_days in INSERT
-- =============================================================
CREATE OR REPLACE FUNCTION public.replace_project_schedule(
  p_project_id uuid,
  p_acts jsonb,
  p_rels jsonb,
  p_meta jsonb,
  p_calendars jsonb DEFAULT '[]'::jsonb,
  p_resources jsonb DEFAULT '[]'::jsonb,
  p_assignments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  is_creator boolean;
  act jsonb; rel jsonb; cal jsonb; res jsonb; asg jsonb;
  id_map jsonb := '{}'::jsonb;
  cal_map jsonb := '{}'::jsonb;
  res_map jsonb := '{}'::jsonb;
  new_id uuid; ext_id text; parent_ext text; parent_uuid uuid;
  cal_ext text; cal_uuid uuid;
  res_ext text;
  prim_res_ext text; prim_res_uuid uuid;
  inserted_acts int := 0; inserted_rels int := 0;
  inserted_cals int := 0; inserted_res int := 0; inserted_asgs int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.projects WHERE id = p_project_id AND created_by = auth.uid()) INTO is_creator;
  IF NOT is_creator AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only the project creator may replace the schedule';
  END IF;

  DELETE FROM public.activity_resource_assignments WHERE project_id = p_project_id;
  DELETE FROM public.activity_relationships        WHERE project_id = p_project_id;
  DELETE FROM public.schedule_activities           WHERE project_id = p_project_id;
  DELETE FROM public.schedule_resources            WHERE project_id = p_project_id;
  DELETE FROM public.schedule_calendars            WHERE project_id = p_project_id;

  FOR cal IN SELECT * FROM jsonb_array_elements(p_calendars) LOOP
    cal_ext := cal->>'ext_id';
    new_id := gen_random_uuid();
    cal_map := cal_map || jsonb_build_object(cal_ext, new_id::text);
    INSERT INTO public.schedule_calendars(id, project_id, name, is_default, hours_per_day, workweek, exceptions)
    VALUES (new_id, p_project_id,
            COALESCE(cal->>'name','Standard'),
            COALESCE((cal->>'is_default')::boolean, false),
            COALESCE((cal->>'hours_per_day')::numeric, 8),
            COALESCE(cal->'workweek', '{"0":0,"1":8,"2":8,"3":8,"4":8,"5":8,"6":0}'::jsonb),
            COALESCE(cal->'exceptions', '[]'::jsonb));
    inserted_cals := inserted_cals + 1;
  END LOOP;

  FOR res IN SELECT * FROM jsonb_array_elements(p_resources) LOOP
    res_ext := res->>'ext_id';
    new_id := gen_random_uuid();
    res_map := res_map || jsonb_build_object(res_ext, new_id::text);
    INSERT INTO public.schedule_resources(id, project_id, name, resource_code, resource_type, unit, cost_per_unit, max_units_per_day)
    VALUES (new_id, p_project_id,
            COALESCE(res->>'name','Resource'),
            res->>'resource_code',
            COALESCE((res->>'resource_type')::public.resource_type, 'labor'::public.resource_type),
            COALESCE(res->>'unit','hr'),
            COALESCE((res->>'cost_per_unit')::numeric, 0),
            COALESCE((res->>'max_units_per_day')::numeric, 8));
    inserted_res := inserted_res + 1;
  END LOOP;

  -- Activities pass 1 — now includes primary_resource_id + remaining_duration_days
  FOR act IN SELECT * FROM jsonb_array_elements(p_acts) LOOP
    ext_id := act->>'ext_id';
    new_id := gen_random_uuid();
    id_map := id_map || jsonb_build_object(ext_id, new_id::text);

    cal_ext := act->>'calendar_ext_id';
    cal_uuid := NULL;
    IF cal_ext IS NOT NULL AND cal_map ? cal_ext THEN
      cal_uuid := (cal_map->>cal_ext)::uuid;
    END IF;

    prim_res_ext := act->>'primary_resource_ext_id';
    prim_res_uuid := NULL;
    IF prim_res_ext IS NOT NULL AND res_map ? prim_res_ext THEN
      prim_res_uuid := (res_map->>prim_res_ext)::uuid;
    END IF;

    INSERT INTO public.schedule_activities(
      id, project_id, wbs_code, activity_id, name, activity_type,
      baseline_start, baseline_end, duration_days, percent_complete,
      actual_start, actual_finish, sort_order, manual_finish,
      calendar_id, constraint_type, constraint_date,
      primary_resource_id, remaining_duration_days
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
      NULLIF(act->>'constraint_date','')::date,
      prim_res_uuid,
      NULLIF(act->>'remaining_duration_days','')::numeric
    );
    inserted_acts := inserted_acts + 1;
  END LOOP;

  FOR act IN SELECT * FROM jsonb_array_elements(p_acts) LOOP
    parent_ext := act->>'parent_ext_id';
    IF parent_ext IS NOT NULL AND id_map ? parent_ext THEN
      parent_uuid := (id_map->>parent_ext)::uuid;
      UPDATE public.schedule_activities SET parent_wbs_id = parent_uuid
        WHERE id = (id_map->>(act->>'ext_id'))::uuid;
    END IF;
  END LOOP;

  FOR rel IN SELECT * FROM jsonb_array_elements(p_rels) LOOP
    IF NOT (id_map ? (rel->>'pred_ext_id')) THEN CONTINUE; END IF;
    IF NOT (id_map ? (rel->>'succ_ext_id')) THEN CONTINUE; END IF;
    INSERT INTO public.activity_relationships(project_id, pred_activity_id, succ_activity_id, rel_type, lag_days)
    VALUES (p_project_id,
      (id_map->>(rel->>'pred_ext_id'))::uuid,
      (id_map->>(rel->>'succ_ext_id'))::uuid,
      COALESCE(rel->>'rel_type','FS'),
      COALESCE((rel->>'lag_days')::numeric, 0));
    inserted_rels := inserted_rels + 1;
  END LOOP;

  FOR asg IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    IF NOT (id_map  ? (asg->>'activity_ext_id')) THEN CONTINUE; END IF;
    IF NOT (res_map ? (asg->>'resource_ext_id')) THEN CONTINUE; END IF;
    INSERT INTO public.activity_resource_assignments(
      project_id, activity_id, resource_id,
      budgeted_units, actual_units, remaining_units,
      budgeted_cost, actual_cost
    ) VALUES (p_project_id,
      (id_map ->>(asg->>'activity_ext_id'))::uuid,
      (res_map->>(asg->>'resource_ext_id'))::uuid,
      COALESCE((asg->>'budgeted_units')::numeric, 0),
      COALESCE((asg->>'actual_units')::numeric, 0),
      COALESCE((asg->>'remaining_units')::numeric, 0),
      COALESCE((asg->>'budgeted_cost')::numeric, 0),
      COALESCE((asg->>'actual_cost')::numeric, 0));
    inserted_asgs := inserted_asgs + 1;
  END LOOP;

  IF p_meta IS NOT NULL AND p_meta <> 'null'::jsonb THEN
    INSERT INTO public.project_schedule_meta(project_id, data_date, calendar)
    VALUES (p_project_id,
            NULLIF(p_meta->>'data_date','')::date,
            COALESCE(p_meta->'calendar', '{"workdays":[1,2,3,4,5]}'::jsonb))
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
$function$;

-- Maintain the same lockdown as before
REVOKE EXECUTE ON FUNCTION public.replace_project_schedule(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.replace_project_schedule(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
