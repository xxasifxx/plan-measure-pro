import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import heroScreenshot from '@/assets/hero-screenshot.jpg';
import inspectorTablet from '@/assets/inspector-tablet.jpg';
import gpsFieldMeasurement from '@/assets/gps-field-measurement.jpg';
import {
  ArrowRight, Mail, ExternalLink, Cpu, Code2, ClipboardCheck, HardHat,
  CheckCircle2, Workflow, Database, Network, Bot, Target, Camera,
  TrendingUp, Award, Users, Zap, Linkedin, Github, WifiOff, Image as ImageIcon,
  GitBranch, Clock, DollarSign, FileSpreadsheet, Building2, Plane, MapPin,
  Gauge, Layers, Activity, FileCheck, Briefcase, X, Check, Minus,
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

const capacityModel = [
  {
    hours: '1,600',
    label: 'Core Billable',
    desc: 'NICET Inspector OR Senior Scheduler — base salary fully covered by traditional contract billing.',
    color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/40',
    iconColor: 'text-emerald-400',
    icon: HardHat,
  },
  {
    hours: '600',
    label: 'Flexible Capacity',
    desc: 'Office Engineer support · RFI / IDR processing · BD proposal takeoffs · internal "Shop Tool" development.',
    color: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/40',
    iconColor: 'text-cyan-400',
    icon: Code2,
  },
  {
    hours: '2,200',
    label: 'Total Annual Capacity',
    desc: 'Single hybrid asset replacing two siloed hires while delivering an internal AI/P6 platform.',
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/40',
    iconColor: 'text-amber-400',
    icon: Gauge,
  },
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
    icon: WifiOff,
    title: 'Offline Field Application & Manual Ingestion',
    body: 'Browser-based, offline-capable PWA for mobile. Native camera + GPS, custom descriptions, pay-item selection, geo-tagged evidence — no internet required. On reconnect, ingests records alongside Excel IDRs and bulk untagged photos.',
    accent: 'border-emerald-500/40 bg-emerald-500/5',
    pill: 'Q1 ROCK · 90 DAYS',
  },
  {
    n: '02',
    icon: Bot,
    title: 'AI-Driven Image Processing',
    body: 'AI layer reviews imported untagged images. Cross-references image content, user descriptions, and temporal/spatial metadata against active project pay items — auto-defaults examples to the correct pay-item file. Visual audit trail organized instantaneously.',
    accent: 'border-cyan-500/40 bg-cyan-500/5',
    pill: 'Q2 ROCK',
  },
  {
    n: '03',
    icon: GitBranch,
    title: 'Automated P6 Schedule Integration & Live Telemetry',
    body: 'AI parses ingested IDRs and dynamically compares reported pay items + quantities against P6 baseline activities. Static schedules become live telemetry dashboards — a mathematically defensible, up-to-the-minute schedule status for senior stakeholders.',
    accent: 'border-amber-500/40 bg-amber-500/5',
    pill: 'Q3 ROCK',
  },
];

/* Archetype matrix — Capability × {Traditional Scheduler, PC Analyst, PC Systems Integrator} */
const archetypeRows: Array<[string, 'no' | 'partial' | 'yes', 'no' | 'partial' | 'yes', 'no' | 'partial' | 'yes']> = [
  ['P6 Scheduling',              'yes',     'yes',     'yes'],
  ['Stakeholder Reporting',      'partial', 'yes',     'yes'],
  ['Data Pipelines / APIs',      'no',      'partial', 'yes'],
  ['Scalability Across Projects','no',      'partial', 'yes'],
  ['Power BI Modeling',          'no',      'yes',     'yes'],
  ['BIM 360 Context',            'no',      'partial', 'yes'],
  ['Traceability / Audit Ready', 'partial', 'yes',     'yes'],
  ['Schedule Health QA',         'partial', 'yes',     'yes'],
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
    items: ['Primavera P6 — Schedule', 'BIM 360 — Design + Docs', 'Field Inputs — Progress, Quantities'],
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
      { label: 'Proposal Differentiator', value: 50_000,  sub: 'Faster takeoffs · higher BD throughput' },
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
      { label: 'SaaS Cost Avoidance',     value: 45_000,  sub: 'Bluebeam · PlanGrid · scheduling add-ons' },
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
      { label: 'SaaS Cost Avoidance',      value: 90_000,  sub: 'Full takeoff + field reporting stack replaced' },
      { label: 'Senior Scheduler Hrs',     value: 240_000, sub: '~1,200 hrs reclaimed firm-wide' },
      { label: 'New Service Line Revenue', value: 350_000, sub: 'Productized digital-controls offering to clients' },
    ],
  },
} as const;
type ScenarioKey = keyof typeof roiScenarios;

const kpis = [
  { quarter: 'Q1', icon: Zap,         text: 'Customized MCFA TakeoffPro launched in 90 days — cloud infra + offline mobile interface live.' },
  { quarter: 'Q2', icon: Bot,         text: 'AI photo-tagging logic deployed; automated IDR-to-P6 comparison framework operational.' },
  { quarter: 'Q3', icon: Activity,    text: 'Beta IDR-to-P6 activity comparison; division pivots from reactive to proactive scheduling.' },
  { quarter: 'KPI',icon: Clock,       text: 'Targeted 30% reduction in inspector time spent calculating & verifying field quantities.' },
];

const compensation = [
  {
    icon: DollarSign,
    title: 'Base Salary',
    body: 'Competitive base reflecting PMP, engineering background, and capacity to serve as inspector/scheduler + OE + developer simultaneously. Compensates the 1,600 billable hours and encompasses internal development time for the mobile, AI, and P6 integrations.',
  },
  {
    icon: Layers,
    title: 'Internal Tool Agreement',
    body: 'MCFA granted full internal use of TakeoffPro across its project portfolio. To preserve the cost-avoidance model, MCFA assumes responsibility for the external digital footprint costs (hosting, storage, API usage).',
  },
  {
    icon: Award,
    title: 'EOS Value-Add Bonus',
    body: 'Up to 10% bonus tied to high-value efficiency, cost avoidance, and proposal support — reviewed during Quarterly Conversations on EOS cycles. Directed work outside scope and standard hours follows standard overtime compensation.',
  },
];

const proofBullets = [
  'TOC auto-detection from full plan sets',
  'Automatic pay-item extraction (current page + next 4)',
  'One-time scale calibration → document-wide default',
  'Offline-capable PWA · GPS-tagged field annotations',
  'Real-time multi-user sync · role-based access',
  'NJDOT / NJTA-compliant CSV, PDF & Excel exports',
];

/* ------------------------------------------------------------------ */
/* component                                                          */
/* ------------------------------------------------------------------ */
const McfaPitch = () => {
  useEffect(() => {
    document.title = 'BYOR Proposal · Hybrid Construction Inspector & Systems Integrator — Asif Muhammad, PMP';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Build Your Own Role proposal for MCFA Transportation & Infrastructure: a 2,200-hour hybrid asset combining NICET inspection / P6 scheduling with internal AI + P6 systems development.';
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
    'mailto:asif@example.com?subject=MCFA%20BYOR%20%E2%80%94%20Hybrid%20Construction%20Inspector%20%26%20Systems%20Integrator&body=Hi%20Asif%2C%0A%0AI%27d%20like%20to%20schedule%20a%2030-minute%20conversation%20about%20the%20BYOR%20proposal.';

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
            <span>Newark Airport · North Jersey · Hybrid</span>
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
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 rounded-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                BUILD YOUR OWN ROLE · PROPOSAL
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                Hybrid Construction Inspector{' '}
                <span className="text-cyan-400">&amp; Systems Integrator</span>{' '}
                <span className="block text-muted-foreground/80 text-2xl md:text-3xl mt-3 font-normal">
                  for MCFA Transportation &amp; Infrastructure
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                A single, high-utilization asset consolidating <span className="text-foreground font-semibold">three functions</span> —
                primary billable resource (NICET Inspector or P6 Scheduler), responsive Office Engineer, and internal Systems
                Developer — across <span className="text-cyan-400 font-semibold">2,200 annual hours</span>.
              </motion.p>

              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
                <div>
                  <div className="text-3xl font-bold text-cyan-400">1,600</div>
                  <div className="text-[10px] tracking-widest text-muted-foreground mt-1">CORE BILLABLE HRS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-400">600</div>
                  <div className="text-[10px] tracking-widest text-muted-foreground mt-1">FLEXIBLE OE / DEV</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-400">~50%</div>
                  <div className="text-[10px] tracking-widest text-muted-foreground mt-1">PROVEN AUTOMATION GAIN</div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="font-mono">
                  <Link to="/demo">
                    View Live Proof-of-Concept <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-mono">
                  <a href={mailto}>
                    <Mail className="h-4 w-4" /> Schedule a 30-min Conversation
                  </a>
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="text-xs text-muted-foreground pt-2">
                <span className="text-foreground font-semibold">Asif Muhammad, PMP</span> · NICET HCI Level I (exams complete) ·
                BSET, NJIT · Currently supporting certified inspectors on Garden State Parkway repairs (Colonia)
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative border border-border bg-card/60 backdrop-blur rounded-md overflow-hidden shadow-2xl">
                  <div className="border-b border-border/60 px-3 py-2 flex items-center gap-1.5 bg-card/80">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">TAKEOFFPRO · LIVE</span>
                  </div>
                  <img src={heroScreenshot} alt="TakeoffPro proof-of-concept" className="w-full h-auto" />
                </div>
                <div className="absolute -bottom-4 -right-4 hidden md:block bg-cyan-500 text-cyan-950 text-xs font-bold px-3 py-2 rounded-sm shadow-xl">
                  WORKING PROTOTYPE
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 1 · INTRODUCTION & STRATEGIC VISION                  */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="01" eyebrow="INTRODUCTION" title="Strategic Vision" />

          <div className="grid lg:grid-cols-2 gap-10 mt-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                MCFA's current hiring initiatives suggest a <span className="text-foreground">dual requirement</span> for high-level
                Project Controls / Scheduling expertise <em>and</em> dedicated NICET field inspection. Recruiting these roles
                independently risks operational silos and increased overhead.
              </p>
              <p>
                This proposal eliminates that silo. <span className="text-cyan-400 font-semibold">~1,600 hours</span> deliver core
                billable capacity; <span className="text-emerald-400 font-semibold">~600 hours</span> of flexible capacity service
                Office Engineer support, BD proposal coordination, and the development of proprietary "Shop Tools" — anchored by
                the TakeoffPro quantity-tracking application already shipping at <Link to="/demo" className="text-foreground underline underline-offset-4">/demo</Link>.
              </p>
              <p>
                The end-state vision: a <span className="text-foreground">full Primavera P6 integration</span> creating a digital
                ecosystem where field data dynamically updates executive schedules — turning static baselines into live telemetry.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 gap-3">
              {credentials.map((c) => (
                <motion.div key={c.label} variants={fadeUp}>
                  <Card className="bg-card/40 border-border/60 p-4 h-full">
                    <c.icon className="h-5 w-5 text-cyan-400 mb-2" />
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
      {/* SECTION 2 · ROLE DESCRIPTION (2200-HR MODEL)                 */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <SectionHeader number="02" eyebrow="ROLE DESCRIPTION" title="The 2,200-Hour Hybrid Model" />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-5 mt-10">
            {capacityModel.map((c) => (
              <motion.div key={c.label} variants={fadeUp}>
                <Card className={`p-6 h-full bg-gradient-to-br ${c.color} border`}>
                  <div className="flex items-start justify-between mb-4">
                    <c.icon className={`h-6 w-6 ${c.iconColor}`} />
                    <div className="text-xs tracking-widest text-muted-foreground">HOURS / YR</div>
                  </div>
                  <div className="text-5xl font-bold mb-1">{c.hours}</div>
                  <div className="text-sm font-semibold text-foreground/90 mb-3 tracking-wide">{c.label}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{c.desc}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* allocation bar */}
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="text-[11px] tracking-widest text-muted-foreground mb-2 flex justify-between">
              <span>ANNUAL CAPACITY ALLOCATION</span><span>2,200 HRS</span>
            </div>
            <div className="flex h-10 rounded-sm overflow-hidden border border-border">
              <div className="bg-emerald-500/70 flex items-center justify-center text-xs font-semibold text-emerald-950" style={{ flex: 1600 }}>
                1,600 · BILLABLE (73%)
              </div>
              <div className="bg-cyan-500/70 flex items-center justify-center text-xs font-semibold text-cyan-950" style={{ flex: 600 }}>
                600 · FLEX (27%)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 · TAKEOFFPRO 3-PHASE ROADMAP                       */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20">
        <div className="container mx-auto px-4">
          <SectionHeader number="03" eyebrow="INTERNAL SHOP TOOL" title="TakeoffPro · 3-Phase AI Roadmap" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            An MCFA-specific iteration of the proprietary TakeoffPro application. Internalizing the tool eliminates the SaaS
            friction that conventionally impedes field reporting.
          </p>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid lg:grid-cols-3 gap-5 mt-10">
            {phases.map((p) => (
              <motion.div key={p.n} variants={fadeUp}>
                <Card className={`p-6 h-full border ${p.accent} relative overflow-hidden`}>
                  <div className="absolute top-3 right-3 text-[10px] tracking-widest text-muted-foreground border border-border/60 px-2 py-0.5 rounded-sm">
                    {p.pill}
                  </div>
                  <div className="text-6xl font-bold text-foreground/10 leading-none">{p.n}</div>
                  <p.icon className="h-7 w-7 text-cyan-400 mt-2 mb-3" />
                  <div className="text-base font-semibold mb-3 leading-tight">{p.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{p.body}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* live POC bullets */}
          <div className="grid lg:grid-cols-2 gap-8 mt-14 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-[11px] tracking-widest text-cyan-400 mb-3">SHIPPING TODAY · /demo</div>
              <h3 className="text-2xl font-bold mb-5">Phase 1 is already live.</h3>
              <ul className="space-y-2">
                {proofBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button asChild size="sm" className="mt-6 font-mono">
                <Link to="/demo">Open the working app <ExternalLink className="h-3.5 w-3.5" /></Link>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="grid grid-cols-2 gap-3">
              <img src={inspectorTablet} alt="Field inspector tablet" className="rounded-md border border-border w-full h-48 object-cover" />
              <img src={gpsFieldMeasurement} alt="GPS field measurement" className="rounded-md border border-border w-full h-48 object-cover" />
              <div className="col-span-2 border border-border bg-card/40 rounded-md p-4 grid grid-cols-3 gap-3 text-center">
                <Mini icon={WifiOff}    label="OFFLINE PWA" />
                <Mini icon={Camera}     label="GPS-TAGGED" />
                <Mini icon={ImageIcon}  label="AI-INDEXED" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4 · KPIs / ROCKS                                     */}
      {/* ============================================================ */}
      <section className="border-b border-border/60 py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <SectionHeader number="04" eyebrow="KPIs · EOS ROCKS" title="First 90 Days &amp; Beyond" />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {kpis.map((k) => (
              <motion.div key={k.quarter} variants={fadeUp}>
                <Card className="p-5 h-full border-border/60 bg-card/40">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] tracking-widest text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-sm">{k.quarter}</span>
                    <k.icon className="h-4 w-4 text-muted-foreground ml-auto" />
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{k.text}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
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
                    <div className="text-cyan-400/80 text-xs tracking-widest">PROJECT CONTROLS</div>
                    <div className="font-semibold mt-0.5">Analyst</div>
                  </th>
                  <th className="p-3 border-b border-border text-center bg-cyan-500/10">
                    <div className="text-cyan-300 text-xs tracking-widest">SYSTEMS</div>
                    <div className="font-semibold mt-0.5">Integrator</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {archetypeRows.map(([cap, a, b, c]) => (
                  <tr key={cap} className="hover:bg-card/40">
                    <td className="p-3 border-b border-r border-border">{cap}</td>
                    <td className="p-3 border-b border-r border-border text-center">{cellGlyph(a)}</td>
                    <td className="p-3 border-b border-r border-border text-center">{cellGlyph(b)}</td>
                    <td className="p-3 border-b border-border text-center bg-cyan-500/5">{cellGlyph(c)}</td>
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
                    <layer.icon className="h-5 w-5 text-cyan-400" />
                    <div className="text-xs tracking-widest text-muted-foreground">LAYER {i + 1}</div>
                  </div>
                  <div className="text-lg font-semibold mb-1">{layer.title}</div>
                  {layer.note && <div className="text-[11px] text-cyan-400/80 mb-3">{layer.note}</div>}
                  <ul className="space-y-1.5 mt-3">
                    {layer.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-cyan-400/60" /> {it}
                      </li>
                    ))}
                  </ul>
                </Card>
                {i < integrationLayers.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 h-5 w-5 text-cyan-400 z-10" />
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
          <SectionHeader number="07" eyebrow="RETURN ON INVESTMENT" title="ROI Waterfall · 3 Projects · Annual" />
          <p className="text-muted-foreground max-w-3xl mt-4">
            Conservative assumptions; value counted only after sustained adoption. The 1,600 billable hours fully fund base
            salary — every dollar below is high-margin overhead avoidance and BD upside.
          </p>

          <div className="mt-12 grid lg:grid-cols-5 gap-3 items-end">
            {roiWaterfall.map((r, i) => {
              const pct = (r.value / roiTotal) * 100;
              const colors = ['bg-emerald-500/70', 'bg-cyan-500/70', 'bg-amber-500/70', 'bg-purple-500/70'];
              return (
                <motion.div
                  key={r.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <div className="text-xs tracking-widest text-muted-foreground mb-1">{`+ $${(r.value / 1000).toFixed(0)}K`}</div>
                  <div className={`${colors[i]} border border-border/60 rounded-sm`} style={{ height: `${pct * 3}px`, minHeight: '60px' }} />
                  <div className="mt-3 text-sm font-semibold leading-tight">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.sub}</div>
                </motion.div>
              );
            })}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="relative border-l-2 border-dashed border-cyan-500/40 pl-4"
            >
              <div className="text-xs tracking-widest text-cyan-400 mb-1">NET VALUE</div>
              <div className="bg-cyan-500 text-cyan-950 border border-cyan-300 rounded-sm flex items-center justify-center font-bold text-lg" style={{ height: '240px' }}>
                ${(roiTotal / 1000).toFixed(0)}K
              </div>
              <div className="mt-3 text-sm font-semibold leading-tight">Illustrative Annual Net</div>
              <div className="text-[11px] text-muted-foreground mt-1">Above &amp; beyond billable salary recovery</div>
            </motion.div>
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
              <Layers className="h-5 w-5 text-cyan-400 mb-2" />
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
              <Activity className="h-6 w-6 text-cyan-400 mb-3" />
              <div className="font-semibold mb-2">L10 Meeting Integration</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Weekly Level 10 meetings with scorecard reporting on Billable Hours Completed, TakeoffPro Adoption, and
                AI/P6 integration milestones.
              </div>
            </Card>
            <Card className="p-6 bg-card/40 border-border/60">
              <Target className="h-6 w-6 text-emerald-400 mb-3" />
              <div className="font-semibold mb-2">"The Rock" Ownership</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Every 90 days, ownership of one measurable Rock: Q1 offline mobile · Q2 AI photo-tagging · Q3 IDR-to-P6 beta.
              </div>
            </Card>
            <Card className="p-6 bg-card/40 border-border/60">
              <FileCheck className="h-6 w-6 text-amber-400 mb-3" />
              <div className="font-semibold mb-2">Hybrid Evaluation</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Equitable assessment of field/scheduling competency alongside operational efficiency contributions — tool
                development, proposal expediency, overhead reduction.
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
                <c.icon className="h-6 w-6 text-cyan-400 mb-3" />
                <div className="font-semibold mb-3">{c.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{c.body}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CLOSING CTA                                                  */}
      {/* ============================================================ */}
      <section className="py-24 bg-gradient-to-br from-cyan-950/40 via-background to-background relative overflow-hidden">
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
            <div className="text-[11px] tracking-[0.3em] text-cyan-400 mb-6">CLOSING</div>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Bridge field execution with practical innovation —{' '}
              <span className="text-cyan-400">at MCFA.</span>
            </h2>
            <p className="text-muted-foreground mt-6 leading-relaxed max-w-2xl mx-auto">
              A working prototype already exists. The next step is a 30-minute conversation about how the 2,200-hour hybrid
              model maps onto MCFA's immediate NICET and Scheduling priorities.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-10">
              <Button asChild size="lg" className="font-mono">
                <a href={mailto}><Mail className="h-4 w-4" /> Schedule a 30-min Conversation</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-mono">
                <Link to="/demo">Explore the working prototype <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-12 pt-8 border-t border-border/60 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">Asif Muhammad, PMP</div>
              <div className="italic mt-1">Bridging Field Execution with Practical Innovation.</div>
              <div className="flex justify-center gap-4 mt-4">
                <a href="https://linkedin.com" className="hover:text-cyan-400 inline-flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</a>
                <a href="https://github.com" className="hover:text-cyan-400 inline-flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub</a>
                <Link to="/demo" className="hover:text-cyan-400 inline-flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Live App</Link>
              </div>
              <div className="mt-6 text-[10px] tracking-widest text-muted-foreground/60">
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
      <div className="flex items-center gap-3 text-[11px] tracking-[0.3em] text-cyan-400">
        <span className="font-bold">§ {number}</span>
        <span className="h-px w-8 bg-cyan-500/40" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold mt-3 tracking-tight" dangerouslySetInnerHTML={{ __html: title }} />
    </div>
  </div>
);

const Mini = ({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) => (
  <div className="flex flex-col items-center gap-1.5 py-1">
    <Icon className="h-4 w-4 text-cyan-400" />
    <div className="text-[10px] tracking-widest text-muted-foreground">{label}</div>
  </div>
);

export default McfaPitch;
