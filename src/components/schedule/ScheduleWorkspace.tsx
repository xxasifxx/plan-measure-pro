import { useMemo, useState } from 'react';
import { useSchedule } from '@/lib/schedule/use-schedule';
import type { ActivityType, RelType, ScheduleActivity } from '@/lib/schedule/types';
import { WbsTree } from './WbsTree';
import { GanttChart } from './GanttChart';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ComplianceStrip } from './ComplianceStrip';
import { ActivityInspector } from './ActivityInspector';
import { ImportP6Panel } from './ImportP6Panel';
import { CalendarManager } from './CalendarManager';
import { ResourceManager } from './ResourceManager';
import { BaselineManager } from './BaselineManager';
import { DcmaPanel } from './DcmaPanel';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
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
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [blOpen, setBlOpen] = useState(false);
  const [dcmaOpen, setDcmaOpen] = useState(false);
  const pxPerDay = ZOOM_STEPS[zoomIdx];

  const allLeaves = useMemo(
    () => sch.activities.filter(a => a.activity_type !== 'wbs'),
    [sch.activities],
  );
  const visibleLeaves = useMemo(() => {
    if (!selectedWbsId) return allLeaves;
    const wantParents = new Set<string>([selectedWbsId]);
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

  const handleAddWbs = () => {
    const code = window.prompt('WBS code (e.g. 1.1 Earthwork)', '1.0');
    if (!code) return;
    sch.upsertActivity.mutate({
      wbs_code: code,
      name: code,
      activity_type: 'wbs',
      parent_wbs_id: selectedWbsId,
      duration_days: 0,
    });
  };

  const handleAddActivity = (type: ActivityType) => {
    sch.upsertActivity.mutate({
      wbs_code: 'A',
      activity_id: `A${(allLeaves.length + 1).toString().padStart(4, '0')}`,
      name: type === 'start_milestone' ? 'Start Milestone' : type === 'finish_milestone' ? 'Finish Milestone' : 'New Activity',
      activity_type: type,
      parent_wbs_id: selectedWbsId,
      duration_days: type === 'start_milestone' || type === 'finish_milestone' ? 0 : 5,
      percent_complete: 0,
      baseline_start: new Date().toISOString().slice(0, 10),
    });
  };

  const handleLink = () => {
    if (selected.length < 2) return;
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
    if (!selectedWbsId) { toast({ title: 'Select a WBS in the tree first to indent under it' }); return; }
    selected.forEach(id => sch.upsertActivity.mutate({ id, parent_wbs_id: selectedWbsId }));
  };
  const handleOutdent = () => selected.forEach(id => sch.upsertActivity.mutate({ id, parent_wbs_id: null }));

  const handleExport = async () => {
    try {
      const xml = await buildPmxmlFromProject(projectId, sch.activities, sch.relationships, sch.meta);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `project_${projectId.slice(0, 8)}_p6.xml`; a.click();
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
  const inspectedActivity = inspectorId ? sch.activities.find(a => a.id === inspectorId) || null : null;

  return (
    <div className="border border-border rounded bg-card overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      <ScheduleToolbar
        onAddActivity={handleAddActivity}
        onAddWbs={handleAddWbs}
        onLinkSelected={handleLink}
        onUnlinkSelected={handleUnlink}
        onDeleteSelected={handleDelete}
        onIndent={handleIndent}
        onOutdent={handleOutdent}
        onZoomIn={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
        onZoomOut={() => setZoomIdx(i => Math.max(0, i - 1))}
        onRecalc={() => sch.persistCpm.mutate()}
        onExportPmxml={handleExport}
        onImportP6={() => setImportOpen(true)}
        onOpenCalendars={() => setCalOpen(true)}
        onOpenResources={() => setResOpen(true)}
        onOpenBaselines={() => setBlOpen(true)}
        onOpenDcma={() => setDcmaOpen(true)}
        selectedCount={selected.length}
        canLink={selected.length >= 2}
        meta={sch.meta}
        onMetaChange={(patch) => sch.setMeta.mutate(patch)}
      />
      <div className="flex-1 flex min-h-0">
        <div className="w-56 shrink-0">
          <WbsTree
            activities={sch.activities}
            selectedWbsId={selectedWbsId}
            onSelect={setSelectedWbsId}
            onAddChild={(parent) => {
              setSelectedWbsId(parent);
              handleAddWbs();
            }}
          />
        </div>

        <div className="w-[560px] shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="grid grid-cols-12 gap-1 px-2 py-1 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/30">
            <div className="col-span-2">Act ID</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-1">Dur</div>
            <div className="col-span-1">%</div>
            <div className="col-span-1">Float</div>
            <div className="col-span-1">⋯</div>
          </div>
          <div className="flex-1 overflow-auto">
            {visibleLeaves.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No activities under this WBS. Use the "Add activity" menu or "Import P6".</div>
            ) : visibleLeaves.map(a => {
              const c = sch.cpm?.byId.get(a.id);
              const isSel = selected.includes(a.id);
              const isMs = a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone';
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
                  onDoubleClick={() => setInspectorId(a.id)}
                  title="Double-click to open inspector"
                >
                  <Input className="col-span-2 h-6 text-[11px] font-mono px-1" value={a.activity_id || ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, activity_id: e.target.value })} />
                  <Input className="col-span-4 h-6 text-[11px] px-1" value={a.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, name: e.target.value })} />
                  <Input type="date" className="col-span-2 h-6 text-[10px] px-1"
                    value={(a.baseline_start || '').slice(0, 10)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, baseline_start: e.target.value })} />
                  <Input type="number" className="col-span-1 h-6 text-[11px] px-1"
                    value={Number(a.duration_days || 0)} disabled={isMs}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, duration_days: Number(e.target.value) })} />
                  <Input type="number" className="col-span-1 h-6 text-[11px] px-1"
                    value={Number(a.percent_complete || 0)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => sch.upsertActivity.mutate({ id: a.id, percent_complete: Number(e.target.value) })} />
                  <div className={cn(
                    'col-span-1 text-right pr-1',
                    c?.is_critical ? 'text-destructive font-bold' : 'text-muted-foreground',
                  )}>
                    {c == null ? '—' : Number.isNaN(c.total_float_days) ? '⟳' : `${c.total_float_days}d`}
                  </div>
                  <button
                    className="col-span-1 text-center text-[10px] text-primary hover:underline"
                    onClick={(e) => { e.stopPropagation(); setInspectorId(a.id); }}
                  >open</button>
                </div>
              );
            })}
          </div>
        </div>

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

      <ActivityInspector
        activity={inspectedActivity}
        open={!!inspectorId}
        onClose={() => setInspectorId(null)}
        sch={sch}
        projectId={projectId}
      />
      <ImportP6Panel
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (imp) => { await sch.importSchedule.mutateAsync(imp); }}
      />
      <CalendarManager open={calOpen} onOpenChange={setCalOpen} sch={sch} />
      <ResourceManager open={resOpen} onOpenChange={setResOpen} sch={sch} />
      <BaselineManager open={blOpen} onOpenChange={setBlOpen} sch={sch} />
      <DcmaPanel
        open={dcmaOpen}
        onOpenChange={setDcmaOpen}
        activities={sch.activities}
        relationships={sch.relationships}
        meta={sch.meta}
      />
    </div>
  );
}
