import { ChevronRight, FileUp, TableOfContents } from 'lucide-react';
import type { TocEntry } from '@/types/project';
import { Button } from '@/components/ui/button';

interface Props {
  toc: TocEntry[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasPdf: boolean;
  onFileUpload: (file: File) => void;
  onImportToc?: () => void;
  onSwitchToCanvas: () => void;
}

export function MobileSections({
  toc, currentPage, totalPages, onPageChange, hasPdf, onFileUpload, onImportToc, onSwitchToCanvas,
}: Props) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') onFileUpload(file);
  };

  const goToPage = (page: number) => {
    onPageChange(page);
    onSwitchToCanvas();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold flex-1">Sections & Pages</h2>
        {hasPdf && toc.length === 0 && onImportToc && (
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => { onImportToc(); onSwitchToCanvas(); }}>
            <TableOfContents className="h-3.5 w-3.5 mr-1" />
            Import TOC
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto pb-20">
        {!hasPdf ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No PDF loaded</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Upload plans to see sections</p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer">
              <FileUp className="h-4 w-4" />
              Upload PDF
              <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
            </label>
          </div>
        ) : toc.length > 0 ? (
          toc.map((entry, i) => {
            const isActive = currentPage >= entry.startPage && currentPage <= entry.endPage;
            return (
              <button
                key={i}
                onClick={() => goToPage(entry.startPage)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-border/30 ${
                  isActive ? 'bg-primary/10 border-l-2 border-l-primary' : 'active:bg-muted'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{entry.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Sheet {entry.sheetNo} · Page{entry.endPage > entry.startPage ? `s ${entry.startPage}–${entry.endPage}` : ` ${entry.startPage}`}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })
        ) : (
          /* Page list fallback */
          Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
            <button
              key={pg}
              onClick={() => goToPage(pg)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 ${
                currentPage === pg ? 'bg-primary/10 border-l-2 border-l-primary' : 'active:bg-muted'
              }`}
            >
              <span className="text-xs font-medium">Page {pg}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
