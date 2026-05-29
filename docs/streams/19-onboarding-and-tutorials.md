---
stream_key: 19-onboarding-and-tutorials
paths:
  - src/components/GuidedTour.tsx
  - src/hooks/useTour.ts
  - src/components/WelcomeCarousel.tsx
  - src/components/NativeFirstRun.tsx
  - src/pages/Demo.tsx
  - src/pages/Index.tsx:~80–100
shared_paths: []
---
# Onboarding & Tutorials

## Purpose
Reduces time-to-first-measurement for new users — whether a seasoned RE opening TakeoffPro for the first time or a field inspector on a tablet unfamiliar with digital takeoff. Provides role-filtered welcome slides, a DOM-highlight guided tour inside the workspace, a full interactive demo mode for unauthenticated prospects, and a native first-run walkthrough for the Capacitor app.

## Surfaces (files)
- `src/components/GuidedTour.tsx` — portal overlay: SVG mask cutout, highlight ring, positioned tooltip; reads step `target` as CSS selector via `document.querySelector`
- `src/hooks/useTour.ts` — state machine: `isActive`, `currentStep`, `start/next/prev/skip`; completion persisted to `localStorage` (`tour_<id>_completed`)
- `src/components/WelcomeCarousel.tsx` — modal carousel (5 slides, role-filtered via `showFor`); dismiss writes `profiles.has_seen_welcome`
- `src/components/NativeFirstRun.tsx` — Capacitor-only first-run sheet: push permission, biometric opt-in, offline mode; shown once via `localStorage`
- `src/pages/Demo.tsx` — unauthenticated interactive demo with 12-step `WALKTHROUGH_STEPS`
- `src/pages/Index.tsx:~80–100` — wires `workspaceTour` (`useTour('workspace')`) with 5 `data-tour` target steps; auto-starts via `startIfNew()`

## Acceptance criteria
- First authenticated login triggers `WelcomeCarousel`; closing sets `profiles.has_seen_welcome = true`.
- `WelcomeCarousel` shows only slides tagged for the user's role.
- Workspace guided tour auto-starts on first project+PDF load; `[data-tour="sidebar"]` is highlighted with cutout mask.
- `useTour` skip/done writes to `localStorage`; restart does not replay.
- `/demo` accessible without auth; 12-step walkthrough progresses step-by-step.
- On Capacitor build, `NativeFirstRun` appears before main UI on first launch.

## Current state vs criteria
- **WelcomeCarousel gating**: implemented — checks `profile.has_seen_welcome`; dismiss writes to `profiles`.
- **Role filtering**: implemented — `slides.filter(s => s.showFor.some(r => roles.includes(r)))`.
- **Guided tour auto-start**: implemented — `workspaceTour.startIfNew()` after PDF loads.
- **`data-tour` targets in DOM**: **partial** — `Index.tsx` defines step targets but only a subset of elements actually have `data-tour` attributes; `GuidedTour` polls every 500ms when `querySelector` misses.
- **Demo 12-step walkthrough**: implemented — `WALKTHROUGH_STEPS` array with `manualNext` flags.
- **NativeFirstRun shown once**: implemented — `localStorage` key `tp.native.first-run-done`.
- **Tour replay / reset**: **missing** — no UI to re-trigger after completion; `HelpCircle` button calls `workspaceTour.start()` directly.

## Cross-stream handoffs
- **Feeds from** identity-and-access: `WelcomeCarousel` receives `userId` + `roles` from `useAuth`.
- **Feeds from** mobile-field-ergonomics: `Demo.tsx` consumes `MobileTabBar`, `MobileToolbar`, `MobilePayItems`, `MobileSections`.
- **Consumed by** sales-and-pitch: `/demo` linked from `Landing.tsx` as primary CTA.

## Risks / debt
- `GuidedTour` polls `querySelector` every 500ms; missing `data-tour` attribute (e.g. collapsed sidebar) means tooltip never renders, no fallback.
- `useTour` stores completion only in `localStorage`; clearing storage replays tour; second device sees it fresh.
- `WelcomeCarousel` hard-codes 5 slides; adding a new role requires editing component.
- `Demo.tsx` is ~400 lines of standalone workspace duplication; core takeoff UI changes require parallel updates.
