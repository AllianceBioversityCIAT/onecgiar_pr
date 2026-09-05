# Design — SP shell as a viewport-locked application frame

**Shape of the solution:** each SP page host takes the `result-detail` lock (`position: absolute; inset: 0` inside the shell's `relative` outlet slot, ≥ 900px only), lays out as a flex column *band → work area*, and the work area is the single `overflow-y: auto` region. The band stops being `sticky` inside the locked frame and reads its scroll state from the work area element the page hands it. No shell edits, no JS height measuring, no new global CSS class: one Sass mixin holds the recipe.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-shell-app-viewport` |
| Requirements | `./requirements.md` (`SAV-R-1..13`, `SAV-AC-1..12`) |
| Depth | Standard (re-checked in §14 — holds) |
| Type | Change |
| Approval Mode | gated |
| Baseline | `docs/ux-ui/design.md` §6 Page shell, §9 Responsive, §10 A11y, DD-11, DD-12 · `docs/trd/trd.md` §6 Frontend architecture · `onecgiar-pr-client/CLAUDE.md` §5 Tailwind-first + root font-size trap |
| Precedent reused | `pages/results/pages/result-detail/result-detail.component.scss` (`:host` lock + `.rd_scroll`) and its `CLAUDE.md` "Contrato de layout" |
| Kaizen applied | `changes--clear-filters` → `SAV-DD-6` (capability probe before task 1) · `changes--aow-identity-column-starvation` → §11 (Orca viewport after `goto`, zoom ×1.2) · `changes--result-detail-footer-overlap` → §7 (footer allow-list untouched) |
| Skills | `angular-developer`, `tailwind-design-system`, `ui-ux-pro-max` (layout review), Cypress CT |
| Delegation | none — design authored inline (CodeGraph + targeted reads stayed under the 4-file threshold per question) |

## 1. Summary

Three pages, one recipe. `dashboard-lab` (Overview + Reporting, plus the band-less AOW mode) and `programme-results` (Results) become **locked pages** at ≥ `md`: the host is pulled out of flow and pinned to the outlet slot, so the slot's leftover height (`100svh − header`, whatever the header is) becomes a real, definite height. Inside, a flex column puts the band on top as `flex-none` and the tab's body in a `flex-1 min-h-0 overflow-y-auto` work area. Below `md` the mixin does nothing and today's document-scroll layout stays. The band gets two inputs — `frameLocked` (drop `sticky`) and `scrollHost` (read offsets from this element, window as fallback) — so its shadow and compact mode keep working in both layouts. The biggest constraint accepted: the lock is **per page host**, not shell-wide (`SAV-DD-1`), so other surfaces adopt it one at a time.

## 2. Architecture Overview

### 2.1 Where this lives

- **Client modules touched:** `pages/result-framework-reporting/pages/dashboard-lab/` (host, template wrappers, band bindings), `.../dashboard-lab/components/reporting-program-band/` (inputs + scroll source), `pages/result-framework-reporting/pages/programme-results/` (host + wrappers), `src/styles/` (new mixin partial).
- **Shell (read-only dependency):** `app.component.html` outlet slot `div.relative.min-h-0.min-w-0.flex-1` — the containing block. Not edited; its contract is documented (`SAV-R-11`).
- **Server / API / data:** none.

### 2.2 Box model (≥ `md`, program shell)

```
main.hlmSidebarInset (flex col, min-h-svh)
├── .app-shell-header (sticky top-0; banner? + topbar)      ← height varies, never measured
└── div.relative.min-h-0.flex-1                             ← outlet slot = containing block
    └── app-dashboard-lab | app-programme-results  :host    ← ABSOLUTE inset-0, flex col, overflow hidden
        └── section (flex-1 min-h-0 flex col)                ← program-shell branch
            └── article (flex-1 min-h-0 flex col)
                ├── app-reporting-program-band  [frameLocked]=true [scrollHost]=workArea   flex-none, NOT sticky
                └── div #workArea (flex-1 min-h-0 overflow-y-auto custom_scroll)           THE scroller
                    ├── tab controls row (phase/filter · toolbar · results filters)        scrolls with content
                    └── tab body (overview sections · reporting table · results table)
```

AOW mode of `dashboard-lab` (`viewMode() === 'aow'`, no band): the `section` itself is the work area (`overflow-y-auto`). The AOW rail and search popover stay `position: fixed` — viewport-anchored, unaffected by the host's `overflow: hidden` (no `transform`/`contain` is introduced on any ancestor, `SAV-R-7`).

### 2.3 Box model (< `md`)

Identical to today: host `display: block` in flow, `section.min-h-screen`, band `sticky top: calc(var(--pr-shell-header-height) − 1px)`, document scrolls, band listens to `window` (fallback path). The mixin's rules live entirely under `@media (min-width: 900px)`.

### 2.4 Primary flows

| Flow | What happens |
|---|---|
| Land on Reporting ≥ `md` | Route data `rfrView: 'planned'` → `isProgramShell()` true → host class `pr-viewport-page` bound → mixin locks the host → work area is the scroller. Band mounts with `frameLocked=true`, `scrollHost=#workArea`; first `syncBandCollapsed()` reads `scrollHost.scrollTop` (0). |
| Scroll work area | Passive `scroll` listener on the element (outside zone) → threshold crossing → zone re-entry → `isScrolled` / `bandCollapsed` flip (`SAV-R-6`). |
| Tab switch | Different route config per tab (`entity-details/:id`, `/overview`, `/results`) → component re-created → new work area at `scrollTop 0` (`SAV-R-4`). No explicit reset needed; verified, not assumed (`SAV-AC-4`). |
| Heading jump / row focus / tour | `scrollIntoView` scrolls the nearest scrollable ancestor (the work area); window has nothing to scroll (`SAV-R-5`). driver.js overlays are `fixed`. |
| Open AOW rail | Rail is `fixed inset-y-0`; work area keeps scrolling behind; band stays visible in the frame (`SAV-R-7`). |
| Resize across 900px | Media query flips the mixin; band's Tailwind `min-[900px]:` utilities flip `sticky`↔`static`; band listener reads `scrollHost.scrollTop + window.scrollY` so whichever scroller is active drives the state. |

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None.

## 6. Frontend Plan

### 6.1 Routes / modules

No route changes. The lock is keyed on existing route data: `rfrView ∈ {overview, planned}` for `dashboard-lab` (`isProgramShell()`), always-on for `programme-results` (it only serves the Results tab). Portfolio routes served by `dashboard-lab` (`/overview`, `/planned-toc`, `/emerging`, `/centers`, `/dashboard-lab`) are **not** locked — out of scope, follow-up chunk.

### 6.2 Components & files

| File | Change |
|---|---|
| `src/styles/_viewport-page.scss` (new) | Sass mixin `pr-viewport-page` — the lock recipe, media-gated at 900px, with the `result-detail` rationale as a comment (why absolute, not a height chain; containing block contract). Mixin, not a global class (`SAV-DD-3`). |
| `dashboard-lab.component.ts` | `host: { '[class.pr-viewport-page]': 'isProgramShell()' }`; `workArea = viewChild<ElementRef<HTMLElement>>('workArea')`; computed `workAreaEl` passed to the band. |
| `dashboard-lab.component.scss` | `:host(.pr-viewport-page) { @include pr-viewport-page; }` — keeps the existing `--rail-w/--panel-w` vars. |
| `dashboard-lab.component.html` | Program-shell `section` and both `article`s gain `min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:flex min-[900px]:flex-col` and drop `min-h-screen` under the lock (`min-[900px]:min-h-0`); a new `div #workArea` wraps everything below the band in both Overview and Reporting articles with `min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto custom_scroll`. AOW-mode `section` gets the same scroller utilities (no band). Band bindings: `[frameLocked]="true" [scrollHost]="workAreaEl()"`. |
| `reporting-program-band.component.ts` | New inputs `frameLocked = input(false)`, `scrollHost = input<HTMLElement \| null>(null)`. Listener attaches to `scrollHost` when present (effect re-attaches on change) **and** keeps the window listener; offset = `scrollHost.scrollTop + window.scrollY` (`SAV-DD-4`). |
| `reporting-program-band.component.html` | Sticky box: `[class]` adds `min-[900px]:static min-[900px]:!top-auto` when `frameLocked()`; unchanged otherwise. |
| `programme-results.component.ts/.html` | `host: { class: 'pr-viewport-page' }` (+ `styles` include of the mixin); `<section>` loses `min-h-screen` under the lock and becomes the flex column; `div #workArea` wraps the filter row + table; band bindings as above. |
| Cypress CT (new) `src/styles/viewport-page.recipe.cy.ts` or colocated under `shared/` | Recipe harness spec (see §10). |
| Jest | `reporting-program-band.component.spec.ts` (+ scroll-source cases), `dashboard-lab.scope.spec.ts` or new `dashboard-lab.viewport.spec.ts` (host class per `rfrView`), `programme-results.component.spec.ts` (host class, band bindings). |
| Docs | `dashboard-lab/CLAUDE.md`, `programme-results/CLAUDE.md`, `result-framework-reporting/README.md` §4; `result-detail/CLAUDE.md` gains a one-line pointer to the mixin; `docs/ux-ui/design.md` §6 addition **recorded as pending** (default-branch write). |

State boundary: none new. `workAreaEl` is a derived signal on the page component; the band owns its own scroll-state signals as today.

### 6.3 Design system usage

- Tailwind utilities for every flex/overflow rule in templates (`min-[900px]:` arbitrary variant; px only). SCSS limited to the `:host` box via the mixin — the explicitly allowed exception in `onecgiar-pr-client/CLAUDE.md` §5.
- Scrollbar: existing `custom_scroll` class on the work area (`SAV-R-12`).
- No tokens added. Backgrounds unchanged (`--pr-surface-app` on the program-shell section).
- Responsive: single breakpoint `md` = 900px, matching `docs/ux-ui/design.md` §9 and the band's existing `min-[900px]` usage.
- A11y: the work area is a plain scroll container (no `tabindex`, no role); keyboard scrolling works once focus is inside. Existing `inert` on the collapsed band identity block is untouched. `prefers-reduced-motion` handled by the existing `scrollIntoView` call sites.
- i18n: no strings.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

None. Footer allow-list unchanged (SP routes not listed — `changes--result-detail-footer-overlap` lesson holds: never add a locked page to `FooterComponent.routes`).

## 8. Performance & Capacity

- One passive scroll listener per band instance (as today), plus the retained window listener; both outside the zone; zone re-entry only on threshold flips.
- No layout thrash: no `getBoundingClientRect` in the scroll path; `scrollTop` read only.
- Bundle: one Sass partial, no dependencies.

## 9. Observability

None.

## 10. Testing Plan

| Gate | Proves | Cannot prove |
|---|---|---|
| **CT recipe harness** (real Chromium): a throwaway host component built in the spec that reproduces the shell chain (`main.flex.flex-col.min-h-svh` → header block of variable height → `div.relative.min-h-0.flex-1` → a locked child using the mixin + the exact Tailwind wrapper utilities, with stub content ≥ 2× viewport). Asserts `SAV-AC-1/2/3/6-geometry/7/8/9` on the *recipe* at 1280×800, 1100×800 (two-line banner stub), 800×1100, 1440, 1600. | The mechanism is correct in a real layout engine, including the banner-height case and the < `md` fallback. | That the *real pages* apply it (that is a presence/behavior gap covered by the next two rows). |
| **Jest** on `dashboard-lab` (`rfrView` ∈ overview/planned → host class present; emerging/centers/dashboard → absent) and `programme-results` (class present; band receives `frameLocked` + `scrollHost` = the `#workArea` element). | The pages opt in exactly where required. | Rendered geometry (jsdom) — recorded gap, closed by the browser probe. |
| **Jest** on `reporting-program-band`: given `scrollHost`, element `scrollTop` 11 / 65 flips `isScrolled` / `bandCollapsed`; given no host, window flips them (fallback). Falsifier: drop the element listener → the element case fails red. | `SAV-R-6`, `SAV-AC-6`. | — |
| **Real-browser probe** (Orca embedded browser, session already logged in; viewport set **after** `goto`): a small JS probe returns `{docScrollH, docClientH, waScrollH, waClientH, bandRect, headerRect, railRect, scrollX widths}` on the three pages at 1280/1440/1600 and 800 wide, banner on (TEST). Readings recorded verbatim in `execution.md`. | `SAV-AC-1..5, 7..10` on the actual pages. | Perception (`D9`) — HITL looks at the same screen. |
| **HITL** at the task-5 pause: side-by-side with `visual-reference/jira-reference-app-frame.png`; guided tour run to a below-fold step. | `D9`, `SAV-AC-5` tour case. | — |
| Existing Jest suites for `dashboard-lab.*`, `programme-results`, band. | `D8` regressions. | — |

Disqualifiers (from `requirements.md` §10) apply verbatim: assert `innerWidth/innerHeight` before any geometry assertion; treat a `scrollHeight === clientHeight` reading with short stub content as void; ratios not raw px in the zoomed Orca browser.

## 11. Backwards Compatibility & Migration Plan

- No API, no data, no flags. Pure client layout.
- `result-detail` untouched; a follow-up MAY refactor its `:host` to the mixin as a no-op.
- Rollback = revert the PR. Nothing persists.
- Real-browser probe must run on TEST (banner on) — local has no banner; local still validates the banner-off case.

## 12. Design Decisions (ADRs)

### `SAV-DD-1` — Lock per page host, not shell-wide

- **Context:** the proposal weighed a shell-level `100svh` frame (Option B). Every other page assumes document scroll (lists, admin, footer `floating` routes, drawer body scroll-lock).
- **Decision:** lock at the page host, keyed on route data; the shell slot stays as is.
- **Alternatives:** shell-wide lock (rejected: app-wide regression surface, blocks incremental adoption); height chain (rejected: proven to fail — `result-detail` header comment).
- **Consequences:** each future surface opts in explicitly (one class + one mixin include). The outlet slot's `relative min-h-0 flex-1` becomes a documented contract with three dependants.

### `SAV-DD-2` — `position: absolute; inset: 0` is the mechanism

- **Context:** `min-height` up the chain never yields a definite height; `flex-1` shares 0 leftover once content exceeds the viewport.
- **Decision:** pull the host out of flow; the slot then resolves to the true leftover under the header, and `inset: 0` fills it.
- **Alternatives:** `height: 100dvh − header` with a measured header (rejected: header height is variable — banner optional and wrapping — and JS measuring is a resize-observer tax); CSS `container` units (rejected: same definite-height problem).
- **Consequences:** anything inside the host that relied on document flow (none found: the fixed overlays are viewport-anchored, modals are portaled dialogs) must be inside the work area.

### `SAV-DD-3` — Recipe as a Sass mixin, not a global `.pr-*` class

- **Context:** `onecgiar-pr-client/CLAUDE.md` §5 forbids new `.pr-*` SCSS layout classes but allows `:host` box setup in SCSS. `result-detail` inlines the recipe today.
- **Decision:** `src/styles/_viewport-page.scss` exports `@mixin pr-viewport-page` (media-gated). Hosts include it under a host class (`dashboard-lab`, conditional) or unconditionally (`programme-results`). Inner boxes use Tailwind utilities.
- **Alternatives:** global utility class in `styles.scss` (rejected: violates the hard rule and leaks into any element); Angular directive setting inline styles (rejected: inline styles beat utilities and hide the layout from the template; also would need `matchMedia`).
- **Consequences:** the convention is discoverable in one file; `result-detail` can migrate later without behavior change.

### `SAV-DD-4` — Band reads `scrollHost.scrollTop + window.scrollY`

- **Context:** ≥ `md` the work area scrolls and `window.scrollY` is 0; < `md` the reverse. `SAV-R-6` requires work-area-driven state; `SAV-R-8` requires the fallback to keep working.
- **Decision:** the band takes `scrollHost` as an input, listens to it **and** to `window`, and sums the offsets. No `matchMedia` in TS; the CSS breakpoint decides which scroller is live and the other contributes 0.
- **Alternatives:** shared `ViewportScrollService` + registration directive (rejected for now: extra files for one consumer; `SAV-R-13` MAY stays deferred); `matchMedia` switch (rejected: duplicates the breakpoint in TS).
- **Consequences:** one extra listener when locked (harmless, passive). Jest can drive both scrollers deterministically.

### `SAV-DD-5` — Band drops `sticky` when `frameLocked` at ≥ `md` (reversion — challenged)

- **Context:** inside an `overflow: hidden` host the host *is* the sticky scrollport; a `sticky; top: 55px` band would be shoved 55px down within the article and open a gap. The band must be `static` in the locked frame.
- **Decision:** input `frameLocked`; when true, Tailwind `min-[900px]:static min-[900px]:!top-auto` on the sticky box. Below `md` and on pages that do not pass the input (none today besides the three), behavior is unchanged.
- **Reversion challenge — "what does removing sticky break?"** Reviewed inline: (1) below `md` nothing changes — utilities are gated; (2) the `-mt-px` overlap trick and the `isScrolled` shadow do not depend on `sticky`; (3) the ⓘ popover anchors to the identity block, which is still in the band — unaffected; (4) `bandCollapsed` height animation stays; (5) no test asserts `position: sticky` on the band (checked `reporting-program-band.component.spec.ts` — assertions are on classes/inputs, not computed position). **No concrete breakage found; decision stands.**
- **Consequences:** two layout modes for one component, both expressed in the template and visible in the DOM.

### `SAV-DD-6` — Capability probe before the first task (kaizen `changes--clear-filters`)

- **Context:** the layout gates are browser-only; a viewport that silently does not resize produces green nonsense.
- **Decision:** `tasks.md` pre-flight includes a 60-second probe: CT `cy.viewport` → `innerWidth` asserted; Orca browser `goto` → set viewport → `innerWidth` read back (÷1.2 zoom). Failure re-routes the layout checks to a human/another host **before** `SAV-T-1` starts.
- **Consequences:** an inconclusive gate is reportable as such, never collapsed into a pass.

### `SAV-DD-7` — Controls row scrolls with the content (assumption A1 → decision)

- **Context:** `SAV-OQ-1` defaulted; Jira scrolls its "More reports" row; pinning both band and controls would eat ~110px of a laptop viewport (the band's own template comment warns against double sticky chrome).
- **Decision:** work area starts right under the tab strip; controls rows are its first child.
- **Alternatives:** pinned controls (rejected by default; revisit only on user request).
- **Consequences:** filters are one short scroll away on long tables; the band remains the only fixed page chrome.

## 13. Open Gaps & Follow-ups

- Portfolio routes served by `dashboard-lab` and every other surface (Home, Bilateral review, Results Center, IPSR, QA, Admin) — follow-up `family.md` after this lands (proposal Open Question).
- `SAV-OQ-3` (lock the work area while a drawer is open) — deferred; not required by any scenario.
- `result-detail` adoption of the mixin — optional no-op refactor.
- Risk: a future page-local element with `position: fixed` inside an ancestor that gains `transform` would re-anchor; the recipe comment states "no transform on the host or its wrappers".
- Risk: Orca probe on TEST needs the deployed branch; if the probe can only run locally, the banner-on geometry is covered by the CT banner stub only — record as partial evidence, not as pass.

## 14. Budget (Step 2.4 sizing)

| Number | Estimate |
|---|---|
| Tasks | 6 (recipe + CT, band, dashboard-lab, programme-results, browser probe + HITL, docs) |
| LOC | ~280 (mixin ~40 · band ~45 · dashboard-lab ~50 · programme-results ~25 · CT recipe spec ~90 · Jest ~30) |
| Review rounds | ≤ 2 |

Standard depth holds: cross-component layout contract with browser-only gates is more than Lite, well under Full (no API, no data, no auth). `/akili-execute` trips on > 8 tasks, > 450 LOC, or a third review round.
