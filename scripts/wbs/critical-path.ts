// Critical-path narrative extractor.
//
// After CPM runs we get a flat list of "is_critical" activities and a finish
// date, but no story. This script:
//   1. Imports the PMXML and runs the same CPM the app does.
//   2. Walks backward from the latest-finishing critical activity along
//      zero-float predecessor edges to recover the actual critical chain
//      (order matters — a list isn't a path).
//   3. Groups the chain by stream and by phase (already-done vs remaining)
//      so the result reads as a narrative: "you are here → these streams
//      drive the finish, in this order, with these handoff points."
//   4. Emits `.lovable/wbs/critical-path.md` for humans and
//      `.lovable/wbs/critical-path.json` for downstream tooling.

import fs from 'node:fs';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
(globalThis as any).DOMParser = DOMParser;
(globalThis as any).XMLSerializer = XMLSerializer;

import { importFromPmxml } from '/dev-server/src/lib/schedule/import-p6';
import { runCpm } from '/dev-server/src/lib/schedule/cpm';

const root = '/dev-server';
const xml = fs.readFileSync(path.join(root, '.lovable/wbs/project.p6.xml'), 'utf8');
const imp = importFromPmxml(xml);

// Rehydrate to the DB shape the CPM wants.
const uuids = new Map<string, string>();
let n = 0;
const uuidFor = (k: string) => {
  if (!uuids.has(k)) uuids.set(k, `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`);
  return uuids.get(k)!;
};
const PROJ = '00000000-0000-0000-0000-aaaaaaaaaaaa';
const extByUuid = new Map<string, string>();

const calendarsDb = imp.calendars.map((c) => ({
  id: uuidFor(c.ext_id), project_id: PROJ, name: c.name, is_default: c.is_default,
  hours_per_day: c.hours_per_day, workweek: c.workweek, exceptions: c.exceptions,
}));
const uuidToActId = new Map<string, string | null>();
const activitiesDb: any[] = imp.activities.map((a) => {
  const id = uuidFor(a.ext_id);
  extByUuid.set(id, a.ext_id);
  uuidToActId.set(id, a.activity_id ?? null);
  return {
    id, project_id: PROJ,
    parent_wbs_id: a.parent_ext_id ? uuidFor(a.parent_ext_id) : null,
    wbs_code: a.wbs_code, activity_id: a.activity_id ?? null, name: a.name,
    activity_type: a.activity_type,
    baseline_start: a.baseline_start ?? null, baseline_end: a.baseline_end ?? null,
    duration_days: a.duration_days, percent_complete: a.percent_complete,
    actual_start: a.actual_start ?? null, actual_finish: a.actual_finish ?? null,
    early_start: null, early_finish: null, late_start: null, late_finish: null,
    total_float_days: null, is_critical: false, sort_order: a.sort_order,
    manual_finish: a.manual_finish,
    calendar_id: a.calendar_ext_id ? uuidFor(a.calendar_ext_id) : null,
    constraint_type: a.constraint_type ?? null, constraint_date: a.constraint_date ?? null,
  };
});
const relationshipsDb: any[] = imp.relationships.map((r, i) => ({
  id: `rel-${i}`, project_id: PROJ,
  pred_activity_id: uuidFor(r.pred_ext_id),
  succ_activity_id: uuidFor(r.succ_ext_id),
  rel_type: r.rel_type, lag_days: r.lag_days,
}));
const meta = { project_id: PROJ, data_date: imp.meta.data_date, calendar: imp.meta.calendar };

const cpm = runCpm(activitiesDb, relationshipsDb, meta, calendarsDb);
for (const a of activitiesDb) {
  const r = cpm.byId.get(a.id);
  if (r) Object.assign(a, r);
}

const actByUuid = new Map(activitiesDb.map((a) => [a.id, a]));

// Predecessor map (uuid -> uuid[]).
const predMap = new Map<string, { pred: string; lag: number; type: string }[]>();
for (const r of relationshipsDb) {
  if (!predMap.has(r.succ_activity_id)) predMap.set(r.succ_activity_id, []);
  predMap.get(r.succ_activity_id)!.push({ pred: r.pred_activity_id, lag: r.lag_days, type: r.rel_type });
}

// Recover ext_id → activities.json entry for stream/origin info.
const wbsActs = JSON.parse(
  fs.readFileSync(path.join(root, '.lovable/wbs/activities.json'), 'utf8'),
).activities;
const wbsActByExt = new Map(wbsActs.map((a: any) => [a.id, a]));
const wbsLeaves = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/wbs.json'), 'utf8')).leaves;
const leafStream = new Map<string, string>(wbsLeaves.map((l: any) => [l.id, l.streamKey]));
const streamOf = (extId: string): string => {
  const a: any = wbsActByExt.get(extId);
  if (!a) return '?';
  return leafStream.get(a.primary_leaf) || '?';
};
const originOf = (extId: string): string => {
  const a: any = wbsActByExt.get(extId);
  return a?.origin || '?';
};

// Find the latest-finishing critical leaf activity.
const criticals = activitiesDb.filter(
  (a) => a.is_critical && a.activity_type !== 'wbs' && a.early_finish,
);
criticals.sort((a, b) => (b.early_finish || '').localeCompare(a.early_finish || ''));
const tail = criticals[0];

if (!tail) {
  console.error('No critical activity found');
  process.exit(1);
}

// Walk backward along zero-float critical predecessors. At each node pick the
// predecessor whose early_finish + lag is closest to this node's early_start
// AND that is itself critical — that's the driving predecessor.
type Step = {
  ext_id: string;
  name: string;
  stream: string;
  origin: string;
  early_start: string | null;
  early_finish: string | null;
  duration_days: number;
  percent_complete: number;
  pred_via?: { type: string; lag: number };
};
const chain: Step[] = [];
const visited = new Set<string>();
let cursor: any = tail;
while (cursor && !visited.has(cursor.id)) {
  visited.add(cursor.id);
  chain.unshift({
    ext_id: extByUuid.get(cursor.id) || cursor.id,
    name: cursor.name,
    stream: streamOf(extByUuid.get(cursor.id) || ''),
    origin: originOf(extByUuid.get(cursor.id) || ''),
    early_start: cursor.early_start,
    early_finish: cursor.early_finish,
    duration_days: cursor.duration_days || 0,
    percent_complete: cursor.percent_complete || 0,
  });
  const preds = predMap.get(cursor.id) || [];
  const criticalPreds = preds
    .map((p) => ({ p, act: actByUuid.get(p.pred) }))
    .filter((x) => x.act && x.act.is_critical);
  if (!criticalPreds.length) break;
  // pick the one whose early_finish is the *latest* (driving predecessor).
  criticalPreds.sort((a, b) => (b.act.early_finish || '').localeCompare(a.act.early_finish || ''));
  cursor = criticalPreds[0].act;
  chain[0].pred_via = { type: criticalPreds[0].p.type, lag: criticalPreds[0].p.lag };
}

// Group consecutive steps by stream to read as narrative phases.
type Phase = {
  stream: string;
  steps: Step[];
  start: string | null;
  finish: string | null;
  duration: number;
  done_share: number;
};
const phases: Phase[] = [];
for (const s of chain) {
  const last = phases[phases.length - 1];
  if (last && last.stream === s.stream) {
    last.steps.push(s);
  } else {
    phases.push({ stream: s.stream, steps: [s], start: null, finish: null, duration: 0, done_share: 0 });
  }
}
for (const p of phases) {
  p.start = p.steps[0].early_start;
  p.finish = p.steps[p.steps.length - 1].early_finish;
  p.duration = p.steps.reduce((s, x) => s + (x.duration_days || 0), 0);
  const done = p.steps.filter((x) => x.percent_complete >= 100).length;
  p.done_share = +(done / p.steps.length).toFixed(2);
}

// Disparate-vs-dependent context: how much of the *finish-driving* chain is
// past tense vs future tense? And how concentrated is criticality per stream?
const dataDate = meta.data_date;
const beforeDataDate = chain.filter((s) => (s.early_finish || '') < dataDate).length;
const afterDataDate = chain.length - beforeDataDate;
const criticalsByStream = new Map<string, number>();
for (const a of criticals) {
  const k = streamOf(extByUuid.get(a.id) || '');
  criticalsByStream.set(k, (criticalsByStream.get(k) || 0) + 1);
}

const md: string[] = [];
md.push(`# Critical-path narrative`);
md.push('');
md.push(
  `_Generated ${new Date().toISOString()} — derived from PMXML round-trip CPM (data date ${dataDate}, project finish ${cpm.projectFinish}, ${criticals.length} critical activities, chain length ${chain.length})._`,
);
md.push('');
md.push(`## The story in one sentence`);
md.push('');
md.push(
  `Finish is driven by **${phases.length}** stream phase${phases.length === 1 ? '' : 's'}, ${beforeDataDate} step${beforeDataDate === 1 ? '' : 's'} already complete and **${afterDataDate}** still ahead, terminating in **${tail.name}** on **${tail.early_finish}**.`,
);
md.push('');
md.push(`## Phases along the critical path`);
md.push('');
md.push(`| # | Stream | Steps | Start | Finish | Duration | % done |`);
md.push(`|---|---|---:|---|---|---:|---:|`);
phases.forEach((p, i) => {
  md.push(
    `| ${i + 1} | \`${p.stream}\` | ${p.steps.length} | ${p.start || '—'} | ${p.finish || '—'} | ${p.duration}d | ${Math.round(p.done_share * 100)}% |`,
  );
});
md.push('');
md.push(`## Step-by-step (longest chain)`);
md.push('');
chain.forEach((s, i) => {
  const past = (s.early_finish || '') < dataDate ? '✓' : '○';
  const handoff = s.pred_via ? ` _(via ${s.pred_via.type}+${s.pred_via.lag}d)_` : '';
  md.push(
    `${i + 1}. ${past} **${s.name}** — \`${s.stream}\` · ${s.origin} · ${s.early_start}→${s.early_finish} · ${s.duration_days}d · ${s.percent_complete}%${handoff}`,
  );
});
md.push('');
md.push(`## Where criticality concentrates`);
md.push('');
md.push(`| Stream | Critical activities |`);
md.push(`|---|---:|`);
[...criticalsByStream.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([s, c]) => md.push(`| \`${s}\` | ${c} |`));
md.push('');
md.push(`## Reading this`);
md.push('');
md.push(
  `- **○ steps** are remaining work whose slippage moves the project finish day-for-day. **✓ steps** are already-actual history that anchors the chain.`,
);
md.push(
  `- A **stream phase** with high step count and low % done is where comprehension is paying off — those handoffs were inferred from prose, not from commit timestamps.`,
);
md.push(
  `- A stream with many critical activities but few phase appearances means it has many *parallel* critical strands — adding people there helps. A stream that owns a long single phase is a *serial* bottleneck — adding people doesn't help, but better duration estimates do.`,
);

fs.writeFileSync(path.join(root, '.lovable/wbs/critical-path.md'), md.join('\n'));
fs.writeFileSync(
  path.join(root, '.lovable/wbs/critical-path.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      data_date: dataDate,
      project_finish: cpm.projectFinish,
      tail: { ext_id: extByUuid.get(tail.id), name: tail.name, finish: tail.early_finish },
      chain_length: chain.length,
      before_data_date: beforeDataDate,
      after_data_date: afterDataDate,
      phases,
      chain,
      criticals_by_stream: Object.fromEntries(criticalsByStream),
    },
    null,
    2,
  ),
);
console.log(
  `[cp] finish=${cpm.projectFinish} chain=${chain.length} phases=${phases.length} (past=${beforeDataDate} future=${afterDataDate})`,
);
