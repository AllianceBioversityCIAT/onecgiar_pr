# Execution Log — Favorite Indicators & Focus View (`changes/reporting-favorite-indicators`)

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/reporting-favorite-indicators/` (`requirements.md`, `design.md`, `tasks.md`) |
| Approval Mode | `pre-approved` (user mandate "YOLO MODE", 2026-09-05) |
| Leader | Claude Fable 5.1 (T1) — Claude Code, Orca-hosted session |
| Implementer / Reviewer | `akili-implementer` (sonnet) / `akili-reviewer` (opus) — author ≠ auditor |
| Worktree | `/Users/jcadavid/Development/worktrees/onecgiar_pr/reporting-favorites`, branch `feat/reporting-favorite-indicators` off `qa-development-2026` @ `336d16632` |
| Pre-flight | Spec set committed `cb172d3be`; single T3 design audit run in parallel with `RFI-T-1` (pragmatic mode: fixes folded in, no re-judge) |
| Limits | ≤ 1 rework round per task; targeted jest only |
| Started | 2026-09-05 15:55 (GMT-5) |

## Context note — concurrent spec
`changes/reporting-hierarchical-search-filters` (RHSF) is being executed by another agent session in the `qa-development-2026` checkout and edits the same three components. This spec runs in its own worktree; merge order RHSF → RFI.

---

## Task Execution History

### `RFI-T-1` — `ReportingFavoritesService` + `favoriteKeyOf` — **PASS** (2026-09-05, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), skills `angular-developer`, `tdd`, effort medium |
| Reviewer | `akili-reviewer` (opus) |
| Files (2, new) | `services/reporting-favorites.service.ts`, `services/reporting-favorites.service.spec.ts` |
| Verification | `npx jest …/services/reporting-favorites.service.spec.ts --silent --reporters=summary --no-coverage` → **1 suite, 16/16 passed** |
| Requirements covered | `RFI-R-3.1`..`RFI-R-3.4`, `RFI-AC-3`, `RFI-AC-4`, `RFI-AC-5`, `RFI-AC-14` (key oracle), `RFI-DD-2` |

**Implementer decisions:** `isPlainObject` validates the top level only (design §3.3 wording); `persist()` also cleans the in-memory store when a programme empties so `byProgram()` and storage never diverge. Environment: the worktree lacked the gitignored `src/environments/*.ts`; copied from the sibling checkout to run jest (no tracked file touched).

**Reviewer PASS summary:** key byte-identical to `rowKey()`; both storage-failure paths tested; all three T-1 disqualifiers avoided by behavioural tests. Cross-user key staleness judged ADVISORY (logout does `localStorage.clear()` + full navigation, rebuilding the root injector).

**ADVISORY (recorded, not actioned):**
- RISK — `AuthService.logout()` clears `localStorage`, so pins die on explicit sign-out. Spec-compliant; flag for the follow-up `changes/user-preferences-api` brief.
- RELIABILITY — a hand-edited payload like `{"SP01":"k1"}` passes the top-level check; `toggle()` would throw. One-line per-entry `Array.isArray` guard would close it.
- RESILIENCE — cross-tab writes are last-writer-wins (no `storage` listener).
- READABILITY — `persist()` is also a mutator; say so in its doc comment.
- PERFORMANCE — `setOf()` allocates a `Set` per call; T-4 must hoist it into one `computed()` per programme (design §6.3 already does).

Auto-approved (pre-approved mode) → proceed to `RFI-T-2` ∥ `RFI-T-3`.

### `RFI-T-3` — Favorites switch in `reporting-program-band` — **PASS** (2026-09-05, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), skills `angular-developer`, `ui-ux-pro-max`, effort medium |
| Reviewer | `akili-reviewer` (opus) |
| Files (3) | `reporting-program-band.component.ts`, `reporting-program-band.component.html`, `reporting-program-band.favorites.spec.ts` (new) |
| Verification | `npx jest …/reporting-program-band.favorites.spec.ts …/reporting-program-band.component.spec.ts --silent --reporters=summary --no-coverage` → **2 suites, 93/93 passed** |
| Requirements covered | `RFI-R-2.1`, `RFI-R-2.2`, `RFI-AC-11`, `RFI-AC-12`, `RFI-DD-4` |

**Implementer decisions:** toolbar block is gated only by `showToolbar()`; `compactFilters()` is the sole gate for the new switch; `activeFilterCount` / `hasActiveFilters` untouched.

**Reviewer PASS summary:** markup byte-identical to design §6.2; switch is the literal `nextElementSibling` of *Only pending* inside the single un-gated toolbar flex row (renders for grouped and flat); all seven `--pr-*` tokens resolve in `colors.scss`; AC-11/12 proved behaviourally with a genuine failing input.

**ADVISORY (recorded):** no `focus-visible` ring on the switch — consistent with the sibling *Only pending* switch; toolbar-wide consistency debt, not a T-3 gap.

Auto-approved (pre-approved mode) → `RFI-T-2` in flight; `RFI-T-4` next.

### `RFI-T-2` — Star toggle + favorites empty state in `reporting-aow-table` — **PASS** (2026-09-05, 1 attempt, resumed once)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), skills `angular-developer`, `ui-ux-pro-max`, effort medium — run cut mid-task by a session rate limit (HTTP 429, sonnet) and resumed with its context intact; no work redone |
| Reviewer | `akili-reviewer` (opus) |
| Files (5) | `reporting-aow-table.component.ts`, `.html`, `.scss`, `reporting-aow-table.favorites.spec.ts` (new), `reporting-aow-table/CLAUDE.md` |
| Verification | `npx jest …/reporting-aow-table.favorites.spec.ts …/reporting-aow-table.component.spec.ts --silent --reporters=summary --no-coverage` → **2 suites, 151/151 passed**; `tsc --noEmit -p tsconfig.app.json` clean for the component |
| Requirements covered | `RFI-R-1.1`..`1.4`, `RFI-R-2.6` (both sentences), `RFI-R-4.1` (child side), `RFI-R-10`, `RFI-AC-1`, `AC-2`, `AC-10`, `AC-14`, `AC-16`, `RFI-DD-1`, `RFI-DD-4` |

**Leader clarification during the task (design gap, not a FAIL):** design §6.1 named only `.pr-hlo-head` for the `min-width` bump, but `.pr-hlo-row` and `.pr-reporting-row` share the same grid and the same 820px floor; all three now go to 852px so header and rows stay aligned under ~900px. `design.md` §6.1 updated in place.

**Implementer decisions:** `!group.loading` guard added as mandated though structurally redundant today (block already inside the `@else` of `@if (group.loading)`); AC-16 asserted on the table-level empty block (the card drops out of `visibleGroups()`).

**Reviewer PASS summary:** star first in both cells with `emitAndStop` — the click ancestors (`<tr (click)="openRow.emit">`, `.pr-reporting-row (click)`) make AC-1/2 genuinely red without `stopPropagation`; stars queried inside `.pr-collapse.is-open`; no service import in the component (R-1.4 confirmed by grep); every `--pr-*` token resolves; track math matches design exactly (+32 grouped, +34 flat, all three floors 852).

**ADVISORY (recorded):**
- RELIABILITY — the loading guard is inert today; a belt-and-braces comment would prevent misreading.
- RISK — the flat action cell is the tight one (~174px content in a 164px content box, unchanged slack vs before). `RFI-HITL-1` must measure the FLAT view first at 900/768.
- READABILITY — the star's class block is duplicated across the two cells (file convention is inline Tailwind).

Auto-approved (pre-approved mode) → `RFI-T-4` already in flight (disjoint files).

### `RFI-T-4` — Host wiring, favorites pipeline step, persistence of the switch, guide update — **PASS** (2026-09-05, 2 attempts)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), skills `angular-developer`, `tdd`, effort high (attempt 2: fresh worker, same effort) |
| Reviewer | `akili-reviewer` (opus), two rounds |
| Files (4) | `dashboard-lab.component.ts`, `dashboard-lab.component.html`, `dashboard-lab.favorites.spec.ts` (new), `dashboard-lab/CLAUDE.md` |
| Verification | `npx jest …/dashboard-lab.favorites.spec.ts …/dashboard-lab.mrf-burndown-session.spec.ts …/design-tokens.spec.ts --silent --reporters=summary --no-coverage` → **3 suites, 24/24 passed**; `npx tsc --noEmit -p tsconfig.app.json` clean; `npx ng lint --quiet` → "All files pass linting." (whole client, run after attempt 1) |
| Requirements covered | `RFI-R-2.3`, `2.4`, `2.5` (both clauses), `2.7`, `RFI-R-3.2` (host scope), `RFI-R-4.1` (host side), `RFI-R-4.2`, `RFI-AC-6`, `7`, `8`, `9`, `13`, `15`, `RFI-DD-1`, `DD-3`, `DD-5` |

**Attempt 1 — Reviewer FAIL (1 issue, test-only):** production judged conformant (view-gated `reportingFiltersActive`, identity return, `__allIndicators` precedence against `ratioBase`, only the Reporting band bound, `plannedByAowSections` untouched). Issue: AC-8's fixture pinned both AOW01 rows, so the favorites set equalled the pre-favorites set and the test could not detect the favorites-before-burndown mutation — violating the T-4 disqualifier "swap the pipeline order → AC-8 must go red" (`RFI-DD-3`, `RFI-R-2.4`). Remediation: a third unpinned pending row.

**Attempt 2:** added `KPI_D` (id 4, pending, unpinned), parameterised the loader so AC-6/AC-15 keep their fixture, AC-8 asserts `__allIndicators` ids `[1,2,4]`. Mutation proof run: with the order swapped in production, AC-8 went red (`Expected [1,2,4], Received [1,2]`), the other 6 tests stayed green; production reverted (MD5 identical).

**Reviewer PASS (round 2):** traced both orders against the real code — correct order preserves `[1,2,4]`, swapped order overwrites to `[1,2]`; the non-pending pinned row disqualifier still holds (`KPI_A`); no presence-only assertions; template bindings present.

**ADVISORY (recorded, round 1):**
- READABILITY — `reporting-aow-table.component.ts` (~929, ~1065) JSDoc still says `__allIndicators` is written "ONLY while Only-pending is on"; favorites writes it too. One-line amendment, outside T-4's file set → follow-up.
- RELIABILITY — `plannedBrowseView` has a dead third value `'indicators'` with no template branch; the switch would show there while the gate reports not-active. Pre-existing.

Rework ledger: 1 rework round (the YOLO ceiling), narrower than the first round (test fixture only).

### `RFI-HITL-1` — Real-page visual/layout check — **PASS** (2026-09-05, Leader, Orca embedded browser)

Setup: `ng serve --port 4201` from this worktree; new Orca tab at `http://localhost:4201/…/entity-details/SP01?tocView=aows` with the PRMS session copied from the existing tab (values never printed); root zoom ×1.2 applies (requested 1280 → 1536 CSS px, 750 → 900, 640 → 768). Screenshots were not capturable (`Page.captureScreenshot` timeout — the Orca tab was not focused, known limitation); evidence is DOM-measured.

| Check | Result |
|---|---|
| Page overflow, grouped view, requested 1280 / 1024 / 900 / 768 / 750 / 640 | `documentElement.scrollWidth === clientWidth` at every width — **no horizontal overflow** |
| Grouped action cell | width **140px**; star 26 + link 26 + Report 56 on **one line** (identical `top`) at every width |
| Flat (*All indicators*) action cell, 1280 / 1024 / 900–640 | width **224 / 210 / 184px**; star 28 + link 28 + Report 56 + `⋯` 28 on one line (Report is 26px tall so its `top` reads 1px lower — centring, not a wrap); the flat table scrolls inside its own `.pr-table-wrap` below ~1000px as before, page never overflows |
| Star toggle (SP01, AOW01 card opened) | 28 stars in the open card; click → `aria-pressed="true"`, glyph `star`, label "Remove from favorites"; card stayed open (event isolation); band switch reads **Favorites (1)**; `localStorage['pr.reporting.favorites.v1.<userId>']` created |
| Favorites switch ON | 1 card, 1 row visible; *Clear filters* visible; `sessionStorage['pr.reporting.favoritesOnly'] = '1'` |
| Reload | switch still on, `Favorites (1)`, 1 card, the same star pressed — persistence across reload |
| Clear filters | switch off (`'0'`), 7 cards back, **Favorites (1)** — pin kept |
| Unpin | `Favorites (0)`, store `{}` |

Cleanup: pin removed, tab closed, original Orca tab (index 0) re-activated. Dev server on 4201 stopped at the end of the run.

## Merge — `qa-development-2026` (RHSF `99fea9d3b`) into `feat/reporting-favorite-indicators` (2026-09-06)

- `git merge qa-development-2026` → **no conflicts** (18 files from RHSF merged automatically; the two specs' hunks in `dashboard-lab.component.{ts,html}`, `reporting-aow-table.component.{ts,html}`, `reporting-program-band.component.{ts,html}` never overlapped).
- Merged tree: `tsc --noEmit` clean; both specs' suites (13 suites, 459 tests) → 458 green, **1 failure in `RFI-AC-7`** — harness only: RHSF added consumers of `reportingGroupsForTable()` (`reportingMatchingCount`, the `?kpi=` focus-recovery effect) that read the lazy computed during load, so the spy installed afterwards saw zero burndown calls. Leader-inline test fix (recorded, test-only): flip `favoritesOnly` on/off before the read to dirty the computed. Production code untouched. Re-run → 95/95 in the three host suites.
- Fast-forwarded `qa-development-2026` to the merge commit from the shared checkout once its tree was clean.
