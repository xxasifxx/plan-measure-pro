## Problem with current /fajar page

- Pricing reads as enterprise: **AED 95K–145K build + AED 6K–9K/month**. For an SMB equipment rental shop competing on margin, this kills the pitch on first read.
- Page is heavy on abstract animated mocks (status grids, phone bubbles) but light on **what the actual delivered product looks like** — no realistic site screenshots, no proof of the customer-facing experience.
- Marketing narrative is thin on the real value driver: **low fleet vacancy via SEO tuned to how UAE rental customers actually search** (Google → "excavator rental Jebel Ali", WhatsApp click, price visible).

## Goals of this revision

1. **Reprice for an SMB on margin** — frame as a small upfront + low monthly, paid back by 1–2 extra rental days/month.
2. **Add realistic product screenshots** — generate AI images of the proposed customer-facing site (fleet listing page, machine detail page with live availability, mobile booking flow, admin dashboard, WhatsApp agent thread) and showcase them in proper device frames.
3. **Lead with vacancy reduction**, not "enterprise platform." Reframe copy around how rental customers in the UAE research → decide → book.
4. Tighten the pitch so it reads like a proposal to an owner-operator, not a CIO.

## Changes to `src/pages/FajarPitch.tsx`

### 1. Pricing section (rewrite)

Replace the two AED 95K–145K / 6K–9K cards with a three-tier SMB-friendly structure:

| Tier | One-time | Monthly | Who it's for |
|------|----------|---------|--------------|
| **Starter** — site + live availability + SEO foundation | AED 14,500 | AED 1,200 | Get found on Google, show what's available |
| **Growth** *(recommended)* — Starter + WhatsApp maintenance agent + admin dashboard | AED 24,000 | AED 1,900 | Stop double-bookings, automate the group chat |
| **Full** — Growth + WhatsApp customer-booking agent + Arabic site + GBP + monthly SEO content | AED 38,000 | AED 2,800 | Convert WhatsApp DMs into bookings 24/7 |

Add an ROI line under the table: *"At an average AED 1,800/day rental, the Growth plan pays for itself with 1.5 extra rental-days per month."*

Remove the "indicative — final scope after discovery" hedging language; replace with a clean "Pay monthly, cancel any time after month 6. Code and data are yours."

### 2. New section: "What your site will actually look like"

Insert a new section between the WhatsApp demo (section 5) and the SEO section (current 6). Title: **"This is what your customers will see."**

Five realistic screenshots in a horizontally-scrolling gallery on mobile, 2-column grid on desktop, each in a device frame (browser chrome for desktop shots, phone frame for mobile shots) with a one-line caption:

1. **Desktop fleet listing page** — grid of machine cards with photo, daily rate, "Available now / Available 16 Jun" status pill, category filters in sidebar. Caption: *"Customers see exactly what's free, with prices."*
2. **Desktop machine detail page** — large hero photo of CAT 320, specs table, 14-day availability calendar, "Reserve via WhatsApp" CTA, related machines. Caption: *"One page per machine — Google's favorite kind of content."*
3. **Mobile booking flow** — phone-frame screenshot of the same detail page on mobile, then the WhatsApp handoff. Caption: *"60% of UAE rental searches are mobile. We design for that."*
4. **Admin dashboard** — fleet status overview, today's bookings, maintenance queue, revenue/utilization tile. Caption: *"You see vacancy at a glance, on phone or laptop."*
5. **Google search result mock** — SERP showing their listing with rich snippet (price, availability, 4.8★). Caption: *"Tuned to how UAE customers actually search."*

**How the screenshots are produced:** generate them with the `google/gemini-3.1-flash-image-preview` model via a one-off script writing PNGs to `public/fajar/`, then `<img>` them in the page. Prompts include realistic UAE construction equipment branding, AED pricing, dark/light theme matching the proposal, real machine model names (CAT 320, BOMAG BW 213, Tadano GR-300). No screenshots saved to `/mnt/documents/` — they live in the project's `public/` folder so they ship with the page.

### 3. Reframe hero + problem section around vacancy

- Hero H1 changes from *"Stop losing rentals to phone tag."* → **"Cut fleet vacancy. Win the Google search before the phone rings."**
- Hero sub: rewrite to lead with *"Rental customers in the UAE Google → tap WhatsApp → decide in under 5 minutes. Most equipment rental sites lose them at step one because they don't show what's available or what it costs."*
- Problem cards (currently 3): keep structure but rewrite to:
  1. *"Customers can't see availability — so they call your competitor too."* (with a small stat: "76% of UAE B2B buyers research online before contacting a vendor — Google/Bain GCC SME study")
  2. *"Group-chat maintenance updates get buried — and you double-book broken machines."*
  3. *"Your site doesn't rank for 'excavator rental Dubai' — your competitors' do."*

### 4. New section: "How rental customers actually research" (between problem and live calendar)

A 4-step horizontal flow with small illustrative thumbnails:

```text
Google search → SERP click → Site (price+availability) → WhatsApp booking
"crane hire        Your listing      One-tap            Auto-reserved
 Abu Dhabi"        with rich          "Reserve via       in your fleet
                   snippet            WhatsApp"          DB
```

Caption: *"Every step you lose a customer is a vacant machine-day. We engineer for zero drop-off."*

### 5. Tighten copy throughout

- Replace "platform", "engine", "operations" framing with concrete owner-operator language: *"your fleet"*, *"your group chat"*, *"your Friday bookings"*.
- Drop "Proposal for Fajar Al Mustaqbal General Trading & Cont. LLC · UAE" → soften to *"Prepared for Fajar Al Mustaqbal Equipment Rental"*.
- Roadmap: keep 12-week structure but rename phases to outcome-led: *Phase 1: Get found*, *Phase 2: Stop double-bookings*, *Phase 3: Book in your sleep*.
- FAQ: add one entry — *"We're a small business. Is this overkill?"* with answer about the Starter tier and 1.5-day payback.

### 6. Out of scope

- No backend changes, no auth, no DB.
- No new dependencies.
- No edits to other routes.
- WhatsApp Business API is not actually wired — still a pitch.

## Files

- **Create**: `scripts/generate-fajar-screenshots.ts` (one-off Node script that calls Lovable AI Gateway image model, writes 5 PNGs to `public/fajar/`). Run once with `bun run scripts/generate-fajar-screenshots.ts`. After generation, the script is kept for re-runs but is not part of the build.
- **Create**: `public/fajar/listing.png`, `public/fajar/machine-detail.png`, `public/fajar/mobile-booking.png`, `public/fajar/admin.png`, `public/fajar/serp.png` (outputs of the script).
- **Edit**: `src/pages/FajarPitch.tsx` — rewrite hero, problem, add research-flow section, add screenshots gallery section, replace investment section, tighten copy across the page.

No changes to `src/App.tsx`, no DB migrations, no edge functions, no new shadcn components.