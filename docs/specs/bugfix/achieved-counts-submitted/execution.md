# `bugfix/achieved-counts-submitted` — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/achieved-counts-submitted` |
| Approval Mode | `gated` (pause after every task) |
| Branch | `qa-development-2026-ss` (unrelated uncommitted notification work in tree — not staged, not touched) |
| Started | 2026-10-02 |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Spec status at start | `draft` — assumptions A-1..A-4 (requirements §9) taken as approved by the user's `/akili-execute` invocation; flagged to the user at T-1 start |
| Budget (design §12) | 5 tasks · ~350 LOC · 2 review rounds |

## 2. Task Execution History

### `ACS-T-1` — Regression tests first (red on current code) — **PASS**

- **Date:** 2026-10-02 · **Attempts:** 1 (with one in-attempt Leader correction before review) · **Effort:** medium · **Skills:** `tdd`, `nestjs-expert`, `angular-developer` (as listed)
- **Covers:** `ACS-S-1`, `S-2`, `S-4`, `S-7`, `S-8`, `S-10`, `S-11`

**Attempt 1 — files changed (tests only, 0 production LOC):**
- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/toc-progress-rollup.spec.ts` (+59) — `rollUpIndicators` achieved 100 / '100%'; `rollUpChildren` (100, 0) → 50; no-target child skipped.
- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts` (+61) — indicator `achieved_progress_percentage '100%'`, QA pair stays `0` / `'0%'`.
- `onecgiar-pr-client/src/app/shared/constants/achieved-display-basis.spec.ts` (NEW) — re-point + `qa_*`, S-2 fixtures, DD-5 guard, switch-on identity, default `false`, and the S-8 normaliser → `partitionProgramKpis` → `summarisePartition` case.
- `onecgiar-pr-client/src/app/shared/services/api/results-api.service.spec.ts` (+40) — `GET_TocResultsByAowId` flush emits `actual_achieved_value_sum 1`.

**Leader correction (in-attempt, before review):** the Implementer first put the S-8 case in `reporting-burndown.spec.ts`, asserting against `achieved_value_sum` directly. That would have forced an edit to `reporting-burndown.ts`, which contradicts `ACS-DD-1`/`ACS-DD-2` and T-3's BUT clause ("must NOT edit numeric bindings in components"). Ruling: move the case into `achieved-display-basis.spec.ts`, run end to end through the normaliser, and leave `reporting-burndown.spec.ts` byte-identical to HEAD. The Implementer also corrected the Leader's literal KCR-R-2 numbers: it asserts `zeroTarget: 0, counted: 2`, per `reporting-burndown.ts:75` (`applyZeroTargetRule`: zeroTarget is always 0 and every KPI stays in the denominator). Leader verified the docstring and accepted. Deviation from the task text: scope item 5 now lives in a different file. Covered behaviour is unchanged.

**Seam pinned for T-3:** `export const SHOW_QA_PREL_SPLIT: boolean` (false) · `export function toDisplayBasis<T>(payload: T, showSplit = SHOW_QA_PREL_SPLIT): T`.

**Verification (Implementer):**
- server `npx jest --silent --reporters=summary --forceExit --testPathPattern="toc-progress-rollup|aow-bilateral.repository"` → Tests **4 failed**, 94 passed. The 4 failures are the new cases: `achieved_value` / `achieved_progress_percentage` read `undefined`.
- client `npx jest --silent --reporters=summary --no-coverage --testPathPattern="achieved-display-basis|results-api.service|reporting-burndown"` → Suites 2 failed, 1 passed; Tests 1 failed, 341 passed.
  - `achieved-display-basis.spec`: `Cannot find module './achieved-display-basis'`. This is the sanctioned red.
  - `results-api.service.spec` `GET_TocResultsByAowId`: got 0, expected 1, plus a `done()` timeout.
  - `reporting-burndown.spec`: PASS, unchanged.

**Reviewer verdict:** `STATUS: PASS`. All five scope items are red for the right reason. Expected values come from the scenarios. None of the new cases would pass today. All four Leader decisions are consistent with the spec.

**ADVISORY (4R — recorded, no rework):**
1. *Reliability:* no red test for the design §8.1 roll-up re-point (`progress_value ← achieved_value`, `progress_percentage ← achieved_progress_percentage` on `progress` / `areas[].progress` / node `progress`, plus the `tocResultsOutputs[]` / `tocResultsOutcomes[]` walks). This is a gap in T-1 as written: tasks §5 maps S-7 to the server only.
2. *Reliability:* the no-mutation requirement (T-3 BUT) is untested.
3. *Readability:* the S-2 Approved-only and 3→2 fixtures are identical and do not discriminate an identity function. The Approved fixture should carry `preliminary_achieved_value_sum: 1`.
4. *Reliability:* the guard is tested only all-or-nothing. The per-field guard is not pinned.
5. *Readability:* the results-api assertion sits inside `subscribe`, so a failure shows up as a `done()` timeout. Assert after `flush`.
6. *Minor (S-11):* the aow-bilateral case does not assert `preliminary_*` unchanged.

**Forward pointers → `ACS-T-3` (Leader):** advisories 1 and 2 cover behaviour that T-3's own scope already owns (design §8.1 walk of all shapes; the BUT "return copies"). The T-3 brief will require the Implementer to prove both with tests as part of its deliverable, not as new spec scope. Advisories 3–6 are recorded only.

**Final:** PASS · tasks.md ticked after this entry.

### `ACS-T-2`: Server, achieved basis on rows and roll-ups (**PASS**)

- **Date:** 2026-10-02
- **Attempts:** 1
- **Effort:** medium
- **Skills:** `nestjs-expert`
- **Ran in parallel with:** T-3 (disjoint packages)
- **Covers:** `ACS-R-2` (row %), `ACS-R-3`, `ACS-S-6`, `ACS-S-7`, `ACS-S-11`, `ACS-NFR-1/2`

**Files changed (43 prod LOC, budget ~70):**
- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/toc-progress-rollup.ts` (+30). New fields:
  - `RollupIndicator.achieved_value_sum`
  - `NumericRollup.achieved`

  How they are computed and emitted:
  - `rollUpIndicatorsNumeric` computes them over the same `hasUsableTarget` set.
  - `rollUpChildren` averages them over the same `measurable` set.
  - `present` emits `achieved_value` and `achieved_progress_percentage`.
- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+13). `achieved_progress_percentage` is computed in `fetchAndGroupTocResults` and whitelisted in `groupTocRows` (default `'0%'`). Both interfaces carry the new field.
- No SQL, status-set or averaging-rule change.
- Callers in `results-framework-reporting.service.ts` (AoW ~456, SP ~829/838) inherit the new fields without edits.

**Deviation (accepted by Reviewer):** `ProgressRollup.achieved_value` and `achieved_progress_percentage` are optional. Making them required broke compilation of the pre-existing P2-3296 literal fixtures, and the "Fails when" clause forbids touching those. Both roll-up functions always populate the fields.

**Mid-task directive (user, machine saturated):** all Jest runs use `--maxWorkers=2`, one run at a time.

**Verification:**
- `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern="toc-progress-rollup|aow-bilateral.repository|results-framework-reporting"`: 29 suites, 420 tests passed, 0 failed.
- `npx eslint "src/api/results/results-toc-results/repositories/*.ts" --quiet`: the T-2 prod files were clean. The one error was in T-1's spec, line 178 (prettier, line too long).

**T-1 cleanup (Leader inline, mechanical):** ran `npx prettier --write` on `toc-progress-rollup.spec.ts`. The re-lint of `repositories/*.ts` is now clean (`LINT_OK`). This is recorded as T-1 cleanup, not as T-2 rework.

**Reviewer verdict:** `STATUS: PASS`. The diff matches design §6/§7 point by point. The BUT clause holds: no SQL, status-set, averaging or existing-value change.

**ADVISORY:**
1. *Resilience:* `rollUpChildren` uses `child.progress?.achieved_value ?? 0`, which mirrors the preliminary pattern. No child with a target and a missing achieved figure can occur at runtime. The only exposure is hand-built literals, where it understates rather than throws. Kept for symmetry.

**Final:** PASS.

### `ACS-T-3` — Client: display-basis normaliser at the API choke point — **PASS**

- **Date:** 2026-10-02
- **Attempts:** 1
- **Effort:** medium
- **Skills:** `angular-developer`, `tdd`. I added `tdd` to the task's list because the normaliser is pure mapping logic that T-1's red tests already pin.
- **Ran in parallel with:** T-2
- **Covers:** `ACS-R-1`, `ACS-R-2` (badge), `ACS-R-4`, `ACS-S-1..5`, `ACS-S-8`, `ACS-S-10`

**Files changed** (all under `onecgiar-pr-client/`):
- `src/app/shared/constants/achieved-display-basis.ts` (NEW, ~115 LOC)
  - Exports `SHOW_QA_PREL_SPLIT = false` and `toDisplayBasis<T>(payload, showSplit = SHOW_QA_PREL_SPLIT)`.
  - Pure and non-mutating: it copies an object before the first write.
  - Guards each field on its own (ACS-DD-5).
  - Walks the top-level `progress`, `areas[].progress`, and each node's `progress` and `indicators[]` inside `tocResults[]`, `tocResultsOutputs[]` and `tocResultsOutcomes[]`.
- `src/app/shared/constants/achieved-display-basis.spec.ts` (+~200 LOC). These cover the T-1 forward pointers:
  - the roll-up re-point across every shape
  - no mutation (snapshot of the object graph before and after the call)
  - the per-field guard (value-only and percentage-only)
- `src/app/shared/services/api/results-api.service.ts`: the four methods now pipe through `map(res => ({ ...res, response: toDisplayBasis(res?.response) }))`. It uses an arrow so `map`'s index argument cannot leak into `showSplit`.
- `reporting-aow-table.component.ts` and `program-overview.component.ts`: optional `achieved_*` and `qa_*` fields added to the `ReportingIndicator` and `TocAchievement` interfaces. No binding was edited.

**Real payload shapes, as the server returns them:**

| Method | `response` shape |
|---|---|
| `GET_TocResultsByAowId` | `{ progress, tocResultsOutputs[], tocResultsOutcomes[], metadata }` |
| `GET_IntermediateOutcomes`, `GET_2030Outcomes` | `{ tocResults[], metadata }` |
| `GET_ScienceProgramTocProgress` | `{ progress, areas[{code,name,progress}], metadata }` |

Every node carries its own `progress`, which confirms design §8.1.

**Verification** (`--maxWorkers=2`, runs one after another):
- `--testPathPattern="achieved-display-basis|results-api.service|reporting-burndown"`: 3 suites, 358 tests passed.
- `--testPathPattern="reporting-aow-table.component|aow-hlo-table|indicator-drawer|program-overview|dashboard-lab.component"`: 28 suites, 1264 tests passed, 0 failed.
- Grep gate: all four method bodies contain `toDisplayBasis`.
- Raw-endpoint gate: the four URLs appear nowhere outside the service, so no surface is left uncovered (the "Fails when" check).
- `eslint` on the 5 touched files: clean.

**Reviewer verdict:** `STATUS: PASS`.
- Every server path emits the union fields as non-null whenever QA is non-null. Roll-up `achieved` is null only when `progress_value` is also null, because both are averaged over the same `measurable` set.
- Both BUT clauses hold.
- Every consumer reaches the data only through the four methods: galaxy, `entity-aow.service`, `dashboard-lab`, `guided-creation`, `where-to-report-modal`, `results-center-reporting-guide`, and `lab-report-form` (via `dashboard-lab`).

**ADVISORY:**
1. *Reliability:* only `GET_TocResultsByAowId` has a flush test that shows the re-point happening. The other three methods are covered only by the grep gate.
2. *Resilience:* a null response body turns into `{ response: undefined }` instead of passing through as null. Impact is low because consumers use `catchError`.
3. *Readability:* the component docs `reporting-aow-table/CLAUDE.md` and `program-overview/CLAUDE.md` do not mention the new interface fields. The client convention is to update them in the same commit.

**Forward pointer → `ACS-T-4`:** advisory 3 is commit hygiene that the project convention requires (client CLAUDE.md §10), and T-4 edits both folders again. The T-4 brief must include updating those two component `CLAUDE.md` files and re-stamping `Verified:`. Advisories 1 and 2 are recorded only.

**Final:** PASS.

### `ACS-T-4`: Client, hide the QA / Prel pair (flag) and update affected specs (in progress)

**Attempt 1** (2026-10-02 · effort high · skills `angular-developer`, `spartan`; Leader dropped `frontend-design` because no new visual design is involved)

- **Files:** 16 files, +393/−90.
  - Flag and `@if/@else` branches in `reporting-aow-table`, `program-overview`, `dashboard-lab`, `aow-hlo-table` and `entity-aow-card` (ts + html).
  - Tooltip and aria builders branched to "ToC achievement — x%".
  - Specs updated, with one or more flag-on cases kept per suite.
  - `program-overview.row-layout.cy.ts`: the restack test now mounts with the flag on.
  - `reporting-aow-table/CLAUDE.md` and `program-overview/CLAUDE.md` updated and re-stamped.
- **Verification:**
  - Jest (`--maxWorkers=2`): 30 suites, 1291 passed.
  - Cypress CT row-layout: 4/4 passed.
  - eslint: clean.
  - Grep gate: 21 hits, all on the flag-on path.
- **Reviewer:** `STATUS: FAIL`. Findings, verbatim in substance:
  1. `entity-aow/pages/entity-aow-aow/entity-aow-aow.component.html:44-57` renders the `QA` and `Prel.` labels unconditionally. This is the AoW header of the routed legacy By-AoW page (`entity-details/:entityId/aow/:aowId`), the same page that hosts `aow-hlo-table`. Violated rule: ACS-R-5 ("HLO and AoW headers … legacy By-AoW table"), ACS-S-9, and the T-4 BUT clause. Remediation: flag it plus `@else` with a single `aow-progress_pair`, add it to the grep gate, and update its spec if it asserts these labels. `entity-details.component.html:86-100` has the same unbranched pair, but the component is retired and unrouted, so it does not block.
  2. `dashboard-lab/CLAUDE.md` was not updated although `dashboard-lab.component.ts/html` changed. Its "Columna 6: Porcentajes de avance QA y PREL" line is now false. Violated rule: client CLAUDE.md §10, folder docs. Remediation: re-stamp `Verified:`, add a note on the flag, and fix the Columna 6 bullet.
- **ADVISORY (attempt 1):**
  - *Reliability:* flag-off Jest tests only assert presence. Add `not.toContain('Prel.')`/`'Preliminary'`.
  - *Readability:* reporting-aow-table keeps 3 flag-on cases, while design §10.1 says one.
  - *Readability:* `(component as any).showQaPrelSplit = true` on a readonly field is fragile if the field becomes a signal.
  - *Risk:* design §8.2 says `--pr-color-green-500`, but the real QA bar class is `bg-emerald-500`. The Implementer correctly reused the existing class.
  - *Risk:* the indicator drawer and ToC map have no QA/Prel labels to hide (per the Reviewer's grep).
- **Leader adjudication:** finding 1 is in scope. The requirement names the surface explicitly. The design §8.2 surface list is incomplete, which is a gap in the spec's own surface list, not a pivot. design §8.2 and the T-4 Scope will be amended at finalize. Finding 2 falls under the project's docs convention. Both findings go to attempt 2. Effort bumped high → xhigh.

**Attempt 2** (effort xhigh). I re-briefed the attempt-1 Implementer, passing the Reviewer FAIL verbatim along with the attempt history.
- **Files:**
  - `entity-aow/pages/entity-aow-aow/entity-aow-aow.component.ts`: added the flag.
  - `entity-aow-aow.component.html`: the AoW header pair is now under `@if (showQaPrelSplit)`. The `@else` shows a single `aow-progress_pair`.
  - `dashboard-lab/CLAUDE.md`: re-stamped `Verified: 2026-10-02`, fixed the Columna 6 bullet, and added a section on the flag.
  - `entity-aow-aow.component.spec.ts`: no change. It never asserted QA/Prel.
  - `entity-aow/`: has no CLAUDE.md.
- **Verification:**
  - Jest (`--maxWorkers=2`), scoped to entity-aow-aow, aow-hlo-table and dashboard-lab: 29 suites / 1294 passed.
  - Jest over the full scoped T-4 set: 31 suites / 1316 passed.
  - eslint: clean.
  - Full-folder grep of `result-framework-reporting/**/*.html`: every QA/Prel label is guarded, except `entity-details/entity-details.component.html:89,93`.
- **Reviewer:** `STATUS: PASS`. I independently grep-verified both findings as fixed.
- **Known dead code (recorded, not changed):** `entity-details.component.html:89,93` still renders the QA/Prel pair. The component is retired and has no route (`routing-data.ts:647-648`).
- **ADVISORY (final):**
  - The flag-off Jest tests assert only that the figure is present, not that the label is absent. `entity-aow-aow` has no flag-off header test.
  - reporting-aow-table has 3 flag-on cases, where §10.1 says 1.
  - The §8.2 token wording was wrong. Fixed below.
- **Spec amendment (Leader, the spec's own files, correction closure):**
  - design §8.2: token corrected to the existing `bg-emerald-500` / `progress-cell_fill--qa` classes, and the `entity-aow-aow` AoW header added to the surface list.
  - tasks ACS-T-4 Scope: `entity-aow-aow` AoW header added.
  - Forward/backward grep: `green-500` appears nowhere else in the spec folder. requirements ACS-R-5 already names "HLO and AoW headers … legacy By-AoW table", so no backward conflict.
- **Requirements note:** ACS-R-5 also lists the indicator drawer and the ToC map. Per the attempt-1 Reviewer grep, neither has QA/Prel labels, so nothing needed hiding there.
- **Budget:** about 1,200 LOC including tests and docs, against a design estimate of about 350, and 6 review rounds against an estimate of 2. The user was informed during T-4. The cause is test depth (more than half the lines), the a11y builders, and component docs. Every task passed within its rework ceiling.

**Final:** PASS after 2 attempts.

## Post-execution integration (2026-10-02)

The user authorized committing and pushing: first `qa-development-2026-ss`, then merging in `performance-refactor`, validating, and pushing to `performance-refactor`.

1. **Commits on `qa-development-2026-ss`, pushed:**
   - `4832d9f55` server
   - `5ef2cee3b` client
   - `fe72a35a8` spec
2. **Merge of `origin/performance-refactor` (P2-3858 entities-overview + contributor fixes):** clean, no conflicts.
3. **Validation after the merge** (all runs used `--maxWorkers=2` and ran one at a time):
   - Server jest, scoped: 29 suites / 420 passed.
   - Server `tsc --noEmit`: clean.
   - Client jest, scoped (this spec's surfaces plus the merged entities-overview and reporting-nav-sidebar): 41 suites / 1930 passed.
   - **Client `tsc -p tsconfig.app.json --noEmit`: 15 errors (TS4111), all in `achieved-display-basis.ts`.** The app tsconfig sets `noPropertyAccessFromIndexSignature`, and `Record<string, any>` triggers it.
     - Jest missed this because its `diagnostics: false` skips type checking. The production build would have failed.
     - **Leader inline fix (mechanical, 1 line, user-visible):** `type AnyRecord = any`, with a comment explaining why.
     - After the fix: tsc reports 0 errors, eslint is clean, and jest on `achieved-display-basis|results-api.service` passes 332.
     - Lesson for kaizen: a client task's verify step should include `tsc -p tsconfig.app.json --noEmit` (or a build), not only jest.
