

# Landing Page Completion — No Placeholders, Per-Project Pricing

## What changes

### 1. Add FAQ section (after Comparison, before Roadmap)
Using the existing `Accordion` component. Real questions with real answers — no "coming soon" hedging:
- Is my data secure? → Yes, encrypted at rest and in transit, hosted in US data centers, role-based access controls
- Does it work offline? → Plans load in-browser; measurements sync when reconnected
- What browsers/tablets are supported? → Any modern browser — Chrome, Safari, Edge. Works on iPad, Surface, Android tablets. No app install.
- Can contractors see our measurements? → Only if you grant access. Contractor portal is on the roadmap.
- What plan formats are supported? → PDF plan sets from any source — ProjectWise, Bluebeam, scanned documents
- Do we need IT to install anything? → No. Browser-based. No software, no plugins, no VPN.
- How is TakeoffPro priced? → Per-project pricing tailored to your contract scope. Every project is different — we configure the system to match your specific pay items, spec edition, and team size. Contact us for a quote.
- Is there an API? → API access is available for enterprise integrations. Contact us.

### 2. Add demo request form (in the CTA section)
Replace the simple "Request a Demo" / "Start Free Trial" buttons with an inline form:
- Fields: Name, Email, Organization, Role (free text), Message (optional)
- Submit saves to a new `demo_requests` table
- Success state shows "We'll reach out within 24 hours"
- Keep "Start Free Trial" button alongside the form

### 3. Fix "Start Free Trial" button visibility
Add `border-white/30` so it's visible on dark backgrounds.

### 4. Remove dead footer links
Replace Documentation/API/Support placeholder `<span>` elements with a single "Contact" email link and remove the pretense of pages that don't exist. Keep Product links (they scroll). Remove About/Privacy/Terms dead spans — either remove the Company column or keep only Contact.

### 5. Remove pricing section entirely
No fixed tiers. The FAQ covers pricing ("per-project, contact us"). The CTA form captures leads.

### 6. Add social proof stats bar (after hero, before pain points)
Not fake logos. Real metrics from the product: "Measure from PDF plans", "NJTA Spec Compatible", "Browser-Based — No Install", "Audit-Ready Export". These are capability proof points, not client logos we don't have.

### 7. Scroll animations
Add `framer-motion` viewport-triggered fade-in-up on each section. Stagger on grid items.

## Database
- New `demo_requests` table: `id` (uuid), `name` (text), `email` (text), `organization` (text), `role` (text), `message` (text nullable), `created_at` (timestamptz)
- RLS: public insert (anon), no select policy (admin reads via dashboard/direct query)

## Files Modified
1. `src/pages/Landing.tsx` — FAQ, demo form, social proof stats, animation wrappers, footer cleanup, button fix
2. Database migration — `demo_requests` table

