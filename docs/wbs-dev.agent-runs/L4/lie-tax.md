# Lie Tax — Public Claim Audit

**Generated:** 2026-05-29  
**Auditor:** L4 Truth Auditor  
**Sources scanned:** `src/pages/Landing.tsx`, `docs/STORE_LISTING.md`, `public/llms.txt`, `docs/wbs-dev.agent-runs/L1/marketing-copy.json`, `docs/wbs-dev.agent-runs/L2/stream-19.json`  
**L2 orphan/broken/partial streams found:** stream-19 has 1 partial item (`demo-requests`); no other streams flagged orphan/broken/partial.

---

## 🔴 FRAUD-RISK

Claims that could expose the company to legal liability, regulator scrutiny, app-store rejection, or loss of a contract if verified false by a customer.

| # | Claim | Source : Line | Reality | Severity | Fix Effort |
|---|-------|---------------|---------|----------|------------|
| F-1 | **"99.9% uptime SLA"** (trust-signal badge) | `Landing.tsx:191` | No SLA agreement exists. The app is hosted on Lovable/Supabase with no contractual uptime commitment. Any NJTA procurement officer will ask for the SLA document. | fraud-risk | Medium — either remove the badge or draft and publish an actual SLA doc backed by Supabase's own 99.9% commitment |
| F-2 | **"API access is available for enterprise integrations — SiteManager, AASHTOWare, or internal reporting systems"** | `Landing.tsx:232` (FAQ) | No public or private API exists. There is no API surface in the codebase (no `/api` routes, no documented endpoints, no API key management). Telling prospects "contact us to discuss" implies imminent availability. | fraud-risk | Low to remove; High to fulfill the claim |
| F-3 | **Store listing support email `support@takeoffpro.app` and privacy policy / terms URLs are all marked `TODO`** | `STORE_LISTING.md` (support + legal URLs section) | App Store / Play Store policies require valid support, privacy-policy, and terms-of-service URLs before submission. Submitting with placeholder `*(TODO)*` annotations or dead links will cause rejection or post-publication removal. | fraud-risk | Medium — register mailbox + publish minimal Privacy Policy + ToS pages |

---

## 🟠 MISLEADING

Claims that overstate present capability, misrepresent product status, or assert facts without a verifiable source. A careful prospect or auditor would be misled.

| # | Claim | Source : Line | Reality | Severity | Fix Effort |
|---|-------|---------------|---------|----------|------------|
| M-1 | Workflow step 1: **"Drop the PDF plan set from ProjectWise or your file system"** — implies ProjectWise works today | `Landing.tsx:124` | "ProjectWise Integration" is explicitly listed in the Roadmap section (`Landing.tsx:180`) as a future feature. Current support is file-system upload only. | misleading | Low — change copy to "your file system (ProjectWise integration coming soon)" |
| M-2 | **"Start Free Trial"** CTA button navigates to `/auth` | `Landing.tsx:382` | No free trial offering exists. The FAQ states pricing is per-project by quote only (`Landing.tsx:228`). The button label creates a false expectation; users reach a generic auth screen with no trial framing. | misleading | Low — rename button to "Get Started" or "Request Access", or build a trial flow |
| M-3 | **"Dedicated onboarding for NJTA teams"** trust-signal badge | `Landing.tsx:192` | No onboarding materials, playbooks, dedicated CSM role, or onboarding SLA exist in the codebase or documentation. This is aspirational. | misleading | Low to remove; Medium to fulfill |
| M-4 | **"30+ days — Payment delays from quantity disputes"** stat | `Landing.tsx:48` | Presented as industry fact with no citation, source study, or qualifying language. If a customer asks for the reference, none can be provided. | misleading | Low — add "(industry estimate)" qualifier or link a source |
| M-5 | **"5–15% variance — DC form errors compound monthly"** stat | `Landing.tsx:55` | Same issue as M-4: stated as fact, no citation or methodology. | misleading | Low — qualifier or citation |
| M-6 | **"Real-time sync across all inspectors"** (comparison table) | `Landing.tsx:173` | Sync is outbox-based (IndexedDB queue → Supabase on reconnect). Supabase Realtime is subscribed in some hooks (`useProject`, `useOutbox`) for cache invalidation, but inspectors do **not** see each other's annotations in real time — they see them after sync. "Real-time" is an overstatement of eventual-consistency sync. | misleading | Low — change to "Automatic sync across all inspectors" |
| M-7 | **STORE_LISTING long description:** "capture field photos with GPS context" listed as a current feature | `STORE_LISTING.md` (long description) | The Landing page roadmap section (`Landing.tsx:183`) explicitly lists "Photo Documentation — Attach geo-tagged field photos to annotations" as a **future** roadmap item. `camera.ts` exists but photo attachment to annotations is roadmap-only. The store listing contradicts the landing page. | misleading | Low — remove photo claim from store description until roadmap item ships |
| M-8 | Capability section: **"Roll up all measurements into a pay item summary report that mirrors the monthly estimate format. CSV and PDF exports ready"** | `Landing.tsx:97–100` | Roadmap item (`Landing.tsx:181`) says "Automated Monthly Estimate Generation — Format quantities into NJDOT DC-84 payment estimate format" is future work. `export-utils.ts` produces generic XLSX exports; the DC-84 specific format does not exist. The capabilities section implies it works today. | misleading | Medium — qualify copy as "CSV/XLSX export" and move DC-84 phrasing to roadmap only |
| M-9 | **"SOC 2 compliance roadmap"** listed as a trust signal badge (present tense) | `Landing.tsx:189` | The phrase is a roadmap claim formatted as a present-tense trust badge alongside "Your data stays yours" and "99.9% uptime SLA". Prospects may read it as current compliance status. | misleading | Low — relabel to "SOC 2 (planned)" or move to roadmap section |
| M-10 | **"Background sync — drains queued work even while the app is closed"** (store listing feature bullet) | `STORE_LISTING.md` (long description) | Background sync (`background-sync.ts`) is native-only via `@transistorsoft/capacitor-background-fetch`. The web app (the primary distribution channel — `public/llms.txt` lists only browser-based pages) has no true background sync; foreground-only `visibilitychange` triggers are used. The store listing does not qualify this as native-only. | misleading | Low — add "(native app only)" qualifier |

---

## 🟡 COSMETIC

Claims that are inaccurate but unlikely to drive a purchase decision or create legal exposure.

| # | Claim | Source : Line | Reality | Severity | Fix Effort |
|---|-------|---------------|---------|----------|------------|
| C-1 | Browser mockup address bar shows **`app.takeoffpro.com`** | `Landing.tsx:409` | The actual app lives at `draw-quantify-dash.lovable.app`. The domain `app.takeoffpro.com` does not exist (no DNS, no redirect). | cosmetic | Low — update URL in mockup to actual domain, or register + point the custom domain |
| C-2 | **"Zero Install"** badge + FAQ: "No app install, no plugins, no VPN" | `Landing.tsx:388`, `Landing.tsx:224` | A native iOS/Android app is in active development (`capacitor.config.ts`, `STORE_LISTING.md`). The zero-install claim is accurate for the web version but creates a contradiction with the store listing strategy. | cosmetic | Low — qualify as "No install required for browser access" |
| C-3 | **"Your data stays yours"** trust-signal badge | `Landing.tsx:188` | Data is stored in Supabase (a third-party SaaS). Customers cannot self-host or export their full database. The claim is emotionally accurate but technically ambiguous. | cosmetic | Low — add a brief tooltip or FAQ entry clarifying Supabase hosting and export options |
| C-4 | Demo completion screen: **"Sign up to save your work, collaborate, and export reports"** | `src/pages/Demo.tsx:64` | Demo measurements are ephemeral and not associated with a real project. "Save your work" implies the demo session data persists after sign-up, which it does not. | cosmetic | Low — change to "Sign up to start measuring on your own projects" |

---

## Prioritized Remediation List

Ordered by legal/revenue risk then fix effort.

### Immediate (before any customer presentation or store submission)

1. **[F-3]** Register `support@takeoffpro.app`, publish `/privacy` and `/terms` pages — required for app store compliance.
2. **[F-1]** Remove "99.9% uptime SLA" badge until a written SLA is drafted and backed by Supabase SLA terms.
3. **[F-2]** Change FAQ answer for "Is there an API?" to "API access is on our roadmap. Contact us to discuss future integration needs." — removes current-availability implication.

### Short-term (before first paid customer or NJTA demo)

4. **[M-1]** Fix workflow step 1 copy: clarify ProjectWise is roadmap, not current.
5. **[M-2]** Rename "Start Free Trial" to "Get Started" or "Request Access".
6. **[M-6]** Change comparison row to "Automatic sync across all inspectors" — drop "real-time."
7. **[M-7]** Remove photo/GPS-context claim from `STORE_LISTING.md` long description.
8. **[M-8]** Qualify Monthly Estimate capability copy — DC-84 specific format is roadmap.
9. **[M-9]** Relabel SOC 2 badge to "SOC 2 (planned)" or move to roadmap section.
10. **[M-10]** Add "(native app only)" qualifier to background-sync bullet in store listing.

### Medium-term (before public launch)

11. **[M-3]** Either build an onboarding resource (template, playbook, dedicated contact) or remove the "Dedicated onboarding" trust badge.
12. **[M-4 / M-5]** Add citations or qualifying language ("industry estimates vary") to the 30+ days and 5–15% pain-point stats.
13. **[C-1]** Register `app.takeoffpro.com` and point it at the app, or update the hero mockup URL.
14. **[C-2]** Qualify "Zero Install" badge to "No install for browser access."
15. **[C-4]** Fix demo sign-up CTA copy.
16. **[C-3]** Add FAQ entry clarifying Supabase hosting and available data-export options.

---

## Coverage Notes

- **L2 partial item `demo-requests`** (stream-19): The `demo_requests` table exists in migrations and the form submits correctly, but there is no Admin UI to view submissions. This is an **operational gap**, not a public false claim — not included in the lie-tax table. Recommended fix: build a simple `/admin/demo-requests` page or set up a Supabase dashboard alert.
- **No L2 streams with status=orphan or status=broken** were found; all 20 streams are either `complete` or `partial`.
- `llms.txt` is accurate and makes no overblown claims — no issues found.
