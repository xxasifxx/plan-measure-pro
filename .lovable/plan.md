## Root cause (confirmed by running the parser against the embedded sample)

`src/lib/xer/parser.ts` splits each line on `\t` and matches `cols[0] === '%T' | '%F' | '%R'`. The embedded `SAMPLE_XER` (and `SAMPLE_XER_UPDATE`) use a **space** after the tag, e.g. `"%T PROJECT"`, not a tab. So the first cell becomes `"%T PROJECT"`, never matches, and the parser returns **0 tables, 0 tasks**.

That triggers `toast({ title: 'No TASK rows found' })` (the toast you saw in the session replay) and leaves `tables` null. With `tables` null, the entire modules section never renders, so every tour step targeting `[data-tour="dcma-..."]`, `[data-tour="progress-..."]`, etc. has **no DOM target** — the spotlight falls back to the centered "no target" tooltip and the tour is reduced to text-on-cards. Exactly your complaint.

I verified this by running the actual `parseXer(SAMPLE_XER)` in a Bun script: `TASK: 0 PROJECT: 0`.

## Fix

Two small, surgical edits — no UI changes needed; once the sample parses, the tour's existing `beforeShow` clicks land on real DOM and the cursor animation actually demonstrates a workflow.

### 1. `src/lib/xer/parser.ts` — accept space OR tab after the tag

Normalize the leading separator so both `"%T\tPROJECT"` and `"%T PROJECT"` parse:

```ts
for (const line of lines) {
  if (!line) continue;
  const normalized = line.replace(/^(%[TFRE])[ \t]+/, '$1\t');
  const cols = normalized.split('\t');
  // ...rest unchanged
}
```

### 2. `src/pages/XerDemo.tsx` — make `startTour` synchronous-safe

Currently `startTour` calls `ingest(SAMPLE_XER, …)` and then immediately opens the tour. Even after the parser fix, React hasn't committed `tables` yet, so step 1's `beforeShow` runs before the modules render. Wrap the open in a microtask after ingest:

```ts
const startTour = () => {
  if (!tables) ingest(SAMPLE_XER, 'NJTA-MP123-BASELINE.xer');
  setUpdateTables(null);
  setTab('dcma');
  // Defer one frame so modules mount before step 1 measures targets
  requestAnimationFrame(() => requestAnimationFrame(() => setTourOpen(true)));
};
```

Also remove the auto-open on first visit (`xerlens.tour.seen.v2`) — it fires before any sample is loaded, which is the other reason the tour looks empty when a fresh visitor lands. Replace it with: only auto-open after we successfully ingest the sample on first visit.

### 3. Add a regression test

`src/test/xer-parser.test.ts` — assert `parseXer(SAMPLE_XER).TASK.length > 10` so this can never silently regress to zero again.

## Out of scope

No tour copy changes, no new step choreography, no design tokens. The tour content is fine — it just had nothing to point at because the data never loaded.