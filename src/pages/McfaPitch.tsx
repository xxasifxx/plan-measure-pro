import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Layers, Database, Cpu, FileCode, GitBranch, ChevronRight, Download } from 'lucide-react';
import { PHASES, STATUS_COLORS, translateVerdict, rollupStatus, type Status } from './mcfa-pitch/lib/wbs-rollup';
import { PhaseSchedule } from './mcfa-pitch/PhaseSchedule';
import { Roleplay } from './mcfa-pitch/Roleplay';

const DEV_XML_HREF = '/exports/takeoffpro-dev.xml';

/* ------------------------------------------------------------------ */
/* Section A — built-so-far stats (snapshot 2026-05-30)               */
/* ------------------------------------------------------------------ */
const STATS = [
  { icon: Layers,   label: 'Application screens',        value: '18',      sub: 'src/pages/**' },
  { icon: Database, label: 'Database migrations',        value: '36',      sub: 'supabase/migrations' },
  { icon: Cpu,      label: 'Edge functions',             value: '4',       sub: 'supabase/functions' },
  { icon: FileCode, label: 'TypeScript / TSX',           value: '32k',     sub: 'lines, src/**' },
  { icon: GitBranch,label: 'P6 XML round-trip',          value: 'Verified',sub: 'see /p6-xml', link: '/p6-xml' },
];

/* ------------------------------------------------------------------ */
/* Section B — phase + stream tree, reading capability verdicts       */
/* ------------------------------------------------------------------ */

interface ScheduleCap { verdict: string }
interface ScheduleStream {
  stream_key: string;
  capabilities: ScheduleCap[];
}
interface Schedule { streams: ScheduleStream[] }

function streamStatus(s: ScheduleStream | undefined): Status {
  if (!s) return 'Planned';
  const all = s.capabilities.map(c => translateVerdict({ verdict: c.verdict }));
  return rollupStatus(all);
}

function WbsTree({ schedule }: { schedule: Schedule | null }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['scheduling']));
  const toggle = (id: string) =>
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="rounded-md border border-border bg-card/40 divide-y divide-border">
      {PHASES.map(phase => {
        const streamStatuses = phase.streams.map(ps => streamStatus(schedule?.streams.find(s => s.stream_key === ps.key)));
        const built = streamStatuses.filter(s => s === 'Built').length;
        const inProg = streamStatuses.filter(s => s === 'In Progress' || s === 'Needs QA').length;
        const planned = streamStatuses.filter(s => s === 'Planned').length;
        const phaseStatus = rollupStatus(streamStatuses);
        const isOpen = open.has(phase.id);
        return (
          <div key={phase.id}>
            <button
              onClick={() => toggle(phase.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-foreground">{phase.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${STATUS_COLORS[phaseStatus]}`}>
                    {phaseStatus}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{phase.blurb}</div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                <span className="text-emerald-400">{built}</span> built · <span className="text-amber-400">{inProg}</span> wip · <span className="text-slate-400">{planned}</span> planned
              </div>
            </button>
            {isOpen && (
              <div className="bg-background/40 border-t border-border">
                {phase.streams.map((s, i) => (
                  <div key={s.key} className="flex items-start gap-3 px-4 py-2.5 border-b border-border/30 last:border-b-0">
                    <span className="font-mono text-[10px] text-muted-foreground mt-0.5">{s.code}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{s.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${STATUS_COLORS[streamStatuses[i]]}`}>
                          {streamStatuses[i]}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.deliverable}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function McfaPitch() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  useEffect(() => {
    fetch('/wbs/schedule.json').then(r => r.json()).then(setSchedule).catch(() => setSchedule(null));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link to="/landing" className="font-mono text-xs font-semibold tracking-wide">
            TAKEOFFPRO <span className="text-muted-foreground">/ MCFA</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <Link to="/landing" className="px-2 py-1 text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/demo" className="px-2 py-1 text-muted-foreground hover:text-foreground">Demo</Link>
            <Link to="/p6-xml" className="px-2 py-1 text-muted-foreground hover:text-foreground">P6 round-trip</Link>
            <Link to="/auth" className="px-2 py-1 text-foreground hover:text-primary">Sign in</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
        {/* Hero */}
        <header className="space-y-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            Prepared for MCFA · 2026 Q2
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            The TakeoffPro build, as a P6 schedule<br className="hidden sm:block" />
            <span className="text-primary">you can import in 30 seconds.</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            One PMXML file with the full WBS, every activity, status, and milestone for the
            application I'm building — and a walkthrough of what the finished app does for
            an inspector, RE, and PM on an NJTA contract.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={DEV_XML_HREF}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Download takeoffpro-dev.xml
            </a>
            <span className="text-[11px] font-mono text-muted-foreground">
              P6 PMXML v22.12 · 5 phases · 22 streams · 154 activities · 7 milestones · 140 FS relationships · QA_Status UDF per activity
            </span>
          </div>
        </header>

        {/* Section A */}
        <Section
          n="A" title="Built so far"
          intro="Six months of build. 60 of 154 scheduled activities are code-complete and demonstrable on web, mobile, and offline — 58 of those still need a formal QA pass before I'd call them verified. The remaining 89 are planned or partially scaffolded, and the bulk of the next sprint is QA, polish, and deepening the P6 integration MCFA cares about most."
        >

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {STATS.map(s => {
              const Inner = (
                <div className="rounded-md border border-border bg-card/40 p-4 h-full hover:border-primary/40 transition">
                  <s.icon className="h-4 w-4 text-muted-foreground mb-3" />
                  <div className="font-mono text-2xl font-semibold text-foreground">{s.value}</div>
                  <div className="text-[11px] text-foreground/80 mt-1">{s.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{s.sub}</div>
                </div>
              );
              return s.link
                ? <Link key={s.label} to={s.link} className="block">{Inner}</Link>
                : <div key={s.label}>{Inner}</div>;
            })}
          </div>
        </Section>

        {/* Section B */}
        <Section
          n="B" title="Work breakdown"
          intro="Twenty-two engineering streams rolled into five phases. Built = code in repo and demonstrable. Needs QA = built but not yet covered by an end-to-end test pass. In Progress = partial implementation. Planned = not started. Click a phase to expand."
        >

          <WbsTree schedule={schedule} />
        </Section>

        {/* Section C */}
        <Section
          n="C" title="Baseline, actuals, forecast"
          intro="Single-developer schedule. Velocity comes from history (capabilities completed per calendar day since the project started). Remaining scope is laid out phase-after-phase starting today — not in parallel — so the forecast finish reflects what one person can actually ship. Each phase row shows actual progress to today, then its slice of forward work as a dashed bar."
        >
          <PhaseSchedule />
        </Section>

        {/* Section D */}
        <Section
          n="D" title="Five-act walkthrough"
          intro="One imagined project — NJTA Contract 104-0001, I-95 Bridge Deck Rehab. Same data flows through all four roles and ends with a P6 XML the PM hands back to the contractor."
        >
          <Roleplay />
        </Section>

        {/* CTA */}
        <section className="rounded-md border border-primary/30 bg-primary/5 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-primary mb-1">Take it with you</div>
            <div className="text-base font-semibold">Import the build schedule into your own P6 instance.</div>
            <div className="text-xs text-muted-foreground mt-1">
              File → Import → Primavera XML → New Project. Opens with the WBS expanded and milestones on the bar chart.
            </div>
          </div>
          <div className="flex gap-2">
            <a href={DEV_XML_HREF} download className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Download className="h-4 w-4" /> Download PMXML
            </a>
            <Link to="/p6-xml" className="inline-flex items-center gap-2 px-4 py-2 rounded border border-border text-sm font-medium hover:bg-muted/40">
              Live round-trip <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="text-[10px] font-mono text-muted-foreground pt-8 border-t border-border">
          Snapshot generated 2026-05-30 · counts and forecasts derived from <code>.lovable/wbs/schedule.json</code> and the repo.
        </footer>
      </main>
    </div>
  );
}

function Section({ n, title, intro, children }: { n: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Section {n}</span>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{intro}</p>
      <div className="pt-2">{children}</div>
    </section>
  );
}
