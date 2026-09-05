# Tasks — SP shell as a viewport-locked application frame

**Plan in one line:** land the shared lock recipe with its own real-browser CT gate first (`SAV-T-1`), teach the band its two layout modes (`SAV-T-2`), lock the two page hosts (`SAV-T-3`, `SAV-T-4`, parallel), measure the real pages in a real browser with a human at the pause (`SAV-T-5`), then sync the guides (`SAV-T-6`). Six tasks, ~280 LOC, one PR.

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `result-framework-reporting` · `sp-shell-app-viewport` (`SAV`) |
| Linked spec | `./requirements.md` (`SAV-R-1..13`, `SAV-AC-1..12`, defect classes D1–D9) · `./design.md` (`SAV-DD-1..7`, §10 testing plan, §14 budget) |
| Baseline | `docs/prd.md` `US-P1`, `G4` · `docs/ux-ui/design.md` §6, §9, §10 · `docs/trd/trd.md` §6 · `onecgiar-pr-client/CLAUDE.md` §5 |
| Depth | Standard |
| Approval Mode | gated |
| Budget (tripwire) | 6 tasks · ~280 LOC · ≤ 2 review rounds. `/akili-execute` stops and escalates past 8 tasks, 450 LOC, or a third round |
| Owner / driver | AKILI Leader (T1) · Implementer T2 · Reviewer T3 · visual checks T6/HITL |
| Status | executed (2026-09-04) — all six tasks PASS; pending `/akili-archive` |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-09-04, gate 1 — Continue).
- [x] `design.md` approved (2026-09-04, gate 2 — Continue).
- [x] Open questions resolved by default: `SAV-OQ-1` controls row scrolls with content (`SAV-DD-7`), `SAV-OQ-2` fallback < `md`, `SAV-OQ-3` no drawer lock (deferred).
- [x] No conflicting in-flight spec touching `dashboard-lab`, `reporting-program-band`, `programme-results` (`docs/specs/changes/` currently holds only this spec; check again at kickoff — other sessions commit in this checkout).
- [x] **Capability probe (`SAV-DD-6`, kaizen `changes--clear-filters`) — run BEFORE `SAV-T-1`:**
  - CT: a one-line spec calling `cy.viewport(1280, 800)` then asserting `window.innerWidth === 1280 && innerHeight === 800`. If it fails or the CT dev-server (port 8080) is busy, the layout gates are reassigned to the real-browser probe + a named human, and `execution.md` records it.
  - Orca embedded browser (`orca-cli` skill): `goto` a PRMS page, **then** set viewport 1280×800, read `innerWidth`/`innerHeight` (expect 1280/800 ÷ root zoom 1.2 ⇒ compare ratios). If the viewport does not change, geometry readings from Orca are void; route `SAV-T-5` to a human on a real screen.
  - Record both probe results at the top of `execution.md` before any task starts.
- [x] No migrations, no server work — `migration:check` not applicable.

## 3. Task list

### `SAV-T-1` — Shared lock recipe (`pr-viewport-page` mixin) + CT recipe harness `[x]`

- **Type:** `client` + `tests`
- **Description:** Create `src/styles/_viewport-page.scss` exporting `@mixin pr-viewport-page` — media-gated at `min-width: 900px`: `position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden`; below the breakpoint it emits nothing. Header comment carries the `result-detail` rationale (why absolute, why not a height chain, the outlet-slot containing-block contract, "no `transform` on host/wrappers"). Write a Cypress CT spec with a **throwaway harness component** that reproduces the shell chain (`main.flex.flex-col.min-h-svh` → header block whose height is driven by a stub banner toggle → `div.relative.min-h-0.min-w-0.flex-1` → locked child including the mixin, containing a `flex-none` band stub + `div.work-area` with the exact wrapper utilities from `design.md` §6.2 and stub content ≥ 2× viewport, plus a `fixed inset-y-0` rail stub and a `w-[2400px]` wide block inside an `overflow-x-auto` wrapper).
- **Implements:** `SAV-R-1`, `SAV-R-2`, `SAV-R-3`, `SAV-R-7` (geometry), `SAV-R-8`, `SAV-R-9`, `SAV-R-11` (code half), `SAV-R-12` · `SAV-AC-1`, `SAV-AC-2`, `SAV-AC-3`, `SAV-AC-7`, `SAV-AC-8`, `SAV-AC-9` (on the recipe)
- **Design refs:** `SAV-DD-2`, `SAV-DD-3`, §2.2, §2.3, §10 row 1
- **Files (expected):** `onecgiar-pr-client/src/styles/_viewport-page.scss` (new), `onecgiar-pr-client/src/app/shared/viewport-page/viewport-page.recipe.cy.ts` (new, harness lives inside the spec), `onecgiar-pr-client/src/styles.scss` only if a `@use` forwarding line is needed (prefer components `@use` the partial directly).
- **Depends on:** — (after pre-flight probe)
- **Blocks:** `SAV-T-3`, `SAV-T-4`
- **Estimate:** M
- **Skills:** `angular-developer`, `tailwind-design-system`, Cypress CT (`project-cypress-ct-harness-quirks`: expect primeicons/TS2322 noise, not failures)
- **Scenario/clause ownership:**
  - `SAV-R-1` scenario "Long Reporting table" — document does NOT scroll clause · `SAV-R-1/2` "Short content" (work area fills to bottom edge).
  - `SAV-R-3` "TEST banner present and wrapped" — flush, no overlap, no gap; banner off too.
  - `SAV-R-7` "AOW rail open" — rail NOT clipped by host overflow (rail stub rect `top 0`, `height = innerHeight`).
  - `SAV-R-8` "Tablet portrait" — document scrolls, host `position: static`, no work-area scrollbar.
  - `SAV-R-9` "Wide Results table" — `scrollWidth === clientWidth` on document and work area at 1280/1440/1600.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test:ct -- --spec "src/app/shared/viewport-page/viewport-page.recipe.cy.ts"
  ```
  Assertions per viewport (1280×800, 1100×800 banner-wrapped, 800×1100, 1440×900, 1600×900): first `expect(win.innerWidth).to.eq(W)`; then `documentElement.scrollHeight === clientHeight` (±1) with `work-area.scrollHeight > clientHeight` at ≥ 900; banner variants: locked child `getBoundingClientRect().top === header.getBoundingClientRect().bottom` (±1); at 800: `documentElement.scrollHeight > clientHeight` and `getComputedStyle(host).position === 'static'`.
  - **Disqualifiers:** if `innerWidth` ≠ requested → report *inconclusive*, do not pass. If the stub content is < 2× viewport the `scrollHeight === clientHeight` reading is void. A green run on a harness that omits the header block proves nothing about `SAV-R-3` — the banner toggle must actually change the header height (assert it grows ≥ 30px).
  - **Falsifying input:** replace the mixin's `position: absolute` with `position: relative` → document `scrollHeight` grows past `clientHeight` at 1280 and the spec fails red. Remove `min-h-0` from the work area → `scrollHeight === clientHeight` on the work area (nothing scrolls) → fails.
  - **What this cannot prove:** that the real pages use the recipe (closed by `SAV-T-3/4` Jest + `SAV-T-5` probe).
- **Definition of done:**
  - [x] Mixin file with rationale comment; no global `.pr-*` class added (`CLAUDE.md` §5 hard rule).
  - [x] CT spec green at all five viewports with the `innerWidth` guard first; run output pasted in `execution.md`.
  - [x] `npx ng lint --quiet` clean.
  - [x] Commit: `✨ feat(styles) [SPEC:changes/sp-shell-app-viewport]: pr-viewport-page mixin + CT recipe gate`.

### `SAV-T-2` — Band: `frameLocked` + `scrollHost` inputs, dual scroll source `[x]`

- **Type:** `client` + `tests`
- **Description:** Add `frameLocked = input(false)` and `scrollHost = input<HTMLElement | null>(null)` to `ReportingProgramBandComponent`. Sticky box `[class]` adds `min-[900px]:static min-[900px]:!top-auto` when `frameLocked()`; nothing else changes visually. Scroll source: keep the passive window listener; add an `effect` that (re)attaches a passive `scroll` listener to `scrollHost()` outside the zone and detaches on change/destroy; `syncBandCollapsed()` reads `offset = (scrollHost()?.scrollTop ?? 0) + (window.scrollY || documentElement.scrollTop || 0)` and runs once on attach. Update the JSDoc that says "the DOCUMENT is the scroller here".
- **Implements:** `SAV-R-6` (all clauses), `SAV-R-8` (band half: sticky retained < `md`) · `SAV-AC-6`, `SAV-AC-11` (band clause)
- **Design refs:** `SAV-DD-4`, `SAV-DD-5` (+ its reversion challenge), §6.2 band rows
- **Files (expected):** `.../dashboard-lab/components/reporting-program-band/reporting-program-band.component.ts`, `.component.html`, `.component.spec.ts`
- **Depends on:** —
- **Blocks:** `SAV-T-3`, `SAV-T-4`
- **Estimate:** S
- **Skills:** `angular-developer` (signal inputs, `effect`, `DestroyRef`), `tdd` (write the three Jest cases red first)
- **Scenario/clause ownership:**
  - `SAV-R-6` "Shadow follows the work area": element 11px → shadow on; 65px + `collapsible` → compact; BUT no window event required; AND null host + window 11px → shadow on (fallback); AND first read on creation.
  - `SAV-DD-5` behavior: `frameLocked` → static classes present at ≥ 900 (class assertion — see gap note).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band
  ```
  Jest cases: (1) `scrollHost` = a `div` with `scrollTop = 11` → dispatch `scroll` on the div → `isScrolled()` true, **no** window event dispatched; (2) same div `scrollTop = 65`, `collapsible = true` → `bandCollapsed()` true; (3) `scrollHost = null`, set `window.scrollY` (define property) = 11 → dispatch window `scroll` → `isScrolled()` true; (4) mount with a pre-scrolled host (`scrollTop = 20`) → `isScrolled()` true before any event; (5) `frameLocked = true` → sticky box classList contains `min-[900px]:static`; `frameLocked = false` → does not.
  - **Disqualifiers:** case 1 is void if the test also dispatches a window scroll (it would pass on the old code). Case 5 is a presence assertion: it proves the class is emitted, **not** that the band is non-sticky in a layout engine — that behavior is proven by `SAV-T-1` (band stub is static) and `SAV-T-5` (real band rect fixed while the work area scrolls).
  - **Falsifying input:** skip the element listener → case 1 and 4 fail red on the new spec (current code fails them too — red-before evidence).
- **Definition of done:**
  - [x] Five Jest cases green; existing band spec unchanged and green.
  - [x] `zone.runOutsideAngular` + passive listeners kept; no per-frame CD (reviewer checks for `zone.run` only on threshold flip).
  - [x] Lint clean. Commit: `✨ feat(reporting-program-band) [SPEC:changes/sp-shell-app-viewport]: frameLocked + scrollHost inputs`.

### `SAV-T-3` — Lock `dashboard-lab` (Overview + Reporting + AOW mode) `[x]`

- **Type:** `client` + `tests`
- **Description:** `host: { '[class.pr-viewport-page]': 'isProgramShell()' }`; SCSS `:host(.pr-viewport-page) { @include pr-viewport-page; }` (`@use '../../../../../styles/viewport-page'`). Template: program-shell `section` and both `article`s get `min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:flex min-[900px]:flex-col` and `min-[900px]:min-h-0` overriding `min-h-screen`; wrap everything below `<app-reporting-program-band>` in each article in `<div #workArea class="min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto custom_scroll">` (phase selector / scope chips / `app-program-overview` for Overview; toolbar-less body + `app-reporting-aow-table` etc. for Reporting). AOW-mode `section` (`viewMode() === 'aow'`) gets the scroller utilities itself (no band). `workArea = viewChild<ElementRef<HTMLElement>>('workArea')`, `workAreaEl = computed(() => this.workArea()?.nativeElement ?? null)`; both band instances get `[frameLocked]="true" [scrollHost]="workAreaEl()"`. Portfolio views (`emerging`, `centers`, `dashboard`) must render exactly as before (class absent).
- **Implements:** `SAV-R-1`, `SAV-R-2`, `SAV-R-4`, `SAV-R-5`, `SAV-R-7`, `SAV-R-10` (page wiring) · `SAV-AC-11` (dashboard-lab clause)
- **Design refs:** §2.2, §2.4, §6.1, §6.2 dashboard-lab rows, `SAV-DD-1`, `SAV-DD-7`
- **Files (expected):** `.../dashboard-lab/dashboard-lab.component.ts`, `.component.html`, `.component.scss`, new `dashboard-lab.viewport.spec.ts`
- **Depends on:** `SAV-T-1`, `SAV-T-2`
- **Blocks:** `SAV-T-5`
- **Estimate:** M
- **Skills:** `angular-developer`, `tailwind-design-system`, `ui-ux-pro-max` (layout sanity pass on the wrapper changes)
- **Scenario/clause ownership:**
  - `SAV-R-2` controls row INSIDE the work area (Overview phase/filter row is the first child of `#workArea`; Reporting toolbar likewise) — `SAV-DD-7`.
  - `SAV-R-4` "From a scrolled Reporting to Results" — wiring half: no residual window scroll; component re-creation gives `scrollTop 0` (asserted in `SAV-T-5`).
  - `SAV-R-5` "AOW row focus" BUT document MUST NOT scroll — the focus targets live inside `#workArea`.
  - `SAV-R-7` rail + popover remain `fixed`; no `transform`/`contain` added on `section`/`article` (reviewer greps the diff).
  - `SAV-R-10` modals are portaled dialogs outside `#workArea`; nothing in the frame changes on open.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/dashboard-lab
  grep -nE "window\.scroll|scrollY" src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts   # expect 0 hits
  ```
  Jest (`dashboard-lab.viewport.spec.ts`): route data `rfrView: 'planned'` and `'overview'` → host `classList` has `pr-viewport-page`; `'emerging'`, `'centers'`, `'dashboard'` → absent; in the planned view the band debug element's `frameLocked` input is `true` and `scrollHost` is the element carrying class `overflow-y-auto`… (assert identity with `#workArea` via `By.css`). Existing `dashboard-lab.*.spec.ts` suites all green.
  - **Disqualifiers:** the host-class and input assertions are **presence** checks; they cannot prove that the document stops scrolling or that the band stays put — `SAV-T-5` owns that. A grep with 0 hits proves no window reads, not correct behavior.
  - **Falsifying input:** bind the class to `true` unconditionally → the `'emerging'` case fails red. Leave `min-h-screen` without the `min-[900px]:min-h-0` override → `SAV-T-5` probe shows document overflow (this task's Jest cannot see it — stated gap).
- **Definition of done:**
  - [x] Program-shell views locked, portfolio views untouched (Jest).
  - [x] Both band instances wired; AOW-mode section scrolls itself.
  - [x] No new SCSS beyond the `:host` include; utilities in px / `min-[900px]:` only.
  - [x] Lint clean; all `dashboard-lab.*.spec.ts` green. Commit: `✨ feat(dashboard-lab) [SPEC:changes/sp-shell-app-viewport]: viewport-locked frame for Overview/Reporting`.

### `SAV-T-4` — Lock `programme-results` (Results) `[x]`

- **Type:** `client` + `tests`
- **Description:** `host: { class: 'pr-viewport-page' }`; component `styles` gains `:host { @include pr-viewport-page; }` via `@use` (or a tiny `.scss` file if the inline `styles` array cannot `@use` — prefer the file; keep the existing inline block intact). `<section class="min-h-screen …">` → add `min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:flex min-[900px]:flex-col`; `<article>` → `min-[900px]:flex-1 min-[900px]:min-h-0`; wrap the filter row + counters + table in `<div #workArea class="min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto custom_scroll">`; band gets `[frameLocked]="true" [scrollHost]="workAreaEl()"`. The table's horizontal scroll wrapper and the right-sticky actions column are unchanged.
- **Implements:** `SAV-R-1`, `SAV-R-2`, `SAV-R-4`, `SAV-R-9` (Results wiring), `SAV-R-10` · `SAV-AC-11` (programme-results clause)
- **Design refs:** §2.2, §6.2 programme-results rows, `SAV-DD-1`, `SAV-DD-7`
- **Files (expected):** `.../programme-results/programme-results.component.ts`, `.component.html`, (`programme-results.component.scss` new, only if needed), `programme-results.component.spec.ts`
- **Depends on:** `SAV-T-1`, `SAV-T-2`
- **Blocks:** `SAV-T-5`
- **Estimate:** S
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Scenario/clause ownership:**
  - `SAV-R-9` "Wide Results table" — table wrapper keeps `overflow-x-auto`; work area must not gain horizontal overflow (guarded by `min-w-0` on the column; measured in `SAV-T-5`).
  - `SAV-R-2` Results filter row scrolls with the table (first child of `#workArea`).
  - `SAV-R-10` Row menu / dialogs open without frame shift (measured in `SAV-T-5`).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/programme-results
  grep -nE "window\.scroll|scrollY" src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts   # expect 0 hits
  ```
  Jest additions: host has `pr-viewport-page`; band `frameLocked === true`; `scrollHost` is the `#workArea` element; the `pgr-actions--open` z-order test still passes.
  - **Disqualifiers / gap:** presence assertions only — geometry owned by `SAV-T-5`.
  - **Falsifying input:** forget the `[scrollHost]` binding → the identity assertion fails red.
- **Definition of done:**
  - [x] Results locked; existing 1500-line spec green.
  - [x] Lint clean. Commit: `✨ feat(programme-results) [SPEC:changes/sp-shell-app-viewport]: viewport-locked frame for Results`.

### `SAV-T-5` — Real-browser probe on the three pages + HITL visual `[x]`

- **Type:** `tests` (browser) + HITL
- **Description:** With the client running (`docs/infrastructure.md` §6 contract — do not guess the command) and the Orca embedded browser holding the PRMS session, run a JS probe on Reporting, Overview and Results for one SP at 1280×800, 1440×900, 1600×900 and 800×1100 (viewport set **after** `goto`). The probe returns `{ innerW, innerH, docScrollH, docClientH, docScrollW, docClientW, wa: {scrollH, clientH, scrollW, clientW, scrollTop}, header: rect, band: rect, tabs: rect, rail?: rect }`, then scrolls the work area to bottom and re-reads `band`/`tabs` rects and `window.scrollY`. Additional steps: tab switch Reporting→Results after a 1200px work-area scroll (expect new `wa.scrollTop === 0`, frame rects equal); open the "Where to report" modal and close (band/tabs rects equal ±1); Reporting AOW mode with the rail open (rail `top 0`, `height === innerH`, band rect unchanged); trigger a row focus / heading jump to a below-fold target and read `target.rect ⊂ wa.rect`; run the guided tour to a below-fold step (HITL eye + screenshot). Banner-on readings require TEST; if only local is available, record banner-off and mark banner-on as **partial**.
- **Implements:** `SAV-R-1`, `SAV-R-2`, `SAV-R-3`, `SAV-R-4`, `SAV-R-5`, `SAV-R-7`, `SAV-R-8`, `SAV-R-9`, `SAV-R-10` (on the real pages) · `SAV-AC-1..5`, `SAV-AC-7..10` · D9 HITL
- **Design refs:** §10 rows 4–5, §11, `SAV-DD-6`
- **Files (expected):** `docs/specs/changes/sp-shell-app-viewport/execution.md` (readings, verbatim JSON per page/viewport), `docs/specs/changes/sp-shell-app-viewport/visual-reference/after-*.png` (screenshots)
- **Depends on:** `SAV-T-3`, `SAV-T-4`
- **Blocks:** `SAV-T-6`
- **Estimate:** M
- **Skills:** `orca-cli` (embedded browser), `computer-use` only if Orca cannot drive the tour; T6 Multimodal for screenshot judgment if the HITL is disputed
- **Scenario/clause ownership:** every `requirements.md` §8 scenario on the **real** pages, including the negatives: document MUST NOT scroll (`window.scrollY === 0` after work-area scroll), rail MUST NOT be clipped, tablet MUST scroll the document, frame rects MUST be identical before/after modal.
- **Verification:** probe readings compared to `SAV-AC-1..10` thresholds; HITL confirms against `visual-reference/jira-reference-app-frame.png` (scrollbar starts under the tabs; frame static).
  - **Disqualifiers:** if `innerW` read back ≠ requested/1.2 (zoom) the viewport did not apply → **inconclusive**, re-route to a human on a real screen. Compare `docScrollH` to `docClientH`, never to `innerH` raw (zoom). A page whose content is shorter than the viewport gives `wa.scrollH === wa.clientH` legitimately — pick an SP with a long Reporting table (≥ 2× viewport) or the reading for `SAV-AC-1` is void. Screenshots without the readings are not evidence.
  - **Falsifying input:** run the same probe on the current branch before `SAV-T-3/4` land → `docScrollH > docClientH` and band rect moves after scroll (red baseline; record it once as the "before" reading).
- **Definition of done:**
  - [x] Before/after readings for the three pages × four viewports in `execution.md`; every AC row marked PASS / FAIL / INCONCLUSIVE with the reading.
  - [x] Guided tour step below the fold highlighted correctly (screenshot).
  - [x] HITL sign-off recorded (who, when) for D9 and `SAV-AC-5` tour case.
  - [x] Any FAIL loops back to `SAV-T-3`/`SAV-T-4` (counts toward the ≤ 2 review rounds).

### `SAV-T-6` — Guides + design.md §6 pending record `[x]`

- **Type:** `docs`
- **Description:** Update `dashboard-lab/CLAUDE.md` (layout contract: host class keyed on `isProgramShell()`, `#workArea` is the scroller, band inputs), `programme-results/CLAUDE.md` (same), `result-framework-reporting/README.md` §4 (SP shell pages are viewport-locked at ≥ `md`), `result-detail/CLAUDE.md` (one-line pointer to `_viewport-page.scss` as the shared recipe; no code change). Record the `docs/ux-ui/design.md` §6 "viewport-locked page" variant text (outlet-slot contract, the mixin, the three adopters) as a **pending default-branch write** in `execution.md` per shared-file discipline (`docs/specs/kaizen/` entry at archive).
- **Implements:** `SAV-R-11` (docs half) · `SAV-AC-12`
- **Design refs:** §6.2 Docs row, `SAV-DD-1`, `SAV-DD-3`
- **Files (expected):** the four guides above; `execution.md` pending-writes block
- **Depends on:** `SAV-T-5`
- **Blocks:** —
- **Estimate:** S
- **Skills:** `cognitive-doc-design`
- **Verification:** `grep -n "pr-viewport-page" onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/CLAUDE.md onecgiar-pr-client/src/app/pages/result-framework-reporting/README.md onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` → 4 files hit; `design.md` §6 text present in `execution.md` under "Pending default-branch writes".
  - **Disqualifiers:** a hit inside a stale sentence (e.g., a guide still saying "the document is the scroller") is a FAIL — reviewer reads the paragraphs, not the grep count. Backward sweep: grep the guides for "sticky" statements about the band and update or qualify them (< `md` only).
  - **Falsifying input:** leave `README.md` §4 untouched → grep hits 3 files → FAIL.
- **Definition of done:**
  - [x] Four guides updated; no claim contradicts the shipped layout.
  - [x] Pending `design.md` §6 write recorded. Commit: `📝 docs(result-framework-reporting) [SPEC:changes/sp-shell-app-viewport]: viewport-locked shell contract in module guides`.

## 4. Dependency graph

```
pre-flight capability probe (SAV-DD-6)
├── SAV-T-1 recipe mixin + CT recipe gate ─┐
└── SAV-T-2 band inputs + dual scroll src ─┤   (T-1 ∥ T-2 — parallel-safe, disjoint files)
                                           ├── SAV-T-3 dashboard-lab lock ─┐
                                           └── SAV-T-4 programme-results ──┤   (T-3 ∥ T-4 — parallel-safe)
                                                                           └── SAV-T-5 real-browser probe + HITL
                                                                                 └── SAV-T-6 guides + pending design.md §6
```

No cycles. Two parallel pairs; `SAV-T-5` is the only HITL pause.

## 5. Coverage matrix (scenario / clause → task)

| Requirement · scenario / clause | Owner |
|---|---|
| R-1 long table: frame visible, doc does NOT scroll | T-1 (recipe) · T-5 (real page) |
| R-1/R-2 short content: no scrollbar, work area fills to bottom | T-1 · T-5 |
| R-2 controls row inside work area · single scrollbar under tabs | T-3, T-4 (wiring) · T-5 (measured) |
| R-3 banner present / wrapped / absent: flush, no gap, no overlap | T-1 (stub) · T-5 (TEST or partial) |
| R-4 tab switch: frame static, `scrollTop 0`, shadow off | T-3, T-4 (re-creation) · T-5 |
| R-5 tour step ⊂ work area · row focus BUT doc does NOT scroll | T-3 (targets inside `#workArea`) · T-5 (tour HITL + probe) |
| R-6 element 11/65 · BUT no window event needed · AND null-host window fallback · AND first read on creation | T-2 |
| R-7 rail anchored, band visible, BUT rail NOT clipped | T-1 (stub) · T-3 (no transform) · T-5 |
| R-8 < `md`: doc scrolls, host static, no work-area scrollbar, band sticky | T-1 · T-2 (sticky retained) · T-5 (800×1100) |
| R-9 no horizontal doc/work-area overflow at 1280/1440/1600 | T-1 · T-4 · T-5 |
| R-10 modal open/close: frame rects equal, no doc overflow | T-3, T-4 · T-5 |
| R-11 shared recipe + docs | T-1 (mixin) · T-6 (guides, pending §6) |
| R-12 `custom_scroll` on work area | T-3, T-4 |
| R-13 (MAY) expose scroll element | deferred — `design.md` §13 |
| AC-11 grep clauses | T-3, T-4 (0 hits) · T-2 (one documented fallback) |
| AC-12 docs | T-6 |
| D9 perceptual | T-5 HITL (accepted human gate) |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `SAV-TEST-1` | Cypress CT (recipe harness, 5 viewports) | `SAV-AC-1/2/3/7/8/9` on the recipe | `onecgiar-pr-client/src/app/shared/viewport-page/viewport-page.recipe.cy.ts` |
| `SAV-TEST-2` | Jest (band) | `SAV-AC-6`, `SAV-R-6` all clauses, DD-5 class | `.../reporting-program-band/reporting-program-band.component.spec.ts` |
| `SAV-TEST-3` | Jest (dashboard-lab) | host class per `rfrView`, band bindings, `SAV-AC-11` | `.../dashboard-lab/dashboard-lab.viewport.spec.ts` |
| `SAV-TEST-4` | Jest (programme-results) | host class, band bindings, `SAV-AC-11` | `.../programme-results/programme-results.component.spec.ts` |
| `SAV-TEST-5` | Real-browser probe (Orca) + HITL | `SAV-AC-1..5, 7..10`, D9 | readings in `execution.md`, screenshots in `visual-reference/` |
| `SAV-TEST-6` | Existing Jest suites | D8 regressions | `dashboard-lab.*.spec.ts`, `programme-results.component.spec.ts`, band spec |

Client coverage stays above 50/60/60/60 (only additive tests).

## 7. Rollout & verification

- [ ] Single PR against `staging`: `✨ feat(result-framework-reporting) [SPEC:changes/sp-shell-app-viewport]: viewport-locked SP shell`. Review order for the PR description (`cognitive-doc-design`): 1) `_viewport-page.scss` + CT spec, 2) band diff, 3) the two page diffs, 4) docs. Out of scope: portfolio routes, Home, other surfaces.
- [ ] CI green (lint, Jest, build, SonarCloud). CT is developer-run (not in CI) — attach the run output.
- [ ] Manual QA on TEST: the `SAV-T-5` probe re-run once deployed (banner on).
- [ ] Watch for: band gap at the top (sticky not dropped), tables that stopped scrolling horizontally, tour highlight offset.

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `/akili-archive` applies the pending `docs/ux-ui/design.md` §6 write on the default branch.
- [ ] Open the follow-up `family.md` for the remaining surfaces (proposal Open Question): Home + Bilateral review first.
- [ ] Optional no-op refactor: `result-detail` `:host` → mixin.
- [ ] Update `.agents/model-routing.md` T1 registry entry (flagged in the proposal; not part of this spec's branch writes).

## 9. Roll-back plan

1. Revert the single PR. No migrations, no flags, no data.
2. Verify Reporting/Overview/Results scroll the document again and the band is sticky (1-minute smoke on TEST).
3. Nothing to notify downstream.

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-client/CLAUDE.md` · `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` (precedent contract).
