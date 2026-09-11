# Execution Log — Bilateral "Update result": enforce lead-Centre authorization

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3652-bilateral-versioning-guard-dead-branch` |
| Ticket | `P2-3652` (QA - Bug) under `P2-3229`, epic `P2-3478` |
| Depth / Mode | Lite · Bug |
| Approval Mode | `pre-approved` (Juan David Delgado, 2026-09-11) — continue/pause gate auto-passes on PASS; HALT, Pivot, budget tripwire and `FATAL_FAIL` always stop |
| Branch | `JuanGuzman-io/p2-3652-bilateral-versioning-guard`, level with `origin/performance-refactor` (0 ahead / 0 behind at start) |
| Budget (`design.md` §13) | 3 tasks · ~120 LOC · 1 review round |
| Leader model | Opus 5 (T1) |
| Implementer / Reviewer | `akili-implementer` (sonnet, T2) / `akili-reviewer` (opus, T3) — `author ≠ auditor` held by wrapper binding |
| Started | 2026-09-11 |

## 2. Pre-flight

| Check | Result |
|---|---|
| Working tree | Clean except an incidental `package-lock.json` reformat at the repo root (`devDependencies: {}` dropped by an npm run) and the untracked spec folder. Unrelated to this spec; **excluded from every diff handed to the Reviewer**, not reverted |
| Branch freshness | `git rev-list --left-right --count origin/performance-refactor...HEAD` → `0  0`. Up to date |
| Server dependencies | `onecgiar-pr-server/node_modules` was empty in this worktree. Ran `npm ci` → 1788 packages. Required before any verification could run |
| Baseline versioning suite | **7 suites / 90 tests, all green** — so `VER-T-1`'s red is attributable to `VER-T-1` |
| Migrations | This spec adds none (`design.md` §3) |

### Verification command — a pre-flight finding that was wrong, and the real hazard underneath it

**Recorded and then corrected in the same run.** At pre-flight I ran the `tasks.md` command and got
*"Option `testPathPattern` was replaced by `--testPathPatterns`"*, concluded Jest had been upgraded,
and logged that `tasks.md` §3/§6 needed correcting. The `VER-T-3` Reviewer disputed it from
`package-lock.json` (`jest@29.7.0`, where the singular flag is the valid one). The Reviewer was
right. Re-measured after `npm ci`:

| Form | Suites matched (installed Jest 29.7.0) |
|---|---|
| `--testPathPattern="versioning"` | **7** — correct, and this is what `tasks.md` prints |
| `--testPathPatterns="versioning"` | **231** — the entire server suite, silently |
| `npx jest … "versioning"` (positional regex) | **7** — correct |

**Cause of the false finding:** `onecgiar-pr-server/node_modules` was empty when I took the
measurement, so `npx` resolved `jest` from the registry instead of the project — a transient Jest 30,
whose error message I attributed to the repo. The measurement was real; the subject was not the
installed toolchain. **`tasks.md` needs no correction and none should be made at `/akili-archive`.**

**The hazard that survives the correction** is the plural spelling, which is the natural "fix" a
reader reaches for on seeing that error: Jest 29 does not recognize `--testPathPatterns`, ignores it
without warning, and runs all 231 suites — the unscoped run `tasks.md` §6 warns has taken a session
down with OOM. The positional-regex form issued to the workers is correct under both Jest majors and
is kept for that reason; the `tasks.md` form is equally correct here.

Node is 22.23.2; `docs/infrastructure.md` §6 pins the pre-check at 20.x. Unit tests run clean on 22,
so this is noted, not escalated.

## 3. Task Execution History

### `VER-T-3` — Contract test on the owner-initiative row shape

| Field | Value |
|---|---|
| Status | **PASS** on attempt 1 of 3 |
| Date | 2026-09-11 |
| Requirements covered | `VER-R-1` (defect class **D4**), `VER-AC-4` |
| Implementer attempts | 1 |
| Skills assigned | `nestjs-expert` (as `tasks.md` lists; no deviation) |
| Effort | `medium` |
| Exemplar briefed | `src/api/results/summary/repositories/results-policy-changes.repository.spec.ts` — same test, same defect class, different repository |

**Files changed.** One new file, `onecgiar-pr-server/src/api/results/results_by_inititiatives/resultByInitiatives.repository.spec.ts` (94 LOC). `resultByInitiatives.repository.ts` ends unmodified (`git diff` empty) — `requirements.md` §3 puts its SQL and DTO out of scope.

**Verification.** `npx jest --silent --reporters=summary --forceExit "resultByInitiatives"` → `Test Suites: 1 passed, 1 total` · `Tests: 9 passed, 9 total` (7 `it.each` column cases + the negative `inititiative_id` case + the parameter-binding case).

**Falsification actually run, not asserted.** The Implementer removed `ci.official_code,` from the SELECT, re-ran (`1 failed, 8 passed`, failing on *"projects official_code into the result row"* with the received SELECT list printed), restored the file via `git checkout --`, confirmed an empty diff, and re-ran to `9 passed`. This test is the **only** gate on defect class D4, so a version of it nobody had watched fail would have reproduced the blind spot the spec exists to close.

**Leader brief addition (not in `tasks.md`).** `tasks.md` asks the test to assert the query "does not advertise `inititiative_id`". The naive form of that assertion fails against *correct* code: the identifier genuinely appears in the JOIN predicate (`on ci.id = rbi.inititiative_id`). The brief narrowed the claim to *the SELECT list does not project it*, which is the true and testable version. Recorded because it disambiguates the task rather than widening it.

**Reviewer verdict — `STATUS: PASS`.** Conforms to `tasks.md` §3, `design.md` §10 and `VER-AC-4`/D4: the seven projected columns are pinned against the query string the repository issues, both halves of the *Falsifying input* clause genuinely fail the test, the SELECT-list scoping regex behaves as documented against this exact SQL, and the file carries the Disqualifier verbatim instead of overclaiming. No production code touched.

The Reviewer verified rather than accepted three things worth naming: that `\bfrom\b` cannot match inside `from_toc` (the `_` is a word character, so no boundary) and that the first standalone `FROM` is therefore the table clause; that reintroducing `inititiative_id` into the assertion map fails under *either* plausible spelling, because the near-miss neighbours `initiative_role_id` and `initiative_name` spell `initiative` with a single `ti` against the typo's `inititiative`, so no substring collision rescues it; and that the nine out-of-scope call sites `requirements.md` §3 cites are really nine (versioning, bilateral ×2, notification, ipsr ×2, clarisa-connections, contributors-partners, results-toc-results).

**`ADVISORY` (4R lenses — recorded, not gating, and not convertible into new tasks in this spec):**

- *Reliability.* Alias drift is caught only for `initiative_name`. If `ci.id` became `ci.id as init_id`, the `['id', 'ci.id']` case would still pass while every caller reading `.id` broke. Low priority — the SQL is frozen by `requirements.md` §3 — but an extension of the map should assert the **emitted** name, as the `initiative_name` row already does.
- *Resilience.* The sanity assertion `expect(sql).toContain('inititiative_id')` couples the test to the JOIN predicate's current spelling, so a future alias rename in the FROM clause would redden a test whose subject is the SELECT list. Acceptable as a guard on the trap's premise; worth knowing why it failed if it ever does.
- *Risk (process, not the diff).* The Reviewer disputed the Leader's pre-flight claim that the `tasks.md` Jest flag was stale, reading `jest@29.7.0` out of `package-lock.json`. **It was right** — see §2 above, where the finding is corrected. A Reviewer overturning the Leader's own environment measurement is the `author ≠ auditor` gate doing exactly what it is for, on the one input nobody else was auditing.

**Issues encountered.** None in the task. The Leader's false pre-flight finding is corrected in §2.

**Not Done / Assumptions (Implementer, verbatim in substance).** None outstanding. Reported: the SELECT-list scoping regex choice; the additional in-scope assertions on the `result_id = ?` binding and the `initiative_role_id = 1` / `is_active > 0` filters; no SQL or DTO modification.

---

### `VER-T-1` — Regression tests that fail on current code

| Field | Value |
|---|---|
| Status | in progress — attempt 1 **FAIL**, attempt 2 running |
| Date | 2026-09-11 |
| Requirements | `VER-R-1`, `VER-R-2`, `VER-AC-1`, `VER-AC-2`, `VER-AC-4` |
| Skills assigned | `nestjs-expert`, `tdd` (as `tasks.md` lists; no deviation) |
| Effort | attempt 1 `high` (bumped above the `medium` default: the task's value is entirely in being red *for the right reason*, which is a correctness judgment) · attempt 2 `xhigh` (per the rework rule) |

#### Attempt 1 — Reviewer `STATUS: FAIL`

**Implementer result.** Three tests added to `versioning.service.spec.ts` (+188/−1, tests only; `versioning.service.ts` untouched). Verification `npx jest … "versioning"` → `1 failed, 6 passed, 7 total` suites / `3 failed, 90 passed, 93 total`. Delta is exactly the three new tests; the 90 pre-existing passes did not move.

The three failures, verbatim, and all three are genuine defect signals rather than setup errors:

| Test | Failure |
|---|---|
| Non-lead Centre | `Received promise resolved instead of rejected / Resolved to value: {"message": "The result 8375 is in the Reporting 2026 phase with id 9001", … "statusCode": 200}` — a row was written where a 403 was due |
| Lead Centre | `expect(jest.fn()).toHaveBeenCalledWith(…) / Number of calls: 0` on `assertBilateralVersioningAllowed` |
| Admin (`role_id = 1`) | same, `Number of calls: 0` |

That is defect class **D1** stated precisely: the guard is unreachable regardless of who asks, so no identity-based behaviour is observable at all.

**Leader's steer into the review.** `VER-T-1`'s own Done clause asks only that the tests be red for the right reason, which they were. But `VER-T-2`'s Disqualifier then requires these same three tests to go **green with no assertion edited**. Tests 2 and 3 armed an ordered `mockResolvedValueOnce` chain shaped for the *legacy* path, which `versionProcessV2` would not consume in the same order once the delegation lands. The Reviewer was asked to trace mock-consumption order and told that an un-greenable test is a `VER-T-1` FAIL, not a problem to hand forward to `VER-T-2`.

**Reviewer finding.** Confirmed, and found two further blockers the Leader had not seen. Post-fix, all three tests die *before* the guard for three independent reasons:

| # | Blocker | Evidence |
|---|---|---|
| **(a)** | `ClarisaInitiativesRepository.findOne` left at the module-level default `{ portfolio_id: 1 }` (`spec:174-178`) while `PORTFOLIO_CGIAR_PROGRAMS_P25_ID = 3` (`versioning.service.ts:78`) → `versionProcessV2:898` throws 403 *"Replication is only allowed for entities with portfolio_id = 3"*. The sibling `bilateral gate (P2-3229)` tests arm `{ id: 51, portfolio_id: 3, active: true }` at `spec:347-351` for exactly this reason; the new block omitted it |
| **(b)** | The out-of-order mock: `armLegacyPathSuccess`'s `resultRepository.findOne.mockResolvedValueOnce(null)` (`spec:468`) is consumed by `$_genericValidation` today, but one call *earlier* post-fix — by `versionProcessV2:906` — throwing 404 *"Result not found"*. `mockResolvedValueOnce` queues are global and order-sensitive, so the delegation silently shifts them |
| **(c)** | `bilateralCarryForwardResult()` omits `obj_result_by_initiatives`, which `versionProcessV2:932` requires → 403 *"No main initiative (role 1) found"*. The pre-existing sibling fixture at `spec:314-316` carries it |

**Violated rule.** `tasks.md` §3 `VER-T-1` Scope items 2-3 and `VER-T-2`'s Disqualifier; `design.md` §10 rows *"the guard runs"* and *"Lead Centre and admin → pass"*. A test that post-fix fails on portfolio / not-found / no-main-initiative proves none of those — and the "carry-forward proceeds" half of tests 2 and 3 was unreachable by construction.

**Verified clean in the same pass** (recorded so attempt 2 does not re-litigate): `assertBilateralVersioningAllowed` (`:884-890`) really throws `FORBIDDEN` with `response: result.id` and a message `Only users of centre ${leadCenterCode}, which leads result ${resultCode}…`, so `stringContaining('CENTER-02')` genuinely pins `VER-R-2`'s *"names the lead Centre"* and cannot be satisfied by the result code; `ReturnResponseUtil.format` (`shared/utils/response.util.ts:15-19`) passes the asymmetric matcher through intact with no extra field to break `toEqual`; the `:109` module mock is untouched; the KP test at `:288-299` and every other existing assertion are unmodified; `versioning.service.ts` is unchanged; all three tests assert `result.source` in the body and `SourceEnum.Bilateral === 'API'`, so a fixture mutated to `'Result'` fails there; and every `armBilateralRules` stub maps to a real method on `BilateralVersioningRulesService` — no D4 fiction.

**`ADVISORY` (recorded, non-gating, not convertible into new tasks in this spec).** *Readability:* `armLegacyPathSuccess` becomes a misnomer the moment `VER-T-2` lands, and the three tests repeat ~15 lines of identical arrangement — folding it into one helper would have made this repair a single-site edit instead of a three-site one. *Reliability:* post-repair, `$_genericValidation`'s `null` comes from an explicit branch rather than from an exhausted `mockResolvedValueOnce` queue falling back to `undefined`, removing a fragility that currently works by accident.

**Adjudication.** In scope and gating — this is spec conformance against `tasks.md` §3 and `design.md` §10, not a lens finding. Rework attempt 2 dispatched with the report verbatim, effort bumped `high` → `xhigh`, and an explicit instruction not to repeat two dead ends: no assertion may be edited, and the blanket `mockResolvedValue(result)` is forbidden because the Reviewer traced that it flips test 1's red reason from *"a row is written"* to a CONFLICT, which would break `VER-T-1`'s own Disqualifier.

#### Attempt 2 — Reviewer `STATUS: PASS`

**Implementer result.** All four remediation steps applied, plus both readability advisories. `git diff` over the whole file removes exactly **one** line — the widened `SourceEnum` import — so the change is otherwise purely additive and no assertion anywhere in the file was touched.

| Repair | Change |
|---|---|
| (b) order-sensitivity | New `armResultLookup(row)` replaces the ordered queue with one `mockImplementation` discriminating on `opts?.where?.id !== undefined` → row, else `null`. The mock is now correct regardless of which caller runs first |
| (a) portfolio gate | New `armEligibleEntity()` arms `ClarisaInitiativesRepository.findOne` with `{ id: 51, portfolio_id: 3, active: true }` via `mockResolvedValue` (not `…Once` — `versionProcessV2` calls it at both `:894` and `:945`) |
| (c) main initiative | `bilateralCarryForwardResult()` now carries `obj_result_by_initiatives: [{ initiative_id: 51, initiative_role_id: 1, is_active: true }]`, matching the sibling fixture at `:314-316` |
| advisory | `armLegacyPathSuccess` renamed `armCarryForwardSuccess` (it now arms V2's success path too) and no longer touches `resultRepository.findOne` |

**Verification.** `npx jest --silent --reporters=summary --forceExit "versioning"` → `Test Suites: 1 failed, 6 passed, 7 total` · `Tests: 3 failed, 90 passed, 93 total`. ESLint on the file clean; `tsc --noEmit` reports no error in it. The three failure messages are **verbatim unchanged** from attempt 1 — no substituted red.

**Reviewer verdict — `STATUS: PASS`.** The remediation holds end to end, verified against the code rather than against the Implementer's trace.

*(A) The discriminating mock reads every real call site correctly.* There are exactly three `_resultRepository.findOne` sites on this path and no fourth: `versionProcess:731` `{where:{id,is_active}}` → row · `versionProcessV2:906` `{where:{id,is_active}, relations:{…}}` → row · `$_genericValidation:244` `{where:{version_id,result_code,is_active}}` → `null`. So the failure mode the Leader raised — a repair wrong in a way the red run cannot reveal — is not present. Two trace steps were re-derived rather than accepted: `isP25SelfEntity` really is true (`portfolio_id === 3` **and** `initiative_id 51 === entity_id 51`), so the `initiative_entity_map` lookup is skipped and needs no mock; and the post-fix tail takes the *same* `$_phaseChangeReporting` branch as the already-green legacy test at `:734` (`isV2CrossPortfolio` false, `result_type_id: 5` → the same `case 5` replicate), so the V2 path needs no mocks the suite has not already proven sufficient.

*(B) The Leader's cross-test-pollution risk was raised and falsified.* `armEligibleEntity()` and `armGuardRoles()` reassign methods on the shared DI instance and `armResultLookup` sets a non-`Once` implementation, which would leak into every later test if the module were built once. It is not: `beforeEach` (`:93-275`) calls `Test.createTestingModule(...).compile()` per test and the provider `useValue` literals are re-evaluated inside that callback, so every test gets fresh `jest.fn()`s. Beyond the structural argument the Reviewer found an **empirical probe already in the suite**: the pre-existing test at `:734` depends on the module-level `{ portfolio_id: 1 }` default surviving — a leaked `{ portfolio_id: 3 }` would flip it into the *"must use phase change with entityId (V2)"* CONFLICT — and it sits after this block and passes. The 90/90 is isolation, not declaration-order luck.

*(C) Gate.* Disqualifier met: all three still red for their **original** reasons, and test 1's resolved value carries `armCarryForwardSuccess`'s replicate id, which is positive proof `replicate` was reached — *"a row is written instead of a 403"*, exactly as `tasks.md` §3 words it. `armEligibleEntity` cannot mask the red: on current code `ownerInitiative?.inititiative_id` is `undefined` on the real row, so `versionProcessV2` is never entered and that arm is inert. `VER-AC-5`/D2 intact — the `:109` module mock, the KP test at `:288-299`, the `bilateral gate (P2-3229)` block and everything from `:655` on are byte-identical. `versioning.service.ts` unchanged; the dead branch is still at `:760`.

**`ADVISORY` (recorded, non-gating, not convertible into new tasks in this spec):**

- *Reliability.* The block's isolation rests on `beforeEach` rebuilding the module — implicit rather than asserted. Hoisting that `createTestingModule` into a `beforeAll` for speed would turn `armEligibleEntity` and `armResultLookup` into cross-test state with no guard. A comment on `armEligibleEntity` noting the dependency, or `afterEach(() => jest.restoreAllMocks())`, would make the assumption explicit.
- *Risk — carried forward into `VER-T-2`'s brief and its review, not left here.* These three tests would **also** go green under proposal Option A (`?.inititiative_id` → `?.id`), which `design.md` `VER-DD-1` explicitly rejects for waking V1's *"P25 must use V2"* conflict on W1/W2. That is not a defect in `VER-T-1` — a regression test need not discriminate between two fixes that both restore the behaviour — but it means **the suite alone does not enforce `VER-DD-1`'s choice of approach**. `VER-T-2`'s Reviewer must verify the predicate branches on `result.source`, not on the owner-initiative row.

**Decisions made.** Effort was set above the `medium` default at attempt 1 (`high`) because the task's entire value is being red *for the right reason*, then bumped to `xhigh` for the rework per the effort-dial rule. The Leader's steer into the attempt-1 review — "an un-greenable test is a `VER-T-1` FAIL, not a problem to hand forward" — is what kept the defect from surfacing inside `VER-T-2`, where the Implementer would have met three un-greenable tests and a Disqualifier forbidding assertion edits.

**Issues encountered.** One rework round against a budget of 1 review round (`design.md` §13). Within budget: the budget counts review rounds for the spec, and `VER-T-3` passed first time. No tripwire.

**Not Done / Assumptions (Implementer).** None.

---

### `VER-T-2` — Route genuine bilaterals to `versionProcessV2`

| Field | Value |
|---|---|
| Status | **PASS** on attempt 1 of 3 |
| Date | 2026-09-11 |
| Requirements covered | `VER-R-1`, `VER-R-2`, `VER-R-3`, `VER-R-4`; `VER-AC-5`, `VER-AC-6`; defect classes **D2**, **D5** |
| Skills assigned | `nestjs-expert` (as `tasks.md` lists; no deviation) |
| Effort | `xhigh` — security-critical. Not `max`: the effort dial forbids maxing a cheaper tier, so the T2 Implementer runs at `xhigh` rather than escalating |

**Files changed.** `versioning.service.ts` (**pure addition — zero removed lines**): a private `$_isGenuineBilateralCarryForward` predicate plus the delegation inside `versionProcess`. `versioning.service.spec.ts`: the AVISA test for `VER-R-4`/`VER-AC-6`.

```ts
private async $_isGenuineBilateralCarryForward(result: Result): Promise<boolean> {
  if (result.source !== SourceEnum.Bilateral) return false;
  const ownerInitiative =
    await this._resultByInitiativesRepository.getOwnerInitiativeByResult(result.id);
  return ownerInitiative?.official_code !== 'SGP-02';
}
```

The lookup short-circuits on the first condition, so the W1/W2 path gains no query (`design.md` §5).

**Verification.** `"versioning|bilateral"` → `30 suites / 502 tests passed`. `"versioning"` alone → `7 suites / 94 tests` (90 pre-existing + `VER-T-1`'s 3, now green + 1 AVISA). `tsc --noEmit` clean. ESLint clean on both touched files. **Falsification actually run:** the predicate was forced to `return true` (dropping the `SGP-02` condition) → the AVISA test failed; file restored; suites green again.

**Reviewer verdict — `STATUS: PASS`.** Five priority questions, all resolved against the working tree:

- **(A) The predicate does not repeat the defect it fixes.** This was the `FATAL_FAIL` candidate: a routing decision keyed on a property production does not populate is exactly the original bug. `source` is a plain mapped column (`result.entity.ts:505-513`) — no `select: false`, no lazy, no getter — and `versionProcess`'s `findOne` passes only `where`, so TypeORM hydrates it. The Reviewer went past entity metadata to **field evidence**: two live production paths already depend on this same property being populated from the database — the pre-existing V1 branch at `versioning.service.ts:809` and `assertIsBilateral` in `bilateral-versioning-rules.service.ts:113-119`, which gates the shipped P2-3228 API carry-forward. A NULL `source` fails the predicate and falls through to the legacy path — the safe direction.
- **(B) It is `VER-DD-1`'s fix, not the rejected Option A.** The suite alone cannot distinguish the two (carried forward from `VER-T-1`'s review), so this was the Reviewer's call to make. The predicate branches on `result.source`, and the dead block is verbatim intact at `:796` — still `?.inititiative_id`, not repaired to `?.id`, not removed, with its inner P25 conflict and nested bilateral branch untouched. `VER-OQ-1` stays open exactly as `tasks.md` §3 item 3 requires.
- **(C) Placement correct in both directions.** After the `!legacy_result` NOT_FOUND guard (so no null reaches the predicate) and before the `result_type_id == 6` check (`VER-DD-3`). The KP fixture at `spec:288-300` has no `source`, so the predicate returns `false` **before any repository call** and it falls through untouched.
- **(D) The `undefined` owner-initiative case — the Leader's open question — is intended, and covered.** No role-1 row → `undefined !== 'SGP-02'` → routed to the bilateral path, where `resolveTargetEntityId` (`bilateral-versioning-rules.service.ts:163-167`) throws *"Result X has no primary Science Program (role 1)…"*. That is verbatim what `requirements.md` §10 assumption `A1` declares correct. It is also **not** an AVISA leak: `undefined` means no active role-1 row exists, whereas AVISA results are stamped `source = 'API'` by `createOwnerResultV2` *from* their SGP-02 role-1 initiative, so that row exists by construction. Left untested deliberately — `A1`'s refusal belongs to the rules service, where `resolveTargetEntityId`'s throw is already covered.
- **(E) Disqualifier / D2 satisfied.** Every pre-existing expectation intact and un-massaged: the KP message at `:288-300`, the P25-must-use-V2 conflict at `:693-719`, "No active phases", "already in the phase" — and, most telling, the module-level `{ inititiative_id: 100 }` fiction at `:109-111` is still there. All those fixtures either omit `source` or use `new Result()` (field initializer `SourceEnum.Result`), so every one is predicate-false and **structurally unreachable** by the new branch. Counts reconcile exactly: 90 + 3 + 1 = 94.

**Beyond the brief.** The Reviewer checked the strongest hidden-regression candidate on its own initiative: the new delegation reaches `versionProcessV2`'s `portfolio_id = 3` gate *without* the portfolio pre-check the dead block wrapped around its own delegation. Not a new risk — `bilateral-versioning.service.ts:73-83` (the live P2-3228 API path) performs the identical `resolveTargetEntityId` → `versionProcessV2` pair and clears that same gate in production, which is precisely the both-entry-points symmetry P2-3229 AC9 asks for. `resolveTargetEntityId` is a read-only `findOne`, so **no row is written before `assertBilateralVersioningAllowed` runs** — `VER-R-1` holds.

**On the repo-wide ESLint errors.** 30 errors exist, all in `bilateral-center.controller.spec.ts` / `bilateral-center.service.spec.ts` / `bilateral-center.service.ts` — none in the diff. The Reviewer (read-only, cannot run ESLint) established non-attribution structurally instead: the change adds one private method and one branch, alters no exported signature, and `bilateral-center.service.ts` only imports and injects `VersioningService` without ever calling `versionProcess`/`versionProcessV2` — so no type flows from the changed code into those files. Pre-existing, out of scope.

**`ADVISORY` (recorded, non-gating, not convertible into new tasks in this spec):**

- *Reliability.* On the AVISA path `getOwnerInitiativeByResult` is now issued twice — once in the predicate, once at the dead block below. One redundant read-only SELECT on a rare interactive action; `design.md` §8 budgeted one extra SELECT, so this is within intent. Worth revisiting only if AVISA volume grows.
- *Reliability.* The reporting-tool path calls `resolveTargetEntityId` *before* eligibility, whereas the API path resolves eligibility first. A bilateral that is both non-approved **and** missing its role-1 initiative therefore surfaces the "no primary Science Program" message rather than the approval one. Both are correct refusals and `design.md` §2.2 prescribes this ordering — recorded so a tester expecting the approval message is not surprised.

**Issues encountered.** None.

**Not Done / Assumptions (Implementer).** None.

---

## 4. Final verification (Leader, tree quiet — no delegated agent active)

| Check | Command | Result |
|---|---|---|
| Scoped suites | `npx jest --silent --reporters=summary --forceExit "versioning\|bilateral"` | **30 suites / 502 tests passed** |
| Types | `npx tsc --noEmit` | clean |
| Lint (touched files) | `npx eslint src/api/versioning/versioning.service.ts src/api/versioning/versioning.service.spec.ts --quiet` | clean |
| Branch | `git branch --show-current` | `JuanGuzman-io/p2-3652-bilateral-versioning-guard` — re-confirmed immediately before committing |
| Migrations | `npm run migration:check` | **not runnable here — deferral probed, see below** |

**Migration check — assumption tested, not assumed** (per `.agents/leader.md` → *Deferring a check*):

1. *Assumption:* "this cannot run because it needs a live database." `npm run migration:check` failed with `ECONNREFUSED`.
2. *Probe:* two cheap static checks. `git status --porcelain | grep -i migration` → **no migration file added or modified anywhere in this spec's diff**; and there is **no `.env` in this worktree**, so no connection is configurable here in the first place.
3. *Result:* the deferral is probe-confirmed, and the check's purpose is satisfied statically. `migration:check` exists to catch pending migrations; this spec provably adds zero, which is exactly what `design.md` §3 asserts ("None. No entity, no column, no migration"). Recorded as **verified by construction**, not as blocked.

## 5. Summary — all tasks complete

| Task | Status | Attempts | Reviewer |
|---|---|---|---|
| `VER-T-1` — regression tests red on current code | ✅ complete | 2 of 3 | FAIL → PASS |
| `VER-T-2` — route genuine bilaterals to `versionProcessV2` | ✅ complete | 1 of 3 | PASS |
| `VER-T-3` — contract test on the owner-initiative row shape | ✅ complete | 1 of 3 | PASS |

**Budget (`design.md` §13).** 3 tasks / ~120 LOC / 1 review round expected. Actual: 3 tasks, **400 LOC** (36 production, 364 tests — measured from the commit stat, not estimated), 1 rework round. **No tripwire fired** — the task and review-round counts hold. The LOC overrun is entirely test arrangement: `VER-T-1` needed helpers that stay correct under both the pre- and post-fix call orders, which is the repair that took the rework round. `design.md` §13 already anticipated the shape of this ("the test count is what carries the LOC, and that is deliberate — the defect shipped because the tests asserted a fiction"); it under-estimated the magnitude, not the distribution.

**What the review gate actually caught.** Recorded because both findings were invisible to a green test run:

1. **`VER-T-1` attempt 1 — tests that were red for the right reason but un-greenable.** They would have died inside `versionProcessV2` for three unrelated reasons (`portfolio_id` default, an order-sensitive mock shifted by the delegation, a missing `obj_result_by_initiatives`). `VER-T-1`'s own bar — *red for the right reason* — was met, so a self-certifying run passes it. The damage would have surfaced one task later, where `VER-T-2`'s Implementer faces three un-greenable tests and a Disqualifier forbidding assertion edits: a HALT on a task that was never broken.
2. **`VER-T-2` — the suite cannot distinguish the mandated fix from the rejected one.** `VER-T-1`'s three tests go green under `VER-DD-1`'s approach *and* under proposal Option A (`?.inititiative_id` → `?.id`), which the design rejects for waking V1's P25 conflict on W1/W2. Carried forward from `VER-T-1`'s review into `VER-T-2`'s brief and its review as an explicit instruction; the Reviewer was the only gate on it.

**Leader correction.** A pre-flight finding (that `tasks.md`'s Jest flag was stale) was **wrong** and was overturned by the `VER-T-3` Reviewer from `package-lock.json`. Corrected in §2. Cause: the measurement ran while `node_modules` was empty, so `npx` resolved a transient Jest 30 from the registry. `tasks.md` needs no edit at `/akili-archive`.

**Constitution Impact.** None. No module created, no boundary moved, no public surface changed — one private method and one branch inside an existing service. No child guide is due and no parent `## Module Guides` index needs updating. A CodeGraph re-index is pending for the two changed files (routine, handled at `/akili-archive`).

**Not shipped, by design — carry into the follow-up tickets:**

| ID | Item | Route |
|---|---|---|
| `VER-OQ-1` | The dead `?.inititiative_id` still disables V1's "P25 must use V2" conflict for W1/W2 — verified still intact at `versioning.service.ts:796` | New ticket |
| `VER-OQ-2` | Count rows already created without authorization (result 8375 among them) **before** this ships — cheaper now than after | Operational — Ángel / Cris |
| `VER-OQ-3` | The modal's `isBilateral` getter lacks the AVISA carve-out the list has | New ticket |
| — | P2-3229 returns to UAT only once `bugfix/p2-3653-*` also lands | Sequencing |

**Behaviour change QA must be told about** (`design.md` `VER-DD-3`, *Reversion challenge*): a bilateral Knowledge Product now returns the rules service's message ("…report the new knowledge product with its own CGSpace handle instead") instead of the legacy *"…not possible to phase shift it contact support"*. Intended and reasoned through at design time. QA quoted the old string in P2-3653, so the tester will see a different message than their ticket records.
