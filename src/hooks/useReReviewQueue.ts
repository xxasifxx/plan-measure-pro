import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ReReportStatus = 'submitted' | 'approved' | 'rejected';

export interface SnapshotItem {
  pay_item_id: string;
  item_code: string;
  name: string;
  unit: string;
  delta_quantity: number;
  prior_cumulative: number;
  new_cumulative: number;
  contract_quantity?: number | null;
  notes?: string;
}

export interface ReReport {
  id: string;
  project_id: string;
  user_id: string;
  report_date: string;
  status: ReReportStatus | 'draft';
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  reject_reason: string | null;
  snapshot: SnapshotItem[];
  inspector_name?: string;
  reviewer_name?: string;
}

export interface ReReportComment {
  id: string;
  daily_report_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string;
}

export interface ReReportArchive {
  id: string;
  daily_report_id: string;
  snapshot: SnapshotItem[];
  archived_at: string;
  archived_reason: string | null;
  reject_reason: string | null;
}

export function useReReviewQueue(projectId: string | undefined, statusFilter: ReReportStatus = 'submitted') {
  return useQuery({
    queryKey: ['re-review', projectId, statusFilter],
    enabled: !!projectId,
    queryFn: async (): Promise<ReReport[]> => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('id, project_id, user_id, report_date, status, submitted_at, approved_at, approved_by, rejected_at, rejected_by, reject_reason, snapshot')
        .eq('project_id', projectId!)
        .eq('status', statusFilter)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('report_date', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as ReReport[];

      const ids = Array.from(new Set(rows.flatMap(r => [r.user_id, r.approved_by, r.rejected_by]).filter(Boolean))) as string[];
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name, email').in('id', ids);
        for (const p of profiles ?? []) names[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      }
      return rows.map(r => ({
        ...r,
        snapshot: Array.isArray(r.snapshot) ? r.snapshot : [],
        inspector_name: names[r.user_id],
        reviewer_name: r.approved_by ? names[r.approved_by] : r.rejected_by ? names[r.rejected_by!] : undefined,
      }));
    },
  });
}

export function useReportComments(reportId: string | undefined) {
  return useQuery({
    queryKey: ['re-report-comments', reportId],
    enabled: !!reportId,
    queryFn: async (): Promise<ReReportComment[]> => {
      const { data, error } = await supabase
        .from('daily_report_comments')
        .select('id, daily_report_id, user_id, body, created_at')
        .eq('daily_report_id', reportId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as ReReportComment[];
      const ids = Array.from(new Set(rows.map(r => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
        const names: Record<string, string> = {};
        for (const p of profs ?? []) names[p.id] = p.full_name || p.email || p.id.slice(0, 8);
        return rows.map(r => ({ ...r, author_name: names[r.user_id] }));
      }
      return rows;
    },
  });
}

export function useReportArchives(reportId: string | undefined) {
  return useQuery({
    queryKey: ['re-report-archives', reportId],
    enabled: !!reportId,
    queryFn: async (): Promise<ReReportArchive[]> => {
      const { data, error } = await supabase
        .from('daily_report_snapshots' as any)
        .select('id, daily_report_id, snapshot, archived_at, archived_reason, reject_reason')
        .eq('daily_report_id', reportId!)
        .order('archived_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        ...r,
        snapshot: Array.isArray(r.snapshot) ? r.snapshot : [],
      }));
    },
  });
}

export function useAddComment(reportId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!body.trim()) throw new Error('Comment is required');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('daily_report_comments').insert({
        daily_report_id: reportId!,
        project_id: projectId!,
        user_id: user.id,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Comment posted' });
      qc.invalidateQueries({ queryKey: ['re-report-comments', reportId] });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });
}

export function useApproveReport(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('daily_reports').update({ status: 'approved' }).eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Report approved', description: 'Quantities are now in approved totals.' });
      qc.invalidateQueries({ queryKey: ['re-review', projectId] });
    },
    onError: (e: Error) => toast({ title: 'Approve failed', description: e.message, variant: 'destructive' }),
  });
}

export function useRejectReport(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, reason }: { reportId: string; reason: string }) => {
      if (!reason.trim()) throw new Error('A reason is required to reject a report.');
      const { error } = await supabase
        .from('daily_reports')
        .update({ status: 'rejected', reject_reason: reason.trim() })
        .eq('id', reportId);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('daily_report_comments').insert({
          daily_report_id: reportId,
          project_id: projectId!,
          user_id: user.id,
          body: `Rejected: ${reason.trim()}`,
        });
      }
    },
    onSuccess: () => {
      toast({ title: 'Report rejected', description: 'Sent back to the inspector for revision.' });
      qc.invalidateQueries({ queryKey: ['re-review', projectId] });
    },
    onError: (e: Error) => toast({ title: 'Reject failed', description: e.message, variant: 'destructive' }),
  });
}
