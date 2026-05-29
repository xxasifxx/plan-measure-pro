#!/usr/bin/env node
// Scans landing + pitch pages + llms.txt for marketing claim sentences,
// emits docs/wbs-dev.promises.json with a hand-mappable stream assignment.
//
// Heuristic: any non-empty <li> body, headline (h1/h2/h3 text), or llms.txt
// bullet that contains a verb-phrase suggesting a feature claim. We deliberately
// over-collect — the user reviews the mapping table at checkpoint 1.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SOURCES = [
  { file: 'src/pages/Landing.tsx',   label: 'landing' },
  { file: 'src/pages/McfaPitch.tsx', label: 'mcfa-pitch' },
  { file: 'src/pages/FajarPitch.tsx', label: 'fajar-pitch' },
  { file: 'public/llms.txt',         label: 'llms' },
];

// Phrases inside JSX string literals — between > and < — at least 30 chars
const TEXT_RE = />\s*([^<>{}\n]{30,260}?)\s*</g;
// llms.txt: any line starting with '- '
const LLMS_BULLET_RE = /^- (.+)$/gm;

const VERB_HINTS = /\b(track|capture|export|import|sync|generate|approve|review|measure|calibrate|validate|enforce|integrate|annotate|render|upload|invite|notify|highlight|configure|comply|round-trip|round trip)\b/i;
const NOISE = /^(Loading|Sign in|Sign up|Get started|Learn more|Continue|Cancel|Submit|Email|Password|Name|Yes|No)$/i;

function extractFromTsx(file) {
  const text = readFileSync(file, 'utf8');
  const claims = new Set();
  let m;
  while ((m = TEXT_RE.exec(text)) !== null) {
    const phrase = m[1].replace(/\s+/g, ' ').trim();
    if (phrase.length < 30 || phrase.length > 220) continue;
    if (NOISE.test(phrase)) continue;
    if (!VERB_HINTS.test(phrase)) continue;
    if (/^[A-Z][A-Z\s]+$/.test(phrase)) continue; // all caps headers
    claims.add(phrase);
  }
  return [...claims];
}

function extractFromLlms(file) {
  const text = readFileSync(file, 'utf8');
  const out = [];
  let m;
  while ((m = LLMS_BULLET_RE.exec(text)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

function gitFirstDate(file) {
  try {
    return execSync(`git log --diff-filter=A --follow --format=%aI -- "${file}" | tail -1`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
}

// Seed mapping — keywords → stream id. Reviewer flips wrong assignments.
const KEYWORD_TO_STREAM = [
  [/\b(auth|sign[- ]in|sso|role|invit|tenant)/i,             '01-identity-and-access'],
  [/\b(portfolio|dashboard|home|pm view)/i,                  '02-portfolio-and-pm-home'],
  [/\b(onboard|kickoff|new project|setup)/i,                 '03-project-onboarding'],
  [/\b(pay item|item number|unit code|catalog)/i,            '04-pay-item-catalog'],
  [/\b(annotat|measure|calibrate|polygon|takeoff|pdf)/i,     '05-field-capture'],
  [/\b(daily report|dc form|inspector report)/i,             '06-daily-report-lifecycle'],
  [/\b(payment|quantit|approved|rollup|invoice)/i,           '07-quantity-to-payment'],
  [/\b(photo|image|gallery|evidence|exif)/i,                 '08-photo-evidence'],
  [/\b(standard spec|specification|7th edition|njta spec)/i, '09-standard-specifications'],
  [/\b(document|file repository|upload|attachment)/i,        '10-document-management'],
  [/\b(schedule|p6|pmxml|gantt|baseline|critical path|dcma)/i,'11-schedule-management'],
  [/\b(health|kpi|control|variance|trend)/i,                 '12-project-health-and-controls'],
  [/\b(export|csv|xlsx|pdf report|interop)/i,                '13-data-export-and-interoperability'],
  [/\b(geometry|geometric|vertex|cy|sy formula)/i,           '14-measurement-and-geometry-engine'],
  [/\b(offline|native|capacitor|sync queue|durab)/i,         '15-offline-and-native-durability'],
  [/\b(mobile|touch|tablet|field ergonom|fab)/i,             '16-mobile-field-ergonomics'],
  [/\b(notif|presence|realtime|collab)/i,                    '17-notifications-and-presence'],
  [/\b(audit|compliance|fhwa|chain of custody)/i,            '18-compliance-and-audit'],
  [/\b(tutorial|walkthrough|onboarding tour|demo mode)/i,    '19-onboarding-and-tutorials'],
  [/\b(pricing|enterprise|roi|contract)/i,                   '20-sales-and-pitch'],
];

function guessStream(text) {
  for (const [re, stream] of KEYWORD_TO_STREAM) if (re.test(text)) return stream;
  return 'UNMAPPED';
}

function main() {
  const promises = [];
  for (const { file, label } of SOURCES) {
    const firstDate = gitFirstDate(file);
    const claims = file.endsWith('.txt') ? extractFromLlms(file) : extractFromTsx(file);
    for (const c of claims) {
      promises.push({
        id: `PROM-${promises.length + 1}`,
        source: label,
        sourceFile: file,
        claimAgeFromISO: firstDate,
        claim: c,
        stream: guessStream(c),
        verdict: null,        // reviewer fills: delivered | partial | undelivered
        verifiedE2E: false,
        evidenceFiles: [],    // reviewer fills
      });
    }
  }
  mkdirSync('docs', { recursive: true });
  writeFileSync('docs/wbs-dev.promises.json', JSON.stringify(promises, null, 2) + '\n');
  const byStream = promises.reduce((acc, p) => { (acc[p.stream] ??= 0); acc[p.stream]++; return acc; }, {});
  console.log(`Extracted ${promises.length} marketing claims across ${Object.keys(byStream).length} stream buckets:`);
  for (const [s, n] of Object.entries(byStream).sort()) console.log(`  ${n.toString().padStart(3)}  ${s}`);
  console.log(`\nWrote docs/wbs-dev.promises.json`);
}

main();
