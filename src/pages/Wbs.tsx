import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, FileCode, FileWarning, Package, Folder, Calendar, GitBranch, Hammer } from 'lucide-react';

interface Parent {
  id: string;
  name: string;
  kind: 'stream' | 'capability';
  parentId: string | null;
  capability_kind?: string;
  verdict?: string;
  severity?: string;
}
interface Leaf {
  id: string;
  path: string;
  name: string;
  stream_key: string;
  capability_id: string;
  layer: string;
  kind: 'file' | 'placeholder' | 'deliverable';
  exists: boolean;
  verdict_blocker?: string;
  loc_added: number;
  touch_count: number;
  last_modified_at: string | null;
  parentId: string;
}
interface Wbs {
  totals: Record<string, unknown>;
  parents: Parent[];
  leaves: Leaf[];
}
interface ActivitySlim {
  id: string;
  role: 'scaffold' | 'implement' | 'verify';
  primary_leaf: string;
  capability_id: string;
  origin: string;
  lifecycle: string;
}
interface ScheduleCap {
  id: string; title: string; kind: string; verdict: string;
  files_count: number; needs_count: number;
  actual_start: string | null; last_touch: string | null;
  touches: number; loc: number;
  remaining_days: number; forecast_finish: string | null;
  verify_done: number; verify_total: number;
  suspicious_recency?: boolean;
}
interface ScheduleStream {
  stream_key: string; title: string;
  actual_start: string | null; last_touch: string | null;
  touches: number; loc: number;
  remaining_days: number; forecast_finish: string | null;
  capability_count: number;
  capabilities: ScheduleCap[];
}
interface Milestone {
  id: string; name: string; gate: unknown;
  target_date: string | null; forecast_date: string | null; met: boolean;
}
interface Schedule {
  generatedAt: string; T0: string;
  totals: {
    capabilities: number; implemented: number; partial: number; planned: number;
    total_remaining_days: number; total_touches: number; total_loc: number;
    actual_start: string | null; last_touch: string | null; forecast_finish: string | null;
  };
  milestones: Milestone[];
  streams: ScheduleStream[];
}

interface BacklogEntry {
  id: string; stream: string; stream_title: string;
  source_id: string; source_type: string; source_verdict: string; source_severity: string | null;
  title: string; problem_statement: string; desired_behavior: string;
  build_scope: Record<string, string[]>;
  scope_label: string;
  likely_files: string[]; likely_tables: string[];
  user_roles_affected: string[];
  acceptance_criteria: string[];
  verification_plan: string;
  definition_of_done: string;
  blockers: string[]; dependencies: string[];
  owner_role: string; estimate_days: number; confidence: 'low' | 'medium' | 'high';
}
interface Backlog {
  generatedAt: string;
  source_counts: { capabilities_total: number; promises_total: number; verification_activities_total: number };
  totals: {
    entries: number;
    by_source_type: Record<string, number>;
    by_stream: Record<string, number>;
    by_confidence: Record<string, number>;
    by_owner_role: Record<string, number>;
    total_estimate_days: number;
  };
  entries: BacklogEntry[];
}
interface NetworkNode {
  id: string; stream: string; title: string; duration: number;
  confidence: 'low' | 'medium' | 'high'; owner_role: string; source_type: string;
  predecessors: string[]; successors: string[];
  layer: number; ES: number; EF: number; LS: number; LF: number;
  slack: number; critical: boolean;
}
interface Network {
  generatedAt: string;
  stats: {
    node_count: number; edge_count: number; declared_edges: number; inferred_edges: number;
    cycle_edges_dropped: number; unconnected_nodes: number;
    project_duration_days: number; critical_path_length: number;
    max_layer: number; critical_node_count: number;
  };
  issues: Array<Record<string, unknown>>;
  critical_path: string[];
  nodes: NetworkNode[];
}

const VERDICT_COLOR: Record<string, string> = {
  implemented: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  missing: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  planned: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  unknown: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};
const VERDICT_BAR: Record<string, string> = {
  implemented: 'bg-emerald-500',
  partial: 'bg-amber-500',
  missing: 'bg-rose-500',
  planned: 'bg-sky-500',
  unknown: 'bg-slate-600',
};
const LIFECYCLE_COLOR: Record<string, string> = {
  shipped: 'bg-emerald-500',
  'in-flight': 'bg-amber-500',
  paused: 'bg-orange-500',
  dormant: 'bg-rose-500',
  abandoned: 'bg-rose-700',
  planned: 'bg-slate-600',
};

export default function Wbs() {
  const [wbs, setWbs] = useState<Wbs | null>(null);
  const [acts, setActs] = useState<ActivitySlim[] | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'gaps' | 'placeholders' | 'deliverables'>('all');
  const [view, setView] = useState<'backlog' | 'network' | 'files' | 'schedule'>('backlog');
  const [backlogStream, setBacklogStream] = useState<string>('all');
  const [backlogSource, setBacklogSource] = useState<string>('all');
  const [backlogConfidence, setBacklogConfidence] = useState<string>('all');
  const [networkStream, setNetworkStream] = useState<string>('all');
  const [networkOnlyConnected, setNetworkOnlyConnected] = useState<boolean>(true);
  const [networkCriticalOnly, setNetworkCriticalOnly] = useState<boolean>(false);
  const [networkHover, setNetworkHover] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/wbs/wbs.json').then((r) => r.json()),
      fetch('/wbs/activities.json').then((r) => r.json()),
      fetch('/wbs/schedule.json').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('/wbs/build-backlog.json').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('/wbs/backlog-network.json').then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([w, a, s, b, n]) => {
      setWbs(w);
      setActs(a.activities);
      setSchedule(s);
      setBacklog(b);
      setNetwork(n);
      // open all streams by default
      setOpen(new Set(w.parents.filter((p: Parent) => p.kind === 'stream').map((p: Parent) => p.id)));
    });
  }, []);

  const activitiesByLeaf = useMemo(() => {
    const m = new Map<string, ActivitySlim[]>();
    if (!acts) return m;
    for (const a of acts) {
      if (!m.has(a.primary_leaf)) m.set(a.primary_leaf, []);
      m.get(a.primary_leaf)!.push(a);
    }
    return m;
  }, [acts]);

  const childParents = useMemo(() => {
    const m = new Map<string | null, Parent[]>();
    if (!wbs) return m;
    for (const p of wbs.parents) {
      const k = p.parentId;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  }, [wbs]);

  const leavesByParent = useMemo(() => {
    const m = new Map<string, Leaf[]>();
    if (!wbs) return m;
    for (const l of wbs.leaves) {
      if (!m.has(l.parentId)) m.set(l.parentId, []);
      m.get(l.parentId)!.push(l);
    }
    return m;
  }, [wbs]);

  const networkById = useMemo(() => {
    const m = new Map<string, NetworkNode>();
    if (network) for (const n of network.nodes) m.set(n.id, n);
    return m;
  }, [network]);

  if (!wbs || !acts) {
    return <div className="min-h-screen bg-slate-950 text-slate-300 p-8 font-mono text-sm">Loading WBS…</div>;
  }

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rolledUp = (capId: string) => {
    // % verified for this capability = verify activities Completed / total verify
    let total = 0;
    let done = 0;
    for (const a of acts) {
      if (a.capability_id !== capId || a.role !== 'verify') continue;
      total++;
      if (a.lifecycle === 'shipped') done++;
    }
    return { total, done, pct: total ? Math.round((done * 100) / total) : 0 };
  };

  const shouldRenderLeaf = (l: Leaf) => {
    if (filter === 'all') return true;
    if (filter === 'placeholders') return l.kind === 'placeholder';
    if (filter === 'deliverables') return l.kind === 'deliverable';
    if (filter === 'gaps') {
      const as = activitiesByLeaf.get(l.id) || [];
      return as.some((a) => a.role === 'verify' && a.lifecycle !== 'shipped');
    }
    return true;
  };

  const renderLeaf = (l: Leaf, depth: number) => {
    if (!shouldRenderLeaf(l)) return null;
    const as = activitiesByLeaf.get(l.id) || [];
    const roleStatus = (r: string) => as.find((a) => a.role === r)?.lifecycle || 'planned';
    const Icon = l.kind === 'placeholder' ? FileWarning : l.kind === 'deliverable' ? Package : FileCode;
    const iconClr =
      l.kind === 'placeholder' ? 'text-rose-400' : l.kind === 'deliverable' ? 'text-sky-400' : 'text-slate-400';
    return (
      <div
        key={l.id}
        className="flex items-center gap-3 py-1 px-2 text-xs hover:bg-slate-900/60 rounded"
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        <Icon className={`h-3.5 w-3.5 ${iconClr} shrink-0`} />
        <span className="font-mono text-slate-300 truncate flex-1">
          {l.path}
        </span>
        <span className="text-[10px] text-slate-500 w-16 text-right">
          {l.kind === 'file' ? `${l.loc_added.toLocaleString()} loc` : l.kind}
        </span>
        <div className="flex items-center gap-1 w-32 justify-end">
          {(['scaffold', 'implement', 'verify'] as const).map((r) => (
            <span
              key={r}
              title={`${r}: ${roleStatus(r)}`}
              className={`h-2 w-8 rounded ${LIFECYCLE_COLOR[roleStatus(r)] || 'bg-slate-700'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderCapability = (cap: Parent, depth: number) => {
    const leaves = (leavesByParent.get(cap.id) || []).filter(shouldRenderLeaf);
    if (!leaves.length && filter !== 'all') return null;
    const isOpen = open.has(cap.id);
    const rollup = rolledUp(cap.id.replace(/^CAP-/, ''));
    const verdict = cap.verdict || 'unknown';
    return (
      <div key={cap.id}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-slate-900/50 rounded text-xs"
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => toggle(cap.id)}
        >
          {leaves.length ? (
            isOpen ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronRight className="h-3 w-3 text-slate-500" />
          ) : (
            <span className="w-3" />
          )}
          <Folder className="h-3.5 w-3.5 text-slate-500" />
          <span className="truncate flex-1 text-slate-200">{cap.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${VERDICT_COLOR[verdict] || VERDICT_COLOR.unknown}`}>
            {verdict}
          </span>
          <span className="text-[10px] text-slate-500 w-20 text-right">
            {rollup.done}/{rollup.total} verified
          </span>
          <span className="text-[10px] text-slate-500 w-12 text-right">{leaves.length} leaf</span>
        </div>
        {isOpen && leaves.map((l) => renderLeaf(l, depth + 1))}
      </div>
    );
  };

  const renderStream = (s: Parent) => {
    const isOpen = open.has(s.id);
    const caps = (childParents.get(s.id) || []).filter((c) => c.kind === 'capability');
    const visibleCaps = caps.filter((c) => {
      if (filter === 'all') return true;
      const leaves = (leavesByParent.get(c.id) || []).filter(shouldRenderLeaf);
      return leaves.length > 0;
    });
    if (!visibleCaps.length && filter !== 'all') return null;
    const allLeaves = caps.flatMap((c) => leavesByParent.get(c.id) || []);
    const fileCount = allLeaves.filter((l) => l.kind === 'file').length;
    const placeholderCount = allLeaves.filter((l) => l.kind === 'placeholder').length;
    const deliverableCount = allLeaves.filter((l) => l.kind === 'deliverable').length;
    return (
      <div key={s.id} className="border-b border-slate-900">
        <div
          className="flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-slate-900/40 text-sm"
          onClick={() => toggle(s.id)}
        >
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
          <span className="font-semibold text-slate-100 flex-1">{s.name}</span>
          <span className="text-[10px] text-slate-500">
            {visibleCaps.length} caps · {fileCount} files
            {placeholderCount ? ` · ${placeholderCount} pending` : ''}
            {deliverableCount ? ` · ${deliverableCount} deliverables` : ''}
          </span>
        </div>
        {isOpen && visibleCaps.map((c) => renderCapability(c, 1))}
      </div>
    );
  };

  const streams = wbs.parents.filter((p) => p.kind === 'stream').sort((a, b) => a.id.localeCompare(b.id));

  // ---- Schedule view helpers ----
  const renderScheduleStrip = (s: ScheduleStream, span: { min: Date; max: Date }) => {
    const totalMs = span.max.getTime() - span.min.getTime() || 1;
    const pct = (d: string | null) =>
      d ? Math.max(0, Math.min(100, ((new Date(d).getTime() - span.min.getTime()) / totalMs) * 100)) : null;
    const startPct = pct(s.actual_start);
    const lastPct = pct(s.last_touch);
    const forecastPct = pct(s.forecast_finish);
    const todayPct = pct(schedule!.T0);
    return (
      <div className="relative h-3 bg-slate-900 rounded overflow-hidden">
        {startPct != null && lastPct != null && (
          <div
            className="absolute top-0 h-full bg-emerald-500/40 border-l border-r border-emerald-500/60"
            style={{ left: `${startPct}%`, width: `${Math.max(0.5, lastPct - startPct)}%` }}
            title={`worked ${s.actual_start} → ${s.last_touch}`}
          />
        )}
        {todayPct != null && lastPct != null && forecastPct != null && forecastPct > lastPct && (
          <div
            className="absolute top-0 h-full bg-sky-500/30 border-r border-sky-500/60"
            style={{ left: `${Math.max(lastPct, todayPct)}%`, width: `${Math.max(0.5, forecastPct - Math.max(lastPct, todayPct))}%` }}
            title={`remaining ${s.remaining_days}d → ${s.forecast_finish}`}
          />
        )}
        {todayPct != null && (
          <div className="absolute top-0 h-full w-px bg-rose-400" style={{ left: `${todayPct}%` }} title={`today ${schedule!.T0}`} />
        )}
      </div>
    );
  };

  const renderScheduleView = () => {
    if (!schedule) {
      return <div className="p-8 text-slate-400 text-sm">No schedule.json found. Run scripts/wbs/build-schedule.mjs.</div>;
    }
    const dates = [
      schedule.totals.actual_start, schedule.totals.last_touch, schedule.totals.forecast_finish, schedule.T0,
      ...schedule.streams.flatMap((s) => [s.actual_start, s.last_touch, s.forecast_finish]),
    ].filter(Boolean) as string[];
    const span = {
      min: new Date(dates.reduce((a, b) => (a < b ? a : b))),
      max: new Date(dates.reduce((a, b) => (a > b ? a : b))),
    };
    const t = schedule.totals;
    return (
      <div className="space-y-6">
        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          {[
            ['T0 (today)', schedule.T0],
            ['Actual start', t.actual_start || '—'],
            ['Last touch', t.last_touch || '—'],
            ['Forecast finish', t.forecast_finish || '—'],
            ['Remaining', `${t.total_remaining_days}d`],
            ['Capabilities', `${t.implemented}✓ / ${t.partial}~ / ${t.planned}○`],
          ].map(([k, v]) => (
            <div key={k} className="border border-slate-800 rounded p-2 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
              <div className="text-slate-100 text-sm mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        {/* Milestones */}
        <div>
          <h2 className="text-sm text-slate-200 mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Milestones</h2>
          <div className="border border-slate-800 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/60 text-slate-500 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 py-2 w-12">ID</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2 w-32">Target (PM)</th>
                  <th className="text-left px-3 py-2 w-32">Forecast</th>
                  <th className="text-left px-3 py-2 w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.milestones.map((m) => (
                  <tr key={m.id} className="border-t border-slate-900">
                    <td className="px-3 py-2 font-semibold text-slate-300">{m.id}</td>
                    <td className="px-3 py-2 text-slate-200">{m.name}</td>
                    <td className="px-3 py-2 text-slate-400">{m.target_date || <span className="text-slate-600">— set in schedule-config.json</span>}</td>
                    <td className="px-3 py-2 text-slate-300">{m.forecast_date || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${m.met ? VERDICT_COLOR.implemented : VERDICT_COLOR.planned}`}>
                        {m.met ? 'met' : 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Streams Gantt */}
        <div>
          <h2 className="text-sm text-slate-200 mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Streams</h2>
          <div className="border border-slate-800 rounded divide-y divide-slate-900">
            {schedule.streams.map((s) => {
              const isOpen = open.has(`SCH-${s.stream_key}`);
              return (
                <div key={s.stream_key}>
                  <div
                    className="grid grid-cols-12 gap-3 items-center px-3 py-2 text-xs cursor-pointer hover:bg-slate-900/40"
                    onClick={() => toggle(`SCH-${s.stream_key}`)}
                  >
                    <div className="col-span-3 flex items-center gap-2 text-slate-200 truncate">
                      {isOpen ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronRight className="h-3 w-3 text-slate-500" />}
                      <span className="truncate">{s.title}</span>
                    </div>
                    <div className="col-span-5">{renderScheduleStrip(s, span)}</div>
                    <div className="col-span-1 text-slate-500 text-[10px] text-right">{s.touches}t · {s.loc.toLocaleString()}loc</div>
                    <div className="col-span-1 text-slate-300 text-[10px] text-right">{s.remaining_days}d left</div>
                    <div className="col-span-2 text-slate-400 text-[10px] text-right">→ {s.forecast_finish || '—'}</div>
                  </div>
                  {isOpen && (
                    <div className="bg-slate-950/60 px-3 py-2 border-t border-slate-900">
                      <table className="w-full text-[11px]">
                        <thead className="text-slate-500 text-[10px] uppercase">
                          <tr>
                            <th className="text-left py-1">Capability</th>
                            <th className="text-left py-1 w-20">Kind</th>
                            <th className="text-left py-1 w-24">Verdict</th>
                            <th className="text-right py-1 w-24">Started</th>
                            <th className="text-right py-1 w-24">Last touch</th>
                            <th className="text-right py-1 w-16">Touches</th>
                            <th className="text-right py-1 w-20">Remaining</th>
                            <th className="text-right py-1 w-24">Forecast</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.capabilities.map((c) => (
                            <tr key={c.id} className="border-t border-slate-900/70">
                              <td className="py-1 text-slate-200 pr-2">
                                <span className="truncate inline-block max-w-[420px] align-middle">{c.title}</span>
                                {c.suspicious_recency && (
                                  <span className="ml-2 text-[9px] px-1 py-0.5 rounded border border-amber-500/40 text-amber-300" title="All files created today; verdict may overstate maturity">
                                    suspicious
                                  </span>
                                )}
                              </td>
                              <td className="py-1 text-slate-400">{c.kind}</td>
                              <td className="py-1"><span className={`text-[9px] px-1.5 py-0.5 rounded border ${VERDICT_COLOR[c.verdict] || VERDICT_COLOR.unknown}`}>{c.verdict}</span></td>
                              <td className="py-1 text-right text-slate-400">{c.actual_start || '—'}</td>
                              <td className="py-1 text-right text-slate-400">{c.last_touch || '—'}</td>
                              <td className="py-1 text-right text-slate-500">{c.touches}</td>
                              <td className="py-1 text-right text-slate-300">{c.remaining_days}d</td>
                              <td className="py-1 text-right text-slate-400">{c.forecast_finish || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-2">
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-emerald-500/60" /> work logged in git</span>
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-sky-500/40" /> remaining estimate</span>
            <span className="flex items-center gap-1"><span className="h-2 w-px bg-rose-400" />&nbsp;today (T0)</span>
          </div>
        </div>
      </div>
    );
  };

  // ---- Backlog view ----
  const CONFIDENCE_COLOR: Record<string, string> = {
    high: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    medium: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    low: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };
  const SOURCE_COLOR: Record<string, string> = {
    capability_missing: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    capability_partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    risk: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    marketing_promise: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    verification_gap: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };

  // networkById is declared above the early-return to keep hook order stable.

  const renderBacklogDeps = (id: string) => {
    const n = networkById.get(id);
    if (!n) return null;
    const NodeChip = ({ pid }: { pid: string }) => {
      const p = networkById.get(pid);
      return (
        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mr-1 mb-1 ${p?.critical ? 'border-rose-500/50 text-rose-300' : 'border-slate-700 text-slate-300'}`}>
          {p ? p.title.slice(0, 50) : pid}
          {p && <span className="ml-1 text-slate-500">{p.duration}d</span>}
        </span>
      );
    };
    return (
      <>
        <Section title={`CPM (${n.critical ? 'critical' : `slack ${n.slack}d`})`}>
          <span className="text-slate-300">ES {n.ES}d · EF {n.EF}d · LS {n.LS}d · LF {n.LF}d · layer {n.layer}</span>
        </Section>
        <Section title={`Predecessors (${n.predecessors.length})`}>
          {n.predecessors.length === 0
            ? <span className="text-slate-500">none — declare in .lovable/wbs/backlog-dependencies.json</span>
            : n.predecessors.map((p) => <NodeChip key={p} pid={p} />)}
        </Section>
        <Section title={`Successors (${n.successors.length})`}>
          {n.successors.length === 0
            ? <span className="text-slate-500">none</span>
            : n.successors.map((s) => <NodeChip key={s} pid={s} />)}
        </Section>
      </>
    );
  };

  const renderNetworkView = () => {
    if (!network) {
      return <div className="p-8 text-slate-400 text-sm">No backlog-network.json. Run scripts/wbs/build-cpm.mjs.</div>;
    }
    const streamKeys = ['all', ...new Set(network.nodes.map((n) => n.stream))].sort();
    let visible = network.nodes.filter((n) =>
      (networkStream === 'all' || n.stream === networkStream) &&
      (!networkCriticalOnly || n.critical)
    );
    if (networkOnlyConnected) {
      visible = visible.filter((n) => n.predecessors.length + n.successors.length > 0);
    }
    const visibleIds = new Set(visible.map((n) => n.id));
    // Layout: layer-based columns; nodes stacked within column
    const byLayer = new Map<number, NetworkNode[]>();
    for (const n of visible) {
      if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
      byLayer.get(n.layer)!.push(n);
    }
    const layers = [...byLayer.keys()].sort((a, b) => a - b);
    const COL = 220, ROW = 38, PAD_X = 20, PAD_Y = 30;
    const W = PAD_X * 2 + Math.max(1, layers.length) * COL;
    const H = PAD_Y * 2 + Math.max(1, ...[...byLayer.values()].map((a) => a.length)) * ROW;
    const pos = new Map<string, { x: number; y: number }>();
    layers.forEach((l, ci) => {
      const col = byLayer.get(l)!.slice().sort((a, b) => a.title.localeCompare(b.title));
      col.forEach((n, ri) => {
        pos.set(n.id, { x: PAD_X + ci * COL + 8, y: PAD_Y + ri * ROW });
      });
    });
    const edges: Array<{ from: string; to: string; critical: boolean }> = [];
    for (const n of visible) {
      for (const s of n.successors) {
        if (visibleIds.has(s)) {
          edges.push({ from: n.id, to: s, critical: n.critical && (networkById.get(s)?.critical ?? false) });
        }
      }
    }

    const hover = networkHover ? networkById.get(networkHover) : null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          {[
            ['Nodes', network.stats.node_count],
            ['Edges', network.stats.edge_count],
            ['Declared', network.stats.declared_edges],
            ['Inferred', network.stats.inferred_edges],
            ['Project duration', `${network.stats.project_duration_days}d`],
            ['Critical nodes', network.stats.critical_node_count],
          ].map(([k, v]) => (
            <div key={k as string} className="border border-slate-800 rounded p-2 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
              <div className="text-slate-100 text-sm mt-0.5">{v as ReactNode}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={networkStream}
            onChange={(e) => setNetworkStream(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            {streamKeys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <label className="flex items-center gap-1 text-slate-300">
            <input type="checkbox" checked={networkOnlyConnected} onChange={(e) => setNetworkOnlyConnected(e.target.checked)} />
            only connected
          </label>
          <label className="flex items-center gap-1 text-slate-300">
            <input type="checkbox" checked={networkCriticalOnly} onChange={(e) => setNetworkCriticalOnly(e.target.checked)} />
            critical path only
          </label>
          <span className="text-slate-500 ml-2">{visible.length} nodes / {edges.length} edges shown</span>
          {network.stats.cycle_edges_dropped > 0 && (
            <span className="text-amber-300">⚠ {network.stats.cycle_edges_dropped} cycle edges dropped</span>
          )}
          {network.issues.length > 0 && (
            <span className="text-amber-300">⚠ {network.issues.length} issue(s) — see backlog-network.json</span>
          )}
        </div>

        <div className="border border-slate-800 rounded bg-slate-950 overflow-auto" style={{ maxHeight: 600 }}>
          {visible.length === 0 ? (
            <div className="p-6 text-slate-500 text-xs">
              Nothing to show. Declare predecessors in <span className="text-sky-300">.lovable/wbs/backlog-dependencies.json</span> then rerun <span className="text-sky-300">node scripts/wbs/build-cpm.mjs</span>.
            </div>
          ) : (
            <svg width={W} height={H} className="block">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="hsl(215 20% 65%)" />
                </marker>
                <marker id="arrow-crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="hsl(0 80% 65%)" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const a = pos.get(e.from)!, b = pos.get(e.to)!;
                return (
                  <line
                    key={i}
                    x1={a.x + 196} y1={a.y + 12}
                    x2={b.x} y2={b.y + 12}
                    stroke={e.critical ? 'hsl(0 80% 65%)' : 'hsl(215 20% 35%)'}
                    strokeWidth={e.critical ? 1.5 : 1}
                    markerEnd={`url(#${e.critical ? 'arrow-crit' : 'arrow'})`}
                    opacity={networkHover && e.from !== networkHover && e.to !== networkHover ? 0.15 : 0.9}
                  />
                );
              })}
              {visible.map((n) => {
                const p = pos.get(n.id)!;
                const isHover = networkHover === n.id;
                const fill = n.critical ? 'hsl(0 70% 18%)' : 'hsl(215 28% 14%)';
                const stroke = n.critical ? 'hsl(0 80% 60%)' : isHover ? 'hsl(199 89% 60%)' : 'hsl(215 20% 30%)';
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    onMouseEnter={() => setNetworkHover(n.id)}
                    onMouseLeave={() => setNetworkHover(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect width={196} height={24} rx={3} fill={fill} stroke={stroke} strokeWidth={isHover ? 2 : 1} />
                    <text x={6} y={15} fill="hsl(210 40% 90%)" fontSize={10} fontFamily="ui-monospace, monospace">
                      {n.title.length > 28 ? n.title.slice(0, 27) + '…' : n.title}
                    </text>
                    <text x={190} y={15} fill="hsl(215 20% 60%)" fontSize={9} fontFamily="ui-monospace, monospace" textAnchor="end">
                      {n.duration}d
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {hover && (
          <div className="border border-slate-800 rounded p-3 bg-slate-900/40 text-xs space-y-1">
            <div className="text-slate-100">{hover.title}</div>
            <div className="text-slate-500">{hover.stream} · {hover.owner_role} · {hover.source_type}</div>
            <div className="text-slate-300">
              {hover.duration}d · ES {hover.ES} · EF {hover.EF} · LS {hover.LS} · LF {hover.LF} · slack {hover.slack}d
              {hover.critical && <span className="ml-2 text-rose-300">CRITICAL</span>}
            </div>
            <div className="text-slate-400">
              ⬅ {hover.predecessors.length} preds · {hover.successors.length} succs ➡
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-500 leading-relaxed">
          Edit <span className="text-sky-300 font-mono">.lovable/wbs/backlog-dependencies.json</span> to declare predecessors. Schema:
          <pre className="text-slate-400 bg-slate-900/40 rounded p-2 mt-1 overflow-auto">{`{ "edges": { "BB-<successor-id>": ["BB-<predecessor-id>", ...] } }`}</pre>
          Then run <span className="text-sky-300 font-mono">node scripts/wbs/build-cpm.mjs &amp;&amp; node scripts/wbs/publish-public.mjs</span>.
          Critical-path nodes have zero slack and are highlighted in red.
        </div>
      </div>
    );
  };

  const renderBacklogView = () => {
    if (!backlog) {
      return <div className="p-8 text-slate-400 text-sm">No build-backlog.json. Run scripts/wbs/build-build-backlog.mjs.</div>;
    }
    const filtered = backlog.entries.filter((e) =>
      (backlogStream === 'all' || e.stream === backlogStream) &&
      (backlogSource === 'all' || e.source_type === backlogSource) &&
      (backlogConfidence === 'all' || e.confidence === backlogConfidence)
    );
    const streamKeys = Object.keys(backlog.totals.by_stream).sort();
    const sourceKeys = Object.keys(backlog.totals.by_source_type).sort();
    const confidenceKeys = ['high', 'medium', 'low'];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          {[
            ['Backlog entries', backlog.totals.entries],
            ['Estimate', `${backlog.totals.total_estimate_days}d`],
            ['Capabilities source', backlog.source_counts.capabilities_total],
            ['Marketing claims', backlog.source_counts.promises_total],
            ['Verification gaps', backlog.totals.by_source_type.verification_gap || 0],
            ['Low-confidence rows', backlog.totals.by_confidence.low || 0],
          ].map(([k, v]) => (
            <div key={k as string} className="border border-slate-800 rounded p-2 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
              <div className="text-slate-100 text-sm mt-0.5">{v as ReactNode}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={backlogStream}
            onChange={(e) => setBacklogStream(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="all">All streams ({backlog.entries.length})</option>
            {streamKeys.map((k) => (
              <option key={k} value={k}>{k} ({backlog.totals.by_stream[k]})</option>
            ))}
          </select>
          <select
            value={backlogSource}
            onChange={(e) => setBacklogSource(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="all">All sources</option>
            {sourceKeys.map((k) => (
              <option key={k} value={k}>{k} ({backlog.totals.by_source_type[k]})</option>
            ))}
          </select>
          <select
            value={backlogConfidence}
            onChange={(e) => setBacklogConfidence(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
          >
            <option value="all">All confidence</option>
            {confidenceKeys.map((k) => (
              <option key={k} value={k}>{k} ({backlog.totals.by_confidence[k] || 0})</option>
            ))}
          </select>
          <span className="text-slate-500 ml-2">{filtered.length} shown</span>
        </div>

        <div className="border border-slate-800 rounded divide-y divide-slate-900">
          {filtered.map((e) => {
            const isOpen = open.has(e.id);
            return (
              <div key={e.id}>
                <div
                  className="grid grid-cols-12 gap-3 items-start px-3 py-2 text-xs cursor-pointer hover:bg-slate-900/40"
                  onClick={() => toggle(e.id)}
                >
                  <div className="col-span-1 flex items-center gap-1 text-slate-500">
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="text-[10px]">{e.stream.slice(0, 2)}</span>
                  </div>
                  <div className="col-span-5 text-slate-100">
                    <div className="truncate">{e.title}</div>
                    <div className="text-[10px] text-slate-500 truncate">{e.stream_title}</div>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${SOURCE_COLOR[e.source_type] || 'border-slate-700 text-slate-400'}`}>
                      {e.source_type}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">
                      {e.scope_label}
                    </span>
                  </div>
                  <div className="col-span-2 text-slate-400 text-[10px]">{e.owner_role}</div>
                  <div className="col-span-1 text-slate-300 text-[10px] text-right">{e.estimate_days}d</div>
                  <div className="col-span-1 text-right">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${CONFIDENCE_COLOR[e.confidence]}`}>
                      {e.confidence}
                    </span>
                  </div>
                </div>
                {isOpen && (
                  <div className="bg-slate-950/60 px-6 py-3 border-t border-slate-900 grid md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                    <div className="space-y-2">
                      <Section title="Problem">{e.problem_statement}</Section>
                      <Section title="Desired behavior">{e.desired_behavior}</Section>
                      <Section title="Acceptance criteria">
                        <ul className="list-disc pl-4 space-y-0.5">
                          {e.acceptance_criteria.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </Section>
                      <Section title="Verification plan">{e.verification_plan}</Section>
                      <Section title="Definition of done">{e.definition_of_done}</Section>
                    </div>
                    <div className="space-y-2">
                      <Section title="Build scope">
                        <div className="space-y-1">
                          {Object.entries(e.build_scope).map(([k, v]) =>
                            v.length ? (
                              <div key={k}>
                                <span className="text-slate-500 uppercase text-[9px] mr-2">{k}</span>
                                <ul className="list-disc pl-4">
                                  {v.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            ) : null
                          )}
                        </div>
                      </Section>
                      {!!e.likely_files.length && (
                        <Section title="Likely files">
                          <ul className="font-mono text-slate-400">
                            {e.likely_files.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </Section>
                      )}
                      {!!e.likely_tables.length && (
                        <Section title="Likely tables">{e.likely_tables.join(', ')}</Section>
                      )}
                      <Section title="Roles affected">{e.user_roles_affected.join(', ')}</Section>
                      {!!e.blockers.length && (
                        <Section title="Blockers">
                          <ul className="list-disc pl-4 text-amber-300">
                            {e.blockers.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        </Section>
                      )}
                      <Section title="Source">
                        <span className="font-mono text-slate-500">{e.source_id}</span>
                        {e.source_severity && <span className="ml-2 text-rose-300">severity: {e.source_severity}</span>}
                      </Section>
                      {network && renderBacklogDeps(e.id)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono">
      <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <h1 className="text-lg text-slate-100 font-semibold">Work Breakdown</h1>
            <div className="flex items-center gap-1 text-xs">
              {(['backlog', 'network', 'files', 'schedule'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded border flex items-center gap-1 ${view === v ? 'border-sky-500 text-sky-300 bg-sky-500/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  {v === 'backlog' && <Hammer className="h-3 w-3" />}
                  {v === 'network' && <GitBranch className="h-3 w-3" />}
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {view === 'backlog'
              ? backlog
                ? `${backlog.totals.entries} build entries · ${backlog.totals.total_estimate_days}d remaining`
                : 'no backlog'
              : view === 'network'
                ? network
                  ? `${network.stats.node_count} nodes · ${network.stats.edge_count} edges · ${network.stats.project_duration_days}d critical path`
                  : 'no network'
                : view === 'files'
                  ? `${(wbs.totals as { leaves: number }).leaves} leaves · ${(wbs.totals as { capabilities: number }).capabilities} capabilities · ${(wbs.totals as { streams: number }).streams} streams`
                  : schedule
                    ? `T0 ${schedule.T0} · ${schedule.totals.total_remaining_days}d remaining · forecast ${schedule.totals.forecast_finish}`
                    : 'no schedule'}
          </div>
        </div>
        {view === 'files' && (
          <div className="flex items-center gap-2 text-xs">
            {(['all', 'gaps', 'placeholders', 'deliverables'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded border ${filter === f ? 'border-sky-500 text-sky-300 bg-sky-500/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
              >
                {f}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-emerald-500" /> shipped</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-amber-500" /> in-flight</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-rose-500" /> dormant</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-slate-600" /> planned</span>
            </div>
          </div>
        )}
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {view === 'backlog' ? renderBacklogView()
          : view === 'network' ? renderNetworkView()
          : view === 'files' ? streams.map(renderStream)
          : renderScheduleView()}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500 mb-1">{title}</div>
      <div className="text-slate-200">{children}</div>
    </div>
  );
}
