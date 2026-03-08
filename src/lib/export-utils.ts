import type { Annotation, PayItem } from '@/types/project';
import { sfToCY, sfToSY } from '@/lib/geometry';

interface ExportRow {
  name: string;
  count: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  extended: number;
}

function buildRows(annotations: Annotation[], payItems: PayItem[]): ExportRow[] {
  return payItems
    .map(item => {
      const anns = annotations.filter(a => a.payItemId === item.id);
      let qty = 0;
      for (const a of anns) {
        if (a.depth && a.depth > 0) qty += sfToCY(a.measurement, a.depth);
        else if (item.unit === 'SY') qty += sfToSY(a.measurement);
        else qty += a.measurement;
      }
      return {
        name: item.name,
        count: anns.length,
        quantity: qty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        extended: qty * item.unitPrice,
      };
    })
    .filter(r => r.count > 0);
}

export function exportCsv(annotations: Annotation[], payItems: PayItem[], projectName: string): void {
  const rows = buildRows(annotations, payItems);
  const header = 'Pay Item,Count,Quantity,Unit,Unit Price,Extended Cost';
  const lines = rows.map(r =>
    `"${r.name}",${r.count},${r.quantity.toFixed(1)},${r.unit},${r.unitPrice.toFixed(2)},${r.extended.toFixed(2)}`
  );
  const total = rows.reduce((s, r) => s + r.extended, 0);
  lines.push(`"TOTAL",,,,,${total.toFixed(2)}`);

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

  // Table
  let y = contractNumber ? 52 : 46;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Pay Item', 14, y);
  doc.text('Qty', 100, y, { align: 'right' });
  doc.text('Unit', 115, y);
  doc.text('Price', 140, y, { align: 'right' });
  doc.text('Extended', 175, y, { align: 'right' });
  y += 2;
  doc.line(14, y, 180, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  for (const r of rows) {
    doc.text(r.name, 14, y);
    doc.text(r.quantity.toFixed(1), 100, y, { align: 'right' });
    doc.text(r.unit, 115, y);
    doc.text(`$${r.unitPrice.toFixed(2)}`, 140, y, { align: 'right' });
    doc.text(`$${r.extended.toFixed(2)}`, 175, y, { align: 'right' });
    y += 6;
    if (y > 270) { doc.addPage(); y = 20; }
  }

  y += 2;
  doc.line(14, y, 180, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL', 14, y);
  doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 175, y, { align: 'right' });

  doc.save(`${projectName || 'takeoff'}_report.pdf`);
}
