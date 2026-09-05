# Proposal — SP shell as a viewport-locked application frame

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-shell-app-viewport` |
| Slug | `sp-shell-app-viewport` — derived from free-text argument |
| Type | Change |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | yes (touches only the SP shell pages + one band component; no server, no migrations, no API contract) |
| Requested by | Juan Carlos Cadavid — 2026-09-04 |
| Baseline consulted | `docs/prd.md`, `docs/ux-ui/design.md` §6 Page shell · §9 Responsive · DD-11 root `zoom` · DD-12 brand line, `docs/trd/trd.md`, `onecgiar-pr-client/CLAUDE.md`, `pages/result-framework-reporting/README.md`, `pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md`, `pages/result-framework-reporting/pages/programme-results/CLAUDE.md` |
| Kaizen lessons applied | `changes--result-detail-footer-overlap` (viewport-locked page must stay off `FooterComponent.routes`), `changes--clear-filters` (browser-only gates need a capability smoke probe before the first task), `changes--aow-identity-column-starvation` (Orca browser: set viewport after `goto`; root zoom ×1.2 inflates measurements) |
| Model | T1 phase run on Fable 5.1 (stronger than the registry's `opus` pin — registry entry flagged for update, no downgrade recommended) |

## Intent

Make the Science Program section (**Overview**, **Reporting**, **Results** under `/result-framework-reporting/entity-details/:entityId[/overview|/results]`) behave like an application frame instead of a web page: the frame (app sidebar, topbar, program band with its tabs) always occupies exactly the viewport, the document never scrolls, and **only the work area of the active tab scrolls internally** — the way Jira pins its header, sidebar and project tabs and scrolls the report pane beneath them.

## Problem / Current Behavior

Today the SP pages grow the document and the browser scrollbar spans the whole window: banner, topbar, band and tabs ride along with the content (see `visual-reference/prms-current-sp-overview-document-scroll.png`, red marker). Concretely:

| Layer | Today | Evidence |
|---|---|---|
| App shell | `main` is `min-h-svh`; the outlet slot is `flex-1 min-h-0` inside a document that grows with content | `app.component.html` (sidebar wrapper + `main hlmSidebarInset`) |
| Header | `app-shell-header` is `position: sticky; top: 0` — it *follows* document scroll rather than owning a fixed frame | `app.component.scss` |
| Program band + tabs | `sticky` at `top: var(--pr-shell-header-height, 56px)`. The variable is a constant, but the header is not: the test-environment banner sits in the same sticky wrapper and makes it taller, so the band pins *under* the banner on TEST | `reporting-program-band.component.html` :18 · `app.component.scss` `:root { --pr-shell-header-height: 56px }` |
| Band "scrolled" shadow | Reads `window.scrollY` on a throttled window scroll listener | `reporting-program-band.component.ts` :310–324 |
| Overview / Reporting (`dashboard-lab`) | `:host { display: block }`; content grows the document; page-local AOW rail and search popover are `position: fixed` overlays | `dashboard-lab.component.scss` :8 · `.component.html` :4, :31 |
| Results (`programme-results`) | `<section class="min-h-screen …">` — also grows the document | `programme-results.component.html` |
| Footer | Not rendered on `/result-framework-reporting/*` (route allow-list) — no footer conflict on these pages | `footer.component.ts` `routes[]` |

The perceived effect is "a long web page with a sticky header", not "an application with a fixed frame". Fixed-position overlays (AOW rail) further expose the mismatch: they stay put while the band and tabs scroll away.

**A precedent already exists in the repo.** `result-detail` is viewport-locked: its `:host` is `position: absolute; inset: 0; display: flex; overflow: hidden` inside the `relative` outlet slot that `app.component.html` provides for exactly this purpose, and each rail scrolls on its own. Its SCSS header documents *why* a `height: 100%` chain cannot work (`min-height` never makes a height definite; the first attempt was reverted) — that lesson is the basis of the recommended approach below.

## Proposed Outcome

Behavior, from the user's seat, on Overview, Reporting and Results:

1. The page never shows a document scrollbar. The frame — app sidebar, topbar (and TEST banner when present), program band, tab strip — is always fully visible and never moves.
2. Each tab's **work area** is its own scroll container, starting immediately below the pinned chrome and ending at the bottom edge of the viewport. Its scrollbar is the only vertical scrollbar on screen (Jira reference: `visual-reference/jira-reference-app-frame.png`, scrollbar starts under the tab strip).
3. Switching tabs swaps the work area; the frame stays. The scroll position of the new tab starts at the top.
4. Overview: the scroll container wraps the Phase/Filter row **and** the content (KPI cards, Progress by AoW, ToC map, …), mirroring Jira where the "More reports" row scrolls with the pane. Reporting and Results: same rule — the tab's controls row scrolls with its content; table headers keep their existing `sticky` behavior *inside* the new container.
5. Anchors, guided tour (driver.js) and every "scroll to row / heading" behavior keep working because they use `scrollIntoView`, which resolves against the nearest scrollable ancestor.
6. The band's "scrolled" shadow reacts to the work-area scroll, not to `window.scrollY`.
7. Below the `md` breakpoint (900px, design.md §9) the pages fall back to document scroll — a locked frame on a phone eats too much height and the section is desktop-first.

## Scope

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/` — host box (`:host`), the two view layouts (`rfrView: 'overview' | 'planned'`), scroll-dependent helpers.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/` — outer `<section>`/`<article>` box.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/` — sticky rule and `isScrolled()` source.
- One **reusable layout convention** (a documented `:host`/wrapper recipe or a tiny shared directive/utility class, decided in `/akili-specify`) so the same pattern can be adopted by other pages later without re-deriving the result-detail lesson.
- `docs/ux-ui/design.md` §6 Page shell — add the "viewport-locked application frame" variant (default-branch write; recorded as pending per shared-file discipline).
- Module guides: `dashboard-lab/CLAUDE.md`, `programme-results/CLAUDE.md`, `result-framework-reporting/README.md` §4 — layout contract update.

## Non-Goals

- Not touching other surfaces in this spec: Home (`/home`), Bilateral results review, Portfolio overview, Results Center, IPSR, QA, Admin. The user stated the principle "applies to the whole application"; those are **follow-up chunks** to be opened as sibling proposals once this one lands and proves the convention (see Open Questions).
- No change to the app-level chrome (Spartan sidebar, topbar, TEST banner) beyond what the pages need. `result-detail` already proves the shell slot supports viewport-locked pages without shell edits.
- No redesign of content, tokens, tables, filters or data flows. Pure layout/scroll-ownership change.
- No change to `result-detail` (already locked).
- No mobile redesign: below `md` we keep today's behavior.

## Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| SP members, PMU, Center users on Overview / Reporting / Results | Frame stays put; scrolling only moves the work area. Faster orientation, no "lost tabs". |
| `dashboard-lab`, `programme-results`, `reporting-program-band` | Layout box + scroll source changes. |
| Guided tour (`changes/sp-guided-tour-driverjs`), overview drill-downs, AOW row focus (`reporting-aow-table` :798, :1242), heading jump (`dashboard-lab` :2219, :3182) | Must be re-verified inside the new scroll container (`scrollIntoView` is container-agnostic; driver.js highlights rely on `getBoundingClientRect`, also fine). |
| `pr-p25-drawer-scroll-lock` on `html/body` | Becomes a no-op on these pages (document no longer scrolls). Harmless; the drawer may need to lock the *work area* instead — design question. |
| Cypress CT layout gates (`project-cypress-ct-harness-quirks`) | New assertions: no document overflow; work-area `scrollHeight > clientHeight` when content is long; band top offset independent of banner. |
| `docs/ux-ui/design.md` §6 | New layout variant documented. |

## Visual Reference

- Source: User-provided screenshots (no Figma, no Jira ticket).
- Location: `docs/specs/changes/sp-shell-app-viewport/visual-reference/`
  - `jira-reference-app-frame.png` — target behavior: fixed top bar + sidebar + project tab strip; the report pane's scrollbar starts under the tabs.
  - `prms-current-sp-overview-document-scroll.png` — current PRMS Overview: window-wide scrollbar (red marker) spanning banner, topbar, band and tabs.
- Notes: The Jira capture is a **behavioral** reference (what pins, what scrolls), not a visual one — PRMS keeps its own brand line (design.md DD-12). No generated mockup needed: the change alters scroll ownership, not appearance.

## Requirement Delta Preview

### ADDED Requirements

- SP shell pages (Overview, Reporting, Results) render as a viewport-locked frame at ≥ `md`: the document has no vertical overflow; exactly one scroll container (the tab work area) owns vertical scrolling.
- The pinned chrome height is derived from layout, never from a hard-coded constant, so the TEST banner (present/absent, wrapping on narrow widths) cannot push the band out of place.
- A documented, reusable "viewport-locked page" convention exists in `design.md` §6 and in code, with `result-detail` and the SP shell as its two adopters.
- The band's scrolled-state shadow is driven by the work-area scroll offset.

### MODIFIED Requirements

- `reporting-program-band` sticky positioning: from `sticky; top: var(--pr-shell-header-height)` against the document to a non-scrolling flex child of the locked frame (the band no longer needs to be sticky at all).
- `programme-results` outer box: from `min-h-screen` document growth to a flex column that fills the frame with an internal scroll region.
- `dashboard-lab` host: from `display: block` to the locked-frame box; its page-local `fixed` overlays (AOW rail, search popover) keep working — they are already viewport-anchored.

### REMOVED Requirements

- Dependence on `window.scrollY` / window scroll listeners in the SP shell.
- Reliance on `--pr-shell-header-height` as the band's sticky offset on these pages (the variable stays for any other consumer).

## Approach Options

| # | Option | How | Trade-offs |
|---|---|---|---|
| A | **Per-page host lock (result-detail pattern)** | Each SP page's `:host` becomes `position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden` inside the existing `relative` outlet slot. Band and tabs are `flex-none`; the work area is `flex: 1; min-height: 0; overflow-y: auto`. Band listens to the work-area scroll. | ✅ Proven in this repo, zero shell edits, no JS header measurement, banner-safe by construction. ➖ Recipe repeated in two hosts (mitigated by a shared utility class or directive). |
| B | Shell-level lock for everyone | Make `main`/outlet slot a fixed `100svh` frame with internal scroll for **all** routes. | ✅ One change covers the whole app. ❌ Breaks every page that assumes document scroll today (Home, lists, admin, drawers' body scroll-lock, footer routes with `floating`), far outside the requested scope; high regression surface; blocks the incremental "prove it on SP first" path. |
| C | Height chain (`height: 100%` down to the page) + `overflow: auto` | Force definite heights from `html` down through `main` and the slot. | ❌ Already attempted and reverted for `result-detail`: `min-height` never yields a definite height, so `100%` resolves to content height and the inner scroll never engages. Documented in `result-detail.component.scss` header. |

## Recommended Approach

**Option A**, packaged as a reusable convention. It is the smallest safe path: it reuses the mechanism the repo already validated, needs no edits to the shared shell, is immune to the variable header height, and leaves every other page untouched. `/akili-specify` should decide between (i) a shared utility class in `styles.scss` (e.g. `.pr-viewport-page` + `.pr-viewport-page__scroll`) and (ii) a small `@Directive` that also exposes the scroll element for the band — the directive is preferable if more than one consumer needs the scroll offset.

Design-time checks the spec must cover:

1. Band `isScrolled()` → subscribe to the work-area element's `scroll` (passive, throttled, outside zone as today) instead of `window`.
2. `scrollIntoView` call sites (4) and driver.js tour → verify behavior inside the container; no code change expected.
3. Drawer scroll-lock (`pr-p25-drawer-scroll-lock`) → decide whether to lock the work area while a drawer is open.
4. `position: fixed` page-local overlays in `dashboard-lab` → confirm no ancestor gains `transform`/`contain` that would re-anchor them.
5. Responsive: `@media (max-width: 899px)` restores `position: static` / document scroll.
6. Router: `scrollPositionRestoration` (if enabled) targets `window`; confirm tab switches land at the top of the work area (reset on route change if needed).

## Risks, Dependencies, And Open Questions

| Kind | Item | Mitigation |
|---|---|---|
| Risk | Very long Reporting tables now scroll inside a container: sticky table headers must use the container as their sticky root — they will, since the overflow container *is* the sticky containment block, but `top` offsets computed against the band must be re-measured. | Cypress CT layout gate at 1280/1440/1600 widths; Orca real-page check (viewport set after `goto`, ×1.2 zoom accounted for). |
| Risk | Content that relied on the document growing (e.g. absolutely positioned popovers with `top-full` inside `overflow: hidden` ancestors) could get clipped at the work-area edge. | Audit `overflow-hidden` wrappers in `dashboard-lab` before task cut; popovers already use `z-[30]` and live inside the scrolling content, which is `overflow-y: auto` (not hidden). |
| Risk | The TEST banner wraps to two lines on narrow desktop widths; the locked frame must still place the band correctly. | Option A derives the frame from the outlet slot, so this is handled by layout, not by a constant — add it as an explicit acceptance scenario. |
| Dependency | `app.component.html` outlet slot must stay `relative min-h-0 min-w-0 flex-1` (it is documented as the containing block for locked pages). | Note in design.md §6; no change required. |
| Lesson KZ (`clear-filters`) | Browser-only gates need a capability smoke probe before task 1 (viewport actually resizes; document `scrollHeight === clientHeight` readable). | Pre-flight in `tasks.md`. |
| Open question | Roll-out order for the rest of the app ("applies to the whole application"): Home, Bilateral review, Portfolio overview, Results Center, IPSR, QA, Admin. Proposal: open a `family.md` **after** this chunk lands, seeding chunks by RICE — Home and Bilateral review first (same module, same users), listings next, admin last. | Decision for the user at approval. |
| Open question | Should the per-tab controls row (Phase/Filter on Overview; search/filters on Reporting and Results) scroll with the content (Jira behavior, recommended — keeps ~50px of vertical room) or pin under the tabs? | Default = scrolls with content unless the user prefers pinned. |
| Open question | Below `md`, fall back to document scroll (recommended) or keep the locked frame? | Default = fallback. |

## Success Criteria

- On Overview, Reporting and Results at ≥ 900px: `document.documentElement.scrollHeight === window.innerHeight` (no document scroll) while the work area reports `scrollHeight > clientHeight` on long content.
- Sidebar, topbar, TEST banner (when on), band and tab strip remain fully visible at any scroll offset of the work area; band top edge sits flush under the header with the banner present **and** absent.
- Only one vertical scrollbar is visible on screen; it starts below the tab strip.
- Tab switch keeps the frame and starts the new work area at offset 0.
- Guided tour, "jump to heading", AOW row focus and result drill-downs land the target inside the visible work area.
- Band shadow appears once the work area scrolls past the threshold and disappears at the top.
- Below 900px, behavior is unchanged from today (document scroll).
- Client Jest + Cypress CT gates green; no new `window.scroll*` references in the SP shell.

## Next Step

```text
/akili-specify changes/sp-shell-app-viewport
```

Change track, standard depth. UI surface only (client). Skills for tasks: `angular-developer`, `tailwind-design-system` (layout/container work), Cypress CT for the layout gate.
