import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Upload, Download, FileCode, CheckCircle2, AlertCircle,
  ClipboardCheck, Wand2, Loader2, Link2, Link2Off,
} from 'lucide-react';
import { parseP6Xml } from '@/lib/p6xml/parser';
import { applyDailyReportsToP6, loadApprovedDailyReports } from '@/lib/p6xml/apply-progress';
import { downloadP6Xml } from '@/lib/p6xml/serializer';
import type { ActivityChange, P6Tables } from '@/lib/p6xml/types';
import { useAuth } from '@/hooks/useAuth';
import { usePayItemActivityMap, useUpdatePayItemMapping, useBulkAutoMap } from '@/hooks/usePayItemActivityMap';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function P6Export() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data: project } = useQuery({
    queryKey: ['project-meta', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects').select('id, name, contract_number').eq('id', projectId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: payItems = [], isLoading: piLoading } = usePayItemActivityMap(projectId);
  const updateMap = useUpdatePayItemMapping(projectId);
  const bulkMap = useBulkAutoMap(projectId);

  const [xmlText, setXmlText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [result, setResult] = useState<{ tables: P6Tables; changes: ActivityChange[]; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Parse current PMXML for activity-id pool
  const baseline = useMemo(() => {
    if (!xmlText) return null;
    try { return parseP6Xml(xmlText); } catch { return null; }
  }, [xmlText]);

  const activityIds = useMemo(
    () => baseline ? Array.from(new Set(baseline.activities.map(a => a.id))).sort() : [],
    [baseline],
  );

  const activityIdSet = useMemo(() => new Set(activityIds), [activityIds]);

  // Approved totals per pay item (for at-a-glance preview)
  const { data: approvedTotals = new Map<string, { cumul: number; lastDate: string }>() } = useQuery({
    queryKey: ['approved-totals-map', projectId, asOfDate],
    enabled: !!projectId,
    queryFn: async () => {
      const reports = await loadApprovedDailyReports(projectId!, { asOfDate: asOfDate || undefined });
      const m = new Map<string, { cumul: number; lastDate: string }>();
      for (const r of reports) {
        const key = (r as any).payItemId as string;
        const cur = m.get(key);
        if (!cur || r.date > cur.lastDate) {
          m.set(key, { cumul: r.cumulativeQty, lastDate: r.date });
        }
      }
      return m;
    },
  });

  const mappedCount = payItems.filter(p => p.p6_activity_id).length;
  const mappedInXml = payItems.filter(p => p.p6_activity_id && activityIdSet.has(p.p6_activity_id!)).length;

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setXmlText(text);
    setResult(null);
    setError(null);
  };

  const onAutoMap = async () => {
    if (!baseline) return;
    const matches = payItems
      .filter(p => !p.p6_activity_id && activityIdSet.has(p.item_code))
      .map(p => ({ payItemId: p.id, activityId: p.item_code }));
    if (matches.length === 0) {
      toast({ title: 'Nothing to auto-map', description: 'No unmapped pay items match an Activity Id in this PMXML.' });
      return;
    }
    await bulkMap.mutateAsync({ matches });
  };

  const onRun = async () => {
    if (!projectId || !xmlText) return;
    setBusy(true);
    setError(null);
    try {
      const reports = await loadApprovedDailyReports(projectId, { asOfDate: asOfDate || undefined });
      if (reports.length === 0) throw new Error('No RE-approved daily reports found for this project yet.');
      const tables = parseP6Xml(xmlText);
      const presentIds = new Set(tables.activities.map(a => a.id));
      const skipped = Array.from(new Set(reports.filter(r => !presentIds.has(r.activityId)).map(r => r.activityId)));
      const { changeLog } = applyDailyReportsToP6(tables, reports);
      setResult({ tables, changes: changeLog, skipped });
      toast({
        title: 'Progress applied',
        description: `${changeLog.length} activit${changeLog.length === 1 ? 'y' : 'ies'} updated${skipped.length ? `, ${skipped.length} unmatched` : ''}.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast({ title: 'Apply failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const onDownload = () => {
    if (!result) return;
    const stamp = result.tables.project.dataDate?.slice(0, 10).replace(/-/g, '') || 'update';
    downloadP6Xml(result.tables, `${result.tables.project.id}_${stamp}_update.xml`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Button asChild><Link to="/auth">Sign in</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to={projectId ? `/project/${projectId}` : '/'}><ArrowLeft className="h-4 w-4 mr-1" />Back to takeoff</Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-mono font-bold tracking-wider uppercase">P6 XML Export</h1>
          </div>
          {project && <Badge variant="outline" className="font-mono text-[10px]">{project.contract_number || project.name}</Badge>}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">As of</label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => { setAsOfDate(e.target.value); setResult(null); }}
              className="h-8 text-xs w-[150px]"
              placeholder="latest"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Top three panes */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* 01 — Baseline */}
          <Card className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-mono tracking-widest text-primary">01 · BASELINE PMXML</div>
              <FileCode className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-xs">
                <span className="text-muted-foreground">Upload the contractor's PMXML export from P6</span>
                <input
                  type="file" accept=".xml" onChange={onUpload}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:font-mono file:text-[11px] file:cursor-pointer cursor-pointer"
                />
              </label>
              {baseline ? (
                <div className="text-[11px] text-muted-foreground border border-border/60 rounded p-3 space-y-1 font-mono">
                  <div className="truncate"><span className="text-muted-foreground/60">File:</span> <span className="text-foreground">{fileName}</span></div>
                  <div><span className="text-muted-foreground/60">Project Id:</span> <span className="text-foreground">{baseline.project.id}</span></div>
                  <div className="truncate">{baseline.project.name}</div>
                  <div><span className="text-muted-foreground/60">Data date:</span> {baseline.project.dataDate?.slice(0, 10) || '—'}</div>
                  <div><span className="text-muted-foreground/60">Activities:</span> {baseline.activities.length}</div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground border border-dashed border-border/60 rounded p-4 text-center">
                  Drop a .xml file to see project + activity counts.
                </div>
              )}
            </div>
          </Card>

          {/* 02 — Mapping coverage */}
          <Card className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-mono tracking-widest text-primary">02 · PAY ITEM → ACTIVITY MAPPING</div>
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            {piLoading ? (
              <div className="flex items-center justify-center p-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border border-border/60 rounded p-2">
                    <div className="text-lg font-mono font-bold">{payItems.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pay items</div>
                  </div>
                  <div className="border border-border/60 rounded p-2">
                    <div className="text-lg font-mono font-bold text-primary">{mappedCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mapped</div>
                  </div>
                  <div className="border border-border/60 rounded p-2">
                    <div className={cn('text-lg font-mono font-bold', mappedInXml === mappedCount ? 'text-emerald-400' : 'text-amber-400')}>
                      {mappedInXml}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">In this PMXML</div>
                  </div>
                </div>
                <Button
                  onClick={onAutoMap}
                  disabled={!baseline || bulkMap.isPending}
                  variant="outline" size="sm" className="w-full font-mono text-[11px]"
                >
                  {bulkMap.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                  AUTO-MAP BY ITEM CODE
                </Button>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Auto-map fills in unmapped pay items where the item code (e.g. <span className="font-mono text-foreground">201-0006</span>)
                  literally matches an Activity Id in the uploaded PMXML. Override manually in the table below.
                </p>
              </div>
            )}
          </Card>

          {/* 03 — Run */}
          <Card className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-mono tracking-widest text-primary">03 · APPLY & DOWNLOAD</div>
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="space-y-3">
              <Button
                onClick={onRun}
                disabled={!baseline || !projectId || busy || mappedInXml === 0}
                className="w-full font-mono text-[11px]"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />}
                APPLY APPROVED PROGRESS
              </Button>
              {result && (
                <Button onClick={onDownload} variant="default" className="w-full font-mono text-[11px]">
                  <Download className="h-3.5 w-3.5 mr-1.5" /> DOWNLOAD UPDATED PMXML
                </Button>
              )}
              {error && (
                <div className="text-[11px] text-destructive border border-destructive/40 rounded p-2.5 flex gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {error}
                </div>
              )}
              {result && !error && (
                <div className="text-[11px] text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 rounded p-2.5 flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    {result.changes.length} updated · DataDate {result.tables.project.dataDate?.slice(0, 10)}
                    {result.skipped.length > 0 && <> · {result.skipped.length} unmatched</>}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Import into P6 → <span className="text-foreground">File · Import · Primavera XML</span> →
                match Project Id → <span className="text-foreground">Update Existing Project</span>.
              </p>
            </div>
          </Card>
        </div>

        {/* Mapping table */}
        <Card className="p-0 bg-card/40 border-border/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="text-xs font-mono uppercase tracking-wider">Pay items & approved totals</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {payItems.length} item{payItems.length === 1 ? '' : 's'} · {approvedTotals.size} with approved quantities
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-4 py-2">Pay item</th>
                  <th className="text-left font-medium px-3 py-2">P6 Activity Id</th>
                  <th className="text-right font-medium px-3 py-2">Approved cumul.</th>
                  <th className="text-right font-medium px-3 py-2">Contract</th>
                  <th className="text-right font-medium px-4 py-2">Last approved</th>
                </tr>
              </thead>
              <tbody>
                {piLoading ? (
                  <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" /></td></tr>
                ) : payItems.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No pay items in this project yet.</td></tr>
                ) : payItems.map(pi => {
                  const totals = approvedTotals.get(pi.id);
                  const mapped = pi.p6_activity_id || '';
                  const inXml = mapped ? activityIdSet.has(mapped) : false;
                  return (
                    <tr key={pi.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-2">
                        <div className="font-semibold">{pi.item_code}</div>
                        <div className="text-[11px] text-muted-foreground font-sans truncate max-w-[280px]">{pi.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            list={activityIds.length ? 'p6-activity-ids' : undefined}
                            value={mapped}
                            placeholder={baseline ? 'Pick or type…' : '—'}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              updateMap.mutate({ payItemId: pi.id, activityId: v || null });
                            }}
                            className="h-7 text-xs w-[180px]"
                          />
                          {mapped && (
                            baseline ? (
                              inXml
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                : <span title="Not present in uploaded PMXML"><AlertCircle className="h-3.5 w-3.5 text-amber-400" /></span>
                            ) : <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {mapped && (
                            <button
                              title="Clear mapping"
                              onClick={() => updateMap.mutate({ payItemId: pi.id, activityId: null })}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Link2Off className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="text-right px-3 py-2">
                        {totals ? <span className="text-foreground">{totals.cumul.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pi.unit}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="text-right px-3 py-2 text-muted-foreground">
                        {pi.contract_quantity != null ? `${Number(pi.contract_quantity).toLocaleString()} ${pi.unit}` : '—'}
                      </td>
                      <td className="text-right px-4 py-2 text-muted-foreground">
                        {totals?.lastDate || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {activityIds.length > 0 && (
            <datalist id="p6-activity-ids">
              {activityIds.map(id => <option key={id} value={id} />)}
            </datalist>
          )}
        </Card>

        {/* Change log */}
        {result && (
          <Card className="p-0 bg-card/40 border-border/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-mono uppercase tracking-wider">
              Change log · what P6 will see ({result.changes.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-4 py-2">Activity</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-right font-medium px-3 py-2">% Complete</th>
                    <th className="text-right font-medium px-3 py-2">Remaining (hr)</th>
                    <th className="text-left font-medium px-4 py-2">Actuals set</th>
                  </tr>
                </thead>
                <tbody>
                  {result.changes.map(c => (
                    <tr key={c.activityId} className="border-b border-border/40 last:border-0 align-top">
                      <td className="px-4 py-2">
                        <div className="font-semibold">{c.activityId}</div>
                        <div className="text-[11px] text-muted-foreground font-sans truncate max-w-md">{c.activityName}</div>
                        <div className="text-[10px] text-muted-foreground">{c.sourceReports} approved report{c.sourceReports === 1 ? '' : 's'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-muted-foreground line-through text-[10px]">{c.beforeStatus ?? '—'}</div>
                        <div className="text-emerald-400">{c.afterStatus}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="text-muted-foreground line-through text-[10px]">{c.beforePct ?? 0}%</div>
                        <div>{c.afterPct}%</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="text-muted-foreground line-through text-[10px]">{c.beforeRemainHr ?? '—'}</div>
                        <div>{c.afterRemainHr}</div>
                      </td>
                      <td className="px-4 py-2 text-[10px] text-emerald-400">
                        {c.actualStartSet && <div>+ Start {c.actualStartSet.slice(0,10)}</div>}
                        {c.actualFinishSet && <div>+ Finish {c.actualFinishSet.slice(0,10)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.skipped.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-amber-500/5 text-[11px] text-amber-400 font-mono">
                <AlertCircle className="h-3.5 w-3.5 inline mr-1.5" />
                Skipped {result.skipped.length} approved activit{result.skipped.length === 1 ? 'y' : 'ies'} not present in this PMXML:&nbsp;
                <span className="text-muted-foreground">{result.skipped.slice(0, 10).join(', ')}{result.skipped.length > 10 ? '…' : ''}</span>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
