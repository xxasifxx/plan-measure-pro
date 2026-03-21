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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  HardHat, Plus, LogOut, Sun, Moon, FileText, Clock, PenTool,
  Trash2, FolderOpen, Loader2, AlertCircle, Shield, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WelcomeCarousel } from '@/components/WelcomeCarousel';
import { GuidedTour } from '@/components/GuidedTour';
import type { TourStep } from '@/hooks/useTour';

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <HardHat className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">Quantity Takeoff</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {profile?.full_name || user?.email}
              <span data-tour="role-badge" className="ml-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-semibold uppercase">
                {roleBadge}
              </span>
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dashboardTour.start()} title="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/admin')} title="Admin Panel">
              <Shield className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Title + Create button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Projects</h2>
          {(isManager || isAdmin) && (
            <Button data-tour="new-project" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {isManager
                ? 'Create a new project to get started with your quantity takeoff.'
                : 'You haven\'t been assigned to any projects yet. Ask your project manager to add you.'}
            </p>
            {(isManager || isAdmin) && (
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Project
              </Button>
            )}
          </div>
        )}

        {/* Project cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className={cn(
                'group text-left w-full rounded-xl border border-border bg-card p-4',
                'hover:border-primary/40 hover:shadow-md transition-all',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                {project.member_role === 'owner' && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); handleDelete(project.id, project.name); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate mb-0.5">{project.name}</h3>
              {project.contract_number && (
                <p className="text-[10px] text-muted-foreground truncate mb-2">#{project.contract_number}</p>
              )}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <PenTool className="h-3 w-3" />
                  {project.annotation_count || 0} annotations
                </span>
              </div>
              <div className="mt-2">
                <span className={cn(
                  'text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded',
                  project.member_role === 'owner'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {project.member_role === 'owner' ? 'Manager' : project.member_role}
                </span>
              </div>
            </button>
          ))}
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
                  'flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
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
    </div>
  );
}
