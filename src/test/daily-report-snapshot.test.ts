import { describe, it, expect } from 'vitest';
import {
  annotationQty,
  buildSnapshotFromInputs,
  type RawAnnotationInput,
  type RawPayItemInput,
} from '@/lib/daily-report-snapshot';

const items: RawPayItemInput[] = [
  { id: 'pi-1', item_code: '201-0001', name: 'Clearing Site', unit: 'LS', contract_quantity: 1 },
  { id: 'pi-2', item_code: '202-0006', name: 'Excavation', unit: 'CY', contract_quantity: 100 },
  { id: 'pi-3', item_code: '301-0010', name: 'Aggregate Base', unit: 'SY', contract_quantity: 500 },
];

const ann = (over: Partial<RawAnnotationInput>): RawAnnotationInput => ({
  id: 'a-' + Math.random().toString(36).slice(2, 8),
  pay_item_id: 'pi-1',
  measurement: 0,
  manual_quantity: null,
  depth: null,
  type: 'count',
  notes: null,
  ...over,
});

describe('annotationQty', () => {
  it('returns manual_quantity when provided regardless of type/depth', () => {
    expect(annotationQty({ measurement: 999, manual_quantity: 42, depth: 5, type: 'polygon' }, 'CY')).toBe(42);
  });
  it('counts as 1 for count type', () => {
    expect(annotationQty({ measurement: 0, manual_quantity: null, depth: null, type: 'count' }, 'EA')).toBe(1);
  });
  it('converts SF × depth → CY when depth present', () => {
    // 27 sf × 1 ft = 1 CY
    expect(annotationQty({ measurement: 27, manual_quantity: null, depth: 1, type: 'polygon' }, 'CY')).toBeCloseTo(1, 5);
  });
  it('converts SF → SY for SY unit', () => {
    // 9 sf = 1 sy
    expect(annotationQty({ measurement: 9, manual_quantity: null, depth: null, type: 'polygon' }, 'SY')).toBeCloseTo(1, 5);
  });
  it('returns raw measurement otherwise', () => {
    expect(annotationQty({ measurement: 12.5, manual_quantity: null, depth: null, type: 'line' }, 'LF')).toBe(12.5);
  });
});

describe('buildSnapshotFromInputs', () => {
  it('returns empty when no annotations', () => {
    expect(buildSnapshotFromInputs([], items, new Map())).toEqual([]);
  });

  it('ignores annotations without a pay_item_id or with unknown pay_item_id', () => {
    const res = buildSnapshotFromInputs(
      [ann({ pay_item_id: null }), ann({ pay_item_id: 'unknown' })],
      items, new Map(),
    );
    expect(res).toEqual([]);
  });

  it('groups multiple annotations by pay item, sums quantities, joins notes', () => {
    const res = buildSnapshotFromInputs(
      [
        ann({ id: 'a1', pay_item_id: 'pi-2', measurement: 27, depth: 1, type: 'polygon', notes: 'span 1' }),
        ann({ id: 'a2', pay_item_id: 'pi-2', measurement: 54, depth: 1, type: 'polygon', notes: 'span 2' }),
        ann({ id: 'a3', pay_item_id: 'pi-1', type: 'count' }),
      ],
      items, new Map(),
    );
    expect(res).toHaveLength(2);
    const exc = res.find(r => r.pay_item_id === 'pi-2')!;
    expect(exc.delta_quantity).toBeCloseTo(3, 2); // 81 sf @ 1 ft / 27
    expect(exc.annotation_ids).toEqual(['a1', 'a2']);
    expect(exc.notes).toBe('span 1 · span 2');
  });

  it('mixes manual_quantity overrides into the same pay item total', () => {
    const res = buildSnapshotFromInputs(
      [
        ann({ pay_item_id: 'pi-3', measurement: 18, type: 'polygon' }),     // 2 SY
        ann({ pay_item_id: 'pi-3', manual_quantity: 5, type: 'polygon' }),  // override
      ],
      items, new Map(),
    );
    expect(res[0].delta_quantity).toBeCloseTo(7, 2);
  });

  it('attaches prior cumulative and computes new_cumulative', () => {
    const prior = new Map([['pi-2', 12.5]]);
    const res = buildSnapshotFromInputs(
      [ann({ pay_item_id: 'pi-2', measurement: 27, depth: 1, type: 'polygon' })],
      items, prior,
    );
    expect(res[0].prior_cumulative).toBeCloseTo(12.5, 2);
    expect(res[0].new_cumulative).toBeCloseTo(13.5, 2);
  });

  it('handles missing prior approved cumulative as zero', () => {
    const res = buildSnapshotFromInputs(
      [ann({ pay_item_id: 'pi-1', type: 'count' })],
      items, new Map(),
    );
    expect(res[0].prior_cumulative).toBe(0);
    expect(res[0].new_cumulative).toBe(1);
  });

  it('sorts by item_code for deterministic output', () => {
    const res = buildSnapshotFromInputs(
      [
        ann({ pay_item_id: 'pi-3', measurement: 9, type: 'polygon' }),
        ann({ pay_item_id: 'pi-1', type: 'count' }),
        ann({ pay_item_id: 'pi-2', measurement: 27, depth: 1, type: 'polygon' }),
      ],
      items, new Map(),
    );
    expect(res.map(r => r.item_code)).toEqual(['201-0001', '202-0006', '301-0010']);
  });
});
