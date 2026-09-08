# Tasks — Bilateral review: viewport lock, pinned filters, table color and columns

## 1. Scope

- **Module / feature:** `result-framework-reporting` → `pages/bilateral-review/` (`BRV`)
- **Linked spec:** `requirements.md` + `design.md`; parents `sp-bilateral-review-tab`, `bilateral-review-ux-polish`
- **Approval Mode:** pre-approved (owner, 2026-09-08)
- **Execution limits (owner):** ≤ 1 Reviewer round per task; targeted `npx jest <path>`; `npx ng lint --quiet`; CT on every task (the page host changes); verification in the **foreground**; Leader real-page look after T-1 and T-2 (Orca `eval` must be up, or owner screenshots)
- **Budget (design §12):** 3 tasks · ~650 source LOC · ~800 test LOC · tripwire > 1000 source or any third attempt; ≤ 1 Reviewer round per task under the scoped re-review protocol
- **Status:** in-progress (2026-09-08)

## 2. Pre-flight

- [x] `requirements.md` / `design.md` approved; judgment-day one pass in `judgment.md` (2026-09-08 02:50).
- [x] Parent `bilateral-review-ux-polish` all `[x]` (`4db13d572`, log `28fd3a05c`).
- [x] Dev server watch mode; API :3400; Orca `eval` back at 02:05 (dedicated page id in scratchpad `orca-page.txt`).
- [x] No other in-flight spec on `pages/bilateral-review/**`.

## 3. Task list

### `BRV-T-1` — Viewport lock and pinned chrome

- **Type:** `client`
- **Description:** Add `host: { class: 'pr-viewport-page' }` + `styleUrl` and the new `bilateral-review.component.scss` (`@use '../../../../../styles/viewport-page' as vp; :host { display: block; @include vp.pr-viewport-page; }` — verify the `@use` depth compiles: a wrong depth fails silently). Wrap toolbar + filter band in the pinned wrapper (`min-[900px]:sticky min-[900px]:top-0 min-[900px]:z-[15]`, opaque bg, single bottom divider, `data-testid="bilateral-review-pinned"`, no `overflow`); rows/cards get `scroll-margin-top: var(--brv-pinned-h, 130px)` with the var set from the wrapper's height. CT: add `FIXTURE_ROWS_TALL` (≥ 80 rows), the 1536 lock + pin gates with the pre-condition (`scrollHeight > clientHeight + 600`, `scrollTop === 600`) and both RED probes (host-static injection; drop `sticky`), the popover/multiselect clip gate (AC-3b), the 840 inert gate, extend the 1024 DETECTOR injection to the host (R-9 (b)), re-run `BRP-AC-7`. `mountPage()` unchanged (no wrapper). Remove the false "same viewport-lock contract" comment at `.html:18-19` and state the real one.
- **Implements:** BRV-R-1, R-2, R-9 (b)(c), R-10, R-20; AC-1, 2, 3, 3b, 12; scenario "Scroll the queue"
- **Files:** `bilateral-review.component.{ts,html,spec.ts}`, new `bilateral-review.component.scss`, `bilateral-review.cy.ts`
- **Depends on:** — · **Blocks:** T-2 (page html), T-3
- **Estimate:** M
- **Skills:** `angular-developer`
- **Tests:** page spec — host class on `fixture.nativeElement` (labeled discoverability-only); pinned wrapper contains `[role="search"]` and `[data-testid="bilateral-review-filter-band"]`, carries `min-[900px]:sticky`/`z-[15]` and **no** `overflow-*` class (FAIL input: add `overflow-y-auto`); rows carry the `scroll-margin-top` style. CT — 1536 with `FIXTURE_ROWS_TALL`: host `getComputedStyle(...).position === 'absolute'`, `documentElement.scrollHeight <= clientHeight`, the work area (the `.custom_scroll` containing the table) `scrollHeight > clientHeight + 600`; `scrollTo(0, 600)` → `scrollTop === 600`, `pinned.top === workArea.top ± 1`, `filterBand.bottom === pinned.bottom ± 1`, `statbar.top < pinned.bottom`, `window.scrollY === 0`, pinned height ≤ 130; RED probes recorded verbatim then reverted; popover + each multiselect panel inside the work area; 840 (`cy.viewport(840, 1600)`): host `position` ∈ {static, relative}, `display: block`, wrapper computed `position !== 'sticky'`, cards = rows; `BRP-AC-7` still ≤ 140 / ≤ 231.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary --no-coverage`; `npx ng lint --quiet`; `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.cy.ts`; **plus `npx ng build --configuration development 2>&1 | tail -5`** (a new `styleUrl` + `@use` depth can break the build silently in serve). **Disqualifiers:** a lock "verified" by class presence without the computed `position`; a pin test that does not assert `scrollTop === 600` first; a RED probe that removes the host class (inert — the mixin is on bare `:host`); RED by inversion.
- **Done when:** green; Leader live look at 1787 **or owner screenshot**: scroll 600 → toolbar and filter band unmoved, rows under them, `window.scrollY === 0`, band CTA tooltip not occluded; evidence recorded as OWED if neither is available (does not block T-2).

### `BRV-T-2` — Table color, columns, emphasis, label

- **Type:** `client`
- **Description:** Per design §6.2/§6.3: Alignment column (merge TOC + Indicator, per-line rendering, inner-span truncation, `data-testid`, header "Alignment" **in column position** of `copy.table.headers`); lead center inner-span truncation + hidden only for `groupMode='center' && view='grouped'`; `columnCount()` driving all four `colspan` sites; `statusToneClass` → fixed `--pr-status-*`/`--pr-danger*` pairs (row pill, card pill, group badge); group header + cards bar `!border-l-[3px]` accent by pending and a single-line truncated label with `title`; primary-text action on `canReviewRow` (table + cards, no bg); both band labels `min-w-[84px] shrink-0 whitespace-nowrap`; copy updates; re-base the one-line row cap (R-11).
- **Implements:** BRV-R-3, R-4, R-5, R-6, R-7, R-8, R-9 (a)(d), R-11; AC-4, 4b, 5, 6, 7, 7b, 8, 9, 10, 11; scenario "Scan by color"
- **Files:** `components/bilateral-review-table/*.{ts,html,spec.ts}`, `bilateral-review.component.{html,spec.ts}`, `bilateral-review.copy.ts`
- **Depends on:** T-1 · **Blocks:** T-3
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Tests:** table — Alignment four cases by `data-testid` (both / TOC only / Indicator only → one line, no dash / both placeholders → exactly one "—" + one `sr-only` naming both); header count 7 (project, and flat + `group=center`) vs 6 (center + grouped); all four `colspan` sites equal the header count in both modes (FAIL input: leave the loading row at 8); pair classes per status on the rendered pill, fg and bg from the same pair, and **no** `amber|emerald|red-` in the component's rendered HTML (FAIL input: leave one raw class); accent class per pending > 0 / 0 on table header and cards bar; action tone: member pending → `text-[var(--pr-color-primary-700)]`, non-member pending and approved → neutral; inner span `truncate` + `title` on center and alignment (Disqualifier: asserted on the `td`); header-order spec split project/center. Page — both labels `min-w-[84px] shrink-0 whitespace-nowrap`.
- **Verification:** Jest + lint + CT as T-1 (CT: merged header present; row caps one-line ≤ 50 with caption / ≤ 44 without, two-line ≤ 64 — re-based from measurement, recorded; group header ≤ 40 with a long name in both modes; computed `border-left-width === '3px'` and colour on pending vs non-pending headers; labels height ≤ 18 and `scrollWidth <= clientWidth` with counts 6 and 12; center `span.scrollWidth > clientWidth` on "Bioversity (Alliance)" in a 150 px cell). **Disqualifiers:** raw palette left in `bilateral-review-table.component.{ts,html}`; a recombined fg/bg pair; a color-only carrier; hidden-column test that does not check all four `colspan` sites; truncation asserted on the `td`.
- **Done when:** green; Leader live look at 1787 (or owner screenshot): Alignment cells, one-line centers, pills as tints, accents, single-line group headers, primary "Review"; contrast matrix ≥ 4.5 measured; visible-row count ≥ before (AC-13).

### `BRV-T-3` — CT closure, guide, HITL evidence

- **Type:** `tests` + `docs`
- **Description:** Any CT gate not yet written by T-1/T-2; guide update (`pages/bilateral-review/CLAUDE.md` ≤ 150: viewport lock + pinned chrome contract, `scroll-margin-top`, Alignment column, status pairs, accent, center column rule, the host-static RED probe, `documentElement` scroll holds only in CT); `DESIGN-DEVIATIONS.md` entry for the pinned-chrome divergence from sibling tabs; Leader records before/after and the contrast matrix.
- **Implements:** AC-11, AC-12; guide
- **Files:** `bilateral-review.cy.ts`, `pages/bilateral-review/CLAUDE.md`, `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`
- **Depends on:** T-1, T-2 · **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`, `cognitive-doc-design`
- **Verification:** CT green; lint; guide ≤ 150 lines.
- **Done when:** CT green; guide updated; owner sign-off on the look.

## 4. Dependency graph

```
BRV-T-1 (lock + pin) → BRV-T-2 (table) → BRV-T-3 (CT + guide)
```

## 5. Coverage

| Clause | Task |
|---|---|
| R-1, R-2, R-9 (b)(c), R-10, R-20; AC-1, 2, 3, 3b; scenario "Scroll the queue" | T-1 |
| R-3..R-8, R-9 (a)(d), R-11; AC-4, 4b, 5, 6, 7, 7b, 8, 9, 10, 11, 13; scenario "Scan by color" | T-2 |
| R-9; AC-12 | every task |

## 6. Rollout · 7. Rollback

- One PR against `qa-development-2026` (`🔧 fix(bilateral-review) [SPEC:changes/bilateral-review-viewport-and-table-polish]: …` — the lock is a fix, the rest style); review the SCSS depth and the sticky wrapper first.
- Rollback: revert; no data/API change.
