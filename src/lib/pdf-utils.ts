import * as pdfjsLib from 'pdfjs-dist';
import type { TocEntry, PayItem, PayItemUnit } from '@/types/project';
import { isDrawableUnit } from '@/types/project';

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

  // Group by Y coordinate into rows (tolerance of 5px)
  const yGroups = new Map<number, typeof textItems>();
  for (const item of textItems) {
    const roundedY = Math.round(item.y / 5) * 5;
    if (!yGroups.has(roundedY)) yGroups.set(roundedY, []);
    yGroups.get(roundedY)!.push(item);
  }

  // Sort rows top-to-bottom, items left-to-right
  const rows = Array.from(yGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, items]) => {
      const sorted = items.sort((a, b) => a.x - b.x);
      return {
        y,
        items: sorted,
        text: sorted.map(i => i.str).join(' ').trim(),
      };
    });

  console.log(`[TOC Extract] Grouped into ${rows.length} rows`);

  // Header patterns to skip
  const headerPattern = /SHEET\s*NO|DESCRIPTION|INDEX\s+OF\s+SHEETS|DRAWING\s+LIST/i;
  // Stop patterns
  const stopPattern = /DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\./i;

  // Number patterns
  const singleNumPattern = /^\d+$/;
  const rangePattern = /^(\d+)\s*[-–]\s*(\d+)$/;

  const entries: TocEntry[] = [];

  for (const row of rows) {
    console.log(`[TOC] Row: "${row.text}" | items: ${row.items.map(i => `"${i.str}"@${i.x.toFixed(0)}`).join(', ')}`);

    if (headerPattern.test(row.text)) {
      console.log(`[TOC]   → skipped (header)`);
      continue;
    }
    if (stopPattern.test(row.text)) {
      console.log(`[TOC]   → stop (footer)`);
      break;
    }
    if (row.text.length < 2) continue;

    // Find number or range among text items
    let startPage: number | null = null;
    let endPage: number | null = null;
    const descParts: string[] = [];

    for (const item of row.items) {
      const trimmed = item.str.trim();
      if (!trimmed) continue;

      const rangeMatch = trimmed.match(rangePattern);
      if (rangeMatch && startPage === null) {
        startPage = parseInt(rangeMatch[1]);
        endPage = parseInt(rangeMatch[2]);
        continue;
      }

      if (singleNumPattern.test(trimmed) && startPage === null) {
        startPage = parseInt(trimmed);
        endPage = startPage;
        continue;
      }

      // Not a number — part of description
      descParts.push(trimmed);
    }

    // Fallback: try regex on joined text
    if (startPage === null) {
      const joinedMatch = row.text.match(/^(\d+)\s*[-–]\s*(\d+)\s+(.+)/);
      if (joinedMatch) {
        startPage = parseInt(joinedMatch[1]);
        endPage = parseInt(joinedMatch[2]);
        descParts.length = 0;
        descParts.push(joinedMatch[3]);
      } else {
        const singleMatch = row.text.match(/^(\d+)\s+(.+)/);
        if (singleMatch) {
          startPage = parseInt(singleMatch[1]);
          endPage = startPage;
          descParts.length = 0;
          descParts.push(singleMatch[2]);
        }
      }
    }

    const description = descParts.join(' ').replace(/[.\s]+$/, '').trim();

    if (startPage === null || !description) {
      console.log(`[TOC]   → skipped (no number or no description)`);
      continue;
    }

    console.log(`[TOC]   → pages ${startPage}-${endPage} "${description}"`);
    entries.push({
      label: description,
      sheetNo: startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`,
      startPage,
      endPage: endPage!,
    });
  }

  // Cap to actual page count
  for (const entry of entries) {
    if (entry.startPage > pdf.numPages) entry.startPage = pdf.numPages;
    if (entry.endPage > pdf.numPages) entry.endPage = pdf.numPages;
  }

  console.log(`[TOC Extract] Parsed ${entries.length} TOC sections`);
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
