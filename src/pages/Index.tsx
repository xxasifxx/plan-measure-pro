import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { GuidedTour } from '@/components/GuidedTour';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/hooks/useTheme';
import { useTour, type TourStep } from '@/hooks/useTour';
import { loadPdf, loadPdfFromUrl, extractTextFromRegion, extractPayItemsFromPage } from '@/lib/pdf-utils';
import { extractAllText, buildSectionPageIndex, getSectionFromItemCode } from '@/lib/specs-utils';
import { exportCsv, exportPdfReport, exportInspectorDaily } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TocEntry } from '@/types/project';
import { Sun, Moon, ArrowLeft, Loader2, HelpCircle, FileSpreadsheet, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamManager } from '@/components/TeamManager';

const Index = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { isInspector, isManager, isAdmin, profile } = useAuth();
  const isReadOnly = isInspector && !isManager && !isAdmin;

  // Get current user for Supabase persistence
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id);
    });
  }, []);

  const {
    project, initProject, closeProject, payItems, updatePayItems,
    currentPage, setCurrentPage, totalPages, setTotalPages,
    toolMode, setToolMode, activePayItemId, setActivePayItemId,
    scale, setScale, setCalibration, copyCalibrationToPages,
    addAnnotation, removeAnnotation, updateAnnotation, removeAnnotationsForPayItem,
    currentCalibration, persist, updateToc,
    undo, redo, canUndo, canRedo,
  } = useProject({ supabaseProjectId: projectId, userId: currentUserId });

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [projectLoading, setProjectLoading] = useState(!!projectId);

  // Workspace guided tour
  const workspaceTour = useTour('workspace');
  const workspaceSteps: TourStep[] = [
    { target: '[data-tour="sidebar"]', title: 'Sidebar', description: 'Your project sections, pay items, and page navigation live here.', position: 'right' },
    { target: '[data-tour="toolbar"]', title: 'Tools', description: 'Select tools: calibrate the scale, draw lines, polygons, or place counts.', position: 'bottom' },
    { target: '[data-tour="page-controls"]', title: 'Page Navigation', description: 'Navigate between plan pages using these controls.', position: 'bottom' },
    { target: '[data-tour="pay-item"]', title: 'Pay Items', description: 'Select a pay item, then draw on the plan to record measurements.', position: 'right' },
    { target: '[data-tour="summary-btn"]', title: 'Summary & Export', description: 'View totals and export your takeoff as CSV or PDF.', position: 'bottom' },
  ];

  useEffect(() => {
    if (pdf && project) {
      const timer = setTimeout(() => workspaceTour.startIfNew(), 800);
      return () => clearTimeout(timer);
    }
  }, [pdf, project]);
  const [showSummary, setShowSummary] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');

  // Load project from Supabase when projectId is in URL
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function load() {
      setProjectLoading(true);
      try {
        // Fetch project record
        const { data: proj, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
        if (error || !proj) throw error || new Error('Project not found');
        if (cancelled) return;

        // Fetch pay items
        const { data: dbPayItems } = await supabase
          .from('pay_items')
          .select('*')
          .eq('project_id', projectId)
          .order('item_number');

        // Fetch calibrations
        const { data: dbCals } = await supabase
          .from('calibrations')
          .select('*')
          .eq('project_id', projectId);

        // Fetch annotations
        const { data: dbAnns } = await supabase
          .from('annotations')
          .select('*')
          .eq('project_id', projectId);

        if (cancelled) return;

        // Map DB rows to local types
        const mappedPayItems = (dbPayItems || []).map(pi => ({
          id: pi.id,
          itemNumber: pi.item_number,
          itemCode: pi.item_code,
          name: pi.name,
          unit: pi.unit as any,
          unitPrice: Number(pi.unit_price),
          color: pi.color,
          contractQuantity: pi.contract_quantity ? Number(pi.contract_quantity) : undefined,
          drawable: pi.drawable,
        }));

        const mappedCals: Record<number, any> = {};
        (dbCals || []).forEach(c => {
          mappedCals[c.page] = {
            point1: c.point1,
            point2: c.point2,
            realDistance: Number(c.real_distance),
            pixelsPerFoot: Number(c.pixels_per_foot),
          };
        });

        const mappedAnns = (dbAnns || []).map(a => ({
          id: a.id,
          type: a.type as any,
          points: a.points as any,
          payItemId: a.pay_item_id || '',
          page: a.page,
          depth: a.depth ? Number(a.depth) : undefined,
          measurement: Number(a.measurement),
          measurementUnit: a.measurement_unit,
          manualQuantity: (a as any).manual_quantity != null ? Number((a as any).manual_quantity) : undefined,
          location: (a as any).location || '',
          notes: (a as any).notes || '',
          createdAt: a.created_at,
          userId: a.user_id,
        }));

        // Create local project state with DB data
        initProject(
          proj.name,
          proj.contract_number || '',
          proj.pdf_storage_path || '',
          (proj.toc as any[]) || [],
          0,
          mappedAnns,
          mappedCals,
          mappedPayItems,
        );

        // Load PDF from storage
        if (proj.pdf_storage_path) {
          const { data: signedData, error: signErr } = await supabase.storage
            .from('project-pdfs')
            .createSignedUrl(proj.pdf_storage_path, 3600);
          if (signErr) throw signErr;
          if (cancelled) return;
          const pdfDoc = await loadPdfFromUrl(signedData.signedUrl);
          setPdf(pdfDoc);
          setTotalPages(pdfDoc.numPages);
        }

        // Load specs PDF from storage if available
        if (proj.specs_storage_path) {
          try {
            const { data: specsSignedData, error: specsSignErr } = await supabase.storage
              .from('specs-pdfs')
              .createSignedUrl(proj.specs_storage_path, 3600);
            if (!specsSignErr && specsSignedData && !cancelled) {
              const loadedSpecsPdf = await loadPdfFromUrl(specsSignedData.signedUrl);
              const textMap = await extractAllText(loadedSpecsPdf);
              const index = buildSectionPageIndex(textMap);
              if (!cancelled) {
                sectionPageIndexRef.current = index;
                setSpecsPageTexts(textMap);
                setSpecsPdf(loadedSpecsPdf);
                setSpecsLoaded(true);
              }
            }
          } catch {
            // Specs loading is non-critical
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({ title: 'Error loading project', description: err?.message || String(err), variant: 'destructive' });
          navigate('/');
        }
      } finally {
        if (!cancelled) setProjectLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

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
      initProject(name, '', file.name, [], pdfDoc.numPages);
      if (isMobile) setMobileTab('canvas');
      toast({ title: 'PDF Loaded', description: `${pdfDoc.numPages} pages loaded.` });
    } catch (err) {
      toast({ title: 'Error loading PDF', description: String(err), variant: 'destructive' });
    }
  }, [initProject, setTotalPages, toast, isMobile]);

  const handleCloseProject = useCallback(() => {
    setPdf(null);
    closeProject();
    setSpecsLoaded(false);
    setSpecsPdf(null);
    setSpecsPageTexts(new Map());
    sectionPageIndexRef.current = new Map();
    navigate('/');
  }, [closeProject, navigate]);

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

      // Upload to cloud storage if project exists
      if (projectId && currentUserId) {
        const storagePath = `${projectId}/specs.pdf`;
        await supabase.storage.from('specs-pdfs').upload(storagePath, file, { upsert: true });
        await supabase.from('projects').update({ specs_storage_path: storagePath }).eq('id', projectId);
      }
    } catch (err) {
      setSpecsLoading(false);
      toast({ title: 'Error loading specs', description: String(err), variant: 'destructive' });
    }
  }, [toast, projectId, currentUserId]);

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
      updateToc(entries);
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
      const newItems = await extractPayItemsFromPage(pdf, currentPage, scale);
      if (newItems.length === 0) {
        toast({ title: 'No pay items found on this page', variant: 'destructive' });
        return;
      }
      // Merge: add only items not already present (by itemCode)
      const existingCodes = new Set(payItems.map(p => p.itemCode));
      const toAdd = newItems.filter(item => !existingCodes.has(item.itemCode));
      if (toAdd.length === 0) {
        toast({ title: 'All items already imported', description: `${newItems.length} items found, all duplicates.` });
        return;
      }
      const merged = [...payItems, ...toAdd];
      updatePayItems(merged);
      toast({ title: 'Pay Items Imported', description: `${toAdd.length} new items added (${payItems.length} existing kept).` });
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }, [pdf, currentPage, scale, payItems, updatePayItems, toast]);

  const handleCopyCalibration = useCallback(() => {
    if (!currentCalibration || !project) return;
    const input = window.prompt(
      `Copy calibration from page ${currentPage} to which pages?\nExamples: "all", "1-20", "5,8,12"`,
      'all'
    );
    if (!input) return;
    let targetPages: number[] = [];
    if (input.trim().toLowerCase() === 'all') {
      for (let i = 1; i <= totalPages; i++) { if (i !== currentPage) targetPages.push(i); }
    } else {
      // Parse comma-separated values and ranges like "1-5,8,10-12"
      for (const part of input.split(',')) {
        const trimmed = part.trim();
        const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
            if (i !== currentPage) targetPages.push(i);
          }
        } else {
          const num = parseInt(trimmed);
          if (!isNaN(num) && num >= 1 && num <= totalPages && num !== currentPage) {
            targetPages.push(num);
          }
        }
      }
      targetPages = [...new Set(targetPages)].sort((a, b) => a - b);
    }
    if (targetPages.length === 0) {
      toast({ title: 'No valid pages selected', variant: 'destructive' });
      return;
    }
    copyCalibrationToPages(currentPage, targetPages);
    toast({ title: 'Calibration copied', description: `Applied to ${targetPages.length} pages.` });
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

  // ──── LOADING STATE ────
  if (projectLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      </div>
    );
  }

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
                  readOnly={isReadOnly}
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
              readOnly={isReadOnly}
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
                  onExportDaily={(date) => exportInspectorDaily(project.annotations, payItems, project.name, project.contractNumber, profile?.full_name || '', currentUserId || '', date)}
                  onUpdatePayItems={updatePayItems}
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
        <div data-tour="sidebar">
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
          readOnly={isReadOnly}
        />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="h-10 flex items-center border-b border-border bg-card px-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={() => navigate('/')} title="Back to projects">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <SidebarTrigger className="mr-2" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {project?.name || 'Construction Takeoff'}
            </span>
            <div className="ml-auto flex gap-1">
              {(isManager || isAdmin) && projectId && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTeam(true)} title="Manage team">
                  <Users className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => workspaceTour.start()} title="Help">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme} title="Toggle theme">
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div data-tour="toolbar">
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
            readOnly={isReadOnly}
          />
          </div>

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
          onExportDaily={(date) => exportInspectorDaily(project.annotations, payItems, project.name, project.contractNumber, profile?.full_name || '', currentUserId || '', date)}
          onUpdatePayItems={updatePayItems}
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

      {projectId && (
        <TeamManager
          open={showTeam}
          onOpenChange={setShowTeam}
          projectId={projectId}
          projectName={project?.name || 'Project'}
        />
      )}

      <GuidedTour
        steps={workspaceSteps}
        currentStep={workspaceTour.currentStep}
        isActive={workspaceTour.isActive}
        onNext={() => workspaceTour.next(workspaceSteps.length)}
        onPrev={workspaceTour.prev}
        onSkip={workspaceTour.skip}
      />
    </SidebarProvider>
  );
};

export default Index;
