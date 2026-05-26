import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Bell, Fingerprint, ArrowRight, Check } from "lucide-react";
import { isNative } from "@/lib/native/platform";
import { requestPermission as requestPushPermission, registerPush } from "@/lib/native/push";
import { getStatus as getBiometricStatus, enroll as enrollBiometric } from "@/lib/native/biometric";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DONE_KEY = "tp.native.first-run.v1";

type StepId = "welcome" | "camera" | "location" | "notifications" | "biometric" | "done";
const ORDER: StepId[] = ["welcome", "camera", "location", "notifications", "biometric", "done"];

export function NativeFirstRun() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<StepId>("welcome");

  useEffect(() => {
    if (!isNative() || !session) return;
    if (localStorage.getItem(DONE_KEY) === "1") return;
    setOpen(true);
  }, [session]);

  if (!open) return null;

  const next = () => {
    const i = ORDER.indexOf(step);
    setStep(ORDER[Math.min(i + 1, ORDER.length - 1)]);
  };
  const finish = () => {
    localStorage.setItem(DONE_KEY, "1");
    setOpen(false);
  };

  const requestCamera = async () => {
    try {
      const { Camera: Cam } = await import("@capacitor/camera");
      await Cam.requestPermissions({ permissions: ["camera", "photos"] });
    } catch { /* noop */ }
    next();
  };
  const requestLocation = async () => {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.requestPermissions();
    } catch { /* noop */ }
    next();
  };
  const requestNotifications = async () => {
    const result = await requestPushPermission();
    if (result === "granted") await registerPush();
    next();
  };
  const enrollBio = async () => {
    if (!session?.refresh_token) { next(); return; }
    const status = await getBiometricStatus();
    if (!status.available) { next(); return; }
    try {
      await enrollBiometric(session.refresh_token);
      toast.success("Biometric unlock enabled");
    } catch {
      toast.error("Could not enable biometric unlock");
    }
    next();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5">
        {step === "welcome" && (
          <>
            <h2 className="text-xl font-semibold">Welcome to TakeoffPro</h2>
            <p className="text-sm text-muted-foreground">
              Quick setup to enable camera, GPS, and notifications for field work. Takes about 30 seconds.
            </p>
            <Button className="w-full" onClick={next} size="lg">
              Get started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button onClick={finish} className="text-xs text-muted-foreground hover:underline w-full text-center">
              Skip setup
            </button>
          </>
        )}

        {step === "camera" && (
          <Step
            icon={<Camera className="w-10 h-10 text-primary" />}
            title="Attach field photos"
            body="Inspectors attach photos to annotations directly from the camera. Photos sync once you're back online."
            cta="Enable camera"
            onCta={requestCamera}
            onSkip={next}
          />
        )}

        {step === "location" && (
          <Step
            icon={<MapPin className="w-10 h-10 text-primary" />}
            title="Trace by GPS"
            body="Location is used to convert your physical position to plan-sheet coordinates while tracing pay items in the field."
            cta="Enable location"
            onCta={requestLocation}
            onSkip={next}
          />
        )}

        {step === "notifications" && (
          <Step
            icon={<Bell className="w-10 h-10 text-primary" />}
            title="Daily report alerts"
            body="Resident Engineers get notified when a report is submitted; inspectors get notified on approval or rejection."
            cta="Enable notifications"
            onCta={requestNotifications}
            onSkip={next}
          />
        )}

        {step === "biometric" && (
          <Step
            icon={<Fingerprint className="w-10 h-10 text-primary" />}
            title="Unlock with Face ID / fingerprint"
            body="Skip the password on every cold start. We store a single refresh token in your device's secure enclave — never on our servers."
            cta="Enable biometric unlock"
            onCta={enrollBio}
            onSkip={next}
          />
        )}

        {step === "done" && (
          <>
            <div className="flex justify-center"><Check className="w-12 h-12 text-primary" /></div>
            <h2 className="text-xl font-semibold text-center">You're ready</h2>
            <p className="text-sm text-muted-foreground text-center">
              You can change any of these any time from Settings.
            </p>
            <Button className="w-full" onClick={finish} size="lg">Get to work</Button>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ icon, title, body, cta, onCta, onSkip }: {
  icon: React.ReactNode; title: string; body: string;
  cta: string; onCta: () => void; onSkip: () => void;
}) {
  return (
    <>
      <div className="flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-center">{title}</h3>
      <p className="text-sm text-muted-foreground text-center">{body}</p>
      <Button className="w-full" size="lg" onClick={onCta}>{cta}</Button>
      <button onClick={onSkip} className="text-xs text-muted-foreground hover:underline w-full text-center">
        Not now
      </button>
    </>
  );
}
