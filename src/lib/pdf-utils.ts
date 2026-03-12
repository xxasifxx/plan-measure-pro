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
 *
 * Algorithm:
 * 1. Find all "ITEM" header text items on the page
 * 2. Cluster them by X-proximity (side-by-side tables have ITEM headers far apart)
 * 3. For each cluster, find nearby column headers within that X region
 * 4. Split page into vertical regions at midpoints between clusters
 * 5. Parse each region's rows independently using its own column positions
 */
export async function extractPayItemsFromPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<PayItem[]> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();

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

  // Step 1: Find all "ITEM" headers (could also be "ITEM NO." etc)
  const itemNoHeaders = allItems.filter(t =>
    /^ITEM\s*(NO\.?|NUMBER)?$/i.test(t.str) || t.str === 'ITEM'
  );

  console.log(`[PayItems] Found ${itemNoHeaders.length} "ITEM" header(s) at X positions: ${itemNoHeaders.map(h => h.x.toFixed(0)).join(', ')}`);

  if (itemNoHeaders.length === 0) {
    throw new Error('Could not find "ITEM NO" header on this page. Navigate to the Estimate of Quantities page and try again.');
  }

  // Step 2: Cluster ITEM headers by X-proximity
  // Sort by X, then group headers that are close in X (< 100px) into one cluster
  const sortedHeaders = [...itemNoHeaders].sort((a, b) => a.x - b.x);
  const X_CLUSTER_GAP = 100; // headers within 100px X are the same table
  const headerGroups: TextItem[][] = [];
  let currentGroup: TextItem[] = [sortedHeaders[0]];

  for (let i = 1; i < sortedHeaders.length; i++) {
    if (sortedHeaders[i].x - sortedHeaders[i - 1].x < X_CLUSTER_GAP) {
      currentGroup.push(sortedHeaders[i]);
    } else {
      headerGroups.push(currentGroup);
      currentGroup = [sortedHeaders[i]];
    }
  }
  headerGroups.push(currentGroup);

  console.log(`[PayItems] ${headerGroups.length} table(s) detected by X-clustering`);

  // Step 3: For each header group, find column positions from nearby text
  // "Nearby" means within Y tolerance AND within the X-region of this table
  const Y_TOLERANCE = 15;

  // First, determine rough X boundaries for each table to scope header search
  // Use midpoints between groups
  const groupXCenters = headerGroups.map(g => g[0].x);
  const tableBounds: { xMin: number; xMax: number }[] = [];
  for (let i = 0; i < headerGroups.length; i++) {
    const xMin = i === 0 ? 0 : (groupXCenters[i - 1] + groupXCenters[i]) / 2;
    const xMax = i === headerGroups.length - 1 ? Infinity : (groupXCenters[i] + groupXCenters[i + 1]) / 2;
    tableBounds.push({ xMin, xMax });
  }

  // Now build full header clusters with column detection
  const headerClusters: HeaderCluster[] = [];

  for (let i = 0; i < headerGroups.length; i++) {
    const group = headerGroups[i];
    const bounds = tableBounds[i];
    const primaryHeader = group[0]; // the "ITEM" header
    const headerY = primaryHeader.y;

    // Find all text items in this X region that are on header rows
    // Header rows: within Y_TOLERANCE of the primary ITEM header, OR the row just below it
    // (headers can span 2-3 rows: "ITEM" / "NO." / "DESCRIPTION" etc.)
    const headerAreaItems = allItems.filter(t =>
      t.x >= bounds.xMin && t.x < bounds.xMax &&
      t.y >= headerY - Y_TOLERANCE && t.y <= headerY + Y_TOLERANCE * 4
    );

    // Find the lowest Y among header-like text (contains keywords)
    const headerKeywords = /ITEM|NO\.?|CODE|DESCRIPTION|UNIT|QUANTITY|QTY|CONTRACT|TOTAL|DIRECTED|PRICE|SHEET|WHERE/i;
    const headerRowItems = headerAreaItems.filter(t => headerKeywords.test(t.str));
    
    // Group header items into rows
    const headerRows = new Map<number, TextItem[]>();
    for (const item of headerRowItems) {
      const ry = Math.round(item.y / 5) * 5;
      if (!headerRows.has(ry)) headerRows.set(ry, []);
      headerRows.get(ry)!.push(item);
    }
    
    // The bottom of the header area = the maximum Y of any header row
    const headerBottomY = Math.max(...headerRowItems.map(t => t.y)) + Y_TOLERANCE;

    // Identify column positions — scan ALL header row items for column keywords
    const columns: HeaderCluster['columns'] = {};
    columns.itemNo = primaryHeader.x;

    // Collect all header items for column detection
    const allHeaderItems = headerAreaItems.filter(t =>
      t.y >= headerY - Y_TOLERANCE && t.y <= headerBottomY
    );

    // Find columns by keyword matching
    // We need to handle multi-row headers: "UNIT" on row 1, "CODE" on row 2 both at same X
    // Strategy: find X positions for key column identifiers
    
    // Find "CODE" or "UNIT CODE" items for the unit code column
    const codeItems = allHeaderItems.filter(t => /^CODE$/i.test(t.str) || /UNIT\s*CODE/i.test(t.str));
    // Find "DESCRIPTION" items
    const descItems = allHeaderItems.filter(t => /DESCRIPTION/i.test(t.str));
    // Find standalone "UNIT" items (not "UNIT CODE" or "UNIT PRICE")
    // Look for "UNIT" text that's NOT at the same X as a CODE item
    const unitItems = allHeaderItems.filter(t => /^UNIT$/i.test(t.str));
    // Find "QUANTITY" items — could be "CONTRACT QUANTITY" 
    const qtyItems = allHeaderItems.filter(t => /QUANTITY|QTY/i.test(t.str));

    // For items that appear on the same X as other keywords, disambiguate
    // Unit code: look for CODE
    if (codeItems.length > 0) {
      // Use the leftmost CODE item in this region
      const regionCodes = codeItems.filter(t => t.x >= bounds.xMin && t.x < bounds.xMax);
      if (regionCodes.length > 0) {
        columns.unitCode = Math.min(...regionCodes.map(t => t.x));
      }
    }

    if (descItems.length > 0) {
      const regionDesc = descItems.filter(t => t.x >= bounds.xMin && t.x < bounds.xMax);
      if (regionDesc.length > 0) {
        columns.description = Math.min(...regionDesc.map(t => t.x));
      }
    }

    // For "UNIT" column — find UNIT items that aren't near the unitCode X
    if (unitItems.length > 0) {
      const regionUnits = unitItems.filter(t => t.x >= bounds.xMin && t.x < bounds.xMax);
      for (const u of regionUnits) {
        if (!columns.unitCode || Math.abs(u.x - columns.unitCode) > 30) {
          columns.unit = u.x;
          break;
        }
      }
    }

    // For quantity — use the first QUANTITY/QTY item in this region
    // If there are multiple (CONTRACT QUANTITY, DIRECTED QUANTITY), pick the first by X
    if (qtyItems.length > 0) {
      const regionQty = qtyItems
        .filter(t => t.x >= bounds.xMin && t.x < bounds.xMax)
        .sort((a, b) => a.x - b.x);
      if (regionQty.length > 0) {
        columns.quantity = regionQty[0].x;
      }
    }

    console.log(`[PayItems] Table ${i + 1}: X bounds [${bounds.xMin.toFixed(0)}, ${bounds.xMax === Infinity ? '∞' : bounds.xMax.toFixed(0)}], headerBottomY=${headerBottomY.toFixed(0)}, columns:`, JSON.stringify(columns));

    headerClusters.push({
      items: allHeaderItems,
      minX: bounds.xMin,
      maxX: bounds.xMax,
      headerY: headerBottomY, // use the BOTTOM of headers so data starts after
      columns,
    });
  }

  // Step 4: Parse each table region independently
  const allPayItems: PayItem[] = [];

  // Stop patterns — footers, title blocks
  const stopPattern = /^(DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\.)$/i;
  const footerPattern = /DESIGNED|DRAWN|CHECKED|APPROVED|REVISIONS|SEAL|PROFESSIONAL|P\.E\./i;

  for (let ri = 0; ri < headerClusters.length; ri++) {
    const cluster = headerClusters[ri];
    const { minX: xMin, maxX: xMax, headerY: dataStartY, columns: colPositions } = cluster;

    // Filter text items in this region, below header rows
    const regionItems = allItems.filter(t =>
      t.x >= xMin && t.x < xMax && t.y > dataStartY
    );

    // Group into rows by Y coordinate
    const ROW_Y_TOLERANCE = 5;
    const yGroups = new Map<number, TextItem[]>();
    for (const item of regionItems) {
      const roundedY = Math.round(item.y / ROW_Y_TOLERANCE) * ROW_Y_TOLERANCE;
      if (!yGroups.has(roundedY)) yGroups.set(roundedY, []);
      yGroups.get(roundedY)!.push(item);
    }

    const rows = Array.from(yGroups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, items]) => ({
        y,
        items: items.sort((a, b) => a.x - b.x),
      }));

    console.log(`[PayItems] Table ${ri + 1}: ${rows.length} data rows`);

    // Build column entries for nearest-match
    const colEntries: { name: string; x: number }[] = [];
    if (colPositions.itemNo !== undefined) colEntries.push({ name: 'itemNo', x: colPositions.itemNo });
    if (colPositions.unitCode !== undefined) colEntries.push({ name: 'unitCode', x: colPositions.unitCode });
    if (colPositions.description !== undefined) colEntries.push({ name: 'description', x: colPositions.description });
    if (colPositions.unit !== undefined) colEntries.push({ name: 'unit', x: colPositions.unit });
    if (colPositions.quantity !== undefined) colEntries.push({ name: 'quantity', x: colPositions.quantity });

    let foundAnyItem = false;

    for (const row of rows) {
      const rowText = row.items.map(i => i.str).join(' ');

      // Only stop on footer patterns AFTER we've found at least one item
      if (foundAnyItem && footerPattern.test(rowText)) {
        console.log(`[PayItems]   Row "${rowText}" → stop (footer)`);
        break;
      }

      // Assign each text item to the nearest column
      let itemNoStr = '';
      let unitCodeStr = '';
      let descParts: string[] = [];
      let unitStr = '';
      let qtyStr = '';

      for (const textItem of row.items) {
        let bestCol = 'description';
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

      // Item number must be a positive integer
      const itemNum = parseInt(itemNoStr);
      if (isNaN(itemNum) || itemNum <= 0) {
        console.log(`[PayItems]   Row "${rowText}" → skipped (no valid item number: "${itemNoStr}")`);
        continue;
      }

      foundAnyItem = true;

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

  // Sort by parsed item number to ensure proper ordering
  allPayItems.sort((a, b) => {
    const numA = parseInt(a.name) || 0;
    const numB = parseInt(b.name) || 0;
    return numA - numB;
  });

  console.log(`[PayItems] Extracted ${allPayItems.length} pay items total`);

  if (allPayItems.length === 0) {
    throw new Error('No pay items found on this page. Make sure you are on the Estimate of Quantities page.');
  }

  return allPayItems;
}
