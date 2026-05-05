## Goal

Strip every "inspector / OE / developer / hybrid" framing from `/mcfa`. The role is a **CPM Scheduler / Estimator with cross-discipline expertise** — period. The XerLens tooling is in-role workflow automation, not a "developer hire."

## Edits — all in `src/pages/McfaPitch.tsx`

### 1. Hero / page metadata (lines 283, 303, 314)
- `document.title`: `BYOR Proposal · Hybrid Construction Inspector & Systems Integrator — Asif Muhammad, PMP`
  → `BYOR Proposal · Senior CPM Scheduler / Estimator — Asif Muhammad, PMP`
- `mailto` subject: `MCFA BYOR — Hybrid Construction Inspector & Systems Integrator`
  → `MCFA BYOR — Senior CPM Scheduler / Estimator`
- Top-ribbon `Newark Airport · North Jersey · Hybrid` → `Newark Airport · North Jersey · On-site / Remote` (the word "Hybrid" here is location-mode, not role-mode, but it reads as role-coded next to everything else — swap it).

### 2. Phase roadmap (lines 64–89)
Phase 01 "Offline Field Application & Manual Ingestion" is pure inspector pitch. Replace the three "TakeoffPro" phases with three **scheduler-tooling** phases that match what `/mcfa/demo` actually shows:
- **Q1 ROCK** — *XerLens DCMA-14 + RE Memo Auto-Generation* (already in demo Module A)
- **Q2 ROCK** — *Progress Telemetry · SPI / CPI from XER pairs* (Module B)
- **Q3 ROCK** — *Portfolio Roll-Up + TIA Fragnet Workflow* (Modules C + portfolio strip)

Drop Phase 01's offline-PWA / GPS / camera language entirely.

### 3. Integration layer "Data Sources" (line 113)
- `'Field Inputs — Progress, Quantities'` → `'Contractor XER Submissions — Baseline + Monthly Updates'`

### 4. ROI scenarios (lines 132–168)
- conservative `'Faster takeoffs · higher BD throughput'` → `'Faster bid-pursuit schedule narratives · higher BD throughput'`
- realistic `'Bluebeam · PlanGrid · scheduling add-ons'` → `'Acumen Fuse seats · scheduling analytics add-ons'`
- stretch `'Full takeoff + field reporting stack replaced'` → `'Acumen + ad-hoc scheduling analytics replaced'`

### 5. Compensation card (lines 200–204)
Drop "inspector/scheduler + OE + developer simultaneously":
> "Competitive base reflecting PMP, engineering background, and cross-discipline scheduler depth — CPM, AACE estimating, NJDOT controls — covered in one seat. Compensates 1,600 billable hours plus the in-role time spent maintaining the XerLens workflow tooling."

### 6. Recruiter Q&A (line 231)
Strip "separate developer hire":
> "Yes. The PDF anchors the ask to the JD's Experienced level: $130K–$140K base, the 10 Growth Units, and standard quarterly profit-share. The PMP plus the cross-discipline depth (CPM + AACE + NJDOT controls fluency in one seat) is what justifies the upper half of that band, not a markup above it."

### 7. Section 8 cards (lines 800–822)
- L10 card: drop "TakeoffPro Adoption, and AI/P6 integration milestones" → `Schedule Health (DCMA-14), Reporting Latency (≤ 72 hr), and L10 Scorecard contribution.`
- "The Rock" card: replace inspector rocks → `Q1 XerLens DCMA-14 GA · Q2 Automated TIA fragnet · Q3 Portfolio EVM telemetry on the L10 scorecard.`
- "Hybrid Evaluation" → rename to **"Scheduler Evaluation"**, body: `Schedule-health and reporting-velocity metrics alongside efficiency contributions — fewer rejected baselines, faster RE response, lower per-project controls overhead.`

### 8. Anchor table (lines 867–888) — the big one
Currently lists *Inspector + Scheduler + OE + Developer* as roles being "consolidated" — that is exactly the hybrid pitch we retired. Reframe as **what one cross-discipline scheduler replaces vs. siloed scheduler + estimator + analyst stack**:
- `'NICET HCI Level I/II Inspector', '$75K – $95K'` → **remove**
- `'Senior P6 Scheduler (PMP)', '$110K – $140K', 'NJTA / NJDOT consultant rate'` → keep
- `'Office Engineer', '$70K – $90K'` → replace with `'Senior Cost Estimator (AACE)', '$105K – $130K', 'NJ heavy-civil range'`
- `'Mid Full-Stack + AI Developer', '$120K – $160K'` → replace with `'Project Controls Analyst (P6 + EVM)', '$95K – $120K', 'Portfolio reporting role'`
- Sum row label: `'Cost of two siloed hires (Scheduler + Inspector)'` → `'Cost of three siloed seats (Scheduler + Estimator + Analyst)'`, value `$310K – $390K`
- BYOR row sub: `'PMP · NJDOT/AACE · XerLens tooling included'` (already correct, keep)

### 9. Closing tagline (lines 972, 988)
- `Bridge field execution with practical innovation` → `Bring scheduler depth and practical workflow tooling`
- Footer italic `Bridging Field Execution with Practical Innovation.` → `Senior CPM Scheduler / Estimator · PMP · NJDOT / AACE.`

### 10. Proof bullets (lines 218–225)
Drop the field-app bullets that describe TakeoffPro, replace with scheduler-tool bullets:
- Remove `'Offline-capable PWA · GPS-tagged field annotations'`
- Remove `'Real-time multi-user sync · role-based access'`
- Remove `'TOC auto-detection from full plan sets'`
- Remove `'Automatic pay-item extraction (current page + next 4)'`
- Remove `'One-time scale calibration → document-wide default'`
- Remove `'NJDOT / NJTA-compliant CSV, PDF & Excel exports'`
- Add: `'In-browser DCMA-14 audit on contractor XERs (no upload, no SaaS)'`
- Add: `'Plain-English RE memo generation from audit findings'`
- Add: `'SPI / CPI / slip from baseline + update XER pair'`
- Add: `'Auto-drafted TIA fragnet (FS, zero lag — NJDOT 108-03)'`
- Add: `'AACE Class 5→1 estimate progression with ±band display'`
- Add: `'Portfolio rollup of schedule health across active projects'`

## Out of scope
- No structural section reorder (sections renumbered already in prior pass).
- No design token / color changes.
- Demo page (`/mcfa/demo`) untouched — already scheduler-only.
- TakeoffPro live app at `/demo` untouched (different audience).