import {
  MousePointer2, Ruler, Move, ZoomIn, ZoomOut, Maximize,
  ChevronLeft, ChevronRight, Download, BarChart3, Undo2, Redo2, Copy
} from 'lucide-react';
import type { ToolMode, PayItem, Calibration } from '@/types/project';
import { UNIT_LABELS } from '@/types/project';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  toolMode: ToolMode;
  onToolChange: (mode: ToolMode) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  calibration: Calibration | null;
  activePayItem: PayItem | undefined;
  onShowSummary: () => void;
  onExport: () => void;
  onFitToScreen?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onCopyCalibration?: () => void;
  readOnly?: boolean;
}

const allTools: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'pan', icon: Move, label: 'Pan' },
  { mode: 'calibrate', icon: Ruler, label: 'Calibrate' },
];

function formatScale(calibration: Calibration | null): string {
  if (!calibration) return 'No scale';
  const ftPerPx = 1 / calibration.pixelsPerFoot;
  // Try to find a nice scale like 1" = 20'
  const ftPerInch = ftPerPx * 96; // 96 px per inch on screen (approximate)
  if (ftPerInch >= 1) {
    const rounded = Math.round(ftPerInch);
    return `1″ = ${rounded}′`;
  }
  return `1px = ${ftPerPx.toFixed(3)}ft`;
}

export function Toolbar({
  toolMode, onToolChange, currentPage, totalPages, onPageChange,
  scale, onScaleChange, calibration, activePayItem, onShowSummary, onExport, onFitToScreen,
  onUndo, onRedo, canUndo, canRedo, onCopyCalibration, readOnly,
}: Props) {
  const tools = readOnly
    ? allTools.filter(t => t.mode !== 'calibrate')
    : allTools;

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm overflow-x-auto">
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
        {tools.map(t => (
          <button
            key={t.mode}
            onClick={() => onToolChange(t.mode)}
            title={t.label}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              toolMode === t.mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background'
            )}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-7 bg-border mx-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-7 bg-border mx-1" />

      {/* Active pay item pill */}
      {activePayItem && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/70 border border-border/50">
            <div className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: activePayItem.color }} />
            <span className="text-xs font-medium text-foreground max-w-[200px] truncate">
              {activePayItem.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {UNIT_LABELS[activePayItem.unit]}
            </span>
            {!activePayItem.drawable && (
              <span className="text-[10px] text-destructive font-semibold uppercase">manual</span>
            )}
          </div>
          <div className="w-px h-7 bg-border mx-1" />
        </>
      )}

      {/* Calibration indicator */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50">
        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
        {calibration ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-success font-mono font-semibold">
              {formatScale(calibration)}
            </span>
            {onCopyCalibration && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopyCalibration} title="Copy calibration to other pages">
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No scale set</span>
        )}
      </div>

      <div className="w-px h-7 bg-border mx-1" />

      {/* Page nav */}
      <div className="flex items-center gap-1" data-tour="page-controls">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap min-w-[44px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-7 bg-border mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onScaleChange(Math.min(4, scale + 0.25))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        {onFitToScreen && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToScreen} title="Fit to screen">
            <Maximize className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <button data-tour="summary-btn" onClick={onShowSummary} className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}>
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Summary</span>
        </button>
        <button onClick={onExport} className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </div>
  );
}
