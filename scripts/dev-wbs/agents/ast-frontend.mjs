#!/usr/bin/env node
// L1 parser: ast-frontend
// Walks the TS/TSX frontend (excluding dense files owned by dedicated parsers)
// and extracts structural intent signals using the TypeScript compiler API.
//
// Per file, captures:
//   - exported symbols (functions, components, hooks, consts, types)
//   - React component declarations
//   - route paths from <Route path=...> JSX (and react-router config arrays)
//   - switch/case discriminators (toolMode, tool, kind, status, etc.)
//   - JSX user-facing strings (button text, labels, headings, toasts) — these
//     are the user-intent surfaces nobody else extracts.
//   - imports (for cohesion analysis later)
import ts from "typescript";
import { walk, read, emit, SRC } from "./_shared.mjs";

// Files owned by other parsers — keep this list narrow; everything else falls
// to ast-frontend.
const DEDICATED = new Set([
  "src/components/PdfCanvas.tsx",
  "src/components/Toolbar.tsx",
  "src/components/MobileToolbar.tsx",
  "src/lib/geometry.ts",
  "src/lib/geo-transform.ts",
  "src/hooks/useProject.ts",
  "src/hooks/useProjects.ts",
  "src/hooks/useDailyReport.ts",
  "src/hooks/useDocuments.ts",
  "src/hooks/useReReviewQueue.ts",
]);
const SCHEDULE_PREFIXES = ["src/lib/schedule/", "src/components/schedule/"];
const NATIVE_PREFIXES = ["src/lib/native/", "src/lib/offline/"];

function isOwnedElsewhere(rel) {
  if (DEDICATED.has(rel)) return true;
  if (SCHEDULE_PREFIXES.some((p) => rel.startsWith(p))) return true;
  if (NATIVE_PREFIXES.some((p) => rel.startsWith(p))) return true;
  return false;
}

const files = walk(SRC, {
  include: (rel) =>
    (rel.endsWith(".ts") || rel.endsWith(".tsx")) &&
    !rel.endsWith(".d.ts") &&
    !rel.includes("/test/") &&
    !rel.endsWith(".test.ts") &&
    !rel.endsWith(".test.tsx") &&
    !isOwnedElsewhere(rel),
});

const results = [];

for (const rel of files) {
  const text = read(rel);
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const exports = [];
  const components = [];
  const routes = [];
  const switches = [];
  const jsxStrings = [];
  const imports = [];

  function pos(node) {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return line + 1;
  }

  function isExported(node) {
    return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
  }

  function visit(node) {
    // Imports
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    }
    // Exported function / const / class / type / interface
    if (ts.isFunctionDeclaration(node) && isExported(node) && node.name) {
      const name = node.name.text;
      exports.push({ kind: "function", name, line: pos(node) });
      if (/^[A-Z]/.test(name)) components.push({ name, line: pos(node) });
    } else if (ts.isVariableStatement(node) && isExported(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const init = decl.initializer;
          let kind = "const";
          if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) kind = "function";
          exports.push({ kind, name, line: pos(decl) });
          if (kind === "function" && /^[A-Z]/.test(name)) components.push({ name, line: pos(decl) });
          if (kind === "function" && /^use[A-Z]/.test(name)) {
            // hook
            exports[exports.length - 1].kind = "hook";
          }
        }
      }
    } else if (ts.isClassDeclaration(node) && isExported(node) && node.name) {
      exports.push({ kind: "class", name: node.name.text, line: pos(node) });
    } else if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && isExported(node)) {
      exports.push({ kind: ts.isTypeAliasDeclaration(node) ? "type" : "interface", name: node.name.text, line: pos(node) });
    }

    // Switch statements
    if (ts.isSwitchStatement(node)) {
      const disc = node.expression.getText(sf).slice(0, 80);
      const arms = [];
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause)) arms.push(clause.expression.getText(sf).slice(0, 60));
      }
      if (arms.length) switches.push({ discriminator: disc, arms, line: pos(node) });
    }

    // JSX <Route path="..." element={...} />
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf);
      if (tag === "Route") {
        const pathAttr = node.attributes.properties.find(
          (a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "path"
        );
        if (pathAttr && ts.isJsxAttribute(pathAttr) && pathAttr.initializer) {
          let val = "";
          const init = pathAttr.initializer;
          if (ts.isStringLiteral(init)) val = init.text;
          else if (ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)) val = init.expression.text;
          if (val) routes.push({ path: val, line: pos(node) });
        }
      }
    }

    // JSX text — user-facing strings
    if (ts.isJsxText(node)) {
      const t = node.text.trim();
      if (t.length >= 2 && /[a-zA-Z]/.test(t)) jsxStrings.push({ text: t.slice(0, 200), line: pos(node) });
    }

    // toast({ title: "...", description: "..." }) / common UI strings
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      if (/(^|\.)toast$|sonner|useToast/.test(callee) && node.arguments.length) {
        const arg = node.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          for (const p of arg.properties) {
            if (ts.isPropertyAssignment(p) && (p.name.getText(sf) === "title" || p.name.getText(sf) === "description")) {
              if (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)) {
                jsxStrings.push({ text: p.initializer.text.slice(0, 200), line: pos(p), kind: "toast" });
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sf);

  results.push({
    file: rel,
    loc: text.split("\n").length,
    exports,
    components,
    routes,
    switches,
    jsxStrings: jsxStrings.slice(0, 200), // cap per-file noise
    imports: [...new Set(imports)],
  });
}

emit("ast-frontend", { fileCount: results.length, files: results });
