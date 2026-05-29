// Build activities.json and links.json.
//
// Pass A: commit clustering with multi-attribution (one commit can advance
//   several activities; one activity holds many commits).
// Pass B: leaf-driven synthesis — every leaf must have ≥1 activity per criterion.
// Pass C: debt-driven future activities — marketing promises, verification gaps,
//   orphan capabilities with no commit evidence become future activities with
//   gating predecessors.
//
// Output:
//   .lovable/wbs/activities.json
//   .lovable/wbs/links.json   (commit_activity[], activity_leaf[])

import { readJson, writeJson, slug, streamKey, jaccard, tokens, padId } from './util.mjs';

const wbs = readJson('.lovable/wbs/wbs.json');
const history = readJson('docs/build-history.json');
const promises = readJson('docs/wbs-dev.promises.json');
const verification = readJson('docs/wbs-dev.verification.manifest.json');
const intent = readJson('docs/wbs-dev.agent-runs/L4/intent-leaves.json');
const reconciled = readJson('docs/wbs-proposals.reconciled.json');

const leaves = wbs.leaves;

// ---------- File → leaf index ----------
// Build prefix index for matching commit files to leaf fileGlobs. Globs in the
// leaves catalog are literal file paths; treat them as exact + extension-stripped.
const fileToLeafIds = new Map();
for (const l of leaves) {
  for (const g of l.fileGlobs || []) {
    if (!fileToLeafIds.has(g)) fileToLeafIds.set(g, []);
    fileToLeafIds.get(g).push(l.id);
  }
}
const tagToLeafIds = new Map();
for (const l of leaves) {
  const refs = l.sourceRefs || [];
  for (const r of refs) {
    for (const t of r.topTags || []) {
      if (!tagToLeafIds.has(t)) tagToLeafIds.set(t, new Set());
      tagToLeafIds.get(t).add(l.id);
    }
  }
}

const streamFallback = new Map();
for (const l of leaves) {
  if (!streamFallback.has(l.streamKey)) streamFallback.set(l.streamKey, []);
  streamFallback.get(l.streamKey).push(l.id);
}

const leafForFile = (file) => {
  if (fileToLeafIds.has(file)) return fileToLeafIds.get(file);
  // try parent paths
  let p = file;
  while (p.includes('/')) {
    p = p.slice(0, p.lastIndexOf('/'));
    if (fileToLeafIds.has(p)) return fileToLeafIds.get(p);
  }
  return [];
};

// ---------- Tag → stream (from tagInventory if present) ----------
const TAG_STREAM = {
  'route:takeoff': '05-field-capture',
  'route:auth': '01-identity-and-access',
  'route:admin': '01-identity-and-access',
  'route:dashboard': '02-portfolio-and-pm-home',
  'route:project': '03-project-onboarding',
  'route:schedule': '11-schedule-management',
  'route:marketing': '20-sales-and-pitch',
  'route:landing': '20-sales-and-pitch',
  'route:demo': '20-sales-and-pitch',
  'route:standardspecs': '09-standard-specifications',
  'route:specs': '09-standard-specifications',
  'route:documents': '10-document-management',
  'route:exports': '13-data-export-and-interoperability',
  'route:pitch': '20-sales-and-pitch',
  'route:mcfa': '20-sales-and-pitch',
  'route:tracker': '20-sales-and-pitch',
  'page:index': '99-cross-cutting',
  'app-shell': '99-cross-cutting',
  'feature:auth': '01-identity-and-access',
  'feature:projects': '03-project-onboarding',
  'feature:payitems': '04-pay-item-catalog',
  'feature:annotations': '05-field-capture',
  'feature:dailyreports': '06-daily-report-lifecycle',
  'feature:exports': '13-data-export-and-interoperability',
  'feature:specs': '09-standard-specifications',
  'feature:schedule': '11-schedule-management',
  'feature:invitations': '01-identity-and-access',
  'feature:demo': '19-onboarding-and-tutorials',
  'feature:tour': '19-onboarding-and-tutorials',
  'feature:photos': '08-photo-evidence',
  'feature:offline': '15-offline-and-native-durability',
  'feature:native': '15-offline-and-native-durability',
  'feature:realtime': '17-notifications-and-presence',
  'lib:specs-utils': '09-standard-specifications',
  'lib:supabase': '99-cross-cutting',
  'config:tailwind': '98-build-and-infra',
  'config:vite': '98-build-and-infra',
};

const streamFromTag = (tag) => {
  if (TAG_STREAM[tag]) return TAG_STREAM[tag];
  if (tag.startsWith('component:')) return '99-cross-cutting';
  if (tag.startsWith('hook:')) return '99-cross-cutting';
  if (tag.startsWith('lib:')) return '99-cross-cutting';
  if (tag.startsWith('page:')) return '99-cross-cutting';
  return null;
};

// ---------- PASS A: commit clustering with multi-attribution ----------
// Strategy: walk commits in time order. For each commit, build a "fingerprint"
// (primary tag + token bag). Score against live activities in the same primary
// tag bucket. If best > 0.4 → primary attribution. If a SECONDARY activity in a
// different tag bucket shares ≥3 files (or strong token overlap) → secondary.
// If best < 0.4, mint a new activity rooted in primary tag.

const activities = []; // {id, name, primaryTag, tokenBag:Set, fileSet:Set, firstTs, lastTs, commitCount, ...}
const commitActivity = []; // {sha, activity_id, contribution, weight, signal}
const liveByTag = new Map(); // primaryTag -> Activity[]
const GAP_MS = 14 * 86400000;

const mkActivity = (commit, primaryTag) => {
  const name = commit.subject?.slice(0, 100) || `Work ${commit.sha.slice(0, 7)}`;
  const a = {
    id: padId('ACT-', activities.length + 1),
    name,
    origin: 'git',
    primaryTag,
    tokenBag: new Set(tokens(commit.subject || '')),
    fileSet: new Set(commit.files || []),
    firstTs: commit.iso,
    lastTs: commit.iso,
    commitCount: 0,
    locAdded: 0,
    locRemoved: 0,
    subjects: [],
  };
  activities.push(a);
  if (!liveByTag.has(primaryTag)) liveByTag.set(primaryTag, []);
  liveByTag.get(primaryTag).push(a);
  return a;
};

const scoreCommitAgainstActivity = (commit, a) => {
  const tSim = jaccard(new Set(tokens(commit.subject || '')), a.tokenBag);
  const fSim = jaccard(new Set(commit.files || []), a.fileSet);
  return 0.5 * tSim + 0.5 * fSim;
};

const sortedCommits = [...history.commits].sort((x, y) => x.iso.localeCompare(y.iso));

for (const c of sortedCommits) {
  const ts = new Date(c.iso).getTime();
  const tags = (c.pathTags && c.pathTags.length ? c.pathTags : ['_misc']).slice();
  const primaryTag = tags[0];

  // Expire any activities in this bucket idle > GAP
  if (liveByTag.has(primaryTag)) {
    liveByTag.set(
      primaryTag,
      liveByTag.get(primaryTag).filter((a) => ts - new Date(a.lastTs).getTime() < GAP_MS),
    );
  }
  const live = liveByTag.get(primaryTag) || [];

  // Score primary
  let bestPrimary = null;
  let bestScore = 0;
  for (const a of live) {
    const s = scoreCommitAgainstActivity(c, a);
    if (s > bestScore) {
      bestScore = s;
      bestPrimary = a;
    }
  }
  let primaryActivity;
  if (bestPrimary && bestScore >= 0.4) {
    primaryActivity = bestPrimary;
    commitActivity.push({
      sha: c.sha,
      activity_id: primaryActivity.id,
      contribution: 'primary',
      weight: Math.min(1, 0.5 + bestScore / 2),
      signal: 'token+file',
    });
  } else {
    primaryActivity = mkActivity(c, primaryTag);
    commitActivity.push({
      sha: c.sha,
      activity_id: primaryActivity.id,
      contribution: 'primary',
      weight: 1,
      signal: 'new-cluster',
    });
  }

  // Update primary activity
  primaryActivity.lastTs = c.iso;
  primaryActivity.commitCount += 1;
  primaryActivity.locAdded += c.insertions || 0;
  primaryActivity.locRemoved += c.deletions || 0;
  for (const t of tokens(c.subject || '')) primaryActivity.tokenBag.add(t);
  for (const f of c.files || []) primaryActivity.fileSet.add(f);
  if (primaryActivity.subjects.length < 5) primaryActivity.subjects.push(c.subject);

  // Secondary attribution: any OTHER live activity (any bucket) sharing ≥3
  // files with this commit gets a secondary contribution. This is what lets one
  // commit advance several activities.
  if ((c.files || []).length >= 2) {
    const commitFiles = new Set(c.files);
    const seen = new Set([primaryActivity.id]);
    for (const [tag, arr] of liveByTag) {
      for (const a of arr) {
        if (seen.has(a.id)) continue;
        let shared = 0;
        for (const f of commitFiles) if (a.fileSet.has(f)) shared++;
        if (shared >= 3) {
          commitActivity.push({
            sha: c.sha,
            activity_id: a.id,
            contribution: 'secondary',
            weight: Math.min(0.5, shared / commitFiles.size),
            signal: 'co-edit',
          });
          seen.add(a.id);
        }
      }
    }
  }
}

// ---------- Activity → leaf mapping ----------
const activityLeaf = []; // {activity_id, leaf_id, role}
for (const a of activities) {
  // count leaf hits across files
  const hits = new Map();
  for (const f of a.fileSet) {
    for (const lid of leafForFile(f)) hits.set(lid, (hits.get(lid) || 0) + 1);
  }
  // also via tag
  if (tagToLeafIds.has(a.primaryTag)) {
    for (const lid of tagToLeafIds.get(a.primaryTag))
      hits.set(lid, (hits.get(lid) || 0) + 0.5);
  }
  let primaryLeaf = null;
  let topScore = 0;
  for (const [lid, n] of hits) {
    if (n > topScore) {
      topScore = n;
      primaryLeaf = lid;
    }
  }
  if (!primaryLeaf) {
    // Fall back to first leaf in stream-of-tag
    const sk = streamFromTag(a.primaryTag);
    if (sk && streamFallback.has(sk)) primaryLeaf = streamFallback.get(sk)[0];
    else primaryLeaf = streamFallback.get('99-cross-cutting')?.[0] || leaves[0].id;
  }
  a.primary_leaf = primaryLeaf;
  activityLeaf.push({ activity_id: a.id, leaf_id: primaryLeaf, role: 'primary' });
  for (const [lid, n] of hits) {
    if (lid !== primaryLeaf && n >= 2) {
      a.contributing_leaves = a.contributing_leaves || [];
      a.contributing_leaves.push(lid);
      activityLeaf.push({ activity_id: a.id, leaf_id: lid, role: 'contributing' });
    }
  }
}

console.log(`[passA] ${activities.length} git activities, ${commitActivity.length} commit→activity rows`);
console.log(
  `[passA] avg activities per commit: ${(commitActivity.length / sortedCommits.length).toFixed(2)}`,
);
const multiAttr = sortedCommits.filter(
  (c) => commitActivity.filter((r) => r.sha === c.sha).length > 1,
).length;
console.log(`[passA] commits with secondary attribution: ${multiAttr} / ${sortedCommits.length}`);

// ---------- PASS B: leaf-driven synthesis ----------
// For every leaf, ensure ≥1 activity exists per criterion. If commits already
// touch the leaf, attach the existing activity. If a criterion's verdict is not
// "implemented" AND no git activity touches the leaf, mint a future activity.
let synthCount = 0;
const leafToActivities = new Map();
for (const al of activityLeaf) {
  if (!leafToActivities.has(al.leaf_id)) leafToActivities.set(al.leaf_id, []);
  leafToActivities.get(al.leaf_id).push(al.activity_id);
}

for (const l of leaves) {
  const existing = leafToActivities.get(l.id) || [];
  for (const crit of l.criteria || []) {
    const isOpen = !['implemented', 'shipped', 'verified'].includes(
      String(crit.verdict || '').toLowerCase(),
    );
    if (!isOpen) continue;
    if (existing.length > 0) continue; // a commit already touches this leaf
    const a = {
      id: padId('ACT-', activities.length + 1),
      name: `[${l.stream}] ${crit.text || l.name}`.slice(0, 140),
      origin: 'future-verification-gap',
      primary_leaf: l.id,
      planned_after: null,
      planned_size_hint: 'unknown',
      gating_predecessors: [],
      evidence: { criterion_id: crit.id, leaf_id: l.id },
      commitCount: 0,
    };
    activities.push(a);
    activityLeaf.push({ activity_id: a.id, leaf_id: l.id, role: 'primary' });
    synthCount++;
  }
}
console.log(`[passB] synthesized ${synthCount} future activities from open criteria`);

// ---------- PASS C: debt-driven future activities ----------
// Promises (marketing claims), unverified verification rows, orphan capabilities.
let debtCount = 0;

// C1. Promises with no implementing leaf
for (const p of promises) {
  if (p.verifiedE2E) continue;
  // map p.stream (e.g. "05-field-capture") to a leaf, fall back stream-first
  const sk = (p.stream || '').toLowerCase();
  const candidates = streamFallback.get(sk) || streamFallback.get('99-cross-cutting');
  const leafId = (candidates && candidates[0]) || leaves[0].id;
  const a = {
    id: padId('ACT-', activities.length + 1),
    name: `[promise] ${p.claim}`.slice(0, 140),
    origin: 'future-marketing-debt',
    primary_leaf: leafId,
    planned_after: null,
    planned_size_hint: 'small',
    gating_predecessors: [],
    evidence: {
      promise_id: p.id,
      source: p.source,
      sourceFile: p.sourceFile,
      claim: p.claim,
    },
    commitCount: 0,
  };
  activities.push(a);
  activityLeaf.push({ activity_id: a.id, leaf_id: leafId, role: 'primary' });
  debtCount++;
}

// C2. Verification gaps (unverified manual recipes)
for (const [actId, v] of Object.entries(verification.activities || {})) {
  if (v.verifiedE2E) continue;
  if (v.kind === 'infeasible') continue;
  // pull stream from actId prefix "01:docs:..."
  const m = actId.match(/^(\d+):/);
  if (!m) continue;
  const streamPrefix = m[1].padStart(2, '0');
  const candidates = leaves.filter((l) => l.streamKey.startsWith(streamPrefix + '-'));
  if (!candidates.length) continue;
  const leafId = candidates[0].id;
  const a = {
    id: padId('ACT-', activities.length + 1),
    name: `[verify] ${actId}`,
    origin: 'future-verification-gap',
    primary_leaf: leafId,
    planned_after: null,
    planned_size_hint: 'small',
    gating_predecessors: [],
    evidence: { verification_activity_id: actId, kind: v.kind, recipe: v.recipe },
    commitCount: 0,
  };
  activities.push(a);
  activityLeaf.push({ activity_id: a.id, leaf_id: leafId, role: 'primary' });
  debtCount++;
}

// C3. Orphan capabilities → planned activity if no git activity touches the leaf
for (const oc of reconciled.orphanCapabilities) {
  const matching = leaves.filter(
    (l) =>
      l.origins.includes('orphan-capability') &&
      (l.sourceRefs || []).some((r) => r.id === oc.capId),
  );
  if (!matching.length) continue;
  const leafId = matching[0].id;
  const a = {
    id: padId('ACT-', activities.length + 1),
    name: `[brass-tacks] ${oc.name}`.slice(0, 140),
    origin: 'future-risk',
    primary_leaf: leafId,
    planned_after: null,
    planned_size_hint: 'medium',
    gating_predecessors: [],
    evidence: { cap_id: oc.capId, status: oc.status, notes: oc.notes },
    commitCount: 0,
  };
  activities.push(a);
  activityLeaf.push({ activity_id: a.id, leaf_id: leafId, role: 'primary' });
  debtCount++;
}

console.log(`[passC] minted ${debtCount} debt-driven future activities`);

// ---------- Finalize activities ----------
// Compute time_window and effort for git activities, drop internal Sets, attach
// commit_shas, sort.
const activityCommits = new Map(); // id -> sha[]
for (const r of commitActivity) {
  if (!activityCommits.has(r.activity_id)) activityCommits.set(r.activity_id, []);
  activityCommits.get(r.activity_id).push(r.sha);
}
for (const a of activities) {
  if (a.origin === 'git') {
    const fileSetArr = [...a.fileSet];
    a.effort = {
      commit_count: a.commitCount,
      loc_added: a.locAdded,
      loc_removed: a.locRemoved,
      files_touched: fileSetArr.length,
    };
    const days = new Set(
      (activityCommits.get(a.id) || []).map((sha) => {
        const c = sortedCommits.find((x) => x.sha === sha);
        return c?.date;
      }),
    );
    const cal =
      Math.round(
        (new Date(a.lastTs).getTime() - new Date(a.firstTs).getTime()) / 86400000,
      ) + 1;
    a.time_window = {
      first: a.firstTs,
      last: a.lastTs,
      active_days: days.size,
      calendar_days: cal,
    };
    a.evidence = {
      commit_shas: (activityCommits.get(a.id) || []).slice(0, 50),
      total_commits: a.commitCount,
      sample_subjects: a.subjects,
    };
  }
  // strip Sets / internal fields
  delete a.tokenBag;
  delete a.fileSet;
  delete a.firstTs;
  delete a.lastTs;
  delete a.commitCount;
  delete a.locAdded;
  delete a.locRemoved;
  delete a.subjects;
  delete a.primaryTag;
}

const out = {
  generatedAt: new Date().toISOString(),
  totals: {
    activities: activities.length,
    byOrigin: activities.reduce((acc, a) => {
      acc[a.origin] = (acc[a.origin] || 0) + 1;
      return acc;
    }, {}),
    perLeaf: {
      mean: +(activityLeaf.length / leaves.length).toFixed(2),
      max: [...leafToActivities.values()].reduce((m, v) => Math.max(m, v.length), 0),
    },
  },
  activities,
};
writeJson('.lovable/wbs/activities.json', out);
writeJson('.lovable/wbs/links.json', {
  generatedAt: new Date().toISOString(),
  commit_activity: commitActivity,
  activity_leaf: activityLeaf,
  totals: {
    commit_activity: commitActivity.length,
    activity_leaf: activityLeaf.length,
    commits_with_multi_attribution: multiAttr,
    leaves_with_zero_activities: leaves.filter(
      (l) => !(leafToActivities.get(l.id) || []).length,
    ).length,
  },
});

console.log(`[done] ${activities.length} activities, by origin:`, out.totals.byOrigin);
console.log(`[done] leaves with 0 activities: ${
  leaves.filter((l) => !(leafToActivities.get(l.id) || []).length).length
}/${leaves.length}`);
