import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronRight, ChevronDown, Upload, FileCode2, CheckCircle2, XCircle, Copy, Download,
  AlertTriangle, FolderTree, FileSearch, Activity, Search, ArrowLeft, Sparkles,
  TrendingUp, DollarSign, Mail, Layers, Gauge,
} from 'lucide-react';
import { XerLensTour, type TourStep } from '@/components/XerLensTour';
import { toast } from '@/hooks/use-toast';
import { parseXer } from '@/lib/xer/parser';
import { runDcma, dcmaSummary, type DcmaResult } from '@/lib/xer/dcma';
import { buildTia, type DelayType } from '@/lib/xer/tia';
import { buildWbsTree, checkNjdotMilestones, complianceSnapshot, type WbsNode } from '@/lib/xer/wbs';
import { buildReMemo } from '@/lib/xer/feedback';
import { downloadMemoPdf, downloadMemoDoc } from '@/lib/xer/memo-export';
import { compareProgress, chartRows, type ProgressReport } from '@/lib/xer/progress';
import { svgContainerToPng, downloadDataUrl } from '@/lib/xer/chart-export';
import { AACE_CLASSES, accuracyBand, type AaceClass } from '@/lib/xer/aace';
import { SAMPLE_XER } from '@/lib/xer/sample';
import { SAMPLE_XER_UPDATE } from '@/lib/xer/sample-update';
import type { XerTables } from '@/lib/xer/types';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';

type TabKey = 'dcma' | 'progress' | 'tia' | 'wbs' | 'aace' | 'files';

const XerDemo = () => {
  const [tables, setTables] = useState<XerTables | null>(null);
  const [updateTables, setUpdateTables] = useState<XerTables | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [tab, setTab] = useState<TabKey>('dcma');
  const [tourOpen, setTourOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'XerLens · CPM Scheduler Workflow Demo · MCFA';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Six modules covering the weekly CPM Scheduler/Estimator workflow: DCMA-14 audit, RE feedback memo, progress vs baseline (SPI/CPI), NJDOT WBS, TIA fragnet, AACE Class 5→1 progression.';
    if (meta) meta.setAttribute('content', desc); else {
      const m = document.createElement('meta'); m.name = 'description'; m.content = desc;
      document.head.appendChild(m);
    }
    try {
      if (!localStorage.getItem('xerlens.tour.seen.v2')) {
        setTimeout(() => setTourOpen(true), 600);
        localStorage.setItem('xerlens.tour.seen.v2', '1');
      }
    } catch {}
  }, []);

  const startTour = () => {
    if (!tables) ingest(SAMPLE_XER, 'NJTA-MP123-BASELINE.xer');
    setTourOpen(true);
  };

  const ingest = (text: string, name: string) => {
    try {
      const t = parseXer(text);
      if (!t.TASK.length) { toast({ title: 'No TASK rows found', variant: 'destructive' }); return; }
      setTables(t);
      setFilename(name);
      toast({ title: 'XER parsed', description: `${t.TASK.length} activities · ${t.TASKPRED.length} relationships · ${t.PROJWBS.length} WBS nodes.` });
    } catch (e) {
      toast({ title: 'Parse failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    ingest(text, file.name);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const loadSample = () => ingest(SAMPLE_XER, 'NJTA-MP123-BASELINE.xer');
  const loadUpdate = () => {
    const t = parseXer(SAMPLE_XER_UPDATE);
    setUpdateTables(t);
    toast({ title: '60-day update loaded', description: 'Compare against the baseline in Module B · Progress.' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono antialiased">
      {/* Top ribbon */}
      <div className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-muted-foreground tracking-widest">XERLENS · THE WEEKLY SCHEDULER WORKFLOW · IN-BROWSER</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={startTour} data-tour="tour-button">
              <Sparkles className="h-3.5 w-3.5" /> Take the tour
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/mcfa"><ArrowLeft className="h-3.5 w-3.5" /> Back to pitch</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero / dropzone */}
      <section className="border-b border-border/60 py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="text-[11px] tracking-[0.25em] text-cyan-400 mb-3">WHAT THIS ROLE DOES EVERY MONDAY MORNING</div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              A contractor submits an <span className="text-cyan-400">.xer</span>.
              <span className="block text-muted-foreground/80 text-xl md:text-2xl mt-3 font-normal">
                The CPM Scheduler audits it, writes a memo to the Resident Engineer, updates progress vs baseline,
                rolls into the portfolio, and progresses the AACE estimate — before lunch.
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
              Six modules below mirror the recurring deliverables of the role per NJDOT Standard Specification 108-03 and
              AACE 98R-18. Nothing uploads — the parser runs entirely in this tab.
            </p>
          </div>

          <div
            data-tour="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mt-10 border-2 border-dashed border-border hover:border-cyan-500/60 transition-colors rounded-md p-10 text-center bg-card/30"
          >
            <Upload className="h-8 w-8 mx-auto text-cyan-400 mb-3" />
            <div className="text-sm text-muted-foreground mb-5">Drag a contractor <span className="text-foreground">.xer</span> file here, or</div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => fileInput.current?.click()}>
                <FileCode2 className="h-4 w-4" /> Choose .xer file
              </Button>
              <Button variant="outline" onClick={loadSample}>Load sample NJTA baseline</Button>
            </div>
            <input ref={fileInput} type="file" accept=".xer,text/plain" hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            {filename && (
              <div className="mt-6 text-xs text-cyan-400">Loaded: <span className="font-mono">{filename}</span></div>
            )}
          </div>
        </div>
      </section>

      {/* Portfolio rollup strip */}
      {tables && (
        <PortfolioStrip activeName={filename || tables.PROJECT[0]?.proj_short_name || 'Active project'} tables={tables} />
      )}

      {/* Modules */}
      {tables && (
        <section className="py-10">
          <div className="container mx-auto px-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full h-auto" data-tour="tabs">
                <TabsTrigger value="dcma" className="py-3 flex-col gap-1" data-tour="tab-dcma">
                  <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> A · Audit</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">DCMA-14</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="py-3 flex-col gap-1" data-tour="tab-progress">
                  <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> B · Update</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">SPI / CPI</span>
                </TabsTrigger>
                <TabsTrigger value="tia" className="py-3 flex-col gap-1" data-tour="tab-tia">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> C · Defend</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">TIA · 108-03</span>
                </TabsTrigger>
                <TabsTrigger value="wbs" className="py-3 flex-col gap-1" data-tour="tab-wbs">
                  <span className="flex items-center gap-2"><FolderTree className="h-4 w-4" /> D · Comply</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">NJDOT WBS</span>
                </TabsTrigger>
                <TabsTrigger value="aace" className="py-3 flex-col gap-1" data-tour="tab-aace">
                  <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> E · Estimate</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">AACE 5→1</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="py-3 flex-col gap-1" data-tour="tab-files">
                  <span className="flex items-center gap-2"><FileSearch className="h-4 w-4" /> F · File</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">ISO 19650</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dcma" className="mt-6" data-tour="panel-dcma"><DcmaPanel tables={tables} /></TabsContent>
              <TabsContent value="progress" className="mt-6" data-tour="panel-progress">
                <ProgressPanel baseline={tables} update={updateTables} onLoadUpdate={loadUpdate} />
              </TabsContent>
              <TabsContent value="tia" className="mt-6" data-tour="panel-tia"><TiaPanel tables={tables} /></TabsContent>
              <TabsContent value="wbs" className="mt-6" data-tour="panel-wbs"><WbsPanel tables={tables} /></TabsContent>
              <TabsContent value="aace" className="mt-6" data-tour="panel-aace"><AacePanel /></TabsContent>
              <TabsContent value="files" className="mt-6" data-tour="panel-files"><FileExplorerPanel /></TabsContent>
            </Tabs>
          </div>
        </section>
      )}

      {!tables && (
        <section className="py-16 border-t border-border/60 bg-card/20">
          <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'A · Audit (DCMA-14)', body: 'Run the 14-point industry health check on every contractor submission. One-click "Generate RE feedback memo" produces the artifact you actually send.' },
              { title: 'B · Update (Progress vs Baseline)', body: 'SPI, CPI, % complete, top-10 slipping activities — calculated from a baseline + monthly update XER pair.' },
              { title: 'C · Defend (TIA · NJDOT 108-03)', body: 'Type a delay note. Get a fragnet (FS, zero lag) plus a draft 108-03 narrative ready for the EOT letter.' },
              { title: 'D · Comply (NJDOT WBS)', body: 'Cross-reference WBS against required NJDOT milestones (M100, M500, M950). Flag negative lags + open ends.' },
              { title: 'E · Estimate (AACE 98R-18)', body: 'Progress the project estimate from Class 5 → Class 1, narrowing the accuracy band as design matures.' },
              { title: 'F · File (ISO 19650 explorer)', body: 'Drop any RFI, IDR, drawing, or schedule. Auto-tag with discipline, status, and ISO 19650 code.' },
            ].map(c => (
              <Card key={c.title} className="p-5 bg-card/40 border-border/60">
                <div className="font-semibold mb-2 text-foreground">{c.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <XerLensTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onTabChange={(t) => setTab(t as TabKey)}
        steps={tourSteps}
      />
    </div>
  );
};

/* tourSteps moved inside the component below — they need access to ingest/loadUpdate/setTab */

/* ─────────────────────  PORTFOLIO ROLLUP STRIP  ───────────────────── */
const PortfolioStrip = ({ activeName, tables }: { activeName: string; tables: XerTables }) => {
  const dcmaScore = useMemo(() => {
    const r = runDcma(tables);
    return Math.round((r.filter(x => x.pass).length / r.length) * 100);
  }, [tables]);
  const totalTasks = tables.TASK.length;
  const complete = tables.TASK.filter(t => t.status_code === 'TK_Complete').length;
  const pct = totalTasks ? Math.round((complete / totalTasks) * 100) : 0;

  const portfolio = [
    { name: activeName, agency: 'NJTA · Active', dcma: dcmaScore, pct, spi: 1.00, float: 0, active: true },
    { name: 'EWR Terminal A · Apron Rehab', agency: 'PANYNJ', dcma: 92, pct: 47, spi: 0.96, float: -3, active: false },
    { name: 'GSP MP 145 · Bridge Deck', agency: 'NJTA',  dcma: 88, pct: 22, spi: 1.02, float: 12, active: false },
    { name: 'Pulaski Skyway · Section C', agency: 'NJDOT', dcma: 79, pct: 71, spi: 0.91, float: -8, active: false },
  ];

  return (
    <section className="border-b border-border/60 bg-card/30 py-5">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <div className="text-[11px] tracking-[0.25em] text-cyan-400">PORTFOLIO ROLLUP · NEWARK / PANYNJ STUB</div>
          <div className="text-[10px] text-muted-foreground ml-auto">Sample data — wire to your projects table to make this live.</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {portfolio.map(p => (
            <div key={p.name} className={`rounded-md border p-3 ${p.active ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-border bg-background/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-foreground truncate font-semibold">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground tracking-widest mt-0.5">{p.agency}</div>
                </div>
                {p.active && <span className="text-[9px] text-cyan-400 tracking-widest">ACTIVE</span>}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                <Mini2 label="DCMA" value={`${p.dcma}%`} good={p.dcma >= 90} />
                <Mini2 label="DONE" value={`${p.pct}%`} />
                <Mini2 label="SPI"  value={p.spi.toFixed(2)} good={p.spi >= 0.95} />
                <Mini2 label="FLT"  value={`${p.float}d`} good={p.float >= 0} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Mini2 = ({ label, value, good }: { label: string; value: string; good?: boolean }) => (
  <div>
    <div className={`text-sm font-mono ${good === undefined ? 'text-foreground' : good ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</div>
    <div className="text-[9px] tracking-widest text-muted-foreground">{label}</div>
  </div>
);

/* ─────────────────────────  MODULE A: DCMA  ───────────────────────── */
const DcmaPanel = ({ tables }: { tables: XerTables }) => {
  const results = useMemo(() => runDcma(tables), [tables]);
  const [openCheck, setOpenCheck] = useState<string | null>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  const memo = useMemo(() => buildReMemo(tables, results), [tables, results]);
  const passed = results.filter(r => r.pass).length;
  const score = Math.round((passed / results.length) * 100);

  const copySummary = () => {
    navigator.clipboard.writeText(dcmaSummary(results));
    toast({ title: 'Summary copied', description: 'Paste into your schedule review email.' });
  };
  const copyMemo = () => {
    navigator.clipboard.writeText(memo);
    toast({ title: 'RE feedback memo copied', description: 'Paste into your email to the Resident Engineer.' });
  };
  const baseFn = `RE-feedback-${tables.PROJECT[0]?.proj_short_name || 'project'}`;
  const onPdf = () => {
    downloadMemoPdf(memo, `${baseFn}.pdf`);
    toast({ title: 'Memo downloaded', description: `${baseFn}.pdf` });
  };
  const onDoc = () => {
    downloadMemoDoc(memo, `${baseFn}.doc`);
    toast({ title: 'Memo downloaded', description: `${baseFn}.doc — opens in Word & Google Docs` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="text-[11px] tracking-widest text-muted-foreground">OVERALL DCMA-14 SCORE</div>
          <div className="text-4xl font-bold mt-1">
            <span className={score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-destructive'}>{score}%</span>
            <span className="text-muted-foreground text-base font-normal ml-2">{passed}/{results.length} checks pass</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copySummary}><Copy className="h-4 w-4" /> Copy summary</Button>
          <Button onClick={() => setMemoOpen(o => !o)}>
            <Mail className="h-4 w-4" /> {memoOpen ? 'Hide' : 'Generate'} RE feedback memo
          </Button>
        </div>
      </div>

      {memoOpen && (
        <Card className="p-5 bg-card/40 border-cyan-500/40">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="text-[11px] tracking-widest text-cyan-400">DRAFT MEMO TO RESIDENT ENGINEER · READY TO PASTE</div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={copyMemo}><Copy className="h-3.5 w-3.5" /> Copy</Button>
              <Button size="sm" variant="outline" onClick={onPdf}><Download className="h-3.5 w-3.5" /> PDF</Button>
              <Button size="sm" onClick={onDoc}><Download className="h-3.5 w-3.5" /> DOCX</Button>
            </div>
          </div>
          <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-96 overflow-y-auto">{memo}</pre>
        </Card>
      )}

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60">
            <tr className="text-left">
              <th className="p-3 border-b border-border">#</th>
              <th className="p-3 border-b border-border">Check</th>
              <th className="p-3 border-b border-border">Target</th>
              <th className="p-3 border-b border-border text-right">Result</th>
              <th className="p-3 border-b border-border text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const open = openCheck === r.id;
              const offenders = r.failingTaskIds.slice(0, 50)
                .map(id => tables.TASK.find(t => t.task_id === id))
                .filter(Boolean);
              return (
                <>
                  <tr key={r.id} className="border-b border-border hover:bg-card/40 cursor-pointer"
                      onClick={() => setOpenCheck(open ? null : r.id)}>
                    <td className="p-3 text-muted-foreground">{String(i + 1).padStart(2, '0')}</td>
                    <td className="p-3">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{r.target}</td>
                    <td className="p-3 text-right font-mono">{r.metric}</td>
                    <td className="p-3 text-center">
                      {r.pass
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" />
                        : <XCircle className="h-5 w-5 text-destructive mx-auto" />}
                    </td>
                  </tr>
                  {open && offenders.length > 0 && (
                    <tr key={`${r.id}-detail`} className="bg-card/20 border-b border-border">
                      <td colSpan={5} className="p-4">
                        <div className="text-[11px] tracking-widest text-cyan-400 mb-2">
                          OFFENDERS ({r.failingTaskIds.length}{r.failingTaskIds.length > 50 ? ', showing first 50' : ''})
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs">
                          {offenders.map(t => t && (
                            <div key={t.task_id} className="border border-border/60 rounded-sm px-2 py-1.5 bg-background">
                              <span className="text-cyan-400 font-mono">{t.task_code}</span> · {t.task_name}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ──────────────  MODULE B: PROGRESS vs BASELINE  ────────────── */
function buildProgressSummaryPdf(opts: {
  projName: string;
  report: ProgressReport;
  fmt: (d?: string) => string;
  chartPng: string | null;
  interpretation: string;
}) {
  const { projName, report, fmt, chartPng, interpretation } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 54;
  let y = M;

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Progress vs Baseline — Summary Report', M, y); y += 22;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Project: ${projName}`, M, y); y += 14;
  doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, M, y); y += 18;
  doc.setTextColor(0);

  // KPI strip
  const kpis: Array<[string, string]> = [
    ['SPI', report.spi.toFixed(2)],
    ['CPI (proxy)', report.cpi.toFixed(2)],
    ['% Complete', `${report.pctComplete.toFixed(0)}%`],
    ['Forecast Variance', `${report.forecastVarianceDays >= 0 ? '+' : ''}${report.forecastVarianceDays}d`],
  ];
  const kpiW = (pageW - M * 2) / kpis.length;
  doc.setDrawColor(200);
  kpis.forEach(([label, value], i) => {
    const x = M + i * kpiW;
    doc.rect(x, y, kpiW - 6, 50);
    doc.setFontSize(8); doc.setTextColor(110);
    doc.text(label.toUpperCase(), x + 8, y + 14);
    doc.setFontSize(16); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
    doc.text(value, x + 8, y + 36);
    doc.setFont('helvetica', 'normal');
  });
  y += 64;

  doc.setFontSize(10); doc.setTextColor(0);
  doc.text(`Interpretation: ${interpretation}`, M, y); y += 16;
  doc.setTextColor(110); doc.setFontSize(9);
  doc.text(`Baseline finish: ${fmt(report.baselineFinish)}    Forecast finish: ${fmt(report.forecastFinish)}`, M, y);
  y += 18; doc.setTextColor(0);

  // Chart image
  if (chartPng) {
    const props = doc.getImageProperties(chartPng);
    const imgW = pageW - M * 2;
    const imgH = (props.height / props.width) * imgW;
    if (y + imgH > pageH - M) { doc.addPage(); y = M; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Baseline vs 60-day update — finish-date variance', M, y); y += 14;
    doc.setFont('helvetica', 'normal');
    doc.addImage(chartPng, 'PNG', M, y, imgW, imgH);
    y += imgH + 16;
  }

  // Top slipping table
  if (y + 40 > pageH - M) { doc.addPage(); y = M; }
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Top slipping activities', M, y); y += 14;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const headers = ['Code', 'Activity', 'Baseline', 'Forecast', 'Slip', '% Done'];
  const widths = [60, pageW - M * 2 - 60 - 70 - 70 - 40 - 40, 70, 70, 40, 40];
  const drawRow = (cells: string[], bold = false) => {
    if (y > pageH - M) { doc.addPage(); y = M; }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    let x = M;
    cells.forEach((c, i) => {
      const w = widths[i];
      const text = doc.splitTextToSize(c, w - 4)[0];
      doc.text(text, x + 2, y);
      x += w;
    });
    y += 12;
  };
  drawRow(headers, true);
  doc.setDrawColor(220); doc.line(M, y - 8, pageW - M, y - 8);
  report.topSlipping.slice(0, 15).forEach(v => {
    drawRow([
      v.task_code,
      v.task_name,
      fmt(v.baselineFinish),
      fmt(v.updateFinish),
      `+${v.finishVarianceDays}d`,
      `${v.pctComplete.toFixed(0)}%`,
    ]);
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`XerLens · Progress vs Baseline · Page ${i} / ${pageCount}`, M, pageH - 24);
  }

  doc.save(`progress-summary-${projName}.pdf`);
}

const ProgressPanel = ({ baseline, update, onLoadUpdate }: {
  baseline: XerTables; update: XerTables | null; onLoadUpdate: () => void;
}) => {
  if (!update) {
    return (
      <Card className="p-8 bg-card/40 border-border/60 text-center">
        <Gauge className="h-8 w-8 mx-auto text-cyan-400 mb-3" />
        <div className="text-lg font-semibold mb-2">Compare a monthly update against the baseline</div>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-5">
          Drop a second .xer (next month's status submission) to compute SPI, CPI, top-10 slipping activities, and the
          forecast-finish variance — the recurring deliverable for every monthly progress payment per NJDOT 108-03.
        </p>
        <Button onClick={onLoadUpdate}>Load sample 60-day update</Button>
      </Card>
    );
  }
  const report = compareProgress(baseline, update);
  const fmt = (d?: string) => d ? d.slice(0, 10) : '—';
  const anchor = baseline.PROJECT[0]?.last_recalc_date || baseline.PROJECT[0]?.plan_start_date;
  const rows = chartRows(report, anchor, 12);
  const updateAnchorOffset = (() => {
    if (!anchor || !update.PROJECT[0]?.last_recalc_date) return null;
    return Math.round(
      (new Date(update.PROJECT[0].last_recalc_date).getTime() - new Date(anchor).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  })();
  const interpretation = report.spi >= 0.95
    ? { tone: 'good', text: 'Performing to plan — no recovery action required.' }
    : report.spi >= 0.85
      ? { tone: 'warn', text: 'Slipping — corrective action plan due in next L10.' }
      : { tone: 'bad',  text: 'Material slippage — recovery schedule and TIA required.' };
  const toneCls = interpretation.tone === 'good'
    ? 'text-emerald-400'
    : interpretation.tone === 'warn' ? 'text-amber-400' : 'text-destructive';
  const topLags = report.topSlipping.slice(0, 3);
  const scrollToRow = (taskId: string) => {
    const el = document.getElementById(`slip-row-${taskId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400'), 1600);
    }
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const projName = baseline.PROJECT[0]?.proj_short_name || 'project';

  const exportChartPng = async () => {
    if (!chartRef.current) return;
    try {
      const png = await svgContainerToPng(chartRef.current, 2);
      downloadDataUrl(png, `progress-chart-${projName}.png`);
      toast({ title: 'Chart exported', description: `progress-chart-${projName}.png` });
    } catch (e) {
      toast({ title: 'Export failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const exportSummaryPdf = async () => {
    let chartPng: string | null = null;
    try {
      if (chartRef.current) chartPng = await svgContainerToPng(chartRef.current, 2);
    } catch { /* continue without chart */ }
    buildProgressSummaryPdf({ projName, report, fmt, chartPng, interpretation: interpretation.text });
    toast({ title: 'Summary PDF downloaded', description: `progress-summary-${projName}.pdf` });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="SPI · Schedule Performance" value={report.spi.toFixed(2)} good={report.spi >= 0.95} />
        <KPI label="CPI · Cost Performance (proxy)" value={report.cpi.toFixed(2)} good={report.cpi >= 0.95} />
        <KPI label="% Complete (by hours)" value={`${report.pctComplete.toFixed(0)}%`} />
        <KPI
          label="Forecast Finish Variance"
          value={`${report.forecastVarianceDays >= 0 ? '+' : ''}${report.forecastVarianceDays}d`}
          good={report.forecastVarianceDays <= 0}
        />
      </div>

      <Card className="p-4 bg-card/40 border-border/60">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[10px] tracking-widest text-muted-foreground">BASELINE FINISH</div>
            <div className="font-mono text-foreground">{fmt(report.baselineFinish)}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-muted-foreground">FORECAST FINISH</div>
            <div className={`font-mono ${report.forecastVarianceDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {fmt(report.forecastFinish)}
            </div>
          </div>
        </div>
      </Card>

      {/* Baseline vs 60-day update comparison chart */}
      <Card className="p-5 bg-card/40 border-border/60">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="text-[11px] tracking-widest text-cyan-400">BASELINE vs 60-DAY UPDATE · FINISH-DATE VARIANCE</div>
            <div className={`text-xs mt-1 ${toneCls}`}>{interpretation.text}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-3 text-[10px] tracking-widest">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block w-3 h-2 rounded-sm bg-cyan-400" /> BASELINE
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block w-3 h-2 rounded-sm bg-amber-400" /> FORECAST (LATE)
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block w-3 h-2 rounded-sm bg-emerald-400" /> FORECAST (EARLY/ON-TIME)
              </span>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={exportChartPng} disabled={rows.length === 0}>
                <Download className="h-3.5 w-3.5" /> PNG
              </Button>
              <Button size="sm" onClick={exportSummaryPdf}>
                <Download className="h-3.5 w-3.5" /> Summary PDF
              </Button>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comparable activities between the baseline and update.</div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: Math.max(280, rows.length * 28) }}>
            <ResponsiveContainer>
              <ComposedChart
                data={rows}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                barCategoryGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  label={{
                    value: 'Days from baseline data date',
                    position: 'insideBottom',
                    offset: -2,
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="task_code"
                  width={90}
                  tick={{ fill: 'hsl(var(--cyan-400, 190 95% 55%))', fontSize: 10, fontFamily: 'monospace' }}
                />
                <RTooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    fontSize: 11,
                  }}
                  formatter={(value: number, name: string) => [`${value} d`, name]}
                  labelFormatter={(label, payload) => {
                    const r = payload?.[0]?.payload as typeof rows[number] | undefined;
                    if (!r) return label;
                    return `${r.task_code} · ${r.task_name}  (slip ${r.slip >= 0 ? '+' : ''}${r.slip}d)`;
                  }}
                />
                {updateAnchorOffset !== null && (
                  <ReferenceLine
                    x={updateAnchorOffset}
                    stroke="hsl(var(--cyan-400, 190 95% 55%))"
                    strokeDasharray="4 4"
                    label={{ value: 'Update data date', position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                )}
                <Bar dataKey="baselineOffset" name="Baseline finish" fill="hsl(190 95% 55%)" radius={[2, 2, 2, 2]} />
                <Bar dataKey="forecastOffset" name="Forecast finish" radius={[2, 2, 2, 2]}>
                  {rows.map((r, i) => (
                    <Cell key={i} fill={r.slip > 0 ? 'hsl(38 92% 55%)' : 'hsl(152 76% 45%)'} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {topLags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] tracking-widest text-muted-foreground mr-1">LAG HIGHLIGHTS:</span>
            {topLags.map(v => (
              <button
                key={v.task_id}
                onClick={() => scrollToRow(v.task_id)}
                className="text-[11px] font-mono px-2 py-1 rounded-sm border border-amber-500/40 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 transition-colors"
                title={`Jump to ${v.task_code}`}
              >
                +{v.finishVarianceDays}d · {v.task_code}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 bg-card/40 border-border/60">
        <div className="text-[11px] tracking-widest text-cyan-400 mb-3">TOP 10 SLIPPING ACTIVITIES</div>
        {report.topSlipping.length === 0 ? (
          <div className="text-sm text-muted-foreground">No slipping activities — schedule is on or ahead of baseline.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Activity</th>
                  <th className="py-2">Baseline finish</th>
                  <th className="py-2">Forecast finish</th>
                  <th className="py-2 text-right">Slip (days)</th>
                  <th className="py-2 text-right">% Complete</th>
                </tr>
              </thead>
              <tbody>
                {report.topSlipping.map(v => (
                  <tr key={v.task_id} id={`slip-row-${v.task_id}`} className="border-t border-border transition-shadow rounded-sm">
                    <td className="py-2"><span className="font-mono text-cyan-400 mr-2">{v.task_code}</span>{v.task_name}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{fmt(v.baselineFinish)}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{fmt(v.updateFinish)}</td>
                    <td className="py-2 text-right font-mono text-amber-400">+{v.finishVarianceDays}</td>
                    <td className="py-2 text-right font-mono">{v.pctComplete.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[11px] text-muted-foreground italic">
        Note: CPI is duration-proxied because XER files do not consistently carry cost loadings; in production this
        module would consume the BCWP / BCWS / ACWP feed from P6 cost accounts.
      </p>
    </div>
  );
};

const KPI = ({ label, value, good }: { label: string; value: string; good?: boolean }) => (
  <Card className={`p-4 border ${good === undefined ? 'border-border/60 bg-card/40' : good ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
    <div className="text-[10px] tracking-widest text-muted-foreground">{label}</div>
    <div className={`text-3xl font-bold mt-1 ${good === undefined ? '' : good ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</div>
  </Card>
);

/* ──────────────────  MODULE E: AACE PROGRESSION  ────────────────── */
const AacePanel = () => {
  const [activeCls, setActiveCls] = useState<5 | 4 | 3 | 2 | 1>(3);
  const active = AACE_CLASSES.find(c => c.cls === activeCls)!;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] tracking-widest text-muted-foreground">CURRENT ESTIMATE CLASS</div>
          <div className="text-3xl font-bold text-foreground mt-1">Class {active.cls} · {accuracyBand(active)}</div>
          <div className="text-xs text-muted-foreground mt-1">Design maturity {active.designMaturity} · {active.njdotStage}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={activeCls === 5} onClick={() => setActiveCls((activeCls + 1) as 5 | 4 | 3 | 2 | 1)}>
            ← Roll back
          </Button>
          <Button disabled={activeCls === 1} onClick={() => setActiveCls((activeCls - 1) as 5 | 4 | 3 | 2 | 1)}>
            Advance to Class {activeCls - 1} →
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-3">
        {AACE_CLASSES.map(c => {
          const isActive = c.cls === activeCls;
          const passed = c.cls > activeCls;
          return (
            <button
              key={c.cls}
              onClick={() => setActiveCls(c.cls)}
              className={`text-left rounded-md border p-4 transition-all ${
                isActive
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : passed
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-card/40 hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{c.cls}</div>
                {passed && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </div>
              <div className="text-xs font-semibold mt-2">{c.name.split(' · ')[1]}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{c.designMaturity}</div>
              <div className="text-[10px] font-mono mt-2 text-cyan-400">{accuracyBand(c)}</div>
            </button>
          );
        })}
      </div>

      <Card className="p-5 bg-card/40 border-border/60">
        <div className="text-[11px] tracking-widest text-cyan-400 mb-3">CLASS {active.cls} · METHODOLOGY</div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <DefRow label="Purpose" value={active.purpose} />
          <DefRow label="Methodology" value={active.methodology} />
          <DefRow label="Typical effort" value={active.effort} />
          <DefRow label="NJDOT capital stage" value={active.njdotStage} />
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground italic">
        Per AACE International Recommended Practice 98R-18. The CPM Scheduler/Estimator role is responsible for
        progressing each project's estimate from Class 5 down to Class 1 as design milestones are reached.
      </p>
    </div>
  );
};

const DefRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] tracking-widest text-muted-foreground">{label.toUpperCase()}</div>
    <div className="text-foreground mt-1">{value}</div>
  </div>
);

/* ─────────────────────────  MODULE C: TIA  ───────────────────────── */
const TiaPanel = ({ tables }: { tables: XerTables }) => {
  const [taskId, setTaskId] = useState<string>(tables.TASK.find(t => t.task_type !== 'TT_Mile')?.task_id || tables.TASK[0]?.task_id || '');
  const [delayDays, setDelayDays] = useState(5);
  const [delayStart, setDelayStart] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<DelayType>('Weather');
  const [cause, setCause] = useState('Sustained heavy precipitation prevented safe deck pour operations and rebar placement.');

  const result = useMemo(() => buildTia(tables, { affectedTaskId: taskId, delayDays, delayStart, type, cause }),
    [tables, taskId, delayDays, delayStart, type, cause]);

  const downloadCsv = () => {
    const blob = new Blob([result.fragnetCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tia-fragnet.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-5 bg-card/40 border-border/60 space-y-4">
        <div className="text-[11px] tracking-widest text-cyan-400">DELAY EVENT</div>
        <div className="space-y-2">
          <Label className="text-xs">Affected activity</Label>
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              {tables.TASK.filter(t => t.task_type !== 'TT_LOE' && t.task_type !== 'TT_WBS').map(t => (
                <SelectItem key={t.task_id} value={t.task_id}>
                  <span className="font-mono text-cyan-400 mr-2">{t.task_code}</span>{t.task_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Delay start</Label>
            <Input type="date" value={delayStart} onChange={e => setDelayStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Working days</Label>
            <Input type="number" min={1} max={120} value={delayDays} onChange={e => setDelayDays(Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Delay type</Label>
          <Select value={type} onValueChange={v => setType(v as DelayType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['Weather', 'Owner-directed', 'Differing site condition', 'Supply chain', 'Other'] as DelayType[]).map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Cause (plain text)</Label>
          <Textarea rows={3} value={cause} onChange={e => setCause(e.target.value)} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5 bg-card/40 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] tracking-widest text-cyan-400">FRAGNET PREVIEW</div>
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre">{result.fragnetAscii}</pre>
        </Card>
        <Card className="p-5 bg-card/40 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] tracking-widest text-cyan-400">DRAFT TIA NARRATIVE · NJDOT / NYSDOT 108-03</div>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result.narrative); toast({ title: 'Narrative copied' }); }}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{result.narrative}</pre>
        </Card>
      </div>
    </div>
  );
};

/* ─────────────────  MODULE F: FILE EXPLORER  ───────────────── */
type TaggedFile = {
  id: string; name: string; size: number; type: string;
  discipline: string; status: string; iso19650: string;
};

const inferTags = (file: File): TaggedFile => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const lower = file.name.toLowerCase();
  let type = 'Document';
  if (ext === 'xer') type = 'Schedule';
  else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'Spreadsheet';
  else if (ext === 'pdf') type = 'Drawing';
  else if (['jpg', 'jpeg', 'png', 'heic'].includes(ext)) type = 'Photo';
  else if (lower.includes('rfi')) type = 'RFI';
  else if (lower.includes('idr') || lower.includes('daily')) type = 'Daily Report';
  let discipline = 'GEN';
  if (/struct|steel|girder|concrete|pier|deck/.test(lower)) discipline = 'ST';
  else if (/road|paving|hma/.test(lower)) discipline = 'CV';
  else if (/elec/.test(lower)) discipline = 'EL';
  else if (/mech|hvac/.test(lower)) discipline = 'ME';
  let status = 'WIP';
  if (/_a[._-]/.test(lower) || /approved/.test(lower)) status = 'A';
  else if (/_s[._-]/.test(lower) || /shared/.test(lower)) status = 'S';
  const iso = `MCFA-XX-XX-XX-${type.slice(0, 2).toUpperCase()}-${discipline}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
  return { id: crypto.randomUUID(), name: file.name, size: file.size, type, discipline, status, iso19650: iso };
};

const FileExplorerPanel = () => {
  const [files, setFiles] = useState<TaggedFile[]>([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const drop = useRef<HTMLDivElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files).map(inferTags);
    setFiles(prev => [...incoming, ...prev]);
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files || []).map(inferTags);
    setFiles(prev => [...arr, ...prev]);
  };

  const filtered = files.filter(f =>
    (typeFilter === 'all' || f.type === typeFilter) &&
    (!q || f.name.toLowerCase().includes(q.toLowerCase()) || f.iso19650.toLowerCase().includes(q.toLowerCase())),
  );
  const types = Array.from(new Set(files.map(f => f.type)));

  return (
    <div className="space-y-4">
      <div ref={drop} onDragOver={e => e.preventDefault()} onDrop={onDrop}
        className="border-2 border-dashed border-border hover:border-cyan-500/60 rounded-md p-6 text-center bg-card/30">
        <Upload className="h-6 w-6 mx-auto text-cyan-400 mb-2" />
        <div className="text-xs text-muted-foreground mb-3">Drop any project files (xer · pdf · xlsx · jpg). They stay in this browser tab only.</div>
        <label className="inline-block">
          <input type="file" multiple hidden onChange={onPick} />
          <span className="text-xs text-cyan-400 cursor-pointer hover:underline">or browse…</span>
        </label>
      </div>
      {files.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search filename or ISO 19650 code…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setTypeFilter('all')}
                className={`text-xs px-3 py-1.5 rounded-sm border ${typeFilter === 'all' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-border text-muted-foreground'}`}>
                All
              </button>
              {types.map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`text-xs px-3 py-1.5 rounded-sm border ${typeFilter === t ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-border text-muted-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-border rounded-md divide-y divide-border">
            {filtered.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-card/40 text-sm">
                <FileCode2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{f.iso19650}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                <Badge variant="outline" className="text-[10px]">{f.discipline}</Badge>
                <Badge variant="outline" className="text-[10px]">{f.status}</Badge>
                <span className="text-[11px] text-muted-foreground tabular-nums w-20 text-right">{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-xs text-muted-foreground text-center">No files match your filter.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────────────  MODULE D: WBS / COMPLIANCE  ───────────────── */
const WbsPanel = ({ tables }: { tables: XerTables }) => {
  const tree = useMemo(() => buildWbsTree(tables), [tables]);
  const milestones = useMemo(() => checkNjdotMilestones(tables), [tables]);
  const snap = useMemo(() => complianceSnapshot(tables), [tables]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className={`p-4 border ${snap.negativeLags === 0 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}`}>
          <div className="text-[11px] tracking-widest text-muted-foreground">NEGATIVE LAGS</div>
          <div className="text-3xl font-bold mt-1">{snap.negativeLags}</div>
          <div className="text-[11px] text-muted-foreground mt-1">NJDOT prohibits any negative lag.</div>
        </Card>
        <Card className={`p-4 border ${snap.openEnded <= 2 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
          <div className="text-[11px] tracking-widest text-muted-foreground">OPEN-ENDED ACTIVITIES</div>
          <div className="text-3xl font-bold mt-1">{snap.openEnded}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Excludes project start/finish milestones.</div>
        </Card>
        <Card className="p-4 border border-border/60 bg-card/40">
          <div className="text-[11px] tracking-widest text-muted-foreground">TOTAL ACTIVITIES</div>
          <div className="text-3xl font-bold mt-1">{snap.totalTasks}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Includes WBS-level summaries.</div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-card/40 border-border/60">
          <div className="text-[11px] tracking-widest text-cyan-400 mb-3">WORK BREAKDOWN STRUCTURE</div>
          <div className="text-sm">
            {tree.map(n => <WbsRow key={n.wbs_id} node={n} depth={0} />)}
          </div>
        </Card>
        <Card className="p-5 bg-card/40 border-border/60">
          <div className="text-[11px] tracking-widest text-cyan-400 mb-3">NJDOT REQUIRED MILESTONES</div>
          <div className="space-y-1.5">
            {milestones.map(m => (
              <div key={m.code} className="flex items-center gap-3 text-sm border border-border/60 rounded-sm px-3 py-2 bg-background">
                {m.present
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <span className="font-mono text-cyan-400 w-12">{m.code}</span>
                <span className="flex-1">{m.name}</span>
                {m.matchedTask
                  ? <span className="text-[11px] text-muted-foreground font-mono">{m.matchedTask.task_code}</span>
                  : <span className="text-[11px] text-destructive">missing — insert milestone</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const WbsRow = ({ node, depth }: { node: WbsNode; depth: number }) => {
  const [open, setOpen] = useState(depth < 1);
  const has = node.children.length > 0;
  return (
    <div>
      <div onClick={() => has && setOpen(!open)}
        className="flex items-center gap-2 py-1.5 hover:bg-card/40 cursor-pointer rounded-sm"
        style={{ paddingLeft: depth * 16 }}>
        {has
          ? (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)
          : <span className="w-3.5" />}
        <span className="font-mono text-cyan-400 text-xs">{node.wbs_short_name}</span>
        <span className="text-foreground">{node.wbs_name}</span>
        {node.taskCount > 0 && <span className="ml-auto text-[10px] text-muted-foreground">{node.taskCount} tasks</span>}
      </div>
      {open && node.children.map(c => <WbsRow key={c.wbs_id} node={c} depth={depth + 1} />)}
    </div>
  );
};

export default XerDemo;
