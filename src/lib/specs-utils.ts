import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Extract text from all pages of a PDF in batches to avoid blocking the UI.
 * Returns a Map of page number → text content.
 */
export async function extractAllText(
  pdf: PDFDocumentProxy,
  onProgress?: (done: number, total: number) => void
): Promise<Map<number, string>> {
  const pageTexts = new Map<number, string>();
  const total = pdf.numPages;
  const BATCH_SIZE = 10;

  for (let start = 1; start <= total; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, total);
    const promises: Promise<void>[] = [];

    for (let p = start; p <= end; p++) {
      promises.push(
        pdf.getPage(p).then(async (page) => {
          const content = await page.getTextContent();
          const text = content.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str)
            .join(' ');
          pageTexts.set(p, text);
        })
      );
    }

    await Promise.all(promises);
    onProgress?.(Math.min(end, total), total);

    // Yield to UI thread between batches
    if (end < total) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return pageTexts;
}

const SUBSECTION_KEYWORDS = [
  'DESCRIPTION',
  'MATERIALS',
  'CONSTRUCTION REQUIREMENTS',
  'METHOD OF MEASUREMENT',
  'BASIS OF PAYMENT',
];

export interface SpecSection {
  /** Full text content of the entire section */
  fullContent: string;
  /** Extracted "Basis of Payment" subsection text */
  basisOfPayment: string | null;
}

/**
 * Given the full text corpus and a section number (e.g. 202),
 * find the real section content (not a TOC reference).
 *
 * Heuristic: A "real" section heading is on a page where at least
 * 2 of the 5 standard subsection keywords appear within the same
 * page or the next few pages. TOC entries only list section titles briefly.
 */
export function findSectionContent(
  pageTexts: Map<number, string>,
  sectionNumber: number
): SpecSection | null {
  const sectionStr = String(sectionNumber);
  // Pattern: "SECTION 202" or "Section 202" or just "202 " at a boundary
  const sectionPattern = new RegExp(
    `(?:SECTION\\s+${sectionStr}|^\\s*${sectionStr}\\s)`,
    'im'
  );

  const sortedPages = Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0]);

  let startPageIdx = -1;

  for (let i = 0; i < sortedPages.length; i++) {
    const [, text] = sortedPages[i];
    if (!sectionPattern.test(text)) continue;

    // Check if this is a real section (not TOC) by looking for subsection keywords
    // in this page and the next few pages
    const windowText = sortedPages
      .slice(i, i + 5)
      .map(([, t]) => t)
      .join(' ')
      .toUpperCase();

    const matchedKeywords = SUBSECTION_KEYWORDS.filter((kw) =>
      windowText.includes(kw)
    );

    if (matchedKeywords.length >= 2) {
      startPageIdx = i;
      break;
    }
  }

  if (startPageIdx === -1) return null;

  // Now collect text from this page until we hit the next section heading
  const nextSectionNum = sectionNumber + 1;
  const nextPattern = new RegExp(
    `(?:SECTION\\s+${nextSectionNum}|^\\s*${nextSectionNum}\\s)`,
    'im'
  );

  const contentPages: string[] = [];

  for (let i = startPageIdx; i < sortedPages.length; i++) {
    const [, text] = sortedPages[i];

    // If we're past the first page and hit the next section, stop
    if (i > startPageIdx && nextPattern.test(text)) {
      // Check this isn't just a reference — same heuristic
      const windowText = sortedPages
        .slice(i, i + 5)
        .map(([, t]) => t)
        .join(' ')
        .toUpperCase();
      const matchedKeywords = SUBSECTION_KEYWORDS.filter((kw) =>
        windowText.includes(kw)
      );
      if (matchedKeywords.length >= 2) break;
    }

    contentPages.push(text);

    // Safety: don't collect more than 60 pages for one section
    if (contentPages.length > 60) break;
  }

  const fullContent = contentPages.join('\n\n');

  // Extract Basis of Payment subsection
  const bopIndex = fullContent.toUpperCase().lastIndexOf('BASIS OF PAYMENT');
  let basisOfPayment: string | null = null;
  if (bopIndex !== -1) {
    basisOfPayment = fullContent.slice(bopIndex);
  }

  return { fullContent, basisOfPayment };
}

/**
 * Extract the section number from an item code.
 * e.g. "202-0002" → 202, "510-N0059" → 510
 */
export function getSectionFromItemCode(itemCode: string): number | null {
  const match = itemCode.match(/^(\d{3})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Search the Basis of Payment text for paragraphs referencing the specific item code.
 * Returns the matching paragraph(s) or null.
 */
export function findItemCodePayRequirements(
  basisOfPayment: string,
  itemCode: string
): string | null {
  if (!basisOfPayment || !itemCode) return null;

  // Normalize the item code for matching (e.g., "202-0002")
  const escapedCode = itemCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(`[^\\n]*${escapedCode}[^\\n]*`, 'gi');

  const matches = basisOfPayment.match(pattern);
  if (!matches || matches.length === 0) return null;

  // Return matching lines plus surrounding context
  const lines = basisOfPayment.split(/\n/);
  const resultLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(escapedCode, 'i').test(lines[i])) {
      // Include 2 lines before and 3 after for context
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 3); j++) {
        resultLines.add(j);
      }
    }
  }

  if (resultLines.size === 0) return null;

  return Array.from(resultLines)
    .sort((a, b) => a - b)
    .map((i) => lines[i])
    .join('\n');
}
