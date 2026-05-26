// Outbox helpers for the offline write queue. All ops are best-effort
// and never throw into React render.
import { getDB, type OutboxRecord, type OutboxStatus } from "./db";

export type { OutboxRecord, OutboxStatus } from "./db";

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeOutbox(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((l) => {
    try { l(); } catch { /* noop */ }
  });
}

export async function enqueue(
  rec: Omit<OutboxRecord, "seq" | "createdAt" | "attempts" | "status">
): Promise<number | undefined> {
  try {
    const db = await getDB();
    const full: OutboxRecord = {
      ...rec,
      createdAt: Date.now(),
      attempts: 0,
      status: "pending",
    };
    const seq = (await db.add("outbox", full)) as number;
    notify();
    return seq;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[outbox] enqueue failed", err);
    return undefined;
  }
}

export async function listByStatus(status: OutboxStatus): Promise<OutboxRecord[]> {
  try {
    const db = await getDB();
    return await db.getAllFromIndex("outbox", "by_status", status);
  } catch {
    return [];
  }
}

export async function listAll(): Promise<OutboxRecord[]> {
  try {
    const db = await getDB();
    return await db.getAll("outbox");
  } catch {
    return [];
  }
}

export async function pendingForRow(rowId: string): Promise<OutboxRecord[]> {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex("outbox", "by_row", rowId);
    return all.filter((r) => r.status === "pending" || r.status === "inflight" || r.status === "failed");
  } catch {
    return [];
  }
}

export async function countPending(): Promise<number> {
  const a = await listByStatus("pending");
  const b = await listByStatus("inflight");
  const c = await listByStatus("failed");
  const d = await listByStatus("conflict");
  return a.length + b.length + c.length + d.length;
}

export async function updateRecord(seq: number, patch: Partial<OutboxRecord>): Promise<void> {
  try {
    const db = await getDB();
    const cur = await db.get("outbox", seq);
    if (!cur) return;
    await db.put("outbox", { ...cur, ...patch, seq });
    notify();
  } catch { /* noop */ }
}

export async function removeRecord(seq: number): Promise<void> {
  try {
    const db = await getDB();
    const cur = await db.get("outbox", seq);
    await db.delete("outbox", seq);
    if (cur?.blobSeq != null) {
      await db.delete("outbox_blobs", cur.blobSeq);
    }
    notify();
  } catch { /* noop */ }
}

export async function storeBlob(blob: Blob, mimeType: string): Promise<number | undefined> {
  try {
    const db = await getDB();
    return (await db.add("outbox_blobs", { blob, mimeType, createdAt: Date.now() })) as number;
  } catch { return undefined; }
}

export async function getBlob(seq: number): Promise<{ blob: Blob; mimeType: string } | undefined> {
  try {
    const db = await getDB();
    const rec = await db.get("outbox_blobs", seq);
    return rec ? { blob: rec.blob, mimeType: rec.mimeType } : undefined;
  } catch { return undefined; }
}
