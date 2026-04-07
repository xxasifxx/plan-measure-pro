

# Demo Mobile Interface — Usability Fix Pass

## Problems Identified

1. **Calibration chip is passive** — The "No scale" chip in the mobile toolbar row 2 is just a label. Tapping it does nothing. It should activate the calibrate tool when tapped, especially since the walkthrough tells the user to "select the Scale tool."

2. **Walkthrough doesn't highlight the target UI element** — Step 2 says "select the Scale tool (ruler icon)" but nothing pulses, glows, or points to the actual ruler button in the toolbar. Same for all other steps — the instructions reference UI elements but there's no visual connection.

3. **Bottom tab bar is wasteful** — "Plans" tab does nothing (always active, no action). "Theme" toggle doesn't belong in primary navigation. Two of four tabs are essentially dead space.

4. **Mobile toolbar is overloaded** — Row 1 crams 4 tool buttons + 2 undo/redo buttons + page nav into 390px. That's 8 interactive elements competing for space.

5. **No way to access calibration from bottom bar** — The walkthrough says to calibrate, but the bottom tab bar (the most prominent mobile UI) has no calibration entry point.

6. **Walkthrough card obscures content** — Positioned at `bottom-16`, it sits right above the tab bar and can cover the area where the user needs to interact.

## Changes

### 1. Make calibration chip tappable (Demo.tsx + MobileToolbar.tsx)
- Tapping the "No scale" / scale chip activates `calibrate` tool mode
- Add a subtle tap affordance (border, cursor) so it looks interactive

### 2. Add walkthrough highlight system (Demo.tsx)
- For each walkthrough step, identify the target element using a `data-tour-target` attribute
- Apply a pulsing ring/glow CSS class to the target element during the relevant step
- Targets:
  - Step 0 (upload): the upload label
  - Step 1 (calibrate): the Scale tool button in toolbar
  - Step 2 (pay item): the "Items" tab in bottom bar
  - Step 3 (draw): the canvas area
  - Step 4 (label): the Label tool button in toolbar

### 3. Redesign mobile bottom tab bar (Demo.tsx)
Replace the 4-tab bar with contextual actions that match the workflow:
- **Items** — opens pay items sheet (keep)
- **Scale** — activates calibrate tool (new, replaces useless "Plans" tab)
- **Label** — activates label tool (new, replaces "Theme" toggle)
- **Sign Up** — keep
- Move theme toggle to the header (it's already there)

### 4. Simplify mobile toolbar (Demo.tsx)
- Row 1: Only **Select** and **Pan** tool buttons + undo/redo + page nav (remove Scale and Label — they're now in the bottom bar)
- Row 2: Active pay item chip + calibration status (tappable) + zoom controls
- This reduces row 1 from 8 elements to 6

### 5. Position walkthrough card smarter (Demo.tsx)
- When step targets the toolbar area (calibrate, label), position the card lower
- When step targets the bottom bar (items), position the card higher
- Add a small arrow/chevron pointing toward the highlighted element's general direction

### 6. Add pulse animation (index.css)
```css
@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
  50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
}
.tour-highlight {
  animation: tour-pulse 1.5s ease-in-out infinite;
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 8px;
}
```

## Files Modified
1. `src/pages/Demo.tsx` — bottom bar redesign, toolbar simplification, walkthrough highlights, card positioning
2. `src/index.css` — tour-pulse animation
3. `src/components/MobileToolbar.tsx` — make calibration chip tappable (for main app too)

