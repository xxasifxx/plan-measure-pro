-- Phase 6 WBS update: mark Phase 5 native-bridge items complete and Phase 5 store/release items in progress.
UPDATE public.schedule_activities SET percent_complete = 100 WHERE wbs_code IN ('PWA-5.1','PWA-5.2','PWA-5.3','PWA-5.4','PWA-5.5','PWA-5.6');
UPDATE public.schedule_activities SET percent_complete = 50  WHERE wbs_code IN ('PWA-5.7','PWA-5.8','PWA-5.9');