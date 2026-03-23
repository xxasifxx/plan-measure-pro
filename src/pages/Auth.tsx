import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { HardHat, LogIn, UserPlus, Mail, KeyRound } from 'lucide-react';

const INVITATION_TOKEN_KEY = 'pending_invitation_token';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const { toast } = useToast();

  const isInvitedFlow = !!invitationToken;

  // Persist invitation token to localStorage so it survives email confirmation redirect
  useEffect(() => {
    if (invitationToken) {
      localStorage.setItem(INVITATION_TOKEN_KEY, invitationToken);
    }
  }, [invitationToken]);

  // Accept invitation after login if token present (URL or localStorage)
  useEffect(() => {
    const token = invitationToken || localStorage.getItem(INVITATION_TOKEN_KEY);
    if (!token) return;

    const acceptInvitation = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setAcceptingInvite(true);
      try {
        const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
        if (error) throw error;
        if (data === 'ok') {
          toast({ title: 'Welcome!', description: 'Your role has been assigned.' });
          localStorage.removeItem(INVITATION_TOKEN_KEY);
        } else if (data === 'email_mismatch') {
          toast({ title: 'Email mismatch', description: 'This invitation was sent to a different email.', variant: 'destructive' });
        } else {
          toast({ title: 'Invalid invitation', description: 'This invitation link has expired or already been used.', variant: 'destructive' });
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setAcceptingInvite(false);
      }
    };

    acceptInvitation();
  }, [invitationToken, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
        return;
      }

      if (mode === 'signup') {
        const metadata: Record<string, string> = { full_name: fullName };
        if (!isInvitedFlow) {
          metadata.org_name = orgName;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: invitationToken
              ? `${window.location.origin}/auth?invitation=${invitationToken}`
              : window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: 'Account created', description: 'Check your email to confirm your account.' });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // After sign-in, try to assign owner role (no-op if already has roles or was invited)
        if (data.user) {
          await supabase.rpc('assign_owner_role', { _user_id: data.user.id });
        }

        // If there's an invitation token (URL or localStorage), accept it
        const token = invitationToken || localStorage.getItem(INVITATION_TOKEN_KEY);
        if (token) {
          const { data: result } = await supabase.rpc('accept_invitation', { _token: token });
          if (result === 'ok') {
            toast({ title: 'Invitation accepted!' });
            localStorage.removeItem(INVITATION_TOKEN_KEY);
          }
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <HardHat className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Quantity Takeoff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isInvitedFlow
              ? 'Sign in or create an account to join your team'
              : mode === 'signup'
                ? 'Create your organization account'
                : mode === 'forgot'
                  ? 'Reset your password'
                  : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-6">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" required />
              </div>
              {!isInvitedFlow && (
                <div className="space-y-2">
                  <Label htmlFor="org">Organization Name</Label>
                  <Input id="org" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Smith Construction LLC" required />
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          {mode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || acceptingInvite}>
            {loading ? 'Please wait...' : mode === 'signup' ? (
              <><UserPlus className="h-4 w-4 mr-2" /> {isInvitedFlow ? 'Join Team' : 'Create Account'}</>
            ) : mode === 'forgot' ? (
              <><Mail className="h-4 w-4 mr-2" /> Send Reset Link</>
            ) : (
              <><LogIn className="h-4 w-4 mr-2" /> Sign In</>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            {mode === 'signin' && (
              <>
                <p>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">
                    Sign up
                  </button>
                </p>
                <p>
                  <button type="button" onClick={() => setMode('forgot')} className="text-primary font-medium hover:underline">
                    Forgot password?
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('signin')} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                <button type="button" onClick={() => setMode('signin')} className="text-primary font-medium hover:underline">
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
