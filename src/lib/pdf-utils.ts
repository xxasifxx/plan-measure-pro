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

export async function loadPdfFromUrl(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const pdf = await pdfjsLib.getDocument({ url }).promise;
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

const SECTION_COLORS: Record<number, string[]> = {
  100: ['#e74c3c', '#c0392b', '#ff6b6b', '#d63031', '#e17055'],
  200: ['#f39c12', '#e67e22', '#fdcb6e', '#f0932b', '#ffa502'],
  300: ['#3498db', '#2980b9', '#74b9ff', '#0984e3', '#00cec9'],
  400: ['#2ecc71', '#27ae60', '#55efc4', '#00b894', '#badc58'],
  500: ['#9b59b6', '#8e44ad', '#a29bfe', '#6c5ce7', '#e056fd'],
  600: ['#1abc9c', '#16a085', '#00d2d3', '#01a3a4', '#48dbfb'],
  700: ['#e91e63', '#c2185b', '#f48fb1', '#ff4081', '#ff1744'],
  800: ['#607d8b', '#455a64', '#90a4ae', '#78909c', '#546e7a'],
  900: ['#795548', '#5d4037', '#a1887f', '#8d6e63', '#6d4c41'],
};

const DEFAULT_COLORS = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'];

function getColorForItem(itemCode: string, indexInSection: number): string {
  const match = itemCode.match(/^(\d)/);
  const section = match ? parseInt(match[1]) * 100 : 0;
  const palette = SECTION_COLORS[section] || DEFAULT_COLORS;
  return palette[indexInSection % palette.length];
}

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
  const sortedHeaders = [...itemNoHeaders].sort((a, b) => a.x - b.x);
  const X_CLUSTER_GAP = 100;
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

  const Y_TOLERANCE = 15;

  // Step 3: For each ITEM header group, find ALL header keywords on the same Y band
  // across the FULL page, then assign each keyword to the nearest ITEM header group.
  // This correctly associates UNIT/QUANTITY columns with their table even when
  // they're far to the right of the ITEM header.

  const primaryHeaders = headerGroups.map(g => g[0]); // one per table
  const headerY = primaryHeaders[0].y; // all ITEM headers share similar Y

  // Gather all header-keyword items within the header Y band (multi-row headers)
  const headerKeywords = /ITEM|NO\.?|CODE|DESCRIPTION|UNIT|QUANTITY|QTY|CONTRACT|DIRECTED|PRICE|SHEET|WHERE/i;
  const allHeaderArea = allItems.filter(t =>
    t.y >= headerY - Y_TOLERANCE && t.y <= headerY + Y_TOLERANCE * 4 &&
    headerKeywords.test(t.str)
  );

  const headerBottomY = Math.max(...allHeaderArea.map(t => t.y)) + Y_TOLERANCE;

  // Assign each header item to the nearest ITEM header by X
  const assignedHeaders: Map<number, TextItem[]> = new Map();
  for (let i = 0; i < primaryHeaders.length; i++) {
    assignedHeaders.set(i, []);
  }

  for (const h of allHeaderArea) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < primaryHeaders.length; i++) {
      // Distance: use the ITEM header X as reference. Headers should be to the right of their ITEM.
      // Prefer the table whose ITEM header is closest-left of this header item.
      const dist = h.x - primaryHeaders[i].x;
      // Allow slightly left (negative) but prefer right (positive)
      const absDist = dist < -20 ? Infinity : Math.abs(dist);
      if (absDist < bestDist) {
        bestDist = absDist;
        bestIdx = i;
      }
    }
    assignedHeaders.get(bestIdx)!.push(h);
  }

  // Step 4: Build column positions and table boundaries from assigned headers
  const headerClusters: HeaderCluster[] = [];

  for (let i = 0; i < primaryHeaders.length; i++) {
    const primary = primaryHeaders[i];
    const headers = assignedHeaders.get(i)!;

    const columns: HeaderCluster['columns'] = {};
    columns.itemNo = primary.x;

    // Find column positions from assigned header keywords
    const codeItems = headers.filter(t => /^CODE$/i.test(t.str) || /UNIT\s*CODE/i.test(t.str));
    const descItems = headers.filter(t => /DESCRIPTION/i.test(t.str));
    const unitItems = headers.filter(t => /^UNIT$/i.test(t.str));
    const qtyItems = headers.filter(t => /QUANTITY|QTY/i.test(t.str));

    if (codeItems.length > 0) {
      columns.unitCode = Math.min(...codeItems.map(t => t.x));
    }
    if (descItems.length > 0) {
      columns.description = Math.min(...descItems.map(t => t.x));
    }
    // "UNIT" column — must not be at the same X as unitCode
    for (const u of unitItems.sort((a, b) => a.x - b.x)) {
      if (!columns.unitCode || Math.abs(u.x - columns.unitCode) > 30) {
        columns.unit = u.x;
        break;
      }
    }
    if (qtyItems.length > 0) {
      // Pick the first (leftmost) QUANTITY — that's CONTRACT QUANTITY
      const sorted = qtyItems.sort((a, b) => a.x - b.x);
      columns.quantity = sorted[0].x;
    }

    // Table X extent: from ITEM header X to the rightmost assigned header
    const tableMinX = primary.x;
    const tableMaxX = Math.max(...headers.map(t => t.x + t.width));

    // Compute region boundaries: midpoint between this table's max and next table's min
    const xMin = i === 0 ? 0 : (() => {
      const prevMax = Math.max(...assignedHeaders.get(i - 1)!.map(t => t.x + t.width));
      return (prevMax + tableMinX) / 2;
    })();
    const xMax = i === primaryHeaders.length - 1 ? Infinity : (() => {
      const nextMin = primaryHeaders[i + 1].x;
      return (tableMaxX + nextMin) / 2;
    })();

    console.log(`[PayItems] Table ${i + 1}: X bounds [${xMin.toFixed(0)}, ${xMax === Infinity ? '∞' : xMax.toFixed(0)}], columns:`, JSON.stringify(columns));

    headerClusters.push({
      items: headers,
      minX: xMin,
      maxX: xMax,
      headerY: headerBottomY,
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

    // Build column boundaries using midpoints between sorted column headers
    const colEntries: { name: string; x: number }[] = [];
    if (colPositions.itemNo !== undefined) colEntries.push({ name: 'itemNo', x: colPositions.itemNo });
    if (colPositions.unitCode !== undefined) colEntries.push({ name: 'unitCode', x: colPositions.unitCode });
    if (colPositions.description !== undefined) colEntries.push({ name: 'description', x: colPositions.description });
    if (colPositions.unit !== undefined) colEntries.push({ name: 'unit', x: colPositions.unit });
    if (colPositions.quantity !== undefined) colEntries.push({ name: 'quantity', x: colPositions.quantity });

    // Sort columns left-to-right and compute boundary midpoints
    colEntries.sort((a, b) => a.x - b.x);
    const colBounds: { name: string; minX: number; maxX: number }[] = colEntries.map((col, i) => {
      const prevX = i > 0 ? colEntries[i - 1].x : -Infinity;
      const nextX = i < colEntries.length - 1 ? colEntries[i + 1].x : Infinity;
      return {
        name: col.name,
        minX: (prevX + col.x) / 2,
        maxX: (col.x + nextX) / 2,
      };
    });

    let foundAnyItem = false;

    for (const row of rows) {
      const rowText = row.items.map(i => i.str).join(' ');

      // Only stop on footer patterns AFTER we've found at least one item
      if (foundAnyItem && footerPattern.test(rowText)) {
        console.log(`[PayItems]   Row "${rowText}" → stop (footer)`);
        break;
      }

      // Assign each text item to column by boundary range
      let itemNoStr = '';
      let unitCodeStr = '';
      let descParts: string[] = [];
      let unitStr = '';
      let qtyStr = '';

      for (const textItem of row.items) {
        let assignedCol = 'description'; // fallback
        for (const bound of colBounds) {
          if (textItem.x >= bound.minX && textItem.x < bound.maxX) {
            assignedCol = bound.name;
            break;
          }
        }

        switch (assignedCol) {
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

      let parsedItemCode = unitCodeStr;
      let description = descParts.join(' ').trim();

      // PDF.js may merge UNIT CODE + DESCRIPTION into one text item in the unitCode column.
      // Example: "104-0001 CONSTRUCTION LAYOUT"
      const codeWithDescMatch = unitCodeStr.match(/^([0-9]{3}-[A-Z0-9]+)\s+(.+)$/i);
      if (codeWithDescMatch) {
        parsedItemCode = codeWithDescMatch[1].trim();
        const overflowDesc = codeWithDescMatch[2].trim();
        if (overflowDesc) {
          const sameText = description && description.toUpperCase() === overflowDesc.toUpperCase();
          description = sameText ? description : (description ? `${overflowDesc} ${description}` : overflowDesc);
        }
      }

      // Item number must be a positive integer
      const itemNum = parseInt(itemNoStr);
      if (isNaN(itemNum) || itemNum <= 0) {
        console.log(`[PayItems]   Row "${rowText}" → skipped (no valid item number: "${itemNoStr}")`);
        continue;
      }

      foundAnyItem = true;

      const unit = mapUnit(unitStr);
      const contractQuantity = parseFloat(qtyStr) || undefined;

      console.log(`[PayItems]   #${itemNum}: code="${parsedItemCode}" desc="${description}" unit="${unitStr}"→${unit} qty=${contractQuantity}`);

      allPayItems.push({
        id: crypto.randomUUID(),
        itemNumber: itemNum,
        itemCode: parsedItemCode,
        name: description || `Item ${itemNum}`,
        unit,
        unitPrice: 0,
        color: '', // assigned after grouping by section
        contractQuantity,
        drawable: isDrawableUnit(unit),
      });
    }
  }

  // Sort by item number
  allPayItems.sort((a, b) => a.itemNumber - b.itemNumber);

  // Assign colors by section (items in same section get distinct colors)
  const sectionCounters: Record<string, number> = {};
  for (const item of allPayItems) {
    const sectionKey = item.itemCode.match(/^(\d)/)?.[1] || '0';
    const idx = sectionCounters[sectionKey] || 0;
    item.color = getColorForItem(item.itemCode, idx);
    sectionCounters[sectionKey] = idx + 1;
  }

  console.log(`[PayItems] Extracted ${allPayItems.length} pay items total`);

  if (allPayItems.length === 0) {
    throw new Error('No pay items found on this page. Make sure you are on the Estimate of Quantities page.');
  }

  return allPayItems;
}
