

# Landing Page Overhaul — NJTA/NJDOT Enterprise Marketing

## Target Audience

The buyer is the **NJ Turnpike Authority Engineering Department** and their construction management consultants (APTIM, HNTB, etc.). Secondary audience is NJDOT Resident Engineers and inspectors. These are public-agency procurement teams that care about:

- **NJTA Standard Specifications compliance** (7th Edition 2016, pay item format like `104-0001`)
- **Inspector daily diary / DC forms** — the RE and inspectors file daily quantity reports
- **Monthly payment estimates** — quantities must reconcile against contract bid items
- **Audit trail** — public dollars require documentation of who measured what, when
- **Field mobility** — inspectors are on active highway corridors, measuring from tablets
- **Eliminating quantity disputes** between NJTA and contractors at payment time

The landing page should speak this language fluently. And per your direction, if a feature would be compelling to this buyer, we market it — even if it needs to be built.

## Page Structure (Complete Rewrite of Landing.tsx)

### Nav
- Logo: "TakeoffPro" with tagline "by [your company]"
- Links: Features, How It Works, For NJTA/DOT, Contact
- CTAs: "Log In" + "Request a Demo"

### Hero
- Badge: "Purpose-Built for NJ Turnpike Authority & NJDOT Projects"
- Headline: **"Stop Disputing Quantities. Start Proving Them."**
- Subline: "TakeoffPro gives your RE team digital measurement tools that produce audit-ready quantity records — directly from contract plan PDFs. Built around NJTA Standard Specifications and pay item formats."
- Primary CTA: "Request a Demo" / Secondary: "Start Free Trial"
- Trust signals: "NJTA Pay Item Compatible", "NJDOT Spec Format", "Zero Install — Browser Based", "Field-Ready on Any Tablet"

### Section: The Cost of Paper Takeoffs (replaces generic pain points)
Three cards with NJTA-specific framing:
1. **"Payment disputes delay cash flow by 30+ days"** — When the contractor's quantities don't match the RE's field measurements, the estimate stalls. TakeoffPro creates a single source of truth.
2. **"DC form errors compound through the monthly estimate"** — Handwritten daily quantities get transcribed into spreadsheets. Each copy introduces variance. Digital measurement eliminates transcription.
3. **"No audit trail from plan to payment"** — When FHWA or the Office of the Inspector General asks how a quantity was derived, can you show them? TakeoffPro timestamps every measurement with the user, location, and plan sheet.

### Section: Built for NJTA & NJDOT Workflows
Feature cards rewritten for this buyer:

1. **NJTA Pay Item Import** — "Upload your bid schedule or import directly from NJTA Standard Specs. Pay items auto-map to Section 100-900 categories with correct units (LF, SY, CY, TON, LS, EA)."
2. **Contract vs. Measured Tracking** — "See real-time variance between contract bid quantities and field-measured quantities. Color-coded alerts flag overruns before they become change orders."
3. **Inspector Daily Reports** — "Each inspector's measurements export as a daily log — organized by pay item, with location stamps, notes, and plan page references. Replaces handwritten DC diaries."
4. **Monthly Estimate Support** — "Roll up all measurements into a pay item summary report that mirrors the monthly estimate format. CSV and PDF exports ready for the RE's review."
5. **Multi-Sheet Plan Navigation** — "Upload the full contract plan set. Table of contents auto-detects sheets. Calibrate once per sheet — every measurement on that page is accurate."
6. **Role-Based Access** — "REs and PMs configure projects and review progress. Field inspectors measure and annotate. Separation of duties built into the platform."

### Section: How It Works (4-step workflow, NJTA-specific labels)
1. **Upload Contract Plans** — "Drop the PDF plan set from ProjectWise or your file system"
2. **Import Pay Items** — "Paste from the bid schedule or extract from spec pages"
3. **Measure in the Field** — "Inspectors draw lines, areas, and counts on their tablets"
4. **Export for Payment** — "Download daily logs, monthly summaries, or full contract reports"

### Section: Who Uses TakeoffPro (replaces generic "two roles")
Three buyer personas instead of two:

**Resident Engineers & Project Managers**
- Configure projects, upload plan sets, import bid schedules
- Assign inspectors to specific contracts
- Review team progress from a central dashboard
- Export monthly estimate summaries for NJTA/NJDOT review
- Compare measured vs. contract quantities to catch overruns early

**Field Inspectors**
- Open assigned projects on any tablet — no app install
- Measure guardrail (LF), paving (SY), excavation (CY), drainage structures (EA) directly on plan sheets
- Add location stamps (station numbers, lane references) and field notes
- Override calculated quantities with field actuals when conditions differ from plans
- Daily work exports as structured Excel workbooks

**Construction Management Consultants**
- Multi-project oversight across NJTA/NJDOT portfolio
- Real-time visibility into inspector activity without waiting for emailed reports
- Audit-ready records for FHWA compliance reviews
- Centralized quantity data eliminates consultant-to-agency reconciliation delays

### Section: Comparison Table — "TakeoffPro vs. Your Current Process"
Side-by-side table:
| Dimension | Paper + Spreadsheets | TakeoffPro |
|---|---|---|
| Measurement source | Scale ruler on paper plans | Digital measurement on PDF plans |
| Daily records | Handwritten DC diary | Auto-generated daily logs with timestamps |
| Quantity reconciliation | Manual spreadsheet comparison | Real-time contract vs. measured dashboard |
| Audit trail | File cabinets + email chains | Every measurement tied to user, date, plan page |
| Team collaboration | Email PDFs back and forth | Real-time sync across all inspectors |
| Monthly estimate prep | Days of spreadsheet work | One-click export in pay item format |
| Field accessibility | Paper plans in the trailer | Browser-based — any tablet, any location |

### Section: Coming Soon (aspirational features to market)
- **AI-Powered Quantity Extraction** — Auto-detect quantities from spec tables and plan notes
- **ProjectWise Integration** — Pull plan sets directly from your NJTA/NJDOT document management system
- **Automated Monthly Estimate Generation** — Format quantities into NJDOT DC-84 payment estimate format
- **Photo Documentation** — Attach geo-tagged field photos to annotations for dispute resolution
- **SiteManager / AASHTOWare Integration** — Sync quantities with NJDOT's official construction management system
- **Contractor Portal** — Give contractors read-only access to measured quantities before payment disputes arise

### Section: Enterprise CTA
- Headline: "Ready to modernize your quantity tracking?"
- Subline: "Join NJTA engineering teams already measuring smarter."
- Primary: "Request a Demo" / Secondary: "Start Free Trial"
- Trust: "Your data stays yours", "SOC 2 compliance roadmap", "99.9% uptime SLA", "Dedicated onboarding for NJTA teams"
- Contact: "Questions? Reach us at sales@takeoffpro.com"

### Footer
- Columns: Product (Features, Pricing, Roadmap), Resources (Documentation, API, Support), Company (About, Contact, Privacy, Terms)
- Bottom: copyright + "Purpose-built for New Jersey infrastructure"

## Technical Details

### File: `src/pages/Landing.tsx`
Complete rewrite. All new data arrays, new sections, new copy. Same component architecture (nav + sections + footer). Adds new icons from lucide-react (Building2, Scale, ShieldCheck, Smartphone, BarChart3, Camera, Globe, etc). The "Request a Demo" button navigates to `/auth` for now (or could scroll to a contact form — but keeping it simple).

### File: `index.html`
- Title: "TakeoffPro — Digital Quantity Takeoff for NJTA & NJDOT Construction"
- og:title / twitter:title: "TakeoffPro | Quantity Takeoff for NJ Turnpike & DOT Projects"
- og:description / twitter:description: "Measure from PDF plans, track contract vs. measured quantities, and export audit-ready reports. Purpose-built for NJTA and NJDOT construction inspection teams."
- meta description updated to match

## Files Modified
1. `src/pages/Landing.tsx` — full rewrite with NJTA/NJDOT enterprise positioning
2. `index.html` — updated meta tags and SEO copy

