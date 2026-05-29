#!/usr/bin/env node
// Emit public/exports/takeoffpro-dev.xml from docs/wbs-dev.activities.json.
//
// What we emit:
//   - <APIBusinessObjects> root with the V22.12 namespace (matches our parser)
//   - <Project> with ObjectId/Id/Name/DataDate/PlannedStartDate
//   - One <Activity> per dev-WBS activity, with Status / PercentCompleteType /
//     PhysicalPercentComplete / ActualStartDate / ActualFinishDate /
//     PlannedDuration / RemainingDuration / AtCompletionDuration
//   - <Notes> child on each activity carrying stream + verification status + evidence
//     (preserved by our parser's round-trip — unknown elements survive)
//
// What we do NOT emit:
//   - WBS hierarchy nodes, Relationships, Calendars, Resources, Baselines.
//     Our parser does not read them (see src/lib/p6xml/parser.ts) so emitting
//     them would only inflate the file. The dev-WBS narrative lives in the
//     wbs path string and the <Notes> body. P6 itself would still accept
//     unknown elements, but we'll add those when our parser actually reads them.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SCHEMA_NS = 'http://xmlns.oracle.com/Primavera/P6/V22.12/API/BusinessObjects';
const DATA_DATE = '2026-05-29T00:00:00';
const PROJECT_START = '2025-09-01T08:00:00';

function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isoDateTime(iso) {
  if (!iso) return null;
  // Our parser tolerates "YYYY-MM-DDTHH:MM:SS" without TZ.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19);
}

function durationHours(days) {
  return Math.max(1, Math.round((days || 1) * 8));
}

function activityIdFromUid(uid, idx) {
  // P6 Activity IDs: keep <= 20 chars, A-prefixed; ensure uniqueness.
  const num = String(idx + 1).padStart(4, '0');
  return `A${num}`;
}

function statusFor(a) {
  return a.status === 'Completed' ? 'Completed'
    : a.status === 'In Progress' ? 'In Progress'
    : 'Not Started';
}

function notesBody(a) {
  const lines = [
    `Stream: ${a.stream}`,
    `WBS: ${a.wbs}`,
    `Source: ${a.source}`,
    `Verdict: ${a.verdict}`,
    `code_present=${a.codePresent}  verified_e2e=${a.verifiedE2E}`,
    `Verification status: ${a.verification?.status || 'n/a'}`,
  ];
  if (a.evidence?.length) lines.push(`Evidence: ${a.evidence.slice(0, 4).join(', ')}`);
  if (a.marketingClaimAgeDays != null) lines.push(`Marketing claim age: ${a.marketingClaimAgeDays}d`);
  if (a.note) lines.push(`Note: ${a.note}`);
  return lines.join('\n');
}

function activityXml(a, idx) {
  const aid = activityIdFromUid(a.id, idx);
  const status = statusFor(a);
  const totalHours = durationHours(a.durationDays);
  const remainHours = status === 'Completed' ? 0
    : status === 'Not Started' ? totalHours
    : Math.round(totalHours * (1 - (a.pctComplete || 0) / 100));
  const actualStart = isoDateTime(a.actualStart);
  const actualFinish = status === 'Completed' ? isoDateTime(a.actualFinish) : null;

  const fields = [
    `      <ObjectId>${10000 + idx}</ObjectId>`,
    `      <Id>${aid}</Id>`,
    `      <Name>${xmlEscape(a.name)}</Name>`,
    `      <Status>${status}</Status>`,
    `      <PercentCompleteType>Physical</PercentCompleteType>`,
    `      <PhysicalPercentComplete>${a.pctComplete || 0}</PhysicalPercentComplete>`,
  ];
  if (actualStart)  fields.push(`      <ActualStartDate>${actualStart}</ActualStartDate>`);
  if (actualFinish) fields.push(`      <ActualFinishDate>${actualFinish}</ActualFinishDate>`);
  fields.push(`      <PlannedDuration>${totalHours}</PlannedDuration>`);
  fields.push(`      <RemainingDuration>${remainHours}</RemainingDuration>`);
  fields.push(`      <AtCompletionDuration>${totalHours}</AtCompletionDuration>`);
  fields.push(`      <Notes>${xmlEscape(notesBody(a))}</Notes>`);
  return `    <Activity>\n${fields.join('\n')}\n    </Activity>`;
}

function main() {
  const summary = JSON.parse(readFileSync('docs/wbs-dev.activities.json', 'utf8'));
  const acts = summary.activities;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="${SCHEMA_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Project>
    <ObjectId>9001</ObjectId>
    <Id>TAKEOFFPRO-DEV</Id>
    <Name>TakeoffPro Build — Dev WBS (strict scoring)</Name>
    <DataDate>${DATA_DATE}</DataDate>
    <PlannedStartDate>${PROJECT_START}</PlannedStartDate>
${acts.map(activityXml).join('\n')}
  </Project>
</APIBusinessObjects>
`;
  mkdirSync('public/exports', { recursive: true });
  writeFileSync('public/exports/takeoffpro-dev.xml', xml);
  console.log(`Wrote public/exports/takeoffpro-dev.xml`);
  console.log(`  ${acts.length} activities`);
  console.log(`  strict completion: ${summary.strictCompletionPct}%`);
}

main();
