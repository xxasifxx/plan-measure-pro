# Revised plan: make the WBS describe what must be built

You’re right. The actual entries are too thin to drive product completion.

## What I confirmed from the actual rows

The current WBS entries are mostly labels, not build instructions:

- `docs/wbs-dev.activities.json` has **154 activities**, but:
  - `description`: 0
  - `acceptanceCriteria`: 0
  - `steps/tasks`: 0
  - `owner`: 0
  - `dependencies/predecessors`: 0
  - `definitionOfDone`: 0
  - `testPlan`: 0
  - `implementationNotes`: 0
- `.lovable/wbs/capabilities.json` has **188 capabilities**, but the same missing build fields are also 0.
- `docs/wbs-dev.leaves.json` has **417 leaves**, but most are just file clusters or surface names.
- Many rows are truncated observations, not work items. Example:
  - `Password reset` only says the recovery event is fragile. It does not say what to build: fallback hash/session parsing, timeout state, resend path, route guard, tests, or acceptance behavior.
  - `RLS posture` says no migration audits joins/storage policies. It does not list the tables, policies, deny/allow cases, test users, or verification matrix.
  - `Contract quantity stored...` says no `contract_mods` table. It does not specify schema, audit behavior, UI flow, who can approve, variance rules, export effects, or tests.
  - Marketing promises have claims like “Walk the site. Measure automatically.” with no decomposition into demo flow, measurement fixtures, verification, or claim owner.

So the fix is not another summary view. The WBS needs a new artifact: **buildable backlog entries**.

## What I will build

Add a new WBS layer called **Build Backlog** that converts every sparse capability/risk/promise into explicit work entries with enough detail to execute.

Each build backlog row will include:

```ts
{
  id,
  stream,
  source_id,
  source_type, // capability | risk | marketing_promise | verification_gap | code_leaf
  title,
  problem_statement,
  current_evidence,
  desired_behavior,
  build_scope: {
    frontend: string[],
    backend: string[],
    data_model: string[],
    edge_functions: string[],
    offline_native: string[],
    tests: string[],
    docs: string[]
  },
  likely_files,
  likely_tables,
  user_roles_affected,
  acceptance_criteria,
  verification_plan,
  definition_of_done,
  blockers,
  dependencies,
  owner_role,
  estimate_days,
  confidence
}
```

## New files

### 1. `.lovable/wbs/build-backlog.json`
Canonical detailed backlog. This becomes the real “what needs to be built” dataset.

### 2. `public/wbs/build-backlog.json`
Published version consumed by `/wbs`.

### 3. `scripts/wbs/build-build-backlog.mjs`
Generator that reads:

- `.lovable/wbs/capabilities.json`
- `.lovable/wbs/comprehension.json`
- `docs/wbs-dev.activities.json`
- `docs/wbs-dev.leaves.json`
- `docs/wbs-dev.promises.json`
- `docs/wbs-dev.verification.manifest.json`
- `docs/streams/*.md`

It will not merely copy titles. It will expand rows using templates by source type and domain keywords.

Examples:

- RLS/security gap → table-policy matrix, role matrix, deny tests, allow tests, storage policy checks.
- Missing table/schema gap → migration, grants, RLS, generated type refresh expectation, UI integration, seed data, e2e check.
- Offline/native gap → persistence model, retry behavior, conflict behavior, device test, web fallback.
- Measurement gap → geometry rules, units, calibration dependency, rounding, annotation storage, export behavior, visual regression.
- Marketing promise → claim, required product behavior, proof route, demo data, screenshot/e2e evidence, claim status.
- Verification gap → seeded scenario, actor, route, setup data, expected assertion.

### 4. `scripts/wbs/build-all.mjs`
Wire `build-build-backlog.mjs` into the pipeline before schedule publishing.

### 5. `scripts/wbs/publish-public.mjs`
Publish the build backlog JSON.

## `/wbs` UI changes

Add a new default tab: **Build Backlog**.

This tab will show:

1. **Sparse-source warning**
   - Count of entries missing build detail.
   - Count of generated buildable backlog rows.
   - Count of rows still low confidence.

2. **Buildable work table**
   Columns:
   - Stream
   - Work item
   - Problem
   - Desired behavior
   - Scope chips: Frontend / Backend / DB / Tests / Docs / Native
   - Owner role
   - Estimate
   - Dependencies
   - Confidence

3. **Expandable detail drawer per row**
   Shows:
   - Current evidence
   - Likely files/tables
   - Acceptance criteria
   - Verification plan
   - Definition of done
   - Blockers

4. **Filters**
   - Stream
   - Source type
   - Scope
   - Owner role
   - Confidence
   - Missing verification only
   - Marketing debt only

5. **Keep existing views**
   Existing Files/Schedule tabs stay, but they become supporting context instead of pretending to be the completion plan.

## Important behavior

- Existing sparse entries are not deleted.
- The new build backlog references the sparse row via `source_id`, so the audit trail remains intact.
- Generated rows are marked with `confidence`; weakly inferred rows are surfaced instead of hidden.
- No database/backend changes are needed.
- No dependency installs are needed.

## Example target transformation

Current row:

```json
{
  "name": "RLS posture",
  "verdict": "partial",
  "evidence": [],
  "durationDays": 1
}
```

New build backlog row:

```json
{
  "title": "Complete project-data RLS audit and enforcement",
  "problem_statement": "Core project tables have RLS enabled, but cross-table membership joins and storage bucket policies are not audited as an end-to-end access matrix.",
  "desired_behavior": "Unauthenticated users read no project data; authenticated users can access only projects where they are owner/member; inspectors remain scoped to assigned projects; storage paths follow the same rules.",
  "build_scope": {
    "backend": ["Audit policies for projects, project_members, pay_items, annotations, calibrations, daily reports, documents"],
    "data_model": ["Confirm grants and RLS policies on all project-scoped public tables"],
    "tests": ["Seed owner, manager, inspector, outsider users and assert allow/deny matrix"],
    "docs": ["Record policy matrix and exception cases"]
  },
  "acceptance_criteria": [
    "Outsider cannot select, insert, update, or delete rows for another project",
    "Inspector can read assigned project setup but cannot modify PM-only setup",
    "Storage objects cannot be fetched outside project membership",
    "Automated verification covers at least one allowed and denied case per table family"
  ],
  "definition_of_done": "Policy matrix documented, tests pass against seeded users, and /wbs marks the verification recipe complete."
}
```

That is the level of detail I will generate and surface.