import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'project_manager' | 'inspector' | 'resident_engineer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isManager: boolean;
  isInspector: boolean;
  isAdmin: boolean;
  isResidentEngineer: boolean;
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

  const fetchedForRef = (typeof window !== 'undefined') ? (window as any).__authFetchRef ?? ((window as any).__authFetchRef = { current: null as string | null }) : { current: null as string | null };

  const fetchRolesAndProfile = useCallback(async (userId: string) => {
    // L-4: avoid double-fire on boot when both onAuthStateChange and
    // getSession resolve with the same session.
    if (fetchedForRef.current === userId) return;
    fetchedForRef.current = userId;
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('full_name, email').eq('id', userId).single(),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data.map(r => r.role as AppRole));
    if (profileRes.data) setProfile(profileRes.data);
  }, [fetchedForRef]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer to avoid deadlock
        setTimeout(async () => {
          // Only try to assign owner role on actual sign-in, not on every token refresh
          if (_event === 'SIGNED_IN') {
            try { await supabase.rpc('assign_owner_role', { _user_id: session.user.id }); } catch {}
          }
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

    // Refresh session when the app returns from background (fixes 401s after
    // resume on iOS / installed PWAs sitting overnight on the home screen).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
    isResidentEngineer: hasRole('resident_engineer'),
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
