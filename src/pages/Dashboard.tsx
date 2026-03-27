import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { useTour } from '@/hooks/useTour';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  HardHat, Plus, LogOut, Sun, Moon, FileText, Clock, PenTool,
  Trash2, FolderOpen, Loader2, AlertCircle, Shield, HelpCircle, Users,
  ChevronDown, ChevronUp, Ruler,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { WelcomeCarousel } from '@/components/WelcomeCarousel';
import { GuidedTour } from '@/components/GuidedTour';
import type { TourStep } from '@/hooks/useTour';

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-info/15 text-info border-info/30',
  project_manager: 'bg-success/15 text-success border-success/30',
  inspector: 'bg-primary/15 text-primary border-primary/30',
  user: 'bg-muted text-muted-foreground border-border',
};

export default function Dashboard() {
  const { user, profile, isManager, isAdmin, signOut, roles } = useAuth();
  const { projects, isLoading, createProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Create project dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContract, setNewContract] = useState('');
  const [newPdf, setNewPdf] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !newPdf) {
      toast({ title: 'Missing info', description: 'Name and PDF are required.', variant: 'destructive' });
      return;
    }
    try {
      const result = await createProject.mutateAsync({
        name: newName.trim(),
        contractNumber: newContract.trim(),
        pdfFile: newPdf,
      });
      setShowCreate(false);
      setNewName('');
      setNewContract('');
      setNewPdf(null);
      toast({ title: 'Project created' });
      navigate(`/project/${result.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProject.mutateAsync(id);
      toast({ title: 'Project deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const roleBadge = roles[0] ? roles[0].replace('_', ' ') : 'user';
  const roleKey = roles[0] || 'user';

  // PM progress detail
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<{
    inspectors: { name: string; count: number; lastActive: string }[];
    pagesAnnotated: number;
    totalPages: number;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadProjectDetail = async (projectId: string) => {
    if (expandedProject === projectId) { setExpandedProject(null); return; }
    setExpandedProject(projectId);
    setProjectDetail(null);
    setDetailLoading(true);
    try {
      const { data: anns } = await supabase
        .from('annotations')
        .select('user_id, page, created_at')
        .eq('project_id', projectId);

      const { data: proj } = await supabase.storage
        .from('project-pdfs')
        .list(projectId.split('/')[0]);

      const byUser: Record<string, { count: number; lastActive: string }> = {};
      const pages = new Set<number>();
      (anns || []).forEach(a => {
        pages.add(a.page);
        if (!byUser[a.user_id]) byUser[a.user_id] = { count: 0, lastActive: a.created_at };
        byUser[a.user_id].count++;
        if (a.created_at > byUser[a.user_id].lastActive) byUser[a.user_id].lastActive = a.created_at;
      });

      const userIds = Object.keys(byUser);
      let inspectors: { name: string; count: number; lastActive: string }[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        inspectors = userIds.map(uid => {
          const p = (profiles || []).find(pr => pr.id === uid);
          return {
            name: p?.full_name || p?.email || 'Unknown',
            count: byUser[uid].count,
            lastActive: byUser[uid].lastActive,
          };
        }).sort((a, b) => b.count - a.count);
      }

      setProjectDetail({ inspectors, pagesAnnotated: pages.size, totalPages: 0 });
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  // Welcome carousel
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (profile && !(profile as any).has_seen_welcome) {
      setShowWelcome(true);
    }
  }, [profile]);

  // Guided tour
  const dashboardTour = useTour('dashboard');
  const dashboardSteps: TourStep[] = [
    ...(isManager || isAdmin ? [{
      target: '[data-tour="new-project"]',
      title: 'Create a Project',
      description: 'Start by creating a new project. Upload a plan PDF and configure pay items for your team.',
      position: 'bottom' as const,
    }] : []),
    {
      target: '[data-tour="project-card"]',
      title: 'Open a Project',
      description: 'Click any project card to open the workspace and start measuring.',
      position: 'bottom' as const,
    },
    {
      target: '[data-tour="role-badge"]',
      title: 'Your Role',
      description: 'Your role determines what you can do — managers configure projects, inspectors annotate.',
      position: 'bottom' as const,
    },
  ];

  useEffect(() => {
    if (!showWelcome && profile && !isLoading && projects.length > 0) {
      const timer = setTimeout(() => dashboardTour.startIfNew(), 500);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, profile, isLoading, projects.length]);

  return (
    <div className="min-h-screen bg-background blueprint-grid">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <Ruler className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground tracking-wide">TakeoffPro</h1>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.full_name || user?.email}
            </p>
          </div>
          <span
            data-tour="role-badge"
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border',
              ROLE_STYLES[roleKey] || ROLE_STYLES.user
            )}
          >
            {roleBadge}
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => dashboardTour.start()} title="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/admin')} title="Admin Panel">
              <Shield className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Title + Create button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Projects</h2>
            <p className="text-xs text-muted-foreground mt-0.5">NJTA & NJDOT Construction Takeoffs</p>
          </div>
          {(isManager || isAdmin) && (
            <Button data-tour="new-project" onClick={() => setShowCreate(true)} className="shadow-md">
              <Plus className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 shadow-inner">
              <FolderOpen className="h-10 w-10 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground mb-2">No projects yet</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {isAdmin
                ? 'Create a project or invite your team from the Admin panel.'
                : isManager
                  ? 'Create a new project to get started with your quantity takeoff.'
                  : (
                    <>
                      You haven't been assigned to any projects yet.
                      <br />
                      Share your email with your project manager:
                      <span className="block mt-2 font-semibold text-foreground select-all text-base">{user?.email}</span>
                    </>
                  )}
            </p>
            {(isManager || isAdmin) && (
              <Button className="mt-6 shadow-md" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Project
              </Button>
            )}
          </div>
        )}

        {/* Project cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx) => {
            const annCount = project.annotation_count || 0;
            const progressPct = annCount > 0 ? Math.min(100, Math.round((annCount / Math.max(annCount, 50)) * 100)) : 0;

            return (
              <button
                key={project.id}
                data-tour={idx === 0 ? 'project-card' : undefined}
                onClick={() => navigate(`/project/${project.id}`)}
                className={cn(
                  'group text-left w-full rounded-xl border bg-card p-5',
                  'hover:border-primary/50 hover:shadow-lg transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'border-border'
                )}
              >
                {/* Top row: icon + contract + delete */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate leading-tight">{project.name}</h3>
                      {project.contract_number && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">#{project.contract_number}</p>
                      )}
                    </div>
                  </div>
                  {project.member_role === 'owner' && (
                    <span
                      role="button"
                      onClick={e => { e.stopPropagation(); handleDelete(project.id, project.name); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {annCount > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{annCount} annotations</span>
                    </div>
                    <Progress value={progressPct} className="h-1.5" />
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {project.latest_annotation_at
                      ? `${new Date(project.latest_annotation_at).toLocaleDateString()}`
                      : new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5" />
                    {annCount}
                  </span>
                  {project.member_role === 'owner' && (project.member_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {project.member_count}
                    </span>
                  )}
                </div>

                {/* Footer: role badge + details */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border',
                    project.member_role === 'owner'
                      ? ROLE_STYLES.project_manager
                      : ROLE_STYLES.inspector
                  )}>
                    {project.member_role === 'owner' ? 'Manager' : project.member_role}
                  </span>
                  {project.member_role === 'owner' && (
                    <span
                      role="button"
                      onClick={e => { e.stopPropagation(); loadProjectDetail(project.id); }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Details
                      {expandedProject === project.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </div>

                {/* Expanded progress detail */}
                {expandedProject === project.id && (
                  <div className="mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                    {detailLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                    ) : projectDetail ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {projectDetail.pagesAnnotated} pages with annotations
                        </p>
                        {projectDetail.inspectors.length > 0 ? (
                          <div className="space-y-1.5">
                            {projectDetail.inspectors.map((insp, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-foreground truncate max-w-[140px]">{insp.name}</span>
                                <span className="text-muted-foreground font-mono">
                                  {insp.count} ann · {new Date(insp.lastActive).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No annotations yet</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Create project dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Project Name</Label>
              <Input id="proj-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Main Street Reconstruction" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-contract">Contract Number (optional)</Label>
              <Input id="proj-contract" value={newContract} onChange={e => setNewContract(e.target.value)} placeholder="CT-2026-001" />
            </div>
            <div className="space-y-2">
              <Label>Plan PDF</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                  newPdf ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'
                )}
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {newPdf ? newPdf.name : 'Choose PDF file...'}
                </span>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setNewPdf(e.target.files[0]); }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createProject.isPending}>
              {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showWelcome && user && (
        <WelcomeCarousel open={showWelcome} onDismiss={() => setShowWelcome(false)} userId={user.id} roles={roles as any} />
      )}

      <GuidedTour
        steps={dashboardSteps}
        currentStep={dashboardTour.currentStep}
        isActive={dashboardTour.isActive}
        onNext={() => dashboardTour.next(dashboardSteps.length)}
        onPrev={dashboardTour.prev}
        onSkip={dashboardTour.skip}
      />
    </div>
  );
}
