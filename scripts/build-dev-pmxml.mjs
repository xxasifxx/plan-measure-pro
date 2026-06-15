#!/usr/bin/env node
// Emit public/exports/takeoffpro-dev.xml as a Primavera P6 Professional 17.7
// PMXML export of the TakeoffPro development schedule.
//
// The structure of this file is modeled directly on a real P6 Professional
// 17.7 export (see /mnt/user-uploads/EC00620.xml in the working tree of the
// agent that wrote this generator). Field set, field order, boolean values
// (0/1), xsi:nil="true" placeholders for null dates, and the relationship /
// WBS / activity shapes all follow that reference export.
//
// Single-workflow scheduling: we do NOT assume parallel execution of every
// remaining task. We walk activities in WBS / input order and lay them out
// sequentially on a 5x8 work calendar:
//   - Completed activities keep their actual start / finish dates.
//   - In-progress activities anchor at the data date and consume their
//     remaining duration.
//   - Not-started activities are scheduled in order after the data date,
//     each one starting on the next workday after the previous activity
//     finishes (FS-0).
//
// This produces a realistic progress-tracking schedule that P6 can import
// and that reflects how the work is actually being delivered (one workflow,
// not 154 parallel streams).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// ---- schema --------------------------------------------------------------
const SCHEMA_NS  = 'http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/BusinessObjects';
const SCHEMA_LOC = 'http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/BusinessObjects http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/p6apibo.xsd';

// ---- project constants ---------------------------------------------------
// DATA_DATE / PROJECT_S land on a workday at 08:00 so every actual / planned
// date the generator emits sits inside calendar working time.
const DATA_DATE   = '2026-05-29T08:00:00'; // Friday 08:00
const PROJECT_S   = '2025-09-01T08:00:00'; // Monday 08:00
const PROJECT_OID = 4417;
const CALENDAR_OID = 5829;
const CALENDAR_NAME = 'TakeoffPro - 5 Day Workweek';
const OBS_OID = 636;
const CURRENCY_OID = 1;
const ROOT_WBS_OID = 25440;
const ACT_OID_BASE = 99000;
const REL_OID_BASE = 37000;

// ---- phase / stream catalog ---------------------------------------------
const PHASES = [
  { id: 'foundation',  code: 'P1', name: 'Phase 1 - Foundation',              streams: ['01-identity-and-access','02-portfolio-and-pm-home','03-project-onboarding','10-document-management'] },
  { id: 'field',       code: 'P2', name: 'Phase 2 - Field Capture',           streams: ['04-pay-item-catalog','05-field-capture','08-photo-evidence','14-measurement-and-geometry-engine','15-offline-and-native-durability','16-mobile-field-ergonomics'] },
  { id: 'office',      code: 'P3', name: 'Phase 3 - Office Workflow',         streams: ['06-daily-report-lifecycle','07-quantity-to-payment','09-standard-specifications','17-notifications-and-presence','19-onboarding-and-tutorials'] },
  { id: 'scheduling',  code: 'P4', name: 'Phase 4 - Scheduling & Reporting',  streams: ['11-schedule-management','12-project-health-and-controls','13-data-export-and-interoperability','18-compliance-and-audit'] },
  { id: 'gtm',         code: 'P5', name: 'Phase 5 - Go-to-Market',            streams: ['20-sales-and-pitch'] },
];

const STREAM_NAMES = {
  '01-identity-and-access':              'Identity & Access',
  '02-portfolio-and-pm-home':            'Portfolio & PM Home',
  '03-project-onboarding':               'Project Onboarding',
  '04-pay-item-catalog':                 'Pay Item Catalog',
  '05-field-capture':                    'Field Capture',
  '06-daily-report-lifecycle':           'Daily Report Lifecycle',
  '07-quantity-to-payment':              'Quantity to Payment',
  '08-photo-evidence':                   'Photo Evidence',
  '09-standard-specifications':          'Standard Specifications',
  '10-document-management':              'Document Management',
  '11-schedule-management':              'Schedule Management',
  '12-project-health-and-controls':      'Project Health & Controls',
  '13-data-export-and-interoperability': 'Data Export & Interoperability',
  '14-measurement-and-geometry-engine':  'Measurement & Geometry Engine',
  '15-offline-and-native-durability':    'Offline & Native Durability',
  '16-mobile-field-ergonomics':          'Mobile Field Ergonomics',
  '17-notifications-and-presence':       'Notifications & Presence',
  '18-compliance-and-audit':             'Compliance & Audit',
  '19-onboarding-and-tutorials':         'Onboarding & Tutorials',
  '20-sales-and-pitch':                  'Sales & Pitch',
};

const MILESTONES = [
  { code: 'M0', name: 'Baseline schedule locked',           phase: 'foundation' },
  { code: 'M1', name: 'Foundation verified',                phase: 'foundation' },
  { code: 'M2', name: 'Field capture pilot-ready',          phase: 'field' },
  { code: 'M3', name: 'Office workflow approved',           phase: 'office' },
  { code: 'M4', name: 'P6 round-trip + compliance',         phase: 'scheduling' },
  { code: 'M5', name: 'MVP feature-complete',               phase: 'scheduling' },
  { code: 'M6', name: 'Sales-ready / GA',                   phase: 'gtm' },
];

// ---- helpers -------------------------------------------------------------

const xmlEscape = (s) => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const pad2 = (n) => String(n).padStart(2,'0');
const fmtP6 = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:00`;

const parseIso = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };

const statusFor = (a) => a.status === 'Completed' ? 'Completed'
  : a.status === 'In Progress' ? 'In Progress' : 'Not Started';

// GUID-ish: deterministic from a seed string.
function guid(seed) {
  let h = 0x811c9dc5;
  for (const c of seed) { h ^= c.charCodeAt(0); h = (h * 0x01000193) >>> 0; }
  const hex = (n,w) => n.toString(16).padStart(w,'0');
  const a = hex(h,8);
  const b = hex((h ^ 0xdeadbeef) >>> 0, 8);
  return `{${a.slice(0,8).toUpperCase()}-${a.slice(0,4).toUpperCase()}-4${b.slice(1,4).toUpperCase()}-A${b.slice(4,7).toUpperCase()}-${(a+b).slice(0,12).toUpperCase()}}`;
}

function streamKeyOf(a) {
  const root = String(a.wbs || '').split('/')[0];
  return STREAM_NAMES[root] ? root : null;
}

// ---- 5x8 workday calendar math (Mon-Fri, 08:00-16:00 UTC) ----------------
// Supports forward (positive hours) and backward (negative hours) walks so the
// generator can place "completed/in-progress actuals" before the data date and
// "remaining work" after it on the same calendar.
function nextWorkdayStart(d) {
  const x = new Date(d);
  x.setUTCHours(8, 0, 0, 0);
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) {
    x.setUTCDate(x.getUTCDate() + 1);
  }
  return x;
}
function nextSchedulableStart(d) {
  const x = new Date(d);
  if (x.getUTCDay() === 0 || x.getUTCDay() === 6) return nextWorkdayStart(x);
  const minutes = x.getUTCHours() * 60 + x.getUTCMinutes();
  if (minutes < 8 * 60) { x.setUTCHours(8, 0, 0, 0); return x; }
  if (minutes >= 16 * 60) { x.setUTCDate(x.getUTCDate() + 1); return nextWorkdayStart(x); }
  return x;
}
function prevWorkdayEnd(d) {
  const x = new Date(d);
  x.setUTCHours(16, 0, 0, 0);
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) {
    x.setUTCDate(x.getUTCDate() - 1);
  }
  return x;
}
function addWorkHours(start, hours) {
  if (hours === 0) return new Date(start);
  if (hours < 0) return subWorkHours(start, -hours);
  let d = nextSchedulableStart(start);
  let remaining = hours;
  while (remaining > 0) {
    const endOfDay = new Date(d); endOfDay.setUTCHours(16,0,0,0);
    const avail = (endOfDay.getTime() - d.getTime()) / 3600000;
    if (remaining <= avail) { d = new Date(d.getTime() + remaining*3600000); remaining = 0; }
    else { remaining -= avail; const nxt = new Date(d); nxt.setUTCDate(nxt.getUTCDate()+1); d = nextWorkdayStart(nxt); }
  }
  return d;
}
function advanceCursorAfterFinish(d) {
  return nextSchedulableStart(d);
}
function subWorkHours(start, hours) {
  let d = new Date(start);
  const h = d.getUTCHours();
  if (h <= 8 || h > 16 || d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d = prevWorkdayEnd(h <= 8 ? new Date(d.getTime() - 24*3600*1000) : d);
  }
  let remaining = hours;
  while (remaining > 0) {
    const startOfDay = new Date(d); startOfDay.setUTCHours(8,0,0,0);
    const avail = (d.getTime() - startOfDay.getTime()) / 3600000;
    if (remaining <= avail) { d = new Date(d.getTime() - remaining*3600000); remaining = 0; }
    else { remaining -= avail; const prv = new Date(d); prv.setUTCDate(prv.getUTCDate()-1); d = prevWorkdayEnd(prv); }
  }
  return d;
}

// ---- emitters ------------------------------------------------------------

const NIL = (tag) => `      <${tag} xsi:nil="true" />`;

function currencyXml() {
  return `  <Currency>
    <DecimalPlaces>2</DecimalPlaces>
    <DecimalSymbol>Period</DecimalSymbol>
    <DigitGroupingSymbol>Comma</DigitGroupingSymbol>
    <ExchangeRate>1</ExchangeRate>
    <Id>USD</Id>
    <Name>US Dollar</Name>
    <NegativeSymbol>(#1.1)</NegativeSymbol>
    <ObjectId>${CURRENCY_OID}</ObjectId>
    <PositiveSymbol>#1.1</PositiveSymbol>
    <Symbol>$</Symbol>
  </Currency>`;
}

function obsXml() {
  return `  <OBS>
    <Description>TakeoffPro Engineering</Description>
    <GUID>${guid('obs-takeoffpro')}</GUID>
    <Name>TakeoffPro</Name>
    <ObjectId>${OBS_OID}</ObjectId>
    <ParentObjectId xsi:nil="true" />
    <SequenceNumber>0</SequenceNumber>
  </OBS>`;
}

function calendarXml() {
  const week = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => {
    const work = d !== 'Sunday' && d !== 'Saturday';
    if (!work) {
      return `      <StandardWorkHours>
        <DayOfWeek>${d}</DayOfWeek>
        <WorkTime xsi:nil="true" />
      </StandardWorkHours>`;
    }
    return `      <StandardWorkHours>
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
  }).join('\n');
  return `  <Calendar>
    <BaseCalendarObjectId xsi:nil="true" />
    <HoursPerDay>8</HoursPerDay>
    <HoursPerMonth>172</HoursPerMonth>
    <HoursPerWeek>40</HoursPerWeek>
    <HoursPerYear>2000</HoursPerYear>
    <IsDefault>1</IsDefault>
    <IsPersonal>0</IsPersonal>
    <Name>${xmlEscape(CALENDAR_NAME)}</Name>
    <ObjectId>${CALENDAR_OID}</ObjectId>
    <ProjectObjectId xsi:nil="true" />
    <Type>Global</Type>
    <StandardWorkWeek>
${week}
    </StandardWorkWeek>
    <HolidayOrExceptions />
  </Calendar>`;
}

function projectXml(scheduledFinish) {
  return `  <Project>
    <ActivityDefaultActivityType>Task Dependent</ActivityDefaultActivityType>
    <ActivityDefaultCalendarObjectId>${CALENDAR_OID}</ActivityDefaultCalendarObjectId>
    <ActivityDefaultCostAccountObjectId xsi:nil="true" />
    <ActivityDefaultDurationType>Fixed Duration and Units/Time</ActivityDefaultDurationType>
    <ActivityDefaultPercentCompleteType>Physical</ActivityDefaultPercentCompleteType>
    <ActivityDefaultPricePerUnit>0</ActivityDefaultPricePerUnit>
    <ActivityIdBasedOnSelectedActivity>1</ActivityIdBasedOnSelectedActivity>
    <ActivityIdIncrement>10</ActivityIdIncrement>
    <ActivityIdPrefix>TPD</ActivityIdPrefix>
    <ActivityIdSuffix>1000</ActivityIdSuffix>
    <ActivityPercentCompleteBasedOnActivitySteps>0</ActivityPercentCompleteBasedOnActivitySteps>
    <AddActualToRemaining>0</AddActualToRemaining>
    <AllowNegativeActualUnitsFlag>0</AllowNegativeActualUnitsFlag>
    <AnnualDiscountRate>0</AnnualDiscountRate>
    <AnticipatedFinishDate xsi:nil="true" />
    <AnticipatedStartDate xsi:nil="true" />
    <AssignmentDefaultDrivingFlag>1</AssignmentDefaultDrivingFlag>
    <AssignmentDefaultRateType>Price / Unit</AssignmentDefaultRateType>
    <CheckOutStatus>0</CheckOutStatus>
    <CostQuantityRecalculateFlag>0</CostQuantityRecalculateFlag>
    <CriticalActivityFloatLimit>0</CriticalActivityFloatLimit>
    <CriticalActivityPathType>Critical Float</CriticalActivityPathType>
    <DataDate>${DATA_DATE}</DataDate>
    <DefaultPriceTimeUnits>Hour</DefaultPriceTimeUnits>
    <DiscountApplicationPeriod>Month</DiscountApplicationPeriod>
    <EarnedValueComputeType>Activity Percent Complete</EarnedValueComputeType>
    <EarnedValueETCComputeType>PF = 1 / CPI</EarnedValueETCComputeType>
    <EarnedValueETCUserValue>0</EarnedValueETCUserValue>
    <EarnedValueUserPercent>0.0</EarnedValueUserPercent>
    <EnableSummarization>1</EnableSummarization>
    <FiscalYearStartMonth>1</FiscalYearStartMonth>
    <GUID>${guid('project-takeoffpro-dev')}</GUID>
    <Id>TPDEV</Id>
    <IndependentETCLaborUnits>0</IndependentETCLaborUnits>
    <IndependentETCTotalCost>0</IndependentETCTotalCost>
    <LevelingPriority>10</LevelingPriority>
    <LinkActualToActualThisPeriod>1</LinkActualToActualThisPeriod>
    <LinkPercentCompleteWithActual>0</LinkPercentCompleteWithActual>
    <LinkPlannedAndAtCompletionFlag>1</LinkPlannedAndAtCompletionFlag>
    <MustFinishByDate xsi:nil="true" />
    <Name>TakeoffPro Build - Development Schedule</Name>
    <OBSObjectId>${OBS_OID}</OBSObjectId>
    <ObjectId>${PROJECT_OID}</ObjectId>
    <OriginalBudget>0</OriginalBudget>
    <ParentEPSObjectId xsi:nil="true" />
    <PlannedStartDate>${PROJECT_S}</PlannedStartDate>
    <PrimaryResourcesCanMarkActivitiesAsCompleted>1</PrimaryResourcesCanMarkActivitiesAsCompleted>
    <ProjectForecastStartDate xsi:nil="true" />
    <ResetPlannedToRemainingFlag>0</ResetPlannedToRemainingFlag>
    <ResourceCanBeAssignedToSameActivityMoreThanOnce>1</ResourceCanBeAssignedToSameActivityMoreThanOnce>
    <ResourcesCanAssignThemselvesToActivities>1</ResourcesCanAssignThemselvesToActivities>
    <ScheduledFinishDate>${scheduledFinish}</ScheduledFinishDate>
    <Status>Active</Status>
    <StrategicPriority>100</StrategicPriority>
    <SummarizeToWBSLevel>0</SummarizeToWBSLevel>
    <SummaryLevel>Assignment Level</SummaryLevel>
    <UseProjectBaselineForEarnedValue>1</UseProjectBaselineForEarnedValue>
    <WBSCodeSeparator>.</WBSCodeSeparator>
    <WBSObjectId>${ROOT_WBS_OID}</WBSObjectId>
    <WebSiteRootDirectory xsi:nil="true" />
    <WebSiteURL xsi:nil="true" />`;
}

function wbsXml(node) {
  const parent = node.parentOid != null
    ? `<ParentObjectId>${node.parentOid}</ParentObjectId>`
    : `<ParentObjectId xsi:nil="true" />`;
  return `    <WBS>
      <AnticipatedFinishDate xsi:nil="true" />
      <AnticipatedStartDate xsi:nil="true" />
      <Code>${xmlEscape(node.code)}</Code>
      <EarnedValueComputeType>Activity Percent Complete</EarnedValueComputeType>
      <EarnedValueETCComputeType>PF = 1 / CPI</EarnedValueETCComputeType>
      <EarnedValueETCUserValue>0</EarnedValueETCUserValue>
      <EarnedValueUserPercent>0.0</EarnedValueUserPercent>
      <GUID>${guid('wbs-'+node.oid)}</GUID>
      <IndependentETCLaborUnits>0</IndependentETCLaborUnits>
      <IndependentETCTotalCost>0</IndependentETCTotalCost>
      <Name>${xmlEscape(node.name)}</Name>
      <OBSObjectId>${OBS_OID}</OBSObjectId>
      <ObjectId>${node.oid}</ObjectId>
      <OriginalBudget>0</OriginalBudget>
      ${parent}
      <ProjectObjectId>${PROJECT_OID}</ProjectObjectId>
      <SequenceNumber>${node.seq}</SequenceNumber>
      <Status>Active</Status>
      <WBSCategoryObjectId xsi:nil="true" />
    </WBS>`;
}

function activityXml(a) {
  // a: { oid, id, name, status, pct (0..1), plannedStart, plannedFinish,
  //      actualStart, actualFinish, plannedDurationHours, remainingHours,
  //      wbsOid, isMilestone }
  const isMs = a.isMilestone;
  const type = isMs ? 'Finish Milestone' : 'Task Dependent';
  const pct = isMs ? (a.status === 'Completed' ? 1 : 0) : a.pct;
  const plannedDur = isMs ? 0 : a.plannedDurationHours;
  const remainDur  = isMs ? 0 : a.remainingHours;
  const actualDur  = isMs ? 0 : (a.actualHours ?? 0);

  const actStart   = a.actualStart   ? `<ActualStartDate>${fmtP6(a.actualStart)}</ActualStartDate>`   : `<ActualStartDate xsi:nil="true" />`;
  const actFinish  = a.actualFinish  ? `<ActualFinishDate>${fmtP6(a.actualFinish)}</ActualFinishDate>` : `<ActualFinishDate xsi:nil="true" />`;
  // StartDate / FinishDate = current schedule dates (actual if completed/started, else planned).
  const startDate  = a.actualStart  ? fmtP6(a.actualStart)  : fmtP6(a.plannedStart);
  const finishDate = a.actualFinish ? fmtP6(a.actualFinish) : fmtP6(a.plannedFinish);

  return `    <Activity>
      <ActualDuration>${actualDur}</ActualDuration>
      ${actFinish}
      <ActualLaborCost>0</ActualLaborCost>
      <ActualLaborUnits>0</ActualLaborUnits>
      <ActualNonLaborCost>0</ActualNonLaborCost>
      <ActualNonLaborUnits>0</ActualNonLaborUnits>
      ${actStart}
      <ActualThisPeriodLaborCost>0</ActualThisPeriodLaborCost>
      <ActualThisPeriodLaborUnits>0</ActualThisPeriodLaborUnits>
      <ActualThisPeriodNonLaborCost>0</ActualThisPeriodNonLaborCost>
      <ActualThisPeriodNonLaborUnits>0</ActualThisPeriodNonLaborUnits>
      <AtCompletionDuration>${plannedDur}</AtCompletionDuration>
      <AtCompletionExpenseCost>0</AtCompletionExpenseCost>
      <AtCompletionLaborCost>0</AtCompletionLaborCost>
      <AtCompletionLaborUnits>0</AtCompletionLaborUnits>
      <AtCompletionNonLaborCost>0</AtCompletionNonLaborCost>
      <AtCompletionNonLaborUnits>0</AtCompletionNonLaborUnits>
      <AutoComputeActuals>1</AutoComputeActuals>
      <CalendarObjectId>${CALENDAR_OID}</CalendarObjectId>
      <DurationPercentComplete>${pct}</DurationPercentComplete>
      <DurationType>Fixed Duration and Units/Time</DurationType>
      <EstimatedWeight>1</EstimatedWeight>
      <ExpectedFinishDate xsi:nil="true" />
      <ExternalEarlyStartDate xsi:nil="true" />
      <ExternalLateFinishDate xsi:nil="true" />
      <Feedback />
      <FinishDate>${finishDate}</FinishDate>
      <GUID>${guid('act-'+a.oid)}</GUID>
      <Id>${xmlEscape(a.id)}</Id>
      <IsNewFeedback>0</IsNewFeedback>
      <LevelingPriority>Normal</LevelingPriority>
      <Name>${xmlEscape(a.name)}</Name>
      <NonLaborUnitsPercentComplete>0</NonLaborUnitsPercentComplete>
      <NotesToResources />
      <ObjectId>${a.oid}</ObjectId>
      <PercentComplete>${pct}</PercentComplete>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>${pct}</PhysicalPercentComplete>
      <PlannedDuration>${plannedDur}</PlannedDuration>
      <PlannedFinishDate>${fmtP6(a.plannedFinish)}</PlannedFinishDate>
      <PlannedLaborCost>0</PlannedLaborCost>
      <PlannedLaborUnits>0</PlannedLaborUnits>
      <PlannedNonLaborCost>0</PlannedNonLaborCost>
      <PlannedNonLaborUnits>0</PlannedNonLaborUnits>
      <PlannedStartDate>${fmtP6(a.plannedStart)}</PlannedStartDate>
      <PrimaryConstraintDate xsi:nil="true" />
      <PrimaryConstraintType xsi:nil="true" />
      <PrimaryResourceObjectId xsi:nil="true" />
      <ProjectObjectId>${PROJECT_OID}</ProjectObjectId>
      <RemainingDuration>${remainDur}</RemainingDuration>
      <RemainingEarlyFinishDate xsi:nil="true" />
      <RemainingEarlyStartDate xsi:nil="true" />
      <RemainingLaborCost>0</RemainingLaborCost>
      <RemainingLaborUnits>0</RemainingLaborUnits>
      <RemainingLateFinishDate xsi:nil="true" />
      <RemainingLateStartDate xsi:nil="true" />
      <RemainingNonLaborCost>0</RemainingNonLaborCost>
      <RemainingNonLaborUnits>0</RemainingNonLaborUnits>
      <ResumeDate xsi:nil="true" />
      <SecondaryConstraintDate xsi:nil="true" />
      <SecondaryConstraintType xsi:nil="true" />
      <StartDate>${startDate}</StartDate>
      <Status>${a.status}</Status>
      <SuspendDate xsi:nil="true" />
      <Type>${type}</Type>
      <UnitsPercentComplete>${pct}</UnitsPercentComplete>
      <WBSObjectId>${a.wbsOid}</WBSObjectId>
    </Activity>`;
}

function relXml(oid, predOid, succOid) {
  return `    <Relationship>
      <Lag>0</Lag>
      <ObjectId>${oid}</ObjectId>
      <PredecessorActivityObjectId>${predOid}</PredecessorActivityObjectId>
      <PredecessorProjectObjectId>${PROJECT_OID}</PredecessorProjectObjectId>
      <SuccessorActivityObjectId>${succOid}</SuccessorActivityObjectId>
      <SuccessorProjectObjectId>${PROJECT_OID}</SuccessorProjectObjectId>
      <Type>Finish to Start</Type>
    </Relationship>`;
}

// ---- main ----------------------------------------------------------------

function main() {
  const summary = JSON.parse(readFileSync('docs/wbs-dev.activities.json', 'utf8'));
  const acts = summary.activities;

  // 1) WBS hierarchy
  const wbsNodes = [{ oid: ROOT_WBS_OID, code: 'TPDEV', name: 'TakeoffPro Development', parentOid: null, seq: 1 }];
  const phaseWbsOid  = {};
  const streamWbsOid = {};
  let nextWbsOid = ROOT_WBS_OID + 1;
  let seq = 2;
  for (const p of PHASES) {
    phaseWbsOid[p.id] = nextWbsOid;
    wbsNodes.push({ oid: nextWbsOid++, code: p.code, name: p.name, parentOid: ROOT_WBS_OID, seq: seq++ });
    for (const sk of p.streams) {
      streamWbsOid[sk] = nextWbsOid;
      wbsNodes.push({ oid: nextWbsOid++, code: sk.split('-')[0], name: STREAM_NAMES[sk], parentOid: phaseWbsOid[p.id], seq: seq++ });
    }
  }
  const FALLBACK = '00-uncategorized';
  if (acts.some(a => !streamKeyOf(a))) {
    streamWbsOid[FALLBACK] = nextWbsOid;
    wbsNodes.push({ oid: nextWbsOid++, code: '00', name: 'Uncategorized', parentOid: phaseWbsOid.foundation, seq: seq++ });
  }

  // 2) Order activities: by phase, then stream (catalog order), then input order.
  const phaseIdxByStream = {};
  PHASES.forEach((p, pi) => p.streams.forEach((sk, si) => { phaseIdxByStream[sk] = pi * 100 + si; }));
  const ordered = acts
    .map((a, i) => ({ a, i, sk: streamKeyOf(a) || FALLBACK }))
    .sort((x, y) => (phaseIdxByStream[x.sk] ?? 9999) - (phaseIdxByStream[y.sk] ?? 9999) || x.i - y.i);

  // 3) Single-workflow sequential schedule on a 5x8 calendar.
  //
  // We ignore the degenerate per-activity actual dates in the source (most are
  // pinned to the data date with zero elapsed time) and synthesize a sane
  // chronology that obeys these invariants for every activity:
  //   - Completed:   ActualStart  < ActualFinish <= DataDate
  //   - In Progress: ActualStart  <= DataDate, PlannedFinish > DataDate,
  //                  ActualDuration > 0, RemainingDuration > 0
  //   - Not Started: PlannedStart >= DataDate, no actuals (xsi:nil)
  // All emitted datetimes land on a Mon-Fri workday between 08:00 and 16:00.
  const dataDate = new Date(DATA_DATE);
  const projectStart = new Date(PROJECT_S);

  // Figure out how many completed/in-progress work-hours we need to fit into
  // [projectStart, dataDate] and compress per-activity duration if it overflows.
  let totalElapsedH = 0;
  for (const { a } of ordered) {
    const status = statusFor(a);
    const totalH = Math.max(1, (a.durationDays || 1)) * 8;
    if (status === 'Completed') totalElapsedH += totalH;
    else if (status === 'In Progress') {
      const pct = Math.max(0, Math.min(1, (a.pctComplete || 0) / 100));
      totalElapsedH += Math.max(1, Math.round(totalH * pct));
    }
  }
  let availH = 0;
  {
    let probe = nextWorkdayStart(projectStart);
    while (probe < dataDate) {
      const endOfDay = new Date(probe); endOfDay.setUTCHours(16,0,0,0);
      const hi = endOfDay < dataDate ? endOfDay : dataDate;
      availH += Math.max(0, (hi.getTime() - probe.getTime())/3600000);
      const nxt = new Date(probe); nxt.setUTCDate(nxt.getUTCDate()+1);
      probe = nextWorkdayStart(nxt);
    }
  }
  const compress = totalElapsedH > 0 ? Math.min(1, availH / totalElapsedH) : 1;

  let pastCursor   = nextWorkdayStart(projectStart);
  let futureCursor = nextWorkdayStart(dataDate);
  const activities = [];
  let actOid = ACT_OID_BASE;

  for (const { a, i, sk } of ordered) {
    const status = statusFor(a);
    const durDays = Math.max(1, a.durationDays || 1);
    const totalH = durDays * 8;
    const pct = Math.max(0, Math.min(1, (a.pctComplete || 0) / 100));

    let plannedStart, plannedFinish, actualStart = null, actualFinish = null;
    let remainH, actualH;

    if (status === 'Completed') {
      actualH = Math.max(1, Math.round(totalH * compress));
      remainH = 0;
      actualStart = advanceCursorAfterFinish(pastCursor);
      actualFinish = addWorkHours(pastCursor, actualH);
      if (actualFinish > dataDate) {
        actualFinish = new Date(dataDate);
        actualStart  = subWorkHours(actualFinish, actualH);
      }
      pastCursor = advanceCursorAfterFinish(actualFinish);
      plannedStart = actualStart;
      plannedFinish = actualFinish;
    } else if (status === 'In Progress') {
      const elapsedH = Math.max(1, Math.min(totalH - 1, Math.round(totalH * pct * compress)));
      remainH = totalH - elapsedH;
      actualH = elapsedH;
      actualStart = subWorkHours(dataDate, elapsedH);
      plannedStart = actualStart;
      plannedFinish = addWorkHours(futureCursor, remainH);
      futureCursor = advanceCursorAfterFinish(plannedFinish);
    } else {
      remainH = totalH;
      actualH = 0;
      plannedStart = futureCursor;
      plannedFinish = addWorkHours(futureCursor, totalH);
      futureCursor = advanceCursorAfterFinish(plannedFinish);
    }

    activities.push({
      oid: actOid++,
      id: `TPD${String(1000 + i * 10).padStart(4,'0')}`,
      name: a.name.slice(0, 120),
      status,
      pct,
      plannedStart, plannedFinish,
      actualStart, actualFinish,
      plannedDurationHours: totalH,
      remainingHours: remainH,
      actualHours: actualH,
      wbsOid: streamWbsOid[sk],
      isMilestone: false,
      _phase: PHASES.find(p => p.streams.includes(sk))?.id || 'foundation',
      _orderIdx: activities.length,
    });
  }

  // 4) Milestones — one per phase entry, FS-driven by last activity of phase.
  const milestones = [];
  let msOid = ACT_OID_BASE + 50000;
  for (let mi = 0; mi < MILESTONES.length; mi++) {
    const m = MILESTONES[mi];
    const phaseActs = activities.filter(x => x._phase === m.phase);
    const last = phaseActs[phaseActs.length - 1];
    let anchor = last ? last.plannedFinish : futureCursor;
    if (anchor < dataDate) anchor = new Date(dataDate);
    milestones.push({
      oid: msOid++,
      id: m.code,
      name: `${m.code} - ${m.name}`,
      status: 'Not Started',
      pct: 0,
      plannedStart: anchor,
      plannedFinish: anchor,
      actualStart: null, actualFinish: null,
      plannedDurationHours: 0,
      remainingHours: 0,
      actualHours: 0,
      wbsOid: phaseWbsOid[m.phase],
      isMilestone: true,
      _phase: m.phase,
      _driver: last,
    });
  }

  // 5) Relationships: FS chain within each stream + driver -> milestone.
  const rels = [];
  let relOid = REL_OID_BASE;
  const byStream = new Map();
  for (const a of activities) {
    const key = a.wbsOid;
    if (!byStream.has(key)) byStream.set(key, []);
    byStream.get(key).push(a);
  }
  for (const list of byStream.values()) {
    for (let i = 1; i < list.length; i++) {
      if (list[i].plannedStart >= list[i-1].plannedFinish) {
        rels.push(relXml(relOid++, list[i-1].oid, list[i].oid));
      }
    }
  }
  for (const m of milestones) {
    if (m._driver) rels.push(relXml(relOid++, m._driver.oid, m.oid));
  }

  // 6) Assemble.
  let latestFinish = futureCursor;
  for (const m of milestones) if (m.plannedFinish > latestFinish) latestFinish = m.plannedFinish;
  const scheduledFinish = fmtP6(latestFinish);

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<APIBusinessObjects xmlns="${SCHEMA_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${SCHEMA_LOC}">
${currencyXml()}
${obsXml()}
${calendarXml()}
${projectXml(scheduledFinish)}
${wbsNodes.map(wbsXml).join('\n')}
${activities.map(activityXml).join('\n')}
${milestones.map(activityXml).join('\n')}
${rels.join('\n')}
  </Project>
</APIBusinessObjects>
`;

  mkdirSync('public/exports', { recursive: true });
  writeFileSync('public/exports/takeoffpro-dev.xml', xml);

  console.log(`wrote public/exports/takeoffpro-dev.xml`);
  console.log(`  WBS nodes:    ${wbsNodes.length}`);
  console.log(`  Activities:   ${activities.length}`);
  console.log(`  Milestones:   ${milestones.length}`);
  console.log(`  Relationships:${rels.length}`);
  console.log(`  Schedule:     ${PROJECT_S} -> ${scheduledFinish} (data date ${DATA_DATE})`);
}

main();
