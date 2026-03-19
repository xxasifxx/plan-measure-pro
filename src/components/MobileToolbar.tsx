import {
  MousePointer2, Ruler, Move, ZoomIn, ZoomOut, Maximize,
  ChevronLeft, ChevronRight, Undo2, Redo2, PenTool, Hash, Copy
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
  { mode: 'calibrate', icon: Ruler, label: 'Scale' },
];

export function MobileToolbar({
  toolMode, onToolChange, currentPage, totalPages, onPageChange,
  scale, onScaleChange, calibration, activePayItem, onFitToScreen,
  onUndo, onRedo, canUndo, canRedo, onCopyCalibration,
}: Props) {
  return (
    <div className="flex flex-col bg-card border-b border-border">
      {/* Row 1: Tools + page nav */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {tools.map(t => (
            <button
              key={t.mode}
              onClick={() => onToolChange(t.mode)}
              className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors ${
                toolMode === t.mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground active:bg-muted'
              }`}
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Undo/Redo */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Page nav */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-center">
            {currentPage}/{totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Row 2: Context info - active item, calibration, zoom */}
      <div className="flex items-center gap-1.5 px-2 pb-1.5 overflow-x-auto">
        {/* Active pay item chip */}
        {activePayItem && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted shrink-0">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activePayItem.color }} />
            <span className="text-[10px] font-medium truncate max-w-[100px]">{activePayItem.name}</span>
            <span className="text-[9px] text-muted-foreground">{UNIT_LABELS[activePayItem.unit]}</span>
          </div>
        )}

        {/* Calibration chip */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted shrink-0">
          {calibration ? (
            <>
              <span className="text-[10px] text-success font-mono">
                1px={(1 / calibration.pixelsPerFoot).toFixed(3)}ft
              </span>
              {onCopyCalibration && (
                <button onClick={onCopyCalibration} className="ml-0.5">
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground">No scale</span>
          )}
        </div>

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground min-w-[32px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onScaleChange(Math.min(4, scale + 0.25))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          {onFitToScreen && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFitToScreen}>
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
