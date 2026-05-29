#!/usr/bin/env node
// Build .lovable/wbs/spine.json and .lovable/wbs/wbs.json
//
// WBS = files-by-stream, joined via `paths:` globs declared in each
// docs/streams/NN-*.md front-matter (consumed via comprehension.json).
// Files matching no stream → `00-program-management` overhead bucket so
// nothing is silently homeless.
//
// Emits two artifacts:
//   spine.json  — path_to_stream lookup, declared globs per stream (consumed
//                 by import-graph + activities + audit)
//   wbs.json    — full hierarchy (stream → layer → file leaf) consumed by
//                 PMXML emit
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson, slug, streamKey } from './util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMP = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/comprehension.json'), 'utf8'));
const HIST = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/file-history.json'), 'utf8'));

// ---------- glob → regex ----------
// Minimal glob: ** matches across segments, * within a segment.
function globToRegex(g) {
  let r = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { r += '.*'; i++; }
      else r += '[^/]*';
    } else if ('.^$+?{}()|[]\\'.includes(c)) r += '\\' + c;
    else r += c;
  }
  return new RegExp('^' + r + '$');
}

// Build owners: { stream_key: { paths: [regex], shared: [regex] } }
const owners = {};
for (const s of Object.values(COMP.streams)) {
  owners[s.key] = {
    paths: (s.paths || []).map(globToRegex),
    shared: (s.shared_paths || []).map(globToRegex),
    declared_paths: s.paths || [],
    declared_shared: s.shared_paths || [],
  };
}

const OVERHEAD_KEY = '00-program-management';

function classifyFile(filePath) {
  // Try primary ownership first
  const primary = [];
  for (const [key, o] of Object.entries(owners)) {
    if (o.paths.some(rx => rx.test(filePath))) primary.push(key);
  }
  if (primary.length === 1) return { primary: primary[0], shared: [] };
  if (primary.length > 1) {
    // Ambiguous primary: longest-prefix-wins among the matching streams,
    // by counting matched literal characters in the glob.
    const best = primary
      .map(k => {
        const matchedGlob = owners[k].declared_paths.find(g => globToRegex(g).test(filePath)) || '';
        return { k, score: matchedGlob.replace(/\*/g, '').length };
      })
      .sort((a, b) => b.score - a.score);
    const rest = best.slice(1).map(x => x.k);
    return { primary: best[0].k, shared: rest };
  }
  // No primary — check shared claims (file gets parked in overhead but tagged)
  const sharedClaims = [];
  for (const [key, o] of Object.entries(owners)) {
    if (o.shared.some(rx => rx.test(filePath))) sharedClaims.push(key);
  }
  return { primary: OVERHEAD_KEY, shared: sharedClaims };
}

// ---------- layer derivation from path ----------
function layerOf(p) {
  if (p.startsWith('supabase/migrations/')) return 'Backend-DB';
  if (p.startsWith('supabase/functions/')) return 'Backend-Edge';
  if (p.startsWith('supabase/')) return 'Backend';
  if (p.startsWith('src/lib/native/')) return 'Mobile';
  if (p.startsWith('src/lib/offline/')) return 'Offline';
  if (p.startsWith('src/lib/p6xml/') || p.startsWith('src/lib/schedule/')) return 'Schedule';
  if (p.startsWith('src/components/schedule/')) return 'Schedule-UI';
  if (p.startsWith('src/components/')) return 'Frontend';
  if (p.startsWith('src/hooks/')) return 'Hooks';
  if (p.startsWith('src/pages/')) return 'Pages';
  if (p.startsWith('src/lib/')) return 'Libs';
  if (p.startsWith('src/test/')) return 'Tests';
  if (p.startsWith('src/types/')) return 'Types';
  if (p.startsWith('src/')) return 'Frontend';
  if (p.startsWith('scripts/wbs/')) return 'WBS-pipeline';
  if (p.startsWith('scripts/')) return 'Scripts';
  if (p.startsWith('docs/')) return 'Docs';
  if (p.startsWith('public/')) return 'Public-assets';
  return 'Config';
}

// ---------- build leaves ----------
const path_to_stream = {};
const path_to_shared = {};
const leaves = [];
let seq = 0;

for (const f of HIST.files) {
  const cls = classifyFile(f.path);
  path_to_stream[f.path] = cls.primary;
  if (cls.shared.length) path_to_shared[f.path] = cls.shared;
  seq++;
  const lyr = layerOf(f.path);
  leaves.push({
    id: `LF-${String(seq).padStart(4, '0')}`,
    path: f.path,
    name: f.path.split('/').pop(),
    stream_key: cls.primary,
    shared_streams: cls.shared,
    layer: lyr,
    created_at: f.created_at,
    last_modified_at: f.last_modified_at,
    deleted_at: f.deleted_at,
    active_days: f.active_days,
    calendar_days: f.calendar_days,
    touch_count: f.touch_count,
    loc_added: f.loc_added,
    loc_removed: f.loc_removed,
    contributors: f.contributors,
    parentId: null, // wired below
  });
}

// Build parent nodes: stream → layer → leaves
const parents = new Map();
function ensure(id, name, kind, parentId) {
  if (parents.has(id)) return parents.get(id);
  const node = { id, name, kind, parentId, isParent: true };
  parents.set(id, node);
  return node;
}

// Make sure every declared stream has a node, even if no files matched (audit signal)
const allStreamKeys = new Set([...Object.keys(COMP.streams), OVERHEAD_KEY]);
for (const k of allStreamKeys) {
  const title = COMP.streams[k]?.title || (k === OVERHEAD_KEY ? '00 Program Management' : k);
  ensure(`ST-${k}`, title, 'stream', null);
}

for (const l of leaves) {
  const sid = `ST-${l.stream_key}`;
  ensure(sid, COMP.streams[l.stream_key]?.title || (l.stream_key === OVERHEAD_KEY ? '00 Program Management' : l.stream_key), 'stream', null);
  const lid = `${sid}--${slug(l.layer)}`;
  ensure(lid, l.layer, 'layer', sid);
  l.parentId = lid;
}

// ---------- coverage report ----------
const coverage = {};
for (const k of allStreamKeys) {
  coverage[k] = { declared_paths: owners[k]?.declared_paths.length || 0, files_matched: 0, files_shared: 0 };
}
for (const l of leaves) {
  coverage[l.stream_key].files_matched++;
  for (const sk of l.shared_streams) coverage[sk].files_shared++;
}

// ---------- write ----------
const spine = {
  generatedAt: new Date().toISOString(),
  totals: {
    files: leaves.length,
    streams: allStreamKeys.size,
    overhead_files: coverage[OVERHEAD_KEY].files_matched,
  },
  path_to_stream,
  path_to_shared,
  coverage,
};
writeJson('.lovable/wbs/spine.json', spine);

const wbs = {
  generatedAt: new Date().toISOString(),
  totals: {
    leaves: leaves.length,
    streams: allStreamKeys.size,
    overhead_files: coverage[OVERHEAD_KEY].files_matched,
    byLayer: leaves.reduce((acc, l) => { acc[l.layer] = (acc[l.layer] || 0) + 1; return acc; }, {}),
  },
  parents: [...parents.values()],
  leaves,
};
writeJson('.lovable/wbs/wbs.json', wbs);

console.log(`[spine] ${leaves.length} files across ${allStreamKeys.size} streams (${coverage[OVERHEAD_KEY].files_matched} overhead)`);
console.log(`[spine] by layer:`, wbs.totals.byLayer);
const sorted = Object.entries(coverage).sort((a, b) => b[1].files_matched - a[1].files_matched);
console.log(`[spine] coverage (top 10):`);
for (const [k, c] of sorted.slice(0, 10)) {
  console.log(`         ${k.padEnd(45)} declared=${c.declared_paths}  matched=${c.files_matched}  shared=${c.files_shared}`);
}
const empty = sorted.filter(([k, c]) => k !== OVERHEAD_KEY && c.files_matched === 0);
if (empty.length) console.log(`[spine] WARNING streams with zero file coverage:`, empty.map(([k]) => k));
