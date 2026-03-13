

## Current State Assessment

This is a **construction quantity takeoff tool** for measuring quantities (area, length, volume) from PDF plans and generating cost estimates. Here's what exists and what's missing:

### What Works
- PDF loading and page navigation
- Scale calibration (two-point distance)
- Line tool (LF measurements)
- Polygon tool (SF/CY/SY measurements)
- Pay item import from Estimate of Quantities tables
- TOC import via region selection
- Summary panel with manual quantities for non-drawable items
- CSV and PDF export
- Pan and zoom with fit-to-screen
- Normalized coordinates (zoom-independent annotations)

### What's Missing

**1. Annotation Management (High Priority)**
- No way to **select and delete** individual annotations on the canvas (select tool does nothing)
- No way to **edit** an annotation (move points, reassign to different pay item)
- No **undo/redo** for drawing actions
- No annotation list in the sidebar showing what's been drawn per pay item

**2. Multi-Page Awareness**
- Calibration is per-page but there's no way to **copy calibration** from one page to another (most plan sheets share the same scale)
- No visual indicator in sidebar/page nav showing which pages have annotations or calibrations

**3. Measurement Gaps**
- **Count tool** missing — for EA (each) items, user should be able to click to place count markers
- No **depth prompt** when closing a polygon on a CY pay item — depth is never actually set
- No running total visible while drawing (e.g., "Current polygon: ~245 SF")

**4. Sidebar & Workflow**
- No way to **filter/search** pay items when the list is long
- No way to **reorder** or **group-collapse** pay item sections
- TOC entries in the sidebar don't highlight which page range you're currently viewing

**5. Export Quality**
- CSV export doesn't include item numbers, unit codes, or section grouping
- PDF report is basic — no section grouping, no contract quantities vs. measured quantities comparison
- No option to export annotated plan pages (screenshots with annotations overlaid)

### Recommended Priority Plan

1. **Make Select tool functional** — click annotations to select, show info popup, delete with keyboard
2. **Add Count tool** for EA items — click to place markers, auto-increment count
3. **Add depth prompt** for CY polygons on close
4. **Undo/redo** for annotation actions
5. **Copy calibration** across pages
6. **Improve exports** — add item numbers, sections, contract vs. measured comparison

### Technical Approach

- **Select tool**: On click in select mode, hit-test annotations (point-in-polygon / distance-to-line). Show a floating panel with annotation details and a delete button. Store `selectedAnnotationId` in PdfCanvas state.
- **Count tool**: New `ToolMode = 'count'`, stores `type: 'count'` annotations with a single point and `measurement: 1`. Summary aggregates by count.
- **Depth prompt**: After double-click closes a polygon, if the active pay item unit is CY, show a modal asking for depth before saving.
- **Undo/redo**: Maintain an action stack in `useProject` — push on add/remove annotation, pop on undo.
- **Copy calibration**: Button in toolbar or calibration indicator — "Apply to all pages" or "Apply to pages X-Y".

