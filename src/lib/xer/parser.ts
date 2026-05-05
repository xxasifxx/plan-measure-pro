// Pure-TS parser for Primavera P6 .xer (eXport Eagle Ray) files.
// XER format is tab-delimited with leading tokens:
//   %T <TABLE_NAME>
//   %F <field1> <field2> ...
//   %R <value1> <value2> ...
//   %E (end)
import type { XerTables, XerTask, XerProjWbs, XerTaskPred, XerProject } from './types';

const num = (v: string | undefined): number => {
  if (v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function parseXer(text: string): XerTables {
  const raw: Record<string, Record<string, string>[]> = {};
  const lines = text.split(/\r?\n/);
  let currentTable = '';
  let fields: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    const cols = line.split('\t');
    const tag = cols[0];
    if (tag === '%T') {
      currentTable = (cols[1] || '').trim();
      raw[currentTable] = raw[currentTable] || [];
      fields = [];
    } else if (tag === '%F') {
      fields = cols.slice(1).map(s => s.trim());
    } else if (tag === '%R') {
      if (!currentTable || !fields.length) continue;
      const row: Record<string, string> = {};
      const values = cols.slice(1);
      fields.forEach((f, i) => { row[f] = (values[i] ?? '').trim(); });
      raw[currentTable].push(row);
    }
  }

  const PROJECT: XerProject[] = (raw.PROJECT || []).map(r => ({
    proj_id: r.proj_id,
    proj_short_name: r.proj_short_name || r.proj_name || '',
    plan_start_date: r.plan_start_date,
    plan_end_date: r.plan_end_date,
    last_recalc_date: r.last_recalc_date,
  }));

  const TASK: XerTask[] = (raw.TASK || []).map(r => ({
    task_id: r.task_id,
    task_code: r.task_code,
    task_name: r.task_name,
    proj_id: r.proj_id,
    wbs_id: r.wbs_id,
    task_type: r.task_type,
    status_code: r.status_code,
    target_drtn_hr_cnt: num(r.target_drtn_hr_cnt),
    remain_drtn_hr_cnt: num(r.remain_drtn_hr_cnt),
    total_float_hr_cnt: num(r.total_float_hr_cnt),
    free_float_hr_cnt: num(r.free_float_hr_cnt),
    cstr_type: r.cstr_type,
    cstr_date: r.cstr_date,
    act_start_date: r.act_start_date,
    act_end_date: r.act_end_date,
    early_start_date: r.early_start_date,
    early_end_date: r.early_end_date,
    target_start_date: r.target_start_date,
    target_end_date: r.target_end_date,
    driving_path_flag: r.driving_path_flag,
  }));

  const PROJWBS: XerProjWbs[] = (raw.PROJWBS || []).map(r => ({
    wbs_id: r.wbs_id,
    proj_id: r.proj_id,
    parent_wbs_id: r.parent_wbs_id,
    wbs_short_name: r.wbs_short_name,
    wbs_name: r.wbs_name,
    seq_num: num(r.seq_num),
  }));

  const TASKPRED: XerTaskPred[] = (raw.TASKPRED || []).map(r => ({
    task_pred_id: r.task_pred_id,
    task_id: r.task_id,
    pred_task_id: r.pred_task_id,
    pred_type: r.pred_type,
    lag_hr_cnt: num(r.lag_hr_cnt),
  }));

  return { PROJECT, TASK, PROJWBS, TASKPRED, raw };
}
