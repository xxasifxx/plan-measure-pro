import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { ActivityRelationship, ActivityType, RelType, ScheduleActivity } from '@/lib/schedule/types';
import type { useSchedule } from '@/lib/schedule/use-schedule';

interface Props {
  activity: ScheduleActivity | null;
  open: boolean;
  onClose: () => void;
  sch: ReturnType<typeof useSchedule>;
  projectId: string;
}

const ACTIVITY_TYPES: { v: ActivityType; label: string }[] = [
  { v: 'task', label: 'Task' },
  { v: 'start_milestone', label: 'Start Milestone' },
  { v: 'finish_milestone', label: 'Finish Milestone' },
  { v: 'loe', label: 'Level of Effort' },
  { v: 'wbs', label: 'WBS Summary' },
];

export function ActivityInspector({ activity, open, onClose, sch, projectId }: Props) {
  const [draft, setDraft] = useState<Partial<ScheduleActivity>>({});
  useEffect(() => { setDraft({}); }, [activity?.id]);

  const payItemsQ = useQuery({
    queryKey: ['pay-items', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('pay_items').select('id,item_code,name,unit').eq('project_id', projectId);
      return data || [];
    },
    enabled: !!projectId && open,
  });

  if (!activity) return null;
  const a: ScheduleActivity = { ...activity, ...draft };
  const cpm = sch.cpm?.byId.get(activity.id);
  const isMilestone = a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone';

  const save = (patch: Partial<ScheduleActivity>) => {
    setDraft(d => ({ ...d, ...patch }));
    sch.upsertActivity.mutate({ id: activity.id, ...patch });
  };

  const preds = sch.relationships.filter(r => r.succ_activity_id === activity.id);
  const succs = sch.relationships.filter(r => r.pred_activity_id === activity.id);
  const leaves = sch.activities.filter(x => x.activity_type !== 'wbs' && x.id !== activity.id);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <SheetTitle className="font-mono text-sm flex items-center gap-2">
            <Badge variant={cpm?.is_critical ? 'destructive' : 'outline'} className="text-[10px]">
              {a.activity_id || a.wbs_code}
            </Badge>
            <span className="truncate">{a.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-5">
          <Section title="Identity">
            <Row label="Activity ID">
              <Input value={a.activity_id || ''} onChange={e => save({ activity_id: e.target.value })} className="h-7 text-[12px] font-mono" />
            </Row>
            <Row label="Name">
              <Input value={a.name} onChange={e => save({ name: e.target.value })} className="h-7 text-[12px]" />
            </Row>
            <Row label="WBS code">
              <Input value={a.wbs_code} onChange={e => save({ wbs_code: e.target.value })} className="h-7 text-[12px] font-mono" />
            </Row>
            <Row label="Type">
              <Select value={a.activity_type} onValueChange={(v: any) => save({ activity_type: v })}>
                <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t.v} value={t.v} className="text-[12px]">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Row>
          </Section>

          <Section title="Schedule">
            <Row label="Baseline start">
              <Input type="date" value={a.baseline_start || ''} onChange={e => save({ baseline_start: e.target.value })} className="h-7 text-[12px]" />
            </Row>
            <Row label="Duration (workdays)">
              <Input type="number" min={0} step={0.25} value={Number(a.duration_days || 0)} disabled={isMilestone}
                onChange={e => save({ duration_days: Number(e.target.value) })} className="h-7 text-[12px]" />
            </Row>
            <Row label="Manual finish">
              <Switch checked={!!a.manual_finish} onCheckedChange={v => save({ manual_finish: v })} />
            </Row>
            <Row label="Baseline finish">
              <Input type="date" value={a.baseline_end || ''} disabled={!a.manual_finish}
                onChange={e => save({ baseline_end: e.target.value })} className="h-7 text-[12px]" />
            </Row>
          </Section>

          <Section title="Progress">
            <Row label={`% complete (${Math.round(Number(a.percent_complete || 0))}%)`}>
              <Slider value={[Number(a.percent_complete || 0)]} min={0} max={100} step={1}
                onValueChange={v => setDraft(d => ({ ...d, percent_complete: v[0] }))}
                onValueCommit={v => save({ percent_complete: v[0] })} />
            </Row>
            <Row label="Actual start">
              <Input type="date" value={a.actual_start || ''} onChange={e => save({ actual_start: e.target.value || null })} className="h-7 text-[12px]" />
            </Row>
            <Row label="Actual finish">
              <Input type="date" value={a.actual_finish || ''} onChange={e => save({ actual_finish: e.target.value || null })} className="h-7 text-[12px]" />
            </Row>
            <Row label="Remaining (days)">
              <div className="text-[12px] font-mono text-muted-foreground">{Number(a.remaining_duration_days ?? a.duration_days ?? 0)}</div>
            </Row>
          </Section>

          <Section title="CPM (computed)">
            <Stat label="Early start" v={cpm?.early_start} />
            <Stat label="Early finish" v={cpm?.early_finish} />
            <Stat label="Late start" v={cpm?.late_start} />
            <Stat label="Late finish" v={cpm?.late_finish} />
            <Stat label="Total float (d)" v={cpm == null ? '—' : Number.isNaN(cpm.total_float_days) ? 'cycle' : String(cpm.total_float_days)} />
            <Stat label="Critical" v={cpm?.is_critical ? 'YES' : 'no'} />
          </Section>

          <Section title="Pay item">
            <Select value={a.pay_item_id || 'none'} onValueChange={v => save({ pay_item_id: v === 'none' ? null : v })}>
              <SelectTrigger className="h-7 text-[12px]"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-[12px]">— None —</SelectItem>
                {(payItemsQ.data || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="text-[12px] font-mono">
                    {p.item_code} · {p.name} ({p.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>

          <RelationshipList title="Predecessors" rels={preds} side="pred" leaves={leaves} sch={sch} activityId={activity.id} projectId={projectId} />
          <RelationshipList title="Successors" rels={succs} side="succ" leaves={leaves} sch={sch} activityId={activity.id} projectId={projectId} />

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
      <Label className="text-[11px] font-mono text-muted-foreground">{label}</Label>
      <div>{children}</div>
    </div>
  );
}
function Stat({ label, v }: { label: string; v?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <Label className="text-[11px] font-mono text-muted-foreground">{label}</Label>
      <div className="text-[12px] font-mono">{v ?? '—'}</div>
    </div>
  );
}

function RelationshipList({
  title, rels, side, leaves, sch, activityId, projectId,
}: {
  title: string; rels: ActivityRelationship[]; side: 'pred' | 'succ';
  leaves: ScheduleActivity[]; sch: ReturnType<typeof useSchedule>; activityId: string; projectId: string;
}) {
  const [other, setOther] = useState('');
  const [type, setType] = useState<RelType>('FS');
  const [lag, setLag] = useState(0);
  return (
    <Section title={title}>
      {rels.length === 0 && <div className="text-[11px] text-muted-foreground">None</div>}
      {rels.map(r => {
        const otherId = side === 'pred' ? r.pred_activity_id : r.succ_activity_id;
        const o = leaves.find(x => x.id === otherId);
        return (
          <div key={r.id} className="grid grid-cols-[1fr_70px_60px_24px] gap-1 items-center text-[11px] font-mono">
            <div className="truncate">{o?.activity_id || o?.name || '?'}</div>
            <Select value={r.rel_type} onValueChange={(v: any) => sch.updateRelationship.mutate({ id: r.id, rel_type: v })}>
              <SelectTrigger className="h-6 text-[11px] px-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['FS', 'SS', 'FF', 'SF'] as RelType[]).map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" defaultValue={Number(r.lag_days || 0)} className="h-6 text-[11px] px-1"
              onBlur={e => { const n = Number(e.target.value); if (n !== Number(r.lag_days)) sch.updateRelationship.mutate({ id: r.id, lag_days: n }); }} />
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sch.removeRelationship.mutate(r.id)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_70px_60px_28px] gap-1 pt-1 border-t border-border/40">
        <Select value={other} onValueChange={setOther}>
          <SelectTrigger className="h-6 text-[11px]"><SelectValue placeholder={`Add ${side === 'pred' ? 'predecessor' : 'successor'}…`} /></SelectTrigger>
          <SelectContent>
            {leaves.map(x => <SelectItem key={x.id} value={x.id} className="text-[11px] font-mono">{x.activity_id || x.wbs_code} — {x.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v: any) => setType(v)}>
          <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['FS', 'SS', 'FF', 'SF'] as RelType[]).map(t => <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" value={lag} onChange={e => setLag(Number(e.target.value))} className="h-6 text-[11px]" />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={!other}
          onClick={() => {
            sch.addRelationship.mutate({
              project_id: projectId,
              pred_activity_id: side === 'pred' ? other : activityId,
              succ_activity_id: side === 'pred' ? activityId : other,
              rel_type: type, lag_days: lag,
            });
            setOther(''); setLag(0);
          }}><Plus className="h-3 w-3" /></Button>
      </div>
    </Section>
  );
}
