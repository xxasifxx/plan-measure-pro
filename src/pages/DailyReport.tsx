import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDailyReport } from '@/hooks/useDailyReport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileSignature, Send, RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SnapshotItem } from '@/lib/daily-report-snapshot';

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (s: string | null) => s ? new Date(s).toLocaleString() : '';
const fmtQty = (n: number, unit: string) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;

export default function DailyReport() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, profile } = useAuth();
  const [dateISO, setDateISO] = useState(todayISO());
  const { report, isLoading, preview, previewLoading, isStale, submit, reopen } = useDailyReport(projectId, user?.id, dateISO);

  const status = report?.status ?? 'draft';
  const isDraft = status === 'draft' || report == null;
  const isLocked = status === 'submitted' || status === 'approved';

  // What rows to show: live preview while drafting, frozen snapshot once submitted
  const rows: SnapshotItem[] = useMemo(() => {
    if (isDraft) return preview;
    return report?.snapshot ?? [];
  }, [isDraft, preview, report]);

  const totalLines = rows.length;
  const overContract = rows.filter(r => r.contract_quantity && r.new_cumulative > r.contract_quantity).length;

  const statusBadge = {
    draft: <Badge variant="outline" className="font-mono text-[10px] tracking-wider">DRAFT</Badge>,
    submitted: <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-amber-500/50 text-amber-400">SUBMITTED — PENDING RE</Badge>,
    approved: <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-emerald-500/50 text-emerald-400">APPROVED</Badge>,
    rejected: <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-destructive/50 text-destructive">REJECTED — REOPEN TO EDIT</Badge>,
  }[status];

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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to={projectId ? `/project/${projectId}` : '/'}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-mono font-bold tracking-wider uppercase">Daily Report</h1>
          </div>
          {statusBadge}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Date</label>
            <Input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              max={todayISO()}
              className="h-8 text-xs w-[150px]"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Status banner */}
        {status === 'rejected' && report?.reject_reason && (
          <div className="border border-destructive/40 bg-destructive/10 rounded-md p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">Rejected by RE</p>
                <p className="text-xs text-muted-foreground mt-1 italic">"{report.reject_reason}"</p>
                <p className="text-[11px] text-muted-foreground mt-2 font-mono">{fmtTime(report.rejected_at)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => reopen.mutate()} disabled={reopen.isPending}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reopen & Edit
              </Button>
            </div>
          </div>
        )}

        {status === 'submitted' && (
          <div className="border border-amber-500/40 bg-amber-500/5 rounded-md p-3 flex items-start gap-3">
            <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-400">Awaiting RE approval</p>
              <p className="text-muted-foreground mt-0.5">
                Submitted {fmtTime(report?.submitted_at)}. Edits to annotations after this point will not change the submitted snapshot.
              </p>
            </div>
          </div>
        )}

        {status === 'approved' && (
          <div className="border border-emerald-500/40 bg-emerald-500/5 rounded-md p-3 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-emerald-400">Approved</p>
              <p className="text-muted-foreground mt-0.5">Approved {fmtTime(report?.approved_at)}. These quantities are now in official totals.</p>
            </div>
          </div>
        )}

        {/* Snapshot / preview table */}
        <div className="border border-border bg-card rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="text-xs font-mono uppercase tracking-wider">
              {isDraft ? 'Preview (live)' : 'Submitted snapshot'} · {totalLines} line{totalLines === 1 ? '' : 's'}
            </div>
            {overContract > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                <AlertCircle className="h-3 w-3" /> {overContract} over contract
              </div>
            )}
          </div>

          {(isLoading || previewLoading) ? (
            <div className="p-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No annotations recorded for {dateISO}.</p>
              {projectId && (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to={`/project/${projectId}`}>Open takeoff tool</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-4 py-2">Pay item</th>
                    <th className="text-right font-medium px-3 py-2">Today</th>
                    <th className="text-right font-medium px-3 py-2">Prior cumul.</th>
                    <th className="text-right font-medium px-3 py-2">New cumul.</th>
                    <th className="text-right font-medium px-4 py-2">vs Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((it, i) => {
                    const pct = it.contract_quantity && it.contract_quantity > 0
                      ? (it.new_cumulative / it.contract_quantity) * 100 : null;
                    return (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-2">
                          <div className="font-semibold">{it.item_code}</div>
                          <div className="text-[11px] text-muted-foreground font-sans truncate max-w-md">{it.name}</div>
                          {it.notes && <div className="text-[11px] text-muted-foreground font-sans italic mt-0.5">{it.notes}</div>}
                        </td>
                        <td className="text-right px-3 py-2 text-primary">+{fmtQty(it.delta_quantity, it.unit)}</td>
                        <td className="text-right px-3 py-2 text-muted-foreground">{fmtQty(it.prior_cumulative, it.unit)}</td>
                        <td className="text-right px-3 py-2 font-semibold">{fmtQty(it.new_cumulative, it.unit)}</td>
                        <td className="text-right px-4 py-2">
                          {pct !== null ? (
                            <span className={cn(
                              pct > 100 ? 'text-destructive' : pct > 80 ? 'text-amber-400' : '',
                            )}>{pct.toFixed(0)}%</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Action row */}
          {isDraft && rows.length > 0 && (
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground mr-auto font-mono">
                Once submitted, these quantities are frozen and sent to the RE.
              </p>
              <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {submit.isPending ? 'Submitting…' : 'Submit for RE Review'}
              </Button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Inspector: {profile?.full_name || user.email}
        </p>
      </main>
    </div>
  );
}
