import { useEffect, useState } from "react";

/**
 * Tracks browser network status. Uses the `online`/`offline` events plus a
 * `visibilitychange` re-check (some platforms lie about `navigator.onLine`
 * after waking from sleep).
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return online;
}
