// Parses a stream brief into structured rows.
// Brief sections: ## Purpose / Surfaces / Acceptance criteria / Current state vs criteria / Cross-stream handoffs / Risks / debt
// Activity sources:
//   - "Current state vs criteria" bullets → completed/in-progress activities (code_present derived from verdict)
//   - "Risks / debt" numbered or bulleted items → remaining activities
import { readFileSync } from 'node:fs';

const VERDICT_RE = /\*\*(?<name>[^*]+?)\*\*\s*:\s*(?<verdict>[Ii]mplemented|[Pp]artial|[Mm]issing|[Uu]nverified|implemented for native)\b/;
const EVIDENCE_RE = /`([^`]+\.(?:ts|tsx|sql|mjs|json|md|toml))(?::\d[\d–\-,\s]*)?`/g;

export function parseBrief(path) {
  const text = readFileSync(path, 'utf8');
  const stream = (text.match(/^#\s+(.+)$/m) || [, 'Unknown'])[1].trim();
  const sections = splitSections(text);
  const criteria = parseCriteria(sections['Current state vs criteria'] || '');
  const risks = parseRisks(sections['Risks / debt'] || '');
  const handoffs = sections['Cross-stream handoffs'] || '';
  return { path, stream, criteria, risks, handoffs };
}

function splitSections(text) {
  const out = {};
  const parts = text.split(/^##\s+/m);
  for (const p of parts.slice(1)) {
    const nl = p.indexOf('\n');
    const heading = p.slice(0, nl).trim();
    out[heading] = p.slice(nl + 1);
  }
  return out;
}

function parseCriteria(body) {
  const lines = body.split('\n').filter(l => l.startsWith('- '));
  return lines.map(line => {
    const m = line.match(VERDICT_RE);
    if (!m) return null;
    const verdictRaw = m.groups.verdict.toLowerCase();
    let codePresent = false, partial = false, unverified = false;
    if (verdictRaw.startsWith('implement')) codePresent = true;
    else if (verdictRaw.startsWith('partial')) { codePresent = true; partial = true; }
    else if (verdictRaw === 'unverified') { unverified = true; }
    else if (verdictRaw.startsWith('missing')) { /* missing */ }
    const evidence = [];
    let em;
    EVIDENCE_RE.lastIndex = 0;
    while ((em = EVIDENCE_RE.exec(line)) !== null) evidence.push(em[1]);
    return {
      name: m.groups.name.trim(),
      verdict: partial ? 'partial' : unverified ? 'unverified' : codePresent ? 'implemented' : 'missing',
      codePresent,
      evidence,
      raw: line,
    };
  }).filter(Boolean);
}

function parseRisks(body) {
  // numbered or bulleted top-level items
  const items = [];
  const re = /^(?:\d+\.|-)\s+(.+(?:\n {3,}.+)*)/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    items.push(m[1].replace(/\n\s+/g, ' ').trim());
  }
  return items;
}
