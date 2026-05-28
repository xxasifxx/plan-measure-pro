// Mirror Supabase project data into IndexedDB for offline reads.
// Online-first: callers fetch from Supabase, then call `mirrorProject` to
// snapshot the result. Offline fallbacks read from `safeGetAllByIndex`.
import { supabase } from "@/integrations/supabase/client";
import { safeBulkPut, safePut } from "./db";

type FetchSpec = { label: string; store: Parameters<typeof safeBulkPut>[0] | "projects"; single?: boolean; run: () => Promise<{ data: any; error: any }> };

export async function mirrorProject(projectId: string): Promise<void> {
  const tables: FetchSpec[] = [
    { label: "project", store: "projects", single: true,
      run: () => supabase.from("projects").select("*").eq("id", projectId).maybeSingle() as any },
    { label: "pay_items", store: "pay_items",
      run: () => supabase.from("pay_items").select("*").eq("project_id", projectId) as any },
    { label: "annotations", store: "annotations",
      run: () => supabase.from("annotations").select("*").eq("project_id", projectId) as any },
    { label: "calibrations", store: "calibrations",
      run: () => supabase.from("calibrations").select("*").eq("project_id", projectId) as any },
    { label: "geo_calibrations", store: "geo_calibrations",
      run: () => supabase.from("geo_calibrations").select("*").eq("project_id", projectId) as any },
    { label: "schedule_activities", store: "schedule_activities",
      run: () => supabase.from("schedule_activities").select("*").eq("project_id", projectId) as any },
    { label: "documents", store: "documents_meta",
      run: () => supabase.from("documents").select("*").eq("project_id", projectId).is("deleted_at", null) as any },
    { label: "daily_reports", store: "daily_reports",
      run: () => supabase.from("daily_reports").select("*").eq("project_id", projectId)
        .order("report_date", { ascending: false }).limit(30) as any },
  ];

  // M-5: Promise.allSettled so one failed table (e.g. RLS denial) doesn't abort
  // the whole mirror. Each failure is logged with its table label.
  const results = await Promise.allSettled(tables.map((t) => t.run()));
  await Promise.all(results.map(async (res, i) => {
    const spec = tables[i];
    if (res.status === "rejected") {
      console.warn(`[offline] mirror ${spec.label} threw`, res.reason);
      return;
    }
    const { data, error } = res.value;
    if (error) {
      console.warn(`[offline] mirror ${spec.label} returned error`, error);
      return;
    }
    if (spec.single) {
      if (data) await safePut(spec.store as any, data);
    } else {
      await safeBulkPut(spec.store as any, data ?? []);
    }
  }));
  await safePut("meta", { projectId, at: Date.now() }, `lastMirror:${projectId}`);
}

export async function mirrorProjectList(): Promise<void> {
  try {
    const { data } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    await safeBulkPut("projects", data ?? []);
  } catch {
    /* noop */
  }
}
