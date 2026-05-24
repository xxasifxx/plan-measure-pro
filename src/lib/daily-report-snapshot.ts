import { supabase } from '@/integrations/supabase/client';
import { sfToCY, sfToSY } from '@/lib/geometry';

export interface SnapshotItem {
  pay_item_id: string;
  item_code: string;
  name: string;
  unit: string;
  delta_quantity: number;
  prior_cumulative: number;
  new_cumulative: number;
  contract_quantity?: number | null;
  notes?: string;
  annotation_ids: string[];
}

/**
 * Convert a raw annotation quantity to the pay item's billing unit.
 * Mirrors the logic in export-utils.buildRows.
 */
function annotationQty(a: { measurement: number; manual_quantity: number | null; depth: number | null; type: string }, unit: string): number {
  if (a.manual_quantity != null) return Number(a.manual_quantity);
  if (a.type === 'count') return 1;
  const m = Number(a.measurement) || 0;
  if (a.depth && Number(a.depth) > 0) return sfToCY(m, Number(a.depth));
  if (unit === 'SY') return sfToSY(m);
  return m;
}

/**
 * Build a frozen snapshot of the inspector's submitted quantities for a given day.
 * - Pulls inspector's annotations where created_at::date = report_date.
 * - Groups by pay item, computes delta in the item's billing unit.
 * - Reads prior approved cumulative from v_approved_pay_item_quantities, excluding
 *   the report being built (avoid double counting on resubmit).
 */
export async function buildDailyReportSnapshot(
  projectId: string,
  inspectorId: string,
  reportDateISO: string, // 'YYYY-MM-DD'
  excludeDailyReportId?: string,
): Promise<SnapshotItem[]> {
  const dayStart = `${reportDateISO}T00:00:00.000Z`;
  const dayEnd = `${reportDateISO}T23:59:59.999Z`;

  // Pay items
  const { data: items, error: piErr } = await supabase
    .from('pay_items')
    .select('id, item_code, name, unit, contract_quantity')
    .eq('project_id', projectId);
  if (piErr) throw piErr;

  // Inspector's annotations on this date
  const { data: anns, error: annErr } = await supabase
    .from('annotations')
    .select('id, pay_item_id, measurement, manual_quantity, depth, type, notes')
    .eq('project_id', projectId)
    .eq('user_id', inspectorId)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd);
  if (annErr) throw annErr;

  // Prior approved cumulative per pay item, excluding this report
  const { data: approved, error: vErr } = await supabase
    .from('v_approved_pay_item_quantities' as any)
    .select('pay_item_id, delta_quantity, report_date')
    .eq('project_id', projectId)
    .lte('report_date', reportDateISO);
  if (vErr) throw vErr;

  const priorByItem = new Map<string, number>();
  for (const row of (approved ?? []) as any[]) {
    // Strict prior = approved reports with date < this one. Same-day approved (rare)
    // counts as prior too because today's deltas are not yet in the view (status=submitted).
    if (excludeDailyReportId && (row as any).daily_report_id === excludeDailyReportId) continue;
    priorByItem.set(row.pay_item_id, (priorByItem.get(row.pay_item_id) ?? 0) + Number(row.delta_quantity || 0));
  }

  const grouped = new Map<string, { qty: number; ids: string[]; notes: string[] }>();
  for (const a of anns ?? []) {
    if (!a.pay_item_id) continue;
    const item = items?.find(i => i.id === a.pay_item_id);
    if (!item) continue;
    const q = annotationQty(a as any, item.unit);
    const entry = grouped.get(a.pay_item_id) ?? { qty: 0, ids: [], notes: [] };
    entry.qty += q;
    entry.ids.push(a.id);
    if (a.notes) entry.notes.push(a.notes);
    grouped.set(a.pay_item_id, entry);
  }

  const snapshot: SnapshotItem[] = [];
  for (const [payItemId, agg] of grouped) {
    const item = items!.find(i => i.id === payItemId)!;
    const prior = priorByItem.get(payItemId) ?? 0;
    snapshot.push({
      pay_item_id: payItemId,
      item_code: item.item_code,
      name: item.name,
      unit: item.unit,
      delta_quantity: Math.round(agg.qty * 100) / 100,
      prior_cumulative: Math.round(prior * 100) / 100,
      new_cumulative: Math.round((prior + agg.qty) * 100) / 100,
      contract_quantity: item.contract_quantity != null ? Number(item.contract_quantity) : null,
      notes: agg.notes.join(' · ') || undefined,
      annotation_ids: agg.ids,
    });
  }

  // Sort by item_code for deterministic order
  snapshot.sort((a, b) => a.item_code.localeCompare(b.item_code));
  return snapshot;
}
