## Documents UI — what's inadequate

Walked the page top-to-bottom against the project memory (mobile-first, contextual toolbar, FAB pattern, blueprint aesthetic) and the actual user flows for a construction PM/inspector. Grouping findings by severity. **Nothing below is implemented yet** — pick what to build.

### Tier 1 — broken or missing for the core workflow

1. **No file preview.** Clicking a file just downloads it. PMs and inspectors expect to click a PDF/photo and view it inline (lightbox for images, embedded pdf.js for PDFs). Without this, every glance at an RFI or photo is a download round-trip.
2. **No "Upload new version" action on a file row.** The schema supports `replaces_document_id` and the badge shows `v2`, but the UI has no way to actually push a new version of an existing file. Versioning is dead weight.
3. **Mobile is half-built.** Tree is `hidden md:flex`, so on 390px wide you only get the Select dropdown. There's no "New folder" button on mobile, no breadcrumb, no drop zone (drag-drop is desktop-only), and the page doesn't use the project's bottom-tab + FAB pattern that every other field surface uses. Inspectors live on tablets/phones — this is the wrong surface for them right now.
4. **Locked folders are still clickable and look identical to writable ones.** Inspector taps "Plans", sees a toolbar with no Upload, no explanation in the empty state. The lock icon is 12px and easy to miss. Needs a clearer disabled state and the inline "Read-only for your role" notice should appear in the empty state too, not just below the toolbar.
5. **No multi-select / bulk actions.** Can't select 12 photos and download/move/delete them. PMs cleaning up will hate this.

### Tier 2 — friction that compounds

6. **No search inside Documents.** No filename search, no filter by uploader, type, or date. Folders with 200 daily-report PDFs become unusable.
7. **No sort.** Table headers aren't sortable. Default order isn't even documented in the UI.
8. **No upload progress per file.** Single spinner on the Upload button. Drop 8 files of 40 MB each and the user has no idea what's happening or what failed.
9. **Drag-to-move is missing.** Move is dialog-only (`Select` → pick folder). Folder tree on the left is a natural drop target — should accept dragged file rows.
10. **No "Set as active plan" from Documents.** Legacy plan PDF is surfaced with the "Active plan" badge, but a PM who uploads a revised plan into Plans/ can't promote it to be the takeoff source from here. They have to go back to project setup. That breaks the whole point of putting Plans in the new workspace.
11. **Folder tree shows no counts or sizes.** "Photos (148)" is a basic affordance and it's missing.
12. **Uploaded-by shows only timestamp.** No avatar, no name. Audit trail is invisible at a glance.

### Tier 3 — polish

13. **Header is sparse.** Just Back + title + access badge. No quick-jump to Takeoff / Daily Report / Pay Items for this project (those are one click away on Index — Documents should mirror).
14. **Empty state is generic.** Could show the `KIND_HINTS` copy as guidance + a primary "Upload first file" CTA instead of two greyed lines.
15. **System folders only differ by icon color.** A subtle "SYSTEM" pill or tooltip would clarify why some have no Delete.
16. **Toolbar wraps awkwardly at ~700px.** Breadcrumb, Upload, New folder, kebab all compete for one row. Needs an overflow menu at smaller widths.
17. **No folder-upload support.** `webkitdirectory` would let PMs drop a whole "Submittals/2026-05" folder in one shot — common in real workflows.
18. **No drag indicator / drop highlight on the folder tree** when dragging files toward it.
19. **Versions dialog is read-only.** Can view chain, can't download an older version or restore it as current.
20. **Deletes are permanent, no undo, no trash folder.** Risky for a system that's now the source of truth for an audit trail.

### Recommended first build cut

If you want the biggest unlock in one pass, I'd do **1, 2, 3, 4, 6, 8, 10** — preview, new-version upload, real mobile layout with bottom-tab + FAB, clearer locked state, search, per-file progress, and "Set as active plan." That converts Documents from "file dump" into the actual document hub the construction-data-transformation flow needs.

Tell me which tiers (or which specific numbers) to take into the next build, and I'll write the implementation plan.
