

# Standard Specs Upload & Pay Item Spec Lookup

## Clarifications from user feedback
1. **Not a full-page dialog** — use a compact panel or sheet, not a blocking modal
2. **Section ≠ item code** — sections are broad (e.g., "Section 202"), item codes (e.g., "202-0002") belong to sections. The lookup maps item code → section number (first 3 digits).
3. **Show entire section for context + highlight item-specific pay requirements** — display all 5 subsections of the section, but in the final subsection ("Basis of Payment"), locate and highlight the paragraph(s) specific to the item code.

## Lookup logic

Item code `202-0002` → section `202`. Search the specs PDF for the real Section 202