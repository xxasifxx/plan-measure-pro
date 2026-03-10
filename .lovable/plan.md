

## Pay Items Overhaul

The user wants pay items to mirror the "Estimate of Quantities" table from their construction documents, with proper unit types and a distinction between **drawable** (measurable on plans) and **non-drawable** (lump sum, cash, count, months) items.

### 1. Expand the unit type system

In `src/types/project.ts`, update the `PayItem` unit union and add a helper:

```ts
unit: 'SF' | 'LF' | 'CY' | 'SY' | 'EA' | 'TON' | 'LS' | 'USD' | 'MNTH'
```

Add a constant set of drawable units and a helper function:

```ts
export const DRAWABLE_UNITS = new Set(['SF', 'LF', 'CY', 'SY']);

export function isDrawableUnit(unit: string): boolean {
  return DRAWABLE_UNITS.has(unit);
}
```

- **SF, LF** → distance/area, drawn directly
- **SY, CY** → derived from SF (area÷9, volume÷27), still drawable
- **EA, TON, LS, USD, MNTH** → non-drawable, quantity entered manually

### 2. Add unique item identifiers

Add `itemCode` and `contractQuantity` fields to `PayItem`:

```ts
export interface PayItem {
  id: string;
  itemCode: string;      // e.g. "202-0002", "506-0001"
  name: string;           // e.g. "STRIPPING TOPSOIL"
  unit: 'SF' | 'LF' | 'CY' | 'SY' | 'EA' | 'TON' | 'LS' | 'USD' | 'MNTH';
  unitPrice: number;
  color: string;
  contractQuantity?: number;  // from estimate of quantities
  drawable: boolean;          // derived from unit, but stored for convenience
}
```

### 3. Update the sidebar Pay Items section

In `ProjectSidebar.tsx`:
- Display `itemCode` alongside `name` (e.g., "202-0002 · Stripping Topsoil")
- Show a visual indicator for drawable vs non-drawable items (e.g., a small pen icon for drawable, a hash icon for non-drawable)
- Only allow selecting non-drawable items when in `select` mode (not line/polygon tools)
- Update the Pay Item form dialog to include `itemCode` field and the new unit options (`LS`, `USD`, `MNTH`)

### 4. Update the toolbar / drawing logic

In `PdfCanvas.tsx` and `Toolbar.tsx`:
- When the user selects line or polygon tool, only allow choosing from drawable pay items (filter the active pay item to drawable ones)
- Show a toast/warning if the active pay item is non-drawable when switching to a drawing tool

### 5. Update DEFAULT_PAY_ITEMS

Replace the defaults with a representative set from the estimate of quantities screenshot, or just clear them (empty array) since the user will import their own.

### 6. Update SummaryPanel

In `SummaryPanel.tsx`, handle non-drawable items — show their `contractQuantity` instead of measured quantity, or allow manual quantity entry for EA/LS/USD/MNTH items.

### Files to modify
- `src/types/project.ts` — expand PayItem interface, add DRAWABLE_UNITS, isDrawableUnit
- `src/components/ProjectSidebar.tsx` — update form with itemCode, new units, drawable indicator
- `src/components/PdfCanvas.tsx` — filter to drawable pay items for drawing tools
- `src/components/Toolbar.tsx` — warn if non-drawable item selected with drawing tool
- `src/components/SummaryPanel.tsx` — handle non-drawable items display
- `src/lib/storage.ts` — no changes needed (serialization is generic)

