import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import heroScreenshot from '@/assets/hero-screenshot.jpg';
import {
  ArrowRight, Mail, ExternalLink, Cpu, Code2, ClipboardCheck, HardHat,
  CheckCircle2, Workflow, Database, Network, Bot, Target, Camera,
  TrendingUp, Award, Users, Zap, Linkedin, Github, WifiOff, Image as ImageIcon,
  GitBranch, Clock, DollarSign, FileSpreadsheet, Building2, Plane, MapPin,
  Gauge, Layers, Activity, FileCheck, Briefcase, X, Check, Minus,
  MessageSquare, Anchor, TrendingDown, AlertTriangle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* animation helpers                                                  */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0, 0, 0.2, 1] as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* ------------------------------------------------------------------ */
/* data — sourced verbatim from MCFA_BYOR_Proposal.pdf                */
/* ------------------------------------------------------------------ */

/* The 10 core activities of the systems-enabled CPM Scheduler/Estimator role.
 * Sourced from the Strategic Realignment proposal, Section 3. */
const tenCoreActivities = [
  { n: '01', icon: GitBranch,      title: 'Baseline Schedule Engineering & Compliance',
    body: 'Develop and maintain resource-loaded P6 baselines for transportation projects in strict accordance with NJDOT\'s Construction Scheduling Standard Coding & Procedures Manual — required WBS hierarchies and milestone codes (M100 Advertise, M500 Construction Start, M950 Completion).' },
  { n: '02', icon: FileCheck,      title: 'Algorithmic Contractor Schedule Assessment',
    body: 'Move beyond visual review. Automated parsing flags negative lags, open-ended activities, and out-of-sequence progress before formal acceptance — aligning with Trauner methodologies enforced by NYSDOT.' },
  { n: '03', icon: ClipboardCheck, title: 'DCMA 14-Point QA & Mathematical Stability',
    body: 'Continuous auditing against the DCMA 14 — logic ≥ 95%, hard constraints < 5%, high duration > 44d flagged, negative float instantly mitigated. The schedule network stays defensible.' },
  { n: '04', icon: DollarSign,     title: 'AACE-Compliant Cost Estimating',
    body: 'Deterministic and probabilistic estimates structured per AACE International 98R-18, evolving Class 5 (Concept) → Class 1 (Bid Check) as design matures.' },
  { n: '05', icon: TrendingUp,     title: 'Dynamic Progress Telemetry & EVM',
    body: 'Replace static PDF Gantts with live dashboards. SPI / CPI computed weekly so deviations surface in the L10 — not in the post-mortem.' },
  { n: '06', icon: Users,          title: 'Cross-Disciplinary Coordination & L10 Integration',
    body: 'Translate P6 network logic into weekly operational targets. Schedule deviations drop straight to the L10 Issues List for IDS resolution.' },
  { n: '07', icon: AlertTriangle,  title: 'Automated Time Impact Analysis (TIA)',
    body: 'PMs type a plain-text delay note → the system drafts the fragnet and TIA narrative. No tedious manual reconstruction of CPM logic.' },
  { n: '08', icon: WifiOff,        title: 'Drag-and-Drop XER Tools',
    body: 'Auth-agnostic, in-browser PWAs that translate proprietary .xer files into clear progress dashboards — bridging legacy P6 and modern reporting without IT integration.' },
  { n: '09', icon: Layers,         title: 'Multi-Project Portfolio Integration',
    body: 'Independent project schedules rolled into a master program view, resolving cross-project resource constraints and giving executives a holistic Mid-Atlantic snapshot.' },
  { n: '10', icon: Briefcase,      title: 'Bid Scheduling & Proposal Support',
    body: 'Rapid quantity extraction and high-level CPM logic for prospective bids — a competitive differentiator in public-sector procurement, with no added estimating headcount.' },
];

const credentials = [
  { icon: Award, label: 'PMP', sub: '2024–2027' },
  { icon: HardHat, label: 'NICET HCI Level I', sub: 'Exams complete' },
  { icon: ClipboardCheck, label: 'TCC Certified', sub: 'Traffic Control Coordinator' },
  { icon: Building2, label: 'BSET — NJIT', sub: 'Engineering Technology' },
  { icon: MapPin, label: 'Garden State Pkwy', sub: 'Churchill / Trilon — Colonia repairs' },
  { icon: Plane, label: 'Airbus A400M', sub: 'Collins Aerospace — safety-critical PC&V' },
];

const phases = [
  {
    n: '01',
    icon: Activity,
    title: 'XerLens DCMA-14 + RE Memo Auto-Generation',
    body: 'In-browser auditor runs all 14 DCMA checks against contractor XER submissions and emits a plain-English memo to the Resident Engineer with accept / accept-with-conditions / reject recommendation, NJDOT spec citations, and offending activity codes. Already shipped — see Module A on /mcfa/demo.',
    accent: 'border-emerald-500/40 bg-emerald-500/5',
    pill: 'Q1 ROCK · 90 DAYS',
  },
  {
    n: '02',
    icon: TrendingUp,
    title: 'Progress Telemetry · SPI / CPI from XER pairs',
    body: 'Baseline + monthly update XER pair → instant SPI, CPI, % complete, and activity-level slip. Drops the chart into status emails and assembles a one-page monthly progress PDF. Replaces the manual "compare two Gantts" pass that today consumes ~4 hours per project per month.',
    accent: 'border-primary/40 bg-primary/5',
    pill: 'Q2 ROCK',
  },
  {
    n: '03',
    icon: Network,
    title: 'Portfolio Roll-Up + TIA Fragnet Workflow',
    body: 'Active-project schedule health on a single Newark/PANYNJ portfolio strip. TIA module drafts FS-zero-lag fragnets and a narrative letter compliant with NJDOT 108-03 — turning a 5-day delay-letter cycle into a 1-day turnaround.',
    accent: 'border-amber-500/40 bg-amber-500/5',
    pill: 'Q3 ROCK',
  },
];

/* Archetype matrix — Capability × {Trad. Scheduler, Trad. Estimator, Systems-Enabled CPM} */
const archetypeRows: Array<[string, 'no' | 'partial' | 'yes', 'no' | 'partial' | 'yes', 'no' | 'partial' | 'yes']> = [
  ['Primavera P6 Mastery',                'yes',     'partial', 'yes'],
  ['AACE 98R-18 Estimating',              'no',      'yes',     'yes'],
  ['DCMA-14 Audit Automation',            'partial', 'no',      'yes'],
  ['XER Parsing / Custom Tooling',        'no',      'no',      'yes'],
  ['NJDOT / NYSDOT Compliance Fluency',   'partial', 'partial', 'yes'],
  ['EVM Telemetry (SPI / CPI)',           'partial', 'partial', 'yes'],
  ['Time Impact Analysis (TIA) Drafting', 'partial', 'no',      'yes'],
  ['EOS / L10 Integration Fluency',       'no',      'no',      'yes'],
];

const cellGlyph = (v: 'no' | 'partial' | 'yes') => {
  if (v === 'yes')     return <Check  className="h-4 w-4 mx-auto text-emerald-400" />;
  if (v === 'partial') return <Minus  className="h-4 w-4 mx-auto text-amber-400" />;
  return                      <X      className="h-4 w-4 mx-auto text-muted-foreground/40" />;
};

const integrationLayers = [
  {
    title: 'Data Sources',
    icon: Database,
    items: ['Primavera P6 — Schedule', 'BIM 360 — Design + Docs', 'Contractor XER Submissions — Baseline + Monthly Updates'],
  },
  {
    title: 'Integration Layer',
    icon: Network,
    items: ['Extract', 'Transform', 'Validate', 'Log Errors', 'Monitor Refresh'],
    note: 'APIs + Validation + Refresh',
  },
  {
    title: 'Outputs',
    icon: TrendingUp,
    items: ['Executive Dashboard', 'Power BI Semantic Model', 'Design Traceability Dashboard'],
  },
];

/* ROI waterfall — three scenarios, annual, full portfolio adoption.
 * Conservative = the proposal's stated floor (3 projects, partial adoption).
 * Realistic    = full T&I division adoption (~8 active projects).
 * Stretch      = portfolio-wide + BD multiplier + SaaS replacement once Phase 3 is live. */
const roiScenarios = {
  conservative: {
    label: 'Conservative',
    sub: '3 projects · partial adoption · Year 1',
    rows: [
      { label: 'Reporting Time Saved',    value: 90_000,  sub: '600 hrs × $150/hr · 3 proj × 4 hrs/wk × 50 wks' },
      { label: 'Reduced Rework',          value: 24_000,  sub: 'Quantity & documentation accuracy' },
      { label: 'Earlier Risk Visibility', value: 16_000,  sub: 'Live IDR ↔ P6 variance flagging' },
      { label: 'Proposal Differentiator', value: 50_000,  sub: 'Faster bid-pursuit schedule narratives · higher BD throughput' },
    ],
  },
  realistic: {
    label: 'Realistic',
    sub: '8 projects · full T&I division · Year 2',
    rows: [
      { label: 'Reporting Time Saved',    value: 240_000, sub: '8 proj × 4 hrs/wk × 50 wks × $150/hr' },
      { label: 'Reduced Rework & Claims', value: 95_000,  sub: 'Audit-grade evidence · claim defense' },
      { label: 'Earlier Risk Visibility', value: 75_000,  sub: 'Float-erosion caught weeks earlier' },
      { label: 'Proposal Win-Rate Lift',  value: 180_000, sub: '+2 wins/yr × ~$90k avg margin contribution' },
      { label: 'SaaS Cost Avoidance',     value: 45_000,  sub: 'Acumen Fuse seats · scheduling analytics add-ons' },
      { label: 'Senior Scheduler Hrs',    value: 120_000, sub: '~600 hrs reclaimed × $200/hr fully loaded' },
    ],
  },
  stretch: {
    label: 'Stretch',
    sub: 'Portfolio-wide · Phase 3 P6 telemetry live',
    rows: [
      { label: 'Reporting Time Saved',     value: 420_000, sub: '14+ projects on automated IDR pipeline' },
      { label: 'Reduced Rework & Claims',  value: 180_000, sub: 'Defensible audit trail across portfolio' },
      { label: 'Earlier Risk Visibility',  value: 200_000, sub: 'Live telemetry · proactive mitigation' },
      { label: 'Proposal Win-Rate Lift',   value: 360_000, sub: '+4 wins/yr · differentiated digital pitch' },
      { label: 'SaaS Cost Avoidance',      value: 90_000,  sub: 'Acumen + ad-hoc scheduling analytics replaced' },
      { label: 'Senior Scheduler Hrs',     value: 240_000, sub: '~1,200 hrs reclaimed firm-wide' },
      { label: 'New Service Line Revenue', value: 350_000, sub: 'Productized digital-controls offering to clients' },
    ],
  },
} as const;
type ScenarioKey = keyof typeof roiScenarios;

// EOS Scorecard — leading indicators reviewed in weekly L10 meetings (PDF §3, short-term KPIs)
const scorecard = [
  { metric: 'Schedule Health (DCMA-14 logic)', target: '≥ 95%',   why: 'PDF §3 · mathematically defensible network · prevents DOT rejection.' },
  { metric: 'Reporting Velocity',              target: '≤ 72 hr', why: 'PDF §3 · time from contractual data date to distributed monthly update.' },
  { metric: 'L10 Schedule Integration',        target: '100%',    why: 'PDF §3 · schedule health metric on the weekly L10 scorecard for every assigned project.' },
  { metric: 'XER Processing Time',             target: '−50%',    why: 'Entrepreneurial Rock · vs manual formatting/validation baseline.' },
];
// Lagging indicators reviewed quarterly / annually (PDF §3, long-term KPIs)
const laggingKpis = [
  { metric: 'DOT Baseline Approval Velocity', target: '≤ 2 cycles', why: 'PDF §3 · average DOT submissions to first-pass acceptance.' },
  { metric: 'AACE Estimating Accuracy',       target: '± 5%',        why: 'PDF §3 · final Class 1 estimate vs awarded construction bid.' },
  { metric: 'Administrative Time Savings',    target: '≥ 30%',       why: 'PDF §3 · documented reduction in manual reporting hours via automation.' },
];
// Quarterly Rocks (90-day execution priorities) — PDF §5 manager-led model
const rocks = [
  { quarter: 'Q1', text: 'XerLens DCMA-14 auditor — GA across all active T&I projects (PM-approved Rock).' },
  { quarter: 'Q2', text: 'Automated TIA fragnet workflow — reduce delay-letter turnaround from 5 days to 1.' },
  { quarter: 'Q3', text: 'Portfolio EVM telemetry — live SPI/CPI feed into the L10 scorecard.' },
];

// PDF §2 weekly cadence — what the role actually does day-to-day
const weeklyCadence = [
  { day: 'MON', focus: 'Audit',   title: 'Contractor schedule submission review',  body: 'Run DCMA-14 + NJDOT logic check on every contractor XER. Generate plain-English memo to the Resident Engineer with accept / reject recommendation.' },
  { day: 'TUE', focus: 'Update',  title: 'Progress vs baseline',                   body: 'Apply field actuals to P6, recompute SPI / CPI, surface the top-10 slipping activities. Distribute monthly update within 72 hours of data date.' },
  { day: 'WED', focus: 'Report',  title: 'L10 scorecard contribution',             body: 'Two numbers on the weekly L10 (PDF §5): Schedule Health Score and Reporting Latency. Variance items drop straight to the Issues List.' },
  { day: 'THU', focus: 'Estimate',title: 'AACE Class 5 → Class 1 progression',     body: 'Advance assigned projects through AACE 98R-18 classes as design matures, narrowing the accuracy band toward the ±5% lagging-KPI target.' },
  { day: 'FRI', focus: 'Roll up', title: 'Portfolio view + BD support',            body: 'Consolidate active project schedules into a Newark/PANYNJ program view. Pull rapid quantity takeoffs for Business Development bid pursuits.' },
];

const compensation = [
  {
    icon: DollarSign,
    title: 'Base Salary',
    body: 'Competitive base reflecting PMP, engineering background, and cross-discipline scheduler depth — CPM, AACE estimating, NJDOT controls — covered in one seat. Compensates 1,600 billable hours plus the in-role time spent maintaining the XerLens workflow tooling.',
  },
  {
    icon: Layers,
    title: 'Internal Tool Agreement',
    body: 'MCFA granted full internal use of XerLens across its project portfolio. To preserve the cost-avoidance model, MCFA assumes responsibility for the external digital footprint costs (hosting, storage, API usage).',
  },
  {
    icon: Award,
    title: '10 Growth Units · Profit-Share',
    body: 'Full participation in the quarterly profit-share program plus the 10 Growth Units described in the JD (PDF §6). Standard MCFA benefits: 15 days vacation, 5 sick, 11 federal holidays.',
  },
];

const proofBullets = [
  'In-browser DCMA-14 audit on contractor XERs (no upload, no SaaS)',
  'Plain-English RE memo generation from audit findings',
  'SPI / CPI / slip from baseline + update XER pair',
  'Auto-drafted TIA fragnet (FS, zero lag — NJDOT 108-03)',
  'AACE Class 5→1 estimate progression with ±band display',
  'Portfolio rollup of schedule health across active projects',
];

/* Recruiter Q&A — short spoken answers, ~30 sec each. Reframed for a Project Controls Director hiring a Scheduler. */
const recruiterQA: { q: string; a: string; tag?: string }[] = [
  {
    q: 'Why $130K–$140K — is that within band for an Evergreen Senior Scheduler at MCFA?',
    a: "Yes. The PDF anchors the ask to the JD's Experienced level: $130K–$140K base, the 10 Growth Units, and standard quarterly profit-share. The PMP plus the cross-discipline depth — CPM + AACE estimating + NJDOT controls fluency in one seat — is what justifies the upper half of that band, not a markup above it.",
    tag: 'ANCHOR',
  },
  {
    q: 'How will you handle Resident Engineer communication on contractor schedule reviews?',
    a: "Plain-English memos, not screenshots of P6. The /mcfa/demo Module A turns every DCMA-14 audit into a one-page memo addressed to the RE — recommendation (accept / accept-with-conditions / reject), hard blockers, advisory flags, and next steps. The RE never has to interpret a Gantt to act on the review.",
    tag: 'RE COMMS',
  },
  {
    q: 'How does this scale across the Newark / PANYNJ portfolio?',
    a: "Module B in the demo computes SPI/CPI and slip from a baseline + monthly update XER pair. Roll that across every active project, plug the scores into the L10 scorecard, and the Project Controls Director sees the entire portfolio's health on one strip. That's the Section 3 'Integrated Reporting' deliverable, productized.",
    tag: 'PORTFOLIO',
  },
  {
    q: "What's your AACE Class 5 → Class 1 estimate progression cadence?",
    a: "Tied to design milestones, not the calendar. Concept Development → Class 5. Preliminary Engineering → Class 4. Final Design submission → Class 3 for budget authorization. PS&E package → Class 2 control estimate. Award → Class 1 for bid check and change-order pricing. Module E in the demo walks the bands explicitly.",
    tag: 'AACE 98R-18',
  },
  {
    q: "How do you satisfy NJDOT's no-negative-lag rule on contractor submissions?",
    a: "The XerLens demo flags every negative lag and open-ended activity before MCFA accepts the submission. Section 5.1 of the NJDOT Scheduling Manual prohibits both. Catching them at submission instead of at month-end is the difference between one email and a re-baseline.",
    tag: 'NJDOT COMPLIANT',
  },
  {
    q: "What if MCFA already licenses Acumen Fuse or a similar analytics tool?",
    a: "Then we use it. XerLens isn't a Fuse replacement — it's the auth-agnostic, in-browser layer that PMs and REs run themselves without bothering the scheduler. Fuse stays for deep forensic work; XerLens covers the daily 'is this submission acceptable?' question that today consumes an hour per project per week.",
    tag: 'COEXISTS',
  },
  {
    q: "How will the Project Controls Director see your performance every week?",
    a: "Two numbers on the L10 Scorecard, per PDF Section 5: Schedule Health Score (DCMA-14 logic ≥ 95%) and Reporting Latency (≤ 72 hours from data date). Quarterly Rocks are PM-approved before the quarter starts, so every Rock solves a real problem the team has flagged — not a side project.",
    tag: 'EOS L10',
  },
  {
    q: "Who owns the TakeoffPro / XerLens tooling?",
    a: "MCFA gets full internal use across its project portfolio under the employment agreement — no per-seat fees, no SaaS contract. MCFA covers the basic cloud hosting (estimated <$100/mo per the PDF) to keep the tools running for the team. Standard 'Shop Tool' arrangement.",
    tag: 'IP CLEAN',
  },
  {
    q: "How will you reduce administrative time by 30% (PDF long-term KPI)?",
    a: "By collapsing the four manual passes — XER review, monthly update report, IDR collation, executive snapshot — into one ingest pipeline. Phase 1 of TakeoffPro already eliminates the field-to-spreadsheet re-keying. XerLens collapses the contractor-review pass. The 30% target is a documented before/after, not a promise.",
    tag: 'EFFICIENCY',
  },
];

/* ------------------------------------------------------------------ */
const McfaPitch = () => {
  const [scenario, setScenario] = useState<ScenarioKey>('realistic');
  const activeRows = roiScenarios[scenario].rows;
  const activeTotal = activeRows.reduce((s, r) => s + r.value, 0);
  const maxRow = Math.max(...activeRows.map(r => r.value));
  useEffect(() => {
    document.title = 'BYOR Proposal · Senior CPM Scheduler / Estimator — Asif Muhammad, PMP';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Build Your Own Role proposal for the MCFA Evergreen CPM Scheduler/Estimator role: PMP-certified, NJDOT/NYSDOT compliant, AACE 98R-18 estimating, with auth-agnostic in-browser P6 XER tooling.';
    if (meta) meta.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description'; m.content = desc;
      document.head.appendChild(m);
    }
    // discourage indexing of this private pitch page
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      (robots as HTMLMetaElement).name = 'robots';
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex,nofollow');
  }, []);

  const mailto =
    'mailto:asif@example.com?subject=MCFA%20BYOR%20%E2%80%94%20Senior%20CPM%20Scheduler%20%2F%20Estimator&body=Hi%20Asif%2C%0A%0AI%27d%20like%20to%20schedule%20a%2030-minute%20conversation%20about%20the%20BYOR%20proposal.';

  return (
    <div className="min-h-screen bg-background text-foreground font-mono antialiased">
      {/* ============================================================ */}
      {/* TOP RIBBON                                                   */}
      {/* ============================================================ */}
      <div className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-muted-foreground tracking-widest">BYOR PROPOSAL · CONFIDENTIAL · MCFA T&amp;I DIVISION</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
            <span>v1.0</span>
            <span className="text-border">|</span>
            <span>Newark Airport · North Jersey · On-site / Remote</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="container mx-auto px-4 py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial="hidden" animate="visible" variants={stagger}
              className="lg:col-span-7 space-y-6"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] text-primary border border-primary/30 bg-primary/5 px-3 py-1.5 rounded-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                BUILD YOUR OWN ROLE · EVERGREEN POSTING · REFERRED BY SAQEEB MUHAMMAD
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                Systems-Enabled{' '}
                <span className="text-primary">CPM Scheduler / Estimator</span>{' '}
                <span className="block text-muted-foreground text-2xl md:text-3xl mt-3 font-normal">
                  for MCFA Transportation &amp; Infrastructure · Newark Airport / PANYNJ portfolio
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                <span className="text-foreground font-semibold">PMP-certified</span> · disciplined Primavera P6 + AACE
                estimating · auth-agnostic <span className="text-primary font-semibold">XER tooling</span> for NJDOT
                &amp; NYSDOT compliance. Reliable, audit-ready data so PMs can lead their projects successfully —
                MCFA's mission of <em className="text-foreground/80">Inspiring People and Places</em>, applied to
                project controls.
              </motion.p>

              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
                <div>
                  <div className="text-3xl font-bold text-primary">≥ 95%</div>
                  <div className="text-[10px] tracking-widest text-muted-foreground mt-1">DCMA-14 LOGIC TARGET</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-400">≤ 72 h</div>
                  <div className="text-[10px] tracking-widest text-muted-foreground mt-1">UPDATE DISTRIBUTION SLA</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-400">± 5%</div>
                  <div className="text-[10px] tracking-widest text-muted-foreground mt-1">AACE CLASS 1 ACCURACY</div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="font-mono">
                  <Link to="/mcfa/demo">
                    Open the weekly scheduler demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-mono">
                  <a href={mailto}><Mail className="h-4 w-4" /> 30-min walkthrough</a>
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="text-xs text-muted-foreground pt-2">
                <span className="text-foreground font-semibold">Asif Muhammad, PMP</span> · NICET HCI Level I (exams complete) ·
                BSET, NJIT · Reports to the Project Controls Director · Garden State Parkway repairs (Colonia, Churchill / Trilon)
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative border border-border bg-card/60 backdrop-blur rounded-md overflow-hidden shadow-2xl">
                  <div className="border-b border-border/60 px-3 py-2 flex items-center gap-1.5 bg-card/80">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">XERLENS · LIVE — /mcfa/demo</span>
                  </div>
                  <img src={heroScreenshot} alt="XerLens weekly scheduler workflow" className="w-full h-auto" />
                </div>
                <div className="absolute -bottom-4 -right-4 hidden md:block bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-sm shadow-xl">
                  WORKING DEMO · /mcfa/demo
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 1 · INTRODUCTION                                     */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="01" eyebrow="INTRODUCTION" title="Strategic Vision" />

          <div className="grid lg:grid-cols-2 gap-10 mt-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                MCFA's Evergreen CPM Scheduler/Estimator posting calls for disciplined Primavera P6 work, AACE-compliant
                estimating, and DOT-grade compliance — with a clear opening for an "Entrepreneurial" team member who
                automates the grunt work of project controls. Referred by <span className="text-foreground">Saqeeb Muhammad</span>,
                this proposal answers that call directly.
              </p>
              <p>
                The role reports to the <span className="text-foreground">Project Controls Director</span>, supports
                Resident Engineers on contractor schedule reviews, and feeds the L10 Scorecard with two predictive numbers
                every week. The Entrepreneurial value-add is the in-browser <span className="text-primary font-semibold">XerLens</span> tooling
                shown at <Link to="/mcfa/demo" className="text-foreground underline underline-offset-4">/mcfa/demo</Link> —
                accelerators that make the scheduler faster, not a separate role.
              </p>
              <p>
                The end-state vision aligns to MCFA's mission of <em className="text-foreground">Inspiring People and Places</em>:
                give every PM the most reliable, up-to-date schedule data on the program, so they can lead their projects
                successfully across the Newark Airport / PANYNJ portfolio.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 gap-3">
              {credentials.map((c) => (
                <motion.div key={c.label} variants={fadeUp}>
                  <Card className="bg-card/40 border-border/60 p-4 h-full">
                    <c.icon className="h-5 w-5 text-primary mb-2" />
                    <div className="text-sm font-semibold">{c.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{c.sub}</div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2 · A WEEK IN THE ROLE                               */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <SectionHeader number="02" eyebrow="WEEKLY CADENCE" title="A Week in the Role" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            The role collapses into a five-day rhythm. Each day produces a deliverable the Project Controls Director and
            Resident Engineers can act on — and the live demo at <Link to="/mcfa/demo" className="text-primary underline underline-offset-4">/mcfa/demo</Link> walks every step on a dummy NJTA project.
          </p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mt-10">
            {weeklyCadence.map((d) => (
              <motion.div key={d.day} variants={fadeUp}>
                <Card className="p-5 h-full bg-card/40 border-border/60 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-primary tracking-widest">{d.day}</span>
                    <span className="text-[10px] tracking-widest text-muted-foreground border border-border/60 px-2 py-0.5 rounded-sm">{d.focus.toUpperCase()}</span>
                  </div>
                  <div className="text-sm font-semibold mb-2 leading-tight">{d.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{d.body}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="font-mono">
              <Link to="/mcfa/demo">Walk through the live weekly demo <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 · 10 CORE ACTIVITIES                               */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="03" eyebrow="ROLE DESCRIPTION" title="The Systems-Enabled Scheduler · 10 Core Activities" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            The role consolidates traditional CPM scheduling, AACE-compliant estimating, and bespoke software tooling into a single
            project-controls function. Every activity below maps to a measurable scorecard line in Section 04.
          </p>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {tenCoreActivities.map((a) => (
              <motion.div key={a.n} variants={fadeUp}>
                <Card className="p-5 h-full bg-card/40 border-border/60 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <a.icon className="h-5 w-5 text-primary" />
                    <span className="text-[10px] tracking-widest text-muted-foreground border border-border/60 px-2 py-0.5 rounded-sm">{a.n}</span>
                  </div>
                  <div className="text-sm font-semibold mb-2 leading-tight">{a.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{a.body}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* ============================================================ */}
      {/* SECTION 4 · KPIs / ROCKS                                     */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <SectionHeader number="04" eyebrow="KPIs · EOS SCORECARD" title="Leading Indicators · Lagging Indicators · Quarterly Rocks" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            Traditional scheduling KPIs are lagging. The weekly L10 scorecard below tracks <em>predictive</em> measurables —
            problems surface early enough for IDS resolution before they become claims.
          </p>

          <div className="grid lg:grid-cols-2 gap-6 mt-10">
            <Card className="p-5 bg-card/40 border-border/60">
              <div className="text-[11px] tracking-widest text-primary mb-4">WEEKLY L10 SCORECARD · LEADING INDICATORS</div>
              <table className="w-full text-sm">
                <tbody>
                  {scorecard.map(s => (
                    <tr key={s.metric} className="border-t border-border first:border-t-0">
                      <td className="py-3 pr-2"><div className="font-semibold">{s.metric}</div><div className="text-[11px] text-muted-foreground">{s.why}</div></td>
                      <td className="py-3 text-right font-mono text-primary align-top whitespace-nowrap">{s.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card className="p-5 bg-card/40 border-border/60">
              <div className="text-[11px] tracking-widest text-emerald-400 mb-4">QUARTERLY / ANNUAL · LAGGING INDICATORS</div>
              <table className="w-full text-sm">
                <tbody>
                  {laggingKpis.map(s => (
                    <tr key={s.metric} className="border-t border-border first:border-t-0">
                      <td className="py-3 pr-2"><div className="font-semibold">{s.metric}</div><div className="text-[11px] text-muted-foreground">{s.why}</div></td>
                      <td className="py-3 text-right font-mono text-emerald-400 align-top whitespace-nowrap">{s.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 text-[11px] tracking-widest text-amber-400 mb-2">90-DAY ROCKS</div>
              <ul className="space-y-2 text-sm">
                {rocks.map(r => (
                  <li key={r.quarter} className="flex gap-3">
                    <span className="font-mono text-primary shrink-0">{r.quarter}</span>
                    <span className="text-muted-foreground">{r.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5 · CAPABILITY ARCHETYPE MATRIX                      */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="05" eyebrow="ARCHETYPE MATRIX" title="Capability Comparison" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            The Integrator adds <span className="text-foreground">repeatability, governance, and automation</span> to controls —
            without abandoning the foundational scheduling work.
          </p>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead>
                <tr className="bg-card/60">
                  <th className="text-left p-3 border-b border-r border-border font-semibold">Capability</th>
                  <th className="p-3 border-b border-r border-border text-center">
                    <div className="text-muted-foreground text-xs tracking-widest">TRADITIONAL</div>
                    <div className="font-semibold mt-0.5">Scheduler</div>
                  </th>
                  <th className="p-3 border-b border-r border-border text-center">
                    <div className="text-muted-foreground text-xs tracking-widest">TRADITIONAL</div>
                    <div className="font-semibold mt-0.5">Estimator</div>
                  </th>
                  <th className="p-3 border-b border-border text-center bg-primary/10">
                    <div className="text-primary text-xs tracking-widest">SYSTEMS-ENABLED</div>
                    <div className="font-semibold mt-0.5">CPM (you)</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {archetypeRows.map(([cap, a, b, c]) => (
                  <tr key={cap} className="hover:bg-card/40">
                    <td className="p-3 border-b border-r border-border">{cap}</td>
                    <td className="p-3 border-b border-r border-border text-center">{cellGlyph(a)}</td>
                    <td className="p-3 border-b border-r border-border text-center">{cellGlyph(b)}</td>
                    <td className="p-3 border-b border-border text-center bg-primary/5">{cellGlyph(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Full</span>
              <span className="flex items-center gap-1.5"><Minus className="h-3.5 w-3.5 text-amber-400" /> Partial</span>
              <span className="flex items-center gap-1.5"><X className="h-3.5 w-3.5 text-muted-foreground/40" /> Not in scope</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 6 · INTEGRATION ARCHITECTURE                         */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <SectionHeader number="06" eyebrow="ARCHITECTURE" title="Project Controls Systems Integration" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            Traceable transformations · stable metric definitions · audit-ready outputs.
          </p>

          <div className="mt-10 grid md:grid-cols-3 gap-4 items-stretch">
            {integrationLayers.map((layer, i) => (
              <div key={layer.title} className="relative">
                <Card className="p-5 h-full bg-card/40 border-border/60">
                  <div className="flex items-center gap-2 mb-4">
                    <layer.icon className="h-5 w-5 text-primary" />
                    <div className="text-xs tracking-widest text-muted-foreground">LAYER {i + 1}</div>
                  </div>
                  <div className="text-lg font-semibold mb-1">{layer.title}</div>
                  {layer.note && <div className="text-[11px] text-primary mb-3">{layer.note}</div>}
                  <ul className="space-y-1.5 mt-3">
                    {layer.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-primary/60" /> {it}
                      </li>
                    ))}
                  </ul>
                </Card>
                {i < integrationLayers.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 h-5 w-5 text-primary z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 7 · ROI WATERFALL                                    */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="07" eyebrow="RETURN ON INVESTMENT" title="ROI Waterfall · Annual" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            The PDF cites the conservative floor: <span className="text-foreground">$180K</span> across 3 projects in Year 1.
            That number assumes <em>partial</em> adoption. Toggle the scenarios below to see what happens when the platform
            scales across the T&amp;I division and Phase 3 P6 telemetry comes online.
          </p>

          {/* scenario toggle */}
          <div className="mt-8 inline-flex items-center gap-1 p-1 border border-border rounded-md bg-card/40">
            {(Object.keys(roiScenarios) as ScenarioKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setScenario(k)}
                className={`px-4 py-2 text-xs tracking-widest rounded-sm transition-colors ${
                  scenario === k
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {roiScenarios[k].label.toUpperCase()}
              </button>
            ))}
            <div className="px-4 text-xs text-muted-foreground border-l border-border ml-1">
              {roiScenarios[scenario].sub}
            </div>
          </div>

          <div className="mt-10 grid gap-3 items-end" style={{ gridTemplateColumns: `repeat(${activeRows.length + 1}, minmax(0, 1fr))` }}>
            {activeRows.map((r, i) => {
              const pct = (r.value / maxRow) * 100;
              const palette = [
                'bg-emerald-500/70', 'bg-primary/70', 'bg-amber-500/70',
                'bg-purple-500/70', 'bg-pink-500/70', 'bg-blue-500/70', 'bg-orange-500/70',
              ];
              return (
                <motion.div
                  key={`${scenario}-${r.label}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="relative"
                >
                  <div className="text-xs tracking-widest text-muted-foreground mb-1 whitespace-nowrap">
                    + ${(r.value / 1000).toFixed(0)}K
                  </div>
                  <div className={`${palette[i % palette.length]} border border-border/60 rounded-sm transition-all`} style={{ height: `${pct * 2.4 + 30}px` }} />
                  <div className="mt-3 text-xs font-semibold leading-tight">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{r.sub}</div>
                </motion.div>
              );
            })}
            <motion.div
              key={`${scenario}-net`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative border-l-2 border-dashed border-primary/60 pl-4"
            >
              <div className="text-xs tracking-widest text-primary mb-1">NET VALUE</div>
              <div
                className="bg-gradient-to-t from-primary to-primary text-primary-foreground border border-primary/70 rounded-sm flex flex-col items-center justify-center font-bold shadow-lg shadow-primary/20"
                style={{ height: '270px' }}
              >
                <div className="text-2xl">${(activeTotal / 1000).toFixed(0)}K</div>
                <div className="text-[10px] tracking-widest opacity-70 mt-1">ANNUAL</div>
              </div>
              <div className="mt-3 text-xs font-semibold leading-tight">{roiScenarios[scenario].label} Net</div>
              <div className="text-[10px] text-muted-foreground mt-1">Above &amp; beyond billable salary recovery</div>
            </motion.div>
          </div>

          {/* multiplier callout */}
          <div className="mt-10 grid sm:grid-cols-3 gap-3">
            {(Object.keys(roiScenarios) as ScenarioKey[]).map((k) => {
              const total = roiScenarios[k].rows.reduce((s, r) => s + r.value, 0);
              const isActive = scenario === k;
              return (
                <button
                  key={k}
                  onClick={() => setScenario(k)}
                  className={`text-left p-4 border rounded-md transition-all ${
                    isActive ? 'border-primary/60 bg-primary/10' : 'border-border/60 bg-card/30 hover:border-primary/30'
                  }`}
                >
                  <div className="text-[10px] tracking-widest text-muted-foreground mb-1">{roiScenarios[k].label.toUpperCase()}</div>
                  <div className="text-3xl font-bold text-foreground">${(total / 1000).toFixed(0)}K</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{roiScenarios[k].sub}</div>
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-12 text-sm">
            <Card className="p-5 bg-card/40 border-border/60">
              <DollarSign className="h-5 w-5 text-emerald-400 mb-2" />
              <div className="font-semibold mb-1">Revenue + Overhead Avoidance</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                1,600 hrs cover base salary via standard contract billing. The 600 flex hours circumvent part-time admin hires
                and prevent reallocating Senior Schedulers to manual IDR cross-checks.
              </div>
            </Card>
            <Card className="p-5 bg-card/40 border-border/60">
              <Layers className="h-5 w-5 text-primary mb-2" />
              <div className="font-semibold mb-1">Software Cost Avoidance</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Internally operated TakeoffPro bypasses traditional SaaS. MCFA pays only the raw external footprint — hosting,
                DB transit, AI API calls. Internal dev budget scales fluidly.
              </div>
            </Card>
            <Card className="p-5 bg-card/40 border-border/60">
              <Briefcase className="h-5 w-5 text-amber-400 mb-2" />
              <div className="font-semibold mb-1">Proposal Competitiveness</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Rapid, accurate quantity extraction from bid documents directly supports BD Managers — increasing proposal
                volume without additional estimating headcount.
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 8 · PERFORMANCE MGMT (EOS / GWC)                     */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <SectionHeader number="08" eyebrow="EOS · PERFORMANCE MANAGEMENT" title="GWC · L10 · Quarterly Conversations" />

          <div className="grid md:grid-cols-3 gap-4 mt-10">
            <Card className="p-6 bg-card/40 border-border/60">
              <Activity className="h-6 w-6 text-primary mb-3" />
              <div className="font-semibold mb-2">L10 Meeting Integration</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Weekly Level 10 meetings with scorecard reporting on Schedule Health (DCMA-14), Reporting Latency
                (≤ 72 hr), and L10 Scorecard contribution.
              </div>
            </Card>
            <Card className="p-6 bg-card/40 border-border/60">
              <Target className="h-6 w-6 text-emerald-400 mb-3" />
              <div className="font-semibold mb-2">"The Rock" Ownership</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Every 90 days, ownership of one measurable Rock: Q1 XerLens DCMA-14 GA · Q2 Automated TIA fragnet ·
                Q3 Portfolio EVM telemetry on the L10 scorecard.
              </div>
            </Card>
            <Card className="p-6 bg-card/40 border-border/60">
              <FileCheck className="h-6 w-6 text-amber-400 mb-3" />
              <div className="font-semibold mb-2">Scheduler Evaluation</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Schedule-health and reporting-velocity metrics alongside efficiency contributions — fewer rejected
                baselines, faster RE response, lower per-project controls overhead.
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 9 · COMPENSATION                                     */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="09" eyebrow="COMPENSATION" title="Transparent · Tied to Measurable Value" />

          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {compensation.map((c) => (
              <Card key={c.title} className="p-6 bg-card/40 border-border/60">
                <c.icon className="h-6 w-6 text-primary mb-3" />
                <div className="font-semibold mb-3">{c.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{c.body}</div>
              </Card>
            ))}
          </div>

          {/* ---------- Negotiation Script & Anchor ---------- */}
          <div className="mt-16 grid lg:grid-cols-12 gap-6">
            {/* Anchor table */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-4">
                <Anchor className="h-4 w-4 text-primary" />
                <div className="text-[11px] tracking-[0.25em] text-primary">ANCHOR · NJ MARKET BENCHMARKS (2025)</div>
              </div>
              <h3 className="text-2xl font-bold mb-4">The roles being absorbed.</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                A traditional MCFA hire to cover even <span className="text-foreground">two</span> of these costs ~$200K+ in
                base alone — and still doesn't ship the AI/P6 platform.
              </p>

              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-card/60">
                    <tr>
                      <th className="text-left p-3 border-b border-border font-semibold">Role being consolidated</th>
                      <th className="text-right p-3 border-b border-border font-semibold w-40">NJ Base (2025)</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ['Senior P6 Scheduler (PMP)',                '$110K – $140K', 'NJTA / NJDOT consultant rate'],
                      ['Senior Cost Estimator (AACE)',             '$105K – $130K', 'NJ heavy-civil range'],
                      ['Project Controls Analyst (P6 + EVM)',      '$95K – $120K',  'Portfolio reporting role'],
                    ].map(([role, range, sub]) => (
                      <tr key={role} className="border-b border-border last:border-0 hover:bg-card/40">
                        <td className="p-3">
                          <div className="text-foreground">{role}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
                        </td>
                        <td className="p-3 text-right font-mono text-primary">{range}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5">
                      <td className="p-3 font-semibold text-foreground">Cost of three siloed seats (Scheduler + Estimator + Analyst)</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">$310K – $390K</td>
                    </tr>
                    <tr className="bg-emerald-500/10 border-t border-emerald-500/30">
                      <td className="p-3">
                        <div className="font-bold text-foreground">BYOR Ask · Experienced Senior Scheduler</div>
                        <div className="text-[11px] text-emerald-400/90 mt-0.5">PMP · NJDOT/AACE · XerLens tooling included</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-mono font-bold text-emerald-400 text-base">$130K – $140K</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">+ 10 Growth Units · quarterly profit-share (PDF §6)</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <TrendingDown className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Net savings to MCFA on Day 1: <span className="text-emerald-400 font-semibold">$55K – $80K vs. two siloed hires</span>,
                  before counting the platform value or the 10% bonus.
                </span>
              </div>
            </div>

            {/* Recruiter Q&A panel */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-primary" />
                <div className="text-[11px] tracking-[0.25em] text-primary">RECRUITER Q&amp;A · READY-TO-READ</div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Likely objections, answered.</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Tap a question to reveal the response. Each answer is &lt;30 seconds spoken — short enough to deliver in
                a screening call without losing the room.
              </p>

              <Accordion type="single" collapsible className="border border-border rounded-md bg-card/30 divide-y divide-border">
                {recruiterQA.map((qa, i) => (
                  <AccordionItem key={qa.q} value={`q${i}`} className="border-0 px-4">
                    <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-4">
                      <div className="flex items-start gap-3 pr-2">
                        <span className="text-[10px] tracking-widest text-primary font-bold mt-0.5 shrink-0">
                          Q{String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{qa.q}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pl-9 pr-2">
                      <p className="text-xs text-muted-foreground leading-relaxed italic">"{qa.a}"</p>
                      {qa.tag && (
                        <div className="mt-2 inline-block text-[10px] tracking-widest text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded-sm">
                          {qa.tag}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-md">
                <div className="text-[10px] tracking-widest text-amber-400 mb-2">IF PUSHED LOWER</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hold base at minimum <span className="text-foreground font-mono">$130K</span>. Trade flex by
                  expanding the Value-Add cap from 10% → 15%, or by carving out a fixed milestone bonus when Phase 3
                  (P6 telemetry) goes live in Q3.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CLOSING CTA                                                  */}
      {/* ============================================================ */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-[11px] tracking-[0.3em] text-primary mb-6">CLOSING</div>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Bring scheduler depth and practical workflow tooling —{' '}
              <span className="text-primary">at MCFA.</span>
            </h2>
            <p className="text-muted-foreground mt-6 leading-relaxed max-w-2xl mx-auto">
              A working prototype of the weekly scheduler workflow already exists at /mcfa/demo. The next step is a 30-minute conversation about how this maps to the Project Controls Director's immediate Newark / PANYNJ priorities.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-10">
              <Button asChild size="lg" className="font-mono">
                <Link to="/mcfa/demo">Open XER Live Demo <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-mono">
                <a href={mailto}><Mail className="h-4 w-4" /> Book the live walkthrough</a>
              </Button>
            </div>
            <div className="mt-12 pt-8 border-t border-border/60 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">Asif Muhammad, PMP</div>
              <div className="italic mt-1">Senior CPM Scheduler / Estimator · PMP · NJDOT / AACE.</div>
              <div className="flex justify-center gap-4 mt-4">
                <a href="https://linkedin.com" className="hover:text-primary inline-flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</a>
                <a href="https://github.com" className="hover:text-primary inline-flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub</a>
                <Link to="/demo" className="hover:text-primary inline-flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Live App</Link>
              </div>
              <div className="mt-6 text-[10px] tracking-widest text-muted-foreground">
                BUILT WITH THE SAME STACK PROPOSED FOR MCFA · REACT · TYPESCRIPT · SUPABASE · AI
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* small helpers                                                      */
/* ------------------------------------------------------------------ */
const SectionHeader = ({ number, eyebrow, title }: { number: string; eyebrow: string; title: string }) => (
  <div className="flex items-end justify-between gap-6 flex-wrap">
    <div>
      <div className="flex items-center gap-3 text-[11px] tracking-[0.3em] text-primary">
        <span className="font-bold">§ {number}</span>
        <span className="h-px w-8 bg-primary/40" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold mt-3 tracking-tight" dangerouslySetInnerHTML={{ __html: title }} />
    </div>
  </div>
);

const Mini = ({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) => (
  <div className="flex flex-col items-center gap-1.5 py-1">
    <Icon className="h-4 w-4 text-primary" />
    <div className="text-[10px] tracking-widest text-muted-foreground">{label}</div>
  </div>
);

export default McfaPitch;
