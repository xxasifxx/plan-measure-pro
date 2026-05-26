import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Fingerprint, Bell, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { isNative, platform } from "@/lib/native/platform";
import { getStatus as getBio, enroll as enrollBio, unenroll as unenrollBio } from "@/lib/native/biometric";
import { isOptedIn, registerPush, unregisterPush } from "@/lib/native/push";
import { isBackgroundSyncEnabled, setBackgroundSyncEnabled, initBackgroundSync } from "@/lib/native/background-sync";
import { toast } from "sonner";

export default function Settings() {
  const { session, profile } = useAuth();
  const native = isNative();

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const [bgSync, setBgSync] = useState(isBackgroundSyncEnabled());

  useEffect(() => {
    (async () => {
      if (!native) return;
      const s = await getBio();
      setBioAvailable(s.available);
      setBioEnrolled(s.enrolled);
      setPushEnabled(isOptedIn());
    })();
  }, [native]);

  const toggleBio = async (next: boolean) => {
    if (!session?.refresh_token) {
      toast.error("Sign in first to enable biometric unlock");
      return;
    }
    setBioBusy(true);
    try {
      if (next) {
        await enrollBio(session.refresh_token);
        setBioEnrolled(true);
        toast.success("Biometric unlock enabled");
      } else {
        await unenrollBio();
        setBioEnrolled(false);
        toast.success("Biometric unlock disabled");
      }
    } catch {
      toast.error("Could not update biometric unlock");
    } finally {
      setBioBusy(false);
    }
  };

  const togglePush = async (next: boolean) => {
    setPushBusy(true);
    try {
      if (next) {
        const ok = await registerPush();
        setPushEnabled(ok);
        if (!ok) toast.error("Notification permission denied");
        else toast.success("Notifications enabled");
      } else {
        await unregisterPush();
        setPushEnabled(false);
        toast.success("Notifications disabled");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const toggleBg = (next: boolean) => {
    setBgSync(next);
    setBackgroundSyncEnabled(next);
    if (next) void initBackgroundSync();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>{profile?.email}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Fingerprint className="w-4 h-4" /> Security</CardTitle>
            <CardDescription>
              {native
                ? "Use Face ID, Touch ID, or your device fingerprint to unlock TakeoffPro."
                : "Biometric unlock is only available in the native iOS/Android app."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              label="Biometric unlock"
              hint={!native ? "Native app only" : !bioAvailable ? "No biometric hardware detected" : bioEnrolled ? "Enrolled" : "Not enrolled"}
              control={
                <Switch
                  checked={bioEnrolled}
                  disabled={!native || !bioAvailable || bioBusy}
                  onCheckedChange={toggleBio}
                />
              }
            />
            {bioBusy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle>
            <CardDescription>
              Get alerted on report submission, approval, and rejection. Native push only — web users see in-app notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              label="Push notifications"
              hint={native ? `Device: ${platform()}` : "Native app only"}
              control={
                <Switch
                  checked={pushEnabled}
                  disabled={!native || pushBusy}
                  onCheckedChange={togglePush}
                />
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Background sync</CardTitle>
            <CardDescription>
              Drain the offline outbox automatically every ~15 min while the app is suspended.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Row
              label="Sync in background"
              hint={native ? "Recommended for field use" : "Native app only"}
              control={<Switch checked={bgSync} disabled={!native} onCheckedChange={toggleBg} />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {control}
    </div>
  );
}
