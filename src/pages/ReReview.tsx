import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import {
  useReReviewQueue, useApproveReport, useRejectReport, useBulkApproveReports,
  type ReReportStatus, type ReReport,
} from '@/hooks/useReReviewQueue';
import { ReReviewCard } from '@/components/ReReviewCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileSignature, ArrowLeft, Inbox, ShieldCheck, CheckCheck } from 'lucide-react';

export default function ReReview() {
  const { user, isResidentEngineer, isAdmin, loading: authLoading } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<ReReportStatus>('submitted');
  const [inspectorId, setInspectorId] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
  const isOwner = !!user && project?.created_by === user.id;
  const canDecide = isResidentEngineer || isAdmin;
  const canSee = canDecide || isOwner;
  const readOnly = !canDecide;

  const queue = useReReviewQueue(projectId, status);
  const approve = useApproveReport(projectId);
  const reject = useRejectReport(projectId);
  const bulkApprove = useBulkApproveReports(projectId);

  // Filter inspectors (derived from queue results)
  const inspectorOpts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of queue.data ?? []) {
      if (!seen.has(r.user_id)) seen.set(r.user_id, r.inspector_name ?? r.user_id.slice(0, 8));
    }
    return Array.from(seen.entries());
  }, [queue.data]);

  const filtered: ReReport[] = useMemo(() => {
    return (queue.data ?? []).filter(r => {
      if (inspectorId !== 'all' && r.user_id !== inspectorId) return false;
      if (fromDate && r.report_date < fromDate) return false;
      if (toDate && r.report_date > toDate) return false;
      return true;
    });
  }, [queue.data, inspectorId, fromDate, toDate]);

  const pendingIds = useMemo(
    () => filtered.filter(r => r.status === 'submitted').map(r => r.id),
    [filtered],
  );

  if (authLoading || projectsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Sign in to access the RE review queue.</p>
          <Button asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Projects</Link>
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-mono font-bold tracking-wider uppercase">RE Review</h1>
          </div>
          {readOnly && canSee && (
            <Badge variant="outline" className="font-mono text-[10px] tracking-wider">READ ONLY</Badge>
          )}
          <div className="flex-1" />
          <Select value={projectId ?? ''} onValueChange={setProjectId}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-[260px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.contract_number ? `${p.contract_number} · ` : ''}{p.name}
                </SelectItem>
              ))}
              {projects.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No projects</div>}
            </SelectContent>
          </Select>
        </div>

        {/* Filter row */}
        {canSee && projectId && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-3 flex items-center gap-2 flex-wrap">
            <Select value={status} onValueChange={(v) => setStatus(v as ReReportStatus)}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted" className="text-xs">Pending</SelectItem>
                <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={inspectorId} onValueChange={setInspectorId}>
              <SelectTrigger className="h-8 text-xs w-[180px]">
                <SelectValue placeholder="All inspectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All inspectors</SelectItem>
                {inspectorOpts.map(([id, name]) => (
                  <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="h-8 text-xs w-[140px]" placeholder="From"
            />
            <Input
              type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="h-8 text-xs w-[140px]" placeholder="To"
            />
            {(inspectorId !== 'all' || fromDate || toDate) && (
              <Button
                variant="ghost" size="sm" className="h-8 text-xs"
                onClick={() => { setInspectorId('all'); setFromDate(''); setToDate(''); }}
              >
                Clear
              </Button>
            )}
            <div className="flex-1" />
            {status === 'submitted' && !readOnly && pendingIds.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                    Approve all visible ({pendingIds.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve {pendingIds.length} reports?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Every visible pending report will be approved and counted toward contract totals. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => bulkApprove.mutate(pendingIds)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Approve all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {!canSee ? (
          <div className="text-center py-16">
            <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              You need the <span className="font-mono">resident_engineer</span> role or to be the project creator to access this queue.
            </p>
          </div>
        ) : !projectId ? (
          <p className="text-sm text-muted-foreground">Select a project to view its review queue.</p>
        ) : queue.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : queue.error ? (
          <p className="text-sm text-destructive">Error: {(queue.error as Error).message}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {(queue.data ?? []).length === 0
                ? (status === 'submitted' ? 'No reports awaiting review.' :
                   status === 'approved' ? 'No approved reports yet.' : 'No rejected reports.')
                : 'No reports match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <FileSignature className="h-3.5 w-3.5" />
              {filtered.length} report{filtered.length === 1 ? '' : 's'}
              {filtered.length !== (queue.data ?? []).length && (
                <span className="text-muted-foreground/60">· {(queue.data ?? []).length} total</span>
              )}
            </div>
            {filtered.map(r => (
              <ReReviewCard
                key={r.id}
                report={r}
                onApprove={(id) => approve.mutate(id)}
                onReject={(args) => reject.mutate(args)}
                approving={approve.isPending || bulkApprove.isPending}
                rejecting={reject.isPending}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
