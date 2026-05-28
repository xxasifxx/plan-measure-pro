// IndexedDB schema for offline mirror of project data + write outbox.
// All writes are best-effort and never throw into render.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type OutboxEntity =
  | "annotations"
  | "annotation_photos"
  | "daily_reports"
  | "calibrations"
  | "pay_items"
  | "schedule_activities";

export type OutboxOp = "insert" | "update" | "delete";

export type OutboxStatus = "pending" | "inflight" | "failed" | "conflict" | "done";

export interface OutboxRecord {
  seq?: number;                  // auto-increment key
  rowId: string;                 // affected row id
  entity: OutboxEntity;
  op: OutboxOp;
  projectId: string;
  payload: Record<string, unknown> | null;
  baseUpdatedAt?: string | null; // for conflict detection
  blobSeq?: number | null;       // points at outbox_blobs.seq if a binary payload
  storagePath?: string | null;   // for photo inserts after upload
  createdAt: number;
  attempts: number;
  lastError?: string | null;
  status: OutboxStatus;
}

export interface OutboxBlobRecord {
  seq?: number;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

export interface TakeoffOfflineDB extends DBSchema {
  projects: { key: string; value: any };
  pay_items: { key: string; value: any; indexes: { by_project: string } };
  annotations: { key: string; value: any; indexes: { by_project: string } };
  annotation_photos: { key: string; value: any; indexes: { by_annotation: string } };
  calibrations: { key: string; value: any; indexes: { by_project: string } };
  geo_calibrations: { key: string; value: any; indexes: { by_project: string } };
  schedule_activities: { key: string; value: any; indexes: { by_project: string } };
  documents_meta: { key: string; value: any; indexes: { by_project: string } };
  daily_reports: { key: string; value: any; indexes: { by_project: string } };
  pdf_cache_meta: { key: string; value: { projectId: string; size: number; lastUsed: number } };
  meta: { key: string; value: any };
  outbox: {
    key: number;
    value: OutboxRecord;
    indexes: { by_status: string; by_row: string };
  };
  outbox_blobs: { key: number; value: OutboxBlobRecord };
}

let dbPromise: Promise<IDBPDatabase<TakeoffOfflineDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TakeoffOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TakeoffOfflineDB>("takeoffpro-offline", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("projects", { keyPath: "id" });
          const payItems = db.createObjectStore("pay_items", { keyPath: "id" });
          payItems.createIndex("by_project", "project_id");
          const ann = db.createObjectStore("annotations", { keyPath: "id" });
          ann.createIndex("by_project", "project_id");
          const photos = db.createObjectStore("annotation_photos", { keyPath: "id" });
          photos.createIndex("by_annotation", "annotation_id");
          const cal = db.createObjectStore("calibrations", { keyPath: "id" });
          cal.createIndex("by_project", "project_id");
          const geo = db.createObjectStore("geo_calibrations", { keyPath: "id" });
          geo.createIndex("by_project", "project_id");
          const sched = db.createObjectStore("schedule_activities", { keyPath: "id" });
          sched.createIndex("by_project", "project_id");
          const docs = db.createObjectStore("documents_meta", { keyPath: "id" });
          docs.createIndex("by_project", "project_id");
          const dr = db.createObjectStore("daily_reports", { keyPath: "id" });
          dr.createIndex("by_project", "project_id");
          db.createObjectStore("pdf_cache_meta", { keyPath: "projectId" });
          db.createObjectStore("meta");
        }
        if (oldVersion < 2) {
          const out = db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
          out.createIndex("by_status", "status");
          out.createIndex("by_row", "rowId");
          db.createObjectStore("outbox_blobs", { keyPath: "seq", autoIncrement: true });
        }
      },
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[offline] failed to open IDB", err);
      throw err;
    });
  }
  return dbPromise;
}

export async function safeGet<T = unknown>(store: keyof TakeoffOfflineDB, key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return (await db.get(store as any, key)) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function safePut(store: keyof TakeoffOfflineDB, value: any, key?: string): Promise<void> {
  try {
    const db = await getDB();
    if (key !== undefined) await db.put(store as any, value, key as any);
    else await db.put(store as any, value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[offline] put failed", store, err);
  }
}

export async function safeDelete(store: keyof TakeoffOfflineDB, key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(store as any, key as any);
  } catch {
    /* noop */
  }
}

export async function safeGetAllByIndex<T = unknown>(
  store: keyof TakeoffOfflineDB,
  indexName: string,
  value: string
): Promise<T[]> {
  try {
    const db = await getDB();
    return (await db.getAllFromIndex(store as any, indexName as any, value as any)) as T[];
  } catch {
    return [];
  }
}

export async function safeBulkPut(store: keyof TakeoffOfflineDB, values: any[]): Promise<void> {
  if (!values.length) return;
  try {
    const db = await getDB();
    const tx = db.transaction(store as any, "readwrite");
    await Promise.all(values.map((v) => tx.store.put(v)));
    await tx.done;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[offline] bulk put failed", store, err);
  }
}

export async function clearAll(): Promise<void> {
  try {
    const db = await getDB();
    const stores: (keyof TakeoffOfflineDB)[] = [
      "projects", "pay_items", "annotations", "annotation_photos",
      "calibrations", "geo_calibrations", "schedule_activities",
      "documents_meta", "daily_reports", "pdf_cache_meta", "meta",
      "outbox", "outbox_blobs",
    ];
    await Promise.all(stores.map((s) => db.clear(s as any)));
  } catch {
    /* noop */
  }
}
