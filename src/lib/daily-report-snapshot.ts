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

export interface RawAnnotationInput {
  id: string;
  pay_item_id: string | null;
  measurement: number;
  manual_quantity: number | null;
  depth: number | null;
  type: string;
  notes?: string | null;
}

export interface RawPayItemInput {
  id: string;
  item_code: string;
  name: string;
  unit: string;
  contract_quantity?: number | null;
}

/** Pure unit conversion for one annotation in the pay item's billing unit. */
export function annotationQty(
  a: Pick<RawAnnotationInput, 'measurement' | 'manual_quantity' | 'depth' | 'type'>,
  unit: string,
): number {
  if (a.manual_quantity != null) return Number(a.manual_quantity);
  if (a.type === 'count') return 1;
  const m = Number(a.measurement) || 0;
  if (a.depth && Number(a.depth) > 0) return sfToCY(m, Number(a.depth));
  if (unit === 'SY') return sfToSY(m);
  return m;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pure snapshot builder — no I/O. Group inspector annotations by pay item,
 * apply unit conversion, attach prior approved cumulative.
 */
export function buildSnapshotFromInputs(
  annotations: RawAnnotationInput[],
  payItems: RawPayItemInput[],
  priorApprovedByItem: Map<string, number>,
): SnapshotItem[] {
  const byId = new Map(payItems.map(p => [p.id, p]));
  const grouped = new Map<string, { qty: number; ids: string[]; notes: string[] }>();
  for (const a of annotations) {
    if (!a.pay_item_id) continue;
    const item = byId.get(a.pay_item_id);
    if (!item) continue;
    const q = annotationQty(a, item.unit);
    const entry = grouped.get(a.pay_item_id) ?? { qty: 0, ids: [], notes: [] };
    entry.qty += q;
    entry.ids.push(a.id);
    if (a.notes) entry.notes.push(a.notes);
    grouped.set(a.pay_item_id, entry);
  }

  const snapshot: SnapshotItem[] = [];
  for (const [payItemId, agg] of grouped) {
    const item = byId.get(payItemId)!;
    const prior = priorApprovedByItem.get(payItemId) ?? 0;
    snapshot.push({
      pay_item_id: payItemId,
      item_code: item.item_code,
      name: item.name,
      unit: item.unit,
      delta_quantity: r2(agg.qty),
      prior_cumulative: r2(prior),
      new_cumulative: r2(prior + agg.qty),
      contract_quantity: item.contract_quantity != null ? Number(item.contract_quantity) : null,
      notes: agg.notes.join(' · ') || undefined,
      annotation_ids: agg.ids,
    });
  }
  snapshot.sort((a, b) => a.item_code.localeCompare(b.item_code));
  return snapshot;
}

/**
 * Build a frozen snapshot of an inspector's submitted quantities for a day.
 * Fetches inputs from Supabase, then delegates to `buildSnapshotFromInputs`.
 */
export async function buildDailyReportSnapshot(
  projectId: string,
  inspectorId: string,
  reportDateISO: string,
  _excludeDailyReportId?: string,
): Promise<SnapshotItem[]> {
  const { data: items, error: piErr } = await supabase
    .from('pay_items')
    .select('id, item_code, name, unit, contract_quantity')
    .eq('project_id', projectId);
  if (piErr) throw piErr;

  // Bucket annotations by project-local work_date (America/New_York),
  // populated by the DB default. This prevents evening edits leaking into
  // the next UTC day.
  const { data: anns, error: annErr } = await supabase
    .from('annotations')
    .select('id, pay_item_id, measurement, manual_quantity, depth, type, notes')
    .eq('project_id', projectId)
    .eq('user_id', inspectorId)
    .eq('work_date', reportDateISO);
  if (annErr) throw annErr;


  const { data: approved, error: vErr } = await supabase
    .from('v_approved_pay_item_quantities' as any)
    .select('pay_item_id, delta_quantity, report_date')
    .eq('project_id', projectId)
    .lt('report_date', reportDateISO);
  if (vErr) throw vErr;

  const priorByItem = new Map<string, number>();
  for (const row of (approved ?? []) as any[]) {
    priorByItem.set(row.pay_item_id, (priorByItem.get(row.pay_item_id) ?? 0) + Number(row.delta_quantity || 0));
  }

  return buildSnapshotFromInputs(
    (anns ?? []) as RawAnnotationInput[],
    (items ?? []) as RawPayItemInput[],
    priorByItem,
  );
}
