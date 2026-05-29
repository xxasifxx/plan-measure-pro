#!/usr/bin/env node
// Phase 2 comprehension: reads docs/streams/*.md as authoritative truth and
// reconciles it against .lovable/wbs/{wbs,activities}.json. Produces
// .lovable/wbs/comprehension.json with per-criterion verdicts, per-stream
// handoffs, per-stream risks/debt, and a per-activity status override map.
//
// Input docs are highly regular:
//   ## Acceptance criteria        — canonical list of N criteria (bullets, numbered or not)
//   ## Current state vs criteria  — same N items, each with a status keyword and evidence
//   ## Cross-stream handoffs      — bullets like **Feeds → X** or **Consumes ← Y**
//   ## Risks / debt               — numbered list of remaining concerns
//
// We pair criteria↔current-state by ordinal position (most reliable), with a
// fallback fuzzy match on shared significant tokens for streams where lengths
// differ.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STREAMS_DIR = path.join(root, 'docs/streams');
const WBS = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/wbs.json'), 'utf8'));
const ACTS = JSON.parse(fs.readFileSync(path.join(root, '.lovable/wbs/activities.json'), 'utf8'));

// ---------- markdown sectioner ----------
function splitSections(md) {
  const out = {};
  const lines = md.split('\n');
  let cur = null;
  for (const ln of lines) {
    const h = ln.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1].trim(); out[cur] = []; continue; }
    if (cur) out[cur].push(ln);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n').trim()]));
}

// ---------- bullet extractor ----------
// Captures all top-level `- ` or `1. ` items, joining continuation lines.
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

// ---------- verdict classifier ----------
// First word(s) after the bold prefix or after the bullet, before the em-dash.
// Maps loose vocabulary to: implemented | partial | planned | missing | aspirational.
function classify(stateLine) {
  const head = stateLine.replace(/^\*\*[^*]+\*\*:\s*/, '').split(/\s+—\s+|\s+--\s+|:\s|\.\s/)[0].toLowerCase();
  if (/\bimplemented\b/.test(head) && !/not\b/.test(head)) {
    if (/destructive|but\b/.test(head)) return 'partial';
    return 'implemented';
  }
  if (/\bshipped\b|\bdone\b|\bcomplete\b/.test(head)) return 'implemented';
  if (/\bpartial\b|\bpartly\b|\bin[- ]flight\b|\bin progress\b/.test(head)) return 'partial';
  if (/\bnot implemented\b|\bmissing\b|\bnone\b|\bnot started\b|\babsent\b/.test(head)) return 'missing';
  if (/\bplanned\b|\bscheduled\b|\bqueued\b/.test(head)) return 'planned';
  if (/\baspirational\b|\bfuture\b|\bvision\b/.test(head)) return 'aspirational';
  return 'unknown';
}

const VERDICT_PCT = { implemented: 100, shipped: 100, partial: 50, planned: 0, missing: 0, aspirational: 0, unknown: 25 };

// ---------- handoff parser ----------
// Examples:
//   **Feeds → schedule-management**: ...
//   **Consumes ← measurement-and-geometry-engine**: ...
//   **Seam**: ...
const HANDOFF_RE = /\*\*(Feeds|Consumes|Seam|Provides|Receives)(?:\s*(→|←|->|<-)\s*([a-z0-9-]+))?\*\*\s*:?\s*(.*)/i;
function parseHandoff(line) {
  const m = line.match(HANDOFF_RE);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  const arrow = (m[2] || '').replace('->', '→').replace('<-', '←');
  const target = m[3] || null;
  const desc = (m[4] || '').replace(/^[-—:\s]+/, '').trim();
  let direction = 'related';
  if (kind === 'feeds' || arrow === '→' || /^provides/.test(kind)) direction = 'outbound';
  if (kind === 'consumes' || arrow === '←' || /^receives/.test(kind)) direction = 'inbound';
  return { kind, direction, target, desc };
}

// ---------- per-stream comprehension ----------
const streamFiles = fs.readdirSync(STREAMS_DIR).filter(f => /^\d{2}-.+\.md$/.test(f)).sort();
const streams = {};
for (const f of streamFiles) {
  const key = f.replace(/\.md$/, '');       // "01-identity-and-access"
  const md = fs.readFileSync(path.join(STREAMS_DIR, f), 'utf8');
  const sec = splitSections(md);
  const title = (md.match(/^#\s+(.+)$/m) || [, key])[1].trim();

  const critRaw = bullets(sec['Acceptance criteria']);
  const stateRaw = bullets(sec['Current state vs criteria']);
  const N = Math.max(critRaw.length, stateRaw.length);
  const criteria = [];
  for (let i = 0; i < N; i++) {
    const cText = critRaw[i] || '';
    const sText = stateRaw[i] || '';
    const verdict = classify(sText);
    // Extract evidence after the em-dash if present
    const ev = sText.split(/\s+—\s+/).slice(1).join(' — ').trim();
    criteria.push({
      id: `${key}#c${i + 1}`,
      ordinal: i + 1,
      text: cText.replace(/^\*\*[^*]+\*\*:\s*/, ''),
      verdict,
      evidence: ev || null,
      raw_state: sText || null,
    });
  }

  const handoffs = bullets(sec['Cross-stream handoffs']).map(parseHandoff).filter(Boolean);
  const risks = bullets(sec['Risks / debt']).map((text, i) => ({
    n: i + 1, text,
    // Heuristic severity: capital words / "silent", "fragile", "race"
    severity:
      /\b(crash|race|silent|fragile|destructive|leak|unauthorized|bypass)\b/i.test(text) ? 'high' :
      /\b(missing|broken|never|stale|untyped|no test|untested)\b/.test(text) ? 'medium' : 'low',
  }));
  const surfaces = bullets(sec['Surfaces (files)']);

  // Aggregate stream health
  const counts = { implemented: 0, partial: 0, planned: 0, missing: 0, aspirational: 0, unknown: 0 };
  let pctSum = 0;
  for (const c of criteria) {
    counts[c.verdict] = (counts[c.verdict] || 0) + 1;
    pctSum += VERDICT_PCT[c.verdict] ?? 25;
  }
  const stream_percent = criteria.length ? Math.round(pctSum / criteria.length) : 0;

  streams[key] = {
    key, title, criteria, handoffs, risks, surfaces,
    counts,
    stream_percent,
    remaining_work_units: counts.partial * 1 + counts.planned * 2 + counts.missing * 3 + counts.aspirational * 5 + risks.length,
  };
}

// ---------- leaf → stream key map ----------
const leafById = new Map(WBS.leaves.map(l => [l.id, l]));
function streamKeyOf(leaf) {
  if (!leaf) return null;
  return leaf.streamKey || (leaf.stream || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}

// ---------- activity overrides ----------
// For each activity, look up its leaf → stream. Use the stream's criteria pool
// as the truth set for that activity's region. Activities of `origin=git` get
// status from leaf criteria verdicts; future-origin activities map to the
// "remaining-work" residue (partial/planned/missing criteria + risks).
const overrides = [];
const streamActivityIndex = new Map();   // streamKey → activities
for (const act of ACTS.activities) {
  const leaf = leafById.get(act.primary_leaf);
  const sk = streamKeyOf(leaf);
  if (!sk || !streams[sk]) { overrides.push({ id: act.id, reason: 'no-stream-mapping' }); continue; }
  if (!streamActivityIndex.has(sk)) streamActivityIndex.set(sk, []);
  streamActivityIndex.get(sk).push(act);
}

for (const [sk, acts] of streamActivityIndex) {
  const s = streams[sk];
  const totalCriteria = s.criteria.length || 1;
  const remaining = s.criteria.filter(c => c.verdict !== 'implemented' && c.verdict !== 'shipped');

  // Split: git-origin activities represent shipped/in-flight work;
  // future-origin activities represent remaining work.
  const past = acts.filter(a => a.origin === 'git');
  const future = acts.filter(a => a.origin !== 'git');

  // Past activities: percent_complete is the stream's implemented ratio,
  // scaled by the activity's own commit-count weight within past commits.
  const totalCommits = past.reduce((s, a) => s + (a.effort?.commit_count || 0), 0) || 1;
  for (const a of past) {
    const share = (a.effort?.commit_count || 0) / totalCommits;
    overrides.push({
      id: a.id,
      stream: sk,
      criteria_verdicts: s.counts,
      percent_complete: s.stream_percent,
      lifecycle:
        s.stream_percent >= 95 ? 'shipped' :
        s.stream_percent >= 50 ? 'in-flight' :
        s.stream_percent > 0 ? 'in-flight' : 'planned',
      stream_share: Math.round(share * 1000) / 1000,
      remaining_criteria_count: remaining.length,
      reason: 'past-stream-aggregate',
    });
  }

  // Future activities: distribute remaining criteria + risks across them.
  // Duration heuristic: each remaining criterion = 3d, each risk = 2d.
  const totalRemainingUnits = s.remaining_work_units || 1;
  const perFutureUnits = future.length ? totalRemainingUnits / future.length : 0;
  for (const a of future) {
    const days = Math.max(1, Math.round(perFutureUnits * 2.5));
    overrides.push({
      id: a.id,
      stream: sk,
      criteria_verdicts: s.counts,
      percent_complete: 0,
      lifecycle: 'planned',
      duration_days: days,
      assigned_remaining_units: Math.round(perFutureUnits * 100) / 100,
      remaining_criteria_count: remaining.length,
      reason: `future-share-of-${s.remaining_work_units}-remaining-units`,
    });
  }
}

// ---------- handoff edges between activities ----------
// A handoff "Feeds → X" in stream Y means: a representative past activity in Y
// is a predecessor of a representative activity in X. We pick the largest
// past activity (by commits) per stream as the "anchor."
const anchorByStream = new Map();
for (const [sk, acts] of streamActivityIndex) {
  const past = acts.filter(a => a.origin === 'git')
    .sort((x, y) => (y.effort?.commit_count || 0) - (x.effort?.commit_count || 0));
  if (past[0]) anchorByStream.set(sk, past[0].id);
}
const handoffEdges = [];
for (const s of Object.values(streams)) {
  for (const h of s.handoffs) {
    if (!h.target) continue;
    // Match target by suffix (handoff target is the kebab name w/o numeric prefix)
    const targetKey = Object.keys(streams).find(k => k.endsWith('-' + h.target) || k === h.target || k.slice(3) === h.target);
    if (!targetKey) continue;
    const fromKey = h.direction === 'outbound' ? s.key : targetKey;
    const toKey = h.direction === 'outbound' ? targetKey : s.key;
    const fromAct = anchorByStream.get(fromKey);
    const toAct = anchorByStream.get(toKey);
    if (!fromAct || !toAct || fromAct === toAct) continue;
    handoffEdges.push({
      pred: fromAct, succ: toAct, type: 'FS', lag: 0,
      source: 'stream-doc-handoff',
      confidence: 0.9,
      note: `${s.key} ${h.kind} ${h.direction} ${targetKey}: ${h.desc.slice(0, 100)}`,
    });
  }
}

// ---------- write ----------
const out = {
  generatedAt: new Date().toISOString(),
  streams,
  totals: {
    streams: Object.keys(streams).length,
    criteria: Object.values(streams).reduce((s, x) => s + x.criteria.length, 0),
    handoffs: Object.values(streams).reduce((s, x) => s + x.handoffs.length, 0),
    risks: Object.values(streams).reduce((s, x) => s + x.risks.length, 0),
    verdict_histogram: Object.values(streams).reduce((acc, s) => {
      for (const c of s.criteria) acc[c.verdict] = (acc[c.verdict] || 0) + 1;
      return acc;
    }, {}),
    activity_overrides: overrides.length,
    handoff_edges: handoffEdges.length,
  },
  activity_overrides: overrides,
  handoff_edges: handoffEdges,
};
const outPath = path.join(root, '.lovable/wbs/comprehension.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('streams:', out.totals.streams,
            ' criteria:', out.totals.criteria,
            ' handoffs:', out.totals.handoffs,
            ' risks:', out.totals.risks);
console.log('verdict histogram:', out.totals.verdict_histogram);
console.log('activity overrides:', out.totals.activity_overrides,
            ' handoff edges:', out.totals.handoff_edges);
console.log('wrote', path.relative(root, outPath));
