#!/usr/bin/env node
/**
 * extract-build-history.mjs
 *
 * Read-only mining of `git log` to reconstruct TakeoffPro's actual build timeline.
 * Output: docs/build-history.json — consumed by takeoffpro-build.def.ts to emit a
 * P6-importable PMXML schedule of how this app was actually built.
 *
 * Per WBS leaf we detect commit clusters:
 *   - Build burst       : densest contiguous window holding >=60% of commits in <=20% of lifespan
 *   - Refinement tail   : remaining commits after the burst
 *   - Hardening clusters: commit messages matching /fix|hardening|round \d|polish|cleanup/i
 *                         that land across multiple WBS leaves on the same day
 *   - Lone late commits : singletons weeks after the burst → punch-list / in-progress
 *
 * All thresholds are surfaced in the JSON so they can be sanity-checked.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const OUT_PATH = resolve(REPO_ROOT, 'docs/build-history.json');

// ---------------------------------------------------------------------------
// Glob → WBS mapping. Order matters: first match wins.
// Edit this table to retune how files map to schedule activities.
// ---------------------------------------------------------------------------
const WBS_MAP = [
  // 7. Marketing & Onboarding ------------------------------------------------
  { wbs: '7.1', label: 'Landing / Pitch / Demo pages',
    test: f => /^src\/pages\/(Landing|FajarPitch|McfaPitch|Demo|P6XmlDemo|XerDemo)\.tsx$/.test(f) },
  { wbs: '7.2', label: 'Onboarding tour & welcome',
    test: f => /^src\/(components\/(GuidedTour|WelcomeCarousel|NativeFirstRun|XerLensTour)|hooks\/useTour)\b/.test(f) },
  { wbs: '7.3', label: 'SEO & marketing infra',
    test: f => /^(public\/(sitemap|robots|manifest|llms)\.|index\.html$)/.test(f) },

  // 2. Schedule & P6 ---------------------------------------------------------
  { wbs: '2.1', label: 'Schedule workspace UI',
    test: f => /^src\/components\/schedule\//.test(f) },
  { wbs: '2.2', label: 'Schedule engine (CPM, calendars, baselines)',
    test: f => /^src\/lib\/schedule\//.test(f) },
  { wbs: '2.3', label: 'P6 / XER import-export',
    test: f => /^src\/(lib\/(p6xml|xer)|components\/(ImportP6Panel|GanttUploader))\b/.test(f)
            || /^src\/pages\/(P6Export|P6XmlDemo|XerDemo)\.tsx$/.test(f) },
  { wbs: '2.4', label: 'Schedule QA',
    test: f => /^src\/test\/(cpm|baseline-end|tia|date-utils|xer-parser|p6xml|import-p6)\.test\.ts$/.test(f) },

  // 3. Field / Mobile --------------------------------------------------------
  { wbs: '3.1', label: 'PWA shell',
    test: f => /^src\/(components\/PwaShell|lib\/pwa)\b/.test(f)
            || /^public\/(sw\.|manifest)/.test(f) },
  { wbs: '3.2', label: 'Native shell (Capacitor)',
    test: f => /^src\/lib\/native\//.test(f)
            || /^capacitor\.config\.ts$/.test(f)
            || /^src\/components\/BiometricGate\.tsx$/.test(f) },
  { wbs: '3.3', label: 'Mobile UX (tab bar, toolbar, sheets)',
    test: f => /^src\/components\/(Mobile|MobileToolbar|MobileTabBar|MobileAnnotationSheet|MobilePayItems|MobileSections|GpsCalibration|GpsTraceControls)/.test(f) },
  { wbs: '3.4', label: 'Mobile / offline QA',
    test: f => /^src\/test\/(offline|mobile|geometry)\.test\.ts$/.test(f) },

  // 1. Takeoff & Measurement -------------------------------------------------
  { wbs: '1.3', label: 'Offline mirror & outbox',
    test: f => /^src\/lib\/offline\//.test(f) },
  { wbs: '1.1', label: 'Takeoff frontend (canvas, annotations, pay items)',
    test: f => /^src\/(components\/(PdfCanvas|Toolbar|SummaryPanel|SpecViewer|NotificationBell|ProjectSidebar|NavLink|EmptyState|ConfirmDialog|SyncPanel|TeamManager|ReReviewCard|ReRejectDialog)|lib\/(geometry|pdf-utils|geo-transform|specs-utils|export-utils|approved-quantities|storage|utils))\b/.test(f)
            || /^src\/hooks\/(useDocuments|useNetworkStatus|useNotifications|useOutbox|usePayItemActivityMap|useProject|useProjects|useReReviewQueue|useTheme|use-mobile|use-toast)\.tsx?$/.test(f)
            || /^src\/pages\/(Index|Documents|Dashboard|ProjectControls|Settings|NotFound)\.tsx$/.test(f) },
  { wbs: '1.2', label: 'Takeoff backend (RLS, RPCs, triggers)',
    test: f => /^supabase\/migrations\//.test(f) },
  { wbs: '1.4', label: 'Takeoff QA',
    test: f => /^src\/test\/(geometry|specs-utils|example)\.test\.ts$/.test(f) },

  // 4. RE Workflow & Approvals ----------------------------------------------
  { wbs: '4.1', label: 'RE review UI',
    test: f => /^src\/(pages\/ReReview|pages\/DailyReport|components\/Re(Review|Reject)|hooks\/useDailyReport|hooks\/useReReviewQueue)\b/.test(f)
            || /^src\/lib\/daily-report-snapshot\.ts$/.test(f) },
  { wbs: '4.3', label: 'RE workflow QA',
    test: f => /^src\/test\/daily-report-snapshot\.test\.ts$/.test(f) },

  // 5. Reporting & Export ----------------------------------------------------
  { wbs: '5.1', label: 'In-app reporting (export-utils, summary)',
    test: f => /^src\/lib\/export-utils\.ts$/.test(f) },
  { wbs: '5.2', label: 'Daily report Excel pipeline',
    test: f => /^src\/(pages\/DailyReport|hooks\/useDailyReport)/.test(f) },
  { wbs: '5.3', label: 'P6 PMXML export (this fixture itself)',
    test: f => /^src\/lib\/p6xml\/(build-from-project|fixtures)/.test(f) },

  // 6. Admin & Org -----------------------------------------------------------
  { wbs: '6.1', label: 'Auth & org flow',
    test: f => /^src\/(pages\/(Auth|ResetPassword)|hooks\/useAuth)\b/.test(f) },
  { wbs: '6.2', label: 'TeamManager + project members',
    test: f => /^src\/components\/TeamManager\.tsx$/.test(f) },
  { wbs: '6.3', label: 'Admin panel',
    test: f => /^src\/pages\/Admin\.tsx$/.test(f) },

  // Edge functions / config (folded into backend foundation) -----------------
  { wbs: '1.2', label: 'Edge functions',
    test: f => /^supabase\/functions\//.test(f) },

  // Catch-all frontend shell (App routing, root styles, root types) ----------
  { wbs: '1.1', label: 'Takeoff frontend (canvas, annotations, pay items)',
    test: f => /^src\/(App\.(tsx|css)|main\.tsx|index\.css|vite-env\.d\.ts|types\/project\.ts)$/.test(f) },
];

// Files we deliberately ignore (project meta, lockfiles, generated, planning).
const IGNORE_FILE = f =>
  /^(bun\.lock|package(-lock)?\.json|\.lovable\/|README\.md|\.gitignore|tsconfig|tailwind\.config|postcss\.config|vite\.config|vitest\.config|eslint\.config|components\.json|supabase\/(config|seed)\.|src\/integrations\/supabase\/(client|types)\.ts|docs\/)/.test(f);

// First commit hash to consider as "project start" — anything earlier is the
// upstream Lovable template that ships with every project.
const TEMPLATE_SUBJECT_RE = /^template:/i;


const CLUSTER = {
  BURST_MIN_FRAC: 0.6,     // burst must hold >=60% of commits
  BURST_MAX_LIFESPAN: 0.2, // ...in <=20% of the path's commit lifespan
  HARDENING_REGEX: /fix|hardening|round\s*\d|polish|cleanup|security/i,
  LATE_COMMIT_DAYS: 14,    // singleton this far after burst end → punch-list
};

// ---------------------------------------------------------------------------
function sh(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function classifyFile(file) {
  for (const row of WBS_MAP) if (row.test(file)) return row.wbs;
  return null;
}

function loadAllCommits() {
  // Format: __C__hash|ISO date|subject\nfile1\nfile2\n\n...
  const raw = sh("git log --reverse --no-merges --name-only --format='__C__%H|%aI|%s'");
  const commits = [];
  for (const block of raw.split('__C__')) {
    if (!block.trim()) continue;
    const [header, ...rest] = block.split('\n');
    const [hash, iso, ...subjParts] = header.split('|');
    const subject = subjParts.join('|').trim();
    const files = rest.map(s => s.trim()).filter(Boolean).filter(f => !IGNORE_FILE(f));
    // Skip upstream Lovable template commits (always have date 2025-01-01 and
    // a `template:` subject). They precede the real project start.
    if (TEMPLATE_SUBJECT_RE.test(subject)) continue;
    commits.push({ hash, iso, date: iso.slice(0, 10), subject, files });
  }
  return commits;
}

function dayDiff(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/**
 * Find the densest contiguous window of >=BURST_MIN_FRAC commits
 * whose span is <=BURST_MAX_LIFESPAN of the path's commit timeline.
 * Returns { burst: [dates], tail: [dates] } or null if no clear burst.
 */
function detectClusters(datesSorted) {
  if (datesSorted.length < 2) return { burst: datesSorted, tail: [] };
  const n = datesSorted.length;
  const minBurstCount = Math.max(2, Math.ceil(n * CLUSTER.BURST_MIN_FRAC));
  const totalSpanDays = Math.max(1, dayDiff(datesSorted[0], datesSorted[n - 1]) + 1);
  const maxBurstSpanDays = Math.max(1, Math.ceil(totalSpanDays * CLUSTER.BURST_MAX_LIFESPAN));

  // Sliding window: find smallest span containing >=minBurstCount consecutive commits.
  let best = null;
  for (let i = 0; i + minBurstCount - 1 < n; i++) {
    const j = i + minBurstCount - 1;
    const span = dayDiff(datesSorted[i], datesSorted[j]) + 1;
    if (span <= maxBurstSpanDays) {
      // Extend right while still inside the window
      let k = j;
      while (k + 1 < n && dayDiff(datesSorted[i], datesSorted[k + 1]) + 1 <= maxBurstSpanDays) k++;
      const burstSpan = dayDiff(datesSorted[i], datesSorted[k]) + 1;
      if (!best || (k - i + 1) / burstSpan > (best.count) / (best.span)) {
        best = { startIdx: i, endIdx: k, count: k - i + 1, span: burstSpan };
      }
    }
  }

  if (!best) {
    // No qualifying burst — treat the whole thing as a "Build" with no Refine.
    return { burst: datesSorted, tail: [] };
  }

  const burst = datesSorted.slice(best.startIdx, best.endIdx + 1);
  const tail = [
    ...datesSorted.slice(0, best.startIdx),
    ...datesSorted.slice(best.endIdx + 1),
  ];
  return { burst, tail };
}

function summarizeCluster(dates) {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return {
    count: sorted.length,
    start: sorted[0].slice(0, 10),
    end: sorted[sorted.length - 1].slice(0, 10),
    spanDays: dayDiff(sorted[0], sorted[sorted.length - 1]) + 1,
  };
}

// ---------------------------------------------------------------------------
function main() {
  const commits = loadAllCommits();
  if (commits.length === 0) throw new Error('No commits found');

  const projectStart = commits[0].date;
  const projectEnd = commits[commits.length - 1].date;

  // Aggregate per WBS leaf.
  const byWbs = new Map(); // wbs → { commits:[{iso,subject,hash,files}], files:Set }
  const unmapped = new Map(); // file → commit count, for tuning the glob map
  for (const c of commits) {
    const wbsTouched = new Set();
    for (const f of c.files) {
      const w = classifyFile(f);
      if (!w) {
        unmapped.set(f, (unmapped.get(f) || 0) + 1);
        continue;
      }
      wbsTouched.add(w);
      let entry = byWbs.get(w);
      if (!entry) {
        entry = { commits: [], files: new Set() };
        byWbs.set(w, entry);
      }
      entry.files.add(f);
    }
    for (const w of wbsTouched) {
      // Record this commit once per WBS it touched.
      byWbs.get(w).commits.push({ hash: c.hash, iso: c.iso, date: c.date, subject: c.subject });
    }
  }

  // Detect hardening days (cross-WBS commits whose subject matches the regex).
  const hardeningByDay = new Map(); // date → { subjects:Set, wbsTouched:Set, commits:[] }
  for (const c of commits) {
    if (!CLUSTER.HARDENING_REGEX.test(c.subject)) continue;
    const wbsTouched = new Set();
    for (const f of c.files) {
      const w = classifyFile(f);
      if (w) wbsTouched.add(w);
    }
    if (wbsTouched.size === 0) continue;
    let bucket = hardeningByDay.get(c.date);
    if (!bucket) {
      bucket = { subjects: new Set(), wbsTouched: new Set(), commits: [] };
      hardeningByDay.set(c.date, bucket);
    }
    bucket.subjects.add(c.subject);
    for (const w of wbsTouched) bucket.wbsTouched.add(w);
    bucket.commits.push({ hash: c.hash, iso: c.iso, subject: c.subject });
  }

  const hardeningMilestones = [...hardeningByDay.entries()]
    .filter(([_, b]) => b.wbsTouched.size >= 2 || b.commits.length >= 3)
    .map(([date, b], i) => ({
      milestoneId: `H${String(i + 1).padStart(2, '0')}`,
      date,
      label: [...b.subjects].slice(0, 3).join(' / '),
      wbsTouched: [...b.wbsTouched].sort(),
      commitCount: b.commits.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build per-WBS activity rows.
  const wbsRows = [];
  for (const [wbs, entry] of [...byWbs.entries()].sort()) {
    const sortedCommits = [...entry.commits].sort((a, b) => a.iso.localeCompare(b.iso));
    const dates = sortedCommits.map(c => c.iso);
    const { burst, tail } = detectClusters(dates);

    const burstSummary = summarizeCluster(burst);
    const tailSummary = summarizeCluster(tail);
    const lonely = tail.filter(d => {
      const gap = burstSummary ? dayDiff(burstSummary.end, d) : 0;
      return gap >= CLUSTER.LATE_COMMIT_DAYS;
    });

    const label = WBS_MAP.find(r => r.wbs === wbs)?.label || wbs;
    wbsRows.push({
      wbs,
      label,
      fileCount: entry.files.size,
      commitCount: sortedCommits.length,
      firstCommit: dates[0].slice(0, 10),
      lastCommit: dates[dates.length - 1].slice(0, 10),
      lifespanDays: dayDiff(dates[0], dates[dates.length - 1]) + 1,
      build: burstSummary,
      refine: tailSummary,
      punchList: lonely.length > 0 ? {
        count: lonely.length,
        latest: lonely[lonely.length - 1].slice(0, 10),
      } : null,
      sampleSubjects: [...new Set(sortedCommits.map(c => c.subject))].slice(0, 5),
      files: [...entry.files].sort(),
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    project: {
      start: projectStart,
      latestCommit: projectEnd,
      lifespanDays: dayDiff(projectStart, projectEnd) + 1,
      totalCommits: commits.length,
    },
    thresholds: { ...CLUSTER, HARDENING_REGEX: CLUSTER.HARDENING_REGEX.toString() },
    wbsMap: WBS_MAP.map(r => ({ wbs: r.wbs, label: r.label })),
    wbsRows,
    hardeningMilestones,
    unmappedTopFiles: [...unmapped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([file, count]) => ({ file, count })),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${commits.length} commits, ${wbsRows.length} WBS leaves, ${hardeningMilestones.length} hardening milestones`);
  console.log(`  Project span: ${projectStart} → ${projectEnd} (${out.project.lifespanDays} days)`);
  if (out.unmappedTopFiles.length > 0) {
    console.log(`  Unmapped top files (consider extending WBS_MAP):`);
    for (const u of out.unmappedTopFiles.slice(0, 8)) {
      console.log(`    ${u.count.toString().padStart(3)}  ${u.file}`);
    }
  }
}

main();
