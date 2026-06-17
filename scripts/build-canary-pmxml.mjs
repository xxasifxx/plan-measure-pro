#!/usr/bin/env node
// Session 1 canary: smallest plausible PMXML that should import into P6 Pro 17.7
// without rejecting any child records.
//
// Structure mirrors /mnt/user-uploads/EC00620.xml (a real P6 17.7 export) but
// stripped to one Calendar, one OBS, one WBS, two Activities (1 Completed + 1
// Not Started) and one Finish-to-Start Relationship.
//
// Key rules applied (verified against EC00620.xml, not just researcher prose):
//   * Field order within every object is ALPHABETICAL — P6 17.7 schema requires it.
//   * Null dates / optional references are emitted as <Tag xsi:nil="true" />,
//     NOT omitted (reference export includes them on every activity).
//   * <PrimaryResourceObjectId> is OMITTED when there is no resource
//     (reference only emits it with a value; we have no resources here).
//   * Relationship <Type> uses full strings ("Finish to Start").
//   * <Lag> is in working hours, not days.
//   * Durations are in HOURS (PlannedDuration=80 means 80h = 10d @ 8h/d).
//   * ObjectIds use a unique high range so they cannot collide with anything
//     already in the target P6 database.
//
// Output: public/exports/canary-minimal.xml

import { writeFileSync, mkdirSync } from 'node:fs';

const NS  = 'http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/BusinessObjects';
const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const LOC = `${NS} http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/p6apibo.xsd`;

// ---- IDs (unique high range to dodge DB collisions) ---------------------
const OID = {
  obs:        950001,
  calendar:   950002,
  project:    950003,
  wbsRoot:    950100,
  actA:       960001,
  actB:       960002,
  rel:        970001,
};

// ---- dates ---------------------------------------------------------------
const DATA_DATE   = '2026-06-15T08:00:00';
const PROJ_START  = '2026-06-01T08:00:00';
const A_ACT_START = '2026-06-01T08:00:00';
const A_ACT_FIN   = '2026-06-12T16:00:00';   // 2 weeks, M-F
const A_PLAN_S    = '2026-06-01T08:00:00';
const A_PLAN_F    = '2026-06-12T16:00:00';
const B_PLAN_S    = '2026-06-15T08:00:00';
const B_PLAN_F    = '2026-06-26T16:00:00';
const PROJ_FIN    = '2026-06-26T16:00:00';

// ---- xml helpers ---------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
const nil = (tag) => `<${tag} xsi:nil="true" />`;
const tag = (name, value) => value === null || value === undefined || value === ''
  ? nil(name)
  : `<${name}>${esc(value)}</${name}>`;

function guid() {
  // {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX} uppercase, matches reference shape
  const h = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
  const seg = (n) => Array.from({length:n}, h).join('');
  return `{${seg(8)}-${seg(4)}-${seg(4)}-${seg(4)}-${seg(12)}}`;
}

// ---- workweek (mirrors reference) ----------------------------------------
function workWeekXml() {
  const workDay = (d) => `      <StandardWorkHours>
        <DayOfWeek>${d}</DayOfWeek>
        <WorkTime>
          <Start>08:00:00</Start>
          <Finish>11:59:00</Finish>
        </WorkTime>
        <WorkTime>
          <Start>13:00:00</Start>
          <Finish>16:59:00</Finish>
        </WorkTime>
      </StandardWorkHours>`;
  const offDay = (d) => `      <StandardWorkHours>
        <DayOfWeek>${d}</DayOfWeek>
        <WorkTime xsi:nil="true" />
      </StandardWorkHours>`;
  return [
    offDay('Sunday'),
    workDay('Monday'), workDay('Tuesday'), workDay('Wednesday'),
    workDay('Thursday'), workDay('Friday'),
    offDay('Saturday'),
  ].join('\n');
}

// ---- emitters: every field list is alphabetical, no exceptions -----------
function obsXml() {
  return `  <OBS>
    <GUID>${guid()}</GUID>
    <Name>Canary Org</Name>
    <ObjectId>${OID.obs}</ObjectId>
    <ParentObjectId xsi:nil="true" />
    <SequenceNumber>0</SequenceNumber>
  </OBS>`;
}

function calendarXml() {
  return `  <Calendar>
    <BaseCalendarObjectId xsi:nil="true" />
    <HoursPerDay>8</HoursPerDay>
    <HoursPerMonth>172</HoursPerMonth>
    <HoursPerWeek>40</HoursPerWeek>
    <HoursPerYear>2000</HoursPerYear>
    <IsDefault>1</IsDefault>
    <IsPersonal>0</IsPersonal>
    <Name>Canary 5 Day Workweek</Name>
    <ObjectId>${OID.calendar}</ObjectId>
    <ProjectObjectId xsi:nil="true" />
    <Type>Global</Type>
    <StandardWorkWeek>
${workWeekXml()}
    </StandardWorkWeek>
    <HolidayOrExceptions />
  </Calendar>`;
}

function wbsXml() {
  return `    <WBS>
      <AnticipatedFinishDate xsi:nil="true" />
      <AnticipatedStartDate xsi:nil="true" />
      <Code>CAN</Code>
      <EarnedValueComputeType>Activity Percent Complete</EarnedValueComputeType>
      <EarnedValueETCComputeType>PF = 1 / CPI</EarnedValueETCComputeType>
      <EarnedValueETCUserValue>0</EarnedValueETCUserValue>
      <EarnedValueUserPercent>0.0</EarnedValueUserPercent>
      <GUID>${guid()}</GUID>
      <IndependentETCLaborUnits>0</IndependentETCLaborUnits>
      <IndependentETCTotalCost>0</IndependentETCTotalCost>
      <Name>Canary Root</Name>
      <OBSObjectId>${OID.obs}</OBSObjectId>
      <ObjectId>${OID.wbsRoot}</ObjectId>
      <OriginalBudget>0</OriginalBudget>
      <ParentObjectId xsi:nil="true" />
      <ProjectObjectId>${OID.project}</ProjectObjectId>
      <SequenceNumber>1</SequenceNumber>
      <Status>Active</Status>
      <WBSCategoryObjectId xsi:nil="true" />
    </WBS>`;
}

// Activity emitter — fields STRICTLY alphabetical.
// Status drives which date fields are real values vs xsi:nil.
function activityXml(opts) {
  const {
    objectId, id, name, status,
    plannedDurationHrs, actualDurationHrs = 0, remainingDurationHrs,
    actualStart, actualFinish,
    plannedStart, plannedFinish,
    remainingEarlyStart, remainingEarlyFinish,
    physicalPct, // 0-1 (P6 stores 0..1)
  } = opts;

  const atComplete = (actualDurationHrs || 0) + (remainingDurationHrs || 0);

  return `    <Activity>
      <ActualDuration>${actualDurationHrs}</ActualDuration>
      ${actualFinish ? tag('ActualFinishDate', actualFinish) : nil('ActualFinishDate')}
      <ActualLaborCost>0</ActualLaborCost>
      <ActualLaborUnits>0</ActualLaborUnits>
      <ActualNonLaborCost>0</ActualNonLaborCost>
      <ActualNonLaborUnits>0</ActualNonLaborUnits>
      ${actualStart ? tag('ActualStartDate', actualStart) : nil('ActualStartDate')}
      <ActualThisPeriodLaborCost>0</ActualThisPeriodLaborCost>
      <ActualThisPeriodLaborUnits>0</ActualThisPeriodLaborUnits>
      <ActualThisPeriodNonLaborCost>0</ActualThisPeriodNonLaborCost>
      <ActualThisPeriodNonLaborUnits>0</ActualThisPeriodNonLaborUnits>
      <AtCompletionDuration>${atComplete}</AtCompletionDuration>
      <AtCompletionExpenseCost>0</AtCompletionExpenseCost>
      <AtCompletionLaborCost>0</AtCompletionLaborCost>
      <AtCompletionLaborUnits>0</AtCompletionLaborUnits>
      <AtCompletionNonLaborCost>0</AtCompletionNonLaborCost>
      <AtCompletionNonLaborUnits>0</AtCompletionNonLaborUnits>
      <AutoComputeActuals>0</AutoComputeActuals>
      <CalendarObjectId>${OID.calendar}</CalendarObjectId>
      <DurationPercentComplete>${physicalPct}</DurationPercentComplete>
      <DurationType>Fixed Duration and Units/Time</DurationType>
      <EstimatedWeight>1</EstimatedWeight>
      <ExpectedFinishDate xsi:nil="true" />
      <ExternalEarlyStartDate xsi:nil="true" />
      <ExternalLateFinishDate xsi:nil="true" />
      <Feedback />
      ${actualFinish ? tag('FinishDate', actualFinish) : tag('FinishDate', plannedFinish)}
      <GUID>${guid()}</GUID>
      <Id>${esc(id)}</Id>
      <IsNewFeedback>0</IsNewFeedback>
      <LevelingPriority>Normal</LevelingPriority>
      <Name>${esc(name)}</Name>
      <NonLaborUnitsPercentComplete>0</NonLaborUnitsPercentComplete>
      <NotesToResources />
      <ObjectId>${objectId}</ObjectId>
      <PercentComplete>${physicalPct}</PercentComplete>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>${physicalPct}</PhysicalPercentComplete>
      <PlannedDuration>${plannedDurationHrs}</PlannedDuration>
      <PlannedFinishDate>${plannedFinish}</PlannedFinishDate>
      <PlannedLaborCost>0</PlannedLaborCost>
      <PlannedLaborUnits>0</PlannedLaborUnits>
      <PlannedNonLaborCost>0</PlannedNonLaborCost>
      <PlannedNonLaborUnits>0</PlannedNonLaborUnits>
      <PlannedStartDate>${plannedStart}</PlannedStartDate>
      <PrimaryConstraintDate xsi:nil="true" />
      <PrimaryConstraintType xsi:nil="true" />
      <ProjectObjectId>${OID.project}</ProjectObjectId>
      <RemainingDuration>${remainingDurationHrs}</RemainingDuration>
      ${remainingEarlyFinish ? tag('RemainingEarlyFinishDate', remainingEarlyFinish) : nil('RemainingEarlyFinishDate')}
      ${remainingEarlyStart ? tag('RemainingEarlyStartDate', remainingEarlyStart) : nil('RemainingEarlyStartDate')}
      <RemainingLaborCost>0</RemainingLaborCost>
      <RemainingLaborUnits>0</RemainingLaborUnits>
      <RemainingLateFinishDate xsi:nil="true" />
      <RemainingLateStartDate xsi:nil="true" />
      <RemainingNonLaborCost>0</RemainingNonLaborCost>
      <RemainingNonLaborUnits>0</RemainingNonLaborUnits>
      <ResumeDate xsi:nil="true" />
      <SecondaryConstraintDate xsi:nil="true" />
      <SecondaryConstraintType xsi:nil="true" />
      ${actualStart ? tag('StartDate', actualStart) : tag('StartDate', plannedStart)}
      <Status>${status}</Status>
      <SuspendDate xsi:nil="true" />
      <Type>Task Dependent</Type>
      <UnitsPercentComplete>${physicalPct}</UnitsPercentComplete>
      <WBSObjectId>${OID.wbsRoot}</WBSObjectId>
    </Activity>`;
}

function relationshipXml() {
  return `    <Relationship>
      <Lag>0</Lag>
      <ObjectId>${OID.rel}</ObjectId>
      <PredecessorActivityObjectId>${OID.actA}</PredecessorActivityObjectId>
      <PredecessorProjectObjectId>${OID.project}</PredecessorProjectObjectId>
      <SuccessorActivityObjectId>${OID.actB}</SuccessorActivityObjectId>
      <SuccessorProjectObjectId>${OID.project}</SuccessorProjectObjectId>
      <Type>Finish to Start</Type>
    </Relationship>`;
}

// ---- assemble ------------------------------------------------------------
const actCompleted = activityXml({
  objectId: OID.actA,
  id: 'CAN1000',
  name: 'Canary Completed Activity',
  status: 'Completed',
  plannedDurationHrs: 80,
  actualDurationHrs: 80,
  remainingDurationHrs: 0,
  actualStart: A_ACT_START,
  actualFinish: A_ACT_FIN,
  plannedStart: A_PLAN_S,
  plannedFinish: A_PLAN_F,
  remainingEarlyStart: null,
  remainingEarlyFinish: null,
  physicalPct: 1,
});

const actNotStarted = activityXml({
  objectId: OID.actB,
  id: 'CAN1010',
  name: 'Canary Not Started Activity',
  status: 'Not Started',
  plannedDurationHrs: 80,
  actualDurationHrs: 0,
  remainingDurationHrs: 80,
  actualStart: null,
  actualFinish: null,
  plannedStart: B_PLAN_S,
  plannedFinish: B_PLAN_F,
  remainingEarlyStart: B_PLAN_S,
  remainingEarlyFinish: B_PLAN_F,
  physicalPct: 0,
});

// Project — fields alphabetical, mirrors reference subset
const projectXml = `  <Project>
    <ActivityDefaultActivityType>Task Dependent</ActivityDefaultActivityType>
    <ActivityDefaultCalendarObjectId>${OID.calendar}</ActivityDefaultCalendarObjectId>
    <ActivityDefaultCostAccountObjectId xsi:nil="true" />
    <ActivityDefaultDurationType>Fixed Duration and Units/Time</ActivityDefaultDurationType>
    <ActivityDefaultPercentCompleteType>Physical</ActivityDefaultPercentCompleteType>
    <ActivityDefaultPricePerUnit>0</ActivityDefaultPricePerUnit>
    <ActivityIdBasedOnSelectedActivity>1</ActivityIdBasedOnSelectedActivity>
    <ActivityIdIncrement>10</ActivityIdIncrement>
    <ActivityIdPrefix>CAN</ActivityIdPrefix>
    <ActivityIdSuffix>1000</ActivityIdSuffix>
    <ActivityPercentCompleteBasedOnActivitySteps>0</ActivityPercentCompleteBasedOnActivitySteps>
    <AddActualToRemaining>0</AddActualToRemaining>
    <AllowNegativeActualUnitsFlag>0</AllowNegativeActualUnitsFlag>
    <AnnualDiscountRate>0</AnnualDiscountRate>
    <AnticipatedFinishDate xsi:nil="true" />
    <AnticipatedStartDate xsi:nil="true" />
    <AssignmentDefaultDrivingFlag>0</AssignmentDefaultDrivingFlag>
    <AssignmentDefaultRateType>Price / Unit</AssignmentDefaultRateType>
    <CheckOutStatus>0</CheckOutStatus>
    <CostQuantityRecalculateFlag>0</CostQuantityRecalculateFlag>
    <CriticalActivityFloatLimit>0</CriticalActivityFloatLimit>
    <CriticalActivityPathType>Critical Float</CriticalActivityPathType>
    <DataDate>${DATA_DATE}</DataDate>
    <DateAdded>${DATA_DATE}</DateAdded>
    <DefaultPriceTimeUnits>Hour</DefaultPriceTimeUnits>
    <DiscountApplicationPeriod>Month</DiscountApplicationPeriod>
    <EarnedValueComputeType>Activity Percent Complete</EarnedValueComputeType>
    <EarnedValueETCComputeType>PF = 1 / CPI</EarnedValueETCComputeType>
    <EarnedValueETCUserValue>0</EarnedValueETCUserValue>
    <EarnedValueUserPercent>0.0</EarnedValueUserPercent>
    <EnableSummarization>1</EnableSummarization>
    <FiscalYearStartMonth>1</FiscalYearStartMonth>
    <GUID>${guid()}</GUID>
    <Id>CANARY01</Id>
    <IndependentETCLaborUnits>0</IndependentETCLaborUnits>
    <IndependentETCTotalCost>0</IndependentETCTotalCost>
    <LevelingPriority>10</LevelingPriority>
    <LinkActualToActualThisPeriod>1</LinkActualToActualThisPeriod>
    <LinkPercentCompleteWithActual>0</LinkPercentCompleteWithActual>
    <LinkPlannedAndAtCompletionFlag>1</LinkPlannedAndAtCompletionFlag>
    <MustFinishByDate xsi:nil="true" />
    <Name>P6 PMXML Canary (TakeoffPro)</Name>
    <OBSObjectId>${OID.obs}</OBSObjectId>
    <ObjectId>${OID.project}</ObjectId>
    <OriginalBudget>0</OriginalBudget>
    <ParentEPSObjectId xsi:nil="true" />
    <PlannedStartDate>${PROJ_START}</PlannedStartDate>
    <PrimaryResourcesCanMarkActivitiesAsCompleted>1</PrimaryResourcesCanMarkActivitiesAsCompleted>
    <ProjectForecastStartDate xsi:nil="true" />
    <ResetPlannedToRemainingFlag>0</ResetPlannedToRemainingFlag>
    <ResourceCanBeAssignedToSameActivityMoreThanOnce>1</ResourceCanBeAssignedToSameActivityMoreThanOnce>
    <ResourcesCanAssignThemselvesToActivities>1</ResourcesCanAssignThemselvesToActivities>
    <ScheduledFinishDate>${PROJ_FIN}</ScheduledFinishDate>
    <Status>Active</Status>
    <StrategicPriority>500</StrategicPriority>
    <SummarizeToWBSLevel>2</SummarizeToWBSLevel>
    <UseProjectBaselineForEarnedValue>1</UseProjectBaselineForEarnedValue>
    <WBSCodeSeparator>.</WBSCodeSeparator>
    <WBSObjectId>${OID.wbsRoot}</WBSObjectId>
${wbsXml()}
${actCompleted}
${actNotStarted}
${relationshipXml()}
  </Project>`;

const xml = `<?xml version="1.0" encoding="utf-8"?>
<APIBusinessObjects xmlns="${NS}" xmlns:xsi="${XSI}" xsi:schemaLocation="${LOC}">
${obsXml()}
${calendarXml()}
${projectXml}
</APIBusinessObjects>
`;

mkdirSync('public/exports', { recursive: true });
writeFileSync('public/exports/canary-minimal.xml', xml, 'utf8');
console.log('Wrote public/exports/canary-minimal.xml', xml.length, 'bytes');
