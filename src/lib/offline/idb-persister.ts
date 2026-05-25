// React Query persister backed by IndexedDB (single key in the `meta` store).
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";
import { getDB } from "./db";

const KEY = "rq-cache";

export function createIdbPersister(userScope: string): Persister {
  const storeKey = `${KEY}:${userScope}`;
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const db = await getDB();
        await db.put("meta" as any, client as any, storeKey as any);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[offline] persistClient failed", err);
      }
    },
    restoreClient: async () => {
      try {
        const db = await getDB();
        return (await db.get("meta" as any, storeKey as any)) as PersistedClient | undefined;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        const db = await getDB();
        await db.delete("meta" as any, storeKey as any);
      } catch {
        /* noop */
      }
    },
  };
}
