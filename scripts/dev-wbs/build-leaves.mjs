#!/usr/bin/env node
// Phase 1 — Build the canonical WBS leaf backbone.
//
// Sources, in order of authority:
//   1. Each stream brief's "Surfaces (files)" section — one leaf per file or DB table.
//   2. Each brief's "Current state vs criteria" — one leaf per bullet, merged
//      into a surface leaf when its primary evidence path matches.
//   3. docs/scope-inventory/*.md — catches any src/* file no brief named.
//
// Each leaf gets a `fileGlobs` list used later by the commit mapper.
// Unmatched files in a stream are not invented here; instead the mapper bucket
// strays into a `Stream/Layer/_unattributed` leaf at attribution time.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';

const STREAM_DIR = 'docs/streams';
const INVENTORY_DIR = 'docs/scope-inventory';
const OUT_JSON = 'docs/wbs-dev.leaves.json';
const OUT_MD = 'docs/wbs-dev.leaves.md';

// ─── helpers ──────────────────────────────────────────────────────────────────
function streamIdFromFile(f) {
  const m = f.match(/^(\d{2})-(.+)\.md$/);
  return { num: m[1], slug: m[2], file: f };
}

function layerFor(path) {
  if (!path) return 'Docs';
  if (/^public\.[a-z_]+$/.test(path))                return 'Backend';
  if (/^supabase\/(migrations|functions)\//.test(path)) return 'Backend';
  if (/\.sql$/.test(path))                            return 'Backend';
  if (/^src\/lib\/native\//.test(path))               return 'Mobile';
  if (/^src\/lib\/offline\//.test(path))              return 'Mobile';
  if (/Mobile|Biometric|Native|Pwa|Capacitor/.test(path)) return 'Mobile';
  if (/^src\/test\//.test(path))                      return 'Verification';
  if (/^docs\//.test(path))                           return 'Docs';
  if (/^scripts\//.test(path))                        return 'Verification';
  if (/^src\//.test(path))                            return 'Frontend';
  return 'Docs';
}

function nameFromPath(p) {
  if (/^public\./.test(p)) return p.replace(/^public\./, 'db: ');
  const base = p.split('/').pop().replace(/\.[a-z]+$/, '');
  return base;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function splitSections(text) {
  const out = {};
  const parts = text.split(/^##\s+/m);
  for (const p of parts.slice(1)) {
    const nl = p.indexOf('\n');
    const heading = p.slice(0, nl).trim();
    out[heading] = p.slice(nl + 1);
  }
  return out;
}

// ─── parse one brief ──────────────────────────────────────────────────────────
const SURFACE_LINE_RE  = /^- `([^`]+)`(?:\s+—\s+(.+))?$/;
const CRITERIA_LINE_RE = /^- \*\*(?<name>[^*]+?)\*\*\s*:\s*(?<verdict>[A-Za-z][^—\-—]*?)(?:\s*[—–-]\s*(?<rest>.*))?$/;
const EVIDENCE_RE = /`([^`]+\.(?:ts|tsx|sql|mjs|json|md|toml|css|html|yaml|yml))(?::[\d–\-,\s]*)?`/g;

function parseBrief(file) {
  const text = readFileSync(`${STREAM_DIR}/${file}`, 'utf8');
  const title = (text.match(/^#\s+(.+)$/m) || [, file])[1].trim();
  const sec = splitSections(text);

  const surfaces = [];
  for (const line of (sec['Surfaces (files)'] || '').split('\n')) {
    const m = line.match(SURFACE_LINE_RE);
    if (m) surfaces.push({ path: m[1].trim(), note: (m[2] || '').trim() });
  }

  const criteria = [];
  for (const line of (sec['Current state vs criteria'] || '').split('\n')) {
    const m = line.match(CRITERIA_LINE_RE);
    if (!m) continue;
    const evidence = [];
    let em;
    EVIDENCE_RE.lastIndex = 0;
    while ((em = EVIDENCE_RE.exec(line)) !== null) evidence.push(em[1]);
    const verdictRaw = m.groups.verdict.toLowerCase().trim();
    const verdict =
      verdictRaw.startsWith('implement') ? 'implemented' :
      verdictRaw.startsWith('partial')   ? 'partial' :
      verdictRaw.startsWith('unverified')? 'unverified' :
      verdictRaw.startsWith('missing')   ? 'missing' :
                                           'unknown';
    criteria.push({ name: m.groups.name.trim(), verdict, evidence, raw: line });
  }

  const acceptance = (sec['Acceptance criteria'] || '')
    .split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim());

  return { file, title, surfaces, criteria, acceptance };
}

// ─── parse scope inventory for stray files ────────────────────────────────────
function inventoryFiles() {
  if (!existsSync(INVENTORY_DIR)) return [];
  const out = [];
  for (const f of readdirSync(INVENTORY_DIR).filter(f => f.endsWith('.md'))) {
    const text = readFileSync(`${INVENTORY_DIR}/${f}`, 'utf8');
    const re = /`([^`]+\.(?:ts|tsx|sql|mjs|css))`/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push({ path: m[1], from: f });
  }
  return out;
}

// ─── build leaves for one stream ──────────────────────────────────────────────
function buildStreamLeaves(streamInfo, brief) {
  const streamNum = streamInfo.num;
  const streamName = brief.title;
  const byKey = new Map(); // key = `${layer}::${nameSlug}` → leaf

  function upsert(leaf) {
    const key = `${leaf.layer}::${slugify(leaf.name)}`;
    const existing = byKey.get(key);
    if (existing) {
      for (const g of leaf.fileGlobs) if (!existing.fileGlobs.includes(g)) existing.fileGlobs.push(g);
      for (const s of leaf.sources)   existing.sources.push(s);
      if (leaf.verdict && !existing.verdict) existing.verdict = leaf.verdict;
      if (leaf.note && !existing.note)       existing.note = leaf.note;
      return existing;
    }
    byKey.set(key, leaf);
    return leaf;
  }

  // (1) surfaces
  for (const s of brief.surfaces) {
    const layer = layerFor(s.path);
    upsert({
      stream: `${streamNum} ${streamName}`,
      streamNum,
      layer,
      name: nameFromPath(s.path),
      fileGlobs: [s.path],
      sources: [{ kind: 'surface', file: streamInfo.file, path: s.path }],
      note: s.note || '',
      verdict: null,
    });
  }

  // (2) criteria — merge into surface leaf when first evidence path matches
  for (const c of brief.criteria) {
    const evLayer = c.evidence.length ? layerFor(c.evidence[0]) : 'Frontend';
    // try to merge into an existing surface leaf by path
    let merged = false;
    for (const ev of c.evidence) {
      for (const leaf of byKey.values()) {
        if (leaf.fileGlobs.includes(ev)) {
          leaf.sources.push({ kind: 'criterion', file: streamInfo.file, criterion: c.name, verdict: c.verdict });
          // strongest verdict wins (implemented > partial > unverified > missing)
          leaf.verdict = strongerVerdict(leaf.verdict, c.verdict);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
    if (merged) continue;
    upsert({
      stream: `${streamNum} ${streamName}`,
      streamNum,
      layer: evLayer,
      name: c.name,
      fileGlobs: [...c.evidence],
      sources: [{ kind: 'criterion', file: streamInfo.file, criterion: c.name, verdict: c.verdict }],
      verdict: c.verdict,
      note: '',
    });
  }

  return [...byKey.values()];
}

function strongerVerdict(a, b) {
  const order = { implemented: 4, partial: 3, unverified: 2, missing: 1, unknown: 0, null: 0 };
  return (order[a] || 0) >= (order[b] || 0) ? a : b;
}

// ─── attach inventory strays by file→stream lookup ────────────────────────────
function attachInventory(leavesByStream, inventory) {
  // build path→stream map from current leaves
  const pathToStream = new Map();
  for (const [streamNum, leaves] of leavesByStream) {
    for (const leaf of leaves) for (const g of leaf.fileGlobs) {
      if (!pathToStream.has(g)) pathToStream.set(g, streamNum);
    }
  }
  const stray = inventory.filter(i => !pathToStream.has(i.path));
  // group stray paths under stream-less "00 Unattributed" — they'll be reassigned
  // by the commit mapper if a brief edit later claims them.
  if (!stray.length) return;
  const layerBuckets = new Map();
  for (const s of stray) {
    const layer = layerFor(s.path);
    const key = layer;
    if (!layerBuckets.has(key)) layerBuckets.set(key, []);
    layerBuckets.get(key).push(s.path);
  }
  const out = [];
  for (const [layer, paths] of layerBuckets) {
    out.push({
      stream: '00 Unattributed',
      streamNum: '00',
      layer,
      name: `_unattributed (${paths.length} files)`,
      fileGlobs: paths,
      sources: paths.map(p => ({ kind: 'inventory', path: p })),
      verdict: null,
      note: 'Files surfaced in scope-inventory that no brief claims.',
    });
  }
  leavesByStream.set('00', out);
}

// ─── render markdown tree ─────────────────────────────────────────────────────
function renderMd(leavesByStream, totals) {
  const lines = [];
  lines.push('# Dev WBS — Canonical Leaves');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} · **${totals.leaves} leaves** across ${totals.streams} streams.`);
  lines.push('');
  lines.push('Each leaf has a stable `id` (`<streamNum>:<layer>:<slug>`), a list of `fileGlobs`,');
  lines.push('and the brief sources that produced it. Activities (historical + forward) attach to these leaves.');
  lines.push('');
  lines.push('## Layer key');
  lines.push('- **Frontend** — `src/**` (non-mobile, non-test)');
  lines.push('- **Backend** — `supabase/**`, `public.*` tables, `.sql`');
  lines.push('- **Mobile** — `src/lib/native/**`, `src/lib/offline/**`, mobile/native components');
  lines.push('- **Verification** — `src/test/**`, `scripts/**`');
  lines.push('- **Docs** — `docs/**`');
  lines.push('');
  const sortedStreams = [...leavesByStream.keys()].sort();
  for (const sn of sortedStreams) {
    const leaves = leavesByStream.get(sn);
    const streamName = leaves[0]?.stream || `${sn} ?`;
    lines.push(`## ${streamName} — ${leaves.length} leaves`);
    const byLayer = new Map();
    for (const l of leaves) {
      if (!byLayer.has(l.layer)) byLayer.set(l.layer, []);
      byLayer.get(l.layer).push(l);
    }
    for (const layer of ['Frontend', 'Backend', 'Mobile', 'Verification', 'Docs']) {
      const ls = byLayer.get(layer);
      if (!ls?.length) continue;
      lines.push(`### ${layer} (${ls.length})`);
      for (const l of ls.sort((a, b) => a.name.localeCompare(b.name))) {
        const verdict = l.verdict ? ` _[${l.verdict}]_` : '';
        const globs = l.fileGlobs.slice(0, 3).map(g => `\`${g}\``).join(', ')
                    + (l.fileGlobs.length > 3 ? ` _(+${l.fileGlobs.length - 3})_` : '');
        lines.push(`- **${l.name}**${verdict} — ${globs}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n') + '\n';
}

// ─── main ─────────────────────────────────────────────────────────────────────
function main() {
  const streamFiles = readdirSync(STREAM_DIR)
    .filter(f => /^\d{2}-.*\.md$/.test(f)).sort();

  const leavesByStream = new Map();
  for (const f of streamFiles) {
    const info = streamIdFromFile(f);
    const brief = parseBrief(f);
    const leaves = buildStreamLeaves(info, brief);
    // attach final id
    for (const l of leaves) {
      l.id = `${info.num}:${l.layer.toLowerCase()}:${slugify(l.name)}`;
    }
    leavesByStream.set(info.num, leaves);
  }

  attachInventory(leavesByStream, inventoryFiles());
  // assign ids to inventory strays
  const unatt = leavesByStream.get('00');
  if (unatt) for (const l of unatt) l.id = `00:${l.layer.toLowerCase()}:${slugify(l.name)}`;

  const all = [...leavesByStream.values()].flat();
  const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
      streams: leavesByStream.size,
      leaves: all.length,
      byLayer: all.reduce((acc, l) => (acc[l.layer] = (acc[l.layer] || 0) + 1, acc), {}),
    },
    leaves: all,
  };

  mkdirSync('docs', { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(OUT_MD, renderMd(leavesByStream, summary.totals));

  console.log(`Wrote ${OUT_JSON}`);
  console.log(`  ${summary.totals.leaves} leaves across ${summary.totals.streams} streams`);
  console.log(`  by layer: ${JSON.stringify(summary.totals.byLayer)}`);
  console.log(`Wrote ${OUT_MD}`);
}

main();
