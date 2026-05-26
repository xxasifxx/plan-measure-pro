import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { useSchedule } from '@/lib/schedule/use-schedule';
import type { ResourceType } from '@/lib/schedule/types';

const TYPES: ResourceType[] = ['labor', 'material', 'equipment', 'nonlabor'];

export function ResourceManager({
  open, onOpenChange, sch,
}: { open: boolean; onOpenChange: (v: boolean) => void; sch: ReturnType<typeof useSchedule> }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="font-mono text-sm">Resources</DialogTitle></DialogHeader>
        <div className="border border-border rounded">
          <div className="grid grid-cols-[1.5fr_80px_100px_80px_100px_100px_28px] gap-1 px-2 py-1 bg-muted/30 text-[10px] uppercase font-mono text-muted-foreground">
            <div>Name</div><div>Code</div><div>Type</div><div>Unit</div><div>Cost/unit</div><div>Max/day</div><div></div>
          </div>
          {sch.resources.map(r => (
            <div key={r.id} className="grid grid-cols-[1.5fr_80px_100px_80px_100px_100px_28px] gap-1 px-2 py-1 items-center border-t border-border/40 text-[11px] font-mono">
              <Input value={r.name} className="h-6 text-[11px]" onChange={e => sch.upsertResource.mutate({ id: r.id, name: e.target.value })} />
              <Input value={r.resource_code || ''} className="h-6 text-[11px]" onChange={e => sch.upsertResource.mutate({ id: r.id, resource_code: e.target.value })} />
              <Select value={r.resource_type} onValueChange={(v: ResourceType) => sch.upsertResource.mutate({ id: r.id, resource_type: v })}>
                <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={r.unit} className="h-6 text-[11px]" onChange={e => sch.upsertResource.mutate({ id: r.id, unit: e.target.value })} />
              <Input type="number" value={r.cost_per_unit} className="h-6 text-[11px]" onChange={e => sch.upsertResource.mutate({ id: r.id, cost_per_unit: Number(e.target.value) })} />
              <Input type="number" value={r.max_units_per_day} className="h-6 text-[11px]" onChange={e => sch.upsertResource.mutate({ id: r.id, max_units_per_day: Number(e.target.value) })} />
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sch.deleteResource.mutate(r.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full justify-start h-7 text-[11px]"
            onClick={() => sch.upsertResource.mutate({ name: 'New Resource' })}>
            <Plus className="h-3 w-3 mr-1" /> Add resource
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
