#!/usr/bin/env node
// Build .lovable/wbs/backlog-network.json — CPM network over build-backlog entries.
//
// Reads:
//   - .lovable/wbs/build-backlog.json
//   - .lovable/wbs/backlog-dependencies.json (manual edges)
//
// Computes:
//   - normalized predecessors[]/successors[]
//   - topological layers
//   - forward pass: ES (earliest start), EF (earliest finish) in days from T0
//   - backward pass: LS (latest start), LF (latest finish)
//   - total slack, critical flag
//   - project duration; critical path id list
//   - cycle detection (broken edges are reported, not silently dropped)
//
// Time unit: days. Each entry uses entry.estimate_days as duration.
import fs from 'node:fs';

const BACKLOG = '.lovable/wbs/build-backlog.json';
const DEPS = '.lovable/wbs/backlog-dependencies.json';
const OUT = '.lovable/wbs/backlog-network.json';

const backlog = JSON.parse(fs.readFileSync(BACKLOG, 'utf8'));
const depsFile = fs.existsSync(DEPS) ? JSON.parse(fs.readFileSync(DEPS, 'utf8')) : { edges: {} };
const manualEdges = depsFile.edges || {};

const nodes = new Map();
for (const e of backlog.entries) {
  nodes.set(e.id, {
    id: e.id,
    stream: e.stream,
    title: e.title,
    duration: Math.max(0, e.estimate_days || 0),
    confidence: e.confidence,
    owner_role: e.owner_role,
    source_type: e.source_type,
    predecessors: [],
    successors: [],
  });
}

// ─── ingest manual edges ──────────────────────────────────────────────────────
const issues = [];
const inferredEdges = [];
function addEdge(pred, succ, source) {
  if (!nodes.has(pred) || !nodes.has(succ) || pred === succ) return;
  nodes.get(succ).predecessors.push(pred);
  nodes.get(pred).successors.push(succ);
  if (source === 'inferred') inferredEdges.push({ pred, succ });
}
for (const [succ, preds] of Object.entries(manualEdges)) {
  if (!nodes.has(succ)) {
    issues.push({ kind: 'unknown_successor', id: succ });
    continue;
  }
  for (const pred of preds || []) {
    if (!nodes.has(pred)) {
      issues.push({ kind: 'unknown_predecessor', id: pred, from: succ });
      continue;
    }
    if (pred === succ) {
      issues.push({ kind: 'self_loop', id: succ });
      continue;
    }
    addEdge(pred, succ, 'manual');
  }
}

// ─── inferred edges ───────────────────────────────────────────────────────────
// Safe heuristics; can be overridden by listing the same edge manually.
//  (1) marketing_promise depends on capability_missing entries in same stream
//  (2) verification_gap depends on capability_partial/_missing in same stream
//      (you can only verify e2e once the feature exists)
const byStreamSource = new Map();
for (const e of backlog.entries) {
  const k = `${e.stream}::${e.source_type}`;
  if (!byStreamSource.has(k)) byStreamSource.set(k, []);
  byStreamSource.get(k).push(e.id);
}
for (const e of backlog.entries) {
  if (e.source_type === 'marketing_promise') {
    for (const pred of byStreamSource.get(`${e.stream}::capability_missing`) || []) {
      addEdge(pred, e.id, 'inferred');
    }
  }
  if (e.source_type === 'verification_gap') {
    for (const t of ['capability_missing', 'capability_partial']) {
      for (const pred of byStreamSource.get(`${e.stream}::${t}`) || []) {
        addEdge(pred, e.id, 'inferred');
      }
    }
  }
}

for (const n of nodes.values()) {
  n.predecessors = [...new Set(n.predecessors)];
  n.successors = [...new Set(n.successors)];
}

// ─── cycle detection (DFS) ────────────────────────────────────────────────────
const COLOR = new Map(); // 0=white, 1=gray, 2=black
const cycleEdges = new Set();
function dfs(id, stack) {
  COLOR.set(id, 1);
  stack.push(id);
  for (const s of nodes.get(id).successors) {
    const c = COLOR.get(s) || 0;
    if (c === 1) {
      // back edge -> cycle; cut it
      cycleEdges.add(`${id}->${s}`);
      issues.push({ kind: 'cycle_edge_dropped', from: id, to: s, stack: [...stack] });
    } else if (c === 0) {
      dfs(s, stack);
    }
  }
  COLOR.set(id, 2);
  stack.pop();
}
for (const id of nodes.keys()) if (!COLOR.get(id)) dfs(id, []);

// strip cycle edges from the working graph
for (const n of nodes.values()) {
  n.successors = n.successors.filter((s) => !cycleEdges.has(`${n.id}->${s}`));
  n.predecessors = n.predecessors.filter((p) => !cycleEdges.has(`${p}->${n.id}`));
}

// ─── topological order (Kahn) ─────────────────────────────────────────────────
const indeg = new Map([...nodes.values()].map((n) => [n.id, n.predecessors.length]));
const queue = [...nodes.values()].filter((n) => n.predecessors.length === 0).map((n) => n.id);
const topo = [];
while (queue.length) {
  const id = queue.shift();
  topo.push(id);
  for (const s of nodes.get(id).successors) {
    indeg.set(s, indeg.get(s) - 1);
    if (indeg.get(s) === 0) queue.push(s);
  }
}

// ─── forward pass ─────────────────────────────────────────────────────────────
for (const id of topo) {
  const n = nodes.get(id);
  n.ES = n.predecessors.reduce((m, p) => Math.max(m, nodes.get(p).EF), 0);
  n.EF = n.ES + n.duration;
}
const projectDuration = [...nodes.values()].reduce((m, n) => Math.max(m, n.EF || 0), 0);

// ─── backward pass ────────────────────────────────────────────────────────────
for (const id of [...topo].reverse()) {
  const n = nodes.get(id);
  if (n.successors.length === 0) {
    n.LF = projectDuration;
  } else {
    n.LF = n.successors.reduce((m, s) => Math.min(m, nodes.get(s).LS), Infinity);
  }
  n.LS = n.LF - n.duration;
  n.slack = n.LS - n.ES;
  n.critical = n.slack === 0;
}

// ─── critical path (greedy longest) ───────────────────────────────────────────
const criticalIds = [];
{
  const starts = [...nodes.values()].filter((n) => n.critical && n.predecessors.every((p) => !nodes.get(p).critical));
  starts.sort((a, b) => b.duration - a.duration);
  if (starts[0]) {
    let cur = starts[0];
    criticalIds.push(cur.id);
    while (true) {
      const nextCrit = cur.successors
        .map((s) => nodes.get(s))
        .filter((s) => s.critical)
        .sort((a, b) => b.duration - a.duration)[0];
      if (!nextCrit) break;
      criticalIds.push(nextCrit.id);
      cur = nextCrit;
    }
  }
}

// ─── layering for layout (longest-path) ───────────────────────────────────────
for (const id of topo) {
  const n = nodes.get(id);
  n.layer = n.predecessors.length
    ? Math.max(...n.predecessors.map((p) => nodes.get(p).layer + 1))
    : 0;
}
const maxLayer = [...nodes.values()].reduce((m, n) => Math.max(m, n.layer || 0), 0);

// ─── stats ────────────────────────────────────────────────────────────────────
const stats = {
  node_count: nodes.size,
  edge_count: [...nodes.values()].reduce((n, x) => n + x.successors.length, 0),
  declared_edges: Object.values(manualEdges).reduce((n, arr) => n + (arr || []).length, 0),
  inferred_edges: inferredEdges.length,
  cycle_edges_dropped: cycleEdges.size,
  unconnected_nodes: [...nodes.values()].filter((n) => !n.predecessors.length && !n.successors.length).length,
  project_duration_days: projectDuration,
  critical_path_length: criticalIds.length,
  max_layer: maxLayer,
  critical_node_count: [...nodes.values()].filter((n) => n.critical).length,
};
  cycle_edges_dropped: cycleEdges.size,
  unconnected_nodes: [...nodes.values()].filter((n) => !n.predecessors.length && !n.successors.length).length,
  project_duration_days: projectDuration,
  critical_path_length: criticalIds.length,
  max_layer: maxLayer,
  critical_node_count: [...nodes.values()].filter((n) => n.critical).length,
};

const out = {
  generatedAt: new Date().toISOString(),
  stats,
  issues,
  critical_path: criticalIds,
  nodes: [...nodes.values()].map((n) => ({
    id: n.id,
    stream: n.stream,
    title: n.title,
    duration: n.duration,
    confidence: n.confidence,
    owner_role: n.owner_role,
    source_type: n.source_type,
    predecessors: n.predecessors,
    successors: n.successors,
    layer: n.layer,
    ES: n.ES, EF: n.EF, LS: n.LS, LF: n.LF,
    slack: n.slack,
    critical: n.critical,
  })),
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(
  `[cpm] ${OUT} — ${stats.node_count} nodes / ${stats.edge_count} edges / ${stats.declared_edges} declared / ${stats.cycle_edges_dropped} cycles dropped / ${stats.unconnected_nodes} unconnected / duration ${stats.project_duration_days}d / critical ${stats.critical_node_count} nodes (${stats.critical_path_length} on longest path)`
);
