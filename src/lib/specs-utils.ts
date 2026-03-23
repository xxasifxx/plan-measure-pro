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
 *
 * Strategy: Look for "SECTION NNN" headings where the page's own subsection
 * markers (NNN.xx) are predominantly for THAT section — not cross-references
 * from another section's text.
 *
 * A page is the start of section NNN when:
 *   1. It contains "SECTION NNN" (case-insensitive), AND
 *   2. The subsection markers on the page (e.g. NNN.01, NNN.02) belong
 *      predominantly to section NNN (i.e. NNN is the dominant prefix), AND
 *   3. It's not a TOC page (detected by 5+ distinct section prefixes).
 */
export function buildSectionPageIndex(
  pageTexts: Map<number, string>
): Map<number, number> {
  const sectionToPage = new Map<number, number>();
  const sortedPages = Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0]);

  // Helper: get prefix counts for a page's subsection markers
  const getPagePrefixInfo = (text: string) => {
    const allSubMatches = text.match(/\b(\d{3})\.\d{2}\b/g) || [];
    const prefixCounts = new Map<string, number>();
    for (const m of allSubMatches) {
      const prefix = m.slice(0, 3);
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }
    let dominantPrefix = '';
    let dominantCount = 0;
    for (const [prefix, count] of prefixCounts) {
      if (count > dominantCount) {
        dominantPrefix = prefix;
        dominantCount = count;
      }
    }
    return { prefixCounts, dominantPrefix, dominantCount };
  };

  // --- Tier 1: Strict match (SECTION NNN + NNN.01 + dominant prefix) ---
  for (const [pageNum, text] of sortedPages) {
    const { prefixCounts, dominantPrefix, dominantCount } = getPagePrefixInfo(text);
    if (prefixCounts.size >= 5) continue; // skip TOC pages

    const sectionHeadingMatches = text.matchAll(/SECTION\s+(\d{3})\b/gi);
    for (const match of sectionHeadingMatches) {
      const numStr = match[1];
      const num = parseInt(numStr, 10);
      if (sectionToPage.has(num)) continue;

      const hasFirstSubsection = new RegExp(`\\b${numStr}\\.01\\b`).test(text);
      if (!hasFirstSubsection) continue;

      const isOwnerPage =
        prefixCounts.size === 0 ||
        dominantPrefix === numStr ||
        (prefixCounts.get(numStr) || 0) >= dominantCount;

      if (isOwnerPage) {
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 50) {
          sectionToPage.set(num, pageNum);
        }
      }
    }
  }

  // Standard top-level sections to ensure we find
  const standardSections = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const missingSections = standardSections.filter(s => !sectionToPage.has(s));

  // --- Tier 2: Relaxed (SECTION NNN + dominant prefix, no NNN.01 required) ---
  if (missingSections.length > 0) {
    const stillMissing = new Set(missingSections);
    for (const [pageNum, text] of sortedPages) {
      if (stillMissing.size === 0) break;
      const { prefixCounts, dominantPrefix, dominantCount } = getPagePrefixInfo(text);
      if (prefixCounts.size >= 5) continue;

      const sectionHeadingMatches = text.matchAll(/SECTION\s+(\d{3})\b/gi);
      for (const match of sectionHeadingMatches) {
        const numStr = match[1];
        const num = parseInt(numStr, 10);
        if (!stillMissing.has(num)) continue;
        if (sectionToPage.has(num)) continue;

        const isOwnerPage =
          prefixCounts.size === 0 ||
          dominantPrefix === numStr ||
          (prefixCounts.get(numStr) || 0) >= dominantCount;

        if (isOwnerPage) {
          const wordCount = text.split(/\s+/).length;
          if (wordCount > 50) {
            sectionToPage.set(num, pageNum);
            stillMissing.delete(num);
          }
        }
      }
    }
  }

  // --- Tier 3: Fallback (any page with SECTION NNN heading, not TOC, >50 words) ---
  const stillMissing3 = standardSections.filter(s => !sectionToPage.has(s));
  if (stillMissing3.length > 0) {
    const remaining = new Set(stillMissing3);
    for (const [pageNum, text] of sortedPages) {
      if (remaining.size === 0) break;
      const { prefixCounts } = getPagePrefixInfo(text);
      if (prefixCounts.size >= 5) continue;

      const wordCount = text.split(/\s+/).length;
      if (wordCount <= 50) continue;

      const sectionHeadingMatches = text.matchAll(/SECTION\s+(\d{3})\b/gi);
      for (const match of sectionHeadingMatches) {
        const num = parseInt(match[1], 10);
        if (!remaining.has(num)) continue;
        if (sectionToPage.has(num)) continue;

        sectionToPage.set(num, pageNum);
        remaining.delete(num);
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
