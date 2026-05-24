// Helper to load approved daily-report quantities for a project from Supabase,
// shaped as `ApprovedDailyReport[]` for `applyDailyReportsToP6`.
//
// Mapping strategy: each `pay_items` row may carry an explicit `p6_activity_id`
// (set in the project's P6 Export page). Rows whose pay item has no mapping
// fall back to `activityIdForItemCode(item_code)` — default identity — and the
// apply step silently skips activities the parsed PMXML doesn't contain.

import { supabase } from '@/integrations/supabase/client';
import type { ApprovedDailyReport } from './types';

interface LoadOptions {
  /** Override mapping by pay_item.id → P6 Activity Id (wins over item_code fallback). */
  payItemIdToActivityId?: Map<string, string>;
  /** Fallback: map a pay_item.item_code to its P6 Activity Id. Defaults to identity. */
  activityIdForItemCode?: (itemCode: string) => string;
  /** Only load reports through this date (inclusive). */
  asOfDate?: string; // YYYY-MM-DD
}

export async function loadApprovedDailyReports(
  projectId: string,
  opts: LoadOptions = {},
): Promise<ApprovedDailyReport[]> {
  const mapCode = opts.activityIdForItemCode ?? ((code) => code);
  const explicit = opts.payItemIdToActivityId ?? new Map<string, string>();

  let q = supabase
    .from('v_approved_pay_item_quantities' as any)
    .select('project_id, report_date, pay_item_id, item_code, pay_item_name, unit, delta_quantity, new_cumulative')
    .eq('project_id', projectId);
  if (opts.asOfDate) q = q.lte('report_date', opts.asOfDate);

  const { data, error } = await q;
  if (error) throw error;

  // Pull contract quantities + any persisted activity overrides
  const { data: payItems, error: piErr } = await supabase
    .from('pay_items')
    .select('id, contract_quantity, p6_activity_id' as any)
    .eq('project_id', projectId);
  if (piErr) throw piErr;
  const contractByItem = new Map((payItems ?? []).map((p: any) => [p.id, Number(p.contract_quantity || 0)]));
  const persistedByItem = new Map<string, string>();
  for (const p of (payItems ?? []) as any[]) {
    if (p.p6_activity_id) persistedByItem.set(p.id, String(p.p6_activity_id));
  }

  return ((data ?? []) as any[])
    .map(row => {
      const activityId =
        explicit.get(row.pay_item_id) ||
        persistedByItem.get(row.pay_item_id) ||
        mapCode(row.item_code);
      return {
        activityId,
        date: row.report_date,
        cumulativeQty: Number(row.new_cumulative),
        contractQty: contractByItem.get(row.pay_item_id) ?? 0,
        isComplete: false, // applyProgress derives completeness from ratio
        approvedByRE: true as const,
        payItemId: row.pay_item_id as string,
        itemCode: row.item_code as string,
        payItemName: row.pay_item_name as string | undefined,
      };
    })
    .filter(r => r.activityId);
}
