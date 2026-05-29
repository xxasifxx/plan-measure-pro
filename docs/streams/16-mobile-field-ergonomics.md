---
stream_key: 16-mobile-field-ergonomics
paths:
  - src/components/MobileTabBar.tsx
  - src/components/MobileToolbar.tsx
  - src/components/MobileAnnotationSheet.tsx
  - src/components/MobileSections.tsx
  - src/components/MobilePayItems.tsx
  - src/hooks/use-mobile.tsx
  - src/pages/Index.tsx
  - src/pages/Demo.tsx
shared_paths: []
---
# Mobile Field Ergonomics

## Purpose
Enables field inspectors to perform the full quantity takeoff workflow — uploading plans, navigating sheets, measuring, and reviewing annotations — from a phone or tablet. Distinct from the desktop workspace because it replaces sidebar/toolbar chrome with touch-native patterns: a fixed bottom tab bar, a two-row contextual toolbar with chip shortcuts, bottom-sheet detail views, and a scrollable plan canvas optimised for pinch-zoom.

## Surfaces (files)
- `src/components/MobileTabBar.tsx` — fixed bottom nav: Plans / Items / Sections / Summary + theme toggle; badge counts per tab
- `src/components/MobileToolbar.tsx` — two-row contextual toolbar: tool buttons, undo/redo, page nav, active-pay-item chip, calibration chip, zoom
- `src/components/MobileAnnotationSheet.tsx` — bottom `Sheet` for editing/deleting selected annotation
- `src/components/MobileSections.tsx` — scrollable TOC/page list; tap navigates canvas and switches to Plans tab
- `src/components/MobilePayItems.tsx` — pay item list with inline add/edit; active item highlighted; FAB-style Import action
- `src/hooks/use-mobile.tsx` — `useIsMobile()` breakpoint hook (768 px via `matchMedia`)
- `src/pages/Index.tsx` — orchestrates mobile vs desktop branch; swaps sidebar ↔ `MobileTabBar`
- `src/pages/Demo.tsx` — standalone public demo with same mobile stack; 12-step walkthrough overlay

## Acceptance criteria
- On viewport < 768 px, `MobileTabBar` renders at the bottom and desktop `ProjectSidebar` is hidden.
- Tapping any tab switches the visible panel without reloading the PDF canvas.
- Active pay item chip and calibration chip visible in contextual toolbar; tapping calibration chip triggers calibration mode.
- Badge counts on Items and Sections tabs reflect live `payItems.length` / `toc.length`.
- Zoom in/out clamps scale between 0.5× and 4×.
- `MobileAnnotationSheet` opens on annotation selection; allows edit and delete.
- `MobileSections` rows on tap navigate canvas and switch to Plans tab.

## Current state vs criteria
- **Tab switching / PDF persistence**: implemented — `Index.tsx:activeTab` state; PDF ref persists.
- **Active pay item chip**: implemented — `MobileToolbar` renders `activePayItem` chip with color dot and unit label.
- **Badge counts**: implemented — `MobileTabBar` receives `itemCount` and `sectionCount` props.
- **Zoom clamp**: implemented — `Math.max(0.5, ...)` / `Math.min(4, ...)`.
- **Calibration chip tap**: implemented — `onCalibrationChipTap` prop.
- **Touch selection constraints (20 × 20 px minimum)**: **missing** — no `min-touch-target` enforcement in `PdfCanvas`; canvas hit targets unconstrained.
- **Multi-finger zoom / single-tap vs drag**: **partial** — no JS gesture disambiguation; pinch-zoom delegated to native browser.
- **Floating Edit FAB**: **missing** — no dedicated FAB component; "FAB-style" is just a regular button.

## Cross-stream handoffs
- Consumes `useProject` for pay items, annotations, calibration, undo/redo state.
- `MobileSections` triggers `onFileUpload` / `onImportToc` owned by pdf-canvas.
- `MobileAnnotationSheet.onUpdate` / `onDelete` feed `useProject.updateAnnotation` / `removeAnnotation`.
- `use-mobile.tsx` gates Index/Demo rendering branch.

## Risks / debt
- No enforced minimum touch-target size on annotation handles; overlapping annotations on zoomed-out sheets are very hard to tap.
- `useIsMobile` uses hard 768 px breakpoint with no resize listener; tablet rotation doesn't re-evaluate.
- `MobileToolbar` duplicates zoom logic from desktop `Toolbar`; no shared `useZoom` hook.
- `Demo.tsx` reimplements full mobile layout independently rather than reusing `Index.tsx` — two maintenance surfaces.
