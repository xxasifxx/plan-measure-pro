# Snapshot · 2026-03-21 — Supabase Backend & Fabric.js Canvas

## What Existed
- Local-first PdfCanvas, PDF.js SpecViewer, localStorage useProject, pay-item catalog.
- No auth, no persistence beyond the browser.

## What Just Changed
Three pivots landed the same day:

1. **Schema bootstrap (sha `33ded792` / migration `20260321160419`):**
   - `app_role` ENUM (`admin | project_manager | inspector`), `profiles`, `user_roles`, `has_role()`, `projects`, `project_members`, `pay_items`, `calibrations`, `annotations` — full initial schema.
   - Storage buckets `project-pdfs` and `specs-pdfs`. RLS on all tables. Signup trigger.
   - `useProject` re-architected to cloud-first: `initProject`, async Supabase upserts, real-time `postgres_changes` subscription on annotations.

2. **Fabric.js annotation layer (sha `263bded1`):**
   - Fabric.js `^7.2.0` layered on the PDF.js canvas for interactive polygon/line/count with zoom, pan, touch.
   - Scale-aware coordinate system (`s()` helper, `getCanvasPos`) decoupled from raw pixels.
   - Mobile pinch-to-zoom and two-finger pan added.
   - Annotation info popup with manual quantity, location, notes fields.
   - Undo/redo stack + reactive canUndo/canRedo counters.

3. **Admin panel + policies:** Admin-role RLS across profiles, project_members, projects.

## What Was Abandoned
- Pure localStorage persistence. Data now lives in Supabase; localStorage is only a session fallback.

## Product Thesis at This Moment
> "A multi-user, cloud-backed construction take-off platform. Project managers create projects and invite team members. Inspectors annotate plan PDFs collaboratively in real time. Annotations, calibrations, and pay items are persisted in Supabase with role-based access control."
