// Helpers that read RE-approved daily-report totals from
// `v_approved_pay_item_quantities`. This view excludes drafts, submitted,
// and rejected reports — so anything consuming these helpers is guaranteed
// approved-only.

import { supabase } from '@/integrations/supabase/client';

export interface ApprovedTotal {
  pay_item_id: string;
  item_code: string;
  pay_item_name: string;
  unit: string;
  approved_quantity: number; // sum of delta across approved reports
  last_approved_at: string | null;
}

/**
 * Sum approved delta_quantity per pay item for a project.
 */
export async function loadApprovedTotalsByPayItem(projectId: string): Promise<Map<string, ApprovedTotal>> {
  const { data, error } = await supabase
    .from('v_approved_pay_item_quantities' as any)
    .select('pay_item_id, item_code, pay_item_name, unit, delta_quantity, approved_at')
    .eq('project_id', projectId);
  if (error) throw error;

  const map = new Map<string, ApprovedTotal>();
  for (const row of (data ?? []) as any[]) {
    const id = row.pay_item_id as string;
    const cur = map.get(id);
    const delta = Number(row.delta_quantity || 0);
    if (cur) {
      cur.approved_quantity += delta;
      if (row.approved_at && (!cur.last_approved_at || row.approved_at > cur.last_approved_at)) {
        cur.last_approved_at = row.approved_at;
      }
    } else {
      map.set(id, {
        pay_item_id: id,
        item_code: row.item_code,
        pay_item_name: row.pay_item_name,
        unit: row.unit,
        approved_quantity: delta,
        last_approved_at: row.approved_at ?? null,
      });
    }
  }
  return map;
}

/**
 * Count of `submitted` reports awaiting RE review, grouped by project.
 * Empty input returns an empty map (no extra query).
 */
export async function loadPendingReviewCounts(projectIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (projectIds.length === 0) return map;
  const { data, error } = await supabase
    .from('daily_reports')
    .select('project_id')
    .eq('status', 'submitted')
    .in('project_id', projectIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const id = (row as any).project_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}
