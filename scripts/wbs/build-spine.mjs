// Build the canonical WBS spine (wbs.json).
// Source: docs/wbs-dev.leaves.json (417 brief+code leaves)
//       ∪ docs/wbs-proposals.reconciled.json.builtClusters (32 code-surface clusters)
//       ∪ docs/wbs-proposals.reconciled.json.orphanCapabilities (67 brass-tacks gaps)
// Dedup: normalized name within stream.
import { readJson, writeJson, slug, streamKey } from './util.mjs';

const leaves = readJson('docs/wbs-dev.leaves.json').leaves;
const reconciled = readJson('docs/wbs-proposals.reconciled.json');

// Surface→stream mapping. Reconciled clusters use coarse surface names; leaves
// use numbered streams. Map surfaces back to the dominant numbered stream.
const SURFACE_TO_STREAM = {
  'Takeoff': '05 Field Capture',
  'Scheduling': '11 Schedule Management',
  'Field Ops': '05 Field Capture',
  'Marketing & Sales': '20 Sales & Pitch',
  'Documents': '10 Document Management',
  'Reporting': '06 Daily Report Lifecycle',
  'Notifications': '17 Notifications & Presence',
  'Native & Offline': '15 Offline & Native Durability',
  'Project Controls': '12 Project Health & Controls',
  'UNASSIGNED': '99 Cross-cutting',
};

const normalizeStream = (s) => {
  // collapse "& / and" variants and pad number
  const m = String(s || '').match(/^(\d+)\s+(.*)$/);
  if (!m) return s || '99 Cross-cutting';
  const num = m[1].padStart(2, '0');
  const name = m[2].replace(/\band\b/gi, '&');
  return `${num} ${name}`;
};

const byId = new Map();
const dedupKey = (stream, layer, name) =>
  `${streamKey(normalizeStream(stream))}::${slug(layer)}::${slug(name)}`;

let leafSeq = 0;
const upsert = (rec) => {
  const k = dedupKey(rec.stream, rec.layer, rec.name);
  if (byId.has(k)) {
    const existing = byId.get(k);
    existing.origins = [...new Set([...existing.origins, ...rec.origins])];
    existing.fileGlobs = [...new Set([...(existing.fileGlobs || []), ...(rec.fileGlobs || [])])];
    existing.criteria = [...(existing.criteria || []), ...(rec.criteria || [])];
    existing.notes = [existing.notes, rec.notes].filter(Boolean).join(' | ').slice(0, 500);
    existing.sourceRefs.push(...rec.sourceRefs);
    return existing;
  }
  leafSeq++;
  const stream = normalizeStream(rec.stream);
  const id = `LF-${String(leafSeq).padStart(4, '0')}`;
  const node = {
    id,
    stream,
    streamKey: streamKey(stream),
    layer: rec.layer || 'Unspecified',
    name: rec.name,
    origins: rec.origins,
    fileGlobs: rec.fileGlobs || [],
    criteria: rec.criteria || [],
    notes: rec.notes || '',
    sourceRefs: rec.sourceRefs,
    parentId: null, // wired below
  };
  byId.set(k, node);
  return node;
};

// 1. Brief+code leaves (the 417). Pull existing id into sourceRefs.
for (const l of leaves) {
  upsert({
    stream: l.stream,
    layer: l.layer,
    name: l.name,
    origins: [l.provenance || 'brief'],
    fileGlobs: l.fileGlobs || [],
    criteria: (l.sources || [])
      .filter((s) => s.kind === 'criterion')
      .map((s, i) => ({
        id: `${l.id}#c${i + 1}`,
        text: s.criterion,
        verdict: s.verdict || 'unspecified',
      })),
    notes: l.note || '',
    sourceRefs: [{ kind: 'leaf-catalog', id: l.id }],
  });
}

// 2. Code-surface clusters (builtClusters). Each becomes a leaf in Engineering
// layer keyed by proposedName. These represent build work the brief catalog
// didn't name explicitly.
for (const c of reconciled.builtClusters) {
  const stream = SURFACE_TO_STREAM[c.proposedSurface] || '99 Cross-cutting';
  upsert({
    stream,
    layer: 'Engineering',
    name: c.proposedName || `Cluster ${c.clusterId}`,
    origins: ['code-surface'],
    fileGlobs: [],
    criteria: [],
    notes: (c.sampleSubjects || []).slice(0, 3).join(' / '),
    sourceRefs: [
      {
        kind: 'built-cluster',
        id: c.clusterId,
        firstCommit: c.firstCommit,
        lastCommit: c.lastCommit,
        topTags: (c.topTags || []).slice(0, 5).map((t) => t.tag),
      },
    ],
  });
}

// 3. Orphan capabilities (brass tacks: things claimed/needed but never named).
for (const o of reconciled.orphanCapabilities) {
  const stream = SURFACE_TO_STREAM[o.surface] || '99 Cross-cutting';
  upsert({
    stream,
    layer: 'Capability',
    name: o.name,
    origins: ['orphan-capability'],
    fileGlobs: [],
    criteria: [{ id: `${o.capId}#claim`, text: o.notes || o.name, verdict: o.status }],
    notes: `[${o.status}] ${o.notes || ''}`.slice(0, 500),
    sourceRefs: [{ kind: 'orphan-capability', id: o.capId, keywords: o.keywords }],
  });
}

// Compute parents: each leaf parents to a synthetic stream-level node and a
// stream/layer node, written as part of the same flat collection.
const leavesOut = [...byId.values()];

// Build parent nodes (stream, stream/layer) and link.
const parentMap = new Map();
const ensureParent = (id, name, kind, parentId) => {
  if (parentMap.has(id)) return parentMap.get(id);
  const node = { id, name, kind, parentId, isParent: true };
  parentMap.set(id, node);
  return node;
};

for (const l of leavesOut) {
  const streamId = `ST-${l.streamKey}`;
  ensureParent(streamId, l.stream, 'stream', null);
  const layerId = `${streamId}--${slug(l.layer)}`;
  ensureParent(layerId, l.layer, 'layer', streamId);
  l.parentId = layerId;
}

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    leaves: leavesOut.length,
    streams: [...new Set(leavesOut.map((l) => l.stream))].length,
    byOrigin: leavesOut.reduce((a, l) => {
      for (const o of l.origins) a[o] = (a[o] || 0) + 1;
      return a;
    }, {}),
    byLayer: leavesOut.reduce((a, l) => {
      a[l.layer] = (a[l.layer] || 0) + 1;
      return a;
    }, {}),
  },
  parents: [...parentMap.values()],
  leaves: leavesOut,
};
writeJson('.lovable/wbs/wbs.json', out);
console.log(
  `[spine] ${out.totals.leaves} leaves across ${out.totals.streams} streams ` +
    `(${out.parents.length} parents)`,
);
console.log('[spine] by origin:', out.totals.byOrigin);
console.log('[spine] by layer:', out.totals.byLayer);
