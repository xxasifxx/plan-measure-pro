// Mirror Supabase project data into IndexedDB for offline reads.
// Online-first: callers fetch from Supabase, then call `mirrorProject` to
// snapshot the result. Offline fallbacks read from `safeGetAllByIndex`.
import { supabase } from "@/integrations/supabase/client";
import { safeBulkPut, safePut } from "./db";

export async function mirrorProject(projectId: string): Promise<void> {
  try {
    const [
      project,
      payItems,
      annotations,
      calibrations,
      geoCalibrations,
      activities,
      documents,
      dailyReports,
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase.from("pay_items").select("*").eq("project_id", projectId),
      supabase.from("annotations").select("*").eq("project_id", projectId),
      supabase.from("calibrations").select("*").eq("project_id", projectId),
      supabase.from("geo_calibrations").select("*").eq("project_id", projectId),
      supabase.from("schedule_activities").select("*").eq("project_id", projectId),
      supabase.from("documents").select("*").eq("project_id", projectId).is("deleted_at", null),
      supabase
        .from("daily_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("report_date", { ascending: false })
        .limit(30),
    ]);

    if (project.data) await safePut("projects", project.data);
    await safeBulkPut("pay_items", payItems.data ?? []);
    await safeBulkPut("annotations", annotations.data ?? []);
    await safeBulkPut("calibrations", calibrations.data ?? []);
    await safeBulkPut("geo_calibrations", geoCalibrations.data ?? []);
    await safeBulkPut("schedule_activities", activities.data ?? []);
    await safeBulkPut("documents_meta", documents.data ?? []);
    await safeBulkPut("daily_reports", dailyReports.data ?? []);
    await safePut("meta", { projectId, at: Date.now() }, `lastMirror:${projectId}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[offline] mirrorProject failed", err);
  }
}

export async function mirrorProjectList(): Promise<void> {
  try {
    const { data } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    await safeBulkPut("projects", data ?? []);
  } catch {
    /* noop */
  }
}
