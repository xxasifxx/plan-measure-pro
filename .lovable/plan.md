## Two-part fix

### Part A — XerLens tour: stop being a reading exercise

Three concrete UX changes so the demo *shows* the workflow instead of narrating it:

1. **Animated cursor sprite (the headline change).** A faux mouse cursor that flies across the screen to the next target before each scripted action, then plays a pulsing "click" ring on top of the target. The user actually watches the tour click "Generate RE feedback memo," watches it click "Load 60-day update," watches it click each AACE class card. This single change converts the experience from "captions over a static page" to "watch the system work."
   - New component `<TourCursor>` portaled at z-index just under the tooltip.
   - Imperative `cursor.flyTo(selector).click()` exposed via a ref the tour passes into each step's `beforeShow`.
   - Movement is a 700 ms cubic-bezier transform; click is a 250 ms scale-pulse + concentric ring.

2. **Mon → Fri storyline rail in the tooltip header.** Replaces the cryptic "STEP 7 / 17". Five segmented chips (MON · TUE · WED · THU · FRI) — current day pulses cyan, completed days are filled, future days are dim. Each step declares which `day` it belongs to. The user always knows where they are in the week.

3. **Spotlight + tooltip polish.**
   - Tooltip width grows to 420 px and gains a `pointer-events: auto` bottom-right "drag handle" so it can be repositioned if it covers the spotlit element.
   - On the chart step, the spotlight tightens to just the `ResponsiveContainer` (not the whole card).
   - On the DCMA "offenders" step, `extraTargets` includes the expanded detail row so both the failed check row *and* its offender list are ringed together.
   - Pause autoplay automatically when the user hovers any spotlit area, so they can read.

4. **Honest TIA pre-fill.** Stop poking DOM `value` setters at a Radix-controlled form. Instead default `TiaPanel`'s initial state to: activity = A2020 Remove Substructure, days = 14, type = "Differing site condition", cause = pier-1 rock narrative. The body copy that promises "rock at Pier 1" then matches what's actually on screen.

5. **Two genuine "read this" beats.** On the memo step and the TIA narrative step, set `dwellMs = 11000` and fade the tooltip to 60 % opacity for the second half so the user can actually read the artifact the demo produced.

### Part B — McfaPitch: cut the noise around the scheduler value prop

The page currently dilutes "scheduler with an efficient workflow" with field-inspector / TakeoffPro / iPad-PWA content. Cuts and consolidations:

- **Remove "Section 00 · What we replace on day one"** (the manual-chain vs TakeoffPro comparison — that's an inspector pitch, not a scheduler pitch).
- **Remove "Section 03 · TakeoffPro 3-Phase AI Roadmap"** entirely, including the inspector tablet / GPS field-measurement images and the OFFLINE PWA / GPS-TAGGED / AI-INDEXED mini chips.
- **Remove the hero secondary CTA "Open Field Demo"** (already a noise CTA, points to /demo not /mcfa/demo).
- **Remove the closing-CTA "Field Demo" tertiary button** for the same reason.
- **Promote "A Week in the Role"** (currently §02·5) up to §02 as the hero of role description, and demote the 10-activity grid to §03 so the *workflow* is what the recruiter sees first after the hero.
- **Hero stat ribbon** — keep the three numbers but rewrite labels so all three are scheduler-centric: DCMA-14 LOGIC TARGET / UPDATE DISTRIBUTION SLA / AACE CLASS 1 ACCURACY are already good; no change needed.
- **Hero right column** — replace the TakeoffPro `heroScreenshot` with a static screenshot card labelled "XERLENS · WEEKLY DEMO" pointing at /mcfa/demo. (Reuse the existing image asset; just relabel the chrome strip from "TAKEOFFPRO · LIVE" to "XERLENS · LIVE — /mcfa/demo".)
- **Top-ribbon copy** stays.

Net result: the McfaPitch page reads as Hero → Weekly Cadence → 10 Core Activities → KPIs/Rocks → Archetype Matrix → Architecture → ROI → Performance Mgmt → Compensation → Recruiter Q&A → Closing. Every section is about the scheduler.

### Files touched

- **edit** `src/components/XerLensTour.tsx` — add `<TourCursor>` (new sub-component within the file), `day` field on `TourStep`, Mon→Fri rail in the tooltip header, hover-pause, spotlight tightening helpers.
- **edit** `src/pages/XerDemo.tsx` — pass cursor ref into `beforeShow`, replace `click(sel)` calls with `cursor.click(sel)`, set `TiaPanel` default state to A2020/14d/DSC/Pier-1-rock, drop the `setVal()` DOM-poke block, fix the chart step target.
- **edit** `src/pages/McfaPitch.tsx` — remove §00 and §03 sections + their imports; reorder weekly cadence above 10 activities; relabel hero mockup chrome; trim secondary CTAs.

### Out of scope

- No new dependencies.
- No changes to `dcma.ts`, `tia.ts`, `progress.ts`, `feedback.ts`, or any data file.
- No backend changes.
