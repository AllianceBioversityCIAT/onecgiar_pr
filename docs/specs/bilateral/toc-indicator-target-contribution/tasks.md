# Tasks — ToC indicator, target and contribution on the bilateral contract

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `toc-indicator-target-contribution`
- **Linked spec:** `./requirements.md` + `./design.md`
- **Owner / driver:** Juan David Delgado
- **Status:** not-started
- **Base branch:** `performance-refactor`

## 2. Pre-flight checklist

| Item | State |
|---|---|
| `requirements.md` approved | ✅ 2026-09-28 |
| `design.md` approved | ✅ 2026-09-28 |
| `BTC-OQ-1` / P-12 (STAR direct vs Fetcher) | ✅ resolved 2026-09-28 — through the Fetcher, which already forwards `target_contribution` |
| `BTC-OQ-2` (field name) | ✅ resolved 2026-09-28 — `target_contribution` |
| Migration | not applicable |
| `onecgiar-pr-server/.env` present in the worktree before running Jest | check at execute start |

## 3. Task list

### [x] `BTC-T-1` — `indicators[]` on each ToC mapping (read)

- **Type:** `server`
- **Description:** In `ResultRepository.getTocMappingsByResultId`, add an `indicators` key to the per-mapping `JSON_OBJECT`, filled by a correlated sub-select over `results_toc_result_indicators` → ToC catalogue → `result_indicators_targets`, using P-6's join and activity conditions verbatim (`BTC-DD-1`). Keys per `design.md` §4.1. In the existing TS `.map`, normalise each mapping's `indicators` (JSON string → parse; `null`/absent → `[]`).
- **Implements:** `BTC-R-1` — scenario *mapped indicator with target* (all clauses: carries description/type/target/contribution; existing keys unchanged; BUT no added/removed/duplicated `toc_mappings[]` entries; AND IT MUST return `[]` when no active indicator), scenario *indicator without target row*.
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`, `onecgiar-pr-server/src/api/results/result.repository.spec.ts`
- **Depends on:** —
- **Blocks:** `BTC-T-3`
- **Estimate:** `S`
- **Review:** `full` — changes a shared response shape read by the webhook, the create response and the QA mapper.
- **Skills:** `nestjs-expert`
- **Verification:**
  - **Command:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="result.repository.spec|bilateral-quality-payload|contributors-and-partners"` + `npx tsc --noEmit` + `npx eslint src/api/results/result.repository.ts --quiet`.
  - **Falsifier:** mock `query` to return one mapping row whose `toc_mappings` JSON holds (a) `indicators: null`, (b) `indicators` with two elements, (c) the all-`null` LEFT-JOIN mapping. Mutations that must turn the spec red: removing the `null → []` normalisation (cases a/c return `null`); not parsing a string `indicators` (case b returns a string).
  - **Red run:** the new spec fails on the pre-change code on the assertion `indicators` equals `[]` / has length 2 — not on setup.
  - **Manual (HITL, no automated gate — `requirements.md` §5):** run the new query and the old query on TEST DB for one real bilateral result that has an indicator with target (use `result.id`, not `result_code`); record both row counts (must be equal) and the `indicators` content in `execution.md`.
  - **Disqualifier:** if the TEST-DB run shows a different outer row count or a collation error, the task is not done regardless of Jest green; if no bilateral result with an indicator exists on TEST, report the check as inconclusive, not passed.
  - **Consumers:** `bilateral.service.ts:3718` (only prod caller, P-3); `bilateral-quality-payload.builder.spec.ts:411,470`; `services/quality-assessment/fixtures/*.fixture.json` (6); `contributors-and-partners.mapper.ts` (reads `toc_mappings[0]`, P-4).
- **Definition of done:**
  - [ ] Spec red on pre-change code, green after; falsifier mutations observed red.
  - [ ] QA builder / mapper specs green, unchanged.
  - [ ] TEST-DB row-count check recorded.
  - [ ] `tsc` + lint clean. No secret logged.

### [x] `BTC-T-2` — `target_contribution` on the push (write)

- **Type:** `server`
- **Description:** Add optional `target_contribution` to `TocMappingDto` (`@IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)`, Swagger `@ApiPropertyOptional`). Carry it through `handleTocMapping`'s mapping type; at the target save (`bilateral.service.ts:1792`) write `contribution ?? 1`. When the field is sent and no target row is written (initiative-only/title-only match, no `toc_results_indicator_id`, or no `number_target`), `logger.warn` with result id and reason only (`BTC-DD-2`, design §5).
- **Implements:** `BTC-R-2` — scenarios *contribution sent and indicator matched*, *not sent* (incl. BUT must NOT reject/change valid pushes), *invalid value* (400 before any result created), *nothing to attach it to* (incl. AND IT MUST log a warning).
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts`
- **Depends on:** —
- **Blocks:** `BTC-T-3`
- **Estimate:** `S`
- **Review:** `checklist` — local logic change behind an optional input, defaults preserved.
- **Skills:** `nestjs-expert`
- **Verification:**
  - **Command:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="bilateral.service.spec"` + `npx tsc --noEmit` + `npx eslint src/api/bilateral --quiet`.
  - **Falsifier:** (1) `handleTocMapping` with a full match (`toc_results_indicator_id`, `number_target: 50`) and `target_contribution: 12.5` → assert `_resultsTocTargetIndicatorRepository.save` called with `contributing_indicator: 12.5`; mutation "keep the constant `1`" must go red. (2) same without the field → `1`; mutation "`?? null`" must go red. (3) field sent + initiative-only match → `save` not called and `logger.warn` called; mutation "remove the warn" must go red. (4) DTO via `class-validator` `validate(plainToInstance(TocMappingDto, …))` for `-1`, `1.234`, `"12"` → errors; `12.5` and `12` (the Fetcher's integer) → none.
  - **Red run:** (1) and (3) fail on pre-change code on the `save`/`warn` assertion; (4) fails because the property is not declared.
  - **Disqualifier:** a test that mocks `findTocResultsForBilateral` without `number_target` for case (1) passes for the wrong reason — assert `save` was called before asserting its argument.
  - **Consumers:** `ContributingProgramDto` untouched (P-11); existing `handleTocMapping` specs (`bilateral.service.spec.ts:427`, `:2082`) must stay green.
- **Definition of done:**
  - [ ] Four cases green; falsifier mutations observed red.
  - [ ] `tsc` + lint clean. Warning text carries no payload data.

### [ ] `BTC-T-3` — Contract change log

- **Type:** `docs`
- **Description:** Add a 2026-09-28 row at the top of the change log in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: new `toc_mappings[].indicators[]` (keys, `[]` rule, one element per indicator × target, present in webhook / `POST /create` response / `GET` detail); new optional input `toc_mapping.target_contribution` (validation, default `1`, dropped-with-warning rule); `contributing_programs[]` unaffected; Fetcher note: the field is the one its `toc_mapping` schema already declares (`integer`), so through the Fetcher only integers arrive.
- **Implements:** `BTC-R-3`
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** `BTC-T-1`, `BTC-T-2`
- **Estimate:** `XS`
- **Review:** `skip-eligible` — claim to prove at execute time: every key name in the row matches the shipped code (`grep` each key in `result.repository.ts` / `create-bilateral.dto.ts`).
- **Skills:** `cognitive-doc-design`
- **Verification:**
  - **Falsifier:** a key named in the row that the code does not emit (grep returns 0) → fail.
  - **Red run:** n/a (docs).
  - **Disqualifier:** a row describing intended behaviour that the T-1/T-2 diffs do not implement.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] Row present; every key grep-verified against the code.

## 4. Dependency graph

```
BTC-T-1 (read) ──┐
                 ├── BTC-T-3 (change log)
BTC-T-2 (write) ─┘
```

`BTC-T-1` and `BTC-T-2` are parallel-safe (different files).

## 5. Coverage closure

| Requirement clause | Task |
|---|---|
| R-1 mapped indicator: description/type/target/contribution | T-1 |
| R-1 existing keys unchanged | T-1 (QA specs green) |
| R-1 BUT no added/removed/duplicated mappings | T-1 (fixture b + TEST-DB row count) |
| R-1 AND IT MUST `[]` when none | T-1 (fixtures a, c) |
| R-1 indicator without target → `null`s | T-1 |
| R-2 sent + matched → stored | T-2 (1) |
| R-2 `POST /create` response shows the value | T-1 read + T-2 write jointly (same builder, P-2) |
| R-2 not sent → `1`; BUT no valid push rejected | T-2 (2) |
| R-2 invalid → 400 before creation | T-2 (4) + P-10 (pipe runs before the handler) |
| R-2 unattachable → not stored; AND IT MUST warn | T-2 (3) |
| R-3 change log | T-3 |
