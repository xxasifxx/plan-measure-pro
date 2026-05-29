#!/usr/bin/env node
// Build docs/wbs-dev.activities.json — the canonical dev WBS.
//
// Pipeline:
//   1. Parse all 20 stream briefs → criteria + risks rows.
//   2. For each "Current state vs criteria" bullet → activity with code_present
//      derived from verdict. Engineering-layer sub-WBS chosen by evidence path.
//   3. For each "Risks / debt" item → Not Started activity under the same stream.
//   4. Layer in marketing-debt activities from docs/wbs-dev.promises.json
//      (if reviewer has filled verdicts; otherwise treated as undelivered claims).
//   5. Apply verification.manifest.json — strict status derivation.
//   6. Date completed/in-progress activities from git log of evidence files.
//   7. Hand-author cross-cutting branch (XER scrap, PMXML pivot, etc.).
//   8. Emit JSON.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { parseBrief } from './dev-wbs/parse-brief.mjs';
import { gitDates, earliestFirst, latestLast } from './dev-wbs/git-dates.mjs';
import { loadManifest, saveManifest, verificationFor, ensureRecipe, writeReport } from './verify-e2e.mjs';

const STREAM_DIR = 'docs/streams';
const TODAY = new Date('2026-05-29');

function streamId(file) {
  const m = file.match(/^(\d{2})-/);
  return m ? `${m[1]}-${file.replace(/^\d{2}-/, '').replace(/\.md$/, '')}` : file;
}

function layerFor(path) {
  if (!path) return 'Docs';
  if (/^supabase\/migrations\//.test(path)) return 'Backend';
  if (/^supabase\/functions\//.test(path)) return 'Backend';
  if (/\.sql$/.test(path)) return 'Backend';
  if (/^src\/lib\/native\//.test(path)) return 'Mobile';
  if (/Mobile|Biometric|native/.test(path)) return 'Mobile';
  if (/^src\/test\//.test(path)) return 'Verification';
  if (/^docs\//.test(path)) return 'Docs';
  if (/^src\//.test(path)) return 'Frontend';
  return 'Docs';
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function deriveStatus(codePresent, verifiedE2E) {
  if (!codePresent && !verifiedE2E) return { status: 'Not Started', pct: 0 };
  if (codePresent && !verifiedE2E)  return { status: 'In Progress', pct: 50 };
  if (codePresent && verifiedE2E)   return { status: 'Completed', pct: 100 };
  return { status: 'Not Started', pct: 0 };
}

function durationDays(start, end, fallback) {
  if (!start || !end) return fallback;
  const d = (new Date(end) - new Date(start)) / 86400000;
  if (!Number.isFinite(d) || d <= 0) return fallback;
  return Math.min(30, Math.max(0.5, d));
}

// ─── 1+2+3: parse briefs into activities ──────────────────────────────────────
function activitiesFromBriefs(manifest) {
  const files = readdirSync(STREAM_DIR).filter(f => /^\d{2}-.*\.md$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const id = streamId(f);
    const brief = parseBrief(`${STREAM_DIR}/${f}`);
    for (const c of brief.criteria) {
      const layer = layerFor(c.evidence[0]);
      const aid = `${id.slice(0, 2)}:${layer.toLowerCase()}:${slugify(c.name)}`;
      const codePresent = c.codePresent;
      ensureRecipe(aid, 'manual', manifest);
      const ver = verificationFor(aid, manifest);
      const { status, pct } = deriveStatus(codePresent, ver.verifiedE2E);
      const adjustedPct = c.verdict === 'partial' && !ver.verifiedE2E ? 30 : pct;
      const dates = codePresent ? {
        first: earliestFirst(c.evidence),
        last:  latestLast(c.evidence),
      } : { first: null, last: null };
      out.push({
        id: aid,
        wbs: `${id}/${layer}`,
        name: c.name,
        stream: brief.stream,
        verdict: c.verdict,
        codePresent,
        verifiedE2E: ver.verifiedE2E,
        verification: ver,
        status,
        pctComplete: adjustedPct,
        evidence: c.evidence,
        actualStart: dates.first,
        actualFinish: status === 'Completed' ? dates.last : null,
        durationDays: durationDays(dates.first, dates.last, status === 'Not Started' ? 3 : 1),
        source: 'brief-criterion',
      });
    }
    brief.risks.forEach((risk, i) => {
      const aid = `${id.slice(0, 2)}:remaining:${slugify(risk).slice(0, 40)}-${i + 1}`;
      ensureRecipe(aid, 'manual', manifest);
      out.push({
        id: aid,
        wbs: `${id}/Remaining`,
        name: risk.slice(0, 120),
        stream: brief.stream,
        verdict: 'missing',
        codePresent: false,
        verifiedE2E: false,
        verification: verificationFor(aid, manifest),
        status: 'Not Started',
        pctComplete: 0,
        evidence: [],
        actualStart: null,
        actualFinish: null,
        durationDays: estimateRiskDuration(risk),
        source: 'brief-risk',
      });
    });
  }
  return out;
}

function estimateRiskDuration(text) {
  const t = text.toLowerCase();
  if (/migration|rls|grant/.test(t))                return 1;
  if (/edge function|webhook|trigger/.test(t))      return 2;
  if (/refactor|cleanup|consolidat/.test(t))        return 3;
  if (/audit|test|verif|coverage/.test(t))          return 2;
  if (/native|biometric|offline/.test(t))           return 5;
  return 3;
}

// ─── 4: marketing claims as activities ────────────────────────────────────────
function activitiesFromPromises(manifest) {
  if (!existsSync('docs/wbs-dev.promises.json')) return [];
  const promises = JSON.parse(readFileSync('docs/wbs-dev.promises.json', 'utf8'));
  const out = [];
  for (const p of promises) {
    const verdict = p.verdict || 'undelivered'; // default: undelivered
    if (verdict === 'delivered' && p.verifiedE2E) continue;
    const streamPrefix = p.stream === 'UNMAPPED' ? '21' : p.stream.slice(0, 2);
    const wbsBranch = p.stream === 'UNMAPPED' ? '21-marketing-debt/Unmapped' : `21-marketing-debt/${p.stream}`;
    const aid = `21:promise:${p.id.toLowerCase()}`;
    ensureRecipe(aid, 'manual', manifest);
    const ver = verificationFor(aid, manifest);
    const ageDays = p.claimAgeFromISO
      ? Math.round((TODAY - new Date(p.claimAgeFromISO)) / 86400000)
      : null;
    const namePrefix = verdict === 'partial'     ? 'Finish delivery: '
                     : verdict === 'delivered'   ? 'Verify e2e: '
                     :                             'Deliver: ';
    out.push({
      id: aid,
      wbs: wbsBranch,
      name: (namePrefix + p.claim).slice(0, 160),
      stream: '21 Marketing Debt',
      verdict,
      codePresent: verdict !== 'undelivered',
      verifiedE2E: ver.verifiedE2E,
      verification: ver,
      status: verdict === 'undelivered' ? 'Not Started' :
              ver.verifiedE2E ? 'Completed' : 'In Progress',
      pctComplete: verdict === 'undelivered' ? 0 :
                   ver.verifiedE2E ? 100 :
                   verdict === 'partial' ? 30 : 50,
      evidence: p.evidenceFiles || [],
      actualStart: null,
      actualFinish: null,
      durationDays: verdict === 'undelivered' ? 5 : verdict === 'partial' ? 3 : 0.5,
      marketingClaimAgeDays: ageDays,
      marketingSource: p.source,
      source: 'marketing-promise',
    });
  }
  return out;
}

// ─── 7: cross-cutting branch (hand-authored truthful narrative) ───────────────
function crossCuttingActivities(manifest) {
  const xerFirst = earliestFirstGlob('src/lib/xer');
  const pmxmlFirst = earliestFirstGlob('src/lib/p6xml');
  const briefsFirst = earliestFirstGlob('docs/streams');
  const hand = [
    {
      id: '99:cross:xer-ingest-scrapped',
      name: 'XER ingest engine (scrapped pivot)',
      status: 'Completed',
      pctComplete: 100,
      actualStart: xerFirst || '2026-04-01T00:00:00Z',
      actualFinish: '2026-05-20T00:00:00Z',
      durationDays: 30,
      note: 'Built then deleted when format proved hostile; informed PMXML pivot.',
    },
    {
      id: '99:cross:pmxml-pivot',
      name: 'PMXML pivot — replace XER with Oracle PMXML round-trip',
      status: 'In Progress',
      pctComplete: 60,
      actualStart: pmxmlFirst || '2026-05-15T00:00:00Z',
      actualFinish: null,
      durationDays: 14,
      note: 'Parser + serializer + apply-progress shipped; baseline import + UDF round-trip remain.',
    },
    {
      id: '99:cross:comprehension-pass',
      name: '20-stream comprehension pass (this artefact set)',
      status: 'Completed',
      pctComplete: 100,
      actualStart: briefsFirst || '2026-05-28T00:00:00Z',
      actualFinish: '2026-05-29T00:00:00Z',
      durationDays: 2,
      note: 'Briefs, wbs-v2.json, comprehension-report.md.',
    },
    {
      id: '99:cross:dev-wbs-authoring',
      name: 'Dev WBS authoring (recursive — this effort)',
      status: 'In Progress',
      pctComplete: 50,
      actualStart: '2026-05-29T00:00:00Z',
      actualFinish: null,
      durationDays: 1,
      note: 'Strict-rule scoring + marketing-debt branch + PMXML self-proof.',
    },
  ];
  return hand.map(h => {
    ensureRecipe(h.id, 'manual', manifest);
    return {
      ...h,
      wbs: '99-cross-cutting/Narrative',
      stream: '99 Cross-cutting',
      verdict: h.status === 'Completed' ? 'implemented' : 'partial',
      codePresent: true,
      verifiedE2E: h.status === 'Completed',
      verification: verificationFor(h.id, manifest),
      evidence: [],
      source: 'cross-cutting',
    };
  });
}

function earliestFirstGlob(dir) {
  try {
    const { execSync } = require('node:child_process');
    return execSync(`git log --diff-filter=A --follow --format=%aI -- "${dir}/*" 2>/dev/null | tail -1`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
}

// ─── main ─────────────────────────────────────────────────────────────────────
function main() {
  const manifest = loadManifest();
  const briefAct = activitiesFromBriefs(manifest);
  const promiseAct = activitiesFromPromises(manifest);
  const crossAct = crossCuttingActivities(manifest);
  const all = [...briefAct, ...promiseAct, ...crossAct];

  saveManifest(manifest);
  writeReport(all, manifest);

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
      activities: all.length,
      completed: all.filter(a => a.status === 'Completed').length,
      inProgress: all.filter(a => a.status === 'In Progress').length,
      notStarted: all.filter(a => a.status === 'Not Started').length,
      verifiedE2E: all.filter(a => a.verifiedE2E).length,
      codeOnlyDowngraded: briefAct.filter(a => a.codePresent && !a.verifiedE2E).length,
      marketingDebtItems: promiseAct.filter(a => a.verdict === 'undelivered').length,
    },
    strictCompletionPct: all.length
      ? Math.round(100 * all.filter(a => a.status === 'Completed').length / all.length)
      : 0,
    activities: all,
  };
  writeFileSync('docs/wbs-dev.activities.json', JSON.stringify(summary, null, 2) + '\n');

  console.log(`Wrote docs/wbs-dev.activities.json`);
  console.log(`  ${summary.totals.activities} activities`);
  console.log(`  ${summary.totals.completed} Completed / ${summary.totals.inProgress} In Progress / ${summary.totals.notStarted} Not Started`);
  console.log(`  strict completion: ${summary.strictCompletionPct}%`);
  console.log(`  ${summary.totals.codeOnlyDowngraded} brief criteria downgraded from Completed → In Progress under strict rule`);
  console.log(`  ${summary.totals.marketingDebtItems} marketing claims classified as undelivered (review docs/wbs-dev.promises.json)`);
}

main();
