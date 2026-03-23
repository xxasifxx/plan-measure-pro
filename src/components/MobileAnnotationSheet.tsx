import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Annotation, PayItem } from '@/types/project';
import { UNIT_LABELS } from '@/types/project';

interface Props {
  annotation: Annotation | null;
  payItem: PayItem | null;
  payItems: PayItem[];
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
}

export function MobileAnnotationSheet({ annotation, payItem, payItems, onClose, onUpdate, onDelete }: Props) {
  if (!annotation || !payItem) return null;

  return (
    <Sheet open={!!annotation} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-xl max-h-[70vh] overflow-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: payItem.color }} />
            {payItem.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Measurement info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium capitalize">{annotation.type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Calc'd Qty</span>
              <p className="font-mono font-medium">{annotation.measurement.toFixed(2)} {annotation.measurementUnit}</p>
            </div>
            {annotation.depth && (
              <div>
                <span className="text-muted-foreground">Depth</span>
                <p className="font-mono font-medium">{annotation.depth} ft</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Page</span>
              <p className="font-medium">{annotation.page}</p>
            </div>
          </div>

          {/* Override quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs">Override Quantity</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={annotation.manualQuantity ?? ''}
                placeholder={annotation.measurement.toFixed(2)}
                onChange={e => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  onUpdate(annotation.id, { manualQuantity: val });
                }}
                className="h-9 font-mono"
              />
              <span className="text-xs text-muted-foreground shrink-0">{annotation.measurementUnit}</span>
              {annotation.manualQuantity != null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs shrink-0"
                  onClick={() => onUpdate(annotation.id, { manualQuantity: undefined })}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs">Location</Label>
            <Input
              value={annotation.location || ''}
              placeholder="e.g. Station 42+00"
              onChange={e => onUpdate(annotation.id, { location: e.target.value })}
              className="h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input
              value={annotation.notes || ''}
              placeholder="Inspector notes…"
              onChange={e => onUpdate(annotation.id, { notes: e.target.value })}
              className="h-9"
            />
          </div>

          {/* Reassign */}
          <div className="space-y-1.5">
            <Label className="text-xs">Reassign Pay Item</Label>
            <Select
              value={annotation.payItemId}
              onValueChange={(newId) => onUpdate(annotation.id, { payItemId: newId })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {payItems.filter(p => p.drawable).map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name} ({UNIT_LABELS[p.unit]})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => { onDelete(annotation.id); onClose(); }}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
