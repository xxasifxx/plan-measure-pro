import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { buildDailyReportSnapshot, type SnapshotItem } from '@/lib/daily-report-snapshot';

export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface DailyReportRow {
  id: string;
  project_id: string;
  user_id: string;
  report_date: string;
  status: DailyReportStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
  snapshot: SnapshotItem[];
}

export function useDailyReport(projectId: string | undefined, userId: string | undefined, dateISO: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['daily-report', projectId, userId, dateISO],
    enabled: !!projectId && !!userId && !!dateISO,
    queryFn: async (): Promise<DailyReportRow | null> => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('id, project_id, user_id, report_date, status, submitted_at, approved_at, rejected_at, reject_reason, snapshot')
        .eq('project_id', projectId!)
        .eq('user_id', userId!)
        .eq('report_date', dateISO)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, snapshot: Array.isArray(data.snapshot) ? (data.snapshot as any) : [] } as DailyReportRow;
    },
  });

  // Keep preview running even after submit so we can detect snapshot drift.
  const previewQuery = useQuery({
    queryKey: ['daily-report-preview', projectId, userId, dateISO, query.data?.id, query.data?.status],
    enabled: !!projectId && !!userId && !!dateISO && query.data?.status !== 'approved',
    queryFn: () => buildDailyReportSnapshot(projectId!, userId!, dateISO, query.data?.id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['daily-report', projectId, userId, dateISO] });
    qc.invalidateQueries({ queryKey: ['daily-report-preview', projectId, userId, dateISO] });
    qc.invalidateQueries({ queryKey: ['re-review', projectId] });
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!projectId || !userId) throw new Error('Missing project/user');
      const snapshot = await buildDailyReportSnapshot(projectId, userId, dateISO, query.data?.id);
      // Empty submissions are allowed — REs can still review/reject a zero-day.


      // Ensure draft row exists
      let reportId = query.data?.id;
      if (!reportId) {
        const { data: created, error: insErr } = await supabase
          .from('daily_reports')
          .insert({ project_id: projectId, user_id: userId, report_date: dateISO, status: 'draft', snapshot: snapshot as any })
          .select('id')
          .single();
        if (insErr) throw insErr;
        reportId = created.id;
      } else {
        // Update snapshot on existing draft/rejected row
        if (query.data?.status === 'rejected') {
          // Reopen → draft first (trigger archives prior snapshot)
          const { error: reopenErr } = await supabase
            .from('daily_reports')
            .update({ status: 'draft', snapshot: snapshot as any })
            .eq('id', reportId);
          if (reopenErr) throw reopenErr;
        } else {
          const { error: upErr } = await supabase
            .from('daily_reports')
            .update({ snapshot: snapshot as any })
            .eq('id', reportId);
          if (upErr) throw upErr;
        }
      }

      // Flip to submitted
      const { error: subErr } = await supabase
        .from('daily_reports')
        .update({ status: 'submitted' })
        .eq('id', reportId);
      if (subErr) throw subErr;
    },
    onSuccess: () => {
      toast({ title: 'Report submitted', description: 'Sent to the Resident Engineer for review.' });
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }),
  });

  const reopen = useMutation({
    mutationFn: async () => {
      if (!query.data?.id) throw new Error('No report to reopen');
      const { error } = await supabase
        .from('daily_reports')
        .update({ status: 'draft' })
        .eq('id', query.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Report reopened', description: 'Edit your annotations and resubmit.' });
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Reopen failed', description: e.message, variant: 'destructive' }),
  });

  // Drift detection: when submitted, compare frozen snapshot quantities to
  // live preview. Any line-count change or per-item delta change is "stale".
  const isStale = (() => {
    if (query.data?.status !== 'submitted') return false;
    const frozen = query.data.snapshot ?? [];
    const live = previewQuery.data ?? [];
    if (frozen.length !== live.length) return true;
    const liveBy = new Map(live.map(l => [l.pay_item_id, l.delta_quantity]));
    for (const f of frozen) {
      const lv = liveBy.get(f.pay_item_id);
      if (lv == null) return true;
      if (Math.abs(Number(lv) - Number(f.delta_quantity)) > 0.005) return true;
    }
    return false;
  })();

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    preview: previewQuery.data ?? [],
    previewLoading: previewQuery.isLoading,
    isStale,
    submit,
    reopen,
  };
}

