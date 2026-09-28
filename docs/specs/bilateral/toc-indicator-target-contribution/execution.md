# Execution Log — ToC indicator, target and contribution on the bilateral contract

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/toc-indicator-target-contribution/` |
| Module code | `BTC` · Depth **Lite** · Type **Change** |
| Branch | `JuanGuzman-io/validate-push-contribution-indicator` (from `dbd3f3b5f`; no drift on target files vs `origin/performance-refactor` `d1f0ecb01`) |
| Approval mode | `gated` (no proposal Document Control; continue/pause gate after each task) |
| Leader | Claude Code, `opus` (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` / `akili-reviewer.md` wrappers |
| Started | 2026-09-28 |

**Environment setup (2026-09-28):** the worktree had no `onecgiar-pr-server/.env` nor `node_modules`. `.env` copied from the main checkout (`/Users/jguzman/GitHub/CGIAR/onecgiar_pr`); `node_modules` symlinked from there (both `package-lock.json` identical). Both paths are gitignored. Smoke run `jest --testPathPattern="result.repository.spec"` → 2 suites / 65 tests passed.

**Scheduling:** `BTC-T-1` and `BTC-T-2` are file-disjoint, but both run `npx tsc --noEmit` over the shared tree — a half-edited file of one would show as a nonsense error in the other (`leader.md` → *Disjoint source files are necessary but not sufficient*). Serialised: T-1 → T-2 → T-3.

## Task Execution History

### `BTC-T-1` — `indicators[]` on each ToC mapping (read)

| Field | Value |
|---|---|
| Final status | **PASS** — Reviewer PASS + manual TEST-DB check passed (held `[~]` until the check came back) |
| Date | 2026-09-28 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert` (as listed) · Implementer `medium` · Reviewer `high`, lens checklist |
| Requirements | `BTC-R-1` (both scenarios), NFRs §4 |

**Attempt 1**

- **Files changed:** `onecgiar-pr-server/src/api/results/result.repository.ts` (`getTocMappingsByResultId`: `'indicators', (SELECT JSON_ARRAYAGG(JSON_OBJECT(...)) …)` correlated sub-select inside the mapping `JSON_OBJECT`; TS `.map` normalises string → parse, `null`/absent → `[]`) · `onecgiar-pr-server/src/api/results/result.repository.spec.ts` (new describe `… getTocMappingsByResultId indicators[] (BTC-T-1)`, 6 tests).
- **Implementer verification:** jest `--testPathPattern="result.repository.spec|bilateral-quality-payload|contributors-and-partners"` → 3 suites / 161 tests passed · `npx tsc --noEmit` clean · `npx eslint src/api/results/result.repository.ts --quiet` clean.
- **Falsifier / red run:** repository.ts reverted, spec kept → red on assertions, not setup: `indicators` expected `[]` received `null` (fixtures a and c); `toHaveLength(2)` received length 330 (fixture b, unparsed string); SQL-shape assertion `'indicators', (` absent.
- **Evidence re-run (Leader-inline, non-author):** same three commands → 3 suites / 161 passed, tsc clean, lint clean → **VERIFIED**.
- **Reviewer verdict:** `PASS` — join/activity conditions identical to P-6 (`rtri` conditions moved from `ON` to `WHERE` as the sub-select's own `FROM` table — equivalent); §4.1 keys exact and in order; `[]` rule holds for both no-indicator and all-null LEFT-JOIN mapping; no outer JOIN, `GROUP BY` untouched; consumer `contributors-and-partners.mapper.ts:130-199` unaffected. Issues: none.
- **runtime events:** none.

**Decisions made**

- Implementer used the literal `Integration_information.` schema prefix for the ToC catalogue instead of P-6's `${env.DB_TOC}`. Reviewer accepted: P-6/DD-1 require the *conditions* verbatim, not the qualifier, and the function's own `tr`/`twp` joins (`result.repository.ts` outer query) and sibling `getTocMetadataBilateralResult` are hard-coded to `Integration_information.` — using `DB_TOC` could read indicators from a different catalogue than `tr` within one mapping.
- `CAST(rit.contributing_indicator AS DOUBLE)` to guarantee a JSON number (MySQL ≥ 8.0.17; env is 8.0.46 per `docs/specs/bugfix/toc-target-row-duplication/execution.md:33`).

**ADVISORY (4R, recorded — no rework)**

- RISK: in this file `Integration_information` is the P22 catalogue and `${env.DB_TOC}` P25 (`:1084-1103`, `:1284-1303`); the whole function already reads the former — inherited, not introduced. If the TEST-DB run shows `indicator_description`/`indicator_type` `null` with `toc_results_indicator_id` filled, look here first.
- RELIABILITY: the two-indicator "one mapping" unit test proves the mapper only; row multiplication is actually guarded by the SQL-shape assertion + the manual TEST-DB row count.
- READABILITY: docblock above `getTocMappingsByResultId` still lists mapping keys without `indicators`.
- READABILITY: the `CAST` comment overstates the cause (MySQL 8.0 already emits DECIMAL as a JSON number inside `JSON_OBJECT`); harmless.
- RESILIENCE: `JSON_ARRAYAGG` has no `ORDER BY` → `indicators[]` order unspecified; worth stating in the BTC-T-3 change-log row.

**Manual TEST-DB check (HITL, `requirements.md` §5) — PASS, 2026-09-28, run by Juan David on TEST** with the scratchpad `btc-t1-testdb-check.sql` (candidate finder by `result.id` + old query + new query; the `@rid` used was not stated in the pasted output).

| | OLD query (`dbd3f3b5f`) | NEW query (BTC-T-1) |
|---|---|---|
| Outer rows | 2 — SP04 *Primary submitter*, SP07 *Contributor* | 2 — same |
| `toc_mappings[]` length per row | 2 / 2 | 2 / 2 |
| Collation / SQL error | — | none |
| `indicators` | — | populated, one element per mapping: SP04 `toc_results_indicator_id 5fdeea84-…`, `number_target 6`, `target_date 2026`, `target_contribution 4444.0`; SP07 `e35f2047-…`, `number_target 6`, `target_date 2026`, `target_contribution 55.0`; `indicator_description` and `indicator_type` non-null on both |

- Row count equal and no mapping added/removed → the Disqualifier does not fire. Non-null description/type → the P22/P25 schema advisory does not materialise for this result. `target_contribution` arrives as a JSON number.
- **Side finding (pre-existing, not introduced, no action in this spec):** the OLD query already returns two identical `toc_mappings[]` entries per initiative for this result (`toc_result_id` 7190 twice for SP04, 7311 twice for SP07) — most likely two active `results_toc_result` rows for the same initiative + ToC result. The new query carries the same duplication, no more. Belongs in the ticket comment, not a new task.

### `BTC-T-2` — `target_contribution` on the push (write)

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-09-28 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert` (as listed) · Implementer `medium` · Reviewer `high`, lens checklist |
| Requirements | `BTC-R-2` (all four scenarios) |
| Continue gate | user approved starting T-2 while the T-1 TEST-DB check is pending (2026-09-28) |

**Attempt 1**

- **Files changed:** `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts` (`TocMappingDto.target_contribution?: number` — `@IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)`, `@ApiPropertyOptional`; `ContributingProgramDto` untouched) · `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (`handleTocMapping` carries the field; target save `contributing_indicator: target_contribution ?? 1`; two `logger.warn` branches when a sent value is not stored) · `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` (new describe blocks for the four scenarios).
- **Implementer verification:** jest `--testPathPattern="bilateral.service.spec"` → 1 suite / 115 tests passed · `npx tsc --noEmit` clean · `npx eslint src/api/bilateral --quiet` clean.
- **Falsifier / red run (mutations, each reverted):** "keep constant `1`" → 12.5 assertion red · "`?? null`" → default-`1` assertion red · "remove the warn" → `logger.warn` not called red · "remove DTO property" → 3 reject cases (`-1`, `1.234`, `"12"`) red.
- **Warn texts:** `TOC mapping target_contribution was sent for result ${resultId} but the matched indicator has no target; contribution was not stored.` · `TOC mapping target_contribution was sent for result ${resultId} but the ToC match resolved no indicator (initiative-only or title-only match); contribution was not stored.` — result id + reason only; a spec asserts no warn call contains `12.5`.
- **Evidence re-run (Leader-inline, non-author):** same three commands → 115/115, tsc clean, lint clean → **VERIFIED**.
- **Reviewer verdict:** `PASS` — `?? 1` keeps a sent `0`; Disqualifier holds (`arrangeFullMatch` mocks `number_target: 50`, `toHaveBeenCalledTimes(1)` before argument check); warn only when sent (`null` treated as absent → `1`, no warn); every §5 "no target row" branch handled (initiative-only / title-only → outer else, no `number_target` → inner else); 400 path confirmed (pipe `whitelist + transform`, nested `@ValidateNested @Type`, no `enableImplicitConversion` so `"12"` rejected); role-2 `continue`s before the new code. Issues: none.
- **runtime events:** none.
- **Brief note:** diff was 279 lines (≤ 300 → inline per Step 2.3); the Leader passed it by scratchpad path instead — the host Reviewer has `Read`; content identical.

**ADVISORY (4R, recorded — no rework)**

- RELIABILITY: only the initiative-only warn branch is tested; title-only, `number_target: null`, "absent field on non-matching push → no warn" and `target_contribution: 0` → stored `0` have no test (a `??` → `||` regression would pass).
- RELIABILITY: when an `existingTarget` row is found, a sent value is dropped silently and the row not updated — unreachable on `POST /create` today (new result → new rows); matters only if `handleTocMapping` is reused for re-pushes.
- RESILIENCE: no upper bound in the DTO vs column `decimal(12,2)`; a value ≥ 1e10 passes validation, the MySQL error is swallowed by the per-mapping `catch … continue`, and the result is created without a target row (error logged, no 400). Outside the spec's "invalid" definition.
- RISK: a producer already sending a negative or string `target_contribution` now gets 400 where the field was silently stripped before — spec-mandated; worth one sentence in the BTC-T-3 change-log row (through the Fetcher only integers arrive).

### `BTC-T-3` — Contract change log

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-09-28 |
| Attempts | 1 |
| Skills / effort | `cognitive-doc-design` (as listed) · Implementer `low` · Reviewer `high`, lens checklist |
| Requirements | `BTC-R-3` |

- **Review intensity:** `tasks.md` marks it `skip-eligible`; not earned — Disqualifier names a judgment (row vs. implemented behaviour) and override (b) applies (edits a shared contract doc). Conformance Reviewer spawned.
- **Files changed:** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — one row at the top of the change log (`:442`), dated 2026-09-28.
- **Falsifier (grep per key):** in `getTocMappingsByResultId`: `'indicators'`, `'toc_results_indicator_id'`, `'indicator_description'`, `'indicator_type'`, `'number_target'`, `'target_date'`, `'target_contribution'` → 1 each; `target_contribution` in `create-bilateral.dto.ts` → 1. No zero hit.
- **Evidence re-run (Leader-inline, non-author):** same greps → identical → **VERIFIED**.
- **Reviewer verdict:** `PASS` — every claim traced to `67bfd9736` / `bf2c5002e`; all `BTC-R-3` elements present; format matches neighbouring rows; no secrets. The two `[advisory-grade]` clauses (order unspecified; invalid value now 400 where previously stripped) confirmed accurate. Issues: none.
- **runtime events:** none.

**ADVISORY (recorded — no rework)**

- The row does not mention the `existingTarget` case (a sent value neither stored nor warned when a target row already exists) — unreachable on `POST /create` for a new result.
- `bilateral-result-summaries.en.md:95` ("May also appear (bilateral enrichment)" → `obj_results_toc_result`) does not mention `indicators[]` — incomplete, not contradictory; outside T-3's scope.

## Summary

All three tasks `[x]`, each PASS on attempt 1 (3 Reviewer rounds vs. budget of 1 round per task — within budget: 3 tasks, 1 round each). No HALT, no Pivot, no runtime events.

| Task | Commit | Result |
|---|---|---|
| `BTC-T-1` read — `toc_mappings[].indicators[]` | `67bfd9736` | PASS + TEST-DB check PASS (rows 2 = 2, `indicators` populated) |
| `BTC-T-2` write — `toc_mapping.target_contribution` | `bf2c5002e` | PASS |
| `BTC-T-3` change log | this commit | PASS |

**Carried forward (recorded, not new tasks):** DTO has no upper bound vs `decimal(12,2)` (≥ 1e10 → no target row, error logged, no 400); uncovered test branches in T-2 (title-only, `number_target: null`, `0` stored as `0`); pre-existing duplicate `toc_mappings[]` entries seen on TEST (two identical mappings per initiative) — for the ticket comment; Fetcher declares `integer`, widen to `number` only if STAR needs decimals.
