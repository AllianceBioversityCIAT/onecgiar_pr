# Execution Log — Split "Source" column on the bilateral Results list

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/results-list-source-column-split/` |
| Module code | `BSC` |
| Linked docs | `./requirements.md` · `./design.md` · `./tasks.md` |
| Approval mode | not specified in `tasks.md` (treated as `gated` — no `pre-approved` marker found); each task's continue/pause gate confirmed with the user |
| Leader model | Sonnet 5 (session model; registry recommends `opus` for T1 — flagged for registry update, not acted on) |

## 2. Task Execution History

### `BSC-T-1` — Split the Source column into Origin + Funding source

- **Final status:** PASS
- **Date:** 2026-09-28
- **Implementer attempts:** 1

**Attempt 1**

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts` (one-line fix: hardcoded `v4` storage-key literal in an unrelated pre-existing assertion, updated to `v5` — not a `BSC-P-3` column-count/header pin, none of those were found)
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` (module-local doc re-stamped per package convention)
- **Changes:**
  - `BILATERAL_COLUMN_STORAGE_KEY` bumped `v4` → `v5` with an updated version-history comment (`BSC-R-4`).
  - `BILATERAL_COLUMNS`: `source` entry's `title` renamed to `Origin` (key unchanged, per `BSC-DD-2`); new `fundingSource` entry inserted immediately after (`title: 'Funding source'`, `attr: 'source'`, `width: '110px'`, `minPx: 80`, `defaultOn: true`) (`BSC-R-2`, `BSC-R-3`, `BSC-R-10`).
  - Template cell split into two `@if` branches keyed on `column.key` (not `column.attr`, per `BSC-DD-2`): `source` renders `AI Result` badge or a plain `rc-plain` "Manual" label (`BSC-DD-1`, reusing an existing muted-text class — no new SCSS needed); `fundingSource` renders the unchanged `W3`/`W1-W2` badge markup (`BSC-R-1`, `BSC-R-2`).
  - Skeleton-loading width ternaries (`.html:346`/`:561`) needed **no edit** — both key off `column.attr === 'source'`, and since `fundingSource` shares that `attr` by design, both columns already get the `'38px'` placeholder.
  - **Beyond-scope fix (flagged by Implementer, confirmed correct by Reviewer):** `exportCsv()`/`cellText()` — the CSV export used `cellText(r, c.attr)`, and since `source`/`fundingSource` share `attr: 'source'`, it would have silently exported the funding text into both CSV columns. Fixed by disambiguating on `column.key` before falling back to `attr`. Not in `tasks.md`, but a direct mechanical consequence of this task's own `BILATERAL_COLUMNS` edit in a file the task already touches.
- **Implementer verification:**
  - `npx ng lint --quiet` (onecgiar-pr-client/): all files pass.
  - `npx jest --testPathPattern bilateral-results-list.component.spec.ts --silent --reporters=summary --no-coverage`: 71 passed, 71 total (same count as before the change; the one pre-existing test that would have broken — the `v4`-literal assertion — was fixed in the same diff).
  - Falsifier (API + AI-origin row → `Origin` shows `AI Result` only, `Funding source` shows `W3` only) verified by template-logic tracing, not a live dev-server render (sandboxed environment, no dev server started).
- **Reviewer verdict:** **PASS**
  - Confirmed BSC-R-1/-2/-3/-4/-10 and BSC-AC-1/-2/-4 all match the diff.
  - Independently re-verified the skeleton-width claim against the current file (`.html:346`/`:561`, not `:556` as the Implementer's module doc note said — one-token doc inaccuracy, non-blocking) — confirmed both columns resolve to `'38px'` via shared `attr: 'source'`.
  - Confirmed the CSV export fix is justified and correct; the `source` filter-chip dimension is untouched, as required by the out-of-scope section.
  - Gap noted, not a blocker: no live dev-server/browser check was run for the falsifier. Template logic is sound by inspection; the item is left open pending `BSC-T-2`'s Jest assertions or the `/akili-validate` HITL check, per `requirements.md` §10's recorded, accepted substitution for layout/visual gates in this repo.
  - No `ADVISORY` block — diff under the size threshold for parallel/advisory lens reporting.

**Requirements covered:** `BSC-R-1`, `BSC-R-2`, `BSC-R-3`, `BSC-R-4`, `BSC-R-10`, `BSC-AC-1`, `BSC-AC-2`, `BSC-AC-4`

**Decisions made:**
- Kept the beyond-scope CSV export fix in this task's diff rather than deferring it, since it is a direct, mechanical consequence of the same `BILATERAL_COLUMNS` edit this task already makes in the same file — deferring it would have shipped a silently-wrong CSV export.

**Issues encountered:** None blocking. One informational gap (no live browser verification) recorded above and left open for `BSC-T-2` / `/akili-validate`.

**Final verification result:** Lint clean; Jest 71/71 green; Reviewer PASS.

---

### `BSC-T-1` — REWORK: sort-independence bug found by user in the browser

- **Final status:** PASS
- **Date:** 2026-09-28
- **Trigger:** User manually tested the shipped change and reported (in Spanish): clicking the sort control on either the `Origin` or `Funding source` column header caused BOTH columns to show as sorted/active — "se mueven las dos columnas". This is exactly the gap the Reviewer flagged as open (non-blocking) at `BSC-T-1`'s original PASS: no live dev-server/browser check had been run for this component.
- **Implementer attempts:** 1

**Attempt 1**

- **Root cause:** `source` (Origin) and `fundingSource` (Funding source) deliberately share `attr: 'source'` (`BSC-DD-2`, for skeleton-width/CSS parity only). The template bound `[prSortableColumn]` and `<pr-sort-icon [field]>` directly to `column.attr`, so both `<th>`s fed `PrSortableColumnDirective`/`PrTableComponent` the identical sort field — clicking either header's sort control activated both (`PrSortableColumnDirective.ariaSort` compares `table.activeSortField() !== this.field`; `PrTableComponent.resolve()` does a plain `row[field]` lookup).
- **Fix:**
  - Added optional `sortKey?: string` to `BilateralColumnDef` — overrides `attr` as the SORT field only; falls back to `attr` when absent, so every other column's behavior is unchanged.
  - Set `sortKey: 'is_ai_generated'` on the `source`/`Origin` entry only — the real field `isAiResult()` reads, so `Origin` sorts by AI-origin grouping. `fundingSource` keeps sorting by `attr` (`'source'`), unchanged.
  - Added `sortField(column)` helper (`column.sortKey ?? column.attr`), mirroring the existing `columnWidth(column)` accessor pattern; updated the template's `[prSortableColumn]` and `<pr-sort-icon [field]>` bindings to use it.
  - Added two new Jest tests proving actual row-reorder + independent `aria-sort`/icon-active state per column (one needed `fakeAsync`/`tick()` to drain the constructor's `effect()`-driven table reset before asserting).
  - Re-stamped this component's local `CLAUDE.md`, adding a warning that any future column sharing an `attr` for width/CSS parity must set its own `sortKey` if sortable, or the bug reappears.
- **Implementer verification:** `npx ng lint --quiet`: clean. `npx jest --testPathPattern bilateral-results-list.component.spec.ts --silent --reporters=summary --no-coverage`: 78 passed, 78 total (76 prior + 2 new).
- **Reviewer verdict:** **PASS** (effort `high`, per the rework-effort-bump rule)
  - Confirmed `sortField()` correctly decouples the two headers' sort identity; the resizer's `stopPropagation()` is unaffected (child element, still intercepts before the header click handler).
  - Verified `is_ai_generated` is a safe sort key: `isAiResult()`'s third disjunct (`creation_method?.toUpperCase() === 'AI'`) is not reducible to `is_ai_generated` in the abstract, but traced the server query (`result.repository.ts:4213`, `CASE WHEN r.creation_method = 'AI' THEN 1 ELSE 0 END AS is_ai_generated`) and confirmed the flag always agrees with `isAiResult()` on real data from this endpoint.
  - Traced both new tests concretely against a reintroduced bug (reverting `sortField()` to `column.attr`) and confirmed each would fail — genuine falsifiers, not tautologies.
  - Confirmed `fakeAsync`/`tick()` is justified (draining `toggleW1W2()`'s async `syncUrlParams()` before asserting) and confirmed `.pr-sort-icon--active` is a real, correctly-targeted selector (`pr-sort-icon.component.ts:11`).
  - **ADVISORY (non-blocking, READABILITY):** `design.md` §12 (`BSC-DD-2`) doesn't mention the new `sortKey` override or the rule that a column sharing an `attr` must set its own `sortKey` if sortable — only the folder `CLAUDE.md` documents it. Recommend a follow-up line in `BSC-DD-2` so the spec and the code stay in sync; not required for this PASS.

**Requirements covered:** No new `BSC-R-*`/`BSC-AC-*` — this is a defect fix for behavior implied by `BSC-R-3` (independently toggleable columns) that the acceptance criteria didn't explicitly enumerate (sort independence), surfaced by manual testing.

**Decisions made:** Treated this as a rework of `BSC-T-1` rather than a new task, since it corrects a defect in already-delivered scope rather than adding new scope.

**Issues encountered:** None blocking. One ADVISORY (documentation sync) recorded above.

**Final verification result:** Lint clean; Jest 78/78 green; Reviewer PASS.

---

### `BSC-T-2` — Update and add component tests for the split columns

- **Final status:** PASS
- **Date:** 2026-09-28
- **Implementer attempts:** 1

**Attempt 1**

- **Files changed:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts` only — no production code touched.
- **Changes:**
  - **(a)** Re-verified `BSC-P-3`: no column-count/header literal pins found beyond the `v4`→`v5` storage-key literal `BSC-T-1` already fixed; the two existing "visibility" tests derive expectations dynamically from `BILATERAL_COLUMNS`, so they were never at risk.
  - **(b)** New `describe` block asserts, on real rendered `<td>` DOM (not component state), that an AI-originated W3 row shows `AI Result` in Origin / `W3` in Funding source (and never the other badge in either cell), and a manual W1/W2 row shows `Manual` / `W1/W2` — using `component.toggleW1W2()` first since the default Source chips (`showW3=true`, `showW1W2=false`) would otherwise filter the second row out of `filteredResults()` (`BSC-R-1`, `BSC-R-2`, `BSC-AC-1`, `BSC-AC-2`).
  - **(c)** Deliberately split the literal task instruction into two tests after determining the literal version ("seed a v4-shaped blob, assert fundingSource visible") is untestable-as-written: `visibleColumns`'s `vis[c.key] !== false` filter makes any absent key default to visible regardless of whether the version bump ever happened, so a single such test could never fail. The two tests instead prove (i) a `v4`-shaped blob stored under the OLD `v4` key is never read at all post-bump (a real hidden column, `type: false`, has no effect), and (ii) the identical blob read from the CURRENT `v5` key does suppress `type` (proving the map is genuinely honored, not a no-op) while `fundingSource` still defaults visible because it's absent from the map (`BSC-R-4`, `BSC-AC-3`).
  - **(d)** New test opens the Columns picker, locates the `Origin` and `Funding source` entries by label (distinct DOM nodes), and clicks each independently, asserting the other's visibility is unaffected (`BSC-R-3`, `BSC-AC-4`).
- **Implementer verification:**
  - `npx ng lint --quiet`: all files pass.
  - `npx jest --testPathPattern bilateral-results-list.component.spec.ts --silent --reporters=summary --no-coverage`: 76 passed, 76 total (71 pre-existing + 5 new).
  - Per-file coverage for `bilateral-results-list.component.ts`: Statements 85.33%, Branches 63.63%, Functions 86.76%, Lines 87.99% — all above the repo's 50/60/60/60 client gate.
- **Reviewer verdict:** **PASS**
  - Confirmed BSC-AC-1/-2 assertions read real `<td>` content, correctly distinguish the two same-`attr` cells by DOM order (`source` always precedes `fundingSource` in `BILATERAL_COLUMNS`), and would catch a swap (paired "right content present" + "wrong badge absent" assertions, exact-match `toBe` checks).
  - Independently traced the (c) deviation: confirmed both new tests genuinely fail if `BILATERAL_COLUMN_STORAGE_KEY` is reverted `v5`→`v4` while keeping the `fundingSource` column definition — the deviation is a legitimate strengthening of the falsifier per the task's own disqualifier clause, not an evasion.
  - Confirmed the column-picker test clicks real DOM elements found by label and catches the main coupling failure mode (toggling one affecting the other symmetrically).
  - **ADVISORY (non-blocking, RELIABILITY):** the picker test's second assertion (clicking Origin) can't distinguish "Origin toggle is independent" from "both got set to the same value" because Funding source is already `false` by that point in the test — recommend re-enabling Funding source before the second click, or reordering, in a future touch of this file. Not required for this task's PASS.
  - **ADVISORY (non-blocking, READABILITY):** BSC-AC-3 tests assert `component.visibleColumns()`/`isColumnVisible()` rather than a rendered `<th>` text — acceptable since the template iterates `visibleColumns()` directly, but a literal rendered-header assertion would match task (c)'s "rendered table" wording more directly.

**Requirements covered:** `BSC-R-1`, `BSC-R-2`, `BSC-R-3`, `BSC-R-4`, `BSC-AC-1`, `BSC-AC-2`, `BSC-AC-3`, `BSC-AC-4`

**Decisions made:**
- Accepted the Implementer's deviation from task (c)'s literal wording — reviewed and confirmed the two-test split is a genuine strengthening of an otherwise-untestable falsifier, matching the task's own disqualifier intent rather than working around it.

**Issues encountered:** None blocking. Two ADVISORY (4R lens) findings recorded above, neither triggers rework per the Advisory-Never-Gates rule.

**Final verification result:** Lint clean; Jest 76/76 green; per-file coverage 85.33/63.63/86.76/87.99% (all above 50/60/60/60 gate); Reviewer PASS.

---

## 3. Summary

All tasks in this spec are complete:

| Task | Status |
|---|---|
| `BSC-T-1` — Split the Source column into Origin + Funding source | ✅ PASS |
| `BSC-T-2` — Update and add component tests for the split columns | ✅ PASS |

No HALTs, no Pivots, no budget-tripwire triggers. Budget (`design.md` §12A) estimated 2 tasks / ~60 LOC / 1 review round each — actuals matched (2 tasks, 1 review round each; LOC modestly over estimate mainly due to the beyond-scope CSV export fix and thorough test coverage, not scope creep).

**Remaining per `tasks.md` §6/§7 (not part of the Leader/Implementer/Reviewer loop, for the user to action):**
- Commit the changes via the project convention and open a PR against `staging`/`master` per release cadence.
- Manual QA on staging per `tasks.md` §6 (visual/layout HITL check — no automated gate exists for this repo's table layout, per `requirements.md` §10's recorded substitution).
- Move spec status to `shipped` once merged and verified on staging (`tasks.md` §7).
- Separately scoped follow-up (already noted in `proposal.md`, not part of this spec): run `/akili-quick` for the unrelated "common W3 information" copy fix.
