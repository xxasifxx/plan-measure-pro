import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import type { useSchedule } from '@/lib/schedule/use-schedule';
import { useToast } from '@/hooks/use-toast';

export function BaselineManager({
  open, onOpenChange, sch,
}: { open: boolean; onOpenChange: (v: boolean) => void; sch: ReturnType<typeof useSchedule> }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="font-mono text-sm">Baselines</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="border border-border rounded p-2 space-y-2">
            <div className="text-[10px] uppercase font-mono text-muted-foreground">Capture new baseline</div>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BL1 — Bid baseline" className="h-7 text-[12px]" />
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" rows={2} className="text-[12px]" />
            <Button size="sm" disabled={!name}
              onClick={async () => {
                try {
                  await sch.captureBaseline.mutateAsync({ name, notes });
                  toast({ title: 'Baseline captured', description: name });
                  setName(''); setNotes('');
                } catch (e: any) { toast({ title: 'Failed', description: e?.message, variant: 'destructive' }); }
              }}>Capture</Button>
          </div>
          <div className="border border-border rounded">
            {sch.baselines.length === 0 && <div className="p-2 text-[11px] text-muted-foreground">No baselines yet.</div>}
            {sch.baselines.map(b => (
              <div key={b.id} className="px-2 py-1.5 border-b border-border/40 flex items-center justify-between text-[12px] font-mono">
                <div>
                  <div>{b.name}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(b.captured_at).toLocaleString()}{b.notes ? ` · ${b.notes}` : ''}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sch.deleteBaseline.mutate(b.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
