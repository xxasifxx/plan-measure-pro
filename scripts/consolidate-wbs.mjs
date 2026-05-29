#!/usr/bin/env node
// Consolidate every WBS YAML into a single canonical docs/wbs.json + docs/wbs.md.
// Tolerant of the four different shapes the subagents produced — we walk each
// document recursively, treat any object with both `id` and `name` as a leaf,
// preserve all original fields, and normalize subTasks to {name, days}.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const SOURCES = [
  { file: 'docs/wbs-leaves.yaml',                              defaultSurface: null },
  { file: '/mnt/documents/wbs-resource-management.yaml',       defaultSurface: 'Resource Management' },
  { file: '/mnt/documents/wbs-fajar-product.yaml',             defaultSurface: 'Fajar / Equipment Rental' },
  { file: '/mnt/documents/wbs-cost-risk-claims.yaml',          defaultSurface: null },
  { file: '/mnt/documents/wbs-scheduling-controls-reporting.yaml', defaultSurface: null },
  { file: '/mnt/documents/wbs-scheduling-extras.yaml',         defaultSurface: 'Scheduling Extras' },
  { file: '/mnt/documents/wbs-integrations.yaml',              defaultSurface: 'Integrations' },
  { file: '/mnt/documents/wbs-ai-auth-admin.yaml',             defaultSurface: null },
  { file: '/mnt/documents/wbs-native-offline-notifications.yaml', defaultSurface: null },
];

// Map surface-key (the YAML group key under which a leaf lives) to a human surface label.
const SURFACE_KEY_LABEL = {
  bootstrap_shell:     'Bootstrap & Shell',
  scheduling:          'Scheduling',
  scheduling_extras:   'Scheduling Extras',
  ai:                  'AI',
  auth:                'Auth & Admin',
  auth_admin:          'Auth & Admin',
  admin:               'Auth & Admin',
  native_offline:      'Native & Offline',
  notifications:       'Notifications',
  integrations_surface:'Integrations',
  workPackages:        'Integrations',
  leaves:              null, // pass-through
};

function looksLikeLeaf(o) {
  return o && typeof o === 'object' && !Array.isArray(o)
    && typeof o.id === 'string'
    && (typeof o.name === 'string' || typeof o.title === 'string');
}

function normalizeSubTasks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(t => {
    if (!t || typeof t !== 'object') return { name: String(t), days: null };
    const name = t.name ?? t.task ?? t.title ?? '(unnamed)';
    const days = t.days ?? t.durationDays ?? t.duration ?? null;
    const notes = t.notes ?? t.description ?? null;
    const sub = t.subTasks ? normalizeSubTasks(t.subTasks) : undefined;
    return { name, days, ...(notes ? { notes } : {}), ...(sub ? { subTasks: sub } : {}) };
  });
}

function normalizeLeaf(node, ctxSurface) {
  const name = node.name ?? node.title;
  const surface = node.surface ?? ctxSurface ?? 'Uncategorized';
  return {
    id: node.id,
    name,
    surface,
    status: node.status ?? 'planned',
    durationDays: node.durationDays ?? node.duration_days ?? node.duration ?? null,
    prerequisites: node.prerequisites ?? node.prereqs ?? [],
    workItemHint: node.workItemHint ?? null,
    sources: node.sources ?? [],
    rationale: (node.rationale ?? '').trim() || null,
    subTasks: normalizeSubTasks(node.subTasks ?? node.tasks ?? []),
    _sourceFile: node._sourceFile,
  };
}

function walk(node, ctxSurface, out, sourceFile) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, ctxSurface, out, sourceFile);
    return;
  }
  if (!node || typeof node !== 'object') return;

  if (looksLikeLeaf(node)) {
    const leaf = normalizeLeaf({ ...node, _sourceFile: sourceFile }, ctxSurface);
    out.push(leaf);
    // Don't recurse into a leaf's children (subTasks handled separately).
    return;
  }

  for (const [k, v] of Object.entries(node)) {
    let nextSurface = ctxSurface;
    if (k in SURFACE_KEY_LABEL) {
      const lbl = SURFACE_KEY_LABEL[k];
      if (lbl) nextSurface = lbl;
    } else if (k === 'surface' && typeof v === 'string') {
      nextSurface = v;
    } else if (typeof v === 'object' && v && !Array.isArray(v) && typeof v.name === 'string' && !looksLikeLeaf(v)) {
      // grouping object like { name: 'Cost Management', leaves: [...] }
      nextSurface = v.name;
    }
    walk(v, nextSurface, out, sourceFile);
  }
}

const all = [];
const fileStats = [];
for (const src of SOURCES) {
  if (!fs.existsSync(src.file)) { console.warn('skip (missing):', src.file); continue; }
  const raw = fs.readFileSync(src.file, 'utf8');
  const doc = yaml.load(raw);
  const before = all.length;
  walk(doc, src.defaultSurface, all, src.file);
  fileStats.push({ file: src.file, leaves: all.length - before });
}

// Deduplicate by id (later definitions win, but warn).
const byId = new Map();
const dupes = [];
for (const leaf of all) {
  if (byId.has(leaf.id)) { dupes.push(leaf.id); }
  byId.set(leaf.id, leaf);
}
const leaves = [...byId.values()];

// Validate prerequisites.
const orphanPrereqs = [];
const ids = new Set(leaves.map(l => l.id));
for (const l of leaves) {
  for (const p of (l.prerequisites || [])) {
    const pid = typeof p === 'string' ? p.split(/\s+/)[0].replace(/[#,].*$/, '') : null;
    if (pid && !ids.has(pid) && !/^[A-Z]+-\d+$/.test(pid) === false) {
      if (!ids.has(pid)) orphanPrereqs.push({ leaf: l.id, prereq: pid });
    }
  }
}

// Group by surface for reporting.
const bySurface = {};
for (const l of leaves) {
  (bySurface[l.surface] ||= []).push(l);
}

// Status counts.
const statusCounts = {};
for (const l of leaves) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;

// Total estimated days for non-shipped work.
const remainingDays = leaves
  .filter(l => l.status !== 'shipped')
  .reduce((s, l) => s + (Number(l.durationDays) || 0), 0);

const out = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalLeaves: leaves.length,
    bySurface: Object.fromEntries(Object.entries(bySurface).map(([k, v]) => [k, v.length])),
    byStatus: statusCounts,
    duplicateIds: dupes,
    orphanPrereqCount: orphanPrereqs.length,
    remainingEstimatedDays: remainingDays,
    sourceFiles: fileStats,
  },
  leaves,
  orphanPrereqs,
};

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/wbs.json', JSON.stringify(out, null, 2));

// Markdown index.
const md = [];
md.push('# TakeoffPro — Work Breakdown Structure');
md.push('');
md.push(`Generated: ${out.generatedAt}`);
md.push('');
md.push(`**${leaves.length} leaves** · ${remainingDays} estimated days of non-shipped work`);
md.push('');
md.push('## Status summary');
md.push('');
md.push('| Status | Leaves |');
md.push('|---|---:|');
for (const [s, n] of Object.entries(statusCounts).sort()) md.push(`| ${s} | ${n} |`);
md.push('');
md.push('## Surfaces');
md.push('');
md.push('| Surface | Leaves |');
md.push('|---|---:|');
for (const [s, arr] of Object.entries(bySurface).sort()) md.push(`| ${s} | ${arr.length} |`);
md.push('');
for (const [surface, arr] of Object.entries(bySurface).sort()) {
  md.push(`## ${surface}`);
  md.push('');
  md.push('| ID | Name | Status | Days | Sub-tasks |');
  md.push('|---|---|---|---:|---:|');
  for (const l of arr.sort((a,b) => a.id.localeCompare(b.id))) {
    md.push(`| ${l.id} | ${l.name} | ${l.status} | ${l.durationDays ?? '—'} | ${l.subTasks.length} |`);
  }
  md.push('');
}
if (dupes.length) {
  md.push('## Duplicate IDs (later definition won)');
  md.push('');
  for (const d of dupes) md.push(`- ${d}`);
  md.push('');
}
if (orphanPrereqs.length) {
  md.push('## Orphan prerequisites');
  md.push('');
  md.push('Leaves that reference a prerequisite ID not present in the WBS:');
  md.push('');
  for (const o of orphanPrereqs.slice(0, 100)) md.push(`- ${o.leaf} → ${o.prereq}`);
  if (orphanPrereqs.length > 100) md.push(`- … and ${orphanPrereqs.length - 100} more`);
  md.push('');
}
fs.writeFileSync('docs/wbs.md', md.join('\n'));

console.log('Wrote docs/wbs.json and docs/wbs.md');
console.log('Total leaves:', leaves.length);
console.log('By status:', statusCounts);
console.log('By surface:');
for (const [s, arr] of Object.entries(bySurface).sort()) console.log(`  ${s.padEnd(36)} ${arr.length}`);
console.log('Duplicate ids:', dupes.length, dupes.slice(0, 10));
console.log('Orphan prereqs:', orphanPrereqs.length);
console.log('Remaining estimated days (non-shipped):', remainingDays);
