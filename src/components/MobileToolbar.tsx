import {
  MousePointer2, Ruler, Move, ZoomIn, ZoomOut, Maximize,
  ChevronLeft, ChevronRight, Undo2, Redo2, PenTool, Hash, Copy, Type
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
  onFitToScreen?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onCopyCalibration?: () => void;
  readOnly?: boolean;
  onCalibrationChipTap?: () => void;
}

const allTools: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'pan', icon: Move, label: 'Pan' },
  { mode: 'calibrate', icon: Ruler, label: 'Scale' },
  { mode: 'label', icon: Type, label: 'Label' },
];

export function MobileToolbar({
  toolMode, onToolChange, currentPage, totalPages, onPageChange,
  scale, onScaleChange, calibration, activePayItem, onFitToScreen,
  onUndo, onRedo, canUndo, canRedo, onCopyCalibration, readOnly,
  onCalibrationChipTap,
}: Props) {
  const tools = readOnly
    ? allTools.filter(t => t.mode !== 'calibrate')
    : allTools;
  return (
    <div className="flex flex-col bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      {/* Row 1: Tools + page nav */}
      <div className="flex items-center gap-1 px-2 py-2">
        {/* Tools */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {tools.map(t => (
            <button
              key={t.mode}
              onClick={() => onToolChange(t.mode)}
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-md transition-colors',
                toolMode === t.mode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground active:bg-muted'
              )}
            >
              <t.icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-border mx-1" />

        {/* Undo/Redo */}
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-5 w-5" />
        </Button>

        <div className="flex-1" />

        {/* Page nav */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground min-w-[44px] text-center">
            {currentPage}/{totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Row 2: Context info */}
      <div className="flex items-center gap-1.5 px-2 pb-2 overflow-x-auto">
        {/* Active pay item chip */}
        {activePayItem && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/70 border border-border/50 shrink-0">
            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: activePayItem.color }} />
            <span className="text-xs font-medium truncate max-w-[120px]">{activePayItem.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{UNIT_LABELS[activePayItem.unit]}</span>
          </div>
        )}

        {/* Calibration chip */}
        <button
          onClick={() => onCalibrationChipTap ? onCalibrationChipTap() : onToolChange('calibrate')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 shrink-0 border border-transparent hover:border-border active:bg-muted transition-colors cursor-pointer"
        >
          <Ruler className="h-3 w-3 text-muted-foreground" />
          {calibration ? (
            <>
              <span className="text-xs text-success font-mono font-semibold">
                {(() => {
                  const ftPerInch = (1 / calibration.pixelsPerFoot) * 96;
                  return ftPerInch >= 1 ? `1″=${Math.round(ftPerInch)}′` : `1px=${(1/calibration.pixelsPerFoot).toFixed(3)}ft`;
                })()}
              </span>
              {onCopyCalibration && (
                <span onClick={(e) => { e.stopPropagation(); onCopyCalibration(); }} className="ml-0.5">
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No scale</span>
          )}
        </button>

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onScaleChange(Math.max(0.5, scale - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground min-w-[36px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onScaleChange(Math.min(4, scale + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onFitToScreen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToScreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
