import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  HardHat, Ruler, Layers, Users, Zap, FileSpreadsheet,
  ChevronRight, CheckCircle2, ArrowRight, MousePointerClick,
  Upload, Target, PenTool, Download,
} from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: 'PDF Plan Viewer',
    description: 'Upload multi-page construction PDFs and navigate seamlessly between sheets with a table of contents.',
  },
  {
    icon: Target,
    title: 'Precision Calibration',
    description: 'Set real-world scale on any page. One calibration click and every measurement is accurate to the foot.',
  },
  {
    icon: PenTool,
    title: 'Smart Annotations',
    description: 'Draw lines, polygons, and counts — quantities auto-calculate in LF, SF, SY, CY, or EA.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Pay Item Management',
    description: 'Import pay items from specs, assign unit prices, track contract quantities vs. measured quantities.',
  },
  {
    icon: Users,
    title: 'Role-Based Collaboration',
    description: 'Project managers configure; inspectors measure. Everyone stays in sync with assigned projects and roles.',
  },
  {
    icon: Zap,
    title: 'Real-Time Sync',
    description: 'Annotations appear instantly across all team members\' screens. No refresh, no waiting.',
  },
];

const painPoints = [
  {
    stat: '40%',
    label: 'of takeoff time wasted',
    description: 'Manual counting from paper plans leads to errors, rework, and blown deadlines.',
  },
  {
    stat: '3x',
    label: 'more spreadsheet errors',
    description: 'Juggling quantities across disconnected spreadsheets multiplies mistakes.',
  },
  {
    stat: '0',
    label: 'real-time visibility',
    description: 'Without collaboration tools, project managers fly blind until reports are emailed.',
  },
];

const workflowSteps = [
  { icon: Upload, label: 'Upload', description: 'Drop your construction PDF plans' },
  { icon: Target, label: 'Calibrate', description: 'Set the real-world scale' },
  { icon: PenTool, label: 'Annotate', description: 'Draw measurements on the plans' },
  { icon: Download, label: 'Export', description: 'Download reports and daily logs' },
];

export default function Landing() {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={scrollToFeatures} className="text-xs hidden sm:inline-flex">
              Features
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-xs">
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="text-xs">
              Get Started <ChevronRight className="h-3 w-3 ml-1" />
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
              <Zap className="h-3 w-3" /> Built for construction teams
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Quantity Takeoff,{' '}
              <span className="text-primary">Done Right</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Measure directly from PDF plans, collaborate with your team in real-time,
              and export accurate pay item reports — all from your browser.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToFeatures} className="gap-2">
                See How It Works <MousePointerClick className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> No credit card</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Cloud-based</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Real-time sync</span>
            </div>
          </div>

          {/* Hero visual — abstract representation */}
          <div className="hidden lg:block absolute right-0 top-16 w-[420px] h-[320px]">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
                <div className="h-8 bg-muted/50 border-b border-border flex items-center px-3 gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-destructive/40" />
                  <div className="h-2 w-2 rounded-full bg-warning/40" />
                  <div className="h-2 w-2 rounded-full bg-success/40" />
                  <span className="text-[9px] text-muted-foreground ml-2 font-mono">project_plans.pdf</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded bg-primary/20 animate-pulse" />
                    <div className="h-6 w-12 rounded bg-muted animate-pulse" />
                    <div className="h-6 w-14 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-40 rounded bg-muted/30 border border-border/50 relative overflow-hidden">
                    {/* Fake annotation lines */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160">
                      <line x1="60" y1="40" x2="200" y2="40" stroke="hsl(25, 95%, 50%)" strokeWidth="2" />
                      <text x="130" y="35" fill="hsl(25, 95%, 50%)" fontSize="8" textAnchor="middle">142.5 LF</text>
                      <polygon points="250,60 350,60 350,120 280,120 250,90" fill="hsl(210, 92%, 55%)" fillOpacity="0.15" stroke="hsl(210, 92%, 55%)" strokeWidth="1.5" />
                      <text x="300" y="95" fill="hsl(210, 92%, 55%)" fontSize="8" textAnchor="middle">1,280 SF</text>
                      <circle cx="80" cy="110" r="6" fill="hsl(142, 71%, 45%)" />
                      <text x="80" y="113" fill="white" fontSize="7" textAnchor="middle">1</text>
                      <circle cx="120" cy="100" r="6" fill="hsl(142, 71%, 45%)" />
                      <text x="120" y="103" fill="white" fontSize="7" textAnchor="middle">2</text>
                    </svg>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-4 w-24 rounded bg-primary/10" />
                    <div className="h-4 w-16 rounded bg-success/10" />
                    <div className="ml-auto h-4 w-20 rounded bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">The Problem</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Manual takeoffs cost you money
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {painPoints.map((p, i) => (
              <div key={i} className="text-center sm:text-left p-6 rounded-lg bg-background border border-border">
                <p className="text-3xl font-black text-primary">{p.stat}</p>
                <p className="text-sm font-semibold mt-1">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Everything you need for digital takeoff
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
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

      {/* ── Workflow ── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Workflow</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Four steps to accurate quantities
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
                <p className="text-[11px] text-muted-foreground mt-1">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center mb-2">Built For</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Two roles, one seamless workflow
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Ruler className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-sm mb-2">Project Managers</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Create projects and upload PDF plans</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Set calibrations and import pay items</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Assign inspectors and review progress</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Export summary reports for billing</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <HardHat className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-sm mb-2">Field Inspectors</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Open assigned projects instantly</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Annotate with pre-configured pay items</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Override quantities with field actuals</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" /> Export daily logs as Excel workbooks</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Ready to streamline your takeoffs?
          </h2>
          <p className="text-sm text-primary-foreground/80 mb-8 max-w-md mx-auto">
            Stop counting from paper. Start measuring digitally with your team.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/auth')}
            className="gap-2 font-semibold"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <HardHat className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold">TakeoffPro</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} TakeoffPro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}