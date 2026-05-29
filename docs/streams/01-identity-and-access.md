---
stream_key: 01-identity-and-access
paths:
  - src/pages/Auth.tsx
  - src/pages/ResetPassword.tsx
  - src/hooks/useAuth.tsx
  - src/components/BiometricGate.tsx
  - src/App.tsx
  - supabase/functions/invite-user/
shared_paths: []
---
# Identity & Access

## Purpose
Manages every authentication touchpoint and the role model that gates all downstream operations. It exists distinct from other streams because it owns the trust boundary: who can enter the app (email/password signup, invited flow, biometric cold-start unlock), which capabilities each user has (`admin`, `project_manager`, `inspector`, `resident_engineer`), and how Supabase RLS policies enforce those capabilities server-side.

## Surfaces (files)
- `src/pages/Auth.tsx` — email/password sign-in, sign-up (with org-name capture), forgot-password mode, and invitation-token acceptance on landing
- `src/pages/ResetPassword.tsx` — handles Supabase `PASSWORD_RECOVERY` event; calls `supabase.auth.updateUser`
- `src/hooks/useAuth.tsx` — `AuthProvider` + `useAuth`; loads `user_roles` + `profiles` after session, exposes `isManager`, `isAdmin`, `isResidentEngineer`, `isInspector` booleans
- `src/components/BiometricGate.tsx` — native-only cold-start gate; calls `lib/native/biometric.{getStatus,unlock,unenroll}`
- `src/App.tsx` — wraps tree in `<AuthProvider>`, mounts `<BiometricGate>`
- `public.profiles` — `id`, `full_name`, `email`; RLS: own row only
- `public.user_roles` — `user_id`, `role app_role`; `UNIQUE(user_id, role)`; read own, all via admin policy
- `public.invitations` — `token`, `email`, `role`, `accepted_at`; consumed by `accept_invitation` RPC
- `public.assign_owner_role(_user_id)` RPC — grants `admin` to organic (non-invited) signups; no-op if already has roles
- `public.accept_invitation(_token)` RPC — validates token, assigns role, marks accepted; returns `'ok'|'email_mismatch'|'expired'`
- `supabase/functions/invite-user/` — edge function that creates an invitation row and emails token link

## Acceptance criteria
- A new organic signup receives `admin` role (via `assign_owner_role`) and is redirected to Dashboard on first login.
- An invited user who follows the emailed link sees the "Join Team" variant of Auth and, after confirming email, has their target role applied via `accept_invitation`.
- `useAuth.roles` is populated with the correct roles within one render cycle of a valid session.
- `isManager`, `isAdmin`, `isResidentEngineer`, `isInspector` reflect the user's DB roles without page reload.
- A device with a stored biometric credential shows the fingerprint gate on cold start and bypasses it only on successful unlock.
- Password-reset email redirects to `/reset-password`, detects `PASSWORD_RECOVERY` event, and allows password change.
- Supabase RLS prevents any row from `pay_items`, `annotations`, or `projects` being read without a valid session and appropriate `project_members` or ownership check.

## Current state vs criteria
- **Organic signup → admin role**: Implemented — `Auth.tsx:103` calls `assign_owner_role` after `signInWithPassword`; `useAuth.tsx:55` calls it on `SIGNED_IN` event too (double-fire risk but idempotent).
- **Invitation flow**: Implemented — `Auth.tsx:39–63` runs `accept_invitation` after session detected; localStorage survives email confirmation redirect.
- **Roles populated**: Implemented — `useAuth.tsx:37–43` fetches `user_roles` after session; deduplicated by `fetchedForRef`.
- **Role booleans correct**: Implemented — `useAuth.tsx:102–105`; `resident_engineer` added in migration `20260524015102`.
- **Biometric gate**: Implemented for native — `BiometricGate.tsx:23` short-circuits on web via `isNative()` check.
- **Password reset**: Implemented — `ResetPassword.tsx` listens for `PASSWORD_RECOVERY` and falls through to a loading screen if event hasn't fired yet (fragile on slow hash parsing).
- **RLS posture**: Partial — `projects`, `pay_items`, `annotations`, `user_roles`, `profiles` all have RLS enabled per migrations; no migration audits cross-table joins or storage bucket policies.

## Cross-stream handoffs
- **Feeds everything**: `useAuth` exports `user`, `session`, `roles`, and flag booleans consumed by every other stream.
- **Feeds portfolio-and-pm-home**: Dashboard reads `isManager`, `isAdmin`, `isResidentEngineer` to gate "New Project" button and RE review badge.
- **Feeds field-capture**: `Index.tsx` derives `isReadOnly = isInspector && !isManager && !isAdmin` to set `readOnly` prop on Toolbar and ProjectSidebar.
- **Seam**: `useAuth()` hook call; `public.user_roles` table; `public.has_role()` SQL function.

## Risks / debt
1. `assign_owner_role` is called in both `Auth.tsx:103` and `useAuth.tsx:55` — one of these will always be a redundant no-op DB call, but the double-fire is silent.
2. `BiometricGate` only runs the native path; there is no web-equivalent MFA or session idle timeout, leaving browser sessions open indefinitely.
3. The `resident_engineer` role was added late and backfilled to all existing admins — new user invitations do not expose a `resident_engineer` invite option in `invite-user` function.
4. `ResetPassword.tsx:46` shows a "Loading recovery session…" spinner indefinitely if `PASSWORD_RECOVERY` never fires (e.g., user navigates to `/reset-password` directly), with no timeout or redirect.
