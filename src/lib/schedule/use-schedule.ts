import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ActivityRelationship, ScheduleActivity, ScheduleMeta,
  ScheduleCalendar, ScheduleResource, ResourceAssignment,
  ScheduleBaseline, BaselineActivity,
} from './types';
import { runCpm } from './cpm';
import { calendarFrom, normalizeActivityPatch } from './baseline';
import type { ImportedSchedule } from './import-p6';
import { useMemo } from 'react';

export function useSchedule(projectId: string) {
  const qc = useQueryClient();

  const activitiesQ = useQuery({
    queryKey: ['schedule-activities', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_activities').select('*').eq('project_id', projectId)
        .order('sort_order', { ascending: true }).order('wbs_code', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ScheduleActivity[];
    },
    enabled: !!projectId,
  });

  const relationshipsQ = useQuery({
    queryKey: ['activity-relationships', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_relationships' as any).select('*').eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as unknown as ActivityRelationship[];
    },
    enabled: !!projectId,
  });

  const metaQ = useQuery({
    queryKey: ['schedule-meta', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_schedule_meta' as any).select('*')
        .eq('project_id', projectId).maybeSingle();
      return (data as unknown as ScheduleMeta) || {
        project_id: projectId, data_date: null, calendar: { workdays: [1, 2, 3, 4, 5] },
      };
    },
    enabled: !!projectId,
  });

  const calendarsQ = useQuery({
    queryKey: ['schedule-calendars', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('schedule_calendars' as any).select('*').eq('project_id', projectId);
      return (data || []) as unknown as ScheduleCalendar[];
    },
    enabled: !!projectId,
  });

  const resourcesQ = useQuery({
    queryKey: ['schedule-resources', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('schedule_resources' as any).select('*').eq('project_id', projectId);
      return (data || []) as unknown as ScheduleResource[];
    },
    enabled: !!projectId,
  });

  const assignmentsQ = useQuery({
    queryKey: ['activity-resource-assignments', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('activity_resource_assignments' as any).select('*').eq('project_id', projectId);
      return (data || []) as unknown as ResourceAssignment[];
    },
    enabled: !!projectId,
  });

  const baselinesQ = useQuery({
    queryKey: ['schedule-baselines', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('schedule_baselines' as any)
        .select('*').eq('project_id', projectId).order('captured_at', { ascending: false });
      return (data || []) as unknown as ScheduleBaseline[];
    },
    enabled: !!projectId,
  });

  const cpm = useMemo(() => {
    if (!activitiesQ.data || !relationshipsQ.data) return null;
    return runCpm(activitiesQ.data, relationshipsQ.data, metaQ.data, calendarsQ.data || []);
  }, [activitiesQ.data, relationshipsQ.data, metaQ.data, calendarsQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['schedule-activities', projectId] });
    qc.invalidateQueries({ queryKey: ['activity-relationships', projectId] });
  };
  const invalidateAll = () => {
    invalidate();
    qc.invalidateQueries({ queryKey: ['schedule-meta', projectId] });
    qc.invalidateQueries({ queryKey: ['schedule-calendars', projectId] });
    qc.invalidateQueries({ queryKey: ['schedule-resources', projectId] });
    qc.invalidateQueries({ queryKey: ['activity-resource-assignments', projectId] });
    qc.invalidateQueries({ queryKey: ['schedule-baselines', projectId] });
  };

  const upsertActivity = useMutation({
    mutationFn: async (patch: Partial<ScheduleActivity> & { id?: string }) => {
      const workdays = calendarFrom(metaQ.data);
      if (patch.id) {
        const current = activitiesQ.data?.find(a => a.id === patch.id) || {};
        const { id, ...rest } = patch;
        const normalized = normalizeActivityPatch(current, rest, workdays);
        const { error } = await supabase.from('schedule_activities').update(normalized as any).eq('id', id);
        if (error) throw error;
      } else {
        const base: any = {
          project_id: projectId,
          wbs_code: patch.wbs_code || 'NEW',
          name: patch.name || 'New Activity',
          activity_type: patch.activity_type || 'task',
          duration_days: patch.duration_days ?? 1,
          ...patch,
        };
        const normalized = normalizeActivityPatch({}, base, workdays);
        const { error } = await supabase.from('schedule_activities').insert({ ...base, ...normalized });
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

  const updateRelationship = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ActivityRelationship> & { id: string }) => {
      const { error } = await supabase.from('activity_relationships' as any).update(patch as any).eq('id', id);
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
            early_start: r.early_start, early_finish: r.early_finish,
            late_start: r.late_start, late_finish: r.late_finish,
            total_float_days: Number.isNaN(r.total_float_days) ? null : r.total_float_days,
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
        project_id: projectId, ...(metaQ.data || {}), ...patch,
      } as any, { onConflict: 'project_id' } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-meta', projectId] }),
  });

  const importSchedule = useMutation({
    mutationFn: async (imp: ImportedSchedule) => {
      const { data, error } = await supabase.rpc('replace_project_schedule' as any, {
        p_project_id: projectId,
        p_acts: imp.activities as any,
        p_rels: imp.relationships as any,
        p_meta: imp.meta as any,
        p_calendars: (imp.calendars || []) as any,
        p_resources: (imp.resources || []) as any,
        p_assignments: (imp.assignments || []) as any,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: invalidateAll,
  });

  // ===== Calendars CRUD =====
  const upsertCalendar = useMutation({
    mutationFn: async (patch: Partial<ScheduleCalendar> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase.from('schedule_calendars' as any).update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedule_calendars' as any)
          .insert({ project_id: projectId, name: 'New Calendar', ...patch } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-calendars', projectId] }),
  });

  const deleteCalendar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_calendars' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-calendars', projectId] }),
  });

  // ===== Resources CRUD =====
  const upsertResource = useMutation({
    mutationFn: async (patch: Partial<ScheduleResource> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase.from('schedule_resources' as any).update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedule_resources' as any)
          .insert({ project_id: projectId, name: 'New Resource', resource_type: 'labor', unit: 'hr', ...patch } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-resources', projectId] }),
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_resources' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-resources', projectId] }),
  });

  // ===== Assignments CRUD =====
  const upsertAssignment = useMutation({
    mutationFn: async (patch: Partial<ResourceAssignment> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase.from('activity_resource_assignments' as any).update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('activity_resource_assignments' as any)
          .insert({ project_id: projectId, ...patch } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-resource-assignments', projectId] }),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activity_resource_assignments' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-resource-assignments', projectId] }),
  });

  // ===== Baselines =====
  const captureBaseline = useMutation({
    mutationFn: async ({ name, notes }: { name: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('capture_baseline' as any, {
        p_project_id: projectId, p_name: name, p_notes: notes || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-baselines', projectId] }),
  });

  const deleteBaseline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_baseline' as any, { p_baseline_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-baselines', projectId] }),
  });

  const loadBaselineActivities = async (baselineId: string): Promise<BaselineActivity[]> => {
    const { data } = await supabase.from('baseline_activities' as any).select('*').eq('baseline_id', baselineId);
    return (data || []) as unknown as BaselineActivity[];
  };

  return {
    activities: activitiesQ.data || [],
    relationships: relationshipsQ.data || [],
    meta: metaQ.data,
    calendars: calendarsQ.data || [],
    resources: resourcesQ.data || [],
    assignments: assignmentsQ.data || [],
    baselines: baselinesQ.data || [],
    cpm,
    loading: activitiesQ.isLoading || relationshipsQ.isLoading,
    upsertActivity, deleteActivity,
    addRelationship, updateRelationship, removeRelationship,
    persistCpm, setMeta, importSchedule,
    upsertCalendar, deleteCalendar,
    upsertResource, deleteResource,
    upsertAssignment, deleteAssignment,
    captureBaseline, deleteBaseline, loadBaselineActivities,
  };
}
