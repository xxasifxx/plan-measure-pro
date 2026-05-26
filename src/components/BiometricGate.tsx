import { useEffect, useState } from "react";
import { Fingerprint, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isNative } from "@/lib/native/platform";
import { getStatus, unlock, unenroll } from "@/lib/native/biometric";
import { toast } from "sonner";

/**
 * Native-only cold-start gate. If the device has an enrolled biometric
 * credential and there is no active Supabase session, the user must pass
 * the biometric prompt before the rest of the app is shown. Falls through
 * silently on the web.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNative()) { setChecking(false); return; }
    if (loading) return;
    let cancelled = false;
    (async () => {
      // If we already have a session, no gate needed.
      if (session) { setChecking(false); setNeedsUnlock(false); return; }
      const status = await getStatus();
      if (cancelled) return;
      if (!status.enrolled) { setChecking(false); setNeedsUnlock(false); return; }
      setNeedsUnlock(true);
      setChecking(false);
      // Auto-prompt once on cold start.
      void tryUnlock();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading]);

  const tryUnlock = async () => {
    setBusy(true);
    try {
      const refresh = await unlock();
      if (!refresh) {
        toast.error("Biometric unlock cancelled");
        return;
      }
      const { error } = await supabase.auth.refreshSession({ refresh_token: refresh });
      if (error) {
        toast.error("Stored credential expired — please sign in again");
        await unenroll();
        setNeedsUnlock(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const useDifferentAccount = async () => {
    await unenroll();
    setNeedsUnlock(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsUnlock && !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-6">
        <Fingerprint className="w-16 h-16 text-primary" />
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">TakeoffPro</h1>
          <p className="text-sm text-muted-foreground">Unlock to continue</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button onClick={tryUnlock} disabled={busy} size="lg">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
            Unlock
          </Button>
          <Button variant="ghost" size="sm" onClick={useDifferentAccount}>
            <LogIn className="w-4 h-4 mr-2" /> Use a different account
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
