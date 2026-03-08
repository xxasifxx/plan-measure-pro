

## Revised Plan: Construction Quantity Takeoff Tool

### Key Changes from Previous Plan

1. **Drop Rectangle tool** — Polygon handles all area takeoffs (including rectangular ones). Tools: Line + Polygon only.

2. **Auto-parse TOC from PDF title page** — When a PDF loads, page 1 (title page) is rendered and its text extracted via pdf.js. The TOC text is parsed to find section names and page numbers (e.g., "Grading Plan ........... 12"). These entries populate the left sidebar automatically. Clicking a TOC entry navigates to that page number. No manual section-to-page mapping needed.

3. **Onsite quick-reference priority** — Fast load, fast navigation, minimal clicks. The sidebar TOC is the primary navigation. Page thumbnails are secondary.

### Architecture

```text
┌─────────────────────────────────────────────────┐
│  SidebarProvider (full width)                   │
│ ┌──────────┐ ┌────────────────────────────────┐ │
│ │ Sidebar  │ │  Main Area                     │ │
│ │          │ │ ┌────────────────────────────┐  │ │
│ │ Project  │ │ │ Toolbar (tools, calibrate, │  │ │
│ │ Upload   │ │ │ pay item selector, export) │  │ │
│ │          │ │ ├────────────────────────────┤  │ │
│ │ TOC      │ │ │ Canvas (PDF + annotations) │  │ │
│ │ (parsed) │ │ │                            │  │ │
│ │          │ │ └────────────────────────────┘  │ │
│ │ Pay Items│ │                                 │ │
│ │ Summary  │ │                                 │ │
│ └──────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Implementation Steps (in order)

#### Step 1: PDF Upload & TOC Extraction
- Upload PDF via file input, render with pdf.js
- On load, extract text content from page 1 using `page.getTextContent()`
- Parse TOC entries: regex for patterns like `"Section Name ... PageNum"` or `"Section Name    PageNum"`
- Populate sidebar with parsed TOC entries; each entry navigates to its page
- Fallback: if no TOC detected, show plain page list

#### Step 2: Canvas-Based PDF Viewer
- Render current page to an HTML canvas
- Overlay a second canvas (or Fabric.js canvas) for annotations
- Page navigation via TOC clicks + prev/next buttons
- Zoom and pan controls

#### Step 3: Scale Calibration
- Calibrate mode: click two points, enter known distance
- Store pixels-per-foot ratio per page
- Display current scale in toolbar

#### Step 4: Annotation Tools (Line + Polygon)
- **Line tool** — click two points, displays length in LF
- **Polygon tool** — click to place vertices, double-click to close; displays area in SF; optional depth input converts to CY
- Each annotation tagged with active pay item (color-coded)
- Select/move/delete annotations

#### Step 5: Pay Item Management
- CRUD for pay items: name, unit (SF, LF, CY, EA), unit price, color
- Stored in localStorage, reusable across projects
- Active pay item selector in toolbar

#### Step 6: Summary & Export
- Summary table: quantities grouped by pay item, extended costs, grand total
- Export: annotated PDF (jsPDF), CSV, PDF report

#### Step 7: localStorage Persistence
- Save/load projects (PDF reference, annotations, calibrations, TOC, pay items)
- Project switcher

### Tech Stack
- **pdf.js** — PDF rendering + text extraction for TOC parsing
- **Fabric.js** — annotation canvas overlay
- **jsPDF** — export
- React + Tailwind + shadcn/ui

