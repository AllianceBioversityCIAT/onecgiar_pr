# Design — Reporting Table Actions Clipped (Bug, Lite)

Linked: `requirements.md` (same folder) — RTA-R-1..R-4, RTA-R-10/R-11, RTA-AC-1..4.

## 1. Summary

Give the HLO sub-group's collapsible content its own horizontal scroll (mirroring `.pr-flat-scroll`, already used for the "All indicators" table in this same component) instead of letting the ancestor's `overflow: hidden` silently clip the row's fixed-width action columns. The header (`.pr-hlo-head`) and its rows already live in the same DOM container, so scoping the scroll there keeps them moving together automatically — no separate sync mechanism needed. The one constraint this design must respect: that container's `overflow: hidden` is load-bearing for the card's height-collapse animation, so the fix must split the two axes (`overflow-y: hidden` for the animation, `overflow-x: auto` for the row), not remove clipping outright.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/` — `reporting-aow-table.component.html` (one class addition) and `reporting-aow-table.component.scss` (one new rule set + two `min-width` additions).
- No server, API, or data-model changes. No other component reads or renders this markup (per its own `CLAUDE.md`, `reporting-aow-table` is presentation-only and single-consumer).

### 2.2 Interaction / structure (no sequence diagram needed — pure CSS/markup)

```
<section> (AoW card — keeps overflow visible, for the ⓘ popover — UNCHANGED)
  └── .pr-collapse (card-level, .pr-collapse--card — UNCHANGED)
        └── .pr-collapse-inner (card-level — UNCHANGED: overflow: hidden, both axes)
              └── ... band / toolbar / HLO buttons ...
              └── .pr-collapse (HLO-level) ADD class `pr-collapse--rows`
                    └── .pr-collapse-inner (HLO-level) → overflow-x: auto; overflow-y: hidden   [RTA-DD-1, retained]
                          ├── .pr-hlo-head            → min-width: 1048px                       [RTA-DD-1, retained]
                          │     ├── … scrolling label cells (Indicator/Target/Achieved/Status/Progress)
                          │     ├── Action label cell   → RTA-DD-2: sticky, opaque (--pr-surface-subtle)
                          │     └── trailing cell       → RTA-DD-2: sticky, opaque
                          └── .pr-reporting-row (×N)  → min-width: 1048px                       [RTA-DD-1, retained]
                                ├── tracks 1-6: scrolling data columns
                                ├── track 7 (136px) action cell → RTA-DD-2: sticky, opaque, hover-aware, box-shadow separator
                                └── track 8 (36px)  "···" cell  → RTA-DD-2: sticky, opaque, hover-aware, outermost
```

Only the HLO-level collapse scrolls, and within it only tracks 1-6 move. The card-level collapse is untouched — it has no fixed-width row grid inside it and must keep clipping both axes for the ⓘ popover's containing block to behave as documented.

Only the HLO-level collapse gets the new scroll behavior. The card-level collapse is untouched — it has no fixed-width row grid inside it that can overflow, and it must keep clipping both axes for the ⓘ popover's containing block to behave as documented.

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None — client-only fix.

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. Component: `reporting-aow-table.component.{html,scss}`.

### 6.2 Components & services

No new components or services. Two edits to the existing component:

1. **Template (`reporting-aow-table.component.html`):** add a modifier class `pr-collapse--rows` to the HLO-level `<div class="pr-collapse" ...>` wrapper (the one at line ~671, wrapping `.pr-hlo-head` + the `hlo.rows` loop). No structural change — no new wrapper element, no new inputs/outputs.
2. **Styles (`reporting-aow-table.component.scss`):**
   - New rule: `.pr-collapse--rows > .pr-collapse-inner { overflow-x: auto; overflow-y: hidden; }` — placed next to the existing `.pr-collapse` rules, with a comment explaining why this variant splits the axes (ties back to RTA-DD-1 below).
   - Add `min-width: 1048px;` to `.pr-reporting-row` (§67-97 in the current file) and to `.pr-hlo-head` (§50-65). 1048px = the row's already-existing fixed/minmax track sum (604px fixed tracks + 280px title-column floor + 7×16px gaps + 52px horizontal padding — see `proposal.md` Root Cause for the derivation). This is a **documentation-as-code** addition: the grid's own intrinsic min-content size already enforces this width, but an explicit `min-width` makes the contract visible in the stylesheet and matches the precedent already set by `.pr-flat-row { min-width: 820px; }` in the same file.

3. **Sticky action cells (`RTA-DD-2`, added 2026-09-01):** give the row's track-7 and track-8 cells (and the matching `.pr-hlo-head` cells) a class each, and make them `position: sticky` with right-anchored offsets, opaque hover-aware backgrounds, and a left-edge `box-shadow` separator on the leftmost pinned cell. Per the *Implementation contract* under `RTA-DD-2` in §12.

No change to the grid's fixed track list (`28px minmax(280px, 1fr) 80px 80px 112px 132px 136px 36px`) — those widths stay exactly as pinned by P2-3296 and MRF-R-3.1/R-5.

### 6.3 Design system usage

- No new tokens, no new colors, no new components. Reuses the existing `.pr-flat-scroll` *pattern* (horizontal-scroll-on-overflow) without reusing its class, because that class also sets `overflow-y: hidden` implicitly via `overflow-x: auto; overflow-y: hidden;` at the top-level scroller — here the same two declarations are needed, but scoped under `.pr-collapse--rows > .pr-collapse-inner` so they compose with (not replace) the collapse-animation contract of `.pr-collapse-inner`.
- Responsive plan: no new breakpoint. The fix is intrinsic (content-driven overflow), not a `@media` rule — it activates automatically whenever available width drops below ~1048px, at any width, not just at a hardcoded 1350px number (the 1350px figure in the bug report was a symptom of this user's sidebar+viewport combination, not a value to hardcode).
- A11y: the "···" button, Report/Continue button, and Copy-link icon keep their existing `aria-label`/`aria-expanded` attributes unchanged. Tab order is unaffected because no DOM nodes are added/removed/reordered — only `overflow` and `min-width` change. A user tabbing to the "···" button when it is scrolled out of view will need the browser's native scroll-into-view-on-focus behavior, which is standard and requires no new code.
- i18n: no new strings.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

Not applicable — no auth, no data access changes.

## 8. Performance & Capacity

Negligible — two CSS declarations and one `min-width` per element, no new reflows beyond what the existing grid already computes. No bundle-size or Lambda cold-start impact (pure client CSS).

## 9. Observability

Not applicable — no new logs, no new metrics.

## 10. Testing Plan (forward-looking)

**Why Jest/jsdom cannot be the gate:** jsdom does not implement CSS Grid track sizing, `overflow` clipping, or scroll geometry — a jsdom test asserting the `pr-collapse--rows` class is present on the element (a **presence-assertion**) would prove the class was added, not that the button is actually reachable. That is exactly the class of false-positive this spec must avoid (see `requirements.md` §7 defect-class table).

**Chosen harness (amended 2026-09-01 — see `execution.md` → Pivot Record: `RTA-T-2`):** Cypress **component testing** (`onecgiar-pr-client/src/**/*.cy.ts`), which runs the component in a real browser — real CSS Grid track sizing, real `overflow` clipping, real scroll geometry — with no login, no backend, and no seed data.

> **Superseded:** this section originally specified Cypress **E2E** (`cypress/e2e/**`). That harness is unviable in this repo by default: `cypress.env.js` is gitignored and absent, so `cypress.config.js` computes `hasCredentials: false` / `hasToken: false` and the specs "skip gracefully on machines without secrets" — a skip is not evidence, and it trips `RTA-T-2`'s own no-pass clause. E2E additionally requires the full stack plus a dev database populated with Reporting-tab data. Component testing is a proven path here (**47 existing `src/**/*.cy.ts` specs**, with a `.contract.cy.ts` convention and a fully configured Angular CT dev-server in `cypress.config.js`), and `reporting-aow-table` is a pure presentation component — nine `input<>()` signals, no injected services, per its own `CLAUDE.md` — so it mounts on plain inputs.

Per `onecgiar-pr-client/CLAUDE.md` §9, Cypress here is **local-only** (no GitHub Actions workflow). This remains an accepted gap for CI, not silently assumed covered: the regression test is real evidence when run locally/by a developer, but a fully headless CI gate for this defect class does not exist in this repo today. The pivot does not change that.

- **Regression test (mandatory, Bug Mode) — assertions AMENDED 2026-09-01 for `RTA-DD-2`:** a Cypress component spec that mounts `reporting-aow-table` with fixture rows inside a **width-constrained container**, and at container widths standing in for 1350px, 1024px and 768px:
  1. Asserts the HLO-level scroller (`.pr-collapse--rows > .pr-collapse-inner`) has `scrollWidth > clientWidth` — the data columns still overflow. **Unchanged by the pivot.**
  2. ⚠️ **INVERTED by the pivot.** Previously: *scroll right, then assert the "···" becomes visible.* Now: with the scroller at **offset 0 and no scrolling performed**, asserts `[aria-label="More actions"]` is already `visible` and `click()`able and opens the row menu (`role="menu"`) — then scrolls the data columns and asserts it is **still** visible and clickable. This is the presence-of-behavior assertion for RTA-R-1's tightened wording; a test that scrolls first would no longer prove the requirement.
  3. At a wide container (≥1440px), asserts `scrollWidth === clientWidth` — no scrollbar appears, satisfying RTA-AC-3's negative constraint. **Unchanged.**
  4. Asserts `.pr-hlo-head` and `.pr-reporting-row` share one scroll container (common `offsetParent`), and that their pinned cells hold a common offset after scrolling — RTA-R-2 under sticky.
  5. *(new)* Asserts the pinned cells have a **non-transparent** computed `background-color` in default and `:hover` state — RTA-R-4. See the gap note below on the limits of this assertion.
- **RED-state evidence (Bug Mode requirement):** the spec must be confirmed red against the pre-fix CSS before being accepted as a regression test — see `tasks.md` `RTA-T-2` for the mechanics.
- **What this test does NOT prove (explicit gaps — two, both accepted):**
  1. **Pixel alignment.** Exact pixel alignment between `.pr-hlo-head` and the rows while scrolled is a visual property Cypress does not assert precisely without a screenshot diff, which this repo does not have wired up. Accepted risk (RTA-OQ-1 sibling risk) — a human visual check substitutes.
  1b. **Bleed-through is only weakly testable (new, RTA-DD-2).** Assertion 5 checks a computed `background-color` is non-transparent. That catches the obvious defect (no background set at all) but **cannot** prove the pinned region is visually opaque against scrolled content — a partially transparent token, a `z-index` mistake, or a gap between the two pinned cells would all pass. RTA-R-4 therefore leans on a **human visual check** of a scrolled, hovered row. Recorded rather than assumed covered.
  2. **Shell integration (new, introduced by this pivot — RTA-GAP-CT).** A CT mount has no real ancestor chain: no reporting page shell and no ~280px reporting nav sidebar. The spec therefore constrains the **component's container width directly** and does *not* confirm that the real shell actually produces a sub-1048px container at a 1350px **viewport**. This is faithful to the defect — §6.3 establishes the fix is *intrinsic*, activating whenever available width drops below ~1048px, with 1350px being "a symptom of this user's sidebar+viewport combination, not a value to hardcode" — so CT tests the real trigger rather than the incidental symptom. But the viewport→container mapping is **not covered by any automated test** and remains an **outstanding manual visual check** at 1350/1024/768px with the sidebar visible. It must be reported as unverified until a human performs it, never treated as covered by a green CT run.
- Coverage uplift: none expected/required — this is a CSS-only fix in a file already excluded from strict LOC-coverage concerns (Cypress covers behavior; Jest coverage thresholds are unaffected because no `.ts` logic changes).

## 11. Backwards Compatibility & Migration Plan

Not applicable — no API, schema, or flag involved. Purely additive CSS behavior (an overflow container that only activates when content is wider than available space); no rollback beyond reverting the commit.

## 12. Design Decisions (ADRs)

### RTA-DD-2 — Pin the action cells (sticky), let only the data columns scroll

> **Supersedes `RTA-DD-1` in part** (2026-09-01, user-directed pivot). `RTA-DD-1` is retained unedited below per the "decisions are never edited in place" rule. Its scroller **remains load-bearing** — this decision layers on top of it, it does not replace it.

- **Context:** `RTA-DD-1` shipped a horizontal scroller and earned a Reviewer PASS, but it makes the user scroll **every row** to reach that row's primary controls (Report/Continue, Copy-link, "···"). RTA-R-1's original wording ranked *"visible directly"* ahead of *"via horizontal scroll"*; the implementation took the fallback. The user rejected this on UX grounds and directed the preferred branch.
- **Decision:** Make the row's two rightmost cells — grid track 7 (the 136px action cell holding Copy-link + Report/Continue) and grid track 8 (the 36px "···" cell) — `position: sticky` with right-anchored offsets, inside the scroll container `RTA-DD-1` already established. The data columns scroll beneath them; the actions never move. The same treatment applies to the matching cells of `.pr-hlo-head` so the header stays in step (RTA-R-2).
- **What is retained from `RTA-DD-1`, unchanged:** the `.pr-collapse--rows > .pr-collapse-inner` axis split (`overflow-x: auto; overflow-y: hidden`) and `min-width: 1048px` on `.pr-hlo-head` / `.pr-reporting-row`. The data columns still need somewhere to overflow to; only the actions stop travelling with them.
- **Alternatives considered:** see the full table in `execution.md` → Pivot Record: `RTA-T-1` (second pivot) — responsive column compression (still rejected: reopens the P2-3296 / MRF-R-5 track pins) and folding the actions into the "···" menu at narrow widths (rejected: hides the primary CTA behind a second click, an IA change far beyond a Lite bug fix).
- **Consequences:** the pinned region overlays scrolled content, so it **must** be opaque in every row state — this is why RTA-R-4 exists as a MUST rather than a styling nicety.

#### Implementation contract (the *what*; exact pixel values are the implementer's to derive)

1. **Two sticky cells, not one.** Track 8 ("···") pins outermost at the right edge; track 7 (actions) pins immediately inboard of it. The 16px grid `gap` and the row's `20px` right padding both enter the offset arithmetic. Neither cell currently carries a dedicated class — adding one to each (and to the `.pr-hlo-head` counterparts) is expected and in scope.
2. **Opaque backgrounds, hover-aware (RTA-R-4).** `.pr-reporting-row` swaps `--pr-surface-card` → `--pr-surface-ground` on `:hover`; a static background on the sticky cells shows bleed-through the instant a row is hovered. Both states must be handled. `.pr-hlo-head`'s pinned cells need its own `--pr-surface-subtle`.
3. **Left-edge separator (RTA-R-11).** A subtle `box-shadow` on the leftmost pinned cell, so the region reads as pinned rather than as overlapping content.
4. **`grid-template-columns` stays byte-identical.** The P2-3296 / MRF-R-3.1/R-5 pins have survived every round of this spec and survive this one.
5. **Re-verify the `.pr-row-menu` popover.** It is a child of the sticky "···" cell, and the scroller is `overflow-y: hidden`. It works today (the `RTA-T-2` suite asserts `role="menu"` visible and passes), but sticky changes the stacking and containing-block situation. **Re-verify, do not assume** — if sticky clips the menu, that is a genuine blocker to surface, not something to paper over.
6. **`z-index` discipline:** the pinned cells sit above scrolled data but must not occlude the open row menu or escape the card.

### RTA-DD-1 — Scope the horizontal scroll to the HLO-level collapse, split by axis

> ⚠️ **Partially superseded by `RTA-DD-2` above (2026-09-01).** Its scroller and `min-width` floor remain in force; its *consequence* that users reach the actions "by scrolling the row" is superseded — the actions are now pinned. Retained unedited for the audit trail.

- **Context:** The row's action controls are clipped by the ancestor `.pr-collapse-inner`'s `overflow: hidden`, which exists to support the card's height-collapse animation (0fr→1fr grid-template-rows trick). Removing `overflow: hidden` outright would break that animation (per the file's own comment); doing nothing leaves users unable to report or open the row menu below ~1048px of available width.
- **Decision:** Add a modifier class `pr-collapse--rows` (parallel to the existing `pr-collapse--card` modifier) applied only to the HLO-level collapse wrapper, and give `.pr-collapse--rows > .pr-collapse-inner` `overflow-x: auto; overflow-y: hidden` — keeping the vertical clip the animation needs while allowing horizontal scroll for the row grid.
- **Alternatives considered:**
  1. *Responsive column compression at a breakpoint* (Option B in `proposal.md`) — rejected: reopens the fixed track widths that two prior specs (P2-3296, MRF-R-5) pinned down after real regressions; higher risk, more design/QA time for a Lite bug fix.
  2. *Wrap rows in a brand-new `.pr-flat-scroll`-style wrapper element* — rejected: would require an extra DOM node per HLO group and duplicate the same two CSS declarations under a new name, when the existing `.pr-collapse-inner` is already the right scroll boundary (header + rows are already siblings inside it) — reusing it via a modifier class is smaller.
- **Consequences:** Users on ≤1350px-class viewports will see a horizontal scrollbar on any HLO group whose available width is under ~1048px. This is an accepted, expected trade-off (Option A in `proposal.md`, already the recommended approach) — it matches a UX pattern already shipped in the same component's flat-table view. The card-level collapse (`pr-collapse--card`) is untouched and keeps clipping both axes.

### RTA-DD-1 — Step 2.3 reversion challenge

*Trigger check:* This DD changes `overflow: hidden` → `overflow-x: auto` on the HLO-level `.pr-collapse-inner`, which does remove a clipping behavior that was shipping in production — so the challenge applies even though the clipped behavior was the bug, not an intended feature.

- **Challenge (one question): "What does removing the horizontal clip break?"**
- **Answer:** Nothing else relies on this element clipping horizontally. The indicator title's line-clamping (`.pr-clamp-1`/`.pr-clamp-2`) uses its own `overflow: hidden` directly on the clamped element, not on this ancestor. The ⓘ popover that needed the *card-level* collapse to stop clipping (a different, already-fixed issue noted in this component's own template comments) lives in the AoW card header, outside this nested HLO-level collapse entirely — so this change cannot reintroduce that older bug. No other element inside the HLO-level collapse depends on horizontal overflow being hidden.

## 13. Open Gaps & Follow-ups

- **RTA-OQ-1** (carried from `requirements.md`): whether the AoW-card header's own summary stats row also clips at ≤1350px is unconfirmed and out of scope for this fix. Follow-up ticket if QA observes it.
- Cypress in this repo is local-only (no CI wiring, per `onecgiar-pr-client/CLAUDE.md` §9) — the regression test this spec adds is real evidence for a developer/reviewer running it locally, but does not by itself prevent a future regression from merging silently through CI. Out of scope to fix CI wiring here.
- **RTA-GAP-CT** (introduced by the 2026-09-01 harness pivot): the CT spec constrains the component's container width and so does not verify the real shell + ~280px sidebar produce a sub-1048px container at a 1350px viewport. **Outstanding manual visual check**, not covered by any automated test. Must be stated as unverified until a human performs it.

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 2 (fix + regression test) |
| Expected LOC | ~25-35 (1 template class attribute, ~15 lines SCSS, ~1 CLAUDE.md re-stamp, ~40-60 lines Cypress component spec — counted separately from "production" LOC) |
| Expected review rounds | 1 |

This matches the **Lite** depth chosen at proposal time — no split, no depth change needed.

**Budget actuals (recorded 2026-09-01, tripwire fired):** `RTA-T-1` came in **under** the LOC budget (16 insertions / 2 deletions) but took **3** review rounds against the budgeted 1. Cause: the production change was correct on attempt 1 and never revised — both extra rounds were `reporting-aow-table/CLAUDE.md` convention compliance (a missing sha field in the `Verified:` stamp, then a one-line breach of `COMPONENT-DOCS.md` §4's 120-line cap). The spec sized the *fix* accurately; what it did not price was the component-doc re-stamp obligation it lists in its own Files-expected. A future spec touching a component with its own `CLAUDE.md` should budget a round for that.

## Required cross-references

- `docs/specs/bugfix/reporting-table-actions-clipped/requirements.md` (same folder) — RTA-R-1..R-4, RTA-R-10/R-11, RTA-AC-1..4.
- `docs/ux-ui/design.md` — responsive rule (desktop-first, tablet must work).
- `onecgiar-pr-client/CLAUDE.md` §5, §9 — Tailwind-first / SCSS-when-necessary rule; Cypress local-only status.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` — pinned track widths, disclosure/animation contract (to be re-stamped after this fix lands).
