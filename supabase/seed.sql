-- supabase/seed.sql — Repeatable demo seed.
--
-- Run via `supabase db reset` (local) or against a fresh project. Idempotent:
-- uses fixed UUIDs + ON CONFLICT DO NOTHING so re-runs are safe.
--
-- It does these things, in order:
--   1. Calls public.seed_demo_users() to create three demo accounts
--      (PM / RE / Inspector) with predictable IDs + the password DemoPass123!
--   2. Seeds 1 demo project owned by the PM
--   3. Adds the RE and Inspector as project_members
--   4. Seeds 15 NJDOT-style pay items
--   5. Seeds 1 PDF calibration on page 1
--   6. Seeds ~15 annotations on pages 1-2 (mix of line/polygon/count, mixed
--      authorship between Inspector and PM)
--   7. Generates a 50-activity schedule (4 WBS + 46 tasks/milestones), one
--      calendar, three resources, ~20 assignments — all inserted directly into
--      the schedule tables (skips replace_project_schedule so we don't need
--      to spoof auth.uid() in the seed).
--   8. Captures one baseline snapshot
--   9. Links ~5 pay items to representative activities
--  10. Seeds 2 daily reports for the Inspector (1 draft, 1 submitted)

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_seed_result jsonb;
  v_pm_id       uuid;
  v_re_id       uuid;
  v_insp_id     uuid;
  v_project     uuid := '11111111-1111-1111-1111-111111111111';
  v_cal_page1   uuid := '22222222-2222-2222-2222-222222222222';
  v_sched_cal   uuid := '33333333-3333-3333-3333-333333333333';
  v_res_labor   uuid := '44444444-4444-4444-4444-444444444401';
  v_res_paver   uuid := '44444444-4444-4444-4444-444444444402';
  v_res_super   uuid := '44444444-4444-4444-4444-444444444403';
  v_start_date  date := (now() AT TIME ZONE 'America/New_York')::date - interval '30 days';
  v_data_date   date;
  v_wbs_root    uuid := '55555555-5555-5555-5555-000000000001';
  v_wbs_mob     uuid := '55555555-5555-5555-5555-000000000002';
  v_wbs_earth   uuid := '55555555-5555-5555-5555-000000000003';
  v_wbs_pave    uuid := '55555555-5555-5555-5555-000000000004';
  v_wbs_close   uuid := '55555555-5555-5555-5555-000000000005';
  v_baseline_id uuid := '66666666-6666-6666-6666-666666666666';
  v_act_id      uuid;
  v_prev_act    uuid;
  v_loop_offset int;
  i             int;
  v_section     text;
  v_section_root uuid;
  v_dur         int;
  v_act_start   date;
  v_act_end     date;
  -- Pay item UUIDs we'll need to link later
  v_pi_curb     uuid := '77777777-7777-7777-7777-000000000007';
  v_pi_sidewalk uuid := '77777777-7777-7777-7777-000000000008';
  v_pi_surface  uuid := '77777777-7777-7777-7777-000000000005';
  v_pi_base     uuid := '77777777-7777-7777-7777-000000000006';
  v_pi_pipe     uuid := '77777777-7777-7777-7777-000000000009';
BEGIN
  v_data_date := v_start_date + interval '14 days';

  ---------------------------------------------------------------------
  -- 1. Demo users
  ---------------------------------------------------------------------
  v_seed_result := public.seed_demo_users();
  v_pm_id   := (v_seed_result->>'pm_user_id')::uuid;
  v_re_id   := (v_seed_result->>'re_user_id')::uuid;
  v_insp_id := (v_seed_result->>'inspector_user_id')::uuid;

  ---------------------------------------------------------------------
  -- 2. Project (owned by PM)
  ---------------------------------------------------------------------
  INSERT INTO public.projects (id, name, contract_number, created_by)
  VALUES (v_project, 'NJTA Demo — I-95 Resurfacing (MP 56–62)', 'NJTA-2026-DEMO', v_pm_id)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------
  -- 3. Project members (RE + Inspector)
  ---------------------------------------------------------------------
  INSERT INTO public.project_members (project_id, user_id, role) VALUES
    (v_project, v_re_id,   'resident_engineer'),
    (v_project, v_insp_id, 'inspector')
  ON CONFLICT DO NOTHING;

  ---------------------------------------------------------------------
  -- 4. Pay items (15)
  ---------------------------------------------------------------------
  INSERT INTO public.pay_items (id, project_id, item_number, item_code, name, unit, unit_price, contract_quantity, color, drawable) VALUES
    ('77777777-7777-7777-7777-000000000001'::uuid, v_project, 100, '152006M', 'Mobilization',                            'LS',  150000, 1,     '#64748b', false),
    ('77777777-7777-7777-7777-000000000002'::uuid, v_project, 200, '202003P', 'Removal of Concrete Pavement',            'SY',  18.50,  4800,  '#94a3b8', true),
    ('77777777-7777-7777-7777-000000000003'::uuid, v_project, 300, '202006M', 'Removal of Pipe',                         'LF',  22.00,  1200,  '#a3a3a3', true),
    ('77777777-7777-7777-7777-000000000004'::uuid, v_project, 400, '301021P', 'Dense-Graded Aggregate Base Course, 6"',  'SY',  14.25,  6500,  '#d97706', true),
    (v_pi_surface,                                  v_project, 500, '401005P', 'HMA Surface Course 9.5M64, 2"',           'SY',  21.00,  9200,  '#1f2937', true),
    (v_pi_base,                                     v_project, 600, '401015P', 'HMA Base Course 19M64, 4"',               'SY',  28.50,  9200,  '#0f172a', true),
    (v_pi_curb,                                     v_project, 700, '502006P', 'Concrete Curb',                           'LF',  32.00,  3400,  '#3b82f6', true),
    (v_pi_sidewalk,                                 v_project, 800, '502012P', 'Concrete Sidewalk, 4"',                   'SF',  9.75,   8800,  '#60a5fa', true),
    (v_pi_pipe,                                     v_project, 900, '602006M', 'Reinforced Concrete Pipe, 18"',           'LF',  78.00,  640,   '#0ea5e9', true),
    ('77777777-7777-7777-7777-000000000010'::uuid, v_project,1000, '602030M', 'Inlet, Type B',                            'EA',  3400,   12,    '#0284c7', false),
    ('77777777-7777-7777-7777-000000000011'::uuid, v_project,1100, '603009P', 'Bituminous Tack Coat',                     'GAL', 4.25,   2200,  '#7c3aed', false),
    ('77777777-7777-7777-7777-000000000012'::uuid, v_project,1200, '604003M', 'Adjusting Manhole',                        'EA',  650,    24,    '#a78bfa', false),
    ('77777777-7777-7777-7777-000000000013'::uuid, v_project,1300, '605006P', 'Topsoiling, 4" Thick',                     'SY',  6.25,   3100,  '#16a34a', true),
    ('77777777-7777-7777-7777-000000000014'::uuid, v_project,1400, '606003P', 'Seeding & Mulching',                       'SY',  2.75,   3100,  '#65a30d', true),
    ('77777777-7777-7777-7777-000000000015'::uuid, v_project,1500, '610003M', 'Steel-Backed Timber Guide Rail',           'LF',  46.00,  1850,  '#ca8a04', true)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------
  -- 5. PDF calibration (page 1 only — page 2 inherits via UI calibration sync)
  ---------------------------------------------------------------------
  INSERT INTO public.calibrations (id, project_id, page, point1, point2, real_distance, pixels_per_foot)
  VALUES (v_cal_page1, v_project, 1,
          '{"x": 100, "y": 100}'::jsonb,
          '{"x": 460, "y": 100}'::jsonb,
          100, 3.6)
  ON CONFLICT (id) DO NOTHING;

  ---------------------------------------------------------------------
  -- 6. Annotations (15 across pages 1-2, mixed authorship)
  ---------------------------------------------------------------------
  INSERT INTO public.annotations
    (project_id, user_id, type, points, page, pay_item_id, measurement, measurement_unit, location, notes)
  SELECT v_project, t.uid, t.type, t.points::jsonb, t.page, t.pi, t.meas, t.unit, t.loc, t.note
  FROM (VALUES
    (v_insp_id, 'line',    '[{"x":120,"y":200},{"x":340,"y":200}]', 1, v_pi_curb,     61.1,  'LF', 'STA 100+00 R', 'EB curb run A'),
    (v_insp_id, 'line',    '[{"x":120,"y":260},{"x":260,"y":260},{"x":260,"y":340}]', 1, v_pi_curb, 61.1, 'LF', 'STA 100+50 R', 'L-shape curb return'),
    (v_pm_id,   'polygon', '[{"x":400,"y":200},{"x":520,"y":200},{"x":520,"y":300},{"x":400,"y":300}]', 1, v_pi_sidewalk, 925.9, 'SF', 'STA 101+00', 'Sidewalk pad 1'),
    (v_pm_id,   'polygon', '[{"x":560,"y":200},{"x":680,"y":200},{"x":680,"y":300},{"x":560,"y":300}]', 1, v_pi_sidewalk, 925.9, 'SF', 'STA 101+25', 'Sidewalk pad 2'),
    (v_insp_id, 'polygon', '[{"x":120,"y":400},{"x":720,"y":400},{"x":720,"y":520},{"x":120,"y":520}]', 1, v_pi_surface, 5555.6, 'SY', 'STA 102+00', 'HMA surface section'),
    (v_insp_id, 'point',   '[{"x":150,"y":600}]', 1, '77777777-7777-7777-7777-000000000010'::uuid, 1, 'EA', 'STA 103+00 L', 'Inlet Type B'),
    (v_insp_id, 'point',   '[{"x":250,"y":600}]', 1, '77777777-7777-7777-7777-000000000010'::uuid, 1, 'EA', 'STA 103+50 L', 'Inlet Type B'),
    (v_insp_id, 'line',    '[{"x":300,"y":600},{"x":540,"y":600}]', 1, v_pi_pipe, 66.7, 'LF', 'STA 103+00', '18" RCP run'),
    (v_insp_id, 'point',   '[{"x":600,"y":620}]', 1, '77777777-7777-7777-7777-000000000012'::uuid, 1, 'EA', 'STA 104+00', 'Adjust manhole'),
    (v_insp_id, 'line',    '[{"x":120,"y":700},{"x":720,"y":700}]', 1, '77777777-7777-7777-7777-000000000015'::uuid, 166.7, 'LF', 'STA 105+00 R', 'Guide rail'),
    (v_insp_id, 'polygon', '[{"x":150,"y":150},{"x":700,"y":150},{"x":700,"y":280},{"x":150,"y":280}]', 2, v_pi_base, 7944.4, 'SY', 'STA 106+00', 'HMA base, NB lane'),
    (v_insp_id, 'line',    '[{"x":150,"y":350},{"x":700,"y":350}]', 2, v_pi_curb, 152.8, 'LF', 'STA 106+25 R', 'Curb run B'),
    (v_pm_id,   'polygon', '[{"x":200,"y":420},{"x":650,"y":420},{"x":650,"y":520},{"x":200,"y":520}]', 2, '77777777-7777-7777-7777-000000000004'::uuid, 1388.9, 'SY', 'STA 107+00', 'DGABC subgrade prep'),
    (v_insp_id, 'point',   '[{"x":380,"y":600}]', 2, '77777777-7777-7777-7777-000000000012'::uuid, 1, 'EA', 'STA 107+50', 'Adjust manhole'),
    (v_insp_id, 'line',    '[{"x":150,"y":680},{"x":700,"y":680}]', 2, '77777777-7777-7777-7777-000000000015'::uuid, 152.8, 'LF', 'STA 108+00 R', 'Guide rail extension')
  ) AS t(uid, type, points, page, pi, meas, unit, loc, note)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.annotations a
    WHERE a.project_id = v_project AND a.location = t.loc AND a.notes = t.note
  );

  ---------------------------------------------------------------------
  -- 7. Schedule — 1 calendar, 3 resources, 5 WBS, 46 tasks + 4 milestones
  ---------------------------------------------------------------------

  -- Calendar (Standard 5-day, 8 hr/day)
  INSERT INTO public.schedule_calendars (id, project_id, name, is_default, hours_per_day, workweek, exceptions)
  VALUES (v_sched_cal, v_project, 'NJTA Standard 5-day', true, 8,
          '{"0":0,"1":8,"2":8,"3":8,"4":8,"5":8,"6":0}'::jsonb, '[]'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Resources
  INSERT INTO public.schedule_resources (id, project_id, name, resource_code, resource_type, unit, cost_per_unit, max_units_per_day) VALUES
    (v_res_labor, v_project, 'Field Crew',        'LBR-01', 'labor',     'hr', 95,  40),
    (v_res_paver, v_project, 'Paving Equipment',  'EQP-01', 'equipment', 'hr', 240,  8),
    (v_res_super, v_project, 'Superintendent',    'LBR-02', 'labor',     'hr', 145,  8)
  ON CONFLICT (id) DO NOTHING;

  -- Schedule meta
  INSERT INTO public.project_schedule_meta (project_id, data_date, calendar)
  VALUES (v_project, v_data_date, '{"workdays":[1,2,3,4,5]}'::jsonb)
  ON CONFLICT (project_id) DO UPDATE SET data_date = EXCLUDED.data_date;

  -- 5 WBS rows (1 root + 4 phases)
  INSERT INTO public.schedule_activities (id, project_id, wbs_code, name, activity_type, duration_days, sort_order, calendar_id) VALUES
    (v_wbs_root,  v_project, 'WBS-ROOT', 'I-95 Resurfacing Project',        'wbs', 0,  0,  v_sched_cal),
    (v_wbs_mob,   v_project, 'WBS-100',  'Mobilization & Setup',            'wbs', 0,  10, v_sched_cal),
    (v_wbs_earth, v_project, 'WBS-200',  'Earthwork & Removals',            'wbs', 0,  20, v_sched_cal),
    (v_wbs_pave,  v_project, 'WBS-300',  'Pavement & Drainage',             'wbs', 0,  30, v_sched_cal),
    (v_wbs_close, v_project, 'WBS-400',  'Closeout & Demobilization',       'wbs', 0,  40, v_sched_cal)
  ON CONFLICT (id) DO NOTHING;

  -- Set WBS parents
  UPDATE public.schedule_activities SET parent_wbs_id = v_wbs_root
    WHERE id IN (v_wbs_mob, v_wbs_earth, v_wbs_pave, v_wbs_close);

  -- 46 task/milestone activities (sequential FS chain inside each phase)
  -- Layout: Mobilization (4 tasks + 1 start milestone) = 5
  --         Earthwork    (12 tasks)                    = 12
  --         Pavement     (20 tasks)                    = 20
  --         Closeout     (8 tasks + 1 finish milestone)= 9
  --         Total = 46  (+ 4 WBS = 50)

  v_prev_act := NULL;
  v_act_start := v_start_date;

  FOR i IN 1..46 LOOP
    v_act_id := gen_random_uuid();
    IF i = 1 THEN
      v_section := 'Mobilization';        v_section_root := v_wbs_mob;
    ELSIF i <= 5 THEN
      v_section := 'Mobilization';        v_section_root := v_wbs_mob;
    ELSIF i <= 17 THEN
      v_section := 'Earthwork';           v_section_root := v_wbs_earth;
    ELSIF i <= 37 THEN
      v_section := 'Pavement';            v_section_root := v_wbs_pave;
    ELSE
      v_section := 'Closeout';            v_section_root := v_wbs_close;
    END IF;

    -- Mix of milestones at i=1 (start) and i=46 (finish), tasks otherwise
    IF i = 1 THEN
      v_dur := 0;
      v_act_end := v_act_start;
      INSERT INTO public.schedule_activities (id, project_id, parent_wbs_id, wbs_code, activity_id, name, activity_type,
              baseline_start, baseline_end, duration_days, percent_complete, sort_order, calendar_id, primary_resource_id)
      VALUES (v_act_id, v_project, v_section_root, 'A' || lpad(i::text, 4, '0'),
              'A' || lpad(i::text, 4, '0'), 'NTP / Project Start', 'start_milestone',
              v_act_start, v_act_end, 0, 100, i * 10, v_sched_cal, NULL);
    ELSIF i = 46 THEN
      v_dur := 0;
      v_act_end := v_act_start;
      INSERT INTO public.schedule_activities (id, project_id, parent_wbs_id, wbs_code, activity_id, name, activity_type,
              baseline_start, baseline_end, duration_days, percent_complete, sort_order, calendar_id, primary_resource_id)
      VALUES (v_act_id, v_project, v_section_root, 'A' || lpad(i::text, 4, '0'),
              'A' || lpad(i::text, 4, '0'), 'Substantial Completion', 'finish_milestone',
              v_act_start, v_act_end, 0, 0, i * 10, v_sched_cal, NULL);
    ELSE
      v_dur := 3 + ((i * 7) % 8);  -- 3..10 days, deterministic
      v_act_end := v_act_start + (v_dur || ' days')::interval;
      INSERT INTO public.schedule_activities (id, project_id, parent_wbs_id, wbs_code, activity_id, name, activity_type,
              baseline_start, baseline_end, duration_days, percent_complete, sort_order, calendar_id, primary_resource_id)
      VALUES (v_act_id, v_project, v_section_root, 'A' || lpad(i::text, 4, '0'),
              'A' || lpad(i::text, 4, '0'),
              v_section || ' — Task ' || (i - CASE WHEN v_section = 'Mobilization' THEN 1
                                                    WHEN v_section = 'Earthwork'    THEN 5
                                                    WHEN v_section = 'Pavement'     THEN 17
                                                    ELSE 37 END),
              'task',
              v_act_start, v_act_end, v_dur,
              CASE WHEN v_act_end < v_data_date THEN 100
                   WHEN v_act_start < v_data_date THEN 50
                   ELSE 0 END,
              i * 10, v_sched_cal,
              CASE WHEN v_section = 'Pavement' THEN v_res_paver
                   WHEN i % 5 = 0              THEN v_res_super
                   ELSE v_res_labor END);
    END IF;

    -- FS relationship from previous activity
    IF v_prev_act IS NOT NULL THEN
      INSERT INTO public.activity_relationships (project_id, pred_activity_id, succ_activity_id, rel_type, lag_days)
      VALUES (v_project, v_prev_act, v_act_id, 'FS', 0);
    END IF;

    -- Resource assignment (~20 of the 44 tasks)
    IF i > 1 AND i < 46 AND i % 2 = 0 THEN
      INSERT INTO public.activity_resource_assignments
        (project_id, activity_id, resource_id, budgeted_units, actual_units, remaining_units, budgeted_cost, actual_cost)
      VALUES (v_project, v_act_id,
              CASE WHEN v_section = 'Pavement' THEN v_res_paver ELSE v_res_labor END,
              v_dur * 8, 0, v_dur * 8,
              v_dur * 8 * CASE WHEN v_section = 'Pavement' THEN 240 ELSE 95 END,
              0);
    END IF;

    v_prev_act := v_act_id;
    v_act_start := v_act_end + interval '1 day';
  END LOOP;

  ---------------------------------------------------------------------
  -- 8. Baseline snapshot (manual — bypasses capture_baseline RPC auth)
  ---------------------------------------------------------------------
  INSERT INTO public.schedule_baselines (id, project_id, name, notes, captured_by, captured_at)
  VALUES (v_baseline_id, v_project, 'BL-001 Original Baseline',
          'Captured at project start. Demo seed data.', v_pm_id, now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.baseline_activities
    (baseline_id, activity_id, activity_code, wbs_code, name,
     baseline_start, baseline_end, duration_days, percent_complete, budgeted_cost)
  SELECT v_baseline_id, a.id, a.activity_id, a.wbs_code, a.name,
         a.baseline_start, a.baseline_end, a.duration_days, a.percent_complete,
         COALESCE((SELECT SUM(budgeted_cost) FROM public.activity_resource_assignments ara
                   WHERE ara.activity_id = a.id), 0)
  FROM public.schedule_activities a
  WHERE a.project_id = v_project
    AND NOT EXISTS (SELECT 1 FROM public.baseline_activities ba
                    WHERE ba.baseline_id = v_baseline_id AND ba.activity_id = a.id);

  ---------------------------------------------------------------------
  -- 9. Pay item ↔ activity links (~5 representative)
  ---------------------------------------------------------------------
  INSERT INTO public.activity_pay_items (project_id, activity_id, pay_item_id)
  SELECT v_project, a.id, p.pay_id
  FROM (VALUES
    ('A0006', v_pi_pipe),
    ('A0008', v_pi_base),
    ('A0018', v_pi_base),
    ('A0024', v_pi_surface),
    ('A0030', v_pi_curb)
  ) AS p(act_code, pay_id)
  JOIN public.schedule_activities a
    ON a.project_id = v_project AND a.activity_id = p.act_code
  ON CONFLICT DO NOTHING;

  ---------------------------------------------------------------------
  -- 10. Daily reports (1 draft, 1 submitted) for the Inspector
  ---------------------------------------------------------------------
  INSERT INTO public.daily_reports (project_id, user_id, report_date, status, snapshot, payload, submitted_at)
  VALUES
    (v_project, v_insp_id, (now() AT TIME ZONE 'America/New_York')::date - 1,
     'submitted', '[]'::jsonb,
     jsonb_build_object('weather','Sunny, 72°F','crew_count',6,'notes','HMA paving STA 102+00 to 103+00'),
     now() - interval '6 hours'),
    (v_project, v_insp_id, (now() AT TIME ZONE 'America/New_York')::date,
     'draft', '[]'::jsonb,
     jsonb_build_object('weather','Partly cloudy, 68°F','crew_count',5,'notes','Continued curb installation, inlet adjustments'),
     NULL)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete. Project %, % activities, demo users created: %',
    v_project,
    (SELECT count(*) FROM public.schedule_activities WHERE project_id = v_project),
    v_seed_result;
END $$;
