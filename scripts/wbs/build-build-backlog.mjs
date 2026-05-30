#!/usr/bin/env node
// Build .lovable/wbs/build-backlog.json — buildable backlog entries.
//
// Source sparse rows from:
//   - .lovable/wbs/capabilities.json  (criteria + risks per stream)
//   - docs/wbs-dev.promises.json      (marketing claims)
//   - docs/wbs-dev.verification.manifest.json (verification gaps)
//
// For every non-implemented row, emit an enriched entry with:
//   problem_statement, desired_behavior, build_scope (by layer), likely_files,
//   likely_tables, user_roles_affected, acceptance_criteria, verification_plan,
//   definition_of_done, blockers, dependencies, owner_role, estimate_days,
//   confidence.
//
// Scope/roles are inferred from keyword templates over the title+evidence text,
// so weak rows are surfaced honestly (confidence: low) rather than hidden.
import fs from 'node:fs';

const CAPS_PATH = '.lovable/wbs/capabilities.json';
const PROMISES_PATH = 'docs/wbs-dev.promises.json';
const MANIFEST_PATH = 'docs/wbs-dev.verification.manifest.json';
const OUT = '.lovable/wbs/build-backlog.json';

const caps = JSON.parse(fs.readFileSync(CAPS_PATH, 'utf8'));
const promises = fs.existsSync(PROMISES_PATH) ? JSON.parse(fs.readFileSync(PROMISES_PATH, 'utf8')) : [];
const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { activities: {} };

const STREAM_TITLES = Object.fromEntries(
  Object.entries(caps.streams).map(([k, v]) => [k, v.title || k])
);

// ─── keyword → scope templates ────────────────────────────────────────────────
const SCOPE_TEMPLATES = [
  {
    match: /\brls\b|policy|policies|grant|service[_ ]role|auth\.uid/i,
    label: 'security/RLS',
    owner_role: 'Backend Engineer',
    build_scope: {
      backend: ['Audit existing policies; document policy matrix per table/role'],
      data_model: ['Add/adjust RLS policies and grants for affected tables'],
      tests: ['Seed owner/manager/inspector/outsider users; assert allow/deny per CRUD per table'],
      docs: ['Update security memory with policy decisions'],
    },
    acceptance_criteria: [
      'Outsider cannot read, insert, update or delete affected rows.',
      'Each defined role can perform exactly the actions documented.',
      'Storage objects (if any) are scoped by project membership.',
    ],
    verification_plan: 'Automated SQL/REST tests run against seeded user fixtures; matrix recorded in build artefact.',
    days_base: 4,
  },
  {
    match: /\bmigration\b|table missing|\bcolumn\b|schema|foreign key|index/i,
    label: 'schema/migration',
    owner_role: 'Backend Engineer',
    build_scope: {
      data_model: ['Write Supabase migration: table/column/index/grants/RLS'],
      backend: ['Refresh generated types; update server-side queries'],
      frontend: ['Update queries and types in affected components/hooks'],
      tests: ['Insert+select round-trip under owner/inspector roles'],
      docs: ['Note schema change rationale and rollout in stream brief'],
    },
    acceptance_criteria: [
      'Migration applies cleanly forward; generated types include new fields.',
      'Affected UI reads/writes the new shape with no `as any` casts.',
      'Existing rows are backfilled or default to a safe value.',
    ],
    verification_plan: 'Run migration; verify select/insert from app under each role; verify zero TypeScript `as any` casts remain on the path.',
    days_base: 4,
  },
  {
    match: /edge function|webhook|trigger|cron|fcm|notification/i,
    label: 'edge/webhook',
    owner_role: 'Backend Engineer',
    build_scope: {
      edge_functions: ['Implement/extend Supabase edge function; handle auth and idempotency'],
      backend: ['Add DB trigger or job invocation'],
      tests: ['Invoke locally with fixtures; assert side effects and error paths'],
      docs: ['Record secrets/env requirements'],
    },
    acceptance_criteria: [
      'Function returns 2xx for valid payloads, 4xx for invalid, 5xx never on expected inputs.',
      'Triggered side effect is observable in the database/log.',
      'Replays are idempotent.',
    ],
    verification_plan: 'Curl the function under each role; tail edge logs; observe row/state change.',
    days_base: 5,
  },
  {
    match: /offline|indexeddb|sync|queue|conflict|service worker|pwa/i,
    label: 'offline/sync',
    owner_role: 'Frontend Engineer',
    build_scope: {
      offline_native: ['Persist payload in IndexedDB; queue mutation with retry'],
      frontend: ['Surface online/offline state and pending-sync badge'],
      tests: ['Toggle offline in DevTools; assert queue drains on reconnect; assert no duplicate rows'],
      docs: ['Document conflict resolution rule'],
    },
    acceptance_criteria: [
      'A mutation performed offline persists locally and replays exactly once when online.',
      'Conflict path has a defined resolution rule and surfaces it to the user.',
      'No silent data loss on reload while offline.',
    ],
    verification_plan: 'Manual airplane-mode run + Playwright offline test against a seeded project.',
    days_base: 6,
  },
  {
    match: /biometric|native|capacitor|camera|gps|geolocation/i,
    label: 'native',
    owner_role: 'Mobile Engineer',
    build_scope: {
      offline_native: ['Implement native plugin path; add web fallback'],
      frontend: ['Gate UI by platform capability; handle permission denial'],
      tests: ['Run on device build; assert permission prompt + denial UX'],
      docs: ['Document capabilities required in app config'],
    },
    acceptance_criteria: [
      'Native path works on iOS/Android builds.',
      'Web path either provides an equivalent or shows a clear unavailable state.',
      'Permission denial does not crash or block unrelated flows.',
    ],
    verification_plan: 'Device smoke test + web fallback test; manifest entry recorded as verified-e2e.',
    days_base: 6,
  },
  {
    match: /export|pdf|excel|xlsx|csv|report|dc-?\d|dc form/i,
    label: 'export/report',
    owner_role: 'Frontend Engineer',
    build_scope: {
      frontend: ['Implement export action; format rows; trigger download'],
      backend: ['Provide approved-quantity view or query as data source'],
      tests: ['Snapshot the generated file against a fixture project'],
      docs: ['Capture target format reference (NJTA/NJDOT)'],
    },
    acceptance_criteria: [
      'Generated file opens cleanly in the target tool (Excel/Acrobat).',
      'Numbers match the approved (not raw) quantity source.',
      'Filename and headers follow the documented standard.',
    ],
    verification_plan: 'Generate against seeded project; diff against committed golden file.',
    days_base: 4,
  },
  {
    match: /measur|geometry|polygon|polyline|area|length|calibrat/i,
    label: 'measurement',
    owner_role: 'Frontend Engineer',
    build_scope: {
      frontend: ['Geometry calc + persisted normalized coordinates'],
      tests: ['Unit tests for area/length under varying calibration scales'],
      docs: ['Document rounding + unit conversion rules'],
    },
    acceptance_criteria: [
      'Measurement matches expected value within documented tolerance.',
      'Result is independent of zoom and pan.',
      'Unit conversion (SF→SY, CF→CY) is correct and documented.',
    ],
    verification_plan: 'Unit tests + visual regression on a fixture PDF.',
    days_base: 4,
  },
  {
    match: /audit|compliance|reviewer|approval|sign-?off/i,
    label: 'compliance/audit',
    owner_role: 'Backend Engineer',
    build_scope: {
      data_model: ['Add audit_log table (actor, action, target, before/after, at)'],
      backend: ['Write trigger or app-level audit emission on mutation paths'],
      frontend: ['Surface audit trail in PM/RE review UI'],
      tests: ['Assert one audit row per mutation; immutable after write'],
      docs: ['Retention + access policy for audit data'],
    },
    acceptance_criteria: [
      'Every mutation on audited tables produces exactly one audit row.',
      'Audit rows are immutable to non-admins.',
      'Reviewer UI can filter and export the audit trail.',
    ],
    verification_plan: 'CRUD a fixture row; assert audit_log content; attempt update as non-admin and expect denial.',
    days_base: 5,
  },
  {
    match: /touch target|44px|mobile|responsive|tap|gesture/i,
    label: 'mobile-ux',
    owner_role: 'Frontend Engineer',
    build_scope: {
      frontend: ['Enforce 44px minimum touch targets; review hit areas'],
      tests: ['Storybook/Playwright check viewport ≤ 768px; assert tap target size'],
      docs: ['Add mobile UX guideline note'],
    },
    acceptance_criteria: [
      'All interactive elements ≥ 44×44 CSS px on mobile.',
      'Primary flows complete on a 375px-wide viewport without horizontal scroll.',
    ],
    verification_plan: 'Manual device check + axe/Playwright assertion in mobile viewport.',
    days_base: 3,
  },
  {
    match: /react query|cache|invalidat|stale/i,
    label: 'state/cache',
    owner_role: 'Frontend Engineer',
    build_scope: {
      frontend: ['Add queryKey + invalidateQueries on relevant mutations'],
      tests: ['Assert refetch happens after mutation across components'],
      docs: ['Document query key conventions for this domain'],
    },
    acceptance_criteria: [
      'After a mutation, dependent views refresh without manual reload.',
      'No stale data persists past 30s for collaborator-visible state.',
    ],
    verification_plan: 'Two-tab manual run; Playwright test asserting visible refresh.',
    days_base: 2,
  },
  {
    match: /demo|walkthrough|landing|pitch|marketing/i,
    label: 'marketing/demo',
    owner_role: 'Frontend Engineer',
    build_scope: {
      frontend: ['Build the route or section that fulfils the claim'],
      tests: ['e2e walkthrough against the seeded demo dataset'],
      docs: ['Mark claim verified in promises.json'],
    },
    acceptance_criteria: [
      'A first-time visitor can complete the claimed flow end-to-end without console errors.',
      'The flow is reachable from the link/CTA referenced by the claim.',
    ],
    verification_plan: 'Playwright run starting at the public URL; screenshot diff for hero state.',
    days_base: 4,
  },
];

const DEFAULT_TEMPLATE = {
  label: 'general',
  owner_role: 'Frontend Engineer',
  build_scope: {
    frontend: ['Implement the behaviour described; cover empty/error states'],
    tests: ['Add at least one assertion that fails today and passes after'],
    docs: ['Update stream brief to mark this criterion implemented'],
  },
  acceptance_criteria: ['Behaviour described in the title is reproducible end-to-end.'],
  verification_plan: 'Manual reproduction script + automated assertion if practical.',
  days_base: 3,
};

function pickTemplates(text) {
  const hits = SCOPE_TEMPLATES.filter((t) => t.match.test(text));
  return hits.length ? hits : [DEFAULT_TEMPLATE];
}

function mergeScopes(templates) {
  const merged = { frontend: [], backend: [], data_model: [], edge_functions: [], offline_native: [], tests: [], docs: [] };
  for (const t of templates) {
    for (const k of Object.keys(merged)) {
      const v = t.build_scope?.[k];
      if (v) merged[k].push(...v);
    }
  }
  for (const k of Object.keys(merged)) merged[k] = [...new Set(merged[k])];
  return merged;
}

function rolesAffected(text) {
  const out = new Set();
  if (/admin|owner|org/i.test(text)) out.add('Admin');
  if (/manager|\bpm\b|project manager/i.test(text)) out.add('Project Manager');
  if (/inspector|field/i.test(text)) out.add('Inspector');
  if (/resident engineer|\bre\b|reviewer|approval/i.test(text)) out.add('Resident Engineer');
  if (!out.size) out.add('All authenticated');
  return [...out];
}

function estimate(templates, src) {
  let d = Math.max(...templates.map((t) => t.days_base || 3));
  if (src.verdict === 'partial') d -= 1;
  if (src.severity === 'high') d += 2;
  if (src.severity === 'medium') d += 1;
  if ((src.needs_files || []).length >= 1) d += 1;
  if ((src.files || []).length >= 3) d += 1;
  return Math.max(1, Math.min(15, d));
}

function confidence(text, templates) {
  if (templates[0] === DEFAULT_TEMPLATE) return 'low';
  if (text.length < 60) return 'low';
  if (templates.length >= 2) return 'high';
  return 'medium';
}

function likelyTables(text) {
  const t = [];
  const candidates = [
    'projects', 'project_members', 'pay_items', 'annotations', 'calibrations',
    'profiles', 'user_roles', 'daily_reports', 'daily_report_snapshots',
    'annotation_photos', 'contract_mods', 'audit_log', 'demo_requests',
    'notifications', 'organizations', 'invitations',
  ];
  for (const c of candidates) if (new RegExp(`\\b${c}\\b`, 'i').test(text)) t.push(c);
  return t;
}

function entryFromCapability(streamKey, c) {
  if (c.verdict === 'implemented') return null;
  const text = `${c.title || ''} ${c.evidence || ''}`;
  const templates = pickTemplates(text);
  const scope = mergeScopes(templates);
  const scopeLabel = templates.map((t) => t.label).join('+');
  const tables = likelyTables(text);
  const days = estimate(templates, c);
  const verbosity = c.kind === 'risk' ? 'Resolve risk' : c.verdict === 'partial' ? 'Finish' : 'Build';
  return {
    id: `BB-${c.id}`,
    stream: streamKey,
    stream_title: STREAM_TITLES[streamKey] || streamKey,
    source_id: c.id,
    source_type: c.kind === 'risk' ? 'risk' : c.verdict === 'partial' ? 'capability_partial' : 'capability_missing',
    source_verdict: c.verdict,
    source_severity: c.severity || null,
    title: `${verbosity}: ${(c.title || '').slice(0, 140)}`,
    problem_statement:
      c.evidence ||
      (c.kind === 'risk'
        ? 'Identified risk has no mitigation in place. See source capability for context.'
        : 'No code path satisfies this acceptance criterion today.'),
    desired_behavior: c.title || '(see source)',
    build_scope: scope,
    scope_label: scopeLabel,
    likely_files: c.files || [],
    likely_tables: tables,
    user_roles_affected: rolesAffected(text),
    acceptance_criteria: [...new Set(templates.flatMap((t) => t.acceptance_criteria || []))],
    verification_plan: templates[0].verification_plan,
    definition_of_done:
      'Code merged, automated check green, manifest verified-e2e flipped to true, and stream brief criterion verdict updated to implemented.',
    blockers: (c.needs_files || []).map((f) => `Missing source: ${f}`),
    dependencies: [],
    owner_role: templates[0].owner_role,
    estimate_days: days,
    confidence: confidence(text, templates),
  };
}

function entryFromPromise(p) {
  const stream = p.stream === 'UNMAPPED' ? '21-marketing-debt' : p.stream;
  const text = `marketing demo walkthrough ${p.claim}`;
  const templates = pickTemplates(text);
  const scope = mergeScopes(templates);
  return {
    id: `BB-${p.id}`,
    stream,
    stream_title: STREAM_TITLES[stream] || (p.stream === 'UNMAPPED' ? 'Marketing Debt' : stream),
    source_id: p.id,
    source_type: 'marketing_promise',
    source_verdict: p.verdict || 'undelivered',
    source_severity: null,
    title: `Deliver marketing claim: ${p.claim.slice(0, 120)}`,
    problem_statement: `Public surface (${p.source}/${p.sourceFile}) claims: "${p.claim}". No verified-e2e proof exists.`,
    desired_behavior: 'A visitor can perform the claimed action end-to-end from the referenced surface.',
    build_scope: scope,
    scope_label: templates.map((t) => t.label).join('+'),
    likely_files: [p.sourceFile],
    likely_tables: [],
    user_roles_affected: ['Anonymous visitor'],
    acceptance_criteria: [
      'Claim is reachable from the public surface without auth where appropriate.',
      'A Playwright run completes the implied flow without console errors.',
      'promises.json verdict set to delivered + verifiedE2E true.',
    ],
    verification_plan: 'Playwright e2e + screenshot diff; update promises.json verdict.',
    definition_of_done: 'Claim verifiedE2E in promises.json; surface screenshot committed as evidence.',
    blockers: [],
    dependencies: [],
    owner_role: 'Frontend Engineer',
    estimate_days: 4,
    confidence: p.stream === 'UNMAPPED' ? 'low' : 'medium',
  };
}

function entryFromVerificationGap(activityId, rec) {
  return {
    id: `BB-VER-${activityId}`,
    stream: activityId.startsWith('99') ? '99-cross-cutting' : `${activityId.slice(0, 2)}-`,
    stream_title: 'Verification',
    source_id: activityId,
    source_type: 'verification_gap',
    source_verdict: 'unverified',
    source_severity: null,
    title: `Verify e2e: ${activityId}`,
    problem_statement: `Activity ${activityId} has no verified-e2e recipe; only manual claim.`,
    desired_behavior: 'A repeatable automated recipe proves the activity works against seed data.',
    build_scope: {
      frontend: [],
      backend: [],
      data_model: [],
      edge_functions: [],
      offline_native: [],
      tests: ['Author Playwright/SQL recipe; seed required fixtures'],
      docs: ['Record recipe path in verification.manifest.json'],
    },
    scope_label: 'verification',
    likely_files: [],
    likely_tables: [],
    user_roles_affected: ['Verifier'],
    acceptance_criteria: [
      'Recipe runs in CI and passes.',
      'Manifest entry flips kind from manual to e2e and verifiedE2E to true.',
    ],
    verification_plan: 'Run recipe locally + in CI; both green.',
    definition_of_done: 'Manifest updated; recipe committed under scripts/verify or src/test.',
    blockers: [],
    dependencies: [],
    owner_role: 'QA Engineer',
    estimate_days: 2,
    confidence: 'medium',
  };
}

// ─── build ────────────────────────────────────────────────────────────────────
const entries = [];

for (const [streamKey, s] of Object.entries(caps.streams)) {
  for (const c of s.capabilities || []) {
    const e = entryFromCapability(streamKey, c);
    if (e) entries.push(e);
  }
}

for (const p of promises) {
  if (p.verdict === 'delivered' && p.verifiedE2E) continue;
  entries.push(entryFromPromise(p));
}

const verActs = manifest.activities || {};
for (const [aid, rec] of Object.entries(verActs)) {
  if (rec && rec.kind === 'manual' && !rec.verifiedE2E) {
    entries.push(entryFromVerificationGap(aid, rec));
  }
}

// ─── totals ───────────────────────────────────────────────────────────────────
const totals = {
  entries: entries.length,
  by_source_type: {},
  by_stream: {},
  by_confidence: {},
  by_owner_role: {},
  total_estimate_days: 0,
};
for (const e of entries) {
  totals.by_source_type[e.source_type] = (totals.by_source_type[e.source_type] || 0) + 1;
  totals.by_stream[e.stream] = (totals.by_stream[e.stream] || 0) + 1;
  totals.by_confidence[e.confidence] = (totals.by_confidence[e.confidence] || 0) + 1;
  totals.by_owner_role[e.owner_role] = (totals.by_owner_role[e.owner_role] || 0) + 1;
  totals.total_estimate_days += e.estimate_days;
}

const out = {
  generatedAt: new Date().toISOString(),
  source_counts: {
    capabilities_total: Object.values(caps.streams).reduce((n, s) => n + (s.capabilities || []).length, 0),
    promises_total: promises.length,
    verification_activities_total: Object.keys(verActs).length,
  },
  totals,
  entries,
};

fs.mkdirSync('.lovable/wbs', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`[build-backlog] wrote ${OUT} — ${entries.length} entries, ${totals.total_estimate_days}d total`);
