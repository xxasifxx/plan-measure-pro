import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PdfCanvas } from '@/components/PdfCanvas';
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar';
import { MobileToolbar } from '@/components/MobileToolbar';
import { MobileSections } from '@/components/MobileSections';
import { MobilePayItems } from '@/components/MobilePayItems';
import { SummaryPanel } from '@/components/SummaryPanel';
import { GpsCalibration } from '@/components/GpsCalibration';
import { GpsTraceControls } from '@/components/GpsTraceControls';
import { MobileAnnotationSheet } from '@/components/MobileAnnotationSheet';
import { useProject } from '@/hooks/useProject';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/useTheme';
import { loadPdf, extractTextFromRegion, extractPayItemsFromPage } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PayItem, ToolMode, PointXY, Annotation, TocEntry } from '@/types/project';
import { isDrawableUnit, UNIT_LABELS } from '@/types/project';
import type { GeoCalibration } from '@/lib/geo-transform';
import { exportCsv, exportPdfReport } from '@/lib/export-utils';
import {
  HardHat, Sun, Moon, Upload, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Maximize, MousePointer2, Move, Ruler, Type, Undo2, Redo2,
  ArrowRight, CheckCircle2, X, Copy, Navigation, TableOfContents, FileDown,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/* ─── Constants ─── */
const TOOLS: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'pan', icon: Move, label: 'Pan' },
  { mode: 'calibrate', icon: Ruler, label: 'Scale' },
  { mode: 'label', icon: Type, label: 'Label' },
];

/* ─── 12-Step Walkthrough ─── */
interface WalkthroughStep {
  id: string;
  title: string;
  instruction: string;
  icon: typeof Upload;
  manualNext?: boolean; // shows a "Next" button instead of auto-advancing
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { id: 'upload', title: '1. Upload Your Plans', instruction: 'Drag-and-drop or tap to load your construction plan set PDF.', icon: Upload },
  { id: 'find-toc', title: '2. Go to the Index Sheet', instruction: 'Use the page arrows to navigate to the "Index of Sheets" page.', icon: ChevronRight, manualNext: true },
  { id: 'import-toc', title: '3. Import the Table of Contents', instruction: 'Tap "Import TOC" below. Then drag a box around the sheet list on the plan. The app will parse sheet numbers and descriptions.', icon: TableOfContents },
  { id: 'go-to-estimate', title: '4. Jump to Estimate of Quantities', instruction: 'Switch to the Sections tab and tap the "Estimate of Quantities" page (or navigate there manually).', icon: ChevronRight, manualNext: true },
  { id: 'import-items', title: '5. Import Pay Items', instruction: 'Tap "Import" on the Items tab. The app scans this page and the next 4 pages for pay items automatically.', icon: FileDown },
  { id: 'go-to-sheet', title: '6. Navigate to a Work Sheet', instruction: 'Use Sections or page arrows to go to a plan sheet where you want to measure.', icon: ChevronRight, manualNext: true },
  { id: 'calibrate', title: '7. Set the Paper Scale', instruction: 'Tap the Scale tool. Click two endpoints of a known dimension on the plan, then enter the real distance in feet.', icon: Ruler },
  { id: 'apply-scale', title: '8. Apply Scale to All Sheets', instruction: 'Your calibration is set! Choose below whether to apply it to all sheets or a range.', icon: Copy },
  { id: 'select-item', title: '9. Select a Pay Item', instruction: 'Open Items and tap a pay item to select it. The drawing tool activates automatically based on the unit type.', icon: CheckCircle2 },
  { id: 'measure', title: '10. Draw a Measurement', instruction: 'Draw on the plan: lines for L.F., polygons for S.F./S.Y., markers for EACH. Double-click/tap to finish a polygon.', icon: Ruler },
  { id: 'label', title: '11. Add a Text Label', instruction: 'Select the Label tool (T). Tap an anchor point, then tap where the label should appear, and type your text.', icon: Type },
  { id: 'done', title: 'You\'re Ready!', instruction: 'You just completed a full quantity takeoff workflow. Sign up to save your work, collaborate, and export reports.', icon: CheckCircle2 },
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
    scale, setScale, setCalibration, copyCalibrationToPages,
    addAnnotation, removeAnnotation, updateAnnotation, removeAnnotationsForPayItem,
    currentCalibration, undo, redo, canUndo, canRedo, updateToc,
  } = useProject({});

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');

  // Walkthrough state
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [walkthroughComplete, setWalkthroughComplete] = useState(false);
  const [walkthroughDismissed, setWalkthroughDismissed] = useState(false);

  // Scale propagation dialog
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scaleRange, setScaleRange] = useState('');
  const [scalePropagated, setScalePropagated] = useState(false);

  // GPS state
  const [geoCalibration, setGeoCalibration] = useState<GeoCalibration | null>(null);
  const [showGpsCal, setShowGpsCal] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<PointXY | null>(null);
  const [gpsTracePoints, setGpsTracePoints] = useState<PointXY[]>([]);
  const gpsPlanTapCallbackRef = useRef<((point: PointXY) => void) | null>(null);

  // Pay item import loading
  const [importingItems, setImportingItems] = useState(false);

  // Auto-advance walkthrough
  useEffect(() => {
    if (walkthroughComplete) return;
    const step = walkthroughStep;
    const anns = project?.annotations || [];
    const toc = project?.toc || [];

    if (step === 0 && pdf) setWalkthroughStep(1);
    else if (step === 2 && toc.length > 0) setWalkthroughStep(3);
    else if (step === 4 && payItems.length > 0) setWalkthroughStep(5);
    else if (step === 6 && currentCalibration) {
      setWalkthroughStep(7);
      setShowScaleDialog(true);
    }
    else if (step === 7 && scalePropagated) setWalkthroughStep(8);
    else if (step === 8 && activePayItemId) setWalkthroughStep(9);
    else if (step === 9 && anns.filter(a => a.type !== 'label' && a.type !== 'manual').length > 0) setWalkthroughStep(10);
    else if (step === 10 && anns.some(a => a.type === 'label')) setWalkthroughStep(11);
  }, [pdf, project?.toc, project?.annotations, payItems.length, currentCalibration,
      scalePropagated, activePayItemId, walkthroughStep, walkthroughComplete]);

  const handleCompleteWalkthrough = useCallback(() => {
    setWalkthroughComplete(true);
    setWalkthroughDismissed(true);
  }, []);

  const handleManualNext = useCallback(() => {
    setWalkthroughStep(s => s + 1);
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

  // TOC import via region selection
  const handleTocImport = useCallback(() => {
    setToolMode('tocSelect');
    if (isMobile) setMobileTab('canvas');
    toast({ title: 'Select TOC Region', description: 'Drag a rectangle around the sheet list on the plan.' });
  }, [setToolMode, isMobile, toast]);

  const handleTocRegionSelected = useCallback(async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!pdf) return;
    try {
      const entries = await extractTextFromRegion(pdf, currentPage, scale, rect);
      if (entries.length > 0) {
        updateToc(entries);
        toast({ title: 'TOC Imported', description: `${entries.length} sections found.` });
        setToolMode('select');
      } else {
        toast({ title: 'No sections found', description: 'Try selecting a wider area around the sheet list.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'TOC Import Failed', description: String(err), variant: 'destructive' });
    }
  }, [pdf, currentPage, scale, updateToc, setToolMode, toast]);

  // Pay item import
  const handleImportPayItems = useCallback(async () => {
    if (!pdf) return;
    setImportingItems(true);
    try {
      let allItems: PayItem[] = [];
      const pagesToScan = Math.min(5, totalPages - currentPage + 1);
      for (let i = 0; i < pagesToScan; i++) {
        try {
          const items = await extractPayItemsFromPage(pdf, currentPage + i, scale);
          allItems = [...allItems, ...items];
        } catch {
          // page didn't have items, skip
        }
      }
      // Deduplicate by item code
      const seen = new Set<string>();
      const deduped: PayItem[] = [];
      for (const item of allItems) {
        const key = item.itemCode || item.name;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }
      if (deduped.length > 0) {
        // Merge with existing
        const existingCodes = new Set(payItems.map(p => p.itemCode));
        const newItems = deduped.filter(d => !existingCodes.has(d.itemCode));
        updatePayItems([...payItems, ...newItems]);
        toast({ title: 'Pay Items Imported', description: `${newItems.length} new items from ${pagesToScan} pages.` });
      } else {
        toast({ title: 'No items found', description: 'Navigate to the Estimate of Quantities page and try again.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Import Failed', description: String(err), variant: 'destructive' });
    } finally {
      setImportingItems(false);
    }
  }, [pdf, currentPage, totalPages, scale, payItems, updatePayItems, toast]);

  // Scale propagation
  const handleApplyScaleAll = useCallback(() => {
    if (!currentCalibration || !project) return;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p !== currentPage);
    copyCalibrationToPages(currentPage, pages);
    setScalePropagated(true);
    setShowScaleDialog(false);
    toast({ title: 'Scale Applied', description: `Calibration copied to all ${totalPages} pages.` });
  }, [currentCalibration, project, totalPages, currentPage, copyCalibrationToPages, toast]);

  const handleApplyScaleRange = useCallback(() => {
    if (!currentCalibration || !scaleRange.trim()) return;
    // Parse range like "1-10" or "5,8,12"
    const pages: number[] = [];
    for (const part of scaleRange.split(',')) {
      const rangeParts = part.trim().split('-');
      if (rangeParts.length === 2) {
        const start = parseInt(rangeParts[0]);
        const end = parseInt(rangeParts[1]);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= Math.min(end, totalPages); i++) {
            if (i !== currentPage) pages.push(i);
          }
        }
      } else {
        const p = parseInt(part.trim());
        if (!isNaN(p) && p !== currentPage && p >= 1 && p <= totalPages) pages.push(p);
      }
    }
    if (pages.length > 0) {
      copyCalibrationToPages(currentPage, pages);
      setScalePropagated(true);
      setShowScaleDialog(false);
      toast({ title: 'Scale Applied', description: `Calibration copied to ${pages.length} pages.` });
    }
  }, [currentCalibration, scaleRange, totalPages, currentPage, copyCalibrationToPages, toast]);

  // Active pay item selection
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
    if (isMobile) setMobileTab('canvas');
  }, [payItems, setActivePayItemId, setToolMode, isMobile]);

  // GPS plan tap handler
  const handleGpsPlanTapRequest = useCallback((callback: (point: PointXY) => void) => {
    gpsPlanTapCallbackRef.current = callback;
  }, []);

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
  const toc = project?.toc || [];
  const annotations = project?.annotations || [];

  // Export handlers (for SummaryPanel)
  const handleExportCsv = useCallback(() => {
    exportCsv(annotations, payItems, project?.name || 'Demo');
  }, [annotations, payItems, project?.name]);

  const handleExportPdf = useCallback(() => {
    exportPdfReport(annotations, payItems, project?.name || 'Demo', project?.contractNumber || '');
  }, [annotations, payItems, project?.name, project?.contractNumber]);

  // Tour highlight: should current step highlight something?
  const getHighlightTarget = (step: number): string | null => {
    switch (step) {
      case 0: return 'tour-upload';
      case 1: return 'tour-page-nav';
      case 2: return 'tour-toc-btn';
      case 3: return 'tour-sections-tab';
      case 4: return 'tour-import-items';
      case 5: return 'tour-sections-tab';
      case 6: return 'tour-scale';
      case 8: return 'tour-items-tab';
      case 10: return 'tour-label';
      default: return null;
    }
  };

  const highlightTarget = showWalkthrough ? getHighlightTarget(walkthroughStep) : null;

  /* ─── Render ─── */
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
              Step {walkthroughStep + 1}/{WALKTHROUGH_STEPS.length}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {!isMobile && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
          <Button size="sm" className="text-xs gap-1" onClick={() => navigate('/auth')}>
            Sign Up <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Desktop Toolbar ── */}
      {pdf && !isMobile && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-card/95 border-b border-border shrink-0 overflow-x-auto">
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {TOOLS.map(t => (
              <button
                key={t.mode}
                onClick={() => setToolMode(t.mode)}
                title={t.label}
                data-tour-target={t.mode === 'calibrate' ? 'tour-scale' : t.mode === 'label' ? 'tour-label' : undefined}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                  toolMode === t.mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background',
                  highlightTarget === 'tour-scale' && t.mode === 'calibrate' && 'tour-highlight',
                  highlightTarget === 'tour-label' && t.mode === 'label' && 'tour-highlight',
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

          {/* Calibration indicator */}
          <button
            onClick={() => {
              if (currentCalibration) {
                setShowScaleDialog(true);
              } else {
                setToolMode('calibrate');
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          >
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
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

          {/* GPS buttons */}
          {geoCalibration && activePayItem && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <GpsTraceControls
                geoCalibration={geoCalibration}
                scaleCalibration={currentCalibration}
                activePayItem={activePayItem}
                currentPage={currentPage}
                onAddAnnotation={addAnnotation}
                onPositionUpdate={setGpsPosition}
                onTracePointsUpdate={setGpsTracePoints}
              />
            </>
          )}
          {!geoCalibration && currentCalibration && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-8" onClick={() => setShowGpsCal(true)}>
                <Navigation className="h-3.5 w-3.5" />
                GPS Cal
              </Button>
            </>
          )}

          <div className="flex-1" />

          {/* Page nav */}
          <div className="flex items-center gap-0.5" data-tour-target="tour-page-nav">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", highlightTarget === 'tour-page-nav' && 'tour-highlight')} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-center">{currentPage}/{totalPages}</span>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", highlightTarget === 'tour-page-nav' && 'tour-highlight')} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
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

          {/* TOC import button on desktop */}
          {toc.length === 0 && pdf && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className={cn("text-xs gap-1 h-8", highlightTarget === 'tour-toc-btn' && 'tour-highlight')}
                data-tour-target="tour-toc-btn"
                onClick={handleTocImport}
              >
                <TableOfContents className="h-3.5 w-3.5" />
                Import TOC
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Mobile Toolbar (above canvas, Plans tab only) ── */}
      {pdf && isMobile && mobileTab === 'canvas' && (
        <MobileToolbar
          toolMode={toolMode}
          onToolChange={setToolMode}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          scale={scale}
          onScaleChange={setScale}
          calibration={currentCalibration}
          activePayItem={activePayItem}
          onFitToScreen={handleFitToScreen}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onCopyCalibration={currentCalibration ? () => setShowScaleDialog(true) : undefined}
          onCalibrationChipTap={currentCalibration ? () => setShowScaleDialog(true) : undefined}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar — Sections + Items */}
        {pdf && !isMobile && (
          <div className="w-64 border-r border-border bg-card shrink-0 flex flex-col overflow-hidden">
            <div className="flex border-b border-border">
              <button
                onClick={() => {}}
                className="flex-1 px-3 py-2 text-[11px] uppercase tracking-widest font-bold text-muted-foreground border-b-2 border-primary"
              >
                Sections
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <MobileSections
                toc={toc}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                hasPdf={!!pdf}
                onFileUpload={handleFileUpload}
                onImportToc={handleTocImport}
                onSwitchToCanvas={() => {}}
              />
            </div>
          </div>
        )}

        {pdf && !isMobile && (
          <div className="w-56 border-r border-border bg-card shrink-0 flex flex-col overflow-hidden">
            <MobilePayItems
              payItems={payItems}
              onUpdatePayItems={updatePayItems}
              activePayItemId={activePayItemId}
              onActivePayItemChange={handleActivePayItemChange}
              annotations={annotations.filter(a => a.type !== 'manual')}
              onRemoveAnnotationsForPayItem={removeAnnotationsForPayItem}
              onImportPayItems={handleImportPayItems}
              hasPdf={!!pdf}
            />
          </div>
        )}

        {/* Canvas / mobile tab content area */}
        <div className={cn('flex-1 min-w-0 min-h-0 relative', isMobile && pdf && 'pb-14')}>
          {/* Mobile: show different content based on tab */}
          {isMobile && pdf && mobileTab === 'items' && (
            <MobilePayItems
              payItems={payItems}
              onUpdatePayItems={updatePayItems}
              activePayItemId={activePayItemId}
              onActivePayItemChange={handleActivePayItemChange}
              annotations={annotations.filter(a => a.type !== 'manual')}
              onRemoveAnnotationsForPayItem={removeAnnotationsForPayItem}
              onImportPayItems={handleImportPayItems}
              hasPdf={!!pdf}
            />
          )}

          {isMobile && pdf && mobileTab === 'sections' && (
            <MobileSections
              toc={toc}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              hasPdf={!!pdf}
              onFileUpload={handleFileUpload}
              onImportToc={handleTocImport}
              onSwitchToCanvas={() => setMobileTab('canvas')}
            />
          )}

          {isMobile && pdf && mobileTab === 'summary' && (
            <SummaryPanel
              annotations={annotations}
              payItems={payItems}
              projectName={project?.name || 'Demo'}
              contractNumber=""
              onClose={() => setMobileTab('canvas')}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              onAddManualAnnotation={addAnnotation}
              onUpdateManualAnnotation={updateAnnotation}
              embedded
            />
          )}

          {/* Canvas (shown on desktop always, mobile only on 'canvas' tab) */}
          {((!isMobile) || mobileTab === 'canvas') && (
            <>
              {pdf ? (
                <PdfCanvas
                  pdf={pdf}
                  currentPage={currentPage}
                  scale={scale}
                  onScaleChange={setScale}
                  toolMode={toolMode}
                  calibration={currentCalibration}
                  annotations={annotations.filter(a => a.type !== 'manual')}
                  activePayItemId={activePayItemId}
                  payItems={payItems}
                  onCalibrate={cal => setCalibration(currentPage, cal)}
                  onAddAnnotation={addAnnotation}
                  onRemoveAnnotation={removeAnnotation}
                  onUpdateAnnotation={updateAnnotation}
                  onTocRegionSelected={handleTocRegionSelected}
                  externalContainerRef={canvasContainerRef}
                  selectedAnnotationId={selectedAnnotationId}
                  onSelectAnnotation={setSelectedAnnotationId}
                  isMobile={isMobile}
                  gpsPosition={gpsPosition}
                  gpsTracePoints={gpsTracePoints}
                  onGpsPlanTap={gpsPlanTapCallbackRef.current}
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
                      highlightTarget === 'tour-upload' && 'tour-highlight'
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

              {/* GPS Calibration Wizard */}
              {showGpsCal && (
                <GpsCalibration
                  onComplete={(cal) => {
                    setGeoCalibration(cal);
                    setShowGpsCal(false);
                    toast({ title: 'GPS Calibrated', description: `${cal.controlPoints.length} control points mapped.` });
                  }}
                  onCancel={() => setShowGpsCal(false)}
                  onRequestPlanTap={handleGpsPlanTapRequest}
                  existingCalibration={geoCalibration}
                />
              )}

              {/* GPS Trace HUD (mobile, floating) */}
              {isMobile && geoCalibration && activePayItem && currentCalibration && (
                <div className="absolute bottom-20 left-3 right-3 z-30">
                  <GpsTraceControls
                    geoCalibration={geoCalibration}
                    scaleCalibration={currentCalibration}
                    activePayItem={activePayItem}
                    currentPage={currentPage}
                    onAddAnnotation={addAnnotation}
                    onPositionUpdate={setGpsPosition}
                    onTracePointsUpdate={setGpsTracePoints}
                  />
                </div>
              )}
            </>
          )}

          {/* ── Walkthrough Card ── */}
          {showWalkthrough && currentStepData && ((!isMobile) || mobileTab === 'canvas' || !pdf) && (
            <div className={cn(
              'absolute z-30 px-3',
              isMobile
                ? 'bottom-20 left-0 right-0'
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
                          i < walkthroughStep ? 'w-2 bg-primary'
                            : i === walkthroughStep ? 'w-4 bg-primary'
                            : 'w-1.5 bg-muted-foreground/30'
                        )}
                      />
                    ))}
                  </div>

                  {walkthroughStep === WALKTHROUGH_STEPS.length - 1 ? (
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={handleCompleteWalkthrough}>
                      Start Using Demo <ArrowRight className="h-3 w-3" />
                    </Button>
                  ) : currentStepData.manualNext ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleManualNext}>
                      Next <ArrowRight className="h-3 w-3" />
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Step {walkthroughStep + 1}/{WALKTHROUGH_STEPS.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Tab Bar ── */}
      {isMobile && pdf && (
        <MobileTabBar
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          hasPdf={!!pdf}
          itemCount={payItems.length}
          sectionCount={toc.length}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* ── Scale Propagation Dialog ── */}
      <Dialog open={showScaleDialog} onOpenChange={setShowScaleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Apply Scale to Other Sheets</DialogTitle>
            <DialogDescription className="text-xs">
              Copy this calibration ({currentCalibration ? (() => {
                const ftPerInch = (1 / currentCalibration.pixelsPerFoot) * 96;
                return ftPerInch >= 1 ? `1″=${Math.round(ftPerInch)}′` : 'scaled';
              })() : ''}) to other pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button onClick={handleApplyScaleAll} className="w-full text-sm h-10">
              Apply to All {totalPages} Sheets
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={scaleRange}
                onChange={e => setScaleRange(e.target.value)}
                placeholder="e.g. 1-10 or 5,8,12"
                className="text-sm h-10 flex-1"
              />
              <Button onClick={handleApplyScaleRange} variant="outline" className="h-10 text-sm" disabled={!scaleRange.trim()}>
                Apply
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-xs h-8" onClick={() => {
              setShowScaleDialog(false);
              setScalePropagated(true); // allow walkthrough to advance even if skipped
            }}>
              Skip for Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
