# Critical-path narrative

_Generated 2026-05-29T20:00:39.408Z — derived from PMXML round-trip CPM (data date 2026-05-29, project finish 2026-07-02, 76 critical activities, chain length 12)._

## The story in one sentence

Finish is driven by **1** stream phase, 0 steps already complete and **12** still ahead, terminating in **[verify] 04:remaining:updatepayitems-issues-full-delete-bulk-i-1** on **2026-07-02**.

## Phases along the critical path

| # | Stream | Steps | Start | Finish | Duration | % done |
|---|---|---:|---|---|---:|---:|
| 1 | `04-pay-item-catalog` | 12 | 2026-05-29 | 2026-07-02 | 24d | 0% |

## Step-by-step (longest chain)

1. ○ **[stub] db: pay_items** — `04-pay-item-catalog` · future-risk · 2026-05-29→2026-06-02 · 2d · 0%
2. ○ **[verify] 04:remaining:cascade-deletion-done-client-side-via-n--4** — `04-pay-item-catalog` · future-verification-gap · 2026-06-02→2026-06-04 · 2d · 0% _(via FS+0d)_
3. ○ **[verify] 04:docs:contract-modifications** — `04-pay-item-catalog` · future-verification-gap · 2026-06-04→2026-06-08 · 2d · 0% _(via FS+0d)_
4. ○ **[verify] 04:docs:contract-quantity-denominator** — `04-pay-item-catalog` · future-verification-gap · 2026-06-08→2026-06-10 · 2d · 0% _(via FS+0d)_
5. ○ **[verify] 04:docs:db-persistence** — `04-pay-item-catalog` · future-verification-gap · 2026-06-10→2026-06-12 · 2d · 0% _(via FS+0d)_
6. ○ **[verify] 04:docs:delete-cascade** — `04-pay-item-catalog` · future-verification-gap · 2026-06-12→2026-06-16 · 2d · 0% _(via FS+0d)_
7. ○ **[verify] 04:docs:drawable-flag** — `04-pay-item-catalog` · future-verification-gap · 2026-06-16→2026-06-18 · 2d · 0% _(via FS+0d)_
8. ○ **[verify] 04:docs:edit-inline** — `04-pay-item-catalog` · future-verification-gap · 2026-06-18→2026-06-22 · 2d · 0% _(via FS+0d)_
9. ○ **[verify] 04:remaining:no-contract-modification-workflow-exists-2** — `04-pay-item-catalog` · future-verification-gap · 2026-06-22→2026-06-24 · 2d · 0% _(via FS+0d)_
10. ○ **[verify] 04:remaining:pay-item-color-auto-assigned-from-sectio-3** — `04-pay-item-catalog` · future-verification-gap · 2026-06-24→2026-06-26 · 2d · 0% _(via FS+0d)_
11. ○ **[verify] 04:docs:section-keyed-colors** — `04-pay-item-catalog` · future-verification-gap · 2026-06-26→2026-06-30 · 2d · 0% _(via FS+0d)_
12. ○ **[verify] 04:remaining:updatepayitems-issues-full-delete-bulk-i-1** — `04-pay-item-catalog` · future-verification-gap · 2026-06-30→2026-07-02 · 2d · 0% _(via FS+0d)_

## Where criticality concentrates

| Stream | Critical activities |
|---|---:|
| `99-cross-cutting` | 48 |
| `04-pay-item-catalog` | 14 |
| `01-identity-and-access` | 12 |
| `98-build-and-infra` | 2 |

## Reading this

- **○ steps** are remaining work whose slippage moves the project finish day-for-day. **✓ steps** are already-actual history that anchors the chain.
- A **stream phase** with high step count and low % done is where comprehension is paying off — those handoffs were inferred from prose, not from commit timestamps.
- A stream with many critical activities but few phase appearances means it has many *parallel* critical strands — adding people there helps. A stream that owns a long single phase is a *serial* bottleneck — adding people doesn't help, but better duration estimates do.