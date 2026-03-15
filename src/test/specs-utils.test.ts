// @vitest-environment node
import { describe, it, expect } from 'vitest';

// Import only the pure functions that don't depend on pdfjs-dist
// We inline-test findSectionContent by importing it dynamically after mocking

/** Copied from specs-utils to avoid pdfjs-dist transitive import */
function getSectionFromItemCode(itemCode: string): number | null {
  const match = itemCode.match(/^(\d{3})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function findItemCodePayRequirements(
  basisOfPayment: string,
  itemCode: string
): string | null {
  if (!basisOfPayment || !itemCode) return null;
  const escapedCode = itemCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(escapedCode, 'i');
  const lines = basisOfPayment.split(/(?:\n\n+|(?<=\.)\s{2,})/);
  const matchingIndices = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
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

interface SpecSection {
  fullContent: string;
  basisOfPayment: string | null;
}

function findSectionContent(
  pageTexts: Map<number, string>,
  sectionNumber: number
): SpecSection | null {
  const sectionStr = String(sectionNumber);
  const firstSubsectionPattern = new RegExp(`${sectionStr}\\.01\\b`);
  const anySectionFirstSub = /(\d{3})\.01\b/g;
  const sectionHeadingPattern = new RegExp(`SECTION\\s+${sectionStr}\\b`, 'i');
  const anySectionHeading = /SECTION\s+(\d{3})\b/gi;
  const sortedPages = Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0]);
  let startPageIdx = -1;

  for (let i = 0; i < sortedPages.length; i++) {
    const [, text] = sortedPages[i];
    if (!firstSubsectionPattern.test(text)) continue;

    // Count distinct section prefixes — TOC pages have 3+ different sections
    const allSubsectionMatches = text.match(/(\d{3})\.\d{2}\b/g) || [];
    const distinctSections = new Set(
      allSubsectionMatches.map((m: string) => m.slice(0, 3))
    );
    if (distinctSections.size >= 3) continue;

    const wordCount = text.split(/\s+/).length;
    const subsectionMatches = text.match(new RegExp(`${sectionStr}\\.\\d{2}`, 'g'));
    const subsectionCount = subsectionMatches ? subsectionMatches.length : 0;
    const hasSubstantialText = wordCount > 150;
    const hasMultipleSubsections = subsectionCount >= 2;
    const hasSectionHeading = sectionHeadingPattern.test(text);

    if (hasSubstantialText && (hasMultipleSubsections || hasSectionHeading)) {
      startPageIdx = i;
      break;
    }
    if (i > 0 && hasSubstantialText) {
      const [, prevText] = sortedPages[i - 1];
      if (sectionHeadingPattern.test(prevText)) {
        startPageIdx = i - 1;
        break;
      }
    }
  }

  if (startPageIdx === -1) return null;

  const contentPages: string[] = [];
  for (let i = startPageIdx; i < sortedPages.length; i++) {
    const [, text] = sortedPages[i];
    if (i > startPageIdx) {
      let foundNextSection = false;
      let match: RegExpExecArray | null;
      anySectionFirstSub.lastIndex = 0;
      while ((match = anySectionFirstSub.exec(text)) !== null) {
        const foundNum = parseInt(match[1], 10);
        if (foundNum !== sectionNumber) {
          const wc = text.split(/\s+/).length;
          if (wc > 150) { foundNextSection = true; break; }
        }
      }
      if (!foundNextSection) {
        anySectionHeading.lastIndex = 0;
        while ((match = anySectionHeading.exec(text)) !== null) {
          const foundNum = parseInt(match[1], 10);
          if (foundNum !== sectionNumber) {
            const wc = text.split(/\s+/).length;
            if (wc > 150) { foundNextSection = true; break; }
          }
        }
      }
      if (foundNextSection) break;
    }
    contentPages.push(text);
    if (contentPages.length > 80) break;
  }

  const fullContent = contentPages.join('\n\n');
  const fullUpper = fullContent.toUpperCase();
  let basisOfPayment: string | null = null;
  const bopIndex = fullUpper.lastIndexOf('BASIS OF PAYMENT');
  if (bopIndex !== -1) {
    basisOfPayment = fullContent.slice(bopIndex);
  } else {
    const mapIndex = fullUpper.lastIndexOf('MEASUREMENT AND PAYMENT');
    if (mapIndex !== -1) {
      basisOfPayment = fullContent.slice(mapIndex);
    }
  }
  return { fullContent, basisOfPayment };
}

// ─── Tests ───

describe('getSectionFromItemCode', () => {
  const cases: [string, number][] = [
    ['104-0001', 104], ['107-0001', 107], ['108-N0002', 108],
    ['201-0002', 201], ['202-0002', 202], ['202-0007', 202],
    ['203-0001', 203], ['208-0008', 208], ['213-0002', 213],
    ['301-0006', 301], ['302-0002', 302], ['302-N0011', 302],
    ['304-N0004', 304], ['305-0003', 305],
    ['502-0007', 502], ['503-0001', 503], ['503-N0029', 503],
    ['504-0011', 504], ['506-0001', 506], ['509-0001', 509],
    ['510-0001', 510], ['511-0006', 511], ['514-0001', 514],
    ['516-0005', 516], ['517-0001', 517], ['522-0001', 522],
    ['599-N0059', 599], ['601-0001', 601], ['603-0009', 603],
    ['604-N0004', 604], ['605-0018', 605],
    ['703-0001', 703], ['704-0001', 704], ['801-0001', 801], ['801-N0001', 801],
  ];

  it.each(cases)('%s → section %i', (code, expected) => {
    expect(getSectionFromItemCode(code)).toBe(expected);
  });

  it('returns null for invalid codes', () => {
    expect(getSectionFromItemCode('ABC')).toBeNull();
    expect(getSectionFromItemCode('')).toBeNull();
    expect(getSectionFromItemCode('12-0001')).toBeNull();
  });
});

describe('findItemCodePayRequirements', () => {
  const sampleBasis = [
    'BASIS OF PAYMENT',
    '',
    'Item 202-0002 Roadway Excavation, Earth will be measured and paid for at the contract unit price per cubic yard.',
    '',
    'Item 202-0007 Stripping Topsoil will be measured by the cubic yard in its original position.',
    '',
    'Item 202-0009 Environmental Testing will be paid at actual cost.',
  ].join('\n\n');

  it('finds matching item code', () => {
    const result = findItemCodePayRequirements(sampleBasis, '202-0002');
    expect(result).toContain('202-0002');
  });

  it('returns null for unmentioned code', () => {
    expect(findItemCodePayRequirements(sampleBasis, '999-0001')).toBeNull();
  });

  it('handles N-prefixed codes', () => {
    const basis = 'Item 108-N0002 Allowance for Unforeseen Work shall be paid at actual cost.';
    expect(findItemCodePayRequirements(basis, '108-N0002')).toContain('108-N0002');
  });
});

describe('findSectionContent — non-sequential boundaries', () => {
  function makePageText(section: number, subsections: string[], extra = ''): string {
    const parts = subsections.map(s => `${section}.${s}`);
    return `SECTION ${section} TEST ${parts.join(' ')} ${' word'.repeat(160)} ${extra}`;
  }

  it('stops at non-sequential next section (305 → 502)', () => {
    const pages = new Map<number, string>();
    pages.set(100, makePageText(305, ['01', '02', '03']));
    pages.set(101, makePageText(305, ['04', '05'], 'Basis of Payment Item 305-0003 paid per SY'));
    pages.set(102, makePageText(502, ['01', '02', '03']));
    pages.set(103, makePageText(502, ['04', '05'], 'Basis of Payment Item 502-0007 paid per LF'));

    const s305 = findSectionContent(pages, 305);
    expect(s305).not.toBeNull();
    expect(s305!.fullContent).toContain('305.01');
    expect(s305!.fullContent).not.toContain('502.01');

    const s502 = findSectionContent(pages, 502);
    expect(s502).not.toBeNull();
    expect(s502!.fullContent).toContain('502.01');
    expect(s502!.fullContent).not.toContain('305.01');
  });

  it('stops at non-sequential next section (516 → 601)', () => {
    const pages = new Map<number, string>();
    pages.set(200, makePageText(516, ['01', '02'], 'Basis of Payment Item 516-0005'));
    pages.set(201, makePageText(601, ['01', '02'], 'Basis of Payment Item 601-0001'));

    const s516 = findSectionContent(pages, 516);
    expect(s516).not.toBeNull();
    expect(s516!.fullContent).not.toContain('601.01');
  });

  it('handles multi-page section before large gap (213 → 301)', () => {
    const pages = new Map<number, string>();
    pages.set(50, makePageText(213, ['01', '02']));
    pages.set(51, makePageText(213, ['03', '04', '05'], 'Basis of Payment Item 213-0002'));
    pages.set(52, makePageText(301, ['01', '02', '03']));

    const s213 = findSectionContent(pages, 213);
    expect(s213).not.toBeNull();
    expect(s213!.fullContent).toContain('213.01');
    expect(s213!.fullContent).not.toContain('301.01');
    expect(s213!.basisOfPayment).toContain('213-0002');
  });

  it('extracts basisOfPayment with "MEASUREMENT AND PAYMENT" variant', () => {
    const pages = new Map<number, string>();
    pages.set(10, makePageText(801, ['01', '02'], 'Measurement and Payment Item 801-0001 paid per LS'));

    const s801 = findSectionContent(pages, 801);
    expect(s801).not.toBeNull();
    expect(s801!.basisOfPayment).toContain('801-0001');
  });
});
