#!/usr/bin/env node
// Strict-rule verification gate.
//
// We do NOT spin up a browser here — that requires a running dev server, seeded
// auth, and an org/project fixture that the project does not yet ship. Instead
// this script honors the rule honestly: it loads a manifest of activity →
// verification recipe entries (docs/wbs-dev.verification.manifest.json), and
// for each one decides:
//   - kind=auto       → run the registered probe; pass/fail recorded
//   - kind=manual     → recipe shipped; status stays unverified until the
//                       reviewer flips `verifiedE2E: true` in the manifest
//   - kind=infeasible → cannot be verified end-to-end (e.g. native biometrics)
//                       → stays unverified; surfaced in report
//
// Output: docs/wbs-dev.verification.md + verification field on each activity.
//
// First run will mostly emit `unverified` results — that is the honest baseline
// the strict rule was meant to surface. The reviewer fills the manifest over
// time as e2e tests come online.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const MANIFEST_PATH = 'docs/wbs-dev.verification.manifest.json';

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    const seed = {
      _doc: 'Per-activity verification recipes. Keyed by activity id (STREAM:slug). kind=auto|manual|infeasible. For manual, fill verifiedE2E true once you have observed the flow with seeded data. Re-run scripts/build-dev-wbs.mjs to propagate.',
      activities: {},
    };
    mkdirSync('docs', { recursive: true });
    writeFileSync(MANIFEST_PATH, JSON.stringify(seed, null, 2) + '\n');
    return seed;
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(m) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
}

export function verificationFor(activityId, manifest) {
  const entry = manifest.activities?.[activityId];
  if (!entry) return { kind: 'manual', verifiedE2E: false, recipe: null, status: 'no-recipe' };
  return {
    kind: entry.kind || 'manual',
    verifiedE2E: !!entry.verifiedE2E,
    recipe: entry.recipe || null,
    status: entry.verifiedE2E ? 'pass' :
            entry.kind === 'infeasible' ? 'infeasible' :
            entry.kind === 'auto' ? 'auto-pending' : 'unverified',
  };
}

export function ensureRecipe(activityId, defaultKind, manifest) {
  manifest.activities ??= {};
  if (!manifest.activities[activityId]) {
    manifest.activities[activityId] = {
      kind: defaultKind,
      verifiedE2E: false,
      recipe: null,
    };
  }
}

export function writeReport(activities, manifest) {
  const lines = ['# WBS Verification Report', ''];
  lines.push('Strict rule: an activity is **Completed** only when its end-to-end flow is verified against seeded data. This document is the per-activity recipe register.\n');
  const buckets = { pass: [], 'auto-pending': [], unverified: [], infeasible: [], 'no-recipe': [] };
  for (const a of activities) {
    if (!a.verification) continue;
    (buckets[a.verification.status] ??= []).push(a);
  }
  for (const [bucket, rows] of Object.entries(buckets)) {
    lines.push(`## ${bucket} (${rows.length})\n`);
    for (const a of rows.slice(0, 50)) {
      lines.push(`- \`${a.id}\` — ${a.name}` + (a.verification.recipe ? ` — recipe: ${a.verification.recipe}` : ''));
    }
    if (rows.length > 50) lines.push(`- … +${rows.length - 50} more`);
    lines.push('');
  }
  writeFileSync('docs/wbs-dev.verification.md', lines.join('\n'));
}

export { loadManifest, saveManifest };

// CLI entrypoint: just touch the manifest so subsequent build runs see it.
if (import.meta.url === `file://${process.argv[1]}`) {
  const m = loadManifest();
  saveManifest(m);
  const n = Object.keys(m.activities || {}).length;
  console.log(`verification manifest ready — ${n} activity recipes registered`);
  console.log(`Fill ${MANIFEST_PATH} as you observe e2e flows with seed data.`);
}
