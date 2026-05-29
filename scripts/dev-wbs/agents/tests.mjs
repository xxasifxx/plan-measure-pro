#!/usr/bin/env node
// L1 parser: tests
// Each it()/test() title is one asserted intent. Captures describe nesting.
import { walk, read, emit, SRC } from "./_shared.mjs";

const files = walk(SRC, { include: (r) => /\.test\.(ts|tsx)$/.test(r) || r.includes("/test/") });

const out = [];

for (const rel of files) {
  if (!/\.(ts|tsx)$/.test(rel)) continue;
  const text = read(rel);
  const lines = text.split("\n");
  const stack = [];
  const intents = [];

  // Brittle regex; good enough for it/test/describe titles in this codebase.
  const re = /(describe|it|test)\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
  // Track nesting by scanning lines and counting open/close braces is overkill;
  // use a simple "current describe at each line" heuristic via depth markers.
  let depth = 0;
  let describeStack = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      const [, kind, , title] = m;
      if (kind === "describe") {
        describeStack.push({ title, depth });
      } else {
        intents.push({
          title,
          line: i + 1,
          describe: describeStack.map((d) => d.title),
        });
      }
    }
    // Adjust depth by net braces (loose)
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth += opens - closes;
    while (describeStack.length && describeStack[describeStack.length - 1].depth >= depth) describeStack.pop();
  }

  out.push({ file: rel, loc: lines.length, intents });
}

emit("tests", { fileCount: out.length, files: out });
