import type { Annotation, PayItem } from '@/types/project';
import * as XLSX from 'xlsx';
import { sfToCY, sfToSY } from '@/lib/geometry';
import { UNIT_LABELS, getPayItemSection } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { loadApprovedTotalsByPayItem } from '@/lib/approved-quantities';
import { saveExport } from '@/lib/native/filesystem';



interface ExportRow {
  itemNumber: number;
  itemCode: string;
  name: string;
  count: number;
  quantity: number;
  unit: string;
  unitLabel: string;
  unitPrice: number;
  contractQuantity?: number;
  extended: number;
  section: number;
}

function buildRows(
  annotations: Annotation[],
  payItems: PayItem[],
  approvedOverrides?: Map<string, number>,
): ExportRow[] {
  return payItems
    .map(item => {
      const anns = annotations.filter(a => a.payItemId === item.id);
      let qty = 0;
      if (approvedOverrides) {
        qty = approvedOverrides.get(item.id) ?? 0;
      } else {
        for (const a of anns) {
          if (a.manualQuantity != null) { qty += a.manualQuantity; continue; }
          if (a.type === 'count') { qty += 1; continue; }
          if (a.depth && a.depth > 0) qty += sfToCY(a.measurement, a.depth);
          else if (item.unit === 'SY') qty += sfToSY(a.measurement);
          else qty += a.measurement;
        }
      }
      return {
        itemNumber: item.itemNumber,
        itemCode: item.itemCode,
        name: item.name,
        count: approvedOverrides ? (qty > 0 ? 1 : 0) : anns.length,
        quantity: qty,
        unit: item.unit,
        unitLabel: UNIT_LABELS[item.unit],
        unitPrice: item.unitPrice,
        contractQuantity: item.contractQuantity,
        extended: qty * item.unitPrice,
        section: getPayItemSection(item.itemCode),
      };
    })
    .filter(r => r.quantity > 0 || r.count > 0);
}


function writeCsvFromRows(rows: ExportRow[], projectName: string, fileSuffix = 'summary'): void {
  const header = 'Section,Item #,Item Code,Pay Item,Count,Measured Qty,Unit,Unit Price,Contract Qty,Variance %,Extended Cost';

  const sections = new Map<number, ExportRow[]>();
  for (const r of rows) {
    if (!sections.has(r.section)) sections.set(r.section, []);
    sections.get(r.section)!.push(r);
  }

  const lines: string[] = [];
  const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0]);
  for (const [sec, sectionRows] of sortedSections) {
    for (const r of sectionRows) {
      const variance = r.contractQuantity && r.contractQuantity > 0
        ? (((r.quantity - r.contractQuantity) / r.contractQuantity) * 100).toFixed(1) + '%'
        : '';
      lines.push(
        `${sec},${r.itemNumber},"${r.itemCode}","${r.name}",${r.count},${r.quantity.toFixed(1)},${r.unitLabel},${r.unitPrice.toFixed(2)},${r.contractQuantity ?? ''},${variance},${r.extended.toFixed(2)}`
      );
    }
  }

  const total = rows.reduce((s, r) => s + r.extended, 0);
  lines.push(`,,,,,,,,,TOTAL,${total.toFixed(2)}`);

  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  void saveExport(`${projectName || 'takeoff'}_${fileSuffix}.csv`, blob);
}

export function exportCsv(annotations: Annotation[], payItems: PayItem[], projectName: string): void {
  writeCsvFromRows(buildRows(annotations, payItems), projectName);
}

/**
 * Export only RE-approved quantities (from v_approved_pay_item_quantities).
 * Use this for any "official" contract export.
 */
export async function exportApprovedCsv(
  projectId: string, payItems: PayItem[], projectName: string,
): Promise<void> {
  const approved = await loadApprovedTotalsByPayItem(projectId);
  const overrides = new Map<string, number>();
  for (const [k, v] of approved) overrides.set(k, v.approved_quantity);
  writeCsvFromRows(buildRows([], payItems, overrides), projectName, 'approved_summary');
}


async function writePdfFromRows(
  rows: ExportRow[],
  projectName: string,
  contractNumber: string,
  opts: { title?: string; fileSuffix?: string } = {},
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const total = rows.reduce((s, r) => s + r.extended, 0);
  const title = opts.title ?? 'Quantity Takeoff Summary';
  const fileSuffix = opts.fileSuffix ?? 'report';

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Project: ${projectName}`, 14, 30);
  if (contractNumber) doc.text(`Contract: ${contractNumber}`, 14, 36);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, contractNumber ? 42 : 36);

  const sections = new Map<number, ExportRow[]>();
  for (const r of rows) {
    if (!sections.has(r.section)) sections.set(r.section, []);
    sections.get(r.section)!.push(r);
  }
  const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0]);

  let y = contractNumber ? 52 : 46;
  doc.setFontSize(7);

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.text('Item #', 14, y);
    doc.text('Code', 28, y);
    doc.text('Description', 52, y);
    doc.text('Measured', 108, y, { align: 'right' });
    doc.text('Contract', 128, y, { align: 'right' });
    doc.text('Var %', 143, y, { align: 'right' });
    doc.text('Price', 162, y, { align: 'right' });
    doc.text('Extended', 185, y, { align: 'right' });
    y += 2;
    doc.line(14, y, 190, y);
    y += 4;
  };

  drawHeader();

  for (const [sec, sectionRows] of sortedSections) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Section ${sec}`, 14, y);
    y += 5;
    doc.setFontSize(7);

    doc.setFont('helvetica', 'normal');
    for (const r of sectionRows) {
      const variance = r.contractQuantity && r.contractQuantity > 0
        ? `${(((r.quantity - r.contractQuantity) / r.contractQuantity) * 100).toFixed(0)}%`
        : '-';
      doc.text(String(r.itemNumber), 14, y);
      doc.text(r.itemCode, 28, y);
      doc.text(r.name.substring(0, 30), 52, y);
      doc.text(r.quantity.toFixed(1), 108, y, { align: 'right' });
      doc.text(r.contractQuantity != null ? r.contractQuantity.toFixed(1) : '-', 128, y, { align: 'right' });
      doc.text(variance, 143, y, { align: 'right' });
      doc.text(`$${r.unitPrice.toFixed(2)}`, 162, y, { align: 'right' });
      doc.text(`$${r.extended.toFixed(2)}`, 185, y, { align: 'right' });
      y += 5;
      if (y > 275) { doc.addPage(); y = 20; drawHeader(); }
    }
    y += 2;
  }

  y += 2;
  doc.line(14, y, 190, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GRAND TOTAL', 14, y);
  doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 185, y, { align: 'right' });

  doc.save(`${projectName || 'takeoff'}_${fileSuffix}.pdf`);
}

export async function exportPdfReport(
  annotations: Annotation[],
  payItems: PayItem[],
  projectName: string,
  contractNumber: string,
): Promise<void> {
  await writePdfFromRows(buildRows(annotations, payItems), projectName, contractNumber);
}

/**
 * Export only RE-approved quantities (from v_approved_pay_item_quantities).
 * Use this for any "official" contract export.
 */
export async function exportApprovedPdfReport(
  projectId: string,
  payItems: PayItem[],
  projectName: string,
  contractNumber: string,
): Promise<void> {
  const approved = await loadApprovedTotalsByPayItem(projectId);
  const overrides = new Map<string, number>();
  for (const [k, v] of approved) overrides.set(k, v.approved_quantity);
  await writePdfFromRows(
    buildRows([], payItems, overrides),
    projectName,
    contractNumber,
    { title: 'RE-Approved Quantity Report', fileSuffix: 'approved_report' },
  );
}


/**
 * Export annotations by one inspector as an Excel workbook.
 * Filters by date and strictly by userId.
 */
export function exportInspectorDaily(
  allAnnotations: Annotation[],
  payItems: PayItem[],
  projectName: string,
  contractNumber: string,
  inspectorName: string,
  userId: string,
  date?: Date,
): void {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);

  // Strict filtering: must match date AND userId
  const filtered = allAnnotations.filter(a => {
    if (!a.createdAt) return false;
    if (a.createdAt.slice(0, 10) !== dateStr) return false;
    // Strictly filter by userId — exclude annotations without userId or from other users
    if (!a.userId || a.userId !== userId) return false;
    return true;
  });

  const wb = XLSX.utils.book_new();

  const headerRows = [
    ['Daily Inspector Report'],
    [`Project: ${projectName}`, '', `Contract: ${contractNumber || 'N/A'}`],
    [`Inspector: ${inspectorName || 'Unknown'}`, '', `Date: ${targetDate.toLocaleDateString()}`],
    [],
    ['Pay Item Code', 'Pay Item Name', "Calc'd Qty", 'Final Qty', 'Unit', 'Location', 'Notes', 'Page'],
  ];

  const dataRows = filtered.map(ann => {
    const item = payItems.find(p => p.id === ann.payItemId);
    const calcQty = ann.measurement;
    const finalQty = ann.manualQuantity != null ? ann.manualQuantity : calcQty;
    return [
      item?.itemCode || '',
      item?.name || '',
      Number(calcQty.toFixed(2)),
      Number(finalQty.toFixed(2)),
      ann.measurementUnit,
      ann.location || '',
      ann.notes || '',
      ann.page,
    ];
  });

  const ws1Data = [...headerRows, ...dataRows];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!cols'] = [
    { wch: 16 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 8 }, { wch: 24 }, { wch: 30 }, { wch: 8 },
  ];
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Daily Report');

  const pageSet = new Set(filtered.map(a => a.page));
  const sortedPages = Array.from(pageSet).sort((a, b) => a - b);

  const ws2Header = [
    ['Plan Pages with Annotations'],
    [],
    ['Page #', 'Annotation Count', 'Pay Items Used'],
  ];

  const ws2Data = sortedPages.map(pg => {
    const pageAnns = filtered.filter(a => a.page === pg);
    const items = new Set(pageAnns.map(a => {
      const item = payItems.find(p => p.id === a.payItemId);
      return item?.name || 'Unknown';
    }));
    return [pg, pageAnns.length, Array.from(items).join(', ')];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([...ws2Header, ...ws2Data]);
  ws2['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 50 }];
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Plan Pages');

  XLSX.writeFile(wb, `${projectName || 'takeoff'}_daily_${dateStr}.xlsx`);
}

/**
 * Export an inspector's daily-report snapshot for a single date.
 * Prefers the RE-approved snapshot. If none exists, falls back to the
 * inspector's own submitted/draft snapshot and clearly labels the export
 * as PENDING — these quantities are not yet officially approved.
 */
export async function exportApprovedInspectorDaily(
  projectId: string,
  payItems: PayItem[],
  projectName: string,
  contractNumber: string,
  inspectorName: string,
  userId: string,
  date?: Date,
): Promise<void> {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_reports')
    .select('snapshot, approved_at, status, submitted_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('report_date', dateStr)
    .in('status', ['approved', 'submitted', 'draft'])
    // Approved first, then submitted, then draft.
    .order('status', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const status = (data as any)?.status as 'approved' | 'submitted' | 'draft' | undefined;
  const isApproved = status === 'approved';

  const snapshot: Array<{
    pay_item_id: string; item_code: string; name: string; unit: string;
    delta_quantity: number; new_cumulative: number; notes?: string;
  }> = Array.isArray((data as any)?.snapshot) ? (data as any).snapshot : [];

  const itemById = new Map(payItems.map(p => [p.id, p]));

  const statusLine = isApproved
    ? `Status: Approved (Official)`
    : status === 'submitted'
      ? `Status: PENDING — Submitted, awaiting RE approval. NOT official.`
      : status === 'draft'
        ? `Status: PENDING — Draft, not yet submitted. NOT official.`
        : `Status: No report for this date`;

  const tsLine = isApproved
    ? `Approved: ${(data as any)?.approved_at ? new Date((data as any).approved_at).toLocaleString() : ''}`
    : status === 'submitted'
      ? `Submitted: ${(data as any)?.submitted_at ? new Date((data as any).submitted_at).toLocaleString() : ''}`
      : '';

  const wb = XLSX.utils.book_new();
  const headerRows: any[][] = [
    [isApproved ? 'RE-Approved Daily Inspector Report' : 'PENDING Daily Inspector Report'],
    [`Project: ${projectName}`, '', `Contract: ${contractNumber || 'N/A'}`],
    [`Inspector: ${inspectorName || 'Unknown'}`, '', `Date: ${targetDate.toLocaleDateString()}`],
    [statusLine, '', tsLine],
    [],
    ['Pay Item Code', 'Pay Item Name', 'Day Qty', 'Cumulative Qty', 'Unit', 'Notes'],
  ];

  const dataRows = snapshot.length === 0
    ? [['—', data ? 'Snapshot is empty for this date.' : 'No report exists for this date.', '', '', '', '']]
    : snapshot.map(s => {
        const item = itemById.get(s.pay_item_id);
        return [
          s.item_code || item?.itemCode || '',
          s.name || item?.name || '',
          Number((s.delta_quantity ?? 0).toFixed(2)),
          Number((s.new_cumulative ?? 0).toFixed(2)),
          s.unit || item?.unit || '',
          s.notes || '',
        ];
      });

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);
  ws['!cols'] = [
    { wch: 16 }, { wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 40 },
  ];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, ws, isApproved ? 'Approved Daily' : 'PENDING Daily');

  const suffix = isApproved ? 'approved_daily' : 'PENDING_daily';
  XLSX.writeFile(wb, `${projectName || 'takeoff'}_${suffix}_${dateStr}.xlsx`);
}

