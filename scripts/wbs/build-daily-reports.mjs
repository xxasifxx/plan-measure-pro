#!/usr/bin/env node
// Build .lovable/wbs/daily-reports.json — commit-as-daily-report ledger.
//
// Each commit = one author-day of resource consumption, distributed across
// the file leaves it touched, weighted by LOC share (active-day-share is
// computed at rollup time). The ledger is the source of truth for
// `actualUnits` and per-stream resource burn; it is NOT a dependency source.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const HIST = JSON.parse(readFileSync('.lovable/wbs/file-history.json', 'utf8'));

// Re-pivot: commit_sha -> { date, author, file_touches[{path, loc_added, loc_removed}] }
const commits = new Map();
for (const f of HIST.files) {
  for (const ev of f.events) {
    let c = commits.get(ev.sha);
    if (!c) {
      c = { sha: ev.sha, date: ev.date, author: ev.author, touches: [] };
      commits.set(ev.sha, c);
    }
    c.touches.push({
      path: f.path,
      loc_added: ev.loc_added || 0,
      loc_removed: ev.loc_removed || 0,
      status: ev.status,
    });
  }
}

// For each commit, compute allocation share per touch.
// Weight = max(loc_added + loc_removed, 1) so binary/zero-delta touches still count.
const entries = [];
for (const c of commits.values()) {
  const weights = c.touches.map(t => Math.max(t.loc_added + t.loc_removed, 1));
  const total = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.touches.length; i++) {
    const t = c.touches[i];
    entries.push({
      sha: c.sha,
      date: c.date,
      day: c.date.slice(0, 10),
      author: c.author,
      path: t.path,
      status: t.status,
      loc_added: t.loc_added,
      loc_removed: t.loc_removed,
      share: weights[i] / total, // sums to 1 across the commit's touches
    });
  }
}

// Rollups for downstream consumption
const byAuthorDay = {};
const byPath = {};
for (const e of entries) {
  const akey = `${e.author}|${e.day}`;
  byAuthorDay[akey] = (byAuthorDay[akey] || 0) + e.share; // sums to commit-count per author-day
  byPath[e.path] = byPath[e.path] || { share_total: 0, loc_total: 0, days: new Set() };
  byPath[e.path].share_total += e.share;
  byPath[e.path].loc_total += e.loc_added + e.loc_removed;
  byPath[e.path].days.add(e.day);
}

const authorDayCount = Object.keys(byAuthorDay).length;

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    commits: commits.size,
    entries: entries.length,
    authors: new Set(entries.map(e => e.author)).size,
    author_days: authorDayCount,
    files_touched: Object.keys(byPath).length,
  },
  entries,
  // Convenience rollups
  per_path: Object.fromEntries(
    Object.entries(byPath).map(([p, v]) => [p, {
      share_total: v.share_total,
      loc_total: v.loc_total,
      active_days: v.days.size,
    }])
  ),
};

mkdirSync('.lovable/wbs', { recursive: true });
writeFileSync('.lovable/wbs/daily-reports.json', JSON.stringify(out, null, 2) + '\n');
console.log(`[daily-reports] wrote .lovable/wbs/daily-reports.json`);
console.log(`  ${out.totals.commits} commits → ${out.totals.entries} per-file entries`);
console.log(`  ${out.totals.authors} authors over ${out.totals.author_days} author-days`);
console.log(`  ${out.totals.files_touched} distinct files touched`);
