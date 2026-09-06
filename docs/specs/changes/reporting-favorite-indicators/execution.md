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
