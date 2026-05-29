#!/usr/bin/env node
// Read each docs/streams/NN-*.md and emit:
//   .lovable/wbs/comprehension.json
//
// Self-contained: parses the YAML front-matter (`stream_key`, `paths`,
// `shared_paths`) and the body sections (Acceptance criteria, Current state,
// Cross-stream handoffs, Risks/debt). Replaces the old version which
// depended on a pre-built wbs.json + activities.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STREAMS_DIR = path.join(root, 'docs/streams');

// ---------- mini YAML front-matter parser (only what we emit) ----------
function parseFrontMatter(md) {
  if (!md.startsWith('---\n')) return { data: {}, body: md };
  const end = md.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: md };
  const yaml = md.slice(4, end);
  const body = md.slice(end + 5);
  const data = {};
  let curKey = null;
  for (const raw of yaml.split('\n')) {
    if (!raw.trim() || raw.startsWith('#')) continue;
    const list = raw.match(/^\s*-\s+(.*?)(?:\s+#.*)?$/);
    if (list && curKey) { (data[curKey] ||= []).push(list[1].trim()); continue; }
    const kv = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*?)(?:\s+#.*)?$/);
    if (kv) {
      curKey = kv[1];
      const val = kv[2].trim();
      if (val === '' || val === '[]') data[curKey] = [];
      else data[curKey] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return { data, body };
}

// ---------- markdown sectioner ----------
function splitSections(md) {
  const out = {};
  let cur = null;
  for (const ln of md.split('\n')) {
    const h = ln.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1].trim(); out[cur] = []; continue; }
    if (cur) out[cur].push(ln);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n').trim()]));
}

function bullets(section) {
  if (!section) return [];
  const items = [];
  let cur = null;
  for (const raw of section.split('\n')) {
    const m = raw.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (m) { if (cur) items.push(cur); cur = m[1]; }
    else if (cur != null && raw.trim()) cur += ' ' + raw.trim();
    else if (!raw.trim() && cur) { items.push(cur); cur = null; }
  }
  if (cur) items.push(cur);
  return items.map(s => s.trim()).filter(Boolean);
}

// ---------- verdict ----------
function classify(stateLine) {
  if (!stateLine) return 'unknown';
  const bold = (stateLine.match(/^\*\*([^*]+)\*\*/) || [, ''])[1].toLowerCase();
  const body = stateLine.replace(/^\*\*[^*]+\*\*\s*[:—-]\s*/, '').slice(0, 160).toLowerCase();
  const scan = bold + ' ' + body;
  if (/\b(not implemented|never implemented|no longer|not started|missing\b|absent|stubbed only)\b/.test(scan)) return 'missing';
  if (/\b(partial|partly|in[- ]flight|in progress|fragile|leaky|but\b.*(?:not|never|missing)|implemented but)\b/.test(scan)) return 'partial';
  if (/\b(implemented|shipped|done|complete|wired|landed)\b/.test(scan)) return 'implemented';
  if (/\b(planned|scheduled|queued|todo|to[- ]do)\b/.test(scan)) return 'planned';
  if (/\b(aspirational|future|vision|roadmap)\b/.test(scan)) return 'aspirational';
  return 'unknown';
}
const VERDICT_PCT = { implemented: 100, shipped: 100, partial: 50, planned: 0, missing: 0, aspirational: 0, unknown: 25 };

// ---------- handoff parser ----------
const HANDOFF_RE = /\*\*(Feeds|Consumes|Seam|Provides|Receives)(?:\s*(?:→|←|->|<-)?\s*([a-z0-9-]+))?\*\*\s*:?\s*(.*)/i;
function parseHandoff(line) {
  const m = line.match(HANDOFF_RE);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  let target = m[2] || null;
  const desc = (m[3] || '').replace(/^[-—:\s]+/, '').trim();
  if (target && /^(everything|all|every|various|several)$/i.test(target)) target = null;
  let direction = 'related';
  if (kind === 'feeds' || /^provides/.test(kind)) direction = 'outbound';
  if (kind === 'consumes' || /^receives/.test(kind)) direction = 'inbound';
  return { kind, direction, target, desc };
}

// ---------- file path extraction from criterion evidence ----------
// Pull every `path/with/slash.ext` reference from a string so we can later
// overlap risks/criteria with file leaves.
const PATH_RE = /`([a-zA-Z0-9_./@-]+\.[a-zA-Z]{1,5})(?::\d+(?:[–-]\d+)?)?`/g;
function extractPaths(text) {
  if (!text) return [];
  const out = [];
  let m;
  while ((m = PATH_RE.exec(text))) out.push(m[1]);
  return [...new Set(out)];
}

// ---------- main ----------
const streamFiles = fs.readdirSync(STREAMS_DIR).filter(f => /^\d{2}-.+\.md$/.test(f)).sort();
const streams = {};
for (const f of streamFiles) {
  const key = f.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(STREAMS_DIR, f), 'utf8');
  const { data: fm, body } = parseFrontMatter(raw);
  const sec = splitSections(body);
  const title = (body.match(/^#\s+(.+)$/m) || [, key])[1].trim();

  const critRaw = bullets(sec['Acceptance criteria']);
  const stateRaw = bullets(sec['Current state vs criteria']);
  const N = Math.max(critRaw.length, stateRaw.length);
  const criteria = [];
  for (let i = 0; i < N; i++) {
    const cText = critRaw[i] || '';
    const sText = stateRaw[i] || '';
    const verdict = classify(sText);
    const ev = sText.split(/\s+—\s+/).slice(1).join(' — ').trim();
    criteria.push({
      id: `${key}#c${i + 1}`,
      ordinal: i + 1,
      text: cText.replace(/^\*\*[^*]+\*\*:\s*/, ''),
      verdict,
      evidence: ev || null,
      evidence_paths: extractPaths(sText),
      raw_state: sText || null,
    });
  }

  const handoffs = bullets(sec['Cross-stream handoffs']).map(parseHandoff).filter(Boolean);
  const risks = bullets(sec['Risks / debt']).map((text, i) => ({
    n: i + 1, text,
    severity:
      /\b(crash|race|silent|fragile|destructive|leak|unauthorized|bypass)\b/i.test(text) ? 'high' :
      /\b(missing|broken|never|stale|untyped|no test|untested)\b/.test(text) ? 'medium' : 'low',
    paths: extractPaths(text),
  }));

  const counts = { implemented: 0, partial: 0, planned: 0, missing: 0, aspirational: 0, unknown: 0 };
  let pctSum = 0;
  for (const c of criteria) {
    counts[c.verdict] = (counts[c.verdict] || 0) + 1;
    pctSum += VERDICT_PCT[c.verdict] ?? 25;
  }
  const stream_percent = criteria.length ? Math.round(pctSum / criteria.length) : 0;

  streams[key] = {
    key,
    title,
    paths: Array.isArray(fm.paths) ? fm.paths : [],
    shared_paths: Array.isArray(fm.shared_paths) ? fm.shared_paths : [],
    criteria,
    handoffs,
    risks,
    counts,
    stream_percent,
    remaining_work_units: counts.partial + counts.planned * 2 + counts.missing * 3 + counts.aspirational * 5 + risks.length,
  };
}

// Cross-stream handoff edges land in the activities pass; here we emit the
// structured handoff list as raw data only.
const handoff_records = [];
for (const s of Object.values(streams)) {
  for (const h of s.handoffs) {
    if (!h.target) continue;
    const targetKey = Object.keys(streams).find(k => k.endsWith('-' + h.target) || k === h.target || k.slice(3) === h.target);
    if (!targetKey) continue;
    const fromKey = h.direction === 'outbound' ? s.key : targetKey;
    const toKey = h.direction === 'outbound' ? targetKey : s.key;
    handoff_records.push({ from: fromKey, to: toKey, kind: h.kind, desc: h.desc.slice(0, 200) });
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  streams,
  handoff_records,
  totals: {
    streams: Object.keys(streams).length,
    criteria: Object.values(streams).reduce((s, x) => s + x.criteria.length, 0),
    handoffs: Object.values(streams).reduce((s, x) => s + x.handoffs.length, 0),
    risks: Object.values(streams).reduce((s, x) => s + x.risks.length, 0),
    paths_declared: Object.values(streams).reduce((s, x) => s + x.paths.length, 0),
    verdict_histogram: Object.values(streams).reduce((acc, s) => {
      for (const c of s.criteria) acc[c.verdict] = (acc[c.verdict] || 0) + 1;
      return acc;
    }, {}),
    handoff_records: handoff_records.length,
  },
};
const outPath = path.join(root, '.lovable/wbs/comprehension.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('[comprehension] streams:', out.totals.streams,
  '  criteria:', out.totals.criteria,
  '  risks:', out.totals.risks,
  '  paths-declared:', out.totals.paths_declared);
console.log('[comprehension] verdict histogram:', out.totals.verdict_histogram);
console.log('[comprehension] handoff records:', out.totals.handoff_records);
