## Problem

The current `/xer` tour is just captions floating over static panels. It tells the user what each module does instead of showing them. The dummy NJTA project is already loaded, but no buttons get clicked, no memo appears, no update is loaded, no fragnet is built, no estimate gets progressed. It reads like sticky notes on a blank wall.

## Goal

Make the tour a **scripted live demo**: each step actually drives the UI on the sample NJTA bridge project — opening panels, clicking buttons, scrolling to results, highlighting freshly-generated artifacts. The user watches the Mon→Fri scheduler workflow execute end-to-end in ~90 seconds, then can explore on their own.

## What the tour will do at each step

The existing `XerLensTour` already supports `beforeShow: () => Promise<void>` and `extraTargets`. We will use both to script real interactions. State that the tour mutates (memo open, update loaded, expanded DCMA row, TIA form, AACE class) is hoisted to `XerDemo` so step callbacks can drive it.

```text
Step  Module  What the user SEES happen
────  ──────  ──────────────────────────────────────────────────────────────
 1    —       Dropzone glows. Caption: "Contractor just submitted this .xer."
 2    —       Six-tab strip lights up; each tab pulses in sequence.
 3    —       Mon→Fri cadence overlay (same tab strip, animated arrows).
 4    A       Switches to Audit tab. Score card animates from 0 → 71%.
 5    A       Auto-expands the first failing DCMA row (Hard Constraints) so
              offending activity codes appear; row is spotlighted.
 6    A       Clicks "Generate RE feedback memo" → memo card slides open,
              spotlight on the PDF/DOCX buttons. Caption: "This is the
              artifact you'd actually email the RE."
 7    B       Switches to Update tab. Empty-state spotlighted.
 8    B       Clicks "Load sample 60-day update". KPI strip + chart appear.
              Spotlight moves to SPI/CPI tiles, then to the bar chart, then
              to the lag-highlight chips and the slipping table.
 9    B       Spotlight on "PNG" / "Summary PDF" export buttons.
10    C       Switches to Defend tab. Pre-fills the TIA form (Activity
              A2020 · 14 days · "Differing site condition — rock at Pier 1"),
              clicks Generate. Spotlight on the fragnet + draft narrative.
11    D       Switches to Comply tab. Negative-lag and open-end activities
              are highlighted; right panel's NJDOT milestone checklist is
              spotlighted.
12    E       Switches to Estimate tab. Cycles the Class selector
              5 → 3 → 1; the accuracy band visibly narrows each step.
13    F       Switches to File tab. Spotlight on the auto-tag chips and
              the search box.
14    —       Spotlight back on "Take the tour" button. Caption: "Replay
              anytime. Now drop your own .xer."
```

Pacing: ~5–7 s per step (auto-advance optional via a "Play" toggle in the tour header, default off so users still control with arrow keys / Next button).

## Implementation outline

### `src/components/XerLensTour.tsx`
- Add an optional `autoPlay` prop and a `Play / Pause` button in the tooltip header. When playing, advance after `step.dwellMs ?? 6000`.
- Add `dwellMs?: number` to `TourStep`.
- Keep the existing keyboard / focus-trap behaviour. Pause auto-play when the user presses any nav key.

### `src/pages/XerDemo.tsx`
- Lift workflow state up so steps can drive it:
  - `dcmaOpenRowId`, `setDcmaOpenRowId`
  - `memoOpen`, `setMemoOpen`
  - `tiaForm`, `setTiaForm` (activity, days, cause)
  - `aaceClass`, `setAaceClass`
  - Pass setters into `DcmaPanel`, `TiaPanel`, `AacePanel` (current local state moves up).
- Add small `data-tour=` hooks where missing:
  - `data-tour="dcma-score"`, `data-tour="dcma-memo"`, `data-tour="dcma-row-hardcstr"`
  - `data-tour="progress-empty"`, `data-tour="progress-kpis"`, `data-tour="progress-chart"`, `data-tour="progress-laglinks"`, `data-tour="progress-exports"`
  - `data-tour="tia-form"`, `data-tour="tia-output"`
  - `data-tour="wbs-issues"`, `data-tour="wbs-milestones"`
  - `data-tour="aace-band"`, `data-tour="aace-selector"`
  - `data-tour="files-tags"`, `data-tour="files-search"`
- Rewrite `tourSteps` per the table above. Each scripted step gets a `beforeShow` that calls the relevant setter (e.g. `setMemoOpen(true)`, `loadUpdate()`, `setTiaForm({activity:'A2020', days:14, cause:'Differing site condition — rock at Pier 1'})`, `setAaceClass(3)`). The `target` is the freshly-revealed element so the spotlight lands on real output, not an empty panel.
- After the tour closes, **leave the demo state populated** (memo open, update loaded, TIA generated) so the user can immediately explore what they just watched.

### `src/lib/xer/dcma.ts` (read-only check)
- Verify the Hard Constraints check id so the auto-expand step targets the right row. No code change expected — if the id differs, just update the `setDcmaOpenRowId(...)` value used in the step.

## Out of scope

- No new dependencies.
- No backend / data changes.
- No redesign of individual module panels — only state hoisting + `data-tour` hooks.
- The McfaPitch page is untouched.

## Files touched

- **edit** `src/components/XerLensTour.tsx` — autoplay + dwellMs.
- **edit** `src/pages/XerDemo.tsx` — hoist workflow state, add `data-tour` hooks, rewrite `tourSteps` as a scripted demo, thread setters into module panels.
