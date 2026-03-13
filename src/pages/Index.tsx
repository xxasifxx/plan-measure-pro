import { useState, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { Toolbar } from '@/components/Toolbar';
import { PdfCanvas } from '@/components/PdfCanvas';
import { SummaryPanel } from '@/components/SummaryPanel';
import { useProject } from '@/hooks/useProject';
import { loadPdf, extractTextFromRegion, extractPayItemsFromPage } from '@/lib/pdf-utils';
import { exportCsv, exportPdfReport } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import type { TocEntry } from '@/types/project';

const Index = () => {
  const {
    project, createProject, closeProject, payItems, updatePayItems,
    currentPage, setCurrentPage, totalPages, setTotalPages,
    toolMode, setToolMode, activePayItemId, setActivePayItemId,
    scale, setScale, setCalibration, addAnnotation, removeAnnotation,
    currentCalibration, persist,
  } = useProject();

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

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
  }, [closeProject]);

  const handleTocRegionSelected = useCallback(async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!pdf || !project) return;

    try {
      toast({ title: 'Extracting TOC...', description: 'Reading text from selected area' });

      const entries: TocEntry[] = await extractTextFromRegion(pdf, currentPage, scale, rect);

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

  const activePayItem = payItems.find(p => p.id === activePayItemId);

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
          onActivePayItemChange={setActivePayItemId}
          projectName={project?.name || null}
          hasPdf={!!pdf}
          onImportToc={() => setToolMode('tocSelect')}
          onCloseProject={handleCloseProject}
          onImportPayItems={handleImportPayItems}
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
            onTocRegionSelected={handleTocRegionSelected}
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
    </SidebarProvider>
  );
};

export default Index;
