import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2, XCircle, FileSignature, Clock, MessageSquare,
  ChevronDown, ChevronUp, History, Send,
} from 'lucide-react';
import { ReRejectDialog } from './ReRejectDialog';
import {
  type ReReport,
  useReportComments, useReportArchives, useAddComment,
  type SnapshotItem,
} from '@/hooks/useReReviewQueue';
import { cn } from '@/lib/utils';

interface Props {
  report: ReReport;
  onApprove: (id: string) => void;
  onReject: (args: { reportId: string; reason: string }) => void;
  approving?: boolean;
  rejecting?: boolean;
  readOnly?: boolean;
}

const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (s: string | null) => s ? new Date(s).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '';
const fmtQty = (n: number, unit: string) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;

export function ReReviewCard({ report, onApprove, onReject, approving, rejecting, readOnly }: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const isPending = report.status === 'submitted';

  const commentsQ = useReportComments(historyOpen ? report.id : undefined);
  const archivesQ = useReportArchives(historyOpen ? report.id : undefined);
  const addComment = useAddComment(report.id, report.project_id);

  // Build diff against the most recent archived snapshot (if resubmission)
  const diffByItem = useMemo(() => {
    const archives = archivesQ.data ?? [];
    if (archives.length === 0) return null;
    const prev = archives[0].snapshot as SnapshotItem[];
    const prevByItem = new Map(prev.map(p => [p.pay_item_id, p.delta_quantity]));
    const map = new Map<string, number>();
    for (const it of report.snapshot) {
      const before = prevByItem.get(it.pay_item_id) ?? 0;
      const delta = it.delta_quantity - before;
      if (Math.abs(delta) > 0.001) map.set(it.pay_item_id, delta);
    }
    return map;
  }, [archivesQ.data, report.snapshot]);

  const statusBadge = {
    submitted: <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-amber-500/50 text-amber-400">SUBMITTED</Badge>,
    approved:  <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-emerald-500/50 text-emerald-400">APPROVED</Badge>,
    rejected:  <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-destructive/50 text-destructive">REJECTED</Badge>,
    draft:     <Badge variant="outline" className="font-mono text-[10px] tracking-wider">DRAFT</Badge>,
  }[report.status];

  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <FileSignature className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="font-mono text-sm font-semibold">{fmtDate(report.report_date)}</div>
          <div className="text-xs text-muted-foreground truncate">{report.inspector_name ?? 'inspector'}</div>
          {report.submitted_at && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
              <Clock className="h-3 w-3" /> submitted {fmtTime(report.submitted_at)}
            </div>
          )}
        </div>
        {statusBadge}
      </div>

      {/* Snapshot */}
      <div className="p-4">
        {report.snapshot.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No pay-item quantities in this report.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-medium pb-1.5 pr-3">Pay item</th>
                  <th className="text-right font-medium pb-1.5 pr-3">Today</th>
                  {diffByItem && <th className="text-right font-medium pb-1.5 pr-3">Δ vs prior</th>}
                  <th className="text-right font-medium pb-1.5 pr-3">Prior cumul.</th>
                  <th className="text-right font-medium pb-1.5 pr-3">New cumul.</th>
                  <th className="text-right font-medium pb-1.5">vs Contract</th>
                </tr>
              </thead>
              <tbody>
                {report.snapshot.map((it, i) => {
                  const pct = it.contract_quantity && it.contract_quantity > 0 ? (it.new_cumulative / it.contract_quantity) * 100 : null;
                  const diff = diffByItem?.get(it.pay_item_id);
                  return (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-3">
                        <div className="font-semibold">{it.item_code}</div>
                        <div className="text-[11px] text-muted-foreground font-sans truncate max-w-xs">{it.name}</div>
                        {it.notes && <div className="text-[11px] text-muted-foreground font-sans italic mt-0.5">{it.notes}</div>}
                      </td>
                      <td className="text-right pr-3 text-primary">+{fmtQty(it.delta_quantity, it.unit)}</td>
                      {diffByItem && (
                        <td className={cn('text-right pr-3', diff != null ? (diff > 0 ? 'text-amber-400' : 'text-emerald-400') : 'text-muted-foreground/60')}>
                          {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}` : '—'}
                        </td>
                      )}
                      <td className="text-right pr-3 text-muted-foreground">{fmtQty(it.prior_cumulative, it.unit)}</td>
                      <td className="text-right pr-3 font-semibold">{fmtQty(it.new_cumulative, it.unit)}</td>
                      <td className="text-right">
                        {pct !== null ? (
                          <span className={pct > 100 ? 'text-destructive' : pct > 80 ? 'text-amber-400' : ''}>{pct.toFixed(0)}%</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History toggle */}
      <button
        onClick={() => setHistoryOpen(o => !o)}
        className="w-full px-4 py-1.5 border-t border-border text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:bg-muted/20 flex items-center justify-between"
      >
        <span className="flex items-center gap-1.5">
          <History className="h-3 w-3" /> History & comments
        </span>
        {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {historyOpen && (
        <div className="px-4 py-3 border-t border-border bg-muted/10 space-y-3">
          {/* Archived snapshots */}
          {(archivesQ.data ?? []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Prior submissions</p>
              {(archivesQ.data ?? []).map(a => (
                <div key={a.id} className="text-[11px] font-mono border border-border rounded p-2 bg-background/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{fmtTime(a.archived_at)} — {a.snapshot.length} line(s)</span>
                    {a.reject_reason && <span className="text-destructive italic">"{a.reject_reason}"</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comments thread */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Comments</p>
            {commentsQ.isLoading ? (
              <p className="text-[11px] text-muted-foreground">Loading…</p>
            ) : (commentsQ.data ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No comments yet.</p>
            ) : (
              <div className="space-y-1.5">
                {(commentsQ.data ?? []).map(c => (
                  <div key={c.id} className="text-[11px] border border-border/50 rounded p-2 bg-background/40">
                    <div className="flex justify-between mb-0.5 font-mono">
                      <span className="font-semibold">{c.author_name ?? 'user'}</span>
                      <span className="text-muted-foreground">{fmtTime(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-start">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="text-xs"
              />
              <Button
                size="sm"
                disabled={!commentText.trim() || addComment.isPending}
                onClick={() => addComment.mutate(commentText, { onSuccess: () => setCommentText('') })}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer / actions */}
      {isPending && !readOnly && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border bg-muted/20">
          <Button
            variant="outline" size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setRejectOpen(true)} disabled={approving || rejecting}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />Reject
          </Button>
          <Button
            size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => onApprove(report.id)} disabled={approving || rejecting}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {approving ? 'Approving…' : 'Approve report'}
          </Button>
        </div>
      )}

      {report.status === 'approved' && report.approved_at && (
        <div className="px-4 py-2 border-t border-border bg-emerald-950/20 text-[11px] font-mono text-emerald-400/90">
          Approved by {report.reviewer_name ?? 'RE'} · {fmtTime(report.approved_at)}
        </div>
      )}
      {report.status === 'rejected' && report.rejected_at && (
        <div className="px-4 py-2 border-t border-border bg-destructive/10 text-[11px] font-mono text-destructive">
          <div>Rejected by {report.reviewer_name ?? 'RE'} · {fmtTime(report.rejected_at)}</div>
          {report.reject_reason && <div className="font-sans italic mt-0.5">"{report.reject_reason}"</div>}
        </div>
      )}

      <ReRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        pending={rejecting}
        reportLabel={`${fmtDate(report.report_date)} · ${report.inspector_name ?? 'inspector'}`}
        onConfirm={(reason) => { onReject({ reportId: report.id, reason }); setRejectOpen(false); }}
      />
    </div>
  );
}
