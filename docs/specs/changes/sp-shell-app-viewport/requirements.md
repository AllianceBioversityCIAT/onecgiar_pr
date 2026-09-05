# Requirements — SP shell as a viewport-locked application frame

**Behavior in one line:** on the Science Program pages (Overview, Reporting, Results) at laptop width and up, the frame — app sidebar, topbar, TEST banner, program band, tab strip — always fills the viewport and never moves; the document never scrolls; **only the active tab's work area scrolls**, exactly like Jira's report pane under its project tabs.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `result-framework-reporting` (SP shell: `dashboard-lab`, `programme-results`, `reporting-program-band`) |
| Sub-feature | `sp-shell-app-viewport` |
| Module code | `SAV` |
| Depth | Standard |
| Type | Change |
| Status | approved (2026-09-04, gated: requirements → design → tasks all Continue) |
| Approval Mode | gated |
| Proposal | `docs/specs/changes/sp-shell-app-viewport/proposal.md` (approved 2026-09-04) |
| Visual reference | `visual-reference/jira-reference-app-frame.png` (target behavior) · `visual-reference/prms-current-sp-overview-document-scroll.png` (current) |
| Baseline | `US-P1` phase-aware dashboard, `G4` platform reliability (`docs/prd.md`) · `docs/ux-ui/design.md` §6 Page shell, §9 Responsive (`md` = 900px), §10 A11y, DD-11 root `zoom`, DD-12 brand line · `docs/trd/trd.md` §6 Frontend architecture · `onecgiar-pr-client/CLAUDE.md` §5 Tailwind-first, root font-size trap |
| Precedent | `pages/results/pages/result-detail/` — viewport-locked page (`:host { position: absolute; inset: 0 }` inside the `relative` outlet slot of `app.component.html`) |
| Kaizen applied | `changes--result-detail-footer-overlap` (locked pages stay off the footer allow-list) · `changes--clear-filters` (browser-only gates need a capability probe before task 1) · `changes--aow-identity-column-starvation` (Orca browser: viewport after `goto`, root zoom ×1.2) |
| Ticket | none |

## 2. Context

The SP shell (`/result-framework-reporting/entity-details/:entityId` = Reporting, `/overview`, `/results`) is the daily workspace of SP members during a reporting cycle. Today each page grows the document: the browser scrollbar spans the whole window and the sticky chrome (header, band) "rides" the page. The band pins with a hard-coded `top: 56px`, so on TEST, where the environment banner makes the header taller, the band lands under the banner. The AOW rail and the search popover are `position: fixed`, which makes the mismatch visible: they stay put while band and tabs scroll away.

`result-detail` already solved this for the editor: it is a viewport-tall row with independent scrolls, the document never scrolls, and the SCSS header records why a `height: 100%` chain cannot work (`min-height` never yields a definite height; the first attempt was reverted). This spec brings the same contract to the SP shell and turns it into a documented convention.

Personas from `docs/prd.md` §3: result submitter (SP member), PMU lead; Center users reach the same pages for bilateral context.

## 3. Glossary

| Term | Meaning |
|---|---|
| Frame / chrome | Everything that must never scroll: Spartan app sidebar, `app-shell-topbar`, TEST banner (when enabled), `app-reporting-program-band` (identity + tab strip) |
| Work area | The region below the tab strip that belongs to the active tab and owns vertical scrolling |
| Outlet slot | `div.relative.min-h-0.min-w-0.flex-1` wrapping `<router-outlet>` in `app.component.html`; the containing block for locked pages |
| Locked page | A routed page whose host box fills the outlet slot and clips its own overflow, so the document has nothing to scroll |
| Tab | `overview` \| `planned` (Reporting) \| `results` — `rfrView` route data |
| `md` | 900px breakpoint (`docs/ux-ui/design.md` §9). "≥ `md`" means `min-width: 900px` |
| Document scroll | Vertical scroll of `html`/`body` (`window.scrollY`) |

## 4. In Scope / Out of Scope

**In scope**

- Overview, Reporting and Results pages become locked pages at ≥ `md`, with one work-area scroll container each.
- Band and tab strip become fixed frame children; the band's scroll-driven states read the work area.
- Existing in-page scroll behaviors (heading jump, AOW row focus, guided tour, drill-downs) keep landing inside the visible work area.
- Page-local `fixed` overlays (AOW rail, search popover) keep their viewport anchoring.
- Below `md`: today's document-scroll behavior, unchanged.
- One reusable convention (Sass mixin `pr-viewport-page`, `design.md` `SAV-DD-3`) + documentation in `docs/ux-ui/design.md` §6 and the three module guides.

**Out of scope**

- Home, Bilateral results review, Portfolio overview, Results Center, IPSR, QA, Admin (follow-up chunks; see `proposal.md` Open Questions).
- Any change to the shared shell (`app.component.*`, sidebar, topbar, banner) beyond documenting the outlet-slot contract.
- Visual redesign, new tokens, table or filter changes, data flows.
- `result-detail` (already locked).
- Phone (`xs`/`sm`) redesign.

## 5. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (SP member) | Band + tabs are always in reach while scrolling long Reporting tables; no more "where did the tabs go" |
| PMU lead | Same on Overview: KPI cards, AoW progress and ToC map scroll under a fixed frame |
| Center user (bilateral context) | Same frame behavior on Overview/Results |
| Platform admin | none |

## 6. User Stories

- **`SAV-US-1`** — As an SP member, I want the program band and tabs to stay fixed while I scroll a long Reporting table, so that I can switch tab or read the program identity without scrolling back up. *(Refines `US-P1`)*
- **`SAV-US-2`** — As a PMU lead, I want the SP pages to feel like one application frame rather than a long web page, so that orientation costs nothing when I move between programs and tabs.
- **`SAV-US-3`** — As a developer, I want one documented way to make a page viewport-locked, so that the next surface adopts it without re-deriving the `result-detail` lesson.

## 7. Functional Requirements

### Required (MUST)

- **`SAV-R-1` Locked frame.** At ≥ `md`, on each of the three SP pages, the document MUST have no vertical overflow (`documentElement.scrollHeight === documentElement.clientHeight`, within the 1px rounding tolerance) regardless of content length, and the frame (sidebar, topbar, banner when present, band, tab strip) MUST remain fully visible at every scroll offset of the work area.
- **`SAV-R-2` One work-area scroller.** At ≥ `md`, exactly one element per page owns vertical scrolling: it starts immediately below the tab strip, ends at the bottom edge of the viewport, and is the only element on screen that shows a vertical scrollbar. Each tab's own controls row (Overview Phase/Filter row, Results filter row) scrolls **with** the content inside the work area (Jira behavior: the "More reports" row scrolls; the tabs do not). *Amended at archive (user decision, T-3 tripwire):* the Reporting toolbar (search, filters, Grouped/Expand-all) is part of `app-reporting-program-band` and stays pinned with the band; only the Reporting body scrolls.
- **`SAV-R-3` Chrome height comes from layout.** The band's position MUST be derived from the layout (the locked host fills whatever the outlet slot leaves under the header), never from a hard-coded header height. With the TEST banner present, absent, or wrapped to two lines, the band's top edge MUST sit flush under the header with no gap and no overlap.
- **`SAV-R-4` Tab switch keeps the frame.** Navigating Overview ⇄ Reporting ⇄ Results MUST keep the frame in place and MUST start the new tab's work area at scroll offset 0.
- **`SAV-R-5` In-page scroll targets stay reachable.** Every existing scroll-to behavior (Overview heading jump, hub focus, AOW row focus, guided-tour step highlight, drill-down landing) MUST bring its target inside the visible work area — target's bounding box fully within the work area's bounding box — at ≥ `md`.
- **`SAV-R-6` Band scroll states follow the work area.** The band's elevation shadow (`isScrolled`) and compact mode (`bandCollapsed`, when `collapsible`) MUST react to the work area's scroll offset with the same thresholds as today (10px / 64px); at ≥ `md` the work area's own `scroll` event MUST be sufficient to update them (no window event required). `window.scrollY` MAY remain only as the < `md` fallback source (`design.md` `SAV-DD-4`). On (re)creation the first read MUST happen without waiting for a scroll event.
- **`SAV-R-7` Fixed overlays keep anchoring.** The Reporting AOW rail (`aside.pr-panel`, `fixed inset-y-0 left-[var(--rail-w)]`) and the search popover MUST keep their viewport anchoring and z-order and MUST NOT be clipped by the locked host. *Amended at archive:* AOW mode has no band (`design.md` §2.2), so the original "band and tab strip MUST remain visible while the rail is open" clause is inapplicable and was dropped (T-5 Reviewer).
- **`SAV-R-8` Responsive fallback.** Below `md`, the three pages MUST render exactly as today: host in normal flow, document scroll, band sticky. No new behavior is introduced under 900px.
- **`SAV-R-9` No horizontal document overflow.** Wide content (Reporting table, Results table) MUST keep scrolling horizontally inside its own container; the work area and the document MUST NOT gain horizontal overflow at 1280px, 1440px and 1600px.
- **`SAV-R-10` Overlays do not shift the frame.** Opening a drawer or modal from any SP page MUST NOT change the frame geometry (no layout shift of band or tabs) and MUST NOT re-introduce document scroll.

### Should (SHOULD)

- **`SAV-R-11` Reusable convention.** The locking recipe SHOULD live in one shared place (the `pr-viewport-page` Sass mixin, `SAV-DD-3`) consumed by `dashboard-lab`, `programme-results` and, without behavior change, referenced by `result-detail` docs; `docs/ux-ui/design.md` §6 SHOULD document it as the "viewport-locked page" variant of the page shell, including the outlet-slot contract (`relative min-h-0 flex-1` must stay).
- **`SAV-R-12` Scrollbar styling.** The work-area scrollbar SHOULD use the existing `custom_scroll` treatment (brand thumb, 7px) so it reads as part of the design line, not a browser default.

### Could (MAY)

- **`SAV-R-13`** The work area MAY expose its scroll element to children (e.g., via a directive/service) so future features (scroll-spy, "back to top") do not re-query the DOM.

## 8. Scenarios

### `SAV-R-1` / `SAV-R-2` — Locked frame, one scroller

#### Scenario: Long Reporting table on a laptop
- GIVEN Reporting for an SP with more rows than fit in 1280×800
- WHEN the user scrolls to the last row
- THEN the sidebar, topbar, band and tab strip are still fully visible
- AND the only vertical scrollbar on screen belongs to the work area and starts below the tab strip
- BUT the document MUST NOT scroll (`window.scrollY` stays 0 and `documentElement.scrollHeight === clientHeight`)
- AND IT MUST keep the Reporting toolbar scrolling with the table (toolbar is inside the work area).

#### Scenario: Short content
- GIVEN Overview for an SP whose content is shorter than the viewport
- WHEN the page renders
- THEN no scrollbar is shown anywhere
- AND the work area still fills down to the viewport's bottom edge (no white gap below content painted with a different background).

### `SAV-R-3` — Chrome height from layout

#### Scenario: TEST banner present and wrapped
- GIVEN the TEST environment banner is enabled and the viewport is 1100px wide (banner wraps to two lines)
- WHEN Reporting renders
- THEN the band's top edge equals the header's bottom edge (|Δ| ≤ 1px)
- BUT it MUST NOT be covered by the banner and MUST NOT leave a gap
- AND IT MUST hold true with the banner disabled (header = topbar only).

### `SAV-R-4` — Tab switch

#### Scenario: From a scrolled Reporting to Results
- GIVEN Reporting scrolled 1200px inside its work area
- WHEN the user clicks the Results tab
- THEN the frame does not move and Results renders with its work area at offset 0
- AND the band's shadow is off (not scrolled).

### `SAV-R-5` — Scroll targets

#### Scenario: Guided tour step on a lower section
- GIVEN Overview at 1280×800, the guided tour running
- WHEN the tour advances to a step whose target is below the fold of the work area
- THEN the target's bounding box is inside the work area's bounding box
- AND the driver.js highlight sits over the target (not offset by the frame height).

#### Scenario: AOW row focus from a drill-down
- GIVEN Reporting with a `focusHub` / row-focus request for a row below the fold
- WHEN the focus fires
- THEN the row is inside the visible work area
- BUT the document MUST NOT scroll to achieve it.

### `SAV-R-6` — Band states

#### Scenario: Shadow follows the work area
- GIVEN Overview at offset 0 (no shadow)
- WHEN the work area scrolls to 11px
- THEN the band shows its elevation shadow
- AND when `collapsible` and the offset passes 64px the band enters compact mode
- BUT the update MUST NOT require a window scroll event (the work area's own event suffices)
- AND with no work area provided (< `md` layout) a window scroll to 11px MUST still turn the shadow on (fallback)
- AND IT MUST evaluate once on creation so a re-created band on a scrolled work area starts in the right state.

### `SAV-R-7` — Fixed overlays

#### Scenario: AOW rail open while scrolling
- GIVEN Reporting in AOW mode with the rail open and the work area scrolled
- WHEN the user keeps scrolling the work area
- THEN the rail stays at `inset-y-0 left-[var(--rail-w)]` and the band/tab strip stay visible above the content
- BUT the rail MUST NOT be clipped by the locked host's overflow (it is viewport-anchored).

### `SAV-R-8` — Responsive fallback

#### Scenario: Tablet portrait
- GIVEN Overview at 800×1100
- WHEN the page renders with content longer than the viewport
- THEN the document scrolls (`documentElement.scrollHeight > clientHeight`) and the band is `sticky` as today
- AND no work-area scrollbar exists.

### `SAV-R-9` — Horizontal overflow

#### Scenario: Wide Results table
- GIVEN Results with all columns visible at 1280px
- WHEN the page renders
- THEN `documentElement.scrollWidth === clientWidth` and the work area's `scrollWidth === clientWidth`
- AND the table scrolls horizontally inside its own wrapper.

### `SAV-R-10` — Overlays

#### Scenario: Report-result modal
- GIVEN Overview at ≥ `md`
- WHEN the "Where to report" modal opens and closes
- THEN band and tab strip bounding boxes are identical before and after (|Δ| ≤ 1px)
- AND the document still has no vertical overflow.

## 9. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Work-area scroll listener MUST be `passive`, registered outside the Angular zone, and re-enter the zone only when a threshold flips (same discipline as today's window listener). No per-frame change detection. Lighthouse/CLS not measured here; layout shift on tab switch MUST be visually nil (see `SAV-R-4`). |
| **Accessibility** | Keyboard: with focus inside the work area, `PageDown`/`Space`/arrows scroll the work area; focus order unchanged (`docs/ux-ui/design.md` §10). The scroll container MUST NOT be a focus trap and MUST NOT need `tabindex` hacks. `prefers-reduced-motion` behavior of existing smooth scrolls is preserved. |
| **Styling** | Tailwind-first; SCSS only for the `:host` box and anything Tailwind cannot express (`onecgiar-pr-client/CLAUDE.md` §5). Arbitrary px values, never rem (root font-size trap). No new `.pr-*` layout classes except the one shared convention artifact if a class is chosen (`SAV-R-11`). |
| **Compatibility** | `result-detail` behavior unchanged. `--pr-shell-header-height` stays defined for other consumers. Footer route allow-list untouched (SP routes are not listed). |
| **i18n** | No new user-facing strings. |
| **Observability** | none (pure layout). |
| **Security** | none (no API, no data). |

## 10. Defect Classes & Verification Mapping

| Defect class | Catching gate | Gap / substitute |
|---|---|---|
| D1 Document still scrolls at ≥ `md` (host not locked, or a chain that resolves to content height) | Two-part gate. (a) **Cypress CT recipe harness** (real Chromium): a throwaway host reproducing the shell chain (`main` → variable-height header → `relative min-h-0 flex-1` slot → locked child using the shared mixin + the exact wrapper utilities, stub content ≥ 2× viewport) at 1280×800: `documentElement.scrollHeight === clientHeight` and work area `scrollHeight > clientHeight`. (b) **Real-browser probe** on the three actual pages (Orca embedded browser, JS probe returning the same readings), because the real hosts carry route/HTTP dependencies that make them impractical to mount in CT. jsdom cannot measure any of this. | Jest only proves the pages *opt in* (host class present per `rfrView`) — a presence assertion; the probe closes the gap. |
| D2 Band offset wrong with the banner present/wrapped | CT recipe harness variant with a two-line banner stub above the slot: locked child `top === header bottom` (±1px). | Real browser on TEST (banner is on there) at 1100px and 1440px; local only covers banner-off. If the probe cannot run on TEST, record **partial** evidence, not a pass. |
| D3 Band shadow/collapse dead (no work-area source) | **Jest** on `reporting-program-band`: given `scrollHost`, dispatching `scroll` on the element with `scrollTop` 11 / 65 flips `isScrolled` / `bandCollapsed`; given `scrollHost = null`, a window scroll to 11 flips `isScrolled` (fallback). Falsifying input: remove the element listener → the element case stays `false` and fails red. | — |
| D4 Scroll targets land under the frame (`scrollIntoView` against wrong container or offset) | Cypress CT: programmatic focus of a below-fold row/heading → target rect ⊂ work-area rect. | Guided tour: HITL run of the tour on TEST (driver.js needs the real overlay). |
| D5 Fixed overlays clipped or re-anchored | Cypress CT: open AOW rail → `getBoundingClientRect().top === 0` and `.height === innerHeight`; rail inside the locked host and not clipped (*amended: AOW mode has no band*). | — |
| D6 Responsive fallback broken (locked below `md`, or fallback not restoring sticky band) | Cypress CT at 800×1100: `documentElement.scrollHeight > clientHeight`, no work-area scrollbar, host `position: static`. | — |
| D7 Horizontal document/work-area overflow | Cypress CT at 1280/1440/1600: `scrollWidth === clientWidth` on both. | — |
| D8 Regressions in existing shell behavior (tabs, filters, drill-downs, modals) | Existing **Jest** suites of `dashboard-lab.*`, `programme-results`, `reporting-program-band` stay green. | — |
| D9 Visual "web-page feel" not actually gone (perceptual) | **No automated gate.** Substitute: HITL visual on TEST at 1440px comparing against `visual-reference/jira-reference-app-frame.png` (scrollbar starts under tabs; frame static while scrolling). | Accepted: perception is judged by a human at the HITL pause. |

**Evidence disqualifiers (apply to every measured gate):**

- A Cypress CT viewport assertion is worthless unless `window.innerWidth`/`innerHeight` are asserted equal to the requested size **first** (`changes--clear-filters` lesson: `cy.viewport` has silently no-op'd before). If they differ, report *inconclusive*, never pass.
- In the Orca embedded browser, set the viewport **after** `goto`, and remember the root `zoom` inflates `innerWidth`/`getBoundingClientRect` by ×1.2 — compare ratios, not raw px, against the design.
- A `scrollHeight === clientHeight` reading on a harness with **short** stub content proves nothing; the stub MUST exceed the slot height by ≥ 2× and the assertion MUST also show the work area's `scrollHeight > clientHeight`.
- Presence of a class or style (`position: absolute`, `overflow-y: auto`) is not evidence of D1; only the measured document/work-area heights are.

## 11. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `SAV-AC-1` | Reporting, 1280×800, content > 2× viewport | Work area scrolled to bottom | `documentElement.scrollHeight === clientHeight` (±1), work area `scrollHeight > clientHeight`, band + tabs rects unchanged vs. offset 0 |
| `SAV-AC-2` | Overview, 1280×800, content < viewport | Rendered | No vertical scrollbar anywhere; work area bottom edge = viewport bottom |
| `SAV-AC-3` | Any SP tab, TEST banner on, a width where the banner wraps (≈ 1100 CSS px) and 1440px | Rendered | Band top = header bottom (±1px) at every header height; same with banner off. *Amended:* widths are effective CSS px — under the Orca root zoom ×1.2 request ÷1.2 |
| `SAV-AC-4` | Reporting work area scrolled 1200px | Click Results tab | Frame rects unchanged; Results work area `scrollTop === 0`; band shadow off |
| `SAV-AC-5` | Overview, guided tour running / AOW row focus request for below-fold target | Step advances / focus fires | Target rect ⊂ work-area rect; `window.scrollY === 0` |
| `SAV-AC-6` | Band mounted with `scrollHost` set / with `scrollHost = null` | Element `scrollTop` → 11 / 65 / window `scrollY` → 11 | `isScrolled` true / `bandCollapsed` true (when collapsible) from the element alone; with no host, the window scroll turns `isScrolled` on (fallback) |
| `SAV-AC-7` | Reporting AOW mode, rail open, work area scrolled | Keep scrolling | Rail rect `top 0`, `height = innerHeight`, rail inside the locked host and not clipped (*amended: no band in AOW mode*) |
| `SAV-AC-8` | Overview at an effective CSS width < 900 (800×1100 unzoomed; request < 750 wide under the Orca root zoom ×1.2), long content | Rendered | Document scrolls; host `position: static`; no work-area scrollbar |
| `SAV-AC-9` | Results, all columns, 1280 / 1440 / 1600 | Rendered | `scrollWidth === clientWidth` on document and work area; table wrapper scrolls horizontally |
| `SAV-AC-10` | Overview ≥ `md` | Open + close "Where to report" modal | Band/tabs rects identical before/after; no document overflow |
| `SAV-AC-11` | Repo | `grep` for `window.scroll`/`scrollY` in `dashboard-lab` and `programme-results` | Zero hits outside comments/tests; `reporting-program-band` keeps exactly one documented window listener as the < `md` fallback (`SAV-DD-4`) |
| `SAV-AC-12` | Docs | `docs/ux-ui/design.md` §6 and the three module guides | "Viewport-locked page" variant documented with the outlet-slot contract (recorded as pending default-branch write for `design.md` per shared-file discipline) |

Cross-cutting project ACs that apply unchanged: `AC-3` authorization (no route changes), `AC-9` security (no logging added).

## 12. Dependencies & Assumptions

**Upstream**
- `app.component.html` outlet slot stays `relative min-h-0 min-w-0 flex-1` (documented containing block; `result-detail` depends on it too).
- Spartan sidebar exposes `--sidebar-width` / `--sidebar-width-icon` (already consumed by `dashboard-lab` `--rail-w`).

**Downstream**
- Follow-up chunks (Home, Bilateral review, …) will consume the convention from `SAV-R-11`.
- Cypress CT harness (`cypress/support/component.ts`, self-hosted Material Icons) is the layout gate; `project-cypress-ct-harness-quirks` memory applies (primeicons/TS2322 noise is known).

**Assumptions**
- A1 — Band + tab strip pinned; each tab's controls row scrolls with its content (proposal default, not yet confirmed by the user).
- A2 — Fallback to document scroll below `md` (proposal default).
- A3 — The Angular router has no `scrollPositionRestoration` configured (none found in `routing-data.ts`/`app.module.ts`), so nothing restores window scroll on navigation; work-area reset is the page's job (`SAV-R-4`).
- A4 — The only `pr-p25-drawer-scroll-lock` toggler lives in Results-list filters (outside this scope); SP drawers do not lock `body` today, so `SAV-R-10` is about geometry, not lock semantics.

## 13. Open Questions

- `SAV-OQ-1` — Confirm A1 (controls row scrolls with content). If the user prefers a pinned controls row, `SAV-R-2` changes and the work area starts below the controls row instead of the tab strip. **Default if unanswered: scrolls with content.**
- `SAV-OQ-2` — Confirm A2 (fallback below `md`). **Default: fallback.**
- `SAV-OQ-3` — Should the work area lock (`overflow: hidden`) while a drawer/modal is open? Not required by any scenario; **default: no**, deferred to a follow-up if wheel-through becomes a complaint.

## 14. Out-of-Band Notes

- `docs/ux-ui/design.md` is a shared baseline file: the §6 addition is **recorded as pending** and applied on the default branch by `/akili-archive`, not on the spec branch.
- The convention artifact chosen in `design.md` must not change `result-detail` behavior; that page may adopt the shared artifact later as a no-op refactor.
