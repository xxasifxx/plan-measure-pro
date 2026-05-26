import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, RefreshCw, Trash2, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useOutbox } from "@/hooks/useOutbox";
import { retryItem, triggerSync } from "@/lib/offline/sync";
import { removeRecord } from "@/lib/offline/outbox";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface Props {
  /** Render style — "pill" matches the offline indicator, "icon" is a compact toolbar button. */
  variant?: "pill" | "icon";
}

export function SyncPanel({ variant = "pill" }: Props) {
  const online = useNetworkStatus();
  const { items, pending, failed, conflicts, total } = useOutbox();
  const [open, setOpen] = useState(false);

  if (total === 0 && online) return null;

  const trigger =
    variant === "pill" ? (
      <button
        className="fixed top-3 right-3 z-[100] flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium shadow-lg hover:opacity-90"
        aria-label="Open sync panel"
      >
        <CloudUpload className="w-3.5 h-3.5" />
        {total} pending
      </button>
    ) : (
      <Button size="sm" variant="ghost" className="relative" aria-label="Open sync panel">
        <CloudUpload className="w-4 h-4" />
        {total > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]" variant="destructive">
            {total}
          </Badge>
        )}
      </Button>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4" /> Sync queue
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {pending} pending</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {failed} failed</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {conflicts} conflict</span>
        </div>

        <div className="mt-3">
          <Button size="sm" onClick={() => triggerSync()} disabled={!online}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync now
          </Button>
        </div>

        <div className="mt-5 space-y-2">
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> All changes synced.
            </div>
          )}
          {items
            .slice()
            .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
            .map((item) => (
              <div key={item.seq} className="rounded-md border border-border bg-card p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] truncate">
                    {item.entity}.{item.op}
                  </div>
                  <Badge variant={item.status === "failed" || item.status === "conflict" ? "destructive" : "secondary"} className="text-[10px]">
                    {item.status}
                  </Badge>
                </div>
                <div className="mt-1 text-muted-foreground truncate">id: {item.rowId}</div>
                {item.lastError && (
                  <div className="mt-1 text-destructive whitespace-pre-wrap break-words">{item.lastError}</div>
                )}
                <div className="mt-2 flex gap-2">
                  {(item.status === "failed" || item.status === "conflict") && item.seq != null && (
                    <Button size="sm" variant="outline" onClick={() => retryItem(item.seq!)}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  )}
                  {item.seq != null && (
                    <Button size="sm" variant="ghost" onClick={() => removeRecord(item.seq!)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Discard
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
