# Pages & Routes Inventory (subagent sub_qnmfg4tc, capable model, 2026-05-29)

Source: read of src/App.tsx + src/pages/**

```yaml
pages:

  - id: landing
    file: src/pages/Landing.tsx
    name: Marketing Landing Page
    route: /landing
    audience: anonymous
    status: shipped
    purpose: Public-facing product page for TakeoffPro, targeting NJTA/NJDOT RE teams, with demo request form.
    capabilities:
      - Scroll-nav to Features, How It Works, Personas, FAQ, and Demo sections
      - Submit a demo-request form (name, email, organization, role, message) -> writes to demo_requests table
      - Navigate to /demo (Try the Demo CTA)
      - Navigate to /auth (Log In link)
      - View pain-point stats, workflow steps, capability comparisons, role personas
      - Read FAQ accordion (8 questions with schema.org LD+JSON for SEO)
      - View roadmap items (future features listed)
      - View comparison table (old vs TakeoffPro methods)
      - Smooth-scroll within page via nav buttons
      - View animated motion sections (framer-motion fade-ups)
    unbuilt_hints:
      - Roadmap items (AI quantity extraction, ProjectWise integration, DC-84 export, Contractor Portal) described as future

  - id: auth
    file: src/pages/Auth.tsx
    name: Authentication Page
    route: /auth
    audience: anonymous
    status: shipped
    purpose: Sign-in, sign-up, and forgot-password flow, including invitation-token acceptance.
    capabilities:
      - Sign in with email + password
      - Sign up (creates org account with full_name + org_name metadata)
      - Sign up via invitation link (join team, no org_name required)
      - Send password reset email
      - Accept pending invitation token via RPC (accept_invitation)
      - Auto-redirect to / after successful sign-in
      - Persist invitation token in localStorage across email confirmation redirect

  - id: reset-password
    file: src/pages/ResetPassword.tsx
    route: /reset-password
    audience: anonymous
    status: shipped
    purpose: Handles the Supabase PASSWORD_RECOVERY event and lets users set a new password.

  - id: dashboard
    file: src/pages/Dashboard.tsx
    route: /
    audience: admin | pm | inspector | resident_engineer
    status: shipped
    purpose: Central hub listing all projects the authenticated user has access to.
    capabilities:
      - View list of all accessible projects as cards
      - See annotation count, last activity date, member count, and progress bar per project
      - Navigate into a project workspace
      - Create a new project (name, contract number, PDF upload) - PM/admin only
      - Delete a project (owner only, with confirm dialog)
      - Open Project Controls Hub for owned projects
      - Expand project detail panel (inspector activity, pages annotated) - PM/admin only
      - See pending RE review count badges on project cards
      - Navigate to /admin (admin only)
      - Navigate to /re-review (RE, admin, PM)
      - Toggle dark/light theme
      - Sign out
      - View notification bell (NotificationBell)
      - Start or replay guided dashboard tour (5 steps)
      - See Welcome Carousel on first visit
      - View role badge

  - id: project-workspace
    file: src/pages/Index.tsx
    route: /project/:projectId
    audience: pm | inspector | admin
    status: shipped
    purpose: Core quantity-takeoff canvas - navigate plan PDFs, draw measurements, sync with Supabase.
    capabilities:
      - Load project PDF from Supabase Storage (signed URL, with offline IDB fallback)
      - Load and display annotations, pay items, calibrations from Supabase (or IDB offline)
      - Navigate PDF pages (previous/next, jump to page, fit-to-screen)
      - Import Table of Contents by drag-selecting a region on the plan
      - Import pay items by scanning current + 4 pages for spec tables
      - Calibrate paper scale (click two points, enter real distance)
      - Copy calibration to all pages or a range of pages
      - Select and activate a pay item, auto-switching to appropriate draw tool
      - Draw line annotations (LF), polygon annotations (SF/SY/CY), and count markers (EA)
      - Place text label annotations
      - Select, move, and delete individual annotations
      - Undo / redo (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
      - GPS georeference calibration (map two plan points to GPS coordinates)
      - Trace GPS path live and overlay on plan
      - View real-time presence of other online users
      - Open SummaryPanel to see totals and export (CSV, PDF, inspector daily report)
      - Export approved CSV, approved PDF report, approved inspector daily report
      - Upload and index NJDOT Standard Specs PDF (stored to specs-pdfs bucket)
      - Open SpecViewer to view spec section for a pay item
      - Open TeamManager to view/manage project team members
      - Toggle dark/light theme
      - Start / replay guided workspace tour (5 steps)
      - Offline mode fallback (read from IndexedDB, show toast)
      - Mobile tab bar (canvas / sections / pay items / summary)
    unbuilt_hints:
      - Inspector read-only flag partially enforced

  - id: project-controls
    file: src/pages/ProjectControls.tsx
    route: /project/:projectId/controls
    audience: pm | admin
    status: shipped
    purpose: PM-facing operations center - KPIs, Gantt, EOS scorecard, AI photo tagging, bid summary.
    capabilities:
      - View Executive Dashboard KPI tiles (schedule completion %, milestones on-track, critical issues, reporting freshness)
      - View quantity variance progress bars per pay item (installed vs contract)
      - View inspector adoption (7-day annotations per inspector, staleness flag)
      - View and manage schedule activities (add, update % complete, delete)
      - Upload XER/Gantt via GanttUploader to populate schedule activities
      - View interactive Gantt chart via ScheduleWorkspace
      - View and manage EOS Quarterly Rocks (add, update status, delete)
      - View and update EOS scorecard metrics (weekly; billable hours, adoption %, reporting on-time %)
      - Upload field photos; AI auto-tagging via tag-photo edge function
      - Confirm or reassign AI-suggested pay item on each photo
      - View bid summary (contract bid total, pay item list with quantities and unit prices)
      - Navigate to Field View
    unbuilt_hints:
      - CPI 1.03 / SPI 0.98 hardcoded placeholder values in KPI tile (~line 332)
      - Photo AI confidence/rationale displayed but tagging correctness depends on edge function

  - id: daily-report
    file: src/pages/DailyReport.tsx
    route: /project/:projectId/daily-report
    audience: inspector | pm | admin
    status: shipped
    purpose: Inspector submits daily quantity report for RE approval; live preview or frozen snapshot.
    capabilities:
      - Select report date (defaults today, max today)
      - View live preview of today's annotations (delta, prior cumulative, new cumulative, vs contract %)
      - See over-contract item count badge
      - Submit daily report for RE review (freezes snapshot)
      - Resubmit if snapshot is stale after re-annotation
      - Reopen rejected report to edit
      - View status banners (draft, submitted-pending-RE, approved, rejected with reason)

  - id: re-review
    file: src/pages/ReReview.tsx
    route: /re-review
    audience: resident_engineer | admin | pm (read-only)
    status: shipped
    purpose: Resident Engineer queue to approve or reject inspector daily reports across projects.
    capabilities:
      - Select project from dropdown
      - Filter queue by status (submitted / approved / rejected)
      - Filter by inspector
      - Filter by date range
      - Approve individual report
      - Reject individual report with reason
      - Bulk approve all visible pending reports
      - Read-only queue for project owners who are not RE/admin

  - id: documents
    file: src/pages/Documents.tsx
    route: /project/:projectId/documents
    audience: pm | admin | inspector (photos/daily_reports folders only)
    status: shipped
    purpose: Full document management system per project with folder tree, versioning, trash, search, preview.
    capabilities:
      - Browse hierarchical folder tree (system folders + custom folders)
      - Select folder and view its documents list
      - Search documents by name within current folder
      - Sort by name, size, or date (asc/desc toggle)
      - Upload files (drag-drop or file picker) with per-file status queue and auto-versioning
      - Upload folder (folder input)
      - Multi-select documents with select-all toggle
      - Bulk download selected files
      - Bulk soft-delete (move to Trash) with undo toast
      - Rename document (inline)
      - Move document to another folder
      - Soft-delete single document (with undo)
      - Upload new version of an existing document
      - View version history for a document
      - Restore an older version as new head
      - Preview images and PDFs inline in a dialog
      - Star/favorite documents
      - View and navigate Trash folder
      - Restore soft-deleted documents from Trash
      - Hard-delete documents from Trash
      - Empty Trash
      - Create new folder
      - Rename folder
      - Delete folder
      - View uploader avatars with initials / relative timestamps
      - Breadcrumb navigation
    unbuilt_hints:
      - Star/favorite mutation wiring not visible in truncated code

  - id: p6-export
    file: src/pages/P6Export.tsx
    route: /project/:projectId/p6-export
    audience: pm | admin
    status: shipped
    purpose: Apply RE-approved daily report quantities to a contractor's Primavera PMXML baseline.
    capabilities:
      - Upload contractor PMXML (.xml) baseline file
      - View parsed project metadata and activity count
      - Set as-of cutoff date for approved quantities
      - View pay item to P6 activity mapping table with approved cumulative totals
      - Auto-map pay items to P6 activities by matching item code to Activity Id
      - Manually override each pay item's P6 Activity Id (datalist autocomplete from uploaded PMXML)
      - Clear individual mapping
      - See mapping coverage stats
      - Apply approved daily report progress to PMXML
      - View per-activity change log
      - Download updated PMXML file
      - View skipped activities (no matching mapping)

  - id: admin
    file: src/pages/Admin.tsx
    route: /admin
    audience: admin
    status: shipped
    purpose: System administration - manage users, roles, invitations, project member assignments.
    capabilities:
      - View all registered users with their assigned roles
      - Add a role to any user (admin / project_manager / inspector / resident_engineer)
      - Remove a role from any user
      - Invite a new user by email with a role (calls invite-user edge function)
      - View all pending and accepted invitations
      - Resend a pending invitation email
      - Delete a pending invitation
      - View all projects with their current member assignments
      - Assign an inspector to a specific project
      - Remove a member from a project
      - Toggle dark/light theme
      - Navigate back to dashboard

  - id: settings
    file: src/pages/Settings.tsx
    route: /settings
    audience: admin | pm | inspector | resident_engineer
    status: shipped
    purpose: Per-user native app settings - biometric unlock, push notifications, background sync.
    capabilities:
      - View account email
      - Enable/disable biometric unlock (Face ID / Touch ID / fingerprint) - native only
      - Enable/disable push notifications - native only
      - Enable/disable background sync - native only
    unbuilt_hints:
      - All three toggle controls disabled on web (controls render but greyed out)

  - id: xer-demo
    file: src/pages/XerDemo.tsx
    name: XerLens CPM Scheduler Demo
    route: /mcfa/demo
    audience: public
    status: shipped
    purpose: Public interactive demo of the XerLens CPM scheduling tool suite (MCFA pitch).
    capabilities:
      - Upload a Primavera .xer file or load sample NJTA baseline
      - Load a 60-day progress update XER
      - Run DCMA-14 audit (14 checks)
      - View per-check results with pass/fail badges and offending activity lists
      - Generate RE feedback memo from DCMA findings
      - Copy memo to clipboard
      - Download memo as PDF (jsPDF)
      - Download memo as DOCX
      - Compare baseline vs update XER (SPI, CPI, % complete, activity-level slip)
      - View Gantt-style slip chart (Recharts)
      - Export chart as PNG
      - Export progress summary PDF
      - View top-slipping activities with lag chips
      - Build TIA fragnet (delay type, activity, calendar days)
      - Generate TIA narrative (NJDOT 108-03 compliant)
      - View NJDOT WBS tree
      - Check NJDOT milestone compliance (M100, M500, M950)
      - View compliance snapshot
      - Select AACE estimate class (5 -> 4 -> 3 -> 2 -> 1) and view accuracy band
      - Enter cost estimate and see +/- band range
      - Upload and tag project artifacts in Module F (Files tab) with discipline/status/ISO 19650 code
      - View portfolio rollup strip
      - Start or replay animated guided tour (17 steps)
    unbuilt_hints:
      - Files tab (Module F) artifact tagging UI present but no backend persistence (demo-only)

  - id: p6-xml-demo
    file: src/pages/P6XmlDemo.tsx
    route: /p6-xml (also /mcfa/p6-xml)
    audience: public
    status: shipped
    purpose: Public standalone demo showing daily-report -> PMXML round-trip.

  - id: mcfa-pitch
    file: src/pages/McfaPitch.tsx
    route: /mcfa
    audience: public
    status: shipped
    purpose: Long-form employment proposal page for MCFA (Systems-Enabled CPM Scheduler/Estimator).

  - id: fajar-pitch
    file: src/pages/FajarPitch.tsx
    route: /fajar
    audience: public
    status: shipped
    purpose: Sales pitch for UAE equipment rental company - fleet booking + WhatsApp automation.
    unbuilt_hints:
      - Availability calendar and reservation flow are demo-only (seed-based, no backend)

  - id: demo
    file: src/pages/Demo.tsx
    route: /demo
    audience: anonymous | public
    status: shipped
    purpose: Fully functional in-browser quantity takeoff demo with 12-step guided walkthrough.
    unbuilt_hints:
      - No data persistence in demo mode

  - id: not-found
    file: src/pages/NotFound.tsx
    route: "*"
    audience: public
    status: shipped
    purpose: Catch-all 404 page.
```

## Cross-cutting capabilities

- Authentication & route guards (ProtectedRoute / AuthRoute / AdminRoute in App.tsx)
- Offline persistence (PersistQueryClientProvider + createIdbPersister with 14 cached query prefixes)
- Dark / light theme toggle (useTheme)
- Global toast notifications (Radix Toaster + Sonner)
- PWA shell (PwaShell component with SW registration + install prompt)
- Biometric gate wrapper (BiometricGate)
- Native first-run wizard (NativeFirstRun)
- Keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
- Notification bell with Supabase realtime
- ConfirmDialog (useConfirm hook + shared dialog)
- Real-time collaborative presence (useProject -> onlineUsers via Supabase realtime channel)
- Guided tours (useTour + GuidedTour; XerDemo has its own XerLensTour with 17 steps)
- Role-based UI branching (useAuth: isAdmin, isManager, isInspector, isResidentEngineer)
- TooltipProvider global context
