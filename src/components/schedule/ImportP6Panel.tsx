import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, FileCode2, AlertTriangle } from 'lucide-react';
import { detectAndImport, type ImportedSchedule } from '@/lib/schedule/import-p6';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (imp: ImportedSchedule, replace: boolean) => Promise<void>;
}

export function ImportP6Panel({ open, onOpenChange, onImport }: Props) {
  const { toast } = useToast();
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ImportedSchedule | null>(null);
  const [filename, setFilename] = useState('');
  const [replace, setReplace] = useState(true);

  const handleFile = async (file: File) => {
    setParsing(true);
    setParsed(null);
    try {
      const text = await file.text();
      const imp = detectAndImport(file.name, text);
      setFilename(file.name);
      setParsed(imp);
      if (!imp.activities.length) {
        toast({ title: 'Nothing to import', description: 'File parsed but contained no activities or WBS.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Parse failed', description: e?.message || 'Unable to read file', variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      await onImport(parsed, replace);
      toast({ title: 'Schedule imported', description: `${parsed.counts.tasks} activities · ${parsed.counts.relationships} relationships` });
      onOpenChange(false);
      setParsed(null);
      setFilename('');
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            <FileCode2 className="h-4 w-4" /> Import P6 schedule (.xer or .xml)
          </DialogTitle>
        </DialogHeader>

        {!parsed && (
          <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary">
            {parsing ? <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> : <Upload className="h-6 w-6 mx-auto mb-2" />}
            <div className="text-sm font-mono">{parsing ? 'Parsing…' : 'Drop or click to select a .xer / .xml file'}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Primavera P6 native exports. All WBS, activities, dependencies, lags and actuals are mapped.</div>
            <input
              type="file"
              accept=".xer,.xml,application/xml,text/xml"
              className="hidden"
              disabled={parsing}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }}
            />
          </label>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-muted-foreground">{filename}</div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                ['WBS', parsed.counts.wbs],
                ['Activities', parsed.counts.tasks],
                ['Milestones', parsed.counts.milestones],
                ['LOE', parsed.counts.loe],
                ['Relationships', parsed.counts.relationships],
              ].map(([l, n]) => (
                <div key={l as string} className="border border-border rounded p-2">
                  <div className="text-lg font-mono font-bold">{n as number}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l as string}</div>
                </div>
              ))}
            </div>

            {parsed.meta.data_date && (
              <div className="text-[11px] font-mono">Data date: <span className="text-primary">{parsed.meta.data_date}</span></div>
            )}

            {parsed.warnings.length > 0 && (
              <div className="border border-warning/40 bg-warning/10 rounded p-2 max-h-32 overflow-auto">
                <div className="flex items-center gap-1 text-[11px] font-mono text-warning mb-1">
                  <AlertTriangle className="h-3 w-3" /> {parsed.warnings.length} warning(s)
                </div>
                <ul className="text-[10px] space-y-0.5">
                  {parsed.warnings.slice(0, 20).map((w, i) => <li key={i}>· {w}</li>)}
                  {parsed.warnings.length > 20 && <li className="text-muted-foreground">…and {parsed.warnings.length - 20} more</li>}
                </ul>
              </div>
            )}

            <div className="border border-border rounded max-h-56 overflow-auto">
              <table className="w-full text-[11px] font-mono">
                <thead className="bg-muted/30 sticky top-0">
                  <tr className="text-[10px] uppercase text-muted-foreground">
                    <th className="text-left px-2 py-1">ID</th>
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">Type</th>
                    <th className="text-right px-2 py-1">Days</th>
                    <th className="text-left px-2 py-1">Start</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.activities.filter(a => a.activity_type !== 'wbs').slice(0, 30).map(a => (
                    <tr key={a.ext_id} className="border-t border-border/40">
                      <td className="px-2 py-0.5">{a.activity_id || a.wbs_code}</td>
                      <td className="px-2 py-0.5 truncate max-w-[200px]">{a.name}</td>
                      <td className="px-2 py-0.5 text-muted-foreground">{a.activity_type}</td>
                      <td className="px-2 py-0.5 text-right">{a.duration_days}</td>
                      <td className="px-2 py-0.5">{a.baseline_start || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="flex items-center gap-2 text-[11px] font-mono">
              <Checkbox checked={replace} onCheckedChange={v => setReplace(!!v)} />
              Replace existing schedule for this project
            </label>
          </div>
        )}

        <DialogFooter>
          {parsed && <Button variant="ghost" onClick={() => setParsed(null)}>Choose different file</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={commit} disabled={!parsed || importing}>
            {importing && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Import {parsed ? `${parsed.counts.tasks} activities` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
