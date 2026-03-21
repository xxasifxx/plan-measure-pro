import { Plus, Trash2, Edit2, BookOpen, FileUp, Loader2, TableOfContents } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { PayItem, PayItemUnit, Annotation } from '@/types/project';
import { isDrawableUnit, UNIT_LABELS, getPayItemSection } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const ALL_UNITS: PayItemUnit[] = ['SF', 'LF', 'CY', 'SY', 'EA', 'TON', 'LS', 'USD', 'MNTH'];
const COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'];

interface Props {
  payItems: PayItem[];
  onUpdatePayItems: (items: PayItem[]) => void;
  activePayItemId: string;
  onActivePayItemChange: (id: string) => void;
  annotations: Annotation[];
  onRemoveAnnotationsForPayItem?: (payItemId: string) => void;
  onImportPayItems?: () => void;
  hasPdf: boolean;
  onSpecsUpload?: (file: File) => void;
  specsLoaded?: boolean;
  specsLoading?: boolean;
  onViewSpec?: (itemCode: string) => void;
  readOnly?: boolean;
}

export function MobilePayItems({
  payItems, onUpdatePayItems, activePayItemId, onActivePayItemChange,
  annotations, onRemoveAnnotationsForPayItem, onImportPayItems, hasPdf,
  onSpecsUpload, specsLoaded, specsLoading, onViewSpec, readOnly,
}: Props) {
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sections = useMemo(() => {
    const grouped = new Map<number, PayItem[]>();
    for (const item of payItems) {
      const section = getPayItemSection(item.itemCode);
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push(item);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([section, items]) => ({
        section,
        items: items.sort((a, b) => a.itemNumber - b.itemNumber),
      }));
  }, [payItems]);

  const savePayItem = (item: PayItem) => {
    const exists = payItems.find(p => p.id === item.id);
    if (exists) {
      onUpdatePayItems(payItems.map(p => p.id === item.id ? item : p));
    } else {
      onUpdatePayItems([...payItems, item]);
    }
    setEditingItem(null);
    setSheetOpen(false);
  };

  const deletePayItem = (id: string) => {
    onUpdatePayItems(payItems.filter(p => p.id !== id));
    onRemoveAnnotationsForPayItem?.(id);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Actions bar */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold flex-1">Pay Items</h2>
        {!readOnly && hasPdf && payItems.length === 0 && (
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={onImportPayItems}>
            <TableOfContents className="h-3.5 w-3.5 mr-1" />
            Import
          </Button>
        )}
        {!readOnly && (
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={() => {
              setEditingItem({
                id: crypto.randomUUID(),
                itemNumber: payItems.length > 0 ? Math.max(...payItems.map(p => p.itemNumber)) + 1 : 1,
                itemCode: '',
                name: '',
                unit: 'SF',
                unitPrice: 0,
                color: COLORS[payItems.length % COLORS.length],
                drawable: true,
              });
              setSheetOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Specs upload - only for managers */}
      {!readOnly && hasPdf && onSpecsUpload && (
        <div className="px-3 py-2 border-b border-border">
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-border cursor-pointer hover:border-primary transition-colors text-xs">
            {specsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            <span>{specsLoaded ? 'Specs Loaded ✓' : specsLoading ? 'Loading…' : 'Upload Standard Specs'}</span>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f?.type === 'application/pdf') onSpecsUpload(f);
              }}
              className="hidden"
              disabled={specsLoading}
            />
          </label>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-auto pb-20">
        {payItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No pay items yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Import from the plans or add manually</p>
          </div>
        ) : (
          sections.map(({ section, items }) => (
            <div key={section}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-4 pt-3 pb-1 font-semibold sticky top-0 bg-background z-10">
                Section {section}
              </div>
              {items.map(item => {
                const isActive = item.id === activePayItemId;
                const itemAnns = annotations.filter(a => a.payItemId === item.id);
                const total = itemAnns.reduce((sum, a) => sum + a.measurement, 0);

                return (
                  <button
                    key={item.id}
                    onClick={() => onActivePayItemChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 ${
                      isActive ? 'bg-primary/10 border-l-2 border-l-primary' : 'active:bg-muted'
                    }`}
                  >
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.itemCode} · {UNIT_LABELS[item.unit]}
                        {itemAnns.length > 0 && ` · ${total.toFixed(1)} measured`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onViewSpec && specsLoaded && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); onViewSpec(item.itemCode); }}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!readOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setEditingItem(item); setSheetOpen(true); }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => { e.stopPropagation(); deletePayItem(item.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-sm">{editingItem?.name ? 'Edit' : 'New'} Pay Item</SheetTitle>
          </SheetHeader>
          {editingItem && (
            <MobilePayItemForm item={editingItem} onSave={savePayItem} onCancel={() => setSheetOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobilePayItemForm({ item, onSave, onCancel }: {
  item: PayItem;
  onSave: (item: PayItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(item);

  return (
    <div className="space-y-4 pt-4 pb-6">
      <div>
        <Label className="text-xs">Item Code</Label>
        <Input value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} className="h-10 text-sm mt-1" placeholder="e.g. 202-0002" />
      </div>
      <div>
        <Label className="text-xs">Name</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-10 text-sm mt-1" placeholder="e.g. STRIPPING TOPSOIL" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Unit</Label>
          <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as PayItemUnit, drawable: isDrawableUnit(v as PayItemUnit) })}>
            <SelectTrigger className="h-10 text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_UNITS.map(u => (
                <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Unit Price ($)</Label>
          <Input type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })} className="h-10 text-sm mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                form.color === c ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 h-11" onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </div>
    </div>
  );
}
