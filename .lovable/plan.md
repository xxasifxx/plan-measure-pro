

## Import Pay Items from Side-by-Side Tables

### Problem
The Estimate of Quantities page contains **two tables side by side** on the same page — items 1-60 on the left, items 61-87 on the right. They share the same Y coordinates, so naive Y-grouping would merge item 1's row with item 61's row. We need a parser that detects multiple table columns and processes them independently.

### Algorithm

1. **Full-page text extraction** — extract all text items from the current page with their X,Y coordinates
2. **Find all header instances** — scan for rows containing "ITEM" + "DESCRIPTION" + "UNIT" keywords. On a side-by-side layout, there will be **two header clusters** at different X positions but similar Y positions
3. **Split into table regions by X** — use the header X positions to determine column boundaries. If two "ITEM NO" headers exist at X=100 and X=800, everything with X < ~750 belongs to the left table, everything X >= ~750 to the right table. The boundary is the midpoint between the rightmost item of the left headers and the leftmost item of the right headers
4. **Parse each table independently** — within each table region:
   - Group text items into rows by Y coordinate (5px tolerance)
   - Identify column positions from that table's header row (ITEM NO, UNIT CODE, DESCRIPTION, UNIT, CONTRACT QTY)
   - For each data row, assign text items to the nearest column based on X proximity
   - Extract: item number (sequential integer), unit code (e.g., "202-0002"), description, unit string, contract quantity
5. **Merge tables sequentially** — concatenate left table items then right table items, sorted by item number
6. **Map units** — "L.S." → LS, "C.Y." → CY, "S.Y." → SY, "S.F." → SF, "L.F." → LF, "EACH" → EA, "TON" → TON
7. **Assign colors** — cycle through the color palette
8. **Validate** — item numbers should be sequential (1, 2, 3, ... N)

### UI Flow
- Add "Import Pay Items" button in sidebar (shown when `hasPdf` is true)
- User navigates to Estimate of Quantities page, clicks the button
- Parser runs on the full page, auto-detects table layout
- Toast shows result: "87 pay items imported"

### Files to modify
- **`src/lib/pdf-utils.ts`** — add `extractPayItemsFromPage()` with multi-table detection logic
- **`src/components/ProjectSidebar.tsx`** — add "Import Pay Items" button, add `onImportPayItems` prop
- **`src/pages/Index.tsx`** — add `handleImportPayItems` handler, wire to sidebar

### Edge cases
- Single table (no side-by-side split) — only one header cluster found, parse as one table
- More than two tables — algorithm generalizes to N header clusters by splitting at midpoints between each pair
- Items spanning description across multiple text fragments on the same row — join all non-number text items assigned to the description column

