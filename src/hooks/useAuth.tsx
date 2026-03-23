import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'project_manager' | 'inspector';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isManager: boolean;
  isInspector: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  profile: { full_name: string; email: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);

  const fetchRolesAndProfile = useCallback(async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('full_name, email').eq('id', userId).single(),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data.map(r => r.role as AppRole));
    if (profileRes.data) setProfile(profileRes.data);
  }, []);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer to avoid deadlock
        setTimeout(async () => {
          // Try to assign owner role on first login (no-op if already has roles)
          try { await supabase.rpc('assign_owner_role', { _user_id: session.user.id }); } catch {};
          fetchRolesAndProfile(session.user.id);
        }, 0);
      } else {
        setRoles([]);
        setProfile(null);
      }
      setLoading(false);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRolesAndProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRolesAndProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    roles,
    hasRole,
    isManager: hasRole('project_manager') || hasRole('admin'),
    isInspector: hasRole('inspector'),
    isAdmin: hasRole('admin'),
    signOut,
    profile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
