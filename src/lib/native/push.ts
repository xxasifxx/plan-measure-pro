// Push notifications shim. No-op on web. On native, requests permission,
// registers with APNs/FCM, and writes the resulting token to `device_tokens`.
import { isNative, platform } from "./platform";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let registered = false;
const LOCAL_OPT_IN_KEY = "tp.push.opted-in";

export function isOptedIn(): boolean {
  try { return localStorage.getItem(LOCAL_OPT_IN_KEY) === "1"; } catch { return false; }
}
function setOptedIn(v: boolean) {
  try { localStorage.setItem(LOCAL_OPT_IN_KEY, v ? "1" : "0"); } catch { /* noop */ }
}

export async function requestPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!isNative()) return "denied";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    return perm.receive === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export async function registerPush(): Promise<boolean> {
  if (!isNative() || registered) return registered;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return false;

    await PushNotifications.addListener("registration", async (token) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("device_tokens").upsert(
        { user_id: user.id, platform: platform(), token: token.value, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id,token" },
      );
    });
    await PushNotifications.addListener("registrationError", (err) => {
      // eslint-disable-next-line no-console
      console.warn("[push] registration error", err);
    });
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      // Foreground: show a Sonner toast rather than the OS banner.
      const title = notification.title ?? "TakeoffPro";
      const body = notification.body ?? "";
      toast(title, { description: body });
    });

    await PushNotifications.register();
    setOptedIn(true);
    registered = true;
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[push] register failed", err);
    return false;
  }
}

export async function unregisterPush(): Promise<void> {
  setOptedIn(false);
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
    // Also remove the row(s) from device_tokens for this user.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("device_tokens").delete().eq("user_id", user.id);
    }
  } catch { /* noop */ }
  registered = false;
}
