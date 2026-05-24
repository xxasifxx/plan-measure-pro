import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Download, FileCode, CheckCircle2, AlertCircle, ClipboardCheck } from 'lucide-react';
import { parseP6Xml } from '@/lib/p6xml/parser';
import { applyDailyReportsToP6 } from '@/lib/p6xml/apply-progress';
import { downloadP6Xml, serializeP6Xml } from '@/lib/p6xml/serializer';
import { SAMPLE_DAILY_REPORTS, SAMPLE_P6_XML } from '@/lib/p6xml/sample';
import type { ActivityChange, ApprovedDailyReport, P6Tables } from '@/lib/p6xml/types';

export default function P6XmlDemo() {
  const [xmlText, setXmlText] = useState<string>(SAMPLE_P6_XML);
  const [reports] = useState<ApprovedDailyReport[]>(SAMPLE_DAILY_REPORTS);
  const [result, setResult] = useState<{ tables: P6Tables; changes: ActivityChange[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseline = useMemo(() => {
    try { return parseP6Xml(xmlText); } catch { return null; }
  }, [xmlText]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setXmlText(text);
    setResult(null);
    setError(null);
  };

  const runApply = () => {
    try {
      const tables = parseP6Xml(xmlText); // fresh parse so re-runs are clean
      const { changeLog } = applyDailyReportsToP6(tables, reports);
      setResult({ tables, changes: changeLog });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const exportXml = () => result && downloadP6Xml(result.tables);

  const updatedXmlPreview = useMemo(
    () => (result ? serializeP6Xml(result.tables).slice(0, 1800) : ''),
    [result],
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header className="border-b border-border/60 bg-card/40 sticky top-0 z-10 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/mcfa" className="text-xs tracking-widest text-muted-foreground hover:text-primary inline-flex items-center gap-2">
            <ArrowLeft className="h-3.5 w-3.5" /> BACK TO MCFA PITCH
          </Link>
          <span className="text-xs tracking-widest text-muted-foreground">·</span>
          <span className="text-xs tracking-widest text-primary">P6 XML ROUND-TRIP · LIVE</span>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl">
          <div className="text-[11px] tracking-widest text-primary mb-3">MODULE · INSPECTOR REPORTS → P6 UPDATE</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            One upload replaces ~40 P6 keystrokes per project per month.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Drop a Primavera <span className="text-foreground">PMXML</span> baseline. Pull in the
            <span className="text-foreground"> RE-approved daily reports</span>. Download an
            updated PMXML that re-imports cleanly into P6 Professional, EPPM, or Primavera Cloud
            with <em>Update existing project</em>. The scheduler's CPM recalc happens in P6 — we just stop
            asking the PM to retype Actual Start, Actual Finish, and %.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Badge variant="outline" className="font-mono">P6 Professional 22.x</Badge>
            <Badge variant="outline" className="font-mono">P6 EPPM</Badge>
            <Badge variant="outline" className="font-mono">Primavera Cloud</Badge>
            <Badge variant="outline" className="font-mono">No IT integration</Badge>
            <Badge variant="outline" className="font-mono">Browser-only</Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mt-12">
          {/* Pane 1 — Baseline PMXML */}
          <Card className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] tracking-widest text-primary">01 · BASELINE PMXML</div>
              <FileCode className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-xs">
                <span className="text-muted-foreground">Drop your contractor's PMXML export</span>
                <input type="file" accept=".xml" onChange={onUpload}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:font-mono file:text-[11px] file:cursor-pointer cursor-pointer" />
              </label>
              <Button variant="outline" size="sm" className="w-full font-mono text-[11px]"
                onClick={() => { setXmlText(SAMPLE_P6_XML); setResult(null); setError(null); }}>
                <Upload className="h-3.5 w-3.5" /> USE SAMPLE NJTA-104-0001
              </Button>
              {baseline && (
                <div className="text-[11px] text-muted-foreground border border-border/60 rounded p-3 space-y-1">
                  <div><span className="text-muted-foreground/60">Project:</span> <span className="text-foreground">{baseline.project.id}</span></div>
                  <div className="truncate">{baseline.project.name}</div>
                  <div><span className="text-muted-foreground/60">Data date:</span> {baseline.project.dataDate?.slice(0, 10)}</div>
                  <div><span className="text-muted-foreground/60">Activities:</span> {baseline.activities.length}</div>
                  {baseline.schemaVersion && <div><span className="text-muted-foreground/60">Schema:</span> Business_Objects_{baseline.schemaVersion}</div>}
                </div>
              )}
              {error && (
                <div className="text-[11px] text-red-400 border border-red-400/40 rounded p-3 flex gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          </Card>

          {/* Pane 2 — Approved daily reports */}
          <Card className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] tracking-widest text-primary">02 · RE-APPROVED DAILY REPORTS</div>
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-[10px] text-muted-foreground mb-3">
              {reports.length} approved rows · today these become ~40 manual P6 edits per project per month
            </div>
            <div className="border border-border/60 rounded overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1.5 font-normal">Date</th>
                    <th className="px-2 py-1.5 font-normal">Activity</th>
                    <th className="px-2 py-1.5 font-normal text-right">Cum / Total</th>
                    <th className="px-2 py-1.5 font-normal text-right">Done?</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-2 py-1.5">{r.date}</td>
                      <td className="px-2 py-1.5 text-foreground">{r.activityId}</td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground">{r.cumulativeQty} / {r.contractQty}</td>
                      <td className="px-2 py-1.5 text-right">{r.isComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-auto" /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={runApply} disabled={!baseline} className="w-full mt-4 font-mono text-[11px]">
              APPLY APPROVED PROGRESS →
            </Button>
          </Card>

          {/* Pane 3 — Updated PMXML */}
          <Card className="p-5 bg-card/40 border-border/60">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] tracking-widest text-primary">03 · UPDATED PMXML</div>
              <Download className="h-4 w-4 text-primary" />
            </div>
            {!result ? (
              <div className="text-[11px] text-muted-foreground border border-dashed border-border/60 rounded p-6 text-center">
                Apply progress to see the change log and download the P6-ready file.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 rounded p-2.5 flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{result.changes.length} activities updated · DataDate bumped to {result.tables.project.dataDate?.slice(0, 10)}</span>
                </div>
                <Button onClick={exportXml} className="w-full font-mono text-[11px]">
                  <Download className="h-3.5 w-3.5" /> DOWNLOAD {result.tables.project.id}_update.xml
                </Button>
                <div className="text-[10px] text-muted-foreground">
                  Import into P6 → <span className="text-foreground">File · Import · Primavera XML</span> →
                  match Project Id → <span className="text-foreground">Update Existing Project</span>.
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Change log + XML preview */}
        {result && (
          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <Card className="p-5 bg-card/40 border-border/60">
              <div className="text-[11px] tracking-widest text-primary mb-4">CHANGE LOG · WHAT P6 WILL SEE</div>
              <div className="border border-border/60 rounded overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-normal">Activity</th>
                      <th className="px-2 py-1.5 font-normal">Status</th>
                      <th className="px-2 py-1.5 font-normal text-right">% Complete</th>
                      <th className="px-2 py-1.5 font-normal text-right">Remain (hr)</th>
                      <th className="px-2 py-1.5 font-normal">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.changes.map(c => (
                      <tr key={c.activityId} className="border-t border-border/40 align-top">
                        <td className="px-2 py-1.5">
                          <div className="text-foreground">{c.activityId}</div>
                          <div className="text-muted-foreground text-[10px] leading-tight">{c.activityName}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="text-muted-foreground line-through text-[10px]">{c.beforeStatus}</div>
                          <div className="text-emerald-400">{c.afterStatus}</div>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          <div className="text-muted-foreground line-through text-[10px]">{c.beforePct ?? 0}%</div>
                          <div className="text-foreground">{c.afterPct}%</div>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          <div className="text-muted-foreground line-through text-[10px]">{c.beforeRemainHr ?? '—'}</div>
                          <div className="text-foreground">{c.afterRemainHr}</div>
                        </td>
                        <td className="px-2 py-1.5 text-[10px]">
                          {c.actualStartSet && <div className="text-emerald-400">+ Start {c.actualStartSet.slice(0,10)}</div>}
                          {c.actualFinishSet && <div className="text-emerald-400">+ Finish {c.actualFinishSet.slice(0,10)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5 bg-card/40 border-border/60">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] tracking-widest text-primary">OUTBOUND PMXML · PREVIEW</div>
                <span className="text-[10px] text-muted-foreground">first 1.8 kB</span>
              </div>
              <pre className="text-[10px] leading-relaxed text-muted-foreground bg-background/60 border border-border/60 rounded p-3 overflow-auto max-h-[480px]">
                {updatedXmlPreview}{updatedXmlPreview.length >= 1800 ? '\n…' : ''}
              </pre>
            </Card>
          </div>
        )}

        <div className="mt-12 max-w-3xl text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-foreground">Why this matters for MCFA T&amp;I:</span> the takeoff/inspection product already
          captures field quantities the RE has to sign off on. Until today that approval ended in
          Excel; the PM still hand-keyed every activity's actuals into P6 before the monthly update
          cycle. This module collapses that step into one upload and one download — and because the
          changes are surfaced as a diff first, the scheduler reviews before the file ever touches P6.
        </div>
      </section>
    </div>
  );
}
