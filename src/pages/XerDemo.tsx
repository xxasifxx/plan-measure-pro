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
import { ChevronRight, ChevronDown, Upload, FileCode2, CheckCircle2, XCircle, Copy, Download, AlertTriangle, FolderTree, FileSearch, Activity, Search, ArrowLeft, Sparkles } from 'lucide-react';
import { XerLensTour, type TourStep } from '@/components/XerLensTour';
import { toast } from '@/hooks/use-toast';
import { parseXer } from '@/lib/xer/parser';
import { runDcma, dcmaSummary, type DcmaResult } from '@/lib/xer/dcma';
import { buildTia, type DelayType } from '@/lib/xer/tia';
import { buildWbsTree, checkNjdotMilestones, complianceSnapshot, type WbsNode } from '@/lib/xer/wbs';
import { SAMPLE_XER } from '@/lib/xer/sample';
import type { XerTables } from '@/lib/xer/types';

const XerDemo = () => {
  const [tables, setTables] = useState<XerTables | null>(null);
  const [filename, setFilename] = useState<string>('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'XerLens · Live XER Audit Demo · MCFA';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Drag any Primavera P6 .xer file. Nothing leaves your browser. Get an instant DCMA-14 audit, NJDOT WBS check, and TIA fragnet draft.';
    if (meta) meta.setAttribute('content', desc); else {
      const m = document.createElement('meta'); m.name = 'description'; m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const ingest = (text: string, name: string) => {
    try {
      const t = parseXer(text);
      if (!t.TASK.length) { toast({ title: 'No TASK rows found', description: 'File parsed but contained no activities.', variant: 'destructive' }); return; }
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

  const loadSample = () => ingest(SAMPLE_XER, 'NJTA-MP123-SAMPLE.xer');

  return (
    <div className="min-h-screen bg-background text-foreground font-mono antialiased">
      {/* Top ribbon */}
      <div className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-muted-foreground tracking-widest">XERLENS · AUTH-AGNOSTIC · IN-BROWSER PARSER · v0.1</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/mcfa"><ArrowLeft className="h-3.5 w-3.5" /> Back to pitch</Link>
          </Button>
        </div>
      </div>

      {/* Hero / dropzone */}
      <section className="border-b border-border/60 py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="text-[11px] tracking-[0.25em] text-cyan-400 mb-3">LIVE DEMO · MODULE OF THE PROPOSED CPM SCHEDULER ROLE</div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              Drop a Primavera P6 <span className="text-cyan-400">.xer</span> file.
              <span className="block text-muted-foreground/80 text-xl md:text-2xl mt-3 font-normal">
                Get a DCMA-14 audit, NJDOT WBS check, and a TIA draft in ten seconds — without leaving your browser.
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
              Nothing uploads. The parser runs entirely on this page. This is the auth-agnostic tooling described in
              the proposal — the same module a CPM Scheduler/Estimator would run on every contractor schedule submission.
            </p>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mt-10 border-2 border-dashed border-border hover:border-cyan-500/60 transition-colors rounded-md p-10 text-center bg-card/30"
          >
            <Upload className="h-8 w-8 mx-auto text-cyan-400 mb-3" />
            <div className="text-sm text-muted-foreground mb-5">Drag a <span className="text-foreground">.xer</span> file here, or</div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => fileInput.current?.click()}>
                <FileCode2 className="h-4 w-4" /> Choose .xer file
              </Button>
              <Button variant="outline" onClick={loadSample}>Load sample NJTA project</Button>
            </div>
            <input ref={fileInput} type="file" accept=".xer,text/plain" hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            {filename && (
              <div className="mt-6 text-xs text-cyan-400">Loaded: <span className="font-mono">{filename}</span></div>
            )}
          </div>
        </div>
      </section>

      {/* Modules */}
      {tables && (
        <section className="py-10">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="dcma">
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full h-auto">
                <TabsTrigger value="dcma" className="py-3 flex-col gap-1">
                  <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> A · DCMA 14</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">SCHEDULE HEALTH</span>
                </TabsTrigger>
                <TabsTrigger value="tia" className="py-3 flex-col gap-1">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> B · TIA</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">DELAY DRAFT</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="py-3 flex-col gap-1">
                  <span className="flex items-center gap-2"><FileSearch className="h-4 w-4" /> C · File Explorer</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">ISO 19650 TAGS</span>
                </TabsTrigger>
                <TabsTrigger value="wbs" className="py-3 flex-col gap-1">
                  <span className="flex items-center gap-2"><FolderTree className="h-4 w-4" /> D · WBS / Compliance</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest">NJDOT MILESTONES</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dcma" className="mt-6"><DcmaPanel tables={tables} /></TabsContent>
              <TabsContent value="tia" className="mt-6"><TiaPanel tables={tables} /></TabsContent>
              <TabsContent value="files" className="mt-6"><FileExplorerPanel /></TabsContent>
              <TabsContent value="wbs" className="mt-6"><WbsPanel tables={tables} /></TabsContent>
            </Tabs>
          </div>
        </section>
      )}

      {!tables && (
        <section className="py-16 border-t border-border/60 bg-card/20">
          <div className="container mx-auto px-4 max-w-4xl grid md:grid-cols-2 gap-6">
            {[
              { title: 'A · DCMA 14-Point Auditor', body: 'Logic, Leads, Lags, FS%, Hard Constraints, High Float, Negative Float, High Duration, Invalid Dates, Resources, Missed Tasks, Critical Path Test, CPLI, BEI.' },
              { title: 'B · Automated TIA Workflow', body: 'Type a delay note. Get a fragnet (FS, zero lag — NJDOT compliant) plus a draft narrative ready to paste into the EOT request letter.' },
              { title: 'C · Intelligent File Explorer', body: 'Drag any RFI / IDR / .xer in. Auto-tag with ISO 19650 metadata. Search by discipline, status, type — no nested folders.' },
              { title: 'D · WBS / Compliance Verification', body: 'Cross-reference the parsed WBS against required NJDOT milestones (M100, M500, M950 …). Negative-lag and open-ended counts surfaced instantly.' },
            ].map(c => (
              <Card key={c.title} className="p-5 bg-card/40 border-border/60">
                <div className="font-semibold mb-2 text-foreground">{c.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/* ─────────────────────────  MODULE A: DCMA  ───────────────────────── */
const DcmaPanel = ({ tables }: { tables: XerTables }) => {
  const results = useMemo(() => runDcma(tables), [tables]);
  const [openCheck, setOpenCheck] = useState<string | null>(null);
  const passed = results.filter(r => r.pass).length;
  const score = Math.round((passed / results.length) * 100);

  const copySummary = () => {
    navigator.clipboard.writeText(dcmaSummary(results));
    toast({ title: 'Summary copied', description: 'Paste into your schedule review email.' });
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
        <Button variant="outline" onClick={copySummary}><Copy className="h-4 w-4" /> Copy summary for email</Button>
      </div>

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

/* ─────────────────────────  MODULE B: TIA  ───────────────────────── */
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

/* ─────────────────  MODULE C: FILE EXPLORER  ───────────────── */
type TaggedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  discipline: string;
  status: string;
  iso19650: string;
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

  // ISO 19650: {Project}-{Originator}-{Volume}-{Level}-{Type}-{Role}-{Number}
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
      <div
        ref={drop}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-border hover:border-cyan-500/60 rounded-md p-6 text-center bg-card/30"
      >
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
      <div
        onClick={() => has && setOpen(!open)}
        className="flex items-center gap-2 py-1.5 hover:bg-card/40 cursor-pointer rounded-sm"
        style={{ paddingLeft: depth * 16 }}
      >
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
