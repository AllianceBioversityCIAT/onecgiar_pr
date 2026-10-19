# Execution Log — Portfolio Overview: Results by typology

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/portfolio-overview-revamp/typology-view` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated |
| Leader | Claude Code session model (Opus 5.5, T1) |
| Implementer / Reviewer | `akili-implementer` (T2 wrapper) / `akili-reviewer` (T3 wrapper) |
| Started | 2026-10-15 |
| Commits | none yet — per user memory, no commit without explicit go-ahead |

## Task Execution History

### TYV-T-1 — Pure typology aggregate

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-15 |
| Skills / effort | `angular-developer`, `tdd` · medium (as listed in tasks.md, no deviation) |
| Requirements covered | TYV-R-1 (S-1.1, S-1.2, S-1.3), TYV-R-2 data (S-2.1, S-2.2), TYV-R-4 data (S-4.1, S-4.2, S-4.3), TYV-R-5 data (S-5.1 incl. W1/W2 exclusion) |

**Attempt 1**
- Files changed:
  - `portfolio-overview/components/typology-block/typology.aggregate.ts` (new)
  - `portfolio-overview/components/typology-block/typology.aggregate.spec.ts` (new)
  - `portfolio-overview/services/portfolio-overview.service.ts` (+ `RawResult.lead_center?: string | null`, + `readonly openRows = this.rows.asReadonly()`)
- Verification (Implementer):
  - Red run before module existed: `Test Suites: 1 failed, 1 total`, `Tests: 0 total` (import error).
  - Green: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="typology.aggregate.spec"` → `Tests: 23 passed, 23 total`.
  - `--testPathPattern="portfolio-overview.service.spec"` → `Tests: 21 passed, 21 total`.
  - Falsifier: S-5.1 fixture includes `{source_name:'W1/W2', lead_center:'IITA'}`; IITA reads 3, sum 6. W3 filter removed temporarily → `Tests: 2 failed, 21 passed`; restored → green.
  - Lint: `npx eslint <3 files> --quiet` exit 0 (requires `ESLINT_USE_FLAT_CONFIG=false`; client ships only `.eslintrc.json`).
- Reviewer verdict: **STATUS: PASS** — aggregate matches design §4/§7.2 and TYV-R-1/2/4/5; W3 filter uses the same predicate as the page's W3/Bilateral card (`service.ts:229,416`); expected values are scenario literals; falsifier traced (IITA 4 / sum 7 without the filter).

**ADVISORY (4R, non-gating)**
- RISK (handoff to T-2): `LEVEL_LABELS`, `'No Program'`, `'No lead Center'`, `'No type'` are hardcoded English in the aggregate and reach the view as data, so T-2's "no hardcoded English in the template" check would not catch them. T-2 should source them from `PORTFOLIO_OVERVIEW_COPY` (pass labels in, or map `level` / `key === ''` to copy in the component). → **Forward pointer recorded against TYV-T-2.**
- READABILITY: S-1.1 test asserts 5/3/1/1 but not an explicit `sum === 10` line.

**Decisions**
- `lead_center` typed `string | null` (design §8 says `string`); additive and matches the wire. Accepted by Reviewer.
- Catch-all rows omit `name`; missing type displays as "No type" under Unclassified (design §4).

**Issues**: none. TYV-P-3 not triggered (no type outside the 9 found in code).

**Forward pointers → TYV-T-2**
1. Replace the aggregate's hardcoded English labels with `PORTFOLIO_OVERVIEW_COPY` keys (`levelOutput`, `levelOutcome`, `levelImpact`, `levelUnclassified`, `noProgram`, `noLeadCenter`, `noType`) so no user-visible English bypasses the copy file (requirements §7 i18n/copy). Within T-2 scope: the copy file is T-2's.

### TYV-T-2 — `PortfolioTypologyBlockComponent`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 of 3) |
| Date | 2026-10-15 |
| Skills / effort | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` · medium (attempt 2 bumped to high) |
| Requirements covered | TYV-R-2 view (S-2.1, S-2.2), TYV-R-3 (S-3.1), TYV-R-4 view (S-4.2 headers), TYV-R-5 view (note, S-5.2), TYV-R-6 (S-6.1 presence), TYV-R-8, NFR copy/tokens/a11y presence |

**Attempt 1**
- Files: new `typology-block.component.{ts,html,spec.ts}`; edited `typology.aggregate.{ts,spec.ts}` (labels removed — forward pointer from T-1), `internationalization/portfolio-overview.copy.ts` (+19 keys: design §8 + `dimensionAriaLabel`), `tests/mocks/spartanBrainMock.ts` (`BrnTabs` + `@Input() activationMode`, fixes NG0311 for `hlm-tabs`).
- Verification: red (no component) `Test Suites: 1 failed, Tests: 0 total`; second red NG0311 `Directive BrnTabs does not have an input with a public name of activationMode` → mock fixed. Green `--testPathPattern="typology"` → `Tests: 38 passed, 38 total`; mock consumers `--testPathPattern="centers-block|portfolio-overview.component.spec"` → `Tests: 92 passed`. Falsifier (cards filtered to W3 in center tab) → `Tests: 2 failed, 13 passed` (S-3.1, S-5.2); restored green. Lint clean on touched files except 5 pre-existing `no-input-rename` errors in `spartanBrainMock.ts` (lines 30,31,90,277,463; new line not flagged).
- Reviewer: **STATUS: FAIL**
  1. **Discovered Issue:** the By Center tab only showed the Unclassified column when a W3 row was unclassified (`levels()` used `activeBreakdown().showUnclassified`; `breakdownByCenter` filters to W3 first). A W1/W2-only unclassified row showed the card but dropped the column, so columns changed across tabs.
     **Violated Rule:** requirements §6 TYV-R-4 "(· Unclassified when > 0 page-wide)", TYV-R-5 "The columns are the same as in TYV-R-4", design §4 `Breakdown` "`showUnclassified` is page-wide".
     **Remediation:** derive the column from one page-wide flag in both tabs; add a W1/W2-only-unclassified case asserting the header in By Center.
  - Leader checks adjudicated: title copy not pinned by design §8 → advisory; `--pr-color-neutral-800` (#a77584, ~3.8:1 vs white, ~3.3:1 vs `--pr-border-divider`) conformant with §7.5, not a content surface; `dimensionAriaLabel` additive and allowed.

**Attempt 2** (effort high)
- Files: `typology-block.component.{ts,spec.ts}` (`levels()` from `cards()` Unclassified > 0; new page-wide case), `typology.aggregate.ts` (doc comment only), copy `typologyTitle` → 'Results by typology' (Leader addition: aligns with requirements §2 / T-3 guide name, from Reviewer advisory; in T-2 copy scope).
- Verification: new case red before fix `Tests: 1 failed, 15 passed, 16 total`; green `--testPathPattern="typology"` → `Test Suites: 2 passed, Tests: 39 passed, 39 total`. Lint clean.
- Reviewer: **STATUS: PASS** — column now page-wide in both tabs per TYV-R-4/R-5/design §4; new test fails under old logic; S-1.3 holds; aggregate change comment-only.

**ADVISORY (4R, non-gating)**
- READABILITY: `typology.aggregate.spec.ts:126` case name still says "flags unclassified page-wide" though the field is now per-breakdown.
- READABILITY: Unclassified fill is mauve-tinted (the `neutral-*` scale); true greys are `--pr-color-accents-*`. If off-brand at T-4, amend design §7.5 rather than swap silently.
- RELIABILITY: single `[hlmTabsContent]="dimension()"` panel → inactive trigger's `aria-controls` points to an unrendered id with the real Brain. → **Check in the TYV-T-4 keyboard / screen-reader walk.**

**Decisions**
- Labels resolved in the component from `PORTFOLIO_OVERVIEW_COPY` (aggregate emits `key: ''` / type name `''`), closing the T-1 forward pointer.
- Unclassified token: `--pr-color-neutral-800`. Token mapping asserted via `component.fill(level)` because jsdom drops `var()` from `style.background`.

**Forward pointers → TYV-T-4**
1. Measure `--pr-color-neutral-800` fill contrast (≥ 3:1) alongside the three level fills.
2. Keyboard / SR walk: confirm the single tab panel's `aria-controls` behaviour is acceptable.

## Budget Tripwire (after TYV-T-2)

- Budget (`design.md` §11): ≈ 450 LOC (≈ 200 production, ≈ 250 tests); escalate above ≈ 650 LOC.
- Actual after T-1 + T-2: **≈ 703 LOC** — production ≈ 327 (`typology.aggregate.ts` 147, `typology-block.component.ts` 75, `.html` 105) + copy/service/mock ≈ 27; tests ≈ 349 (`typology.aggregate.spec.ts` 163, `typology-block.component.spec.ts` 186). T-3 (page slot, skeleton, guide, page spec cases) still to come.
- Cause: the template (105 lines: cards, Spartan Tabs, table, bar, note, empty state) and its 16 DOM tests are larger than estimated; the aggregate carries full types/doc comments. No scope beyond the approved tasks; review rounds within budget (T-1: 1, T-2: 2).
- Action: stopped before TYV-T-3 and escalated to the user per the tripwire rule.

### TYV-T-3 — Page integration, skeleton, component guide

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 of 3) |
| Date | 2026-10-15 |
| Skills / effort | `angular-developer` · low (attempt 2 medium) |
| Requirements covered | TYV-R-7 (S-7.1; inherits hasFigures / error / empty / closed / partial), requirements §4 placement, NFR folder docs |
| Budget | proceeding past the tripwire with user go-ahead ("sigue", 2026-10-15) |

**Attempt 1**
- Files: `portfolio-overview.component.ts` (import + `imports`), `.html` (slot `<app-portfolio-typology-block [rows]="data.openRows()" />` after the status `div.po-card`, before `#progress-by-science-program`, inside `@if (hasFigures())`; skeleton `portfolio-overview-skeleton-typology` between status and matrix skeletons), `.spec.ts` (describe "Results by typology slot (TYV-R-7, S-7.1)": loading / hasFigures DOM order / error / empty), `portfolio-overview/CLAUDE.md` (new section, `Verified:` re-stamped).
- Verification: red before slot `Test Suites: 1 failed, 2 passed, 3 total` / `Tests: 2 failed, 80 passed, 82 total`; green `--testPathPattern="portfolio-overview.component.spec|typology"` → `Test Suites: 3 passed`, `Tests: 82 passed, 82 total` (existing page specs included, no pre-existing failure). Lint clean on component `.ts` / `.spec.ts`.
- Reviewer: **STATUS: FAIL**
  1. **Discovered Issue:** `portfolio-overview/CLAUDE.md` went from 120 to 130 lines.
     **Violated Rule:** `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4 "Hard cap **120 lines** … Never fix an overflow by adding a second doc file in the same folder" (via client CLAUDE.md §10 Folder docs; task NFR "Folder docs").
     **Remediation:** merge the BrnTabs mock line into the existing Gotchas bullet; drop the obvious copy-file line; compress typology bullets; trim history lines if still over; no second doc file.
  - Leader check adjudicated: no `col-span-12` needed — both branches sit in `flex flex-col` parents (html L12, L31), so the host stretches full width; the matrix's `col-span-12` is an inert leftover. Slot indentation copies the matrix card's existing 8-space misindent (cosmetic).

**Attempt 2** (docs only; Leader decision: no scope widening → no `components/typology-block/CLAUDE.md`)
- Files: `portfolio-overview/CLAUDE.md` only → `wc -l` = 120. Merged BrnTabs into the NG0311 gotcha; dropped the copy-file line; typology section to 4 lines; removed 2 history lines from the Centers block; shortened Contract / categories / NOT-clickable / fetchedCount bullets and merged the two "Removed on purpose" bullets.
- Reviewer: **STATUS: PASS** — at the cap; no MUST/🛑/⚠️ rule lost; typology section covers all four Scope items; `Verified:` re-stamped.

**ADVISORY (non-gating)**
- Two plain facts dropped from the Centers block: the old dead centre code (`centerDistributionRows`, `centerBilateralOption`) is still in the component but unused; the Center Overview shortcut stays reachable from the W3/Bilateral module header. Re-add only if the cap allows (e.g. at archive).

### TYV-T-4 — Live parity + visual check (HITL)

| Field | Value |
|---|---|
| Status | **[~] blocked on one criterion — awaiting user decision** |
| Date | 2026-10-15 |
| Runner | Leader, read-only browser check on the local stack (`localhost:4200` + server `:3400`, shared prdb). No write control clicked |
| Bundle | fresh: `app-portfolio-typology-block` is served and renders "Results by typology" (T-2 attempt-2 title) |

**Results**
| Check | Evidence | Result |
|---|---|---|
| Levels vs Total KPI | Output 616 + Outcome 355 + Impact 0 = **971** = Total card 971 | ✅ |
| By P/A row totals vs Total | 14 rows, sum **971**; every row's levels add up to its total | ✅ |
| By Center row totals vs W3/Bilateral KPI | 14 rows (AfricaRice … SMO, "No lead Center" 14 last), sum **555** = W3/Bilateral card 555; A→Z, catch-all last | ✅ |
| Unclassified = 0 | no Unclassified card or column; TYV-P-3 holds on real data | ✅ |
| Fill contrast (computed from served styles) | level-2 `#173f5f` 10.98:1 white / 9.48:1 track; level-4 `#2891be` 3.57 / 3.08; level-3 `#b30319` 7.13 / 6.16; neutral-800 `#a77584` 3.80 / 3.28 (track `rgb(238,238,241)`) | ✅ all ≥ 3:1 |
| Text coloured with a fill | 0 elements | ✅ |
| Smallest non-zero segment ≥ 4px | min rendered segment 29.6px; real data has no tiny segment (Impact 0 everywhere), so the 4px clamp is **not exercised live** — `min-w-[4px]` presence is T-2's evidence | ⚪ not exercisable |
| Cards stack | 1280 / 768: 3 cards on one row; 375: stacked (tops 2310 / 2553 / 2748) | ✅ |
| Table scrolls in its own container | `overflow-x: auto`; 375: scrollWidth 382 > clientWidth 249 | ✅ |
| No horizontal page overflow at 375 | docW 495 > 375. Causes: (1) **pre-existing** shell `.pr-topbar-right` (right edge 494, not this spec); (2) **this spec:** `hlm-tabs-list` (`w-fit`) is 382px wide inside a 335px card, so "By Center (W3/Bilateral)" sticks out of the card | ❌ (cause 2 is a TYV defect) |
| Keyboard | Tab lands on "By Program / Accelerator" with `:focus-visible` (3px ring); ArrowRight moves to and selects "By Center" (`aria-selected` true, table regroups, note shows) | ✅ |
| Single tab panel `aria-controls` (T-2 advisory) | the panel id follows the selected tab (`brn-tabs-content-center` after switching); only the inactive trigger points at an unrendered id — standard for a lazy panel | ✅ accepted |
| 1280 / 768 page overflow | none (docW 1267 / 755) | ✅ |

Method notes: the window resize did not change the viewport (it stayed at 2560), so the widths were measured in a same-origin iframe at 1280 / 768 / 375. Screenshots: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Ptmn4l\screenshot-1792093707862-11.jpg` (1280) and `…\screenshot-1792093789422-12.jpg` (375 iframe over the page).

**Blocker:** the TYV-R-7 / NFR Responsive "no horizontal page scroll at 375px" check fails because of the tab list. The fix belongs to the T-2 component (`typology-block.component.html`), for example a full-width list below 640px with triggers that share the width or wrap. Reopening T-2 needs the user's decision.

#### TYV-T-4 remediation: TYV-T-2 reopened (user-approved, 2026-10-15: "arranca")

- Implementer (same T-2 worker), `typology-block.component.html` L46–48: `hlm-tabs-list` + `max-sm:!h-auto max-sm:!w-full`; both triggers + `max-sm:!h-auto max-sm:min-w-0 max-sm:!whitespace-normal max-sm:text-center`. The `!` is needed because Helm concatenates its classes (`w-fit`, `h-9`, `whitespace-nowrap`, `h-[calc(100%-1px)]`) instead of merging them. `typology-block.component.spec.ts` gains one presence-only case. `--testPathPattern="typology"` → `Tests: 40 passed, 40 total`; lint on the spec is clean.
- Leader live re-measure (fresh bundle, same-origin iframes):
  - 375px: tab list 38–324 inside card 14–348, height 58; triggers 140×51; labels wrap and are fully readable; 0 typology elements overflow outside the scrollable table. Screenshot: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Ptmn4l\screenshot-1792094191577-13.jpg`.
  - 768 / 1280: unchanged (list height 31, triggers ≈ 189×23).
- Reviewer: **STATUS: PASS**. Each `!` targets a class Helm really sets; changes are scoped to `max-sm:`; NFR Responsive, UI rules 8/20 and TYV-DD-4 hold; the spec case is presence-only, within the Disqualifier.
- Remaining page overflow at 375 (docW 495) is only the pre-existing shell `.pr-topbar-right`, out of scope. Candidate for a separate `/akili-quick`.

**TYV-T-4 final: PASS.** All three reconciliations are exact (971 / 971 / 555), Unclassified = 0, every fill ≥ 3:1, cards stack, the table scrolls inside its container, keyboard works with a visible focus ring, and this spec causes no overflow at 375. The ≥ 4px segment clamp could not be exercised on real data; its class presence is T-2's evidence.

## Summary

| Task | Result | Attempts |
|---|---|---|
| TYV-T-1 aggregate | PASS | 1 |
| TYV-T-2 block component | PASS (+ T-4 remediation reopen, PASS) | 2 + 1 |
| TYV-T-3 page integration + guide | PASS | 2 |
| TYV-T-4 live + visual HITL | PASS after remediation | — |

- Budget: ≈ 703+ LOC against ≈ 450 (tripwire 650). Escalated after T-2; the user said to continue ("sigue").
- Not committed yet; waiting for the user's go-ahead (memory: no auto-commit).
- Follow-ups for `/akili-archive`:
  - family.md row #4 → done;
  - `codegraph sync`;
  - the advisories in the entries above (the spec case name at `typology.aggregate.spec.ts:126`, the mauve neutral token, the dropped Centers-block facts in the guide);
  - the pre-existing topbar overflow at 375.
