// Dedicated CacheStorage bucket for project PDFs with a soft LRU cap.
// PdfCanvas continues to load by URL; this layer warms + serves on miss.
import { safeGet, safePut, getDB } from "./db";

const CACHE_NAME = "pdf-cache-v1";
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

function safeCaches(): CacheStorage | null {
  return typeof caches !== "undefined" ? caches : null;
}

export async function warmPdf(projectId: string, url: string): Promise<void> {
  const cs = safeCaches();
  if (!cs) return;
  try {
    const cache = await cs.open(CACHE_NAME);
    const existing = await cache.match(keyFor(projectId));
    if (existing) {
      await touch(projectId);
      return;
    }
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return;
    const buf = await res.clone().arrayBuffer();
    await cache.put(keyFor(projectId), new Response(buf, { headers: res.headers }));
    await safePut("pdf_cache_meta", { projectId, size: buf.byteLength, lastUsed: Date.now() });
    await evictIfNeeded();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[offline] warmPdf failed", err);
  }
}

export async function getCachedPdf(projectId: string): Promise<Blob | null> {
  const cs = safeCaches();
  if (!cs) return null;
  try {
    const cache = await cs.open(CACHE_NAME);
    const res = await cache.match(keyFor(projectId));
    if (!res) return null;
    await touch(projectId);
    return await res.blob();
  } catch {
    return null;
  }
}

function keyFor(projectId: string): string {
  // Synthetic request key; never hits the network.
  return `https://pdf-cache.local/${encodeURIComponent(projectId)}`;
}

async function touch(projectId: string): Promise<void> {
  const meta = (await safeGet<{ projectId: string; size: number; lastUsed: number }>("pdf_cache_meta", projectId)) ?? {
    projectId, size: 0, lastUsed: Date.now(),
  };
  meta.lastUsed = Date.now();
  await safePut("pdf_cache_meta", meta);
}

async function evictIfNeeded(): Promise<void> {
  try {
    const db = await getDB();
    const all = await db.getAll("pdf_cache_meta" as any) as { projectId: string; size: number; lastUsed: number }[];
    let total = all.reduce((s, x) => s + (x.size || 0), 0);
    if (total <= MAX_BYTES) return;
    const cs = safeCaches();
    if (!cs) return;
    const cache = await cs.open(CACHE_NAME);
    const sorted = [...all].sort((a, b) => a.lastUsed - b.lastUsed);
    for (const entry of sorted) {
      if (total <= MAX_BYTES) break;
      await cache.delete(keyFor(entry.projectId));
      await db.delete("pdf_cache_meta" as any, entry.projectId as any);
      total -= entry.size || 0;
    }
  } catch {
    /* noop */
  }
}
