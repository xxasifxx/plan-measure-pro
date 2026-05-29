// Path → stream assignment table for code-only leaves.
// Order matters: first matching regex wins. Fall through → "97".

export const STREAM_RULES = [
  // ── 20 Sales & Pitch (landing/marketing assets) ─────────────────────────
  [/^src\/assets\/(hero-|highway-|inspector-|blueprint-|gps-field-)/, '20'],
  [/^src\/assets\/app-icon-master\.png$/, '15'],

  // ── 11 Schedule ─────────────────────────────────────────────────────────
  [/^src\/components\/schedule\//, '11'],
  [/^src\/lib\/schedule\//, '11'],
  [/^src\/hooks\/usePayItemActivityMap\.ts$/, '11'],
  [/^src\/components\/GanttUploader\.tsx$/, '11'],
  [/^src\/pages\/P6.*\.tsx$/, '11'],
  [/^supabase\/functions\/parse-schedule\//, '11'],

  // ── 13 Export & Interop ─────────────────────────────────────────────────
  [/^src\/lib\/p6xml\//, '13'],
  [/^src\/lib\/export-utils\.ts$/, '13'],

  // ── 15 Offline & Native ─────────────────────────────────────────────────
  [/^src\/lib\/native\//, '15'],
  [/^src\/lib\/offline\//, '15'],
  [/^src\/lib\/pwa\.ts$/, '15'],
  [/^src\/components\/(BiometricGate|SyncPanel|PwaShell|NativeFirstRun)\.tsx$/, '15'],
  [/^src\/hooks\/(useNetworkStatus|useOutbox)\.ts$/, '15'],
  [/^capacitor\.config\.ts$/, '15'],

  // ── 16 Mobile Field Ergonomics ──────────────────────────────────────────
  [/^src\/components\/Mobile/, '16'],

  // ── 14 Measurement & Geometry ───────────────────────────────────────────
  [/^src\/lib\/(geometry|geo-transform)\.ts$/, '14'],
  [/^src\/components\/Gps/, '14'],

  // ── 05 Field Capture ────────────────────────────────────────────────────
  [/^src\/components\/(PdfCanvas|Toolbar)\.tsx$/, '05'],

  // ── 07 Quantity → Payment ───────────────────────────────────────────────
  [/^src\/lib\/(approved-quantities|daily-report-snapshot)\.ts$/, '07'],
  [/^src\/components\/(SummaryPanel|ReReviewCard|ReRejectDialog)\.tsx$/, '07'],
  [/^src\/pages\/ReReview\.tsx$/, '07'],
  [/^src\/hooks\/useReReviewQueue\.ts$/, '07'],

  // ── 06 Daily Report ─────────────────────────────────────────────────────
  [/^src\/pages\/DailyReport\.tsx$/, '06'],
  [/^src\/hooks\/useDailyReport\.ts$/, '06'],

  // ── 08 Photo Evidence ───────────────────────────────────────────────────
  [/^supabase\/functions\/tag-photo\//, '08'],

  // ── 09 Standard Specs ───────────────────────────────────────────────────
  [/^src\/components\/SpecViewer\.tsx$/, '09'],
  [/^src\/lib\/specs-utils\.ts$/, '09'],

  // ── 10 Document Management ──────────────────────────────────────────────
  [/^src\/pages\/Documents\.tsx$/, '10'],
  [/^src\/hooks\/useDocuments\.ts$/, '10'],
  [/^src\/lib\/(pdf-utils|storage)\.ts$/, '10'],

  // ── 12 Project Health & Controls ────────────────────────────────────────
  [/^src\/pages\/ProjectControls\.tsx$/, '12'],

  // ── 17 Notifications & Presence ─────────────────────────────────────────
  [/^src\/components\/NotificationBell\.tsx$/, '17'],
  [/^src\/hooks\/useNotifications\.ts$/, '17'],
  [/^supabase\/functions\/send-push\//, '17'],

  // ── 19 Onboarding & Tutorials ───────────────────────────────────────────
  [/^src\/pages\/Demo\.tsx$/, '19'],
  [/^src\/components\/(GuidedTour|WelcomeCarousel)\.tsx$/, '19'],
  [/^src\/hooks\/useTour\.ts$/, '19'],

  // ── 20 Sales & Pitch ────────────────────────────────────────────────────
  [/^src\/pages\/(Landing|McfaPitch|FajarPitch)\.tsx$/, '20'],

  // ── 01 Identity & Access ────────────────────────────────────────────────
  [/^src\/pages\/(Auth|ResetPassword|Admin|Settings)\.tsx$/, '01'],
  [/^src\/components\/TeamManager\.tsx$/, '01'],
  [/^src\/hooks\/useAuth\.tsx$/, '01'],
  [/^supabase\/functions\/invite-user\//, '01'],

  // ── 02 Portfolio & PM Home ──────────────────────────────────────────────
  [/^src\/pages\/Dashboard\.tsx$/, '02'],
  [/^src\/components\/ProjectSidebar\.tsx$/, '02'],
  [/^src\/hooks\/useProjects?\.ts$/, '02'],

  // ── 03 Project Onboarding ───────────────────────────────────────────────
  [/^src\/pages\/Index\.tsx$/, '03'],

  // ── 98 Build & Infra ────────────────────────────────────────────────────
  [/^(vite\.config|tailwind\.config|postcss\.config|eslint\.config|tsconfig.*|components\.json|index\.html|src\/vite-env\.d|src\/App\.css|src\/App\.tsx|src\/main\.tsx|src\/index\.css)/, '98'],
  [/^supabase\/config\.toml$/, '98'],
  [/^scripts\//, '98'],

  // ── Verification ────────────────────────────────────────────────────────
  [/^src\/test\//, '18'],

  // ── 99 Cross-cutting (UI primitives, generic plumbing) ──────────────────
  [/^src\/components\/ui\//, '99'],
];

export const TABLE_TO_STREAM = {
  profiles: '01',
  user_roles: '01',
  invitations: '01',
  projects: '02',
  project_members: '02',
  pay_items: '04',
  annotations: '05',
  calibrations: '05',
  annotation_photos: '08',
  daily_reports: '06',
  daily_report_snapshots: '06',
  daily_report_comments: '06',
  v_approved_pay_item_quantities: '07',
  documents: '10',
  document_folders: '10',
  schedule_activities: '11',
  schedule_baselines: '11',
  schedule_calendars: '11',
  schedule_resources: '11',
  activity_assignments: '11',
  activity_pay_items: '11',
  activity_relationships: '11',
  activity_resource_assignments: '11',
  baseline_activities: '11',
  project_schedule_meta: '11',
  geo_calibrations: '14',
  scorecard_metrics: '12',
  rocks: '12',
  demo_requests: '20',
  device_tokens: '17',
  notifications: '17',
};

export const STREAM_NAMES = {
  '01': 'Identity & Access',
  '02': 'Portfolio & PM Home',
  '03': 'Project Onboarding',
  '04': 'Pay Item Catalog',
  '05': 'Field Capture',
  '06': 'Daily Report Lifecycle',
  '07': 'Quantity to Payment',
  '08': 'Photo Evidence',
  '09': 'Standard Specifications',
  '10': 'Document Management',
  '11': 'Schedule Management',
  '12': 'Project Health & Controls',
  '13': 'Data Export & Interoperability',
  '14': 'Measurement & Geometry Engine',
  '15': 'Offline & Native Durability',
  '16': 'Mobile Field Ergonomics',
  '17': 'Notifications & Presence',
  '18': 'Compliance & Audit',
  '19': 'Onboarding & Tutorials',
  '20': 'Sales & Pitch',
  '97': 'Plumbing',
  '98': 'Build & Infra',
  '99': 'Cross-cutting',
};

export const DB_FUNCTION_TO_STREAM = {
  has_role: '01',
  assign_owner_role: '01',
  handle_new_user: '01',
  accept_invitation: '01',
  seed_demo_users: '01',
  is_project_member: '02',
  projects_seed_folders: '03',
  seed_project_standard_folders: '03',
  daily_reports_status_transition: '06',
  daily_reports_status_side_effects: '06',
  document_folders_block_nonempty_delete: '10',
  replace_project_schedule: '11',
  capture_baseline: '11',
  delete_baseline: '11',
  schedule_activities_validate_constraint: '11',
  update_updated_at_column: '97',
};

export const DB_ENUM_TO_STREAM = {
  app_role: '01',
  resource_type: '11',
};

export const STORAGE_BUCKET_TO_STREAM = {
  'project-pdfs': '05',
  'specs-pdfs': '09',
  'annotation-photos': '08',
  'project-documents': '10',
};

export const PUBLIC_PATH_RULES = [
  [/^public\/(llms\.txt|sitemap\.xml|robots\.txt)$/, '20'],
  [/^public\/(manifest\.webmanifest|favicon|.*icon.*\.png)/, '15'],
  [/^public\/exports\//, '13'],
];

export function streamForPath(path) {
  for (const [re, sn] of STREAM_RULES) if (re.test(path)) return sn;
  return '97';
}

export function streamForPublicPath(path) {
  for (const [re, sn] of PUBLIC_PATH_RULES) if (re.test(path)) return sn;
  return '97';
}

