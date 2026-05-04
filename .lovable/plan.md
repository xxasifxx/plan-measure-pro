
## PM-Targeted Features Identified in the Proposal

Reading the BYOR proposal end-to-end, the features explicitly pitched to **Project Managers / Project Controls leadership** (not inspectors) cluster into six themes. Several already exist in the app (variance tracking in exports, PM dashboard activity, team management); the items below are the **gaps** worth building.

### What to add

**1. Executive Controls Dashboard** (proposal pages 7–8)
A PM-only landing view per project with the four headline tiles from the proposal mockup:
- Schedule Status (% on-track) with CPI / SPI placeholders
- Milestones On Track (x of y, behind-schedule count)
- Critical Issues (high / medium priority counts)
- **Reporting Freshness** — derived from `latest_annotation_at` and daily-report submission timestamps per inspector

**2. Schedule Variance / P6-Style Activity Tracking** (Phase 3 of AI Roadmap)
- New `schedule_activities` table (WBS code, name, baseline start/end, % complete, linked pay_item_ids)
- "Activities" tab on the project showing baseline vs actual quantity progress
- Variance flag when actual installed quantity (sum of annotation measurements) deviates >10% from baseline-expected at today's date
- CSV import for activities (P6 export stand-in until a real P6 connector exists)

**3. AI Photo Auto-Tagging** (Phase 2)
- Photo upload on annotations (already partial via storage)
- Edge function calling `google/gemini-2.5-flash` with image + project pay-item list → suggests pay item assignment
- PM review queue: "Untagged photos" panel where the PM accepts/overrides AI suggestions

**4. EOS Scorecard & Rocks Tracker** (KPIs section, page 5)
- `rocks` table (quarter, owner, title, target, status, due_date)
- `scorecard_metrics` table (week, metric_name, value, target) — pre-seeded with "Billable Hours," "TakeoffPro Adoption," "Reporting On-Time %"
- PM-only "Scorecard" tab with weekly grid + Rock progress bars

**5. Reporting Freshness & Adoption Monitor**
- Per-inspector tile: last submission, 7-day submission rate, overdue flag
- Project-level "Adoption %" (active inspectors ÷ assigned inspectors this week)
- Surfaces directly into the Executive Dashboard freshness tile

**6. BD / Proposal Takeoff Mode** (Section 2, BD support)
- Lightweight project type flag `is_bid: true` (skips team requirement, no daily reports)
- "Bid Summary" export: pay-item totals × unit price → estimated bid value, ready to hand to a BD manager
- Faster-create flow optimized for one-off takeoffs from a bid PDF

### Explicitly NOT building (out of scope / already present / requires real integrations)
- Live Primavera P6 API sync — needs Oracle credentials; ship CSV import instead
- BIM 360 design traceability — requires Autodesk auth; defer
- Power BI semantic model — external tool; export-ready CSVs cover this
- Variance tracking in exports — already implemented (per memory)

## Technical Plan

**Database migrations**
- `schedule_activities` (id, project_id, wbs_code, name, baseline_start, baseline_end, baseline_quantity, pay_item_id nullable, created_at) + RLS via `is_project_member`
- `rocks` (id, project_id, quarter, owner_user_id, title, target, status enum, due_date) + RLS
- `scorecard_metrics` (id, project_id, week_start, metric_key, value numeric, target numeric) + RLS
- `annotation_photos` (id, annotation_id, storage_path, ai_suggested_pay_item_id, confirmed boolean, created_at) + RLS
- Add `is_bid boolean default false` to `projects`

**Routes / pages**
- `/project/:id/dashboard` — Executive Controls Dashboard (PM/admin only via `has_role`)
- `/project/:id/activities` — schedule activities + variance
- `/project/:id/scorecard` — Rocks + weekly metrics
- `/project/:id/photo-queue` — AI tagging review

**Components**
- `ExecutiveDashboard.tsx`, `ActivityTable.tsx`, `VarianceBadge.tsx`, `ScorecardGrid.tsx`, `RockCard.tsx`, `PhotoReviewQueue.tsx`, `BidSummaryExport.tsx`

**Edge function**
- `tag-photo` — accepts photo URL + pay-item list, calls Lovable AI Gateway (`google/gemini-2.5-flash`), returns suggested pay_item_id + confidence

**Access control**
- All new routes gated on `has_role(uid, 'project_manager')` OR `has_role(uid, 'admin')` OR ownership; inspectors see read-only versions where appropriate

**Engineering aesthetic**
- Reuse blueprint-grid / dark navy palette, JetBrains Mono numerics, status chips matching existing variance color coding (green/amber/red)

## Suggested build order
1. DB migrations + `is_bid` flag
2. Executive Dashboard (uses existing data — fastest visible win)
3. Schedule Activities + variance
4. Scorecard / Rocks
5. AI photo tagging (edge function + queue UI)
6. BD / Bid mode + Bid Summary export

Want me to proceed with all six, or trim to a subset (e.g., 1–3 first)?
