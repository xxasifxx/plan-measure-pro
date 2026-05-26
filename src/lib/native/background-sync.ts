// Background sync — wakes the app every ~15 min on native to drain the outbox.
// No-op on web (the foreground sync loop + visibilitychange handle it).
import { isNative } from "./platform";
import { triggerSync } from "@/lib/offline/sync";

let configured = false;
const LOCAL_KEY = "tp.bgsync.enabled";

export function isBackgroundSyncEnabled(): boolean {
  try { return localStorage.getItem(LOCAL_KEY) !== "0"; } catch { return true; }
}

export function setBackgroundSyncEnabled(enabled: boolean): void {
  try { localStorage.setItem(LOCAL_KEY, enabled ? "1" : "0"); } catch { /* noop */ }
}

export async function initBackgroundSync(): Promise<void> {
  if (!isNative() || configured) return;
  if (!isBackgroundSyncEnabled()) return;
  try {
    const { BackgroundFetch } = await import("@transistorsoft/capacitor-background-fetch");
    const status = await BackgroundFetch.configure(
      { minimumFetchInterval: 15, stopOnTerminate: false, startOnBoot: true },
      async (taskId) => {
        try { await triggerSync(); } finally { BackgroundFetch.finish(taskId); }
      },
      async (taskId) => { BackgroundFetch.finish(taskId); },
    );
    // eslint-disable-next-line no-console
    console.info("[bgsync] configured", status);
    configured = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[bgsync] init failed", err);
  }
}
