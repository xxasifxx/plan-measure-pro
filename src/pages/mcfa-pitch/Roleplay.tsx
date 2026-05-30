import { HardHat, Smartphone, Wifi, FileCheck, GitBranch } from 'lucide-react';

const ACTS = [
  {
    n: 1, role: 'PM', Icon: HardHat,
    scenario: 'Sets up NJTA Contract 104-0001. Imports the 240-page plan set and the contractor’s P6 baseline.',
    outcome: 'Project live. Pay item catalog and schedule activities linked in one place.',
    bullets: ['Contract metadata in', 'Plan PDF parsed', 'P6 XML baseline accepted', 'Team invited'],
  },
  {
    n: 2, role: 'Inspector', Icon: Smartphone,
    scenario: 'Walks Span 1. Measures the deck demolition on tablet. Takes four geotagged photos. All offline.',
    outcome: 'Daily report drafted offline; quantities tied to pay item 202-0001 and activity A1020.',
    bullets: ['1,800 SY measured', '4 photos with GPS', 'Tied to A1020', 'Queued for sync'],
  },
  {
    n: 3, role: 'Inspector', Icon: Wifi,
    scenario: 'Reaches the trailer. The offline queue syncs in seconds and lands in the RE review queue.',
    outcome: 'Quantities now in the system, audit-stamped with timestamp, GPS, and inspector ID.',
    bullets: ['6 measurements pushed', 'Photos uploaded', 'RE notified', 'Audit trail recorded'],
  },
  {
    n: 4, role: 'Resident Engineer', Icon: FileCheck,
    scenario: 'Opens the queue. Approves six measurements; rejects one with a typed comment back to the inspector.',
    outcome: 'Approved quantities flow into the view that feeds estimates and the P6 update.',
    bullets: ['6 approved', '1 rejected w/ comment', '1,800 SY locked', 'Re-measure scheduled'],
  },
  {
    n: 5, role: 'PM', Icon: GitBranch,
    scenario: 'Clicks Update P6. The app reads approved quantities and writes ActualUnits + %Complete + DataDate into the contractor’s PMXML.',
    outcome: 'PM hands the updated XML back to the contractor with a full audit trail behind every percent.',
    bullets: ['A1020: 0% → 47%', 'A1030: 0% → 14%', 'DataDate stamped', 'Provenance per row'],
    moneyShot: true,
  },
];

const ROLE_COLOR: Record<string, string> = {
  PM: 'bg-primary/15 text-primary border-primary/30',
  Inspector: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Resident Engineer': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export function Roleplay() {
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-5 gap-3">
        {ACTS.map(act => (
          <div
            key={act.n}
            className={`rounded-md border ${act.moneyShot ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/40'} p-4 flex flex-col`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono text-muted-foreground">ACT {act.n}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${ROLE_COLOR[act.role]}`}>
                {act.role}
              </span>
              <act.Icon className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </div>
            <p className="text-xs leading-relaxed text-foreground/90 mb-3">{act.scenario}</p>
            <ul className="space-y-1 mb-3 flex-1">
              {act.bullets.map(b => (
                <li key={b} className="text-[10px] font-mono text-muted-foreground flex gap-1.5">
                  <span className="text-primary">›</span>{b}
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-border/50">
              <div className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground mb-1">Outcome</div>
              <p className="text-[11px] text-foreground/80 leading-snug">{act.outcome}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Act 5 money-shot: before/after P6 table */}
      <div className="rounded-md border border-primary/30 bg-card/40 p-4">
        <div className="text-[10px] uppercase tracking-wider font-mono text-primary mb-3">
          Act 5 detail — P6 fields written
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="py-2 pr-4">Activity</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4 text-right">Before %</th>
                <th className="py-2 pr-4 text-right">After %</th>
                <th className="py-2 pr-4">DataDate</th>
                <th className="py-2">Source</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              <tr className="border-b border-border/40">
                <td className="py-2 pr-4 text-primary">A1020</td>
                <td className="py-2 pr-4">Deck Demolition — Span 1</td>
                <td className="py-2 pr-4 text-right">0</td>
                <td className="py-2 pr-4 text-right text-emerald-400">47</td>
                <td className="py-2 pr-4">2026-05-04</td>
                <td className="py-2 text-muted-foreground">3 DRs · R. Patel</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-2 pr-4 text-primary">A1030</td>
                <td className="py-2 pr-4">Reinforcing Steel — Span 1</td>
                <td className="py-2 pr-4 text-right">0</td>
                <td className="py-2 pr-4 text-right text-emerald-400">14</td>
                <td className="py-2 pr-4">2026-05-18</td>
                <td className="py-2 text-muted-foreground">3 DRs · T. Nguyen</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-primary">A1010</td>
                <td className="py-2 pr-4">Mobilization &amp; Site Setup</td>
                <td className="py-2 pr-4 text-right">100</td>
                <td className="py-2 pr-4 text-right">100</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2 text-muted-foreground">unchanged</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-3">
          Every step above runs today. The live round-trip is at <code>/p6-xml</code>; the full interactive demo is at <code>/demo</code>.
        </p>
      </div>
    </div>
  );
}
