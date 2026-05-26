// Maps parsed P6 inputs (.xer or PMXML) into the shapes used by
// `replace_project_schedule`. All durations standardized to days (P6 hours / 8).
import { parseXer } from '@/lib/xer/parser';
import { parseP6Xml } from '@/lib/p6xml/parser';
import type { XerTables, XerTask } from '@/lib/xer/types';
import type { ActivityType, RelType } from './types';

export interface ImportedActivity {
  ext_id: string;            // stable id from the source file
  parent_ext_id?: string | null;
  wbs_code: string;
  activity_id?: string | null;
  name: string;
  activity_type: ActivityType;
  baseline_start?: string | null;
  baseline_end?: string | null;
  duration_days: number;
  percent_complete: number;
  actual_start?: string | null;
  actual_finish?: string | null;
  sort_order: number;
  manual_finish?: boolean;
}

export interface ImportedRelationship {
  pred_ext_id: string;
  succ_ext_id: string;
  rel_type: RelType;
  lag_days: number;
}

export interface ImportedSchedule {
  activities: ImportedActivity[];
  relationships: ImportedRelationship[];
  meta: { data_date: string | null; calendar: { workdays: number[] } };
  warnings: string[];
  counts: { wbs: number; tasks: number; milestones: number; loe: number; relationships: number };
}

const HRS_PER_DAY = 8;
const hoursToDays = (h?: number) => Math.round(((h ?? 0) / HRS_PER_DAY) * 100) / 100;
const dateOnly = (s?: string | null) => (s ? s.slice(0, 10) : null);

function xerTaskType(t?: string): ActivityType {
  if (t === 'TT_Mile') return 'start_milestone';
  if (t === 'TT_FinMile') return 'finish_milestone';
  if (t === 'TT_LOE') return 'loe';
  if (t === 'TT_WBS') return 'wbs';
  return 'task';
}

function xerRelType(p?: string): RelType {
  if (p === 'PR_SS') return 'SS';
  if (p === 'PR_FF') return 'FF';
  if (p === 'PR_SF') return 'SF';
  return 'FS';
}

function xerStatusPct(t: XerTask): number {
  if (t.status_code === 'TK_Complete') return 100;
  if (t.status_code === 'TK_Active') {
    const planned = t.target_drtn_hr_cnt ?? 0;
    const remain = t.remain_drtn_hr_cnt ?? planned;
    if (planned <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((1 - remain / planned) * 100)));
  }
  return 0;
}

export function importFromXer(text: string): ImportedSchedule {
  const t = parseXer(text);
  return mapXer(t);
}

export function mapXer(t: XerTables): ImportedSchedule {
  const warnings: string[] = [];
  const activities: ImportedActivity[] = [];
  const wbsIds = new Set<string>();

  // WBS first (parents may appear in any order in XER)
  for (const w of t.PROJWBS) {
    wbsIds.add(`W:${w.wbs_id}`);
    activities.push({
      ext_id: `W:${w.wbs_id}`,
      parent_ext_id: w.parent_wbs_id ? `W:${w.parent_wbs_id}` : null,
      wbs_code: w.wbs_short_name || w.wbs_name || `WBS ${w.wbs_id}`,
      name: w.wbs_name || w.wbs_short_name || `WBS ${w.wbs_id}`,
      activity_type: 'wbs',
      duration_days: 0,
      percent_complete: 0,
      sort_order: Number(w.seq_num || 0),
    });
  }

  // Tasks
  t.TASK.forEach((task, i) => {
    const at = xerTaskType(task.task_type);
    const dur = at === 'start_milestone' || at === 'finish_milestone' ? 0 : hoursToDays(task.target_drtn_hr_cnt);
    const parent = task.wbs_id ? `W:${task.wbs_id}` : null;
    if (parent && !wbsIds.has(parent)) warnings.push(`Task ${task.task_code} references unknown WBS ${task.wbs_id}`);
    activities.push({
      ext_id: `T:${task.task_id}`,
      parent_ext_id: parent,
      wbs_code: task.task_code || `A${i + 1}`,
      activity_id: task.task_code,
      name: task.task_name || task.task_code || 'Activity',
      activity_type: at,
      baseline_start: dateOnly(task.target_start_date),
      baseline_end: dateOnly(task.target_end_date),
      duration_days: dur,
      percent_complete: xerStatusPct(task),
      actual_start: dateOnly(task.act_start_date),
      actual_finish: dateOnly(task.act_end_date),
      sort_order: i,
      manual_finish: true, // P6 finish dates are authoritative on import
    });
  });

  // Relationships
  const taskExt = new Set(t.TASK.map(x => `T:${x.task_id}`));
  const relationships: ImportedRelationship[] = [];
  for (const r of t.TASKPRED) {
    const pred = `T:${r.pred_task_id}`;
    const succ = `T:${r.task_id}`;
    if (!taskExt.has(pred) || !taskExt.has(succ)) {
      warnings.push(`Relationship ${r.task_pred_id} references unknown task(s); skipped`);
      continue;
    }
    relationships.push({
      pred_ext_id: pred,
      succ_ext_id: succ,
      rel_type: xerRelType(r.pred_type),
      lag_days: hoursToDays(r.lag_hr_cnt),
    });
  }

  const project = t.PROJECT[0];
  const counts = {
    wbs: t.PROJWBS.length,
    tasks: t.TASK.length,
    milestones: t.TASK.filter(x => x.task_type === 'TT_Mile' || x.task_type === 'TT_FinMile').length,
    loe: t.TASK.filter(x => x.task_type === 'TT_LOE').length,
    relationships: relationships.length,
  };

  return {
    activities,
    relationships,
    meta: { data_date: dateOnly(project?.last_recalc_date) || dateOnly(project?.plan_start_date), calendar: { workdays: [1, 2, 3, 4, 5] } },
    warnings,
    counts,
  };
}

const PMXML_REL: Record<string, RelType> = {
  'Finish to Start': 'FS',
  'Start to Start': 'SS',
  'Finish to Finish': 'FF',
  'Start to Finish': 'SF',
};

const PMXML_TYPE: Record<string, ActivityType> = {
  'Start Milestone': 'start_milestone',
  'Finish Milestone': 'finish_milestone',
  'Level of Effort': 'loe',
  'WBS Summary': 'wbs',
  'Task Dependent': 'task',
  'Resource Dependent': 'task',
};

function pmxmlChildText(el: Element, name: string): string | undefined {
  for (const c of Array.from(el.children)) if (c.localName === name) return c.textContent?.trim() || undefined;
  return undefined;
}
function pmxmlChildNum(el: Element, name: string): number | undefined {
  const t = pmxmlChildText(el, name);
  if (t == null) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function importFromPmxml(text: string): ImportedSchedule {
  const tables = parseP6Xml(text);
  const warnings: string[] = [];
  const projectEl = tables.project._el;
  const activities: ImportedActivity[] = [];
  const wbsIds = new Set<string>();

  // WBS
  let order = 0;
  for (const el of Array.from(projectEl.children)) {
    if (el.localName !== 'WBS') continue;
    const oid = pmxmlChildText(el, 'ObjectId') || pmxmlChildText(el, 'Id') || `wbs-${order}`;
    const ext = `W:${oid}`;
    wbsIds.add(ext);
    const parent = pmxmlChildText(el, 'ParentObjectId');
    activities.push({
      ext_id: ext,
      parent_ext_id: parent ? `W:${parent}` : null,
      wbs_code: pmxmlChildText(el, 'Code') || pmxmlChildText(el, 'Name') || `WBS ${oid}`,
      name: pmxmlChildText(el, 'Name') || pmxmlChildText(el, 'Code') || `WBS ${oid}`,
      activity_type: 'wbs',
      duration_days: 0,
      percent_complete: 0,
      sort_order: order++,
    });
  }

  // Activities
  const actEls = Array.from(projectEl.children).filter(c => c.localName === 'Activity');
  actEls.forEach((el, i) => {
    const oid = pmxmlChildText(el, 'ObjectId') || pmxmlChildText(el, 'Id') || `act-${i}`;
    const typeRaw = pmxmlChildText(el, 'Type') || 'Task Dependent';
    const at = PMXML_TYPE[typeRaw] ?? 'task';
    if (!(typeRaw in PMXML_TYPE)) warnings.push(`Unknown activity type "${typeRaw}" → treated as Task`);
    const wbsRef = pmxmlChildText(el, 'WBSObjectId');
    const parent = wbsRef ? `W:${wbsRef}` : null;
    if (parent && !wbsIds.has(parent)) warnings.push(`Activity ${oid} references unknown WBS ${wbsRef}`);
    const status = pmxmlChildText(el, 'Status');
    let pct = pmxmlChildNum(el, 'PhysicalPercentComplete') ?? pmxmlChildNum(el, 'DurationPercentComplete') ?? 0;
    if (status === 'Completed') pct = 100;
    activities.push({
      ext_id: `T:${oid}`,
      parent_ext_id: parent,
      wbs_code: pmxmlChildText(el, 'Id') || `A${i + 1}`,
      activity_id: pmxmlChildText(el, 'Id'),
      name: pmxmlChildText(el, 'Name') || pmxmlChildText(el, 'Id') || 'Activity',
      activity_type: at,
      baseline_start: dateOnly(pmxmlChildText(el, 'PlannedStartDate')),
      baseline_end: dateOnly(pmxmlChildText(el, 'PlannedFinishDate')),
      duration_days: hoursToDays(pmxmlChildNum(el, 'PlannedDuration')),
      percent_complete: Math.max(0, Math.min(100, pct)),
      actual_start: dateOnly(pmxmlChildText(el, 'ActualStartDate')),
      actual_finish: dateOnly(pmxmlChildText(el, 'ActualFinishDate')),
      sort_order: order + i,
      manual_finish: true,
    });
  });

  // Relationships
  const relationships: ImportedRelationship[] = [];
  const actSet = new Set(actEls.map(el => `T:${pmxmlChildText(el, 'ObjectId') || pmxmlChildText(el, 'Id')}`));
  for (const el of Array.from(projectEl.children)) {
    if (el.localName !== 'Relationship') continue;
    const pred = `T:${pmxmlChildText(el, 'PredecessorActivityObjectId') || ''}`;
    const succ = `T:${pmxmlChildText(el, 'SuccessorActivityObjectId') || ''}`;
    if (!actSet.has(pred) || !actSet.has(succ)) {
      warnings.push(`Relationship ${pred}→${succ} references unknown activity; skipped`);
      continue;
    }
    const typeRaw = pmxmlChildText(el, 'Type') || 'Finish to Start';
    relationships.push({
      pred_ext_id: pred,
      succ_ext_id: succ,
      rel_type: PMXML_REL[typeRaw] || 'FS',
      lag_days: hoursToDays(pmxmlChildNum(el, 'Lag')),
    });
  }

  const counts = {
    wbs: activities.filter(a => a.activity_type === 'wbs').length,
    tasks: activities.filter(a => a.activity_type !== 'wbs').length,
    milestones: activities.filter(a => a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone').length,
    loe: activities.filter(a => a.activity_type === 'loe').length,
    relationships: relationships.length,
  };

  return {
    activities,
    relationships,
    meta: { data_date: dateOnly(tables.project.dataDate) || null, calendar: { workdays: [1, 2, 3, 4, 5] } },
    warnings,
    counts,
  };
}

export function detectAndImport(filename: string, text: string): ImportedSchedule {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xml') || text.trimStart().startsWith('<')) return importFromPmxml(text);
  return importFromXer(text);
}
