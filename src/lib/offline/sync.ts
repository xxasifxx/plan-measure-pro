// Single-flight outbox drain loop. Triggered on online events, app resume,
// boot, and manually from the Sync panel.
import { listByStatus, updateRecord, removeRecord, subscribeOutbox } from "./outbox";
import { runDirect } from "./mutation-client";

const BACKOFF_MS = [1_000, 4_000, 15_000, 60_000, 180_000];
const MAX_ATTEMPTS = BACKOFF_MS.length;

let draining = false;
let pendingRetryTimer: number | null = null;

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export async function triggerSync(): Promise<void> {
  if (draining) return;
  if (!online()) return;
  draining = true;
  try {
    await drainOnce();
  } finally {
    draining = false;
  }
}

async function drainOnce(): Promise<void> {
  const pending = (await listByStatus("pending")).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const failed = (await listByStatus("failed"))
    .filter((r) => (r.attempts ?? 0) < MAX_ATTEMPTS)
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const queue = [...pending, ...failed];
  if (queue.length === 0) return;

  // Process serially within the same row, in parallel up to 4 across rows.
  const byRow = new Map<string, typeof queue>();
  for (const r of queue) {
    const arr = byRow.get(r.rowId) ?? [];
    arr.push(r);
    byRow.set(r.rowId, arr);
  }
  const rowQueues = [...byRow.values()];
  const workers = Math.min(4, rowQueues.length);
  const runners = Array.from({ length: workers }).map(async () => {
    while (rowQueues.length > 0) {
      const queueForRow = rowQueues.shift();
      if (!queueForRow) break;
      for (const item of queueForRow) {
        if (item.seq == null) continue;
        await updateRecord(item.seq, { status: "inflight" });
        try {
          await runDirect({
            entity: item.entity,
            op: item.op,
            rowId: item.rowId,
            projectId: item.projectId,
            payload: item.payload,
          });
          await removeRecord(item.seq);
        } catch (err) {
          const attempts = (item.attempts ?? 0) + 1;
          const msg = err instanceof Error ? err.message : String(err);
          await updateRecord(item.seq, {
            status: "failed",
            attempts,
            lastError: msg,
          });
          // Stop processing this row — preserve causality.
          scheduleRetry(attempts);
          break;
        }
      }
    }
  });
  await Promise.all(runners);
}

function scheduleRetry(attempts: number) {
  if (pendingRetryTimer != null) return;
  const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)] ?? 60_000;
  pendingRetryTimer = window.setTimeout(() => {
    pendingRetryTimer = null;
    void triggerSync();
  }, delay);
}

let booted = false;

/** Wire up the global triggers. Safe to call multiple times. */
export function startSyncLoop(): void {
  if (booted) return;
  booted = true;
  window.addEventListener("online", () => { void triggerSync(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void triggerSync();
  });
  subscribeOutbox(() => { if (online()) void triggerSync(); });
  // First drain after boot
  setTimeout(() => { void triggerSync(); }, 1500);
}

/** Manual reset for a failed item — clears error counters and re-tries. */
export async function retryItem(seq: number): Promise<void> {
  await updateRecord(seq, { status: "pending", attempts: 0, lastError: null });
  void triggerSync();
}
