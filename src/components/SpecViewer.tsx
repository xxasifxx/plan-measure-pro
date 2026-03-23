import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, Loader2, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SearchMatch {
  page: number;
  index: number;
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

const PANEL_WIDTH_KEY = 'specViewerPanelWidth';

function getStoredPanelWidth(): number {
  try {
    const v = localStorage.getItem(PANEL_WIDTH_KEY);
    return v ? Math.max(400, Math.min(Number(v), 1600)) : 896;
  } catch { return 896; }
}

export function SpecViewer({
  open, onClose, sectionNumber, itemCode, itemName, specsPdf, specsPageTexts, startPage,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(1.5);
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const draggingRef = useRef(false);
  const refitTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Page input state
  const [pageInputValue, setPageInputValue] = useState('');
  const [editingPage, setEditingPage] = useState(false);
  const pageInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { setCurrentMatchIndex(0); }, [searchMatches]);

  const goToMatch = useCallback((matchIdx: number) => {
    if (matchIdx < 0 || matchIdx >= searchMatches.length) return;
    setCurrentMatchIndex(matchIdx);
    setCurrentPage(searchMatches[matchIdx].page);
  }, [searchMatches]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Ctrl+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
      // Arrow keys for page nav (only when not typing in an input)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(1, p - 1));
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(p => Math.min(specsPdf?.numPages || 1, p + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, searchOpen, specsPdf]);

  // Scroll wheel zoom
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(s => Math.min(4, Math.max(0.5, Math.round((s + delta) * 100) / 100)));
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [open]);

  // Two-finger touch zoom & pan
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    let lastDist = 0;
    let lastCenter = { x: 0, y: 0 };
    let activeTouches = 0;

    const getDist = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      activeTouches = e.touches.length;
      if (e.touches.length === 2) {
        e.preventDefault();
        lastDist = getDist(e.touches[0], e.touches[1]);
        lastCenter = getCenter(e.touches[0], e.touches[1]);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDist(e.touches[0], e.touches[1]);
        const center = getCenter(e.touches[0], e.touches[1]);

        // Pinch zoom
        const ratio = dist / lastDist;
        if (Math.abs(ratio - 1) > 0.01) {
          setScale(s => Math.min(4, Math.max(0.5, Math.round(s * ratio * 100) / 100)));
          lastDist = dist;
        }

        // Two-finger pan
        const dx = center.x - lastCenter.x;
        const dy = center.y - lastCenter.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          container.scrollLeft -= dx;
          container.scrollTop -= dy;
          lastCenter = center;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      activeTouches = e.touches.length;
      if (e.touches.length < 2) {
        lastDist = 0;
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [open]);

  // Persist panel width
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    }
  }, [panelWidth, isMobile]);

  // Drag-to-resize
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

  // Reset on open — fallback to page 1 if section not found
  const effectiveStartPage = startPage ?? 1;
  const sectionNotFound = specsPdf && !startPage;

  useEffect(() => {
    if (open) {
      setCurrentPage(effectiveStartPage);
      if (sectionNotFound) {
        // Auto-open search pre-filled with the section number
        setSearchOpen(true);
        setSearchQuery(sectionNumber ? `SECTION ${sectionNumber}` : '');
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
  }, [open, effectiveStartPage, sectionNotFound, sectionNumber]);

  // Render page + highlight search matches
  useEffect(() => {
    if (!open || !specsPdf || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);

    specsPdf.getPage(currentPage).then(async (page) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;

      // Highlight search matches on this page
      if (searchQuery && searchQuery.length >= 2) {
        const matchesOnPage = searchMatches.filter(m => m.page === currentPage);
        if (matchesOnPage.length > 0) {
          const textContent = await page.getTextContent();
          const query = searchQuery.toLowerCase();
          // Build a flat string with character-to-item mapping
          let fullText = '';
          const charMap: { itemIdx: number; charIdx: number }[] = [];
          for (let i = 0; i < textContent.items.length; i++) {
            const item = textContent.items[i] as any;
            if (!item.str) continue;
            for (let c = 0; c < item.str.length; c++) {
              charMap.push({ itemIdx: i, charIdx: c });
              fullText += item.str[c];
            }
          }

          const lowerFull = fullText.toLowerCase();
          let searchIdx = lowerFull.indexOf(query);
          let matchNum = 0;
          while (searchIdx !== -1) {
            // Determine if this is the currently active match
            const isActive = searchMatches.length > 0 &&
              currentMatchIndex < searchMatches.length &&
              searchMatches[currentMatchIndex].page === currentPage &&
              matchNum === matchesOnPage.findIndex(m => m.index === searchMatches[currentMatchIndex]?.index);

            // Get bounding boxes for matched characters
            const startChar = charMap[searchIdx];
            const endChar = charMap[searchIdx + query.length - 1];
            if (startChar && endChar) {
              const startItem = textContent.items[startChar.itemIdx] as any;
              const endItem = textContent.items[endChar.itemIdx] as any;
              // Draw highlight for each item span in the match
              const itemIndices = new Set<number>();
              for (let j = searchIdx; j < searchIdx + query.length && j < charMap.length; j++) {
                itemIndices.add(charMap[j].itemIdx);
              }
              for (const idx of itemIndices) {
                const item = textContent.items[idx] as any;
                if (!item.transform) continue;
                const tx = item.transform;
                // Transform to viewport coordinates
                const [a, b, c, d, e, f] = tx;
                const fontSize = Math.sqrt(b * b + d * d);
                const vp = viewport.convertToViewportPoint(e, f);
                const vpEnd = viewport.convertToViewportPoint(e + item.width, f + fontSize);
                const x = Math.min(vp[0], vpEnd[0]);
                const y = Math.min(vp[1], vpEnd[1]);
                const w = Math.abs(vpEnd[0] - vp[0]);
                const h = Math.abs(vpEnd[1] - vp[1]);

                ctx.save();
                ctx.globalAlpha = isActive ? 0.45 : 0.25;
                ctx.fillStyle = isActive ? '#f97316' : '#facc15';
                ctx.fillRect(x, y, w, h);
                ctx.restore();
              }
            }
            matchNum++;
            searchIdx = lowerFull.indexOf(query, searchIdx + 1);
          }
        }
      }

      if (!cancelled) setRendering(false);
    });

    return () => { cancelled = true; };
  }, [open, specsPdf, currentPage, scale, searchQuery, searchMatches, currentMatchIndex]);

  // Fit width on open & debounced refit on panel resize
  const fitToWidth = useCallback(() => {
    if (!specsPdf || !containerRef.current) return;
    specsPdf.getPage(currentPage || startPage || 1).then((page) => {
      const container = containerRef.current;
      if (!container) return;
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth - 32;
      const fitScale = Math.min(containerWidth / viewport.width, 3);
      setScale(Math.max(0.5, Math.round(fitScale * 100) / 100));
    });
  }, [specsPdf, currentPage, startPage]);

  useEffect(() => {
    if (!open || !specsPdf) return;
    fitToWidth();
  }, [open, specsPdf, startPage]);

  // Debounced refit on panel resize
  useEffect(() => {
    if (!open || !specsPdf) return;
    clearTimeout(refitTimerRef.current);
    refitTimerRef.current = setTimeout(fitToWidth, 300);
    return () => clearTimeout(refitTimerRef.current);
  }, [panelWidth, open, specsPdf, fitToWidth]);

  const totalPages = specsPdf?.numPages || 0;

  // Page input handlers
  const commitPageInput = () => {
    const num = parseInt(pageInputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setCurrentPage(num);
    }
    setEditingPage(false);
  };

  const effectiveWidth = isMobile ? '100%' : panelWidth;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col"
        style={{ maxWidth: effectiveWidth, width: '100%' }}
      >
        {/* Drag handle - desktop only */}
        {!isMobile && (
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-50 flex items-center justify-center hover:bg-primary/10 transition-colors group"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
         <SheetHeader className="p-3 pb-2 border-b border-border shrink-0">
           <div className="flex items-center gap-2">
             <BookOpen className="h-4 w-4 text-primary shrink-0" />
             <SheetTitle className="text-sm truncate">
               Section {sectionNumber} — {itemName}
             </SheetTitle>
           </div>
           <SheetDescription className="sr-only">
             Viewing standard specifications for {itemName}
           </SheetDescription>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50 shrink-0 flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {editingPage ? (
              <Input
                ref={pageInputRef}
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitPageInput();
                  if (e.key === 'Escape') setEditingPage(false);
                }}
                className="h-6 w-14 text-xs text-center font-mono px-1"
                autoFocus
              />
            ) : (
              <button
                className="text-xs font-mono min-w-[80px] text-center hover:bg-accent hover:text-accent-foreground rounded px-1 py-0.5 transition-colors cursor-pointer"
                onClick={() => { setPageInputValue(String(currentPage)); setEditingPage(true); }}
                title="Click to jump to a page"
              >
                {currentPage} / {totalPages}
              </button>
            )}
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setScale(s => Math.min(4, s + 0.25))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant={searchOpen ? 'secondary' : 'ghost'}
              size="icon" className="h-7 w-7"
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
                onClick={() => setCurrentPage(effectiveStartPage)}
              >
                Go to start
              </Button>
            )}
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0 flex-wrap">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) goToMatch((currentMatchIndex - 1 + searchMatches.length) % searchMatches.length);
                  else goToMatch((currentMatchIndex + 1) % searchMatches.length);
                }
              }}
              placeholder="Search in document…"
              className="h-7 text-xs bg-background flex-1 min-w-[100px]"
            />
            {searchQuery && (
              <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                {searchMatches.length === 0 ? 'No matches' : `${currentMatchIndex + 1}/${searchMatches.length}`}
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
        <div ref={containerRef} className="flex-1 min-h-0 overflow-auto bg-muted/30 p-4" style={{ touchAction: 'none' }}>
          {!specsPdf && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No specs PDF loaded.
            </div>
          )}
          {specsPdf && (
            <>
              {sectionNotFound && (
                <Alert variant="default" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Section {sectionNumber} not found automatically — use search to locate it.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex justify-center relative">
                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <canvas ref={canvasRef} className="shadow-md" />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
