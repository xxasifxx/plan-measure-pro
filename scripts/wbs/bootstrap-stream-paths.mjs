#!/usr/bin/env node
// One-shot: read "## Surfaces (files)" sections from each docs/streams/NN-*.md
// and prepend YAML front-matter with stream_key + paths[]. Idempotent: skips
// docs that already have front-matter (preserves manual edits).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/streams';

// Globs/tables that should NOT become path entries
const SKIP_PREFIXES = ['public.', 'storage.', 'auth.'];
const VALID_PREFIXES = ['src/', 'supabase/', 'scripts/', 'docs/', 'public/', 'tests/', 'capacitor.', 'vite.', 'tailwind.', 'tsconfig', 'package.', 'index.html'];

function isPath(token) {
  if (!token) return false;
  for (const p of SKIP_PREFIXES) if (token.startsWith(p)) return false;
  for (const p of VALID_PREFIXES) if (token.startsWith(p)) return true;
  return false;
}

// Strip parenthetical sub-function lists: "src/foo.ts (bar, baz)" → "src/foo.ts"
function cleanPath(s) {
  return s.replace(/[`]/g, '').split(/[\s(]/)[0].replace(/[,;:]$/, '').trim();
}

function extractPaths(md) {
  const lines = md.split('\n');
  let inSurfaces = false;
  const paths = new Set();
  for (const line of lines) {
    if (/^##\s+Surfaces/i.test(line)) { inSurfaces = true; continue; }
    if (inSurfaces && /^##\s+/.test(line)) break;
    if (!inSurfaces) continue;
    if (!/^\s*-\s/.test(line)) continue;
    // first backticked token
    const m = line.match(/`([^`]+)`/);
    if (!m) continue;
    const p = cleanPath(m[1]);
    if (isPath(p)) paths.add(p);
  }
  return [...paths];
}

function hasFrontMatter(md) {
  return /^---\s*\n/.test(md);
}

function buildFrontMatter(streamKey, paths) {
  const lines = ['---', `stream_key: ${streamKey}`, 'paths:'];
  for (const p of paths) lines.push(`  - ${p}`);
  lines.push('shared_paths: []');
  lines.push('---', '');
  return lines.join('\n');
}

let touched = 0, skipped = 0;
for (const f of readdirSync(DIR).filter(f => /^\d{2}-.*\.md$/.test(f)).sort()) {
  const full = join(DIR, f);
  const md = readFileSync(full, 'utf8');
  if (hasFrontMatter(md)) { skipped++; console.log(`[skip] ${f} — already has front-matter`); continue; }
  const streamKey = f.replace(/\.md$/, '');
  const paths = extractPaths(md);
  if (paths.length === 0) { console.warn(`[warn] ${f} — no paths extracted`); continue; }
  const fm = buildFrontMatter(streamKey, paths);
  writeFileSync(full, fm + md);
  console.log(`[ok]   ${f} — ${paths.length} paths`);
  touched++;
}
console.log(`\n${touched} files updated, ${skipped} skipped`);
