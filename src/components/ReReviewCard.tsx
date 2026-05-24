import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileSignature, Clock } from 'lucide-react';
import { ReRejectDialog } from './ReRejectDialog';
import type { ReReport } from '@/hooks/useReReviewQueue';

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
  const isPending = report.status === 'submitted';

  const statusBadge = {
    submitted: <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-amber-500/50 text-amber-400">SUBMITTED</Badge>,
    approved:  <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-emerald-500/50 text-emerald-400">APPROVED</Badge>,
    rejected:  <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-destructive/50 text-destructive">REJECTED</Badge>,
    draft:     <Badge variant="outline" className="font-mono text-[10px] tracking-wider">DRAFT</Badge>,
  }[report.status];

  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          <FileSignature className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="font-mono text-sm font-semibold">{fmtDate(report.report_date)}</div>
          <div className="text-xs text-muted-foreground truncate">
            {report.inspector_name ?? 'inspector'}
          </div>
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
                  <th className="text-right font-medium pb-1.5 pr-3">Prior cumul.</th>
                  <th className="text-right font-medium pb-1.5 pr-3">New cumul.</th>
                  <th className="text-right font-medium pb-1.5">vs Contract</th>
                </tr>
              </thead>
              <tbody>
                {report.snapshot.map((it, i) => {
                  const pct = it.contract_quantity && it.contract_quantity > 0
                    ? (it.new_cumulative / it.contract_quantity) * 100
                    : null;
                  return (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-3">
                        <div className="font-semibold">{it.item_code}</div>
                        <div className="text-[11px] text-muted-foreground font-sans truncate max-w-xs">{it.name}</div>
                        {it.notes && <div className="text-[11px] text-muted-foreground font-sans italic mt-0.5">{it.notes}</div>}
                      </td>
                      <td className="text-right pr-3 text-primary">+{fmtQty(it.delta_quantity, it.unit)}</td>
                      <td className="text-right pr-3 text-muted-foreground">{fmtQty(it.prior_cumulative, it.unit)}</td>
                      <td className="text-right pr-3 font-semibold">{fmtQty(it.new_cumulative, it.unit)}</td>
                      <td className="text-right">
                        {pct !== null ? (
                          <span className={pct > 100 ? 'text-destructive' : pct > 80 ? 'text-amber-400' : ''}>
                            {pct.toFixed(0)}%
                          </span>
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

      {/* Footer / actions */}
      {isPending && !readOnly && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setRejectOpen(true)}
            disabled={approving || rejecting}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Reject
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => onApprove(report.id)}
            disabled={approving || rejecting}
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
        onConfirm={(reason) => {
          onReject({ reportId: report.id, reason });
          setRejectOpen(false);
        }}
      />
    </div>
  );
}
