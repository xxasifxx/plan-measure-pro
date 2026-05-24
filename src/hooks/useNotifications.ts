import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type NotificationKind = 'report_submitted' | 'report_approved' | 'report_rejected';

export interface NotificationRow {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: NotificationKind;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['notifications', user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const markAllRead = () => {
    const ids = (q.data ?? []).filter(n => !n.read_at).map(n => n.id);
    if (ids.length) markRead.mutate(ids);
  };

  const unread = (q.data ?? []).filter(n => !n.read_at);

  return {
    notifications: q.data ?? [],
    unreadCount: unread.length,
    isLoading: q.isLoading,
    markRead: (id: string) => markRead.mutate([id]),
    markAllRead,
  };
}
