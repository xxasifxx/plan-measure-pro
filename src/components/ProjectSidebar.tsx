import { FileUp, MapPin, ChevronRight, ChevronDown, Plus, Trash2, Edit2, TableOfContents, X, PenTool, Hash, BookOpen, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { TocEntry, PayItem, PayItemUnit, Annotation } from '@/types/project';
import { isDrawableUnit, UNIT_LABELS, getPayItemSection } from '@/types/project';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Props {
  toc: TocEntry[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFileUpload: (file: File) => void;
  payItems: PayItem[];
  onUpdatePayItems: (items: PayItem[]) => void;
  activePayItemId: string;
  onActivePayItemChange: (id: string) => void;
  projectName: string | null;
  hasPdf?: boolean;
  onImportToc?: () => void;
  onCloseProject?: () => void;
  onImportPayItems?: () => void;
  annotations: Annotation[];
  onRemoveAnnotationsForPayItem?: (payItemId: string) => void;
  onSpecsUpload?: (file: File) => void;
  specsLoaded?: boolean;
  specsLoading?: boolean;
  onViewSpec?: (itemCode: string) => void;
}

const ALL_UNITS: PayItemUnit[] = ['SF', 'LF', 'CY', 'SY', 'EA', 'TON', 'LS', 'USD', 'MNTH'];
const COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'];

export function ProjectSidebar({
  toc, currentPage, totalPages, onPageChange, onFileUpload,
  payItems, onUpdatePayItems, activePayItemId, onActivePayItemChange, projectName,
  hasPdf, onImportToc, onCloseProject, onImportPayItems, annotations, onRemoveAnnotationsForPayItem,
  onSpecsUpload, specsLoaded, specsLoading, onViewSpec,
}: Props) {
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') onFileUpload(file);
  };

  const savePayItem = (item: PayItem) => {
    const exists = payItems.find(p => p.id === item.id);
    if (exists) {
      onUpdatePayItems(payItems.map(p => p.id === item.id ? item : p));
    } else {
      onUpdatePayItems([...payItems, item]);
    }
    setEditingItem(null);
    setDialogOpen(false);
  };

  const deletePayItem = (id: string) => {
    onUpdatePayItems(payItems.filter(p => p.id !== id));
    onRemoveAnnotationsForPayItem?.(id);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-sm bg-primary flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Takeoff
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Upload */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
            Project
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-1.5 group-data-[collapsible=icon]:hidden">
              <label className="flex items-center gap-2 px-3 py-2 rounded-sm border border-dashed border-sidebar-border cursor-pointer hover:border-sidebar-primary hover:bg-sidebar-accent transition-colors text-xs">
                <FileUp className="h-3.5 w-3.5" />
                <span>{projectName || 'Upload PDF'}</span>
                <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
              </label>
              {hasPdf && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-7 text-destructive hover:text-destructive"
                  onClick={onCloseProject}
                >
                  <X className="h-3 w-3 mr-1" />
                  Close Project
                </Button>
              )}
              {hasPdf && onSpecsUpload && (
                <label className="flex items-center gap-2 px-3 py-2 rounded-sm border border-dashed border-sidebar-border cursor-pointer hover:border-sidebar-primary hover:bg-sidebar-accent transition-colors text-xs">
                  {specsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="h-3.5 w-3.5" />
                  )}
                  <span>{specsLoaded ? 'Specs Loaded ✓' : specsLoading ? 'Loading Specs…' : 'Upload Standard Specs'}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.type === 'application/pdf') onSpecsUpload(f);
                    }}
                    className="hidden"
                    disabled={specsLoading}
                  />
                </label>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Import TOC button */}
        {hasPdf && toc.length === 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 group-data-[collapsible=icon]:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7"
                    onClick={onImportToc}
                  >
                    <TableOfContents className="h-3 w-3 mr-1" />
                    Import Table of Contents
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* TOC Sections */}
        {toc.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
                Sections
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {toc.map((entry, i) => (
                    <TocSectionItem
                      key={i}
                      entry={entry}
                      currentPage={currentPage}
                      onPageChange={onPageChange}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Page list fallback */}
        {toc.length === 0 && totalPages > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
                Pages
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <SidebarMenuItem key={pg}>
                      <SidebarMenuButton
                        onClick={() => onPageChange(pg)}
                        isActive={currentPage === pg}
                        tooltip={`Page ${pg}`}
                        className="text-xs"
                      >
                        <span>Page {pg}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Pay Items */}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">
            Pay Items
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-1 group-data-[collapsible=icon]:hidden">
              {hasPdf && payItems.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7 mb-1"
                  onClick={onImportPayItems}
                >
                  <TableOfContents className="h-3 w-3 mr-1" />
                  Import Pay Items
                </Button>
              )}
              <PayItemList
                payItems={payItems}
                activePayItemId={activePayItemId}
                onActivePayItemChange={onActivePayItemChange}
                onEdit={(item) => { setEditingItem(item); setDialogOpen(true); }}
                onDelete={deletePayItem}
                annotations={annotations}
                onViewSpec={specsLoaded ? onViewSpec : undefined}
              />

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 text-sidebar-foreground/70"
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
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm">{editingItem?.name ? 'Edit' : 'New'} Pay Item</DialogTitle>
                  </DialogHeader>
                  {editingItem && (
                    <PayItemForm item={editingItem} onSave={savePayItem} onCancel={() => setDialogOpen(false)} />
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function PayItemForm({ item, onSave, onCancel }: {
  item: PayItem;
  onSave: (item: PayItem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(item);

  const handleUnitChange = (unit: PayItemUnit) => {
    setForm({ ...form, unit, drawable: isDrawableUnit(unit) });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Item Code</Label>
        <Input
          value={form.itemCode}
          onChange={e => setForm({ ...form, itemCode: e.target.value })}
          className="h-8 text-xs"
          placeholder="e.g. 202-0002"
        />
      </div>
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="h-8 text-xs"
          placeholder="e.g. STRIPPING TOPSOIL"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Unit</Label>
          <Select value={form.unit} onValueChange={v => handleUnitChange(v as PayItemUnit)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_UNITS.map(u => (
                <SelectItem key={u} value={u}>
                  {UNIT_LABELS[u]} {isDrawableUnit(u) ? '(drawable)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Unit Price ($)</Label>
          <Input
            type="number"
            value={form.unitPrice}
            onChange={e => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Contract Quantity</Label>
        <Input
          type="number"
          value={form.contractQuantity ?? ''}
          onChange={e => setForm({ ...form, contractQuantity: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="h-8 text-xs"
          placeholder="Optional"
        />
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-1.5 mt-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm({ ...form, color: c })}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                form.color === c ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {!form.drawable && (
        <p className="text-[10px] text-muted-foreground">
          Non-drawable item — quantity must be entered manually.
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} className="text-xs h-7" disabled={!form.name}>Save</Button>
      </div>
    </div>
  );
}

function TocSectionItem({ entry, currentPage, onPageChange }: {
  entry: TocEntry;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRange = entry.endPage > entry.startPage;
  const isActive = currentPage >= entry.startPage && currentPage <= entry.endPage;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          if (isRange) setExpanded(!expanded);
          onPageChange(entry.startPage);
        }}
        isActive={isActive}
        tooltip={`${entry.label} (${entry.sheetNo})`}
        className="text-xs"
      >
        {isRange ? (
          expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate flex-1">{entry.label}</span>
        <span className="ml-auto text-[10px] text-sidebar-foreground/50">
          {isRange ? `${entry.startPage}-${entry.endPage}` : entry.startPage}
        </span>
      </SidebarMenuButton>
      {isRange && expanded && (
        <div className="ml-4 border-l border-sidebar-border">
          {Array.from({ length: entry.endPage - entry.startPage + 1 }, (_, j) => {
            const pg = entry.startPage + j;
            return (
              <SidebarMenuButton
                key={pg}
                onClick={() => onPageChange(pg)}
                isActive={currentPage === pg}
                className="text-xs pl-3"
              >
                <span>Page {pg}</span>
              </SidebarMenuButton>
            );
          })}
        </div>
      )}
    </SidebarMenuItem>
  );
}

function PayItemList({ payItems, activePayItemId, onActivePayItemChange, onEdit, onDelete, annotations, onViewSpec }: {
  payItems: PayItem[];
  activePayItemId: string;
  onActivePayItemChange: (id: string) => void;
  onEdit: (item: PayItem) => void;
  onDelete: (id: string) => void;
  annotations: Annotation[];
  onViewSpec?: (itemCode: string) => void;
}) {
  // Group by section (first digit of itemCode × 100)
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
        label: `Section ${section}`,
        items: items.sort((a, b) => a.itemNumber - b.itemNumber),
      }));
  }, [payItems]);

  return (
    <>
      {sections.map(({ section, label, items }) => (
        <div key={section} className="space-y-0.5">
          <div className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-2 pt-1.5 pb-0.5 font-semibold">
            {label}
          </div>
          {items.map(item => {
            const itemAnnotations = annotations.filter(a => a.payItemId === item.id);
            const totalMeasurement = itemAnnotations.reduce((sum, a) => sum + a.measurement, 0);
            const count = itemAnnotations.length;

            return (
              <div
                key={item.id}
                onClick={() => onActivePayItemChange(item.id)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-xs transition-colors ${
                  activePayItemId === item.id
                    ? 'bg-sidebar-accent ring-1 ring-sidebar-primary'
                    : 'hover:bg-sidebar-accent/50'
                }`}
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                {item.drawable ? (
                  <PenTool className="h-2.5 w-2.5 shrink-0 text-sidebar-foreground/40" />
                ) : (
                  <Hash className="h-2.5 w-2.5 shrink-0 text-sidebar-foreground/40" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="truncate block text-sidebar-foreground">
                    <span className="font-mono text-sidebar-foreground/60">{item.itemNumber}.</span>{' '}
                    {item.name}
                  </span>
                  {count > 0 && (
                    <span className="block text-[9px] text-sidebar-foreground/50 mt-0.5">
                      {count} ann · {totalMeasurement.toFixed(1)} {UNIT_LABELS[item.unit]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-sidebar-foreground/50 shrink-0">{UNIT_LABELS[item.unit]}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-sidebar-primary"
                >
                  <Edit2 className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
