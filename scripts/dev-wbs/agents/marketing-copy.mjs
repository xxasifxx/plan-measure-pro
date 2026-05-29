#!/usr/bin/env node
// L1 parser: marketing-copy
// Extracts user-facing marketing claims from landing/pitch pages and llms.txt
// so the auditor can cross-check promises against landed capabilities.
import ts from "typescript";
import { walk, read, emit, PUBLIC, SRC } from "./_shared.mjs";

const PITCH_FILES = walk(SRC + "/pages", {
  include: (r) => /(Landing|Pitch|Demo|Marketing|Hero)/i.test(r) && /\.tsx?$/.test(r),
});

const PUBLIC_FILES = walk(PUBLIC, { include: (r) => /\.(txt|html|md)$/.test(r) });

const claims = [];

for (const rel of PITCH_FILES) {
  const text = read(rel);
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  function visit(node) {
    if (ts.isJsxText(node)) {
      const t = node.text.trim();
      if (t.length >= 6 && /[a-zA-Z]/.test(t)) claims.push({ source: rel, kind: "jsx-text", text: t.slice(0, 400), line: lineOf(node) });
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const t = node.text.trim();
      // Heuristic: marketing string >= 12 chars and looks like prose (has a space).
      if (t.length >= 12 && /\s/.test(t) && /[a-z]/.test(t)) {
        claims.push({ source: rel, kind: "string", text: t.slice(0, 400), line: lineOf(node) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

for (const rel of PUBLIC_FILES) {
  const text = read(rel);
  if (rel.endsWith("llms.txt") || rel.endsWith(".md") || rel.endsWith(".txt")) {
    // Each non-empty line is a candidate claim.
    text.split("\n").forEach((line, i) => {
      const t = line.trim();
      if (t.length >= 12 && /[a-zA-Z]/.test(t) && !/^[#=*-]+$/.test(t)) {
        claims.push({ source: rel, kind: "doc-line", text: t.slice(0, 400), line: i + 1 });
      }
    });
  }
}

emit("marketing-copy", { claimCount: claims.length, claims });
