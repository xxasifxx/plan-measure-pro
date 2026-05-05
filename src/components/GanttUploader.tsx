import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Sparkles, Check, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

type Parsed = {
  wbs_code: string;
  name: string;
  baseline_start: string;
  baseline_end: string;
  percent_complete: number;
};

interface Props {
  projectId: string;
}

export function GanttUploader({ projectId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Parsed[] | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setPreview(null);
    setImgUrl(URL.createObjectURL(file));
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const { data, error } = await supabase.functions.invoke('parse-schedule', {
        body: { imageBase64: b64, mimeType: file.type },
      });
      if (error) throw error;
      const acts: Parsed[] = data?.activities ?? [];
      if (!acts.length) {
        toast({ title: 'No activities found', description: 'Try a clearer image of the Gantt chart.', variant: 'destructive' });
      } else {
        setPreview(acts);
      }
    } catch (e: any) {
      toast({ title: 'AI parse failed', description: e?.message || 'Please retry.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const rows = preview.map(p => ({
        project_id: projectId,
        wbs_code: p.wbs_code || '—',
        name: p.name,
        baseline_start: p.baseline_start || null,
        baseline_end: p.baseline_end || null,
        percent_complete: Number(p.percent_complete) || 0,
        baseline_quantity: 0,
      }));
      const { error } = await supabase.from('schedule_activities').insert(rows);
      if (error) throw error;
      toast({ title: `Imported ${rows.length} activities` });
      setPreview(null);
      setImgUrl(null);
      qc.invalidateQueries({ queryKey: ['activities', projectId] });
    } catch (e: any) {
      toast({ title: 'Insert failed', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Import schedule from Gantt photo
          </div>
          <div className="text-[11px] text-muted-foreground">
            Upload a screenshot or photo (P6, MS Project, Excel) — AI extracts WBS rows for review.
          </div>
        </div>
        <label>
          <div className={`px-3 py-2 rounded-md border border-border bg-card hover:border-primary cursor-pointer text-xs flex items-center gap-2 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {busy ? 'Parsing…' : 'Upload Gantt image'}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }}
          />
        </label>
      </div>

      {imgUrl && (
        <div className="grid md:grid-cols-2 gap-3">
          <img src={imgUrl} alt="Uploaded Gantt" className="w-full rounded border border-border max-h-64 object-contain bg-card" />
          <div className="space-y-2">
            {preview && (
              <>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  AI extracted {preview.length} activities — review then import
                </div>
                <div className="max-h-56 overflow-auto space-y-1">
                  {preview.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5 text-[11px] font-mono items-center">
                      <Input className="col-span-2 h-6 text-[11px]" value={p.wbs_code}
                        onChange={e => setPreview(prev => prev!.map((x, j) => j === i ? { ...x, wbs_code: e.target.value } : x))} />
                      <Input className="col-span-5 h-6 text-[11px]" value={p.name}
                        onChange={e => setPreview(prev => prev!.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                      <Input className="col-span-2 h-6 text-[11px]" type="date" value={p.baseline_start || ''}
                        onChange={e => setPreview(prev => prev!.map((x, j) => j === i ? { ...x, baseline_start: e.target.value } : x))} />
                      <Input className="col-span-2 h-6 text-[11px]" type="date" value={p.baseline_end || ''}
                        onChange={e => setPreview(prev => prev!.map((x, j) => j === i ? { ...x, baseline_end: e.target.value } : x))} />
                      <button className="col-span-1 text-destructive text-xs" onClick={() => setPreview(prev => prev!.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setPreview(null); setImgUrl(null); }}>Discard</Button>
                  <Button size="sm" onClick={commit} disabled={busy}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Import {preview.length}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
