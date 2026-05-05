
## Goal

Make `/mcfa` and `/mcfa/demo` cleanly demonstrate that the candidate understands and can execute the **CPM Scheduler/Estimator (Evergreen)** role described in the BYOR PDF — referred by Saqeeb Muhammad, anchored at Newark Airport / PANYNJ, primary tools Primavera P6 + NJDOT/NYSDOT compliance + AACE estimating.

## Gaps found

**On `/mcfa` (McfaPitch.tsx):**

1. Hero headline is correct ("Systems-Enabled CPM Scheduler / Estimator") but the surrounding copy and stats still lean "hybrid inspector / dev" — the PDF deliberately moves the pitch off inspection and onto scheduling.
2. The 1,600 + 600 hour split and "NICET inspector + scheduler + dev" framing in §01 contradicts the PDF's positioning. PDF treats inspection as past credential, not current scope.
3. Compensation block says $130K–$155K and "10% EOS Value-Add Bonus." PDF says **$130K–$140K base** and "**10 Growth Units**" + standard quarterly profit-share. Numbers must match the PDF the recruiter has in hand.
4. Page never mentions the **Saqeeb Muhammad referral**, **Evergreen** posting status, or **MCFA's "Inspiring People and Places" mission tie-in** — all explicit in the PDF intro and worth surfacing.
5. KPIs on the page are close but not 1:1 with the PDF's Section 3:
   - PDF short-term: ≥95% logic, ≤72-hr update distribution, L10 integration.
   - PDF long-term: ≤2 DOT submission cycles, ±5% estimate accuracy, 30% admin time reduction.
   - Page has most of these but mixes in custom metrics; align labels and numbers.
6. Recruiter Q&A still anchors on "Why CPM and not inspection?" / "Why not hire a developer separately?" — useful, but several entries defend the dual-role framing the PDF explicitly retired. Trim to the questions a Project Controls Director would actually ask about a Scheduler hire.
7. Missing a clear **"Day in the life of this role"** narrative tying the 10 activities to a weekly cadence (Mon = contractor submission review, Tue = baseline update, Wed = L10 scorecard, Thu = AACE estimate progression, Fri = portfolio rollup). Recruiters skim; this is the single most concrete proof of role understanding.
8. No explicit mention of **Newark Airport / PANYNJ portfolio** anywhere prominent, and no mention of **Resident Engineer** as the primary internal customer (PDF calls this out for contractor-schedule feedback).

**On `/mcfa/demo` (XerDemo.tsx + 4 modules):**

The 4 modules (DCMA-14, TIA, ISO 19650 file explorer, WBS/NJDOT) are good but show **schedule audit** more than **the scheduler's actual job**. The JD describes a recurring weekly workflow: receive contractor XER → audit → write feedback memo to RE → update progress vs. baseline → roll into portfolio → estimate progression. The demo currently stops at "audit." Specifically:

1. **Module A (DCMA)** ends at a score table. The JD's deliverable is "clear non-technical feedback to Resident Engineers." Add a one-click **"Generate RE feedback memo"** action that turns the failed checks into a plain-English review letter (the artifact the role actually produces).
2. **No baseline-vs-update / progress monitoring view.** This is half the JD ("regularly update project progress against the baseline, identifying deviations early"). Add a small **Module E · Progress vs Baseline** tab that, when a second XER is dropped (or using a second sample), computes activity-level variance, SPI, CPI, and lists the top 10 slipping activities. Even a synthetic delta against the sample is enough to demonstrate the workflow.
3. **No portfolio rollup.** JD calls out "Consolidate multiple project schedules into a holistic program view to help leadership manage resources across the Newark/PANYNJ portfolio." Add a small **Portfolio strip** above the modules that, after one XER is loaded, shows that file plus 2–3 stub PANYNJ projects (EWR Terminal A, GSP MP123, Pulaski Skyway) with their DCMA score, % complete, SPI, and float — making the rollup concrete.
4. **No AACE estimating module.** JD lists "AACE-compliant cost estimates at various project stages (Class 5 to Class 1)." Add a lightweight **Module F · AACE Class Progression** that shows the 5 AACE classes with the current sample project's estimate accuracy band and a CTA "advance to next class" that narrows the band — proves understanding without needing real estimating data.
5. **Tour script** currently says "Four modules, one workflow." Update once new modules land, and reframe each tour step around the JD verb (Audit → Communicate → Update → Roll up → Estimate → Defend) rather than the module letter.
6. **Header copy** on the demo says "MODULE OF THE PROPOSED CPM SCHEDULER ROLE" — strengthen to "what this role does every Monday morning when a contractor submits."

## Plan

### 1. Realign `/mcfa` to the PDF

- Update hero supporting copy and the 3 stat tiles. Replace "1,600 / 600 / ~50%" with stats that map to the PDF KPIs: e.g., **≥95%** DCMA logic, **≤72 hr** update distribution, **±5%** AACE accuracy. Keep the "PMP-certified" line.
- Add a small **"Referred by Saqeeb Muhammad · Evergreen Posting · Newark Airport / PANYNJ portfolio"** sub-ribbon under the hero badge.
- §01 Strategic Vision: rewrite the dual-role / 1,600+600 paragraph to match the PDF intro — anchor on the MCFA mission ("Inspiring People and Places"), the Project Controls Director as manager, and the Entrepreneurial value-add (TakeoffPro/XerLens as accelerators, *not* a separate role).
- Add a new section **"A Week in the Role"** (between current §02 and §03) — 5-day cadence card (Mon contractor submission audit → Tue baseline update + variance → Wed L10 scorecard contribution → Thu AACE estimate progression → Fri portfolio rollup + BD takeoff support). This is the recruiter-skim section.
- §04 KPIs: re-key the leading/lagging tables to exactly match PDF Section 3 wording and numbers (95%, 72-hr, ≤2 cycles, ±5%, 30% admin reduction, plus Manager-led Rocks per PDF Section 5).
- §06 Compensation: change band to **$130K–$140K**, replace "10% EOS Value-Add Bonus" with "**10 Growth Units** + quarterly profit-share participation" (PDF wording), keep the Tooling Agreement language but cap hosting per PDF (<$100/mo).
- Recruiter Q&A: keep the Anchor / Downside / EOS-gated / NJDOT / Acumen Fuse questions; remove or rewrite the "Why CPM and not field inspection?" and "Why not hire a developer separately?" entries — replace with: (a) "How will you handle Resident Engineer communication?", (b) "How does this scale across the PANYNJ portfolio?", (c) "What's your AACE Class 5 → Class 1 progression cadence?".
- Add a one-line MCFA mission tie-in in the closing CTA strip ("Inspiring People and Places — by giving every PM the most reliable schedule data on the program.").

### 2. Extend `/mcfa/demo` to demonstrate the scheduler workflow

- **Module A enhancement**: add a **"Generate RE feedback memo"** button beside "Copy summary." It produces a plain-English memo addressed to the Resident Engineer summarizing the failed DCMA checks, the offending activities (top 5), and a recommended action ("Reject and request resubmission" / "Accept with conditions"). This is a `lib/xer/feedback.ts` helper.
- **New Module E · Progress vs Baseline**: a 5th tab. When the user drops a second XER (or clicks "Load updated sample"), compute per-activity start/finish variance, project-level SPI and CPI (using duration as a proxy for cost since XER cost data is sparse), and a top-10 slipping-activities table. Helper: `lib/xer/progress.ts` + a second sample file `lib/xer/sample-update.ts`.
- **New Module F · AACE Class Progression**: card-based view of Classes 5 → 1 with accuracy bands (-50%/+100% down to -3%/+3%), highlighting the current "active" class with a slider/button to advance the project. Pure UI, no XER data required. Helper: `lib/xer/aace.ts`.
- **Portfolio rollup strip**: a small horizontal-scroll card row above the Tabs showing the loaded project + 3 stub PANYNJ projects with mini metrics (DCMA score, % complete, SPI, float days). Hardcoded stub data is fine for demo; clearly labeled "Sample portfolio."
- **Tour update**: extend `tourSteps` to cover the two new modules and the portfolio strip, and rewrite step bodies around JD verbs (Audit · Communicate · Update · Roll up · Estimate · Defend).
- **Header copy**: change "MODULE OF THE PROPOSED CPM SCHEDULER ROLE" to "WHAT THIS ROLE DOES EVERY MONDAY MORNING."

### 3. Files to touch

```text
src/pages/McfaPitch.tsx                — hero/§01/§04/§06 copy, new "Week in role" section, Q&A trim
src/pages/XerDemo.tsx                  — add Modules E + F, portfolio strip, RE memo button, update tour
src/components/XerLensTour.tsx         — no structural change, just consume new steps
src/lib/xer/feedback.ts                — NEW · RE memo generator from DCMA results
src/lib/xer/progress.ts                — NEW · variance / SPI / CPI between two XERs
src/lib/xer/aace.ts                    — NEW · Class 5→1 metadata + accuracy bands
src/lib/xer/sample-update.ts           — NEW · second sample for progress demo
```

No DB migrations, no edge function changes, no new dependencies.

### 4. Out of scope (call out, don't build)

- Real multi-project XER ingestion + persisted portfolio (would require Supabase tables — already exist for the field tool but not wired here; stub data is enough to prove the concept).
- Real AACE cost data linkage (no XER cost rollup; UI-only progression is sufficient).
- Edits to the existing `/demo` field tool — separate product, the PDF already credits it as "shipping today."
