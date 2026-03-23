import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ProjectRow {
  id: string;
  name: string;
  contract_number: string | null;
  pdf_storage_path: string | null;
  specs_storage_path: string | null;
  toc: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  annotation_count?: number;
  member_role?: string;
  member_count?: number;
  latest_annotation_at?: string | null;
}

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async (): Promise<ProjectRow[]> => {
      if (!user) return [];

      // Fetch projects user created
      const { data: owned, error: ownedErr } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (ownedErr) throw ownedErr;

      // Fetch projects user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id);

      if (memErr) throw memErr;

      const memberProjectIds = (memberships || [])
        .map(m => m.project_id)
        .filter(id => !(owned || []).some(p => p.id === id));

      let memberProjects: any[] = [];
      if (memberProjectIds.length > 0) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        memberProjects = data || [];
      }

      // Combine and tag with role
      const allProjects: ProjectRow[] = [
        ...(owned || []).map(p => ({ ...p, member_role: 'owner' as string })),
        ...memberProjects.map(p => ({
          ...p,
          member_role: memberships?.find(m => m.project_id === p.id)?.role || 'inspector',
        })),
      ];

      // Fetch annotation counts and latest annotation date
      const projectIds = allProjects.map(p => p.id);
      if (projectIds.length > 0) {
        const { data: annotations } = await supabase
          .from('annotations')
          .select('project_id, created_at')
          .in('project_id', projectIds);

        const counts: Record<string, number> = {};
        const latest: Record<string, string> = {};
        (annotations || []).forEach(a => {
          counts[a.project_id] = (counts[a.project_id] || 0) + 1;
          if (!latest[a.project_id] || a.created_at > latest[a.project_id]) {
            latest[a.project_id] = a.created_at;
          }
        });
        allProjects.forEach(p => {
          p.annotation_count = counts[p.id] || 0;
          p.latest_annotation_at = latest[p.id] || null;
        });

        // Fetch member counts for owned projects
        const ownedIds = allProjects.filter(p => p.member_role === 'owner').map(p => p.id);
        if (ownedIds.length > 0) {
          const { data: members } = await supabase
            .from('project_members')
            .select('project_id')
            .in('project_id', ownedIds);
          const memberCounts: Record<string, number> = {};
          (members || []).forEach(m => {
            memberCounts[m.project_id] = (memberCounts[m.project_id] || 0) + 1;
          });
          allProjects.forEach(p => { p.member_count = memberCounts[p.id] || 0; });
        }
      }

      return allProjects;
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async (params: { name: string; contractNumber: string; pdfFile: File }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Upload PDF to storage
      const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from('project-pdfs')
        .upload(storagePath, params.pdfFile, { contentType: 'application/pdf' });
      if (uploadErr) throw uploadErr;

      // 2. Create project record
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: params.name,
          contract_number: params.contractNumber || null,
          pdf_storage_path: storagePath,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      // Delete storage file first
      const { data: proj } = await supabase
        .from('projects')
        .select('pdf_storage_path')
        .eq('id', projectId)
        .single();

      if (proj?.pdf_storage_path) {
        await supabase.storage.from('project-pdfs').remove([proj.pdf_storage_path]);
      }

      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    createProject,
    deleteProject,
    refetch: projectsQuery.refetch,
  };
}
