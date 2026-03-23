

# Relax Section Detection Heuristic

## Problem

The `buildSectionPageIndex` function requires THREE conditions to match a section start: "SECTION NNN" heading + NNN.01 subsection on the same page + dominant prefix check. This is too strict — PDF text extraction often mangles or splits text across items, so `NNN.01` may not appear as a clean token on the heading page. The user confirms there are exactly 9 top-level sections (100–900) and the current logic is missing many of them.

## Solution — Progressive Fallback in `src/lib/specs-utils.ts`

Replace the current all-or-nothing approach with a tiered detection strategy:

### Tier 1 (current strict match)
Keep existing logic as the first pass: "SECTION NNN" + NNN.01 on page + dominant prefix. This catches clean cases.

### Tier 2 (relaxed — drop NNN.01 requirement)
Second pass for sections 100–900 not found in Tier 1: accept any page with "SECTION NNN" heading where NNN is the dominant prefix (or the only prefix). Drop the NNN.01 requirement entirely.

### Tier 3 (fallback — just the heading)
Third pass for still-missing sections: accept the first page containing "SECTION NNN" that isn't a TOC page (< 5 distinct prefixes) and has > 50 words. No subsection marker requirements at all.

### Implementation
- After the existing loop, check which of sections 100, 200, 300, 400, 500, 600, 700, 800, 900 are missing
- Run Tier 2 pass over sorted pages for missing sections only
- Run Tier 3 pass for any still missing
- This ensures all 9 sections are found if the heading text exists anywhere in the document

## Also fix SpecViewer fallback (`src/components/SpecViewer.tsx`)
Even with better detection, some pay items may map to sub-sections not in the index. Apply the previously approved fix:
- Use `effectiveStartPage = startPage ?? 1`
- Always render the PDF canvas (remove the dead-end blocker)
- Show an info banner + auto-open search pre-filled with "SECTION {num}" when section not found

## Files Modified
1. `src/lib/specs-utils.ts` — tiered detection in `buildSectionPageIndex`
2. `src/components/SpecViewer.tsx` — fallback to page 1 + search when section still not found

