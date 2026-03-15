import { describe, it, expect } from 'vitest';
import { getSectionFromItemCode, findItemCodePayRequirements } from '@/lib/specs-utils';

describe('getSectionFromItemCode', () => {
  const cases: [string, number][] = [
    ['104-0001', 104],
    ['107-0001', 107],
    ['108-0001', 108],
    ['108-N0002', 108],
    ['201-0002', 201],
    ['202-0002', 202],
    ['202-0007', 202],
    ['202-0009', 202],
    ['203-0001', 203],
    ['203-0002', 203],
    ['208-0008', 208],
    ['208-0022', 208],
    ['208-0024', 208],
    ['208-N0001', 208],
    ['211-0001', 211],
    ['213-0002', 213],
    ['301-0006', 301],
    ['301-N0002', 301],
    ['302-0002', 302],
    ['302-0004', 302],
    ['302-N0007', 302],
    ['302-N0011', 302],
    ['304-N0004', 304],
    ['305-0003', 305],
    ['502-0007', 502],
    ['502-0251', 502],
    ['503-0001', 503],
    ['503-0011', 503],
    ['503-0252', 503],
    ['503-0253', 503],
    ['503-0294', 503],
    ['503-N0003', 503],
    ['503-N0029', 503],
    ['503-N0045', 503],
    ['504-0011', 504],
    ['506-0001', 506],
    ['506-0002', 506],
    ['509-0001', 509],
    ['509-0002', 509],
    ['509-0004', 509],
    ['509-0008', 509],
    ['510-0001', 510],
    ['510-0008', 510],
    ['510-0011', 510],
    ['510-0018', 510],
    ['510-0031', 510],
    ['511-0006', 511],
    ['514-0001', 514],
    ['516-0005', 516],
    ['516-0009', 516],
    ['516-0013', 516],
    ['517-0001', 517],
    ['517-0007', 517],
    ['517-0013', 517],
    ['522-0001', 522],
    ['599-N0059', 599],
    ['601-0001', 601],
    ['601-0003', 601],
    ['601-0006', 601],
    ['603-0009', 603],
    ['603-0010', 603],
    ['604-N0004', 604],
    ['604-N0007', 604],
    ['605-0018', 605],
    ['703-0001', 703],
    ['704-0001', 704],
    ['801-0001', 801],
    ['801-0002', 801],
    ['801-0009', 801],
    ['801-N0001', 801],
  ];

  it.each(cases)('extracts section %s → %i', (code, expected) => {
    expect(getSectionFromItemCode(code)).toBe(expected);
  });

  it('returns null for invalid codes', () => {
    expect(getSectionFromItemCode('ABC')).toBeNull();
    expect(getSectionFromItemCode('')).toBeNull();
    expect(getSectionFromItemCode('12-0001')).toBeNull();
  });
});

describe('findItemCodePayRequirements', () => {
  const sampleBasis = `
BASIS OF PAYMENT

Item 202-0002 Roadway Excavation, Earth will be measured and paid for at the contract unit price per cubic yard.

Item 202-0007 Stripping Topsoil will be measured by the cubic yard in its original position.

Item 202-0009 Environmental Testing will be paid at actual cost.
  `.trim();

  it('finds matching item code paragraphs', () => {
    const result = findItemCodePayRequirements(sampleBasis, '202-0002');
    expect(result).not.toBeNull();
    expect(result).toContain('202-0002');
    expect(result).toContain('Roadway Excavation');
  });

  it('returns null for unmentioned item code', () => {
    const result = findItemCodePayRequirements(sampleBasis, '999-0001');
    expect(result).toBeNull();
  });

  it('handles N-prefixed codes', () => {
    const basis = 'Item 108-N0002 Allowance for Unforeseen Work shall be paid at actual cost.';
    const result = findItemCodePayRequirements(basis, '108-N0002');
    expect(result).not.toBeNull();
    expect(result).toContain('108-N0002');
  });
});

describe('findSectionContent boundary detection', () => {
  // This test validates the heuristic logic with synthetic page data
  // simulating non-sequential section jumps (e.g., 305 → 502)
  it('correctly identifies section boundaries across gaps', async () => {
    const { findSectionContent } = await import('@/lib/specs-utils');

    // Build a synthetic page map: Section 305 on pages 100-102, Section 502 on pages 103-105
    const pageTexts = new Map<number, string>();

    // Section 305 content (pages 100-102)
    pageTexts.set(100, `SECTION 305 PAVEMENT REMOVAL 305.01 Description This section covers the removal of existing pavement. The contractor shall remove pavement as shown on the plans. All removed material shall be disposed of properly. ${' word '.repeat(50)} 305.02 Materials No specific materials required for this operation beyond standard equipment.`);
    pageTexts.set(101, `305.03 Construction The contractor shall saw cut along designated lines before removal. Equipment shall be appropriate for the depth specified. ${' word '.repeat(50)} 305.04 Method of Measurement Pavement removal will be measured by the square yard of surface area removed.`);
    pageTexts.set(102, `305.05 Basis of Payment Item 305-0003 Pavement Removal will be paid for at the contract unit price per square yard. Payment shall include sawcutting, removal, loading, hauling, and disposal. ${' word '.repeat(30)}`);

    // Section 502 content (pages 103-105) — non-sequential jump
    pageTexts.set(103, `SECTION 502 STORM DRAIN PIPE 502.01 Description This section covers the furnishing and installation of storm drain pipe. The contractor shall install pipe as shown on the plans. All joints shall be watertight. ${' word '.repeat(50)} 502.02 Materials Pipe shall conform to AASHTO standards and be of the type and size specified.`);
    pageTexts.set(104, `502.03 Construction Trenches shall be excavated to the depth and width shown. Bedding material shall be placed and compacted. ${' word '.repeat(50)} 502.04 Method of Measurement Pipe will be measured by the linear foot along the centerline.`);
    pageTexts.set(105, `502.05 Basis of Payment Item 502-0007 12 In Reinforced Concrete Pipe will be paid for at the contract unit price per linear foot installed. ${' word '.repeat(30)}`);

    // Test section 305 extraction
    const section305 = findSectionContent(pageTexts, 305);
    expect(section305).not.toBeNull();
    expect(section305!.fullContent).toContain('SECTION 305');
    expect(section305!.fullContent).toContain('305.01');
    expect(section305!.fullContent).toContain('305.05');
    // Should NOT contain section 502 content
    expect(section305!.fullContent).not.toContain('502.01');
    expect(section305!.basisOfPayment).toContain('305-0003');

    // Test section 502 extraction
    const section502 = findSectionContent(pageTexts, 502);
    expect(section502).not.toBeNull();
    expect(section502!.fullContent).toContain('SECTION 502');
    expect(section502!.fullContent).toContain('502.01');
    // Should NOT contain section 305 content
    expect(section502!.fullContent).not.toContain('305.01');
    expect(section502!.basisOfPayment).toContain('502-0007');
  });
});
