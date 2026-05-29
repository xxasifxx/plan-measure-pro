# Snapshot · 2026-03-23 — Invitation RBAC & Touch Overhaul

## What Existed
- Full Supabase backend (projects, annotations, pay items, calibrations, RLS).
- Auto-assign `project_manager` role on any signup.
- PdfCanvas with Fabric.js annotations, mobile touch, undo/redo, real-time sync.

## What Just Changed
1. **Auth model pivot (sha `052abde5`):**
   - `on_auth_user_created_role` auto-assign trigger **dropped**.
   - `invitations` table created. Admins invite by email + role.
   - `assign_owner_role()` and `accept_invitation()` SECURITY DEFINER functions.
   - `TeamManager` UI component added.
   - Profile search policy for project creators.

2. **PdfCanvas touch overhaul:**
   - Full touch state machine (`handleOverlayTouchStart/Move/End`) supporting single-finger drawing, suppressClick guard, edge-swipe prevention.
   - TOC-select via single-finger drag.

3. **Presence tracking:** Supabase Presence channel per project — `onlineUsers[]` exposes who is viewing the same plan simultaneously.

4. **Debounced `updated_at` sync** to projects table on annotation change.

## What Was Abandoned
- Open self-registration (anyone signing up got `project_manager`). Now gated behind admin invitation.

## Product Thesis at This Moment
> "An org-gated, invitation-only collaborative take-off platform. Admins control who joins and at what role. Multiple inspectors can annotate the same plan simultaneously with live presence indicators. Mobile-first touch drawing is a first-class capability."
