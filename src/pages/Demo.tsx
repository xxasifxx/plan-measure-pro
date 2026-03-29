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
import { cn } from '@/lib/utils';
import type { PayItem, PayItemUnit, Annotation } from '@/types/project';
import { isDrawableUnit, UNIT_LABELS } from '@/types/project';
import {
  HardHat, Sun, Moon, Upload, Plus, Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize, MousePointer2, Move, Ruler, Type, Undo2, Redo2,
  PenTool, ArrowRight, CheckCircle2, X,
} from 'lucide-react';

/* ─── Constants ─── */

const ALL_UNITS: PayItemUnit[] = ['SF', 'LF', 'CY', 'SY', 'EA', 'TON', 'LS', 'USD', 'MNTH'];
const COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'];

const TOOLS = [
  { mode: 'select' as const, icon: MousePointer2, label: 'Select' },
  { mode: 'pan' as const, icon: Move, label: 'Pan' },
  { mode: 'calibrate' as const, icon: Ruler, label: 'Scale' },
  { mode: 'label' as const, icon: Type, label: 'Label' },
];

/* ─── Walkthrough Steps ─── */

interface WalkthroughStep {
  id: string;
  title: string;
  instruction: string;
  icon: typeof Upload;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { id: 'upload', title: '1. Upload Your Plans', instruction: 'Drag and drop a PDF or click the upload area to load your construction plan sheets.', icon: Upload },
  { id: 'calibrate', title: '2. Set the Scale', instruction: 'Select the Scale tool (ruler icon) in the toolbar, click two points on a known dimension, then enter the real distance in feet.', icon: Ruler },
  { id: 'payitem', title: '3. Add a Pay Item', instruction: 'Click "+ Add Item" in the left panel to create a pay item. Give it a name, unit (SF, LF, EA), and color.', icon: Plus },
  { id: 'draw', title: '4. Draw a Measurement', instruction: 'Select your pay item, then draw on the plan. The tool auto-selects: lines for LF, polygons for SF/SY, markers for EA.', icon: PenTool },
  { id: 'label', title: '5. Add a Text Label', instruction: 'Select the Label tool (T icon), click an anchor point on the plan, click where you want the label, and type your text.', icon: Type },
  { id: 'done', title: 'You\'re Ready!', instruction: 'You now have the tools to digitally measure construction quantities. Sign up to save your work and collaborate with your team.', icon: CheckCircle2 },
];

/* ─── Demo Page ─── */

export default function Demo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Project state (local only, no Supabase)
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

  // Pay item dialog
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sidebar collapsed (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Auto-advance walkthrough based on state
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

  // Auto-select tool based on pay item unit
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
  }, [payItems, setActivePayItemId, setToolMode]);

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

  return (
    <div className="h-screen flex flex-col w-full overflow-hidden bg-background">
      {/* ── Header ── */}
      <div className="h-11 flex items-center border-b border-border bg-card/95 backdrop-blur-sm px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/landing')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-wide">TakeoffPro Demo</span>
          {!walkthroughComplete && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              Walkthrough
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button size="sm" className="text-xs gap-1" onClick={() => navigate('/auth')}>
            Sign Up <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      {pdf && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-card/95 border-b border-border shrink-0 overflow-x-auto">
          {/* Tool buttons */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5" data-demo-tour="tools">
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
                {!isMobile && <span>{t.label}</span>}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Undo/Redo */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Active pay item pill */}
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

          {/* Calibration indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50" data-demo-tour="calibration">
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

          {/* Page nav */}
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

          {/* Zoom */}
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

      {/* ── Main area ── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar — Pay Items */}
        {pdf && (
          <div className={cn(
            'border-r border-border bg-card shrink-0 flex flex-col transition-all duration-200 overflow-hidden',
            sidebarOpen ? 'w-60' : 'w-0',
            isMobile && !sidebarOpen && 'hidden'
          )}>
            <div className="p-2 border-b border-border flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Pay Items</span>
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1" data-demo-tour="pay-items">
              {payItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleActivePayItemChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors text-left',
                    activePayItemId === item.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="flex-1 truncate font-medium">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{UNIT_LABELS[item.unit]}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deletePayItem(item.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-8"
                    data-demo-tour="add-item"
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
                    <Plus className="h-3 w-3 mr-1" />
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
          </div>
        )}

        {/* Canvas area */}
        <div className="flex-1 min-w-0 min-h-0 relative">
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
              <label className="cursor-pointer text-center p-12 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm max-w-md mx-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-bold mb-1">Upload Construction Plans</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop a PDF file or click to browse
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

          {/* Toggle sidebar button (mobile) */}
          {pdf && isMobile && !sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="absolute top-3 left-3 z-20 bg-card/90 backdrop-blur-sm gap-1"
              onClick={() => setSidebarOpen(true)}
            >
              <PenTool className="h-3 w-3" /> Items
            </Button>
          )}

          {/* ── Walkthrough Card ── */}
          {showWalkthrough && currentStepData && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
              <div className="bg-card border border-border rounded-xl shadow-xl p-4 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <currentStepData.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold">{currentStepData.title}</h4>
                      <button onClick={() => setWalkthroughDismissed(true)} className="p-0.5 rounded hover:bg-muted">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{currentStepData.instruction}</p>
                  </div>
                </div>

                {/* Progress dots */}
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
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleCompleteWalkthrough}>
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
    </div>
  );
}

/* ─── Pay Item Form (simplified for demo) ─── */

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
          className="h-8 text-xs"
          placeholder="e.g. HMA Surface Course"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Unit</Label>
          <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as PayItemUnit, drawable: isDrawableUnit(v as PayItemUnit) })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
            className="h-8 text-xs"
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-1.5 mt-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                form.color === c ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} className="text-xs h-7" disabled={!form.name}>Save</Button>
      </div>
    </div>
  );
}
