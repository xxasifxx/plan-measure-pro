import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PayItemRow {
  id: string;
  item_code: string;
  name: string;
  unit: string;
  contract_quantity: number | null;
  p6_activity_id: string | null;
}

/** Project pay items + their persisted P6 Activity Id mapping. */
export function usePayItemActivityMap(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pay-items-p6-map', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<PayItemRow[]> => {
      const { data, error } = await supabase
        .from('pay_items')
        .select('id, item_code, name, unit, contract_quantity, p6_activity_id' as any)
        .eq('project_id', projectId!)
        .order('item_code');
      if (error) throw error;
      return (data ?? []) as unknown as PayItemRow[];
    },
  });
}

/** Persist a single pay_item.p6_activity_id (set to null to clear). */
export function useUpdatePayItemMapping(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payItemId, activityId }: { payItemId: string; activityId: string | null }) => {
      const { error } = await supabase
        .from('pay_items')
        .update({ p6_activity_id: activityId } as any)
        .eq('id', payItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pay-items-p6-map', projectId] });
    },
    onError: (e: Error) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });
}

/** Bulk auto-map by exact item_code match against the parsed PMXML activity ids. */
export function useBulkAutoMap(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matches }: { matches: { payItemId: string; activityId: string }[] }) => {
      if (matches.length === 0) return 0;
      // Update one-by-one to respect RLS predicates per row
      for (const m of matches) {
        const { error } = await supabase
          .from('pay_items')
          .update({ p6_activity_id: m.activityId } as any)
          .eq('id', m.payItemId);
        if (error) throw error;
      }
      return matches.length;
    },
    onSuccess: (n) => {
      if (n > 0) toast({ title: `${n} pay item${n === 1 ? '' : 's'} auto-mapped` });
      qc.invalidateQueries({ queryKey: ['pay-items-p6-map', projectId] });
    },
    onError: (e: Error) => toast({ title: 'Auto-map failed', description: e.message, variant: 'destructive' }),
  });
}
