-- supabase/seed.sql — Demo / sample-project scaffolding.
--
-- This file is the SKELETON for a polished demo. It is intentionally minimal:
-- it documents the shape of a realistic demo project but does NOT seed users,
-- storage objects, or live RLS-scoped data (those require decisions the team
-- has not made yet — see "TODO" markers below).
--
-- To use: run via `supabase db reset` against a local stack. Requires a real
-- auth.users row whose id is supplied via the :demo_user psql variable, e.g.
--   supabase db reset && psql -v demo_user="'<uuid>'" -f supabase/seed.sql
--
-- This script is idempotent: it uses fixed UUIDs and ON CONFLICT DO NOTHING so
-- re-running won't duplicate rows.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_user uuid := current_setting('demo_user', true)::uuid;
  v_project uuid := '11111111-1111-1111-1111-111111111111';
  v_calibration uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  IF v_user IS NULL THEN
    RAISE NOTICE 'Skipping seed: no :demo_user supplied. Run with -v demo_user="''<uuid>''" to seed.';
    RETURN;
  END IF;

  -- 1. Demo project
  INSERT INTO public.projects (id, name, contract_number, created_by)
  VALUES (v_project, 'NJTA Demo — I-95 Resurfacing (MP 56–62)', 'NJTA-2026-DEMO', v_user)
  ON CONFLICT (id) DO NOTHING;

  -- 2. NJDOT-style pay items (15 representative items across common unit codes)
  INSERT INTO public.pay_items (project_id, item_number, item_code, name, unit, unit_price, contract_quantity, color, drawable)
  VALUES
    (v_project, 100, '152006M', 'Mobilization',                                  'LS',  150000, 1,     '#64748b', false),
    (v_project, 200, '202003P', 'Removal of Concrete Pavement',                  'SY',  18.50,  4800,  '#94a3b8', true),
    (v_project, 300, '202006M', 'Removal of Pipe',                               'LF',  22.00,  1200,  '#a3a3a3', true),
    (v_project, 400, '301021P', 'Dense-Graded Aggregate Base Course, 6\"',       'SY',  14.25,  6500,  '#d97706', true),
    (v_project, 500, '401005P', 'HMA Surface Course 9.5M64, 2\"',                'SY',  21.00,  9200,  '#1f2937', true),
    (v_project, 600, '401015P', 'HMA Base Course 19M64, 4\"',                    'SY',  28.50,  9200,  '#0f172a', true),
    (v_project, 700, '502006P', 'Concrete Curb',                                 'LF',  32.00,  3400,  '#3b82f6', true),
    (v_project, 800, '502012P', 'Concrete Sidewalk, 4\"',                        'SF',  9.75,   8800,  '#60a5fa', true),
    (v_project, 900, '602006M', 'Reinforced Concrete Pipe, 18\"',                'LF',  78.00,  640,   '#0ea5e9', true),
    (v_project,1000, '602030M', 'Inlet, Type B',                                 'EA',  3400,   12,    '#0284c7', false),
    (v_project,1100, '603009P', 'Bituminous Tack Coat',                          'GAL', 4.25,   2200,  '#7c3aed', false),
    (v_project,1200, '604003M', 'Adjusting Manhole',                             'EA',  650,    24,    '#a78bfa', false),
    (v_project,1300, '605006P', 'Topsoiling, 4\" Thick',                         'SY',  6.25,   3100,  '#16a34a', true),
    (v_project,1400, '606003P', 'Seeding & Mulching',                            'SY',  2.75,   3100,  '#65a30d', true),
    (v_project,1500, '610003M', 'Steel-Backed Timber Guide Rail',                'LF',  46.00,  1850,  '#ca8a04', true)
  ON CONFLICT DO NOTHING;

  -- 3. One PDF-scale calibration (1" = 20' at 72 DPI ⇒ ~3.6 px/ft on page 1)
  INSERT INTO public.calibrations (id, project_id, page, point1, point2, real_distance, pixels_per_foot)
  VALUES (
    v_calibration, v_project, 1,
    '{"x": 100, "y": 100}'::jsonb,
    '{"x": 460, "y": 100}'::jsonb,
    100, 3.6
  )
  ON CONFLICT (id) DO NOTHING;

  -- 4. ~10 sample annotations on page 1, mixed types/units.
  --    Coordinates already normalized to scale=1 (per project convention).
  INSERT INTO public.annotations (project_id, user_id, type, points, page, measurement, measurement_unit, location, notes)
  SELECT v_project, v_user, t.type, t.points::jsonb, 1, t.meas, t.unit, t.loc, t.note
  FROM (VALUES
    ('line',    '[{"x":120,"y":200},{"x":340,"y":200}]',                                    61.1,  'LF', 'STA 100+00 R', 'EB curb run A'),
    ('line',    '[{"x":120,"y":260},{"x":260,"y":260},{"x":260,"y":340}]',                  61.1,  'LF', 'STA 100+50 R', 'L-shape curb return'),
    ('polygon', '[{"x":400,"y":200},{"x":520,"y":200},{"x":520,"y":300},{"x":400,"y":300}]',925.9, 'SF', 'STA 101+00',   'Sidewalk pad 1'),
    ('polygon', '[{"x":560,"y":200},{"x":680,"y":200},{"x":680,"y":300},{"x":560,"y":300}]',925.9, 'SF', 'STA 101+25',   'Sidewalk pad 2'),
    ('polygon', '[{"x":120,"y":400},{"x":720,"y":400},{"x":720,"y":520},{"x":120,"y":520}]',5555.6,'SY', 'STA 102+00',   'HMA surface section'),
    ('point',   '[{"x":150,"y":600}]',                                                       1,     'EA', 'STA 103+00 L', 'Inlet Type B'),
    ('point',   '[{"x":250,"y":600}]',                                                       1,     'EA', 'STA 103+50 L', 'Inlet Type B'),
    ('line',    '[{"x":300,"y":600},{"x":540,"y":600}]',                                     66.7,  'LF', 'STA 103+00',   '18" RCP run'),
    ('point',   '[{"x":600,"y":620}]',                                                       1,     'EA', 'STA 104+00',   'Adjust manhole'),
    ('line',    '[{"x":120,"y":700},{"x":720,"y":700}]',                                    166.7,  'LF', 'STA 105+00 R', 'Guide rail')
  ) AS t(type, points, meas, unit, loc, note);

  -- 5. Schedule activities — TODO: hook in via replace_project_schedule()
  --    with a 50-activity NJDOT-realistic XER. Skipped here because the XER
  --    parser fixture (src/lib/xer/sample.ts) is currently ~15 activities;
  --    expanding it is queued for Round 2.

  RAISE NOTICE 'Seed complete for project %.', v_project;
END $$;
