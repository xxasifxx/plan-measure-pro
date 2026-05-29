#!/usr/bin/env node
// Apply depth-audit patches from /mnt/documents/wbs-depth-patches-{a,b,c}.yaml
// into docs/wbs.json and regenerate docs/wbs.md with per-surface patch summary.
//
// Idempotent: rerunning with the same patch files yields the same output.
// Each patched leaf gets a `depthAudit` metadata block recording the prior
// values and the patch source. Surface totals are recomputed.

import fs from 'node:fs';
import yaml from 'js-yaml';

const PATCH_FILES = [
  { file: '/mnt/documents/wbs-depth-patches-a.yaml', agent: 'A' },
  { file: '/mnt/documents/wbs-depth-patches-b.yaml', agent: 'B' },
  { file: '/mnt/documents/wbs-depth-patches-c.yaml', agent: 'C' },
];

const wbs = JSON.parse(fs.readFileSync('docs/wbs.json', 'utf8'));
const byId = new Map(wbs.leaves.map(l => [l.id, l]));

function normalizeSubTask(t) {
  if (!t || typeof t !== 'object') return { name: String(t), days: null };
  const out = { name: t.name ?? t.task ?? t.title ?? '(unnamed)', days: t.days ?? null };
  if (t.notes) out.notes = t.notes;
  return out;
}

const applied = [];
const missing = [];
let totalPatches = 0;

for (const { file, agent } of PATCH_FILES) {
  if (!fs.existsSync(file)) { console.warn('skip (missing):', file); continue; }
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  const patches = doc?.patches ?? [];
  for (const p of patches) {
    totalPatches++;
    const leaf = byId.get(p.id);
    if (!leaf) { missing.push({ agent, id: p.id }); continue; }

    const priorDuration = leaf.durationDays;
    const priorSubTaskCount = (leaf.subTasks || []).length;

    if (Array.isArray(p.proposedSubTasks)) {
      leaf.subTasks = p.proposedSubTasks.map(normalizeSubTask);
    }
    if (p.proposedDurationDays != null) {
      leaf.durationDays = p.proposedDurationDays;
    }
    leaf.depthAudit = {
      agent,
      patchFile: file,
      priorDurationDays: priorDuration,
      priorSubTaskCount,
      newSubTaskCount: leaf.subTasks.length,
      durationDelta: (leaf.durationDays ?? 0) - (priorDuration ?? 0),
      rationale: typeof p.rationale === 'string' ? p.rationale.trim() : null,
      reuseFromCode: p.reuseFromCode ?? null,
      thinnessCriteria: p.thinnessCriteria ?? null,
    };
    applied.push({ agent, id: leaf.id, surface: leaf.surface, delta: leaf.depthAudit.durationDelta });
  }
}

// Recompute totals
const bySurface = {};
for (const l of wbs.leaves) (bySurface[l.surface] ||= []).push(l);
const statusCounts = {};
for (const l of wbs.leaves) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
const remainingDays = wbs.leaves
  .filter(l => l.status !== 'shipped')
  .reduce((s, l) => s + (Number(l.durationDays) || 0), 0);

wbs.summary = {
  ...wbs.summary,
  totalLeaves: wbs.leaves.length,
  bySurface: Object.fromEntries(Object.entries(bySurface).map(([k, v]) => [k, v.length])),
  byStatus: statusCounts,
  remainingEstimatedDays: remainingDays,
  depthAudit: {
    appliedAt: new Date().toISOString(),
    patchesApplied: applied.length,
    patchesMissing: missing.length,
    missingIds: missing,
    netDurationDelta: applied.reduce((s, a) => s + (a.delta || 0), 0),
  },
};
wbs.generatedAt = new Date().toISOString();

fs.writeFileSync('docs/wbs.json', JSON.stringify(wbs, null, 2));

// Markdown regeneration with patch summary per surface
const surfaceDays = (arr) => arr.reduce((s, l) => s + (Number(l.durationDays) || 0), 0);
const surfacePatchedCount = (arr) => arr.filter(l => l.depthAudit).length;

const md = [];
md.push('# TakeoffPro — Work Breakdown Structure');
md.push('');
md.push(`Generated: ${wbs.generatedAt}`);
md.push('');
md.push(`**${wbs.leaves.length} leaves** · ${remainingDays} estimated days of non-shipped work`);
md.push('');
md.push(`**Depth audit:** ${applied.length} patches applied (Net ${wbs.summary.depthAudit.netDurationDelta >= 0 ? '+' : ''}${wbs.summary.depthAudit.netDurationDelta}d).`);
if (missing.length) md.push(`Missing IDs (not found in WBS): ${missing.map(m => m.id).join(', ')}`);
md.push('');

md.push('## Status summary');
md.push('');
md.push('| Status | Leaves |');
md.push('|---|---:|');
for (const [s, n] of Object.entries(statusCounts).sort()) md.push(`| ${s} | ${n} |`);
md.push('');

md.push('## Surfaces');
md.push('');
md.push('| Surface | Leaves | Days | Patched |');
md.push('|---|---:|---:|---:|');
for (const [s, arr] of Object.entries(bySurface).sort()) {
  md.push(`| ${s} | ${arr.length} | ${surfaceDays(arr).toFixed(1)} | ${surfacePatchedCount(arr)} |`);
}
md.push('');

for (const [surface, arr] of Object.entries(bySurface).sort()) {
  md.push(`## ${surface} (${arr.length}, ${surfaceDays(arr).toFixed(1)}d)`);
  md.push('');
  md.push('| ID | Name | Status | Days | Sub-tasks | Audit |');
  md.push('|---|---|---|---:|---:|---|');
  for (const l of arr.sort((a, b) => a.id.localeCompare(b.id))) {
    const audit = l.depthAudit
      ? `patched ${l.depthAudit.durationDelta >= 0 ? '+' : ''}${l.depthAudit.durationDelta}d`
      : '';
    md.push(`| ${l.id} | ${l.name} | ${l.status} | ${l.durationDays ?? '—'} | ${l.subTasks.length} | ${audit} |`);
  }
  md.push('');
}

if (applied.length) {
  md.push('## Patches applied');
  md.push('');
  md.push('| Agent | ID | Surface | Δ days |');
  md.push('|---|---|---|---:|');
  for (const a of applied.sort((x, y) => x.id.localeCompare(y.id))) {
    md.push(`| ${a.agent} | ${a.id} | ${a.surface} | ${a.delta >= 0 ? '+' : ''}${a.delta} |`);
  }
  md.push('');
}

fs.writeFileSync('docs/wbs.md', md.join('\n'));

console.log(`Applied ${applied.length} / ${totalPatches} patches.`);
if (missing.length) console.log('Missing:', missing);
console.log(`Net duration delta: ${wbs.summary.depthAudit.netDurationDelta >= 0 ? '+' : ''}${wbs.summary.depthAudit.netDurationDelta} days`);
console.log(`Remaining non-shipped: ${remainingDays} days`);
console.log('By surface:');
for (const [s, arr] of Object.entries(bySurface).sort()) {
  console.log(`  ${s.padEnd(32)} ${String(arr.length).padStart(3)}  ${surfaceDays(arr).toFixed(1).padStart(7)}d  patched=${surfacePatchedCount(arr)}`);
}
