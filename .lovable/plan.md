# TakeoffPro — PM read-out and proposed plan

I went through every WBS artifact end-to-end (capabilities, promises, verification manifest, program deliverables, schedule, state, build-backlog, backlog-network) and cross-checked them against the actual codebase (pages, hooks, supabase migrations, edge functions, scripts). This is what I see as a PM and what I'd commit to next.

## 1. What TakeoffPro is

Digital quantity-takeoff tool for NJTA/NJDOT RE teams. Replaces paper DC forms with an audit-ready digital record. Three roles: Admin (org owner), PM (setup + review), Inspector (field annotation). Web + Capacitor native + offline outbox + Supabase backend + Primavera P6 round-trip. Priced per project, not per seat.

It is a real, mostly-built product. 36 migrations, 4 edge functions, 21 streams, 20+ pages, mobile + desktop UX, offline + sync, schedule analytics, GPS calibration, demo + 2 partner pitch decks (MCFA, Fajar).

## 2. Honest status, in numbers I trust

Capabilities by stream (from `.lovable/wbs/capabilities.json`, 21 streams):

```text
                                            impl  partial  miss  risks
01 identity-and-access                         6     2      2      2
02 portfolio-and-pm-home                       7     1      1      1
03 project-onboarding                          7     0      0      0   <- done
04 pay-item-catalog                            5     2      1      0
05 field-capture                               9     0      0      0   <- done
06 daily-report-lifecycle                      8     1      1      1
07 quantity-to-payment                         5     1      2      1
08 photo-evidence                              6     1      2      1
09 standard-specifications                     8     0      1      1
10 document-management                         7     0      3      2
11 schedule-management                         8     1      1      1
12 project-health-and-controls                 7     1      1      1
13 data-export-and-interoperability            7     2      0      0
14 measurement-and-geometry-engine             7     1      0      0
15 offline-and-native-durability               7     2      0      0
16 mobile-field-ergonomics                     6     1      3      1
17 notifications-and-presence                  5     4      1      1
18 compliance-and-audit                        6     2      2      0
19 onboarding-and-tutorials                    6     2      2      1
20 sales-and-pitch                             7     2      2      2
                                             ---   ---    ---    ---
totals                                       134    26     24     16
```

- **134 of 184 (~73%) capabilities are implemented**, ~14% partial, ~13% missing.
- **8 marketing promises** — all unverified, 3 of them not mapped to any stream (`UNMAPPED`).
- **154 verification activities** — **all manual, none verifiedE2E** (0/154). This is the dominant debt.
- **15 program deliverables** (non-file work: baseline schedule lock, pilot checklist, ROI calculator, audit-log spec, DC-84 formatter, FCM v1 migration, demo_requests table, etc.) — only 0 are "shipped", 3 partial, 10 planned, 2 missing.
- Backlog totals: **215 entries, ~561 engineer-days**, 17 high / 173 medium / 25 low confidence.

Translation: **the product is functionally ~75% done; the missing 25% concentrates in notifications, compliance/audit, document management, mobile ergonomics, payments (contract mods), and sales-proof artifacts. The bigger problem is that almost nothing has automated proof it works.**

## 3. Real gaps I found in the WBS itself

These are blocking the WBS from being useful as a PM tool:

1. **Verification-gap stream IDs are corrupted.** `build-build-backlog.mjs` derives stream from `activityId.slice(0,2) + '-'` for verification activities. Activity IDs look like `01:docs:organic-signup-admin-role`. Result: the backlog has 21 fake streams (`01-`, `02-`, … `21-`) running alongside the real ones (`01-identity-and-access`, …). 154 of 215 entries are mis-filed. Filters and totals are misleading.
2. **`next.json` recommends nonsense.** Top "ready to start" items are `Verify e2e: .gitignore`, `bun.lockb`, `package.json`, `eslint.config.js`, `postcss.config.js`, `favicon.ico`, `placeholder.svg`. These are auto-generated from file leaves with no domain filter. A PM reading this learns nothing.
3. **Owner-role inference is too coarse.** All 154 verification gaps → "QA Engineer". Most of them need the engineer who built the capability to also write the proof; the QA framing hides that.
4. **Marketing promises are too vague.** 8 entries, 3 `UNMAPPED`, none with a defined demo flow or proof route. "Walk the site. Measure automatically." is a claim, not a work item.
5. **Dependency graph is empty.** `backlog-dependencies.json.edges = {}`. CPM ran and produced `213 unconnected nodes / 1 inferred edge / critical path length 2 / project_duration 10 days`. The network view is technically working but factually meaningless.
6. **`/wbs` is crashing right now.** React error #310 ("rendered more hooks than during the previous render") — introduced when the Backlog/Network tabs were added. The page the user would use to act on all of this is broken in preview.
7. **Promises have no `verdict`.** All 8 entries have `verdict: null`. The "delivered + verifiedE2E" check in the generator never fires, so all 8 fall into the backlog regardless of state.

## 4. What I'd commit to, in priority order

### P0 — Make the WBS trustworthy (≈1 day of cleanup, unblocks everything)

1. **Fix the `/wbs` hook-order crash.** Bisect the new Backlog/Network tab code in `src/pages/Wbs.tsx`; move all `useState`/`useMemo` above any early return; verify in preview.
2. **Fix verification-gap stream mapping** in `scripts/wbs/build-build-backlog.mjs`. Map the `NN:` prefix to the real stream key (`01-identity-and-access`, …) using `STREAM_TITLES` keys. Drop the synthetic `NN-` streams.
3. **Filter `build-next.mjs`** so lockfiles, config files, dotfiles, manifests, and public assets cannot become "ready to start" recommendations. Only product-meaningful leaves rank.
4. **Improve owner inference**: verification_gap inherits the owner_role of the source capability when there is one in the same stream; otherwise QA. Add `co_owner` = the capability owner.
5. **Republish** `public/wbs/*` and validate counts.

### P1 — Make the network actually useful (≈1 day)

6. **Seed real predecessor edges** in `backlog-dependencies.json` for the chains that actually exist in this product:
   - Auth/RLS → exports, payment, audit
   - Calibration → measurement → annotation → daily report → quantity-to-payment → export
   - Offline persistence → sync → conflict UX → mobile editing parity
   - Onboarding tour → marketing promise proof routes
   - audit_log spec → compliance UI → RE review
7. **Re-run CPM**, surface top-10 critical-path items on the Backlog tab header with a "why critical" tooltip.

### P2 — Burn down the real product backlog (sized below)

Grouped by leverage, not by stream evenness. Days are from the backlog generator; treat as order-of-magnitude.

```text
Cluster A — Pilot blockers (~30–40 days)
  - Complete RLS audit matrix + automated allow/deny tests   [BB-01::c7, high conf, 5d]
  - Audit log table + RLS spec + trigger + RE review UI     [DLV-audit-log-spec, ~10d]
  - Password-reset PASSWORD_RECOVERY hardening              [BB-01::c6, 2d]
  - Resolve duplicate assign_owner_role call                [BB-01::r1, 5d]
  - Pre-pilot launch checklist (drills + sign-off)          [DLV-internal-launch-checklist, 2d]
  - Pilot success-criteria memo                             [DLV-pilot-success, 2d]

Cluster B — Payment + export integrity (~25–35 days)
  - contract_mods table + audit + variance + export effects (capability_missing in 07)
  - Approved-quantity reconciliation proof + golden file
  - DC-84 export formatter (NJDOT paper form)               [DLV-dc84, missing]
  - Excel export goldens for daily report + quantity-to-payment

Cluster C — Field durability (~30–45 days)
  - Offline outbox: conflict-resolution rule + UX (partial today)
  - Mobile annotation editing parity with desktop (3 missing in stream 16)
  - GPS calibration verification fixtures (geometry tests under varied scale)
  - Native iOS/Android device smoke matrix + store listings polish [DLV-app-store]

Cluster D — Notifications + presence (~15–20 days)
  - Migrate send-push to FCM HTTP v1 (OAuth) — currently legacy   [DLV-fcm-v1]
  - Real-time presence on annotations (4 partial in stream 17)
  - Notification preferences UI + per-event toggles

Cluster E — Proof for sales (~15–20 days)
  - demo_requests table + capture form end-to-end           [DLV-demo-requests, missing]
  - Map every public claim to a demo route + Playwright proof (8 promises)
  - Onboarding tour completion path + inspector/PM scripts  [DLV-onboarding-scripts]
  - Pitch leave-behind PDF + ROI calculator                 [DLV-pitch-pdf, DLV-roi]

Cluster F — WBS process hygiene (~5 days, ongoing)
  - Every new capability ships with AC + verification recipe in same PR
  - CI fails on capability rows with no AC + no recipe
  - Weekly delta artifact (entries added/closed, days remaining, CP shift)
```

Total realistic effort to **pilot-ready**: roughly **Clusters A + B + Cluster E lite ≈ 60–75 engineer-days**. To **v1 feature-complete**: roughly **150–180 engineer-days** (less than the 561 raw total because the verification debt collapses once recipes are written alongside fixes).

## 5. What I need you to decide

I won't size or schedule further without your call on these:

1. **Pilot vs feature-complete.** Are we targeting a named NJTA contract for first paid use (drives Cluster A+B+E lite), or holding for v1 (everything)?
2. **Is there a real QA engineer?** If not, "QA Engineer" in the backlog collapses back into the build engineer and the schedule shape changes.
3. **Audit scope.** "Audit log" can mean *every mutation on every project table* (heavy) or *only the RE-approval and quantity-change events* (light). The spec deliverable is currently `missing` — your call sets the size of Cluster A.
4. **Marketing claim policy.** Do unfulfilled landing-page claims get proof routes built, or removed from the landing page? "Walk the site. Measure automatically." in particular implies a GPS-as-you-walk demo that does not exist in the demo route today.

## 6. Technical notes (for the engineer who picks this up)

- `src/pages/Wbs.tsx` crash: React error #310 means a hook is being called conditionally. Likely the Backlog tab introduced a `useState`/`useMemo` after an early `if (!data) return ...`. Move all hooks to the top.
- Stream-mapping fix in `scripts/wbs/build-build-backlog.mjs`: `entryFromVerificationGap` currently does `\`${activityId.slice(0, 2)}-\``. Change to look up the real stream key by `01` → `01-identity-and-access` using `Object.keys(caps.streams)`.
- `build-next.mjs` ranker filter: exclude any `primary_leaf` whose path matches `/^(?:\.|public\/|.*\.lock$|.*config\..*|package(?:-lock)?\.json$|index\.html$|.*\.svg$|.*\.ico$|.*\.webmanifest$)/`.
- Owner inference: when `entryFromVerificationGap` runs, look up the capability in the same stream sharing tokens with the activity ID and inherit its `owner_role`.
- Dependency seeding: add edges in `backlog-dependencies.json` using existing BB-IDs (e.g. `"BB-07-quantity-to-payment::c?": ["BB-01-identity-and-access::c7"]`). The CPM step already handles cycles and back-edge dropping.

If you approve, I'll implement P0 + P1 in build mode in a single pass and come back with the seeded dependency graph and the cleaned-up `/wbs` board before we touch any actual product code.
