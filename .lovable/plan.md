

# Auto-Activate Drawing Tool on Pay Item Click

## Problem
The toolbar has three redundant drawing buttons (Line, Polygon, Count) that require manual switching. The user must select a pay item AND separately pick the right tool. This can be inferred automatically from the pay item's unit type.

## Design

### Unit-to-Tool Mapping
When a pay item is clicked in the sidebar, automatically set the tool mode:

| Unit | Tool Mode | Annotation Type |
|------|-----------|-----------------|
| LF | `line` | Line (2 points) |
| SF, SY, CY | `polygon` | Polygon (3+ points) |
| EA | `count` | Count (single click) |
| TON, LS, USD, MNTH | no change (stay on `select`) | Non-drawable |

For CY items, the depth prompt already fires when a polygon is closed — no change needed there.

### Changes

**A. Remove Line, Polygon, Count buttons from Toolbar (`src/components/Toolbar.tsx`)**
- Remove `line`, `polygon`, and `count` from the `tools` array, keeping only `select`, `pan`, and `calibrate`.

**B. Auto-activate tool on pay item click (`src/pages/Index.tsx`)**
- Create a new handler `handleActivePayItemChange(id)` that:
  1. Sets `activePayItemId` to the clicked item
  2. Looks up the pay item's unit
  3. Sets `toolMode` based on the mapping above (LF → line, SF/SY/CY → polygon, EA → count, others → select)
- Pass this handler to `ProjectSidebar` instead of the raw `setActivePayItemId`.

**C. Update `ProjectSidebar` pay item click (`src/components/ProjectSidebar.tsx`)**
- No structural change needed — `onActivePayItemChange` already fires on click. The new handler in Index.tsx handles the tool switch.

**D. Remove tool validation guards from Toolbar (`src/components/Toolbar.tsx`)**
- The `handleToolChange` guards for drawable/EA validation become unnecessary since the toolbar no longer offers those buttons. Remove the dead code.

**E. Keep `ToolMode` type and PdfCanvas logic unchanged**
- `PdfCanvas.tsx` still respects `toolMode` for drawing behavior — nothing changes there. The only difference is who sets the mode (sidebar click instead of toolbar button).

