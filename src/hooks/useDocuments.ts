import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const BUCKET = 'project-documents';

export type SystemKind =
  | 'plans' | 'specs' | 'rfis' | 'submittals' | 'shop_drawings'
  | 'change_orders' | 'daily_reports' | 'photos' | 'as_builts' | 'correspondence';

export interface FolderRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  is_system: boolean;
  system_kind: SystemKind | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  project_id: string;
  folder_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  version: number;
  replaces_document_id: string | null;
  source_kind: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface UploaderProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const extOf = (filename: string) => {
  const i = filename.lastIndexOf('.');
  return i > 0 ? filename.slice(i + 1).toLowerCase() : 'bin';
};

export function useFolders(projectId: string | undefined) {
  const qc = useQueryClient();
  const key = ['folders', projectId];

  const query = useQuery({
    queryKey: key,
    enabled: !!projectId,
    queryFn: async (): Promise<FolderRow[]> => {
      const { data, error } = await supabase
        .from('document_folders')
        .select('id, project_id, parent_id, name, is_system, system_kind, created_at')
        .eq('project_id', projectId!)
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createFolder = useMutation({
    mutationFn: async (vars: { name: string; parentId: string | null }) => {
      if (!projectId) throw new Error('Missing project');
      const { error } = await supabase.from('document_folders').insert({
        project_id: projectId,
        parent_id: vars.parentId,
        name: vars.name.trim(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Folder created' }); },
    onError: (e: Error) => toast({ title: 'Create failed', description: e.message, variant: 'destructive' }),
  });

  const renameFolder = useMutation({
    mutationFn: async (vars: { id: string; name: string }) => {
      const { error } = await supabase.from('document_folders')
        .update({ name: vars.name.trim() } as any).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Folder renamed' }); },
    onError: (e: Error) => toast({ title: 'Rename failed', description: e.message, variant: 'destructive' }),
  });

  const moveFolder = useMutation({
    mutationFn: async (vars: { id: string; parentId: string | null }) => {
      const { error } = await supabase.from('document_folders')
        .update({ parent_id: vars.parentId } as any).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: 'Move failed', description: e.message, variant: 'destructive' }),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Folder deleted' }); },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  return {
    folders: query.data ?? [],
    isLoading: query.isLoading,
    createFolder, renameFolder, moveFolder, deleteFolder,
  };
}

export function useDocuments(projectId: string | undefined, folderId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const key = ['documents', projectId, folderId];

  const query = useQuery({
    queryKey: key,
    enabled: !!projectId && !!folderId,
    queryFn: async (): Promise<DocumentRow[]> => {
      // Most-recent version per name chain: filter out rows that are replaced by another.
      const { data, error } = await supabase
        .from('documents')
        .select('id, project_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by, version, replaces_document_id, source_kind, created_at, updated_at, deleted_at, deleted_by')
        .eq('project_id', projectId!)
        .eq('folder_id', folderId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = ((data as any) ?? []) as DocumentRow[];
      const replacedIds = new Set(rows.map(r => r.replaces_document_id).filter(Boolean) as string[]);
      return rows.filter(r => !replacedIds.has(r.id));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['documents', projectId] });
  };

  const uploadFiles = useMutation({
    mutationFn: async (files: File[]) => {
      if (!projectId || !folderId) throw new Error('Missing folder');
      if (!user) throw new Error('Not signed in');
      // Pull existing in-folder docs once to detect same-name versioning.
      const { data: existing, error: exErr } = await supabase
        .from('documents')
        .select('id, name, version, replaces_document_id')
        .eq('project_id', projectId)
        .eq('folder_id', folderId);
      if (exErr) throw exErr;
      const exRows = ((existing as any) ?? []) as Array<{ id: string; name: string; version: number; replaces_document_id: string | null }>;
      const replacedSet = new Set(exRows.map(r => r.replaces_document_id).filter(Boolean) as string[]);
      const latestByName = new Map<string, { id: string; version: number }>();
      for (const r of exRows) {
        if (replacedSet.has(r.id)) continue;
        latestByName.set(r.name.toLowerCase(), { id: r.id, version: r.version });
      }

      for (const file of files) {
        const id = crypto.randomUUID();
        const path = `${projectId}/${id}.${extOf(file.name)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (upErr) throw upErr;
        const prior = latestByName.get(file.name.toLowerCase());
        const { error: insErr } = await supabase.from('documents').insert({
          id,
          project_id: projectId,
          folder_id: folderId,
          name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user.id,
          version: prior ? prior.version + 1 : 1,
          replaces_document_id: prior?.id ?? null,
          source_kind: 'manual_upload',
        } as any);
        if (insErr) {
          // Best-effort cleanup of orphaned blob
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
          throw insErr;
        }
      }
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast({ title: `Uploaded ${vars.length} file${vars.length === 1 ? '' : 's'}` });
    },
    onError: (e: Error) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });

  const renameDocument = useMutation({
    mutationFn: async (vars: { id: string; name: string }) => {
      const { error } = await supabase.from('documents').update({ name: vars.name.trim() } as any).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Renamed' }); },
    onError: (e: Error) => toast({ title: 'Rename failed', description: e.message, variant: 'destructive' }),
  });

  const moveDocument = useMutation({
    mutationFn: async (vars: { id: string; folderId: string }) => {
      const { error } = await supabase.from('documents').update({ folder_id: vars.folderId } as any).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast({ title: 'Move failed', description: e.message, variant: 'destructive' }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: DocumentRow) => {
      // Delete row first; storage cleanup is best-effort and may fail silently for inspectors.
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {});
    },
    onSuccess: () => { invalidate(); toast({ title: 'Deleted' }); },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const uploadNewVersion = useMutation({
    mutationFn: async (vars: { prior: DocumentRow; file: File }) => {
      if (!projectId) throw new Error('Missing project');
      if (!user) throw new Error('Not signed in');
      const { prior, file } = vars;
      const id = crypto.randomUUID();
      const path = `${projectId}/${id}.${extOf(file.name)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined, upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('documents').insert({
        id,
        project_id: projectId,
        folder_id: prior.folder_id,
        name: prior.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
        version: prior.version + 1,
        replaces_document_id: prior.id,
        source_kind: 'manual_upload',
      } as any);
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
        throw insErr;
      }
    },
    onSuccess: () => { invalidate(); toast({ title: 'New version uploaded' }); },
    onError: (e: Error) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });

  const getDownloadUrl = async (doc: DocumentRow): Promise<string> => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    documents: query.data ?? [],
    isLoading: query.isLoading,
    uploadFiles, renameDocument, moveDocument, deleteDocument, uploadNewVersion,
    getDownloadUrl,
  };
}

/** Fetch the full version chain for a given current document. */
export async function fetchDocumentVersions(projectId: string, currentDocId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, project_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by, version, replaces_document_id, source_kind, created_at, updated_at')
    .eq('project_id', projectId);
  if (error) throw error;
  const rows = ((data as any) ?? []) as DocumentRow[];
  const byId = new Map(rows.map(r => [r.id, r]));
  const chain: DocumentRow[] = [];
  let cur: DocumentRow | undefined = byId.get(currentDocId);
  while (cur) {
    chain.push(cur);
    cur = cur.replaces_document_id ? byId.get(cur.replaces_document_id) : undefined;
  }
  return chain;
}
