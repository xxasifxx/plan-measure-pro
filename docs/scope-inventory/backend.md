# Backend Inventory (subagent sub_bq6b8q26, capable model, 2026-05-29)

Source: read of supabase/migrations/* (36 migrations) + supabase/functions/*

## Tables

```yaml
- name: profiles
  introduced: 20260321160419
  later: [21162325, 21162349, 21164313, 26121114, 28155928]
  purpose: One row per auth user; full_name, email, has_seen_welcome.

- name: user_roles
  introduced: 20260321160419
  later: [24015102 (resident_engineer enum value)]
  purpose: app_role enum mapping (admin / project_manager / inspector / resident_engineer); multi-role.

- name: projects
  introduced: 20260321160419
  later: [21162349 (admin SELECT), 04215217 (is_bid)]
  purpose: name, contract_number, pdf_storage_path, specs_storage_path, toc jsonb, is_bid.

- name: project_members
  introduced: 20260321160419
  later: [21162349 (admin policies)]
  purpose: junction users -> projects at role=manager|inspector.

- name: pay_items
  introduced: 20260321160419
  later: [24172951 (p6_activity_id + index)]
  purpose: contract line items - item_number, item_code, name, unit, unit_price, color, contract_quantity, drawable, p6_activity_id.

- name: calibrations
  introduced: 20260321160419
  purpose: per-page pixel-to-foot scale (point1, point2, real_distance, pixels_per_foot).

- name: annotations
  introduced: 20260321160419
  later: [21164809 (manual_quantity/location/notes), 21170227 (realtime publication), 24173937 (work_date + index)]
  purpose: drawings (line/polygon/count) linked to pay items with auto-computed measurements; work_date is America/New_York-tz aware.

- name: invitations
  introduced: 20260321164313
  later: [26121114]
  purpose: email invitations (token-based) with role; accepted_at tracking.

- name: geo_calibrations
  introduced: 20260323173825
  later: [28155528 (RLS consolidation)]
  purpose: georeferencing - control_points jsonb, transform_matrix jsonb, estimated_error_ft.

- name: demo_requests
  introduced: 20260323184019
  later: [26121114 (stricter regex INSERT validation)]
  purpose: lead-capture from public landing page.

- name: schedule_activities
  introduced: 20260504215217
  later: [26105432 (P6 columns: parent, activity_id, type, float, critical, sort_order), 26114744 (manual_finish, remaining_duration_days)]
  purpose: WBS/Gantt with full P6 fields - baseline/actual/early/late dates, float, percent_complete, critical, parent_wbs_id, pay_item_id.

- name: rocks
  introduced: 20260504215217
  purpose: EOS quarterly Rocks per project (owner, title, target, status, due_date).

- name: scorecard_metrics
  introduced: 20260504215217
  purpose: weekly KPI scorecard (metric_key, value, target, week_start).

- name: annotation_photos
  introduced: 20260504215217
  purpose: field photos attached to annotations with AI-suggested pay item (ai_suggested_pay_item_id, ai_confidence, ai_rationale, confirmed).

- name: activity_assignments
  introduced: 20260504215217
  purpose: maps project members to schedule activities.
  consumed_by: []  # NO src/ queries found
  unbuilt: UI never assigns; planned scope.

- name: activity_pay_items
  introduced: 20260504215217
  purpose: many-to-many schedule_activities <-> pay_items.
  consumed_by: []  # NO src/ queries found
  unbuilt: planned schedule-driven quantity rollup feature.

- name: daily_reports
  introduced: 20260504215217
  later: [24015141 (status workflow + snapshot + v_approved view), 24173747 (RE-only approval lock trigger), 24174837 (owner withdraw policy + annotations.work_date)]
  purpose: inspector daily field reports - draft -> submitted -> approved | rejected.

- name: daily_report_comments
  introduced: 20260524015141
  purpose: RE/inspector threaded comments on daily reports.

- name: daily_report_snapshots
  introduced: 20260524130242
  purpose: immutable archive of prior daily-report payloads (saved when rejected report reopened).

- name: notifications
  introduced: 20260524130242
  purpose: in-app notification inbox; populated by triggers on daily-report status changes.

- name: activity_relationships
  introduced: 20260526105432
  purpose: predecessor/successor links (FS, SS, FF, SF with lag).

- name: project_schedule_meta
  introduced: 20260526105432
  purpose: per-project schedule metadata (P6 data_date, working calendar jsonb).

- name: schedule_calendars
  introduced: 20260526115717
  purpose: named working calendars (hours/day, workweek, holiday exceptions).

- name: schedule_resources
  introduced: 20260526115717
  purpose: resource definitions (labor/material/equipment/nonlabor) with cost/availability, imported from P6 PMXML.

- name: activity_resource_assignments
  introduced: 20260526115717
  purpose: assigns resources to activities with planned units/cost.
  consumed_by: src/lib/schedule/use-schedule.ts only - NO UI renders these.
  unbuilt: planned resource cost / burn rate / crew histogram UI.

- name: document_folders
  introduced: 20260526121114
  purpose: hierarchical folder tree per project; system folders auto-seeded for plans/specs/rfis/submittals/shop_drawings/change_orders/daily_reports/photos/as_builts/correspondence.

- name: documents
  introduced: 20260526121114
  purpose: file metadata + storage_path + versioning (replaces_document_id self-FK) + source_kind.

- name: device_tokens
  introduced: (not found in migrations - inserted directly by client/push function)
  purpose: FCM/APNs push tokens per user/device/platform.
  unbuilt: no migration found - schema gap.
```

## Edge functions

```yaml
- name: invite-user
  purpose: Admin-only creates/resends token-based email invitation via Supabase Auth admin invite.
  called_by: [Admin.tsx]
  completeness: complete

- name: parse-schedule
  purpose: Accepts base64 Gantt image, uses Lovable AI Gateway (Gemini 2.5 Pro) tool-calling to extract WBS rows.
  called_by: [GanttUploader.tsx]
  completeness: complete

- name: send-push
  purpose: Sends FCM push notifications to a user's device_tokens; no-ops if FCM_SERVER_KEY absent.
  called_by: []  # NO src/ caller
  completeness: complete (but DORMANT - never invoked end-to-end)
  unbuilt: no server-side dispatcher (no DB trigger or cron reads device_tokens and calls FCM/APNs).

- name: tag-photo
  purpose: AI photo tagging - signed URL + Gemini 2.5 Flash -> best matching pay item with item_code/confidence/rationale.
  called_by: [ProjectControls.tsx]
  completeness: complete
```

## Storage buckets

```yaml
- project-pdfs (introduced 20260321160419) - plan-set PDF files per project
- specs-pdfs (introduced 20260321160419) - project specification PDFs
- annotation-photos (introduced 20260504215217) - field photos attached to annotations
- project-documents (introduced 20260526121114) - DMS files in folder hierarchy
```

## Capabilities implied by schema but NOT built in UI (planned scope)

```yaml
- capability: Push notification delivery (server-side dispatch)
  evidence: send-push edge function + device_tokens table + push.ts shim all present, but no DB trigger or cron actually invokes send-push; FCM_SERVER_KEY not configured.

- capability: Activity-level resource cost tracking
  evidence: schedule_resources + activity_resource_assignments populated by P6 PMXML import but NO UI renders resource costs / burn rates / crew histograms.

- capability: Schedule-driven quantity rollup
  evidence: activity_pay_items junction table fully RLS'd but no src/ file queries it.

- capability: Activity user assignments
  evidence: activity_assignments table exists with RLS but no src/ file queries it; no assignment UI.

- capability: Approved-quantity P6 round-trip integration (full)
  evidence: v_approved_pay_item_quantities view + load-approved.ts exist; export-utils references approved quantities; but P6Export.tsx does not embed approved quantities back into exported XML - only progress dates/% complete are written.

- capability: pay_items.p6_activity_id editing UI
  evidence: Column exists with "Set in /project/:id/p6-export" comment but no UI in P6Export.tsx lets users assign/edit this field directly.

- capability: Geo-overlay viewer
  evidence: geo_calibrations only read by mirror.ts for caching; no UI for control-point creation or geographically referenced overlays.

- capability: Cross-project EOS scorecard trend dashboard
  evidence: scorecard_metrics read/written in ProjectControls but no dashboard widget aggregates weekly KPI trends across projects.

- capability: System-folder special rendering
  evidence: 10 system_kind values + auto-seed function exist but Documents.tsx UI does not distinguish system folders.
```
