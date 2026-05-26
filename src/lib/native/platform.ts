import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}
export function platform(): "ios" | "android" | "web" {
  try { return Capacitor.getPlatform() as "ios" | "android" | "web"; } catch { return "web"; }
}
export const isIOS = () => platform() === "ios";
export const isAndroid = () => platform() === "android";
