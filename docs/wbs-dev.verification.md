# WBS Verification Report

Strict rule: an activity is **Completed** only when its end-to-end flow is verified against seeded data. This document is the per-activity recipe register.

## pass (0)


## auto-pending (0)


## unverified (154)

- `01:docs:organic-signup-admin-role` — Organic signup → admin role
- `01:docs:invitation-flow` — Invitation flow
- `01:docs:roles-populated` — Roles populated
- `01:docs:role-booleans-correct` — Role booleans correct
- `01:mobile:biometric-gate` — Biometric gate
- `01:docs:password-reset` — Password reset
- `01:docs:rls-posture` — RLS posture
- `01:remaining:assign-owner-role-is-called-in-both-auth-1` — `assign_owner_role` is called in both `Auth.tsx:103` and `useAuth.tsx:55` — one of these will always be a redundant no-o
- `01:remaining:biometricgate-only-runs-the-native-path--2` — `BiometricGate` only runs the native path; there is no web-equivalent MFA or session idle timeout, leaving browser sessi
- `01:remaining:the-resident-engineer-role-was-added-lat-3` — The `resident_engineer` role was added late and backfilled to all existing admins — new user invitations do not expose a
- `01:remaining:resetpassword-tsx-46-shows-a-loading-rec-4` — `ResetPassword.tsx:46` shows a "Loading recovery session…" spinner indefinitely if `PASSWORD_RECOVERY` never fires (e.g.
- `02:docs:ownership-member-union` — Ownership + member union
- `02:docs:card-stats` — Card stats
- `02:docs:new-project-dialog` — New Project dialog
- `02:docs:delete-guard` — Delete guard
- `02:docs:pm-inspector-detail` — PM inspector detail
- `02:docs:role-badge` — Role badge
- `02:docs:inspector-empty-state` — Inspector empty state
- `02:remaining:useprojects-fetches-all-annotations-for--1` — `useProjects` fetches all annotations for all user projects in a single unbounded query — will be slow/expensive at scal
- `02:remaining:totalpages-in-the-pm-inspector-detail-pa-2` — `totalPages` in the PM inspector detail panel is hardcoded to `0` (`Dashboard.tsx:154`), making the "pages annotated" de
- `02:remaining:no-react-query-cache-invalidation-when-a-3` — No React Query cache invalidation when a team member adds annotations in another session; `staleTime` defaults cause sta
- `02:remaining:loadpendingreviewcounts-fires-per-projec-4` — `loadPendingReviewCounts` fires per-project-list render with all project IDs as a comma-joined cache key, recomputing on
- `03:docs:create-project-pdf-upload` — Create project / PDF upload
- `03:docs:load-with-offline-fallback` — Load with offline fallback
- `03:docs:toc-drag-select` — TOC drag-select
- `03:docs:pay-item-import` — Pay-item import
- `03:docs:specs-pdf-upload-indexing` — Specs PDF upload + indexing
- `03:docs:toc-pay-items-survive-reload` — TOC / pay-items survive reload
- `03:remaining:extractpayitemsfrompage-is-a-pure-heuris-1` — `extractPayItemsFromPage` is a pure heuristic regex scan of PDF text layers; non-standard table layouts (rotated text, s
- `03:remaining:toc-parsing-uses-a-hardcoded-5px-y-group-2` — TOC parsing uses a hardcoded 5px Y-grouping tolerance and `console.log` debug noise in production — no structured loggin
- `03:remaining:the-up-to-4-subsequent-pages-pay-item-sc-3` — The "Up to 4 subsequent pages" pay-item scan is a magic number with no UI indication of where the scan stopped.
- `03:remaining:specs-storage-path-is-uploaded-with-upse-4` — `specs_storage_path` is uploaded with `upsert: true` at fixed path `{projectId}/specs.pdf` — concurrent uploads silently
- `04:docs:drawable-flag` — drawable flag
- `04:docs:delete-cascade` — Delete cascade
- `04:docs:edit-inline` — Edit inline
- `04:docs:db-persistence` — DB persistence
- `04:docs:section-keyed-colors` — Section-keyed colors
- `04:docs:contract-quantity-denominator` — Contract quantity denominator
- `04:docs:contract-modifications` — Contract modifications
- `04:remaining:updatepayitems-issues-full-delete-bulk-i-1` — `updatePayItems` issues full `DELETE` + bulk `INSERT` on every change — data-loss race if two users edit pay items concu
- `04:remaining:no-contract-modification-workflow-exists-2` — No contract-modification workflow exists; no audit trail for `contract_quantity` bumps.
- `04:remaining:pay-item-color-auto-assigned-from-sectio-3` — Pay-item color auto-assigned from `SECTION_COLORS` at import; no per-item color picker on mobile.
- `04:remaining:cascade-deletion-done-client-side-via-n--4` — Cascade deletion done client-side via N individual `offlineMutate` calls, not a single server-side DELETE; unreliable on
- `05:docs:scale-calibration` — Scale calibration
- `05:docs:polygon-with-cy-depth-prompt` — Polygon with CY depth prompt
- `05:docs:drag-handle-editing` — Drag-handle editing
- `05:docs:undo-redo-with-db-sync` — Undo/redo with DB sync
- `05:docs:realtime-multi-user-sync` — Realtime multi-user sync
- `05:docs:gps-calibration-overlay` — GPS calibration overlay
- `05:docs:manual-quantity-override` — Manual quantity override
- … +104 more

## infeasible (0)


## no-recipe (0)

