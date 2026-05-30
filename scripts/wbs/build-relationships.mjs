#!/usr/bin/env node
// Build .lovable/wbs/relationships.json
//
// Edges come from two sources:
//   1. scaffold → implement → verify chain per leaf (FS, lag=0, from
//      activities.gating_predecessors — already populated by build-activities)
//   2. cross-leaf chain within a capability: verify(leaf_i) → implement(leaf_j)
//      ordered by leaf created_at. This is a soft chain so a capability's
//      progress reads naturally in the gantt; confidence low.
//
// Output keeps the existing shape consumed by build-state and emit-p6-xml:
//   { edges: [{ pred, succ, type, lag_days, confidence, source, sources }] }
import { readJson, writeJson } from './util.mjs';

const acts = readJson('.lovable/wbs/activities.json').activities;
const edges = [];

// 1. Per-leaf chain from gating_predecessors
for (const a of acts) {
  for (const p of a.gating_predecessors || []) {
    edges.push({
      pred: p, succ: a.id,
      type: 'FS', lag_days: 0,
      confidence: 0.95,
      source: 'leaf-chain',
      sources: ['leaf-chain'],
    });
  }
}

// 2. Per-capability soft chain across leaves: verify(prev) → implement(next)
const byCap = new Map();
for (const a of acts) {
  if (!a.capability_id) continue;
  if (!byCap.has(a.capability_id)) byCap.set(a.capability_id, []);
  byCap.get(a.capability_id).push(a);
}
let softCount = 0;
for (const [, list] of byCap) {
  // group by leaf
  const byLeaf = new Map();
  for (const a of list) {
    if (!byLeaf.has(a.primary_leaf)) byLeaf.set(a.primary_leaf, {});
    byLeaf.get(a.primary_leaf)[a.role] = a;
  }
  const leafIds = [...byLeaf.keys()];
  // order by implement.time_window.first when available, otherwise stable
  leafIds.sort((x, y) => {
    const ax = byLeaf.get(x).implement?.time_window?.first || '';
    const ay = byLeaf.get(y).implement?.time_window?.first || '';
    return ax.localeCompare(ay);
  });
  for (let i = 0; i < leafIds.length - 1; i++) {
    const prev = byLeaf.get(leafIds[i]).verify;
    const next = byLeaf.get(leafIds[i + 1]).implement;
    if (prev && next) {
      edges.push({
        pred: prev.id, succ: next.id,
        type: 'FS', lag_days: 0,
        confidence: 0.4,
        source: 'capability-soft-chain',
        sources: ['capability-soft-chain'],
      });
      softCount++;
    }
  }
}

// Re-derive predecessors/successors on activities to include soft chain
const predMap = new Map();
const succMap = new Map();
for (const e of edges) {
  (predMap.get(e.succ) || predMap.set(e.succ, []).get(e.succ)).push(e.pred);
  (succMap.get(e.pred) || succMap.set(e.pred, []).get(e.pred)).push(e.succ);
}
const actsFile = readJson('.lovable/wbs/activities.json');
for (const a of actsFile.activities) {
  a.predecessors = predMap.get(a.id) || [];
  a.successors = succMap.get(a.id) || [];
}
writeJson('.lovable/wbs/activities.json', actsFile);

writeJson('.lovable/wbs/relationships.json', {
  generatedAt: new Date().toISOString(),
  totals: { edges: edges.length, leaf_chain: edges.length - softCount, soft_chain: softCount },
  edges,
});
writeJson('.lovable/wbs/relationships.rejected.json', { generatedAt: new Date().toISOString(), totals: { rejected: 0 }, rejected: [] });

console.log(`[rel] ${edges.length} edges (leaf-chain=${edges.length - softCount}, soft-chain=${softCount})`);
