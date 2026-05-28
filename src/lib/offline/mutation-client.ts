// Online-first mutation wrapper that falls back to the outbox when offline
// or when the same row already has unsynced changes. Each entity gets a
// thin adapter so call sites stay declarative.
import { supabase } from "@/integrations/supabase/client";
import { enqueue, pendingForRow } from "./outbox";
import { safeDelete, safePut, type OutboxEntity, type OutboxOp } from "./db";
import { triggerSync } from "./sync";

export interface MutationInput {
  entity: OutboxEntity;
  op: OutboxOp;
  rowId: string;
  projectId: string;
  payload: Record<string, unknown> | null;
  baseUpdatedAt?: string | null;
  /** Optimistic local mirror value. Defaults to `payload`. */
  mirror?: Record<string, unknown> | null;
}

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function applyMirror(entity: OutboxEntity, op: OutboxOp, rowId: string, mirror: Record<string, unknown> | null): Promise<void> {
  // Map entity → mirror store (entities not present in the mirror are skipped).
  const storeMap: Partial<Record<OutboxEntity, keyof import("./db").TakeoffOfflineDB>> = {
    annotations: "annotations",
    annotation_photos: "annotation_photos",
    daily_reports: "daily_reports",
    calibrations: "calibrations",
    pay_items: "pay_items",
    schedule_activities: "schedule_activities",
  };
  const store = storeMap[entity];
  if (!store) return;
  if (op === "delete") {
    await safeDelete(store, rowId);
    return;
  }
  if (mirror) {
    await safePut(store, { ...mirror, id: rowId, _pendingSync: true });
  }
}

/**
 * Execute a mutation either directly or by queuing it in the outbox.
 * Returns `true` when the call went straight to the server.
 */
export async function mutate(input: MutationInput): Promise<{ queued: boolean }> {
  const mirror = input.mirror ?? input.payload;
  await applyMirror(input.entity, input.op, input.rowId, mirror);

  const queueIt = async (reason: string) => {
    await enqueue({
      rowId: input.rowId,
      entity: input.entity,
      op: input.op,
      projectId: input.projectId,
      payload: input.payload,
      baseUpdatedAt: input.baseUpdatedAt ?? null,
    });
    // eslint-disable-next-line no-console
    console.info("[outbox] queued", input.entity, input.op, input.rowId, "(", reason, ")");
    // Kick the drain loop right away if we're online.
    if (online()) void triggerSync();
    return { queued: true as const };
  };

  if (!online()) return queueIt("offline");
  const blocking = await pendingForRow(input.rowId);
  if (blocking.length > 0) return queueIt("row has pending mutations");

  try {
    await runDirect(input);
    // Clear the optimistic flag on success
    if (mirror && input.op !== "delete") {
      await applyMirror(input.entity, "update", input.rowId, { ...mirror, _pendingSync: false });
    }
    return { queued: false };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[mutation-client] direct call failed, queuing", err);
    return queueIt("direct call failed");
  }
}

/** Bypass the queue — used internally by the sync engine. */
export async function runDirect(input: MutationInput): Promise<void> {
  const { entity, op, rowId, payload } = input;
  if (op === "delete") {
    const { error } = await (supabase as any).from(entity).delete().eq("id", rowId);
    if (error) throw error;
    return;
  }
  if (op === "insert") {
    const row = { ...(payload ?? {}), id: rowId };
    const { error } = await (supabase as any).from(entity).insert(row);
    if (error) throw error;
    return;
  }
  if (op === "update") {
    const { error } = await (supabase as any).from(entity).update(payload as any).eq("id", rowId);
    if (error) throw error;
    return;
  }
}
