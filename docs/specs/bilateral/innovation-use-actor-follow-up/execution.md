# Execution — Bilateral Innovation Use: `count_unit` / `use_nature` on actors

## Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/innovation-use-actor-follow-up` |
| Ticket | P2-4106 |
| Branch | `JuanGuzman-io/p2-4106-bilateral-innovation-use-follow-up` (from `origin/performance-refactor` `72b8a2f8a`; upstream unset so a bare push cannot reach `performance-refactor`) |
| Approval Mode | gated |
| Leader | Claude Code session, `opus` (T1) |
| Implementer / Reviewer | `akili-implementer` (`sonnet`, T2) / `akili-reviewer` (`opus`, T3) — Step 8E wrappers |
| Persona drift | `akili doctor --agents`: no blocking drift (2026-11-11) |
| Budget | 6 code tasks · ~380 LOC · ~8 review rounds (tripwire ~500 LOC / 11 rounds) |
| Started | 2026-11-11 |

**Serialisation:** T-1 and T-2 touch different files, but the project block in `.agents/leader.md` says bilateral payload tasks are serialised. They run one after the other.

## Task Execution History

### BIF-T-1 — Pure rules function and applicability predicates — PASS

- **Date:** 2026-11-11
- **Attempts:** 1
- **Attempt 1:**
  - **Files changed:**
    - `onecgiar-pr-server/src/api/results/result-actors/farmer-follow-up.constant.ts` (+20, exports only)
    - `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts` (new, 158)
    - `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.spec.ts` (new, 281)
  - **Implementer verification:**
    - Red: `npx jest src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.spec.ts` gave `TS2307: Cannot find module './innovation-use-actor-follow-up.rules'`.
    - Green: the same command passed 25/25.
    - Consumers: `innovation-use.service.farmer*` + `src/api/qa-catalog` passed (53 suites / 1257 tests).
    - eslint and `tsc --noEmit` clean.
  - **Evidence re-run (Leader inline, non-author): VERIFIED.** Rules spec 25/25, `tsc` clean, eslint clean, matching the report.
  - **Reviewer (`akili-reviewer`, opus): PASS.**
    - Steps 1–9 run in the §5 order, the §4.4 messages match verbatim, and the §4.2 shape and codes match.
    - The constants file only gains exports.
    - The AC-9 seam test is shown to work.
  - **Runtime events:** none
- **Spawns:**
  - Implementer: 19 calls, 148,237 tokens, ended complete (Not Done / Assumptions: assumptions only, no owed items).
  - Reviewer: 9 calls, 58,681 tokens, ended complete.
- **Not Done / Assumptions (Implementer, verbatim summary):**
  - Step 8 nulls `women`, `men`, `women_youth`, `men_youth` and the `has_*` flags (it was not run against the writer).
  - `is_active === false` rows pass through and are skipped by the duplicate check.
  - A null `actorTypeId` counts as "not asked".
  - The warning `message` texts were written by the Implementer.
  - Three identical Farmers rows produce warnings on indices 1 and 2.
  - The Reviewer judged none of these to conflict with the spec.
- **ADVISORY (4R, not gating):**
  - Step 9 uses `Number(actorTypeId) === FARMERS_ACTOR_TYPE_ID` rather than a predicate. It is correct, because the duplicate check follows the writer's match key, but a comment would help.
  - Step 9 runs inside the loop. The result is the same; a comment would help.
  - A non-string invalid value renders as `"[object Object]"`.
  - The `has_*`-to-null output is the same as the writer's stored row, but this has not been tested.
- **Forward pointer → BIF-T-3 / BIF-T-4:**
  - Check the stored or forwarded row for the BIF-R-3 scenario (Farmers households 500, and a 200/300/250 breakdown sent): no youth 400 fires, and the breakdown and `has_*` flags arrive null at the writer.
- **Requirements covered:** BIF-R-2, R-3 (rule part), R-4, R-6, R-7, R-9, R-11 · BIF-AC-2, AC-3 (rule), AC-4, AC-6, AC-7, AC-9, AC-10.
- **Decisions:**
  - Skills: `nestjs-expert` + `tdd`, as the task lists.
  - Effort: medium.
- **Issues:**
  - The worktree had no `onecgiar-pr-server/node_modules`. The Implementer symlinked it to the `ladyfish` worktree's copy (same `package.json`, gitignored).
- **Running totals:** 1/6 tasks · ~459 LOC (≈178 prod, ≈281 test) · 1 review round. The test file is above the per-task estimate, but the total stays inside the ~500 tripwire, which counts all tasks; watch T-3/T-4.

#### Budget decision (2026-11-11, after BIF-T-1)

- **Tripwire raised.** Juan David answered "Adelante" at the continue gate, which offered raising the tripwire as option 1 and recommended it.
- **New tripwire:** ~1000 LOC total, tests included, and 11 review rounds.
- **Separate production-code alert:** the Leader stops if production code passes ~250 LOC.
- **Cause:** test volume. The rules spec alone is 281 lines. Production code is on estimate.

### BIF-T-2 — DTO keeps both fields through the whitelist — PASS

- **Date:** 2026-11-11
- **Attempts:** 1
- **Attempt 1:**
  - **Files changed:**
    - `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts` (+26)
    - `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral-actor-follow-up.dto.spec.ts` (new, 87)
  - **Implementer verification:**
    - **Disqualifier checked:** `bilateral.controller.ts:52-58` uses `whitelist: true, forbidNonWhitelisted: false, transform: true`, and there is no global pipe.
    - **Red** (spec written first, DTO unchanged): both tests failed with `Received: undefined`.
    - **Green:** `npx jest src/api/bilateral/dto` passed 4 suites and 32 tests. eslint and `tsc` are clean.
  - **Evidence re-run (Leader inline): VERIFIED.** Same counts, and `tsc` and eslint are clean.
  - **Reviewer (opus): PASS.** The change matches BIF-DD-2, P-1 is fixed, both falsifiers are covered, and the disqualifier was checked at the source.
  - **Runtime events:** none
- **Spawns:**
  - Implementer: 14 calls, 104,491 tokens, ended complete. Its Not Done section holds assumptions only.
  - Reviewer: 8 calls, 44,904 tokens, ended complete.
- **Implementer assumptions:**
  - The fixture uses the minimum header fields.
  - The constants are imported from the results module.
  - The Swagger text describes warning and 400 behaviour that arrives in T-3/T-4.
- **ADVISORY (not gating):**
  - A non-string value such as `count_unit: 1` gets class-validator's generic "must be a string" 400. **Forward pointer → BIF-T-5:** document that a wrong type and an unknown code give different 400 messages.
  - The Swagger text describes behaviour that is not yet live until T-3/T-4. They ship in the same release.
  - Routes `bilateral.controller.ts:81` and `:225` use the same pipe options. **Forward pointer → BIF-T-3/T-4:** confirm only `/create` acts on the fields.
  - The fixture is duplicated with the result-code spec.
- **Requirements covered:** BIF-R-1 (input), BIF-AC-1 (input), P-1.
- **Decisions:**
  - Skills: `nestjs-expert` and `api-design-principles`. The task lists no `tdd`, but red was still written first.
  - Effort: low-medium.
- **Running totals:** 2/6 tasks · ~572 LOC (≈204 prod, ≈368 test) · 2 review rounds. This is within the raised tripwire. Production code stands at ~204 against the ~250 alert, and T-3/T-4 still add production code. That alert will likely fire during T-4; see the note at the gate.

### BIF-T-3 — Handler: preflight hook and `prepareActors` normalisation — PASS

- **Date:** 2026-11-11
- **Attempts:** 1
- **Attempt 1:**
  - **Files changed:**
    - `onecgiar-pr-server/src/api/bilateral/handlers/bilateral-result-type-handler.interface.ts` (+21)
    - `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use.handler.ts` (+74/−18 net ≈ +56)
    - `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use.handler.spec.ts` (+150)
  - **Implementer verification:**
    - Red: a stub hook returning `[]` failed 6 assertions: households/individuals rows received `count_unit: null`, the invalid-name case resolved instead of rejecting, and the warnings array was empty.
    - Green: handlers 7 suites / 129 tests; `bilateral.service.spec.ts` + `services/` 15 suites / 1023 tests.
    - eslint and `tsc` clean.
  - **Evidence re-run (Leader inline): VERIFIED.** Handlers 7/7 suites, 129/129 tests; `tsc` and eslint clean.
  - **Reviewer (opus, full): PASS.**
    - Every falsifier is covered.
    - The positional mapping between type ids and normalised actors is safe.
    - The disqualifier did not fire: the return shape of `resolveAndValidate` is unchanged and the writer is untouched.
  - **Runtime events:** none
- **Spawns:**
  - Implementer: 15 calls, 112,048 tokens, ended complete.
  - Reviewer: 7 calls, 97,256 tokens, ended complete.
- **For the PR, the old forced-null assertion:**
  - Test: `forces count_unit and use_nature to null and leaves other fields as sent (IFC-R-10)`.
  - It expected `[{ actor_type_id: 1, count_unit: null, use_nature: null, sex_and_age_disaggregation: true, how_many: 5 }]`.
  - Now: `keeps count_unit and use_nature on a Farmers row and applies the households rule`.
- **Forward pointer from T-2, resolved:**
  - `bilateral.controller.ts:81` (`version`, `VersionResultDto`) and `:225` (`listAll`, query) do not reach the IU handler.
  - Only `create` (`runResultTypeHandlers`) and resubmission reach it.
- **Implementer assumptions and Reviewer rulings:**
  - **400 order:** all types are resolved first, then the rules run, then the youth check runs per actor. A type or follow-up 400 now wins over a youth 400 on an earlier actor. Accepted: design BIF-DD-1/§11 already places type and rules in the preflight, before youth, and the messages are unchanged.
  - **`is_active === false` rows** pass through the rules and still go through type resolution and the youth check. Accepted.
- **ADVISORY (not gating):**
  - **Risk:** an inactive Farmers row sent with codes and without `result_actors_id` now matches the writer by its code pair (P-6), not by (NULL, NULL). Old payloads cannot trigger this, because the DTO stripped the codes before T-2.
  - The `BilateralActorWarning` import source is inconsistent.
  - The handler comment "warnings already returned by collectOutcomeWarnings" is true only once T-4 is wired. Confirm it at T-4.
  - The type-3-to-null test only discriminates together with the Farmers test.
  - The extra `actor_type` lookup per name is accepted by §8.
- **Forward pointers:**
  - **→ BIF-T-4:**
    - Confirm the hook output reaches the warnings on both the create and the resubmission branches.
    - Cover two Farmers rows with different pairs reaching the writer as two rows (BIF-R-5) in the writer spec.
  - **→ BIF-T-5:**
    - Document that type and follow-up 400s are reported before youth 400s across the payload.
    - Document that an inactive Farmers row with codes is matched by its pair.
    - Document that a wrong type gets the generic "must be a string" 400 (from T-2).
- **Requirements covered:** BIF-R-1, R-3, R-5 (handler part), R-6, R-7 · BIF-AC-1, AC-3, AC-5 (handler), AC-7 · BIF-DD-1 (handler half), DD-3.
- **Decisions:**
  - Skills: `nestjs-expert` + `tdd`.
  - Effort: medium-high.
- **Running totals:** 3/6 tasks · ~781 LOC (≈261 prod, ≈520 test) · 3 review rounds.
  - **Production-code alert (~250) fired.** Production code is at ~261 against the ~130 design estimate.
  - **Cause:** the rules function is 158 lines (estimate ~60) because it is fully typed and carries a doc-comment per step. The handler adds +56.
  - Total LOC (781) is within the raised ~1000 tripwire, but T-4 (service + tests) will likely cross it.
  - **Stop for the user** at the continue gate.

#### Budget decision (2026-11-11, after BIF-T-3)

- Juan David answered "Continue" at the gate. That takes option 1, the one offered first:
  - The tripwire is raised to ~1300 LOC total and ~320 production LOC.
  - Review rounds stay at 11.

### BIF-T-4 — Service: call the hook before any write, merge warnings, read mapper — PASS

- **Date:** 2026-11-11
- **Attempts:** 1
- **Attempt 1:**
  - **Files changed:**
    - `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (+61/−16)
    - `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` (+275)
    - `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.farmer-count-nature.spec.ts` (+125)
  - **Implementer verification — red** (`-t "actor"`): 8 failed on assertions.
    - The hook was never called before the transaction.
    - The promise resolved instead of rejecting.
    - Expected length 3, received 1.
    - The `updated` call order was `undefined`.
    - The log was missing.
    - The mapper keys were missing.
    - Expected exceptions: 2 guard tests passed vacuously, and the writer proof was green from the start because it documents existing behaviour.
  - **Implementer verification — green:**
    - `src/api/bilateral`: 47 suites, 1618 tests.
    - Innovation-use writer: 7 suites, 60 tests.
    - `src/api/results/result.spec.ts`: 159 tests.
    - eslint and `tsc` clean.
  - **Evidence re-run (Leader inline): VERIFIED.** `bilateral.service.spec.ts` plus the innovation-use writer specs: 8 suites, 336 tests. `tsc` and eslint clean.
  - **Reviewers (`lenses` mode, 2 in parallel, opus): both PASS.**
    - **Lens 1 (conformance + reliability/resilience):**
      - The hook runs at `:415-418`. That is before the `updated` branch (`:424`), `runResultTypePreflight` (`:482`) and `dataSource.transaction` (`:514`).
      - Both outcome builders use the merged array.
      - The ordering test cannot pass vacuously, because it compares `invocationCallOrder` and that is `undefined` when the call is missing.
    - **Lens 2 (conformance + risk/readability):**
      - The shapes and order match §4.2/§4.3 and BIF-DD-5.
      - The log carries counts only, and there is a test for it.
      - The writer proof uses the real `where` built by `saveAnticipatedInnoUser`. It turns red if the codes are dropped from the Farmers key.
  - **Runtime events:** none
- **Spawns:**
  - Implementer: 30 calls, 182,125 tokens, ended complete.
  - Reviewer lens 1: 11 calls, 100,767 tokens, ended complete.
  - Reviewer lens 2: 10 calls, 106,184 tokens, ended complete.
- **Decisions and deviations (adjudicated by the Reviewers):**
  - **Removed one `it.each` row in `bilateral.service.spec.ts`:** "innovation use: invalid payload -> same message, raised after the header…". It was replaced by a dedicated test that asserts the same message with no transaction, no header and no writer call. This is sanctioned by design §11 / BIF-DD-1 ("a fix, not a reversion"). The policy, capacity-sharing and innovation-development rows are untouched.
  - **Log text deviation from design §9:** the shipped line is `create: result_type <id> has <n> actor warning(s) (<code>=<count>, …).` A result code does not exist before the header write on a fresh create. The line keeps counts by code only (AC-9). Both lenses accepted it. T-5 documents the actual form.
  - The writer proof lives in `innovation-use.service.farmer-count-nature.spec.ts` as `tasks.md` names it. Design §10 says `innovation-use.service.spec.ts`; align it at archive.
- **Forward pointers resolved:**
  - The handler comment is now true on both branches.
  - BIF-R-5 is proven: different pairs give two inserts.
  - The households row is stored with `how_many` as the single total. This is `[advisory-grade]` and was included.
- **ADVISORY (not gating):**
  - `collectHandlerOutcomeWarnings` has no `?? []` guard. A hook that resolves `undefined` would 500 before any write.
  - In a multi-result batch, a hook 400 on result N leaves results 1..N-1 committed. This predates the change; note it in the T-5 contract.
  - The log fires before the MDS preflight.
  - The mapper comment at `:2965` says "only Farmers stored (writer's whitelist)". Per P-7 the handler, not the writer, drops the codes.
  - The in-memory matcher treats every `FindOperator` as `IsNull`.
  - The households writer test builds the row by hand.
- **Forward pointers → BIF-T-5:**
  - The actual log form.
  - The multi-result batch partial-commit note.
  - The earlier T-2/T-3 pointers (400 ordering, inactive-row matching, generic "must be a string" 400).
- **Requirements covered:** BIF-R-5, R-6, R-8 (GET), R-11 · BIF-AC-5, AC-6, AC-8 (GET), AC-10 · BIF-DD-1, DD-5 · P-3, P-6, P-10, P-11.
- **Skills and effort:** `nestjs-expert`, `tdd`, `api-design-principles`. Effort: high.
- **Running totals:** 4/6 tasks (T-6 deferred, so 4/5 code tasks) · ~1,226 LOC (≈306 prod, ≈920 test) · 6 review rounds (T-4 counted 2 verdicts). Within the raised tripwire of ~1300 LOC / ~320 prod / 11 rounds.

### BIF-T-5 — Contract doc and field-alignment note — PASS

- **Date:** 2026-11-11
- **Attempts:** 1
- **Attempt 1:**
  - **Files changed:** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (+70/−2). Changes:
    - §3 `actors[]` bullet and a new subsection, "Actor follow-up answers".
    - `outcomes[].warnings` row.
    - A new subsection, "Ingestion — actor follow-up", after "Contributing partners on `POST /create`". It holds the 9-step table, the three 400s, the five warnings with their shape, the §10 alignment table and forward pointers 1–6 and 8.
    - A change-log row dated 2026-11-11.
  - **Implementer verification:**
    - A falsifier grep found the 5 codes and `innovation_use.actors` in the doc.
    - The 5 warning messages and the `how_many` 400 each match as fixed strings (code=1, doc=1).
    - The two templated "must be one of" messages (`rules.ts:57`) equal the rendered output.
  - **Evidence re-run (Leader inline): VERIFIED.** The same counts came back, both rendered messages are present, and the change log is at line 741.
  - **Reviewer (opus): PASS.**
    - All 7 checked pointers are true to the code, and every code and message matches verbatim.
    - BIF-R-10 is covered in full, and the BIF-R-8 deferral is stated.
    - Pointer 7 (log form) is accepted as skipped, because the doc documents no server logs.
  - **Runtime events:** none
- **Spawns:**
  - Implementer: 21 calls, 122,882 tokens, ended complete.
  - Reviewer: 13 calls, 110,866 tokens, ended complete.
- **ADVISORY (not gating).** Three wording precision points in the external doc:
  - "The first failing actor, in index order, is the one reported" holds only within each check (type → follow-up → youth).
  - "`is_active: false` passed through untouched (no check…)" should say "no follow-up check". Type resolution and the youth check still apply.
  - "Only a Farmers row has them stored" holds only for bilateral ingestion. The v2 writer stores codes on any type.
  - These are raised at the continue gate as a user decision; they are not folded in silently.
- **Requirements covered:** BIF-R-10 · proposal §9.5.
- **Skills and effort:** `cognitive-doc-design` and `api-design-principles`; effort medium.
- **Running totals:** 5/5 code tasks done (T-6 deferred) · ~1,296 LOC (≈306 prod, ≈920 test, ≈70 doc) · 7 review rounds. This is within the raised tripwire (~1300 / ~320 / 11).

#### BIF-T-5 follow-up — wording precision (2026-11-11)

- **Decision:** Juan David answered "Continue" at the gate, which picks option 1: apply the three wording advisories from the T-5 Reviewer to the external contract doc.
- **Who made the edit:** the Leader, inline. It is a single file and three sentences, under the inline threshold. The sentences are taken word for word from the Reviewer's suggestions, so no new claim is added.
- **Edits in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`:**
  - Read bullet: changed to "Bilateral ingestion stores them only on Farmers rows…"
  - Inactive rows: changed to "skips the follow-up rules…", adding that the type and youth checks still apply.
  - Order of 400s: changed to "Within each of these checks, the first failing actor…", with an example.
- **Not re-reviewed:** these are advisory wording changes, so no rework attempt and no review round.
