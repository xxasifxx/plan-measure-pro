import { useMemo, useState } from 'react';
import type { ScheduleActivity } from '@/lib/schedule/types';
import { ChevronRight, ChevronDown, Plus, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  activities: ScheduleActivity[];
  selectedWbsId: string | null;
  onSelect: (id: string | null) => void;
  onAddChild: (parentId: string | null) => void;
}

interface Node extends ScheduleActivity { children: Node[] }

function buildTree(items: ScheduleActivity[]): Node[] {
  const wbsItems = items.filter(a => a.activity_type === 'wbs');
  const byId = new Map<string, Node>(wbsItems.map(a => [a.id, { ...a, children: [] }]));
  const roots: Node[] = [];
  for (const n of byId.values()) {
    if (n.parent_wbs_id && byId.has(n.parent_wbs_id)) byId.get(n.parent_wbs_id)!.children.push(n);
    else roots.push(n);
  }
  // count of leaf activities under each wbs
  const countOf = (nodeId: string) => items.filter(a => a.parent_wbs_id === nodeId && a.activity_type !== 'wbs').length;
  const decorate = (n: Node): Node => ({ ...n, name: `${n.name} · ${countOf(n.id)}`, children: n.children.map(decorate) });
  return roots.map(decorate);
}

export function WbsTree({ activities, selectedWbsId, onSelect, onAddChild }: Props) {
  const tree = useMemo(() => buildTree(activities), [activities]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(activities.filter(a => a.activity_type === 'wbs').map(a => a.id)));

  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const renderNode = (n: Node, depth: number) => {
    const isOpen = open.has(n.id);
    const isSelected = selectedWbsId === n.id;
    return (
      <div key={n.id}>
        <div
          className={cn(
            'group flex items-center gap-1 px-2 py-1 text-xs font-mono cursor-pointer rounded',
            isSelected ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/40 text-foreground/90',
          )}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => onSelect(isSelected ? null : n.id)}
        >
          <button
            className="p-0.5 hover:bg-muted/60 rounded"
            onClick={e => { e.stopPropagation(); toggle(n.id); }}
          >
            {n.children.length ? (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="inline-block w-3" />}
          </button>
          {isOpen ? <FolderOpen className="h-3 w-3 text-primary" /> : <Folder className="h-3 w-3 text-muted-foreground" />}
          <span className="text-foreground/80 text-[10px]">{n.wbs_code}</span>
          <span className="truncate flex-1">{n.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded"
            title="Add child"
            onClick={e => { e.stopPropagation(); onAddChild(n.id); }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {isOpen && n.children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">WBS</span>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => onAddChild(null)}>
          <Plus className="h-3 w-3 mr-1" /> WBS
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-1">
        <div
          className={cn(
            'px-2 py-1 text-[10px] uppercase tracking-wider cursor-pointer rounded mx-1',
            selectedWbsId === null ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/40',
          )}
          onClick={() => onSelect(null)}
        >
          All Activities
        </div>
        {tree.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-muted-foreground">No WBS yet. Click + WBS.</div>
        ) : tree.map(n => renderNode(n, 0))}
      </div>
    </div>
  );
}
