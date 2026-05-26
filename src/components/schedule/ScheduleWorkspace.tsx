import { useMemo, useState } from 'react';
import { useSchedule } from '@/lib/schedule/use-schedule';
import type { RelType, ScheduleActivity } from '@/lib/schedule/types';
import { WbsTree } from './WbsTree';
import { GanttChart } from './GanttChart';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ComplianceStrip } from './ComplianceStrip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { buildPmxmlFromProject } from '@/lib/p6xml/build-from-project';

const ZOOM_STEPS = [3, 6, 10, 16, 24];

interface Props { projectId: string }

export function ScheduleWorkspace({ projectId }: Props) {
  const sch = useSchedule(projectId);
  const { toast } = useToast();
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [zoomIdx, setZoomIdx] = useState(2);
  const pxPerDay = ZOOM_STEPS[zoomIdx];

  const allLeaves = useMemo(
    () => sch.activities.filter(a => a.activity_type !== 'wbs'),
    [sch.activities],
  );
  const visibleLeaves = useMemo(() => {
    if (!selectedWbsId) return allLeaves;
    const wantParents = new Set<string>([selectedWbsId]);
    // include descendants
    let added = true;
    while (added) {
      added = false;
      for (const a of sch.activities) {
        if (a.activity_type === 'wbs' && a.parent_wbs_id && wantParents.has(a.parent_wbs_id) && !wantParents.has(a.id)) {
          wantParents.add(a.id); added = true;
        }
      }
    }
    return allLeaves.filter(a => a.parent_wbs_id && wantParents.has(a.parent_wbs_id));
  }, [allLeaves, sch.activities, selectedWbsId]);

  const handleAddWbs = (parent: string | null) => {
    const code = window.prompt('WBS code (e.g. 1.1 Earthwork)', '1.0');
    if (!code) return;
    sch.upsertActivity.mutate({
      wbs_code: code,
      name: code,
      activity_type: 'wbs',
      parent_wbs_id: parent,
      duration_days: 0,
    });
  };

  const handleAddActivity = () => {
    sch.upsertActivity.mutate({
      wbs_code: 'A',
      activity_id: `A${(allLeaves.length + 1).toString().padStart(4, '0')}`,
      name: 'New Activity',
      activity_type: 'task',
      parent_wbs_id: selectedWbsId,
      duration_days: 5,
      percent_complete: 0,
      baseline_start: new Date().toISOString().slice(0, 10),
    });
  };

  const handleLink = () => {
    if (selected.length < 2) return;
    // chain selected in order
    for (let i = 0; i < selected.length - 1; i++) {
      sch.addRelationship.mutate({
        project_id: projectId,
        pred_activity_id: selected[i],
        succ_activity_id: selected[i + 1],
        rel_type: 'FS',
        lag_days: 0,
      });
    }
  };

  const handleUnlink = () => {
    const set = new Set(selected);
    for (const r of sch.relationships) {
      if (set.has(r.pred_activity_id) || set.has(r.succ_activity_id)) sch.removeRelationship.mutate(r.id);
    }
  };

  const handleDelete = () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} activity(ies)?`)) return;
    selected.forEach(id => sch.deleteActivity.mutate(id));
    setSelected([]);
  };

  const handleIndent = () => {
    // make parent = wbs node immediately preceding selected in order? simpler: prompt
    const target = selectedWbsId;
    if (!target) { toast({ title: 'Select a WBS in the tree first to indent under it' }); return; }
    selected.forEach(id => sch.upsertActivity.mutate({ id, parent_wbs_id: target }));
  };

  const handleOutdent = () => {
    selected.forEach(id => sch.upsertActivity.mutate({ id, parent_wbs_id: null }));
  };

  const handleExport = async () => {
    try {
      const xml = await buildPmxmlFromProject(projectId, sch.activities, sch.relationships, sch.meta);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${projectId.slice(0, 8)}_p6.xml`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'P6 PMXML downloaded' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message, variant: 'destructive' });
    }
  };

  if (sch.loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rowHeight = 28;

  return (
    <div className="border border-border rounded bg-card overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      <ScheduleToolbar
        onAddActivity={handleAddActivity}
        onLinkSelected={handleLink}
        onUnlinkSelected={handleUnlink}
        onDeleteSelected={handleDelete}
        onIndent={handleIndent}
        onOutdent={handleOutdent}
        onZoomIn={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
        onZoomOut={() => setZoomIdx(i => Math.max(0, i - 1))}
        onRecalc={() => sch.persistCpm.mutate()}
        onExportPmxml={handleExport}
        selectedCount={selected.length}
        canLink={selected.length >= 2}
      />
      <div className="flex-1 flex min-h-0">
        {/* WBS tree */}
        <div className="w-56 shrink-0">
          <WbsTree
            activities={sch.activities}
            selectedWbsId={selectedWbsId}
            onSelect={setSelectedWbsId}
            onAddChild={handleAddWbs}
          />
        </div>

        {/* Grid */}
        <div className="w-[560px] shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="grid grid-cols-12 gap-1 px-2 py-1 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/30">
            <div className="col-span-2">Act ID</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-1">Dur</div>
            <div className="col-span-1">%</div>
            <div className="col-span-1">Float</div>
            <div className="col-span-1">Pred</div>
          </div>
          <div className="flex-1 overflow-auto" id="schedule-grid-scroll">
            {visibleLeaves.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No activities under this WBS. Click "+ Activity".</div>
            ) : visibleLeaves.map(a => {
              const c = sch.cpm?.byId.get(a.id);
              const isSel = selected.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    'grid grid-cols-12 gap-1 px-2 items-center text-[11px] font-mono border-b border-border/40 cursor-pointer',
                    isSel && 'bg-primary/10',
                    c?.is_critical && 'border-l-2 border-l-destructive',
                  )}
                  style={{ height: rowHeight }}
                  onClick={(e) => {
                    if (e.shiftKey || e.metaKey || e.ctrlKey) {
                      setSelected(s => s.includes(a.id) ? s.filter(x => x !== a.id) : [...s, a.id]);
                    } else {
                      setSelected([a.id]);
                    }
                  }}
                >
                  <Input
                    className="col-span-2 h-6 text-[11px] font-mono px-1"
                    value={a.activity_id || ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, activity_id: e.target.value })}
                  />
                  <Input
                    className="col-span-4 h-6 text-[11px] px-1"
                    value={a.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, name: e.target.value })}
                  />
                  <Input
                    type="date"
                    className="col-span-2 h-6 text-[10px] px-1"
                    value={(c?.early_start || a.baseline_start || '').slice(0, 10)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, baseline_start: e.target.value })}
                  />
                  <Input
                    type="number"
                    className="col-span-1 h-6 text-[11px] px-1"
                    value={Number(a.duration_days || 0)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, duration_days: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    className="col-span-1 h-6 text-[11px] px-1"
                    value={Number(a.percent_complete || 0)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, percent_complete: Number(e.target.value) })}
                  />
                  <div className={cn(
                    'col-span-1 text-right pr-1',
                    c?.is_critical ? 'text-destructive font-bold' : 'text-muted-foreground',
                  )}>
                    {c ? `${c.total_float_days}d` : '—'}
                  </div>
                  <div className="col-span-1 text-center">
                    <PredecessorPopover activity={a} sch={sch} allActivities={allLeaves} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gantt */}
        <GanttChart
          activities={visibleLeaves}
          relationships={sch.relationships}
          cpm={sch.cpm}
          pxPerDay={pxPerDay}
          rowHeight={rowHeight}
          onMove={(id, newStart) => sch.upsertActivity.mutate({ id, baseline_start: newStart })}
          onResize={(id, newDur) => sch.upsertActivity.mutate({ id, duration_days: newDur })}
          onSelect={(id) => setSelected(id ? [id] : [])}
          selectedId={selected.length === 1 ? selected[0] : null}
        />
      </div>
      <ComplianceStrip
        activities={sch.activities}
        relationships={sch.relationships}
        cycles={sch.cpm?.cycles || []}
      />
    </div>
  );
}

function PredecessorPopover({
  activity, sch, allActivities,
}: { activity: ScheduleActivity; sch: ReturnType<typeof useSchedule>; allActivities: ScheduleActivity[] }) {
  const preds = sch.relationships.filter(r => r.succ_activity_id === activity.id);
  const [open, setOpen] = useState(false);
  const [newPred, setNewPred] = useState('');
  const [type, setType] = useState<RelType>('FS');
  const [lag, setLag] = useState(0);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-primary"
          onClick={e => e.stopPropagation()}
        >
          {preds.length || '+'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" onClick={e => e.stopPropagation()}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-mono">Predecessors</div>
        <div className="space-y-1 mb-3 max-h-40 overflow-auto">
          {preds.length === 0 && <div className="text-[11px] text-muted-foreground">None</div>}
          {preds.map(r => {
            const p = allActivities.find(a => a.id === r.pred_activity_id);
            return (
              <div key={r.id} className="flex items-center gap-1 text-[11px] font-mono">
                <span className="flex-1 truncate">{p?.activity_id || p?.name || '?'}</span>
                <span className="text-muted-foreground">{r.rel_type}{r.lag_days ? `+${r.lag_days}d` : ''}</span>
                <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => sch.removeRelationship.mutate(r.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
        <div className="space-y-2 border-t border-border pt-2">
          <Select value={newPred} onValueChange={setNewPred}>
            <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Add predecessor…" /></SelectTrigger>
            <SelectContent>
              {allActivities.filter(a => a.id !== activity.id).map(a => (
                <SelectItem key={a.id} value={a.id} className="text-[11px]">
                  {a.activity_id || a.wbs_code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-1">
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['FS', 'SS', 'FF', 'SF'] as RelType[]).map(t => (
                  <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={lag}
              onChange={e => setLag(Number(e.target.value))}
              className="h-7 text-[11px]"
              placeholder="lag"
            />
            <Button
              size="sm"
              className="h-7 text-[11px]"
              disabled={!newPred}
              onClick={() => {
                sch.addRelationship.mutate({
                  project_id: activity.project_id,
                  pred_activity_id: newPred,
                  succ_activity_id: activity.id,
                  rel_type: type,
                  lag_days: lag,
                });
                setNewPred(''); setLag(0);
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
