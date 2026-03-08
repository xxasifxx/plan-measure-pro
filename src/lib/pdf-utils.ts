import * as pdfjsLib from 'pdfjs-dist';
import type { TocEntry } from '@/types/project';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function loadPdf(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf;
}

export async function renderPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<void> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;
}

export async function extractTocFromPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number = 1
): Promise<TocEntry[]> {
  // Try extracting from multiple pages (some PDFs split TOC across pages)
  const entries: TocEntry[] = [];
  const maxTocPages = Math.min(3, pdf.numPages);

  for (let pg = 1; pg <= maxTocPages; pg++) {
    const page = await pdf.getPage(pg);
    const textContent = await page.getTextContent();
    const textItems = textContent.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => ({
        str: (item as any).str as string,
        x: (item as any).transform?.[4] ?? 0,
        y: (item as any).transform?.[5] ?? 0,
      }));

    const fullText = textItems.map(t => t.str).join(' ');

    // Check if this page contains an "INDEX OF SHEETS" or similar TOC header
    const hasTocHeader = /INDEX\s+OF\s+SHEETS|TABLE\s+OF\s+CONTENTS|SHEET\s+INDEX/i.test(fullText);
    if (pg > 1 && !hasTocHeader && entries.length > 0) break;

    // Strategy 1: "INDEX OF SHEETS" format
    // Sheet numbers like "C-101", "G-001", "SP-1", "1", "2" paired with descriptions
    // Pattern: SheetNo (alphanumeric with dashes/dots) followed by description text
    // The sheet number IS the page ordering — we assign sequential page numbers

    // Build lines by grouping text items by Y position
    const yGroups = new Map<number, typeof textItems>();
    for (const item of textItems) {
      const roundedY = Math.round(item.y / 3) * 3; // group within 3pt
      if (!yGroups.has(roundedY)) yGroups.set(roundedY, []);
      yGroups.get(roundedY)!.push(item);
    }

    // Sort groups top-to-bottom (highest Y = top of page in PDF coords)
    const sortedLines = Array.from(yGroups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x));

    for (const lineItems of sortedLines) {
      const lineText = lineItems.map(i => i.str).join(' ').trim();
      if (!lineText || lineText.length < 2) continue;

      // Skip header rows
      if (/SHEET\s*NO|DESCRIPTION|INDEX\s+OF/i.test(lineText)) continue;

      // Pattern: "C-101 COVER SHEET" or "SP-1 SITE PLAN" or "1 GENERAL NOTES"
      const sheetMatch = lineText.match(
        /^([A-Z]{0,4}[\-.]?\d{1,4}[A-Z]?)\s+(.{3,})$/i
      );
      if (sheetMatch) {
        const sheetNo = sheetMatch[1].trim();
        const description = sheetMatch[2].trim()
          .replace(/[.\s]+$/, '') // trailing dots/spaces
          .replace(/\s{2,}/g, ' ');
        if (description.length > 1) {
          entries.push({
            label: `${sheetNo} — ${description}`,
            page: entries.length + 1, // sequential page assignment
          });
          continue;
        }
      }

      // Pattern: description then sheet number at end "COVER SHEET C-101"
      const reverseMatch = lineText.match(
        /^(.{3,}?)\s+([A-Z]{0,4}[\-.]?\d{1,4}[A-Z]?)\s*$/i
      );
      if (reverseMatch) {
        const description = reverseMatch[1].trim().replace(/[.\s]+$/, '');
        const sheetNo = reverseMatch[2].trim();
        if (description.length > 1) {
          entries.push({
            label: `${sheetNo} — ${description}`,
            page: entries.length + 1,
          });
          continue;
        }
      }
    }

    // Strategy 2: Fallback — generic "Name ... PageNum" patterns
    if (entries.length === 0) {
      const patterns = [
        /([A-Za-z][A-Za-z\s&\/\-,()]+?)[\s.]{3,}(\d{1,3})/g,
        /([A-Za-z][A-Za-z\s&\/\-,()]{3,}?)\s{2,}(\d{1,3})/g,
      ];

      for (const regex of patterns) {
        let match;
        while ((match = regex.exec(fullText)) !== null) {
          const label = match[1].trim();
          const pageRef = parseInt(match[2], 10);
          if (pageRef > 0 && pageRef <= pdf.numPages && label.length > 1) {
            entries.push({ label, page: pageRef });
          }
        }
        if (entries.length >= 3) break;
      }
    }
  }

  // If sequential assignment resulted in pages > numPages, cap them
  for (const entry of entries) {
    if (entry.page > pdf.numPages) entry.page = pdf.numPages;
  }

  return deduplicateEntries(entries);
}

function deduplicateEntries(entries: TocEntry[]): TocEntry[] {
  const seen = new Set<string>();
  return entries.filter(e => {
    const key = `${e.label}::${e.page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.page - b.page);
}

export function getPageDimensions(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number = 1.5
) {
  return pdf.getPage(pageNum).then(page => {
    const viewport = page.getViewport({ scale });
    return { width: viewport.width, height: viewport.height };
  });
}
