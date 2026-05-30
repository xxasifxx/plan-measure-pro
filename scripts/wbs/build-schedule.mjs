#!/usr/bin/env node
// Build a baseline project schedule from capabilities + git file history.
// Produces .lovable/wbs/schedule.json. Dates are placeholders the PM tunes
// in .lovable/wbs/schedule-config.json. This script never invents history --
// actual_start / last_touch come from file-history.json.
import fs from 'node:fs';

const CAPS_PATH      = '.lovable/wbs/capabilities.json';
const HIST_PATH      = '.lovable/wbs/file-history.json';
const DELIV_PATH     = '.lovable/wbs/program-deliverables.json';
const ACTS_PATH      = '.lovable/wbs/activities.json';
const STATE_PATH     = '.lovable/wbs/state.json';
const CONFIG_PATH    = '.lovable/wbs/schedule-config.json';
const OUT_PATH       = '.lovable/wbs/schedule.json';

const j = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);

const caps   = j(CAPS_PATH);
const hist   = j(HIST_PATH);
const deliv  = exists(DELIV_PATH) ? j(DELIV_PATH) : { deliverables: [] };
const acts   = exists(ACTS_PATH) ? j(ACTS_PATH) : { activities: [] };
const state  = exists(STATE_PATH) ? j(STATE_PATH) : { states: [] };
const config = j(CONFIG_PATH);

const histByPath = new Map(hist.files.map((f) => [f.path, f]));
const stateByAct = new Map(state.states.map((s) => [s.activity_id, s.lifecycle]));

const T0 = config.T0 ? new Date(config.T0) : new Date();
T0.setUTCHours(0, 0, 0, 0);
const T0_ISO = T0.toISOString().slice(0, 10);

const addDays = (d, n) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const cmpDate = (a, b) => (a && b ? (a < b ? a : b) : a || b);
const maxDate = (a, b) => (a && b ? (a > b ? a : b) : a || b);

const VERDICT_RANK = { missing: 0, planned: 1, partial: 2, implemented: 3 };
const meetsMin = (v, min) => (VERDICT_RANK[v] ?? 0) >= (VERDICT_RANK[min] ?? 0);

function remainingDaysFor(cap) {
  const ov = config.capability_overrides?.[cap.id];
  if (ov != null) return ov;
  if (cap.kind === 'risk') return config.defaults_days.risk_capability;
  if (cap.kind === 'overhead') return 0;
  if (cap.kind === 'deliverable') return cap.duration_days ?? config.defaults_days.planned;
  // criterion / placeholder
  if (cap.verdict === 'implemented') return config.defaults_days.implemented;
  if (cap.verdict === 'partial')     return config.defaults_days.partial;
  // planned / unknown / placeholder-driven
  const needs = (cap.needs_files?.length || 0);
  if (needs > 0) return needs * config.defaults_days.placeholder_per_leaf;
  return config.defaults_days.planned;
}

// ---- capability rows ----
const streamRows = [];
let progCapCount = 0;
let progCompleted = 0;
let progPartial = 0;
let progPlanned = 0;
let progRemaining = 0;
let progTouches = 0;
let progLoc = 0;
let progActualStart = null;
let progLastTouch = null;
const verifyByCap = new Map(); // capId -> { total, done }
for (const a of acts.activities || []) {
  if (a.role !== 'verify') continue;
  const lc = stateByAct.get(a.id) || 'planned';
  const r = verifyByCap.get(a.capability_id) || { total: 0, done: 0 };
  r.total++;
  if (lc === 'shipped') r.done++;
  verifyByCap.set(a.capability_id, r);
}

const STREAMS = Object.values(caps.streams).sort((a, b) =>
  a.stream_key.localeCompare(b.stream_key),
);

for (const s of STREAMS) {
  const capRows = [];
  let sStart = null, sLast = null, sRemain = 0, sTouches = 0, sLoc = 0;
  for (const cap of s.capabilities) {
    let cStart = null, cLast = null, cTouches = 0, cLoc = 0;
    for (const p of cap.files || []) {
      const h = histByPath.get(p);
      if (!h) continue;
      cStart   = cmpDate(cStart, h.created_at);
      cLast    = maxDate(cLast, h.last_modified_at);
      cTouches += h.touch_count || 0;
      cLoc     += h.loc_added || 0;
    }
    const remaining = remainingDaysFor(cap);
    const forecast  = addDays(T0, remaining);
    const v = verifyByCap.get(cap.id.split('::').pop()) || verifyByCap.get(cap.id) || { total: 0, done: 0 };
    const suspicious =
      cap.verdict === 'implemented' &&
      cStart && cLast &&
      iso(cStart) === iso(cLast) && iso(cLast) === T0_ISO;

    capRows.push({
      id: cap.id,
      title: cap.title,
      kind: cap.kind,
      verdict: cap.verdict,
      files_count: (cap.files || []).length,
      needs_count: (cap.needs_files || []).length,
      actual_start: iso(cStart),
      last_touch:   iso(cLast),
      touches: cTouches,
      loc: cLoc,
      remaining_days: remaining,
      forecast_finish: iso(forecast),
      verify_done: v.done,
      verify_total: v.total,
      suspicious_recency: suspicious || undefined,
    });

    sStart  = cmpDate(sStart, cStart);
    sLast   = maxDate(sLast, cLast);
    sRemain += remaining;
    sTouches += cTouches;
    sLoc     += cLoc;

    progCapCount++;
    if (cap.verdict === 'implemented') progCompleted++;
    else if (cap.verdict === 'partial') progPartial++;
    else progPlanned++;
  }
  progRemaining += sRemain;
  progTouches   += sTouches;
  progLoc       += sLoc;
  progActualStart = cmpDate(progActualStart, sStart);
  progLastTouch   = maxDate(progLastTouch, sLast);

  streamRows.push({
    stream_key: s.stream_key,
    title: s.title,
    actual_start: iso(sStart),
    last_touch:   iso(sLast),
    touches: sTouches,
    loc: sLoc,
    remaining_days: sRemain,
    forecast_finish: iso(addDays(T0, sRemain)),
    capability_count: capRows.length,
    capabilities: capRows,
  });
}

// ---- milestones ----
const delivByID = new Map((deliv.deliverables || []).map((d) => [d.id, d]));
const streamByKey = new Map(streamRows.map((s) => [s.stream_key, s]));

function evalGate(gate) {
  if (gate.kind === 'deliverable') {
    const d = delivByID.get(gate.id);
    return {
      met: d?.verdict === gate.verdict,
      forecast_finish: addDays(T0, d ? (d.duration_days || 0) : config.defaults_days.planned),
    };
  }
  if (gate.kind === 'streams_min_verdict') {
    const streams = gate.streams.map((k) => caps.streams[k]).filter(Boolean);
    const allMet = streams.every((s) =>
      s.capabilities.every((c) => meetsMin(c.verdict, gate.min_verdict)),
    );
    const finish = streams.reduce(
      (acc, s) => maxDate(acc, streamByKey.get(s.stream_key)?.forecast_finish),
      null,
    );
    return { met: allMet, forecast_finish: finish ? new Date(finish) : T0 };
  }
  if (gate.kind === 'streams_criteria_implemented') {
    const streams = gate.streams.map((k) => caps.streams[k]).filter(Boolean);
    const allMet = streams.every((s) =>
      s.capabilities.filter((c) => c.kind === 'criterion').every((c) => c.verdict === 'implemented'),
    );
    const finish = streams.reduce(
      (acc, s) => maxDate(acc, streamByKey.get(s.stream_key)?.forecast_finish),
      null,
    );
    return { met: allMet, forecast_finish: finish ? new Date(finish) : T0 };
  }
  if (gate.kind === 'streams_placeholders_cleared') {
    const streams = gate.streams.map((k) => caps.streams[k]).filter(Boolean);
    const allMet = streams.every((s) =>
      s.capabilities.every((c) => (c.needs_files || []).length === 0),
    );
    const finish = streams.reduce(
      (acc, s) => maxDate(acc, streamByKey.get(s.stream_key)?.forecast_finish),
      null,
    );
    return { met: allMet, forecast_finish: finish ? new Date(finish) : T0 };
  }
  if (gate.kind === 'streams_deliverables_implemented') {
    const dlvs = (deliv.deliverables || []).filter((d) => gate.streams.includes(d.stream_key));
    const allMet = dlvs.length > 0 && dlvs.every((d) => d.verdict === 'implemented');
    const days = dlvs.reduce((m, d) => Math.max(m, d.duration_days || 0), 0);
    return { met: allMet, forecast_finish: addDays(T0, days) };
  }
  if (gate.kind === 'all_criteria_implemented') {
    const all = STREAMS.flatMap((s) => s.capabilities).filter((c) => c.kind === 'criterion');
    const allMet = all.every((c) => c.verdict === 'implemented');
    return { met: allMet, forecast_finish: addDays(T0, progRemaining) };
  }
  if (gate.kind === 'all_verify_shipped') {
    let total = 0, done = 0;
    for (const v of verifyByCap.values()) { total += v.total; done += v.done; }
    return { met: total > 0 && done === total, forecast_finish: addDays(T0, progRemaining) };
  }
  return { met: false, forecast_finish: T0 };
}

const milestones = config.milestones.map((m) => {
  const r = evalGate(m.gate);
  return {
    id: m.id,
    name: m.name,
    gate: m.gate,
    target_date: m.target_date,
    forecast_date: iso(r.forecast_finish),
    met: r.met,
  };
});

const schedule = {
  generatedAt: new Date().toISOString(),
  T0: T0_ISO,
  defaults_days: config.defaults_days,
  totals: {
    capabilities: progCapCount,
    implemented: progCompleted,
    partial: progPartial,
    planned: progPlanned,
    total_remaining_days: progRemaining,
    total_touches: progTouches,
    total_loc: progLoc,
    actual_start: iso(progActualStart),
    last_touch:   iso(progLastTouch),
    forecast_finish: iso(addDays(T0, progRemaining)),
  },
  milestones,
  streams: streamRows,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(schedule, null, 2));
console.log(
  `[schedule] ${OUT_PATH} streams=${streamRows.length} caps=${progCapCount} ` +
  `impl=${progCompleted} partial=${progPartial} planned=${progPlanned} ` +
  `remaining=${progRemaining}d forecast=${schedule.totals.forecast_finish}`,
);
