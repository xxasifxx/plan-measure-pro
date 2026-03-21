

# Production-Ready Architecture: Multi-User System with Supabase

## The Shift

Currently: Everything in `localStorage`, single user, PDFs lost on refresh, no auth.

Target: Project managers configure projects server-side; inspectors log in and work on pre-configured projects. PDFs, calibrations, annotations, and pay items all persist in the cloud.

## Prerequisites

**Lovable Cloud (Supabase)** must be enabled first. No connection exists yet — we need to set this up before any implementation.

## Database Schema

```text
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  auth.users  │────▶│  user_roles   │     │   profiles    │
│              │     │  (admin/mgr/  │     │  (name, etc.) │
│              │     │   inspector)  │     │               │
└──────┬───────┘     └──────────────┘     └───────────────┘
       │
       │  ┌──────────────────┐
       └──▶│    projects      │
           │ name, contract#  │
           │ pdf_storage_path │
           │ toc (jsonb)      │
           │ created_by (FK)  │
           └───────┬──────────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌────────────────┐
│ pay_items  │ │calibrations│ │project_members │
│ per project│ │ per page   │ │ user + project │
└───────────┘ └───────────┘ │ (assignment)   │
                             └────────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │ annotations   │
                            │ per project   │
                            │ per user      │
                            └──────────────┘
```

### Tables

1. **profiles** — `id (FK auth.users)`, `full_name`, `email`, `created_at`
2. **user_roles** — `user_id (FK)`, `role` (enum: `admin`, `project_manager`, `inspector`)
3. **projects** — `id`, `name`, `contract_number`, `pdf_storage_path`, `toc (jsonb)`, `created_by`, timestamps
4. **pay_items** — `id`, `project_id (FK)`, `item_number`, `item_code`, `name`, `unit`, `unit_price`, `color`, `contract_quantity`, `drawable`
5. **calibrations** — `id`, `project_id (FK)`, `page`, `point1/point2 (jsonb)`, `real_distance`, `pixels_per_foot`
6. **project_members** — `project_id`, `user_id`, `role` (manager vs inspector on this project)
7. **annotations** — `id`, `project_id (FK)`, `user_id (FK)`, `type`, `points (jsonb)`, `pay_item_id (FK)`, `page`, `depth`, `measurement`, `measurement_unit`

### Storage

- **Bucket: `project-pdfs`** — stores plan PDFs, accessed via signed URLs
- **Bucket: `specs-pdfs`** — stores standard specs PDFs (shared across projects or per-org)

### RLS Policies

- **Project managers** can CRUD projects they created, manage pay items/calibrations, assign inspectors
- **Inspectors** can only read project config (TOC, calibrations, pay items) and CRUD their own annotations
- Uses `has_role()` security definer function to avoid recursive RLS

## Authentication

- Email/password login (expandable to OAuth later)
- Auto-create profile on signup via DB trigger
- Role assignment: first user = admin, then admin assigns roles

## Application Flow Changes

```text
Current:  Upload PDF → configure locally → annotate → export
                    (all in one session, one user)

Production:
  Project Manager:  Login → Create project → Upload PDF → Set TOC →
                    Calibrate pages → Import pay items → Assign inspectors

  Inspector:        Login → See assigned projects → Select project →
                    PDF loads from storage → Annotate with pre-set pay items →
                    Annotations save to DB in real-time
```

## Implementation Phases

### Phase 1: Enable Lovable Cloud + Auth
- Enable Supabase via Lovable Cloud
- Set up auth with login/signup pages
- Create profiles table + trigger
- Create user_roles table + `has_role()` function

### Phase 2: Database Migration
- Create all tables (projects, pay_items, calibrations, project_members, annotations)
- Set up RLS policies
- Create storage buckets with policies

### Phase 3: Replace localStorage with Supabase
- New `useProject` hook that reads/writes to Supabase instead of localStorage
- PDF upload → Supabase Storage, load via signed URL
- Annotations auto-save to DB
- Pay items, calibrations, TOC all persist server-side

### Phase 4: Role-Based UI
- **Project Manager view**: project creation wizard, calibration tools, pay item import, inspector assignment
- **Inspector view**: project list (assigned only), streamlined annotation-focused UI
- Shared: the canvas, toolbar, and annotation tools remain the same

### Phase 5: Project List & Dashboard
- Landing page shows assigned projects (not empty state)
- Project cards with status, last updated, annotation counts
- Quick-open to jump into a project

## Technical Notes

- The `useProject` hook is the primary refactor target — it currently wraps `localStorage` calls and will wrap Supabase queries instead
- `storage.ts` gets replaced entirely with Supabase client calls
- PDF loading changes from `File` object to signed URL from Supabase Storage
- The canvas, drawing tools, and measurement logic remain unchanged
- Annotations gain a `user_id` field so inspectors see only their own work (or all, depending on policy)

## First Step

Before any code: **enable Lovable Cloud** to get a Supabase instance. Want me to proceed with that?

