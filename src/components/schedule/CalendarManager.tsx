import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Star } from 'lucide-react';
import type { useSchedule } from '@/lib/schedule/use-schedule';
import type { ScheduleCalendar } from '@/lib/schedule/types';
import { DEFAULT_WORKWEEK } from '@/lib/schedule/calendars';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface Props {
  open: boolean; onOpenChange: (v: boolean) => void;
  sch: ReturnType<typeof useSchedule>;
}

export function CalendarManager({ open, onOpenChange, sch }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = sch.calendars.find(c => c.id === editingId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="font-mono text-sm">Calendars</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[200px_1fr] gap-4">
          <div className="border border-border rounded">
            {sch.calendars.length === 0 && <div className="p-2 text-[11px] text-muted-foreground">No calendars</div>}
            {sch.calendars.map(c => (
              <div key={c.id}
                onClick={() => setEditingId(c.id)}
                className={`px-2 py-1.5 text-[12px] font-mono cursor-pointer border-b border-border/40 ${editingId === c.id ? 'bg-primary/10' : ''}`}>
                {c.is_default && <Star className="inline h-3 w-3 mr-1 text-warning" />}{c.name}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full justify-start h-7 text-[11px]"
              onClick={() => sch.upsertCalendar.mutate({
                name: 'New Calendar', is_default: sch.calendars.length === 0,
                hours_per_day: 8, workweek: DEFAULT_WORKWEEK, exceptions: [],
              })}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {!editing && <div className="text-[12px] text-muted-foreground">Select a calendar to edit, or add one.</div>}
            {editing && <CalendarEditor cal={editing} sch={sch} onDelete={() => { sch.deleteCalendar.mutate(editing.id); setEditingId(null); }} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CalendarEditor({ cal, sch, onDelete }: { cal: ScheduleCalendar; sch: ReturnType<typeof useSchedule>; onDelete: () => void }) {
  const save = (patch: Partial<ScheduleCalendar>) => sch.upsertCalendar.mutate({ id: cal.id, ...patch });
  const setHours = (day: number, hours: number) =>
    save({ workweek: { ...cal.workweek, [String(day)]: hours } });

  const [newDate, setNewDate] = useState('');
  const [newHours, setNewHours] = useState(0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] font-mono">Name</Label>
          <Input value={cal.name} onChange={e => save({ name: e.target.value })} className="h-7 text-[12px]" />
        </div>
        <div>
          <Label className="text-[11px] font-mono">Hours / day</Label>
          <Input type="number" value={cal.hours_per_day} onChange={e => save({ hours_per_day: Number(e.target.value) })} className="h-7 text-[12px]" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={cal.is_default} onCheckedChange={v => save({ is_default: v })} />
        <Label className="text-[11px] font-mono">Project default</Label>
      </div>

      <div>
        <Label className="text-[11px] font-mono mb-1 block">Workweek hours</Label>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center">
              <div className="text-[10px] uppercase text-muted-foreground">{d}</div>
              <Input type="number" min={0} max={24} step={0.5}
                value={Number(cal.workweek?.[String(i)] ?? 0)}
                onChange={e => setHours(i, Number(e.target.value))}
                className="h-7 text-[11px] text-center" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-[11px] font-mono mb-1 block">Exceptions (holidays / extra workdays)</Label>
        <div className="space-y-1 max-h-40 overflow-auto">
          {(cal.exceptions || []).map((e, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_24px] gap-1 items-center">
              <Input type="date" value={e.date} className="h-6 text-[11px]"
                onChange={ev => {
                  const next = [...(cal.exceptions || [])];
                  next[idx] = { ...e, date: ev.target.value };
                  save({ exceptions: next });
                }} />
              <Input type="number" value={e.hours} className="h-6 text-[11px]"
                onChange={ev => {
                  const next = [...(cal.exceptions || [])];
                  next[idx] = { ...e, hours: Number(ev.target.value) };
                  save({ exceptions: next });
                }} />
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => save({ exceptions: (cal.exceptions || []).filter((_, i) => i !== idx) })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_80px_24px] gap-1 items-center pt-1 border-t border-border/40">
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-6 text-[11px]" />
            <Input type="number" value={newHours} onChange={e => setNewHours(Number(e.target.value))} className="h-6 text-[11px]" placeholder="hours" />
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={!newDate}
              onClick={() => { save({ exceptions: [...(cal.exceptions || []), { date: newDate, hours: newHours }] }); setNewDate(''); setNewHours(0); }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="destructive" size="sm" onClick={onDelete}>Delete calendar</Button>
      </div>
    </div>
  );
}
