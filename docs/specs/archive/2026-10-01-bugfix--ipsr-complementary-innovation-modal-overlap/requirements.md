# Requirements — IPSR Step 2: "New complementary innovation" modal hidden behind the sidebar and header

> **Answer first:** the modal is centered correctly, but the app sidebar and the top header paint **over** it. That covers the modal's left side and its top row, where the close `×` lives. The fix must put the whole modal (mask, panel, `×`) above the shell chrome, with the sidebar expanded and collapsed, without changing the modal's size, scroll or behavior. The same trap affects every `app-pr-dialog` rendered inside IPSR pages, and all of them are in scope (`ICM-OQ-1`).

## 1. Module / Feature

- **Module:** ipsr (client)
- **Sub-feature:** Step 2 · 2.1 Complementary innovations — "Add new complementary innovation/ enabler/ solution" modal
- **Owner:** Maria Camila Giraldo
- **Status:** approved 2026-10-01 (Bug Mode, Lite depth — re-checked at design Step 2.4)
- **Ticket(s):** none
- **Proposal:** none — the root cause below was confirmed in this session (`systematic-debugging`, real-browser repro)

## 2. Context

**Reproduction (user report + screenshot, prtest):** open or create an Innovation Package → tab *Package and Access* → Step 2 → `2.1 Complementary innovations` (`/ipsr/detail/{code}/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=`) → select results → click **Add new complementary innovation/ enabler/ solution**. The modal opens with its left side under the sidebar, so it looks left-aligned. Its top row, which holds the `×`, sits under the top header, so the modal can't be closed with the mouse.

**Root cause (confirmed):**

| # | Fact | Evidence (as run, commit `e094b6162`) |
|---|---|---|
| 1 | The modal renders **inline** inside the page. There is no portal to `<body>`: the mask is `position: fixed; inset: 0; z-index: 1100` | `onecgiar-pr-client/src/app/shared/components/pr-dialog/pr-dialog.component.html:1-2`, `pr-dialog.component.scss:3-8` |
| 2 | Two ancestors carry the global class `.section_container`: the IPSR detail shell and Step 2 | `pages/ipsr/pages/innovation-package-detail/innovation-package-detail.component.html:40`, `.../step-n2/step-n2.component.html:2` |
| 3 | `.section_container` extends `.fadeIn`: an `opacity` keyframe animation with `animation-fill-mode: both` | `onecgiar-pr-client/src/styles/transitions.scss:5-15, 43-56` |
| 4 | An `opacity` animation retained by `fill-mode: both` keeps its element a **stacking context** after it finishes. The mask's `z-index: 1100` then only competes inside that context | Headless Chrome repro (scratch HTML that mirrors the shell). With the animation `finished` + `both`, `elementFromPoint` over the sidebar returns the sidebar, over the header returns the header, and on the `×` returns the sidebar. With `backwards` or with no animation, all three return the panel or the `×` |
| 5 | The shell chrome sits in the outer context above the page: sidebar `fixed z-10`, header `sticky z-30` | `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts:81`, `src/app/app.component.scss:38-43` |

So the panel is horizontally centered in the viewport. It only *looks* left-aligned because the sidebar covers its left part.

PRD: `US-P3` (manage IPSR pathways), `US-S5` (users must not get stuck in a flow). UX: `docs/ux-ui/design.md` §6 *Drawers and modals*, §10 *Keyboard / Focus*. TRD: client `pages/ipsr`, `shared/components/pr-dialog`.

## 3. In Scope / Out of Scope

### In scope

- The "New / Edit / View complementary innovation" modal in IPSR Step 2.1, with the sidebar **expanded** and **collapsed**.
- Every other `app-pr-dialog` rendered inside the IPSR module (creator, list update modal, submission/unsubmit, Step 3 evidence, Step 4 partner/project/bilateral modals) — fixed by the same change (`ICM-OQ-1`).
- Mask, panel and `×` painting above the sidebar and the shell header.
- A regression test that reproduces the overlap in a real browser.

### Out of scope

- Modal content, fields, validation, save flow, copy.
- Modal size and internal scroll (P2-3530 behavior stays).
- Redesigning `app-pr-dialog` or the page fade-in animation look.
- A `×` for header-less modals outside the IPSR module.
- Modals outside the IPSR module (e.g. Result Detail), which carry the same trap through `.section_container` / `.detail_container` — follow-up, not this spec.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter / PMU lead editing an Innovation Package | The modal opens fully visible and centered, and the `×` closes it |
| Read-only viewer (`View complementary innovation`) | Same; viewers can close the read-only modal with `×` |

## 5. User Stories

- **`ICM-US-1`** — As a user adding a complementary innovation in IPSR Step 2, I want the modal fully visible and centered with a working `×`, so that I can read it and leave it whether the sidebar is open or closed. Refines `US-P3`, `US-S5`.

## 6. Functional Requirements

### Requirement: Modal paints above the shell chrome — `ICM-R-1` (MUST)

The modal's mask and panel MUST paint above the app sidebar and the shell header (test banner + topbar). This MUST hold with the sidebar expanded and with it collapsed.

#### Scenario: Sidebar expanded (the reported case)

- GIVEN an Innovation Package open at Step 2 → 2.1, sidebar **expanded**, a desktop viewport
- WHEN the user clicks **Add new complementary innovation/ enabler/ solution**
- THEN the topmost element at a point inside the panel that lies over the sidebar's area is the panel (or its content), not the sidebar
- AND the topmost element at a point inside the panel's top row that lies under the header's area is the panel, not the header
- AND the mask dims the sidebar and the header too
- BUT it must NOT leave any part of the panel painted under the sidebar or the header

#### Scenario: Sidebar collapsed

- GIVEN the same page with the sidebar **collapsed** to its icon rail
- WHEN the modal opens
- THEN the same three checks hold over the icon rail and the header

### Requirement: Close `×` is visible and works — `ICM-R-2` (MUST)

The panel's close `×` MUST be the topmost element at its own position, and clicking it MUST close the modal.

#### Scenario: Close with `×`

- GIVEN the modal is open (sidebar expanded or collapsed; New, Edit or View mode)
- WHEN the user clicks the `×`
- THEN the modal closes and the form resets (current `onHide` → `resetAll()` behavior)
- AND IT MUST be the `×` element, not the sidebar or the header, that receives the click (topmost-element check at the `×` center)

### Requirement: Centered in the viewport — `ICM-R-3` (MUST)

The panel MUST be horizontally centered in the viewport in both sidebar states, so its whole width is visible. Default per `ICM-OQ-2`.

#### Scenario: Centering

- GIVEN the modal is open
- THEN the panel's left gap and right gap to the viewport edges differ by ≤ 2 CSS px
- AND the whole panel (left edge to right edge, top row to footer) is unobstructed

### Requirement: Every IPSR modal can be closed with a `×` — `ICM-R-6` (MUST) — added 2026-10-01 (Pivot, user request)

Every IPSR `app-pr-dialog` that today has no close `×` MUST show one in its top-right corner. The 6 modals are: submission, unsubmit, Step 4 add-bilateral, add-partner, add-project, edit-bilateral. Clicking it MUST close the modal the same way Escape does.

#### Scenario: Header-less modal gets a `×`

- GIVEN an IPSR modal from the list above is open
- WHEN the user looks at the panel's top-right corner
- THEN a `×` (`aria-label="Close"`) is visible there, is the topmost element at its own center, and does not overlap the modal's own title text
- AND clicking it closes the modal and fires the same `onHide` as Escape (the form-reset hooks run)
- BUT it must NOT add a second `×` to modals that already have one (the creator, `new-complementary-innovation`, `update-ipsr-result-modal`, the Step 3 evidence dialog)
- AND IT MUST NOT change any `app-pr-dialog` outside these 6 (opt-in only)

### Requirement: "Add project" action buttons stay inside the modal — `ICM-R-7` (MUST) — added 2026-10-01 (Pivot 2, user report)

The Step 4 "Add project" modal's **Cancel** and **Add project** buttons MUST render inside the panel, at its bottom-right. Today they render at the viewport's bottom-right because `.buttons` is `position: fixed` (`step-n4-add-project.component.scss:31-38`). This is a pre-existing defect from the 2026-07-14 `p-dialog` → `app-pr-dialog` migration (`784549007`), not one caused by `ICM-T-2`.

#### Scenario: Buttons inside the panel

- GIVEN IPSR Step 4 with the "Add project" modal open, at viewport 1440×900 and 1100×700
- THEN both buttons' bounding rects lie inside the panel's bounding rect
- BUT the buttons must NOT overlap the project select

### Requirement: Existing modal behavior unchanged — `ICM-R-4` (MUST)

- Escape and backdrop click MUST still close the modal.
- Width (`70vw`, max `1200px`; `95vw` below 1200px), `max-height: 90vh`, the internal body scroll and the pinned "Save and continue" row (P2-3530) MUST NOT change.
- BUT the fix must NOT move the dialog's DOM out of `app-pr-dialog`. Doing so would break the `::ng-deep app-pr-dialog .new-complementary-innovation-dialog` styles.

### Requirement: No regression on the rest of the page — `ICM-R-5` (MUST)

- The page's fade-in on load MUST still look the same: opacity 0 → 1 over the same duration.
- Page content and in-page elements with `z-index` ≤ 29 that scroll under the sticky header MUST keep passing under it.
- Overlays with `z-index` ≥ 30 (tooltips, menus, dropdowns) MAY paint above the header when they overlap it, the same as on pages without the fade container (e.g. bilateral). That is expected, not a regression. No arrangement keeps them under the header while letting the modal above it, since both would sit in the same context.
- Elements inside the affected containers that use negative or positive `z-index` (IPSR contributors, step-1/step-3 sections) MUST keep their current visual order.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | `×` reachable by pointer and keyboard, focus ring visible (`docs/ux-ui/design.md` §10). No change to `role="dialog"` / `aria-modal` |
| Responsive | Holds at ≥ 2 viewport widths, including one below 1200px where the panel switches to `95vw` |
| Internationalization | No new strings |
| Security / API | No server, API or payload change |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ICM-AC-1` | Step 2.1, sidebar expanded, viewport 1440×900 | Open the modal | Topmost element is the panel at a point over the sidebar area and at a point under the header area. Topmost at the `×` center is the `×` |
| `ICM-AC-2` | Same, sidebar collapsed | Open the modal | Same three checks |
| `ICM-AC-3` | Same, viewport 1100×700 (`95vw` branch, shorter height) | Open the modal | Same three checks; left/right gaps differ ≤ 2px |
| `ICM-AC-4` | Modal open | Click `×` / press Escape / click mask | Modal closes; form reset |
| `ICM-AC-5` | Step 2.1 page, modal closed, scrolled down | Scroll content under the header | Content passes under the header (topmost element at a header point is the header) |
| `ICM-AC-8` | Step 4 "Add project" open, 1440×900 and 1100×700 | Measure the button rects | Both buttons are contained in the panel rect |
| `ICM-AC-7` | Each of the 6 header-less IPSR modals open | Look / click the top-right `×` | `×` visible and topmost at its center, no overlap with the title; click closes and fires `onHide`; the 4 modals with an existing `×` show exactly one |
| `ICM-AC-6` | IPSR Step 4, sidebar expanded, viewport 1100×700 (amended 2026-10-01: at 1440 the ~700px panel does not overlap the sidebar) | Open "Add partner" (sibling modal) | Probes over the sidebar and header resolve to the panel; a sidebar point outside the panel resolves to the mask; panel centered (≤ 2px). The `×` check is **n/a until `ICM-T-3`**: Step 4 modals render `[showHeader]="false"` and have no `×` today (amended 2026-10-01). After T-3 they show one (`ICM-R-6`), and the `×` check applies |

## 9. Defect classes → gate

| Defect class this spec can produce | What catches it | Automated? |
|---|---|---|
| **Stacking / overlap** (modal under the chrome; `×` covered) — the dominant class | Real-browser **topmost-element measurement** (`document.elementFromPoint`) at the AC points, 2 viewports × 2 sidebar states | Yes, in a real browser. **jsdom cannot evaluate this.** A class or style assertion in Jest is a presence check only |
| **Geometry** (not centered, clipped) | Bounding-rect read of the panel against the viewport, same harness | Yes (real browser) |
| **Regression of page z-order** (content over the sticky header, inner z-index reordered) | Same harness: topmost element at a header point while scrolled. Visual check of the affected IPSR sections at the HITL pause | Partly. The inner-section visual order is a **human check at the HITL pause** |
| **Behavior regression** (Escape, mask click, reset) | Existing Jest specs of `pr-dialog` and `new-complementary-innovation` | Yes |
| **Compile / lint** | `npx ng lint --quiet` and the client build | Yes |

**Accepted risk:** the real-app harness needs an authenticated session. Cypress is token-gated (`cypress.env.js` is not present locally). If no token is available, the substitute is the real-browser harness run against the shipped stylesheet, plus a human check in the authenticated browser at the HITL pause. Execute must say which one ran.

## 10. Open Questions

- **`ICM-OQ-1` — Scope.** ✅ Resolved 2026-10-01 (user): **all IPSR**. Fix where the trap is, so every IPSR modal is fixed by the same change; verify this modal plus one Step 4 sibling (`ICM-AC-6`).
- **`ICM-OQ-2` — Where to center.** ✅ Resolved 2026-10-01 (user): **full viewport**, sidebar and header dimmed under the mask (same as the app-level "Contact us" modal).

## 11. Out-of-Band Notes

- The same `.section_container` / `.detail_container` classes are used in 32 templates. The blast radius of a change at the global class is assessed in `design.md` (Premise Ledger, `shared-state`) before any global edit.

## Required cross-references

- `docs/prd.md` — `US-P3`, `US-S5`
- `docs/ux-ui/design.md` — §6 Drawers and modals, §9 Responsive, §10 Accessibility
- `docs/trd/trd.md` — §2 client `ipsr` page module, §6 frontend architecture
