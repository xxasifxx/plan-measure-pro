#!/usr/bin/env node
// L1 parser: edge-fns
// Reads each supabase/functions/<name>/index.ts and produces a request
// dispatch summary: top-level branches, called Supabase tables / RPCs,
// external fetch URLs, env reads, request schema fields.
import ts from "typescript";
import { walk, read, emit, SUPABASE } from "./_shared.mjs";

const files = walk(`${SUPABASE}/functions`, { include: (r) => /\/index\.ts$/.test(r) });

const out = files.map((rel) => {
  const text = read(rel);
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const tables = new Set();
  const rpcs = new Set();
  const fetches = new Set();
  const envReads = new Set();
  const branches = [];
  const requestFields = new Set();

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(sf);
      // supabase.from("x")
      if (/\.from$/.test(callText) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        tables.add(node.arguments[0].text);
      }
      if (/\.rpc$/.test(callText) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        rpcs.add(node.arguments[0].text);
      }
      if (callText === "fetch" && node.arguments[0]) {
        const a = node.arguments[0];
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) fetches.add(a.text);
        else fetches.add(a.getText(sf).slice(0, 120));
      }
      // Deno.env.get("X")
      if (callText === "Deno.env.get" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        envReads.add(node.arguments[0].text);
      }
    }
    if (ts.isIfStatement(node)) {
      const cond = node.expression.getText(sf);
      if (cond.length < 200) branches.push({ condition: cond, line: lineOf(node) });
    }
    if (ts.isSwitchStatement(node)) {
      const disc = node.expression.getText(sf);
      for (const c of node.caseBlock.clauses) {
        if (ts.isCaseClause(c)) branches.push({ condition: `${disc} === ${c.expression.getText(sf)}`, line: lineOf(c) });
      }
    }
    // const { a, b } = await req.json()
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const initText = node.initializer.getText(sf);
      if (/req\.json\(\)|request\.json\(\)/.test(initText) && ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          if (el.name && ts.isIdentifier(el.name)) requestFields.add(el.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  return {
    file: rel,
    name: rel.split("/").slice(-2)[0],
    loc: text.split("\n").length,
    tables: [...tables],
    rpcs: [...rpcs],
    fetches: [...fetches],
    envReads: [...envReads],
    requestFields: [...requestFields],
    branches,
  };
});

emit("edge-fns", { fnCount: out.length, functions: out });
