# Tasks — "Updated 2025 innovations with no 2026 project" line in the Center Overview

## 1. Scope of this task list

- **Module / feature:** `bilateral` · center Overview "Results by bilateral project" card + Results tab
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** Santiago Sanchez
- **Status:** done (CNP-T-1..T-4 2026-10-21; CNP-T-5 PRTest 2026-10-22)
- **Budget (design §1):** 5 tasks · ~300 LOC incl. tests · ≤ 2 review rounds per task. Exceeding it → the Leader stops and escalates.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (owner, 2026-10-21)
- [x] `design.md` approved (owner, 2026-10-21)
- [x] Open questions `CNP-OQ-1..4` have defaults and block no task (requirements §11)
- [x] No CLARISA or server dependency
- [x] No conflicting in-flight spec on `bilateral-overview` / `bilateral-query-params.ts` (child #3 archived 2026-10-21)
- [x] No migration

**Rules for every code task (copy into each Implementer brief):**

- Jest only with `--maxWorkers=2`, scoped: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests <changed files>` from `onecgiar-pr-client/`. One test run at a time on the machine. Never the full suite.
- Lint only the touched files: `npx eslint <files> --quiet`.
- Typecheck: `npx tsc -p tsconfig.app.json --noEmit` (templates are not covered; T-3 relies on component specs for the template).
- No `git stash`, no commit (the owner commits). Spec tag `// @akili-spec bilateral/replicated-innovations-2026-pa/center-overview-no-project-line (CNP-T-n, …)` on new blocks, matching the existing tag style.
- A folder with a `CLAUDE.md` gets its invariant updated and its `**Verified:**` line re-stamped in the same task (`onecgiar-pr-client/docs/COMPONENT-DOCS.md`, 120-line cap).

## 3. Task list

### [x] `CNP-T-1` — Shared predicate + `group` contract key

- **Type:** client
- **Description:** Add `isUpdatedNoProjectRow(row)` and `UPDATED_INNOVATION_TYPE_IDS` (7, 2) to `bilateral-result-filter.ts`, and apply it in `filterCenterResults` when `params.group === 'updated-no-project'`. Add the `group` key to `bilateral-query-params.ts`: constant, value list, type, `ContractKey`, parse (unknown → `null` + `stripped`), serialize only when non-null, never through `explicitDefaults`. Update the header comment's key count. Every code that builds a full `BilateralQueryParams` object (e.g. `emptyParams()`, the Results tab `currentContractParams`, test helpers) gets `group: null` so it compiles.
- **Implements:** `CNP-R-1` rules (`Number()` on flags, any project excludes), `CNP-R-2` rule "same predicate", `CNP-AC-2`, `CNP-AC-4`, `CNP-AC-5`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-result-filter.ts` (+ `.spec.ts`), `bilateral-query-params.ts` (+ `.spec.ts`); one-line `group: null` additions where the compiler requires them
- **Depends on:** —
- **Blocks:** `CNP-T-2`, `CNP-T-3`, `CNP-T-4`
- **Estimate:** S
- **Review:** `full` (shared contract consumed by four tabs)
- **Verification:**
  - **Falsifier:** a fixture row `{ is_replicated: '1', source: 'API', result_type_id: '7', project_id: null }` NOT returned by `filterCenterResults(rows, { …, group: 'updated-no-project' })`; or a row with `project_id: 12`, `source: 'Result'`, `result_type_id: 1` or `is_replicated: 0` returned; or `?group=foo` parsing to anything but `null` with `group=foo` in `stripped`; or `serialize(…, { explicitDefaults: true })` emitting `group` when it is `null`.
  - **Red run:** `npx jest --maxWorkers=2 --no-coverage bilateral-result-filter.spec bilateral-query-params.spec` — new cases fail before (missing export / key), pass after.
  - **Disqualifier:** if adding the key forces a behavior change in `bilateral-projects-panel` or `my-draft-results` (beyond compile-only `group: null`), stop: `CNP-P-4` is refuted, re-specify.
  - **Consumers:** `filterCenterResults` → `bilateral-overview.component.ts`, `bilateral-results-list.component.ts`, `bilateral-overview.cy.ts`; `parseBilateralQueryParams` / `serializeBilateralQueryParams` → Overview, Results tab, `bilateral-projects-panel`, `my-draft-results`. Run `--findRelatedTests` on both changed source files.
  - **What this cannot prove:** that real rows carry these shapes — `CNP-T-5`.
- **Definition of done:**
  - [x] Truth table covers each of the 4 conditions failing alone, plus string and boolean flag shapes
  - [x] `--findRelatedTests` green on both files; lint and `tsc` clean
  - [x] No secret logged

### [x] `CNP-T-2` — Aggregate bucket + chart summary

- **Type:** client
- **Description:** In `bilateral-overview.aggregate.ts`, import the predicate (no second copy). In `rollupByProject`, count matching rows into `updatedNoProject` **before** the `project_id == null` branch. Expose `updatedNoProjectCount` on `OverviewByProjectModel`. The generic `noProjectRow` then excludes them by construction and stays `null` when empty. In `bilateral-overview.charts.ts`, `byProjectTable` summary adds "{n} updated innovations have no project in this phase." when n > 0. Update the identity test (`CWS-AC-5`) with the new term.
- **Implements:** `CNP-R-1` A (24 / 5, identity, BUT no double count), `CNP-R-1` C (filter → 0, at model level), `CNP-R-4` (generic line excludes the bucket; null when nothing is left), `CNP-R-5` second bullet (a11y summary), `CNP-AC-1`, `CNP-AC-3` (model part), design `CNP-DD-4` fixes 1-2
- **Files (expected):** `pages/bilateral-overview/bilateral-overview.aggregate.ts` (+ `.spec.ts`), `bilateral-overview.charts.ts` (+ `.spec.ts`), `bilateral-overview.fixtures.ts` if a shared fixture is extended
- **Depends on:** `CNP-T-1`
- **Blocks:** `CNP-T-3`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** fixture 24 updated-no-project + 3 new W3 no project + 2 replicated type-1 no project + N bar rows + 1 other-center row → anything other than `updatedNoProjectCount = 24`, `noProjectRow.total = 5`, and `Σbars + 5 + 24 + 1 = Total`; fixture with only the 24 → `noProjectRow` not `null`; same fixture with string ids/flags → different counts; Projects covered changes.
  - **Red run:** `npx jest --maxWorkers=2 --no-coverage bilateral-overview.aggregate.spec bilateral-overview.charts.spec` — new cases fail before, pass after.
  - **Disqualifier:** if the identity cannot hold without counting a row twice, stop and escalate (the predicate or `CNP-P-1` is wrong).
  - **Consumers:** `OverviewByProjectModel` / `rollupByProject` → `bilateral-overview.component.ts/.html`, `bilateral-overview.charts.ts`, `bilateral-overview.cy.ts`; `buildProjectsCoveredKpi` must be unchanged. `--findRelatedTests` on both source files.
  - **What this cannot prove:** rendering — `CNP-T-3`; real data — `CNP-T-5`.
- **Definition of done:**
  - [x] Identity, no-double-count, string-shape, generic-null and filter-to-0 cases present
  - [x] Existing aggregate/charts specs green, identity spec updated (not deleted)
  - [x] Lint and `tsc` clean

### [x] `CNP-T-3` — Overview line, link, label, `group` isolation

- **Type:** client
- **Description:** In `bilateral-overview.component.ts`: `updatedNoProjectLabel` computed from `selectedPhase()?.phase_year` ("Updated {Y−1} innovations with no {Y} project", fallback "Updated innovations with no project in this phase"); force `group: null` wherever `params` is set from the URL; `deepLinkParams` adds `group: null`. In the template: new `<a data-testid="by-project-updated-no-project">` before the generic line, same dashed pattern, count in `font-mono tabular-nums`, `[queryParams]="resultsLinkParams({ group: 'updated-no-project' })"`, aria-label = label + count + "open in Results"; rendered only when the count is > 0; empty-state `@if` gains `!model().byProject.updatedNoProjectCount`. Update `bilateral-overview/CLAUDE.md` (invariant on the new line + `group` ignored by the Overview), trim it to ≤ 120 lines, and re-stamp `Verified:`.
- **Implements:** `CNP-R-2` (line, link, AND carries filters/`scope`/`phase`, AND accessible name, BUT no `group` on Reporting/Draft links, BUT the Overview does not narrow on `group`), `CNP-R-3` (hidden at 0, empty-state condition), `CNP-R-5` first bullet (label), `CNP-AC-3` (render part), `CNP-AC-6`, `CNP-AC-8`, design `CNP-DD-3`, `CNP-DD-4` fix 3
- **Files (expected):** `pages/bilateral-overview/bilateral-overview.component.ts`, `.html`, `.component.spec.ts`, `CLAUDE.md`
- **Depends on:** `CNP-T-2`
- **Blocks:** `CNP-T-5`
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** with a 24-row model: no `by-project-updated-no-project` element, or its `queryParams` lack `group=updated-no-project` / `scope=bilateral` / `phase`; any Reporting or Drafts link (`deepLinkParams`) containing `group`; navigating the Overview to `?group=updated-no-project` changing the Total headline; phase year 2026 not producing "Updated 2025 innovations with no 2026 project"; phase year null not producing the fallback; a center whose only rows are updated-no-project showing `by-project-empty`; count 0 rendering the element.
  - **Red run:** `npx jest --maxWorkers=2 --no-coverage bilateral-overview.component.spec` — new cases fail before, pass after.
  - **Disqualifier:** if the template change needs layout work beyond copying the generic line's classes (e.g. the card overflows at 375 px in the CT run), stop and route to a visual check before patching.
  - **Consumers:** `deepLinkParams` / `resultsLinkParams` callers in the same component (tiles, attention rows, bars, Reporting/Draft links). `--findRelatedTests` on the `.ts`; CT `bilateral-overview.cy.ts` is not run here (layout-only, local, not alongside Jest).
  - **What this cannot prove:** visual quality and mobile fit (jsdom has no layout) — `CNP-T-5`.
- **Definition of done:**
  - [x] All falsifier cases covered by specs
  - [x] `CLAUDE.md` ≤ 120 lines, invariant added, `Verified:` re-stamped
  - [x] Lint and `tsc` clean; no hex literal, no rem type utility (`text-[12px]`)

### [x] `CNP-T-4` — Results tab reads `group` as a removable chip

- **Type:** client
- **Description:** In `bilateral-results-list.component.ts`: `group` signal set by `applyUrlParams`, included in `currentContractParams` (so `filterCenterResults` applies it), chip `{ dimension: 'group', value: 'updated-no-project', label: 'Updated innovations with no project' }`, `removeChip('group')` and Clear filters reset it, `hasActiveFilters` counts it, key added to `RESULTS_TAB_MANAGED_QUERY_PARAMS` (fix the stale key-count comment). Not added to the fetch pipeline. Update `bilateral-results-list/CLAUDE.md` and re-stamp `Verified:`.
- **Implements:** `CNP-R-2` A (Results side: chip, filtered rows), `CNP-R-2` B (removal clears URL and rows; BUT not sticky after navigating back without it), `CNP-AC-7`
- **Files (expected):** `pages/bilateral-results-list/bilateral-results-list.component.ts`, `.component.spec.ts`, `CLAUDE.md`
- **Depends on:** `CNP-T-1` (parallel-safe with `CNP-T-2` / `CNP-T-3`: different folders; only one Jest run at a time)
- **Blocks:** `CNP-T-5`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** URL `?scope=bilateral&group=updated-no-project&phase=…` with a mixed row fixture → visible rows ≠ the predicate's rows, or no chip; after `removeChip('group')` → URL still has `group`, or rows not widened; a later URL without `group` → chip present; URL without `group` → request or rows differ from today; `group` causing an extra HTTP call.
  - **Red run:** `npx jest --maxWorkers=2 --no-coverage bilateral-results-list.component.spec` — new cases fail before, pass after.
  - **Disqualifier:** if the chip needs a new chip component or changes the chip layout, stop — out of scope.
  - **Consumers:** `RESULTS_TAB_MANAGED_QUERY_PARAMS` → `syncUrlParams`/`writeUrl` in the same file. `--findRelatedTests` on the `.ts`.
  - **What this cannot prove:** that the count equals the Overview figure on real data — `CNP-T-5`.
- **Definition of done:**
  - [x] Chip, filter, removal, non-sticky and unchanged-default cases specced
  - [x] `CLAUDE.md` updated and re-stamped
  - [x] Lint and `tsc` clean

### [x] `CNP-T-5` — HITL: live reconciliation and visual check on PRTest

- **Type:** rollout (HITL, read-only)
- **Description:** After the owner commits and PRTest deploys (`performance-refactor`, ~30 min; `/bilateral/*` redirects to `/` until the Jenkins deploy finishes), open the Overview of one center with updated-no-project rows (ILRI or CIP), Reporting 2026. Record: the line count, the generic line, the bars total, the other-centers line and the Total. Follow the line and record the Results visible count and the chip. Check the label text, and the card at desktop width and at ≤ 899 px. Switch to Reporting 2025 and confirm the line is absent. **No write button is clicked** (shared prdb, memory `browser_checks_shared_db`).
- **Implements:** `CNP-AC-9`, `CNP-R-1` B (live: compare with Nicoleta's 13-Oct "Without 2026 project" sheet minus what child #1 linked, reported, not gated), `CNP-R-3` (2025), the visual defect class
- **Files (expected):** `execution.md` (evidence only)
- **Depends on:** `CNP-T-3`, `CNP-T-4`, owner commit + deploy
- **Blocks:** —
- **Estimate:** S
- **Review:** `skip-eligible` (human evidence)
- **Verification:**
  - **Falsifier:** Results visible count ≠ line count; bars + generic + line + other-centers ≠ Total; line visible in Reporting 2025; label not "Updated 2025 innovations with no 2026 project"; line clipped or overflowing at ≤ 899 px.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if the served bundle is stale (`window.ng.getComponent(…)` does not show `updatedNoProjectLabel`), the reading is not evidence — wait for the deploy, do not record a pass. If the top-7 bar cut hides bars, the identity is checked with the a11y table or "Show more", never inferred.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [x] Numbers and screenshots (desktop + narrow) recorded in `execution.md`
  - [x] Difference vs the 13-Oct sheet: moved to the INC-164073 reply (§6) by owner decision 2026-10-22

## 4. Dependency graph

```
CNP-T-1 (contract + predicate)
   ├── CNP-T-2 (aggregate + charts)
   │     └── CNP-T-3 (Overview view + CLAUDE.md)
   │           └── CNP-T-5 (HITL PRTest)
   └── CNP-T-4 (Results tab)  ── parallel with T-2/T-3 ──┘
```

Parallel branch: `CNP-T-4` may run while `CNP-T-2`/`T-3` run; only one Jest run at a time on the machine.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `CNP-TEST-1` | unit | predicate truth table, `group` filter, `CNP-AC-2`, `-5` | `pages/bilateral/bilateral-result-filter.spec.ts` |
| `CNP-TEST-2` | unit | `group` parse/serialize/strip, `CNP-AC-4` | `pages/bilateral/bilateral-query-params.spec.ts` |
| `CNP-TEST-3` | unit | bucket, identity, generic line, filter → 0, `CNP-AC-1`, `-3` | `bilateral-overview.aggregate.spec.ts` |
| `CNP-TEST-4` | unit | a11y summary sentence, `CNP-R-5` | `bilateral-overview.charts.spec.ts` |
| `CNP-TEST-5` | component (Jest) | line, link, label, isolation, empty state, `CNP-AC-6`, `-8` | `bilateral-overview.component.spec.ts` |
| `CNP-TEST-6` | component (Jest) | chip, filter, removal, `CNP-AC-7` | `bilateral-results-list.component.spec.ts` |
| `CNP-TEST-7` | HITL | live reconciliation + visual, `CNP-AC-9` | PRTest, recorded in `execution.md` |

### Scenario / clause ownership

| Clause | Owner |
|---|---|
| `CNP-R-1` A main + AND identity + BUT no double count | T-2 |
| `CNP-R-1` B live | T-5 |
| `CNP-R-1` C filters → 0 | T-2 (model), T-3 (hidden) |
| `CNP-R-1` AND same `project_id` / AND `Number()` shapes | T-1 (predicate), T-2 (counts) |
| `CNP-R-2` A link carries `scope`/`phase`/filters, chip, count = 24 | T-3 (link), T-4 (chip + rows), T-5 (live count) |
| `CNP-R-2` B removal + BUT not sticky | T-4 |
| `CNP-R-2` AND same predicate via `filterCenterResults` | T-1 |
| `CNP-R-2` AND accessible name | T-3 |
| `CNP-R-2` BUT not on Reporting/Draft links, not applied there | T-3 (links), T-1 Consumers check (panel/drafts do not filter) |
| `CNP-R-2` BUT Overview does not narrow | T-3 |
| `CNP-R-3` hidden at 0 + AND empty-state condition | T-3; 2025 live in T-5 |
| `CNP-R-4` generic excludes; null when empty; link unchanged | T-2 (counts), T-3 (link untouched) |
| `CNP-R-5` label / a11y summary | T-3 / T-2 |

## 6. Rollout & verification

- [ ] Owner commits (`✨ feat(bilateral-overview) INC-164073: …`, no apostrophes in the subject) on `qa-development-2026-ss`, then `performance-refactor` for PRTest
- [ ] `--findRelatedTests` on all changed files before push
- [ ] `CNP-T-5` on PRTest
- [ ] INC-164073 reply to Nicoleta: label (`OQ-1`), types (`OQ-2`), "no project" definition (`OQ-3`)

## 7. Cleanup & follow-ups

- [ ] `family.md`: child #2 → done at archive; family can close
- [ ] `CNP-OQ-4` (generic line reconciliation) as a follow-up if Nicoleta asks
- [ ] `codegraph sync` after merge

## 8. Roll-back plan

1. Revert the client commit. No server, migration or flag involved.
2. Old links with `group=updated-no-project` are then ignored (the parser does not read the key); the Results tab shows the scoped rows.
