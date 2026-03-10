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
    const rowText = rows[i].text;
    for (const item of rows[i].items) {
      // Match various header formats: "SHEET NO", "SHEET NO.", "SHEET", "NO.", "SHT"
      if (/SHEET/i.test(item.str) && sheetNoX === null) sheetNoX = item.x;
      if (/^NO\.?$/i.test(item.str) && sheetNoX === null) sheetNoX = item.x;
      if (/DESCRIPTION/i.test(item.str)) descX = item.x;
    }
    if (sheetNoX !== null && descX !== null) {
      dataStartIdx = i + 1;
      break;
    }
    // Skip header rows like "INDEX OF SHEETS"
    if (/INDEX\s+OF\s+SHEETS/i.test(rowText) || /SHEET\s*NO/i.test(rowText) || /DESCRIPTION/i.test(rowText)) {
      dataStartIdx = i + 1;
    }
  }

  // If we found DESCRIPTION but not SHEET NO, infer sheetNoX from data rows
  if (descX !== null && sheetNoX === null) {
    for (let i = dataStartIdx; i < Math.min(dataStartIdx + 5, rows.length); i++) {
      for (const item of rows[i].items) {
        if (/^\d+(-\d+)?$/.test(item.str.trim()) && item.x < descX) {
          sheetNoX = item.x;
          break;
        }
      }
      if (sheetNoX !== null) break;
    }
  }

  console.log(`[TOC Extract] Columns — SHEET NO x:${sheetNoX?.toFixed(0) ?? '?'}, DESCRIPTION x:${descX?.toFixed(0) ?? '?'}, data starts at row ${dataStartIdx}`);

  // Parse raw rows into individual entries
  const rawEntries: { sheetNo: string; description: string }[] = [];

  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i];
    if (row.text.length < 2) continue;
    if (/SHEET\s*NO|DESCRIPTION|INDEX\s+OF/i.test(row.text)) continue;
    if (/DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\./i.test(row.text)) break;

    let sheetNo = '';
    let description = '';

    if (sheetNoX !== null && descX !== null) {
      // Use midpoint between columns as boundary
      const boundary = (sheetNoX + descX) / 2;
      for (const item of row.items) {
        if (!item.str.trim()) continue;
        if (item.x < boundary) {
          sheetNo += (sheetNo ? ' ' : '') + item.str.trim();
        } else {
          description += (description ? ' ' : '') + item.str.trim();
        }
      }
    } else if (descX !== null) {
      // Only have description column — items left of it are sheet numbers
      for (const item of row.items) {
        if (!item.str.trim()) continue;
        if (item.x < descX - 20) {
          sheetNo += (sheetNo ? ' ' : '') + item.str.trim();
        } else {
          description += (description ? ' ' : '') + item.str.trim();
        }
      }
    } else {
      // Fallback: first token that looks like a sheet number, rest is description
      const match = row.text.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+(.+)/);
      if (match) {
        sheetNo = match[1];
        description = match[2];
      } else {
        const parts = row.text.split(/\s{2,}/);
        sheetNo = parts[0] || '';
        description = parts.slice(1).join(' ');
      }
    }

    sheetNo = sheetNo.trim();
    description = description.trim().replace(/[.\s]+$/, '');

    if (!sheetNo || !description) continue;

    console.log(`[TOC Extract] → [${sheetNo}] "${description}"`);
    rawEntries.push({ sheetNo, description });
  }

  // Group consecutive entries with the same description into page ranges
  const entries: TocEntry[] = [];
  let pageCounter = 1;

  for (let i = 0; i < rawEntries.length; i++) {
    const current = rawEntries[i];
    const startPage = pageCounter;

    // Check for "THRU" or hyphenated ranges in sheet number (e.g., "C-101 THRU C-105")
    const thruMatch = current.sheetNo.match(/(.+?)\s*(?:THRU|THROUGH|-)\s*(.+)/i);
    if (thruMatch) {
      // Estimate page count from sheet numbers
      const startNum = parseInt(thruMatch[1].replace(/\D/g, '')) || 0;
      const endNum = parseInt(thruMatch[2].replace(/\D/g, '')) || 0;
      const rangeSize = endNum > startNum ? endNum - startNum + 1 : 1;
      pageCounter += rangeSize;
      entries.push({
        label: current.description,
        sheetNo: current.sheetNo,
        startPage,
        endPage: startPage + rangeSize - 1,
      });
      continue;
    }

    // Group consecutive entries with same description
    let endIdx = i;
    while (endIdx + 1 < rawEntries.length && rawEntries[endIdx + 1].description === current.description) {
      endIdx++;
    }

    const groupSize = endIdx - i + 1;
    const sheetNos = groupSize === 1
      ? current.sheetNo
      : `${current.sheetNo} - ${rawEntries[endIdx].sheetNo}`;

    entries.push({
      label: current.description,
      sheetNo: sheetNos,
      startPage,
      endPage: startPage + groupSize - 1,
    });

    pageCounter += groupSize;
    i = endIdx; // skip grouped entries
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
