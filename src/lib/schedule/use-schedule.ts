import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityRelationship, ScheduleActivity, ScheduleMeta } from './types';
import { runCpm } from './cpm';
import { useMemo } from 'react';

export function useSchedule(projectId: string) {
  const qc = useQueryClient();

  const activitiesQ = useQuery({
    queryKey: ['schedule-activities', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('wbs_code', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ScheduleActivity[];
    },
    enabled: !!projectId,
  });

  const relationshipsQ = useQuery({
    queryKey: ['activity-relationships', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_relationships' as any)
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as unknown as ActivityRelationship[];
    },
    enabled: !!projectId,
  });

  const metaQ = useQuery({
    queryKey: ['schedule-meta', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_schedule_meta' as any)
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      return (data as unknown as ScheduleMeta) || { project_id: projectId, data_date: null, calendar: { workdays: [1, 2, 3, 4, 5] } };
    },
    enabled: !!projectId,
  });

  const cpm = useMemo(() => {
    if (!activitiesQ.data || !relationshipsQ.data) return null;
    return runCpm(activitiesQ.data, relationshipsQ.data, metaQ.data);
  }, [activitiesQ.data, relationshipsQ.data, metaQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['schedule-activities', projectId] });
    qc.invalidateQueries({ queryKey: ['activity-relationships', projectId] });
  };

  const upsertActivity = useMutation({
    mutationFn: async (patch: Partial<ScheduleActivity> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase.from('schedule_activities').update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedule_activities').insert({
          project_id: projectId,
          wbs_code: patch.wbs_code || 'NEW',
          name: patch.name || 'New Activity',
          activity_type: patch.activity_type || 'task',
          duration_days: patch.duration_days ?? 1,
          ...patch,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addRelationship = useMutation({
    mutationFn: async (r: Omit<ActivityRelationship, 'id'>) => {
      const { error } = await supabase.from('activity_relationships' as any).insert(r as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeRelationship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activity_relationships' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const persistCpm = useMutation({
    mutationFn: async () => {
      if (!activitiesQ.data || !cpm) return;
      const updates = activitiesQ.data
        .filter(a => cpm.byId.has(a.id))
        .map(a => {
          const r = cpm.byId.get(a.id)!;
          return supabase.from('schedule_activities').update({
            early_start: r.early_start,
            early_finish: r.early_finish,
            late_start: r.late_start,
            late_finish: r.late_finish,
            total_float_days: r.total_float_days,
            is_critical: r.is_critical,
          } as any).eq('id', a.id);
        });
      await Promise.all(updates);
    },
    onSuccess: invalidate,
  });

  const setMeta = useMutation({
    mutationFn: async (patch: Partial<ScheduleMeta>) => {
      const { error } = await supabase.from('project_schedule_meta' as any).upsert({
        project_id: projectId,
        ...(metaQ.data || {}),
        ...patch,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-meta', projectId] }),
  });

  return {
    activities: activitiesQ.data || [],
    relationships: relationshipsQ.data || [],
    meta: metaQ.data,
    cpm,
    loading: activitiesQ.isLoading || relationshipsQ.isLoading,
    upsertActivity,
    deleteActivity,
    addRelationship,
    removeRelationship,
    persistCpm,
    setMeta,
  };
}
