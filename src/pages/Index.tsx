import { useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { Toolbar } from '@/components/Toolbar';
import { PdfCanvas } from '@/components/PdfCanvas';
import { SummaryPanel } from '@/components/SummaryPanel';
import { useProject } from '@/hooks/useProject';
import { loadPdf, extractTocFromPage } from '@/lib/pdf-utils';
import { exportCsv, exportPdfReport } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const {
    project, createProject, payItems, updatePayItems,
    currentPage, setCurrentPage, totalPages, setTotalPages,
    toolMode, setToolMode, activePayItemId, setActivePayItemId,
    scale, setScale, setCalibration, addAnnotation, removeAnnotation,
    currentCalibration,
  } = useProject();

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const pdfDoc = await loadPdf(file);
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);

      // Extract TOC from page 1
      const toc = await extractTocFromPage(pdfDoc, 1);

      const name = file.name.replace(/\.pdf$/i, '');
      createProject(name, '', file.name, toc, pdfDoc.numPages);

      toast({
        title: 'PDF Loaded',
        description: `${pdfDoc.numPages} pages • ${toc.length} sections found`,
      });
    } catch (err) {
      toast({
        title: 'Error loading PDF',
        description: String(err),
        variant: 'destructive',
      });
    }
  }, [createProject, setTotalPages, toast]);

  const activePayItem = payItems.find(p => p.id === activePayItemId);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
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
        />

        <div className="flex-1 flex flex-col min-w-0">
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
