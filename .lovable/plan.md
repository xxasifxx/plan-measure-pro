# Phase C — frozen WBS

Run `node scripts/consolidate-wbs.mjs` to regenerate. Canonical outputs:

- `docs/wbs.json` — machine-readable, every leaf with id, surface, status, durationDays, prerequisites, sources, rationale, subTasks
- `docs/wbs.md` — human index: status summary, surface table, per-surface leaf tables

## Snapshot

- **276 leaves** across **22 surfaces**
- Status: shipped 98 · partial 28 · planned 102 · aspirational 48 (counts may drift as YAMLs evolve)
- **~2,000 estimated days** of non-shipped work
- 0 duplicate IDs · 2 false-positive orphan prereqs (acronyms, not WBS ids)

## Source YAMLs (still authored separately, consolidated on every run)

```
docs/wbs-leaves.yaml                              (core surfaces: shell, takeoff, field ops, docs, reporting, marketing, infra)
/mnt/documents/wbs-resource-management.yaml       (RES-### — P6-parity resource module)
/mnt/documents/wbs-fajar-product.yaml             (FAJ-### — equipment rental product path)
/mnt/documents/wbs-cost-risk-claims.yaml          (COST/EVM/RISK/CLM/SCN-###)
/mnt/documents/wbs-scheduling-controls-reporting.yaml (SCH/PC/RPT-###)
/mnt/documents/wbs-scheduling-extras.yaml         (EXT-### — codes, EPS, steps)
/mnt/documents/wbs-integrations.yaml              (INT-### — connectors, portals)
/mnt/documents/wbs-ai-auth-admin.yaml             (AI / auth-admin)
/mnt/documents/wbs-native-offline-notifications.yaml (NO-### / NT-###)
```

## What's NOT done yet (deferred — out of Phase C close-out scope)

1. Commit-to-leaf reconciliation. `docs/wbs-proposals.reconciled.json` still holds the 915-commit BC-001 megacluster and 12 UNASSIGNED clusters. Split + map step pending user direction.
2. Critical-path extraction from prerequisites graph. Data is there; no renderer yet.
3. Sub-agent depth audit (`wbs-depth-audit.md`) was not surfaced — re-spawn if you want a patch list of leaves with thin sub-tasks.
