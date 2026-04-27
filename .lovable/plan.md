# Pitch Landing Page: Asif Muhammad → mcfa "Software Solution Integrator" (BYOR)

## Goal
A standalone, single-purpose landing page targeted at **mcfa leadership** (Haddonfield, NJ) that pitches Asif Muhammad, PMP for the *Build Your Own Role* Software Solution Integrator position — using **Draw-Quantify-Dash / TakeoffPro** as the live, working proof-of-concept.

This is **not** a product page. It is a personal proposal page styled like an enterprise pitch deck. It lives at a new route and does not touch the existing `/landing` (TakeoffPro marketing site).

## Route & Files
- New route: **`/mcfa`** (added to `src/App.tsx`, public, no auth)
- New page: **`src/pages/McfaPitch.tsx`**
- Reuse existing components: `Button`, `Card`, `Accordion`, framer-motion animation helpers, lucide icons, existing hero/inspector imagery from `src/assets/`
- No backend changes, no new tables — single CTA mailto + link to live demo at `/demo`

## Visual Identity
Match the existing TakeoffPro landing aesthetic (dark, monospace JetBrains Mono accents, blueprint motif) so mcfa sees that the candidate *built the very tool they are reading about*. Add subtle mcfa-aligned cues (LEADS values callouts, EOS terminology) without infringing on mcfa branding.

## Page Structure (top → bottom)

### 1. Hero
- Eyebrow: `BUILD YOUR OWN ROLE · PROPOSAL`
- Headline: **"A Software Solution Integrator for mcfa's Transportation & Infrastructure Division"**
- Subhead: Bridging field-level inspection reality with Agentic AI, Primavera P6, and the modern AEC stack.
- Two CTAs: `View Live Proof-of-Concept` → `/demo` ・ `Contact Asif` → mailto
- Right side: screenshot of TakeoffPro / Draw-Quantify-Dash with annotated callouts (TOC import, pay-item extraction, GPS calibration)

### 2. The Candidate (one-line credibility strip)
Asif Muhammad, PMP · ~7 yrs GenAI/Full-Stack · Highway Inspector (Churchill / Trilon) · Documentation QA ≥95% · Aerospace safety-critical background (Airbus A400M)

### 3. Why This Role, Why Now
Short narrative tying the $2B NJTA I-4 expansion, mcfa's SDVOSB / EOS culture, and the data-volume problem to the need for a hybrid Inspector + Software Integrator.

### 4. The Hybrid Edge (4-card grid)
| AI & GenAI | Full Stack | Project Governance | Domain |
|---|---|---|---|
| LLM, RAG, MCP, A2A | C#, React, Azure Fns, REST | PMP, EOS, WCAG | Highway inspection, P6, BIM |

### 5. Proof of Concept: Draw-Quantify-Dash
Embedded screenshot grid + bullet list of capabilities **already shipped**:
- TOC auto-detection from plan sets
- Automatic pay-item extraction (current page + next 4)
- One-time scale calibration → document-wide default
- GPS field measurement w/ affine georeferencing
- Real-time multi-user sync, NJDOT-compliant exports

CTA button: **`Open the live app at /demo`**

### 6. LEADS Alignment Table
Reproduce the LEADS → Strategic Alignment → Project Outcome table from the brief verbatim (Love / Entrepreneurial / Accountability / Delight / Stretch).

### 7. The Solution Integrator Archetype
Side-by-side comparison: *Traditional Scheduler* vs *Solution Integrator* (Schedule Mgmt, QC, Reporting, Workflow) — same content as the brief's table.

### 8. Technical Vision: P6 + BIM 360 + Agentic AI
Three stacked sections with diagrams (CSS/SVG, no images required):
- **P6 Integration** — REST API, Local/Remote modes, JWT auth
- **Modern Design Stack** — Revit → APS → P6 → Power BI flow
- **Agentic Layer** — MCP (tool grounding) + A2A (multi-agent coordination), with the Procurement-Agent ↔ Schedule-Agent example

### 9. ROI Table
The 9.7× value-multiplier table from the brief (Direct Revenue, Internal Savings, Efficiency Gains, Net Annual Benefit: $62k → $604,517) plus the proposal-tier value-add ladder ($25k / $75k / $150k+).

### 10. EOS Integration
Four-card grid: Scorecards · Rocks · Accountability Chart · Level 10 Meetings — each tied to the Integrator role.

### 11. 8-Year Career Pathway
Timeline component (Yr 1-2 Foundation → Yr 3-5 Strategic Expansion → Yr 6-8 Practice Leadership), capped with the Senior Integrator / PM / RE progression table.

### 12. Closing CTA
Large dark panel:
> "Let's bridge the digital divide in NJ infrastructure together."
- Primary CTA: `Schedule a 30-min conversation` (mailto with prefilled subject "mcfa BYOR — Software Solution Integrator")
- Secondary: `Explore the working prototype` → `/demo`
- Footer line: links to LinkedIn, GitHub, the live app, and a small "Built with the same stack proposed for mcfa" note.

## Technical Notes
- Single file `src/pages/McfaPitch.tsx` (~600-800 lines, similar shape to `Landing.tsx`)
- Framer-motion fade-up animations reused from existing landing
- Tailwind only, no new dependencies
- Fully responsive (mobile-first; tables collapse to stacked cards under `md`)
- SEO: page-level `<title>` via React (no index.html changes needed for a pitch page); `noindex` meta to keep it private-ish
- Add `/mcfa` route to `src/App.tsx` as a public route (no auth wrapper)

## Out of Scope
- No changes to existing `/landing`, `/demo`, or app functionality
- No new database tables or edge functions
- No mcfa logo usage (text references only, to avoid trademark issues)
