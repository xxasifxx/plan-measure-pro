#!/usr/bin/env node
// Build .lovable/wbs/capabilities.json
//
// For every stream in comprehension.json, emit one capability per acceptance
// criterion plus a synthetic "stream-overhead" capability that catches files
// the stream owns but no criterion claims.
//
// Resolution rule: a criterion's `evidence_paths` (basenames extracted from
// the stream MD by build-comprehension) are joined against the files the
// stream owns in spine.json. Match is by basename (last path segment) — the
// stream docs reference files like `useDailyReport.ts:54` without the full
// path, and the stream already owns the full path via its `paths:` globs.
//
// Placeholder leaves: for any criterion whose verdict is not `implemented`
// and which resolves to zero existing files, emit one synthetic `PENDING/...`
// path so the WBS shows the gap as a real (unbuilt) leaf instead of hiding it.
//
// Risks: same treatment for risk entries that explicitly name a missing file
// (severity high|medium and text contains "missing"|"never"|"no ... table").
//
// Output shape:
// {
//   "06-daily-report-lifecycle": {
//     stream_key, title,
//     capabilities: [
//       { id, kind: "criterion"|"risk"|"overhead", title, verdict,
//         files: [path,...], needs_files: [path,...] },
//       ...
//     ]
//   }, ...
// }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, slug } from './util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMP = readJson('.lovable/wbs/comprehension.json');
const HIST = readJson('.lovable/wbs/file-history.json');

// Build the same owners regex set spine uses, so we know which files each
// stream owns before placing capabilities. We only need this to compute
// "files owned by stream" — we don't re-derive primary ownership here.
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

// Pre-compute primary ownership the same way spine does (longest literal wins)
const ownersRx = {};
for (const s of Object.values(COMP.streams)) {
  ownersRx[s.key] = { paths: (s.paths || []).map(g => ({ g, rx: globToRegex(g) })) };
}
function ownerOf(filePath) {
  const matches = [];
  for (const [k, o] of Object.entries(ownersRx)) {
    for (const { g, rx } of o.paths) {
      if (rx.test(filePath)) matches.push({ k, score: g.replace(/\*/g, '').length });
    }
  }
  if (!matches.length) return null;
  matches.sort((a, b) => b.score - a.score);
  return matches[0].k;
}

// Group existing files by owning stream
const filesByStream = {};
for (const f of HIST.files) {
  const k = ownerOf(f.path) || '00-program-management';
  (filesByStream[k] ||= []).push(f.path);
}

// Basename → fullpath map per stream
function basenameIndex(paths) {
  const m = new Map();
  for (const p of paths) {
    const bn = p.split('/').pop();
    if (!m.has(bn)) m.set(bn, []);
    m.get(bn).push(p);
  }
  return m;
}

function resolveEvidence(evPaths, streamFiles, bnIdx) {
  const out = new Set();
  for (const ev of evPaths || []) {
    // evidence may look like "useDailyReport.ts" or "src/foo/bar.ts"
    if (ev.includes('/')) {
      if (streamFiles.includes(ev)) out.add(ev);
      else {
        // try basename fallback
        const bn = ev.split('/').pop();
        for (const p of bnIdx.get(bn) || []) out.add(p);
      }
    } else {
      for (const p of bnIdx.get(ev) || []) out.add(p);
    }
  }
  return [...out];
}

const RISK_MISSING_RE = /\b(missing|never (?:wired|implemented|created)|no\s+\w+\s+table|absent|stubbed only|not implemented)\b/i;

const out = {};
const totals = { capabilities: 0, criteria: 0, risks: 0, overhead: 0, placeholders: 0, orphans: 0 };

for (const s of Object.values(COMP.streams)) {
  const streamFiles = filesByStream[s.key] || [];
  const bnIdx = basenameIndex(streamFiles);
  const claimedFiles = new Set();
  const caps = [];

  // Criteria → capabilities
  for (const c of s.criteria) {
    const resolved = resolveEvidence(c.evidence_paths, streamFiles, bnIdx);
    for (const f of resolved) claimedFiles.add(f);

    const needs_files = [];
    if (c.verdict !== 'implemented' && resolved.length === 0) {
      needs_files.push(`PENDING/${s.key}/${slug(c.text).slice(0, 60) || 'c' + c.ordinal}`);
      totals.placeholders++;
    }
    caps.push({
      id: `${s.key}::c${c.ordinal}`,
      kind: 'criterion',
      title: (c.text || '').slice(0, 140),
      verdict: c.verdict,
      ordinal: c.ordinal,
      files: resolved,
      needs_files,
      evidence: c.evidence,
    });
    totals.criteria++;
  }

  // Risks → capabilities (only if they name a missing file, or paths are present)
  for (const r of s.risks) {
    const resolved = resolveEvidence(r.paths, streamFiles, bnIdx);
    const missing = RISK_MISSING_RE.test(r.text || '');
    if (!resolved.length && !missing) continue;
    for (const f of resolved) claimedFiles.add(f);

    const needs_files = [];
    if (missing && !resolved.length) {
      needs_files.push(`PENDING/${s.key}/risk-${r.n}-${slug(r.text).slice(0, 50)}`);
      totals.placeholders++;
    }
    caps.push({
      id: `${s.key}::r${r.n}`,
      kind: 'risk',
      title: r.text.slice(0, 140),
      verdict: 'missing',
      severity: r.severity,
      files: resolved,
      needs_files,
    });
    totals.risks++;
  }

  // Overhead capability for files the stream owns but no capability claims
  const orphans = streamFiles.filter(p => !claimedFiles.has(p));
  if (orphans.length) {
    caps.push({
      id: `${s.key}::overhead`,
      kind: 'overhead',
      title: 'Stream overhead (files not tied to a criterion)',
      verdict: 'implemented',
      files: orphans,
      needs_files: [],
    });
    totals.overhead++;
    totals.orphans += orphans.length;
  }

  totals.capabilities += caps.length;
  out[s.key] = {
    stream_key: s.key,
    title: s.title,
    capabilities: caps,
  };
}

// Program-management stream + overhead bucket for unmapped files
const overheadKey = '00-program-management';
if (!out[overheadKey]) {
  const overheadFiles = filesByStream[overheadKey] || [];
  out[overheadKey] = {
    stream_key: overheadKey,
    title: '00 Program Management',
    capabilities: overheadFiles.length ? [{
      id: `${overheadKey}::overhead`,
      kind: 'overhead',
      title: 'Program overhead (config, docs, scaffolding)',
      verdict: 'implemented',
      files: overheadFiles,
      needs_files: [],
    }] : [],
  };
  totals.overhead += overheadFiles.length ? 1 : 0;
  totals.orphans += overheadFiles.length;
}

// Merge program deliverables into their target streams as synthetic capabilities
const DLV = readJson('.lovable/wbs/program-deliverables.json');
const dlvByStream = {};
for (const d of DLV.deliverables) {
  (dlvByStream[d.stream_key] ||= []).push(d);
}
for (const [k, dlvs] of Object.entries(dlvByStream)) {
  if (!out[k]) {
    out[k] = { stream_key: k, title: COMP.streams[k]?.title || k, capabilities: [] };
  }
  out[k].capabilities.push({
    id: `${k}::deliverables`,
    kind: 'deliverables',
    title: 'Deliverables (non-file work products)',
    verdict: 'partial',
    files: [],
    needs_files: [],
    deliverables: dlvs.map(d => ({
      id: d.id,
      name: d.name,
      verdict: d.verdict,
      evidence: d.evidence,
      duration_days: d.duration_days,
    })),
  });
  totals.capabilities++;
}

writeJson('.lovable/wbs/capabilities.json', {
  generatedAt: new Date().toISOString(),
  totals,
  streams: out,
});

console.log(`[capabilities] streams=${Object.keys(out).length}  caps=${totals.capabilities}  criteria=${totals.criteria}  risks=${totals.risks}  overhead-caps=${totals.overhead}  placeholders=${totals.placeholders}  orphan-files=${totals.orphans}`);
