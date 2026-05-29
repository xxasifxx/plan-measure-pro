# Marketing / Sales Promises Inventory (subagent sub_gh9v79bb, capable model, 2026-05-29)

Source: Landing.tsx, FajarPitch.tsx, McfaPitch.tsx, STORE_LISTING.md, index.html

## TakeoffPro / NJTA surface

```yaml
- id: pdf-plan-measurement
  claim: "Measure from PDF plans - draw on tablets or walk the site with GPS trace mode"
  source: src/pages/Landing.tsx:126
  category: takeoff
  status_guess: shipped

- id: njta-pay-item-import
  claim: "Upload bid schedule or import directly from NJTA Standard Specs. Pay items auto-map to Section 100-900 with correct units (LF, SY, CY, TON, LS, EA)."
  source: src/pages/Landing.tsx:77
  category: takeoff
  status_guess: partial

- id: contract-vs-measured-tracking
  claim: "Real-time variance between contract bid quantities and field-measured. Color-coded alerts flag overruns before change orders."
  source: src/pages/Landing.tsx:80
  category: reporting
  status_guess: partial

- id: inspector-daily-reports
  claim: "Each inspector's measurements export as a daily log - by pay item, with location stamps, notes, plan page refs. Replaces handwritten DC diaries."
  source: src/pages/Landing.tsx:93
  category: field-ops
  status_guess: shipped

- id: monthly-estimate-export
  claim: "Roll up all measurements into a pay item summary report that mirrors the monthly estimate format. CSV and PDF exports ready for the RE's review."
  source: src/pages/Landing.tsx:98
  category: reporting
  status_guess: partial

- id: multi-sheet-plan-navigation
  claim: "Upload full contract plan set. TOC auto-detects sheets. Calibrate once per sheet."
  source: src/pages/Landing.tsx:109
  category: takeoff
  status_guess: partial

- id: role-based-access-control
  claim: "REs and PMs configure/review. Field inspectors measure/annotate. Separation of duties."
  source: src/pages/Landing.tsx:114
  category: admin
  status_guess: shipped

- id: gps-trace-mode
  claim: "Walk & trace - select pay item, start GPS trace, walk the area. Position appears as live dot on plan with breadcrumb trail - Kalman-smoothed."
  source: src/pages/Landing.tsx:590
  category: field-ops
  status_guess: shipped

- id: gps-to-plan-calibration
  claim: "Calibrate in 60 seconds - stand at 2-3 known points, tap matching spots on the plan. Builds affine transform mapping GPS to plan coordinates."
  source: src/pages/Landing.tsx:589
  category: field-ops
  status_guess: shipped

- id: offline-mode
  claim: "Plans load in browser and remain accessible. Measurements sync when connection restored. GPS trace mode buffers locally until sync."
  source: src/pages/Landing.tsx:208
  category: offline
  status_guess: partial

- id: background-sync
  claim: "Background sync - drains queued work even while app is closed"
  source: docs/STORE_LISTING.md:26
  category: offline
  status_guess: partial

- id: biometric-unlock
  claim: "Face ID / Biometric - local unlock only, never transmitted"
  source: docs/STORE_LISTING.md:51
  category: admin
  status_guess: shipped

- id: field-photo-attachment-store-listing
  claim: "Capture field photos with GPS context ... Camera - attach field photos to annotations"
  source: docs/STORE_LISTING.md:17
  category: field-ops
  status_guess: aspirational

- id: re-review-workflow
  claim: "Resident-Engineer review workflow with approve / reject / re-review"
  source: docs/STORE_LISTING.md:24
  category: field-ops
  status_guess: shipped

- id: browser-based-no-install
  claim: "Browser-Based - No Install. No plugins, no VPN."
  source: src/pages/Landing.tsx:197
  category: other
  status_guess: shipped

- id: audit-ready-export
  claim: "Every measurement tied to user, date, plan page... timestamps every measurement with user, location, plan sheet"
  source: src/pages/Landing.tsx:65
  category: reporting
  status_guess: partial

- id: real-time-team-sync
  claim: "Real-time sync across all inspectors"
  source: src/pages/Landing.tsx:173
  category: field-ops
  status_guess: partial

- id: soc2-compliance-roadmap
  claim: "SOC 2 compliance roadmap"
  source: src/pages/Landing.tsx:189
  category: admin
  status_guess: aspirational

- id: uptime-sla-99-9
  claim: "99.9% uptime SLA"
  source: src/pages/Landing.tsx:190
  category: admin
  status_guess: aspirational

- id: dedicated-onboarding
  claim: "Dedicated onboarding for NJTA teams"
  source: src/pages/Landing.tsx:191
  category: admin
  status_guess: aspirational

# Roadmap items in Landing.tsx (lines 178-185)

- id: ai-quantity-extraction
  claim: "AI-Powered Quantity Extraction - Auto-detect quantities from spec tables and plan notes"
  source: src/pages/Landing.tsx:179
  category: ai
  status_guess: aspirational

- id: projectwise-integration
  claim: "ProjectWise Integration - Pull plan sets directly from your NJTA/NJDOT DMS"
  source: src/pages/Landing.tsx:180
  category: integrations
  status_guess: aspirational

- id: automated-monthly-estimate-dc84
  claim: "Automated Monthly Estimate Generation - format quantities into NJDOT DC-84 payment estimate format"
  source: src/pages/Landing.tsx:181
  category: reporting
  status_guess: aspirational

- id: photo-documentation-roadmap
  claim: "Photo Documentation - Attach geo-tagged field photos to annotations for dispute resolution"
  source: src/pages/Landing.tsx:182
  category: field-ops
  status_guess: aspirational

- id: sitemanager-aashtoware-integration
  claim: "SiteManager / AASHTOWare Integration - Sync quantities with NJDOT's official construction management system"
  source: src/pages/Landing.tsx:183
  category: integrations
  status_guess: aspirational

- id: contractor-portal
  claim: "Contractor Portal - Give contractors read-only access to measured quantities before payment disputes arise"
  source: src/pages/Landing.tsx:184
  category: admin
  status_guess: aspirational

- id: api-access
  claim: "API access for enterprise integrations - SiteManager, AASHTOWare, or internal reporting systems."
  source: src/pages/Landing.tsx:232
  category: integrations
  status_guess: aspirational
```

## Fajar Al Mustaqbal pitch (FajarPitch.tsx)

```yaml
- id: fajar-live-availability-calendar
  claim: "Per-unit calendar across all five categories, updated in real time by the booking engine and your WhatsApp agent."
  source: src/pages/FajarPitch.tsx:449
  category: scheduling
  status_guess: partial  # only demo/mockup component exists

- id: fajar-whatsapp-booking-agent
  claim: "Customer-DM booking agent - Customer DM -> soft-hold reservation ... payment link sent via WhatsApp"
  source: src/pages/FajarPitch.tsx:298
  category: integrations
  status_guess: aspirational

- id: fajar-whatsapp-maintenance-agent
  claim: "Group-chat agent reads maintenance - Operator group chat -> auto fleet lock ... auto-restore on 'back online' reply"
  source: src/pages/FajarPitch.tsx:288
  category: field-ops
  status_guess: aspirational

- id: fajar-per-machine-seo-pages
  claim: "Per-machine landing pages - exactly the kind of page Google rewards"
  source: src/pages/FajarPitch.tsx:309
  category: other
  status_guess: aspirational

- id: fajar-arabic-site-hreflang
  claim: "Full Arabic site (hreflang) - bilingual + monthly SEO content"
  source: src/pages/FajarPitch.tsx:311
  category: other
  status_guess: aspirational

- id: fajar-google-business-profile-schema
  claim: "Schema.org + Google Business Profile - rich snippet with price, availability, rating"
  source: src/pages/FajarPitch.tsx:309
  category: other
  status_guess: aspirational

- id: fajar-admin-dashboard
  claim: "Admin dashboard you check on your phone - vacancy, today's bookings, maintenance queue"
  source: src/pages/FajarPitch.tsx:310
  category: admin
  status_guess: aspirational

- id: fajar-human-handoff
  claim: "Pricing negotiation, complaints, unrecognised intent forwarded to sales WhatsApp with full context"
  source: src/pages/FajarPitch.tsx:320
  category: ai
  status_guess: aspirational

- id: fajar-uae-region-hosting
  claim: "UAE-region hosting (AWS me-central-1). Daily backups. CSV/SQL data export."
  source: src/pages/FajarPitch.tsx:318
  category: admin
  status_guess: aspirational
```

## MCFA pitch (McfaPitch.tsx)

```yaml
- id: mcfa-dcma14-audit-memo
  claim: "In-browser DCMA-14 auditor ... emits plain-English memo to the RE with accept/conditions/reject recommendation"
  source: src/pages/McfaPitch.tsx:69
  category: scheduling
  status_guess: shipped  # backed by XerDemo + xer/*

- id: mcfa-spi-cpi-from-xer-pairs
  claim: "Baseline + monthly update XER pair -> instant SPI, CPI, % complete, activity-level slip -> one-page monthly progress PDF"
  source: src/pages/McfaPitch.tsx:77
  category: scheduling
  status_guess: partial

- id: mcfa-tia-fragnet-workflow
  claim: "TIA module drafts FS-zero-lag fragnets and narrative letter compliant with NJDOT 108-03 - 5-day cycle into 1-day turnaround."
  source: src/pages/McfaPitch.tsx:85
  category: scheduling
  status_guess: partial

- id: mcfa-portfolio-rollup
  claim: "Active-project schedule health on a single Newark/PANYNJ portfolio strip"
  source: src/pages/McfaPitch.tsx:84
  category: reporting
  status_guess: aspirational

- id: mcfa-aace-estimate-progression
  claim: "AACE-Compliant Cost Estimating - deterministic + probabilistic per AACE 98R-18, Class 5 -> Class 1"
  source: src/pages/McfaPitch.tsx:39
  category: other
  status_guess: aspirational

- id: mcfa-evm-live-dashboard
  claim: "Replace static PDF Gantts with live dashboards. SPI/CPI computed weekly so deviations surface in the L10"
  source: src/pages/McfaPitch.tsx:42
  category: reporting
  status_guess: partial

- id: mcfa-automated-tia-drafting
  claim: "PMs type a plain-text delay note -> system drafts the fragnet and TIA narrative"
  source: src/pages/McfaPitch.tsx:47
  category: ai
  status_guess: partial

- id: mcfa-p6-integration-bim360
  claim: "Data Sources: Primavera P6 - Schedule; BIM 360 - Design + Docs; Contractor XER Submissions"
  source: src/pages/McfaPitch.tsx:113
  category: integrations
  status_guess: partial  # XER only

- id: mcfa-power-bi-semantic-model
  claim: "Outputs: Power BI Semantic Model"
  source: src/pages/McfaPitch.tsx:124
  category: integrations
  status_guess: aspirational

- id: mcfa-new-service-line-revenue
  claim: "New Service Line Revenue - productized digital-controls offering ($350K stretch)"
  source: src/pages/McfaPitch.tsx:165
  category: other
  status_guess: aspirational
```

## Aspirational-only summary

23 of ~35 distinct claims have zero implementation files:
1. field-photo-attachment-store-listing
2. soc2-compliance-roadmap
3. uptime-sla-99-9
4. dedicated-onboarding
5. ai-quantity-extraction
6. projectwise-integration
7. automated-monthly-estimate-dc84
8. photo-documentation-roadmap
9. sitemanager-aashtoware-integration
10. contractor-portal
11. api-access
12. fajar-whatsapp-booking-agent
13. fajar-whatsapp-maintenance-agent
14. fajar-per-machine-seo-pages
15. fajar-arabic-site-hreflang
16. fajar-google-business-profile-schema
17. fajar-admin-dashboard
18. fajar-human-handoff
19. fajar-uae-region-hosting
20. mcfa-portfolio-rollup
21. mcfa-aace-estimate-progression
22. mcfa-power-bi-semantic-model
23. mcfa-new-service-line-revenue
