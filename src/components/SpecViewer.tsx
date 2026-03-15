import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  sectionNumber: number | null;
  itemCode: string;
  itemName: string;
  fullContent: string | null;
  itemPayRequirements: string | null;
  loading?: boolean;
}

const SUBSECTION_HEADINGS = [
  'DESCRIPTION',
  'MATERIALS',
  'CONSTRUCTION REQUIREMENTS',
  'METHOD OF MEASUREMENT',
  'BASIS OF PAYMENT',
];

export function SpecViewer({
  open,
  onClose,
  sectionNumber,
  itemCode,
  itemName,
  fullContent,
  itemPayRequirements,
  loading,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-border">
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
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Searching standard specs…</span>
              </div>
            )}

            {!loading && !fullContent && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No specification found for Section {sectionNumber}.
              </div>
            )}

            {!loading && fullContent && (
              <div className="space-y-4">
                {/* Item-specific pay requirements highlight */}
                {itemPayRequirements && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <h4 className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
                      Pay Requirements for {itemCode}
                    </h4>
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {itemPayRequirements}
                    </p>
                  </div>
                )}

                {/* Full section content */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Full Section Content
                  </h4>
                  <FormattedSpecContent content={fullContent} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function FormattedSpecContent({ content }: { content: string }) {
  // Split into paragraphs and style subsection headings
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-2 text-xs leading-relaxed text-foreground/90">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if this paragraph is a subsection heading
        const upperTrimmed = trimmed.toUpperCase();
        const isSubsectionHeading = SUBSECTION_HEADINGS.some(
          (h) => upperTrimmed.startsWith(h) && trimmed.length < h.length + 30
        );

        if (isSubsectionHeading) {
          return (
            <h5
              key={i}
              className="font-bold text-foreground pt-3 pb-1 border-b border-border/50 text-xs uppercase tracking-wide"
            >
              {trimmed}
            </h5>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
