
-- Create a synthetic "Platform: PWA Rollout" project to host the WBS as schedule_activities
DO $$
DECLARE
  owner_id uuid := 'f96bc078-7af2-4f79-89ab-d23adee4de90';
  proj_id uuid;
BEGIN
  SELECT id INTO proj_id FROM public.projects WHERE name = 'Platform: PWA Rollout' AND created_by = owner_id;
  IF proj_id IS NULL THEN
    INSERT INTO public.projects (name, created_by, contract_number, is_bid)
    VALUES ('Platform: PWA Rollout', owner_id, 'INTERNAL-PWA-2026', false)
    RETURNING id INTO proj_id;
  END IF;

  -- Idempotent seed: only insert activities that don't already exist for this project
  INSERT INTO public.schedule_activities (project_id, wbs_code, name, baseline_start, baseline_end, baseline_quantity, percent_complete)
  SELECT proj_id, v.wbs, v.name, v.start_d::date, v.end_d::date, 1, 0
  FROM (VALUES
    -- 1.0 Foundations (1 wk)
    ('PWA-1.1','Refactor Documents.tsx & Demo.tsx into feature modules','2026-05-25','2026-05-27'),
    ('PWA-1.2','Centralize Supabase mutation wrapper','2026-05-26','2026-05-28'),
    ('PWA-1.3','useNetworkStatus hook + status pill','2026-05-27','2026-05-28'),
    ('PWA-1.4','Resilient realtime reconnect & backfill','2026-05-28','2026-05-29'),
    ('PWA-1.5','Session refresh on visibilitychange','2026-05-29','2026-05-29'),
    -- 2.0 Installable PWA Shell (1 wk)
    ('PWA-2.1','Generate PWA app icons (192/512/maskable/apple)','2026-06-01','2026-06-01'),
    ('PWA-2.2','manifest.webmanifest with TakeoffPro identity','2026-06-01','2026-06-02'),
    ('PWA-2.3','iOS meta tags & splash images','2026-06-02','2026-06-03'),
    ('PWA-2.4','vite-plugin-pwa with iframe/preview guards','2026-06-02','2026-06-03'),
    ('PWA-2.5','In-app Install CTA (Android + iOS instructions)','2026-06-03','2026-06-04'),
    ('PWA-2.6','Update-available toast with reload action','2026-06-04','2026-06-05'),
    -- 3.0 Read-Only Offline (1 wk)
    ('PWA-3.1','Workbox caching strategies for shell + REST','2026-06-08','2026-06-09'),
    ('PWA-3.2','PDF CacheStorage with 500MB LRU cap','2026-06-09','2026-06-10'),
    ('PWA-3.3','IndexedDB mirror via idb for opened project','2026-06-10','2026-06-11'),
    ('PWA-3.4','React Query persister → IDB','2026-06-11','2026-06-12'),
    ('PWA-3.5','Offline badges on network-required actions','2026-06-12','2026-06-12'),
    -- 4.0 Full Offline R+W with Sync (3 wks)
    ('PWA-4.1','IDB outbox schema & adapter','2026-06-15','2026-06-17'),
    ('PWA-4.2','Route writes through outbox + optimistic cache','2026-06-17','2026-06-19'),
    ('PWA-4.3','Background Sync + foreground drain loop','2026-06-19','2026-06-22'),
    ('PWA-4.4','Per-table conflict policies & resolver UI','2026-06-22','2026-06-26'),
    ('PWA-4.5','Migration: client_op_id + version columns','2026-06-22','2026-06-23'),
    ('PWA-4.6','Photo capture queue with resumable upload','2026-06-25','2026-06-30'),
    ('PWA-4.7','Sync status drawer (pending/retry/discard)','2026-06-29','2026-07-03'),
    -- 5.0 Capacitor Native Bridge (5 wks)
    ('PWA-5.1','Install Capacitor core + iOS/Android','2026-07-06','2026-07-07'),
    ('PWA-5.2','capacitor.config.ts with hot-reload dev URL','2026-07-07','2026-07-08'),
    ('PWA-5.3','Wire native plugins (camera/geo/fs/push/network/app/preferences)','2026-07-08','2026-07-17'),
    ('PWA-5.4','Push wiring: device token → profiles + send-push fn','2026-07-13','2026-07-20'),
    ('PWA-5.5','iOS Info.plist usage descriptions & background modes','2026-07-20','2026-07-22'),
    ('PWA-5.6','Android foreground service & FileProvider','2026-07-20','2026-07-22'),
    ('PWA-5.7','Store assets: screenshots, listings, privacy labels','2026-07-22','2026-07-29'),
    ('PWA-5.8','TestFlight + Play internal pilot','2026-07-27','2026-08-07'),
    ('PWA-5.9','Production release + Sentry Capacitor','2026-08-10','2026-08-14')
  ) AS v(wbs, name, start_d, end_d)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.schedule_activities sa
    WHERE sa.project_id = proj_id AND sa.wbs_code = v.wbs
  );
END $$;
