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

export interface SpecSection {
  /** Full text content of the entire section */
  fullContent: string;
  /** Extracted "Basis of Payment" / "Measurement and Payment" subsection text */
  basisOfPayment: string | null;
}

/**
 * Given the full text corpus and a 3-digit section number (e.g. 202),
 * find the real section content (not a TOC reference).
 *
 * Heuristic to distinguish real content from TOC entries:
 * - Real sections have subsection numbering like "202.01", "202.02", "202.03"
 *   followed by prose text (long strings, sentences).
 * - TOC entries have the same headings but followed by bare page numbers
 *   and very little prose.
 *
 * We look for a page where `XXX.01` appears AND the page has substantial
 * text content (>300 chars beyond headings), indicating real content.
 */
export function findSectionContent(
  pageTexts: Map<number, string>,
  sectionNumber: number
): SpecSection | null {
  const sectionStr = String(sectionNumber);
  // Pattern to find the first subsection (XXX.01) which marks the real section start
  const firstSubsectionPattern = new RegExp(`${sectionStr}\\.01\\b`);
  // Pattern to detect ANY other section's first subsection (e.g., "NNN.01" where NNN ≠ sectionStr)
  // We'll check dynamically in the loop instead of assuming +1
  // General pattern: any 3-digit section's .01 subsection (not ours)
  const anySectionFirstSub = /(\d{3})\.01\b/g;
  const sectionHeadingPattern = new RegExp(
    `SECTION\\s+${sectionStr}\\b`,
    'i'
  );

  const sortedPages = Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0]);

  let startPageIdx = -1;

  for (let i = 0; i < sortedPages.length; i++) {
    const [, text] = sortedPages[i];

    // Must have the first subsection marker (e.g., "202.01")
    if (!firstSubsectionPattern.test(text)) continue;

    // Distinguish real content from TOC:
    // Real content pages have substantial prose (long text, sentences).
    // TOC pages are mostly headings + bare page numbers.
    // Heuristic: count words on this page — real content has 100+ words
    // Also check for at least 2 subsection markers (XXX.01, XXX.02, etc.)
    const wordCount = text.split(/\s+/).length;
    const subsectionMatches = text.match(
      new RegExp(`${sectionStr}\\.\\d{2}`, 'g')
    );
    const subsectionCount = subsectionMatches ? subsectionMatches.length : 0;

    // Real section content: has multiple subsections AND substantial text
    // OR has the section heading nearby AND substantial text
    const hasSubstantialText = wordCount > 150;
    const hasMultipleSubsections = subsectionCount >= 2;
    const hasSectionHeading = sectionHeadingPattern.test(text);

    if (hasSubstantialText && (hasMultipleSubsections || hasSectionHeading)) {
      startPageIdx = i;
      break;
    }

    // If this page alone doesn't have enough, check if the section heading
    // is on the previous page and this page has the .01 subsection with content
    if (i > 0 && hasSubstantialText) {
      const [, prevText] = sortedPages[i - 1];
      if (sectionHeadingPattern.test(prevText)) {
        startPageIdx = i - 1;
        break;
      }
    }
  }

  if (startPageIdx === -1) return null;

  // Collect text from start page until we hit the next section's content
  const contentPages: string[] = [];

  for (let i = startPageIdx; i < sortedPages.length; i++) {
    const [, text] = sortedPages[i];

    // Stop if we've found the next section's real content
    if (i > startPageIdx && nextSectionFirstSub.test(text)) {
      // Verify it's real content for the next section (not a reference)
      const wordCount = text.split(/\s+/).length;
      if (wordCount > 150) break;
    }

    contentPages.push(text);

    // Safety: don't collect more than 80 pages for one section
    if (contentPages.length > 80) break;
  }

  const fullContent = contentPages.join('\n\n');

  // Extract Basis of Payment / Measurement and Payment subsection
  const fullUpper = fullContent.toUpperCase();
  let basisOfPayment: string | null = null;

  // Try "BASIS OF PAYMENT" first (some sections split measurement and payment)
  const bopIndex = fullUpper.lastIndexOf('BASIS OF PAYMENT');
  if (bopIndex !== -1) {
    basisOfPayment = fullContent.slice(bopIndex);
  } else {
    // Try "MEASUREMENT AND PAYMENT" (some sections combine them)
    const mapIndex = fullUpper.lastIndexOf('MEASUREMENT AND PAYMENT');
    if (mapIndex !== -1) {
      basisOfPayment = fullContent.slice(mapIndex);
    }
  }

  return { fullContent, basisOfPayment };
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

/**
 * Search the Basis of Payment / Measurement and Payment text for paragraphs
 * referencing the specific item code. Returns matching text or null.
 */
export function findItemCodePayRequirements(
  basisOfPayment: string,
  itemCode: string
): string | null {
  if (!basisOfPayment || !itemCode) return null;

  // Normalize the item code for matching (e.g., "202-0002")
  const escapedCode = itemCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(escapedCode, 'i');

  // Split into sentences/paragraphs and find those mentioning the item code
  // Use double-space or period-space as rough sentence boundaries
  const lines = basisOfPayment.split(/(?:\n\n+|(?<=\.)\s{2,})/);
  const matchingIndices = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      // Include 1 line before and 2 after for context
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) {
        matchingIndices.add(j);
      }
    }
  }

  if (matchingIndices.size === 0) return null;

  return Array.from(matchingIndices)
    .sort((a, b) => a - b)
    .map((i) => lines[i].trim())
    .filter(Boolean)
    .join('\n\n');
}
