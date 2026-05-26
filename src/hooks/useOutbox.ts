import { useEffect, useState } from "react";
import { listAll, subscribeOutbox, type OutboxRecord } from "@/lib/offline/outbox";

/** Live view of the outbox queue. */
export function useOutbox() {
  const [items, setItems] = useState<OutboxRecord[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      listAll().then((rows) => { if (alive) setItems(rows); });
    };
    refresh();
    const unsub = subscribeOutbox(refresh);
    return () => { alive = false; unsub(); };
  }, []);
  const pending = items.filter((i) => i.status === "pending" || i.status === "inflight").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const conflicts = items.filter((i) => i.status === "conflict").length;
  return { items, pending, failed, conflicts, total: pending + failed + conflicts };
}
