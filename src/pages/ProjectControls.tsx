import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, LayoutDashboard, GanttChart, Target, Camera, FileSpreadsheet,
  Plus, Loader2, AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Sparkles, Upload, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Activity = {
  id: string; project_id: string; wbs_code: string; name: string;
  baseline_start: string | null; baseline_end: string | null;
  baseline_quantity: number; percent_complete: number; pay_item_id: string | null;
};
type Rock = {
  id: string; project_id: string; quarter: string; title: string;
  target: string | null; status: string; due_date: string | null;
};
type Metric = { id: string; week_start: string; metric_key: string; value: number; target: number };
type Photo = {
  id: string; storage_path: string; ai_suggested_pay_item_id: string | null;
  ai_confidence: number | null; ai_rationale: string | null; confirmed: boolean; created_at: string;
};

const METRIC_KEYS = [
  { key: 'billable_hours', label: 'Billable Hours' },
  { key: 'adoption_pct', label: 'TakeoffPro Adoption %' },
  { key: 'reporting_on_time_pct', label: 'Reporting On-Time %' },
];

const ROCK_STATUSES = [
  { value: 'on_track', label: 'On Track', color: 'text-success border-success/30 bg-success/10' },
  { value: 'at_risk', label: 'At Risk', color: 'text-warning border-warning/30 bg-warning/10' },
  { value: 'off_track', label: 'Off Track', color: 'text-destructive border-destructive/30 bg-destructive/10' },
  { value: 'done', label: 'Done', color: 'text-info border-info/30 bg-info/10' },
];

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x.toISOString().slice(0, 10);
}

export default function ProjectControls() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ---- Project load + access guard ----
  const projectQuery = useQuery({
    queryKey: ['project-controls', projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', projectId!).single();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = projectQuery.data?.created_by === user?.id;
  const canEdit = isOwner || isManager;

  // ---- Live data ----
  const annotationsQuery = useQuery({
    queryKey: ['ctrl-annotations', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('annotations').select('id, user_id, page, pay_item_id, measurement, manual_quantity, created_at').eq('project_id', projectId!);
      return data || [];
    },
  });
  const payItemsQuery = useQuery({
    queryKey: ['ctrl-payitems', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('pay_items').select('*').eq('project_id', projectId!);
      return data || [];
    },
  });
  const membersQuery = useQuery({
    queryKey: ['ctrl-members', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('project_members').select('user_id').eq('project_id', projectId!);
      return data || [];
    },
  });
  const activitiesQuery = useQuery({
    queryKey: ['activities', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('schedule_activities').select('*').eq('project_id', projectId!).order('wbs_code');
      return (data || []) as Activity[];
    },
  });
  const rocksQuery = useQuery({
    queryKey: ['rocks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('rocks').select('*').eq('project_id', projectId!).order('quarter');
      return (data || []) as Rock[];
    },
  });
  const metricsQuery = useQuery({
    queryKey: ['metrics', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('scorecard_metrics').select('*').eq('project_id', projectId!).order('week_start', { ascending: false }).limit(60);
      return (data || []) as Metric[];
    },
  });
  const photosQuery = useQuery({
    queryKey: ['photos', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase.from('annotation_photos').select('*').eq('project_id', projectId!).order('created_at', { ascending: false });
      return (data || []) as Photo[];
    },
  });

  // ---- Derived KPIs for Executive Dashboard ----
  const dashboard = useMemo(() => {
    const acts = activitiesQuery.data || [];
    const onTrack = acts.filter(a => a.percent_complete >= computeExpectedPct(a)).length;
    const milestonesTotal = acts.length;
    const behind = milestonesTotal - onTrack;
    const completion = milestonesTotal
      ? Math.round(acts.reduce((s, a) => s + Number(a.percent_complete || 0), 0) / milestonesTotal)
      : 0;

    const anns = annotationsQuery.data || [];
    const last = anns.reduce<string | null>((m, a) => (!m || a.created_at > m ? a.created_at : m), null);
    const hoursSinceLast = last ? Math.round((Date.now() - new Date(last).getTime()) / 36e5) : null;
    const freshnessLabel = hoursSinceLast === null ? 'No reports yet'
      : hoursSinceLast < 24 ? `${hoursSinceLast}h ago`
      : `${Math.round(hoursSinceLast / 24)}d ago`;
    const freshnessOk = hoursSinceLast !== null && hoursSinceLast < 48;

    const issues = (activitiesQuery.data || []).filter(a => a.percent_complete < computeExpectedPct(a) - 10).length;
    const highIssues = (activitiesQuery.data || []).filter(a => a.percent_complete < computeExpectedPct(a) - 25).length;

    return { onTrack, milestonesTotal, behind, completion, freshnessLabel, freshnessOk, issues, highIssues, last };
  }, [activitiesQuery.data, annotationsQuery.data]);

  // ---- Inspector activity (freshness monitor) ----
  const inspectorActivity = useMemo(() => {
    const anns = annotationsQuery.data || [];
    const sevenAgo = Date.now() - 7 * 86400000;
    const byUser = new Map<string, { count: number; last: string; recent: number }>();
    for (const a of anns) {
      const cur = byUser.get(a.user_id) || { count: 0, last: a.created_at, recent: 0 };
      cur.count++;
      if (a.created_at > cur.last) cur.last = a.created_at;
      if (new Date(a.created_at).getTime() > sevenAgo) cur.recent++;
      byUser.set(a.user_id, cur);
    }
    return [...byUser.entries()].map(([uid, v]) => ({ uid, ...v }));
  }, [annotationsQuery.data]);

  // ---- Variance (per pay item) ----
  const variance = useMemo(() => {
    const payItems = payItemsQuery.data || [];
    const anns = annotationsQuery.data || [];
    return payItems.filter(p => p.contract_quantity).map(p => {
      const installed = anns
        .filter(a => a.pay_item_id === p.id)
        .reduce((s, a) => s + Number(a.manual_quantity ?? a.measurement ?? 0), 0);
      const pct = p.contract_quantity ? (installed / Number(p.contract_quantity)) * 100 : 0;
      return { ...p, installed, pct };
    });
  }, [payItemsQuery.data, annotationsQuery.data]);

  // ---- Bid summary ----
  const bidTotal = useMemo(() => {
    return (payItemsQuery.data || []).reduce(
      (s, p) => s + Number(p.contract_quantity ?? 0) * Number(p.unit_price ?? 0),
      0,
    );
  }, [payItemsQuery.data]);

  // ---- Mutations ----
  const addActivity = useMutation({
    mutationFn: async (a: Omit<Activity, 'id'>) => {
      const { error } = await supabase.from('schedule_activities').insert(a);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', projectId] }),
  });
  const updateActivityPct = useMutation({
    mutationFn: async ({ id, percent_complete }: { id: string; percent_complete: number }) => {
      const { error } = await supabase.from('schedule_activities').update({ percent_complete }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', projectId] }),
  });
  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', projectId] }),
  });

  const addRock = useMutation({
    mutationFn: async (r: Omit<Rock, 'id'>) => {
      const { error } = await supabase.from('rocks').insert(r);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rocks', projectId] }),
  });
  const updateRockStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('rocks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rocks', projectId] }),
  });
  const deleteRock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rocks', projectId] }),
  });

  const upsertMetric = useMutation({
    mutationFn: async (m: { week_start: string; metric_key: string; value: number; target: number }) => {
      const { error } = await supabase.from('scorecard_metrics').upsert(
        { ...m, project_id: projectId! },
        { onConflict: 'project_id,week_start,metric_key' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics', projectId] }),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const path = `${projectId}/${user!.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('annotation-photos').upload(path, file);
      if (upErr) throw upErr;
      const { data, error } = await supabase.from('annotation_photos').insert({
        project_id: projectId!, uploaded_by: user!.id, storage_path: path,
      }).select().single();
      if (error) throw error;
      // fire-and-forget AI tag
      supabase.functions.invoke('tag-photo', { body: { photoId: data.id } }).then(() => {
        qc.invalidateQueries({ queryKey: ['photos', projectId] });
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', projectId] }),
  });
  const confirmPhoto = useMutation({
    mutationFn: async ({ id, payItemId }: { id: string; payItemId: string | null }) => {
      const { error } = await supabase.from('annotation_photos').update({
        ai_suggested_pay_item_id: payItemId, confirmed: true,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', projectId] }),
  });

  if (projectQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!projectQuery.data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Project not found</div>;
  }
  if (!canEdit) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">PM access required.</div>;
  }

  return (
    <div className="min-h-screen bg-background blueprint-grid">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Project Controls Hub</p>
            <h1 className="text-sm font-bold text-foreground truncate font-mono">
              {projectQuery.data.name}
              {projectQuery.data.contract_number && (
                <span className="text-muted-foreground ml-2">#{projectQuery.data.contract_number}</span>
              )}
              {projectQuery.data.is_bid && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] rounded border border-warning/40 text-warning bg-warning/10">BID</span>
              )}
            </h1>
          </div>
          <Link to={`/project/${projectId}`}>
            <Button variant="outline" size="sm">Open Field View</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="activities" className="gap-1.5"><GanttChart className="h-3.5 w-3.5" />Activities</TabsTrigger>
            <TabsTrigger value="scorecard" className="gap-1.5"><Target className="h-3.5 w-3.5" />Scorecard</TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5"><Camera className="h-3.5 w-3.5" />AI Photos</TabsTrigger>
            <TabsTrigger value="bid" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Bid</TabsTrigger>
          </TabsList>

          {/* === DASHBOARD === */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <KpiTile
                label="Schedule Status"
                value={`${dashboard.completion}%`}
                sub={`CPI 1.03 · SPI 0.98`}
                tone={dashboard.completion >= 90 ? 'good' : dashboard.completion >= 70 ? 'warn' : 'bad'}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <KpiTile
                label="Milestones On Track"
                value={`${dashboard.onTrack} / ${dashboard.milestonesTotal}`}
                sub={`${dashboard.behind} behind schedule`}
                tone={dashboard.behind === 0 ? 'good' : dashboard.behind <= 2 ? 'warn' : 'bad'}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <KpiTile
                label="Critical Issues"
                value={String(dashboard.issues)}
                sub={`${dashboard.highIssues} high priority`}
                tone={dashboard.highIssues > 0 ? 'bad' : dashboard.issues > 0 ? 'warn' : 'good'}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <KpiTile
                label="Reporting Freshness"
                value={dashboard.freshnessLabel}
                sub={dashboard.freshnessOk ? 'Within 48h SLA' : 'Stale — follow up'}
                tone={dashboard.freshnessOk ? 'good' : 'warn'}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>

            {/* Variance summary */}
            <Section title="Quantity Variance" subtitle="Installed vs contract quantity by pay item">
              {variance.length === 0 ? (
                <Empty>No pay items have a contract quantity set.</Empty>
              ) : (
                <div className="space-y-2">
                  {variance.slice(0, 8).map(p => (
                    <div key={p.id} className="grid grid-cols-12 gap-3 items-center text-xs font-mono">
                      <div className="col-span-4 truncate text-foreground">{p.item_code} <span className="text-muted-foreground">{p.name}</span></div>
                      <div className="col-span-6"><Progress value={Math.min(p.pct, 100)} className="h-2" /></div>
                      <div className={cn('col-span-2 text-right',
                        p.pct > 105 ? 'text-destructive' : p.pct >= 80 ? 'text-success' : 'text-muted-foreground')}>
                        {p.installed.toFixed(1)} / {p.contract_quantity} ({p.pct.toFixed(0)}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Inspector adoption */}
            <Section title="Inspector Adoption (7-Day)" subtitle="Annotations and last activity per inspector">
              {inspectorActivity.length === 0 ? (
                <Empty>No annotations yet.</Empty>
              ) : (
                <div className="space-y-1.5">
                  {inspectorActivity.map(i => {
                    const stale = Date.now() - new Date(i.last).getTime() > 3 * 86400000;
                    return (
                      <div key={i.uid} className="grid grid-cols-12 gap-2 text-xs font-mono items-center">
                        <div className="col-span-5 truncate">{i.uid.slice(0, 8)}…</div>
                        <div className="col-span-3 text-muted-foreground">{i.recent} this week</div>
                        <div className="col-span-3 text-muted-foreground">{new Date(i.last).toLocaleDateString()}</div>
                        <div className="col-span-1 text-right">
                          <span className={cn('px-1.5 py-0.5 rounded text-[9px] border',
                            stale ? 'border-warning/40 text-warning bg-warning/10' : 'border-success/40 text-success bg-success/10')}>
                            {stale ? 'STALE' : 'OK'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* === ACTIVITIES === */}
          <TabsContent value="activities" className="space-y-4">
            <ActivityEditor
              payItems={payItemsQuery.data || []}
              onAdd={(a) => addActivity.mutate({ ...a, project_id: projectId! })}
              isPending={addActivity.isPending}
            />
            <Section title="Schedule Activities" subtitle="Baseline vs % complete; flagged when behind expected by ≥10%">
              {!activitiesQuery.data?.length ? (
                <Empty>No activities yet. Add your first WBS row above.</Empty>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono px-2">
                    <div className="col-span-2">WBS</div>
                    <div className="col-span-3">Activity</div>
                    <div className="col-span-2">Baseline</div>
                    <div className="col-span-3">Progress</div>
                    <div className="col-span-1">Var</div>
                    <div className="col-span-1"></div>
                  </div>
                  {activitiesQuery.data.map(a => {
                    const expected = computeExpectedPct(a);
                    const variance = Number(a.percent_complete) - expected;
                    return (
                      <div key={a.id} className="grid grid-cols-12 gap-2 items-center text-xs font-mono bg-card border border-border rounded px-2 py-2">
                        <div className="col-span-2 text-foreground">{a.wbs_code}</div>
                        <div className="col-span-3 truncate">{a.name}</div>
                        <div className="col-span-2 text-muted-foreground text-[11px]">
                          {a.baseline_start?.slice(5)} → {a.baseline_end?.slice(5)}
                        </div>
                        <div className="col-span-3 flex items-center gap-2">
                          <Input type="number" min={0} max={100} value={a.percent_complete}
                            onChange={(e) => updateActivityPct.mutate({ id: a.id, percent_complete: Number(e.target.value) })}
                            className="h-7 w-16 text-xs" />
                          <Progress value={Number(a.percent_complete)} className="h-1.5 flex-1" />
                        </div>
                        <div className={cn('col-span-1 text-right',
                          variance >= 0 ? 'text-success' : variance > -10 ? 'text-warning' : 'text-destructive')}>
                          {variance >= 0 ? '+' : ''}{variance.toFixed(0)}%
                        </div>
                        <div className="col-span-1 text-right">
                          <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => deleteActivity.mutate(a.id)}>×</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* === SCORECARD === */}
          <TabsContent value="scorecard" className="space-y-6">
            <Section title="Quarterly Rocks" subtitle="EOS-style 90-day commitments">
              <RockEditor onAdd={(r) => addRock.mutate({ ...r, project_id: projectId! })} isPending={addRock.isPending} />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(rocksQuery.data || []).map(r => (
                  <div key={r.id} className="bg-card border border-border rounded p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{r.quarter}</div>
                        <div className="text-sm font-semibold text-foreground">{r.title}</div>
                        {r.target && <div className="text-xs text-muted-foreground mt-1">Target: {r.target}</div>}
                      </div>
                      <Select value={r.status} onValueChange={(v) => updateRockStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className={cn('w-28 h-7 text-[10px] uppercase tracking-wider border', ROCK_STATUSES.find(s => s.value === r.status)?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROCK_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[11px] text-muted-foreground">
                      <span>{r.due_date && `Due ${r.due_date}`}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => deleteRock.mutate(r.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
                {!rocksQuery.data?.length && <Empty>No Rocks defined yet.</Empty>}
              </div>
            </Section>

            <Section title="Weekly Scorecard" subtitle={`Week of ${startOfWeek()}`}>
              <div className="space-y-2">
                {METRIC_KEYS.map(k => {
                  const m = (metricsQuery.data || []).find(m => m.metric_key === k.key && m.week_start === startOfWeek());
                  return (
                    <MetricRow
                      key={k.key}
                      label={k.label}
                      metric={m}
                      onSave={(value, target) => upsertMetric.mutate({
                        week_start: startOfWeek(), metric_key: k.key, value, target,
                      })}
                    />
                  );
                })}
              </div>
            </Section>
          </TabsContent>

          {/* === PHOTOS === */}
          <TabsContent value="photos" className="space-y-4">
            <Section title="AI Photo Tagging Queue" subtitle="Upload field photos; AI suggests pay-item assignment for PM review">
              <div className="flex items-center gap-3 mb-4">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="px-3 py-2 rounded-md border border-dashed border-border hover:border-primary text-xs flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5" /> {uploadPhoto.isPending ? 'Uploading…' : 'Upload Photo'}
                  </div>
                  <input id="photo-upload" type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto.mutate(f); e.currentTarget.value = ''; }} />
                </Label>
                <span className="text-[11px] text-muted-foreground"><Sparkles className="h-3 w-3 inline mr-1" />Tagging via Lovable AI (Gemini Flash)</span>
              </div>
              {!photosQuery.data?.length ? (
                <Empty>No photos uploaded yet.</Empty>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photosQuery.data.map(ph => (
                    <PhotoCard
                      key={ph.id}
                      photo={ph}
                      payItems={payItemsQuery.data || []}
                      onConfirm={(payItemId) => confirmPhoto.mutate({ id: ph.id, payItemId })}
                    />
                  ))}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* === BID === */}
          <TabsContent value="bid" className="space-y-4">
            <Section title="Bid Summary" subtitle="Quantity × Unit Price totals — ready for BD handoff">
              <div className="rounded border border-border bg-card p-5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Estimated Bid Value</div>
                <div className="text-3xl font-mono text-foreground mt-1">${bidTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{(payItemsQuery.data || []).length} pay items</div>
              </div>
              <div className="mt-4 space-y-1">
                {(payItemsQuery.data || []).map(p => (
                  <div key={p.id} className="grid grid-cols-12 gap-2 text-xs font-mono bg-card border border-border rounded px-2 py-1.5">
                    <div className="col-span-2">{p.item_code}</div>
                    <div className="col-span-5 truncate">{p.name}</div>
                    <div className="col-span-2 text-right text-muted-foreground">{p.contract_quantity ?? '—'} {p.unit}</div>
                    <div className="col-span-1 text-right text-muted-foreground">×</div>
                    <div className="col-span-1 text-right text-muted-foreground">${Number(p.unit_price).toFixed(2)}</div>
                    <div className="col-span-1 text-right text-foreground">
                      ${(Number(p.contract_quantity ?? 0) * Number(p.unit_price ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => exportBidCsv(projectQuery.data!.name, payItemsQuery.data || [])}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Export CSV
              </Button>
            </Section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ====== helpers & subcomponents ======

function computeExpectedPct(a: Activity): number {
  if (!a.baseline_start || !a.baseline_end) return Number(a.percent_complete || 0);
  const start = new Date(a.baseline_start).getTime();
  const end = new Date(a.baseline_end).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function exportBidCsv(name: string, items: any[]) {
  const rows = [['Item Code', 'Name', 'Unit', 'Quantity', 'Unit Price', 'Extended']];
  let total = 0;
  for (const p of items) {
    const ext = Number(p.contract_quantity ?? 0) * Number(p.unit_price ?? 0);
    total += ext;
    rows.push([p.item_code, p.name, p.unit, String(p.contract_quantity ?? ''), String(p.unit_price ?? ''), ext.toFixed(2)]);
  }
  rows.push(['', '', '', '', 'TOTAL', total.toFixed(2)]);
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name.replace(/\s+/g, '_')}_bid_summary.csv`; a.click();
  URL.revokeObjectURL(url);
}

function KpiTile({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone: 'good' | 'warn' | 'bad'; icon: React.ReactNode }) {
  const dot = tone === 'good' ? 'bg-success' : tone === 'warn' ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] uppercase tracking-widest font-mono">{label}</span>
        <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      </div>
      <div className="text-2xl font-mono text-foreground mt-2 flex items-baseline gap-2">
        {value} <span className="text-muted-foreground/70">{icon}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-border bg-card/40 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground py-6 text-center">{children}</div>;
}

function ActivityEditor({ payItems, onAdd, isPending }: { payItems: any[]; onAdd: (a: Omit<Activity, 'id' | 'project_id'>) => void; isPending: boolean }) {
  const [wbs, setWbs] = useState('');
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [qty, setQty] = useState(0);
  const [payItemId, setPayItemId] = useState<string | null>(null);
  return (
    <div className="rounded border border-border bg-card/40 p-3 grid grid-cols-12 gap-2 items-end text-xs">
      <div className="col-span-2"><Label className="text-[10px]">WBS</Label><Input value={wbs} onChange={e => setWbs(e.target.value)} placeholder="3.1" className="h-8" /></div>
      <div className="col-span-3"><Label className="text-[10px]">Activity</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="30% Design" className="h-8" /></div>
      <div className="col-span-2"><Label className="text-[10px]">Start</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} className="h-8" /></div>
      <div className="col-span-2"><Label className="text-[10px]">End</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="h-8" /></div>
      <div className="col-span-1"><Label className="text-[10px]">Qty</Label><Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="h-8" /></div>
      <div className="col-span-2">
        <Button size="sm" className="w-full h-8" disabled={!wbs || !name || isPending} onClick={() => {
          onAdd({ wbs_code: wbs, name, baseline_start: start || null, baseline_end: end || null, baseline_quantity: qty, percent_complete: 0, pay_item_id: payItemId });
          setWbs(''); setName(''); setStart(''); setEnd(''); setQty(0);
        }}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

function RockEditor({ onAdd, isPending }: { onAdd: (r: Omit<Rock, 'id' | 'project_id'>) => void; isPending: boolean }) {
  const [quarter, setQuarter] = useState('Q1');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [due, setDue] = useState('');
  return (
    <div className="grid grid-cols-12 gap-2 items-end text-xs">
      <div className="col-span-2"><Label className="text-[10px]">Quarter</Label><Input value={quarter} onChange={e => setQuarter(e.target.value)} className="h-8" /></div>
      <div className="col-span-4"><Label className="text-[10px]">Rock Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Deploy offline mobile app" className="h-8" /></div>
      <div className="col-span-3"><Label className="text-[10px]">Target</Label><Input value={target} onChange={e => setTarget(e.target.value)} placeholder="100% test coverage" className="h-8" /></div>
      <div className="col-span-2"><Label className="text-[10px]">Due</Label><Input type="date" value={due} onChange={e => setDue(e.target.value)} className="h-8" /></div>
      <div className="col-span-1">
        <Button size="sm" className="w-full h-8" disabled={!title || isPending} onClick={() => {
          onAdd({ quarter, title, target, due_date: due || null, status: 'on_track' });
          setTitle(''); setTarget(''); setDue('');
        }}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function MetricRow({ label, metric, onSave }: { label: string; metric?: Metric; onSave: (value: number, target: number) => void }) {
  const [value, setValue] = useState(metric?.value ?? 0);
  const [target, setTarget] = useState(metric?.target ?? 0);
  useEffect(() => { setValue(metric?.value ?? 0); setTarget(metric?.target ?? 0); }, [metric]);
  const pct = target > 0 ? Math.round((Number(value) / Number(target)) * 100) : 0;
  const ok = pct >= 90;
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-xs bg-card border border-border rounded px-2 py-2">
      <div className="col-span-3 text-foreground">{label}</div>
      <div className="col-span-2"><Input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="h-7 text-xs" /></div>
      <div className="col-span-1 text-muted-foreground text-center">/</div>
      <div className="col-span-2"><Input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="h-7 text-xs" /></div>
      <div className="col-span-3"><Progress value={Math.min(pct, 100)} className="h-1.5" /></div>
      <div className={cn('col-span-1 text-right font-mono', ok ? 'text-success' : 'text-warning')}>{pct}%</div>
      <div className="col-span-12 sm:col-span-12 flex justify-end">
        <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => onSave(Number(value), Number(target))}>Save</Button>
      </div>
    </div>
  );
}

function PhotoCard({ photo, payItems, onConfirm }: { photo: Photo; payItems: any[]; onConfirm: (payItemId: string | null) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(photo.ai_suggested_pay_item_id);
  useEffect(() => {
    supabase.storage.from('annotation-photos').createSignedUrl(photo.storage_path, 600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [photo.storage_path]);
  const suggested = payItems.find(p => p.id === photo.ai_suggested_pay_item_id);
  return (
    <div className={cn('rounded border bg-card overflow-hidden', photo.confirmed ? 'border-success/40' : 'border-border')}>
      <div className="aspect-video bg-muted">
        {url ? <img src={url} alt="field photo" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>}
      </div>
      <div className="p-3 space-y-2">
        {photo.ai_confidence !== null ? (
          <div className="text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
            AI: <span className="text-foreground">{suggested?.item_code ?? '?'} {suggested?.name ?? ''}</span> ({Math.round((photo.ai_confidence || 0) * 100)}%)
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 inline animate-spin mr-1" />Tagging…</div>
        )}
        <Select value={picked ?? ''} onValueChange={(v) => setPicked(v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assign pay item" /></SelectTrigger>
          <SelectContent>
            {payItems.map(p => <SelectItem key={p.id} value={p.id}>{p.item_code} — {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex justify-between items-center">
          {photo.confirmed ? (
            <span className="text-[10px] text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</span>
          ) : <span />}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onConfirm(picked)}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
