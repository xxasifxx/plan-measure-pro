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

    if (end < total) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return pageTexts;
}

/**
 * Build a map of 3-digit section number → PDF page number (1-indexed).
 * Looks for "SECTION NNN" headings or "NNN.01" first-subsection markers
 * on pages with substantial content (not TOC).
 */
export function buildSectionPageIndex(
  pageTexts: Map<number, string>
): Map<number, number> {
  const sectionToPage = new Map<number, number>();
  const sortedPages = Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0]);

  for (const [pageNum, text] of sortedPages) {
    // Skip TOC pages: if 3+ distinct section subsection markers appear, it's a TOC
    const allSubMatches = text.match(/(\d{3})\.\d{2}\b/g) || [];
    const distinctSections = new Set(allSubMatches.map((m) => m.slice(0, 3)));
    if (distinctSections.size >= 3) continue;

    // Look for "SECTION NNN" heading
    const sectionHeadingMatches = text.matchAll(/SECTION\s+(\d{3})\b/gi);
    for (const match of sectionHeadingMatches) {
      const num = parseInt(match[1], 10);
      if (!sectionToPage.has(num)) {
        // Verify it's real content (>150 words)
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 100) {
          sectionToPage.set(num, pageNum);
        }
      }
    }

    // Also check for NNN.01 pattern as section start
    const firstSubMatches = text.matchAll(/(\d{3})\.01\b/g);
    for (const match of firstSubMatches) {
      const num = parseInt(match[1], 10);
      if (!sectionToPage.has(num)) {
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 100) {
          sectionToPage.set(num, pageNum);
        }
      }
    }
  }

  return sectionToPage;
}

/**
 * Extract the 3-digit section number from an item code.
 * e.g. "202-0002" → 202, "510-N0059" → 510
 */
export function getSectionFromItemCode(itemCode: string): number | null {
  const match = itemCode.match(/^(\d{3})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}
