// Time Impact Analysis (TIA) draft generator. Operates on the project's
// ScheduleActivity shape, not XER. Produces an ASCII fragnet, a CSV fragment
// suitable for paste-into-P6, and a narrative compliant with NJDOT 108-03.
import type { ActivityRelationship, ScheduleActivity } from '@/lib/schedule/types';

export type DelayType = 'Weather' | 'Owner-directed' | 'Differing site condition' | 'Supply chain' | 'Other';

export interface TiaInput {
  affectedActivityId: string;
  delayStart: string;   // ISO date
  delayDays: number;
  cause: string;
  type: DelayType;
  projectName?: string;
}

export interface TiaOutput {
  fragnetAscii: string;
  narrative: string;
  fragnetCsv: string;
}

export function buildTia(
  activities: ScheduleActivity[],
  relationships: ActivityRelationship[],
  input: TiaInput,
): TiaOutput {
  const act = activities.find(a => a.id === input.affectedActivityId);
  if (!act) {
    return { fragnetAscii: 'Activity not found.', narrative: '', fragnetCsv: '' };
  }

  const succLink = relationships.find(r => r.pred_activity_id === act.id);
  const succ = succLink ? activities.find(a => a.id === succLink.succ_activity_id) : undefined;

  const code = act.activity_id || act.wbs_code || act.id.slice(0, 8);
  const succCode = succ ? (succ.activity_id || succ.wbs_code || succ.id.slice(0, 8)) : '';
  const delayCode = `DLY-${code}`;

  const fragnetAscii = [
    `${code} (${act.name})`,
    `        |`,
    `        FS, lag 0`,
    `        v`,
    `${delayCode}  [${input.type}] — ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'}`,
    `        |`,
    `        FS, lag 0`,
    `        v`,
    succ ? `${succCode} (${succ.name})` : `(no successor on file — verify network)`,
  ].join('\n');

  const proj = input.projectName || 'Project';
  const narrative = [
    `TIME IMPACT ANALYSIS — ${proj}`,
    `Subject: Request for Extension of Time — ${input.type} impact to ${code} ${act.name}`,
    ``,
    `1. Description of Event. On ${input.delayStart}, the following event occurred and impacted progress on activity ${code} (${act.name}): ${input.cause}`,
    ``,
    `2. Methodology. In accordance with NYSDOT Specification 108-03 and the NJDOT Construction Scheduling Standard Coding and Procedures Manual, a Time Impact Analysis has been prepared by inserting a fragnet activity (${delayCode}) into the most recently accepted CPM schedule. The fragnet captures ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'} of unavoidable delay using Finish-to-Start logic with zero lag, consistent with the prohibition on negative lags.`,
    ``,
    `3. Schedule Impact. The inserted fragnet pushes activity ${code} and all driving successors out by ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'}. The Critical Path Length Index (CPLI) and total float on the longest path were re-computed; affected float values and a revised projected completion date are attached.`,
    ``,
    `4. Concurrency. Contractor reviewed all open and forecast activities for the same window and identified no concurrent contractor-caused delay; the impact is solely attributable to the ${input.type.toLowerCase()} event described above.`,
    ``,
    `5. Requested Relief. Contractor requests a non-compensable / compensable extension of Contract Time of ${input.delayDays} working day${input.delayDays === 1 ? '' : 's'} pursuant to the contract, with a corresponding adjustment to the milestone date M950 (Project Completion).`,
  ].join('\n');

  const fragnetCsv = [
    'activity_code,activity_name,duration_days,predecessor,relationship,lag_days',
    `${delayCode},"${input.type} — ${input.cause.replace(/"/g, "'")}",${input.delayDays},${code},FS,0`,
    succ ? `${succCode},"${succ.name.replace(/"/g, "'")}",,${delayCode},FS,0` : '',
  ].filter(Boolean).join('\n');

  return { fragnetAscii, narrative, fragnetCsv };
}
