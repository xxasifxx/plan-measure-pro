// Service worker registration with strict guards.
// - Skips in dev (vite-plugin-pwa devOptions.enabled = false also disables it).
// - Skips inside iframes (the Lovable editor preview is an iframe).
// - Skips on Lovable preview hosts so caching never breaks the editor experience.
// - On real deploys, registers and notifies callers when a new SW is waiting.

type UpdateCallback = (reload: () => Promise<void>) => void;

export interface SwHandles {
  needsRefresh: boolean;
  reload: () => Promise<void>;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export function shouldRegisterSW(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (import.meta.env.DEV) return false;
  if (isInIframe()) return false;
  if (isPreviewHost()) return false;
  // Capacitor WebView handles its own caching — never register a SW inside the native shell.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return false;
  } catch { /* noop */ }
  return true;
}

export async function unregisterAllSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
}

export async function registerSWWithUpdates(onUpdate: UpdateCallback): Promise<void> {
  if (!shouldRegisterSW()) {
    // Defensive: if we somehow registered before (e.g. user opened the deployed
    // app then opened the editor preview at the same origin), clean up.
    await unregisterAllSW().catch(() => {});
    return;
  }

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js", { scope: "/" });

    wb.addEventListener("waiting", () => {
      const reload = async () => {
        wb.addEventListener("controlling", () => window.location.reload());
        await wb.messageSkipWaiting();
      };
      onUpdate(reload);
    });

    await wb.register();
  } catch (err) {
    // SW registration failures should never break the app.
    // eslint-disable-next-line no-console
    console.warn("[pwa] service worker registration failed", err);
  }
}
