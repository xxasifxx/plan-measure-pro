import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  HardHat, Ruler, Layers, Users, Zap, FileSpreadsheet,
  ChevronRight, CheckCircle2, ArrowRight, X, Check,
  Upload, Target, PenTool, Download, Building2, Scale,
  ShieldCheck, Smartphone, BarChart3, Camera, Globe,
  ClipboardList, Clock, DollarSign, AlertTriangle,
  Eye, FileText, MapPin, Wrench, TrendingUp, Lock,
  Server, Headphones, BookOpen, Mail,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';

/* ─────────────────────────── DATA ─────────────────────────── */

const painPoints = [
  {
    icon: DollarSign,
    stat: '30+ days',
    label: 'Payment disputes delay cash flow',
    description:
      "When the contractor's quantities don't match the RE's field measurements, the estimate stalls. TakeoffPro creates a single source of truth tied to the contract plan set.",
  },
  {
    icon: AlertTriangle,
    stat: '5–15%',
    label: 'DC form errors compound monthly',
    description:
      'Handwritten daily quantities get transcribed into spreadsheets. Each copy introduces variance. Digital measurement eliminates transcription entirely.',
  },
  {
    icon: ShieldCheck,
    stat: 'Zero',
    label: 'Audit trail from plan to payment',
    description:
      "When FHWA or the Office of the Inspector General asks how a quantity was derived, can you show them? TakeoffPro timestamps every measurement with the user, location, and plan sheet.",
  },
];

const capabilities = [
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
];

const workflowSteps = [
  { icon: Upload, label: 'Upload Contract Plans', description: 'Drop the PDF plan set from ProjectWise or your file system' },
  { icon: ClipboardList, label: 'Import Pay Items', description: 'Paste from the bid schedule or extract from spec pages' },
  { icon: PenTool, label: 'Measure in the Field', description: 'Inspectors draw lines, areas, and counts on their tablets' },
  { icon: Download, label: 'Export for Payment', description: 'Download daily logs, monthly summaries, or full contract reports' },
];

const personas = [
  {
    icon: Ruler,
    title: 'Resident Engineers & Project Managers',
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
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <HardHat className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-tight">TakeoffPro</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => scrollTo('features')} className="text-xs hidden sm:inline-flex">
              Features
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo('how-it-works')} className="text-xs hidden sm:inline-flex">
              How It Works
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollTo('personas')} className="text-xs hidden sm:inline-flex">
              For NJTA / DOT
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-xs">
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="text-xs">
              Request a Demo <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary mb-6">
              <Building2 className="h-3 w-3" /> Purpose-Built for NJ Turnpike Authority & NJDOT Projects
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Stop Disputing Quantities.{' '}
              <span className="text-primary">Start Proving Them.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              TakeoffPro gives your RE team digital measurement tools that produce audit-ready quantity
              records — directly from contract plan PDFs. Built around NJTA Standard Specifications and
              pay item formats.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
                Request a Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="gap-2">
                Start Free Trial
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> NJTA Pay Item Compatible</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> NJDOT Spec Format</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Zero Install — Browser Based</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Field-Ready on Any Tablet</span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="hidden lg:block absolute right-0 top-16 w-[420px] h-[320px]">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
                <div className="h-8 bg-muted/50 border-b border-border flex items-center px-3 gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-destructive/40" />
                  <div className="h-2 w-2 rounded-full bg-warning/40" />
                  <div className="h-2 w-2 rounded-full bg-success/40" />
                  <span className="text-[9px] text-muted-foreground ml-2 font-mono">NJTA_Contract_Plans.pdf</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded bg-primary/20 animate-pulse" />
                    <div className="h-6 w-12 rounded bg-muted animate-pulse" />
                    <div className="h-6 w-14 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-40 rounded bg-muted/30 border border-border/50 relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160">
                      <line x1="60" y1="40" x2="200" y2="40" stroke="hsl(var(--primary))" strokeWidth="2" />
                      <text x="130" y="35" fill="hsl(var(--primary))" fontSize="8" textAnchor="middle">142.5 LF — Guardrail</text>
                      <polygon points="250,60 350,60 350,120 280,120 250,90" fill="hsl(var(--primary))" fillOpacity="0.12" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                      <text x="300" y="95" fill="hsl(var(--primary))" fontSize="8" textAnchor="middle">1,280 SY — HMA</text>
                      <circle cx="80" cy="110" r="6" fill="hsl(var(--primary))" />
                      <text x="80" y="113" fill="hsl(var(--primary-foreground))" fontSize="7" textAnchor="middle">1</text>
                      <circle cx="120" cy="100" r="6" fill="hsl(var(--primary))" />
                      <text x="120" y="103" fill="hsl(var(--primary-foreground))" fontSize="7" textAnchor="middle">2</text>
                    </svg>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-4 w-28 rounded bg-primary/10 flex items-center justify-center">
                      <span className="text-[7px] text-primary font-medium">Pay Item 401-0003</span>
                    </div>
                    <div className="ml-auto h-4 w-20 rounded bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Cost of Paper Takeoffs ── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">The Problem</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Paper takeoffs are costing you money and time
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Every manual step between plan measurement and monthly estimate is an opportunity for error,
            delay, and dispute.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {painPoints.map((p, i) => (
              <div key={i} className="p-6 rounded-lg bg-background border border-border">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
                  <p.icon className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-2xl font-black text-primary">{p.stat}</p>
                <p className="text-sm font-semibold mt-1">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section id="features" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Capabilities</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Built for NJTA & NJDOT workflows
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Every feature is designed around how NJ Turnpike and NJDOT teams actually manage
            construction quantities — from bid schedule to monthly estimate.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((f, i) => (
              <div key={i} className="group p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-card border-y border-border scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">How It Works</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Four steps from plan set to payment
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {workflowSteps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3 relative">
                  <step.icon className="h-6 w-6 text-primary" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Uses TakeoffPro ── */}
      <section id="personas" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Built For</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Every role in the inspection chain
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            From the Resident Engineer's office to the active travel lane — TakeoffPro fits the way
            NJTA and NJDOT teams already work.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {personas.map((p, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-sm mb-3">{p.title}</h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {p.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Comparison</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            TakeoffPro vs. your current process
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30%] text-xs font-semibold">Dimension</TableHead>
                  <TableHead className="w-[35%] text-xs font-semibold">Paper + Spreadsheets</TableHead>
                  <TableHead className="w-[35%] text-xs font-semibold text-primary">TakeoffPro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{row.dimension}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="flex items-start gap-1.5">
                        <X className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                        {row.old}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-start gap-1.5">
                        <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        {row.pro}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── Roadmap / Coming Soon ── */}
      <section>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Roadmap</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            What's coming next
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            We're building the platform NJTA and NJDOT teams have been asking for.
            These capabilities are in active development.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {roadmapItems.map((item, i) => (
              <div key={i} className="p-5 rounded-xl border border-dashed border-border bg-muted/20">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise CTA ── */}
      <section className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Ready to modernize your quantity tracking?
          </h2>
          <p className="text-sm text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            Join NJTA engineering teams already measuring smarter. Get set up in minutes — no
            installs, no IT tickets, no disruption to active projects.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Button size="lg" variant="secondary" onClick={() => navigate('/auth')} className="gap-2 font-semibold">
              Request a Demo <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="gap-2 font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Start Free Trial
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
            {trustSignals.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
                <t.icon className="h-3 w-3" /> {t.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-primary-foreground/60">
            Questions? Reach us at{' '}
            <a href="mailto:sales@takeoffpro.com" className="underline hover:text-primary-foreground/90">
              sales@takeoffpro.com
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
                  <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold">TakeoffPro</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Purpose-built digital quantity takeoff for New Jersey infrastructure projects.
              </p>
            </div>
            {/* Product */}
            <div>
              <p className="text-xs font-semibold mb-3">Product</p>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                <li><button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo('how-it-works')} className="hover:text-foreground transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollTo('personas')} className="hover:text-foreground transition-colors">For NJTA / DOT</button></li>
              </ul>
            </div>
            {/* Resources */}
            <div>
              <p className="text-xs font-semibold mb-3">Resources</p>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-default">Documentation</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">API</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Support</span></li>
              </ul>
            </div>
            {/* Company */}
            <div>
              <p className="text-xs font-semibold mb-3">Company</p>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-default">About</span></li>
                <li><a href="mailto:sales@takeoffpro.com" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Privacy Policy</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} TakeoffPro. All rights reserved.
            </p>
            <p className="text-[10px] text-muted-foreground">
              Purpose-built for New Jersey infrastructure.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
