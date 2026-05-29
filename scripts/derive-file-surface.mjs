#!/usr/bin/env node
// Pass A — mechanical file→surface derivation.
// Walks src/, supabase/, scripts/, docs/; records imports + the leaf IDs
// in docs/wbs.json that already cite each file. No LLM. Wrong on purpose:
// this exists so Pass B (semantic) and Pass C (reverse-from-leaves) have
// a baseline to disagree with.

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const ROOTS = ['src', 'supabase', 'scripts', 'docs'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.md']);
const IGNORE = /(^|\/)(node_modules|dist|build|\.git|\.next|coverage)(\/|$)/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const rel = relative(ROOT, p);
    if (IGNORE.test(rel)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(rel);
  }
  return out;
}

const files = ROOTS.flatMap(r => {
  try { return walk(join(ROOT, r)); } catch { return []; }
});

// Reverse index from wbs.json: file path → leafIds that cite it via sources[].
const wbs = JSON.parse(readFileSync('docs/wbs.json', 'utf8'));
const fileToLeaves = new Map();
const fileToSurfaces = new Map();
for (const leaf of wbs.leaves) {
  for (const src of leaf.sources || []) {
    // sources entries can be plain paths or {path, ...}
    const path = typeof src === 'string' ? src : src.path || src.file;
    if (!path) continue;
    if (!fileToLeaves.has(path)) fileToLeaves.set(path, []);
    fileToLeaves.get(path).push(leaf.id);
    if (!fileToSurfaces.has(path)) fileToSurfaces.set(path, new Set());
    if (leaf.surface) fileToSurfaces.get(path).add(leaf.surface);
  }
}

// Cheap path-based guess — first directory segment hint.
function pathGuess(rel) {
  const seg = rel.split('/');
  if (seg[0] === 'supabase' && seg[1] === 'functions') return ['Backend & Infra'];
  if (seg[0] === 'supabase' && seg[1] === 'migrations') return ['Backend & Infra'];
  if (seg[0] === 'scripts') return ['Cross-Cutting'];
  if (seg[0] === 'docs') return ['Cross-Cutting'];
  if (rel.includes('/auth/') || /Auth|Login|Signup|Role|Admin/.test(rel)) return ['Auth & Admin'];
  if (rel.includes('/native/') || /Capacitor|Offline|Sync/.test(rel)) return ['Native & Offline'];
  if (rel.includes('/fajar/') || /Equipment|Rental/i.test(rel)) return ['Fajar / Equipment Rental'];
  if (/Schedule|Gantt|Critical/i.test(rel)) return ['Scheduling'];
  if (/Cost|Budget|Invoice/i.test(rel)) return ['Cost Management'];
  if (/Resource|Crew|Allocation/i.test(rel)) return ['Resource Management'];
  if (/Takeoff|Quantity|Measure/i.test(rel)) return ['Takeoff'];
  if (/Field|Daily|Inspection/i.test(rel)) return ['Field Operations'];
  if (/Marketing|Landing/i.test(rel)) return ['Marketing & Sales'];
  if (/Report|Export/i.test(rel)) return ['Reporting'];
  if (/Notif/i.test(rel)) return ['Notifications'];
  if (/AI|LLM|Gemini|Prompt/i.test(rel)) return ['AI'];
  return [];
}

// Cheap import extraction for ts/tsx/js.
function extractImports(rel) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(rel)) return [];
  let txt;
  try { txt = readFileSync(rel, 'utf8'); } catch { return []; }
  const out = new Set();
  const re = /(?:import\s[^'"]*from\s*|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g;
  let m; while ((m = re.exec(txt)) !== null) out.add(m[1]);
  return [...out];
}

const result = files.map(rel => ({
  path: rel,
  pathGuess: pathGuess(rel),
  citedByLeaves: fileToLeaves.get(rel) || [],
  citedSurfaces: [...(fileToSurfaces.get(rel) || [])],
  imports: extractImports(rel).filter(i => i.startsWith('.') || i.startsWith('@/')),
}));

writeFileSync('docs/file-surface-a.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  fileCount: result.length,
  surfaceList: [...new Set(wbs.leaves.map(l => l.surface).filter(Boolean))].sort(),
  files: result,
}, null, 2));

// Quick stats.
const uncited = result.filter(r => r.citedByLeaves.length === 0).length;
const multiSurface = result.filter(r => r.citedSurfaces.length > 1).length;
console.log(`Wrote docs/file-surface-a.json`);
console.log(`Files: ${result.length}`);
console.log(`Uncited by any leaf: ${uncited}`);
console.log(`Cited by leaves across >1 surface: ${multiSurface}`);
