// Build narrative-arc relationships: chain remaining work into dependent
// sequences within each stream so CPM produces a meaningful forecast instead
// of 466 parallel zero-duration activities all starting at the data date.
//
// Two new signals, layered on top of build-relationships.mjs output:
//
//   SIGNAL 5 — within-stream verify chain (criterion ordinal order).
//     Each remaining criterion is verified by ≥1 [verify] activity. The team
//     works through them one at a time, so we chain verify activities FS in
//     ordinal order within a stream.
//
//   SIGNAL 6 — stubs-before-verify, parallel across leaves.
//     Future-risk stubs ("[stub] …") represent missing surface that has to be
//     built before a criterion can be verified. Within a single leaf we chain
//     stubs serially (one surface, one developer). Across leaves in the same
//     stream we run parallel, then converge each leaf's tail FS-→ the first
//     verify activity for that stream.
//
// The point of this pass is to distinguish *disparate* progress (many
// independent surfaces moving at once) from *dependent* progress (one
// criterion enabling the next). Without it, CPM collapses everything onto
// the data date and the "finish" is whatever the longest single future task
// happens to be.

import { readJson, writeJson } from './util.mjs';

const wbs = readJson('.lovable/wbs/wbs.json');
const actsFile = readJson('.lovable/wbs/activities.json');
const acts = actsFile.activities;
const rels = readJson('.lovable/wbs/relationships.json');
const comp = readJson('.lovable/wbs/comprehension.json');

const leafStream = new Map(wbs.leaves.map((l) => [l.id, l.streamKey]));

// Group activities by stream and by origin.
const byStream = new Map();
for (const a of acts) {
  const sk = leafStream.get(a.primary_leaf) || '_orphan';
  if (!byStream.has(sk)) byStream.set(sk, { stubs: [], verifies: [], git: [], other: [] });
  const bucket = byStream.get(sk);
  if (a.origin === 'future-risk') bucket.stubs.push(a);
  else if (a.origin === 'future-verification-gap') bucket.verifies.push(a);
  else if (a.origin === 'git') bucket.git.push(a);
  else bucket.other.push(a);
}

// Existing edge set for dedupe.
const existingEdgeKey = new Set(rels.edges.map((e) => `${e.pred}>${e.succ}`));
const newEdges = [];
const arcReport = { streams: {} };

// Parse the criterion ordinal embedded in a verify activity name.
// Names look like: "[verify] 01:docs:organic-signup-admin-role".
// The slug is derived from criterion text; we cross-reference comprehension
// to recover ordinal. Fallback: alphabetical by slug.
function verifyOrdinal(name, streamKey) {
  const m = /^\[verify\]\s+\d{2}:[^:]+:(.+)$/.exec(name || '');
  if (!m) return Infinity;
  const slug = m[1];
  const stream = comp.streams?.[streamKey];
  if (!stream) return slug; // fallback alpha
  // Find criterion whose text slug-collapses to this slug.
  for (const cr of stream.criteria) {
    const crSlug = (cr.text || '')
      .toLowerCase()
      .replace(/`[^`]+`/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    if (crSlug.startsWith(slug.slice(0, 30)) || slug.startsWith(crSlug.slice(0, 30))) {
      return cr.ordinal;
    }
  }
  return slug;
}

function addEdge(pred, succ, source, confidence = 0.55) {
  if (pred === succ) return;
  const key = `${pred}>${succ}`;
  if (existingEdgeKey.has(key)) return;
  existingEdgeKey.add(key);
  newEdges.push({
    pred,
    succ,
    type: 'FS',
    lag_days: 0,
    confidence,
    source,
    sources: [source],
  });
}

// Skip infrastructure / orphan streams — they have no narrative.
const STREAM_RE = /^\d{2}-/;

for (const [streamKey, bucket] of byStream) {
  if (!STREAM_RE.test(streamKey)) continue;
  if (streamKey === '99-cross-cutting') continue;

  // ---- SIGNAL 5: verify chain in ordinal order ----
  const verifies = bucket.verifies
    .map((v) => ({ act: v, ord: verifyOrdinal(v.name, streamKey) }))
    .sort((a, b) => {
      if (typeof a.ord === 'number' && typeof b.ord === 'number') return a.ord - b.ord;
      return String(a.ord).localeCompare(String(b.ord));
    });

  for (let i = 0; i < verifies.length - 1; i++) {
    addEdge(verifies[i].act.id, verifies[i + 1].act.id, 'narrative-verify-chain', 0.6);
  }

  // ---- SIGNAL 6: stubs-before-first-verify, parallel across leaves ----
  const stubsByLeaf = new Map();
  for (const s of bucket.stubs) {
    if (!stubsByLeaf.has(s.primary_leaf)) stubsByLeaf.set(s.primary_leaf, []);
    stubsByLeaf.get(s.primary_leaf).push(s);
  }

  const firstVerify = verifies[0]?.act;
  let leafTails = 0;
  let stubChainEdges = 0;
  for (const [, stubs] of stubsByLeaf) {
    // Stable sort so chain is deterministic.
    stubs.sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < stubs.length - 1; i++) {
      addEdge(stubs[i].id, stubs[i + 1].id, 'narrative-stub-serial', 0.5);
      stubChainEdges++;
    }
    const tail = stubs[stubs.length - 1];
    if (firstVerify && tail) {
      addEdge(tail.id, firstVerify.id, 'narrative-stub-to-verify', 0.55);
      leafTails++;
    }
  }

  arcReport.streams[streamKey] = {
    verifies: verifies.length,
    stub_leaves: stubsByLeaf.size,
    stubs: bucket.stubs.length,
    edges_added: {
      verify_chain: Math.max(0, verifies.length - 1),
      stub_serial: stubChainEdges,
      stub_to_verify: leafTails,
    },
  };
}

// Merge newEdges into rels.edges, then re-derive predecessors/successors.
rels.edges.push(...newEdges);
rels.totals.edges = rels.edges.length;
rels.totals.by_source = rels.edges.reduce((acc, e) => {
  for (const s of e.sources || [e.source]) acc[s] = (acc[s] || 0) + 1;
  return acc;
}, {});
rels.totals.narrative_arc_edges = newEdges.length;
rels.generatedAt = new Date().toISOString();

// Cycle break (minimal — narrative edges shouldn't introduce cycles given
// strict stream + ordinal direction, but be defensive).
function findCycle(es) {
  const g = new Map();
  for (const e of es) {
    if (!g.has(e.pred)) g.set(e.pred, []);
    g.get(e.pred).push(e.succ);
  }
  const color = new Map();
  const stack = [];
  let cyc = null;
  const dfs = (n) => {
    if (cyc) return;
    color.set(n, 1);
    stack.push(n);
    for (const m of g.get(n) || []) {
      if (color.get(m) === 1) {
        cyc = stack.slice(stack.indexOf(m)).concat(m);
        return;
      }
      if (!color.has(m)) {
        dfs(m);
        if (cyc) return;
      }
    }
    stack.pop();
    color.set(n, 2);
  };
  for (const n of [...g.keys()]) {
    if (!color.has(n)) dfs(n);
    if (cyc) return cyc;
  }
  return null;
}
let cycleBreaks = 0;
for (let safety = 0; safety < 500; safety++) {
  const cyc = findCycle(rels.edges);
  if (!cyc) break;
  let worstIdx = -1;
  let worstConf = Infinity;
  for (let i = 0; i < cyc.length - 1; i++) {
    const idx = rels.edges.findIndex((e) => e.pred === cyc[i] && e.succ === cyc[i + 1]);
    if (idx === -1) continue;
    if (rels.edges[idx].confidence < worstConf) {
      worstConf = rels.edges[idx].confidence;
      worstIdx = idx;
    }
  }
  if (worstIdx === -1) break;
  rels.edges.splice(worstIdx, 1);
  cycleBreaks++;
}
rels.totals.narrative_cycle_breaks = cycleBreaks;

// Rebuild pred/succ on activities.
const predMap = new Map();
const succMap = new Map();
for (const e of rels.edges) {
  if (!predMap.has(e.succ)) predMap.set(e.succ, []);
  predMap.get(e.succ).push(e.pred);
  if (!succMap.has(e.pred)) succMap.set(e.pred, []);
  succMap.get(e.pred).push(e.succ);
}
for (const a of acts) {
  a.predecessors = predMap.get(a.id) || [];
  a.successors = succMap.get(a.id) || [];
}
actsFile.activities = acts;

// Disparate vs dependent metric on future-side activities.
const futureActs = acts.filter((a) =>
  ['future-risk', 'future-verification-gap', 'future-marketing-debt'].includes(a.origin),
);
const withPred = futureActs.filter((a) => a.predecessors.length > 0).length;
const withSucc = futureActs.filter((a) => a.successors.length > 0).length;
const orphan = futureActs.filter((a) => a.predecessors.length === 0 && a.successors.length === 0).length;
arcReport.future_side = {
  total: futureActs.length,
  with_predecessor: withPred,
  with_successor: withSucc,
  orphan_parallel: orphan,
  dependent_share: +(withPred / futureActs.length).toFixed(3),
};
arcReport.totals = {
  new_edges: newEdges.length,
  cycle_breaks: cycleBreaks,
  total_edges: rels.edges.length,
};

writeJson('.lovable/wbs/activities.json', actsFile);
writeJson('.lovable/wbs/relationships.json', rels);
writeJson('.lovable/wbs/narrative-arcs.json', { generatedAt: new Date().toISOString(), ...arcReport });

console.log(
  `[arc] +${newEdges.length} narrative edges (verify chains + stub serializations), ` +
    `${cycleBreaks} cycle breaks, ` +
    `future-side dependent share: ${(arcReport.future_side.dependent_share * 100).toFixed(1)}%`,
);
