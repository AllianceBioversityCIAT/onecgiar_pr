# Execution — Innovation Use: `use_nature` on every actor type

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-nature-all-actors` (INC-168062) |
| Started | 2026-11-18 |
| Branch | `qa-development-2026-ss` (clean tree at start; SR-168253 commits already on origin) |
| Approval Mode | gated |
| Leader | Claude Code, `opus` (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer` (T2 `sonnet`) / `.claude/agents/akili-reviewer` (T3 `opus`) |
| Persona drift | `akili doctor --agents` (v2.44.0): `leader.md` primary-instructions OUTDATED (matched 2.36.0); `tester.md` context-alignment CUSTOM-EDITED; implementer/reviewer CURRENT. `--fix` not run — `.agents/` is a shared file (write discipline); recorded as a pending item for `staging` |
| Kaizen | `docs/specs/kaizen-log.md` absent; lesson KZ-changes--innovation-use-farmer-count-nature-1 (writer callers) carried from design DD-3 |
| Budget (design §13) | 11 tasks · ~1,150 LOC (~330 prod) · ~14 review rounds · tripwire 1,450 LOC / 420 prod / 18 rounds |

## Task Execution History

### INA-T-1 — `use_nature` asked of every actor type in the bilateral rules — PASS

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Final status | PASS (attempt 1) |
| Attempts | 1 |
| Requirements covered | INA-R-1 (rules), INA-R-2, INA-R-3, INA-R-4 · INA-AC-1 (rules), AC-2, AC-3 |
| Skills / effort | `nestjs-expert`, `tdd` · Implementer effort `high` (shared predicate + contract; one above the medium default) |

**Attempt 1**
- Files changed:
  - `onecgiar-pr-server/src/api/results/result-actors/farmer-follow-up.constant.ts`
  - `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts`
  - `…/innovation-use-actor-follow-up.rules.spec.ts`
  - `…/innovation-use.handler.spec.ts`
- Implementer red, rules spec before the change: 18 failed / 24 passed. Every failure is a behavioural assertion. Example: `type 2 keeps its use_nature`: Expected `"information_received"`, Received `null`.
- Implementer green:
  - rules spec: 42/42
  - rules + handler + `bilateral.service.spec`: 3 suites, 376/376
  - `tsc`: exit 0
  - eslint: clean
- Handler-spec assertions updated, both to the new rule:
  - `~:392`: type-3 `use_nature` is now kept.
  - `~:444`: `missing` replaces `not_applicable`.
- Evidence re-run (Leader inline, after both workers reported): **VERIFIED**. One joint run covered T-1 and T-3: `npx jest src/api/bilateral/handlers src/api/bilateral/bilateral.service.spec.ts src/api/bilateral/bilateral.service.innovation-use-summary.spec.ts src/api/results-framework-reporting/innovation-use src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts --silent --reporters=summary --forceExit` → `Test Suites: 19 passed, 19 total · Tests: 555 passed, 555 total`. `npx tsc --noEmit -p .` → exit 0. eslint over bilateral, result-actors and results-framework-reporting → clean.
- Reviewer (`akili-reviewer`, full): **PASS**. Predicate semantics match DD-1. Step 4 is gone, with no remaining nulling path. Step 6 fires on types 2–5 only when the value is empty. The retired code is still declared in the union. Steps 5–8 are unchanged. The 10120 and six-actor fixtures match the scenario. The handler-spec edits are behavioural, not weakened. P-1 and P-18 were re-grepped and neither disqualifier holds.
- runtime events: none
- spawns: implementer `not reported by host` (63 tool calls, ~185k tokens, ended complete); reviewer `not reported by host` (9 tool calls, ~90k tokens, ended complete)

ADVISORY (recorded, not tasks):
- RISK: `bilateral-result-summaries.en.md` (`:521`, `:545`, `:561`) still describes the old behaviour. T-9 owns it and ships in cut 1 with T-1.
- READABILITY: the comment `rules.ts:91` still says "Steps 3-4".
- READABILITY: the "never emits not_applicable" test is now a regression guard.
- RELIABILITY: `asksUseNature` is true for any non-empty value. Safe only because unresolved types already 400.

Implementer assumptions: the six-actor fixture figures are the Implementer's own (the requirement gives none). The Reviewer accepted them.

### INA-T-3 — v2 writer: same-type rows apart by nature (presence-gated) — PASS

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Final status | PASS (attempt 1, lenses ×2) |
| Attempts | 1 |
| Requirements covered | INA-R-6, INA-R-1 (storage) · INA-AC-5 |
| Skills / effort | `nestjs-expert`, `tdd` · Implementer effort `xhigh` (correctness-critical shared writer) |

**Attempt 1**
- Files changed:
  - `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts` (9 lines, `else if ('use_nature' in el)`)
  - new `…/innovation-use.service.nature-all-actors.spec.ts` (31 tests, one describe per caller)
  - `…/innovation-use.service.farmer-follow-up.spec.ts` (one test now sends no `use_nature`, renamed)
- Implementer red: 15 failures, all on assertions. Case (a) shows `expect(repo.save).toHaveBeenCalledTimes(2)` → Received 1. Cases (b)–(d) were green before and after.
- Implementer green:
  - 11 suites, 119/119
  - `tsc`: exit 0
  - eslint: clean after a prettier `--fix` on the new spec
- Evidence re-run: **VERIFIED**, by the joint run in the T-1 entry (19 suites, 555/555). That run postdates the prettier fix.
- Reviewer, lens 1 (correctness / reliability): **PASS**.
  - `in` on plain JSON rows behaves as designed (es2017, no transform pipe).
  - The `where` and `buildActorData` both go through `toUseNature`, so a re-save matches itself.
  - The tests evaluate the real `where`; none is tautological.
  - Falsifier cases (a)–(d) are covered.
- Reviewer, lens 2 (risk / caller regression): **PASS**.
  - Independent caller census: 4 production callers, so no fifth one.
  - Centre form: always sends the property.
  - Review drawer and innovation_dev: new rows carry no property.
  - Loaded rows: matched by id.
  - IPSR is untouched.
- runtime events: none
- spawns: implementer `not reported by host` (76 tool calls, ~244k tokens, ended complete); reviewer-lens-1 `not reported by host` (18 calls, ~108k tokens, complete); reviewer-lens-2 `not reported by host` (18 calls, ~183k tokens, complete)

ADVISORY (recorded, not tasks):
- RELIABILITY (lens 1): on update, `buildActorData` writes `toUseNature(undefined)` = NULL. Callers 3 and 4 (review update, innovation_dev) therefore erase a stored nature they did not send. This is pre-existing (P-5, Low), but it conflicts with the requirements NFR (`requirements.md:280`, "No caller of either writer may clear stored answers it did not send"). **Escalated to the user as a spec gap**, see decisions.
- RISK (lens 2): caller 3 relies on the client `Actor` model leaving `use_nature` uninitialised.
- RISK (lens 2): a new unanswered non-Farmers row next to an answered one now inserts. This is intended by R-6.
- READABILITY (lens 2): the comment names callers. A pointer to DD-3 would age better.
- PROCESS (lens 1): re-run after prettier. Done, VERIFIED.

**Implementer finding: mixed-presence gap on bilateral.** A same-type bilateral pair where only one row carries `use_nature` merges in the writer, while the rules treat the two rows as distinct. This contradicts INA-R-5. Spec tension surfaced at the gate.

**Decisions made (execute-time spec edits)**
- 2026-11-18, user (AskUserQuestion), "Sí, en T-2": INA-T-2 also normalises `use_nature` to an explicit property (`null` when absent) on every bilateral actor row in `innovation-use.handler.ts` `prepareActors`. Safe under P-23. `design.md` §5 and INA-DD-3 are amended; carry them to the T-2 Reviewer as named conformance checks.
- 2026-11-18, user, "Sí, en T-9": INA-T-9 also corrects the stale line in `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md` ("Otros tipos: solo por tipo"). It is a spec-named deliverable from now on, so the shared-file discipline is satisfied by approval.

**Running totals after T-1 + T-3**

| Measure | Value | Budget / tripwire |
|---|---|---|
| Tasks | 2 / 11 | — |
| LOC | ~1,140 (prod ~35, test ~1,105) | design ~1,150 / tripwire 1,450 / prod 420 |
| Review rounds | 3 | ~14 / tripwire 18 |

Within the tripwire, but test LOC already exceeds the whole test estimate (~700). This is flagged at the gate.

Commits: not made. Root `AGENTS.md` says "Do not commit unless the user explicitly asks", so this run awaits Santiago's go-ahead.

- 2026-11-18 (user decision): **INA-T-4 also makes the v2 `buildActorData` presence-gated.** It writes `count_unit` and `use_nature` only when the row has the key. This fixes the review update erasing a stored nature it never sent, which the T-3 lens-1 advisory flagged as a conflict with the NFR. `design.md` INA-DD-9 is amended and P-5 is re-rated High. Named conformance checks for the T-4 Reviewer.
- 2026-11-18 (user): continue with wave 2 = T-2 + T-4 in parallel.

### INA-T-2 — Duplicate rule (step 9) for every actor type, new message (+ bilateral `use_nature` normalisation) — PASS

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Final status | PASS (attempt 1) |
| Requirements covered | INA-R-5, INA-R-1 (end-to-end) · INA-AC-1, AC-4 · DD-2, DD-3 (amended) |
| Skills / effort | `nestjs-expert`, `tdd` · `high` |

- **Files changed** (under `onecgiar-pr-server/src/api/bilateral/`):
  - `handlers/innovation-use-actor-follow-up.rules.ts` — step 9 runs for every type. The key is type, `other_actor_type` (type 5 only), `count_unit` and `use_nature`. The warning text is new. The `OTHER_ACTOR_TYPE_ID` constant is local. The "Steps 3-4" comment now reads "Step 3".
  - `handlers/innovation-use.handler.ts` — `prepareActors` sets `use_nature: actor.use_nature ?? null`, and the JSDoc is updated.
  - `handlers/innovation-use-actor-follow-up.rules.spec.ts`, `handlers/innovation-use.handler.spec.ts` (new describe "prepareActors + the real writer", run over an in-memory table), `bilateral.service.spec.ts` (message fixture).
- **Implementer red run:**
  - Rules spec: 4 of 47 tests fail. The failures are the old message text, and dups length 0 where 1 was expected.
  - Handler spec: 4 of 48 tests fail. In the mixed-presence case through the real writer, the table held only `[null, 7]`, which reproduces the silent merge.
- **Implementer green run:** 9 suites, 447/447. `tsc` exit 0. eslint clean after a `--fix`.
- **Evidence re-run (Leader inline, after T-2, T-4 and every reviewer reported): VERIFIED.**
  - Command: `npx jest src/api/bilateral/handlers src/api/bilateral/bilateral.service.spec.ts src/api/bilateral/bilateral.service.innovation-use-summary.spec.ts src/api/results-framework-reporting/innovation-use src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts src/api/results/summary src/api/results/results.service.spec.ts --silent --reporters=summary --forceExit`
  - Result: `Test Suites: 28 passed, 28 total · Tests: 739 passed, 739 total`.
  - `tsc`: exit 0. eslint (bilateral, result-actors, results/summary, results-framework-reporting): exit 0.
  - This run postdates the prettier `--fix` of both T-2 and T-4.
- **Reviewer (full): PASS.**
  - The rules key equals the writer key row by row (Farmers, Other, other types, `count_unit` on non-Farmers, unresolved types).
  - The real-writer tests are not tautological, and all 6 falsifier rows are covered.
  - The rewritten "ignores non-Farmers" test is not weakened.
  - Named checks: design §5 (amended) and DD-3 (amended) both conform.
- **Runtime events:** none.
- **Spawns:**

  | Role | Tool calls | Tokens | Ended |
  |---|---|---|---|
  | Implementer | 57 | ~184k | complete |
  | Reviewer | 8 | ~86k | complete |

  Neither value was reported by the host; these are the workers' own counts.

**ADVISORY (recorded, not tasks):**
- RISK: the rules compare `other_actor_type` as an exact string, but MySQL collation ignores case and trailing spaces. So "Bees" and "bees " merge without a warning. This is outside the spec text and is raised to the user at the cut-1 gate.
- RELIABILITY: on type 5, the rules treat `other_actor_type: ''` as equal to `null`, but the writer keys `''` literally. The result is one warning but two stored rows. A cheap fix is to normalise `''` to `null` in `prepareActors`. Raised at the cut-1 gate.
- READABILITY: `seenPairs` now holds 4-part keys; `seenIdentities` would read better.

### INA-T-4 — Presence-gated writers (legacy + v2 `buildActorData`) + read-mapper comment — PASS

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Final status | PASS (attempt 1) |
| Requirements covered | INA-R-21, INA-R-6 + NFR (no clearing of unsent answers) · INA-AC-11 (server), AC-5 · DD-9 (amended) |
| Skills / effort | `nestjs-expert`, `tdd` · `high` |

- **Files changed:**
  - `onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts` — a private `followUpFields(el)` is spread into both branches. It imports from `result-actors/farmer-follow-up.constant`, which has no circular import.
  - `…/results/summary/innovation_dev.service.spec.ts`.
  - `…/results-framework-reporting/innovation-use/innovation-use.service.ts` — `buildActorData` only.
  - `…/innovation-use.service.nature-all-actors.spec.ts` — review-caller and Centre-caller presence cases. The in-memory `save` now models the nullable default.
  - `…/innovation-use.service.farmer-count-nature.spec.ts` — "saves NULL when missing" becomes "keys omitted", and `undefined` is dropped from 2 `it.each` lists.
  - `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` — comment only.
- **Implementer red run:** 6 of 52 tests fail.
  - Legacy: the payload lacked the codes, and `undefined` came back instead of NULL.
  - v2 review update: `null` came back instead of `innovation_applied`.
  - v2 Farmers id-matched row: `null` for both fields.
- **Implementer green run:** 19 suites, 263/263. `tsc` exit 0. eslint clean after a `--fix`.
- **Evidence re-run: VERIFIED** — the same joint run as T-2 (28 suites, 739/739). It includes `results.service.spec.ts`, the review-drawer caller.
- **Reviewer (full): PASS.**
  - Inserts use `save(plain object)`, so an omitted nullable column is stored as NULL. Updates use `update(id, partial)`, so an omitted key leaves the stored value untouched.
  - The 3 rewritten assertions are legitimate behaviour updates.
  - The mock behaves like real TypeORM.
  - Named checks: DD-9 (amended) and §5/DD-3 conform. P-23 rules out clearing stored values through bilateral.
- **Runtime events:** none.
- **Spawns:**

  | Role | Tool calls | Tokens | Ended |
  |---|---|---|---|
  | Implementer | 107 | ~219k | complete |
  | Reviewer | 17 | ~102k | complete |

  Neither value was reported by the host; these are the workers' own counts.

**ADVISORY (recorded, not tasks):**
- RELIABILITY: `'key' in el` treats an explicit `undefined` as present, so the stored value would be cleared. JSON cannot carry `undefined`, but a future in-process mapper could. Both writers behave the same way.
- READABILITY: the new read-mapper comment says the writers keep `count_unit` "for Farmers only". In fact the Farmers-only rule comes from the forms and the rules, not from the writers.
- RISK: the legacy "key absent" case is proven by the payload shape, not by a stored-row simulation.

**Running totals after T-1..T-4 (`git diff --numstat` additions + the new spec file):**

| Measure | Value | Budget | Tripwire |
|---|---|---|---|
| Tasks | 4 / 11 | — | — |
| LOC | **~1,560** (prod ~96, test ~1,464) | design ~1,150 | **1,450 — EXCEEDED** |
| Prod LOC | ~96 | ~330 | 420 |
| Review rounds | 5 | ~14 | 18 |

**Budget tripwire fired:**
- **Cause:** test volume. `innovation-use.service.nature-all-actors.spec.ts` alone is ~917 lines, against a design test estimate of ~700 for the whole spec.
- **Prod LOC and review rounds are well within budget.**
- Run stopped at this gate and escalated to the user. Not auto-approved.

> No mandate widens pre-approval: an owner brief that says "never stop" or "treat every gate as approved" pre-approves routine gates only. The exceptions in `/akili-propose` Step 1 *Approval Mode* (HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG`, destructive actions) still stop, and the stop message quotes this sentence.

**Tripwire decision (user, 2026-11-18 ~11:00):**

| Item | Decision |
|---|---|
| Tripwire | Raised to **~2,600 LOC total**. Prod tripwire stays at 420 and the review-round tripwire stays at 18 |
| Run | Continue with T-5 and T-9 |
| `other_actor_type` edge cases (case/trailing spaces; `''` vs absent) | Not fixed in this spec. Recorded as a follow-up (design §14 candidate) |

### INA-T-5 — QA catalog: `use_nature` required for every type — PASS

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Status | PASS, attempt 1 |
| Covers | INA-R-11, INA-AC-8, DD-8 |
| Skills / effort | `nestjs-expert` · `medium` |

**Files changed**

All paths are under `onecgiar-pr-server/`.

| File | Change |
|---|---|
| `src/api/qa-catalog/definitions/sections/innovation-use.ts` | `use_nature` uses `ALWAYS`; `count_unit` stays on `FARMERS_RULE` |
| `src/api/qa-catalog/definitions/versions.ts` | Revision 34 → 35 |
| `src/api/qa-catalog/__snapshots__/qa-catalog.snapshot.json` | Regenerated by `npm run qa-catalog:snapshot`: revision and `content_hash` changed, keys unchanged |
| `src/api/qa-catalog/qa-catalog.innovation-use.spec.ts` | Updated for the new rule |
| `qa-catalog.shape.spec.ts:1029`, `qa-catalog.service.spec.ts:173`, `qa-catalog.controller.spec.ts:134` | Revision pin moved to 35; these were outside the expected file list |
| `docs/qa-catalog.en.md` | New v1.34 row; `actor_use_nature` row updated; current-version mentions moved to 35 |

**Verification**

- **Implementer red run:** the innovation-use spec failed 2 of 24 tests. Both failures are actor assertions on `required`, `required_when` and `visible_when`.
- **Implementer green run:** 5 suites, 207/207; `tsc` and `eslint` clean.
- **Evidence re-run (Leader inline): VERIFIED.** One joint run covered all of cut 1.
  - Command: `npx jest src/api/qa-catalog src/api/bilateral/handlers src/api/bilateral/bilateral.service.spec.ts src/api/bilateral/bilateral.service.innovation-use-summary.spec.ts src/api/results-framework-reporting/innovation-use src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts src/api/results/summary src/api/results/results.service.spec.ts --silent --reporters=summary --forceExit`
  - Result: `Test Suites: 1 failed, 78 passed, 79 total · Tests: 1959 passed, 1959 total`.
  - `tsc --noEmit`: exit 0.
  - eslint over bilateral, result-actors, results/summary, results-framework-reporting and qa-catalog: exit 0.
- **The single failed suite already fails without this change.** `api/qa-catalog/qa-catalog.module.spec.ts` throws `TypeError: Cannot read properties of undefined (reading 'prototype')` on the `@nestjs/jwt` import, before any test runs.
  - Probe: `git stash push` of every tracked change, then that spec run alone, then `git stash pop`.
  - Result: `Test Suites: 1 failed, 1 total`, so the failure is unrelated to INC-168062.
  - The stash was restored fully and the stash list is empty afterwards.
- **Reviewer (conformance, raised from `checklist` by override b, versioned shared contract): PASS.**
  - `ALWAYS` = `{required: true}`, with no `actor_type` conditions.
  - `count_unit` is unchanged.
  - The snapshot change is script-shaped (revision and hash only).
  - The three pin edits are legitimate.
  - The v-row follows the doc's existing style.
  - No historical rows were edited.
- **runtime events:** none.
- **spawns:**
  - Implementer: `not reported by host`, 42 calls, ~104k tokens, ended complete.
  - Reviewer: `not reported by host`, 5 calls, ~50k tokens, ended complete.

**ADVISORY (recorded, not tasks)**

- RISK/READABILITY: in `qa-catalog.en.md`, the "Catalog at revision 35" count table and the paragraph above it (`:303`, `:313`) have no revision-35 clause. The subfield required/conditional count is likely 66/70, not 64/72. This was not measured.

### INA-T-9 — PRMS contract docs + Swagger (+ innovation-use module guide) — PASS

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Status | PASS, attempt 1 |
| Covers | INA-R-12 (PRMS side), INA-AC-9, DD-11 |
| Skills / effort | `cognitive-doc-design`, `api-design-principles` · `medium` |

**Files changed**

| File | Change |
|---|---|
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | Actor table, read note, steps 4/6/9, messages (retired row kept), inactive rows, field-alignment table (§10 + row identity), change-log row 2026-11-18 at the top |
| `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts` | Swagger text only |
| `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md` | User-approved amendment: presence-gated key, bilateral normalisation, presence rule for both writers |

**Verification**

- **Implementer evidence:**
  - `tsc` is clean and eslint on the DTO is clean.
  - The duplicate message is byte-identical (2 occurrences in the doc, 1 in `rules.ts`).
  - The phrase-family sweep is clean: the remaining "Farmers only" hits are on `count_unit` or in the untouched 2026-11-11 history row.
- **Evidence re-run (Leader inline): VERIFIED.**
  - `grep -cF` of the exact message: doc 2, code 1.
  - "Another Farmers" in the doc: 0.
  - No `use_nature` sentence limits the field to Farmers.
  - `tsc` exit 0, from the joint cut-1 run above.
- **Reviewer (conformance, raised from `checklist` by override b, shared contract read by external producers): PASS.**
  - Every doc statement matches the code: `rules.ts:95`, `:141-149`, `:153`; `farmer-follow-up.constant.ts:61`; `innovation-use.service.ts:485-505`, `:697-701`; `innovation_dev.service.ts:543-552`.
  - The change-log row is accurate and additive.
  - §10 is folded in.
  - No invented UI claims.
  - Named checks for §5, DD-3 and DD-9 as amended: they conform.
- **runtime events:** none.
- **spawns:**
  - Implementer: `not reported by host`, 17 calls, ~100k tokens, ended complete.
  - Reviewer: `not reported by host`, 15 calls, ~90k tokens, ended complete.

**ADVISORY (recorded, not tasks)**

- READABILITY: in the module `CLAUDE.md`, the line "Estos dos últimos … emparejan por NULL" applies to Farmers rows only.
- READABILITY: the module `CLAUDE.md` `**Verified:**` header still reads 2026-11-12.
- ACCURACY (minor): the "Inactive rows" bullet keeps the qualifier "sent with codes", but bilateral now normalises `use_nature`.

### Cut 1 summary (server + contract): T-1, T-2, T-3, T-4, T-5, T-9 — all PASS on attempt 1

**Running totals**

| Item | Value |
|---|---|
| Tasks | 6 / 11 |
| LOC | ~1,620 (prod ~110, test ~1,480, docs ~30) against the raised tripwire of ~2,600; prod tripwire is 420 |
| Review rounds | 8, against a tripwire of 18 |
| Verification | 79 suites, 1,959 tests green; the one suite-level fail is unrelated and already failed before this change |

**Concurrency note:** another session committed `93ebf5f3b` (SR-168253, 11:05) on this same branch during the run. The cut-1 commits stage only INC-168062 paths, listed explicitly.

### Release of cut 1 to TEST (part of INA-T-11): pushed 2026-11-18 at 12:10, with the user's go-ahead ("1, hazlo tú")

| Field | Value |
|---|---|
| `qa-development-2026-ss` | Pushed `93ebf5f3b..eccb0132b`, then `1ae11e52d` |
| Extra commit `1ae11e52d` | Renumbers our `qa-catalog.en.md` change-log row to **v1.35**, because P2-3911 (`program_codes`) on `performance-refactor` had already used v1.34 |
| Merge | Built in a separate worktree (`git worktree add --detach`) so the in-flight T-6 and T-8 Implementers in the main checkout were not disturbed |
| `qa-catalog.en.md` conflict | Resolved by keeping both rows: v1.34 `program_codes`, then v1.35 `use_nature` |

**Checks on the merged tree**

- `tsc --noEmit`: exit 0, run with a junction to the server `node_modules`.
- Jest over `qa-catalog`, `bilateral/handlers` and `innovation-use`: 65 of 67 suites pass and 1485 of 1486 tests pass. Two suites fail:
  - `qa-catalog.module.spec`: already failing on HEAD before this cut.
  - `qa-catalog.snapshot.spec`: the "committed snapshot is current" test fails on the 455-line text of the snapshot.
- Diagnosis of the snapshot failure: the worktree checkout converted the file to CRLF (`core.autocrlf=true`). After `npm run qa-catalog:snapshot`, git reported no content change (`i/lf w/lf`) and the spec passed 28/28. It is a Windows checkout artifact, not a content mismatch.

**Push and cleanup**

- The first push was rejected: `origin/performance-refactor` had moved to `1d20c6e76` (P2-3911 result-detail, client files only, no overlap with this cut).
- The merge was redone on the new tip with the same resolution and pushed as `1d20c6e76..3ec1b5f2c  HEAD -> performance-refactor`.
- The junction was removed first, and `git worktree remove` followed. The real `node_modules` is intact.
- **Concurrency:** another session keeps committing SR-168253 work on `qa-development-2026-ss` (`93ebf5f3b`, `1fe11a266`).

**Still open in INA-T-11:** Daniel's E2E on TEST, which settles P-21 and P-22, and the ticket reply.

### INA-T-6 — Centre form: nature question on every row, scope vs mandatory, every type repeatable — PASS (attempt 2)

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Attempts | 2 |
| Covers | INA-R-7, R-8, R-9, R-20 · INA-AC-6, AC-11 (shared form) |
| Skills / effort | `angular-developer`, `tailwind-design-system`, `tdd` · `high` (attempt 1) → `xhigh` (attempt 2, the retry bump) |

**Attempt 1**

- **Files changed:** `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.{ts,html,spec.ts}`.
  - New predicates: `isFollowUpScope`, `isFollowUpMandatory`, `isNatureFollowUpRow`.
  - `removeOther` and `isFarmerFollowUpRow` now read the scope.
  - `isFarmerFollowUpResult` keeps its W1/W2 meaning and has an independent body.
  - The template splits into `iu-follow-up` > `iu-farmer-follow-up` + `iu-nature-follow-up`.
  - `[required]="isFollowUpMandatory()"`.
  - `onActorTypeChange` clears only `count_unit`.
- **Red:** 23 failed / 237 passed. 18 failures are behavioural (examples: nature card count 0 instead of 1; `removeOther` in scope returned 10 instead of `[]`; `use_nature` came back null after a type change). 5 failures were "not a function" on the new methods.
- **Green:** 4 suites, 260/260. Host suites: 23 suites, 361/361.
- **Reviewer (full): FAIL.** The only issue: the folder `CLAUDE.md` was stale at `:76`, `:79` and `:87`, and `Verified:` was not re-stamped. This violates `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs". Every functional point passed:
  - youth equivalence;
  - IWH 2030 still hidden;
  - no stale `count_unit` (the host sends the key on every row);
  - the IFC test rewrites are legitimate;
  - the W3 marker is per DD-6;
  - radio names are unique.

**Attempt 2** (rework, docs only; full Reviewer report relayed verbatim)

- **Files changed:** `…/innovation-use-form/CLAUDE.md`, 185 → 193 lines. Section rewritten, P-9 warning added, test ids and the Specs describe added, `Verified:` re-stamped as `2026-11-18 · INC-168062 (INA-T-6)`. Includes an advisory line on W3 Households collapsing to a single total.
- **Green:** 260/260.
- **Re-review: PASS.** Every statement matches the code (`.ts:516-519`, `:546-554`, `:570-581`, `:588-591`, `:604-612`, `:730`, `:746`; `.html:856,859,864,876,879,896`).

**Evidence re-run (Leader inline, after every worker and reviewer reported): VERIFIED**

- Jest command: `npx jest src/app/shared/components/innovation-use-form src/app/pages/bilateral/components/section-type-specific/type-innovation-use src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info src/app/pages/ipsr --silent --reporters=summary --no-coverage`
  - Result: `Test Suites: 92 passed, 92 total · Tests: 1447 passed, 1447 total`.
- `npx ng lint --quiet`: "All files pass linting.", exit 0.

**Other records**

- runtime events: none.
- spawns, all `not reported by host`:

  | Role | Calls | Tokens | Ended |
  |---|---|---|---|
  | Implementer, attempt 1 | 58 | ~218k | complete |
  | Reviewer | 12 | ~105k | fail |
  | Implementer, attempt 2 | 32 | ~153k | complete |
  | Re-reviewer | 7 | ~101k | complete |

**ADVISORY (recorded, not tasks)**

- RISK: on W3, a Farmers row answered "Households" now shows a single total, because `isHouseholdsRow` reads the scope (R-20). Add this to the AC-11 manual check on TEST.
- A11Y: the W3 "Optional" pill next to the `-mt-[27px]` offset has not been checked visually. Add it to the AC-11 manual check.
- READABILITY: the `farmerRowKey` / `iu-farmer-` names now serve every actor type.
- READABILITY: the folder `CLAUDE.md` is 193 lines against the 120-line cap of `docs/COMPONENT-DOCS.md`. It was already 185 before this task. Cleanup is pending.

### INA-T-8 — Bilateral editor: show and save both answers on actor cards — PASS (attempt 2)

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Attempts | 2 |
| Covers | INA-R-21 · INA-AC-11 (bilateral editor) |
| Skills / effort | `angular-developer`, `tailwind-design-system`, `tdd` · `high` (attempt 1) → `xhigh` (attempt 2) |

**Attempt 1**

- **Files changed:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.{ts,html,spec.ts}`.
  - `showUseNatureQuestion` / `showCountUnitQuestion`: phase ≥ 2026, or the year is unresolved.
  - The copy comes from the shared `farmer-follow-up.ts`.
  - Native radios with names keyed through a WeakMap.
  - Households goes through `onDisaggregationChange`.
  - `onActorTypeChange` clears `count_unit` and then calls `onFieldChange()`.
  - Not added to `mdsTracker`.
- **Red:** with no-op stubs, 9 failed / 5 passed. All failures are behavioural (examples: `showUseNatureQuestion` returned false where true was expected; `schedulePayload` was called 0 times where 1 was expected).
- **Green:** folder 166/166. Folder eslint clean.
- **Reviewer (full): FAIL.** The only issue: the folder `CLAUDE.md` was not updated and not re-stamped (`onecgiar-pr-client/CLAUDE.md` §10). Every functional point passed:
  - all 5 falsifier rows;
  - both disqualifiers clear: the save path is `PATCH summary/innovation-use/create/result/:id`, and loaded rows carry the codes;
  - `updateMds` and `onFieldChange` unchanged;
  - a11y OK.

**Attempt 2** (rework; full Reviewer report relayed verbatim)

- **Files changed:**
  - `…/type-innovation-use/CLAUDE.md`, 164 → ~185 lines: Contract bullet, the INA-T-8 entry, two Traps, `Verified:` re-stamped as `2026-11-18 · INC-168062 (INA-T-8)`.
  - `spec.ts` [advisory-grade]: a guard test that `followUpRowKey` differs per row, plus a markup check that `name` is bound to it.
- **Green:** 167/167. eslint clean.
- **Re-review: PASS.** The `CLAUDE.md` text matches the code. Feature code is unchanged since attempt 1. The new test is not tautological.

**Evidence re-run: VERIFIED.** Same joint run as T-6 above: 92 suites, 1447/1447; `ng lint` exit 0.

**Other records**

- runtime events: none.
- spawns, all `not reported by host`:

  | Role | Calls | Tokens | Ended |
  |---|---|---|---|
  | Implementer, attempt 1 | 50 | ~162k | partial (full `ng lint` not finished; the Leader ran it in the re-run) |
  | Reviewer | 11 | ~109k | fail |
  | Implementer, attempt 2 | 20 | ~141k | complete |
  | Re-reviewer | 12 | ~66k | complete |

**Decisions made (execute-time spec edits)**

- 2026-11-18: `design.md` INA-DD-10 amended. The bilateral editor does not restore the grid when an actor leaves Farmers, a deliberate divergence from the shared form (INA-R-8 is Centre-form only; R-21 is SHOULD). Recorded at the T-8 re-review advisory.

**ADVISORY (recorded, not tasks)**

- RELIABILITY: if the type is cleared to null, `use_nature` is kept and saved while its question is hidden. Harmless, because the server whitelists the codes.
- READABILITY: the folder `CLAUDE.md` is over the 120-line cap. Pre-existing (164 lines). Cleanup is pending.

### Cut 2 (UI) summary: T-6 and T-8 PASS

| Measure | Value |
|---|---|
| Review rounds so far | 12 (tripwire 18) |
| Prod LOC | ~240 total (tripwire 420) |
| Total LOC | ~2,200 (raised tripwire ~2,600) |

Remaining: T-7 (SQL, needs `SHOW CREATE FUNCTION` from Santiago), T-10 (fetcher docs + prod promotion), T-11 (TEST E2E by Daniel, prod).

### INA-T-7 — Green check: `use_nature` on every type (SQL) — SQL authored, PASS; **awaiting HITL apply on prtest**

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Covers | INA-R-10 · INA-AC-7 (pending run) · DD-7 |
| Skills / effort | `systematic-debugging` · `high` |

- **Step 1 (Leader, inline)**
  - Santiago pasted the `SHOW CREATE FUNCTION` output from prtest (DEFINER `prdbusertst`). It is saved verbatim as `sql/validation_innovation_use_P25.before.sql`.
  - The live body was compared with the archived IUY `after.sql`. The comparison ignored whitespace and the DEFINER (`diff -w` on `sed`-normalised bodies). Result: **IDENTICAL**. **P-16 is settled (verified 2026-11-18).**
- **Attempt 1 (Implementer)**
  - Files created:
    - `sql/validation_innovation_use_P25.after.sql`
    - `sql/validation_innovation_use_P25.after.body-only.sql`
    - `sql/checks.sql` (V0, S1a/b, S2, S3a/b, S4, S5)
  - The §12.1 impact query was corrected:
    - `COALESCE(source)`
    - `NOT (actor_type_id <=> 1)`
    - invalid codes
    - `section_id IN (1,2)`
    - the to-be-determined gate per section
    - a split by status
    - a "green today" condition
- **Evidence re-run (Leader inline): VERIFIED.** `diff -w before after` shows only:
  - the header;
  - the IFC-R-6 comment wording;
  - in each section, the `OR use_nature …` lines replaced by closing check (a) and adding the INA-R-10 check (b) on the same `section_id`.
- **Reviewer, lens function: PASS.**
  - Check (b) has no actor-type filter and handles NULL correctly.
  - Check (a) is still Farmers-only.
  - Both checks sit inside the 2026 W1/W2 gate and the `actors EXISTS` gate.
  - Nesting is correct (IF 29 → 31).
  - The DEFINER note is present.
  - The `body-only` body matches `after`.
- **Reviewer, lens `checks.sql`: PASS.**
  - Strictly read-only.
  - Names match the entities.
  - MySQL 5.7/8 syntax.
  - S5 applies the same gates as the function.
  - S3 and S4 prove their claims.
  - Every function call is bounded by `result_type_id = 2` and phase ≥ 2026.
- runtime events: none
- spawns (none reported by the host):

  | Spawn | Calls | Tokens | Ended |
  |---|---|---|---|
  | Implementer | 22 | ~105k | complete |
  | Reviewer, lens function | 8 | ~42k | complete |
  | Reviewer, lens `checks.sql` | 4 | ~47k | complete |

**ADVISORY (recorded, not tasks):**
- RELIABILITY: more than one active `results_innovations_use` row would overcount the `actor_rows` columns.
- READABILITY: the S5 status CASE names only statuses 1–3.
- READABILITY: S2 deliberately includes Farmers.
- RISK: on prod, uncomment the id filter in S2 before running.

**Status: `[~]`.** The DoD needs the before/after counts from prtest. Santiago runs `checks.sql`, applies `after.sql` once cut 2 is live on TEST, then re-runs `checks.sql`.

