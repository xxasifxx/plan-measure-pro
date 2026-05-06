## Goal

Build a new standalone landing page at `/fajar` pitching custom website + booking-management software to **Fajar Al Mustaqbal Equipment Rental (UAE)**. The page sells three things, in this order:

1. **Live machinery availability** (real-time fleet calendar — the current fajaralmustaqbal.ae site has none)
2. **WhatsApp-driven operations** (group-chat agent that auto-flips machines to maintenance and auto-creates reservations)
3. **Strong UAE/GCC SEO** for high-intent equipment-rental keywords

This is a **sales pitch page only** — no real booking backend, no real WhatsApp wiring. All visuals are mocked/animated to demonstrate the proposed product.

## Route & file

- New route: `/fajar` → new file `src/pages/FajarPitch.tsx`
- Add `<Route path="/fajar" element={<FajarPitch />} />` in `src/App.tsx`
- Update `document.title` and `<meta description>` from inside the page (same pattern as `McfaPitch.tsx`)

## Visual identity (project-consistent, but warmer)

- Reuse the project's dark-navy / slate / JetBrains Mono engineering aesthetic established in `McfaPitch.tsx` — keeps it on-brand for the studio
- Add a desert-amber accent (`hsl(38 92% 55%)`) used sparingly for CTAs and the WhatsApp green (`hsl(142 70% 45%)`) for chat-mock elements
- Bilingual touch: small Arabic tagline under the hero H1 (RTL inline span), e.g. "حلول حجز المعدات الذكية" — signals UAE market fit, not a full RTL page
- All copy in English, UAE/GCC framing (AED pricing, Dubai/Abu Dhabi/Sharjah mentions)

## Sections (top → bottom)

1. **Sticky top ribbon** — "Proposal for Fajar Al Mustaqbal General Trading & Cont. LLC · UAE" + "Book intro call" CTA (mailto)
2. **Hero**
   - H1: *"Stop losing rentals to phone tag."*
   - Sub: real-time fleet availability + WhatsApp agent + UAE-tuned SEO, in one platform
   - Two CTAs: "See live demo below" (smooth-scroll) + "WhatsApp us" (`https://wa.me/...` placeholder)
   - Right side: animated **fleet-availability grid** mock (5 categories × 7 days, cells flip green/amber/red on a loop)
3. **The problem** — 3 cards built from observations of the current site:
   - No availability shown → customers must call/WhatsApp to ask
   - Manual maintenance tracking → double-bookings on broken machines
   - Static WordPress site → ranks poorly for "excavator rental Dubai" etc.
4. **Live availability calendar (mock)**
   - Interactive React component: category tabs (Earthmoving, Compaction, Cranes, Loading & Lifting, Power), each shows a 14-day grid per machine unit with status pills (Available / Reserved / Maintenance)
   - Clicking a green cell pops a fake "Reserve" sheet — proves the UX, no backend
   - Caption: "What your customers will see — synced with your WhatsApp agent in real time"
5. **WhatsApp agent — animated demo** *(the centerpiece)*
   - Two side-by-side phone-frame mocks that animate on scroll-into-view:
     - **Mock A — Maintenance flow**: Operator types in group chat: *"CAT 320 hydraulic leak, down for repair"* → agent reply: *"Acknowledged. CAT 320 (Unit #E-04) marked maintenance through 14 Jun. Will auto-restore on your 'back online' message or after 7 days."* → calendar cell on the right flips amber
     - **Mock B — Booking flow**: Customer DMs sales WhatsApp: *"Need a 10t roller next Monday for 3 days, Jebel Ali"* → agent: *"BOMAG BW 213 available 16–18 Jun, AED 4,500. Reply YES to hold for 2 hours."* → customer "YES" → calendar cell flips red, confirmation card appears
   - Below: "How it works" 4-step strip (Listen → Parse → Update fleet → Confirm)
   - Trust line: 7-day max maintenance lock with auto-revert + manual override (addresses "what if they forget to mark it back online")
6. **SEO engine**
   - Targeted keyword cluster cards: "excavator rental Dubai", "crane hire Abu Dhabi", "compaction roller Sharjah", "plant hire UAE", Arabic equivalents (تأجير معدات ثقيلة دبي)
   - Bullets: per-machine landing pages auto-generated from the fleet DB, schema.org `Product` + `Offer` markup, Arabic/English hreflang, Core Web Vitals budget, Google Business Profile sync
   - Visual: a fake SERP card mock showing their result with rich snippets (price range, availability badge, rating)
7. **What we deliver** — 3-column scope:
   - **Platform**: Next.js site + headless fleet/booking DB + admin dashboard
   - **WhatsApp layer**: WhatsApp Business Cloud API integration, group-listener agent, customer-DM agent, fallback to human handoff
   - **SEO + content**: keyword research, per-machine pages, Arabic translations, GBP optimization, monthly content (3 posts)
8. **Phased roadmap** (mirrors the McfaPitch phase-card pattern)
   - **Phase 1 (Weeks 1–4)**: Fleet DB, public availability calendar, basic site + SEO foundation
   - **Phase 2 (Weeks 5–8)**: WhatsApp maintenance agent + admin dashboard
   - **Phase 3 (Weeks 9–12)**: WhatsApp customer booking agent, payment hold, Arabic site, GBP integration
9. **Investment** — AED-denominated indicative ranges (one-time build + monthly retainer for hosting/agent/SEO). Clear note: final scope after discovery call
10. **FAQ** — accordion: WhatsApp Business API approval timeline, what happens if agent misreads a message, data residency (UAE), handoff to human, ownership of code/data
11. **CTA footer** — "Book a 30-minute discovery call" mailto + WhatsApp button + small print with company legal name

## Technical details

- Pure presentational page, no Supabase calls, no auth, no DB writes
- All "live" elements (calendar flips, phone-mock typing, SERP highlight) driven by `useEffect` + `setInterval` / `IntersectionObserver` for scroll-triggered animations
- Use existing `@/components/ui/*` (Card, Button, Badge, Tabs, Accordion) — no new shadcn installs
- Icons from `lucide-react` only (Wrench, MessageCircle, Calendar, Search, MapPin, Globe, etc.)
- Fully responsive; phone mocks stack on `<md`, calendar grid horizontally scrolls on mobile
- No new dependencies, no migrations, no edge functions
- Out of scope: actual WhatsApp API wiring, real booking persistence, payments, i18n framework (single inline Arabic phrase only), changes to any other route or to `index.html` global meta

## Files touched

- **Create**: `src/pages/FajarPitch.tsx`
- **Edit**: `src/App.tsx` (one import + one `<Route>`)
