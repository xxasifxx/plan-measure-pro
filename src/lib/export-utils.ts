import type { Annotation, PayItem } from '@/types/project';
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
  const header = 'Section,Item #,Item Code,Pay Item,Count,Quantity,Unit,Unit Price,Contract Qty,Extended Cost';

  // Group by section
  const sections = new Map<number, ExportRow[]>();
  for (const r of rows) {
    if (!sections.has(r.section)) sections.set(r.section, []);
    sections.get(r.section)!.push(r);
  }

  const lines: string[] = [];
  const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0]);
  for (const [sec, sectionRows] of sortedSections) {
    for (const r of sectionRows) {
      lines.push(
        `${sec},${r.itemNumber},"${r.itemCode}","${r.name}",${r.count},${r.quantity.toFixed(1)},${r.unitLabel},${r.unitPrice.toFixed(2)},${r.contractQuantity ?? ''},${r.extended.toFixed(2)}`
      );
    }
  }

  const total = rows.reduce((s, r) => s + r.extended, 0);
  lines.push(`,,,,,,,,TOTAL,${total.toFixed(2)}`);

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

  // Title
  doc.setFontSize(16);
  doc.text('Quantity Takeoff Summary', 14, 20);
  doc.setFontSize(10);
  doc.text(`Project: ${projectName}`, 14, 30);
  if (contractNumber) doc.text(`Contract: ${contractNumber}`, 14, 36);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, contractNumber ? 42 : 36);

  // Group by section
  const sections = new Map<number, ExportRow[]>();
  for (const r of rows) {
    if (!sections.has(r.section)) sections.set(r.section, []);
    sections.get(r.section)!.push(r);
  }
  const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0]);

  let y = contractNumber ? 52 : 46;
  doc.setFontSize(7);

  // Table header
  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.text('Item #', 14, y);
    doc.text('Code', 28, y);
    doc.text('Description', 52, y);
    doc.text('Qty', 115, y, { align: 'right' });
    doc.text('Unit', 120, y);
    doc.text('Contract', 145, y, { align: 'right' });
    doc.text('Price', 162, y, { align: 'right' });
    doc.text('Extended', 185, y, { align: 'right' });
    y += 2;
    doc.line(14, y, 190, y);
    y += 4;
  };

  drawHeader();

  for (const [sec, sectionRows] of sortedSections) {
    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Section ${sec}`, 14, y);
    y += 5;
    doc.setFontSize(7);

    doc.setFont('helvetica', 'normal');
    for (const r of sectionRows) {
      doc.text(String(r.itemNumber), 14, y);
      doc.text(r.itemCode, 28, y);
      doc.text(r.name.substring(0, 35), 52, y);
      doc.text(r.quantity.toFixed(1), 115, y, { align: 'right' });
      doc.text(r.unitLabel, 120, y);
      doc.text(r.contractQuantity != null ? r.contractQuantity.toFixed(1) : '-', 145, y, { align: 'right' });
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
