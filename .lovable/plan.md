
# Real-Workflow Expansion Plan

Goal: move TakeoffPro from prototype to a tool that genuinely reduces manual labor on live AEC projects, with role-specific dashboards, smarter daily context, and a polished MCFA pitch that ends in a live demo.

---

## 1. Gantt Photo → Schedule (AI ingest)

Today PMs would have to type WBS rows by hand. We make schedule creation a 30-second photo upload.

**Workflow**
- PM uploads a photo/PDF/screenshot of a Gantt chart (Primavera P6, MS Project, Excel) on `/project/:id/controls` → Activities tab.
- New edge function `parse-schedule` calls `google/gemini-2.5-pro` (multimodal) with structured-output tool calling → returns `{ activities: [{ wbs_code, name, baseline_start, baseline_end, predecessor_wbs?, percent_complete? }] }`.
- Preview table shown for PM review/edit before bulk insert into `schedule_activities`.
- Optional second pass: link each activity to one or more `pay_item_id`s via fuzzy name match.

**Storage:** new `schedule-imports` private bucket for source images (audit trail).

---

## 2. "Today's Pay Items" — context-aware paring

Inspectors today scroll a 200-item list to find the 4 they're working on. We fix that.

**Logic per inspector, per day:**
- **Primary list (default visible):** pay items linked to schedule activities where `baseline_start <= today <= baseline_end` AND inspector is assigned (or recently annotated).
- **Recently used:** items the inspector annotated in last 7 days.
- **Searchable fallback:** existing full pay-item picker collapsed behind a "Search all items" input (cmdk) — fuzzy by item code + name.

**UI changes:**
- `MobilePayItems.tsx` + `ProjectSidebar` pay-item section gets two collapsible groups: **Today** and **All items (search)**.
- Empty-state: "No items scheduled for today — search all items below."
- Settings toggle so inspectors can opt into "show all" for unscheduled work.

---

## 3. Role-specific dashboards

One landing per role at `/` (Dashboard.tsx routes by `has_role`).

**Admin (Org Owner)** — `AdminDashboard`
- Org-wide adoption %, projects count, seat usage, recent invites, billing snapshot stub.

**Project Manager** — `PMDashboard` (extend existing ProjectControls)
- Per-project tiles: schedule health, reporting freshness, % activities on track, open AI-photo queue, team activity heatmap (last 7 days).
- "Action items" feed: late activities, stale inspectors, unconfirmed AI photo tags.

**Inspector** — `InspectorDashboard`
- Today's assigned activities + linked pay items (one tap → opens project at right page).
- "Submit daily report" CTA prefilled from today's annotations.
- Personal stats: items measured this week, on-time submission streak.

Implementation: new `src/pages/dashboards/{Admin,PM,Inspector}.tsx`; `Dashboard.tsx` becomes a router that picks one based on role.

---

## 4. Single Entry → Many Exports

Principle: every quantity, photo, note, and timestamp is captured once in the canvas/annotation layer, then projected into any required output format.

**Export hub:** `/project/:id/exports` with one-click generators (all reuse same source data):
- **NJDOT Daily Construction Report (Excel)** — already partial; finalize with stationing + variance.
- **Pay Estimate / Progress Payment (CSV + PDF)** — pay-item totals × unit price, period-to-date and to-date.
- **Bid Summary (CSV)** — for `is_bid` projects.
- **Field Photo Log (PDF)** — confirmed `annotation_photos` grouped by pay item with captions.
- **Schedule Update Export (CSV)** — current `percent_complete` per WBS, importable back into P6/Excel.
- **Inspector Time Log (CSV)** — derived from annotation timestamps + GPS sessions.

Shared module: `src/lib/exporters/` with one file per format, all consuming a single `ProjectSnapshot` builder so we never re-query differently per export.

---

## 5. /mcfa Pitch Upgrade + Live Demo Path

Current `/mcfa` is static slides. Make it a working sales artifact that flows into a live demo.

**Content additions to `McfaPitch.tsx`:**
- **"Live Demo" button** in hero → routes to `/demo` (already exists) preloaded with a seeded MCFA-flavored project (NJTA-style sheet, 5 pay items, sample Gantt photo already parsed).
- **New section: "How it replaces today's manual workflow"** — side-by-side:
  - Manual: paper DC form → Excel → email → re-key into P6 → photos in iPhone roll.
  - With us: one tap on iPad → all six exports above.
- **New section: "What's shipped vs. roadmap"** with green/amber chips so the recruiter sees real product, not vapor.
- **Updated ROI section** referencing the absorbed-role ranges already in the Q&A panel.
- **"Book the live walkthrough" CTA** → captures into existing `demo_requests` table.

**Demo seeding:** new edge function `seed-demo-project` (idempotent per session) that builds a realistic NJTA project for the visitor's session so the live demo always looks populated.

---

## Build Order

1. Today's Pay Items paring (highest daily-value, no AI cost) — UI + query.
2. Role-routed dashboards (PM/Inspector/Admin shells).
3. Gantt photo ingest edge function + Activities review UI.
4. Export hub consolidation behind shared `ProjectSnapshot`.
5. MCFA pitch rewrite + seeded demo + Live Demo CTA.
6. Photo log PDF + schedule update CSV exports.

---

## Technical Section

**DB migrations**
- Add `assigned_inspector_ids uuid[]` (or join table `activity_inspectors`) on `schedule_activities` to drive Today filtering. Prefer join table `activity_assignments(activity_id, user_id)` with RLS via `is_project_member`.
- Add `pay_item_links` join table `activity_pay_items(activity_id, pay_item_id)` (many-to-many) — replaces the single `pay_item_id` column for richer linking; keep old column nullable for back-compat.
- Add `daily_reports(id, project_id, user_id, report_date, payload jsonb, submitted_at)` so submissions are first-class and exportable.

**Edge functions**
- `parse-schedule` — multimodal Gemini 2.5 Pro, structured output via tool calling, returns activities array.
- `seed-demo-project` — service-role insert of demo project + activities + pay items keyed by session id.
- Reuse existing `tag-photo` for field photos.

**Frontend**
- `src/pages/dashboards/{Admin,PM,Inspector}Dashboard.tsx`
- `src/pages/Dashboard.tsx` → role router
- `src/pages/ProjectExports.tsx` (export hub) + `src/lib/exporters/{daily,payEstimate,bidSummary,photoLog,scheduleUpdate,timeLog}.ts`
- `src/lib/snapshot.ts` — single `buildProjectSnapshot(projectId)` consumed by every exporter
- `src/components/PayItemPicker.tsx` (refactor) — Today / Recent / Search-all groups; used by sidebar + mobile
- `src/components/GanttUploader.tsx` — drag-drop, calls `parse-schedule`, shows preview table
- `src/pages/McfaPitch.tsx` — new sections + Live Demo CTA wiring

**Access control**
- Inspectors see only their assigned activities on Today list (via `activity_assignments`).
- PM sees full project; Admin sees org-wide.
- All new tables get RLS via existing `is_project_member` and `has_role` helpers.

**Out of scope (this round)**
- Real Primavera P6 API sync (CSV import + photo OCR cover the gap).
- BIM 360 traceability.
- Native mobile app (PWA continues to cover field).
- Stripe billing (admin dashboard shows stub only).

---

Want me to proceed with the full plan, or trim to phases 1–3 first (Today pay items + role dashboards + Gantt OCR) and defer the export hub + MCFA rewrite to a follow-up?
