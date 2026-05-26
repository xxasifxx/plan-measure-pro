# TakeoffPro — App Store / Play Store Listing

Draft copy and metadata. Treat as the source of truth — Xcode and Play Console fields should be copied verbatim from here. Update version, screenshots, and "What's new" each release.

## Identity

- **App name:** TakeoffPro
- **Subtitle (iOS, ≤30 chars):** Field takeoff for NJTA inspectors
- **Short description (Play, ≤80 chars):** Digital pay-item takeoff and daily reports for NJTA/NJDOT inspectors.
- **Category:** Productivity (Primary), Business (Secondary)
- **Age rating:** 4+

## Long description

> TakeoffPro replaces paper DC forms with a digital, audit-ready quantity-takeoff record for NJTA and NJDOT inspectors, project managers, and resident engineers.
>
> Trace pay items directly on plan sheets, capture field photos with GPS context, and submit daily reports that map back to the NJTA 7th Edition 2016 Standard Specifications. Work fully offline in the field — every annotation, photo, and report is queued locally and synced the moment you're back on the network.
>
> Built for the field:
> • Touch-first plan viewer with engineering-grade calibration
> • Pay-item import from contract documents
> • GPS tracing tied to plan coordinates
> • Daily reports with quantity overrides, stationing, and Excel export
> • Resident-Engineer review workflow with approve / reject / re-review
> • Project Manager dashboard with inspector activity and progress tracking
> • Background sync — drains queued work even while the app is closed
>
> TakeoffPro is sold per project to engineering firms. Contact sales for a pilot.

## Keywords

`takeoff, NJTA, NJDOT, quantity, pay item, daily report, inspector, construction, plan markup, field reporting, blueprint, civil engineering, resident engineer, takeoff software`

## Privacy nutrition labels

| Data type | Used for | Linked to user | Tracking |
|---|---|---|---|
| Camera (photo) | App functionality — annotation evidence | Yes | No |
| Precise location | App functionality — GPS tracing | Yes | No |
| Email address | Account management | Yes | No |
| Name | Account management | Yes | No |
| Crash data | App functionality, analytics (opt-in only) | No | No |

We do not sell or share data with third parties. No advertising SDKs.

## Required permissions

- Camera — attach field photos to annotations
- Location (When in Use) — convert physical position to plan-sheet coordinates
- Notifications — daily-report status alerts (opt-in)
- Face ID / Biometric — local unlock only, never transmitted

## Support URLs

- Marketing: https://draw-quantify-dash.lovable.app
- Support: support@takeoffpro.app *(TODO — set up real mailbox)*
- Privacy policy: https://draw-quantify-dash.lovable.app/privacy *(TODO)*
- Terms: https://draw-quantify-dash.lovable.app/terms *(TODO)*

## Screenshots required

| Device | Size | Count |
|---|---|---|
| iPhone 6.7" (Pro Max) | 1290×2796 | 3–5 |
| iPhone 6.5" | 1242×2688 | 3–5 |
| iPhone 5.5" | 1242×2208 | 3–5 |
| iPad 12.9" | 2048×2732 | 3–5 |
| Android Phone | 1080×1920 (min) | 3–8 |
| Android 7" Tablet | 1200×1920 (min) | 1–8 |

Recommended screens: Dashboard, Plan viewer with annotations, Daily report editor, RE review queue, Sync queue (offline state visible).

## "What's new" template

```
v{x.y.z}
- {feature 1}
- {fix 1}
- Background sync improvements (always)
```

## Submission checklist

- [ ] Bump `versionCode` / `versionName` in `android/app/build.gradle`
- [ ] Bump `CFBundleShortVersionString` + `CFBundleVersion` in `ios/App/App.xcodeproj`
- [ ] `npm run build && npx cap sync`
- [ ] Remove `server.url` from `capacitor.config.ts`
- [ ] `npx capacitor-assets generate --iconBackgroundColor "#0b1220"` (uses `src/assets/app-icon-master.png`)
- [ ] Confirm permission strings in `Info.plist` / `AndroidManifest.xml` match this doc
- [ ] Archive in Xcode → upload to App Store Connect
- [ ] `./gradlew bundleRelease` → upload `.aab` to Play Console
- [ ] Tag the release in GitHub
