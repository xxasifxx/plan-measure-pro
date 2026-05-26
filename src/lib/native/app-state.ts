// Native app-state hooks — drain the outbox + refresh auth session when the
// user brings the app back to the foreground. Web path already uses
// `visibilitychange`; this is the native equivalent.
import { isNative } from "./platform";
import { triggerSync } from "@/lib/offline/sync";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;

export async function initAppState(): Promise<void> {
  if (initialized || !isNative()) return;
  initialized = true;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      supabase.auth.refreshSession().catch(() => {});
      void triggerSync();
    });
    App.addListener("resume", () => {
      supabase.auth.refreshSession().catch(() => {});
      void triggerSync();
    });
  } catch {
    /* noop — plugin not installed in this build */
  }

  // Status bar / splash bookkeeping
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0b1220" }).catch(() => {});
  } catch { /* iOS only for backgroundColor */ }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch { /* noop */ }
}
