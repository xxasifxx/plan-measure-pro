import type { Annotation, PayItem } from '@/types/project';
import * as XLSX from 'xlsx';
import { sfToCY, sfToSY } from '@/lib/geometry';
import { UNIT_LABELS, getPayItemSection } from '@/types/project';

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

function buildRows(annotations: Annotation[], payItems: PayItem[]): ExportRow[] {
  return payItems
    .map(item => {
      const anns = annotations.filter(a => a.payItemId === item.id);
      let qty = 0;
      for (const a of anns) {
        if (a.manualQuantity != null) { qty += a.manualQuantity; continue; }
        if (a.type === 'count') { qty += 1; continue; }
        if (a.depth && a.depth > 0) qty += sfToCY(a.measurement, a.depth);
        else if (item.unit === 'SY') qty += sfToSY(a.measurement);
        else qty += a.measurement;
      }
      return {
        itemNumber: item.itemNumber,
        itemCode: item.itemCode,
        name: item.name,
        count: anns.length,
        quantity: qty,
        unit: item.unit,
        unitLabel: UNIT_LABELS[item.unit],
        unitPrice: item.unitPrice,
        contractQuantity: item.contractQuantity,
        extended: qty * item.unitPrice,
        section: getPayItemSection(item.itemCode),
      };
    })
    .filter(r => r.count > 0);
}

export function exportCsv(annotations: Annotation[], payItems: PayItem[], projectName: string): void {
  const rows = buildRows(annotations, payItems);
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'takeoff'}_summary.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPdfReport(
  annotations: Annotation[],
  payItems: PayItem[],
  projectName: string,
  contractNumber: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const rows = buildRows(annotations, payItems);
  const total = rows.reduce((s, r) => s + r.extended, 0);

  doc.setFontSize(16);
  doc.text('Quantity Takeoff Summary', 14, 20);
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

  doc.save(`${projectName || 'takeoff'}_report.pdf`);
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
