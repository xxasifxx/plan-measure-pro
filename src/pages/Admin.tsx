import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Shield, Users, FolderOpen, Sun, Moon, Loader2,
  UserPlus, Trash2, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AppRole = 'admin' | 'project_manager' | 'inspector';

interface UserWithRoles {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: AppRole[];
}

interface ProjectRow {
  id: string;
  name: string;
  contract_number: string | null;
}

interface MemberRow {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
}

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign inspector dialog
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; projectId: string; projectName: string }>({
    open: false, projectId: '', projectName: '',
  });
  const [selectedUserId, setSelectedUserId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, projectsRes, membersRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('projects').select('id, name, contract_number').order('updated_at', { ascending: false }),
        supabase.from('project_members').select('id, user_id, project_id, role'),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];

      const userMap: UserWithRoles[] = profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roles: roles.filter(r => r.user_id === p.id).map(r => r.role as AppRole),
      }));

      setUsers(userMap);
      setProjects(projectsRes.data || []);
      setMembers(membersRes.data || []);
    } catch (err: any) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (!authLoading && isAdmin) fetchData();
  }, [authLoading, isAdmin, navigate, fetchData]);

  const handleAddRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Role already assigned', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Role added' });
    fetchData();
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Role removed' });
    fetchData();
  };

  const handleAssignInspector = async () => {
    if (!selectedUserId || !assignDialog.projectId) return;
    const { error } = await supabase.from('project_members').insert({
      user_id: selectedUserId,
      project_id: assignDialog.projectId,
      role: 'inspector',
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already assigned', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Inspector assigned' });
    setAssignDialog({ open: false, projectId: '', projectName: '' });
    setSelectedUserId('');
    fetchData();
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from('project_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Member removed' });
    fetchData();
  };

  const inspectors = users.filter(u => u.roles.includes('inspector'));
  const getUserName = (userId: string) => {
    const u = users.find(x => x.id === userId);
    return u?.full_name || u?.email || userId.slice(0, 8);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-sm font-bold text-foreground flex-1">Admin Panel</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* ── Users & Roles ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Users & Roles</h2>
            <span className="text-xs text-muted-foreground">({users.length})</span>
          </div>

          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name || 'Unnamed'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {/* Current roles */}
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map(role => (
                    <Badge
                      key={role}
                      variant={role === 'admin' ? 'default' : 'secondary'}
                      className="text-[10px] gap-1 cursor-pointer group"
                      onClick={() => {
                        if (confirm(`Remove "${role}" role from ${user.full_name || user.email}?`)) {
                          handleRemoveRole(user.id, role);
                        }
                      }}
                    >
                      {role.replace('_', ' ')}
                      <Trash2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  ))}
                  {user.roles.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">No roles</span>
                  )}
                </div>

                {/* Add role */}
                <Select onValueChange={(val) => handleAddRole(user.id, val as AppRole)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
                    <SelectValue placeholder="Add role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'project_manager', 'inspector'] as AppRole[])
                      .filter(r => !user.roles.includes(r))
                      .map(r => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {r.replace('_', ' ')}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>

        {/* ── Projects & Assignments ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Project Assignments</h2>
            <span className="text-xs text-muted-foreground">({projects.length})</span>
          </div>

          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {projects.map(project => {
                const projectMembers = members.filter(m => m.project_id === project.id);
                return (
                  <div key={project.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                        {project.contract_number && (
                          <p className="text-[10px] text-muted-foreground">#{project.contract_number}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setAssignDialog({ open: true, projectId: project.id, projectName: project.name })}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    </div>

                    {projectMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {projectMembers.map(m => (
                          <Badge
                            key={m.id}
                            variant="secondary"
                            className="text-[10px] gap-1 cursor-pointer group"
                            onClick={() => {
                              if (confirm(`Remove ${getUserName(m.user_id)} from this project?`)) {
                                handleRemoveMember(m.id);
                              }
                            }}
                          >
                            {getUserName(m.user_id)} ({m.role})
                            <Trash2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No members assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Assign inspector dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => { if (!open) setAssignDialog({ open: false, projectId: '', projectName: '' }); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Assign to {assignDialog.projectName}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Select onValueChange={setSelectedUserId} value={selectedUserId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a user…" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => !members.some(m => m.project_id === assignDialog.projectId && m.user_id === u.id))
                  .map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-sm">
                      {u.full_name || u.email || u.id.slice(0, 8)}
                      {u.roles.length > 0 && ` (${u.roles.join(', ').replace(/_/g, ' ')})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignDialog({ open: false, projectId: '', projectName: '' })}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAssignInspector} disabled={!selectedUserId}>
              <Plus className="h-3 w-3 mr-1" /> Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
