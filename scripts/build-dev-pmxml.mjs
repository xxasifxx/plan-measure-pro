#!/usr/bin/env node
// Emit public/exports/takeoffpro-dev.xml — a single P6 PMXML import that
// contains everything you'd need to know about the TakeoffPro build project:
//
//   - Project header (TAKEOFFPRO-DEV)
//   - 5-phase WBS (Foundation, Field, Office, Scheduling, GTM)
//   - 22 stream WBS nodes (one per docs/streams/*.md)
//   - One Activity per dev-WBS leaf (from docs/wbs-dev.activities.json),
//     each parented to its stream WBS, with Status / %Complete / Actuals /
//     PlannedDuration / RemainingDuration / Notes (full evidence dump)
//   - 7 Finish-Milestone activities M0..M6 at project level
//   - FS Relationship chains: activities within each stream chain in input
//     order, and each stream's last activity drives its phase milestone
//
// The file is round-trippable by our parser (src/lib/p6xml/parser.ts), which
// preserves the WBS / Relationship / Milestone elements verbatim because
// it only reads Project + Activity (everything else survives serialization).
//
// To open in P6:   File → Import → Primavera XML → New Project.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SCHEMA_NS  = 'http://xmlns.oracle.com/Primavera/P6/V22.12/API/BusinessObjects';
const DATA_DATE  = '2026-05-29T00:00:00';
const PROJECT_S  = '2025-09-01T08:00:00';
const PROJECT_OID = 9001;

// ---- phase definitions (mirrors src/pages/mcfa-pitch/lib/wbs-rollup.ts) ----
const PHASES = [
  { id: 'foundation',  code: 'P1', name: 'Phase 1 — Foundation',              streams: ['01-identity-and-access','02-portfolio-and-pm-home','03-project-onboarding','10-document-management'] },
  { id: 'field',       code: 'P2', name: 'Phase 2 — Field Capture',           streams: ['04-pay-item-catalog','05-field-capture','08-photo-evidence','14-measurement-and-geometry-engine','15-offline-and-native-durability','16-mobile-field-ergonomics'] },
  { id: 'office',      code: 'P3', name: 'Phase 3 — Office Workflow',         streams: ['06-daily-report-lifecycle','07-quantity-to-payment','09-standard-specifications','17-notifications-and-presence','19-onboarding-and-tutorials'] },
  { id: 'scheduling',  code: 'P4', name: 'Phase 4 — Scheduling & Reporting',  streams: ['11-schedule-management','12-project-health-and-controls','13-data-export-and-interoperability','18-compliance-and-audit'] },
  { id: 'gtm',         code: 'P5', name: 'Phase 5 — Go-to-Market',            streams: ['20-sales-and-pitch'] },
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

// ---- helpers --------------------------------------------------------------

const xmlEscape = (s) => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const iso = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0,19);
};

const hours = (d) => Math.max(1, Math.round((d||1) * 8));

const statusFor = (a) => a.status === 'Completed' ? 'Completed'
  : a.status === 'In Progress' ? 'In Progress' : 'Not Started';

function streamKeyOf(a) {
  // a.wbs is like "01-identity-and-access/Docs"
  const root = String(a.wbs || '').split('/')[0];
  return STREAM_NAMES[root] ? root : null;
}

function activityIdFromIdx(idx) {
  return `A${String(idx + 1).padStart(4,'0')}`;
}

function qaLabel(a) {
  if (a.qaStatus === 'Verified')    return 'Verified (E2E)';
  if (a.qaStatus === 'Requires QA') {
    if (a.status === 'Completed')   return 'Built — Requires QA';
    if (a.status === 'In Progress') return 'Partial — Requires QA';
  }
  if (a.status === 'Not Started')   return 'Not Started';
  return a.status || 'Unknown';
}

function notes(a) {
  const lines = [
    `QA: ${qaLabel(a)}`,
    `Stream: ${a.stream}`,
    `WBS path: ${a.wbs}`,
    `Source: ${a.source}`,
    `Verdict: ${a.verdict}`,
    `code_present=${a.codePresent}  verified_e2e=${a.verifiedE2E}`,
    `Verification: ${a.verification?.status || 'n/a'}`,
  ];
  if (a.evidence?.length) lines.push(`Evidence: ${a.evidence.slice(0,4).join(', ')}`);
  if (a.marketingClaimAgeDays != null) lines.push(`Marketing claim age: ${a.marketingClaimAgeDays}d`);
  if (a.note) lines.push(`Note: ${a.note}`);
  return lines.join('\n');
}

// ---- emitters -------------------------------------------------------------

function wbsXml(node) {
  // node = { oid, code, name, parentOid }
  const parent = node.parentOid != null
    ? `\n      <ParentObjectId>${node.parentOid}</ParentObjectId>`
    : '';
  return `    <WBS>
      <ObjectId>${node.oid}</ObjectId>
      <Code>${xmlEscape(node.code)}</Code>
      <Name>${xmlEscape(node.name)}</Name>${parent}
    </WBS>`;
}

function activityXml({ oid, id, name, status, pct, durDays, actualStart, actualFinish, wbsOid, notesBody, isMilestone, qaStatus }) {
  const totalHr  = hours(durDays);
  const remainHr = status === 'Completed' ? 0
    : status === 'Not Started' ? totalHr
    : Math.round(totalHr * (1 - (pct||0)/100));
  // Suffix the Name with a QA tag so it's visible in the P6 activity grid even
  // without opening the Notes / UDF columns.
  const qaTag = qaStatus === 'Verified'    ? '  [Verified]'
              : qaStatus === 'Requires QA' ? '  [Requires QA]'
              : '';
  const lines = [
    `      <ObjectId>${oid}</ObjectId>`,
    `      <Id>${id}</Id>`,
    `      <Name>${xmlEscape(name + qaTag)}</Name>`,
    `      <WBSObjectId>${wbsOid}</WBSObjectId>`,
    `      <Type>${isMilestone ? 'Finish Milestone' : 'Task Dependent'}</Type>`,
    `      <Status>${status}</Status>`,
    `      <PercentCompleteType>Physical</PercentCompleteType>`,
    `      <PhysicalPercentComplete>${pct || 0}</PhysicalPercentComplete>`,
  ];
  if (actualStart)  lines.push(`      <ActualStartDate>${actualStart}</ActualStartDate>`);
  if (actualFinish) lines.push(`      <ActualFinishDate>${actualFinish}</ActualFinishDate>`);
  lines.push(`      <PlannedDuration>${isMilestone ? 0 : totalHr}</PlannedDuration>`);
  lines.push(`      <RemainingDuration>${isMilestone ? 0 : remainHr}</RemainingDuration>`);
  lines.push(`      <AtCompletionDuration>${isMilestone ? 0 : totalHr}</AtCompletionDuration>`);
  if (notesBody) lines.push(`      <Notes>${xmlEscape(notesBody)}</Notes>`);
  if (qaStatus) {
    lines.push(`      <UDF>`);
    lines.push(`        <TypeObjectId>9100</TypeObjectId>`);
    lines.push(`        <Text>${xmlEscape(qaStatus)}</Text>`);
    lines.push(`      </UDF>`);
  }
  return `    <Activity>\n${lines.join('\n')}\n    </Activity>`;
}

function relXml(oid, predOid, succOid) {
  return `    <Relationship>
      <ObjectId>${oid}</ObjectId>
      <PredecessorActivityObjectId>${predOid}</PredecessorActivityObjectId>
      <SuccessorActivityObjectId>${succOid}</SuccessorActivityObjectId>
      <Type>Finish to Start</Type>
      <Lag>0</Lag>
    </Relationship>`;
}

// ---- main -----------------------------------------------------------------

function main() {
  const summary = JSON.parse(readFileSync('docs/wbs-dev.activities.json', 'utf8'));
  const acts    = summary.activities;

  // 1) WBS nodes
  const wbsNodes = [];
  const phaseWbsOid  = {};   // phaseId -> oid
  const streamWbsOid = {};   // streamKey -> oid
  let wbsOid = 100;
  for (const p of PHASES) {
    phaseWbsOid[p.id] = wbsOid;
    wbsNodes.push({ oid: wbsOid++, code: p.code, name: p.name, parentOid: null });
    for (const sk of p.streams) {
      streamWbsOid[sk] = wbsOid;
      wbsNodes.push({
        oid: wbsOid++, code: sk.split('-')[0], name: STREAM_NAMES[sk],
        parentOid: phaseWbsOid[p.id],
      });
    }
  }

  // 2) Activities — keep input order, assign A0001.. ids and place under stream WBS.
  //    Fallback bucket for activities whose stream prefix isn't in the map.
  const FALLBACK_STREAM = '00-uncategorized';
  if (acts.some(a => !streamKeyOf(a))) {
    streamWbsOid[FALLBACK_STREAM] = wbsOid;
    wbsNodes.push({ oid: wbsOid++, code: '00', name: 'Uncategorized', parentOid: phaseWbsOid.foundation });
  }
  const activities = acts.map((a, i) => {
    const sk = streamKeyOf(a) || FALLBACK_STREAM;
    return {
      oid:          10000 + i,
      id:           activityIdFromIdx(i),
      name:         a.name,
      status:       statusFor(a),
      pct:          a.pctComplete || 0,
      durDays:      a.durationDays,
      actualStart:  iso(a.actualStart),
      actualFinish: statusFor(a) === 'Completed' ? iso(a.actualFinish) : null,
      wbsOid:       streamWbsOid[sk],
      notesBody:    notes(a),
      isMilestone:  false,
      qaStatus:     a.qaStatus || null,
      _streamKey:   sk,
    };
  });

  // 3) Milestones — placed under their phase WBS, FS-driven by phase tail activity.
  const milestones = MILESTONES.map((m, i) => ({
    oid:         20000 + i,
    id:          m.code,
    name:        `${m.code} — ${m.name}`,
    status:      'Not Started',
    pct:         0,
    durDays:     0,
    actualStart: null, actualFinish: null,
    wbsOid:      phaseWbsOid[m.phase],
    notesBody:   `Gate milestone for phase ${m.phase.toUpperCase()}.`,
    isMilestone: true,
    _phase:      m.phase,
  }));

  // 4) FS relationships
  //    (a) within each stream, chain activities in input order
  //    (b) each phase's last activity FS-drives its phase milestone(s)
  const rels = [];
  let relOid = 30000;
  const byStream = new Map();
  for (const a of activities) {
    if (!byStream.has(a._streamKey)) byStream.set(a._streamKey, []);
    byStream.get(a._streamKey).push(a);
  }
  for (const list of byStream.values()) {
    for (let i = 1; i < list.length; i++) {
      rels.push(relXml(relOid++, list[i-1].oid, list[i].oid));
    }
  }
  // milestone drivers
  for (const m of milestones) {
    const phase = PHASES.find(p => p.id === m._phase);
    let driver = null;
    for (const sk of phase.streams) {
      const list = byStream.get(sk);
      if (list && list.length) driver = list[list.length - 1];
    }
    if (driver) rels.push(relXml(relOid++, driver.oid, m.oid));
  }

  // 5) Compose
  const body = [
    `    <ObjectId>${PROJECT_OID}</ObjectId>`,
    `    <Id>TAKEOFFPRO-DEV</Id>`,
    `    <Name>TakeoffPro Build — Development Schedule</Name>`,
    `    <DataDate>${DATA_DATE}</DataDate>`,
    `    <PlannedStartDate>${PROJECT_S}</PlannedStartDate>`,
    wbsNodes.map(wbsXml).join('\n'),
    activities.map(activityXml).join('\n'),
    milestones.map(activityXml).join('\n'),
    rels.join('\n'),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="${SCHEMA_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Project>
${body}
  </Project>
</APIBusinessObjects>
`;

  mkdirSync('public/exports', { recursive: true });
  writeFileSync('public/exports/takeoffpro-dev.xml', xml);
  console.log(`Wrote public/exports/takeoffpro-dev.xml`);
  console.log(`  WBS nodes:     ${wbsNodes.length}  (${PHASES.length} phases + streams)`);
  console.log(`  Activities:    ${activities.length}`);
  console.log(`  Milestones:    ${milestones.length}`);
  console.log(`  Relationships: ${rels.length}`);
  console.log(`  Strict completion: ${summary.strictCompletionPct}%`);
}

main();
