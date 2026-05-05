// WBS tree builder + NJDOT milestone compliance checks.
import type { XerTables, XerProjWbs, XerTask } from './types';

export interface WbsNode extends XerProjWbs {
  children: WbsNode[];
  taskCount: number;
}

export function buildWbsTree(tbl: XerTables): WbsNode[] {
  const tasksByWbs: Record<string, number> = {};
  for (const t of tbl.TASK) {
    if (t.wbs_id) tasksByWbs[t.wbs_id] = (tasksByWbs[t.wbs_id] || 0) + 1;
  }
  const nodes: Record<string, WbsNode> = {};
  for (const w of tbl.PROJWBS) {
    nodes[w.wbs_id] = { ...w, children: [], taskCount: tasksByWbs[w.wbs_id] || 0 };
  }
  const roots: WbsNode[] = [];
  for (const w of tbl.PROJWBS) {
    const n = nodes[w.wbs_id];
    if (w.parent_wbs_id && nodes[w.parent_wbs_id]) {
      nodes[w.parent_wbs_id].children.push(n);
    } else {
      roots.push(n);
    }
  }
  return roots;
}

// Per NJDOT Construction Scheduling Standard Coding and Procedures Manual.
// These M-codes are required milestones on every NJDOT capital project schedule.
export const NJDOT_REQUIRED_MILESTONES: { code: string; name: string }[] = [
  { code: 'M100', name: 'Advertisement Date' },
  { code: 'M200', name: 'Bid Opening' },
  { code: 'M300', name: 'Award Date' },
  { code: 'M400', name: 'Notice to Proceed' },
  { code: 'M500', name: 'Construction Start Date' },
  { code: 'M600', name: 'Substantial Completion' },
  { code: 'M700', name: 'Final Inspection' },
  { code: 'M800', name: 'Punch List Complete' },
  { code: 'M950', name: 'Project Completion (Final Acceptance)' },
];

export interface MilestoneCheck {
  code: string;
  name: string;
  present: boolean;
  matchedTask?: XerTask;
}

export function checkNjdotMilestones(tbl: XerTables): MilestoneCheck[] {
  return NJDOT_REQUIRED_MILESTONES.map(m => {
    const matched = tbl.TASK.find(t =>
      (t.task_code || '').toUpperCase().startsWith(m.code) &&
      (t.task_type === 'TT_Mile' || t.task_type === 'TT_FinMile' || t.task_type === 'TT_Task'),
    );
    return { code: m.code, name: m.name, present: !!matched, matchedTask: matched };
  });
}

export function complianceSnapshot(tbl: XerTables) {
  const negativeLags = tbl.TASKPRED.filter(p => p.lag_hr_cnt < 0).length;
  const incomplete = tbl.TASK.filter(t => t.status_code !== 'TK_Complete' && t.task_type !== 'TT_LOE' && t.task_type !== 'TT_WBS');
  // open-ended = missing pred or successor (excluding project-start/project-finish milestones)
  const succBy: Record<string, number> = {};
  const predBy: Record<string, number> = {};
  for (const p of tbl.TASKPRED) {
    succBy[p.pred_task_id] = (succBy[p.pred_task_id] || 0) + 1;
    predBy[p.task_id] = (predBy[p.task_id] || 0) + 1;
  }
  const openEnded = incomplete.filter(t => !succBy[t.task_id] || !predBy[t.task_id]).length;
  return { negativeLags, openEnded, totalTasks: tbl.TASK.length };
}
