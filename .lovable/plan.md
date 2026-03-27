

# Landing Page Redesign — Enterprise Construction Management Aesthetic

## Design Direction

Keep the monospace font (it gives a technical, engineering feel that suits construction management software). The problem is not the font — it's the flat, text-heavy card-grid layout with no visual anchors. The fix: dark sections with construction imagery, blueprint-style visual accents, and product screenshots breaking up the text.

Think Autodesk Construction Cloud, Procore, or Trimble marketing — dark hero with dramatic imagery, product shots integrated throughout, and a sense of scale and seriousness.

## Key Changes

### 1. Dark Hero with Full-Width Product Screenshot
- Dark navy/slate background (not the current pale gray)
- Hero text in white, accent color for emphasis
- Product screenshot displayed prominently below the text in a browser-frame mockup, centered and full-width
- Subtle grid/blueprint pattern overlay on the dark background for engineering feel
- Remove the awkward right-float positioning of the screenshot

### 2. Visual Section Breaks with Construction Imagery
Generate 3-4 images using the AI image model to use as section backgrounds or inline visuals:
- **Highway construction aerial** — used as a full-bleed background behind the pain points section (with dark overlay + text on top)
- **Inspector on a tablet in the field** — used next to the "How It Works" or personas section
- **Blueprint/plan sheets close-up** — used as a texture/pattern element
- **Dashboard/data visualization** — a second product screenshot showing the dashboard view

### 3. Section Layout Overhaul
- **Pain points**: Full-width dark section with construction photo background, stats in large monospace type overlaid
- **Capabilities**: Alternate between text-left/image-right and image-left/text-right layouts instead of a 3x2 grid of identical cards. Each pair of features gets a product screenshot or illustration beside it
- **How It Works**: Horizontal timeline with a connecting line, numbered steps, on a subtle blueprint-grid background
- **Personas**: Keep cards but add distinct header images or colored top-borders per persona type
- **Comparison**: Replace the spreadsheet-style table with a two-column card layout ("Before" / "After" with visual contrast)
- **Roadmap**: Cleaner timeline or horizontal scroll, not another card grid
- **CTA**: Dark gradient section with subtle construction imagery, not flat orange block

### 4. Visual Rhythm
- Alternate between light and dark sections to create rhythm
- Use full-bleed background images (with overlays) for at least 2 sections
- Product screenshots embedded in at least 3 places throughout the page (hero, capabilities, CTA)
- Add subtle CSS blueprint grid pattern as a decorative background element

### 5. Typography Adjustments (within monospace)
- Larger hero heading (text-4xl sm:text-6xl)
- More letter-spacing on section labels for that engineering spec feel
- Use uppercase monospace for section headers — feels like technical documentation
- Increase line height on body copy for readability

## Technical Details

### Generated Images (via AI image model at build time — stored as static assets)
Create an edge function or build-time script to generate and store 3 images:
1. Aerial highway construction scene (for background)
2. Construction inspector using tablet on job site (for personas section)
3. Blueprint/engineering plans close-up (for texture)

These will be generated once, saved to `src/assets/`, and imported statically.

### File: `src/pages/Landing.tsx`
- Complete visual overhaul of all sections
- Dark hero section with CSS grid pattern overlay
- Full-width centered product screenshot in browser mockup frame
- Background image sections with dark overlays
- Alternating text+image layouts for capabilities
- Two-column comparison cards replacing the table
- Dark gradient CTA replacing solid orange
- All new spacing, color classes, and layout structures

### File: `src/index.css`
- Add `.blueprint-grid` utility class (subtle repeating grid pattern via CSS)
- Add `.dark-overlay` utility for background image sections

### New Assets
- 3 AI-generated images saved to `src/assets/`
- Existing `hero-screenshot.jpg` reused in browser mockup frame

## Files Modified
1. `src/pages/Landing.tsx` — full visual redesign
2. `src/index.css` — add blueprint grid pattern and overlay utilities
3. `src/assets/` — 3 new generated images

