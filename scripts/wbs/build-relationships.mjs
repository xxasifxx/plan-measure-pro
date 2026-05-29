// Infer typed predecessor/successor relationships between activities using
// four weighted signals. Emits relationships.json + relationships.rejected.json.

import { readJson, writeJson, tokens } from './util.mjs';

const wbs = readJson('.lovable/wbs/wbs.json');
const acts = readJson('.lovable/wbs/activities.json').activities;
const links = readJson('.lovable/wbs/links.json');
const intent = readJson('docs/wbs-dev.agent-runs/L4/intent-leaves.json');

const byId = new Map(acts.map((a) => [a.id, a]));
const leafByActivity = new Map();
for (const al of links.activity_leaf) {
  if (al.role === 'primary') leafByActivity.set(al.activity_id, al.leaf_id);
}

// Build activity-files index (for git activities only).
const filesByActivity = new Map();
{
  // Reverse from commit_activity + activities by tracing primary contribution
  // back; here we just use the activity.evidence.commit_shas existence as a
  // proxy. Pull file sets out of activities.json via stored sample tokens is
  // lossy, so re-derive from links: for each primary commit_activity entry,
  // the activity claims those commits — but we no longer have per-commit file
  // lists here without re-reading history. Skip file-overlap signal across
  // activities and rely on shared-leaf + timing + tokens instead.
  for (const a of acts) filesByActivity.set(a.id, new Set());
}

// Group activities by primary leaf (for shared-leaf + timing signal).
const actsByLeaf = new Map();
for (const a of acts) {
  const lid = a.primary_leaf;
  if (!actsByLeaf.has(lid)) actsByLeaf.set(lid, []);
  actsByLeaf.get(lid).push(a);
}

const SIGNAL_WEIGHTS = {
  sharedLeafTime: 0.3, // pred.last < succ.first AND same leaf
  commitToken: 0.25, // tokens like "after X", "depends on Y"
  intentLink: 0.3, // cross_stream_links from L4
  leafCriterionOrder: 0.4, // criterion order within a leaf
};

const accepted = [];
const rejected = [];

const tsOf = (a, end = false) =>
  a.time_window ? new Date(end ? a.time_window.last : a.time_window.first).getTime() : null;

// SIGNAL 1: same-leaf temporal ordering (FS).
for (const [, group] of actsByLeaf) {
  const gitGroup = group.filter((a) => a.time_window);
  if (gitGroup.length < 2) continue;
  const sorted = [...gitGroup].sort((x, y) => tsOf(x) - tsOf(y));
  for (let i = 0; i < sorted.length - 1; i++) {
    const pred = sorted[i];
    const succ = sorted[i + 1];
    const lag = Math.max(0, Math.round((tsOf(succ) - tsOf(pred, true)) / 86400000));
    accepted.push({
      pred: pred.id,
      succ: succ.id,
      type: 'FS',
      lag_days: lag,
      confidence: SIGNAL_WEIGHTS.sharedLeafTime,
      source: 'shared-leaf-time',
    });
  }
}

// SIGNAL 2: commit-token cues. Activities whose names/subjects contain
// "after"/"depends on"/"now that"/"follows" → link to the most recent activity
// in the same leaf that contains the referenced noun.
const CUE_RE = /\b(after|depends on|once|following|now that|builds on|continues)\b/i;
for (const a of acts) {
  if (!CUE_RE.test(a.name || '')) continue;
  const tokSet = new Set(tokens(a.name));
  const leafSiblings = (actsByLeaf.get(a.primary_leaf) || []).filter(
    (x) => x.id !== a.id && x.time_window && (!a.time_window || tsOf(x, true) <= tsOf(a)),
  );
  if (!leafSiblings.length) continue;
  // Pick best lexical match in leaf siblings
  let best = null;
  let bestOverlap = 0;
  for (const s of leafSiblings) {
    const sTok = new Set(tokens(s.name));
    let overlap = 0;
    for (const t of tokSet) if (sTok.has(t)) overlap++;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = s;
    }
  }
  if (best && bestOverlap >= 1) {
    accepted.push({
      pred: best.id,
      succ: a.id,
      type: 'FS',
      lag_days: 0,
      confidence: SIGNAL_WEIGHTS.commitToken,
      source: 'commit-token',
    });
  }
}

// SIGNAL 3: L4 intent cross_stream_links. The L4 catalog uses its own leaf
// ids (e.g. "s01.signup-login"). Map those to our leaves by stream+slug
// matching against criterion text / leaf name; if no match, skip.
const intentLinks = intent.cross_stream_links || [];
const leafByIntentId = new Map();
for (const s of intent.streams || []) {
  for (const il of s.leaves || []) {
    // try to find a wbs leaf whose name matches the intent text best
    const key = (il.intent || '').slice(0, 50).toLowerCase();
    let found = null;
    for (const wl of wbs.leaves) {
      if (!wl.streamKey.startsWith(s.id.padStart(2, '0') + '-')) continue;
      if ((wl.name || '').toLowerCase().split(/\W+/).some((w) => key.includes(w) && w.length > 4)) {
        found = wl;
        break;
      }
    }
    if (found) leafByIntentId.set(il.id, found.id);
  }
}
for (const lnk of intentLinks) {
  const fromLeaf = leafByIntentId.get(lnk.from);
  const toLeaf = leafByIntentId.get(lnk.to);
  if (!fromLeaf || !toLeaf) {
    rejected.push({ ...lnk, reason: 'intent-leaf-unresolved' });
    continue;
  }
  // Take the latest activity in fromLeaf as predecessor, earliest in toLeaf as successor
  const fromActs = (actsByLeaf.get(fromLeaf) || []).filter((a) => a.time_window);
  const toActs = (actsByLeaf.get(toLeaf) || []);
  if (!fromActs.length || !toActs.length) {
    rejected.push({ ...lnk, reason: 'no-activities-in-mapped-leaves' });
    continue;
  }
  const pred = fromActs.sort((x, y) => tsOf(y, true) - tsOf(x, true))[0];
  const succ = toActs[0];
  accepted.push({
    pred: pred.id,
    succ: succ.id,
    type: lnk.kind === 'gates' ? 'FS' : 'SS',
    lag_days: 0,
    confidence: SIGNAL_WEIGHTS.intentLink,
    source: `intent:${lnk.kind}`,
  });
}

// SIGNAL 4: leaf-criterion ordering. Within a leaf, criteria are listed in
// authored order. Activities whose `name` matches criterion text become FS-
// linked in that order.
for (const wl of wbs.leaves) {
  const crits = wl.criteria || [];
  if (crits.length < 2) continue;
  const localActs = actsByLeaf.get(wl.id) || [];
  const critToAct = new Map();
  for (const c of crits) {
    const ctoks = new Set(tokens(c.text || ''));
    let best = null;
    let bestN = 0;
    for (const a of localActs) {
      const atoks = new Set(tokens(a.name || ''));
      let overlap = 0;
      for (const t of ctoks) if (atoks.has(t)) overlap++;
      if (overlap > bestN) {
        bestN = overlap;
        best = a;
      }
    }
    if (best && bestN >= 2) critToAct.set(c.id, best);
  }
  const ordered = crits.map((c) => critToAct.get(c.id)).filter(Boolean);
  for (let i = 0; i < ordered.length - 1; i++) {
    if (ordered[i].id === ordered[i + 1].id) continue;
    accepted.push({
      pred: ordered[i].id,
      succ: ordered[i + 1].id,
      type: 'FS',
      lag_days: 0,
      confidence: SIGNAL_WEIGHTS.leafCriterionOrder,
      source: 'leaf-criterion-order',
    });
  }
}

// ---------- Merge by (pred, succ) summing confidences, drop low, break cycles ----------
const merged = new Map();
for (const r of accepted) {
  const k = `${r.pred}>${r.succ}`;
  if (!merged.has(k)) {
    merged.set(k, { ...r, sources: [r.source] });
  } else {
    const m = merged.get(k);
    m.confidence = Math.min(1, m.confidence + r.confidence);
    if (!m.sources.includes(r.source)) m.sources.push(r.source);
  }
}
let edges = [...merged.values()].filter((e) => e.confidence >= 0.3 && e.pred !== e.succ);
const lowConf = [...merged.values()].filter((e) => e.confidence < 0.3);
for (const e of lowConf) rejected.push({ ...e, reason: 'low-confidence' });

// Cycle break: detect SCCs via Tarjan; drop lowest-confidence edge in any cycle.
const buildGraph = (es) => {
  const g = new Map();
  for (const e of es) {
    if (!g.has(e.pred)) g.set(e.pred, []);
    g.get(e.pred).push(e.succ);
  }
  return g;
};
const findCycle = (es) => {
  const g = buildGraph(es);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const n of g.keys()) color.set(n, WHITE);
  const stack = [];
  let foundCycle = null;
  const dfs = (n) => {
    if (foundCycle) return;
    color.set(n, GRAY);
    stack.push(n);
    for (const m of g.get(n) || []) {
      if (color.get(m) === GRAY) {
        const i = stack.indexOf(m);
        foundCycle = stack.slice(i).concat(m);
        return;
      }
      if (color.get(m) === WHITE || !color.has(m)) {
        if (!color.has(m)) color.set(m, WHITE);
        dfs(m);
        if (foundCycle) return;
      }
    }
    stack.pop();
    color.set(n, BLACK);
  };
  for (const n of [...g.keys()]) {
    if (color.get(n) === WHITE) dfs(n);
    if (foundCycle) break;
  }
  return foundCycle;
};

let cycleBreaks = 0;
for (let safety = 0; safety < 2000; safety++) {
  const cyc = findCycle(edges);
  if (!cyc) break;
  // Find lowest-confidence edge along the cycle
  let worst = null;
  let worstIdx = -1;
  for (let i = 0; i < cyc.length - 1; i++) {
    const a = cyc[i], b = cyc[i + 1];
    const idx = edges.findIndex((e) => e.pred === a && e.succ === b);
    if (idx === -1) continue;
    const e = edges[idx];
    if (!worst || e.confidence < worst.confidence) {
      worst = e;
      worstIdx = idx;
    }
  }
  if (worstIdx === -1) break;
  rejected.push({ ...edges[worstIdx], reason: 'cycle-break' });
  edges.splice(worstIdx, 1);
  cycleBreaks++;
}

// Attach predecessors[] / successors[] back to activities for convenience.
const predMap = new Map();
const succMap = new Map();
for (const e of edges) {
  if (!predMap.has(e.succ)) predMap.set(e.succ, []);
  predMap.get(e.succ).push(e.pred);
  if (!succMap.has(e.pred)) succMap.set(e.pred, []);
  succMap.get(e.pred).push(e.succ);
}
for (const a of acts) {
  a.predecessors = predMap.get(a.id) || [];
  a.successors = succMap.get(a.id) || [];
}
writeJson('.lovable/wbs/activities.json', readJson('.lovable/wbs/activities.json'));
// Re-write with updated pred/succ in the source dict:
const actsFile = readJson('.lovable/wbs/activities.json');
actsFile.activities = acts;
writeJson('.lovable/wbs/activities.json', actsFile);

writeJson('.lovable/wbs/relationships.json', {
  generatedAt: new Date().toISOString(),
  totals: {
    edges: edges.length,
    rejected: rejected.length,
    cycle_breaks: cycleBreaks,
    by_source: edges.reduce((acc, e) => {
      for (const s of e.sources) acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {}),
  },
  edges,
});
writeJson('.lovable/wbs/relationships.rejected.json', {
  generatedAt: new Date().toISOString(),
  totals: { rejected: rejected.length, by_reason: rejected.reduce((a, r) => {
    const k = r.reason || 'low-confidence';
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {}) },
  rejected,
});

console.log(`[rel] ${edges.length} edges accepted, ${rejected.length} rejected, ${cycleBreaks} cycle breaks`);
