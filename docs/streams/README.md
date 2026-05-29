# Value Streams — Comprehension Pass v1

This directory is the **Phase 1 deliverable** of the comprehension pass triggered when the project pivoted off XER toward PMXML and adopted a value-stream model for development decisions.

Each brief follows a strict template (Purpose / Surfaces / Acceptance Criteria / Current State vs Criteria / Cross-stream Handoffs / Risks & Debt) so they can be diffed, scored, and rolled up into `docs/wbs-v2.json` and `docs/comprehension-report.md` in later phases.

## The 20 streams

| # | Stream | Role boundary |
|---|--------|---------------|
| 01 | [Identity & Access](./01-identity-and-access.md) | trust boundary |
| 02 | [Portfolio & PM Home](./02-portfolio-and-pm-home.md) | cross-project |
| 03 | [Project Onboarding](./03-project-onboarding.md) | bootstrap |
| 04 | [Pay Item Catalog](./04-pay-item-catalog.md) | reference data lifecycle |
| 05 | [Field Capture](./05-field-capture.md) | inspector core |
| 06 | [Daily Report Lifecycle](./06-daily-report-lifecycle.md) | submit/review gating |
| 07 | [Quantity to Payment](./07-quantity-to-payment.md) | approved rollup |
| 08 | [Photo Evidence](./08-photo-evidence.md) | AI-assisted documentation |
| 09 | [Standard Specifications](./09-standard-specifications.md) | reference lookup |
| 10 | [Document Management](./10-document-management.md) | file repository |
| 11 | [Schedule Management](./11-schedule-management.md) | PMXML + analysis engine |
| 12 | [Project Health & Controls](./12-project-health-and-controls.md) | PM KPIs |
| 13 | [Data Export & Interoperability](./13-data-export-and-interoperability.md) | output gate |
| 14 | [Measurement & Geometry Engine](./14-measurement-and-geometry-engine.md) | math substrate |
| 15 | [Offline & Native Durability](./15-offline-and-native-durability.md) | PWA + Capacitor |
| 16 | [Mobile Field Ergonomics](./16-mobile-field-ergonomics.md) | touch interaction |
| 17 | [Notifications & Presence](./17-notifications-and-presence.md) | feedback loop |
| 18 | [Compliance & Audit](./18-compliance-and-audit.md) | NJDOT/FHWA artefacts |
| 19 | [Onboarding & Tutorials](./19-onboarding-and-tutorials.md) | time-to-first-value |
| 20 | [Sales & Pitch](./20-sales-and-pitch.md) | unauthenticated funnel |

## How to use these briefs

- **Backlog grooming**: each `## Risks / debt` section is a candidate work source.
- **Acceptance gate**: when shipping a change, re-read the affected stream's `## Acceptance criteria` and update `## Current state vs criteria` in the same PR.
- **Cross-stream impact check**: `## Cross-stream handoffs` lists the seam tables and functions that may break in adjacent streams.
- **WBS roll-up**: Phase 4 will derive `docs/wbs-v2.json` by scoring each acceptance criterion as implemented / partial / missing.
