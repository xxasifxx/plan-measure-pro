## Scope

Three targeted improvements to `/mcfa/demo` (XerLens). No new pages, no schema changes.

---

### 1. Reorder XerLens tour — Weekly Cadence between §02 and §03

**File:** `src/pages/XerDemo.tsx` (`tourSteps` array, ~L231-283)

Currently the tour goes: Dropzone → Tabs (§02) → Audit (§03 = DCMA) → Update → Defend → Comply → Estimate → File → Tour button.

There is no "Weekly Cadence" tour step today — only a Weekly Cadence section on the `/mcfa` pitch page (`McfaPitch.tsx` L515). To honor the original plan, insert a new step between the Tabs step and the DCMA step that frames the six modules as the **Mon→Fri cadence** (Audit Mon · Update Tue · Defend Wed · Comply Thu · Estimate/File Fri). It targets the `[data-tour="tabs"]` strip again with a different title/body and no `tab` change, so it reads as a transitional "what week looks like" beat before diving into Module A.

Resulting order:
1. Dropzone
2. Six modules overview (§02)
3. **Weekly Cadence — Mon→Fri map (NEW, §02·5)**
4. A · Audit (§03)
5. B · Update
6. C · Defend
7. D · Comply
8. E · Estimate
9. F · File
10. Tour button

---

### 2. Download RE feedback memo as PDF or DOCX

**File:** `src/pages/XerDemo.tsx` → `DcmaPanel`'s memo card (~L386-397)

Today the memo card has Copy + "Download .txt". Replace with three buttons: **Copy**, **Download PDF**, **Download DOCX**.

- **PDF**: use `jspdf` (already in deps). Render the memo as monospaced 10pt text with auto page-breaks (`splitTextToSize` + page loop). Filename: `RE-feedback-{projShortName}.pdf`.
- **DOCX**: produce a Word-openable file without adding a heavy dependency by emitting an HTML document served as `application/msword` with `.doc` extension. Word and Google Docs open this cleanly and it preserves the memo's monospace layout via `<pre>`. Filename: `RE-feedback-{projShortName}.doc`. (Trade-off: it's `.doc` HTML, not true OOXML `.docx`. If true `.docx` is required we'd add the `docx` npm package — call out in the response so the user can decide.)
- Keep the existing `.txt` path internal (no button) or drop it; the spec asks for PDF/DOCX so we drop `.txt`.

A small helper module **`src/lib/xer/memo-export.ts`** will hold `downloadMemoPdf(memo, filename)` and `downloadMemoDoc(memo, filename)` so the panel stays clean.

---

### 3. Baseline vs 60-day update comparison chart

**File:** `src/pages/XerDemo.tsx` → `ProgressPanel` (~L459-545), using `recharts` (already in deps).

Add a new card **above** the "Top 10 slipping activities" table:

- **Header:** "BASELINE vs 60-DAY UPDATE · FINISH-DATE VARIANCE"
- **Chart:** horizontal `ComposedChart` (recharts) of the top 12 activities by absolute slip:
  - Y-axis: activity codes
  - Two bars per row: **Baseline finish offset** (cyan) and **Forecast finish offset** (amber if late, emerald if early), expressed as days from the baseline data date.
  - A dashed reference line at the update data date.
  - Tooltip shows full activity name, both dates, and `+Nd` slip.
- **SPI / CPI overlay strip** above the chart: large SPI and CPI gauges with color thresholds (green ≥0.95, amber 0.85-0.95, red <0.85) and a one-line interpretation ("Performing to plan" / "Slipping — recovery plan required").
- **Lag highlights legend** under the chart: small chips listing the 3 longest lags from `report.topSlipping` (`+Xd · TASK_CODE`), each clickable to scroll the row into view in the table below.

To support this, extend **`src/lib/xer/progress.ts`** with a small derived helper `chartRows(report, baselineDataDate, n)` that returns `{ task_code, task_name, baselineOffset, forecastOffset, slip }[]` sorted by absolute slip. The data date comes from `baseline.PROJECT[0]?.last_recalc_date || plan_start_date`.

No changes to KPI cards above (SPI/CPI/% complete/forecast variance) — the new chart sits between the date card and the slipping table.

---

## Files touched

- `src/pages/XerDemo.tsx` — reorder tour steps; rewrite memo download buttons; add chart card to `ProgressPanel`.
- `src/lib/xer/progress.ts` — add `chartRows` helper.
- `src/lib/xer/memo-export.ts` — **new**, PDF + DOC export helpers.

## Out of scope

- True OOXML `.docx` (would require adding the `docx` npm package — flagged above).
- Editing `/mcfa` (McfaPitch) Weekly Cadence section.
- Real cost-loaded CPI (still duration-proxied, with the existing italic disclaimer).
