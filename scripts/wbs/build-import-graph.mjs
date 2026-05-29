#!/usr/bin/env node
// Build .lovable/wbs/import-graph.json — TS import edges, deduped to
// cross-stream edges only (used as real FS predecessors in the schedule).
//
// Lightweight regex pass (we do not need full type resolution): collect
// every `from '...';` and `import('...')` in src/**/*.{ts,tsx}, resolve
// relative paths against the importing file, classify into streams via
// the join produced by build-spine, and emit unique (predStream → succStream)
// pairs.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';

const SPINE = JSON.parse(readFileSync('.lovable/wbs/spine.json', 'utf8'));
const pathToStream = SPINE.path_to_stream; // path -> stream_key

// All TS/TSX files tracked in git
const files = execSync('git ls-files "src/**/*.ts" "src/**/*.tsx"', { encoding: 'utf8' })
  .split('\n').filter(Boolean);

const EXT_TRY = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolveImport(fromFile, spec) {
  // Only resolve relative + @/ alias; ignore bare packages.
  if (spec.startsWith('@/')) {
    const base = 'src/' + spec.slice(2);
    for (const ext of EXT_TRY) {
      const p = base + ext;
      if (pathToStream[p] || files.includes(p)) return p;
    }
    return null;
  }
  if (!spec.startsWith('.')) return null;
  const abs = normalize(join(dirname(fromFile), spec));
  for (const ext of EXT_TRY) {
    const p = abs + ext;
    if (pathToStream[p] || files.includes(p)) return p;
  }
  return null;
}

const RX = /(?:import\s[^'"]*?from\s+|import\s+|export\s[^'"]*?from\s+|import\()\s*['"]([^'"]+)['"]/g;

const fileEdges = []; // {from, to}
for (const f of files) {
  let src;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  let m;
  while ((m = RX.exec(src))) {
    const resolved = resolveImport(f, m[1]);
    if (resolved && resolved !== f) fileEdges.push({ from: f, to: resolved });
  }
}

// Reduce to unique cross-stream pairs
const crossStream = new Map(); // "predStream→succStream" -> { count, examples[] }
for (const e of fileEdges) {
  const predStream = pathToStream[e.to];   // imported file is the predecessor
  const succStream = pathToStream[e.from]; // importing file is the successor
  if (!predStream || !succStream) continue;
  if (predStream === succStream) continue;
  const key = `${predStream}→${succStream}`;
  let entry = crossStream.get(key);
  if (!entry) {
    entry = { pred_stream: predStream, succ_stream: succStream, count: 0, examples: [] };
    crossStream.set(key, entry);
  }
  entry.count++;
  if (entry.examples.length < 3) entry.examples.push({ from: e.from, imports: e.to });
}

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    file_imports: fileEdges.length,
    cross_stream_edges: crossStream.size,
  },
  cross_stream_edges: [...crossStream.values()].sort((a, b) => b.count - a.count),
};

mkdirSync('.lovable/wbs', { recursive: true });
writeFileSync('.lovable/wbs/import-graph.json', JSON.stringify(out, null, 2) + '\n');
console.log(`[import-graph] wrote .lovable/wbs/import-graph.json`);
console.log(`  ${out.totals.file_imports} file-level imports → ${out.totals.cross_stream_edges} unique cross-stream edges`);
