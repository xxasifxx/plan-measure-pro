## Fix High-priority findings + unify destructive confirms

### 1. RLS: `daily_report_comments` UPDATE/DELETE policies (migration)
Add policies so comment authors can edit/delete their own comments; nobody else.

```sql
CREATE POLICY "Authors can update own comments"
  ON public.daily_report_comments FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete own comments"
  ON public.daily_report_comments FOR DELETE
  USING (auth.uid() = user_id);
```
(Verify exact column name via read_query before migrating.)

### 2. Admin page loading gate (`src/pages/Admin.tsx`)
Gate the "Access denied" screen behind `auth.loading === false` AND a local `rolesReady` flag so non-admins don't see a flash of the admin UI / denial during role hydration. Show a centered spinner while loading.

### 3. Withdraw button disable state (`src/pages/DailyReport.tsx` + related)
Disable the Withdraw button while the mutation is in flight and after status transitions away from `submitted`, with a tooltip explaining why. Prevents double-submit racing the status trigger.

### 4. Unify destructive confirms on AlertDialog
Replace remaining native `window.confirm(...)` calls for destructive actions with shadcn `AlertDialog` for consistent styling and a11y. Sweep:
- `src/pages/Admin.tsx`
- `src/pages/DailyReport.tsx`
- `src/pages/ProjectControls.tsx`
- `src/pages/Index.tsx`
- `src/components/TeamManager.tsx`
- any other `confirm(` hits found via ripgrep

Pattern: small reusable `<ConfirmDialog>` wrapper (title, description, confirm label, variant=destructive) in `src/components/ConfirmDialog.tsx` to avoid repeating AlertDialog boilerplate at each call site.

### Out of scope (defer)
- Refactoring `Documents.tsx` / `Demo.tsx` size (separate follow-up).
- Any further Documents UI polish.

### Technical notes
- Migration runs first and standalone (no code in same turn).
- After migration approval, code edits ship together: Admin gate → Withdraw guard → ConfirmDialog component → call-site sweep.
- No new deps; AlertDialog already in `src/components/ui/alert-dialog.tsx`.
