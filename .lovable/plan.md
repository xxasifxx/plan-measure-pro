

# Tutorials: In-App Onboarding + Welcome Carousel

## What We're Building

Two tutorial systems:

1. **Welcome Carousel** — A swipeable slide-based walkthrough shown on first login. Covers the app's purpose, role differences, and core workflow. Dismisses permanently (stored in a `user_onboarding` flag in the `profiles` table).

2. **In-App Guided Tour** — Context-sensitive tooltip walkthrough that highlights key UI elements step-by-step. Separate tours for the Dashboard (3 steps) and the Project Workspace (5-6 steps). Triggered automatically on first visit to each screen, re-accessible via a "?" help button.

## Welcome Carousel (Post-Login)

Shown once after first signup/login. 4-5 slides:

1. **Welcome** — App name, logo, tagline ("Quantity takeoff for construction teams")
2. **For Project Managers** — Create projects, upload PDFs, calibrate, import pay items, assign inspectors
3. **For Inspectors** — Open assigned projects, draw annotations with pre-set pay items, measurements auto-calculate
4. **Core Workflow** — Upload → Calibrate → Annotate → Export (visual diagram)
5. **Get Started** — CTA button to dismiss and proceed

Swipeable on mobile (touch gestures), dot indicators, skip button. Stored as `has_seen_welcome` boolean on the `profiles` table.

## In-App Guided Tour

A lightweight tooltip-based stepper component (`GuidedTour`) that:
- Accepts an array of steps, each with a target CSS selector, title, description, and position
- Renders a floating tooltip pointing at the target element with next/back/skip controls
- Adds a subtle backdrop highlight around the target element
- Tracks completion per tour ID in localStorage (no DB needed — low stakes)

### Dashboard Tour (3 steps)
1. Points at "New Project" button — "Create your first project"
2. Points at a project card — "Click to open a project workspace"
3. Points at the role badge — "Your role determines what you can do"

### Workspace Tour (5 steps)
1. Points at sidebar — "Your project sections and pay items live here"
2. Points at toolbar — "Select tools: calibrate, draw lines, polygons, counts"
3. Points at page controls — "Navigate between plan pages"
4. Points at a pay item — "Select a pay item, then draw on the plan"
5. Points at summary button — "View totals and export your takeoff"

## Technical Approach

### New Files
- `src/components/WelcomeCarousel.tsx` — Full-screen modal carousel with slides
- `src/components/GuidedTour.tsx` — Reusable tooltip tour component
- `src/hooks/useTour.ts` — Tour state management (localStorage-based)

### Database Change
- Add `has_seen_welcome` boolean column to `profiles` table (default `false`)
- Update after carousel dismissal

### Integration Points
- `Dashboard.tsx` — Show carousel if `!profile.has_seen_welcome`, then show dashboard tour
- `Index.tsx` — Show workspace tour on first project open
- Both pages get a small "?" help button to re-trigger tours

### Mobile Considerations
- Carousel uses touch swipe (CSS scroll-snap)
- Tour tooltips position responsively (above/below based on viewport)
- Tour steps adapt per platform (mobile tab bar vs desktop sidebar)

