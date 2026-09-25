# `bugfix/toc-target-row-duplication` — Tasks

## 1. Scope of this task list

- **Module / feature:** `results-toc-results` — row identity for `result_indicators_targets` on the shared ToC write bottleneck, plus the GET payload that feeds it.
- **Linked spec:** `./requirements.md` + `./design.md` (verified at `ca99689b4`).
- **Owner / driver:** Backend (`onecgiar-pr-server`). No client change.
- **Status:** not-started.
- **Budget (design §10.1):** 5 tasks · ~300 LOC · 2 review rounds.

## 2. Pre-flight checklist

- [x] `requirements.md` reviewed by user (continued past the Phase 1 gate).
- [x] `design.md` reviewed by user (continued past the Phase 2 gate, with the Step 2.3 challenge outcome on the table).
- [x] **P-3 settled — column PRESENT on prtest** (`TTD-OQ-3`, verified at source 2026-09-25). `SHOW COLUMNS FROM result_indicators_targets LIKE 'toc_indicator_target_id'` → `bigint NULL`, no key, default null. Environment identified by data, not by hostname: `result.id 12055` = `result_code 9587`, title *QA test - Policy Change AC4 key actors branch* — the result Yecksin reported. Migration `1790002419754` is therefore applied. **`TTD-T-2` keeps its designed shape.**
- [x] On `performance-refactor` @ `ca99689b4` — the spec's base SHA, tree clean apart from this untracked spec folder. Re-check the branch before committing and again before reporting green.
- [ ] No conflicting in-flight spec touching `results-toc-results.repository.ts` or `results-toc-results.service.ts`. **Yecksin is working P2-3817 in `contributors-partners`** — DM him before starting; if both sides touch one file, merge, do not pick a side.
- [ ] `TTD-OQ-2` (repair delivery form) answered before `TTD-T-5` — does not block `TTD-T-1 … T-4`.

## 3. Task list

> **No task is `skip-eligible`.** The two `checklist` tasks still get a Reviewer; nothing here is classified as skippable.

### `TTD-T-1` — Regression tests, red first `[x]`

- **Type:** `tests` · **Estimate:** `M` · **Review:** `full` — Bug Mode's evidence task; if these tests are wrong the whole spec certifies nothing.
- **Description:** Three new `describe` blocks in the repository spec, each red on `ca99689b4`.
- **P-3 — SETTLED at source, 2026-09-25 (prtest):** `toc_indicator_target_id` is **present** on `result_indicators_targets` (`bigint NULL`). Column list observed: `is_active, created_date, last_updated_date, created_by, last_updated_by, indicators_targets, number_target, result_toc_result_indicator_id, contributing_indicator, indicator_question, target_progress_narrative, target_date, toc_indicator_target_id`. The identity key exists; `TTD-T-2` proceeds as designed.
- **Live mechanism confirmed at source (prtest, indicator `2563` of `result 12055`) — sharpens the `TTD-TEST-2` fixture.** All 22 rows carry `last_updated_date = 2026-09-23 19:47:02`, i.e. the last save touched every one of them:
  - `2235` — created `19:30:49` at result creation, `toc_indicator_target_id = 624180`, `contributing_indicator = 1.00`, **still `is_active = 1`**.
  - `2236-2245` — 10 rows created `19:37:49`, `toc_indicator_target_id` NULL, `contributing_indicator` NULL.
  - `2246-2256` — 11 rows created `19:47:02`, `toc_indicator_target_id` NULL, `contributing_indicator` NULL.
  - Every row: `number_target = 6`, `target_date = 2026` — `distinct_numbers = 1`, so the 11 distinct catalog metas all collapsed onto the canonical, exactly as `resolvedNumberTarget` (`:1870-1874`) writes them. **`TTD-TEST-3`'s shared-canonical fixture is confirmed realistic, not hypothetical.**
  - Reading: the blanket sweep fires, then lookup 1 (`indicators_targets`, unscoped, `:1883-1892`) **hits the stored PKs the GET reported** and reactivates `2235-2245`, while the 11 catalog metas the GET appended carry ToC ids in the same field, miss both lookups, and INSERT. Each save therefore adds one row per catalog meta: 1 → +10 → +11 = 22. **Consequence for `TTD-T-4`: the GET merge is co-causal with the duplication, not a cosmetic payload change.** The contribution is *not* lost in the DB (`2235` keeps `1.00`, active) — the reported "comes back empty, required missing" is the GET returning a duplicate meta whose surviving twin carries no contribution. `TTD-R-2`'s deactivation clause still holds as a guard; it is not the live symptom.
  1. **`TTD-TEST-1` (duplication)** — one indicator, a payload of 2+ metas carrying `indicators_targets` values that are ToC ids (not PKs). Drive `saveInditicatorsContributing` twice with the same payload. Assert `targetRepo.save` is called on the first pass only, and that the second pass issues `update` for the same row ids.
  2. **`TTD-TEST-2` (lost contribution)** — a stored row carrying `contributing_indicator: 6`, re-affirmed by the payload. Assert it is updated in place and that no `update` sets `is_active: false` on it without a successor row carrying the value.
  3. **`TTD-TEST-3` (no collapse)** — two metas of one indicator that resolve to the **same** canonical `number_target`, distinct `toc_indicator_target_id`. Assert two distinct rows survive both saves.
- **Implements:** `TTD-R-1`, `TTD-R-2`, `TTD-R-5`, `TTD-AC-1`, `TTD-AC-2`, `TTD-AC-4`; scenarios *the duplication* and *the lost contribution* including both `BUT`/`AND IT MUST` clauses.
- **Design refs:** §3.2, §7, `TTD-DD-3`.
- **Files:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts`
- **Depends on:** `—` · **Blocks:** `TTD-T-2`, `TTD-T-3`
- **Falsifier:** for `TTD-TEST-3`, the fixture's two metas **must share one canonical `number_target`** and differ only by `toc_indicator_target_id`; a fixture whose metas carry different numbers reads the same under the correct fix and under the collapsing fix, and is an inert fixture. Named mutation: key the lookup on `resolvedNumberTarget` → `TTD-TEST-3` must go red. For `TTD-TEST-1`: remove the identity resolution → red on the second-save assertion.
- **Red run:** all three observed failing **on their behavioral assertion**, not on setup. The existing spec stubs `(repo as any).query` to `[]` (`:45`, `:509`), which makes `getCanonicalIndicatorTarget` return `null` in every test — these three MUST stub the catalog read with real rows instead, or they assert nothing about identity. Record the failure text per test.
- **Disqualifier:** a red produced by a missing stub, a thrown `TypeError`, or an unmatched mock is **not** a red run — fix the harness and re-run. If `TTD-TEST-1`'s second pass passes before the fix, the fixture is not reproducing the bug: report it and stop rather than adjust the assertion.
- **Consumers:** `results-toc-results.repository.spec.ts` (P-12 — the P2-3608 sign-guard block at `:1-10`, assertions `:81`, `:94`, `:109`, `:124`, `:137`, `:146`, `:158`, `:172`, `:185`; its `updatedTarget()` helper at `:66-71` filters update calls by `hasOwnProperty('contributing_indicator')` and must keep working) · `results-toc-results.service.spec.ts`.
- **Done:**
  - [ ] P-3 settled and the answer written into this task; if the column is absent, **stop and escalate** — `TTD-T-2` changes shape.
  - [x] **Four** tests red on `ca99689b4` (three `describe` blocks; `TTD-TEST-2` split into two `it`s so both reds report in one run), each failing on its own behavioural assertion at `:761`, `:837`, `:920`, `:990`. Failure text recorded in `execution.md`.
  - [x] Sign-guard 7/7 green; RTR 4/4; BIL-RTE-T-5 3/3; R-8.b 1/1. Scoped suite 215 green / 4 red (the new reds only) — zero regressions, zero assertions edited (`TTD-AC-8`).
  - [x] `npx eslint` exit 0 on the touched file. Diff append-only, `+443 / −0`, zero production diff.

### `TTD-T-2` — Identity resolution, scoped lookups, upsert `[x]`

- **Type:** `server` · **Estimate:** `M` · **Review:** `full` — shared write bottleneck with five call sites and three writers on the same table.
- **Description:** In `saveInditicatorsContributing`:
  1. Replace the per-indicator canonical read with one catalog read returning **every** meta for the indicator + reporting year (`tocTargetId`, `number_target`, `target_date`), joining both ToC doors at once (`trit.id_indicator = tri.id AND trit.toc_result_indicator_id = tri.related_node_id`, the relation already used at `:3137-3139`). Derive the canonical from that same list — no second query. Keep the existing per-indicator cache.
  2. Resolve each meta's `tocTargetId`: `target.toc_indicator_target_id` → `target.indicators_targets` **only if** it matches a catalog meta of this indicator → catalog meta matching `number_target` + `target_date`.
  3. Look the row up by `(indicator, toc_indicator_target_id)` → `(indicator, indicators_targets)` **scoped to the indicator** → `(indicator, number_target, target_date)` trying both stored conventions. Never on the canonical number alone.
  4. Hit → `UPDATE` in place, backfilling `toc_indicator_target_id`. Miss → `INSERT` carrying it. Collect every touched row id for `TTD-T-3`.
  5. **Do not touch** `resolvedNumberTarget` (`:1870-1874`, `:1956-1960`).
- **Implements:** `TTD-R-3`, `TTD-R-4`, `TTD-R-5`, `TTD-AC-3`, `TTD-AC-5`, `TTD-AC-10`; scenario *the legacy row* including both clauses.
- **Design refs:** §7, `TTD-DD-1`, `TTD-DD-2`, `TTD-DD-3`.
- **Files:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts`
- **Depends on:** `TTD-T-1` · **Blocks:** `TTD-T-3`
- **Falsifier:** revert the identity resolution → `TTD-TEST-1` and `TTD-TEST-3` go red. For `TTD-AC-10`: `git diff` must show **zero** changes on lines `1870-1874` and `1956-1960`; a diff touching them fails the task. Input that would make the check fail: a payload meta whose `indicators_targets` equals a real PK of **another** indicator's row — the scoped lookup must not return it.
- **Red run:** `TTD-TEST-1`, `TTD-TEST-3` and the new legacy-row case red before this task, green after — assertion-level, per `TTD-T-1`'s disqualifier.
- **Disqualifier:** a green suite whose catalog stub returns `[]` proves nothing about identity (the pre-existing stub does exactly that). If the tests pass with the catalog stubbed empty, the resolution is not being exercised — report it as inconclusive, do not commit.
- **Consumers:** P-14 — `repository.ts:1287`, `:1328-1330`, `:1380`, `:1567`, `:1752` read `rit.number_target` **across results**; unchanged by this task and re-checked by `TTD-AC-10`. P-12 — the sign-guard spec. Test files pinning the method: `results-toc-results.repository.spec.ts`, `results-toc-results.service.spec.ts`, `result-toc-result-target-indicator.repository.spec.ts`. Cypress: none (`grep -rn "indicators_targets" onecgiar-pr-client/cypress` → 0).
- **Done:**
  - [x] `TTD-TEST-1`, `TTD-TEST-2` test A and `TTD-TEST-3` green; sign-guard green, **zero** assertions edited (`TTD-AC-8`). `TTD-TEST-2` test B (`:920`) remains red **by design** — it gates `TTD-R-6`, which is `TTD-T-3`'s requirement (the sweep moves there, not here).
  - [x] `TTD-AC-10` proved twice, independently by the Leader against `HEAD`: both `resolvedNumberTarget` blocks byte-identical, shifted only (`HEAD:1871-1874 → :1902-1905`, `HEAD:1956-1959 → :2030-2033`).
  - [x] One catalog read per indicator per save, cached in the existing per-indicator map; canonical derived from the same result set, no second query (`getCanonicalIndicatorTarget` → `getIndicatorTargetCatalog`).
  - [x] `npx tsc --noEmit` exit 0, zero output.
  - [x] `npx eslint` exit 0. The `TTD-R-9` warning carries only numeric ids and the ToC node id — no name, email, token or contribution value (`.cursorrules`).

### `TTD-T-3` — Retire only the untouched rows `[x]`

- **Type:** `server` + `tests` · **Estimate:** `S` · **Review:** `checklist` — one moved statement, but it carries both challenge conditions.
- **Description:** Move the blanket `is_active = false` sweep (`:1857-1866`) to **after** the per-meta loop and narrow it to `indicators_targets NOT IN (touched)`. Two conditions from the Step 2.3 challenge, both mandatory:
  - **(a)** The retire pass runs for **every** indicator in the payload, including one whose `targets` is absent or not an array — a DTO-legal shape (`create-results-toc-result-v2.dto.ts:81`) that today is retired because the sweep runs *before* the `Array.isArray` check at `:1868`. With no touched ids, the pass retires everything, exactly as today.
  - **(b)** This task **must not** be committed without `TTD-T-2`. Retiring last without the identity fix leaves the accumulated duplicates **active**.
- **Implements:** `TTD-R-6`, `TTD-AC-6`, `TTD-AC-8`; the *lost contribution* scenario's `BUT` clause.
- **Design refs:** §7 *Retire*, `TTD-DD-4`.
- **Files:** `results-toc-results.repository.ts`, `results-toc-results.repository.spec.ts`
- **Depends on:** `TTD-T-2` · **Blocks:** `—`
- **Falsifier:** a test whose payload omits `targets` for an indicator that has stored rows — those rows MUST still be retired. Remove condition (a) → that test goes red. A second test: a payload carrying one of two stored metas → the other is retired, the carried one stays active.
- **Red run:** both cases red before this task (today they pass *by accident* through the blanket sweep, so the (a) case must be written to assert the **post-change** ordering — record which assertion distinguishes them, or the test is inert).
- **Disqualifier:** if the (a) test cannot be made to fail under the mutation "skip the retire pass when no ids were collected", it is not guarding condition (a). Rewrite it or record the gap.
- **Consumers:** the aggregates that would double-count if this ships alone — `aow-bilateral.repository.ts:938-948`, `:1070-1082`, `results-framework-reporting.service.ts:983-986`. Test files: as `TTD-T-2`.
- **Done:**
  - [x] Both `TTD-TEST-4` cases green; R-8.b green, parent sweep untouched at `:1814-1822`. Condition (a) verified in **production SQL**: `Not(In([]))` → `NOT(0=1)` (`typeorm/query-builder/QueryBuilder.js:738-752`), retiring every row exactly as the removed blanket sweep did.
  - [x] Scoped suite **293/293 green, 20 suites**; spec diff pure append (`+659 / −0`), zero assertions edited (`TTD-AC-8`). `tsc --noEmit` and `eslint` exit 0.
  - [ ] **Still owed at commit time.** Nothing is committed; `TTD-T-2` and `TTD-T-3` sit together in the working tree, so the pair is coherent — but condition (b) binds whoever commits.

### `TTD-T-4` — GET: stop overloading the PK field, match the merge on the ToC id `[x]`

- **Type:** `server` · **Estimate:** `S` · **Review:** `checklist` — additive payload change with a swept consumer list.
- **Description:** In `applyCatalogTargetsToInitiativesMap` (`results-toc-results.service.ts:3252-3340`): report `indicators_targets: null` for a meta with no stored row and carry the ToC id in `toc_indicator_target_id`; match a saved target to a catalog meta on `toc_indicator_target_id` first, falling back to `number_target` + year for rows that predate the column — which is what stops the same meta being appended on top of the row that already represents it. Add the optional field to `ResultTocIndicatorTargetDto`.
- **Implements:** `TTD-R-7`, `TTD-R-10`, `TTD-AC-9`.
- **Design refs:** §6, §9, `TTD-DD-5`.
- **Files:** `results-toc-results.service.ts`, `results-toc-results.service.spec.ts`, `dto/create-results-toc-result-v2.dto.ts`
- **Depends on:** `TTD-T-2` · **Blocks:** `—`
- **Falsifier:** a fixture where one meta **already has a stored row** and the catalog returns that same meta. Before: `targets` holds it twice. After: once. Revert the merge key → the duplicate comes back. Input that would make the check fail: a stored row with `toc_indicator_target_id` NULL plus a catalog meta of the same number — the number+year fallback must still merge it, not append.
- **Red run:** the duplicate-entry assertion red before, green after — on the assertion, not on a stub error.
- **Disqualifier:** asserting only that the field `toc_indicator_target_id` is **present** proves presence, not the merge. The behavioural proof is the `targets` array **length** for the shared meta. A presence-only assertion does not close `TTD-AC-9`.
- **Consumers:** P-9, as swept — `dto/create-results-toc-result-v2.dto.ts:49` · `results-toc-results.service.ts:647-651` · `repository.ts:396`, `:466`, `:506` · `achieved-value-derivation.ts` · client `result-review-drawer.component.ts` (**corrected 2026-09-25**: now at `pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/`, line drifted to `:731`. It **does** consume this payload — `results.service.ts:~3908` feeds it from `getTocByResultV2` — but maps with `any` and drops the new field, so it is unaffected. The old note "different endpoint" was wrong). Specs pinning the field: `results-toc-results.service.spec.ts`, `results-toc-results.repository.spec.ts`, `result-toc-result-target-indicator.repository.spec.ts`, `result-review-drawer.component.spec.ts`. Cypress: 0 hits.
- **Done:**
  - [x] Duplicate-entry test green — load-bearing assertion is `toHaveLength(1)` (red at 2), not a presence check. `indicators_targets` is `null` for an unsaved meta and still the real PK for a stored one.
  - [x] `toc_indicator_target_id?: number | null` with `@ApiPropertyOptional`. No global `ValidationPipe` (`main.ts`) and bare `@Body()` at `contributors-partners.controller.ts:37,51`, so no client risks a stripped field (P-6 confirmed).
  - [x] The three **server** specs green, zero assertions edited. The fourth (`result-review-drawer.component.spec.ts`) is a client spec — see the corrected consumer note in `execution.md`: the drawer **does** consume this payload (via `getTocByResultV2`), but drops the unknown field, so it is unaffected. Cypress: 0 hits.
  - [x] `npx tsc --noEmit` exit 0 and `npx eslint` exit 0 on all four touched files. Scoped suite **297/297**.

### `TTD-T-5` — Repair the existing rows + detection query `[-]` DESCOPED (user decision, 2026-09-25)

- **Type:** `data` · **Estimate:** `M` · **Review:** `full` — irreversible data work on a shared table.
- **DESCOPED 2026-09-25 by the user:** the corrupted rows live on prtest, a disposable environment, so the repair is not worth doing. `repair.sql` was written, Reviewer-`PASS`ed and validated read-only against prtest, then **deleted on request**. Nothing was ever executed against a database. **`TTD-R-8` and `TTD-AC-7` are therefore NOT met, by decision.** Consequence: `#9587`, `#9613` and 10 other results stay broken — **verify this fix on a newly created result, never on those**.
- **Description:** Blocked on `TTD-OQ-2` (migration vs. reviewed statement — house practice for `validation_*`-adjacent work is by hand). Collapse the duplicates for `result_id 12055` to one active row per meta, preferring the row carrying a `contributing_indicator`. Inside a transaction, printing per-indicator active-row counts before and after. Ship a detection query the owner can run on the other environments. **P-10 — SETTLED at source, 2026-09-25 (prtest):** the 22 rows are **one indicator**, not 11 metas × 2 saves. `result_toc_result_indicator_id = 2563` holds 22 rows, **all `is_active = 1`** (zero inactive rows exist for it), all `number_target = 6`, all `target_date = 2026`; `distinct_toc_ids = 1`, `null_toc_ids = 21`, `with_contribution = 1`. So the repair collapses 22 → 1 for this indicator and must keep `2235` (the only row carrying both `toc_indicator_target_id = 624180` and `contributing_indicator = 1.00`). **P-15** (`SHOW CREATE FUNCTION` for the live green check) is still open and remains the task's first step.
- **Implements:** `TTD-R-8`, `TTD-AC-7`.
- **Design refs:** `TTD-DD-6`, §12.
- **Files:** `docs/specs/bugfix/toc-target-row-duplication/repair.sql` (or a migration, per `TTD-OQ-2`)
- **Depends on:** `TTD-T-2`, `TTD-T-3` (the fix is self-healing per row, so the repair only removes the surplus) · **Blocks:** `—`
- **Falsifier:** the before/after counts. An indicator whose active-row count drops to 0, or a meta that loses a row carrying a value while a null row survives, fails the task. Dry-run first on a copy; the input that would make it fail is a meta with **two** rows both carrying different values — the statement must report that case rather than pick one.
- **Red run:** n/a — data repair, not a test. The evidence is the count table and the green-check comparison for `12055` before and after.
- **Disqualifier:** a repair reported as successful on a count query alone is not evidence; the green check must be re-read from the environment (`SHOW CREATE FUNCTION`, not the stale repo copies) and compared before/after. If the live function text differs from `1762528725798-createValidtionP25.ts:139`, stop and re-derive — `UNVERIFIED` until then.
- **Consumers:** the green check (P-15), the progress aggregates listed in `TTD-T-3`.
- **Done:**
  - [x] P-10 settled and recorded (2026-09-25, at source). · [ ] P-15 still open.
  - [~] `repair.sql` written and Reviewer-`PASS`ed; every read-only statement executed against prtest by the Leader (both abort guards **EMPTY**, `EXPLAIN` on the `UPDATE` clean, keeper proved = PK `2235`). **Owner review + run still owed** — `COMMIT` is commented out by design.
  - [~] Predicted `22 → 1` for indicator `2563`, keeper `2235` (the only row carrying both `contributing_indicator 1.00` and `toc_indicator_target_id 624180`). Keeper logic verified read-only; the after-state requires the run.
  - [~] Before = **`1`**, observed. Predicted after = `1`, because the **live** predicate is `COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1` and `2235` survives every precedence tier. The after-value requires the run.
  - [x] Detection query delivered and **executed on prtest: 13 indicators flagged**, worst `result_code 9056` at **57 active rows**. `TTD-OQ-2` resolved: reviewed statement by hand, not a migration. ⚠️ The repair is scoped to `12055` per `TTD-AC-7`; the other 12 are a **user decision**, recorded in `execution.md`.

## 4. Clause-level coverage

| Requirement / scenario clause | Owned by |
|---|---|
| `TTD-R-1` · `AC-1` · *duplication* `BUT` no INSERT on the second save | `TTD-T-1`, `TTD-T-2` |
| `TTD-R-2` · `AC-2` · *lost contribution* `AND IT MUST NOT` insert a null sibling | `TTD-T-1`, `TTD-T-2` |
| `TTD-R-3` · `AC-3` · *duplication* `AND IT MUST` resolve by ToC id | `TTD-T-2` |
| `TTD-R-4` · `AC-5` · *legacy row* `BUT` no new row, `AND IT MUST` match on number **and** date | `TTD-T-2` (implemented + Reviewer-verified) — ⚠️ **no assertion pins it**; gate unowned, escalated 2026-09-25 |
| `TTD-R-5` · `AC-4` · `AC-10` | `TTD-T-1` (fixture), `TTD-T-2` (diff check) |
| `TTD-R-6` · `AC-6` · *lost contribution* `BUT` no deactivation without re-affirmation | `TTD-T-3` |
| `TTD-R-7` · `AC-9` | `TTD-T-4` |
| `TTD-R-8` · `AC-7` | `TTD-T-5` |
| `TTD-R-9` (SHOULD — warning on an unresolvable meta) | `TTD-T-2` |
| `TTD-R-10` · `AC-9` | `TTD-T-4` |
| `AC-8` (existing suites green, zero edits) | `TTD-T-3` |

## 5. Defect-class gate map (`requirements.md` §9)

| Class | Gate | Task |
|---|---|---|
| D1 duplication persists | `TTD-TEST-1` | `TTD-T-1`/`T-2` |
| D2 contribution still dropped | `TTD-TEST-2` | `TTD-T-1`/`T-2` |
| D3 metas collapse | `TTD-TEST-3`, fixture sharing one canonical | `TTD-T-1` |
| D4 other callers regress | scoped suite, zero edits | `TTD-T-3` |
| D5 mocks pass, MySQL fails | **no automated gate** → human check on prtest at the HITL pause | post-deploy |
| D6 type / lint | `npx tsc --noEmit`, `npx eslint` | `TTD-T-2`, `TTD-T-4` |
| D7 repair collapses the wrong row | before/after counts, owner review | `TTD-T-5` |
| D8 green-check verdicts move | live `SHOW CREATE FUNCTION` comparison | `TTD-T-5` |
| D9 stored `number_target` changes | `TTD-AC-10` diff check | `TTD-T-2` |
| D10 retire-last ships alone | commit ordering constraint | `TTD-T-3` |

## 6. Skills

| Task | Skills |
|---|---|
| `TTD-T-1` | `tdd`, `nestjs-expert` |
| `TTD-T-2` | `nestjs-expert`, `systematic-debugging` |
| `TTD-T-3` | `nestjs-expert` |
| `TTD-T-4` | `nestjs-expert`, `api-design-principles` |
| `TTD-T-5` | `systematic-debugging` |
