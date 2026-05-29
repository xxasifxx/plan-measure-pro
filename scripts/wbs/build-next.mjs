// Derived "what needs to happen" view. Two ranked lists:
//   - ready_to_start: planned activities whose gating predecessors are all done
//   - dormant_but_needed: in-flight/paused/dormant activities that have
//     downstream successors waiting, ordered by downstream count + visibility.

import { readJson, writeJson } from './util.mjs';

const acts = readJson('.lovable/wbs/activities.json').activities;
const rel = readJson('.lovable/wbs/relationships.json');
const state = readJson('.lovable/wbs/state.json').states;

const byId = new Map(acts.map((a) => [a.id, a]));
const stateOf = new Map(state.map((s) => [s.activity_id, s]));

// Downstream BFS to count transitive successors per activity.
const succOf = new Map();
for (const e of rel.edges) {
  if (!succOf.has(e.pred)) succOf.set(e.pred, []);
  succOf.get(e.pred).push(e.succ);
}
const downstreamCount = (id) => {
  const seen = new Set();
  const stack = [...(succOf.get(id) || [])];
  while (stack.length) {
    const n = stack.pop();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const s of succOf.get(n) || []) stack.push(s);
  }
  return seen.size;
};

const ready_to_start = [];
const dormant_but_needed = [];
const blocked_by_decision = [];

for (const s of state) {
  const a = byId.get(s.activity_id);
  if (s.lifecycle === 'planned') {
    const preds = a.predecessors || [];
    const openPreds = preds.filter((p) => {
      const ps = stateOf.get(p);
      return ps && ['planned', 'paused', 'dormant'].includes(ps.lifecycle);
    });
    if (openPreds.length === 0) {
      ready_to_start.push({
        activity_id: a.id,
        name: a.name,
        primary_leaf: a.primary_leaf,
        origin: a.origin,
        downstream_count: downstreamCount(a.id),
      });
    }
  }
  if (['paused', 'dormant'].includes(s.lifecycle)) {
    const downstream = downstreamCount(a.id);
    if (downstream > 0 || s.health.marketing_debt_count > 0 || s.health.verification_gap_count > 0) {
      dormant_but_needed.push({
        activity_id: a.id,
        name: a.name,
        primary_leaf: a.primary_leaf,
        lifecycle: s.lifecycle,
        dormancy_days: s.health.dormancy_days,
        downstream_count: downstream,
        marketing_debt_count: s.health.marketing_debt_count,
        verification_gap_count: s.health.verification_gap_count,
        visibility: s.visibility,
      });
    }
  }
  if (s.blocking.kind === 'decision') {
    blocked_by_decision.push({
      activity_id: a.id,
      name: a.name,
      primary_leaf: a.primary_leaf,
      note: s.blocking.note,
    });
  }
}

ready_to_start.sort((a, b) => b.downstream_count - a.downstream_count);
dormant_but_needed.sort(
  (a, b) =>
    (b.downstream_count + b.marketing_debt_count * 2 + b.verification_gap_count) -
    (a.downstream_count + a.marketing_debt_count * 2 + a.verification_gap_count),
);

writeJson('.lovable/wbs/next.json', {
  generatedAt: new Date().toISOString(),
  totals: {
    ready_to_start: ready_to_start.length,
    dormant_but_needed: dormant_but_needed.length,
    blocked_by_decision: blocked_by_decision.length,
  },
  ready_to_start: ready_to_start.slice(0, 50),
  dormant_but_needed: dormant_but_needed.slice(0, 50),
  blocked_by_decision: blocked_by_decision.slice(0, 50),
});

console.log(
  `[next] ready=${ready_to_start.length} dormant_but_needed=${dormant_but_needed.length} blocked_by_decision=${blocked_by_decision.length}`,
);
