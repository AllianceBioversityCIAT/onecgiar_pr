# `bugfix/indicator-achieved-value-per-center` — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/indicator-achieved-value-per-center` |
| Approval Mode | `gated` (inherited from `proposal.md` §1) — every continue/pause gate stops for the user |
| Branch | `qa-development-2026-ss` |
| Default branch pin | `master` |
| Baseline commit at first attempt | `0d6b00d5d3a01f097d7653cc7da17625b2e28c41` |
| Triad | Leader (T1, Opus) → Implementer (T2, Sonnet) → Reviewer (T3, Opus) — `author ≠ auditor` held via `.claude/agents/akili-implementer.md` / `akili-reviewer.md` wrappers |
| Budget (`design.md` §14) | 2 tasks · ~40–70 LOC · 1 review round |
| Git commits | **Deliberately not made.** The user holds a standing rule that every commit requires their explicit go-ahead; Step 3.3 staging is therefore deferred, not skipped. Working tree carries the change. |

---

## 2. Task Execution History

### `RFR-T-1` — Write the regression tests first (red on current code)

- **Status:** PASS
- **Date:** 2026-09-18
- **Implementer attempts:** 1
- **Skills assigned by the Leader:** `tdd`, `nestjs-expert` (as recommended by the task — no deviation)
- **Effort assigned:** `high` (above the `medium` T2 default — the task's difficulty is in *expressing* the assertion inside a mock-only suite, not in writing the code)

#### Leader decision recorded before dispatch (scope-resolving)

`aow-bilateral.repository.spec.ts` mocks `dataSource.query`; there is no SQL engine in this suite, so the task's literal wording ("seed two sibling nodes and one reported result") cannot be executed as written. `design.md` §10 explicitly permits "a faithful in-memory equivalent", so the Leader resolved the ambiguity rather than escalating it, and directed:

- `RFR-AC-1` is gated by asserting the **emitted SQL text** — node-level `GROUP BY tri.id` present, catalog-level `GROUP BY tri.toc_result_indicator_id` absent, outer join on `act.indicator_id = tgt.indicator_id` — complemented by a row-mapping case guarding that `contributionsMap` never collapses sibling nodes.
- `RFR-AC-2`/`RFR-AC-3` are gated by asserting the third union-of-status aggregate in the SQL plus the mapper surfacing `achieved_value_sum`, with the status 3→2 move modelled as two sequential calls with shifted sums.
- No new harness, no real DB connection, no SQL parser — stay inside the file's existing mocking idiom, using `describe('P2-3296 — preliminary and QA progress')` as the exemplar.

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts` — pure addition, 214 insertions / 0 deletions. No production file touched.
- **Test cases added** (new `describe('RFR-AC — per-node scoping and achieved_value_sum (indicator-achieved-value-per-center)')` block, placed after the `P2-3296` block):
  1. `scopes achieved/preliminary sums per ToC node, not per shared catalog indicator id` — `RFR-AC-1` primary gate. **Red today.**
  2. `keeps each sibling node on its own row in the contributions map, never collapsed onto a shared catalog id` — map-layer complement. Green today by design.
  3. `adds a third achieved_value_sum aggregate over the union status set (2, 3, 6)` — `RFR-AC-2`/`RFR-AC-3` SQL gate. **Red today.**
  4. `surfaces achieved_value_sum on the mapped row at status=3 (submitted, not yet QA'd)` — `RFR-AC-2`. **Red today.**
  5. `keeps achieved_value_sum single-counted (=1, never 0 or 2) once the same contribution moves to status=2 (QualityAssessed)` — `RFR-AC-3`. **Red today.**
  6. `leaves a single-node (non-shared catalog id) indicator unchanged — RFR-AC-4 regression guard` — `RFR-AC-4`. Green today by design (a red regression guard would itself be the defect).
- **Implementer verification command + result:**
  `npx jest --silent --reporters=summary --forceExit --testPathPattern=aow-bilateral.repository.spec.ts`
  ```
  Test Suites: 1 failed, 1 total
  Tests:       4 failed, 56 passed, 60 total
  ```
  The 4 failures are exactly cases 1, 3, 4, 5 above — the intended red. 54 pre-existing tests before the change, 56 passing after (54 pre-existing + the 2 new already-holding guards): **no pre-existing case broke.**
  Assertion messages: `expect(query).toContain('act.indicator_id = tgt.indicator_id')` not found; expected `SUM(CASE WHEN r.status_id IN (2, 3, 6) …)` substring not found and aggregate count 2 vs expected 3; `Expected: 1, Received: undefined` (×2, the mapper has no `achieved_value_sum`).
- **Lint:** `npx eslint "src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts" --quiet` → clean (one `prettier/prettier` wrap auto-fixed; jest re-run after the autofix gave the identical 4 failed / 56 passed).
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary (verbatim):** "All four Bug Mode cases from `RFR-T-1` are present and traceable to `RFR-AC-1..4`; the four red tests fail against the real defect (join key, `act` GROUP BY, missing third aggregate, mapper not carrying `achieved_value_sum`), every asserted SQL fragment matches the live query's actual aliases and spelling, the regex for the `act` subquery genuinely matches, and no production code was touched."
- **Reviewer's red-for-the-right-reason verification** (the question that mattered most for a red-first task): every asserted fragment was checked against the live query in `aow-bilateral.repository.ts` — the current outer join at line 914 is `ON act.toc_result_indicator_id = tgt.toc_result_indicator_id`; `tgt.indicator_id` already exists as an alias (line 852) so the post-fix form is reachable; the `/LEFT JOIN \(([\s\S]*?)\) AS act/` regex genuinely captures the `act` body (the only competing `LEFT JOIN` inside `tgt` has no parenthesis); the `act` body today reads `GROUP BY tri.toc_result_indicator_id` (lines 912-913); and `COALESCE(SUM(CASE WHEN r.status_id` occurs exactly 2× today (lines 878-879). The mapper reds come from `mapIndicatorContributionRow` (lines 784-810) genuinely lacking the field.

#### Implementer's `Not Done / Assumptions` (verbatim, carried per Step 2.3.0)

> The `SUM(CASE WHEN r.status_id IN (2, 3, 6) THEN CAST(rit.contributing_indicator AS DECIMAL(15,2)) ELSE 0 END)` literal I assert on in test 3 is my prediction of how RFR-T-2 will phrase the third aggregate, based on exactly mirroring the existing two aggregates' style in the same subquery (cast + `COALESCE(SUM(CASE...`). This is a reasonable, idiom-consistent bet per design.md §5's `RFR-DD-2`, but if the implementer phrases the CAST/COALESCE differently, this one assertion (not the others) may need a follow-up tweak during `RFR-T-2` review — flagging so the Leader/Reviewer knows this is a designed constraint, not an oversight.
>
> Everything else: none.

**Leader adjudication:** this is a flagged coupling, not outstanding scope — all four required cases were written, so the task does not stay open under Step 2.3.0. The Reviewer was asked to judge it directly (Q5) and found it acceptable: `design.md` §5's snippet is illustrative (it omits the `COALESCE(..., 0)` wrapper the production code requires), so the asserted literal constrains `RFR-T-2` toward consistency with the two sibling aggregates rather than forbidding anything the spec permits. **Forward pointer for `RFR-T-2`:** phrase the third aggregate exactly like the existing two, or update this one assertion in the same task.

#### `ADVISORY` (4R lens — recorded, never gating, never a new task)

- **RELIABILITY** — Case 2 is close to tautological: it feeds two pre-separated rows into a mocked query and asserts the mapper echoed them, so it can never go red for the pooling defect its name suggests. It still guards `RFR-R-4`'s map shape. Suggested rename: "maps each returned row onto its own `indicator_id` key".
- **READABILITY** — Cases 1 and 3 couple `RFR-T-2` to exact SQL spelling (comma-space inside `IN (2, 3, 6)`, `tri.id` listed first in the `GROUP BY`, the `CAST(... AS DECIMAL(15,2))` wrapper). Semantically equivalent phrasings would produce a false red; a tolerant regex would remove the brittleness at no loss of gating power.
- **READABILITY** — The `(map.get(31) as { achieved_value_sum?: number })` casts are the correct escape hatch today, but they will keep compiling silently if `RFR-T-2` forgets to widen the `contributionsMap` generic. Worth removing the casts during `RFR-T-2` so the return type itself becomes the assertion.
- **RISK** — None. Test-only diff, no secrets, no schema, no payload contract touched (`design.md` §4.2 confirms this repository is not read by `/api/bilateral/*`).

#### Coverage

- **Requirements covered:** `RFR-R-1`, `RFR-R-2`, `RFR-R-3` (test-side); acceptance criteria `RFR-AC-1`, `RFR-AC-2`, `RFR-AC-3`, `RFR-AC-4` now have gates.
- **Decisions made:** the in-memory-equivalent decision above; effort raised to `high`; no skill deviation.
- **Issues encountered:** none — PASS on attempt 1, within the `design.md` §14 budget of 1 review round.
- **Final verification:** 4 intended failures / 56 passes in `aow-bilateral.repository.spec.ts`; lint clean; `git diff` confirms a single test file changed with 214 insertions and 0 deletions.

#### Constitution Impact

None. No module created, no module boundary moved, no public surface changed — a test-only addition inside an existing spec file.

---

### `RFR-T-2` — Fix the aggregation join key and add the union-of-status "Achieved" field

- **Status:** PASS
- **Date:** 2026-09-18
- **Implementer attempts:** 1
- **Skills assigned by the Leader:** `nestjs-expert`, `systematic-debugging` (as recommended by the task — no deviation)
- **Effort assigned:** `xhigh` (above the `medium` T2 default — correctness-critical aggregation on a live reporting surface whose numbers appear on Program dashboards)
- **Forward pointer carried into the brief:** the `RFR-T-1` Implementer's flagged assumption about the exact SQL literal was copied verbatim into the `RFR-T-2` brief, with the instruction to phrase the third aggregate exactly like its two siblings. The Implementer complied, so the `RFR-T-1` assertion needed no relaxation.

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` — the fix (17 lines).
  - `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts` — consequential test maintenance for the additive field, plus one genuine test-regex defect fix (see below).
- **The three SQL edits** (all inside `getIndicatorContributions`'s `act` subquery):
  1. `act` now selects `tri.id AS indicator_id` and groups by `tri.id, tri.toc_result_indicator_id` (was: catalog id only). `tri.id` is first, as the `RFR-T-1` assertion requires.
  2. Outer join changed from `ON act.toc_result_indicator_id = tgt.toc_result_indicator_id` to `ON act.indicator_id = tgt.indicator_id` (`RFR-DD-1`).
  3. Third aggregate added, phrased identically to its two siblings: `COALESCE(SUM(CASE WHEN r.status_id IN (2, 3, 6) THEN CAST(rit.contributing_indicator AS DECIMAL(15,2)) ELSE 0 END), 0) AS achieved_value_sum` (`RFR-DD-2`), plus `COALESCE(act.achieved_value_sum, 0) AS achieved_value_sum` on the outer SELECT.
- **The two TS edits:** `mapIndicatorContributionRow` gained `achieved_value_sum?: unknown` on its input type and `achieved_value_sum` on its return; the inline `contributionsMap` generic gained `achieved_value_sum: number`.
- **`achieved_progress_percentage` deliberately skipped** — `design.md` §5 marks it optional ("whichever keeps the diff smaller"); no requirement or test needs it. Reviewer confirmed this is permitted, not a gap.
- **`actual_achieved_value_sum` / `preliminary_achieved_value_sum` untouched** (`RFR-R-4`) — the Reviewer confirmed the `(2, 6)` and `(3, 6)` lines are byte-identical to pre-diff; only the grouping key beneath them changed.
- **Implementer verification commands + results:**
  ```
  --testPathPattern=aow-bilateral.repository.spec.ts            → Test Suites: 1 passed | Tests: 60 passed, 60 total
  --testPathPattern=results-framework-reporting.service.spec.ts → Test Suites: 1 passed | Tests: 80 passed, 80 total
  --testPathPattern=toc-progress-rollup.spec.ts                 → Test Suites: 1 passed | Tests: 21 passed, 21 total
  eslint on both changed files --quiet                          → clean (no output)
  ```
  The four `RFR-T-1` red cases are now green; the two caller suites confirm no shape regression for `getGlobalUnitsByProgram` / `getWorkPackagesByProgramAndArea`.
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary (verbatim):** "`RFR-T-2` implements all six work-order items faithfully (`act` now groups/joins at node granularity, the union-of-status `achieved_value_sum` is added, the mapper and `contributionsMap` types carry it additively, and the two existing status sets are byte-identical). All five spec-file edits are legitimate — the regex change is a genuine, verifiable test defect whose fix makes both `GROUP BY` assertions *more* gating than they were, not less; nothing from the `RFR-T-1` gate was weakened, renamed, deleted or had an expected value changed."

#### The Implementer edited its own gating tests — adjudicated, not waved through

`RFR-T-2` changed five things in the spec file that `RFR-T-1` had just been PASSed on. Because "the author of the fix also edited the tests that gate the fix" is the single highest-risk pattern in a TDD task, the Leader made it the Reviewer's central question, itemised, with the explicit instruction to FAIL any edit that manufactured a green run. Verdicts:

- **(a) The regex fix inside the `RFR-AC-1` gate** — `/LEFT JOIN \(([\s\S]*?)\) AS act/` → `/LEFT JOIN \(([\s\S]*?)\) AS act\s+ON\b/`. **Legitimate, and it repaired a latent defect.** The Reviewer verified against the real query string that `) AS act` is a prefix of `) AS actual_achieved_value_sum` (line 883), so the old non-greedy capture stopped ~40 lines short of the `GROUP BY`. Under the old regex the positive assertion would have failed **even on correct post-fix code** and the negative would have passed **vacuously**. It was invisible during the `RFR-T-1` red run only because an earlier assertion in the same test threw first. The tightened regex provably reaches `) AS act ON act.indicator_id = ...` (backtracking is forced because `ual_achieved…` cannot satisfy `\s+ON\b`) and the captured body does contain the `GROUP BY`. Reviewer's falsifiability check: revert the production `GROUP BY` to catalog-only and both assertions flip red. **The fix made the gate stronger, not weaker.**
- **(b) `toHaveLength(2)` → `toHaveLength(3)`** on the aggregate count — legitimate arithmetic: exactly one aggregate was added, the pattern now matches exactly 3 times, and the assertion still fails if a fourth pass or a second subquery is ever introduced.
- **(c) `achieved_value_sum: 0` added to three pre-existing `.toEqual(...)` objects** — legitimate additive maintenance. All three fixtures are hand-built mock rows carrying no `achieved_value_sum` key, so `0` is the only correct expectation for a pass-through mapper. No case where the field should be non-zero is masked: every such case supplies the column and asserts `1`.
- **(d) Removal of the `(map.get(N) as { achieved_value_sum?: number })` casts** — Leader-authorized, and the Reviewer confirmed the values asserted are unchanged and now genuinely type-checked (`number | undefined`, not `any`). This closes the `RFR-T-1` advisory that predicted exactly this.
- **(e) No `RFR-T-1` acceptance assertion weakened, renamed, deleted or re-valued** — confirmed line by line against this log's `RFR-T-1` entry. All six case titles match verbatim and in order; every expected value is unchanged; zero deletions. Notably the Implementer did **not** relax the SQL literal its predecessor flagged as a bet — it phrased the production aggregate to match.

#### Reviewer's independent SQL-semantics verification (beyond the string assertions)

The string assertions only prove the query *text* changed. The Reviewer checked the *semantics*: `tri.id` is the row identity of `toc_results_indicators`, so `tri.toc_result_indicator_id` is functionally dependent on it and grouping by the pair yields **exactly one `act` row per `tri.id`**. The outer `LEFT JOIN` is therefore (≥1 `tgt` row) → (≤1 `act` row) with no aggregate at the outer level, so it **cannot fan out or double-count**. This also settles the question of whether keeping `tri.toc_result_indicator_id` as a second grouping column is harmless: a second grouping column can only split groups when it is not functionally determined by the first, and here it is — by construction. `RFR-AC-1`/`RFR-AC-2` hold in real SQL, not merely in the assertions.

#### `RFR-R-10` (SHOULD) — discharged

Both the Implementer and, independently, the Reviewer swept every `toc_result_indicator_id` occurrence in `aow-bilateral.repository.ts`. Findings: lines 480/482, 589/591, 730/732 are already node-scoped (`SELECT tri.id AS indicator_id … GROUP BY tri.id` / `WHERE tri.id = ?`); lines 556, 863, 902 are `CONVERT(…) = CONVERT(tri.related_node_id)`, a different node-scoped FK relation; lines 847-848, 857, 873 are `tgt`, already node-grouped; line 1169/1181 joins on the node id. **No other query in the file carries the catalog-vs-node defect** — the old line 914 join was the only instance and it is gone. Nothing to file as a follow-up.

#### `ADVISORY` (4R lens — recorded, never gating, never a new task)

- **RISK** — `design.md` §4.2's wording ("this repository is not read by `/api/bilateral/*`") is true of `getIndicatorContributions` but loose about the *class*: `api/bilateral/services/bilateral-center.service.ts` injects `AoWBilateralRepository` and calls `findLeadProjectId` / `findProjectTocLinkage`. No impact here (neither touches the changed method), but a future spec trusting §4.2 verbatim to change a *shared* helper in this file would skip the bilateral change-log gate. Worth one clarifying word in §4.2 at archive time.
- **READABILITY** — Under the outer `WHERE r.status_id IN (2, 3, 6)`, the new `CASE WHEN r.status_id IN (2, 3, 6)` is tautological. It is kept deliberately (symmetry with the sibling aggregates; it survives a future widening of the outer filter) and the inline comment says so — noted only so a later reader does not "simplify" it away.
- **RELIABILITY** — `achieved_value_sum?: unknown` is optional on the mapper input while the SQL always emits the column, so a future typo in the SQL alias would degrade silently to `0` rather than failing. The `toHaveLength(3)` plus literal-substring assertions are the compensating gate today.

#### Implementer's `Not Done / Assumptions` (verbatim, carried per Step 2.3.0)

> - Skipped computing `achieved_progress_percentage` (design.md §5's optional extra) — no test requires it and the design explicitly allows skipping it "whichever keeps the diff smaller." If the client eventually needs it, it's a small additive follow-up to `mapIndicatorContributionRow`.
> - Kept `tri.toc_result_indicator_id` in the `act` subquery's SELECT/GROUP BY as a second column rather than dropping it — confirmed via grep it's unused downstream, but removing it added no test coverage benefit and the forward pointer explicitly permitted keeping it.
> - The test-regex fix and the 4 pre-existing-test updates were not explicitly pre-authorized by name in the work order (which only pre-authorized removing the `achieved_value_sum` casts), but they were mechanically required to reach "0 failures" on `aow-bilateral.repository.spec.ts` as the Definition of Done requires, and none of them weaken, rename, or delete any RFR-T-1 acceptance-criteria assertion — flagging for Reviewer visibility per Step 2.3.0 practice.
> - No migration needed (confirmed, no entity/schema touched). No secrets logged.

**Leader adjudication:** none of these is outstanding scope. The first two are choices the task text and `design.md` §5 explicitly permit. The third is the disclosure that triggered the itemised audit above, and the Reviewer cleared every item — the Implementer flagging it rather than burying it is what made the audit possible. The task reaches `[x]`.

#### Coverage

- **Requirements covered:** `RFR-R-1`, `RFR-R-2`, `RFR-R-3`, `RFR-R-4`, and `RFR-R-10` (SHOULD, discharged); acceptance criteria `RFR-AC-1`..`RFR-AC-4` all now green.
- **Decisions made:** effort `xhigh`; no skill deviation; `achieved_progress_percentage` skipped per design; catalog column retained as a second grouping key.
- **Issues encountered:** one latent test-regex defect inherited from `RFR-T-1`, found and fixed during this task; no rework attempts consumed.
- **Final verification:** 60/60, 80/80, 21/21 green across the three named suites; lint clean on both changed files.

#### Constitution Impact

None. No module created, no boundary moved, no public surface changed. No migration (no entity or schema touched, so `migration:check` is unaffected). No bilateral/platform-report payload change, so no change-log row is owed in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.

---

## 3. Summary

**All tasks complete.** `RFR-T-1` (regression tests, red) and `RFR-T-2` (the fix, tests green) both PASSed on the first Implementer attempt, inside the `design.md` §14 budget (2 tasks, 1 review round; actual LOC slightly above the ~40-70 estimate because the additive field required maintenance on four pre-existing test expectations).

**Not yet done, and deliberately outside this spec:**
- **Commits.** Nothing has been committed — the user requires explicit per-commit approval. The whole change sits in the working tree on `qa-development-2026-ss`.
- **Rollout steps** in `tasks.md` §6 (PR, CI, manual QA on staging against the `proposal.md` §3 scenario, post-deploy telemetry) are unstarted and are human/pipeline work, not agent work.
- **The client-binding follow-up** (`design.md` §13): whether the Reporting screen must bind its "Achieved" column to the new `achieved_value_sum` field. This backend fix does not close Nicoleta's report end-to-end on its own if the screen reads a different field. To be filed separately after the staging check, per `tasks.md` §7.
- **Heads-up owed to Nicoleta/PMU** (`design.md` §11): previously-inflated Global Units roll-ups will show lower, correct numbers after deploy. That is the intended correction, not a new defect.
