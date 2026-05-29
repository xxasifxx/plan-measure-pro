#!/usr/bin/env node
// L1 parser: docs-streams
// Strict parser for docs/streams/*.md. Expects sections: Purpose, Surfaces,
// Acceptance, Current state. Each Acceptance + Current state bullet becomes
// a separate intent record that downstream comprehenders bind to anchors.
import { walk, read, emit, DOCS } from "./_shared.mjs";

const files = walk(`${DOCS}/streams`, { include: (r) => r.endsWith(".md") && !/README\.md$/.test(r) });

function splitSections(md) {
  const sections = {};
  const lines = md.split("\n");
  let current = null;
  let buf = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (current) sections[current] = buf.join("\n").trim();
      current = h[1].trim();
      buf = [];
    } else if (current) {
      buf.push(line);
    }
  }
  if (current) sections[current] = buf.join("\n").trim();
  return sections;
}

function bullets(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.match(/^[-*]\s+(.*\S)\s*$/))
    .filter(Boolean)
    .map((m) => m[1]);
}

const out = files.map((rel) => {
  const text = read(rel);
  const title = (text.match(/^#\s+(.+)$/m) || [, ""])[1];
  const slug = rel.split("/").pop().replace(/\.md$/, "");
  const sections = splitSections(text);
  return {
    file: rel,
    slug,
    streamNum: parseInt(slug.split("-")[0], 10),
    title: title.trim(),
    purpose: sections["Purpose"] || sections["Purpose & promise"] || "",
    surfaces: bullets(sections["Surfaces"] || sections["Key surfaces"] || ""),
    acceptance: bullets(sections["Acceptance"] || sections["Acceptance criteria"] || ""),
    currentState: bullets(sections["Current state"] || sections["Current state (HEAD)"] || sections["Status"] || ""),
    risks: bullets(sections["Risks"] || sections["Open risks"] || ""),
    sections: Object.keys(sections),
  };
});

emit("docs-streams", { streamCount: out.length, streams: out });
