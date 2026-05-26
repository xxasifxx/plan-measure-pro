// Types for the in-app P6-style scheduler. Mirrors public.schedule_activities
// plus its new P6 columns and the activity_relationships / project_schedule_meta tables.

export type ActivityType =
  | 'task'
  | 'start_milestone'
  | 'finish_milestone'
  | 'loe'
  | 'wbs';

export type RelType = 'FS' | 'SS' | 'FF' | 'SF';

export type ConstraintType =
  | 'SNET' | 'SNLT' | 'FNET' | 'FNLT'
  | 'MSO'  | 'MFO'
  | 'ASAP' | 'ALAP';

export const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  SNET: 'Start No Earlier Than',
  SNLT: 'Start No Later Than',
  FNET: 'Finish No Earlier Than',
  FNLT: 'Finish No Later Than',
  MSO:  'Must Start On',
  MFO:  'Must Finish On',
  ASAP: 'As Soon As Possible',
  ALAP: 'As Late As Possible',
};

export interface ScheduleActivity {
  id: string;
  project_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  activity_id: string | null;
  name: string;
  activity_type: ActivityType;
  baseline_start: string | null;
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
  calendar_id?: string | null;
  constraint_type?: ConstraintType | null;
  constraint_date?: string | null;
  primary_resource_id?: string | null;
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
  calendar: { workdays: number[] };
}

export interface CalendarException {
  date: string;     // ISO date
  hours: number;    // 0 = holiday, >0 = working
  name?: string;
}

export interface ScheduleCalendar {
  id: string;
  project_id: string;
  name: string;
  is_default: boolean;
  hours_per_day: number;
  /** day index → hours (0=Sun..6=Sat). 0 hours = nonworking. */
  workweek: Record<string, number>;
  exceptions: CalendarException[];
}

export type ResourceType = 'labor' | 'material' | 'equipment' | 'nonlabor';

export interface ScheduleResource {
  id: string;
  project_id: string;
  name: string;
  resource_code: string | null;
  resource_type: ResourceType;
  unit: string;
  cost_per_unit: number;
  max_units_per_day: number;
}

export interface ResourceAssignment {
  id: string;
  project_id: string;
  activity_id: string;
  resource_id: string;
  budgeted_units: number;
  actual_units: number;
  remaining_units: number;
  budgeted_cost: number;
  actual_cost: number;
}

export interface ScheduleBaseline {
  id: string;
  project_id: string;
  name: string;
  notes: string | null;
  captured_by: string;
  captured_at: string;
}

export interface BaselineActivity {
  id: string;
  baseline_id: string;
  activity_id: string;
  activity_code: string | null;
  wbs_code: string | null;
  name: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  duration_days: number | null;
  total_float_days: number | null;
  percent_complete: number | null;
  budgeted_cost: number | null;
}

export interface CpmResult {
  byId: Map<string, {
    early_start: string;
    early_finish: string;
    late_start: string;
    late_finish: string;
    total_float_days: number;
    is_critical: boolean;
    constraint_violated?: boolean;
  }>;
  projectStart: string;
  projectFinish: string;
  cycles: string[][];
}
