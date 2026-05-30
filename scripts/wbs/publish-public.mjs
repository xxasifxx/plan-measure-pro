#!/usr/bin/env node
// Copy a slim WBS bundle to public/wbs/ so the /wbs route can fetch them.
import fs from 'node:fs';
import path from 'node:path';

const out = 'public/wbs';
fs.mkdirSync(out, { recursive: true });

const slim = (obj, keys) => {
  const o = {};
  for (const k of keys) if (k in obj) o[k] = obj[k];
  return o;
};

const wbs = JSON.parse(fs.readFileSync('.lovable/wbs/wbs.json', 'utf8'));
const caps = JSON.parse(fs.readFileSync('.lovable/wbs/capabilities.json', 'utf8'));
const acts = JSON.parse(fs.readFileSync('.lovable/wbs/activities.json', 'utf8'));
const state = JSON.parse(fs.readFileSync('.lovable/wbs/state.json', 'utf8'));
const next = JSON.parse(fs.readFileSync('.lovable/wbs/next.json', 'utf8'));

// Slim leaves down to fields the viewer needs
const slimLeaves = wbs.leaves.map(l => slim(l, [
  'id', 'path', 'name', 'stream_key', 'capability_id', 'layer', 'kind', 'exists',
  'verdict_blocker', 'loc_added', 'touch_count', 'last_modified_at', 'parentId',
]));
const slimParents = wbs.parents.map(p => slim(p, [
  'id', 'name', 'kind', 'parentId', 'capability_kind', 'verdict', 'severity',
]));

fs.writeFileSync(path.join(out, 'wbs.json'), JSON.stringify({
  generatedAt: wbs.generatedAt,
  totals: wbs.totals,
  parents: slimParents,
  leaves: slimLeaves,
}));

// Slim activities to status + role per leaf
const slimActs = acts.activities.map(a => ({
  id: a.id, role: a.role, primary_leaf: a.primary_leaf,
  capability_id: a.capability_id, origin: a.origin,
}));
const stateBy = new Map(state.states.map(s => [s.activity_id, s.lifecycle]));
for (const a of slimActs) a.lifecycle = stateBy.get(a.id) || 'planned';

fs.writeFileSync(path.join(out, 'activities.json'), JSON.stringify({
  generatedAt: acts.generatedAt,
  totals: acts.totals,
  activities: slimActs,
}));

fs.writeFileSync(path.join(out, 'capabilities.json'), JSON.stringify(caps));
fs.writeFileSync(path.join(out, 'next.json'), JSON.stringify(next));

console.log(`[publish] public/wbs/  wbs(${slimLeaves.length} leaves) activities(${slimActs.length}) capabilities next`);
