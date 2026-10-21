# Execution log — center-overview-w3-scope

## CWS-T-1 — Pre-check (HITL, 2026-10-21)

Queries run by the user in DBeaver against prod, Reporting 2026 (`version_id = 8`). SQL was given inline in the chat.

### (a) Replicated W1/W2 rows that tag a project of their own center, all centers

| Result | Value |
|---|---|
| Rows returned | **0** (empty result set) |
| Ownership rule used | `organization_code = center institutionId`, or `organization_code` NULL and `source_center_acronym = institution acronym` |
| Caveat | Proxy for the code's W3 alias map (`W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE`). Closed by the follow-up check below |

**Decision:** `CWS-DD-2` stands. The current `CASE` precedence (replicated first) drops no row that matches Nicoleta's category 3. Design `P-3` holds: scoping the Overview service does not change the Reporting projects panel's per-project counts.

### (b) CIP (`CENTER-06`) baseline by `overview_category`

| `overview_category` | n | 19-Oct |
|---|---|---|
| `replicated_w3` | 63 | 63 |
| `replicated_w1w2` | 200 | 200 |
| `new_w3` | 0 (absent) | 0 |
| `w1w2_tagging` | 0 (absent) | 0 |
| `w1w2_center_only` | **5** | 6 |
| **Total today** | **268** | 269 |
| **Expected after CWS** | **63** | — |

The only change since 19-Oct is `w1w2_center_only`, which went from 6 to 5. That category is removed by this spec, so the expected figure does not change.

`CWS-T-6` compares against these numbers. Re-run (b) the same day as the PRTest check (`CWS-T-6` disqualifier).

### (c) Alias follow-up: replicated W1/W2 rows with ANY active project, all centers

| Result | Value |
|---|---|
| `replicated_w1w2_with_any_project` | **0** |

No replicated `Result` row in Reporting 2026 has an active `results_by_projects` row. The alias caveat of (a) does not apply: there is nothing for an alias to match. `CWS-OQ-2` is closed for current data.

**Status:** done.

## Execution decisions (Leader, 2026-10-21)

- Owner approved `requirements.md` and `design.md` (gated mode), 2026-10-21.
- **Branch:** the owner chose to work directly on `qa-development-2026-ss`. This overrides the spec's "from `staging`". Reason: CRK (`17fadfb7e`, `bcd453de9`) is not in `staging` and edits `bilateral-results-list.component.ts` (CWS-T-5). The `CWS-T-5` rebase disqualifier does not apply.
- **Order:** T-2 and T-3 are independent, but they run **one after the other**. The machine rule is one Jest run at a time.

## CWS-T-2 — Server: `scope=bilateral` on `bilateral-center-results` — PASS (2026-10-21)

- **Attempts:** 1 (Implementer T2 `sonnet`, effort high · Reviewer T3 `opus`, lens checklist)
- **Skills:** `nestjs-expert`, `tdd`
- **Files changed** (`onecgiar-pr-server/src/api/results/`):
  - `results.controller.ts`: `@Query('scope')`, `scope === 'bilateral'` passed as the 4th argument, `@ApiQuery` added, operation description updated.
  - `results.service.ts`: `bilateralScope = false` pass-through.
  - `result.repository.ts`: the tagging bind is `includeProjectTagging || bilateralScope`. A new final bound flag adds `AND (? = 0 OR r.source = 'API' OR (COALESCE(r.is_replicated,0) = 0 AND tg.result_id IS NOT NULL))`. SQL `--` comments (`@akili-spec`, and "must change together with the CASE") sit on both sides.
  - `result.repository.spec.ts`: `expectCenterResultsParams` checks the last 4 parameters. New `bilateral scope (CWS-R-1)` block, 4 tests.
  - `results.controller.spec.ts`: +3 tests (`bilateral` → true; `foo` and `Bilateral` → false; tagging only; no flags).
  - `results.service.spec.ts`: +2 tests. No spec covered this method before.
  - Size: +195 / −4.
- **Verification (Implementer):**
  - Red before: 3 suites failed (2 on compile errors for the new arguments, plus 2 service assertions).
  - `npx jest --maxWorkers=2 --findRelatedTests src/api/results/result.repository.ts src/api/results/results.controller.ts src/api/results/results.service.ts --silent --coverage=false`: 120 suites, 2955 tests passed.
  - `npx eslint` on the 6 files: clean.
  - `bilateral-result-summaries.en.md` untouched.
- **Reviewer verdict:** PASS.
  - The predicate was checked by hand against every `CASE` branch. It is the exact complement of `replicated_w1w2` ∪ `w1w2_center_only` and keeps the precedence.
  - No duplicated CTE (it reuses the `tg` LEFT JOIN).
  - The `?` count equals `params.length`.
  - Only the exact value `bilateral` sets the flag.
  - All 4 falsifiers are covered by named tests.
- **ADVISORY** (recorded only, no rework):
  - RISK, wording: `CWS-AC-2` ("SQL and parameters identical") and the T-2 disqualifier ("unscoped SQL text") read literally. The unscoped SQL text does gain one predicate line and one bound 0. Design §5 allows this (it evaluates identically). **Leader adjudication:** design §5 governs. Align the `CWS-AC-2` wording at `/akili-archive`.
  - RELIABILITY: for 2 of 3 suites, the red run was a compile error, not an assertion failure. The Reviewer traced the mutations and confirmed the tests would also have gone red on behavior. Next time, record a red run that reaches the assertions.
  - READABILITY: the unscoped test checks only the tagging clause, the predicate and the parameter tail. A snapshot or string-equality check would strengthen `CWS-AC-2`.
  - RISK: the live count (63 for CIP) is not proven by specs. Owned by `CWS-T-6`.
- **Implementer "Not Done / Assumptions":** "CWS-T-1 was not run". **Leader adjudication:** this is wrong. T-1 is done (see above, 0 rows). The other items are design notes (no `r.source='Result'` term, `--` comment style), not scope still owed.
- **Requirements covered:** `CWS-R-1` (A shape, B, C, rules, BUT on the server side), `CWS-AC-1`, `CWS-AC-2`, `CWS-DD-1..4`.
- **Gate:** gated mode, the owner continue/pause gate follows.

- 2026-10-21: the owner said "continua hasta que termines". From here, continue/pause gates after a PASS auto-pass. HALT, Pivot, tripwire and the HITL task `CWS-T-6` still stop.

## CWS-T-3 — Client contract: `scope` key + API options — PASS (2026-10-21)

- **Attempts:** 1 (Implementer T2, effort medium · Reviewer T3, lens checklist). The continue gate after T-2 was passed by the owner ("continua hasta que termines").
- **Skills:** `angular-developer`, `tdd`
- **Files changed** (10 files, +112 / −10, `onecgiar-pr-client/src/app/`):
  - `pages/bilateral/bilateral-query-params.ts`:
    - added `BILATERAL_SCOPE_QUERY_PARAM`, `SCOPE_VALUES = ['bilateral']` and `BilateralScope`;
    - `scope` added to `ContractKey` and `BilateralQueryParams`;
    - an unknown value becomes null and is added to `stripped`;
    - it is serialized only when non-null, and never by `explicitDefaults`.
  - `pages/bilateral/bilateral-query-params.spec.ts`: new `scope (CWS-R-7)` block, and `scope` added to the existing literals.
  - `shared/services/api/bilateral-api.service.ts` (+ spec, 4 tests): `GET_bilateralCenterResults(centerId, versionId, options = {})`.
  - `pages/bilateral/services/bilateral-overview.service.ts` (+ spec): `true` becomes `{ includeProjectTagging: true }`. Behavior is unchanged; switching it to scope belongs to T-4.
  - `scope: null` added to full literals, a type-only change:
    - `bilateral-overview.component.ts` (`emptyParams`) and its spec;
    - `overview-controls.component.spec.ts`;
    - `bilateral-results-list.component.ts`.
- **Verification:**
  - Red: 8 failed / 91 passed, all behavioral assertions.
  - `npx jest --maxWorkers=2 --no-coverage --findRelatedTests <5 sources>`: 446 suites, 11910 tests passed.
  - `tsc -p tsconfig.app.json`: 0 errors.
  - `tsc -p tsconfig.spec.json`: 209 errors, the same as the pre-change baseline (they predate this spec).
  - Lint, run by the Leader: `ESLINT_USE_FLAT_CONFIG=false npx eslint <10 files> --quiet` exits 0. Plain `npx eslint` fails because the client still uses `.eslintrc.json`.
- **Reviewer verdict:** PASS.
  - Every falsifier case is asserted.
  - The only caller with a third argument was the Overview service.
  - The Results list and the Centers block are unchanged.
  - Disqualifier `CWS-DD-5` not triggered.
- **ADVISORY** (recorded only):
  - The doc comment on `BILATERAL_SCOPE_QUERY_PARAM` says "value", but the constant holds the key.
  - The API option is typed inline as `'bilateral' | null` instead of `BilateralScope`. Importing that type from `pages/` would invert the dependency direction, so the two types could drift apart.
  - When both options are passed, both params are sent. This is acceptable under `CWS-DD-4`.
- **Process incident:** the Implementer ran `git stash` / `git stash pop` in the shared checkout to measure the tsc baseline. The pop was clean and nothing was lost. During this run, another session's changes appeared in the checkout (notification-item, contribution-request-drawer copy, `bugfix/primary-request-decision-state`), and they may have been inside that stash. From now on, briefs forbid `git stash`.
- **Requirements covered:** `CWS-R-7` (one shared definition; unknown value = unscoped), `CWS-AC-6`, design §6.2 rows 1–2.
- **Gate:** auto-continue (owner instruction).
- **Order T-4 / T-5:** they run one after the other, not in parallel. The rule is one Jest run at a time, and another session is active in the checkout.

## CWS-T-4 — Overview: scoped rows, 3 categories, Projects covered by new rows — PASS (2026-10-21)

- **Attempts:** 1 (Implementer T2, effort high · Reviewer T3, lens checklist)
- **Skills:** `angular-developer`, `tdd`. Spartan was not needed: copy only, no new primitive (design §6.3).

### Files changed (`onecgiar-pr-client/src/app/pages/bilateral/`, ~400 LOC)

- `services/bilateral-overview.service.ts` (+ spec): sends `{ scope: 'bilateral' }`.
- `pages/bilateral-overview/bilateral-overview.aggregate.ts` (+ spec):
  - `OVERVIEW_CATEGORIES` holds the 3 display categories, with a new type `OverviewDisplayCategory`. The wire type keeps 5 values.
  - `allW1W2` removed.
  - "Covered" now means `new > 0`, and `notStartedProjectIds` follows the same rule.
  - `coveredWithNewCount` removed. New `coveredOnlyReplicatedCount`.
- `pages/bilateral-overview/bilateral-overview.component.ts` / `.html` (+ spec):
  - Copy from proposal §4, and the aria label lists exactly those 3 lines.
  - `deepLinkParams` forces `scope: null`. A new `resultsLinkParams` adds `scope: 'bilateral'` to Results links only.
  - The no-project link is `{ project: [], source: 'w3' }`.
  - New sub-lines and the strip title "No new results yet (n)".
  - The not-started chip aria reads "0 new results".
- `bilateral-overview.charts.ts`: the a11y summary says "at least one new result".
- `bilateral-overview.fixtures.ts`: `makeCwsScopedFixture()`.
- `bilateral-overview.cy.ts`: stub only. Cypress was not run.
- `bilateral-overview/CLAUDE.md`: the invariant is 3 categories, the `includeProjectTagging` gap is closed by `CWS-R-8`, and the Verified line is re-stamped.

### Verification (Implementer)

- **Red runs:**
  - The aggregate falsifier failed on assertions before the change: `coveredCount` 5, `notStartedCount` 52, and the extra category keys were still present.
  - The component falsifier has no pre-change run. A stand-in mutation (`resultsLinkParams` set to `scope: null`) made the deep-link assertion fail.
- **Green runs:**
  - Aggregate spec alone: 51 of 51 passed.
  - `--findRelatedTests` on service, aggregate, component, charts and fixtures: 439 suites and 11739 tests passed.
  - That set includes `bilateral-projects-panel`, so `P-3` held.
- **Other checks:**
  - `tsc` (app): clean.
  - `eslint`, 9 files: exit 0.
  - grep for `replicated_w1w2|w1w2_center_only` in `bilateral-overview/`: no matches.

### Reviewer verdict: PASS

- No client-side row hiding: the headline counts every row.
- The copy matches proposal §4 exactly.
- Every scoped-link case is asserted: Results links carry `scope`; Reporting, Draft and AI-draft links do not.
- All identities in the falsifier fixture hold.

### ADVISORY (recorded only, no rework)

- **RELIABILITY:** `FIXTURE_D1_ROWS` row 6 is a W1/W2 row with no project. It falls back to `w1w2_tagging`, a state that cannot happen under the scope. Follow-up: re-shape the fixture.
- **RISK:** `resolveOverviewCategory` does not check against the display list. During a split deploy, an old server's `replicated_w1w2` rows would count as new. This is the same §11 window: ship server and client together.
- **READABILITY:** the charts a11y summary is new copy, not from the proposal. Include it in Nicoleta's copy confirmation (`CWS-OQ-3`).
- **READABILITY:** the folder `CLAUDE.md` is 123 lines against a 120 cap (it was 122 before). Trim it at archive.
- **RELIABILITY:** the visual state and live reconciliation are owned by `CWS-T-6`.

### Leader notes

- **Implementer "Not Done / Assumptions":**
  - Fixture row 6 kept.
  - Counting uses `category in counts`.
  - 3 spec tsc errors in this folder predate this task.
  - CLAUDE.md length.
  - None of these is scope still owed.
- **Requirements covered:** `CWS-R-2`, `-3`, `-4`, `-5` A/B, `-6`, `-8`; `CWS-AC-3`, `-4`, `-5`, `-8`; `CWS-DD-5..7`.
- **Gate:** auto-continue. The CWS-T-5 Implementer was started while this review ran. Disjoint files; the Reviewer runs no tests.

## CWS-T-5 — Results tab: scoped fetch + scope chip — PASS (2026-10-21)

- **Attempts:** 1 (Implementer T2, effort medium · Reviewer T3, lens checklist)
- **Skills:** `angular-developer`, `tdd`
- **Files changed** (`pages/bilateral/pages/bilateral-results-list/`, +92 / −6):
  - `bilateral-results-list.component.ts`:
    - new `scope` signal, set by `applyUrlParams` on every emission (so it is not sticky);
    - `BILATERAL_SCOPE_QUERY_PARAM` added to `RESULTS_TAB_MANAGED_QUERY_PARAMS`;
    - `toObservable(scope).pipe(distinctUntilChanged())` added to the fetch `combineLatest`;
    - `fetchPhase` sends `{ scope }` only when it is set. Without it, the call has no options argument, so the request is byte-identical to today's;
    - new chip `'scope'`, labeled "Scope: Bilateral reporting (Overview)";
    - `clearChip('scope')` clears the signal, then `syncUrlParams()` runs;
    - "Clear all" also resets it.
  - `bilateral-results-list.component.spec.ts`: new `CWS-T-5` block, 4 specs:
    - scoped fetch, chip, and no hiding;
    - removal leads to an unscoped refetch, called once, with no URL key;
    - without the key, the request is unchanged and W3 + Lead applies;
    - not sticky across a navigation.
  - `CLAUDE.md` (folder): new "Overview scope (CWS-T-5)" section.
  - `.html` is unchanged. Chips are rendered generically: a native `<button>` with `aria-label="Remove filter"`, the same as the other chips.
- **Verification:**
  - Red: the 4 specs failed before the implementation. Only the test names were seen; see the advisory below.
  - Own spec: 120 passed.
  - `npx jest --maxWorkers=2 --no-coverage --findRelatedTests …bilateral-results-list.component.ts`: 21 suites, 837 tests passed.
  - `tsc` (app): clean.
  - `eslint` on 2 files: exit 0.
- **Reviewer verdict:** PASS.
  - Every clause of `CWS-R-7` A, B and BUT holds, as does `CWS-AC-7` and the DoD (a11y).
  - The mutation trace confirms the specs exercise the behavior itself.
  - "Clear all" resetting the scope conflicts with no clause, since it is a removal like the other dimensions.
- **ADVISORY** (recorded only):
  - **RELIABILITY:** spec 3 (no key) cannot be behaviorally red before the change, because the unscoped call already passed on today's code. It is a regression guard. Correct count: 3 behavioral reds + 1 guard, not "4/4 red".
  - **RISK:** `?scope=bilateral` with no `role` or `source` turns off the W3 + Lead default, because it is a contract param. The Overview links carry `role=all&source=all` explicitly, so `CWS-R-8` holds. Confirm this in `CWS-T-6`.
  - **RISK, checked by the Leader:** the worry that `?scope=foo` might suppress the default does not apply. The T-3 parser adds `scope` to `present` only for a valid value; an unknown value goes to `stripped`.
  - **READABILITY:** the doc comment above `RESULTS_TAB_MANAGED_QUERY_PARAMS` still says "nine contract keys". Fix it at archive.
- **Implementer "Not Done / Assumptions":** "Clear all" also resets the scope (accepted by the Reviewer). `ng build` was not run. No scope is still owed.
- **Requirements covered:** `CWS-R-7` A, B, BUT; `CWS-AC-7`.

## Status after CWS-T-5 (2026-10-21)

- Code tasks T-2..T-5 are PASS, each on the first attempt.
- Budget: 4 code tasks, ~720 LOC including tests (estimate ~400), 1 review round each.
  - The LOC overrun comes from the T-4 tests and fixtures (~400 LOC against an estimate of ~170), plus specs added for T-2's controller and service, which had no coverage.
  - The task count and the review rounds stayed within budget.
  - No tripwire stop: the overrun is all test code and was found only at the end.
- **Next:** `CWS-T-6` (HITL). It needs:
  - a commit by the owner (nothing is committed yet);
  - merging to `performance-refactor`;
  - the PRTest deploy (~30 min);
  - checks on CIP and IITA, re-running `CWS-T-1` (b) the same day.
- Nothing is committed. Exclude another session's files that are in the same checkout: `notification-item.component.*`, `contribution-request-drawer.copy.ts`, `docs/specs/notifications/primary-review-not-accept/tasks.md`, and `docs/specs/bugfix/primary-request-decision-state/`.

## CWS-T-6 — Live check on PRTest — DONE (2026-10-21, Leader via Claude in Chrome, read-only)

- **Build:** `performance-refactor` @ `686445be9`. Run `reporting-tool-dev-cicd` completed/success. PRTest served the new bundle: the "Scope: Bilateral reporting (Overview)" chip renders, and Overview links carry `scope=bilateral`. Before the Jenkins deploy finished, every `/bilateral/*` route redirected to `/`; a retry after it finished worked.
- **Phase:** Reporting 2026 (`phase=36` in the client URL).
- **Method:** only navigation clicks on figure links. No write controls were used.

### IITA

The Total card shows 119 = 32 replicated W3 + 81 new W3 + 6 W1/W2 tagging. Projects covered: 9 of 87, with 78 "no new result yet" (= 87 − 9 ✓) and 1 "only replicated".

| Overview figure | Value | Results visible count |
|---|---|---|
| Total | 119 | 119 of 119 ✓ (scope chip shown) |
| Editing tile | 91 | 91 ✓ |
| Pending tile | 18 | 18 ✓ |
| Approved tile | 7 | 7 ✓ |
| Rejected tile | 3 | 3 ✓ |
| Needs attention: Editing / Rejected | 91 / 3 | equal to the tiles ✓ |
| Bar project 2134 | 21 | 21 ✓ |
| Bar project 2131 | 12 | 12 ✓ |
| Pending > 14 days | 14 | 18 (the link opens all pending results; no age filter exists, pre-existing) |
| No-project line | 3 (W3 only) | 113 (link `{project: [], source: 'w3'}` does not reconcile; accepted in `CWS-R-8`, child #2 owns it) |

- Tile identity: 91 + 18 + 7 + 3 = 119 ✓.

### CIP

The Total card shows 122 = 52 replicated W3 + 35 new W3 + 35 W1/W2 tagging. Projects covered: 10 of 57, with 47 "no new result yet" ✓ and 0 "only replicated".

| Overview figure | Value | Results visible count |
|---|---|---|
| Total | 122 | 122 of 122 ✓ (scope chip shown) |
| Editing tile | 94 | 94 ✓ |
| Pending tile | 18 | 18 ✓ |
| Bar project 1942 | 4 | 4 ✓ |
| Bar project 1939 | 2 | 2 ✓ |

- Tile identity: 94 + 18 + 0 + 0 + QA 1 + Submitted 8 + Discontinued 1 = 122 ✓.
- No-project line: 55 (52 replicated W3 + 3 new W3). No W1/W2 row in it ✓.
- Other centers' projects: 49.

### Open items

- **CIP baseline (63 / 0 / 0) not applicable.** PRTest data differs from the prod baseline of `CWS-T-1`: PRTest shows 52 / 35 / 35. Per the T-6 disqualifier, this is not evidence for the prod count. The 63 is confirmed only after release, or by running `CWS-T-1` (b) against the PRTest DB.
- **Bar sum vs Total.** The chart shows the top 7 projects only:
  - CIP: shown bars 15 + no-project 55 + other centers 49 = 119, against a Total of 122.
  - IITA: shown bars 55 + 3 + 31 = 89, against 119.
  - The full `CWS-R-6` sum (bars + no-project + unmatched = Total) was not verified in the browser. The aggregate spec asserts it.
- **Not checked:** the visual check of the Total card. A screenshot was taken.
- **Status:** closed by the owner 2026-10-21 ("cierra t-6"). Owner follow-ups: the CIP prod count after release, and the copy confirmation with Nicoleta.

### CWS-T-6 close-out (2026-10-21)

- **Owner decision:** close T-6 on the PRTest evidence above.
- `family.md`: child #3 marked executed, with a change-log row added.
- Child #2 `center-overview-no-project-line/proposal.md`:
  - §3 now has a "premise changed" note: the no-project row is W3-only, and the `allW1W2` / `source=w1w2` branch is gone.
  - Document Control now records that child #2 depends on #3 and is no longer parallel-safe with it.

## Summary

| Task | Result | Attempts |
|---|---|---|
| CWS-T-1 | done (HITL; 0 replicated W1/W2 rows on center projects) | — |
| CWS-T-2 | PASS | 1 |
| CWS-T-3 | PASS | 1 |
| CWS-T-4 | PASS | 1 |
| CWS-T-5 | PASS | 1 |
| CWS-T-6 | done (PRTest reconciliation on CIP and IITA; CIP prod count after release) | — |

- **Shipped:** `b29b749c1` (code) and `5008e86cf` (specs) on `qa-development-2026-ss`. `performance-refactor` was merged into qa-dev (`7536e0788`, bringing in P2-3272), then qa-dev into perf (`686445be9`, deployed to PRTest).
- **Budget:**
  - 6 tasks as planned.
  - 1 review round per task.
  - ~720 LOC against an estimate of ~400. Almost all of the overrun is tests: the T-4 fixtures, and T-2 controller/service specs for code that had no coverage.
- **Carry to `/akili-archive`** (advisories; none blocks):
  - align the `CWS-AC-2` wording with design §5;
  - make the unscoped SQL test stricter;
  - `FIXTURE_D1_ROWS` row 6 encodes an impossible state;
  - fix the "nine contract keys" comment;
  - trim the overview `CLAUDE.md` (123 lines, cap 120);
  - type the API option with `BilateralScope`;
  - the a11y summary copy goes into the Nicoleta confirmation (`CWS-OQ-3`);
  - add a Constitution Impact note: none (no module boundary changed);
  - CodeGraph re-index pending.
- **Owner follow-ups:**
  - confirm the CIP prod count (63 / 0 / 0) after the staging → master release;
  - Nicoleta: `CWS-OQ-1` (63 vs 54) and `CWS-OQ-3` (copy);
  - ship server and client in the same release (design §11).
