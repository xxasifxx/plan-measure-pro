

# Organization-Based Signup & User Invitation System

## Current Problem
- Signup auto-assigns `project_manager` to everyone — no concept of an organization owner
- Users must self-register; there's no way for an owner to invite team members
- The Admin panel exists but is disconnected from the signup flow — it requires a manually-assigned `admin` role that nobody naturally gets

## New Model

```text
Signup (Auth.tsx)         →  Organization owner (admin role)
Owner invites people      →  Email invite with magic link
Invited