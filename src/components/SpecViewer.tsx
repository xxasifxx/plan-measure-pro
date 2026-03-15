import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronLeft, ChevronRight, GripVertical, Loader2, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  sectionNumber: number | null;
  itemCode: string;
  itemName: string;
  specsPdf: PDFDocumentProxy | null;
  startPage: number | null;
}

export function SpecViewer({
  open,
  onClose,
  sectionNumber,
  itemCode,
  itemName,
  specsPdf,
  startPage,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(1.5);
  const [panelWidth, setPanelWidth] = useState(896); // default ~4xl
  const draggingRef = useRef(false);

  // Drag-to-resize from left edge
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(Math.max(400, startWidth + delta), window.innerWidth - 100);
      setPanelWidth(newWidth);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  // Reset to start page when opening
  useEffect(() => {
    if (open && startPage) {
      setCurrentPage(startPage);
    }
  }, [open, startPage]);

  // Render the current page
  useEffect(() => {
    if (!open || !specsPdf || !canvasRef.current) return;

    let cancelled = false;
    setRendering(true);

    specsPdf.getPage(currentPage).then((page) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        if (!cancelled) setRendering(false);
      });
    });

    return () => { cancelled = true; };
  }, [open, specsPdf, currentPage, scale]);

  // Fit width on open
  useEffect(() => {
    if (!open || !specsPdf || !containerRef.current) return;

    specsPdf.getPage(startPage || 1).then((page) => {
      const container = containerRef.current;
      if (!container) return;
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth - 32;
      const fitScale = Math.min(containerWidth / viewport.width, 3);
      setScale(Math.max(0.5, Math.round(fitScale * 100) / 100));
    });
  }, [open, specsPdf, startPage]);

  const totalPages = specsPdf?.numPages || 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="p-3 pb-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <SheetTitle className="text-sm truncate">
              Section {sectionNumber} — {itemName}
            </SheetTitle>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px] font-mono">
              {itemCode}
            </Badge>
            {startPage && (
              <Badge variant="secondary" className="text-[10px]">
                Starts on page {startPage}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Navigation toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50 shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setScale((s) => Math.min(4, s + 0.25))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            {startPage && (
              <Button
                variant="outline" size="sm" className="h-7 text-xs ml-2"
                onClick={() => setCurrentPage(startPage)}
              >
                Go to start
              </Button>
            )}
          </div>
        </div>

        {/* PDF canvas */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-auto bg-muted/30 p-4">
          {!specsPdf && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No specs PDF loaded.
            </div>
          )}
          {!startPage && specsPdf && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Could not find Section {sectionNumber} in the specs document.
            </div>
          )}
          {specsPdf && startPage && (
            <div className="flex justify-center relative">
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <canvas ref={canvasRef} className="shadow-md" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
