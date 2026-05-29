// Compute per-activity state vector. Not a single enum — lifecycle, blocking,
// health, visibility are independent dimensions so the user vocabulary
// (dormant-but-needed, paused-pending-decision, awaiting-successor, etc.) is
// expressed by combinations rather than collapsed.

import { readJson, writeJson, daysBetween } from './util.mjs';

const acts = readJson('.lovable/wbs/activities.json').activities;
const rel = readJson('.lovable/wbs/relationships.json');

const now = new Date('2026-05-29T19:30:00Z'); // fixed "data date"
const DORMANT_DAYS = 60;
const QUIET_DAYS = 30;

const byId = new Map(acts.map((a) => [a.id, a]));

// Successors of each activity (from rel.edges)
const succOf = new Map();
for (const e of rel.edges) {
  if (!succOf.has(e.pred)) succOf.set(e.pred, []);
  succOf.get(e.pred).push(e.succ);
}

const states = [];
for (const a of acts) {
  const isFuture = !a.time_window;
  let lifecycle, dormancy_days = 0, visibility = 'normal', last_signal_ts = null;
  let blocking = { kind: 'none', note: '' };

  if (isFuture) {
    lifecycle = 'planned';
    // marketing-debt with no implementing activity → dormant-but-needed
    if (a.origin === 'future-marketing-debt') {
      blocking = { kind: 'external', note: 'no implementing leaf yet' };
      visibility = 'loud';
    } else if (a.origin === 'future-verification-gap') {
      blocking = { kind: 'successor-missing', note: 'awaits verification recipe' };
    } else if (a.origin === 'future-risk') {
      const reason = a.evidence?.reason || '';
      if (reason === 'leaf-unattributed') {
        blocking = { kind: 'decision', note: 'leaf on catalog with no commit yet' };
        visibility = 'quiet';
      } else {
        blocking = { kind: 'external', note: 'risk/brass-tacks gap' };
        visibility = 'loud';
      }
    }
    last_signal_ts = null;
  } else {
    last_signal_ts = a.time_window.last;
    dormancy_days = daysBetween(a.time_window.last, now.toISOString()) || 0;
    // Lifecycle by recency + activeness
    if (dormancy_days <= QUIET_DAYS) {
      lifecycle = a.time_window.active_days >= 3 ? 'in-flight' : 'in-flight';
    } else if (dormancy_days <= DORMANT_DAYS) {
      lifecycle = 'paused';
    } else {
      // dormant or shipped — distinguish via commit count + locAdded
      // (a small-commit, recent burst is "shipped"; long-tail is "dormant"/"abandoned")
      const commits = a.effort?.commit_count || 0;
      if (commits >= 20 && a.time_window.calendar_days >= 30) {
        lifecycle = 'dormant';
      } else if (commits <= 3) {
        lifecycle = 'abandoned';
      } else {
        lifecycle = 'shipped';
      }
    }
    // Block detection
    const succs = succOf.get(a.id) || [];
    if (lifecycle === 'paused') {
      // Any open future successor?
      const openSucc = succs.find((sid) => {
        const s = byId.get(sid);
        return s && !s.time_window;
      });
      if (openSucc) blocking = { kind: 'successor-missing', note: `successor ${openSucc} is planned but not started` };
    }
    visibility =
      (a.effort?.loc_added || 0) > 1000 ? 'loud' :
      (a.effort?.commit_count || 0) <= 2 ? 'quiet' : 'normal';
  }

  // Health
  const marketing_debt_count = succOf.get(a.id)?.filter(
    (sid) => byId.get(sid)?.origin === 'future-marketing-debt',
  ).length || 0;
  const verification_gap_count = succOf.get(a.id)?.filter(
    (sid) => byId.get(sid)?.origin === 'future-verification-gap',
  ).length || 0;

  states.push({
    activity_id: a.id,
    lifecycle,
    blocking,
    health: { dormancy_days, marketing_debt_count, verification_gap_count },
    visibility,
    last_signal_ts,
  });
}

writeJson('.lovable/wbs/state.json', {
  generatedAt: new Date().toISOString(),
  dataDate: now.toISOString(),
  thresholds: { quiet_days: QUIET_DAYS, dormant_days: DORMANT_DAYS },
  totals: states.reduce((acc, s) => {
    acc.lifecycle[s.lifecycle] = (acc.lifecycle[s.lifecycle] || 0) + 1;
    acc.blocking[s.blocking.kind] = (acc.blocking[s.blocking.kind] || 0) + 1;
    return acc;
  }, { lifecycle: {}, blocking: {} }),
  states,
});
console.log(
  '[state]',
  states.reduce((a, s) => { a[s.lifecycle] = (a[s.lifecycle] || 0) + 1; return a; }, {}),
);
