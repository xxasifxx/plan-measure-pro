## Audit Results — 23 Findings Across 8 Areas

A full read-through of the schedule workspace, offline/sync layer, auth/RLS, core geometry, and edge functions surfaced 3 critical, 4 high, 10 medium, and 6 low issues, plus a sample-project seed gap. See the summary table at the end for the complete inventory.

This plan tackles the **3 Critical + 4 High** items in this round (the ones that are either user-visible wrong answers, security exposures, or actively broken in production), and stops short of medium/low so we can review the audit before scoping further work.

---

## Round 1 — What to fix now

### 🔴 Critical (correctness / security)

1. **C-1 Polyline length is wrong.** `lineLength` in `src/lib/geometry.ts` only measures the straight line between the first and last point. Every multi-segment linear takeoff (curb, fence, pipe) is silently understated. Sum all segment lengths.

2. **C-2 `parse-schedule` edge function is unauthenticated.** Anyone with the public anon key can drain Lovable AI credits. Add an `Authorization` + `supabase.auth.getUser()` guard (same pattern as `invite-user`).

3. **C-3 `send-push` crashes at import.** It imports a non-existent `npm:@supabase/supabase-js@2/cors` path, so the function is dead whenever FCM is configured. Replace with an inline `corsHeaders` constant.

### 🟠 High

4. **H-1 `assign_owner_role` fires on every JWT refresh.** `useAuth` calls the RPC on every `onAuthStateChange`, which means a write hits Postgres every ~1h per tab. Gate it behind `_event === 'SIGNED_IN'`.

5. **H-2 Missing GRANT/REVOKE on 6-arg `replace_project_schedule` overload.** Migration `20260526115717` left the new overload at PostgreSQL's default PUBLIC EXECUTE. Add the REVOKE + GRANT lines to a new migration so both overloads are locked down identically.

6. **H-3 Conflicting RLS on `geo_calibrations`.** Two overlapping `FOR ALL` policies plus a redundant SELECT policy make future edits fragile. Replace with one explicit SELECT-for-members + one ALL-for-creators policy.

7. **H-4 `/admin` route has no server-enforced wrapper.** Add an `<AdminRoute>` component (mirror of `<ProtectedRoute>`) that checks `has_role(uid,'admin')` server-side before rendering, instead of relying on `Admin.tsx`'s client-side redirect.

### 🌱 Seed scaffolding (foundation for the rest)

8. **Create `supabase/seed.sql` skeleton** with: 1 demo project, 15 NJDOT pay items, 1 calibration, ~10 sample annotations, and an empty hook for a 50-activity XER. This unblocks every subsequent "demo readiness" task without committing yet to demo user credentials (which need a separate decision).

---

## Out of scope this round (queued for follow-ups)

- **Medium (10):** fractional-day CPM lags, FF/SF backward-pass calendar bug, `as any` cleanup via regenerated Supabase types, offline mirror coverage for `schedule_activities`, `Promise.allSettled` in mirror, import-vs-edit race, `tag-photo` membership check, `profiles` member-scoped SELECT, missing XER `CS_FNET/FNLT` cases, `send-push` caller verification.
- **Low (6):** PdfCanvas resize/render atomicity, `estimateError` unit mislabel, `addWorkdays` empty-calendar guard, `useAuth` double-fire, DCMA resources stub, missing TIA tests.
- **Seed expansion:** realistic 50-activity XER, demo PDF in storage, seeded demo users with roles, full daily-report approval-flow fixtures.

I'll surface a Round 2 plan after this lands so we can pick the next batch deliberately.

---

## Technical notes (for implementation)

```text
File-level change set (Round 1)
───────────────────────────────
src/lib/geometry.ts                 lineLength: sum segments
src/hooks/useAuth.tsx               gate RPC on SIGNED_IN
src/App.tsx                         add <AdminRoute> wrapper
src/components/AdminRoute.tsx       NEW – server-checked admin gate
supabase/functions/parse-schedule/  add auth header + getUser check
supabase/functions/send-push/       inline corsHeaders, drop bad import
supabase/migrations/<new>.sql       (a) REVOKE+GRANT for 6-arg
                                      replace_project_schedule
                                    (b) drop+recreate geo_calibrations
                                      RLS as 1 SELECT + 1 ALL
supabase/seed.sql                   NEW – minimal seed skeleton
src/test/geometry.test.ts           NEW – polyline length regression
```

The migration will be submitted via the migration tool (one call, both changes) and will need your approval before code edits proceed.

After Round 1 lands I'll re-run the SEO/security scans and produce the Round 2 plan covering the Medium tier.

