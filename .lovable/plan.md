## Goal

Stand up a **repeatable demo environment** — 3 seeded users with distinct roles, a realistic project with PDF + 50-activity XER + tagged annotations — so you can click through schedule import, offline mirror, and pay-item tagging without hand-wiring data. Then land **Round 3** (the remaining Low-tier items + a few hardening fixes surfaced during seed work).

---

## Part A — Expanded seed dataset

### A1. Demo users (3) via a SECURITY DEFINER RPC

Add `public.seed_demo_users()` (admin-only, idempotent). It uses `auth.admin_create_user`-equivalent inserts into `auth.users` + `auth.identities` with fixed UUIDs and bcrypt-hashed passwords so reruns are no-ops.

| Role | Email | Password | UUID |
|------|-------|----------|------|
| Admin / PM (project creator) | `demo.pm@njta.test` | `DemoPass123!` | `aaaaaaaa-…-0001` |
| Resident Engineer | `demo.re@njta.test` | `DemoPass123!` | `aaaaaaaa-…-0002` |
| Inspector | `demo.inspector@njta.test` | `DemoPass123!` | `aaaaaaaa-…-0003` |

Roles inserted into `user_roles`; PM creator-owns the project; RE + Inspector added to `project_members`.

### A2. Expand `supabase/seed.sql`

Drop the `:demo_user` psql variable gate — instead call `seed_demo_users()` first, then seed against the known PM UUID. Adds:

- **1 project** (NJTA I-95 Resurfacing, MP 56–62) — already drafted, keep
- **15 pay items** — already drafted, keep
- **1 PDF calibration** — already drafted, keep
- **~15 annotations** across 2 pages (was 10) covering line/polygon/count, mixed inspector + PM `user_id`
- **NEW: 50-activity XER-equivalent schedule** seeded directly via `replace_project_schedule(...)` JSONB call. Covers: 1 WBS root → 4 sub-WBS (Mobilization, Earthwork, Pavement, Closeout), ~46 tasks + 4 milestones, FS/SS/FF mix, 2 calendars (Standard 5d + 6d), 3 resources, ~20 resource assignments, realistic baseline dates spanning ~6 months.
- **NEW: 1 captured baseline** via `capture_baseline()`
- **NEW: ~5 pay-item ↔ activity links** in `activity_pay_items` so the pay-item-activity map renders something
- **NEW: 2 daily reports** (1 draft, 1 submitted) for the inspector

### A3. Sample PDF for storage

Generate a tiny synthetic 2-page "plan sheet" PDF (pdf-lib in a one-off script committed under `scripts/build-demo-pdf.mjs`) and upload via `supabase storage` to `project-pdfs/<project-id>/demo.pdf`. Update the project row's `pdf_storage_path`.

> Note: this part runs as a separate `bun scripts/build-demo-pdf.mjs` step rather than from `seed.sql`, since SQL can't upload to Storage. Documented in README.

### A4. Verification matrix (manual smoke test you'll run after seeding)

1. Log in as `demo.pm@njta.test` → open project → schedule tab shows 50 activities, baseline, critical path. ✅ schedule import.
2. Same user → toggle network offline → reload project → annotations/pay items/schedule still render from IndexedDB mirror. ✅ offline mirror.
3. Log in as `demo.inspector@njta.test` → open annotation → assign pay item → check `activity_pay_items` updates. ✅ pay-item tagging.
4. Log in as `demo.re@njta.test` → see submitted daily report → approve. ✅ RE workflow.

---

## Part B — Round 3 (remaining Low tier + seed-surfaced fixes)

From the original audit's **6 Low** items, these are still open:

1. **L-1 `PdfCanvas` resize/render atomicity** — concurrent resize + render can leave a stale canvas. Wrap render task in a cancel token tied to the resize observer.
2. **L-2 `estimateError` unit mislabel** in `src/lib/geo-transform.ts` — variable named `_ft` but stores meters in one branch. Rename + add unit-conversion guard.
3. **L-3 DCMA resources stub** in `src/lib/xer/dcma.ts` — `resources` check always returns `pass` with a TODO. Either implement (count unstaffed tasks) or remove from the rendered checklist so it doesn't lie.
4. **L-4 Missing TIA tests** — add `src/test/tia.test.ts` covering single-activity insertion + multi-activity ripple.
5. **L-5 `useAuth` boot double-fire** — already partially fixed via `fetchedForRef`, but `onAuthStateChange` still runs `setUser` synchronously before the guard; tighten so the first `INITIAL_SESSION` event short-circuits.
6. **L-6 `addWorkdays` empty-calendar guard** — already added in Round 2; promote to a unit test in `date-utils.test.ts` (new file).

Plus 2 fixes likely to surface while writing the seed:

7. **S-1** `replace_project_schedule` 7-arg overload silently drops `primary_resource_id` and `remaining_duration_days` on activities — add to the INSERT column list so the seeded schedule round-trips.
8. **S-2** `capture_baseline` doesn't snapshot `early_start/early_finish` if CPM hasn't run — call a `recalc_cpm(project_id)` helper (or document that the caller must run CPM first; will choose based on what current `use-schedule.ts` does).

---

## Technical notes

```text
File-level change set
─────────────────────
supabase/migrations/<new>.sql       (a) public.seed_demo_users() RPC
                                    (b) replace_project_schedule 7-arg:
                                        add primary_resource_id +
                                        remaining_duration_days to INSERT
supabase/seed.sql                   rewrite — calls seed_demo_users(),
                                    seeds project/items/calibration/
                                    annotations/schedule/baseline/
                                    activity_pay_items/daily_reports
scripts/build-demo-pdf.mjs          NEW – pdf-lib 2-page synthetic plan
                                    + storage upload via service role key
README.md                           "Seeding the demo" section
src/components/PdfCanvas.tsx        L-1 cancel-token on resize
src/lib/geo-transform.ts            L-2 unit fix
src/lib/xer/dcma.ts                 L-3 implement or remove resources check
src/test/tia.test.ts                NEW – L-4
src/test/date-utils.test.ts         NEW – L-6
src/hooks/useAuth.tsx               L-5 INITIAL_SESSION short-circuit
```

The migration goes via the migration tool (single call). Seed SQL + scripts land via normal file edits. After everything's in place I'll run `vitest` to confirm the new tests pass and re-read the audit list to confirm no Medium-tier regressions.

---

## Out of scope this round
- Sample storage objects beyond the demo PDF (annotation photos, RFI attachments)
- Seeded `notifications` rows (will populate naturally when RE approves report in verification step 4)
- Multi-project seed — single project keeps reset cycle fast
- Realistic XER **file** import path — seed goes through `replace_project_schedule` directly so we don't depend on the XER parser fixture
