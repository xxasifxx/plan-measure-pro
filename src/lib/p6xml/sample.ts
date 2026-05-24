// Compact PMXML sample patterned after Oracle's exported format.
// Uses the canonical APIBusinessObjects root + Business_Objects_22_12 namespace.
// Activities deliberately span Not Started / In Progress so the demo exercises
// both initial-start and percent-bump paths.

export const SAMPLE_P6_XML = `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="http://xmlns.oracle.com/Primavera/P6/V22.12/API/BusinessObjects" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Project>
    <ObjectId>4501</ObjectId>
    <Id>NJTA-104-0001</Id>
    <Name>NJTA I-95 Bridge Deck Rehabilitation</Name>
    <DataDate>2026-05-01T00:00:00</DataDate>
    <PlannedStartDate>2026-03-02T07:00:00</PlannedStartDate>
    <MustFinishByDate>2026-12-18T17:00:00</MustFinishByDate>
    <Activity>
      <ObjectId>10001</ObjectId>
      <Id>A1010</Id>
      <Name>Mobilization &amp; Site Setup</Name>
      <Status>Completed</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>100</PhysicalPercentComplete>
      <ActualStartDate>2026-03-02T07:00:00</ActualStartDate>
      <ActualFinishDate>2026-03-13T16:00:00</ActualFinishDate>
      <PlannedDuration>80</PlannedDuration>
      <RemainingDuration>0</RemainingDuration>
      <AtCompletionDuration>80</AtCompletionDuration>
    </Activity>
    <Activity>
      <ObjectId>10002</ObjectId>
      <Id>A1020</Id>
      <Name>Deck Demolition — Span 1</Name>
      <Status>In Progress</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>40</PhysicalPercentComplete>
      <ActualStartDate>2026-03-16T07:00:00</ActualStartDate>
      <PlannedDuration>120</PlannedDuration>
      <RemainingDuration>72</RemainingDuration>
      <AtCompletionDuration>120</AtCompletionDuration>
    </Activity>
    <Activity>
      <ObjectId>10003</ObjectId>
      <Id>A1030</Id>
      <Name>Reinforcing Steel — Span 1</Name>
      <Status>Not Started</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>0</PhysicalPercentComplete>
      <PlannedDuration>96</PlannedDuration>
      <RemainingDuration>96</RemainingDuration>
      <AtCompletionDuration>96</AtCompletionDuration>
    </Activity>
    <Activity>
      <ObjectId>10004</ObjectId>
      <Id>A1040</Id>
      <Name>Concrete Placement — Span 1</Name>
      <Status>Not Started</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>0</PhysicalPercentComplete>
      <PlannedDuration>64</PlannedDuration>
      <RemainingDuration>64</RemainingDuration>
      <AtCompletionDuration>64</AtCompletionDuration>
    </Activity>
    <Activity>
      <ObjectId>10005</ObjectId>
      <Id>A1050</Id>
      <Name>Parapet &amp; Barrier Install</Name>
      <Status>Not Started</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>0</PhysicalPercentComplete>
      <PlannedDuration>72</PlannedDuration>
      <RemainingDuration>72</RemainingDuration>
      <AtCompletionDuration>72</AtCompletionDuration>
    </Activity>
    <Activity>
      <ObjectId>10006</ObjectId>
      <Id>A1060</Id>
      <Name>Pavement Striping &amp; Markings</Name>
      <Status>Not Started</Status>
      <PercentCompleteType>Physical</PercentCompleteType>
      <PhysicalPercentComplete>0</PhysicalPercentComplete>
      <PlannedDuration>40</PlannedDuration>
      <RemainingDuration>40</RemainingDuration>
      <AtCompletionDuration>40</AtCompletionDuration>
    </Activity>
  </Project>
</APIBusinessObjects>
`;

import type { ApprovedDailyReport } from './types';

/** RE-approved daily reports — the kind the PM would otherwise hand-key into P6. */
export const SAMPLE_DAILY_REPORTS: ApprovedDailyReport[] = [
  { date: '2026-04-20', activityId: 'A1020', cumulativeQty: 1800, contractQty: 3000, approvedByRE: true, inspector: 'R. Patel' },
  { date: '2026-04-27', activityId: 'A1020', cumulativeQty: 2400, contractQty: 3000, approvedByRE: true, inspector: 'R. Patel' },
  { date: '2026-05-04', activityId: 'A1020', cumulativeQty: 3000, contractQty: 3000, isComplete: true, approvedByRE: true, inspector: 'R. Patel' },
  { date: '2026-05-05', activityId: 'A1030', cumulativeQty: 1200, contractQty: 8400, approvedByRE: true, inspector: 'T. Nguyen' },
  { date: '2026-05-12', activityId: 'A1030', cumulativeQty: 3800, contractQty: 8400, approvedByRE: true, inspector: 'T. Nguyen' },
  { date: '2026-05-18', activityId: 'A1030', cumulativeQty: 5600, contractQty: 8400, approvedByRE: true, inspector: 'T. Nguyen' },
];
