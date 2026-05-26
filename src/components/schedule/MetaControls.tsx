import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CalendarCog, CalendarClock } from 'lucide-react';
import type { ScheduleMeta } from '@/lib/schedule/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MetaControls({
  meta, onChange,
}: {
  meta?: ScheduleMeta;
  onChange: (patch: Partial<ScheduleMeta>) => void;
}) {
  const workdays = new Set(meta?.calendar?.workdays ?? [1, 2, 3, 4, 5]);
  const toggle = (d: number) => {
    const next = new Set(workdays);
    if (next.has(d)) next.delete(d); else next.add(d);
    onChange({ calendar: { workdays: [...next].sort() } });
  };
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1">
        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
        <Input type="date" className="h-7 text-[11px] w-32" value={meta?.data_date || ''}
          onChange={e => onChange({ data_date: e.target.value || null })} title="Data date" />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]">
            <CalendarCog className="h-3.5 w-3.5 mr-1" /> {workdays.size}d/wk
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Workdays</div>
          <div className="space-y-1.5">
            {DAYS.map((label, i) => (
              <label key={i} className="flex items-center gap-2 text-[12px] font-mono cursor-pointer">
                <Checkbox checked={workdays.has(i)} onCheckedChange={() => toggle(i)} />
                {label}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
