// Helper to load approved daily-report quantities for a project from Supabase,
// shaped as `ApprovedDailyReport[]` for `applyDailyReportsToP6`.
//
// Activity Id mapping: Pay items in the takeoff tool map to P6 Activity Ids
// via `pay_items.item_code` (e.g. "201-0006"). Projects that need a separate
// crosswalk should override `activityIdForItemCode` when calling.

import { supabase } from '@/integrations/supabase/client';
import type { ApprovedDailyReport } from './types';

interface LoadOptions {
  /** Map a pay_item.item_code to its P6 Activity Id. Defaults to identity. */
  activityIdForItemCode?: (itemCode: string) => string;
  /** Only load reports through this date (inclusive). */
  asOfDate?: string; // YYYY-MM-DD
}

export async function loadApprovedDailyReports(
  projectId: string,
  opts: LoadOptions = {},
): Promise<ApprovedDailyReport[]> {
  const mapId = opts.activityIdForItemCode ?? ((code) => code);

  let q = supabase
    .from('v_approved_pay_item_quantities' as any)
    .select('project_id, report_date, pay_item_id, item_code, pay_item_name, unit, delta_quantity, new_cumulative')
    .eq('project_id', projectId);
  if (opts.asOfDate) q = q.lte('report_date', opts.asOfDate);

  const { data, error } = await q;
  if (error) throw error;

  // Pull contract quantities for "isComplete" / ratio calc
  const { data: payItems, error: piErr } = await supabase
    .from('pay_items').select('id, contract_quantity').eq('project_id', projectId);
  if (piErr) throw piErr;
  const contractByItem = new Map((payItems ?? []).map(p => [p.id, Number(p.contract_quantity || 0)]));

  return ((data ?? []) as any[]).map(row => ({
    activityId: mapId(row.item_code),
    date: row.report_date,
    cumulativeQty: Number(row.new_cumulative),
    contractQty: contractByItem.get(row.pay_item_id) ?? 0,
    isComplete: false, // applyProgress derives completeness from ratio
    approvedByRE: true as const,
  }));
}
