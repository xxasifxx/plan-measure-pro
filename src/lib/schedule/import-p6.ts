// Maps a parsed PMXML file into the shapes used by `replace_project_schedule`.
// All durations standardized to days (P6 hours / 8). XER ingest was removed
// when PMXML became the sole round-trip format for Schedule Management.
import { parseP6Xml } from '@/lib/p6xml/parser';
import type {
  ActivityType, RelType, ConstraintType, CalendarException, ResourceType,
} from './types';
import { parsePmxmlCalendar } from './calendars';

export interface ImportedActivity {
  ext_id: string;
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
  calendar_ext_id?: string | null;
  constraint_type?: ConstraintType | null;
  constraint_date?: string | null;
}

export interface ImportedRelationship {
  pred_ext_id: string;
  succ_ext_id: string;
  rel_type: RelType;
  lag_days: number;
}

export interface ImportedCalendar {
  ext_id: string;
  name: string;
  is_default: boolean;
  hours_per_day: number;
  workweek: Record<string, number>;
  exceptions: CalendarException[];
}

export interface ImportedResource {
  ext_id: string;
  name: string;
  resource_code?: string | null;
  resource_type: ResourceType;
  unit: string;
  cost_per_unit: number;
  max_units_per_day: number;
}

export interface ImportedAssignment {
  activity_ext_id: string;
  resource_ext_id: string;
  budgeted_units: number;
  actual_units: number;
  remaining_units: number;
  budgeted_cost: number;
  actual_cost: number;
}

export interface ImportedSchedule {
  activities: ImportedActivity[];
  relationships: ImportedRelationship[];
  calendars: ImportedCalendar[];
  resources: ImportedResource[];
  assignments: ImportedAssignment[];
  meta: { data_date: string | null; calendar: { workdays: number[] } };
  warnings: string[];
  counts: {
    wbs: number; tasks: number; milestones: number; loe: number;
    relationships: number; calendars: number; resources: number; assignments: number;
  };
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

function xerConstraint(t?: string): ConstraintType | null {
  switch (t) {
    case 'CS_MSO':    return 'MSO';
    case 'CS_MFO':    return 'MFO';
    case 'CS_MEO':    return 'SNET';
    case 'CS_MEOA':   return 'SNET';
    case 'CS_MEOB':   return 'SNLT';
    case 'CS_FNET':   return 'FNET';
    case 'CS_FNLT':   return 'FNLT';
    case 'CS_MANDSTART': return 'MSO';
    case 'CS_MANDFIN':   return 'MFO';
    case 'CS_ALAP':   return 'ALAP';
    case 'CS_ASAP':   return 'ASAP';
    default: return null;
  }
}

function xerResourceType(t?: string): ResourceType {
  if (t === 'RT_Mat')   return 'material';
  if (t === 'RT_Equip') return 'equipment';
  if (t === 'RT_Nonlabor') return 'nonlabor';
  return 'labor';
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

  // ===== Calendars =====
  const calendars: ImportedCalendar[] = [];
  const calRows = t.raw?.CALENDAR || [];
  for (const r of calRows) {
    const ext = `C:${r.clndr_id}`;
    const parsed = parseClndrData(r.clndr_data);
    calendars.push({
      ext_id: ext,
      name: r.clndr_name || `Calendar ${r.clndr_id}`,
      is_default: r.default_flag === 'Y',
      hours_per_day: Number(r.day_hr_cnt) || 8,
      workweek: parsed.workweek,
      exceptions: parsed.exceptions,
    });
  }
  if (calendars.length && !calendars.some(c => c.is_default)) calendars[0].is_default = true;

  // ===== Resources =====
  const resources: ImportedResource[] = [];
  const rsrcRows = t.raw?.RSRC || [];
  for (const r of rsrcRows) {
    resources.push({
      ext_id: `R:${r.rsrc_id}`,
      name: r.rsrc_name || r.rsrc_short_name || `Resource ${r.rsrc_id}`,
      resource_code: r.rsrc_short_name || null,
      resource_type: xerResourceType(r.rsrc_type),
      unit: r.unit_id || 'hr',
      cost_per_unit: Number(r.cost_per_qty) || 0,
      max_units_per_day: (Number(r.def_qty_per_hr) || 1) * 8,
    });
  }

  // ===== WBS =====
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

  // ===== Tasks =====
  t.TASK.forEach((task, i) => {
    const at = xerTaskType(task.task_type);
    const dur = at === 'start_milestone' || at === 'finish_milestone' ? 0 : hoursToDays(task.target_drtn_hr_cnt);
    const parent = task.wbs_id ? `W:${task.wbs_id}` : null;
    if (parent && !wbsIds.has(parent)) warnings.push(`Task ${task.task_code} references unknown WBS ${task.wbs_id}`);
    const raw = (t.raw?.TASK || [])[i] || {};
    const calExt = raw.clndr_id ? `C:${raw.clndr_id}` : null;
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
      manual_finish: true,
      calendar_ext_id: calExt,
      constraint_type: xerConstraint(task.cstr_type),
      constraint_date: dateOnly(task.cstr_date),
    });
  });

  // ===== Relationships =====
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

  // ===== Resource assignments =====
  const assignments: ImportedAssignment[] = [];
  const resourceExt = new Set(resources.map(r => r.ext_id));
  for (const r of t.raw?.TASKRSRC || []) {
    const aExt = `T:${r.task_id}`;
    const rExt = `R:${r.rsrc_id}`;
    if (!taskExt.has(aExt) || !resourceExt.has(rExt)) continue;
    const budgetedHrs = Number(r.target_qty) || 0;
    const actualHrs = Number(r.act_reg_qty) || 0;
    const remainingHrs = Number(r.remain_qty) || Math.max(0, budgetedHrs - actualHrs);
    const cpu = Number(r.cost_per_qty) || 0;
    assignments.push({
      activity_ext_id: aExt,
      resource_ext_id: rExt,
      budgeted_units: budgetedHrs,
      actual_units: actualHrs,
      remaining_units: remainingHrs,
      budgeted_cost: Number(r.target_cost) || budgetedHrs * cpu,
      actual_cost: Number(r.act_reg_cost) || actualHrs * cpu,
    });
  }

  const project = t.PROJECT[0];
  const counts = {
    wbs: t.PROJWBS.length,
    tasks: t.TASK.length,
    milestones: t.TASK.filter(x => x.task_type === 'TT_Mile' || x.task_type === 'TT_FinMile').length,
    loe: t.TASK.filter(x => x.task_type === 'TT_LOE').length,
    relationships: relationships.length,
    calendars: calendars.length,
    resources: resources.length,
    assignments: assignments.length,
  };

  return {
    activities, relationships, calendars, resources, assignments,
    meta: {
      data_date: dateOnly(project?.last_recalc_date) || dateOnly(project?.plan_start_date),
      calendar: { workdays: [1, 2, 3, 4, 5] },
    },
    warnings, counts,
  };
}

// ===== PMXML =====
const PMXML_REL: Record<string, RelType> = {
  'Finish to Start': 'FS', 'Start to Start': 'SS',
  'Finish to Finish': 'FF', 'Start to Finish': 'SF',
};
const PMXML_TYPE: Record<string, ActivityType> = {
  'Start Milestone': 'start_milestone',
  'Finish Milestone': 'finish_milestone',
  'Level of Effort': 'loe',
  'WBS Summary': 'wbs',
  'Task Dependent': 'task',
  'Resource Dependent': 'task',
};
const PMXML_CONSTRAINT: Record<string, ConstraintType> = {
  'Start On': 'MSO', 'Mandatory Start': 'MSO',
  'Finish On': 'MFO', 'Mandatory Finish': 'MFO',
  'Start On or After': 'SNET',
  'Start On or Before': 'SNLT',
  'Finish On or After': 'FNET',
  'Finish On or Before': 'FNLT',
  'As Late As Possible': 'ALAP',
};
const PMXML_RES_TYPE: Record<string, ResourceType> = {
  'Labor': 'labor', 'Material': 'material', 'Equipment': 'equipment', 'Nonlabor': 'nonlabor',
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
  const root = tables.doc.documentElement;
  const projectEl = tables.project._el;
  const activities: ImportedActivity[] = [];
  const wbsIds = new Set<string>();

  // ===== Calendars (siblings of Project, OR inside Project) =====
  const calendars: ImportedCalendar[] = [];
  const calendarEls = [
    ...Array.from(root.children).filter(c => c.localName === 'Calendar'),
    ...Array.from(projectEl.children).filter(c => c.localName === 'Calendar'),
  ];
  for (const el of calendarEls) {
    const oid = pmxmlChildText(el, 'ObjectId') || pmxmlChildText(el, 'Id') || `cal-${calendars.length}`;
    const parsed = parsePmxmlCalendar(el);
    calendars.push({
      ext_id: `C:${oid}`,
      name: pmxmlChildText(el, 'Name') || `Calendar ${oid}`,
      is_default: pmxmlChildText(el, 'IsDefault') === 'true' || pmxmlChildText(el, 'Type') === 'Project',
      hours_per_day: pmxmlChildNum(el, 'HoursPerDay') ?? 8,
      workweek: parsed.workweek,
      exceptions: parsed.exceptions,
    });
  }
  if (calendars.length && !calendars.some(c => c.is_default)) calendars[0].is_default = true;

  // ===== Resources (siblings of Project) =====
  const resources: ImportedResource[] = [];
  for (const el of Array.from(root.children)) {
    if (el.localName !== 'Resource') continue;
    const oid = pmxmlChildText(el, 'ObjectId') || pmxmlChildText(el, 'Id') || `res-${resources.length}`;
    resources.push({
      ext_id: `R:${oid}`,
      name: pmxmlChildText(el, 'Name') || `Resource ${oid}`,
      resource_code: pmxmlChildText(el, 'Id') || null,
      resource_type: PMXML_RES_TYPE[pmxmlChildText(el, 'ResourceType') || ''] || 'labor',
      unit: pmxmlChildText(el, 'UnitOfMeasureObjectId') || 'hr',
      cost_per_unit: pmxmlChildNum(el, 'PricePerUnit') ?? 0,
      max_units_per_day: pmxmlChildNum(el, 'MaxUnitsPerTime') ?? 8,
    });
  }

  // ===== WBS =====
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

  // ===== Activities =====
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
    const calRef = pmxmlChildText(el, 'CalendarObjectId');
    const cstrType = pmxmlChildText(el, 'PrimaryConstraintType');
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
      calendar_ext_id: calRef ? `C:${calRef}` : null,
      constraint_type: cstrType ? (PMXML_CONSTRAINT[cstrType] ?? null) : null,
      constraint_date: dateOnly(pmxmlChildText(el, 'PrimaryConstraintDate')),
    });
  });

  // ===== Relationships =====
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
      pred_ext_id: pred, succ_ext_id: succ,
      rel_type: PMXML_REL[typeRaw] || 'FS',
      lag_days: hoursToDays(pmxmlChildNum(el, 'Lag')),
    });
  }

  // ===== Assignments =====
  const assignments: ImportedAssignment[] = [];
  const resourceExt = new Set(resources.map(r => r.ext_id));
  for (const el of Array.from(projectEl.children)) {
    if (el.localName !== 'ResourceAssignment') continue;
    const aRef = pmxmlChildText(el, 'ActivityObjectId');
    const rRef = pmxmlChildText(el, 'ResourceObjectId');
    if (!aRef || !rRef) continue;
    const aExt = `T:${aRef}`;
    const rExt = `R:${rRef}`;
    if (!actSet.has(aExt) || !resourceExt.has(rExt)) continue;
    const budgetedHrs = pmxmlChildNum(el, 'PlannedUnits') ?? 0;
    const actualHrs = pmxmlChildNum(el, 'ActualUnits') ?? 0;
    const remainingHrs = pmxmlChildNum(el, 'RemainingUnits') ?? Math.max(0, budgetedHrs - actualHrs);
    assignments.push({
      activity_ext_id: aExt, resource_ext_id: rExt,
      budgeted_units: budgetedHrs, actual_units: actualHrs, remaining_units: remainingHrs,
      budgeted_cost: pmxmlChildNum(el, 'PlannedCost') ?? 0,
      actual_cost: pmxmlChildNum(el, 'ActualCost') ?? 0,
    });
  }

  const counts = {
    wbs: activities.filter(a => a.activity_type === 'wbs').length,
    tasks: activities.filter(a => a.activity_type !== 'wbs').length,
    milestones: activities.filter(a => a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone').length,
    loe: activities.filter(a => a.activity_type === 'loe').length,
    relationships: relationships.length,
    calendars: calendars.length,
    resources: resources.length,
    assignments: assignments.length,
  };

  return {
    activities, relationships, calendars, resources, assignments,
    meta: { data_date: dateOnly(tables.project.dataDate) || null, calendar: { workdays: [1, 2, 3, 4, 5] } },
    warnings, counts,
  };
}

export function detectAndImport(filename: string, text: string): ImportedSchedule {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xml') || text.trimStart().startsWith('<')) return importFromPmxml(text);
  return importFromXer(text);
}
