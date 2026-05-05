// Typed representations of the Primavera P6 XER tables we care about.
export interface XerTask {
  task_id: string;
  task_code: string;
  task_name: string;
  proj_id?: string;
  wbs_id?: string;
  task_type?: string; // TT_Task | TT_Mile | TT_FinMile | TT_LOE | TT_WBS
  status_code?: string; // TK_NotStart | TK_Active | TK_Complete
  target_drtn_hr_cnt?: number;
  remain_drtn_hr_cnt?: number;
  total_float_hr_cnt?: number;
  free_float_hr_cnt?: number;
  cstr_type?: string; // CS_MSO, CS_MFO, CS_MEO etc
  cstr_date?: string;
  act_start_date?: string;
  act_end_date?: string;
  early_start_date?: string;
  early_end_date?: string;
  target_start_date?: string;
  target_end_date?: string;
  driving_path_flag?: string;
}

export interface XerProjWbs {
  wbs_id: string;
  proj_id: string;
  parent_wbs_id?: string;
  wbs_short_name: string;
  wbs_name: string;
  seq_num?: number;
}

export interface XerTaskPred {
  task_pred_id: string;
  task_id: string; // successor
  pred_task_id: string; // predecessor
  pred_type: string; // PR_FS | PR_SS | PR_FF | PR_SF
  lag_hr_cnt: number;
}

export interface XerProject {
  proj_id: string;
  proj_short_name: string;
  plan_start_date?: string;
  plan_end_date?: string;
  last_recalc_date?: string;
}

export interface XerTables {
  PROJECT: XerProject[];
  TASK: XerTask[];
  PROJWBS: XerProjWbs[];
  TASKPRED: XerTaskPred[];
  // raw table for anything else encountered
  raw: Record<string, Record<string, string>[]>;
}
