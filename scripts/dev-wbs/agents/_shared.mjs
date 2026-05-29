// Shared helpers for L1 parser agents.
// Parsers are deterministic Node scripts (no LLM). They open every file in
// their slice, extract structural intent signals, and write a single JSON
// artifact under docs/wbs-dev.agent-runs/L1/<agent>.json.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const REPO_ROOT = resolve(new URL("../../..", import.meta.url).pathname);
export const L1_DIR = join(REPO_ROOT, "docs", "wbs-dev.agent-runs", "L1");

export function walk(rootRel, { include = () => true, skipDirs = new Set(["node_modules", ".git", "dist", "build", ".next"]) } = {}) {
  const out = [];
  const root = join(REPO_ROOT, rootRel);
  function visit(abs) {
    let st;
    try { st = statSync(abs); } catch { return; }
    if (st.isDirectory()) {
      const base = abs.split("/").pop();
      if (skipDirs.has(base)) return;
      for (const child of readdirSync(abs)) visit(join(abs, child));
    } else if (st.isFile()) {
      const rel = relative(REPO_ROOT, abs);
      if (include(rel)) out.push(rel);
    }
  }
  visit(root);
  return out.sort();
}

export function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

export function emit(agentName, payload) {
  mkdirSync(L1_DIR, { recursive: true });
  const out = {
    agent: agentName,
    generatedAt: new Date().toISOString(),
    ...payload,
  };
  const path = join(L1_DIR, `${agentName}.json`);
  writeFileSync(path, JSON.stringify(out, null, 2));
  // Stderr — keeps stdout clean for piping.
  process.stderr.write(`[${agentName}] wrote ${relative(REPO_ROOT, path)}\n`);
  return path;
}

// Slice helper: caller passes a predicate; returns the file list.
export const SRC = "src";
export const SUPABASE = "supabase";
export const DOCS = "docs";
export const PUBLIC = "public";
