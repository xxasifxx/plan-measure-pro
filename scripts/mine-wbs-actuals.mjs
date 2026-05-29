#!/usr/bin/env node
/**
 * mine-wbs-actuals.mjs
 *
 * Project-as-Schedule miner.
 *
 * Joins git history (docs/build-history.json) to intent artifacts (L4 leaves,
 * L3 pivots, L4 lie-tax, value-stream docs) and emits a WBS of *actuals* — what
 * was worked on when, by whom, with what intensity, in what concurrent waves,
 * what's gated on what, and what looks dormant-but-needed vs. dead.
 *
 * Output: .lovable/wbs/{wbs,activities,next,README}.{json,md}
 *
 * No app changes. No fixes. No charter. Pure description.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".lovable", "wbs");

// -----------------------------------------------------------------------------
// 0. Inputs
// -----------------------------------------------------------------------------

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const readText = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const buildHist = readJson("docs/build-history.json");
const leavesFile = readJson("docs/wbs-dev.leaves.json");
const pivotsFile = readJson("docs/wbs-dev.agent-runs/L3/pivots.json");
const lieTaxMd = readText("docs/wbs-dev.agent-runs/L4/lie-tax.md");
const intentLeavesFile = readJson(
  "docs/wbs-dev.agent-runs/L4/intent-leaves.json"
);
const snapshotDir = "docs/wbs-dev.agent-runs/L4/snapshots";
const snapshotFiles = fs
  .readdirSync(path.join(ROOT, snapshotDir))
  .filter((f) => f.endsWith(".md") && /^\d{4}-\d{2}-\d{2}/.test(f))
  .sort();

console.log(
  `[mine] commits=${buildHist.commits.length} leaves=${leavesFile.leaves.length} pivots=${pivotsFile.pivots.length} snapshots=${snapshotFiles.length}`
);

// -----------------------------------------------------------------------------
// 1. Eras (from pivots)
// -----------------------------------------------------------------------------

// Pivots come newest-first; bookend with project start and "now".
const pivotsAsc = [...pivotsFile.pivots].sort((a, b) =>
  a.date.localeCompare(b.date)
);
const projectStart = buildHist.project.start; // "2026-03-08"
const projectEnd = buildHist.project.end;
const eraBoundaries = [projectStart, ...pivotsAsc.map((p) => p.date)];
// De-dupe in case a pivot lands on project start.
const eraStarts = [...new Set(eraBoundaries)].sort();

const eras = eraStarts.map((start, i) => {
  const end = eraStarts[i + 1] ?? "9999-12-31";
  const pivotAtStart = pivotsAsc.find((p) => p.date === start);
  return {
    id: `era-${String(i + 1).padStart(2, "0")}`,
    seq: i + 1,
    start,
    endExclusive: end,
    boundaryPivot: pivotAtStart
      ? {
          sha: pivotAtStart.sha,
          kind: pivotAtStart.kind,
          title: pivotAtStart.title,
        }
      : null,
    name: pivotAtStart
      ? `Era ${i + 1}: post-pivot — ${pivotAtStart.title.slice(0, 60)}`
      : `Era ${i + 1}: bootstrap`,
  };
});

const eraOfDate = (date) => {
  for (let i = eras.length - 1; i >= 0; i--) {
    if (date >= eras[i].start) return eras[i].id;
  }
  return eras[0].id;
};

// -----------------------------------------------------------------------------
// 2. Leaf index — map file path -> leaves[] -> stream
// -----------------------------------------------------------------------------

const leafByFile = new Map(); // file -> leaf[]
const allStreams = new Set();

for (const leaf of leavesFile.leaves) {
  allStreams.add(leaf.stream);
  for (const g of leaf.fileGlobs ?? []) {
    if (!g) continue;
    // fileGlobs are usually concrete paths in this dataset; treat as paths.
    const key = g.replace(/^\.\//, "");
    if (!leafByFile.has(key)) leafByFile.set(key, []);
    leafByFile.get(key).push(leaf);
  }
}

// Path -> dominant stream (most-referenced).
const streamOfPath = (p) => {
  const ls = leafByFile.get(p);
  if (!ls?.length) return null;
  const counts = {};
  for (const l of ls) counts[l.stream] = (counts[l.stream] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

// -----------------------------------------------------------------------------
// 3. Lie-tax — parse rows out of the markdown
// -----------------------------------------------------------------------------

function parseLieTax(md) {
  const rows = [];
  const sections = md.split(/\n## /);
  for (const sec of sections) {
    const sevMatch = sec.match(/^.*?(FRAUD-RISK|MISLEADING|COSMETIC)/i);
    if (!sevMatch) continue;
    const severity = sevMatch[1].toLowerCase();
    const lines = sec.split("\n").filter((l) => l.startsWith("| "));
    for (const line of lines) {
      const cols = line
        .split("|")
        .slice(1, -1)
        .map((s) => s.trim());
      if (cols.length < 4) continue;
      if (/^#$|^---/.test(cols[0])) continue;
      const [num, claim, source, reality] = cols;
      rows.push({
        id: `LT-${severity[0].toUpperCase()}-${num}`,
        severity,
        claim: claim.replace(/\*\*/g, ""),
        source: source.replace(/`/g, ""),
        reality,
      });
    }
  }
  return rows;
}
const lieTax = parseLieTax(lieTaxMd);

// -----------------------------------------------------------------------------
// 4. Bucket commits into activities
//
// Bucket = (primary_path_tag, era). Within a bucket, split on inactivity gaps
// > 14 days. Yields traceable, named activities mappable back to git.
// -----------------------------------------------------------------------------

const GAP_DAYS = 14;
const MS_PER_DAY = 86400000;

// Pick a "primary tag" per commit: most-frequent pathTag, tie-break by
// alphabetical for stability. Bootstrap commits with no tags go to "_misc".
function primaryTag(commit) {
  const tagCounts = {};
  for (const f of commit.files ?? []) {
    for (const t of f.tags ?? []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  const entries = Object.entries(tagCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  return entries[0]?.[0] ?? (commit.pathTags?.[0] ?? "_misc");
}

const commitsAsc = [...buildHist.commits].sort((a, b) =>
  a.iso.localeCompare(b.iso)
);

const buckets = new Map(); // key = tag::era -> commits[]
for (const c of commitsAsc) {
  const tag = primaryTag(c);
  const era = eraOfDate(c.date);
  const key = `${tag}::${era}`;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push({ ...c, _primaryTag: tag, _era: era });
}

// Split each bucket on >GAP_DAYS gaps -> activity instances.
const activities = [];
let activityCounter = 0;

for (const [key, commits] of buckets) {
  const [tag, era] = key.split("::");
  let cur = [];
  const flush = () => {
    if (cur.length === 0) return;
    activityCounter++;
    activities.push(buildActivity(activityCounter, tag, era, cur));
    cur = [];
  };
  for (const c of commits) {
    if (cur.length === 0) {
      cur.push(c);
      continue;
    }
    const last = new Date(cur[cur.length - 1].iso).getTime();
    const now = new Date(c.iso).getTime();
    if ((now - last) / MS_PER_DAY > GAP_DAYS) flush();
    cur.push(c);
  }
  flush();
}

function buildActivity(seq, tag, era, commits) {
  const id = `A${String(seq).padStart(4, "0")}`;
  const firstTs = commits[0].iso;
  const lastTs = commits[commits.length - 1].iso;
  const firstDate = commits[0].date;
  const lastDate = commits[commits.length - 1].date;
  const calendarDays =
    Math.max(
      0,
      (new Date(lastDate).getTime() - new Date(firstDate).getTime()) /
        MS_PER_DAY
    ) + 1;
  const dayHits = new Set(commits.map((c) => c.date));
  const activeDays = dayHits.size;

  // Files & resource loading
  const filesTouched = new Set();
  let locAdded = 0;
  let locRemoved = 0;
  const perDay = {};
  for (const c of commits) {
    perDay[c.date] = perDay[c.date] || { commits: 0, files: 0, loc: 0 };
    perDay[c.date].commits++;
    for (const f of c.files ?? []) {
      filesTouched.add(f.path);
      locAdded += f.insertions || 0;
      locRemoved += f.deletions || 0;
      perDay[c.date].files++;
      perDay[c.date].loc += (f.insertions || 0) + (f.deletions || 0);
    }
  }

  // Peak day = max LOC churn
  let peakDay = null,
    peakIntensity = 0;
  for (const [d, m] of Object.entries(perDay)) {
    if (m.loc > peakIntensity) {
      peakIntensity = m.loc;
      peakDay = d;
    }
  }

  // Gap windows within the activity (idle stretches >=3 days)
  const dayList = [...dayHits].sort();
  const gapWindows = [];
  for (let i = 1; i < dayList.length; i++) {
    const gap =
      (new Date(dayList[i]).getTime() - new Date(dayList[i - 1]).getTime()) /
      MS_PER_DAY;
    if (gap >= 3) {
      gapWindows.push({
        from: dayList[i - 1],
        to: dayList[i],
        days: Math.round(gap),
      });
    }
  }
  const longestGapDays = gapWindows.reduce((m, g) => Math.max(m, g.days), 0);

  // Stream attribution: dominant stream among touched files' leaves.
  const streamVotes = {};
  for (const f of filesTouched) {
    const s = streamOfPath(f);
    if (s) streamVotes[s] = (streamVotes[s] || 0) + 1;
  }
  const dominantStream =
    Object.entries(streamVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Associated leaves (any leaf whose fileGlobs intersect our files)
  const associatedLeaves = new Set();
  for (const f of filesTouched) {
    for (const l of leafByFile.get(f) ?? []) associatedLeaves.add(l.id);
  }

  // Activity name = best commit subject + tag.
  // Pick the subject from the largest single commit (most insertions).
  const heroCommit = [...commits].sort(
    (a, b) =>
      (b.files ?? []).reduce((s, f) => s + (f.insertions || 0), 0) -
      (a.files ?? []).reduce((s, f) => s + (f.insertions || 0), 0)
  )[0];
  const name = `[${tag}] ${heroCommit.subject}`.slice(0, 140);

  return {
    id,
    name,
    tag,
    era,
    stream: dominantStream,
    firstCommitTs: firstTs,
    lastCommitTs: lastTs,
    firstDate,
    lastDate,
    calendarDurationDays: Math.round(calendarDays),
    activeDays,
    commitCount: commits.length,
    commits: commits.map((c) => ({
      sha: c.sha.slice(0, 8),
      iso: c.iso,
      subject: c.subject,
      kind: c.kind,
      files: (c.files ?? []).length,
    })),
    filesTouched: [...filesTouched].sort(),
    locAdded,
    locRemoved,
    resourceLoad: {
      commitsPerActiveDay: +(commits.length / activeDays).toFixed(2),
      filesPerActiveDay: +(filesTouched.size / activeDays).toFixed(2),
      locPerActiveDay: +((locAdded + locRemoved) / activeDays).toFixed(0),
      peakDay,
      peakIntensity,
    },
    dormancy: {
      longestGapDays,
      gapWindows,
      currentDormancyDays: Math.round(
        (new Date(projectEnd).getTime() - new Date(lastDate).getTime()) /
          MS_PER_DAY
      ),
    },
    associatedLeaves: [...associatedLeaves].sort(),
  };
}

console.log(`[mine] activities=${activities.length}`);

// -----------------------------------------------------------------------------
// 5. Concurrency: activities whose [first,last] overlap on >=1 shared day.
// -----------------------------------------------------------------------------

function rangesOverlap(a, b) {
  return !(a.lastDate < b.firstDate || b.lastDate < a.firstDate);
}

for (const a of activities) {
  const concurrent = [];
  for (const b of activities) {
    if (a.id === b.id) continue;
    if (rangesOverlap(a, b)) concurrent.push(b.id);
  }
  a.concurrentWith = concurrent;
}

// Concurrent waves: scan project day-by-day, count active activities per day.
const dailyActive = {};
for (const a of activities) {
  let d = new Date(a.firstDate);
  const end = new Date(a.lastDate);
  while (d <= end) {
    const key = d.toISOString().slice(0, 10);
    dailyActive[key] = (dailyActive[key] || 0) + 1;
    d = new Date(d.getTime() + MS_PER_DAY);
  }
}
const concurrencyWaves = Object.entries(dailyActive)
  .map(([d, n]) => ({ date: d, activeActivities: n }))
  .sort((a, b) => b.activeActivities - a.activeActivities);

// -----------------------------------------------------------------------------
// 6. Predecessors
//   - file_overlap: share >=3 files AND A ends before B starts
//   - message_ref: B's subjectTokens contain A's tag (minus colon prefix)
//   - temporal: same stream + A ends <=10d before B starts (low confidence)
// -----------------------------------------------------------------------------

function tokensOfTag(tag) {
  return tag
    .toLowerCase()
    .split(/[:\-_/]/)
    .filter((t) => t.length >= 4);
}

for (const b of activities) {
  const bFiles = new Set(b.filesTouched);
  const bStart = new Date(b.firstDate).getTime();
  const preds = [];
  const bSubjectTokens = new Set();
  for (const c of b.commits) {
    c.subject
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .forEach((t) => t.length >= 4 && bSubjectTokens.add(t));
  }
  for (const a of activities) {
    if (a.id === b.id) continue;
    const aEnd = new Date(a.lastDate).getTime();
    if (aEnd >= bStart) continue; // candidate must finish first

    const shared = a.filesTouched.filter((f) => bFiles.has(f));
    const aTokens = tokensOfTag(a.tag);
    const refHit = aTokens.some((t) => bSubjectTokens.has(t));

    if (shared.length >= 3) {
      preds.push({
        id: a.id,
        type: "FS",
        basis: "file_overlap",
        sharedFiles: shared.length,
        confidence: shared.length >= 6 ? "high" : "med",
      });
    } else if (refHit && a.stream && a.stream === b.stream) {
      preds.push({
        id: a.id,
        type: "FS",
        basis: "message_ref",
        confidence: "med",
      });
    } else if (
      a.stream &&
      a.stream === b.stream &&
      (bStart - aEnd) / MS_PER_DAY <= 10
    ) {
      preds.push({
        id: a.id,
        type: "FS",
        basis: "temporal",
        confidence: "low",
      });
    }
  }
  // Cap to keep file readable: top 8 by confidence then by shared file count.
  const order = { high: 3, med: 2, low: 1 };
  preds.sort(
    (x, y) =>
      (order[y.confidence] || 0) - (order[x.confidence] || 0) ||
      (y.sharedFiles || 0) - (x.sharedFiles || 0)
  );
  b.predecessors = preds.slice(0, 8);
}

// -----------------------------------------------------------------------------
// 7. Status classification
// -----------------------------------------------------------------------------

// Pivot abandonment lookup. To avoid false-positive over-flagging, we only
// claim a tag is "abandoned" when its distinctive segment (the part after the
// colon — e.g. "PdfCanvas" in "component:PdfCanvas") appears as a literal
// path component inside a capability-removal pivot's blast radius. Generic
// tokens like "components", "schedule", "lib" are ignored.
const PIVOT_STOPWORDS = new Set([
  "src", "components", "component", "lib", "schedule", "test", "tests",
  "page", "pages", "hook", "hooks", "tsx", "ts", "json", "md", "deleted",
  "new", "analysis", "build", "from", "project", "import", "export",
]);

const pivotRemovalTokens = []; // [{ token, pivot, date }]
for (const piv of pivotsFile.pivots) {
  if (piv.kind !== "capability-removal") continue;
  const seen = new Set();
  for (const br of piv.blastRadius ?? []) {
    // Strip leading paths, take the leaf, drop extension.
    const parts = br.split(/[/.\s()]+/).filter(Boolean);
    for (const p of parts) {
      const lower = p.toLowerCase();
      if (PIVOT_STOPWORDS.has(lower)) continue;
      if (lower.length < 4) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      pivotRemovalTokens.push({ token: lower, pivot: piv.title, date: piv.date });
    }
  }
}

const lieTaxFileHits = new Map(); // file path substring -> lieTax rows
for (const lt of lieTax) {
  const m = lt.source.match(/([A-Za-z0-9_\-./]+\.(tsx?|md|json))/);
  if (m) {
    const f = m[1];
    if (!lieTaxFileHits.has(f)) lieTaxFileHits.set(f, []);
    lieTaxFileHits.get(f).push(lt.id);
  }
}

const PROJECT_END_MS = new Date(projectEnd).getTime();
const DORMANT_DAYS = 60;
const PAUSED_MIN_DAYS = 14;
const RECENT_DAYS = 14;

function classify(a) {
  const dormancy = a.dormancy.currentDormancyDays;

  // Pivot abandonment: require the tag's distinctive segment to literally
  // match a path component from a capability-removal pivot's blast radius.
  const tagDistinct = a.tag.split(":").pop().toLowerCase();
  if (tagDistinct.length >= 4 && !PIVOT_STOPWORDS.has(tagDistinct)) {
    const hit = pivotRemovalTokens.find(
      (t) => t.token === tagDistinct && a.lastDate <= t.date
    );
    if (hit) {
      return {
        status: "abandoned",
        evidence: `tag '${a.tag}' literally appears in blast-radius of capability-removal pivot '${hit.pivot}' (${hit.date}); no commits after pivot`,
      };
    }
  }

  // Lie-tax exposure
  const lieTaxIds = new Set();
  for (const f of a.filesTouched) {
    for (const [key, ids] of lieTaxFileHits) {
      if (f.endsWith(key) || f.includes(key)) {
        ids.forEach((i) => lieTaxIds.add(i));
      }
    }
  }
  const hasLieTax = lieTaxIds.size > 0;

  // Leaf verdict signals
  const leafVerdicts = {};
  for (const lid of a.associatedLeaves) {
    const leaf = leavesFile.leaves.find((l) => l.id === lid);
    if (!leaf) continue;
    leafVerdicts[leaf.verdict ?? "untagged"] =
      (leafVerdicts[leaf.verdict ?? "untagged"] || 0) + 1;
  }
  const anyPartial = (leafVerdicts.partial || 0) > 0;
  const anyMissing = (leafVerdicts.missing || 0) > 0;
  const anyImplemented = (leafVerdicts.implemented || 0) > 0;

  // Recency-based status
  if (dormancy <= RECENT_DAYS) {
    return {
      status: "in_progress",
      evidence: `last commit ${dormancy}d ago; intensity ${a.resourceLoad.commitsPerActiveDay} commits/day`,
      lieTaxIds: [...lieTaxIds],
    };
  }
  if (dormancy <= PAUSED_MIN_DAYS + 2) {
    return {
      status: "quiet",
      evidence: `last commit ${dormancy}d ago, just past active window`,
      lieTaxIds: [...lieTaxIds],
    };
  }
  if (dormancy < DORMANT_DAYS) {
    const lastSubject = a.commits[a.commits.length - 1].subject.toLowerCase();
    const wip = /\b(wip|todo|part\s*\d|draft|stub|scaffold)\b/.test(
      lastSubject
    );
    return {
      status: wip ? "paused" : "quiet",
      evidence: `last commit ${dormancy}d ago${
        wip ? `; last subject signals WIP: "${a.commits.at(-1).subject}"` : ""
      }`,
      lieTaxIds: [...lieTaxIds],
    };
  }

  // Dormant (>=60d) — distinguish dormant-but-needed vs orphaned vs shipped
  if (anyPartial || anyMissing || hasLieTax) {
    return {
      status: "dormant",
      evidence: `${dormancy}d idle; leaves: ${JSON.stringify(
        leafVerdicts
      )}; lie-tax exposure: ${lieTaxIds.size}`,
      lieTaxIds: [...lieTaxIds],
    };
  }
  if (anyImplemented && a.associatedLeaves.length > 0) {
    return {
      status: "shipped",
      evidence: `${dormancy}d idle; all associated leaves implemented (${a.associatedLeaves.length} leaves)`,
      lieTaxIds: [],
    };
  }
  if (a.associatedLeaves.length === 0) {
    return {
      status: "orphaned",
      evidence: `${dormancy}d idle; no associated leaves — code with no stream attribution`,
      lieTaxIds: [...lieTaxIds],
    };
  }
  return {
    status: "dormant",
    evidence: `${dormancy}d idle; ${a.associatedLeaves.length} associated leaves, untagged verdicts`,
    lieTaxIds: [...lieTaxIds],
  };
}

for (const a of activities) {
  const c = classify(a);
  a.status = c.status;
  a.statusEvidence = c.evidence;
  a.lieTaxIds = c.lieTaxIds ?? [];
}

// blocked: any activity whose predecessor is not 'shipped'/'in_progress'
const statusOf = Object.fromEntries(activities.map((a) => [a.id, a.status]));
for (const a of activities) {
  if (a.status === "in_progress" || a.status === "shipped") continue;
  const blockingPred = a.predecessors.find((p) => {
    const s = statusOf[p.id];
    return s === "dormant" || s === "abandoned" || s === "paused";
  });
  if (blockingPred && a.status === "quiet") {
    a.status = "blocked";
    a.statusEvidence += ` | blocked by ${blockingPred.id} (${
      statusOf[blockingPred.id]
    })`;
  }
}

// -----------------------------------------------------------------------------
// 8. Implied successors
// -----------------------------------------------------------------------------

const partialLeavesByFile = new Map();
for (const l of leavesFile.leaves) {
  if (l.verdict === "partial" || l.verdict === "missing") {
    for (const g of l.fileGlobs ?? []) {
      if (!partialLeavesByFile.has(g)) partialLeavesByFile.set(g, []);
      partialLeavesByFile.get(g).push(l);
    }
  }
}

// Stream docs with zero implemented leaves -> needs-successor on whichever
// activity owns the stream.
const leavesByStream = {};
for (const l of leavesFile.leaves) {
  leavesByStream[l.stream] = leavesByStream[l.stream] || [];
  leavesByStream[l.stream].push(l);
}
const streamsWithNoImpl = Object.entries(leavesByStream)
  .filter(([, ls]) => !ls.some((l) => l.verdict === "implemented"))
  .map(([s]) => s);

for (const a of activities) {
  const succ = [];

  // Partial/missing leaves attached to this activity's files
  for (const f of a.filesTouched) {
    for (const l of partialLeavesByFile.get(f) ?? []) {
      succ.push({
        description: `Finish "${l.name}" (currently ${l.verdict})`,
        whyNeeded: l.note || `leaf ${l.id} marked ${l.verdict}`,
        source: `leaf:${l.id}`,
      });
    }
  }

  // Lie-tax: marketing claim with no implementing leaf -> imply build-it work
  for (const ltId of a.lieTaxIds ?? []) {
    const lt = lieTax.find((x) => x.id === ltId);
    if (!lt) continue;
    succ.push({
      description: `Resolve lie-tax: "${lt.claim.slice(0, 90)}"`,
      whyNeeded: lt.reality.slice(0, 200),
      source: `lie-tax:${lt.id} (${lt.severity})`,
    });
  }

  // Stream-level: dominant stream has no implemented leaves anywhere
  if (a.stream && streamsWithNoImpl.includes(a.stream)) {
    succ.push({
      description: `Stream "${a.stream}" has no implemented leaves — close the loop or formally retire`,
      whyNeeded: `entire value stream lacks shipped code despite intent docs`,
      source: `stream-doc:${a.stream}`,
    });
  }

  // De-dupe by description
  const seen = new Set();
  a.successorsImplied = succ.filter((s) => {
    if (seen.has(s.description)) return false;
    seen.add(s.description);
    return true;
  });

  if (
    a.status === "shipped" &&
    a.successorsImplied.length > 0 &&
    a.dormancy.currentDormancyDays > RECENT_DAYS
  ) {
    a.status = "needs_successor";
    a.statusEvidence += ` | shipped but ${a.successorsImplied.length} implied successors not picked up`;
  }
}

// -----------------------------------------------------------------------------
// 9. Build WBS hierarchy (era -> stream -> tag -> activity)
// -----------------------------------------------------------------------------

const wbsRoot = {
  id: "ROOT",
  name: "draw-quantify-dash (project-as-schedule)",
  generatedAt: new Date().toISOString(),
  meta: {
    sourceCommits: buildHist.commits.length,
    activities: activities.length,
    eras: eras.length,
    streams: allStreams.size,
    pivots: pivotsFile.pivots.length,
    lieTaxRows: lieTax.length,
    snapshots: snapshotFiles,
  },
  children: [],
};

for (const era of eras) {
  const eraNode = {
    id: era.id,
    name: era.name,
    start: era.start,
    endExclusive: era.endExclusive,
    boundaryPivot: era.boundaryPivot,
    children: [],
  };
  const eraActs = activities.filter((a) => a.era === era.id);
  const byStream = {};
  for (const a of eraActs) {
    const k = a.stream || "(unattributed)";
    byStream[k] = byStream[k] || [];
    byStream[k].push(a);
  }
  for (const [streamName, sActs] of Object.entries(byStream).sort()) {
    const streamNode = {
      id: `${era.id}:${streamName.replace(/[^A-Za-z0-9]+/g, "_")}`,
      name: streamName,
      activityCount: sActs.length,
      children: [],
    };
    const byTag = {};
    for (const a of sActs) {
      byTag[a.tag] = byTag[a.tag] || [];
      byTag[a.tag].push(a);
    }
    for (const [tag, tActs] of Object.entries(byTag).sort()) {
      streamNode.children.push({
        id: `${streamNode.id}:${tag}`,
        name: tag,
        activityCount: tActs.length,
        activityIds: tActs.map((a) => a.id),
        totalCommits: tActs.reduce((s, a) => s + a.commitCount, 0),
        totalLoc: tActs.reduce((s, a) => s + a.locAdded + a.locRemoved, 0),
      });
    }
    eraNode.children.push(streamNode);
  }
  wbsRoot.children.push(eraNode);
}

// -----------------------------------------------------------------------------
// 10. next.json — what looks like it needs to happen
// -----------------------------------------------------------------------------

const next = activities
  .filter((a) =>
    ["dormant", "blocked", "needs_successor", "paused"].includes(a.status)
  )
  .map((a) => ({
    activityId: a.id,
    name: a.name,
    status: a.status,
    stream: a.stream,
    era: a.era,
    lastTouched: a.lastDate,
    dormancyDays: a.dormancy.currentDormancyDays,
    lieTaxExposure: a.lieTaxIds.length,
    downstreamCount: activities.filter((x) =>
      x.predecessors.some((p) => p.id === a.id)
    ).length,
    successors: a.successorsImplied,
    statusEvidence: a.statusEvidence,
  }))
  .sort(
    (a, b) =>
      b.downstreamCount - a.downstreamCount ||
      b.lieTaxExposure - a.lieTaxExposure ||
      b.lastTouched.localeCompare(a.lastTouched)
  );

// -----------------------------------------------------------------------------
// 11. Status totals
// -----------------------------------------------------------------------------

const statusTotals = {};
for (const a of activities)
  statusTotals[a.status] = (statusTotals[a.status] || 0) + 1;

// -----------------------------------------------------------------------------
// 12. Write outputs
// -----------------------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(OUT_DIR, "wbs.json"),
  JSON.stringify(wbsRoot, null, 2)
);

fs.writeFileSync(
  path.join(OUT_DIR, "activities.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totals: {
        activities: activities.length,
        ...statusTotals,
      },
      thresholds: {
        gapDaysBetweenActivities: GAP_DAYS,
        dormantDays: DORMANT_DAYS,
        recentDays: RECENT_DAYS,
        pausedMinDays: PAUSED_MIN_DAYS,
      },
      eras,
      concurrencyTop20: concurrencyWaves.slice(0, 20),
      activities,
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(OUT_DIR, "next.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sortedBy: "downstreamCount DESC, lieTaxExposure DESC, lastTouched DESC",
      count: next.length,
      items: next,
    },
    null,
    2
  )
);

const readme = `# .lovable/wbs — Project-as-Schedule

Generated: ${new Date().toISOString()}
Source: \`scripts/mine-wbs-actuals.mjs\`

## What this is

The dev history of this project, reshaped into a Work Breakdown Structure with
**activities, durations, resource loading, concurrency, predecessor logic, and
status classification** — the same kind of analysis the app itself is supposed
to do for construction schedules. Eats its own dogfood.

This describes **what was actually worked on, when**, derived from git +
the L4 audit. It does **not** prescribe fixes, build a charter, or change any
app code.

## Files

- **\`wbs.json\`** — hierarchy: era → stream → tag → (rolled-up activity stats).
- **\`activities.json\`** — flat list of all ${activities.length} activities with
  full detail (commits, files, LOC, resource loading, dormancy, concurrency,
  predecessors, status, implied successors).
- **\`next.json\`** — the derived "what needs to happen" view. Activities whose
  status is dormant, blocked, paused, or needs_successor, sorted by downstream
  impact and lie-tax exposure.

## Derivation rules

- **Activity** = (primary path-tag, era) bucket, split on commit-gaps > ${GAP_DAYS} days.
- **Era** = window between detected pivots (\`L3/pivots.json\`).
- **Stream attribution** = dominant value-stream among the activity's touched
  files (joined via \`docs/wbs-dev.leaves.json\` fileGlobs).
- **Predecessor inference** (per activity pair, A→B):
  - \`file_overlap\` (high/med) — A finishes before B and they share ≥3 files
  - \`message_ref\` (med) — B's commit subjects reference A's tag tokens, same stream
  - \`temporal\` (low) — same stream and A ends ≤10 days before B starts
  - Top 8 retained per activity.
- **Status classification** (rule table, not vibes):
  | Status | Rule |
  |--------|------|
  | \`in_progress\` | last commit ≤${RECENT_DAYS}d ago |
  | \`quiet\` | last commit ≤~${PAUSED_MIN_DAYS}d, no WIP marker |
  | \`paused\` | 14–60d idle AND last subject contains wip/todo/part-N/draft/stub |
  | \`dormant\` | ≥${DORMANT_DAYS}d idle AND has partial/missing leaves or lie-tax exposure |
  | \`blocked\` | predecessor is itself dormant/abandoned/paused |
  | \`abandoned\` | tag in blast-radius of a capability-removal pivot, no later commits |
  | \`shipped\` | idle but all associated leaves implemented, no open successors |
  | \`needs_successor\` | shipped but has implied successors no one picked up |
  | \`orphaned\` | code with no stream attribution |
- **Implied successors** sourced (with citations) from:
  - leaves with \`verdict: partial\` or \`missing\` attached to the activity's files
  - lie-tax rows (\`L4/lie-tax.md\`) whose source file is in the activity
  - value streams (\`docs/streams/*\`) with zero implemented leaves

## Known limitations

- Activity clustering uses path-tag bucketing. Refactors that move code across
  tags will produce two activities instead of one. Spot-check before trusting
  any single activity boundary.
- Predecessor edges are heuristic. Only \`file_overlap\` (sharedFiles ≥6) is
  high confidence; \`message_ref\` and \`temporal\` are advisory.
- Work done in chat/plans/designs that never landed in git does not show up
  as an activity. It only appears as an implied successor (via mem notes,
  stream docs, lie-tax).
- File renames may break the join from activity → leaf → stream, surfacing
  some activities as \`orphaned\` when they're actually attributed elsewhere.
- Pivot blast-radius matching is keyword-based and may over- or under-flag
  \`abandoned\` status on adjacent tags.

## Totals at generation time

- Activities: ${activities.length}
- Status breakdown: ${JSON.stringify(statusTotals)}
- Eras: ${eras.length}
- Streams represented: ${[...new Set(activities.map((a) => a.stream).filter(Boolean))].length}
- "Next" queue: ${next.length} items

## Regenerating

\`\`\`bash
node scripts/mine-wbs-actuals.mjs
\`\`\`

Inputs:
- \`docs/build-history.json\` (per-commit file detail)
- \`docs/wbs-dev.leaves.json\` (intent leaves with stream + verdict)
- \`docs/wbs-dev.agent-runs/L3/pivots.json\` (eras)
- \`docs/wbs-dev.agent-runs/L4/lie-tax.md\` (marketing-vs-reality exposure)
`;

fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme);

// -----------------------------------------------------------------------------
// 13. Summary to stdout
// -----------------------------------------------------------------------------

console.log("\n=== WBS actuals mined ===");
console.log("activities:", activities.length);
console.log("status totals:", statusTotals);
console.log("eras:", eras.length);
console.log("next-queue size:", next.length);
console.log("\nTop 10 concurrent days:");
for (const w of concurrencyWaves.slice(0, 10)) {
  console.log(`  ${w.date}: ${w.activeActivities} activities in flight`);
}
console.log("\nTop 10 'next' items by downstream impact:");
for (const n of next.slice(0, 10)) {
  console.log(
    `  [${n.status}] ${n.activityId} ${n.name.slice(0, 70)} (downstream=${n.downstreamCount}, lieTax=${n.lieTaxExposure})`
  );
}
console.log(`\nWrote ${OUT_DIR}/{wbs,activities,next}.json + README.md`);
