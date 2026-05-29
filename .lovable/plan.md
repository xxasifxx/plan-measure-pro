## Phase C revision — deepen scheduling & resource-management leaves before freeze

You're right. Closing now would freeze a WBS whose Takeoff/PDF side is leaf-rich and whose Scheduling/Resources side is one-liner thin. The current YAMLs treat Fajar as a single marketing pitch page (`MKT-fajar`) when it actually represents the **resource-management product path** — equipment fleet, crew, role rates, utilization, leveling. The gap is structural, not cosmetic.

### Diagnosis: what we have vs. what P6 has

Current scheduling leaves (21 SCH-### in `wbs-scheduling-controls-reporting.yaml`) cover CPM, ALAP, calendars, baselines, activities CRUD, Gantt, XER import, PMXML round-trip, Gantt-from-image, DCMA, TIA, SPI/CPI, NJDOT WBS. **What's missing or one-line-thin** compared to P6:

- **Resource module** — only "TASKRSRC import" and "cost parsing for ACWP/BCWP" as sub-tasks. No full leaves for: resource library/dictionary, resource codes, resource calendars (distinct from activity calendars), role vs. resource modeling, role rates with effective-date stacks, resource curves (front/back/bell-loaded), resource shifts, resource teams.
- **Resource assignment** — `ResourceManager.tsx` exists but has zero sub-tasks in the WBS. No leaves for: multi-resource per activity, role→resource staffing, unit/time vs. budgeted-units modes, expense items, material quantity tracking against pay items.
- **Resource leveling** — completely absent. No leaves for: priority-based leveling, max-units-per-period enforcement, preserve-scheduled-early-dates option, level within float, smoothing vs. leveling, what-if scenarios.
- **Resource analytics** — absent. No leaves for: resource histograms, stacked-resource-by-activity view, over-allocation report, utilization %, S-curve (resource units + cost), spread by period (day/week/month).
- **Cost module** — only "TASKRSRC cost parsing" sub-task. No leaves for: cost accounts hierarchy, expense items separate from resources, budgeted vs. actual vs. remaining cost rollups, cost variance reports independent of EVM.
- **Risk & contingency** — absent. No leaves for: risk register, risk-adjusted schedule (Monte Carlo or 3-point), schedule contingency activities, weather-day calendar.
- **Reflection / what-if** — absent. No leaves for: copy schedule as scenario, scenario compare, branch-and-merge of schedule edits.
- **Claims / delay analysis beyond TIA** — thin. No leaves for: windows analysis, time-impact-analysis variants (impacted-as-planned, collapsed-as-built), as-built schedule capture from daily reports.
- **Code libraries** — absent. No leaves for: activity codes, project codes, resource codes, EPS (Enterprise Project Structure).
- **Notebook / steps** — absent. No leaves for: activity steps with weighted % complete, activity notebook topics, activity feedback from field.

### Fajar reframed: the resource-management product path

Fajar is currently `MKT-fajar` (one leaf: a pitch page). The user-facing pitch is the **tip** of a product path. The path is:

```
Fajar pitch (sales artifact)
  → Equipment-rental fleet model (units, categories, day-rates, utilization)
  → Crew composition (operator + equipment as bundled resource)
  → Day-rate billing export to invoicing
  → Fleet utilization dashboard (idle vs. assigned, by yard)
  → Equipment maintenance windows as calendar exceptions
  → Cross-project resource pool (one excavator, many projects)
  → Resource leveling against the shared pool
  → Rental P&L per unit per project
```

Every arrow above is a planned leaf the current WBS does not contain. Treating Fajar as a marketing leaf alone hides ~12 capability leaves of resource-management work.

### Plan — deepen, then close

I'll spawn **four parallel capable subagents**, each scoped to one gap area, before any freeze. No code or WBS files written until you approve the freeze.

**Subagent 1 — Resource management module (P6-parity)**
Produce `/mnt/documents/wbs-resource-management.yaml` covering: resource library, resource calendars, roles + rates, resource assignments (multi-resource, role-staffing), resource curves, resource leveling (full algorithm leaf with sub-tasks for priority rules, max-units enforcement, level-within-float, smoothing), resource histograms + S-curves, over-allocation report, resource codes, resource teams/shifts. Each leaf with status (mostly `aspirational`/`planned`), durationDays, 4–7 sub-tasks, prerequisites pointing into existing SCH-### leaves.

**Subagent 2 — Fajar resource-management product path**
Produce `/mnt/documents/wbs-fajar-product.yaml` with the 12-leaf path above. Each leaf links upstream to Subagent 1's resource leaves as prerequisites, and downstream to existing marketing/pricing/auth leaves. Distinguish the **Fajar pitch artifact** (shipped MKT-fajar) from the **Fajar product capability** (planned/aspirational FAJ-### leaves).

**Subagent 3 — Cost, EVM, risk, claims, scenarios**
Produce `/mnt/documents/wbs-cost-risk-claims.yaml` covering: cost accounts hierarchy, expense items, budgeted/actual/remaining rollups, full EVM (BCWS/BCWP/ACWP/EAC/VAC/SPI/CPI/TCPI) as separate leaves from current "TASKRSRC parsing" sub-task, risk register, 3-point estimation + Monte Carlo, weather calendar, schedule contingency activity pattern, claims analysis (windows, impacted-as-planned, collapsed-as-built), as-built schedule from daily-report data-date snapshots, scenario/reflection branch+merge.

**Subagent 4 — Scheduling extras + cross-cutting depth audit**
Produce `/mnt/documents/wbs-scheduling-extras.yaml` covering: activity codes, project codes, EPS, activity steps with weighted %, activity notebook, field feedback loop. Then audit **all existing 204 leaves** across the 6 YAMLs for one-line sub-tasks and emit `/mnt/documents/wbs-depth-audit.md` flagging any leaf whose sub-tasks are <4 or look like a heading rather than work. Output an actionable patch list of leaves needing expansion.

### After subagents return

1. I review their outputs and the depth-audit patch list, then come back to you with:
   - Summary of new leaves added per surface (delta from ~204 baseline).
   - List of leaves the audit flagged for expansion, with proposed new sub-tasks inline.
   - Revised Phase C close-out sequence (consolidate → reconcile → split megacluster → freeze).
2. You either approve the freeze or redline the additions.
3. **Only then** do I switch to build mode and write `scripts/consolidate-wbs.mjs`, `scripts/split-megacluster.mjs`, `docs/wbs.json`, `docs/wbs.md`, updated `.lovable/plan.md`.

### Explicit non-goals for this revision

- No leaves written to `docs/` in this step — only `/mnt/documents/` drafts from subagents.
- No commit-to-leaf reconciliation yet.
- No durations re-estimated on existing shipped leaves — only new planned/aspirational ones.
- No culling. Everything stays in scope until you say cut.

### What I need from you

A single "go deepen" and I spawn all four subagents in parallel. No checkpoints between spawn and synthesis — the next thing you see from me is the consolidated review with the new leaf counts.
