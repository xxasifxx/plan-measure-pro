import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PdfCanvas } from '@/components/PdfCanvas';
import { useProject } from '@/hooks/useProject';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/useTheme';
import { loadPdf } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { PayItem, PayItemUnit, ToolMode } from '@/types/project';
import { isDrawableUnit, UNIT_LABELS } from '@/types/project';
import {
  HardHat, Sun, Moon, Upload, Plus, Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize, MousePointer2, Move, Ruler, Type, Undo2, Redo2,
  PenTool, ArrowRight, CheckCircle2, X, ListChecks, Map,
} from 'lucide-react';

/* ─── Constants ─── */

const ALL_UNITS: PayItemUnit[] = ['SF', 'LF', 'CY', 'SY', 'EA', 'TON', 'LS', 'USD', 'MNTH'];
const COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'];

const TOOLS: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'pan', icon: Move, label: 'Pan' },
  { mode: 'calibrate', icon: Ruler, label: 'Scale' },
  { mode: 'label', icon: Type, label: 'Label' },
];

const MOBILE_TOOLBAR_TOOLS: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'pan', icon: Move, label: 'Pan' },
];

/* Tour target IDs per walkthrough step */
const TOUR_TARGETS: Record<number, string> = {
  0: 'tour-upload',
  1: 'tour-scale',
  2: 'tour-items',
  3: 'tour-canvas',
  4: 'tour-label',
};

/* ─── Walkthrough Steps ─── */

interface WalkthroughStep {
  id: string;
  title: string;
  instruction: string;
  icon: typeof Upload;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { id: 'upload', title: '1. Upload Your Plans', instruction: 'Drag and drop a PDF or click the upload area to load your construction plan sheets.', icon: Upload },
  { id: 'calibrate', title: '2. Set the Scale', instruction: 'Select the Scale tool (ruler icon), click two points on a known dimension, then enter the real distance in feet.', icon: Ruler },
  { id: 'payitem', title: '3. Add a Pay Item', instruction: 'Open the Items panel and tap "+ Add Item" to create a pay item with a name, unit, and color.', icon: Plus },
  { id: 'draw', title: '4. Draw a Measurement', instruction: 'Select your pay item, then draw on the plan. Lines for LF, polygons for SF/SY, markers for EA.', icon: PenTool },
  { id: 'label', title: '5. Add a Text Label', instruction: 'Select the Label tool (T), tap an anchor point, tap where you want the label, then type your text.', icon: Type },
  { id: 'done', title: 'You\'re Ready!', instruction: 'You now have the tools to digitally measure construction quantities. Sign up to save your work and collaborate.', icon: CheckCircle2 },
];

/* ─── Demo Page ─── */

export default function Demo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isDark, toggle: toggleTheme } = useTheme();

  const {
    project, initProject, payItems, updatePayItems,
    currentPage, setCurrentPage, totalPages, setTotalPages,
    toolMode, setToolMode, activePayItemId, setActivePayItemId,
    scale, setScale, setCalibration,
    addAnnotation, removeAnnotation, updateAnnotation,
    currentCalibration, undo, redo, canUndo, canRedo,
  } = useProject({});

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Walkthrough state
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [walkthroughComplete, setWalkthroughComplete] = useState(false);
  const [walkthroughDismissed, setWalkthroughDismissed] = useState(false);

  // Pay item dialog & sheet
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemsSheetOpen, setItemsSheetOpen] = useState(false);

  // Auto-advance walkthrough
  useEffect(() => {
    if (walkthroughComplete) return;
    if (walkthroughStep === 0 && pdf) setWalkthroughStep(1);
    else if (walkthroughStep === 1 && currentCalibration) setWalkthroughStep(2);
    else if (walkthroughStep === 2 && payItems.length > 0) setWalkthroughStep(3);
    else if (walkthroughStep === 3 && (project?.annotations || []).filter(a => a.type !== 'label').length > 0) setWalkthroughStep(4);
    else if (walkthroughStep === 4 && (project?.annotations || []).some(a => a.type === 'label')) {
      setWalkthroughStep(5);
    }
  }, [pdf, currentCalibration, payItems.length, project?.annotations, walkthroughStep, walkthroughComplete]);

  const handleCompleteWalkthrough = useCallback(() => {
    setWalkthroughComplete(true);
    setWalkthroughDismissed(true);
  }, []);

  // File upload
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const pdfDoc = await loadPdf(file);
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      const name = file.name.replace(/\.pdf$/i, '');
      initProject(name, '', file.name, [], pdfDoc.numPages);
      toast({ title: 'PDF Loaded', description: `${pdfDoc.numPages} pages loaded.` });
    } catch (err) {
      toast({ title: 'Error loading PDF', description: String(err), variant: 'destructive' });
    }
  }, [initProject, setTotalPages, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFitToScreen = useCallback(async () => {
    if (!pdf) return;
    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const container = canvasContainerRef.current;
      if (!container) return;
      const cw = container.clientWidth - 32;
      const ch = container.clientHeight - 32;
      const fitScale = Math.min(cw / viewport.width, ch / viewport.height, 4);
      setScale(Math.max(0.5, Math.round(fitScale * 100) / 100));
    } catch {}
  }, [pdf, currentPage, setScale]);

  const handleActivePayItemChange = useCallback((id: string) => {
    setActivePayItemId(id);
    const item = payItems.find(p => p.id === id);
    if (!item) return;
    switch (item.unit) {
      case 'LF': setToolMode('line'); break;
      case 'SF': case 'SY': case 'CY': setToolMode('polygon'); break;
      case 'EA': setToolMode('count'); break;
      default: setToolMode('select'); break;
    }
    if (isMobile) setItemsSheetOpen(false);
  }, [payItems, setActivePayItemId, setToolMode, isMobile]);

  const savePayItem = useCallback((item: PayItem) => {
    const exists = payItems.find(p => p.id === item.id);
    if (exists) {
      updatePayItems(payItems.map(p => p.id === item.id ? item : p));
    } else {
      updatePayItems([...payItems, item]);
    }
    setEditingItem(null);
    setDialogOpen(false);
  }, [payItems, updatePayItems]);

  const deletePayItem = useCallback((id: string) => {
    updatePayItems(payItems.filter(p => p.id !== id));
  }, [payItems, updatePayItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const activePayItem = payItems.find(p => p.id === activePayItemId);
  const showWalkthrough = !walkthroughDismissed;
  const currentStepData = WALKTHROUGH_STEPS[walkthroughStep];

  /* ─── Pay Items Panel Content (shared between sidebar and sheet) ─── */
  const payItemsContent = (
    <div className="flex-1 overflow-auto p-3 space-y-1.5">
      {payItems.map(item => (
        <button
          key={item.id}
          onClick={() => handleActivePayItemChange(item.id)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-colors text-left group',
            activePayItemId === item.id
              ? 'bg-primary/10 border border-primary/30'
              : 'hover:bg-muted/50'
          )}
        >
          <div className="h-4 w-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
          <span className="flex-1 truncate font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{UNIT_LABELS[item.unit]}</span>
          <button
            onClick={e => { e.stopPropagation(); deletePayItem(item.id); }}
            className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </button>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm h-10 mt-2"
            onClick={() => setEditingItem({
              id: crypto.randomUUID(),
              itemNumber: payItems.length + 1,
              itemCode: '',
              name: '',
              unit: 'SF',
              unitPrice: 0,
              color: COLORS[payItems.length % COLORS.length],
              drawable: true,
            })}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">New Pay Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <DemoPayItemForm item={editingItem} onSave={savePayItem} onCancel={() => setDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="h-screen flex flex-col w-full overflow-hidden bg-background">
      {/* ── Header ── */}
      <div className="h-12 flex items-center border-b border-border bg-card/95 backdrop-blur-sm px-3 shrink-0 safe-area-top">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/landing')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <HardHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-wide">TakeoffPro Demo</span>
          {!walkthroughComplete && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              Walkthrough
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {!isMobile && (
            <Button size="sm" className="text-xs gap-1" onClick={() => navigate('/auth')}>
              Sign Up <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Desktop Toolbar (hidden on mobile) ── */}
      {pdf && !isMobile && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-card/95 border-b border-border shrink-0 overflow-x-auto">
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {TOOLS.map(t => (
              <button
                key={t.mode}
                onClick={() => setToolMode(t.mode)}
                title={t.label}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  toolMode === t.mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                )}
              >
                <t.icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {activePayItem && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/70 border border-border/50">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: activePayItem.color }} />
                <span className="text-xs font-medium truncate max-w-[120px]">{activePayItem.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{UNIT_LABELS[activePayItem.unit]}</span>
              </div>
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            {currentCalibration ? (
              <span className="text-xs text-success font-mono font-semibold">
                {(() => {
                  const ftPerInch = (1 / currentCalibration.pixelsPerFoot) * 96;
                  return ftPerInch >= 1 ? `1″=${Math.round(ftPerInch)}′` : `1px=${(1/currentCalibration.pixelsPerFoot).toFixed(3)}ft`;
                })()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No scale</span>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-center">{currentPage}/{totalPages}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(Math.max(0.5, scale - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground min-w-[36px] text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(Math.min(4, scale + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitToScreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Mobile Toolbar (compact, above canvas) ── */}
      {pdf && isMobile && (
        <div className="flex flex-col bg-card/95 backdrop-blur-sm border-b border-border shrink-0">
          {/* Row 1: Select/Pan + undo/redo + page nav */}
          <div className="flex items-center gap-1 px-2 py-1.5">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              {MOBILE_TOOLBAR_TOOLS.map(t => (
                <button
                  key={t.mode}
                  onClick={() => setToolMode(t.mode)}
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

            <div className="w-px h-7 bg-border mx-0.5" />

            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={undo} disabled={!canUndo}>
              <Undo2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={redo} disabled={!canRedo}>
              <Redo2 className="h-5 w-5" />
            </Button>

            <div className="flex-1" />

            {/* Page nav */}
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono text-muted-foreground min-w-[36px] text-center">{currentPage}/{totalPages}</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Active item + calibration (tappable) + zoom */}
          <div className="flex items-center gap-1.5 px-2 pb-1.5 overflow-x-auto">
            {activePayItem && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/70 border border-border/50 shrink-0">
                <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: activePayItem.color }} />
                <span className="text-xs font-medium truncate max-w-[100px]">{activePayItem.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{UNIT_LABELS[activePayItem.unit]}</span>
              </div>
            )}

            <button
              onClick={() => setToolMode('calibrate')}
              data-tour-target="tour-scale"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 shrink-0 border border-transparent active:bg-muted transition-colors cursor-pointer',
                !walkthroughComplete && walkthroughStep === 1 && 'tour-highlight'
              )}
            >
              <Ruler className="h-3 w-3 text-muted-foreground" />
              {currentCalibration ? (
                <span className="text-xs text-success font-mono font-semibold">
                  {(() => {
                    const ftPerInch = (1 / currentCalibration.pixelsPerFoot) * 96;
                    return ftPerInch >= 1 ? `1″=${Math.round(ftPerInch)}′` : `scaled`;
                  })()}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">No scale</span>
              )}
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(Math.max(0.5, scale - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono text-muted-foreground min-w-[32px] text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(Math.min(4, scale + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitToScreen}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar — Pay Items */}
        {pdf && !isMobile && (
          <div className="w-60 border-r border-border bg-card shrink-0 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border">
              <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Pay Items</span>
            </div>
            {payItemsContent}
          </div>
        )}

        {/* Canvas area */}
        <div className={cn('flex-1 min-w-0 min-h-0 relative', isMobile && 'pb-14')} data-tour-target="tour-canvas">
          {pdf ? (
            <PdfCanvas
              pdf={pdf}
              currentPage={currentPage}
              scale={scale}
              onScaleChange={setScale}
              toolMode={toolMode}
              calibration={currentCalibration}
              annotations={(project?.annotations || []).filter(a => a.type !== 'manual')}
              activePayItemId={activePayItemId}
              payItems={payItems}
              onCalibrate={cal => setCalibration(currentPage, cal)}
              onAddAnnotation={addAnnotation}
              onRemoveAnnotation={removeAnnotation}
              onUpdateAnnotation={updateAnnotation}
              externalContainerRef={canvasContainerRef}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={setSelectedAnnotationId}
              isMobile={isMobile}
            />
          ) : (
            /* Upload area */
            <div
              className="absolute inset-0 flex items-center justify-center blueprint-grid"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <label
                data-tour-target="tour-upload"
                className={cn(
                  'cursor-pointer text-center border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm',
                  isMobile ? 'p-8 mx-6 max-w-sm' : 'p-12 max-w-md mx-4',
                  !walkthroughComplete && walkthroughStep === 0 && 'tour-highlight'
                )}
              >
                <Upload className={cn('text-muted-foreground mx-auto mb-4', isMobile ? 'h-10 w-10' : 'h-12 w-12')} />
                <p className={cn('font-bold mb-1', isMobile ? 'text-base' : 'text-lg')}>Upload Construction Plans</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isMobile ? 'Tap to select a PDF file' : 'Drag and drop a PDF file or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Your file stays in your browser — nothing is uploaded to a server
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* ── Walkthrough Card ── */}
          {showWalkthrough && currentStepData && (
            <div className={cn(
              'absolute z-30 px-3',
              isMobile
                ? walkthroughStep === 2 || walkthroughStep === 4
                  ? 'top-4 left-0 right-0'
                  : 'bottom-20 left-0 right-0'
                : 'bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md'
            )}>
              <div className="bg-card border border-border rounded-xl shadow-xl p-3.5 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <currentStepData.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold">{currentStepData.title}</h4>
                      <button onClick={() => setWalkthroughDismissed(true)} className="p-1 rounded hover:bg-muted -mr-1">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{currentStepData.instruction}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-1">
                    {WALKTHROUGH_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i < walkthroughStep ? 'w-3 bg-primary'
                            : i === walkthroughStep ? 'w-5 bg-primary'
                            : 'w-1.5 bg-muted-foreground/30'
                        )}
                      />
                    ))}
                  </div>
                  {walkthroughStep === WALKTHROUGH_STEPS.length - 1 ? (
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={handleCompleteWalkthrough}>
                      Start Using Demo <ArrowRight className="h-3 w-3" />
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Step {walkthroughStep + 1} of {WALKTHROUGH_STEPS.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      {isMobile && pdf && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
          <div className="flex items-stretch">
            <button
              onClick={() => setToolMode('calibrate')}
              data-tour-target="tour-scale-bar"
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 min-h-[56px] transition-colors',
                toolMode === 'calibrate' ? 'text-primary' : 'text-muted-foreground',
                !walkthroughComplete && walkthroughStep === 1 && 'tour-highlight'
              )}
            >
              <Ruler className="h-5 w-5" />
              <span className="text-[10px] font-medium">Scale</span>
            </button>

            <button
              onClick={() => setItemsSheetOpen(true)}
              data-tour-target="tour-items"
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 min-h-[56px] text-muted-foreground relative transition-colors',
                !walkthroughComplete && walkthroughStep === 2 && 'tour-highlight'
              )}
            >
              <ListChecks className="h-5 w-5" />
              <span className="text-[10px] font-medium">Items</span>
              {payItems.length > 0 && (
                <span className="absolute top-1.5 right-1/4 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {payItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setToolMode('label')}
              data-tour-target="tour-label"
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 min-h-[56px] transition-colors',
                toolMode === 'label' ? 'text-primary' : 'text-muted-foreground',
                !walkthroughComplete && walkthroughStep === 4 && 'tour-highlight'
              )}
            >
              <Type className="h-5 w-5" />
              <span className="text-[10px] font-medium">Label</span>
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="flex flex-col items-center gap-0.5 py-2.5 px-3 text-primary min-h-[56px]"
            >
              <ArrowRight className="h-5 w-5" />
              <span className="text-[10px] font-medium">Sign Up</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Pay Items Sheet ── */}
      {isMobile && (
        <Sheet open={itemsSheetOpen} onOpenChange={setItemsSheetOpen}>
          <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl flex flex-col p-0">
            <SheetHeader className="p-4 pb-2 border-b border-border">
              <SheetTitle className="text-sm font-bold">Pay Items</SheetTitle>
            </SheetHeader>
            {payItemsContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/* ─── Pay Item Form ─── */

function DemoPayItemForm({ item, onSave, onCancel }: {
  item: PayItem;
  onSave: (item: PayItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(item);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="h-9 text-sm"
          placeholder="e.g. HMA Surface Course"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Unit</Label>
          <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as PayItemUnit, drawable: isDrawableUnit(v as PayItemUnit) })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_UNITS.map(u => (
                <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Item Code</Label>
          <Input
            value={form.itemCode}
            onChange={e => setForm({ ...form, itemCode: e.target.value })}
            className="h-9 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${
                form.color === c ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-8">Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} className="text-xs h-8" disabled={!form.name}>Save</Button>
      </div>
    </div>
  );
}
