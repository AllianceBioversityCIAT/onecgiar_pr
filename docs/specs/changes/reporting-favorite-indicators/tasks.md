# Tasks — Favorite Indicators & Focus View (`changes/reporting-favorite-indicators`)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-favorite-indicators` |
| Short Prefix | `RFI` |
| Type | Change |
| Approval Mode | `pre-approved` (user mandate "YOLO MODE", 2026-09-05) |
| Depth | Standard |
| Requirements Ref | [`requirements.md`](./requirements.md) |
| Design Ref | [`design.md`](./design.md) (`RFI-DD-1` .. `RFI-DD-4`, budget §14) |
| Execution limits | ≤ 1 Reviewer rework per task; verification = the task's targeted `npx jest` command only; lint = `npx ng lint --quiet` once at the end (no flat ESLint config in the client) |
| Worktree | `/Users/jcadavid/Development/worktrees/onecgiar_pr/reporting-favorites` · branch `feat/reporting-favorite-indicators` · `node_modules` symlinked from the `qa-development-2026` checkout. **Workers run every command from this path.** Never `git add -A`; stage explicit paths. |
| Status | in-progress |

---

## 1. Pre-flight checklist
- [x] `requirements.md` approved (pre-approved mode).
- [x] `design.md` approved; single T3 review pass scheduled in parallel with `RFI-T-1` (fixes folded in, no re-judge — pragmatic mode).
- [x] Open questions resolved (`RFI-OQ-1`, `RFI-OQ-2`).
- [x] No server migration; client only.
- [x] Conflicting in-flight spec identified (RHSF, same components, other checkout) — mitigated by worktree + new spec files; merge order RHSF → RFI.

---

## 2. Task list

### `RFI-T-1` — `ReportingFavoritesService` + `favoriteKeyOf`
- **Type:** `client | tests`
- **Estimate:** `S`
- **Status:** `[x]`
- **Depends on:** `—`
- **Blocks:** `RFI-T-2`, `RFI-T-3`, `RFI-T-4`
- **Skills:** `angular-developer`, `tdd`
- **Description:** Create `services/reporting-favorites.service.ts` per `design.md` §3.2–3.3: exported `favoriteKeyOf`, root service with `byProgram`, `setOf`, `isFavorite`, `toggle`, `count`; `localStorage` key `pr.reporting.favorites.v1.<userId>` with `userId` from `inject(ApiService).authSE?.localStorageUser?.id ?? 'anon'`; try/catch on load and persist; reject non-plain-object payloads; delete empty programme arrays on persist. Exemplar for style: `services/reporting-guide.service.ts` (header, storage key constant, JSDoc tone) and `dashboard-lab.component.ts` `readStoredOnlyPending` / `setOnlyPending` (try/catch comments).
- **Implements:** `RFI-R-3.1`, `RFI-R-3.2` (key format + programme scope), `RFI-R-3.3`, `RFI-R-3.4`, `RFI-AC-3`, `RFI-AC-4`, `RFI-AC-5`
- **Design Ref:** `design.md` §3, `RFI-DD-2`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-favorites.service.ts` (new)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-favorites.service.spec.ts` (new)
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-favorites.service.spec.ts --silent --reporters=summary --no-coverage`
- **Disqualifiers:** a suite that never reads back through a *second* service instance proves nothing about persistence (AC-3 needs re-instantiation); a storage-throws test that stubs `setItem` but not `getItem` misses the load path. Failing input that must exist: `localStorage['pr.reporting.favorites.v1.7'] = '[]'` → must load as `{}`.
- **Definition of done:**
  - [x] `favoriteKeyOf({indicator_id: 1, center_id: 'c', __aowCode: 'AOW01'}) === '1::c::AOW01'` and missing `center_id` / `__aowCode` produce empty segments.
  - [x] `toggle` twice returns to the empty set and removes the programme entry from storage.
  - [x] Suite green; `// @akili-spec changes/reporting-favorite-indicators` header present.

---

### `RFI-T-2` — Star toggle + favorites empty state in `reporting-aow-table`
- **Type:** `client | tests`
- **Estimate:** `M`
- **Status:** `[x]`
- **Depends on:** `RFI-T-1` (imports `favoriteKeyOf` in the spec for AC-14 only; the component itself imports nothing new)
- **Blocks:** `RFI-T-4`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** Per `design.md` §6.1: add inputs `favoriteKeys`, `favoritesOnly`, outputs `toggleFavorite`, `exitFavoritesOnly`, helpers `isFavorite`, `favoriteLabel`; insert the star button first in BOTH action cells (grouped `#indicatorRow` "7 — Report / Continue" block, flat `<td class="pr-flat-cell … justify-end">`), wired through `emitAndStop`; add the favorites-only empty-state branch to the two table-level empty blocks; guard the per-card empty block with `!group.loading` (design §6.1, JD-5); widen the grid tracks in the `.scss` (`108→140`, flat `150→184`, `176→210`, `190→224`, `.pr-hlo-head` min-width `820→852`). Do not touch `statusOf` / `ratioOf` / disclosure logic. Update `components/reporting-aow-table/CLAUDE.md`: Contract (new inputs/outputs), the event-isolation bullet (list the star), and correct the stale track numbers in the *Next pending + Copy link* bullet (live values were 108px grouped / 150px flat before this task; now 140 / 184).
- **Implements:** `RFI-R-1.1`, `RFI-R-1.2`, `RFI-R-1.3`, `RFI-R-1.4`, `RFI-R-2.6` (table half, both sentences), `RFI-R-4.1` (child-side composition), `RFI-R-10`, `RFI-AC-1`, `RFI-AC-2`, `RFI-AC-10`, `RFI-AC-14`, `RFI-AC-16`
- **Design Ref:** `design.md` §6.1, §6.4, `RFI-DD-1`, `RFI-DD-4`
- **Files:**
  - `…/components/reporting-aow-table/reporting-aow-table.component.ts`
  - `…/components/reporting-aow-table/reporting-aow-table.component.html`
  - `…/components/reporting-aow-table/reporting-aow-table.component.scss`
  - `…/components/reporting-aow-table/reporting-aow-table.favorites.spec.ts` (new)
  - `…/components/reporting-aow-table/CLAUDE.md`
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.favorites.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts --silent --reporters=summary --no-coverage`
- **Disqualifiers:** a click test that does not also assert `openRow` did **not** emit proves nothing about isolation (AC-1); counting stars outside `.pr-collapse.is-open` counts hidden mounted panels. Failing input: remove `$event.stopPropagation()` → AC-1 must go red. What presence cannot prove: track widths avoid wrapping — HITL visual check (§5).
- **Definition of done:**
  - [x] Both cells render `[data-testid="favorite-toggle"]` with correct `aria-pressed` / glyph for favorite and non-favorite rows.
  - [x] Existing `reporting-aow-table.component.spec.ts` still green (contract unchanged for old consumers).
  - [x] `favoriteKeyOf(row) === component.rowKey(row)` asserted.
  - [x] AC-16 green (favorites present but hidden by `statusFilter` → generic empty state, not the favorites copy); a `loading` card with no rows renders no empty-state text.
  - [x] Reviewer confirms the component file has no import from `services/reporting-favorites.service` (RFI-R-1.4; honest presence check — JD-8).

---

### `RFI-T-3` — Favorites switch in `reporting-program-band`
- **Type:** `client | tests`
- **Estimate:** `S`
- **Status:** `[x]`
- **Depends on:** `RFI-T-1` (ordering only — no import)
- **Blocks:** `RFI-T-4`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** Per `design.md` §6.2: inputs `favoritesOnly`, `favoritesCount`, output `favoritesOnlyChange`; `role="switch"` button with `data-testid="favorites-switch"` right after *Only pending*, hidden when `compactFilters()`; glyph `star` / `star_outline`, label `Favorites (N)`. Leave `activeFilterCount` / `hasActiveFilters` untouched.
- **Implements:** `RFI-R-2.1`, `RFI-R-2.2`, `RFI-AC-11`, `RFI-AC-12`
- **Design Ref:** `design.md` §6.2, §6.4, `RFI-DD-4`
- **Files:**
  - `…/components/reporting-program-band/reporting-program-band.component.ts`
  - `…/components/reporting-program-band/reporting-program-band.component.html`
  - `…/components/reporting-program-band/reporting-program-band.favorites.spec.ts` (new)
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.favorites.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.spec.ts --silent --reporters=summary --no-coverage`
- **Disqualifiers:** asserting only that text "Favorites" exists somewhere is not evidence (AC-11 needs the `role="switch"`, `aria-checked`, count and emitted value). Failing input: `compactFilters: true` must yield zero `[data-testid="favorites-switch"]`.
- **Definition of done:**
  - [x] AC-11 / AC-12 green; existing band spec green.

---

### `RFI-T-4` — Host wiring, favorites pipeline step, persistence of the switch, guide update
- **Type:** `client | tests | docs`
- **Estimate:** `M`
- **Status:** `[ ]`
- **Depends on:** `RFI-T-1`, `RFI-T-2`, `RFI-T-3`
- **Blocks:** `—`
- **Skills:** `angular-developer`, `tdd`
- **Description:** Per `design.md` §6.3: inject `ReportingFavoritesService`; `favoritesOnly` signal seeded from `sessionStorage` + `setFavoritesOnly`; `programFavoriteKeys`, `programFavoritesCount`, `toggleFavorite`; `applyFavoritesFilter` (return type `(G & { __allIndicators?: any[] })[]`, JD-10) after `applyBurndownFilterAndSort` in `reportingGroupsForTable`; extend `reportingFiltersActive` with the **view-gated** clause `(favoritesOnly() && plannedBrowseView() === 'aows')` (JD-1) and `clearReportingFilters`; bind the table and the Reporting band in `dashboard-lab.component.html`. Update `dashboard-lab/CLAUDE.md` Contrato ("cinco filtros" → six, name the favorites step and its position after burndown) — this file is a named deliverable of the spec.
- **Implements:** `RFI-R-2.3`, `RFI-R-2.4`, `RFI-R-2.5` (both clauses — active in `aows`, NOT active in `byAow`), `RFI-R-2.7`, `RFI-R-4.1` (host side), `RFI-R-4.2`, `RFI-R-3.2` (programme scope at the host), `RFI-AC-6`, `RFI-AC-7`, `RFI-AC-8`, `RFI-AC-9`, `RFI-AC-13`, `RFI-AC-15`
- **Design Ref:** `design.md` §6.3, `RFI-DD-1`, `RFI-DD-3`
- **Files:**
  - `…/dashboard-lab/dashboard-lab.component.ts`
  - `…/dashboard-lab/dashboard-lab.component.html`
  - `…/dashboard-lab/dashboard-lab.favorites.spec.ts` (new)
  - `…/dashboard-lab/CLAUDE.md`
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.favorites.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.mrf-burndown-session.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/design-tokens.spec.ts --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json`
- **Disqualifiers:** AC-7 asserted with `toEqual` on a *copied* array is fine, but AC-7's stronger claim is identity — assert `toBe` on the array when the switch is off. AC-8 that turns Only-pending on with rows that are all pending proves nothing — at least one favorite row must be *non-pending* so it is dropped by burndown and `__allIndicators` still lists it. Failing input: swap the pipeline order (favorites before burndown) → AC-8 must go red.
- **Definition of done:**
  - [ ] AC-6..9, AC-13, AC-15 green; RFI-R-2.5 negative case green (switch on + `plannedBrowseView() === 'byAow'` → `reportingFiltersActive()` false with every other filter idle); `mrf-burndown-session` and `design-tokens` suites still green; `tsc` clean.
  - [ ] Template bindings present on both `<app-reporting-aow-table>` and the Reporting `<app-reporting-program-band>`.
  - [ ] `dashboard-lab/CLAUDE.md` updated.

---

## 3. Dependency graph
```
RFI-T-1 (service + key)
   ├── RFI-T-2 (table star + empty state)   ─┐
   ├── RFI-T-3 (band switch)                ─┼── RFI-T-4 (host wiring + docs)
   └────────────────────────────────────────┘
```
T-2 ∥ T-3 (disjoint files) — spawn two Implementers in one wave.

## 4. Traceability (clause level)

| Clause | Task | Test |
|---|---|---|
| R-1.1 star in both cells | T-2 | `reporting-aow-table.favorites.spec.ts` |
| R-1.2 isolation (no `openRow`) | T-2 | same, AC-1/AC-2 |
| R-1.3 `aria-pressed` / label / glyph | T-2 | same |
| R-1.4 no service in table | T-2 | Reviewer check (no `inject(` added) |
| R-2.1 switch + count | T-3 | `reporting-program-band.favorites.spec.ts` AC-11 |
| R-2.2 hidden in By AOW | T-3 | AC-12 |
| R-2.3 rows/cards filtering, loading kept | T-4 | `dashboard-lab.favorites.spec.ts` AC-6 |
| R-2.4 ratio over full set (`__allIndicators`) | T-4 | AC-6, AC-8 |
| R-2.5 active filter in `aows` + clear keeps pins + NOT active in `byAow` | T-4 | AC-9 + negative case |
| R-2.6 empty copy + button (table) / host turns off | T-2 / T-4 | AC-10 / binding check |
| R-2.6 second sentence (favorites present, all hidden → generic state) | T-2 | AC-16 |
| R-2.3 loading card kept shows no empty text | T-2 | loading-guard test |
| Signal reactivity end to end (`setOf` inside `computed`) | T-4 | AC-15 |
| R-2.7 session persistence of the switch | T-4 | AC-13 |
| R-3.1 reload persistence | T-1 | AC-3 |
| R-3.2 key format + programme scope | T-1 / T-2 / T-4 | AC-3, AC-14, AC-6 |
| R-3.3 storage failure / corrupt JSON | T-1 | AC-4, AC-5 |
| R-3.4 payload contents | T-1 | AC-3 (exact JSON) |
| R-4.1 host-side AND (Only-pending) after burndown | T-4 | AC-8 |
| R-4.1 child-side AND (search / Status / in-card filters still apply) | T-2 | AC-16 |
| R-4.2 identity when off | T-4 | AC-7 (`toBe`) |
| R-10 sizes / tracks | T-2 | presence only → HITL §5 |

## 5. Test plan & HITL
| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RFI-TEST-1` | unit | R-3.*, AC-3..5 | `services/reporting-favorites.service.spec.ts` |
| `RFI-TEST-2` | unit (DOM) | R-1.*, R-2.6, R-4.1 (child), AC-1/2/10/14/16 | `reporting-aow-table.favorites.spec.ts` |
| `RFI-TEST-3` | unit (DOM) | R-2.1/2.2, AC-11/12 | `reporting-program-band.favorites.spec.ts` |
| `RFI-TEST-4` | unit (state) | R-2.3..2.5, 2.7, R-4.*, AC-6..9/13/15 | `dashboard-lab.favorites.spec.ts` |
| `RFI-HITL-1` | visual, at merge | R-10 (no wrap / overflow of the action cell and no page overflow at 1280 / 1024 / **900 / 768**px — every past overflow regression of this component sat at 768–900; star aligned with Copy link) | Real page, SP01 Reporting tab, grouped + All indicators |

## 6. Rollout & verification
- [ ] Per-task commits on `feat/reporting-favorite-indicators` with `[SPEC:changes/reporting-favorite-indicators]`.
- [ ] `npx ng lint --quiet` once after T-4.
- [ ] Merge into `qa-development-2026` **after** RHSF lands (expected conflicts: `dashboard-lab.component.html` bindings, `reporting-aow-table.component.html` action cells — mechanical).
- [ ] `RFI-HITL-1` on the merged dev server.

## 7. Roll-back
Revert the spec's commits; delete `localStorage` keys `pr.reporting.favorites.v1.*` and `sessionStorage` `pr.reporting.favoritesOnly` (harmless if left).
