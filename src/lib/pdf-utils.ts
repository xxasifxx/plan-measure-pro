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

/**
 * Extract text items from a specific rectangular region of a PDF page.
 * Coordinates are in canvas pixels (already scaled).
 */
export async function extractTextFromRegion(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number,
  rect: { x1: number; y1: number; x2: number; y2: number }
): Promise<TocEntry[]> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();

  // Filter text items that fall within the selection rectangle
  const textItems = textContent.items
    .filter((item: any) => 'str' in item && item.str.trim())
    .map((item: any) => {
      // Transform PDF coordinates to canvas coordinates
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      return {
        str: item.str as string,
        x: tx[4] as number,
        y: tx[5] as number,
        width: item.width * scale,
        height: item.height * scale,
      };
    })
    .filter(item => {
      // Check if text item falls within selection rectangle
      const minX = Math.min(rect.x1, rect.x2);
      const maxX = Math.max(rect.x1, rect.x2);
      const minY = Math.min(rect.y1, rect.y2);
      const maxY = Math.max(rect.y1, rect.y2);
      return item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY;
    });

  console.log(`[TOC Extract] Found ${textItems.length} text items in selection`);

  // Group by Y coordinate into rows
  const yGroups = new Map<number, typeof textItems>();
  for (const item of textItems) {
    const roundedY = Math.round(item.y / 3) * 3;
    if (!yGroups.has(roundedY)) yGroups.set(roundedY, []);
    yGroups.get(roundedY)!.push(item);
  }

  // Sort rows top-to-bottom (canvas Y increases downward)
  const rows = Array.from(yGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, items]) => ({
      y,
      items: items.sort((a, b) => a.x - b.x),
      text: items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim(),
    }));

  console.log(`[TOC Extract] Grouped into ${rows.length} rows`);

  // Try to detect column layout: find "SHEET NO" and "DESCRIPTION" headers
  let sheetNoX: number | null = null;
  let descX: number | null = null;
  let dataStartIdx = 0;

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    for (const item of rows[i].items) {
      if (/SHEET\s*NO/i.test(item.str)) sheetNoX = item.x;
      if (/DESCRIPTION/i.test(item.str)) descX = item.x;
    }
    if (sheetNoX !== null && descX !== null) {
      dataStartIdx = i + 1;
      break;
    }
    // Skip header rows like "INDEX OF SHEETS"
    if (/INDEX\s+OF\s+SHEETS/i.test(rows[i].text)) {
      dataStartIdx = i + 1;
    }
  }

  console.log(`[TOC Extract] Columns — SHEET NO x:${sheetNoX?.toFixed(0) ?? '?'}, DESCRIPTION x:${descX?.toFixed(0) ?? '?'}, data starts at row ${dataStartIdx}`);

  const entries: TocEntry[] = [];

  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty or header-like rows
    if (row.text.length < 2) continue;
    if (/SHEET\s*NO|DESCRIPTION|INDEX\s+OF/i.test(row.text)) continue;
    // Stop at title block indicators
    if (/DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\./i.test(row.text)) break;

    let sheetNo = '';
    let description = '';

    if (sheetNoX !== null && descX !== null) {
      for (const item of row.items) {
        if (!item.str.trim()) continue;
        const distSheet = Math.abs(item.x - sheetNoX);
        const distDesc = Math.abs(item.x - descX);
        if (distSheet < distDesc) {
          sheetNo += (sheetNo ? ' ' : '') + item.str.trim();
        } else {
          description += (description ? ' ' : '') + item.str.trim();
        }
      }
    } else {
      // Fallback: split on large whitespace gaps
      const parts = row.text.split(/\s{2,}/);
      sheetNo = parts[0] || '';
      description = parts.slice(1).join(' ');
    }

    sheetNo = sheetNo.trim();
    description = description.trim().replace(/[.\s]+$/, '');

    if (!sheetNo || !description) continue;

    console.log(`[TOC Extract] → [${sheetNo}] "${description}"`);

    entries.push({
      label: `${sheetNo} — ${description}`,
      page: entries.length + 1,
    });
  }

  // Cap to actual page count
  for (const entry of entries) {
    if (entry.page > pdf.numPages) entry.page = pdf.numPages;
  }

  console.log(`[TOC Extract] Parsed ${entries.length} TOC entries`);
  return entries;
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
