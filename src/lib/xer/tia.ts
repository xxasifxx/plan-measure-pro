// Time Impact Analysis (TIA) draft generator.
import type { XerTables, XerTask } from './types';

export type DelayType = 'Weather' | 'Owner-directed' | 'Differing site condition' | 'Supply chain' | 'Other';

export interface TiaInput {
  affectedTaskId: string;
  delayStart: string;   // ISO date
  delayDays: number;
  cause: string;
  type: DelayType;
}

export interface TiaOutput {
  fragnetAscii: string;
  narrative: string;
  fragnetCsv: string;
}

export function buildTia(tbl: XerTables, input: TiaInput): TiaOutput {
  const task = tbl.TASK.find(t => t.task_id === input.affectedTaskId);
  if (!task) {
    return { fragnetAscii: 'Activity not found.', narrative: '', fragnetCsv: '' };
  }
  // Find a successor for the ASCII fragnet
  const succLink = tbl.TASKPRED.find(p => p.pred_task_id === task.task_id);
  const succ = succLink ? tbl.TASK.find(t => t.task_id === succLink.task_id) : undefined;

  const delayCode = `DLY-${task.task_code}`;
  const fragnetAscii = [
    `${task.task_code} (${task.task_name})`,
    `        |`,
    `        FS, lag 0`,
    `        v`,
    `${delayCode}  [${input.type}] — ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'}`,
    `        |`,
    `        FS, lag 0`,
    `        v`,
    succ ? `${succ.task_code} (${succ.task_name})` : `(no successor on file — verify network)`,
  ].join('\n');

  const proj = tbl.PROJECT[0]?.proj_short_name || 'Project';
  const narrative = [
    `TIME IMPACT ANALYSIS — ${proj}`,
    `Subject: Request for Extension of Time — ${input.type} impact to ${task.task_code} ${task.task_name}`,
    ``,
    `1. Description of Event. On ${input.delayStart}, the following event occurred and impacted progress on activity ${task.task_code} (${task.task_name}): ${input.cause}`,
    ``,
    `2. Methodology. In accordance with NYSDOT Specification 108-03 and the NJDOT Construction Scheduling Standard Coding and Procedures Manual, a Time Impact Analysis has been prepared by inserting a fragnet activity (${delayCode}) into the most recently accepted CPM schedule. The fragnet captures ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'} of unavoidable delay using Finish-to-Start logic with zero lag, consistent with the prohibition on negative lags.`,
    ``,
    `3. Schedule Impact. The inserted fragnet pushes activity ${task.task_code} and all driving successors out by ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'}. The Critical Path Length Index (CPLI) and total float on the longest path were re-computed; affected float values and a revised projected completion date are attached.`,
    ``,
    `4. Concurrency. Contractor reviewed all open and forecast activities for the same window and identified no concurrent contractor-caused delay; the impact is solely attributable to the ${input.type.toLowerCase()} event described above.`,
    ``,
    `5. Requested Relief. Contractor requests a non-compensable / compensable extension of Contract Time of ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'} pursuant to the contract, with a corresponding adjustment to the milestone date M950 (Project Completion).`,
  ].join('\n');

  const fragnetCsv = [
    'activity_code,activity_name,duration_days,predecessor,relationship,lag_days',
    `${delayCode},"${input.type} — ${input.cause.replace(/"/g, "'")}",${input.delayDays},${task.task_code},FS,0`,
    succ ? `${succ.task_code},"${succ.task_name.replace(/"/g, "'")}",,${delayCode},FS,0` : '',
  ].filter(Boolean).join('\n');

  return { fragnetAscii, narrative, fragnetCsv };
}
