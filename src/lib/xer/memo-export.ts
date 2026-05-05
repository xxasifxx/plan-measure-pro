// Export the RE feedback memo as PDF (jspdf) or Word-openable HTML doc.
import { jsPDF } from 'jspdf';

export function downloadMemoPdf(memo: string, filename: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 54; // 0.75"
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(memo, maxW) as string[];
  const lineH = 12;
  let y = margin;
  for (const line of lines) {
    if (y + lineH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineH;
  }
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export function downloadMemoDoc(memo: string, filename: string) {
  const safe = memo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>RE Feedback Memo</title>
<style>
  @page { size: 8.5in 11in; margin: 0.75in; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 10pt; color: #000; }
  pre  { font-family: 'Courier New', Courier, monospace; font-size: 10pt; white-space: pre-wrap; margin: 0; }
</style>
</head><body><pre>${safe}</pre></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') || filename.endsWith('.docx') ? filename : `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
