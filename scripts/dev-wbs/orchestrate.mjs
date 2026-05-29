#!/usr/bin/env node
// Multi-agent WBS pipeline orchestrator (Phase 1.7).
//
// Layers:
//   L1 parsers       — deterministic Node scripts under agents/. Mechanical
//                      extraction. Run in parallel. Each emits one JSON to
//                      docs/wbs-dev.agent-runs/L1/<name>.json.
//   L2 comprehenders — LLM agents (one per value stream) spawned via the
//                      acp_subagent--spawn_agent tool from the chat session;
//                      this script only declares the manifest. The actual
//                      spawn happens from the orchestrator chat turn so the
//                      tool runtime can track results.
//   L3 historians    — per-dense-file git timelines + repo-wide pivot detector.
//   L4 synthesizers  — architect (intent-leaves.json), snapshotter, auditor.
//
// Usage:
//   node scripts/dev-wbs/orchestrate.mjs --layer L1            # run all L1
//   node scripts/dev-wbs/orchestrate.mjs --layer L1 --agent ast-frontend
//   node scripts/dev-wbs/orchestrate.mjs --manifest            # print manifest as JSON
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

const HERE = dirname(new URL(import.meta.url).pathname);
const AGENTS = join(HERE, "agents");

const L1_AGENTS = [
  { name: "ast-frontend",   script: "ast-frontend.mjs",   slice: "src/**/*.{ts,tsx} (minus dedicated)" },
  { name: "ast-pdf-canvas", script: "ast-pdf-canvas.mjs", slice: "PdfCanvas family" },
  { name: "sql-migrations", script: "sql-migrations.mjs", slice: "supabase/migrations/*.sql" },
  { name: "edge-fns",       script: "edge-fns.mjs",       slice: "supabase/functions/*/index.ts" },
  { name: "tests",          script: "tests.mjs",          slice: "src/**/*.test.{ts,tsx}" },
  { name: "docs-streams",   script: "docs-streams.mjs",   slice: "docs/streams/*.md" },
  { name: "marketing-copy", script: "marketing-copy.mjs", slice: "landing/pitch pages + public/llms.txt" },
];

// L2/L3/L4 manifests are descriptors — the chat orchestrator reads them and
// dispatches via the spawn_agent tool. Scripts are not the dispatcher here.
const L2_COMPREHENDERS = Array.from({ length: 20 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { name: `stream-${n}`, model: "capable", inputs: ["L1/*"], output: `L2/stream-${n}.json` };
});

const L3_HISTORIANS = [
  { name: "hist-pdf-canvas",      target: "src/components/PdfCanvas.tsx" },
  { name: "hist-use-project",     target: "src/hooks/useProject.ts" },
  { name: "hist-index-page",      target: "src/pages/Index.tsx" },
  { name: "hist-schedule-ws",     target: "src/components/schedule/ScheduleWorkspace.tsx" },
  { name: "hist-parse-schedule",  target: "supabase/functions/parse-schedule/index.ts" },
  { name: "hist-schedule-libs",   target: "src/lib/schedule/" },
  { name: "hist-migrations",      target: "supabase/migrations/" },
  { name: "hist-stream-docs",     target: "docs/streams/" },
  { name: "pivot-detector",       target: "<whole repo, git log>" },
];

const L4_SYNTHESIZERS = [
  { name: "architect",   inputs: ["L2/*"],         output: "docs/wbs-dev.intent-leaves.json" },
  { name: "snapshotter", inputs: ["L3/*", "intent-leaves.json"], output: "docs/wbs-dev.snapshots/" },
  { name: "auditor",     inputs: ["intent-leaves.json", "L1/marketing-copy.json"], output: "docs/wbs-dev.lie-tax.md" },
];

const MANIFEST = { L1: L1_AGENTS, L2: L2_COMPREHENDERS, L3: L3_HISTORIANS, L4: L4_SYNTHESIZERS };

function runAgent(agent) {
  return new Promise((resolve, reject) => {
    const path = join(AGENTS, agent.script);
    if (!existsSync(path)) return reject(new Error(`Missing script: ${path}`));
    const child = spawn("node", [path], { stdio: ["ignore", "inherit", "inherit"] });
    child.on("exit", (code) => (code === 0 ? resolve(agent) : reject(new Error(`${agent.name} exit ${code}`))));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const idx = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (args.includes("--manifest")) {
    process.stdout.write(JSON.stringify(MANIFEST, null, 2) + "\n");
    return;
  }
  const layer = idx("--layer") || "L1";
  const only = idx("--agent");
  if (layer === "L1") {
    const list = only ? L1_AGENTS.filter((a) => a.name === only) : L1_AGENTS;
    const results = await Promise.allSettled(list.map(runAgent));
    let failed = 0;
    for (const r of results) {
      if (r.status === "rejected") { failed++; process.stderr.write(`FAIL: ${r.reason.message}\n`); }
    }
    process.stderr.write(`\n[L1] ${list.length - failed}/${list.length} succeeded\n`);
    if (failed) process.exit(1);
  } else {
    process.stderr.write(`Layer ${layer} is dispatched from the chat orchestrator via spawn_agent. See manifest with --manifest.\n`);
  }
}

main().catch((e) => { process.stderr.write(e.stack + "\n"); process.exit(1); });
