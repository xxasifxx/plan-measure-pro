import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, FolderTree, Folder, FolderOpen, FilePlus, FolderPlus, Upload, Download,
  Pencil, Trash2, MoreVertical, ChevronRight, ChevronDown, History, Lock, FileText, Image as ImageIcon,
  Move, Loader2, Search, Eye, X, CheckCircle2, AlertCircle, Plus, FileUp, Star,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFolders, useDocuments, fetchDocumentVersions, type FolderRow, type DocumentRow } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BUCKET = 'project-documents';

const KIND_HINTS: Record<string, string> = {
  plans: 'Drawing sets and plan PDFs used for takeoff.',
  specs: 'Project standard specifications and addenda.',
  rfis: 'Requests for Information and responses.',
  submittals: 'Submittal packages awaiting review.',
  shop_drawings: 'Fabricator shop drawings.',
  change_orders: 'Approved and pending change orders.',
  daily_reports: 'Daily inspection reports and signed exports.',
  photos: 'Field photos from inspectors. JPG / PNG / HEIC.',
  as_builts: 'Final as-built drawings and red-lines.',
  correspondence: 'Letters, meeting minutes, transmittals.',
};

const fmtBytes = (n?: number | null) => {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const extOf = (s: string) => { const i = s.lastIndexOf('.'); return i > 0 ? s.slice(i + 1).toLowerCase() : 'bin'; };
const isImage = (m?: string | null) => !!m && m.startsWith('image/');
const isPdf = (m?: string | null, name?: string) => m === 'application/pdf' || (!!name && /\.pdf$/i.test(name));
const isPreviewable = (d: DocumentRow) => isImage(d.mime_type) || isPdf(d.mime_type, d.name);

const fileIcon = (mime?: string | null) => isImage(mime) ? ImageIcon : FileText;

function buildTree(folders: FolderRow[]) {
  const byParent = new Map<string | null, FolderRow[]>();
  for (const f of folders) {
    const k = f.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(f);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => {
      if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  return byParent;
}

function pathOf(folder: FolderRow | undefined, all: FolderRow[]): FolderRow[] {
  if (!folder) return [];
  const byId = new Map(all.map(f => [f.id, f]));
  const out: FolderRow[] = [];
  let cur: FolderRow | undefined = folder;
  while (cur) {
    out.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}

type UploadItem = { id: string; name: string; size: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string };

export default function Documents() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isManager, isAdmin } = useAuth();
  const qc = useQueryClient();
  const canManage = isManager || isAdmin;

  // Project meta — includes active plan/specs storage paths for "Active" derivation.
  const projectMetaQuery = useQuery({
    queryKey: ['project-meta', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name, created_by, pdf_storage_path, specs_storage_path')
        .eq('id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as { name: string; created_by: string; pdf_storage_path: string | null; specs_storage_path: string | null } | null;
    },
  });
  const projectMeta = projectMetaQuery.data;

  const isProjectCreator = !!user && !!projectMeta && projectMeta.created_by === user.id;
  const canManageThis = canManage || isProjectCreator;

  const { folders, isLoading: foldersLoading, createFolder, renameFolder, deleteFolder } = useFolders(projectId);
  const tree = useMemo(() => buildTree(folders), [folders]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFolderId || folders.length === 0) return;
    const plans = folders.find(f => f.system_kind === 'plans') ?? folders.find(f => f.parent_id == null) ?? folders[0];
    setSelectedFolderId(plans?.id ?? null);
    if (plans?.parent_id) {
      const path = pathOf(plans, folders);
      const newExp: Record<string, boolean> = {};
      for (const a of path) newExp[a.id] = true;
      setExpanded(newExp);
    }
  }, [folders, selectedFolderId]);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const breadcrumb = pathOf(selectedFolder, folders);

  const { documents, isLoading: docsLoading, renameDocument, moveDocument, deleteDocument, uploadNewVersion, getDownloadUrl } =
    useDocuments(projectId, selectedFolderId ?? undefined);

  const inspectorCanUploadHere =
    !!selectedFolder && (selectedFolder.system_kind === 'photos' || selectedFolder.system_kind === 'daily_reports');
  const canUploadHere = canManageThis || inspectorCanUploadHere;

  // ---- Search ----
  const [search, setSearch] = useState('');
  const filteredDocs = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(d => d.name.toLowerCase().includes(q));
  }, [documents, search]);

  // ---- Upload queue with per-file progress ----
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newVersionInputRef = useRef<HTMLInputElement>(null);
  const [newVersionTarget, setNewVersionTarget] = useState<DocumentRow | null>(null);

  const runUploads = async (files: File[]) => {
    if (!projectId || !selectedFolderId || !user) return;
    const folderId = selectedFolderId;
    const items: UploadItem[] = files.map(f => ({
      id: crypto.randomUUID(), name: f.name, size: f.size, status: 'pending',
    }));
    setUploadQueue(q => [...q, ...items]);

    // Same-name versioning lookup
    const { data: existing, error: exErr } = await supabase
      .from('documents')
      .select('id, name, version, replaces_document_id')
      .eq('project_id', projectId)
      .eq('folder_id', folderId);
    if (exErr) {
      setUploadQueue(q => q.map(p => items.find(i => i.id === p.id) ? { ...p, status: 'error', error: exErr.message } : p));
      return;
    }
    const exRows = (existing as any[]) ?? [];
    const replacedSet = new Set(exRows.map(r => r.replaces_document_id).filter(Boolean));
    const latestByName = new Map<string, { id: string; version: number }>();
    for (const r of exRows) {
      if (replacedSet.has(r.id)) continue;
      latestByName.set(r.name.toLowerCase(), { id: r.id, version: r.version });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const file = files[i];
      setUploadQueue(q => q.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p));
      try {
        const docId = crypto.randomUUID();
        const path = `${projectId}/${docId}.${extOf(file.name)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined, upsert: false,
        });
        if (upErr) throw upErr;
        const prior = latestByName.get(file.name.toLowerCase());
        const { error: insErr } = await supabase.from('documents').insert({
          id: docId,
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
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
          throw insErr;
        }
        if (prior) latestByName.set(file.name.toLowerCase(), { id: docId, version: prior.version + 1 });
        else latestByName.set(file.name.toLowerCase(), { id: docId, version: 1 });
        setUploadQueue(q => q.map(p => p.id === item.id ? { ...p, status: 'done' } : p));
      } catch (e: any) {
        setUploadQueue(q => q.map(p => p.id === item.id ? { ...p, status: 'error', error: e?.message ?? 'Failed' } : p));
      }
    }
    qc.invalidateQueries({ queryKey: ['documents', projectId] });
    // Auto-clear completed (keep failures sticky until dismissed).
    setTimeout(() => setUploadQueue(q => q.filter(p => p.status !== 'done')), 5000);
  };

  const handleUpload = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    runUploads(arr);
  };

  // ---- Preview ----
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!previewDoc) { setPreviewUrl(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    getDownloadUrl(previewDoc).then(url => {
      if (!cancelled) { setPreviewUrl(url); setPreviewLoading(false); }
    }).catch(e => {
      if (!cancelled) {
        toast({ title: 'Preview failed', description: e.message, variant: 'destructive' });
        setPreviewDoc(null); setPreviewLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [previewDoc]); // eslint-disable-line

  const handleOpen = async (doc: DocumentRow) => {
    if (isPreviewable(doc)) { setPreviewDoc(doc); return; }
    try {
      const url = await getDownloadUrl(doc);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (doc: DocumentRow) => {
    try {
      const url = await getDownloadUrl(doc);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  // ---- Active plan / specs ----
  const isActivePlan = (d: DocumentRow) => !!projectMeta?.pdf_storage_path && projectMeta.pdf_storage_path === d.storage_path;
  const isActiveSpecs = (d: DocumentRow) => !!projectMeta?.specs_storage_path && projectMeta.specs_storage_path === d.storage_path;

  const canSetActive = (d: DocumentRow): 'plan' | 'specs' | null => {
    if (!canManageThis) return null;
    if (!selectedFolder) return null;
    if (!isPdf(d.mime_type, d.name)) return null;
    if (selectedFolder.system_kind === 'plans') return 'plan';
    if (selectedFolder.system_kind === 'specs') return 'specs';
    return null;
  };

  const setAsActive = async (d: DocumentRow, kind: 'plan' | 'specs') => {
    if (!projectId) return;
    const column = kind === 'plan' ? 'pdf_storage_path' : 'specs_storage_path';
    const { error } = await supabase.from('projects').update({ [column]: d.storage_path } as any).eq('id', projectId);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: kind === 'plan' ? 'Set as active plan' : 'Set as active specs' });
    qc.invalidateQueries({ queryKey: ['project-meta', projectId] });
  };

  // ---- Dialogs ----
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ kind: 'folder' | 'doc'; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [moveTarget, setMoveTarget] = useState<DocumentRow | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>('');
  const [versionsFor, setVersionsFor] = useState<DocumentRow | null>(null);
  const [versions, setVersions] = useState<DocumentRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'folder' | 'doc'; id: string; name: string; doc?: DocumentRow } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const openVersions = async (doc: DocumentRow) => {
    if (!projectId) return;
    setVersionsFor(doc);
    setVersions([]);
    const chain = await fetchDocumentVersions(projectId, doc.id);
    setVersions(chain);
  };

  // ---- Tree rendering ----
  const renderTree = (parentId: string | null, depth = 0): JSX.Element[] => {
    const children = tree.get(parentId) ?? [];
    return children.flatMap(f => {
      const hasChildren = (tree.get(f.id) ?? []).length > 0;
      const isOpen = expanded[f.id] ?? false;
      const isSel = selectedFolderId === f.id;
      const Icon = isSel || isOpen ? FolderOpen : Folder;
      const inspectorWritable = f.system_kind === 'photos' || f.system_kind === 'daily_reports';
      const locked = !canManageThis && !inspectorWritable;
      const row = (
        <div
          key={f.id}
          onClick={() => setSelectedFolderId(f.id)}
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm select-none transition-colors',
            isSel ? 'bg-primary/20 ring-1 ring-primary/40 text-foreground'
                  : locked ? 'opacity-60 hover:bg-muted/30 hover:opacity-80'
                           : 'hover:bg-muted/40',
          )}
          style={{ paddingLeft: 8 + depth * 14 }}
          title={locked ? 'Read-only for your role' : undefined}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(s => ({ ...s, [f.id]: !s[f.id] })); }}
            className="h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            {hasChildren ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
          </button>
          <Icon className={cn('h-4 w-4 shrink-0', f.is_system && !locked ? 'text-primary' : 'text-muted-foreground')} />
          <span className="truncate flex-1 font-mono text-xs">{f.name}</span>
          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </div>
      );
      const childRows = hasChildren && isOpen ? renderTree(f.id, depth + 1) : [];
      return [row, ...childRows];
    });
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Button asChild><Link to="/auth">Sign in</Link></Button></div>;
  }

  const showFab = canUploadHere && !!selectedFolderId;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to={projectId ? `/project/${projectId}` : '/'}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <FolderTree className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-mono font-bold tracking-wider uppercase truncate">
            Documents{projectMeta ? ` · ${projectMeta.name}` : ''}
          </h1>
          <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
            {canManageThis ? 'FULL ACCESS' : 'READ + LIMITED UPLOAD'}
          </Badge>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-2 sm:px-4 py-3 sm:py-4 flex gap-4 min-h-0">
        {/* Folder tree (desktop) */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col border border-border rounded-md bg-card overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Folders</span>
            {canManageThis && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setNewFolderName(''); setNewFolderOpen(true); }} title="New folder">
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {foldersLoading ? (
              <div className="p-6 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : folders.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">No folders yet.</p>
            ) : (
              renderTree(null)
            )}
          </div>
        </aside>

        {/* File list */}
        <section
          className={cn(
            'flex-1 flex flex-col border border-border rounded-md bg-card overflow-hidden min-w-0',
            dragOver && 'ring-2 ring-primary/60',
          )}
          onDragOver={(e) => { if (canUploadHere) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            setDragOver(false);
            if (!canUploadHere) return;
            e.preventDefault();
            if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
          }}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
            {/* Mobile folder picker + create */}
            <div className="md:hidden flex items-center gap-1 flex-1 min-w-0">
              <Select value={selectedFolderId ?? ''} onValueChange={(v) => setSelectedFolderId(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a folder" /></SelectTrigger>
                <SelectContent>
                  {folders.map(f => {
                    const p = pathOf(f, folders).map(x => x.name).join(' / ');
                    const inspectorWritable = f.system_kind === 'photos' || f.system_kind === 'daily_reports';
                    const locked = !canManageThis && !inspectorWritable;
                    return (
                      <SelectItem key={f.id} value={f.id} className="text-xs font-mono">
                        <span className="flex items-center gap-1.5">{locked && <Lock className="h-3 w-3 text-muted-foreground" />}{p}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {canManageThis && (
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => { setNewFolderName(''); setNewFolderOpen(true); }} title="New folder">
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {/* Breadcrumbs (desktop) */}
            <div className="hidden md:flex items-center gap-1 text-xs font-mono text-muted-foreground flex-1 min-w-0 truncate">
              {breadcrumb.length === 0 ? <span>Select a folder</span> : breadcrumb.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <button onClick={() => setSelectedFolderId(b.id)} className={cn(i === breadcrumb.length - 1 ? 'text-foreground font-semibold' : 'hover:text-foreground')}>
                    {b.name}
                  </button>
                </span>
              ))}
            </div>
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-56 min-w-0 order-3 sm:order-none basis-full sm:basis-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files…"
                className="h-8 pl-7 pr-7 text-xs font-mono"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Actions (desktop) */}
            <div className="hidden sm:flex items-center gap-1">
              {canUploadHere && (
                <>
                  <input ref={fileInputRef} type="file" multiple className="hidden"
                    onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }} />
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={!selectedFolderId}>
                    <Upload className="h-3.5 w-3.5" /><span className="text-xs">Upload</span>
                  </Button>
                </>
              )}
              {canManageThis && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setNewFolderName(''); setNewFolderOpen(true); }}>
                  <FolderPlus className="h-3.5 w-3.5" /><span className="text-xs hidden md:inline">New folder</span>
                </Button>
              )}
              {canManageThis && selectedFolder && !selectedFolder.is_system && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Folder actions"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setRenameTarget({ kind: 'folder', id: selectedFolder.id, name: selectedFolder.name }); setRenameValue(selectedFolder.name); }}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />Rename folder
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ kind: 'folder', id: selectedFolder.id, name: selectedFolder.name })}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Delete folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Folder hint / locked banner */}
          {selectedFolder?.system_kind && KIND_HINTS[selectedFolder.system_kind] && (
            <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-border/50 bg-muted/10 flex items-center gap-2 flex-wrap">
              <span>{KIND_HINTS[selectedFolder.system_kind]}</span>
              {!canManageThis && !inspectorCanUploadHere && (
                <span className="inline-flex items-center gap-1 text-amber-400 font-mono uppercase tracking-wider text-[10px]">
                  <Lock className="h-3 w-3" /> Read-only for your role
                </span>
              )}
            </div>
          )}

          {/* Hidden input for new-version upload */}
          <input
            ref={newVersionInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && newVersionTarget) {
                uploadNewVersion.mutate({ prior: newVersionTarget, file: f }, {
                  onSettled: () => setNewVersionTarget(null),
                });
              }
              e.target.value = '';
            }}
          />

          {/* Files */}
          <div className="flex-1 overflow-auto">
            {!selectedFolderId ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Select a folder to see its contents.</div>
            ) : docsLoading ? (
              <div className="p-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-10 text-center">
                {search ? (
                  <>
                    <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No files match "{search}".</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch('')}>Clear search</Button>
                  </>
                ) : !canUploadHere ? (
                  <>
                    <Lock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">This folder is read-only for your role.</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Inspectors can upload only to Photos and Daily Reports.</p>
                  </>
                ) : (
                  <>
                    <FilePlus className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No files in this folder.</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Drag files here or tap Upload.</p>
                  </>
                )}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-4 py-2">Name</th>
                    <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Size</th>
                    <th className="text-left font-medium px-3 py-2 hidden md:table-cell">Uploaded</th>
                    <th className="text-right font-medium px-4 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map(d => {
                    const Icon = fileIcon(d.mime_type);
                    const previewable = isPreviewable(d);
                    const activeAs = canSetActive(d);
                    const activePlan = isActivePlan(d);
                    const activeSpecs = isActiveSpecs(d);
                    return (
                      <tr key={d.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 min-w-0">
                          <button onClick={() => handleOpen(d)} className="flex items-center gap-2 text-left group max-w-full">
                            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                            <span className="font-mono truncate group-hover:text-primary">{d.name}</span>
                            {d.version > 1 && <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">v{d.version}</Badge>}
                            {activePlan && <Badge className="text-[9px] h-4 px-1 shrink-0 gap-0.5"><Star className="h-2.5 w-2.5" />Active plan</Badge>}
                            {activeSpecs && <Badge className="text-[9px] h-4 px-1 shrink-0 gap-0.5"><Star className="h-2.5 w-2.5" />Active specs</Badge>}
                          </button>
                        </td>
                        <td className="text-right px-3 py-2 hidden sm:table-cell text-muted-foreground font-mono">{fmtBytes(d.size_bytes)}</td>
                        <td className="px-3 py-2 hidden md:table-cell text-muted-foreground font-mono">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="text-right px-2 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {previewable && (
                                <DropdownMenuItem onClick={() => setPreviewDoc(d)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />Preview
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDownload(d)}>
                                <Download className="h-3.5 w-3.5 mr-2" />Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openVersions(d)}>
                                <History className="h-3.5 w-3.5 mr-2" />Versions
                              </DropdownMenuItem>
                              {canManageThis && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setNewVersionTarget(d); newVersionInputRef.current?.click(); }}>
                                    <FileUp className="h-3.5 w-3.5 mr-2" />Upload new version
                                  </DropdownMenuItem>
                                  {activeAs === 'plan' && !activePlan && (
                                    <DropdownMenuItem onClick={() => setAsActive(d, 'plan')}>
                                      <Star className="h-3.5 w-3.5 mr-2" />Set as active plan
                                    </DropdownMenuItem>
                                  )}
                                  {activeAs === 'specs' && !activeSpecs && (
                                    <DropdownMenuItem onClick={() => setAsActive(d, 'specs')}>
                                      <Star className="h-3.5 w-3.5 mr-2" />Set as active specs
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => { setRenameTarget({ kind: 'doc', id: d.id, name: d.name }); setRenameValue(d.name); }}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setMoveTarget(d); setMoveTargetFolder(d.folder_id); }}>
                                    <Move className="h-3.5 w-3.5 mr-2" />Move
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ kind: 'doc', id: d.id, name: d.name, doc: d })}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* Mobile FAB */}
      {showFab && (
        <>
          <input ref={fileInputRef} type="file" multiple className="hidden sm:hidden"
            onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="sm:hidden fixed bottom-5 right-5 z-20 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition"
            aria-label="Upload to this folder"
          >
            <Plus className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Upload progress toaster (bottom-left) */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-30 bg-card border border-border rounded-md shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Uploads · {uploadQueue.filter(u => u.status === 'done').length}/{uploadQueue.length}
            </span>
            <button onClick={() => setUploadQueue([])} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {uploadQueue.map(u => (
              <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border/40 last:border-0">
                {u.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                {u.status === 'pending' && <Loader2 className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
                {u.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                {u.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                <span className="font-mono truncate flex-1" title={u.error || u.name}>{u.name}</span>
                <span className="text-muted-foreground font-mono text-[10px] shrink-0">{fmtBytes(u.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 py-2 border-b border-border flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-mono text-sm truncate pr-4">{previewDoc?.name}</DialogTitle>
            <div className="flex items-center gap-1">
              {previewDoc && (
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => handleDownload(previewDoc)}>
                  <Download className="h-3.5 w-3.5" /><span className="text-xs">Download</span>
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30 flex items-center justify-center overflow-auto">
            {previewLoading || !previewUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : previewDoc && isImage(previewDoc.mime_type) ? (
              <img src={previewUrl} alt={previewDoc.name} className="max-w-full max-h-full object-contain" />
            ) : previewDoc && isPdf(previewDoc.mime_type, previewDoc.name) ? (
              <iframe src={previewUrl} title={previewDoc.name} className="w-full h-full bg-background" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              {selectedFolder ? <>Inside <span className="font-mono">{breadcrumb.map(b => b.name).join(' / ')}</span></> : 'At the top level'}
            </DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button
              disabled={!newFolderName.trim() || createFolder.isPending}
              onClick={() => {
                createFolder.mutate(
                  { name: newFolderName, parentId: selectedFolderId },
                  { onSuccess: () => setNewFolderOpen(false) },
                );
              }}
            >Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.kind === 'folder' ? 'folder' : 'file'}</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (!renameTarget) return;
                const m = renameTarget.kind === 'folder' ? renameFolder : renameDocument;
                m.mutate({ id: renameTarget.id, name: renameValue }, { onSuccess: () => setRenameTarget(null) });
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={!!moveTarget} onOpenChange={(o) => !o && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move file</DialogTitle>
            <DialogDescription>Pick a destination folder.</DialogDescription>
          </DialogHeader>
          <Select value={moveTargetFolder} onValueChange={setMoveTargetFolder}>
            <SelectTrigger><SelectValue placeholder="Choose folder" /></SelectTrigger>
            <SelectContent>
              {folders.map(f => {
                const p = pathOf(f, folders).map(x => x.name).join(' / ');
                return <SelectItem key={f.id} value={f.id} className="text-xs font-mono">{p}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button
              disabled={!moveTargetFolder || moveTargetFolder === moveTarget?.folder_id}
              onClick={() => {
                if (!moveTarget) return;
                moveDocument.mutate(
                  { id: moveTarget.id, folderId: moveTargetFolder },
                  { onSuccess: () => setMoveTarget(null) },
                );
              }}
            >Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions drawer */}
      <Dialog open={!!versionsFor} onOpenChange={(o) => !o && setVersionsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Versions of {versionsFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {versions.length === 0 ? <p className="text-xs text-muted-foreground">Loading…</p> : versions.map((v, i) => (
              <div key={v.id} className="flex items-center gap-2 text-xs border border-border rounded p-2">
                <Badge variant={i === 0 ? 'default' : 'outline'} className="text-[10px]">v{v.version}{i === 0 && ' · current'}</Badge>
                <span className="font-mono truncate flex-1">{v.name}</span>
                <span className="text-muted-foreground font-mono">{new Date(v.created_at).toLocaleString()}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(v)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.kind === 'folder' ? 'folder' : 'file'}?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.kind === 'folder'
                ? `This cannot be undone. The folder must be empty.`
                : `This cannot be undone. "${deleteTarget?.name}" will be permanently removed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.kind === 'folder') {
                  deleteFolder.mutate(deleteTarget.id, {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      if (selectedFolderId === deleteTarget.id) setSelectedFolderId(null);
                    },
                  });
                } else if (deleteTarget.doc) {
                  deleteDocument.mutate(deleteTarget.doc, { onSuccess: () => setDeleteTarget(null) });
                }
              }}
            >Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
