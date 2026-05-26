import { Button } from '@/components/ui/button';
import { Plus, Link2, Unlink, ZoomIn, ZoomOut, RefreshCw, Download, Trash2, IndentIncrease, IndentDecrease } from 'lucide-react';

interface Props {
  onAddActivity: () => void;
  onLinkSelected: () => void;
  onUnlinkSelected: () => void;
  onDeleteSelected: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecalc: () => void;
  onExportPmxml: () => void;
  selectedCount: number;
  canLink: boolean;
}

export function ScheduleToolbar(p: Props) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card">
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onAddActivity}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Activity
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onIndent} disabled={p.selectedCount === 0}>
        <IndentIncrease className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onOutdent} disabled={p.selectedCount === 0}>
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
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onRecalc}>
        <RefreshCw className="h-3.5 w-3.5 mr-1" /> CPM
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onZoomOut}>
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={p.onZoomIn}>
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={p.onExportPmxml}>
        <Download className="h-3.5 w-3.5 mr-1" /> P6 XML
      </Button>
    </div>
  );
}
