#!/usr/bin/env node
// Build .lovable/wbs/spine.json and .lovable/wbs/wbs.json
//
// New shape (capability tier):
//   ROOT
//   └─ stream (ST-NN-…)
//      └─ capability (CAP-…) — one per criterion / risk / overhead / deliverables
//         └─ file leaf (LF-…) OR placeholder leaf OR deliverable leaf
//
// Leaves come from three sources:
//   1. file-history.json — every real file in git history (existing leaves)
//   2. capabilities.json `needs_files` — placeholder leaves (`exists: false`)
//   3. program-deliverables.json — non-file deliverable leaves (`kind: deliverable`)
//
// A file's owning stream is derived the same way the old spine did (longest
// literal glob wins), but parent assignment now goes to a capability under
// that stream, not a layer node. `layer` becomes a tag on the leaf.
//
// Field aliases kept for emit-p6-xml + state/next compatibility:
//   l.streamKey (alias of stream_key), l.stream (stream title)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson, slug } from './util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMP = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/comprehension.json'), 'utf8'));
const HIST = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/file-history.json'), 'utf8'));
const CAPS = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/capabilities.json'), 'utf8'));

// ---------- glob → regex ----------
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

const OVERHEAD_KEY = '00-program-management';
const owners = {};
for (const s of Object.values(COMP.streams)) {
  owners[s.key] = {
    paths: (s.paths || []).map(g => ({ g, rx: globToRegex(g) })),
    shared: (s.shared_paths || []).map(g => ({ g, rx: globToRegex(g) })),
    declared_paths: s.paths || [],
    declared_shared: s.shared_paths || [],
  };
}

function classifyFile(filePath) {
  const primary = [];
  for (const [key, o] of Object.entries(owners)) {
    for (const { g, rx } of o.paths) {
      if (rx.test(filePath)) { primary.push({ key, score: g.replace(/\*/g, '').length }); break; }
    }
  }
  if (primary.length) {
    primary.sort((a, b) => b.score - a.score);
    const winner = primary[0].key;
    const rest = primary.slice(1).map(x => x.key).filter(k => k !== winner);
    return { primary: winner, shared: rest };
  }
  const sharedClaims = [];
  for (const [key, o] of Object.entries(owners)) {
    for (const { rx } of o.shared) {
      if (rx.test(filePath)) { sharedClaims.push(key); break; }
    }
  }
  return { primary: OVERHEAD_KEY, shared: sharedClaims };
}

function layerOf(p) {
  if (p.startsWith('PENDING/')) return 'Placeholder';
  if (p.startsWith('DELIVERABLE/')) return 'Deliverable';
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

// ---------- build path → capability map from capabilities.json ----------
// A file can appear in multiple capabilities; first capability in stream wins
// for parenting (so files cluster under their first claiming criterion).
const fileToCap = new Map();    // path → cap_id
const fileToCapsAll = new Map(); // path → cap_id[]
const overheadCapByStream = new Map(); // stream_key → cap_id
for (const stream of Object.values(CAPS.streams)) {
  for (const cap of stream.capabilities) {
    if (cap.kind === 'overhead') overheadCapByStream.set(stream.stream_key, cap.id);
    for (const f of cap.files) {
      if (!fileToCap.has(f)) fileToCap.set(f, cap.id);
      (fileToCapsAll.get(f) || fileToCapsAll.set(f, []).get(f)).push(cap.id);
    }
  }
}

// ---------- build leaves ----------
const path_to_stream = {};
const path_to_shared = {};
const path_to_capability = {};
const leaves = [];
let seq = 0;

const streamTitle = (k) => CAPS.streams[k]?.title || COMP.streams[k]?.title || (k === OVERHEAD_KEY ? '00 Program Management' : k);

function mkLeafId() { seq++; return `LF-${String(seq).padStart(4, '0')}`; }

// 1. Real files
for (const f of HIST.files) {
  const cls = classifyFile(f.path);
  path_to_stream[f.path] = cls.primary;
  if (cls.shared.length) path_to_shared[f.path] = cls.shared;
  const lyr = layerOf(f.path);

  // Find capability: prefer a capability under the owning stream that claims this file
  let capId = null;
  for (const cid of fileToCapsAll.get(f.path) || []) {
    if (cid.startsWith(cls.primary + '::')) { capId = cid; break; }
  }
  if (!capId) capId = overheadCapByStream.get(cls.primary) || `${cls.primary}::overhead`;
  path_to_capability[f.path] = capId;

  leaves.push({
    id: mkLeafId(),
    path: f.path,
    name: f.path.split('/').pop(),
    stream_key: cls.primary,
    streamKey: cls.primary,     // alias for legacy consumers
    stream: streamTitle(cls.primary),
    shared_streams: cls.shared,
    layer: lyr,
    capability_id: capId,
    exists: true,
    kind: 'file',
    created_at: f.created_at,
    last_modified_at: f.last_modified_at,
    deleted_at: f.deleted_at,
    active_days: f.active_days,
    calendar_days: f.calendar_days,
    touch_count: f.touch_count,
    loc_added: f.loc_added,
    loc_removed: f.loc_removed,
    contributors: f.contributors,
    parentId: null,
  });
}

// 2. Placeholder leaves (PENDING/...)
let placeholderCount = 0;
for (const stream of Object.values(CAPS.streams)) {
  for (const cap of stream.capabilities) {
    for (const p of cap.needs_files || []) {
      placeholderCount++;
      leaves.push({
        id: mkLeafId(),
        path: p,
        name: p.split('/').pop(),
        stream_key: stream.stream_key,
        streamKey: stream.stream_key,
        stream: streamTitle(stream.stream_key),
        shared_streams: [],
        layer: 'Placeholder',
        capability_id: cap.id,
        exists: false,
        kind: 'placeholder',
        verdict_blocker: cap.verdict,
        active_days: 0,
        calendar_days: 0,
        touch_count: 0,
        loc_added: 0,
        loc_removed: 0,
        contributors: [],
        created_at: null,
        last_modified_at: null,
        deleted_at: null,
        parentId: null,
      });
    }
  }
}

// 3. Deliverable leaves
let deliverableCount = 0;
for (const stream of Object.values(CAPS.streams)) {
  for (const cap of stream.capabilities) {
    if (cap.kind !== 'deliverables') continue;
    for (const d of cap.deliverables) {
      deliverableCount++;
      leaves.push({
        id: mkLeafId(),
        path: `DELIVERABLE/${d.id}`,
        name: d.name,
        stream_key: stream.stream_key,
        streamKey: stream.stream_key,
        stream: streamTitle(stream.stream_key),
        shared_streams: [],
        layer: 'Deliverable',
        capability_id: cap.id,
        exists: d.verdict === 'implemented',
        kind: 'deliverable',
        verdict_blocker: d.verdict,
        deliverable_id: d.id,
        duration_days: d.duration_days,
        evidence: d.evidence,
        active_days: 0,
        calendar_days: 0,
        touch_count: 0,
        loc_added: 0,
        loc_removed: 0,
        contributors: [],
        created_at: null,
        last_modified_at: null,
        deleted_at: null,
        parentId: null,
      });
    }
  }
}

// ---------- parent hierarchy ----------
const parents = new Map();
function ensure(id, name, kind, parentId, extra = {}) {
  if (parents.has(id)) return parents.get(id);
  const node = { id, name, kind, parentId, isParent: true, ...extra };
  parents.set(id, node);
  return node;
}

const allStreamKeys = new Set([...Object.keys(COMP.streams), OVERHEAD_KEY, ...Object.keys(CAPS.streams)]);
for (const k of allStreamKeys) ensure(`ST-${k}`, streamTitle(k), 'stream', null);

// Capability parents
for (const stream of Object.values(CAPS.streams)) {
  const sid = `ST-${stream.stream_key}`;
  for (const cap of stream.capabilities) {
    const cid = `CAP-${cap.id}`;
    ensure(cid, cap.title, 'capability', sid, {
      capability_kind: cap.kind,
      verdict: cap.verdict,
      severity: cap.severity,
    });
  }
}

// Wire leaves → capability parents
for (const l of leaves) {
  const cid = `CAP-${l.capability_id}`;
  if (!parents.has(cid)) {
    // capability not yet created (edge case for orphan stream); create overhead under stream
    const sid = `ST-${l.stream_key}`;
    ensure(sid, streamTitle(l.stream_key), 'stream', null);
    ensure(cid, 'Stream overhead', 'capability', sid, { capability_kind: 'overhead', verdict: 'implemented' });
  }
  l.parentId = cid;
}

// ---------- coverage report ----------
const coverage = {};
for (const k of allStreamKeys) {
  coverage[k] = {
    declared_paths: owners[k]?.declared_paths.length || 0,
    files_matched: 0,
    files_shared: 0,
    placeholders: 0,
    deliverables: 0,
    capabilities: (CAPS.streams[k]?.capabilities || []).length,
  };
}
for (const l of leaves) {
  if (l.kind === 'file') coverage[l.stream_key].files_matched++;
  if (l.kind === 'placeholder') coverage[l.stream_key].placeholders++;
  if (l.kind === 'deliverable') coverage[l.stream_key].deliverables++;
  for (const sk of l.shared_streams) if (coverage[sk]) coverage[sk].files_shared++;
}

// ---------- write ----------
writeJson('.lovable/wbs/spine.json', {
  generatedAt: new Date().toISOString(),
  totals: {
    files: leaves.filter(l => l.kind === 'file').length,
    placeholders: placeholderCount,
    deliverables: deliverableCount,
    streams: allStreamKeys.size,
    capabilities: [...parents.values()].filter(p => p.kind === 'capability').length,
    overhead_files: coverage[OVERHEAD_KEY].files_matched,
  },
  path_to_stream,
  path_to_shared,
  path_to_capability,
  coverage,
});

writeJson('.lovable/wbs/wbs.json', {
  generatedAt: new Date().toISOString(),
  totals: {
    leaves: leaves.length,
    files: leaves.filter(l => l.kind === 'file').length,
    placeholders: placeholderCount,
    deliverables: deliverableCount,
    streams: allStreamKeys.size,
    capabilities: [...parents.values()].filter(p => p.kind === 'capability').length,
    overhead_files: coverage[OVERHEAD_KEY].files_matched,
    byLayer: leaves.reduce((acc, l) => { acc[l.layer] = (acc[l.layer] || 0) + 1; return acc; }, {}),
    byKind: leaves.reduce((acc, l) => { acc[l.kind] = (acc[l.kind] || 0) + 1; return acc; }, {}),
  },
  parents: [...parents.values()],
  leaves,
});

console.log(`[spine] leaves=${leaves.length}  files=${leaves.filter(l=>l.kind==='file').length}  placeholders=${placeholderCount}  deliverables=${deliverableCount}`);
console.log(`[spine] capability parents: ${[...parents.values()].filter(p=>p.kind==='capability').length}`);
const sorted = Object.entries(coverage).sort((a, b) => b[1].files_matched - a[1].files_matched);
console.log(`[spine] coverage (top 8):`);
for (const [k, c] of sorted.slice(0, 8)) {
  console.log(`  ${k.padEnd(42)} caps=${c.capabilities} files=${c.files_matched} placeholders=${c.placeholders} deliverables=${c.deliverables}`);
}
