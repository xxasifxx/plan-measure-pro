// Builds PMXML from the live project schedule tables.
// P6 stores durations & lags in HOURS, while the in-app canonical unit is WORKDAYS,
// so we convert days -> hours using a fixed 8h/day so round-trip stays exact.
import type { ActivityRelationship, ScheduleActivity, ScheduleMeta } from '@/lib/schedule/types';

const NS = 'http://xmlns.oracle.com/Primavera/P6/V22.12/API/BusinessObjects';
const HRS_PER_DAY = 8;

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
function dt(iso: string | null | undefined): string {
  if (!iso) return '';
  return `${iso.slice(0, 10)}T07:00:00`;
}
function statusFor(a: ScheduleActivity): 'Not Started' | 'In Progress' | 'Completed' {
  const pct = Number(a.percent_complete || 0);
  if (pct >= 100 || a.actual_finish) return 'Completed';
  if (pct > 0 || a.actual_start) return 'In Progress';
  return 'Not Started';
}
function typeFor(a: ScheduleActivity): string {
  if (a.activity_type === 'start_milestone') return 'Start Milestone';
  if (a.activity_type === 'finish_milestone') return 'Finish Milestone';
  if (a.activity_type === 'loe') return 'Level of Effort';
  if (a.activity_type === 'wbs') return 'WBS Summary';
  return 'Task Dependent';
}
const relCode: Record<string, string> = { FS: 'Finish to Start', SS: 'Start to Start', FF: 'Finish to Finish', SF: 'Start to Finish' };

export async function buildPmxmlFromProject(
  projectId: string,
  activities: ScheduleActivity[],
  relationships: ActivityRelationship[],
  meta: ScheduleMeta | undefined,
): Promise<string> {
  const dataDate = meta?.data_date || new Date().toISOString().slice(0, 10);
  const leaves = activities.filter(a => a.activity_type !== 'wbs');
  const wbs = activities.filter(a => a.activity_type === 'wbs');

  const wbsXml = wbs.map(w => `
    <WBS>
      <ObjectId>${esc(w.id)}</ObjectId>
      <Code>${esc(w.wbs_code)}</Code>
      <Name>${esc(w.name)}</Name>
      <ParentObjectId>${esc(w.parent_wbs_id || '')}</ParentObjectId>
    </WBS>`).join('');

  const actsXml = leaves.map(a => {
    const durDays = Number(a.duration_days || 0);
    const pct = Number(a.percent_complete || 0);
    const plannedHrs = durDays * HRS_PER_DAY;
    const remainingHrs = Math.max(0, plannedHrs * (1 - pct / 100));
    return `
    <Activity>
      <ObjectId>${esc(a.id)}</ObjectId>
      <Id>${esc(a.activity_id || a.wbs_code || a.id.slice(0, 8))}</Id>
      <Name>${esc(a.name)}</Name>
      <Type>${typeFor(a)}</Type>
      <Status>${statusFor(a)}</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>${pct}</PhysicalPercentComplete>
      <PlannedDuration>${plannedHrs}</PlannedDuration>
      <RemainingDuration>${remainingHrs}</RemainingDuration>
      ${a.actual_start ? `<ActualStartDate>${dt(a.actual_start)}</ActualStartDate>` : ''}
      ${a.actual_finish ? `<ActualFinishDate>${dt(a.actual_finish)}</ActualFinishDate>` : ''}
      ${a.baseline_start ? `<PlannedStartDate>${dt(a.baseline_start)}</PlannedStartDate>` : ''}
      ${a.baseline_end ? `<PlannedFinishDate>${dt(a.baseline_end)}</PlannedFinishDate>` : ''}
      <WBSObjectId>${esc(a.parent_wbs_id || '')}</WBSObjectId>
    </Activity>`;
  }).join('');

  const relXml = relationships.map(r => `
    <Relationship>
      <PredecessorActivityObjectId>${esc(r.pred_activity_id)}</PredecessorActivityObjectId>
      <SuccessorActivityObjectId>${esc(r.succ_activity_id)}</SuccessorActivityObjectId>
      <Type>${relCode[r.rel_type] || 'Finish to Start'}</Type>
      <Lag>${Number(r.lag_days || 0) * HRS_PER_DAY}</Lag>
    </Relationship>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="${NS}">
  <Project>
    <Id>${esc(projectId.slice(0, 12))}</Id>
    <Name>${esc(projectId)}</Name>
    <DataDate>${dt(dataDate)}</DataDate>
    ${wbsXml}
    ${actsXml}
    ${relXml}
  </Project>
</APIBusinessObjects>`;
}
