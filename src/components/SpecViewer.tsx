import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, Loader2, Search, X, ZoomIn, ZoomOut } from 'lucide-react';

interface SearchMatch {
  page: number;
  index: number; // character index in page text
}

interface Props {
  open: boolean;
  onClose: () => void;
  sectionNumber: number | null;
  itemCode: string;
  itemName: string;
  specsPdf: PDFDocumentProxy | null;
  specsPageTexts: Map<number, string>;
  startPage: number | null;
}

export function SpecViewer({
  open,
  onClose,
  sectionNumber,
  itemCode,
  itemName,
  specsPdf,
  specsPageTexts,
  startPage,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(1.5);
  const [panelWidth, setPanelWidth] = useState(896);
  const draggingRef = useRef(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute search matches
  const searchMatches = useMemo<SearchMatch[]>(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    const matches: SearchMatch[] = [];
    const sortedPages = Array.from(specsPageTexts.entries()).sort((a, b) => a[0] - b[0]);
    for (const [page, text] of sortedPages) {
      const lower = text.toLowerCase();
      let idx = lower.indexOf(query);
      while (idx !== -1) {
        matches.push({ page, index: idx });
        idx = lower.indexOf(query, idx + 1);
      }
    }
    return matches;
  }, [searchQuery, specsPageTexts]);

  // Reset match index when matches change
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchMatches]);

  // Navigate to match page
  const goToMatch = useCallback((matchIdx: number) => {
    if (matchIdx < 0 || matchIdx >= searchMatches.length) return;
    setCurrentMatchIndex(matchIdx);
    setCurrentPage(searchMatches[matchIdx].page);
  }, [searchMatches]);

  // Keyboard shortcut: Ctrl+F to open search
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, searchOpen]);

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
    if (open) {
      setSearchOpen(false);
      setSearchQuery('');
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

  // Count matches on current page for badge
  const matchesOnCurrentPage = searchMatches.filter(m => m.page === currentPage).length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col"
        style={{ maxWidth: panelWidth, width: '100%' }}
      >
        {/* Drag handle on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-50 flex items-center justify-center hover:bg-primary/10 transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
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
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant={searchOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
                else setSearchQuery('');
              }}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            {startPage && (
              <Button
                variant="outline" size="sm" className="h-7 text-xs ml-1"
                onClick={() => setCurrentPage(startPage)}
              >
                Go to start
              </Button>
            )}
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    goToMatch((currentMatchIndex - 1 + searchMatches.length) % searchMatches.length);
                  } else {
                    goToMatch((currentMatchIndex + 1) % searchMatches.length);
                  }
                }
              }}
              placeholder="Search in document…"
              className="h-7 text-xs bg-background"
            />
            {searchQuery && (
              <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                {searchMatches.length === 0
                  ? 'No matches'
                  : `${currentMatchIndex + 1}/${searchMatches.length}`}
              </span>
            )}
            <Button
              variant="ghost" size="icon" className="h-6 w-6 shrink-0"
              disabled={searchMatches.length === 0}
              onClick={() => goToMatch((currentMatchIndex - 1 + searchMatches.length) % searchMatches.length)}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-6 w-6 shrink-0"
              disabled={searchMatches.length === 0}
              onClick={() => goToMatch((currentMatchIndex + 1) % searchMatches.length)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-6 w-6 shrink-0"
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

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
          {/* Current page match indicator */}
          {searchOpen && searchQuery && matchesOnCurrentPage > 0 && (
            <div className="text-center mt-2">
              <Badge variant="secondary" className="text-[10px]">
                {matchesOnCurrentPage} match{matchesOnCurrentPage !== 1 ? 'es' : ''} on this page
              </Badge>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
