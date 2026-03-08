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
  _pageNum: number = 1
): Promise<TocEntry[]> {
  const entries: TocEntry[] = [];
  const maxPages = Math.min(3, pdf.numPages);

  for (let pg = 1; pg <= maxPages; pg++) {
    const page = await pdf.getPage(pg);
    const textContent = await page.getTextContent();
    const textItems = textContent.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => ({
        str: (item as any).str as string,
        x: (item as any).transform?.[4] ?? 0,
        y: (item as any).transform?.[5] ?? 0,
      }));

    // Debug: log all text items
    console.group(`[TOC Parser] Page ${pg} — ${textItems.length} text items`);
    for (const item of textItems) {
      if (item.str.trim()) {
        console.log(`  x:${Math.round(item.x)} y:${Math.round(item.y)} "${item.str}"`);
      }
    }
    console.groupEnd();

    const fullText = textItems.map(t => t.str).join(' ');

    // ONLY look for "INDEX OF SHEETS" — ignore all other tables
    if (!/INDEX\s+OF\s+SHEETS/i.test(fullText)) {
      console.log(`[TOC Parser] Page ${pg}: No "INDEX OF SHEETS" — skipping`);
      continue;
    }

    console.log(`[TOC Parser] Page ${pg}: Found "INDEX OF SHEETS"`);

    // Group text items into rows by Y coordinate
    const yGroups = new Map<number, typeof textItems>();
    for (const item of textItems) {
      const roundedY = Math.round(item.y / 2) * 2;
      if (!yGroups.has(roundedY)) yGroups.set(roundedY, []);
      yGroups.get(roundedY)!.push(item);
    }

    // Sort rows top-to-bottom (PDF Y is bottom-up → sort descending)
    const rows = Array.from(yGroups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({
        y,
        items: items.sort((a, b) => a.x - b.x),
        text: items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim(),
      }));

    // Find the "INDEX OF SHEETS" header row
    const headerIdx = rows.findIndex(r => /INDEX\s+OF\s+SHEETS/i.test(r.text));
    if (headerIdx < 0) continue;

    // Find the column header row: "SHEET NO." and "DESCRIPTION"
    let sheetNoX: number | null = null;
    let descX: number | null = null;
    let dataStartIdx = headerIdx + 1;

    for (let i = headerIdx; i < Math.min(headerIdx + 5, rows.length); i++) {
      for (const item of rows[i].items) {
        if (/SHEET\s*NO/i.test(item.str)) sheetNoX = item.x;
        if (/DESCRIPTION/i.test(item.str)) descX = item.x;
      }
      if (sheetNoX !== null && descX !== null) {
        dataStartIdx = i + 1;
        break;
      }
    }

    console.log(`[TOC Parser] Columns — SHEET NO x:${sheetNoX?.toFixed(0) ?? '?'}, DESCRIPTION x:${descX?.toFixed(0) ?? '?'}, data rows start at index ${dataStartIdx}`);

    // Parse data rows
    for (let i = dataStartIdx; i < rows.length; i++) {
      const row = rows[i];

      // Stop at title block / revision block
      if (/DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\./i.test(row.text)) break;
      if (row.text.length < 2) continue;

      let sheetNo = '';
      let description = '';

      if (sheetNoX !== null && descX !== null) {
        // Assign each text item to the nearest column
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
        // No column headers found — treat first token as sheet no
        const parts = row.text.split(/\s{2,}/);
        sheetNo = parts[0] || '';
        description = parts.slice(1).join(' ');
      }

      sheetNo = sheetNo.trim();
      description = description.trim().replace(/[.\s]+$/, '');

      if (!sheetNo || !description) continue;
      if (/SHEET\s*NO|DESCRIPTION|INDEX\s+OF/i.test(sheetNo + ' ' + description)) continue;

      console.log(`[TOC Parser] → [${sheetNo}] "${description}"`);

      entries.push({
        label: `${sheetNo} — ${description}`,
        page: entries.length + 1,
      });
    }
  }

  // Cap to actual page count
  for (const entry of entries) {
    if (entry.page > pdf.numPages) entry.page = pdf.numPages;
  }

  if (entries.length === 0) {
    console.log('[TOC Parser] No entries found. Falling back to page list.');
  } else {
    console.log(`[TOC Parser] Found ${entries.length} TOC entries.`);
  }

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
