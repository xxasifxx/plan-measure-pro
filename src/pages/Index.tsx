import { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { Toolbar } from '@/components/Toolbar';
import { PdfCanvas } from '@/components/PdfCanvas';
import { SummaryPanel } from '@/components/SummaryPanel';
import { SpecViewer } from '@/components/SpecViewer';
import { useProject } from '@/hooks/useProject';
import { loadPdf, extractTextFromRegion, extractPayItemsFromPage } from '@/lib/pdf-utils';
import { extractAllText, buildSectionPageIndex, getSectionFromItemCode } from '@/lib/specs-utils';
import { exportCsv, exportPdfReport } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import type { TocEntry } from '@/types/project';

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

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
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

      toast({
        title: 'PDF Loaded',
        description: `${pdfDoc.numPages} pages loaded. Select the Table of Contents area to import sections.`,
      });
    } catch (err) {
      toast({
        title: 'Error loading PDF',
        description: String(err),
        variant: 'destructive',
      });
    }
  }, [createProject, setTotalPages, toast]);

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
      toast({ title: 'Loading Standard Specs…', description: 'This may take a moment for large documents.' });

      const loadedSpecsPdf = await loadPdf(file);
      const totalPgs = loadedSpecsPdf.numPages;

      const textMap = await extractAllText(loadedSpecsPdf, (done, total) => {
        if (done % 50 === 0 || done === total) {
          toast({ title: 'Indexing pages…', description: `${done} / ${total} pages` });
        }
      });

      const index = buildSectionPageIndex(textMap);
      sectionPageIndexRef.current = index;
      setSpecsPageTexts(textMap);
      setSpecsPdf(loadedSpecsPdf);
      setSpecsLoaded(true);
      setSpecsLoading(false);

      toast({
        title: 'Standard Specs Loaded',
        description: `${totalPgs} pages indexed, ${index.size} sections found. Double-click a pay item to view its spec.`,
      });
    } catch (err) {
      setSpecsLoading(false);
      toast({
        title: 'Error loading specs',
        description: String(err),
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleViewSpec = useCallback((itemCode: string) => {
    if (!specsLoaded) {
      toast({ title: 'No specs loaded', description: 'Upload standard specs first.', variant: 'destructive' });
      return;
    }

    const sectionNumber = getSectionFromItemCode(itemCode);
    const item = payItems.find(p => p.itemCode === itemCode);
    const itemName = item?.name || '';

    const startPage = sectionNumber ? (sectionPageIndexRef.current.get(sectionNumber) || null) : null;

    setSpecViewerData({ sectionNumber: sectionNumber || null, itemCode, itemName, startPage });
    setSpecViewerOpen(true);
  }, [specsLoaded, payItems, toast]);

  const handleTocRegionSelected = useCallback(async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!pdf || !project) return;

    try {
      toast({ title: 'Extracting TOC...', description: 'Reading text from selected area' });

      const scaledRect = {
        x1: rect.x1 * scale, y1: rect.y1 * scale,
        x2: rect.x2 * scale, y2: rect.y2 * scale,
      };
      const entries: TocEntry[] = await extractTextFromRegion(pdf, currentPage, scale, scaledRect);

      if (entries.length === 0) {
        toast({
          title: 'No entries found',
          description: 'Could not parse any TOC entries from the selected area. Try selecting a different region.',
          variant: 'destructive',
        });
        return;
      }

      const updated = { ...project, toc: entries };
      persist(updated);
      setToolMode('select');

      toast({
        title: 'TOC Imported',
        description: `${entries.length} sections imported from the selected area.`,
      });
    } catch (err) {
      toast({
        title: 'Error extracting TOC',
        description: String(err),
        variant: 'destructive',
      });
    }
  }, [pdf, project, currentPage, scale, persist, setToolMode, toast]);

  const handleImportPayItems = useCallback(async () => {
    if (!pdf) return;
    try {
      toast({ title: 'Extracting Pay Items...', description: 'Scanning current page for Estimate of Quantities table(s)' });
      const items = await extractPayItemsFromPage(pdf, currentPage, scale);
      updatePayItems(items);
      toast({
        title: 'Pay Items Imported',
        description: `${items.length} pay items extracted from the Estimate of Quantities table.`,
      });
    } catch (err) {
      toast({
        title: 'Error extracting pay items',
        description: String(err),
        variant: 'destructive',
      });
    }
  }, [pdf, currentPage, scale, updatePayItems, toast]);

  const handleCopyCalibration = useCallback(() => {
    if (!currentCalibration || !project) return;
    // Apply to all other pages
    const otherPages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i !== currentPage) otherPages.push(i);
    }
    copyCalibrationToPages(currentPage, otherPages);
    toast({
      title: 'Calibration copied',
      description: `Scale applied to all ${otherPages.length} other pages.`,
    });
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
  }, [payItems, setActivePayItemId, setToolMode]);

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
            onExport={() => {
              if (project) exportCsv(project.annotations, payItems, project.name);
            }}
            onFitToScreen={handleFitToScreen}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onCopyCalibration={currentCalibration ? handleCopyCalibration : undefined}
          />

          <PdfCanvas
            pdf={pdf}
            currentPage={currentPage}
            scale={scale}
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
        startPage={specViewerData.startPage}
      />
    </SidebarProvider>
  );
};

export default Index;
