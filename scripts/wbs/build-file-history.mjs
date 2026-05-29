#!/usr/bin/env node
// Build .lovable/wbs/file-history.json — per-file git lifecycle.
//
// For every tracked file: { path, created_at, last_modified_at, active_days,
// touch_count, contributors[], loc_added, loc_removed, events[] }.
//
// Single git log pass with --name-only is much faster than per-file `git log`.
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '.lovable/wbs/file-history.json';

console.log('[file-history] running git log --name-status --numstat ...');
const raw = execSync(
  'git log --no-merges --pretty=format:"__C__%H|%aI|%an" --name-status --numstat',
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 }
);

// Parse interleaved log. Each commit block:
//   __C__<sha>|<iso-date>|<author>
//   <empty line>
//   A\tpath   |  M\tpath  |  D\tpath  |  R100\told\tnew
//   <empty>
//   <loc_add>\t<loc_del>\tpath   (from --numstat)
const files = new Map(); // path -> record

function get(p) {
  let r = files.get(p);
  if (!r) {
    r = {
      path: p,
      created_at: null,
      last_modified_at: null,
      events: [],
      authors: new Set(),
      active_days: new Set(),
      loc_added: 0,
      loc_removed: 0,
      touch_count: 0,
      deleted_at: null,
    };
    files.set(p, r);
  }
  return r;
}

let cur = null;
const lines = raw.split('\n');
// Track numstat lines separately because git emits both name-status and numstat
// per file; numstat may have - - for binary. We'll keyed-merge into events by path.
const pendingNumstat = []; // {add, del, path}

function flushCommitEvents() {
  if (!cur) return;
  // We collected events list with status; merge in numstat by path.
  const numByPath = new Map();
  for (const n of pendingNumstat) numByPath.set(n.path, n);
  for (const ev of cur.events) {
    const n = numByPath.get(ev.path);
    if (n) { ev.loc_added = n.add; ev.loc_removed = n.del; }
    const rec = get(ev.path);
    rec.touch_count++;
    rec.authors.add(cur.author);
    rec.active_days.add(cur.date.slice(0, 10));
    rec.loc_added += ev.loc_added || 0;
    rec.loc_removed += ev.loc_removed || 0;
    rec.events.push({
      sha: cur.sha, date: cur.date, author: cur.author,
      status: ev.status, loc_added: ev.loc_added || 0, loc_removed: ev.loc_removed || 0,
      ...(ev.from ? { renamed_from: ev.from } : {}),
    });
    // dates: events come newest-first in git log; track min/max
    if (!rec.last_modified_at || cur.date > rec.last_modified_at) rec.last_modified_at = cur.date;
    if (!rec.created_at || cur.date < rec.created_at) rec.created_at = cur.date;
    if (ev.status === 'A') rec.created_at = cur.date; // A wins for true creation
    if (ev.status === 'D') rec.deleted_at = cur.date;
  }
  pendingNumstat.length = 0;
}

for (const line of lines) {
  if (line.startsWith('__C__')) {
    flushCommitEvents();
    const [sha, date, author] = line.slice(5).split('|');
    cur = { sha, date, author, events: [] };
    continue;
  }
  if (!cur || !line.trim()) continue;
  const parts = line.split('\t');
  // numstat: "12\t3\tpath" or "-\t-\tpath" (binary)
  if (parts.length === 3 && /^[-\d]+$/.test(parts[0]) && /^[-\d]+$/.test(parts[1])) {
    pendingNumstat.push({
      add: parts[0] === '-' ? 0 : parseInt(parts[0], 10),
      del: parts[1] === '-' ? 0 : parseInt(parts[1], 10),
      path: parts[2],
    });
    continue;
  }
  // name-status: "A\tpath" | "M\tpath" | "D\tpath" | "R100\told\tnew" | "C100\told\tnew"
  const status = parts[0]?.[0];
  if (!status || !'AMDRCT'.includes(status)) continue;
  if (status === 'R' || status === 'C') {
    cur.events.push({ status, from: parts[1], path: parts[2] });
  } else {
    cur.events.push({ status, path: parts[1] });
  }
}
flushCommitEvents();

const now = new Date().toISOString();
const out = {
  generatedAt: now,
  totals: {
    files: 0,
    active_files: 0,
    deleted_files: 0,
    total_events: 0,
  },
  files: [],
};

for (const r of files.values()) {
  if (r.events.length === 0) continue;
  const calendarDays = r.created_at && r.last_modified_at
    ? Math.max(1, Math.round((new Date(r.last_modified_at) - new Date(r.created_at)) / 86400000))
    : 1;
  out.files.push({
    path: r.path,
    created_at: r.created_at,
    last_modified_at: r.last_modified_at,
    deleted_at: r.deleted_at,
    active_days: r.active_days.size,
    calendar_days: calendarDays,
    touch_count: r.touch_count,
    loc_added: r.loc_added,
    loc_removed: r.loc_removed,
    contributors: [...r.authors].sort(),
    events: r.events.reverse(), // chronological
  });
  out.totals.files++;
  if (r.deleted_at) out.totals.deleted_files++; else out.totals.active_files++;
  out.totals.total_events += r.events.length;
}

out.files.sort((a, b) => a.path.localeCompare(b.path));

mkdirSync('.lovable/wbs', { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`[file-history] wrote ${OUT}`);
console.log(`  ${out.totals.files} files (${out.totals.active_files} active, ${out.totals.deleted_files} deleted)`);
console.log(`  ${out.totals.total_events} total events`);
