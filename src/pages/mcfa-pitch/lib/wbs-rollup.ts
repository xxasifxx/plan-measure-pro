/**
 * MCFA pitch rollup: collapse 22 source streams into 5 phases and translate
 * jargon verdicts into plain-English status. Pure data + functions, no React.
 */

export type PhaseId = 'foundation' | 'field' | 'office' | 'scheduling' | 'gtm';
export type Status = 'Built' | 'In Progress' | 'Needs QA' | 'Planned';

export interface PhaseStream {
  key: string;
  code: string;          // "01"
  name: string;          // "Identity & Access"
  deliverable: string;   // one plain-English sentence
}

export interface Phase {
  id: PhaseId;
  name: string;
  blurb: string;
  streams: PhaseStream[];
}

export const PHASES: Phase[] = [
  {
    id: 'foundation',
    name: 'Phase 1 — Foundation',
    blurb: 'Accounts, projects, plan sets, and the data model everything else stands on.',
    streams: [
      { key: '01-identity-and-access', code: '01', name: 'Identity & Access',
        deliverable: 'Sign in, invite teammates, and assign Admin / PM / RE / Inspector roles.' },
      { key: '02-portfolio-and-pm-home', code: '02', name: 'Portfolio & PM Home',
        deliverable: 'A dashboard listing every contract a PM owns, with health indicators.' },
      { key: '03-project-onboarding', code: '03', name: 'Project Onboarding',
        deliverable: 'Create a contract, upload the plan PDF, and add the team in under five minutes.' },
      { key: '10-document-management', code: '10', name: 'Document Management',
        deliverable: 'Versioned plan sheets, RFIs, and submittals stored against the contract.' },
    ],
  },
  {
    id: 'field',
    name: 'Phase 2 — Field Capture',
    blurb: 'What the inspector does on a tablet, in the field, often offline.',
    streams: [
      { key: '04-pay-item-catalog', code: '04', name: 'Pay Item Catalog',
        deliverable: 'Import the NJTA bid schedule; every measurement maps to a pay item with the right unit.' },
      { key: '05-field-capture', code: '05', name: 'Field Capture',
        deliverable: 'Draw, measure, and annotate directly on plan sheets with engineering-grade tools.' },
      { key: '08-photo-evidence', code: '08', name: 'Photo Evidence',
        deliverable: 'Geotagged photos attached to each measurement for the audit trail.' },
      { key: '14-measurement-and-geometry-engine', code: '14', name: 'Measurement & Geometry Engine',
        deliverable: 'Length, area, and volume math that matches what an engineer would compute by hand.' },
      { key: '15-offline-and-native-durability', code: '15', name: 'Offline & Native Durability',
        deliverable: 'Inspectors work without signal; everything queues and syncs when reconnected.' },
      { key: '16-mobile-field-ergonomics', code: '16', name: 'Mobile Field Ergonomics',
        deliverable: 'Touch targets, gestures, and screens that work in gloves and sunlight.' },
    ],
  },
  {
    id: 'office',
    name: 'Phase 3 — Office Workflow',
    blurb: 'The RE/PM workflow that turns raw measurements into approved pay quantities.',
    streams: [
      { key: '06-daily-report-lifecycle', code: '06', name: 'Daily Report Lifecycle',
        deliverable: 'Draft → submit → RE review → approve, with a clean rejection loop.' },
      { key: '07-quantity-to-payment', code: '07', name: 'Quantity to Payment',
        deliverable: 'Approved quantities roll up into monthly estimates ready for payment.' },
      { key: '09-standard-specifications', code: '09', name: 'Standard Specifications',
        deliverable: 'NJTA 7th Edition spec sections searchable inline while measuring.' },
      { key: '17-notifications-and-presence', code: '17', name: 'Notifications & Presence',
        deliverable: 'Real-time presence and alerts so the RE knows when something needs review.' },
      { key: '19-onboarding-and-tutorials', code: '19', name: 'Onboarding & Tutorials',
        deliverable: 'Guided tours so a new inspector is productive on day one.' },
    ],
  },
  {
    id: 'scheduling',
    name: 'Phase 4 — Scheduling & Reporting',
    blurb: 'The MCFA-relevant work: P6 round-trip, compliance, and exports.',
    streams: [
      { key: '11-schedule-management', code: '11', name: 'Schedule Management',
        deliverable: 'Import the contractor’s P6 XML, view activities, and apply progress updates.' },
      { key: '12-project-health-and-controls', code: '12', name: 'Project Health & Controls',
        deliverable: 'SPI / CPI / variance surfaced weekly instead of after the post-mortem.' },
      { key: '13-data-export-and-interoperability', code: '13', name: 'Data Export & Interoperability',
        deliverable: 'Excel daily reports and P6 XML exports that drop into existing workflows.' },
      { key: '18-compliance-and-audit', code: '18', name: 'Compliance & Audit',
        deliverable: 'Every quantity traceable from plan sheet to payment, with full provenance.' },
    ],
  },
  {
    id: 'gtm',
    name: 'Phase 5 — Go-to-Market',
    blurb: 'Marketing, pricing, and sales surfaces — the last 10%.',
    streams: [
      { key: '20-sales-and-pitch', code: '20', name: 'Sales & Pitch',
        deliverable: 'Landing page, partner pitches, and demo flow that close deals.' },
    ],
  },
];

const STREAM_TO_PHASE = new Map<string, PhaseId>();
for (const p of PHASES) for (const s of p.streams) STREAM_TO_PHASE.set(s.key, p.id);

export function getPhaseFor(streamKey: string): PhaseId | null {
  return STREAM_TO_PHASE.get(streamKey) ?? null;
}

/**
 * Translate a backlog entry's source_type or a capability verdict into the
 * 4-status pill set MCFA actually wants to read.
 */
export function translateVerdict(input: {
  verdict?: string | null;
  sourceType?: string | null;
}): Status {
  const v = (input.verdict ?? '').toLowerCase();
  const t = (input.sourceType ?? '').toLowerCase();
  if (v === 'implemented') return 'Built';
  if (t === 'verification_gap') return 'Needs QA';
  // Code is wired but lacks end-to-end verification → treat as Needs QA, not In Progress.
  if (v === 'partial' || t === 'capability_partial') return 'Needs QA';
  if (v === 'missing' || t === 'capability_missing' || t === 'risk') return 'In Progress';
  if (v === 'planned' || t === 'marketing_promise') return 'Planned';
  return 'Planned';
}

/** Roll a list of stream verdicts into a single phase-level status. */
export function rollupStatus(statuses: Status[]): Status {
  if (statuses.length === 0) return 'Planned';
  if (statuses.every(s => s === 'Built')) return 'Built';
  if (statuses.every(s => s === 'Built' || s === 'Needs QA')) return 'Needs QA';
  if (statuses.some(s => s === 'In Progress')) return 'In Progress';
  if (statuses.some(s => s === 'Needs QA')) return 'Needs QA';
  if (statuses.some(s => s === 'Built')) return 'In Progress';
  return 'Planned';
}

export const STATUS_COLORS: Record<Status, string> = {
  'Built':       'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'In Progress': 'bg-amber-500/15  text-amber-300  border-amber-500/30',
  'Needs QA':    'bg-sky-500/15    text-sky-300    border-sky-500/30',
  'Planned':     'bg-slate-500/15  text-slate-300  border-slate-500/30',
};
