// Types for the in-app P6-style scheduler. Mirrors public.schedule_activities
// plus its new P6 columns and the activity_relationships / project_schedule_meta tables.

export type ActivityType =
  | 'task'
  | 'start_milestone'
  | 'finish_milestone'
  | 'loe'
  | 'wbs';

export type RelType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ScheduleActivity {
  id: string;
  project_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  activity_id: string | null;
  name: string;
  activity_type: ActivityType;
  baseline_start: string | null;   // ISO date YYYY-MM-DD
  baseline_end: string | null;
  duration_days: number;
  percent_complete: number;
  actual_start: string | null;
  actual_finish: string | null;
  early_start: string | null;
  early_finish: string | null;
  late_start: string | null;
  late_finish: string | null;
  total_float_days: number | null;
  is_critical: boolean;
  sort_order: number;
  pay_item_id: string | null;
  baseline_quantity: number | null;
  manual_finish?: boolean;
  remaining_duration_days?: number | null;
}

export interface ActivityRelationship {
  id: string;
  project_id: string;
  pred_activity_id: string;
  succ_activity_id: string;
  rel_type: RelType;
  lag_days: number;
}

export interface ScheduleMeta {
  project_id: string;
  data_date: string | null;
  calendar: { workdays: number[] };  // 0=Sun..6=Sat; default [1,2,3,4,5]
}

export interface CpmResult {
  byId: Map<string, {
    early_start: string;
    early_finish: string;
    late_start: string;
    late_finish: string;
    total_float_days: number;
    is_critical: boolean;
  }>;
  projectStart: string;
  projectFinish: string;
  cycles: string[][]; // ids forming cycles, if any
}
