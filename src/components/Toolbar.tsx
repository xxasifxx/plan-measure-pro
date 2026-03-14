import {
  MousePointer2, Ruler, Move, ZoomIn, ZoomOut, Maximize,
  ChevronLeft, ChevronRight, Download, BarChart3, Undo2, Redo2, Copy
} from 'lucide-react';
import type { ToolMode, PayItem, Calibration } from '@/types/project';
import { UNIT_LABELS } from '@/types/project';
import { Button } from '@/components/ui/button';

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
}

const tools: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'pan', icon: Move, label: 'Pan' },
  { mode: 'calibrate', icon: Ruler, label: 'Calibrate' },
];

export function Toolbar({
  toolMode, onToolChange, currentPage, totalPages, onPageChange,
  scale, onScaleChange, calibration, activePayItem, onShowSummary, onExport, onFitToScreen,
  onUndo, onRedo, canUndo, canRedo, onCopyCalibration
}: Props) {

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-card border-b border-border overflow-x-auto">
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-1">
        {tools.map(t => (
          <button
            key={t.mode}
            onClick={() => onToolChange(t.mode)}
            title={t.label}
            className={`toolbar-btn ${toolMode === t.mode ? 'toolbar-btn-active' : ''}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Active pay item indicator */}
      {activePayItem && (
        <div className="flex items-center gap-1.5 border-r border-border pr-2 mr-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: activePayItem.color }} />
          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
            {activePayItem.name}
          </span>
          <span className="text-[9px] text-muted-foreground/60">
            {UNIT_LABELS[activePayItem.unit]}
          </span>
          {!activePayItem.drawable && (
            <span className="text-[9px] text-destructive font-medium">manual</span>
          )}
        </div>
      )}

      {/* Calibration indicator */}
      <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
        {calibration ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-success font-mono">
              1px = {(1 / calibration.pixelsPerFoot).toFixed(3)}ft
            </span>
            {onCopyCalibration && (
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCopyCalibration} title="Copy calibration to other pages">
                <Copy className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">No scale</span>
        )}
      </div>

      {/* Page nav */}
      <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
          {currentPage}/{totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <span className="text-[10px] font-mono text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onScaleChange(Math.min(4, scale + 0.25))}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        {onFitToScreen && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onFitToScreen} title="Fit to screen">
            <Maximize className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onShowSummary} className="toolbar-btn">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Summary</span>
        </button>
        <button onClick={onExport} className="toolbar-btn">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </div>
  );
}
