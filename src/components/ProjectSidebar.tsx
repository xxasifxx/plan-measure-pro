import { FileUp, MapPin, ChevronRight, DollarSign, Plus, Trash2, Edit2, TableOfContents } from 'lucide-react';
import { useState } from 'react';
import type { TocEntry, PayItem } from '@/types/project';
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
}

const UNITS = ['SF', 'LF', 'CY', 'EA', 'SY', 'TON', 'LS'] as const;
const COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'];

export function ProjectSidebar({
  toc, currentPage, totalPages, onPageChange, onFileUpload,
  payItems, onUpdatePayItems, activePayItemId, onActivePayItemChange, projectName,
  hasPdf, onImportToc, onCloseProject,
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

        {/* TOC */}
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
                    <SidebarMenuItem key={i}>
                      <SidebarMenuButton
                        onClick={() => onPageChange(entry.page)}
                        isActive={currentPage === entry.page}
                        tooltip={entry.label}
                        className="text-xs"
                      >
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{entry.label}</span>
                        <span className="ml-auto text-[10px] text-sidebar-foreground/50">{entry.page}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
              {payItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onActivePayItemChange(item.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-xs transition-colors ${
                    activePayItemId === item.id
                      ? 'bg-sidebar-accent ring-1 ring-sidebar-primary'
                      : 'hover:bg-sidebar-accent/50'
                  }`}
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate flex-1 text-sidebar-foreground">{item.name}</span>
                  <span className="text-[10px] text-sidebar-foreground/50">{item.unit}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingItem(item); setDialogOpen(true); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-sidebar-primary"
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePayItem(item.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7 text-sidebar-foreground/70"
                    onClick={() => {
                      setEditingItem({
                        id: crypto.randomUUID(),
                        name: '',
                        unit: 'SF',
                        unitPrice: 0,
                        color: COLORS[payItems.length % COLORS.length],
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

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Name</Label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="h-8 text-xs"
          placeholder="e.g. HMA Paving"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Unit</Label>
          <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v as PayItem['unit'] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} className="text-xs h-7" disabled={!form.name}>Save</Button>
      </div>
    </div>
  );
}
