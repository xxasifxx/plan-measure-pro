

# Remaining Role & Invitation Workflow Gaps

## Issues Found

### 1. Edge function `invite-user` uses non-existent API
Line 31 calls `auth.getClaims()` which doesn't exist in supabase-js v2. The function will crash on every invocation. Must use `auth.getUser()` instead to verify the caller.

### 2. Invited users see "Organization Name" during signup
When an invited user clicks their email link and lands on `/auth?invitation=token`, the signup form still shows the "Organization Name" field and "Create your organization account" messaging. Invited users aren't creating an organization — they're joining one. The form should detect the invitation token and simplify to just name/email/password with "Join your team" messaging.

### 3. Invitation token lost on redirect
After an invited user signs up, they get a "confirm your email" message. When they confirm and get redirected back, the `?invitation=token` query param is gone. The token needs to be persisted (localStorage) so it can be applied after email confirmation.

### 4. Project Managers can't manage their project team
Only admins can assign inspectors to projects (Admin panel). PMs who create projects have no way to add team members from the workspace. Need a "Team" button in the project workspace that lets the creator manage `project_members`.

### 5. WelcomeCarousel not role-aware
Shows "For Project Managers" and "For Inspectors" slides to everyone regardless of role. Should filter based on the user's actual role.

### 6. No way to cancel/resend invitations
Admin panel shows invitations but has no delete or resend actions.

## Fixes

### File: `supabase/functions/invite-user/index.ts`
- Replace `auth.getClaims()` with `auth.getUser()` to fix the crash

### File: `src/pages/Auth.tsx`
- Detect `invitation` param → hide org name field, change messaging to "Join your team"
- On signup with invitation token, save token to `localStorage`
- After login, check `localStorage` for saved token and call `accept_invitation`

### File: `src/pages/Index.tsx` + new `src/components/TeamManager.tsx`
- Add "Team" button visible to project creator (and admins)
- TeamManager component: shows current members, lets creator add users by email (searches profiles table), remove members
- Uses existing `project_members` table and RLS (creator already has ALL policy)

### File: `src/components/WelcomeCarousel.tsx`
- Accept `role` prop, filter slides to show only relevant ones

### File: `src/pages/Admin.tsx`
- Add delete button on pending invitations
- Add resend button that re-invokes the `invite-user` function

### Database
- Add RLS policy on `profiles` for project creators to search users by email (needed for TeamManager)

