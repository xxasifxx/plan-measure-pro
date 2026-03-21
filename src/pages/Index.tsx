import { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { Toolbar } from '@/components/Toolbar';
import { PdfCanvas } from '@/components/PdfCanvas';
import { SummaryPanel } from '@/components/SummaryPanel';
import { SpecViewer } from '@/components/SpecViewer';
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar';
import { MobileToolbar } from '@/components/MobileToolbar';
import { MobilePayItems } from '@/components/MobilePayItems';
import { MobileSections } from '@/components/MobileSections';
import { EmptyState } from '@/components/EmptyState';
import { useProject } from '@/hooks/useProject';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/useTheme';
import { loadPdf, extractTextFromRegion, extractPayItemsFromPage } from '@/lib/pdf-utils';
import { extractAllText, buildSectionPageIndex, getSectionFromItemCode } from '@/lib/specs-utils';
import { exportCsv, exportPdfReport } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import type { TocEntry } from '@/types/project';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const {
    project, createProject, closeProject, payItems, updatePayItems,
    currentPage, setCurrentPage, totalPages, setTotalPages,
    toolMode, setToolMode, activePayItemId, setActivePayItemId,
    scale, setScale, setCalibration, copyCalibrationToPages,
    addAnnotation, removeAnnotation, updateAnnotation, removeAnnotationsForPayItem,
    currentCalibration, persist,
    undo, redo, canUndo, canRedo,
  } = useProject();

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');

  // Standard specs state
  const [specsLoaded, setSpecsLoaded] = useState(false);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [specsPdf, setSpecsPdf] = useState<PDFDocumentProxy | null>(null);
  const [specsPageTexts, setSpecsPageTexts] = useState<Map<number, string>>(new Map());
  const sectionPageIndexRef = useRef<Map<number, number>>(new Map());
  const [specViewerOpen, setSpecViewerOpen] = useState(false);
  const [specViewerData, setSpecViewerData] = useState<{
    sectionNumber: number | null;
    itemCode: string;
    itemName: string;
    startPage: number | null;
  }>({ sectionNumber: null, itemCode: '', itemName: '', startPage: null });

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

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const pdfDoc = await loadPdf(file);
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      const name = file.name.replace(/\.pdf$/i, '');
      createProject(name, '', file.name, [], pdfDoc.numPages);
      if (isMobile) setMobileTab('canvas');
      toast({ title: 'PDF Loaded', description: `${pdfDoc.numPages} pages loaded.` });
    } catch (err) {
      toast({ title: 'Error loading PDF', description: String(err), variant: 'destructive' });
    }
  }, [createProject, setTotalPages, toast, isMobile]);

  const handleCloseProject = useCallback(() => {
    setPdf(null);
    closeProject();
    setSpecsLoaded(false);
    setSpecsPdf(null);
    setSpecsPageTexts(new Map());
    sectionPageIndexRef.current = new Map();
  }, [closeProject]);

  const handleSpecsUpload = useCallback(async (file: File) => {
    try {
      setSpecsLoading(true);
      toast({ title: 'Loading Standard Specs…', description: 'This may take a moment.' });
      const loadedSpecsPdf = await loadPdf(file);
      const textMap = await extractAllText(loadedSpecsPdf, (done, total) => {
        if (done % 50 === 0 || done === total) toast({ title: 'Indexing…', description: `${done}/${total} pages` });
      });
      const index = buildSectionPageIndex(textMap);
      sectionPageIndexRef.current = index;
      setSpecsPageTexts(textMap);
      setSpecsPdf(loadedSpecsPdf);
      setSpecsLoaded(true);
      setSpecsLoading(false);
      toast({ title: 'Specs Loaded', description: `${loadedSpecsPdf.numPages} pages, ${index.size} sections.` });
    } catch (err) {
      setSpecsLoading(false);
      toast({ title: 'Error loading specs', description: String(err), variant: 'destructive' });
    }
  }, [toast]);

  const handleViewSpec = useCallback((itemCode: string) => {
    if (!specsLoaded) { toast({ title: 'No specs loaded', variant: 'destructive' }); return; }
    const sectionNumber = getSectionFromItemCode(itemCode);
    const item = payItems.find(p => p.itemCode === itemCode);
    const startPage = sectionNumber ? (sectionPageIndexRef.current.get(sectionNumber) || null) : null;
    setSpecViewerData({ sectionNumber: sectionNumber || null, itemCode, itemName: item?.name || '', startPage });
    setSpecViewerOpen(true);
  }, [specsLoaded, payItems, toast]);

  const handleTocRegionSelected = useCallback(async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!pdf || !project) return;
    try {
      toast({ title: 'Extracting TOC...' });
      const scaledRect = { x1: rect.x1 * scale, y1: rect.y1 * scale, x2: rect.x2 * scale, y2: rect.y2 * scale };
      const entries: TocEntry[] = await extractTextFromRegion(pdf, currentPage, scale, scaledRect);
      if (entries.length === 0) {
        toast({ title: 'No entries found', variant: 'destructive' });
        return;
      }
      persist({ ...project, toc: entries });
      setToolMode('select');
      toast({ title: 'TOC Imported', description: `${entries.length} sections imported.` });
    } catch (err) {
      toast({ title: 'Error extracting TOC', description: String(err), variant: 'destructive' });
    }
  }, [pdf, project, currentPage, scale, persist, setToolMode, toast]);

  const handleImportPayItems = useCallback(async () => {
    if (!pdf) return;
    try {
      toast({ title: 'Extracting Pay Items...' });
      const items = await extractPayItemsFromPage(pdf, currentPage, scale);
      updatePayItems(items);
      toast({ title: 'Pay Items Imported', description: `${items.length} items extracted.` });
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }, [pdf, currentPage, scale, updatePayItems, toast]);

  const handleCopyCalibration = useCallback(() => {
    if (!currentCalibration || !project) return;
    const otherPages = [];
    for (let i = 1; i <= totalPages; i++) { if (i !== currentPage) otherPages.push(i); }
    copyCalibrationToPages(currentPage, otherPages);
    toast({ title: 'Calibration copied', description: `Applied to ${otherPages.length} pages.` });
  }, [currentCalibration, project, totalPages, currentPage, copyCalibrationToPages, toast]);

  const activePayItem = payItems.find(p => p.id === activePayItemId);

  const handleActivePayItemChange = useCallback((id: string | null) => {
    setActivePayItemId(id);
    if (!id) return;
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

  // ──── MOBILE LAYOUT ────
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col w-full overflow-hidden">
        {/* Active view */}
        <div className="flex-1 min-h-0 relative">
          {mobileTab === 'canvas' && (
            <div className="flex flex-col h-full">
              {pdf && (
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
                  onCopyCalibration={currentCalibration ? handleCopyCalibration : undefined}
                />
              )}
              <div className="flex-1 min-h-0 relative">
                {pdf ? (
                  <PdfCanvas
                    pdf={pdf}
                    currentPage={currentPage}
                    scale={scale}
                    onScaleChange={setScale}
                    toolMode={toolMode}
                    calibration={currentCalibration}
                    annotations={project?.annotations || []}
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
                  />
                ) : (
                  <EmptyState onFileUpload={handleFileUpload} />
                )}
              </div>
            </div>
          )}

          {mobileTab === 'items' && (
            <MobilePayItems
              payItems={payItems}
              onUpdatePayItems={updatePayItems}
              activePayItemId={activePayItemId}
              onActivePayItemChange={handleActivePayItemChange}
              annotations={project?.annotations || []}
              onRemoveAnnotationsForPayItem={removeAnnotationsForPayItem}
              onImportPayItems={handleImportPayItems}
              hasPdf={!!pdf}
              onSpecsUpload={handleSpecsUpload}
              specsLoaded={specsLoaded}
              specsLoading={specsLoading}
              onViewSpec={handleViewSpec}
            />
          )}

          {mobileTab === 'sections' && (
            <MobileSections
              toc={project?.toc || []}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              hasPdf={!!pdf}
              onFileUpload={handleFileUpload}
              onImportToc={() => setToolMode('tocSelect')}
              onSwitchToCanvas={() => setMobileTab('canvas')}
            />
          )}

          {mobileTab === 'summary' && (
            <div className="h-full overflow-auto pb-20">
              {project ? (
                <SummaryPanel
                  annotations={project.annotations}
                  payItems={payItems}
                  projectName={project.name}
                  contractNumber={project.contractNumber}
                  onClose={() => setMobileTab('canvas')}
                  onExportCsv={() => exportCsv(project.annotations, payItems, project.name)}
                  onExportPdf={() => exportPdfReport(project.annotations, payItems, project.name, project.contractNumber)}
                  embedded
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Load a project first
                </div>
              )}
            </div>
          )}
        </div>

        <MobileTabBar
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          hasPdf={!!pdf}
          itemCount={payItems.length}
          sectionCount={(project?.toc || []).length || totalPages}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <SpecViewer
          open={specViewerOpen}
          onClose={() => setSpecViewerOpen(false)}
          sectionNumber={specViewerData.sectionNumber}
          itemCode={specViewerData.itemCode}
          itemName={specViewerData.itemName}
          specsPdf={specsPdf}
          specsPageTexts={specsPageTexts}
          startPage={specViewerData.startPage}
        />
      </div>
    );
  }

  // ──── DESKTOP LAYOUT ────
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <ProjectSidebar
          toc={project?.toc || []}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onFileUpload={handleFileUpload}
          payItems={payItems}
          onUpdatePayItems={updatePayItems}
          activePayItemId={activePayItemId}
          onActivePayItemChange={handleActivePayItemChange}
          projectName={project?.name || null}
          hasPdf={!!pdf}
          onImportToc={() => setToolMode('tocSelect')}
          onCloseProject={handleCloseProject}
          onImportPayItems={handleImportPayItems}
          annotations={project?.annotations || []}
          onRemoveAnnotationsForPayItem={removeAnnotationsForPayItem}
          onSpecsUpload={handleSpecsUpload}
          specsLoaded={specsLoaded}
          specsLoading={specsLoading}
          onViewSpec={handleViewSpec}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="h-10 flex items-center border-b border-border bg-card px-2">
            <SidebarTrigger className="mr-2" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {project?.name || 'Construction Takeoff'}
            </span>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme} title="Toggle theme">
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <Toolbar
            toolMode={toolMode}
            onToolChange={setToolMode}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            scale={scale}
            onScaleChange={setScale}
            calibration={currentCalibration}
            activePayItem={activePayItem}
            onShowSummary={() => setShowSummary(true)}
            onExport={() => { if (project) exportCsv(project.annotations, payItems, project.name); }}
            onFitToScreen={handleFitToScreen}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onCopyCalibration={currentCalibration ? handleCopyCalibration : undefined}
          />

          <div className="flex-1 min-h-0 relative">
            {pdf ? (
              <PdfCanvas
                pdf={pdf}
                currentPage={currentPage}
                scale={scale}
                onScaleChange={setScale}
                toolMode={toolMode}
                calibration={currentCalibration}
                annotations={project?.annotations || []}
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
              />
            ) : (
              <EmptyState onFileUpload={handleFileUpload} />
            )}
          </div>
        </div>
      </div>

      {showSummary && project && (
        <SummaryPanel
          annotations={project.annotations}
          payItems={payItems}
          projectName={project.name}
          contractNumber={project.contractNumber}
          onClose={() => setShowSummary(false)}
          onExportCsv={() => exportCsv(project.annotations, payItems, project.name)}
          onExportPdf={() => exportPdfReport(project.annotations, payItems, project.name, project.contractNumber)}
        />
      )}

      <SpecViewer
        open={specViewerOpen}
        onClose={() => setSpecViewerOpen(false)}
        sectionNumber={specViewerData.sectionNumber}
        itemCode={specViewerData.itemCode}
        itemName={specViewerData.itemName}
        specsPdf={specsPdf}
        specsPageTexts={specsPageTexts}
        startPage={specViewerData.startPage}
      />
    </SidebarProvider>
  );
};

export default Index;
