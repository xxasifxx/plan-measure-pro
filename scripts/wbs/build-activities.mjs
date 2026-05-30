#!/usr/bin/env node
// Per-leaf activity generation: scaffold → implement → verify-e2e.
//
// One leaf yields up to three activities. Status is derived from:
//   - leaf.exists           (placeholder => everything Not Started)
//   - leaf.loc_added/touch_count (implementation evidence)
//   - capability.verdict    (implemented | partial | missing | planned | …)
//   - verification.manifest.json: an entry under activities[<verify-id>]
//                            with verifiedE2E=true flips verify to Completed.
//
// Lifecycle vocabulary matches build-state.mjs (in-flight | paused | dormant
// | shipped | abandoned | planned).
//
// Outputs:
//   .lovable/wbs/activities.json
//   .lovable/wbs/links.json    (activity_leaf[])

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, padId } from './util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const wbs = readJson('.lovable/wbs/wbs.json');
const caps = readJson('.lovable/wbs/capabilities.json');

// Verification manifest is optional; if missing we treat every verify activity
// as Not Started (which is the honest baseline).
let verification = { activities: {} };
try {
  verification = readJson('docs/wbs-dev.verification.manifest.json');
} catch { /* optional */ }

// Index capability verdict by full id
const capVerdictById = new Map();
const capById = new Map();
for (const s of Object.values(caps.streams)) {
  for (const c of s.capabilities) {
    capVerdictById.set(c.id, c.verdict || 'unknown');
    capById.set(c.id, c);
  }
}

const activities = [];
const activityLeaf = [];
let seq = 0;
const nextId = () => padId('ACT-', ++seq);

function pushActivity(a, leafId) {
  activities.push(a);
  activityLeaf.push({ activity_id: a.id, leaf_id: leafId, role: 'primary' });
}

function timeWindow(leaf) {
  if (!leaf.created_at) return null;
  return {
    first: leaf.created_at,
    last: leaf.last_modified_at || leaf.created_at,
    active_days: leaf.active_days || 1,
    calendar_days: leaf.calendar_days || 1,
  };
}

function effortFor(leaf) {
  return {
    commit_count: leaf.touch_count || 0,
    loc_added: leaf.loc_added || 0,
    loc_removed: leaf.loc_removed || 0,
    files_touched: 1,
  };
}

const SIZE_HINT = { Pages: 'large', Frontend: 'medium', 'Backend-DB': 'small', 'Backend-Edge': 'medium', Hooks: 'small', Libs: 'medium', Tests: 'small' };

for (const leaf of wbs.leaves) {
  const verdict = capVerdictById.get(leaf.capability_id) || 'unknown';
  const exists = leaf.exists !== false;
  const loc = leaf.loc_added || 0;
  const sizeHint = SIZE_HINT[leaf.layer] || 'small';

  // ----- scaffold -----
  // Completed if file exists; Not Started for placeholders.
  const scaffoldId = nextId();
  const scaffoldShipped = exists;
  pushActivity({
    id: scaffoldId,
    name: `Scaffold ${leaf.name}`.slice(0, 140),
    origin: scaffoldShipped ? 'git' : 'future-risk',
    primary_leaf: leaf.id,
    capability_id: leaf.capability_id,
    leaf_path: leaf.path,
    leaf_kind: leaf.kind,
    role: 'scaffold',
    planned_size_hint: sizeHint,
    gating_predecessors: [],
    time_window: scaffoldShipped ? timeWindow(leaf) : null,
    effort: scaffoldShipped ? { commit_count: 1, loc_added: 0, loc_removed: 0, files_touched: 1 } : undefined,
    evidence: { reason: scaffoldShipped ? 'file-exists' : 'placeholder', leaf_id: leaf.id, verdict },
  }, leaf.id);

  // ----- implement -----
  const implementId = nextId();
  let implOrigin = 'future-risk';
  let implTimeWindow = null;
  let implEffort;
  if (!exists) {
    implOrigin = 'future-risk';
  } else if (verdict === 'implemented') {
    implOrigin = 'git';
    implTimeWindow = timeWindow(leaf);
    implEffort = effortFor(leaf);
  } else if (verdict === 'partial') {
    implOrigin = 'git';
    implTimeWindow = timeWindow(leaf);
    implEffort = effortFor(leaf);
  } else if (loc > 0) {
    implOrigin = 'git';
    implTimeWindow = timeWindow(leaf);
    implEffort = effortFor(leaf);
  }
  // For placeholders the implementation hasn't happened — keep planned.
  // For partial we treat last_modified < now-60d as paused (handled in state).
  pushActivity({
    id: implementId,
    name: `Implement ${leaf.name}`.slice(0, 140),
    origin: implOrigin,
    primary_leaf: leaf.id,
    capability_id: leaf.capability_id,
    leaf_path: leaf.path,
    leaf_kind: leaf.kind,
    role: 'implement',
    planned_size_hint: sizeHint,
    gating_predecessors: [scaffoldId],
    time_window: implTimeWindow,
    effort: implEffort,
    evidence: {
      reason: !exists ? 'placeholder' : verdict === 'implemented' ? 'verdict-implemented' : verdict === 'partial' ? 'verdict-partial' : 'loc-evidence',
      leaf_id: leaf.id,
      verdict,
      commit_count: leaf.touch_count,
    },
  }, leaf.id);

  // ----- verify-e2e -----
  // Completed only when verification.manifest records verifiedE2E=true keyed
  // by the leaf path (or by capability id). Otherwise it stays Not Started.
  const verifyId = nextId();
  const manifestKey = `${leaf.capability_id}::${leaf.path}`;
  const manifestEntry = verification.activities?.[manifestKey];
  const verified = !!manifestEntry?.verifiedE2E;
  pushActivity({
    id: verifyId,
    name: `Verify e2e: ${leaf.name}`.slice(0, 140),
    origin: verified ? 'git' : 'future-verification-gap',
    primary_leaf: leaf.id,
    capability_id: leaf.capability_id,
    leaf_path: leaf.path,
    leaf_kind: leaf.kind,
    role: 'verify',
    planned_size_hint: 'small',
    gating_predecessors: [implementId],
    time_window: verified ? timeWindow(leaf) : null,
    evidence: {
      reason: verified ? 'manifest-verified' : 'no-recipe',
      leaf_id: leaf.id,
      manifest_key: manifestKey,
      recipe: manifestEntry?.recipe || null,
    },
  }, leaf.id);
}

// Compute predecessors/successors lists from gating_predecessors (rels script
// also adds inter-leaf same-capability links, but per-leaf chain is enough for
// build-state.mjs lifecycle inference).
const predMap = new Map();
const succMap = new Map();
for (const a of activities) {
  for (const p of a.gating_predecessors || []) {
    (predMap.get(a.id) || predMap.set(a.id, []).get(a.id)).push(p);
    (succMap.get(p) || succMap.set(p, []).get(p)).push(a.id);
  }
}
for (const a of activities) {
  a.predecessors = predMap.get(a.id) || [];
  a.successors = succMap.get(a.id) || [];
}

const byOrigin = activities.reduce((acc, a) => { acc[a.origin] = (acc[a.origin] || 0) + 1; return acc; }, {});
const byRole = activities.reduce((acc, a) => { acc[a.role] = (acc[a.role] || 0) + 1; return acc; }, {});

writeJson('.lovable/wbs/activities.json', {
  generatedAt: new Date().toISOString(),
  totals: { activities: activities.length, byOrigin, byRole },
  activities,
});

writeJson('.lovable/wbs/links.json', {
  generatedAt: new Date().toISOString(),
  totals: { activity_leaf: activityLeaf.length },
  activity_leaf: activityLeaf,
  commit_activity: [],
});

console.log(`[activities] ${activities.length} activities across ${wbs.leaves.length} leaves`);
console.log(`[activities] byRole:`, byRole);
console.log(`[activities] byOrigin:`, byOrigin);
