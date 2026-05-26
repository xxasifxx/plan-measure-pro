// Geolocation shim — Capacitor on native (handles iOS permissions cleanly),
// browser API on web. Signature mirrors navigator.geolocation.watchPosition.
import { isNative } from "./platform";

export interface GeoSample {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export type WatchHandle = { stop: () => void };

export async function watchPosition(
  onUpdate: (s: GeoSample) => void,
  onError?: (err: { message: string }) => void,
): Promise<WatchHandle> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === "denied") {
        onError?.({ message: "Location permission denied" });
        return { stop: () => {} };
      }
    } catch { /* some platforms auto-grant */ }
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
      if (err) { onError?.({ message: err.message ?? "Geolocation error" }); return; }
      if (!pos) return;
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        timestamp: pos.timestamp,
      });
    });
    return { stop: () => { Geolocation.clearWatch({ id }).catch(() => {}); } };
  }

  if (!navigator.geolocation) {
    onError?.({ message: "Geolocation not available" });
    return { stop: () => {} };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onUpdate({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
      timestamp: pos.timestamp,
    }),
    (err) => onError?.({ message: err.message }),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
  );
  return { stop: () => navigator.geolocation.clearWatch(id) };
}
