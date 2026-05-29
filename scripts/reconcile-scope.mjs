// Phase C cluster + reconcile. Read-only.
// Inputs:  docs/work-items.json, docs/scope-inventory.json
// Output:  docs/wbs-proposals.reconciled.json
//
// Track 1 — Cluster work items via co-occurrence graph (edge weight =
//   sharedCommits normalized by smaller item's buildCommitCount).
//   Items in disjoint time windows (no overlap + gap > 30d) are NOT connected.
// Track 3 — For each cluster, match against capability inventory by keyword
//   overlap (subject tokens + sample subjects + primaryTag + coTags vs.
//   capability keywords + tagHints). Unmatched aspirational/planned capabilities
//   are emitted as their own proposals.

import fs from "node:fs";

const wi  = JSON.parse(fs.readFileSync("docs/work-items.json", "utf8"));
const inv = JSON.parse(fs.readFileSync("docs/scope-inventory.json", "utf8"));

const items = wi.workItems;
const byId = new Map(items.map(i => [i.id, i]));
const byTag = new Map();
for (const it of items) {
  if (!byTag.has(it.primaryTag)) byTag.set(it.primaryTag, []);
  byTag.get(it.primaryTag).push(it);
}

// ---------- Track 1: co-occurrence clustering ----------
const MIN_EDGE_WEIGHT = 0.30;       // shared commits / min(buildCount)
const MAX_GAP_DAYS    = 30;

function windowsOverlapOrClose(a, b) {
  const aS = new Date(a.firstCommit), aE = new Date(a.lastCommit);
  const bS = new Date(b.firstCommit), bE = new Date(b.lastCommit);
  if (aE >= bS && bE >= aS) return true;                       // overlap
  const gapMs = aE < bS ? bS - aE : aS - bE;
  return gapMs / 86400000 <= MAX_GAP_DAYS;
}

// Build edges: for each pair of work items, look at coTags and find shared commits.
const adj = new Map(items.map(i => [i.id, new Set()]));
for (let i = 0; i < items.length; i++) {
  const A = items[i];
  for (let j = i + 1; j < items.length; j++) {
    const B = items[j];
    if (!windowsOverlapOrClose(A, B)) continue;
    // A's coTag with tag = B.primaryTag tells us shared commit count.
    const ct = (A.coTags || []).find(t => t.tag === B.primaryTag);
    if (!ct) continue;
    const denom = Math.min(A.buildCommitCount, B.buildCommitCount) || 1;
    const w = ct.sharedCommits / denom;
    if (w >= MIN_EDGE_WEIGHT) {
      adj.get(A.id).add(B.id);
      adj.get(B.id).add(A.id);
    }
  }
}

// Connected components
const seen = new Set();
const components = [];
for (const it of items) {
  if (seen.has(it.id)) continue;
  const comp = [];
  const stack = [it.id];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    comp.push(cur);
    for (const n of adj.get(cur)) if (!seen.has(n)) stack.push(n);
  }
  components.push(comp);
}

// ---------- Track 3: reconciliation ----------
function normTokens(s) {
  return (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

function workItemTokens(it) {
  const toks = new Set();
  normTokens(it.primaryTag).forEach(t => toks.add(t));
  for (const ct of it.coTags || []) normTokens(ct.tag).forEach(t => toks.add(t));
  for (const t of it.topSubjectTokens || []) toks.add(t.token.toLowerCase());
  for (const s of it.sampleSubjects || []) normTokens(s).forEach(t => toks.add(t));
  return toks;
}

function clusterTokens(comp) {
  const all = new Set();
  for (const id of comp) {
    const toks = workItemTokens(byId.get(id));
    for (const t of toks) all.add(t);
  }
  return all;
}

function clusterTags(comp) {
  const tags = new Set();
  for (const id of comp) {
    const it = byId.get(id);
    tags.add(it.primaryTag);
    for (const ct of it.coTags || []) tags.add(ct.tag);
  }
  return tags;
}

function scoreCapability(cap, tokens, tags) {
  let score = 0;
  for (const kw of cap.keywords || []) {
    if (tokens.has(kw.toLowerCase())) score += 2;
  }
  for (const hint of cap.tagHints || []) {
    if (tags.has(hint)) score += 5;
    // also fuzzy: tag prefix match (e.g. "lib:offline" matches "lib:offline-sync")
    for (const t of tags) {
      if (t !== hint && t.startsWith(hint)) score += 3;
    }
  }
  return score;
}

const MATCH_THRESHOLD = 5;
const matchedCapIds = new Set();

const clusters = components
  .map((comp, idx) => {
    const memberItems = comp.map(id => byId.get(id));
    const buildCommits  = memberItems.reduce((s,i)=>s + i.buildCommitCount, 0);
    const acceptanceCommits = memberItems.reduce((s,i)=>s + (i.acceptanceCount||0), 0);
    const allDates = memberItems.flatMap(i => [i.firstCommit, i.lastCommit]).sort();
    const tokens = clusterTokens(comp);
    const tags = clusterTags(comp);

    const scored = inv.capabilities
      .map(cap => ({ cap, score: scoreCapability(cap, tokens, tags) }))
      .filter(x => x.score >= MATCH_THRESHOLD)
      .sort((a,b) => b.score - a.score);

    for (const s of scored) matchedCapIds.add(s.cap.id);

    const tagFreq = {};
    for (const id of comp) {
      const it = byId.get(id);
      tagFreq[it.primaryTag] = (tagFreq[it.primaryTag]||0) + it.buildCommitCount;
      for (const ct of it.coTags||[]) tagFreq[ct.tag] = (tagFreq[ct.tag]||0) + ct.sharedCommits;
    }
    const topTags = Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([t,c])=>({tag:t,weight:c}));

    return {
      clusterId: `BC-${String(idx+1).padStart(3,"0")}`,
      memberCount: comp.length,
      memberWorkItemIds: comp,
      memberPrimaryTags: [...new Set(memberItems.map(i=>i.primaryTag))],
      buildCommits,
      acceptanceCommits,
      firstCommit: allDates[0],
      lastCommit: allDates[allDates.length-1],
      topTags,
      candidateCapabilities: scored.slice(0,5).map(s => ({
        capId: s.cap.id,
        name: s.cap.name,
        surface: s.cap.surface,
        status: s.cap.status,
        score: s.score,
      })),
      proposedSurface: scored[0]?.cap.surface || "UNASSIGNED",
      proposedName: scored[0]?.cap.name || `(unnamed cluster around ${memberItems[0].primaryTag})`,
      sampleSubjects: memberItems.flatMap(i => i.sampleSubjects || []).slice(0,8),
    };
  })
  .sort((a,b) => b.buildCommits - a.buildCommits);

// Capabilities with NO matching cluster (planned/aspirational/partial scope not in commits)
const orphanCapabilities = inv.capabilities
  .filter(c => !matchedCapIds.has(c.id))
  .map(c => ({
    capId: c.id,
    name: c.name,
    surface: c.surface,
    status: c.status,
    notes: c.notes,
    keywords: c.keywords,
  }));

// Surface summary
const surfaceSummary = {};
for (const cl of clusters) {
  const s = cl.proposedSurface;
  if (!surfaceSummary[s]) surfaceSummary[s] = { builtClusters:0, buildCommits:0 };
  surfaceSummary[s].builtClusters++;
  surfaceSummary[s].buildCommits += cl.buildCommits;
}
for (const c of orphanCapabilities) {
  if (!surfaceSummary[c.surface]) surfaceSummary[c.surface] = { builtClusters:0, buildCommits:0 };
  surfaceSummary[c.surface][`${c.status}Capabilities`] = (surfaceSummary[c.surface][`${c.status}Capabilities`]||0) + 1;
}

const out = {
  generatedAt: new Date().toISOString(),
  thresholds: { minEdgeWeight: MIN_EDGE_WEIGHT, maxGapDays: MAX_GAP_DAYS, matchThreshold: MATCH_THRESHOLD },
  summary: {
    workItems: items.length,
    builtClusters: clusters.length,
    singletonClusters: clusters.filter(c=>c.memberCount===1).length,
    inventoryCapabilities: inv.capabilities.length,
    matchedCapabilities: matchedCapIds.size,
    orphanCapabilities: orphanCapabilities.length,
  },
  surfaceSummary,
  builtClusters: clusters,
  orphanCapabilities,
};

fs.writeFileSync("docs/wbs-proposals.reconciled.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.summary, null, 2));
console.log("Surfaces:", JSON.stringify(surfaceSummary, null, 2));
console.log("Wrote docs/wbs-proposals.reconciled.json");
