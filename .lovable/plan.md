

# Inspector Daily Export + Annotation Manual Override

## Overview

Two features: (1) per-annotation manual quantity override and location/notes fields, (2) a daily export function that generates an Excel workbook with a summary sheet and plan page screenshots.

## Database Changes

### Modify `annotations` table — add 3 columns:

```sql
ALTER TABLE annotations ADD COLUMN manual_quantity numeric DEFAULT NULL;
ALTER TABLE annotations ADD COLUMN location text DEFAULT '';
ALTER TABLE annotations ADD COLUMN notes text DEFAULT '';
```

- `manual_quantity`: when set, overrides the calculated measurement for that annotation
- `location`: free-text field (e.g., "Station 42+00, NB lane")
- `notes`: free-text field for inspector remarks

### Update `Annotation` type in `src/types/project.ts`:
Add `manualQuantity?: number`, `location?: string`, `notes?: string`.

## Feature 1: Annotation Manual Override + Details

### Annotation selection popup (PdfCanvas.tsx)
When an annotation is selected, the existing popup already shows measurement info. Extend it with:
- **Quantity override**: Input field showing calculated qty, editable to override. When changed, saves to `manual_quantity` column. A "Reset" button clears the override.
- **Location**: Text input for station/location reference
- **Notes**: Text input for inspector remarks

These fields call `onUpdateAnnotation` which already exists and persists to Supabase.

### Summary panel (SummaryPanel.tsx)
Update quantity calculations to use `manual_quantity` when present (falling back to calculated `measurement`).

### Export utils (export-utils.ts)
Update `buildRows` to respect `manual_quantity` overrides per annotation.

## Feature 2: Daily Inspector Export (Excel)

### New function in `src/lib/export-utils.ts`: `exportInspectorDaily()`

Parameters: annotations (today's only, filtered by user), payItems, projectName, contractNumber, inspectorName, pdf (for screenshots)

### Sheet 1: "Daily Report"
Columns: Pay Item Code | Pay Item Name | Calc'd Qty | Final Qty | Unit | Location | Notes | Page
- One row per annotation (not aggregated by pay item — each annotation is a line item)
- "Final Qty" uses `manual_quantity` if set, otherwise calculated measurement
- Header row with project name, date, inspector name, contract number

### Sheet 2: "Plan Pages"
- For each unique page number in today's annotations, render the PDF page to a canvas and embed as an image
- Uses existing `renderPage()` from pdf-utils to generate page images
- Images inserted with annotations drawn on them (capture from the overlay canvas)

### Implementation approach
- Use **xlsx** (SheetJS) library for Excel generation — it's client-side, no server needed
- For plan page images: render pages to off-screen canvas, convert to PNG blobs, embed in xlsx
- Note: SheetJS Community Edition supports image embedding via `ws['!images']`
- Alternative: use jsPDF for a PDF-based export if xlsx image embedding proves limited — but try xlsx first since user specifically asked for Excel

### Export trigger
- Add "Export Today's Work" button to the inspector toolbar/summary panel
- Filters annotations by `created_at >= today` AND `user_id = current user`
- Downloads as `{projectName}_daily_{date}.xlsx`

## Files to Create/Modify

1. **Migration** — Add 3 columns to annotations table
2. **`src/types/project.ts`** — Add fields to Annotation interface
3. **`src/components/PdfCanvas.tsx`** — Extend selection popup with override qty, location, notes inputs
4. **`src/hooks/useProject.ts`** — Update annotation DB sync to include new fields
5. **`src/lib/export-utils.ts`** — Add `exportInspectorDaily()` function, update `buildRows` for overrides
6. **`src/components/SummaryPanel.tsx`** — Respect manual overrides in calculations
7. **`src/pages/Index.tsx`** — Add "Export Today's Work" button for inspectors
8. **`package.json`** — Add `xlsx` dependency

## Phases

1. DB migration + type updates
2. Annotation override UI in selection popup
3. Daily export function with Excel generation
4. Wire up export button in inspector UI

