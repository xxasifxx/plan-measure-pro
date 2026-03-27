import { useNavigate } from 'react-router-dom';
import heroScreenshot from '@/assets/hero-screenshot.jpg';
import highwayAerial from '@/assets/highway-construction-aerial.jpg';
import inspectorTablet from '@/assets/inspector-tablet.jpg';
import blueprintPlans from '@/assets/blueprint-plans.jpg';
import gpsFieldMeasurement from '@/assets/gps-field-measurement.jpg';
import { Button } from '@/components/ui/button';
import {
  HardHat, Ruler, Layers, Users, Zap, FileSpreadsheet,
  ChevronRight, CheckCircle2, ArrowRight, X, Check,
  Upload, Target, PenTool, Download, Building2, Scale,
  ShieldCheck, Smartphone, BarChart3, Camera, Globe,
  ClipboardList, Clock, DollarSign, AlertTriangle,
  Eye, FileText, MapPin, Wrench, TrendingUp, Lock,
  Server, Headphones, BookOpen, Mail, Navigation, Crosshair,
} from 'lucide-react';

/* ─────────────────────────── DATA ─────────────────────────── */

const painPoints = [
  {
    stat: '30+',
    unit: 'days',
    label: 'Payment delays from quantity disputes',
    description:
      "When the contractor's quantities don't match the RE's field measurements, the estimate stalls. TakeoffPro creates a single source of truth.",
  },
  {
    stat: '5–15%',
    unit: 'variance',
    label: 'DC form errors compound monthly',
    description:
      'Handwritten daily quantities get transcribed into spreadsheets. Each copy introduces variance. Digital measurement eliminates transcription.',
  },
  {
    stat: 'Zero',
    unit: 'audit trail',
    label: 'No traceability from plan to payment',
    description:
      "When FHWA or the OIG asks how a quantity was derived, can you show them? TakeoffPro timestamps every measurement with user, location, and plan sheet.",
  },
];

const capabilityPairs = [
  {
    features: [
      {
        icon: ClipboardList,
        title: 'NJTA Pay Item Import',
        description:
          'Upload your bid schedule or import directly from NJTA Standard Specs. Pay items auto-map to Section 100–900 categories with correct units (LF, SY, CY, TON, LS, EA).',
      },
      {
        icon: TrendingUp,
        title: 'Contract vs. Measured Tracking',
        description:
          'See real-time variance between contract bid quantities and field-measured quantities. Color-coded alerts flag overruns before they become change orders.',
      },
    ],
    imageRight: true,
  },
  {
    features: [
      {
        icon: FileText,
        title: 'Inspector Daily Reports',
        description:
          "Each inspector's measurements export as a daily log — organized by pay item, with location stamps, notes, and plan page references. Replaces handwritten DC diaries.",
      },
      {
        icon: BarChart3,
        title: 'Monthly Estimate Support',
        description:
          "Roll up all measurements into a pay item summary report that mirrors the monthly estimate format. CSV and PDF exports ready for the RE's review.",
      },
    ],
    imageRight: false,
  },
  {
    features: [
      {
        icon: Layers,
        title: 'Multi-Sheet Plan Navigation',
        description:
          'Upload the full contract plan set. Table of contents auto-detects sheets. Calibrate once per sheet — every measurement on that page is accurate.',
      },
      {
        icon: Users,
        title: 'Role-Based Access Control',
        description:
          'REs and PMs configure projects and review progress. Field inspectors measure and annotate. Separation of duties built into the platform.',
      },
    ],
    imageRight: true,
  },
];

const workflowSteps = [
  { icon: Upload, label: 'Upload Contract Plans', description: 'Drop the PDF plan set from ProjectWise or your file system' },
  { icon: ClipboardList, label: 'Import Pay Items', description: 'Paste from the bid schedule or extract from spec pages' },
  { icon: PenTool, label: 'Measure in the Field', description: 'Draw on tablets or walk the site with GPS trace mode' },
  { icon: Download, label: 'Export for Payment', description: 'Download daily logs, monthly summaries, or full contract reports' },
];

const personas = [
  {
    icon: Ruler,
    title: 'Resident Engineers & Project Managers',
    color: 'hsl(25 95% 50%)',
    bullets: [
      'Configure projects, upload plan sets, import bid schedules',
      'Assign inspectors to specific contracts',
      'Review team progress from a central dashboard',
      'Export monthly estimate summaries for NJTA / NJDOT review',
      'Compare measured vs. contract quantities to catch overruns early',
    ],
  },
  {
    icon: HardHat,
    title: 'Field Inspectors',
    color: 'hsl(142 71% 45%)',
    bullets: [
      'Open assigned projects on any tablet — no app install',
      'Measure guardrail (LF), paving (SY), excavation (CY), drainage structures (EA) directly on plan sheets',
      'Add location stamps (station numbers, lane references) and field notes',
      'Override calculated quantities with field actuals when conditions differ from plans',
      'Daily work exports as structured Excel workbooks',
    ],
  },
  {
    icon: Building2,
    title: 'Construction Management Consultants',
    color: 'hsl(210 92% 55%)',
    bullets: [
      'Multi-project oversight across NJTA / NJDOT portfolio',
      'Real-time visibility into inspector activity without waiting for emailed reports',
      'Audit-ready records for FHWA compliance reviews',
      'Centralized quantity data eliminates consultant-to-agency reconciliation delays',
    ],
  },
];

const comparisonRows = [
  { dimension: 'Measurement source', old: 'Scale ruler on paper plans', pro: 'Digital measurement on PDF plans' },
  { dimension: 'Daily records', old: 'Handwritten DC diary', pro: 'Auto-generated daily logs with timestamps' },
  { dimension: 'Quantity reconciliation', old: 'Manual spreadsheet comparison', pro: 'Real-time contract vs. measured dashboard' },
  { dimension: 'Audit trail', old: 'File cabinets & email chains', pro: 'Every measurement tied to user, date, plan page' },
  { dimension: 'Team collaboration', old: 'Email PDFs back and forth', pro: 'Real-time sync across all inspectors' },
  { dimension: 'Monthly estimate prep', old: 'Days of spreadsheet work', pro: 'One-click export in pay item format' },
  { dimension: 'Field accessibility', old: 'Paper plans in the trailer', pro: 'Browser-based — any tablet, any location' },
];

const roadmapItems = [
  { icon: Zap, title: 'AI-Powered Quantity Extraction', description: 'Auto-detect quantities from spec tables and plan notes' },
  { icon: Globe, title: 'ProjectWise Integration', description: 'Pull plan sets directly from your NJTA / NJDOT document management system' },
  { icon: FileSpreadsheet, title: 'Automated Monthly Estimate Generation', description: 'Format quantities into NJDOT DC-84 payment estimate format' },
  { icon: Camera, title: 'Photo Documentation', description: 'Attach geo-tagged field photos to annotations for dispute resolution' },
  { icon: Server, title: 'SiteManager / AASHTOWare Integration', description: "Sync quantities with NJDOT's official construction management system" },
  { icon: Eye, title: 'Contractor Portal', description: 'Give contractors read-only access to measured quantities before payment disputes arise' },
];

const trustSignals = [
  { icon: Lock, label: 'Your data stays yours' },
  { icon: ShieldCheck, label: 'SOC 2 compliance roadmap' },
  { icon: Server, label: '99.9% uptime SLA' },
  { icon: Headphones, label: 'Dedicated onboarding for NJTA teams' },
];

/* ─────────────────────────── COMPONENT ─────────────────────────── */

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-[hsl(220,20%,10%)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <HardHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">TakeoffPro</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => scrollTo('features')} className="text-xs hidden sm:inline-flex text-white/70 hover:text-white hover:bg-white/10">
              Features
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo('how-it-works')} className="text-xs hidden sm:inline-flex text-white/70 hover:text-white hover:bg-white/10">
              How It Works
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo('personas')} className="text-xs hidden sm:inline-flex text-white/70 hover:text-white hover:bg-white/10">
              For NJTA / DOT
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-xs text-white/70 hover:text-white hover:bg-white/10">
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="text-xs">
              Request a Demo <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero — Dark with blueprint grid ── */}
      <section className="relative overflow-hidden bg-[hsl(220,20%,10%)] blueprint-grid-dark">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(220,20%,10%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8 sm:pt-24 sm:pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-medium text-primary mb-8">
              <Building2 className="h-3 w-3" /> Purpose-Built for NJ Turnpike Authority & NJDOT Projects
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
              Stop Disputing Quantities.{' '}
              <span className="text-primary">Start Proving Them.</span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl mx-auto">
              TakeoffPro gives your RE team digital measurement tools that produce audit-ready quantity
              records — directly from contract plan PDFs. Built around NJTA Standard Specifications and
              pay item formats.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Button size="lg" onClick={() => navigate('/auth')} className="gap-2 text-sm">
                Request a Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="gap-2 text-sm border-white/20 text-white hover:bg-white/10 hover:text-white">
                Start Free Trial
              </Button>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 mt-8 text-xs text-white/50">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary" /> NJTA Pay Item Compatible</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary" /> NJDOT Spec Format</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary" /> Zero Install</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary" /> Field-Ready on Any Tablet</span>
            </div>
          </div>

          {/* Hero Screenshot — browser mockup */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
              {/* Browser chrome */}
              <div className="bg-[hsl(220,18%,16%)] px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0,70%,50%)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,50%)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(142,70%,45%)]" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="bg-[hsl(220,15%,12%)] rounded-md px-3 py-1 text-[10px] text-white/40 text-center">
                    app.takeoffpro.com
                  </div>
                </div>
              </div>
              <img
                src={heroScreenshot}
                alt="TakeoffPro interface showing NJTA highway plan with quantity measurements, pay item sidebar, and annotation tools"
                width={1920}
                height={1080}
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── The Cost of Paper Takeoffs — Full-bleed image background ── */}
      <section className="relative overflow-hidden">
        <img
          src={highwayAerial}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,20%,6%,0.90)] to-[hsl(220,20%,6%,0.95)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary text-center mb-3">THE PROBLEM</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-center text-white mb-4">
            Paper takeoffs are costing you money and time
          </h2>
          <p className="text-sm text-white/50 text-center max-w-2xl mx-auto mb-14">
            Every manual step between plan measurement and monthly estimate is an opportunity for error,
            delay, and dispute.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {painPoints.map((p, i) => (
              <div key={i} className="text-center sm:text-left">
                <p className="text-5xl sm:text-6xl font-black text-primary leading-none">{p.stat}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-white/40 mt-1 mb-3">{p.unit}</p>
                <p className="text-sm font-semibold text-white mb-2">{p.label}</p>
                <p className="text-xs text-white/50 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities — Alternating text/image ── */}
      <section id="features" className="scroll-mt-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary text-center mb-3">CAPABILITIES</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-4">
            Built for NJTA & NJDOT workflows
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-16">
            Every feature is designed around how NJ Turnpike and NJDOT teams actually manage
            construction quantities — from bid schedule to monthly estimate.
          </p>

          <div className="space-y-20">
            {capabilityPairs.map((pair, pairIdx) => {
              const imageBlock = (
                <div key={`img-${pairIdx}`} className="flex items-center justify-center">
                  <div className="rounded-xl overflow-hidden shadow-xl border border-border">
                    <img
                      src={pairIdx === 0 ? heroScreenshot : pairIdx === 1 ? blueprintPlans : inspectorTablet}
                      alt="TakeoffPro feature demonstration"
                      loading="lazy"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              );
              const textBlock = (
                <div key={`text-${pairIdx}`} className="flex flex-col justify-center space-y-8">
                  {pair.features.map((f, fi) => (
                    <div key={fi}>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-bold text-base mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              );

              return (
                <div key={pairIdx} className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
                  {pair.imageRight ? (
                    <>{textBlock}{imageBlock}</>
                  ) : (
                    <>{imageBlock}{textBlock}</>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GPS Field Measurement — Full-bleed image section ── */}
      <section className="relative overflow-hidden">
        <img
          src={gpsFieldMeasurement}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,20%,6%,0.95)] via-[hsl(220,20%,6%,0.88)] to-[hsl(220,20%,6%,0.75)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary uppercase tracking-wider mb-6">
              <Navigation className="h-3 w-3" /> New Feature
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
              Walk the site. Measure automatically.
            </h2>
            <p className="text-sm text-white/60 leading-relaxed mb-8 max-w-xl">
              GPS-to-Plan georeferencing lets inspectors physically walk a perimeter or line on the job site
              while the app traces their path directly on the contract plan sheet — computing LF, SF, and CY
              measurements in real time.
            </p>

            <div className="space-y-5 mb-10">
              {[
                { icon: Crosshair, title: 'Calibrate in 60 seconds', description: 'Stand at 2–3 known points (survey monuments, station markers) and tap matching spots on the plan. The app builds an affine transform mapping GPS to plan coordinates.' },
                { icon: Navigation, title: 'Walk & trace', description: 'Select a pay item, start GPS trace, and walk the area. Your position appears as a live dot on the plan with a breadcrumb trail — Kalman-smoothed for accuracy.' },
                { icon: MapPin, title: 'Auto-calculate quantities', description: 'When you finish, the traced path becomes an annotation with auto-calculated LF or SF/SY/CY measurements tied to the pay item.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-white/30 italic">
              Best for large-area measurements — paving, embankments, guardrail runs. Phone GPS accuracy is typically ±10–15 ft;
              the app displays real-time accuracy and warns when signal is poor.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works — Timeline on blueprint grid ── */}
      <section id="how-it-works" className="scroll-mt-16 bg-[hsl(220,20%,10%)] blueprint-grid-dark relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary text-center mb-3">HOW IT WORKS</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-center text-white mb-16">
            Four steps from plan set to payment
          </h2>

          {/* Timeline */}
          <div className="relative">
            {/* Connecting line — desktop only */}
            <div className="hidden sm:block absolute top-7 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
              {workflowSteps.map((step, i) => (
                <div key={i} className="text-center relative">
                  <div className="h-14 w-14 mx-auto rounded-full bg-[hsl(220,18%,16%)] border-2 border-primary/40 flex items-center justify-center mb-4 relative z-10">
                    <step.icon className="h-6 w-6 text-primary" />
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-[11px] text-white/50 mt-2 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Who Uses TakeoffPro — with inspector image ── */}
      <section id="personas" className="scroll-mt-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary text-center mb-3">BUILT FOR</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-4">
            Every role in the inspection chain
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-14">
            From the Resident Engineer's office to the active travel lane — TakeoffPro fits the way
            NJTA and NJDOT teams already work.
          </p>

          <div className="grid lg:grid-cols-3 gap-6">
            {personas.map((p, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Colored top accent */}
                <div className="h-1" style={{ background: p.color }} />
                <div className="p-6">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${p.color}20` }}>
                    <p.icon className="h-5 w-5" style={{ color: p.color }} />
                  </div>
                  <h3 className="font-bold text-sm mb-4">{p.title}</h3>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {p.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: p.color }} />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison — Two-column Before/After cards ── */}
      <section className="bg-[hsl(220,20%,10%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary text-center mb-3">COMPARISON</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-center text-white mb-14">
            TakeoffPro vs. your current process
          </h2>

          <div className="space-y-3">
            {comparisonRows.map((row, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr] gap-px rounded-lg overflow-hidden">
                <div className="bg-[hsl(220,18%,14%)] px-5 py-4 flex items-center">
                  <p className="text-xs font-semibold text-white/80">{row.dimension}</p>
                </div>
                <div className="bg-[hsl(220,18%,12%)] px-5 py-4 flex items-start gap-2">
                  <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-white/50">{row.old}</p>
                </div>
                <div className="bg-[hsl(220,18%,14%)] px-5 py-4 flex items-start gap-2 border-l-2 border-primary/30">
                  <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-white/80">{row.pro}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap / Coming Soon — Timeline style ── */}
      <section className="bg-background blueprint-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary text-center mb-3">ROADMAP</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-4">
            What's coming next
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-14">
            We're building the platform NJTA and NJDOT teams have been asking for.
          </p>

          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-8">
              {roadmapItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 sm:gap-6 relative">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-card border-2 border-dashed border-primary/40 flex items-center justify-center shrink-0 relative z-10">
                    <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Coming Soon</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise CTA — Dark gradient with imagery ── */}
      <section className="relative overflow-hidden">
        <img
          src={blueprintPlans}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,20%,8%,0.95)] to-[hsl(25,80%,20%,0.90)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center relative z-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
            Ready to modernize your quantity tracking?
          </h2>
          <p className="text-sm text-white/60 mb-10 max-w-lg mx-auto leading-relaxed">
            Join NJTA engineering teams already measuring smarter. Get set up in minutes — no
            installs, no IT tickets, no disruption to active projects.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2 font-semibold text-sm">
              Request a Demo <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="gap-2 font-semibold text-sm border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              Start Free Trial
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
            {trustSignals.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                <t.icon className="h-3 w-3" /> {t.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/40">
            Questions? Reach us at{' '}
            <a href="mailto:sales@takeoffpro.com" className="underline hover:text-white/70">
              sales@takeoffpro.com
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-[hsl(220,20%,10%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
                  <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-white">TakeoffPro</span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Purpose-built digital quantity takeoff for New Jersey infrastructure projects.
              </p>
            </div>
            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wider">Product</p>
              <ul className="space-y-2 text-[11px] text-white/40">
                <li><button onClick={() => scrollTo('features')} className="hover:text-white/70 transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo('how-it-works')} className="hover:text-white/70 transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollTo('personas')} className="hover:text-white/70 transition-colors">For NJTA / DOT</button></li>
              </ul>
            </div>
            {/* Resources */}
            <div>
              <p className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wider">Resources</p>
              <ul className="space-y-2 text-[11px] text-white/40">
                <li><span className="cursor-default">Documentation</span></li>
                <li><span className="cursor-default">API</span></li>
                <li><span className="cursor-default">Support</span></li>
              </ul>
            </div>
            {/* Company */}
            <div>
              <p className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wider">Company</p>
              <ul className="space-y-2 text-[11px] text-white/40">
                <li><span className="cursor-default">About</span></li>
                <li><a href="mailto:sales@takeoffpro.com" className="hover:text-white/70 transition-colors">Contact</a></li>
                <li><span className="cursor-default">Privacy Policy</span></li>
                <li><span className="cursor-default">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-white/30">
              © {new Date().getFullYear()} TakeoffPro. All rights reserved.
            </p>
            <p className="text-[10px] text-white/30">
              Purpose-built for New Jersey infrastructure.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
