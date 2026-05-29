# Sales & Pitch

## Purpose
Converts external stakeholders — NJTA/NJDOT construction management firms, potential partner consultants, and enterprise prospects — into demo requests and eventual customers. Distinct from the product itself because these pages are unauthenticated, marketing-copy-driven surfaces that communicate value, establish credibility, and route visitors toward a trial or direct contact.

## Surfaces (files)
- `src/pages/Landing.tsx` — primary public marketing page: pain-point stats, capability pairs, workflow steps, persona breakdowns, comparison table, pricing, FAQ, demo request form (writes to `demo_requests`); framer-motion
- `src/pages/McfaPitch.tsx` — partner pitch for MCFA: proposal data from `MCFA_BYOR_Proposal.pdf`; dark engineering theme; pricing calculator
- `src/pages/FajarPitch.tsx` — partner pitch for Fajar (equipment rental): availability grid, WhatsApp CTA, seed-based pseudo-random data
- `src/pages/P6XmlDemo.tsx` — live PMXML round-trip demo: parse sample, show DCMA, export RE memo; linked from `/mcfa/p6-xml`
- `src/pages/Demo.tsx` — interactive product demo (unauthenticated); 12-step guided walkthrough
- `public/llms.txt` — LLM-readable site description
- `public/sitemap.xml` — SEO sitemap: landing, demo, mcfa, fajar, p6-xml, mcfa/p6-xml
- `public/robots.txt` — crawl permissions
- `src/App.tsx` — routes `/landing`, `/demo`, `/mcfa`, `/fajar`, `/p6-xml`, `/mcfa/p6-xml` as public

## Acceptance criteria
- `/landing` renders without auth; demo-request form submits to `demo_requests` with email, name, message.
- Pain-point stats, workflow steps, persona cards visible above the fold on desktop and mobile.
- `/mcfa` and `/fajar` render their partner content without login.
- `/demo` reachable from Landing CTA; begins interactive walkthrough.
- `/p6-xml` demonstrates PMXML parsing and DCMA scoring with sample data.
- `sitemap.xml` includes all six public routes.
- `llms.txt` accurately describes product and links correct routes.

## Current state vs criteria
- **Landing page**: implemented — full marketing with framer-motion, contact form, FAQ, comparison table.
- **Demo CTA linkage**: implemented — Landing → `/demo`.
- **McfaPitch / FajarPitch**: implemented — both render partner-specific data without auth.
- **P6XmlDemo**: implemented — uses `lib/p6xml/` parser and sample; DCMA integration visible.
- **sitemap.xml completeness**: implemented — 6 URLs including `/mcfa/p6-xml`.
- **llms.txt accuracy**: implemented.
- **demo_requests table existence**: **unverified** — `Landing.tsx` calls `supabase.from('demo_requests').insert()`; no migration found creating this table; insert may silently fail.
- **Mobile responsiveness**: **partial** — Tailwind responsive classes present but framer-motion `staggerContainer` may cause layout shift on low-end tablets.

## Cross-stream handoffs
- **Feeds into** onboarding-and-tutorials: `/landing` → `/demo` is unauthenticated funnel; `Demo.tsx` uses full mobile component stack.
- **Feeds into** compliance-and-audit (indirectly): `P6XmlDemo` uses `DcmaPanel` logic as a live proof point.
- **Consumed by** identity-and-access: `Landing.tsx` CTAs route `navigate('/auth')`.

## Risks / debt
- `demo_requests` table referenced but no migration found; contact form may be silently broken in production.
- `FajarPitch.tsx` uses deterministic seed to generate fake equipment availability; if interpreted as real fleet data, misleads during sales demos.
- `McfaPitch` and `FajarPitch` hard-code proposal specifics in source; updating pricing/scope requires code deploy rather than CMS edit.
- `llms.txt` and `sitemap.xml` hard-code production domain (`draw-quantify-dash.lovable.app`); staging/preview deployments serve incorrect canonical URLs.
