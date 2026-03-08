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
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  const textItems = textContent.items
    .filter((item: any) => 'str' in item)
    .map((item: any) => item.str as string);

  const fullText = textItems.join(' ');
  const entries: TocEntry[] = [];

  // Pattern: "Section Name ... PageNum" or "Section Name    PageNum" or "SECTION NAME 12"
  // Try multiple patterns
  const patterns = [
    // "Section Name ........... 12"
    /([A-Za-z][A-Za-z\s&\/\-,()]+?)[\s.]{3,}(\d{1,3})/g,
    // "Section Name  12" (multiple spaces then number)
    /([A-Za-z][A-Za-z\s&\/\-,()]{3,}?)\s{2,}(\d{1,3})/g,
    // "12  Section Name" (page number first)
    /(\d{1,3})\s{2,}([A-Za-z][A-Za-z\s&\/\-,()]{3,})/g,
  ];

  // Try first two patterns (section then page)
  for (let i = 0; i < 2; i++) {
    const regex = patterns[i];
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const label = match[1].trim();
      const page = parseInt(match[2], 10);
      if (page > 0 && page <= pdf.numPages && label.length > 1) {
        entries.push({ label, page });
      }
    }
    if (entries.length >= 3) return deduplicateEntries(entries);
  }

  // Try pattern 3 (page then section)
  const regex3 = patterns[2];
  let match;
  while ((match = regex3.exec(fullText)) !== null) {
    const page = parseInt(match[1], 10);
    const label = match[2].trim();
    if (page > 0 && page <= pdf.numPages && label.length > 1) {
      entries.push({ label, page });
    }
  }

  if (entries.length >= 2) return deduplicateEntries(entries);

  // Fallback: try line-by-line from textItems
  for (const item of textItems) {
    const lineMatch = item.match(/^(.+?)\s+(\d{1,3})\s*$/);
    if (lineMatch) {
      const label = lineMatch[1].trim().replace(/[.\s]+$/, '');
      const pg = parseInt(lineMatch[2], 10);
      if (pg > 0 && pg <= pdf.numPages && label.length > 1) {
        entries.push({ label, page: pg });
      }
    }
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
