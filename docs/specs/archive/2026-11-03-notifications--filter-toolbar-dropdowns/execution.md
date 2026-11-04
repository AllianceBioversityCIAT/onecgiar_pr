# Execution Log — notifications/filter-toolbar-dropdowns

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/notifications/filter-toolbar-dropdowns/` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated |
| Started | 2026-10-05 |
| Leader | Claude Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (T3) |

## Pre-run decisions (2026-10-05)

- **Environment:** free RAM ~2 GB (< 4 GB rule) with `ng serve` + `nest --watch` running. User chose to proceed with Jest `--runInBand`, scoped to `results-notifications.component`.
- **Re-sequencing (spec gap, user-approved):** FTD-T-1 originally removed the legacy popover members and the `filterButton`/`phasesLabel`/`phasesPlaceholder` copy keys, but the current template (rewritten only in T-2) and 5 legacy tests still read them, so T-1's "scoped Jest green" DoD was unreachable. Removal moved to FTD-T-2 (with deletion of the legacy tests bound to them); T-3 adds the DOM replacements. Correction closure: `tasks.md` T-1 description/DoD/consumers, T-2 description/files/red run, T-3 description, and `design.md` DD-1 reversion item 1 updated. `requirements.md` unaffected (describes "today").

## Task Execution History

### FTD-T-1 — Component state: per-facet open/close, counts, Phase/Program pick

- **Final status:** PASS (attempt 1 of 3) · **Date:** 2026-10-05
- **Skills:** `angular-developer`, `tdd` (task listed none; `tdd` added because the re-open guard and Phase/Program pick rules are logic with exact falsifiers) · **Effort:** medium · **Review:** checklist
- **Files changed:** `results-notifications.component.ts` (+~150), `results-notifications.component.spec.ts` (+~216, new `describe('FTD — facet dropdown state')`), `internationalization/contribution-request-drawer.copy.ts` (+5 keys, `searchPlaceholder` updated)
- **Implementer verification:** `npx jest --runInBand --silent --reporters=summary --no-coverage --testPathPattern=results-notifications.component` → 7 suites / 423 tests passed. `ESLINT_USE_FLAT_CONFIG=false npx eslint <3 files> --quiet` → clean (note: plain `npx eslint` fails in this package, "couldn't find eslint.config.js" — the repo still ships `.eslintrc.json`). Red = new describe referenced non-existent members (compile error); no pre-edit capture kept.
- **Reviewer verdict:** PASS — every T-1 member present, additive only per re-sequencing; all 5 falsifiers covered; disqualifier met (`performance.now` mocked 1000→1030 stays closed, 1000→1070 reopens).
- **Implementer assumptions (adjudicated by Reviewer):**
  1. `==` in `selectPhase`/`selectProgram` — accepted (ids arrive as strings from query params; service already compares with `==`).
  2. `onFacetStateChanged('closed')` does not refocus — accepted for T-1: `(stateChanged)` cannot tell Escape from outside click, and refocusing on every close would break DD-5's outside-click clause. Matches `program-overview.onScopeStateChanged`.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY / spec gap: Escape → trigger refocus (FTD-R-4.S2, DD-5) has no owner in code. **Forward pointer → FTD-T-2:** add an Escape path calling `closeFacet(true)` (e.g. `(keydown.escape)` on the popover content) unless BrnPopover already restores focus; FTD-T-3 browser check confirms either way.
  - READABILITY: `onFacetStateChanged` docstring says "Only an 'open' state transition … clears it" — should say 'closed'. **Forward pointer → FTD-T-2** (touches the same file).
  - READABILITY: `selectPhase` docstring overstates FTD-R-5.S3 ("must NOT close anything…"); leaving the dropdown open on re-pick is a UX choice, not a spec rule.
- **Requirements covered:** FTD-R-3 (S1,S2), FTD-R-4 (state), FTD-R-5.S2/S3/S4 (state), FTD-R-6 (count + Phase label), FTD-R-11, FTD-AC-4, FTD-AC-9, FTD-AC-10 (state)
- **Decisions:** removal of legacy members deferred to T-2 (see Pre-run decisions). Jest `--runInBand` (RAM < 4 GB, user choice).
- **Final verification:** scoped Jest green, lint clean. No commit (awaiting user go-ahead).

### FTD-T-2 — Template + module: toolbar row of seven popovers

#### Attempt 1 — FAIL (2026-10-05)

- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system` (task listed none; Skill Map for client UI + Spartan) · **Effort:** medium · **Review:** full (single Reviewer, 4R sweep)
- **Files:** `results-notifications.component.html` (rewrite of toolbar, ~360 lines touched), `.module.ts` (+`HlmPopoverImports`, `NgIcon`), `.component.ts` (legacy popover members + unused imports removed; T-1 docstring fixes), `.component.spec.ts` (5 legacy tests + 2 helpers deleted), `contribution-request-drawer.copy.ts` (`filterButton`/`phasesLabel`/`phasesPlaceholder` removed; no other readers).
- **Spartan MCP:** popover API consulted (`align`, `sideOffset`, `autoFocus`, `state`, `stateChanged`, `*hlmPopoverPortal`).
- **Escape refocus (T-1 forward pointer):** `(keydown.escape)="closeFacet(true)"` on each `hlm-popover-content`.
- **Verification:** `npm run build -- --configuration development` green (pre-existing warnings only); Jest `--runInBand` scoped → 7 suites / 418 passed; ESLint on touched TS clean.
- **Reviewer verdict: FAIL**
  1. **Discovered Issue:** Phase and Program option buttons (`role="option"`) carry `outline-none` with no `focus-visible:` replacement — no visible focus for keyboard users; no hover state either. **Violated Rule:** `design.md` §6.3b ("focus ring on triggers and options"); `docs/ux-ui/design.md` L386; client `CLAUDE.md` §5 rule 4; requirements §7 a11y. **Remediation:** add `focus-visible:shadow-[var(--pr-focus-ring)]` and a hover token (e.g. `hover:bg-[var(--pr-color-accents-1)]`) in the static `class` of both option buttons.
- Reviewer confirmed sound: Escape path ordering (element keydown fires before CDK body listener; overlay `closed` then hits the guard), docstring fixes, everything else in the checklist.
- **ADVISORY (non-gating):** search box kept at `w-[320px]` + nested facet wrap div vs design §6.3 `w-[240px]`/single `gap-[8px]` row → settle at T-3 visual check; stale "Additive only…" section header in `.ts`; `truncate` on Program option won't ellipsize bare text, no `[title]`; listboxes lack arrow-key navigation (follow-up candidate, not in spec); orphaned `.notifications-filter-popover-content` / `.filter-popover--align-end` SCSS.

#### Paused before attempt 2 (2026-10-05)

- User asked to pause while another task finishes. Attempt 2 not yet dispatched. On resume: send the attempt-1 FAIL report verbatim to the Implementer, effort bumped to **high**; also fix the stale "Additive only…" `.ts` header and wrap the Program option name in `<span class="truncate" [title]>` (same lines, T-2's own output). Working tree holds the attempt-1 changes (not rolled back).

#### Attempt 2 — PASS (2026-10-05)

- **Effort:** high (bumped one level on rework) · same Implementer resumed with the attempt-1 FAIL report verbatim.
- **Changes:** Phase (html L107/L110) and Program (L135/L138) option buttons gain `focus-visible:shadow-[var(--pr-focus-ring)]` (static class) and `hover:bg-[var(--pr-color-accents-1)]` (unselected branch); Program name wrapped in `<span class="truncate" [title]>` (L139); `.ts` section header (L90-94) reworded. Token `--pr-color-accents-1` verified at `src/styles/colors.scss:157`.
- **Verification:** `npm run build -- --configuration development` green; Jest `--runInBand` scoped → 7 suites / 464 passed (count includes a concurrent session's tests, see below); ESLint on `.ts` clean.
- **Reviewer verdict: PASS** — focus ring visible on options (design §6.3b, client CLAUDE.md §5 rule 4); hover on unselected branch only is acceptable (selected options already carry `bg-[var(--pr-color-primary-50)]`); `truncate` correctly moved onto the text span.
- **Final status:** PASS on attempt 2 of 3 (budget: ≤2 review rounds — within).
- **Requirements covered:** FTD-R-1, R-2.S1, R-4.S1 (inside DOM), R-4.S2 (Escape path in code; browser confirmation in T-3), R-5 table + S1/S2/S4, R-6 (visual), R-7, R-10, R-11 (binding), FTD-AC-1/2/3/7/8.
- **Carried to FTD-T-3 (from attempt-1 advisories):** confirm Escape → trigger focus in a real browser; settle search width (`w-[320px]` kept vs design `w-[240px]`) and nested facet wrap at the visual check. Recorded-only (no task): listbox arrow-key navigation; orphaned `.notifications-filter-popover-content` / `.filter-popover--align-end` SCSS.
- **⚠️ Concurrency issue:** a separate AKILI session (`notifications/detail-side-panel`) is editing the same files in this checkout (`results-notifications.component.{html,ts,spec.ts}`, `contribution-request-drawer.copy.ts`). Commits must be split by hunk; T-3 should wait until that session commits. Escalated to user.

## Hold before FTD-T-3 (2026-10-05)

- User decision: wait for the concurrent `detail-side-panel` (DSP) session to commit before T-3. DSP session ("Drawer") confirmed it will message this session on commit, staging only DSP hunks (`git add -p`) and leaving FTD hunks unstaged; ETA 1–2 h. Agreed: no edits to `results-notifications.component.{html,ts,spec.ts}` or `contribution-request-drawer.copy.ts` until then. On its message: verify `git log`, check free RAM, then dispatch FTD-T-3.

### FTD-T-3 — Port the toolbar tests + real-browser check

- **Status:** `[~]` PARTIAL — Jest part PASS (attempt 1); browser part (FTD-TEST-3) BLOCKED · **Date:** 2026-10-06
- **Resumed after:** DSP session committed `365839869` (+ merge `e62c92c6a`) and confirmed FTD hunks byte-identical in the working tree; free RAM 4.67 GB → Jest `--maxWorkers=2`.
- **Skills:** `angular-developer`, `claude-in-chrome` · **Effort:** medium · **Review:** checklist
- **Files:** `results-notifications.component.spec.ts` only — new `describe('FTD-T-3 — toolbar DOM (per-facet popovers, design.md §6.3/§10)')` with its own TestBed (real `HlmPopoverImports`/`NgIcon`): trigger order via `button[data-facet]`; no `Filter` button; no `[data-facet]` on settings; `aria-expanded` toggles on the clicked trigger only; real `BrnPopover.stateChanged('closed')` (via `By.directive`) clears `openFacet()` + `aria-expanded`; Center content holds only Center controls.
- **Verification:** Jest `--maxWorkers=2` scoped → 7 suites / 482 passed. Falsifier 1 (swap `type`/`funding` in `filterFacets`) → order test red; reverted. Falsifier 2 (bilateral body inside `@case('center')`) → only-its-facet test red; reverted; green again (Leader confirmed `filterFacets` order restored). Component coverage Stmts 72.16→83.17 · Branches 57.3→63.48 · Funcs 63→77 · Lines 76.77→86.89. `npx ngc -p tsconfig.app.json --noEmit` → no errors. ESLint on spec clean.
- **Disqualifier (recorded):** the Jest mock `tests/mocks/spartanBrainMock.ts` renders every `BrnPopoverContent` unconditionally regardless of `[state]`, so jsdom cannot prove open/closed visibility or dismissal. Tests scope queries to each facet's own `hlm-popover-content[aria-label]` instead; visibility/dismissal stays with the browser check.
- **Reviewer verdict (Jest part): PASS** — tests read real DOM; both falsifiers map to them; no facet-option/chip/Clear-all test lost.
- **ADVISORY (non-gating):** "no Filter button" test only matches exact text `Filter` (a revived `Filter 2` would slip); Center test's `toggleFacet('center')` is inert under the mock — a note would avoid misreading.
- **Browser part — BLOCKED (probe-confirmed):** assumption "cannot run without an authenticated session". Probe: the Implementer started its own `ng serve --port 4201` (compiled clean, LISTEN confirmed); no Chrome tab had a logged-in PRMS session; `cypress.env.js` holds no JWT/user. No credentials available unsupervised, and none will be guessed or fabricated. `:4201` server stopped by Leader afterwards to free RAM.
- **Still owed (DoD):** browser check at 1280/768 px — Bilateral dropdown in viewport, inside click stays open / outside closes, Escape → focus on trigger, trigger re-click race (FTD-P-4), 768 px wrap with no horizontal scroll, search width 320 vs design 240 (T-2 advisory). Needs the user: a logged-in Chrome tab or a manual check.

#### FTD-T-3 browser part — run 2026-10-06 (FTD-TEST-3)

- **Unblocked by:** DSP session reported the user's Chrome profile holds a logged-in PRMS session on `http://localhost:4200` (user's own `ng serve`, API :3400). The earlier "no session" probe looked only at existing tabs.
- **Disqualifier deviation (Leader decision, user offline):** :4200 is not a server we started. Freshness checked instead: that `ng serve` watches the working tree, and the live DOM had 7 `button[data-facet]` in spec order and no `Filter` button → the bundle is the FTD code.
- **Method:** a new tab plus same-origin iframes at 1280 px and 768 px. Events were dispatched with javascript_tool on the real DOM nodes inside the iframe (no pixel clicks). Read-only: no file, git, Jest or build. Tab and iframe were cleaned up afterwards.
- **Results:**
  1. **1280 px, Bilateral open:** PASS. Content rect left 481.4 / right 780.4, inside innerWidth 1276. Screenshot `%TEMP%/claude-chrome-screenshots-mJIYGW/screenshot-1791269403417-0.jpg`.
  2. **Click on a checkbox inside, then click outside:** PASS. Inside, it stays open with 18 checkboxes. Outside (on the `h1`), it closes.
  3. **Escape:** PASS.
     - Focus inside the content: the dropdown closes and `activeElement` is `button[data-facet="bilateral"]`.
     - Focus on the trigger: it closes and focus stays on the trigger.
  4. **Re-click on the open trigger (FTD-P-4):** PASS. It closes and is still closed after 320 ms.
  5. **768 px:** PASS.
     - Triggers wrap to 2 rows (offsetTop ≈213 and ≈263).
     - `scrollWidth` 750 = `clientWidth` 750, with the dropdown both closed and open.
     - Bilateral rect 225.4–524.4, inside innerWidth 764.
     - Screenshot `%TEMP%/claude-chrome-screenshots-mJIYGW/screenshot-1791270026674-1.jpg`. It also shows a bilateral chip and badge `1`, which confirms R-6.
  6. **Search width:** computed 320 px; design §6.3 says 240. This is a deviation from design and is only recorded here. It needs a user call: update the design or the code.
- **PRODUCT_BUG (a11y; a regression from FTD-T-2, not caught by the T-2 review):**
  - **What's wrong:** the rendered overlay container `[role="dialog"]` has no `aria-label`/`aria-labelledby`. `BRN_POPOVER_OVERLAY_DEFAULT_OPTIONS` sets `role: 'dialog'` on the CDK container. Our `hlm-popover-content role="dialog" [attr.aria-label]` sits inside it. Result: a nameless outer dialog with a second, named dialog nested inside.
  - **Rules broken:** design §6.3b ("content `role="dialog"` named by the facet label") and requirements §7 a11y.
  - **Likely fix (one line per popover, html ~L92):**
    - bind the `BrnDialog` input `[aria-label]="facet.label"` on `hlm-popover` (brain dialog exposes `ariaLabel` with alias `aria-label`);
    - drop `role="dialog"`/`aria-label` from `hlm-popover-content` so the dialogs no longer nest;
    - re-run Jest (the T-3 "only its facet" test queries `hlm-popover-content[aria-label]` and needs re-pointing).
  - **Not applied:** the DSP session asked that the FTD files stay untouched until the user is back.
- **Status:** FTD-T-3 stays `[~]`. Browser checks 1–5 PASS. The DoD browser box is ticked only after the a11y fix is re-checked.

#### FTD-T-3 a11y fix — dialog nesting (2026-10-06, resumed via `/akili-execute`)

- **Status:** code PASS on attempt 2 of 3. The task stays `[~]` until the browser re-check below passes.
- **Coordination:** the BELL session (`bell-quick-inbox`) works in the same checkout on the service and `app.component` files. We agreed a handshake so only one Jest run happens at a time on the machine ("FTD wants Jest" / "BELL clear" / "FTD done"). There was no file overlap.
- **Attempt 1:** Implementer, skills `spartan` + `angular-developer`, effort medium.
  - **Finding:** the proposed fix (an `aria-label` input on `hlm-popover`) cannot work. In brain 21.2.16, `BrnPopover extends BrnOverlay`, not `BrnDialog`. `_configureElement` (overlay.mjs ~L302-307) sets only `id`, `tabIndex` and `role`. `role` is a public input (L357). `BRN_POPOVER_OVERLAY_DEFAULT_OPTIONS.role = 'dialog'`.
  - **Alternative applied:** add `'role'` to the `BrnPopover` hostDirective `inputs` in `src/app/spartan/popover/src/lib/hlm-popover.ts`, then put `role="none"` on `<hlm-popover>`. `hlm-popover-content` stays the single dialog named by the facet label (design §6.3b). Also added a new test asserting one named dialog per facet.
  - **Leader decision:** accepted the edit to `hlm-popover.ts`, which was outside the brief's file list. It is project-owned helm code and purely additive. Its only other user (`program-overview`) passes no role and keeps `dialog`.
  - **Verification:** ngc reported 0 errors. ESLint was clean. Leader Jest: **6 failed / 477 passed**, all with `NG0311: Directive BrnPopover does not have an input with a public name of role.` The cause was the Jest stub `tests/mocks/spartanBrainMock.ts` `BrnPopover`, which lacked the `role` input.
  - **Reviewer: `STATUS: FAIL`.**
    1. The mock is missing `role`, so NG0311 fails every FTD-T-3 DOM test. Violates reviewer.md §3 and design §10/§13. Remediation: add `@Input() role` to the stub.
    2. Same issue: the new test only checks the static host attribute, so it survives a revert of the helm edit. Remediation: assert `brnPopoverFor(key).role === 'none'`.
    - Confirmed all of the Implementer's node_modules claims.
    - FTD-R-4 is unaffected: Escape uses `overlayRef.keydownEvents()`, and focus restore and `tabIndex=-1` don't depend on role.
    - Browser note: `role="none"` on a focusable container (`tabIndex=-1`) will show as *generic* in the a11y tree, not "none". It is still not a dialog.
- **Attempt 2:** Implementer, effort high. Received the Reviewer report verbatim.
  - **Files:** `tests/mocks/spartanBrainMock.ts`: `@Input() role` plus a comment that the stub list mirrors the `hlm-popover.ts` `inputs`. In the spec, the a11y test now also asserts `brnPopoverFor(facet.key).role === 'none'` for every facet.
  - **Verification:**
    - Leader Jest `--maxWorkers=2 --testPathPattern="results-notifications.component|program-overview.component"`: **8 suites / 546 passed / 0 failed**.
    - ESLint on the spec is clean.
    - The mock has 5 pre-existing `no-input-rename` errors on aliased `@Input('…')` lines (L30/31/90/266/450). None comes from this diff.
  - **Reviewer: `STATUS: PASS`.** "Both remediations from attempt 1 are in place. The mock's `BrnPopover` inputs match the helm hostDirective inputs, and the new check on the directive instance's `role` fails if the helm change is reverted. Scoped Jest is green (546/546), and no new lint errors were introduced. The browser check of the overlay ARIA is still an open, separate DoD item."
- **Files (cumulative for this fix):**
  - `results-notifications.component.html`
  - `results-notifications.component.spec.ts`
  - `src/app/spartan/popover/src/lib/hlm-popover.ts`
  - `tests/mocks/spartanBrainMock.ts`
- **Budget:** 2 review rounds for this fix. That is within the "≤2 review rounds per task" limit for the fix itself, but FTD-T-3 has now used 3 rounds in total (Jest part 1 plus a11y 2). Flagged to the user.
- **Still owed:** a browser re-check on `#brn-overlay-*`: no `role="dialog"` on the container, and one named dialog per facet. The search width decision (320 vs 240) is still pending with the user.
- **Browser re-check (Leader, 2026-10-06):** Leader opened a new tab on the user's `ng serve` at `http://localhost:4200/result/results-outlet/results-notifications` (logged-in profile) and drove it with javascript_tool on the real DOM.
  - **Triggers:** 7 `button[data-facet]`, in spec order. Every `hlm-popover` host has `role="none"`.
  - **Bilateral open:** container `#brn-overlay-7` has `role="none"`, `tabindex="-1"` and no label. There is exactly **one** `[role="dialog"]` on the page: `hlm-popover-content` with `aria-label="Bilateral project"`. **PASS**, the PRODUCT_BUG is fixed.
  - **FTD-R-4 regression:**
    - With focus on an `INPUT` inside the content, Escape closes the dropdown, `aria-expanded="false"` and `activeElement` is `button[data-facet="bilateral"]`. PASS.
    - When the dropdown was opened by a programmatic click with focus on `body`, focus returns to `body`. That is the expected restore-to-previous behaviour.
  - Tab closed afterwards. Read-only check: no files changed.
- **FTD-T-3 final:** PASS. The Jest part was already PASS. The browser checks 1–5 from the previous run plus this a11y re-check are all green, which ticks the browser DoD box. **Open, outside this task:** the search width (computed 320 px vs design §6.3's 240 px) needs a user decision.
- **Disqualifier note:** same deviation as the earlier run. :4200 is the user's own `ng serve`, not one we started. Its freshness was proven because the live DOM shows `role="none"` on every `hlm-popover` host, which is this run's change. The a11y re-check reads ARIA attributes, so no screenshot was taken. The earlier run's screenshots still cover the layout.

## FTD-T-3 reopened — dropdown positioning (2026-10-06, user report)

- **Symptom (user screenshot):** with Result type open, the dropdown appears at about x=522, below the tabs row, not under its trigger.
- **Root cause 1 (FTD defect, introduced in FTD-T-2):** none of the seven trigger buttons has an overlay origin.
  - brain sets the origin only through `BrnPopoverTrigger.open()/toggle()` → `popover.setOrigin(host)` (popover.mjs ~L115-130), or through the `attachTo` input.
  - Our buttons use neither, because the state is controlled by `toggleFacet`. So `BrnPopover.getPositionStrategy()` sees `!attachTo` and falls back to `global().centerHorizontally().centerVertically()` (overlay.mjs L207-212).
  - **Evidence:**
    - The overlay wrapper class is `cdk-global-overlay-wrapper`.
    - At vw 1920, the content of phase, type and resultType all sit at left 810, the screen centre.
    - Calling `setOrigin(button)` live switches the wrapper to `cdk-overlay-connected-position-bounding-box`. At `--pr-font-scale: 1` the content then sits at left 1048 = trigger left 1048, and top 241 = trigger bottom 235 + sideOffset 6.
  - The earlier FTD-TEST-3 check passed only "inside viewport", which a centred dropdown also satisfies. There was no anchoring falsifier.
  - `program-overview` (dashboard-lab) uses the same pattern with no trigger directive and no `attachTo`, so it very likely has the same centring. That is not verified, and it belongs to another spec.
- **Root cause 2 (app-wide, pre-existing, outside FTD):** the user's text size is "Large", so `html { zoom: var(--pr-font-scale) }` = 1.15 (styles.scss L486-487, `FontScaleService`).
  - The CDK computes the origin from zoomed `getBoundingClientRect` (left 1205), writes that as a CSS length inside the zoomed tree, and it renders ×1.15 (left 1385).
  - Live: at scale 1 the position is exact; at 1.15 it is offset 180 px / 41 px.
  - This affects every CDK *connected* overlay whenever the scale ≠ 1, not only this page. The old hand-rolled popover was in-flow, so it was immune; the move to CDK exposes this page to it.
  - Escalated to the user. It is not added to FTD scope (advisory-never-becomes-a-task rule).
- **Plan:** fix root cause 1 inside FTD-T-3 by binding `[attachTo]` to each facet's trigger, plus a Jest wiring test and a browser anchoring check. Root cause 2 waits for the user's decision.
- **User decisions (2026-10-06):**
  - **Root cause 2 (root zoom vs CDK connected overlays):** handle it as a **separate change** outside FTD. Recommended approach: counter-zoom on `.cdk-overlay-container`, then re-apply the zoom on the pane content. It needs app-wide overlay verification.
  - **Search width:** keep **320 px** in the code. design.md §6.3 line 87 is amended to `w-[320px]`, closing the T-2 advisory.
  - design.md L87 also now names `[attachTo]` (correction closure: the design described the popover without saying how it is anchored).

### FTD-T-3 positioning fix — attempt 1 (2026-10-06)

- **Implementer** (skills `spartan` + `angular-developer`, effort medium):
  - In `results-notifications.component.html`, `#facetTrigger` on each facet button plus `[attachTo]="facetTrigger"` on its `hlm-popover`. `hlmPopoverTrigger` was deliberately not used, because its `(click)="toggle()"` would fight the controlled `[state]` (FTD-P-4).
  - In the spec, a new test asserts that `brnPopoverFor(key).attachTo` is that facet's own `button[data-facet]`, for all 7 facets.
  - ngc clean, ESLint on the spec clean, `tsc -p tsconfig.spec.json` clean.
- **Leader verification:**
  - Jest (BELL lock handshake) `--maxWorkers=2 --testPathPattern="results-notifications.component|program-overview.component"`: **8 suites / 547 passed**.
  - Falsifier: removing `[attachTo]` turns the new test red (1 failed); restored, then green.
- **Reviewer: `STATUS: PASS`.** "`[attachTo]` binds each facet popover to its own trigger, as the amended design §6.3 L87 requires. There is no lifecycle risk, re-click, outside click and Escape still work, and the falsified identity test plus the 1920 px browser check prove the wiring and the anchoring. tasks.md L85 stays open until R-4 and anchoring are re-checked in a real browser at 1280 and 768 px."
  - Noted mechanism change: with an origin set, brain's outside-dismiss now ignores clicks inside the trigger (`_isWithinOrigin`). Re-click therefore closes through `toggleFacet`, no longer through overlay dismissal. That required a browser re-check.
- **Browser re-check (Leader):**
  - Setup: user's :4200 (logged-in profile; freshness proven because the new `connected` wrapper appears), same-origin iframes at 1280 and 768 px, `--pr-font-scale` forced to 1 inside the iframe (root cause 2 is excluded by user decision). Pointer, mouse and click event sequences were dispatched on the real nodes.

    | Check | 1280 px | 768 px |
    |---|---|---|
    | Bilateral anchoring: dx / dy vs trigger bottom (sideOffset 6) | **0 / 6** | **0 / 6** |
    | Inside the viewport | yes | yes |
    | Horizontal scroll (scrollWidth / clientWidth) | none, 1280/1280 | none, 757/757 |
    | Click on a checkbox inside | stays open | stays open |
    | Click outside (h1) | closes, `aria-expanded=false` | closes, `aria-expanded=false` |
    | Re-click the open trigger | closes, `aria-expanded=false` | closes, `aria-expanded=false` |
    | Type open → click Bilateral | only Bilateral open; Type `false`, Bilateral `true` | only Bilateral open; Type `false`, Bilateral `true` |
    | Escape with focus on the inner input | closes; focus on `button[data-facet=bilateral]` | closes; focus on `button[data-facet=bilateral]` |

  - Earlier, at vw 1920, all 7 facets showed the `connected-position-bounding-box` wrapper.
  - Tab closed afterwards. Read-only check.
- **FTD-T-3 final:** PASS. Jest, both falsifiers, the a11y fix, the anchoring fix and the browser DoD (1280/768) are all green. **Root cause 2** (root `zoom` ≠ 1 vs CDK connected overlays) is deferred to a separate change by user decision; it still mispositions these dropdowns for users whose text size is not Default.
- **Budget:** FTD-T-3 used 4 review rounds in total (Jest 1, a11y 2, anchoring 1), against ≤2 per task. The cause is two post-review defects found in the browser.
