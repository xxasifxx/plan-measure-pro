#!/usr/bin/env node
/**
 * discover-work-items.mjs  —  Phase B
 *
 * Read docs/build-history.json and emit docs/work-items.json: candidate
 * work items discovered bottom-up from the commit record.
 *
 * Algorithm (deliberately simple so it's auditable):
 *
 *   For each path-tag with >= MIN_TAG_COMMITS build commits:
 *     • Collect that tag's build commits in chronological order.
 *     • Walk them and start a new sub-cluster whenever the gap to the
 *       previous commit exceeds GAP_DAYS (default 7).
 *     • Each sub-cluster becomes a candidate work item, carrying:
 *         - primaryTag
 *         - first/last commit, span
 *         - build commit count + acceptance count (merges landing inside span)
 *         - co-occurring tags (top 5 by commit-share)
 *         - top subject tokens (top 8 by count)
 *         - sample subjects (up to 6, deduped)
 *         - the commit list (sha/date/subject/kind)
 *
 * Acceptance attribution: a merge inside a work item's [start..end] window
 * whose preceding build commits include the work item's primaryTag.
 *
 * Tags below MIN_TAG_COMMITS go into a `lowSignalTags` summary so the
 * reviewer can decide whether to fold them into something larger.
 *
 * Output is intentionally LARGE and human-readable — this is the artifact
 * we'll audit together in Phase C.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const IN_PATH = resolve(REPO_ROOT, 'docs/build-history.json');
const OUT_PATH = resolve(REPO_ROOT, 'docs/work-items.json');

const GAP_DAYS = 7;
const MIN_TAG_COMMITS = 3; // tags with fewer commits → lowSignalTags

const dayDiff = (a, b) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

function main() {
  const history = JSON.parse(readFileSync(IN_PATH, 'utf8'));
  const allCommits = history.commits;
  const buildCommits = allCommits.filter((c) => c.kind === 'build');
  const acceptCommits = allCommits.filter((c) => c.kind === 'acceptance');

  // tag → ordered build commit list
  const byTag = new Map();
  for (const c of buildCommits) {
    for (const t of c.pathTags) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(c);
    }
  }

  const workItems = [];
  const lowSignalTags = [];
  let wiCounter = 0;

  const tagsSorted = [...byTag.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [tag, commits] of tagsSorted) {
    if (commits.length < MIN_TAG_COMMITS) {
      lowSignalTags.push({
        tag,
        commitCount: commits.length,
        firstCommit: commits[0].date,
        lastCommit: commits[commits.length - 1].date,
        sampleSubjects: [...new Set(commits.map((c) => c.subject))].slice(0, 3),
      });
      continue;
    }

    // Split into sub-clusters by GAP_DAYS gap.
    const clusters = [];
    let cur = [commits[0]];
    for (let i = 1; i < commits.length; i++) {
      const gap = dayDiff(commits[i - 1].date, commits[i].date);
      if (gap > GAP_DAYS) {
        clusters.push(cur);
        cur = [];
      }
      cur.push(commits[i]);
    }
    if (cur.length) clusters.push(cur);

    for (let ci = 0; ci < clusters.length; ci++) {
      const cluster = clusters[ci];
      const first = cluster[0];
      const last = cluster[cluster.length - 1];

      // Co-occurring tags
      const coTagCount = new Map();
      for (const c of cluster) {
        for (const t of c.pathTags) {
          if (t === tag) continue;
          coTagCount.set(t, (coTagCount.get(t) || 0) + 1);
        }
      }
      const coTags = [...coTagCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t, n]) => ({ tag: t, sharedCommits: n }));

      // Top subject tokens
      const tokCount = new Map();
      for (const c of cluster) for (const t of c.subjectTokens) tokCount.set(t, (tokCount.get(t) || 0) + 1);
      const topTokens = [...tokCount.entries()]
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([token, count]) => ({ token, count }));

      // Acceptance merges landing inside this cluster's window
      const acceptances = acceptCommits.filter(
        (a) => a.iso >= first.iso && a.iso <= last.iso,
      );

      // Sample subjects, deduped, oldest first, max 6
      const sampleSubjects = [];
      const seen = new Set();
      for (const c of cluster) {
        if (seen.has(c.subject)) continue;
        seen.add(c.subject);
        sampleSubjects.push(c.subject);
        if (sampleSubjects.length >= 6) break;
      }

      wiCounter++;
      workItems.push({
        id: `WI-${String(wiCounter).padStart(3, '0')}`,
        primaryTag: tag,
        clusterIndex: ci + 1,
        clusterCount: clusters.length,
        firstCommit: first.date,
        lastCommit: last.date,
        spanDays: dayDiff(first.date, last.date) + 1,
        buildCommitCount: cluster.length,
        acceptanceCount: acceptances.length,
        coTags,
        topSubjectTokens: topTokens,
        sampleSubjects,
        commits: cluster.map((c) => ({
          sha: c.sha.slice(0, 8),
          date: c.date,
          kind: c.kind,
          subject: c.subject,
        })),
      });
    }
  }

  // Sort work items chronologically by firstCommit, then by primaryTag.
  workItems.sort(
    (a, b) =>
      a.firstCommit.localeCompare(b.firstCommit) ||
      a.primaryTag.localeCompare(b.primaryTag),
  );
  // Renumber so IDs follow chronological order.
  workItems.forEach((w, i) => (w.id = `WI-${String(i + 1).padStart(3, '0')}`));

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'docs/build-history.json',
    thresholds: { GAP_DAYS, MIN_TAG_COMMITS },
    summary: {
      totalBuildCommits: buildCommits.length,
      totalAcceptanceCommits: acceptCommits.length,
      distinctTags: byTag.size,
      tagsCovered: byTag.size - lowSignalTags.length,
      workItemCount: workItems.length,
      lowSignalTagCount: lowSignalTags.length,
    },
    workItems,
    lowSignalTags: lowSignalTags.sort((a, b) => b.commitCount - a.commitCount),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${workItems.length} candidate work items from ${byTag.size - lowSignalTags.length} tags`);
  console.log(`  ${lowSignalTags.length} low-signal tags (< ${MIN_TAG_COMMITS} commits) deferred`);
  // Distribution preview
  const byPrimary = new Map();
  for (const w of workItems) byPrimary.set(w.primaryTag, (byPrimary.get(w.primaryTag) || 0) + 1);
  const multi = [...byPrimary.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  if (multi.length) {
    console.log(`  Tags with multiple work-item clusters (true Build + Refine candidates):`);
    for (const [t, n] of multi.slice(0, 10)) console.log(`    ${String(n).padStart(2)}  ${t}`);
  }
}

main();
