#!/usr/bin/env node
// Phase 1.5b — Reconcile brief-derived leaves with code-derived leaves.
//
// Rules (per plan):
//   - Match by file path overlap. If a code leaf and a brief leaf share any
//     fileGlob, merge them.
//   - On merge: brief wins name, code wins fileGlobs union, sources combine,
//     provenance = "brief+code".
//   - Unmerged brief leaves keep provenance "brief-only".
//   - Unmerged code leaves keep provenance "code-only".
//
// Outputs:
//   - docs/wbs-dev.leaves.json (final, replaces Phase-1 output)
//   - docs/wbs-dev.leaves.md   (re-rendered with provenance column)
//   - docs/wbs-dev.catalog-gaps.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { STREAM_NAMES } from './stream-heuristics.mjs';

const briefDoc = JSON.parse(readFileSync('docs/wbs-dev.leaves.json', 'utf8'));
const codeDoc  = JSON.parse(readFileSync('docs/wbs-dev.code-leaves.json', 'utf8'));

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// Tag brief leaves
const briefLeaves = briefDoc.leaves.map(l => ({
  ...l,
  provenance: l.streamNum === '00' ? 'inventory' : 'brief-only',
}));
const codeLeaves = codeDoc.leaves.slice();

// Build path → brief-leaf index for fast overlap matching.
const briefByPath = new Map();
for (const bl of briefLeaves) {
  for (const g of bl.fileGlobs) {
    if (!briefByPath.has(g)) briefByPath.set(g, []);
    briefByPath.get(g).push(bl);
  }
}

const mergedCodeIds = new Set();
const reassignedBriefIds = new Set();

for (const cl of codeLeaves) {
  // pick best brief leaf with file overlap, preferring same stream then most overlap
  const candidates = new Map(); // briefLeaf → overlapCount
  for (const g of cl.fileGlobs) {
    for (const bl of briefByPath.get(g) || []) {
      candidates.set(bl, (candidates.get(bl) || 0) + 1);
    }
  }
  if (!candidates.size) continue;
  const ranked = [...candidates.entries()].sort((a, b) => {
    const aSame = a[0].streamNum === cl.streamNum ? 1 : 0;
    const bSame = b[0].streamNum === cl.streamNum ? 1 : 0;
    if (aSame !== bSame) return bSame - aSame;
    return b[1] - a[1];
  });
  const target = ranked[0][0];
  // merge
  const unionGlobs = Array.from(new Set([...(target.fileGlobs || []), ...cl.fileGlobs]));
  target.fileGlobs = unionGlobs;
  target.sources = [...(target.sources || []), ...cl.sources];
  target.provenance = 'brief+code';
  mergedCodeIds.add(cl.id);
  // index union for subsequent matches
  for (const g of unionGlobs) {
    if (!briefByPath.has(g)) briefByPath.set(g, []);
    if (!briefByPath.get(g).includes(target)) briefByPath.get(g).push(target);
  }
}

// Unmatched code leaves enter as-is (code-only).
const unmatchedCode = codeLeaves.filter(cl => !mergedCodeIds.has(cl.id));

// Final list — combine, dedupe by id
const all = [...briefLeaves, ...unmatchedCode];
const byId = new Map();
for (const l of all) {
  if (byId.has(l.id)) {
    // collision — merge
    const ex = byId.get(l.id);
    ex.fileGlobs = Array.from(new Set([...ex.fileGlobs, ...l.fileGlobs]));
    ex.sources = [...ex.sources, ...l.sources];
    ex.provenance = ex.provenance === l.provenance ? ex.provenance : 'brief+code';
    continue;
  }
  byId.set(l.id, l);
}
const finalLeaves = [...byId.values()];

// ── catalog gaps report ───────────────────────────────────────────────────────
const codeOnly = finalLeaves.filter(l => l.provenance === 'code-only');
const briefOnly = finalLeaves.filter(l => l.provenance === 'brief-only');
const merged    = finalLeaves.filter(l => l.provenance === 'brief+code');

// Files that exist in code but no leaf claims (should be near-zero)
const claimedFiles = new Set();
for (const l of finalLeaves) for (const g of l.fileGlobs) claimedFiles.add(g);
const codeFiles = new Set();
for (const cl of codeLeaves) for (const g of cl.fileGlobs) codeFiles.add(g);
const unclaimed = [...codeFiles].filter(f => !claimedFiles.has(f));

// brief-only leaves whose fileGlobs all resolve to NO actual file (stale briefs)
const ALL_REAL = codeFiles;
const staleBrief = briefOnly.filter(l =>
  l.fileGlobs.length > 0 && l.fileGlobs.every(g => !ALL_REAL.has(g) && !g.startsWith('public.'))
);

// Totals
const byStream = finalLeaves.reduce((a, l) => {
  const k = l.streamNum;
  if (!a[k]) a[k] = { total: 0, briefOnly: 0, codeOnly: 0, merged: 0 };
  a[k].total++;
  if (l.provenance === 'brief-only') a[k].briefOnly++;
  else if (l.provenance === 'code-only') a[k].codeOnly++;
  else if (l.provenance === 'brief+code') a[k].merged++;
  return a;
}, {});
const byLayer = finalLeaves.reduce((a, l) => (a[l.layer] = (a[l.layer] || 0) + 1, a), {});

// ── write final leaves doc ───────────────────────────────────────────────────
const finalDoc = {
  generatedAt: new Date().toISOString(),
  totals: {
    streams: new Set(finalLeaves.map(l => l.streamNum)).size,
    leaves: finalLeaves.length,
    byLayer,
    byProvenance: {
      'brief+code': merged.length,
      'brief-only': briefOnly.length,
      'code-only': codeOnly.length,
      'inventory': finalLeaves.filter(l => l.provenance === 'inventory').length,
    },
  },
  leaves: finalLeaves,
};
mkdirSync('docs', { recursive: true });
writeFileSync('docs/wbs-dev.leaves.json', JSON.stringify(finalDoc, null, 2) + '\n');

// ── re-render leaves.md ──────────────────────────────────────────────────────
function renderLeavesMd(leaves) {
  const lines = [];
  lines.push('# Dev WBS — Canonical Leaves');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} · **${leaves.length} leaves** across ${new Set(leaves.map(l=>l.streamNum)).size} streams.`);
  lines.push('');
  lines.push('Provenance:');
  lines.push(`- **brief+code** (${merged.length}) — a brief mentioned it and code confirms it.`);
  lines.push(`- **brief-only** (${briefOnly.length}) — brief named it but no matching code found (could be stale brief or DB-only feature).`);
  lines.push(`- **code-only** (${codeOnly.length}) — code exists but no brief acceptance criterion mentions it.`);
  lines.push('');
  const streams = new Map();
  for (const l of leaves) {
    if (!streams.has(l.streamNum)) streams.set(l.streamNum, []);
    streams.get(l.streamNum).push(l);
  }
  for (const sn of [...streams.keys()].sort()) {
    const ls = streams.get(sn);
    const name = ls[0]?.stream || `${sn} ${STREAM_NAMES[sn] || '?'}`;
    lines.push(`## ${name} — ${ls.length} leaves`);
    const byL = new Map();
    for (const l of ls) {
      if (!byL.has(l.layer)) byL.set(l.layer, []);
      byL.get(l.layer).push(l);
    }
    for (const layer of ['Frontend', 'Backend', 'Mobile', 'Verification', 'Build', 'Docs']) {
      const xs = byL.get(layer);
      if (!xs?.length) continue;
      lines.push(`### ${layer} (${xs.length})`);
      for (const l of xs.sort((a,b) => a.name.localeCompare(b.name))) {
        const prov = `\`${l.provenance}\``;
        const globs = l.fileGlobs.slice(0, 3).map(g => `\`${g}\``).join(', ')
                    + (l.fileGlobs.length > 3 ? ` _(+${l.fileGlobs.length-3})_` : '');
        lines.push(`- ${prov} **${l.name}** — ${globs}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n') + '\n';
}
writeFileSync('docs/wbs-dev.leaves.md', renderLeavesMd(finalLeaves));

// ── catalog-gaps.md ──────────────────────────────────────────────────────────
const gap = [];
gap.push('# Dev WBS — Catalog Gaps');
gap.push('');
gap.push(`Generated ${new Date().toISOString()}.`);
gap.push('');
gap.push('## Summary');
gap.push('');
gap.push('| Stream | Total | brief+code | brief-only | code-only |');
gap.push('|---|---:|---:|---:|---:|');
for (const sn of Object.keys(byStream).sort()) {
  const s = byStream[sn];
  const n = STREAM_NAMES[sn] || '?';
  gap.push(`| ${sn} ${n} | ${s.total} | ${s.merged} | ${s.briefOnly} | ${s.codeOnly} |`);
}
gap.push('');
gap.push(`**Totals:** ${finalLeaves.length} leaves — ${merged.length} brief+code, ${briefOnly.length} brief-only, ${codeOnly.length} code-only.`);
gap.push('');
gap.push('## Code-only leaves (brief is silent on this)');
gap.push('');
gap.push('These represent work that happened but no brief acceptance criterion names it. ' +
        'Each is a hint that the corresponding stream brief is undercounting plumbing.');
gap.push('');
const codeOnlyByStream = new Map();
for (const l of codeOnly) {
  if (!codeOnlyByStream.has(l.streamNum)) codeOnlyByStream.set(l.streamNum, []);
  codeOnlyByStream.get(l.streamNum).push(l);
}
for (const sn of [...codeOnlyByStream.keys()].sort()) {
  const xs = codeOnlyByStream.get(sn);
  gap.push(`### ${sn} ${STREAM_NAMES[sn] || '?'} (${xs.length})`);
  for (const l of xs.sort((a,b)=>a.name.localeCompare(b.name))) {
    gap.push(`- **${l.name}** (${l.layer}) — \`${l.fileGlobs[0]}\``);
  }
  gap.push('');
}
gap.push('## Brief-only leaves with no matching code (likely stale briefs or DB-only)');
gap.push('');
if (!staleBrief.length) gap.push('_(none — every brief leaf resolved to at least one real file)_');
for (const l of staleBrief) {
  gap.push(`- **${l.stream} → ${l.name}** — globs: ${l.fileGlobs.map(g=>`\`${g}\``).join(', ')}`);
}
gap.push('');
gap.push('## Files in repo that no leaf claims');
gap.push('');
if (!unclaimed.length) gap.push('_(none — full coverage)_');
for (const f of unclaimed.slice(0, 50)) gap.push(`- \`${f}\``);
if (unclaimed.length > 50) gap.push(`- … and ${unclaimed.length - 50} more`);
gap.push('');

writeFileSync('docs/wbs-dev.catalog-gaps.md', gap.join('\n') + '\n');

console.log(`Wrote docs/wbs-dev.leaves.json (${finalLeaves.length} leaves)`);
console.log(`  brief+code: ${merged.length}, brief-only: ${briefOnly.length}, code-only: ${codeOnly.length}`);
console.log(`  byLayer: ${JSON.stringify(byLayer)}`);
console.log(`Wrote docs/wbs-dev.leaves.md`);
console.log(`Wrote docs/wbs-dev.catalog-gaps.md`);
console.log(`  unclaimed files: ${unclaimed.length}`);
console.log(`  stale brief-only leaves: ${staleBrief.length}`);
