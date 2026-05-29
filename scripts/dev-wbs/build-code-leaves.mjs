#!/usr/bin/env node
// Phase 1.5a — Derive leaves from actual code (not briefs).
//
// Sources:
//   - File-cluster leaves from src/**, supabase/**, scripts/**, root configs.
//   - Backend surface leaves: edge functions, migrations (weekly clusters),
//     public.<table> from types.ts.
//   - Build/infra leaves under stream "98".
//   - Per-migration leaves (one per supabase/migrations/*.sql file).
//   - Public asset leaves from public/**.
//   - Everything that doesn't match a heuristic falls to "97 Plumbing".
//
// Output: docs/wbs-dev.code-leaves.json
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { streamForPath, streamForPublicPath, TABLE_TO_STREAM, STREAM_NAMES } from './stream-heuristics.mjs';


const OUT = 'docs/wbs-dev.code-leaves.json';

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir)) {
    if (ent === 'node_modules' || ent.startsWith('.')) continue;
    const p = join(dir, ent);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function layerFor(path) {
  if (/^public\./.test(path)) return 'Backend';
  if (/^supabase\//.test(path) || /\.sql$/.test(path)) return 'Backend';
  if (/^src\/lib\/(native|offline)\//.test(path)) return 'Mobile';
  if (/^src\/components\/Mobile/.test(path)) return 'Mobile';
  if (/^src\/components\/(BiometricGate|SyncPanel|PwaShell|NativeFirstRun)/.test(path)) return 'Mobile';
  if (/^src\/test\//.test(path)) return 'Verification';
  if (/^scripts\//.test(path)) return 'Verification';
  if (/^docs\//.test(path)) return 'Docs';
  if (/^(vite|tailwind|postcss|eslint|tsconfig|components|capacitor)/.test(path) ||
      /^supabase\/config\.toml$/.test(path) || /^index\.html$/.test(path)) return 'Build';
  return 'Frontend';
}

function nameFromPath(p) {
  if (/^public\./.test(p)) return 'db: ' + p.replace(/^public\./, '');
  if (/^supabase\/functions\/([^/]+)/.test(p)) return 'fn: ' + p.match(/^supabase\/functions\/([^/]+)/)[1];
  if (/^supabase\/migrations\//.test(p)) return 'migration: ' + p.split('/').pop().replace(/\.sql$/, '');
  return (p.split('/').pop() || p).replace(/\.[a-z]+$/i, '');
}

// ── 1) file leaves ────────────────────────────────────────────────────────────
const ALL = [
  ...walk('src'),
  ...walk('supabase/functions'),
  ...walk('scripts'),
  ...walk('public'),
  'capacitor.config.ts', 'vite.config.ts', 'tailwind.config.ts',
  'postcss.config.js', 'eslint.config.js', 'components.json',
  'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'supabase/config.toml', 'supabase/seed.sql',
].filter(p => existsSync(p));


const leaves = [];

// shadcn primitives — collapse to one leaf
const shadcn = ALL.filter(p => /^src\/components\/ui\//.test(p));
if (shadcn.length) {
  leaves.push({
    streamNum: '99',
    layer: 'Frontend',
    name: 'shadcn UI primitives',
    fileGlobs: shadcn,
    provenance: 'code-only',
    sources: [{ kind: 'file-cluster', cluster: 'shadcn' }],
  });
}

// every other file → its own leaf
const seenPath = new Set(shadcn);
for (const p of ALL) {
  if (seenPath.has(p)) continue;
  seenPath.add(p);
  // skip migrations here — handled per-file below
  if (/^supabase\/migrations\//.test(p)) continue;
  const sn = /^public\//.test(p) ? streamForPublicPath(p) : streamForPath(p);
  const layer = /^public\//.test(p) ? 'Frontend' : layerFor(p);
  leaves.push({
    streamNum: sn,
    layer,
    name: nameFromPath(p),
    fileGlobs: [p],
    provenance: 'code-only',
    sources: [{ kind: 'file-cluster', path: p }],
  });
}


// ── 2) per-migration leaves ───────────────────────────────────────────────────
const migrations = readdirSync('supabase/migrations')
  .filter(f => f.endsWith('.sql'))
  .map(f => ({
    file: `supabase/migrations/${f}`,
    iso: `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`,
    slug: f.replace(/^\d+_/, '').replace(/\.sql$/, '').slice(0, 40),
  }));

for (const m of migrations) {
  leaves.push({
    streamNum: '98',
    layer: 'Backend',
    name: `migration: ${m.iso} ${m.slug}`,
    fileGlobs: [m.file],
    provenance: 'code-only',
    sources: [{ kind: 'migration', path: m.file, iso: m.iso }],
  });
}


// ── 3) public.<table> leaves from types.ts ────────────────────────────────────
const typesSrc = readFileSync('src/integrations/supabase/types.ts', 'utf8');
const publicBlock = typesSrc.split(/^\s*public:\s*\{/m)[1] || '';
// Extract top-level table identifiers under public.Tables
const tablesSection = publicBlock.split(/Tables:\s*\{/)[1]?.split(/Views:|Functions:|Enums:/)[0] || '';
const tableRe = /^\s{6,}([a-z_][a-z0-9_]*):\s*\{/gm;
const tables = new Set();
let mm;
while ((mm = tableRe.exec(tablesSection)) !== null) tables.add(mm[1]);

// also views
const viewsSection = publicBlock.split(/Views:\s*\{/)[1]?.split(/Functions:|Enums:/)[0] || '';
const views = new Set();
while ((mm = tableRe.exec(viewsSection)) !== null) views.add(mm[1]);

for (const t of [...tables, ...views]) {
  const sn = TABLE_TO_STREAM[t] || '97';
  leaves.push({
    streamNum: sn,
    layer: 'Backend',
    name: `db: ${t}`,
    fileGlobs: [`public.${t}`],
    provenance: 'code-only',
    sources: [{ kind: 'table', table: t }],
  });
}

// ── 4) finalize ───────────────────────────────────────────────────────────────
for (const l of leaves) {
  l.stream = `${l.streamNum} ${STREAM_NAMES[l.streamNum] || '?'}`;
  l.id = `${l.streamNum}:${l.layer.toLowerCase()}:${slugify(l.name)}`;
}

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    leaves: leaves.length,
    byStream: leaves.reduce((a, l) => (a[l.streamNum] = (a[l.streamNum] || 0) + 1, a), {}),
    byLayer: leaves.reduce((a, l) => (a[l.layer] = (a[l.layer] || 0) + 1, a), {}),
    tables: tables.size, views: views.size, migrationWeeks: byWeek.size,
  },
  leaves,
};

mkdirSync('docs', { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT}`);
console.log(`  ${out.totals.leaves} code-derived leaves`);
console.log(`  byLayer: ${JSON.stringify(out.totals.byLayer)}`);
console.log(`  ${tables.size} tables, ${views.size} views, ${byWeek.size} migration weeks`);
