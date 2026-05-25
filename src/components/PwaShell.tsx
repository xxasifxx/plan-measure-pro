import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerSWWithUpdates } from "@/lib/pwa";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getDB } from "@/lib/offline/db";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const IOS_DISMISS_KEY = "takeoffpro.installPromptDismissed";

function isIos(): boolean {
  const ua = navigator.userAgent;
  const iPadOS = ua.includes("Mac") && "ontouchend" in document;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Mounts service-worker registration, an offline indicator,
 * an Install CTA, and an update-available toast.
 */
export function PwaShell() {
  const online = useNetworkStatus();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [reloadFn, setReloadFn] = useState<null | (() => Promise<void>)>(null);
  const [offlineProjectCount, setOfflineProjectCount] = useState<number>(0);

  // Refresh cached project count whenever we go offline
  useEffect(() => {
    if (online) return;
    (async () => {
      try {
        const db = await getDB();
        const count = await db.count("projects" as any);
        setOfflineProjectCount(count);
      } catch {
        setOfflineProjectCount(0);
      }
    })();
  }, [online]);

  // Register SW + listen for updates
  useEffect(() => {
    registerSWWithUpdates((reload) => setReloadFn(() => reload));
  }, []);

  // Capture install prompt (Android/desktop Chrome)
  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // iOS: show one-time "Add to Home Screen" hint
  useEffect(() => {
    if (isStandalone()) return;
    if (!isIos()) return;
    if (localStorage.getItem(IOS_DISMISS_KEY)) return;
    const t = setTimeout(() => setShowIosHint(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismissIos = () => {
    localStorage.setItem(IOS_DISMISS_KEY, "1");
    setShowIosHint(false);
  };

  return (
    <>
      {/* Offline pill */}
      {!online && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          Offline — viewing cached data{offlineProjectCount > 0 ? ` (${offlineProjectCount} project${offlineProjectCount === 1 ? "" : "s"})` : ""}.
        </div>
      )}

      {/* Install CTA (Android / desktop) */}
      {installEvent && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-[90] max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold text-sm">Install TakeoffPro</div>
            <div className="text-xs text-muted-foreground mt-1">
              Add it to your home screen for full-screen access and faster loads in the field.
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleInstall}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Install
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInstallEvent(null)}>
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={() => setInstallEvent(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* iOS install hint (Safari has no beforeinstallprompt) */}
      {showIosHint && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-[90] max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold text-sm">Install on iPhone / iPad</div>
            <div className="text-xs text-muted-foreground mt-1">
              Tap the Share button in Safari, then <span className="font-medium">Add to Home Screen</span> to install TakeoffPro.
            </div>
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={dismissIos}>
                Got it
              </Button>
            </div>
          </div>
          <button onClick={dismissIos} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Update available */}
      {reloadFn && (
        <div className="fixed bottom-20 md:bottom-6 left-4 z-[95] max-w-sm rounded-lg border border-primary/40 bg-primary text-primary-foreground shadow-xl p-4 flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold text-sm">Update available</div>
            <div className="text-xs opacity-90 mt-1">A new version of TakeoffPro is ready.</div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => reloadFn()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload
              </Button>
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setReloadFn(null)}>
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
