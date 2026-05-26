// Builds PMXML from the live project schedule tables — now includes calendars,
// resources, resource assignments and constraint fields for lossless round-trip.
import type {
  ActivityRelationship, ScheduleActivity, ScheduleMeta,
  ScheduleCalendar, ScheduleResource, ResourceAssignment,
} from '@/lib/schedule/types';

const NS = 'http://xmlns.oracle.com/Primavera/P6/V22.12/API/BusinessObjects';
const HRS_PER_DAY = 8;
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

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

const CONSTRAINT_OUT: Record<string, string> = {
  SNET: 'Start On or After',
  SNLT: 'Start On or Before',
  FNET: 'Finish On or After',
  FNLT: 'Finish On or Before',
  MSO: 'Mandatory Start',
  MFO: 'Mandatory Finish',
  ALAP: 'As Late As Possible',
};
const RES_TYPE_OUT: Record<string, string> = {
  labor: 'Labor', material: 'Material', equipment: 'Equipment', nonlabor: 'Nonlabor',
};

function calendarXml(c: ScheduleCalendar): string {
  const wt = (h: number) => h > 0
    ? `<WorkTime><Start>08:00</Start><Finish>${String(8 + Math.min(12, h)).padStart(2,'0')}:00</Finish></WorkTime>`
    : '';
  const wwXml = Object.keys(c.workweek).map(k => {
    const h = Number(c.workweek[k] || 0);
    return `<StandardWorkHours><DayOfWeek>${DAY_NAMES[Number(k)]}</DayOfWeek>${wt(h)}</StandardWorkHours>`;
  }).join('');
  const exXml = (c.exceptions || []).map(e =>
    `<HolidayOrException><Date>${e.date}T00:00:00</Date>${wt(e.hours)}</HolidayOrException>`
  ).join('');
  return `
  <Calendar>
    <ObjectId>${esc(c.id)}</ObjectId>
    <Name>${esc(c.name)}</Name>
    <Type>Project</Type>
    <IsDefault>${c.is_default ? 'true' : 'false'}</IsDefault>
    <HoursPerDay>${c.hours_per_day}</HoursPerDay>
    <StandardWorkWeek>${wwXml}</StandardWorkWeek>
    <HolidayOrExceptions>${exXml}</HolidayOrExceptions>
  </Calendar>`;
}

function resourceXml(r: ScheduleResource): string {
  return `
  <Resource>
    <ObjectId>${esc(r.id)}</ObjectId>
    <Id>${esc(r.resource_code || r.name.slice(0, 20))}</Id>
    <Name>${esc(r.name)}</Name>
    <ResourceType>${RES_TYPE_OUT[r.resource_type] || 'Labor'}</ResourceType>
    <PricePerUnit>${r.cost_per_unit}</PricePerUnit>
    <MaxUnitsPerTime>${r.max_units_per_day}</MaxUnitsPerTime>
    <UnitOfMeasureObjectId>${esc(r.unit)}</UnitOfMeasureObjectId>
  </Resource>`;
}

function assignmentXml(a: ResourceAssignment): string {
  return `
    <ResourceAssignment>
      <ActivityObjectId>${esc(a.activity_id)}</ActivityObjectId>
      <ResourceObjectId>${esc(a.resource_id)}</ResourceObjectId>
      <PlannedUnits>${a.budgeted_units}</PlannedUnits>
      <ActualUnits>${a.actual_units}</ActualUnits>
      <RemainingUnits>${a.remaining_units}</RemainingUnits>
      <PlannedCost>${a.budgeted_cost}</PlannedCost>
      <ActualCost>${a.actual_cost}</ActualCost>
    </ResourceAssignment>`;
}

export async function buildPmxmlFromProject(
  projectId: string,
  activities: ScheduleActivity[],
  relationships: ActivityRelationship[],
  meta: ScheduleMeta | undefined,
  calendars: ScheduleCalendar[] = [],
  resources: ScheduleResource[] = [],
  assignments: ResourceAssignment[] = [],
): Promise<string> {
  const dataDate = meta?.data_date || new Date().toISOString().slice(0, 10);
  const leaves = activities.filter(a => a.activity_type !== 'wbs');
  const wbs = activities.filter(a => a.activity_type === 'wbs');

  const calsXml = calendars.map(calendarXml).join('');
  const resXml = resources.map(resourceXml).join('');

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
    const cstrOut = a.constraint_type ? CONSTRAINT_OUT[a.constraint_type] : '';
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
      ${a.calendar_id ? `<CalendarObjectId>${esc(a.calendar_id)}</CalendarObjectId>` : ''}
      ${cstrOut ? `<PrimaryConstraintType>${cstrOut}</PrimaryConstraintType>` : ''}
      ${cstrOut && a.constraint_date ? `<PrimaryConstraintDate>${dt(a.constraint_date)}</PrimaryConstraintDate>` : ''}
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

  const asgXml = assignments.map(assignmentXml).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="${NS}">
  ${calsXml}
  ${resXml}
  <Project>
    <Id>${esc(projectId.slice(0, 12))}</Id>
    <Name>${esc(projectId)}</Name>
    <DataDate>${dt(dataDate)}</DataDate>
    ${wbsXml}
    ${actsXml}
    ${relXml}
    ${asgXml}
  </Project>
</APIBusinessObjects>`;
}
