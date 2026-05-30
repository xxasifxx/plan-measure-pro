import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, FileWarning, Package, Folder } from 'lucide-react';

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

const VERDICT_COLOR: Record<string, string> = {
  implemented: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  missing: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  planned: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  unknown: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
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
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'gaps' | 'placeholders' | 'deliverables'>('all');

  useEffect(() => {
    Promise.all([
      fetch('/wbs/wbs.json').then((r) => r.json()),
      fetch('/wbs/activities.json').then((r) => r.json()),
    ]).then(([w, a]) => {
      setWbs(w);
      setActs(a.activities);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono">
      <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg text-slate-100 font-semibold">Work Breakdown — file-grounded</h1>
          <div className="text-xs text-slate-500">
            {(wbs.totals as { leaves: number }).leaves} leaves · {(wbs.totals as { capabilities: number }).capabilities} capabilities · {(wbs.totals as { streams: number }).streams} streams
          </div>
        </div>
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
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-4">{streams.map(renderStream)}</div>
    </div>
  );
}
