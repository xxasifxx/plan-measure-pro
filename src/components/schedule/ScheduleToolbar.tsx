import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Link2, Unlink, ZoomIn, ZoomOut, RefreshCw, Download, Trash2, IndentIncrease, IndentDecrease, FileCode2, Flag, FlagOff, Activity as ActivityIcon, Layers, CalendarDays, Users, Camera, ShieldCheck } from 'lucide-react';
import type { ActivityType, ScheduleMeta } from '@/lib/schedule/types';
import { MetaControls } from './MetaControls';

interface Props {
  onAddActivity: (type: ActivityType) => void;
  onAddWbs: () => void;
  onLinkSelected: () => void;
  onUnlinkSelected: () => void;
  onDeleteSelected: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecalc: () => void;
  onExportPmxml: () => void;
  onImportP6: () => void;
  onOpenCalendars: () => void;
  onOpenResources: () => void;
  onOpenBaselines: () => void;
  onOpenDcma: () => void;
  selectedCount: number;
  canLink: boolean;
  meta?: ScheduleMeta;
  onMetaChange: (patch: Partial<ScheduleMeta>) => void;
}

const TYPE_OPTIONS: { v: ActivityType; label: string; icon: React.ReactNode }[] = [
  { v: 'task', label: 'Task', icon: <ActivityIcon className="h-3.5 w-3.5" /> },
  { v: 'start_milestone', label: 'Start Milestone', icon: <Flag className="h-3.5 w-3.5" /> },
  { v: 'finish_milestone', label: 'Finish Milestone', icon: <FlagOff className="h-3.5 w-3.5" /> },
  { v: 'loe', label: 'Level of Effort', icon: <Layers className="h-3.5 w-3.5" /> },
];

export function ScheduleToolbar(p: Props) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card flex-wrap">
      <Select onValueChange={(v: any) => p.onAddActivity(v)}>
        <SelectTrigger className="h-7 text-[11px] w-[160px]">
          <SelectValue placeholder={<span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add activity…</span> as any} />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map(o => (
            <SelectItem key={o.v} value={o.v} className="text-[11px]">
              <span className="flex items-center gap-2">{o.icon}{o.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onAddWbs}>+ WBS</Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onIndent} disabled={p.selectedCount === 0} title="Move under selected WBS">
        <IndentIncrease className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onOutdent} disabled={p.selectedCount === 0} title="Move to root">
        <IndentDecrease className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onLinkSelected} disabled={!p.canLink}>
        <Link2 className="h-3.5 w-3.5 mr-1" /> Link FS
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onUnlinkSelected} disabled={p.selectedCount === 0}>
        <Unlink className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive" onClick={p.onDeleteSelected} disabled={p.selectedCount === 0}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1" />

      <MetaControls meta={p.meta} onChange={p.onMetaChange} />
      <div className="w-px h-4 bg-border mx-1" />

      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onOpenCalendars} title="Calendars">
        <CalendarDays className="h-3.5 w-3.5 mr-1" /> Calendars
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onOpenResources} title="Resource library">
        <Users className="h-3.5 w-3.5 mr-1" /> Resources
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onOpenBaselines} title="Baselines">
        <Camera className="h-3.5 w-3.5 mr-1" /> Baselines
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onOpenDcma} title="DCMA 14-Point audit">
        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> DCMA
      </Button>
      <div className="w-px h-4 bg-border mx-1" />

      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onRecalc} title="Persist CPM to DB">
        <RefreshCw className="h-3.5 w-3.5 mr-1" /> CPM
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onZoomOut}><ZoomOut className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onZoomIn}><ZoomIn className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={p.onImportP6}>
        <FileCode2 className="h-3.5 w-3.5 mr-1" /> Import P6
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={p.onExportPmxml}>
        <Download className="h-3.5 w-3.5 mr-1" /> P6 XML
      </Button>
    </div>
  );
}
