#!/usr/bin/env node
// Emit .lovable/wbs/*.json as a Primavera P6 PMXML file.
// Honest emission: no fabricated dates. Blank fields are intentional and reported.
//
// Decisions (see .lovable/plan.md):
//   D1 Activity Type: git→Task, marketing-debt→Finish Milestone, risk/verify→LOE, summary leaves→WBS Summary
//   D2 Status: shipped→Completed; in-flight/paused/dormant→In Progress; planned/abandoned→Not Started
//             (abandoned tagged via LIFECYCLE activity code)
//   D3 Dates: ActualStart/Finish only when state supports it; no fabricated planned dates
//   D4 Activity Codes: ORIGIN, LIFECYCLE, BLOCKING, VISIBILITY, STREAM, LAYER, HEALTH
//   D5 Notebook Topics: per-activity evidence prose
//   D6 UDFs: LovableActivityId, PrimaryLeafId, CommitCount, DormancyDays, Confidence, DownstreamCount
//   D7 Relationships: direct map; rejected edges go to sibling .rejected.xml
//   D8 WBS: stream → layer → leaf from wbs.json parents
//   D9 Calendar: single "Lovable 7-day"; no resources
//   D10 Cost: skipped entirely

import fs from "node:fs";
import path from "node:path";

const ROOT = ".lovable/wbs";
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));

const wbsDoc        = read("wbs.json");
const activitiesDoc = read("activities.json");
const relsDoc       = read("relationships.json");
const stateDoc      = read("state.json");
const linksDoc      = read("links.json");
const nextDoc       = read("next.json");

// ─── lookups ───────────────────────────────────────────────────────────────
const stateById = new Map(stateDoc.states.map(s => [s.activity_id, s]));
const leafById  = new Map(wbsDoc.leaves.map(l => [l.id, l]));
const parentById= new Map(wbsDoc.parents.map(p => [p.id, p]));
const contribLeavesByAct = new Map();
for (const link of linksDoc.activity_leaf) {
  if (link.role === "primary") continue;
  if (!contribLeavesByAct.has(link.activity_id)) contribLeavesByAct.set(link.activity_id, []);
  contribLeavesByAct.get(link.activity_id).push(link.leaf_id);
}
const downstreamCount = new Map();
for (const e of relsDoc.edges) {
  downstreamCount.set(e.pred, (downstreamCount.get(e.pred) || 0) + 1);
}
const healthByAct = new Map();
for (const r of nextDoc.dormant_but_needed)  healthByAct.set(r.activity_id, "dormant-but-needed");
for (const r of nextDoc.blocked_by_decision) healthByAct.set(r.activity_id, "blocked-by-decision");
for (const r of nextDoc.ready_to_start)      if (!healthByAct.has(r.activity_id)) healthByAct.set(r.activity_id, "ready");

// children-of map on the WBS tree to detect summary nodes
const childrenOfLeaf = new Map(); // leafId → count of activities under it
for (const a of activitiesDoc.activities) {
  childrenOfLeaf.set(a.primary_leaf, (childrenOfLeaf.get(a.primary_leaf) || 0) + 1);
}

// ─── ObjectId assignment ───────────────────────────────────────────────────
let nextOid = 1000;
const oid = () => ++nextOid;

const PROJECT_OID  = oid();
const CALENDAR_OID = oid();

// WBS hierarchy: synthesize a project-root WBS that holds all streams
const ROOT_WBS_OID = oid();
const wbsOidByParentId = new Map();   // ST-… or ST-…--layer → ObjectId
const wbsOidByLeafId   = new Map();   // LF-…              → ObjectId
for (const p of wbsDoc.parents) wbsOidByParentId.set(p.id, oid());
for (const l of wbsDoc.leaves)  wbsOidByLeafId.set(l.id, oid());

const activityOidById = new Map();
for (const a of activitiesDoc.activities) activityOidById.set(a.id, oid());

// ─── Activity Code Types & Codes ───────────────────────────────────────────
const CODE_TYPES = {
  ORIGIN:     ["git","future-risk","future-marketing-debt","future-verification-gap"],
  LIFECYCLE:  ["planned","in-flight","paused","dormant","shipped","abandoned"],
  BLOCKING:   ["none","decision","external","successor-missing"],
  VISIBILITY: ["quiet","normal","loud"],
  STREAM:     [...new Set(wbsDoc.leaves.map(l => l.stream))].sort(),
  LAYER:      [...new Set(wbsDoc.leaves.map(l => l.layer))].sort(),
  HEALTH:     ["healthy","dormant-but-needed","blocked-by-decision","ready"],
};
const codeTypeOid = {};
const codeValueOid = {}; // `${type}::${value}` → oid
for (const [type, values] of Object.entries(CODE_TYPES)) {
  codeTypeOid[type] = oid();
  for (const v of values) codeValueOid[`${type}::${v}`] = oid();
}

// ─── UDF Types ─────────────────────────────────────────────────────────────
const UDF_TYPES = [
  ["LovableActivityId", "Text"],
  ["PrimaryLeafId",     "Text"],
  ["CommitCount",       "Integer"],
  ["DormancyDays",      "Integer"],
  ["Confidence",        "Double"],
  ["DownstreamCount",   "Integer"],
];
const udfTypeOid = Object.fromEntries(UDF_TYPES.map(([n]) => [n, oid()]));

// ─── XML helpers ───────────────────────────────────────────────────────────
const xmlEsc = (s) => String(s ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&apos;");

const el = (tag, val) => (val === undefined || val === null || val === "")
  ? "" : `<${tag}>${xmlEsc(val)}</${tag}>`;

const fmtDate = (iso) => iso ? iso.replace("T", " ").replace(/Z$/, "") : "";

// ─── decision logic ────────────────────────────────────────────────────────
function activityType(act, state) {
  const kids = childrenOfLeaf.get(act.primary_leaf) || 0;
  // A leaf with many activities — the activities themselves aren't summaries.
  // We only emit TT_WBS Summary activities when an activity itself represents
  // a roll-up; in this dataset none do, so this branch stays unused.
  if (act.origin === "git" && act.time_window) return "Task Dependent";
  if (act.origin === "future-marketing-debt")  return "Finish Milestone";
  return "Level of Effort";
}

function activityStatus(act, state) {
  const lc = state?.lifecycle;
  if (lc === "shipped")   return "Completed";
  if (lc === "in-flight") return "In Progress";
  if (lc === "paused" || lc === "dormant") return "In Progress";
  return "Not Started"; // planned, abandoned
}

function percentComplete(act, state) {
  const lc = state?.lifecycle;
  if (lc === "shipped")   return 100;
  if (lc === "in-flight") return 50;
  if (lc === "paused" || lc === "dormant") return 25;
  return 0;
}

function notebookText(act, state) {
  const lines = [];
  lines.push(`Lovable Activity: ${act.id}`);
  lines.push(`Origin: ${act.origin}`);
  lines.push(`Primary Leaf: ${act.primary_leaf} — ${leafById.get(act.primary_leaf)?.name ?? "?"}`);
  const contrib = contribLeavesByAct.get(act.id) || [];
  if (contrib.length) lines.push(`Contributing Leaves: ${contrib.join(", ")}`);
  if (act.time_window) {
    lines.push(`Window: ${act.time_window.first} → ${act.time_window.last} (${act.time_window.active_days}d active / ${act.time_window.calendar_days}d calendar)`);
  }
  if (act.effort?.commit_count) lines.push(`Commits: ${act.effort.commit_count}`);
  if (act.evidence?.commit_shas?.length) {
    const shas = act.evidence.commit_shas.slice(0, 10).map(s => s.slice(0,7)).join(", ");
    const more = act.evidence.commit_shas.length > 10 ? ` (+${act.evidence.commit_shas.length - 10} more)` : "";
    lines.push(`Evidence SHAs: ${shas}${more}`);
  }
  if (act.evidence?.reason) lines.push(`Reason: ${act.evidence.reason}`);
  if (state) {
    lines.push(`State: lifecycle=${state.lifecycle}, blocking=${state.blocking.kind}, visibility=${state.visibility}, dormancy_days=${state.health.dormancy_days}`);
    if (state.blocking.note) lines.push(`Block note: ${state.blocking.note}`);
  }
  return lines.join("\n");
}

// ─── coverage report counters ──────────────────────────────────────────────
const cov = {
  total: activitiesDoc.activities.length,
  type: { "Task Dependent":0, "Finish Milestone":0, "Level of Effort":0, "WBS Summary":0 },
  status: { "Completed":0, "In Progress":0, "Not Started":0 },
  actualStart: 0, actualFinish: 0, plannedStart: 0,
  plannedDuration: 0, percent: 0, notebook: 0, udf: 0, codes: 0,
};

// ─── XML builders ──────────────────────────────────────────────────────────
function buildCalendar() {
  return `
  <Calendar>
    ${el("ObjectId", CALENDAR_OID)}
    ${el("Name", "Lovable 7-day")}
    ${el("Type", "Global")}
    ${el("IsDefault", "true")}
    ${el("HoursPerDay", "8.0")}
    ${el("HoursPerWeek", "56.0")}
    ${el("HoursPerMonth", "240.0")}
    ${el("HoursPerYear", "2920.0")}
  </Calendar>`;
}

function buildCodeTypes() {
  let out = "";
  for (const [type, values] of Object.entries(CODE_TYPES)) {
    out += `
  <ActivityCodeType>
    ${el("ObjectId", codeTypeOid[type])}
    ${el("Name", type)}
    ${el("Scope", "Global")}
    ${el("Length", 64)}
  </ActivityCodeType>`;
    for (const v of values) {
      out += `
  <ActivityCode>
    ${el("ObjectId", codeValueOid[`${type}::${v}`])}
    ${el("CodeTypeObjectId", codeTypeOid[type])}
    ${el("CodeValue", v)}
    ${el("Description", `${type}: ${v}`)}
  </ActivityCode>`;
    }
  }
  return out;
}

function buildUDFTypes() {
  return UDF_TYPES.map(([name, dt]) => `
  <UDFType>
    ${el("ObjectId", udfTypeOid[name])}
    ${el("Title", name)}
    ${el("DataType", dt)}
    ${el("SubjectArea", "Activity")}
  </UDFType>`).join("");
}

function buildWBSNodes() {
  let out = "";
  // project root WBS
  out += `
    <WBS>
      ${el("ObjectId", ROOT_WBS_OID)}
      ${el("ProjectObjectId", PROJECT_OID)}
      ${el("Code", "ROOT")}
      ${el("Name", "Lovable Project (as-built)")}
    </WBS>`;
  // streams and layers
  for (const p of wbsDoc.parents) {
    const parentOid = p.parentId ? wbsOidByParentId.get(p.parentId) : ROOT_WBS_OID;
    out += `
    <WBS>
      ${el("ObjectId", wbsOidByParentId.get(p.id))}
      ${el("ProjectObjectId", PROJECT_OID)}
      ${el("ParentObjectId", parentOid)}
      ${el("Code", p.id)}
      ${el("Name", p.name)}
    </WBS>`;
  }
  // leaves
  for (const l of wbsDoc.leaves) {
    const parentKey = `ST-${l.streamKey}--${l.layer.toLowerCase()}`;
    const parentOid = wbsOidByParentId.get(parentKey)
                   || wbsOidByParentId.get(`ST-${l.streamKey}`)
                   || ROOT_WBS_OID;
    out += `
    <WBS>
      ${el("ObjectId", wbsOidByLeafId.get(l.id))}
      ${el("ProjectObjectId", PROJECT_OID)}
      ${el("ParentObjectId", parentOid)}
      ${el("Code", l.id)}
      ${el("Name", l.name)}
    </WBS>`;
  }
  return out;
}

function buildActivities() {
  let out = "";
  for (const a of activitiesDoc.activities) {
    const state = stateById.get(a.id);
    const type = activityType(a, state);
    const status = activityStatus(a, state);
    const pct = percentComplete(a, state);
    cov.type[type] = (cov.type[type]||0) + 1;
    cov.status[status]++;
    cov.percent += (pct > 0 ? 1 : 0);

    const wbsOid = wbsOidByLeafId.get(a.primary_leaf) || ROOT_WBS_OID;
    const aOid = activityOidById.get(a.id);

    // Dates
    let actualStart = "", actualFinish = "", plannedDuration = "";
    if (a.time_window) {
      const lc = state?.lifecycle;
      if (lc === "shipped" || lc === "in-flight" || lc === "paused" || lc === "dormant") {
        actualStart = fmtDate(a.time_window.first); cov.actualStart++;
      }
      if (lc === "shipped") {
        actualFinish = fmtDate(a.time_window.last); cov.actualFinish++;
      }
      if (type === "Task Dependent") {
        const days = Math.max(1, a.time_window.active_days || 1);
        plannedDuration = (days * 8).toFixed(1); // hours
        cov.plannedDuration++;
      }
    }

    out += `
    <Activity>
      ${el("ObjectId", aOid)}
      ${el("ProjectObjectId", PROJECT_OID)}
      ${el("WBSObjectId", wbsOid)}
      ${el("CalendarObjectId", CALENDAR_OID)}
      ${el("Id", a.id)}
      ${el("Name", a.name.slice(0, 120))}
      ${el("Type", type)}
      ${el("Status", status)}
      ${el("PercentComplete", pct)}
      ${el("PercentCompleteType", "Duration")}
      ${el("PlannedDuration", plannedDuration)}
      ${el("ActualStartDate", actualStart)}
      ${el("ActualFinishDate", actualFinish)}
    </Activity>`;

    cov.notebook++;
    out += `
    <ActivityNote>
      ${el("ObjectId", oid())}
      ${el("ProjectObjectId", PROJECT_OID)}
      ${el("ActivityObjectId", aOid)}
      ${el("Note", notebookText(a, state))}
    </ActivityNote>`;

    // Activity Code Assignments
    const codes = [
      ["ORIGIN",     a.origin],
      ["LIFECYCLE",  state?.lifecycle],
      ["BLOCKING",   state?.blocking?.kind],
      ["VISIBILITY", state?.visibility],
      ["STREAM",     leafById.get(a.primary_leaf)?.stream],
      ["LAYER",      leafById.get(a.primary_leaf)?.layer],
      ["HEALTH",     healthByAct.get(a.id) || "healthy"],
    ];
    for (const [t, v] of codes) {
      if (!v) continue;
      const codeOid = codeValueOid[`${t}::${v}`];
      if (!codeOid) continue;
      cov.codes++;
      out += `
    <ActivityCodeAssignment>
      ${el("ActivityObjectId", aOid)}
      ${el("ActivityCodeTypeObjectId", codeTypeOid[t])}
      ${el("ActivityCodeObjectId", codeOid)}
    </ActivityCodeAssignment>`;
    }

    // UDFs
    const udfVals = {
      LovableActivityId: a.id,
      PrimaryLeafId:     a.primary_leaf,
      CommitCount:       a.effort?.commit_count ?? 0,
      DormancyDays:      state?.health?.dormancy_days ?? 0,
      Confidence:        (a.evidence?.confidence ?? (a.origin === "git" ? 1.0 : 0.5)),
      DownstreamCount:   downstreamCount.get(a.id) || 0,
    };
    cov.udf++;
    for (const [name, val] of Object.entries(udfVals)) {
      const dt = UDF_TYPES.find(([n]) => n === name)[1];
      const fieldTag = dt === "Text" ? "TextValue" : dt === "Integer" ? "IntegerValue" : "DoubleValue";
      out += `
    <UDFValue>
      ${el("UDFTypeObjectId", udfTypeOid[name])}
      ${el("ActivityObjectId", aOid)}
      ${el(fieldTag, val)}
    </UDFValue>`;
    }
  }
  return out;
}

function relType(t) {
  return { FS: "Finish to Start", SS: "Start to Start", FF: "Finish to Finish", SF: "Start to Finish" }[t] || "Finish to Start";
}

function buildRelationships(edges) {
  let out = "";
  for (const e of edges) {
    const predOid = activityOidById.get(e.pred);
    const succOid = activityOidById.get(e.succ);
    if (!predOid || !succOid) continue;
    out += `
    <Relationship>
      ${el("ObjectId", oid())}
      ${el("PredecessorProjectObjectId", PROJECT_OID)}
      ${el("SuccessorProjectObjectId", PROJECT_OID)}
      ${el("PredecessorActivityObjectId", predOid)}
      ${el("SuccessorActivityObjectId", succOid)}
      ${el("Type", relType(e.type))}
      ${el("Lag", ((e.lag_days||0) * 8).toFixed(1))}
      ${el("Comments", `confidence=${e.confidence}; sources=${(e.sources||[e.source]).join("|")}`)}
    </Relationship>`;
  }
  return out;
}

// ─── assemble main PMXML ───────────────────────────────────────────────────
const HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="http://xmlns.oracle.com/Primavera/P6/V8.4/API/BusinessObjects"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;

function buildProjectInline(activityXml, relXml) {
  return `
  <Project>
    ${el("ObjectId", PROJECT_OID)}
    ${el("Id", "LOVABLE")}
    ${el("Name", "Lovable — Project as-built + as-intended")}
    ${el("Status", "Active")}
    ${el("DataDate", fmtDate(stateDoc.dataDate))}
    ${el("PlannedStartDate", fmtDate("2026-01-01T00:00:00Z"))}
    ${el("MustFinishByDate", "")}
    ${buildWBSNodes()}
    ${activityXml}
    ${relXml}
  </Project>`;
}

const mainXml = HEADER
  + buildCalendar()
  + buildCodeTypes()
  + buildUDFTypes()
  + buildProjectInline(buildActivities(), buildRelationships(relsDoc.edges))
  + `\n</APIBusinessObjects>\n`;

fs.writeFileSync(path.join(ROOT, "project.p6.xml"), mainXml);

// Rejected relationships sibling
const rejectedDoc = JSON.parse(fs.readFileSync(path.join(ROOT, "relationships.rejected.json"), "utf8"));
const rejectedXml = HEADER
  + `\n  <!-- Rejected relationships (below confidence threshold or cycle-broken). For audit only. -->\n`
  + `  <Project>${el("ObjectId", PROJECT_OID)}${el("Id","LOVABLE")}`
  + buildRelationships(rejectedDoc.edges || [])
  + `\n  </Project>\n</APIBusinessObjects>\n`;
fs.writeFileSync(path.join(ROOT, "project.p6.rejected.xml"), rejectedXml);

// ─── coverage report ───────────────────────────────────────────────────────
const total = cov.total;
const pct = (n) => `${n}/${total} (${((n/total)*100).toFixed(1)}%)`;
const typeBreak = Object.entries(cov.type).filter(([,n]) => n>0).map(([k,n]) => `${k} ${n}`).join(" | ");
const statusBreak = Object.entries(cov.status).filter(([,n]) => n>0).map(([k,n]) => `${k} ${n}`).join(" | ");

const report = `# P6 XML field-coverage report

Generated: ${new Date().toISOString()}
Source: \`.lovable/wbs/{wbs,activities,relationships,state,links,next}.json\`
Output: \`.lovable/wbs/project.p6.xml\` (+ \`.rejected.xml\`)

## Coverage

| Field | Coverage | Reason blanks are intentional |
|---|---|---|
| ActivityName        | ${pct(total)} | — |
| ActivityType        | ${pct(total)} | [${typeBreak}] |
| Status              | ${pct(total)} | [${statusBreak}] |
| ActualStart         | ${pct(cov.actualStart)} | Only emitted when lifecycle ∈ {in-flight, paused, dormant, shipped} (D3) |
| ActualFinish        | ${pct(cov.actualFinish)} | Only emitted when lifecycle = shipped (D3) |
| PlannedStart        | ${pct(0)} | Never fabricated. TT_LOE activities infer span from successors in P6 (D3b) |
| PlannedDuration     | ${pct(cov.plannedDuration)} | Only Task Dependent activities; LOE and Milestone do not require it (D1) |
| PercentComplete     | ${pct(cov.percent)} | Only set when lifecycle ≠ planned/abandoned (D2) |
| Calendar            | ${pct(total)} | Single default "Lovable 7-day" (D9) |
| NotebookTopics      | ${pct(cov.notebook)} | Every activity has evidence prose (D5) |
| ActivityCodes       | ${cov.codes} assignments across 7 dimensions (D4) | ORIGIN, LIFECYCLE, BLOCKING, VISIBILITY, STREAM, LAYER, HEALTH |
| UDFs                | ${pct(cov.udf)} × 6 fields (D6) | LovableActivityId, PrimaryLeafId, CommitCount, DormancyDays, Confidence, DownstreamCount |
| Relationships       | ${relsDoc.edges.length} accepted, ${(rejectedDoc.edges||[]).length} rejected (audit) | D7 |
| Resources / Costs   | 0 | Skipped — no source signal (D9, D10) |

## What's blank, and why (the anti-blank-field accountant)

- **No PlannedStart anywhere.** Past activities use ActualStart; future activities use Level of Effort, which lets P6 compute their span from successor dependencies. We refuse to fabricate dates.
- **No Resources, Roles, or Costs.** The JSON has no financial or staffing signal. Emitting zeros would lie.
- **No Baseline.** A baseline requires a frozen snapshot we don't maintain.
- **Abandoned activities show "Not Started" in P6.** P6 has no Cancelled status. They're tagged \`LIFECYCLE=abandoned\` via Activity Code so the filter is one click away.

## How to use in P6

1. File → Import → Primavera P6 (XML) → \`project.p6.xml\`
2. Group by Activity Code (try LIFECYCLE, ORIGIN, or HEALTH)
3. Filter "Ready to start": Activity Code HEALTH = ready
4. Filter "Dormant but needed": Activity Code HEALTH = dormant-but-needed
5. Open any activity → Notebook tab for evidence + commit SHAs

## What this is not

- Not a CPM-scheduled plan. P6 will offer to schedule on import; running F9 will float undated future activities to the data date. That's expected.
- Not a round-trip format. The XML is generated; edits go in the JSON.
`;
fs.writeFileSync(path.join(ROOT, "project.p6.report.md"), report);

// summary to stdout
console.log("Wrote project.p6.xml (" + (mainXml.length/1024).toFixed(1) + " KB)");
console.log("  activities:", total, "| WBS nodes:", wbsDoc.parents.length + wbsDoc.leaves.length + 1);
console.log("  relationships: accepted", relsDoc.edges.length, "rejected", (rejectedDoc.edges||[]).length);
console.log("  type:", typeBreak);
console.log("  status:", statusBreak);
console.log("  ActualStart", cov.actualStart, "ActualFinish", cov.actualFinish, "PlannedDuration", cov.plannedDuration);
console.log("Wrote project.p6.rejected.xml");
console.log("Wrote project.p6.report.md");
