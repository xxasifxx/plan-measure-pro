#!/usr/bin/env node
// L1 parser: ast-pdf-canvas — dedicated parser for the dense PdfCanvas family.
// Decomposes PdfCanvas.tsx into its discrete capabilities by extracting:
//   - every switch/case arm in pointer/touch/click handlers (each arm = one tool intent)
//   - every exported / top-level function with its body's first 5 lines
//   - hook calls (state shape)
//   - JSX strings (button labels, prompts, instructions)
// Companion files: Toolbar.tsx, MobileToolbar.tsx, geometry.ts, geo-transform.ts
import ts from "typescript";
import { read, emit } from "./_shared.mjs";

const FILES = [
  "src/components/PdfCanvas.tsx",
  "src/components/Toolbar.tsx",
  "src/components/MobileToolbar.tsx",
  "src/lib/geometry.ts",
  "src/lib/geo-transform.ts",
];

const out = [];

for (const rel of FILES) {
  let text;
  try { text = read(rel); } catch { continue; }
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const functions = [];
  const switches = [];
  const conditionals = []; // top-level if (toolMode === "...") branches
  const jsxStrings = [];
  const callbackArgs = []; // onClick / onPointerDown handler signatures inside JSX
  const propTypes = [];

  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      const body = node.body ? node.body.getText(sf).split("\n").slice(0, 6).join("\n") : "";
      functions.push({ name: node.name.getText(sf), line: lineOf(node), bodyPreview: body.slice(0, 400) });
    }
    if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      const name = node.name.getText(sf);
      const body = node.initializer.body.getText(sf).split("\n").slice(0, 6).join("\n");
      functions.push({ name, line: lineOf(node), bodyPreview: body.slice(0, 400) });
    }
    if (ts.isSwitchStatement(node)) {
      const disc = node.expression.getText(sf).slice(0, 80);
      const arms = [];
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause)) {
          const value = clause.expression.getText(sf).slice(0, 80);
          const body = clause.statements.map((s) => s.getText(sf)).join("\n").split("\n").slice(0, 8).join("\n");
          arms.push({ value, line: lineOf(clause), bodyPreview: body.slice(0, 600) });
        } else {
          arms.push({ value: "default", line: lineOf(clause), bodyPreview: clause.statements.map((s) => s.getText(sf)).join("\n").slice(0, 400) });
        }
      }
      switches.push({ discriminator: disc, line: lineOf(node), arms });
    }
    if (ts.isIfStatement(node)) {
      const cond = node.expression.getText(sf);
      // Capture tool-mode style conditionals
      if (/toolMode|tool\b|mode\s*===|kind\s*===|status\s*===/.test(cond)) {
        conditionals.push({ condition: cond.slice(0, 160), line: lineOf(node) });
      }
    }
    if (ts.isJsxText(node)) {
      const t = node.text.trim();
      if (t.length >= 2 && /[a-zA-Z]/.test(t)) jsxStrings.push({ text: t.slice(0, 200), line: lineOf(node) });
    }
    if (ts.isInterfaceDeclaration(node) && /Props$/.test(node.name.text)) {
      propTypes.push({ name: node.name.text, line: lineOf(node), members: node.members.map((m) => (m.name ? m.name.getText(sf) : "?")) });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  out.push({
    file: rel,
    loc: text.split("\n").length,
    functions,
    switches,
    conditionals,
    propTypes,
    jsxStrings: jsxStrings.slice(0, 300),
  });
}

emit("ast-pdf-canvas", { fileCount: out.length, files: out });
