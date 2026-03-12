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

const PAY_ITEM_COLORS = [
  '#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4',
  '#8bc34a', '#ff5722', '#607d8b', '#795548', '#cddc39',
  '#ff9800', '#4caf50', '#03a9f4', '#673ab7', '#f44336',
];

const UNIT_MAP: Record<string, PayItemUnit> = {
  'L.S.': 'LS', 'LS': 'LS', 'LUMP SUM': 'LS',
  'C.Y.': 'CY', 'CY': 'CY', 'CU. YD.': 'CY',
  'S.Y.': 'SY', 'SY': 'SY', 'SQ. YD.': 'SY',
  'S.F.': 'SF', 'SF': 'SF', 'SQ. FT.': 'SF',
  'L.F.': 'LF', 'LF': 'LF', 'LIN. FT.': 'LF',
  'EACH': 'EA', 'EA': 'EA',
  'TON': 'TON', 'TONS': 'TON',
  'USD': 'USD', 'DOLLAR': 'USD', 'DOLLARS': 'USD',
  'MNTH': 'MNTH', 'MONTH': 'MNTH', 'MO': 'MNTH',
};

function mapUnit(raw: string): PayItemUnit {
  const normalized = raw.trim().toUpperCase();
  return UNIT_MAP[normalized] || 'EA';
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HeaderCluster {
  items: TextItem[];
  minX: number;
  maxX: number;
  headerY: number;
  columns: {
    itemNo?: number;
    unitCode?: number;
    description?: number;
    unit?: number;
    quantity?: number;
  };
}

/**
 * Extract pay items from the current page's Estimate of Quantities table(s).
 * Handles side-by-side tables (e.g., items 1-60 left, 61-87 right).
 */
export async function extractPayItemsFromPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<PayItem[]> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();

  // Extract all text items with coordinates
  const allItems: TextItem[] = textContent.items
    .filter((item: any) => 'str' in item && item.str.trim())
    .map((item: any) => {
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      return {
        str: item.str.trim(),
        x: tx[4] as number,
        y: tx[5] as number,
        width: item.width * scale,
        height: item.height * scale,
      };
    });

  console.log(`[PayItems] Total text items on page: ${allItems.length}`);

  // Step 1: Find header rows — look for text items containing key column names
  // We look for "ITEM" items that are near "DESCRIPTION" and "UNIT" items (within similar Y)
  const itemNoHeaders = allItems.filter(t =>
    /^ITEM\s*(NO\.?|NUMBER)?$/i.test(t.str) || t.str === 'ITEM'
  );

  console.log(`[PayItems] Found ${itemNoHeaders.length} "ITEM" header(s) at X positions: ${itemNoHeaders.map(h => h.x.toFixed(0)).join(', ')}`);

  if (itemNoHeaders.length === 0) {
    throw new Error('Could not find "ITEM NO" header on this page. Navigate to the Estimate of Quantities page and try again.');
  }

  // Step 2: Build header clusters — group headers that share similar Y coordinates
  // Each cluster represents one table
  const Y_TOLERANCE = 10;
  const headerClusters: HeaderCluster[] = [];

  for (const itemHeader of itemNoHeaders) {
    // Find all header-like items on the same Y row as this ITEM header
    const nearbyHeaders = allItems.filter(t =>
      Math.abs(t.y - itemHeader.y) < Y_TOLERANCE
    );

    const clusterMinX = Math.min(...nearbyHeaders.map(h => h.x));
    const clusterMaxX = Math.max(...nearbyHeaders.map(h => h.x + h.width));

    // Identify column X positions from header text
    const columns: HeaderCluster['columns'] = {};
    columns.itemNo = itemHeader.x;

    for (const h of nearbyHeaders) {
      const s = h.str.toUpperCase();
      if (/UNIT\s*CODE/i.test(s) || /CODE/i.test(s)) {
        columns.unitCode = h.x;
      } else if (/DESCRIPTION/i.test(s)) {
        columns.description = h.x;
      } else if (/CONTRACT\s*QUANTITY/i.test(s) || /QUANTITY/i.test(s) || /QTY/i.test(s)) {
        columns.quantity = h.x;
      } else if (s === 'UNIT' && !(/CODE/i.test(s))) {
        // "UNIT" alone (not "UNIT CODE") — this is the unit column
        // But we need to distinguish from "UNIT CODE" and "UNIT PRICE"
        // Check if it's NOT the same X as unitCode
        if (!columns.unitCode || Math.abs(h.x - columns.unitCode) > 20) {
          columns.unit = h.x;
        }
      }
    }

    console.log(`[PayItems] Header cluster at X=${clusterMinX.toFixed(0)}-${clusterMaxX.toFixed(0)}, Y=${itemHeader.y.toFixed(0)}, columns:`, columns);

    headerClusters.push({
      items: nearbyHeaders,
      minX: clusterMinX,
      maxX: clusterMaxX,
      headerY: itemHeader.y,
      columns,
    });
  }

  // Step 3: Determine X boundaries for each table region
  // Sort clusters by X position (left to right)
  headerClusters.sort((a, b) => a.minX - b.minX);

  const regions: { cluster: HeaderCluster; xMin: number; xMax: number }[] = [];
  for (let i = 0; i < headerClusters.length; i++) {
    const cluster = headerClusters[i];
    const xMin = i === 0 ? 0 : (headerClusters[i - 1].maxX + cluster.minX) / 2;
    const xMax = i === headerClusters.length - 1 ? Infinity : (cluster.maxX + headerClusters[i + 1].minX) / 2;
    regions.push({ cluster, xMin, xMax });
  }

  console.log(`[PayItems] ${regions.length} table region(s) detected`);

  // Step 4: Parse each table region independently
  const allPayItems: PayItem[] = [];

  for (const region of regions) {
    const { cluster, xMin, xMax } = region;

    // Filter text items belonging to this region (by X) and below the header row (by Y)
    const regionItems = allItems.filter(t =>
      t.x >= xMin && t.x < xMax && t.y > cluster.headerY + Y_TOLERANCE
    );

    // Group into rows by Y coordinate
    const ROW_Y_TOLERANCE = 5;
    const yGroups = new Map<number, TextItem[]>();
    for (const item of regionItems) {
      const roundedY = Math.round(item.y / ROW_Y_TOLERANCE) * ROW_Y_TOLERANCE;
      if (!yGroups.has(roundedY)) yGroups.set(roundedY, []);
      yGroups.get(roundedY)!.push(item);
    }

    // Sort rows top-to-bottom
    const rows = Array.from(yGroups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, items]) => ({
        y,
        items: items.sort((a, b) => a.x - b.x),
      }));

    console.log(`[PayItems] Region X=${xMin.toFixed(0)}-${xMax === Infinity ? '∞' : xMax.toFixed(0)}: ${rows.length} rows`);

    // Build column boundaries: assign each text item to the nearest column
    const colPositions = cluster.columns;

    // Stop patterns — footers, title blocks, etc.
    const stopPattern = /DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\.|TOTAL|SHEET\s+\d|EQ-\d/i;

    for (const row of rows) {
      const rowText = row.items.map(i => i.str).join(' ');

      if (stopPattern.test(rowText)) {
        console.log(`[PayItems]   Row "${rowText}" → stop (footer)`);
        break;
      }

      // Assign each item to a column based on closest X match
      let itemNoStr = '';
      let unitCodeStr = '';
      let descParts: string[] = [];
      let unitStr = '';
      let qtyStr = '';

      // Build sorted column positions for nearest-match assignment
      const colEntries: { name: string; x: number }[] = [];
      if (colPositions.itemNo !== undefined) colEntries.push({ name: 'itemNo', x: colPositions.itemNo });
      if (colPositions.unitCode !== undefined) colEntries.push({ name: 'unitCode', x: colPositions.unitCode });
      if (colPositions.description !== undefined) colEntries.push({ name: 'description', x: colPositions.description });
      if (colPositions.unit !== undefined) colEntries.push({ name: 'unit', x: colPositions.unit });
      if (colPositions.quantity !== undefined) colEntries.push({ name: 'quantity', x: colPositions.quantity });

      for (const textItem of row.items) {
        // Find nearest column
        let bestCol = 'description'; // default
        let bestDist = Infinity;
        for (const col of colEntries) {
          const dist = Math.abs(textItem.x - col.x);
          if (dist < bestDist) {
            bestDist = dist;
            bestCol = col.name;
          }
        }

        switch (bestCol) {
          case 'itemNo': itemNoStr += textItem.str + ' '; break;
          case 'unitCode': unitCodeStr += textItem.str + ' '; break;
          case 'description': descParts.push(textItem.str); break;
          case 'unit': unitStr += textItem.str + ' '; break;
          case 'quantity': qtyStr += textItem.str + ' '; break;
        }
      }

      itemNoStr = itemNoStr.trim();
      unitCodeStr = unitCodeStr.trim();
      unitStr = unitStr.trim();
      qtyStr = qtyStr.trim().replace(/,/g, '');
      const description = descParts.join(' ').trim();

      // Item number must be a sequential integer
      const itemNum = parseInt(itemNoStr);
      if (isNaN(itemNum) || itemNum <= 0) {
        console.log(`[PayItems]   Row "${rowText}" → skipped (no valid item number)`);
        continue;
      }

      const unit = mapUnit(unitStr);
      const contractQuantity = parseFloat(qtyStr) || undefined;
      const color = PAY_ITEM_COLORS[(itemNum - 1) % PAY_ITEM_COLORS.length];

      console.log(`[PayItems]   #${itemNum}: code="${unitCodeStr}" desc="${description}" unit="${unitStr}"→${unit} qty=${contractQuantity}`);

      allPayItems.push({
        id: crypto.randomUUID(),
        itemCode: unitCodeStr,
        name: description || `Item ${itemNum}`,
        unit,
        unitPrice: 0,
        color,
        contractQuantity,
        drawable: isDrawableUnit(unit),
      });
    }
  }

  // Sort by item number (inferred from insertion order, but let's be safe)
  // Items were pushed in order per region, but regions are left-to-right
  // The left table has lower item numbers, so ordering should already be correct

  console.log(`[PayItems] Extracted ${allPayItems.length} pay items total`);

  if (allPayItems.length === 0) {
    throw new Error('No pay items found on this page. Make sure you are on the Estimate of Quantities page.');
  }

  return allPayItems;
}
