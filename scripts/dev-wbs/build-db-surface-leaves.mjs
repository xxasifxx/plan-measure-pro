#!/usr/bin/env node
// Phase 1.6 — Derive leaves from SQL surface inside migrations.
//
// Emits leaves for:
//   - CREATE FUNCTION public.<name>         → per name (deduped across migrations)
//   - CREATE TYPE … AS ENUM                 → per enum name
//   - CREATE TRIGGER <name> ON public.<tbl> → per (table,trigger) pair
//   - INSERT INTO storage.buckets …         → per bucket id
//   - Per-table RLS policy aggregate        → one "rls: <table>" leaf
//
// Each leaf's fileGlobs lists the migrations that touched it (most recent first
// is unimportant — reconciliation indexes by glob).
//
// Output: docs/wbs-dev.db-surface-leaves.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import {
  DB_FUNCTION_TO_STREAM,
  DB_ENUM_TO_STREAM,
  STORAGE_BUCKET_TO_STREAM,
  TABLE_TO_STREAM,
  STREAM_NAMES,
} from './stream-heuristics.mjs';

const OUT = 'docs/wbs-dev.db-surface-leaves.json';
const MIG_DIR = 'supabase/migrations';

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const migFiles = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql'))
  .map(f => `${MIG_DIR}/${f}`);

// kind → name → { files:Set, extra }
const fns = new Map();      // public functions
const enums = new Map();
const trigs = new Map();    // "table.trigger" → Set(files)
const buckets = new Map();
const rls = new Map();      // table → Set(files)

const RX_FN  = /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_][a-z0-9_]*)\s*\(/gi;
const RX_EN  = /create\s+type\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+as\s+enum/gi;
const RX_TRG = /create\s+(?:or\s+replace\s+)?trigger\s+([a-z_][a-z0-9_]*)[\s\S]{1,200}?on\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi;
const RX_BKT = /insert\s+into\s+storage\.buckets[\s\S]{1,400}?values\s*\(\s*'([^']+)'/gi;
const RX_POL = /create\s+policy[\s\S]{1,200}?on\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi;

function add(map, key, file) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(file);
}

for (const file of migFiles) {
  const sql = readFileSync(file, 'utf8');
  let m;
  while ((m = RX_FN.exec(sql)))  add(fns,     m[1], file);
  while ((m = RX_EN.exec(sql)))  add(enums,   m[1], file);
  while ((m = RX_TRG.exec(sql))) add(trigs,   `${m[2]}.${m[1]}`, file);
  while ((m = RX_BKT.exec(sql))) add(buckets, m[1], file);
  while ((m = RX_POL.exec(sql))) add(rls,     m[1], file);
}

const leaves = [];

function push(streamNum, layer, name, files, kind, extra = {}) {
  const sn = streamNum || '97';
  leaves.push({
    streamNum: sn,
    stream: `${sn} ${STREAM_NAMES[sn] || '?'}`,
    layer,
    name,
    fileGlobs: [...files],
    provenance: 'code-only',
    sources: [...files].map(f => ({ kind, path: f, ...extra })),
    id: `${sn}:${layer.toLowerCase()}:${slugify(name)}`,
  });
}

for (const [name, files] of fns)
  push(DB_FUNCTION_TO_STREAM[name] || '97', 'Backend', `fn(db): ${name}`, files, 'db-function', { name });

for (const [name, files] of enums)
  push(DB_ENUM_TO_STREAM[name] || '97', 'Backend', `enum: ${name}`, files, 'db-enum', { name });

for (const [key, files] of trigs) {
  const [table, trg] = key.split('.');
  push(TABLE_TO_STREAM[table] || '97', 'Backend', `trg: ${table}.${trg}`, files, 'db-trigger', { table, trigger: trg });
}

for (const [name, files] of buckets)
  push(STORAGE_BUCKET_TO_STREAM[name] || '10', 'Backend', `bucket: ${name}`, files, 'storage-bucket', { name });

for (const [table, files] of rls)
  push(TABLE_TO_STREAM[table] || '97', 'Backend', `rls: ${table}`, files, 'rls-policies', { table });

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    leaves: leaves.length,
    functions: fns.size,
    enums: enums.size,
    triggers: trigs.size,
    buckets: buckets.size,
    rlsTables: rls.size,
  },
  leaves,
};

mkdirSync('docs', { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT}`);
console.log(`  ${leaves.length} db-surface leaves`);
console.log(`  fns:${fns.size} enums:${enums.size} trigs:${trigs.size} buckets:${buckets.size} rls:${rls.size}`);
