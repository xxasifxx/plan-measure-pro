import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Trash2, UserPlus, Loader2, Search } from 'lucide-react';

interface TeamManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

interface MemberInfo {
  id: string; // project_members row id
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

interface SearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function TeamManager({ open, onOpenChange, projectId, projectName }: TeamManagerProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingRole, setAddingRole] = useState<string>('inspector');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: memberRows, error } = await supabase
        .from('project_members')
        .select('id, user_id, role')
        .eq('project_id', projectId);
      if (error) throw error;

      if (!memberRows || memberRows.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch profile info for each member
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setMembers(memberRows.map(m => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
        };
      }));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (open) fetchMembers();
  }, [open, fetchMembers]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', `%${query}%`)
        .limit(10);
      if (error) throw error;
      // Filter out existing members
      const existingIds = new Set(members.map(m => m.user_id));
      setSearchResults((data || []).filter(p => !existingIds.has(p.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [members]);

  const handleAddMember = async (userId: string) => {
    try {
      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: userId,
        role: addingRole,
      });
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already a member', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }
      toast({ title: 'Member added' });
      setSearchQuery('');
      setSearchResults([]);
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from this project?`)) return;
    try {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
      toast({ title: 'Member removed' });
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Team — {projectName}
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          {/* Add member */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Add Member</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm h-9"
                  placeholder="Search by email…"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <Select value={addingRole} onValueChange={setAddingRole}>
                <SelectTrigger className="w-[110px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector" className="text-xs">Inspector</SelectItem>
                  <SelectItem value="project_manager" className="text-xs">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border">
                {searchResults.map(result => (
                  <div key={result.id} className="flex items-center gap-2 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{result.full_name || 'Unnamed'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{result.email}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddMember(result.id)}>
                      <UserPlus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 3 && !searching && searchResults.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No users found. They need to be invited to the organization first.</p>
            )}
          </div>

          {/* Current members */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Current Members ({members.length})</p>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No team members assigned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.full_name || 'Unnamed'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{m.role.replace('_', ' ')}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(m.id, m.full_name || m.email || 'this member')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
