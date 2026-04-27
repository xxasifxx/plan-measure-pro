import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import heroScreenshot from '@/assets/hero-screenshot.jpg';
import inspectorTablet from '@/assets/inspector-tablet.jpg';
import highwayAerial from '@/assets/highway-construction-aerial.jpg';
import gpsFieldMeasurement from '@/assets/gps-field-measurement.jpg';
import {
  ArrowRight, Mail, ExternalLink, Cpu, Code2, ClipboardCheck, HardHat,
  CheckCircle2, Workflow, Database, Network, Bot, Layers, Target,
  TrendingUp, Calendar, Award, Users, Zap, ShieldCheck, Linkedin, Github,
} from 'lucide-react';

/* animation helpers */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0, 0, 0.2, 1] as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

/* data */
const hybridEdge = [
  { icon: Cpu, title: 'AI & GenAI', items: 'LLM Orchestration · RAG · MCP · A2A Agents' },
  { icon: Code2, title: 'Full Stack', items: 'C# · ReactJS · Azure Functions · REST APIs' },
  { icon: ClipboardCheck, title: 'Project Governance', items: 'PMP · EOS Familiarity · WCAG Compliance' },
  { icon: HardHat, title: 'Domain Expertise', items: 'Highway Inspection · P6 · BIM · CRM' },
];

const leads = [
  ['Love', 'Dedication to seamless internal/external user experiences', 'Increases team adoption of new digital tools'],
  ['Entrepreneurial', 'Proactive identification of automation opportunities', 'Replaces manual data entry with automated APIs'],
  ['Accountability', '100% data integrity in technical documentation', 'Minimizes liability and contractor-claim risk'],
  ['Delight', 'Real-time, transparent dashboards for agency stakeholders', 'Enhances client trust through superior visibility'],
  ['Stretch', 'Continuous pursuit of advanced certifications (PMP, NICET, AI)', 'Keeps mcfa at the forefront of Industry 4.0'],
];

const archetype = [
  ['Schedule Management', 'Manual entry of field updates into P6', 'Automated data ingestion via P6 REST APIs and AI agents'],
  ['Quality Control', 'Periodic audits of paper-based reports', 'Real-time QA scoring using RAG-powered documentation bots'],
  ['Stakeholder Reporting', 'Static PowerPoint and PDF decks', 'Interactive React dashboards with live BIM integration'],
  ['Workflow Optimization', 'Established SOPs and manual handoffs', 'Lean Six Sigma-informed automated orchestration'],
];

const poc = [
  'TOC auto-detection from full plan sets',
  'Automatic pay-item extraction (current page + next 4 pages)',
  'One-time scale calibration → document-wide default',
  'GPS field measurement with affine georeferencing',
  'Real-time multi-user sync',
  'NJDOT / NJTA-compliant CSV, PDF & Excel exports',
];

const roi = [
  ['Direct Revenue', '$312,000 billable', '$312,000 billable + $325,000 proposal wins'],
  ['Internal Savings', 'Negligible', '$203,750 (RE / Senior Staff hours saved)'],
  ['Efficiency Gains', 'Negligible', '$112,125 (reduced proposal-support cost)'],
  ['Net Annual Benefit', '$62,000', '$604,517'],
];

const eos = [
  { icon: Target, title: 'Scorecards', text: 'Weekly metrics: Integration Uptime · Automation Efficiency Gains · QA Score' },
  { icon: Award, title: 'Rocks', text: 'Quarterly goals: deploy new AI agents · ship P6/BIM connectors · earn certifications' },
  { icon: Users, title: 'Accountability Chart', text: 'Owner of the firm-wide Digital Infrastructure seat' },
  { icon: Workflow, title: 'Level 10 Meetings', text: 'IDS-driven resolution of technical roadblocks across project teams' },
];

const pathway = [
  {
    yr: 'YEAR 1–2',
    title: 'Foundation & Integration',
    bullets: ['Stand up P6 ↔ Draw-Quantify-Dash bridge', 'Automate DC-form workflows on one flagship NJTA project', 'Earn NICET II, deepen EOS fluency'],
  },
  {
    yr: 'YEAR 3–5',
    title: 'Strategic Expansion & AI Deployment',
    bullets: ['Deploy MCP-grounded agents across 3+ projects', 'Lead Agentic Interoperability practice', 'Mentor junior integrators, earn NICET III + advanced AI cert'],
  },
  {
    yr: 'YEAR 6–8',
    title: 'Practice Leadership & Principal Vision',
    bullets: ['Own the Digital Infrastructure division P&L', 'Drive proposal wins on $5M+ pursuits', 'Path toward Resident Engineer / Principal seat'],
  },
];

const proposalTiers = [
  { range: '< $1M', label: 'Standard Proposal Support', value: '~$25k' },
  { range: '$1M – $5M', label: 'Medium Proposal Support', value: '~$75k' },
  { range: '> $5M', label: 'Strategic Proposal Support', value: '~$150k+' },
];

/* page */
export default function McfaPitch() {
  useEffect(() => {
    document.title = 'mcfa BYOR Proposal — Software Solution Integrator | Asif Muhammad, PMP';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const mailto = 'mailto:?subject=mcfa%20BYOR%20%E2%80%94%20Software%20Solution%20Integrator%20Conversation&body=Hello%2C%0A%0AI%27d%20like%20to%20schedule%2030%20minutes%20to%20discuss%20the%20Build%20Your%20Own%20Role%20Software%20Solution%20Integrator%20proposal.%0A%0A%E2%80%94%20Asif';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      {/* ─────────── NAV ─────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Layers className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              BYOR · Proposal · v1
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/demo">Live Prototype <ExternalLink className="w-3 h-3 ml-1" /></Link>
            </Button>
            <Button asChild size="sm">
              <a href={mailto}>Contact Asif <Mail className="w-3 h-3 ml-1" /></a>
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="lg:col-span-7">
            <motion.div variants={fadeUp} className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-6">
              Build Your Own Role · Proposal for mcfa
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
              A <span className="text-primary">Software Solution Integrator</span> for mcfa's Transportation &amp; Infrastructure Division.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              Bridging field-level inspection reality with Agentic AI, Primavera P6, and the modern AEC stack — written by a candidate who has already shipped the proof-of-concept you are about to use.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
              <Button asChild size="lg" className="text-base">
                <Link to="/demo">View Live Proof-of-Concept <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <a href={mailto}>Schedule 30 Minutes <Mail className="w-4 h-4 ml-1" /></a>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
              <span>Asif Muhammad, PMP</span>
              <span className="text-border">·</span>
              <span>~7 yrs GenAI / Full-Stack</span>
              <span className="text-border">·</span>
              <span>Highway Inspector — Churchill / Trilon</span>
              <span className="text-border">·</span>
              <span>Doc QA ≥ 95%</span>
              <span className="text-border">·</span>
              <span>Aerospace Safety-Critical (A400M)</span>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="lg:col-span-5 relative">
            <div className="relative rounded-lg overflow-hidden border border-border shadow-2xl">
              <img src={heroScreenshot} alt="Draw-Quantify-Dash live application" className="w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-md px-4 py-2 shadow-lg">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Built by the candidate</div>
              <div className="text-sm font-semibold">draw-quantify-dash.lovable.app</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── WHY NOW ─────────── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">01 · Why this role, why now</motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-6 max-w-3xl">
              The $2B NJTA I-4 expansion produces more data than any inspector can hand-key into a spreadsheet.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              mcfa's culture of <em>Extreme Ownership</em> and a <em>White-Glove Customer Experience</em> demands the same internal efficiency the firm delivers externally. The traditional Project Controls Assistant cannot keep pace with the volume of geotechnical, drainage, and roadway data flowing off NJTA, DRPA/PATCO, and JFK projects. mcfa needs a hybrid: a credentialed inspector who also writes production software — a Software Solution Integrator who turns field signal into board-room dashboards while the RE focuses on stakeholder navigation.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─────────── HYBRID EDGE ─────────── */}
      <section className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">02 · The hybrid edge</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-12 max-w-3xl">Four competencies. One person.</h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hybridEdge.map(({ icon: Icon, title, items }) => (
              <motion.div key={title} variants={fadeUp}>
                <Card className="p-6 h-full hover:border-primary transition-colors">
                  <Icon className="w-7 h-7 text-primary mb-4" />
                  <div className="font-bold text-lg mb-2">{title}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{items}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─────────── PROOF OF CONCEPT ─────────── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">03 · Proof of concept</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Draw-Quantify-Dash is already shipping.</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Not a slide. Not a roadmap. A working multi-tenant React + Supabase application built on the same patterns proposed for mcfa — purpose-built for NJTA / NJDOT inspection workflows.
            </p>
            <ul className="space-y-3 mb-8">
              {poc.map((p) => (
                <li key={p} className="flex gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg">
              <Link to="/demo">Open the Live App <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src={inspectorTablet} alt="Field inspector using the app" className="rounded-md border border-border w-full h-48 object-cover" />
            <img src={gpsFieldMeasurement} alt="GPS field measurement" className="rounded-md border border-border w-full h-48 object-cover mt-8" />
            <img src={highwayAerial} alt="Highway construction aerial" className="rounded-md border border-border w-full h-48 object-cover" />
            <img src={heroScreenshot} alt="Dashboard view" className="rounded-md border border-border w-full h-48 object-cover mt-8" />
          </div>
        </div>
      </section>

      {/* ─────────── LEADS ─────────── */}
      <section className="border-b border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">04 · LEADS alignment</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">How this role lives mcfa's core values.</h2>
          <div className="overflow-hidden border border-border rounded-lg bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/6">Value</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Strategic Alignment</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Project Outcome</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(([v, a, o]) => (
                  <tr key={v} className="border-t border-border">
                    <td className="px-4 py-4 font-bold text-primary">{v}</td>
                    <td className="px-4 py-4">{a}</td>
                    <td className="px-4 py-4 text-muted-foreground">{o}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────────── ARCHETYPE ─────────── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">05 · The integrator archetype</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Beyond the traditional scheduler.</h2>
          <p className="text-muted-foreground mb-12 max-w-3xl">A standard scheduler maintains a P6 file. A Solution Integrator owns the harmonic functioning of the entire IT ecosystem — translating between Solution Architects, BAs, and Project Managers.</p>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Responsibility</div>
            <div className="bg-muted/40 p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Traditional</div>
            <div className="bg-muted/40 p-4 font-mono text-xs uppercase tracking-wider text-primary">Integrator</div>
            {archetype.map(([r, t, i]) => (
              <div key={r} className="contents">
                <div className="bg-card p-4 font-semibold">{r}</div>
                <div className="bg-card p-4 text-sm text-muted-foreground line-through decoration-destructive/40">{t}</div>
                <div className="bg-card p-4 text-sm">{i}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── TECHNICAL VISION ─────────── */}
      <section className="border-b border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">06 · Technical vision</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Three layers, one fabric.</h2>

          <div className="space-y-6">
            {/* P6 */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-4">
                <Database className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Layer 1</div>
                  <h3 className="text-xl font-bold">Primavera P6 Integration</h3>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">Unlock siloed P6 data via the REST API (preferred for React/Node clients), Web Services for legacy security needs, or the Java Integration API for heavy ETL.</p>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                {['REST · JSON · OAuth/JWT', 'SOAP · WSSecurity', 'Local + Remote (RMI) modes', 'XMLExporter for snapshots'].map((t) => (
                  <span key={t} className="px-3 py-1 rounded bg-muted border border-border">{t}</span>
                ))}
              </div>
            </Card>

            {/* Modern stack */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-4">
                <Layers className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Layer 2</div>
                  <h3 className="text-xl font-bold">Modern Design Stack — Revit · BIM 360 · ACC</h3>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">3D model changes trigger schedule updates. Quantities flow from Revit parameters to P6 activity progress to executive dashboards.</p>
              <div className="font-mono text-xs flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="px-3 py-2 bg-card border border-border rounded">Revit</span>
                <ArrowRight className="w-3 h-3" />
                <span className="px-3 py-2 bg-card border border-border rounded">APS / Forge</span>
                <ArrowRight className="w-3 h-3" />
                <span className="px-3 py-2 bg-card border border-border rounded">BIM 360 / ACC</span>
                <ArrowRight className="w-3 h-3" />
                <span className="px-3 py-2 bg-card border border-border rounded">P6 REST</span>
                <ArrowRight className="w-3 h-3" />
                <span className="px-3 py-2 bg-primary text-primary-foreground border border-primary rounded">Power BI · Toric</span>
              </div>
            </Card>

            {/* Agentic */}
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-4">
                <Bot className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Layer 3 · The differentiator</div>
                  <h3 className="text-xl font-bold">Agentic AI — MCP + A2A</h3>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="p-5 rounded-md bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-4 h-4 text-primary" />
                    <div className="font-bold">Model Context Protocol (MCP)</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Universal adapter grounding LLMs in trusted business data — NJDOT specs, P6 schedules, historical project files. Eliminates one-off connectors.</p>
                </div>
                <div className="p-5 rounded-md bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Workflow className="w-4 h-4 text-primary" />
                    <div className="font-bold">Agent-to-Agent (A2A)</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Specialized agents discover each other and coordinate. A Procurement Agent detects a material delay and hands it to a Schedule Agent that recomputes downstream impact and notifies the PM.</p>
                </div>
              </div>
              <div className="font-mono text-xs text-muted-foreground border-l-2 border-primary pl-4">
                Result: <span className="text-foreground font-semibold">Agentic Interoperability</span> — intelligent systems coordinating complex workflows with minimal human intervention.
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ─────────── ROI ─────────── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">07 · Return on investment</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">A 9.7× value multiplier.</h2>
          <p className="text-muted-foreground mb-12 max-w-3xl">By collapsing manual handoffs into automated flows and redirecting "flexible capacity" toward high-value proposal work, the Integrator transforms from cost center to growth engine.</p>

          <div className="overflow-hidden border border-border rounded-lg bg-card mb-8">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Component</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Traditional Scheduler</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-primary">Solution Integrator</th>
                </tr>
              </thead>
              <tbody>
                {roi.map(([c, t, i], idx) => (
                  <tr key={c} className={`border-t border-border ${idx === roi.length - 1 ? 'bg-primary/5 font-bold' : ''}`}>
                    <td className="px-4 py-4">{c}</td>
                    <td className="px-4 py-4 text-muted-foreground">{t}</td>
                    <td className={`px-4 py-4 ${idx === roi.length - 1 ? 'text-primary text-lg' : ''}`}>{i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {proposalTiers.map((t) => (
              <Card key={t.range} className="p-6">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.range}</div>
                <div className="font-bold mb-2">{t.label}</div>
                <div className="text-2xl font-bold text-primary">{t.value}</div>
                <div className="text-xs text-muted-foreground mt-1">assigned Value Add</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── EOS ─────────── */}
      <section className="border-b border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">08 · EOS integration</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Tethered to mcfa's operating system.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {eos.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-6">
                <Icon className="w-6 h-6 text-primary mb-3" />
                <div className="font-bold mb-2">{title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{text}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── PATHWAY ─────────── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-[0.25em] text-primary uppercase mb-4">09 · 8-Year career pathway</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">From technical expert to Practice Leader.</h2>
          <div className="space-y-6">
            {pathway.map((p, idx) => (
              <div key={p.yr} className="grid md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3">
                  <div className="font-mono text-xs tracking-widest text-primary">{p.yr}</div>
                  <div className="text-2xl font-bold mt-1">{p.title}</div>
                </div>
                <div className="md:col-span-9 border-l-2 border-border pl-6 pb-6 relative">
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-primary" />
                  <ul className="space-y-2">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex gap-3 text-sm">
                        <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {idx < pathway.length - 1 && null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CLOSING CTA ─────────── */}
      <section className="bg-gradient-to-br from-sidebar-background via-sidebar-background to-[hsl(220_25%_10%)] text-sidebar-foreground">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Zap className="w-10 h-10 text-primary mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Let's bridge the digital divide<br />in NJ infrastructure together.
            </h2>
            <p className="text-lg text-sidebar-foreground/70 max-w-2xl mx-auto mb-10">
              Thirty minutes to walk through the live application, the P6 + BIM + Agentic roadmap, and how this role plugs into mcfa's V/TO and Accountability Chart.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" className="text-base">
                <a href={mailto}>Schedule a Conversation <Mail className="w-4 h-4 ml-1" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <Link to="/demo">Explore the Working Prototype <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>
            <div className="mt-12 pt-8 border-t border-sidebar-border flex flex-wrap items-center justify-center gap-6 text-sm text-sidebar-foreground/60">
              <a href="https://draw-quantify-dash.lovable.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                <ExternalLink className="w-4 h-4" /> draw-quantify-dash.lovable.app
              </a>
              <a href="#" className="flex items-center gap-2 hover:text-primary transition-colors"><Linkedin className="w-4 h-4" /> LinkedIn</a>
              <a href="#" className="flex items-center gap-2 hover:text-primary transition-colors"><Github className="w-4 h-4" /> GitHub</a>
            </div>
            <div className="mt-8 font-mono text-xs text-sidebar-foreground/40 tracking-wider">
              Built with the same React · Supabase · Agentic-AI stack proposed for mcfa.
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
