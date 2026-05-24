import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import {
  useReReviewQueue, useApproveReport, useRejectReport,
  type ReReportStatus,
} from '@/hooks/useReReviewQueue';
import { ReReviewCard } from '@/components/ReReviewCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, ArrowLeft, Inbox, ShieldCheck } from 'lucide-react';

export default function ReReview() {
  const { user, isResidentEngineer, isAdmin, loading: authLoading } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<ReReportStatus>('submitted');

  // Default to first project once available
  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
  const isOwner = !!user && project?.created_by === user.id;
  const canDecide = isResidentEngineer || isAdmin;
  const canSee = canDecide || isOwner;
  const readOnly = !canDecide; // owners (PMs) see read-only

  const queue = useReReviewQueue(projectId, status);
  const approve = useApproveReport(projectId);
  const reject = useRejectReport(projectId);

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
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Projects</Link>
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-mono font-bold tracking-wider uppercase">RE Review Queue</h1>
          </div>
          {readOnly && canSee && (
            <Badge variant="outline" className="ml-2 font-mono text-[10px] tracking-wider">READ ONLY</Badge>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Select value={projectId ?? ''} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 text-xs w-[260px]">
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
            <Select value={status} onValueChange={(v) => setStatus(v as ReReportStatus)}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted" className="text-xs">Pending</SelectItem>
                <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
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
        ) : (queue.data ?? []).length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {status === 'submitted' ? 'No reports awaiting review.' :
               status === 'approved' ? 'No approved reports yet.' : 'No rejected reports.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <FileSignature className="h-3.5 w-3.5" />
              {(queue.data ?? []).length} report{(queue.data ?? []).length === 1 ? '' : 's'}
            </div>
            {(queue.data ?? []).map(r => (
              <ReReviewCard
                key={r.id}
                report={r}
                onApprove={(id) => approve.mutate(id)}
                onReject={(args) => reject.mutate(args)}
                approving={approve.isPending}
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
