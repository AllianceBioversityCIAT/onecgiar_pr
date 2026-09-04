# Execution Log — `changes/results-aow-column-filter`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/results-aow-column-filter/` (`requirements.md`, `design.md`, `tasks.md`) |
| Approval Mode | `pre-approved` — continue/pause gates auto-pass on PASS; HALT / Pivot / budget tripwire / FATAL_FAIL always stop |
| Execution limits | ≤ 1 Reviewer round per task (second FAIL escalates); targeted `npx jest <path>` only; budget trip at > 1 300 LOC total |
| Leader | Claude Code session, model `claude-fable-5-1` (T1). Registry lists `opus` for T1 — session model is the stronger one, no downgrade; registry entry flagged for update |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (`sonnet`, T2) / `.claude/agents/akili-reviewer.md` (`opus`, T3) — author ≠ auditor enforced by wrapper bindings |
| Branch | `qa-development-2026` (shared worktree — explicit-pathspec diffs and commits, `git log` checked before each commit) |
| Started | 2026-09-04 |
| Pre-flight | `docs/specs/changes/` holds no other in-flight spec touching `programme-results/*` or `program-overview/*` ✅ · no `docs/specs/kaizen-log.md` Active Lessons table exists (per-spec kaizen entries only) |

## 2. Task Execution History

### `RAC-T-1` — Server: shared scope query + `GET results-scope` — **PASS** (attempt 2)

| Field | Value |
|---|---|
| Date | 2026-09-04 |
| Attempts | 2 Implementer attempts · 2 Reviewer rounds (round 2 = confirming round on the single FAIL issue; within the ≤ 1-rework limit) |
| Requirements covered | `RAC-R-1`, `R-1.1`, `R-1.2`, `RAC-AC-1`; scenario *One bucket per result* (all clauses) |
| Skills / effort | Implementer: `nestjs-expert` + `api-design-principles` + `tdd` (as listed), effort `high` → `xhigh` on retry. Reviewer: checklist mode, `high` |
| Brief deviation | Diff was 813/856 lines — handed to the Reviewer as a scratchpad file path (`Read`) instead of inline, to avoid the Leader emitting it as output tokens. The Reviewer read it in full |

**Attempt 1 — Implementer:** extracted `queryResultScopeRows(initiativeId, tocContext, { sourceFilter? })` (the `result_scope` CTE + `aow_codes` `GROUP_CONCAT`) from `getScopeBuckets`; `getScopeBuckets` aggregates bucket_key × status in TS (`// RAC-DD-2`); new `getResultsScope(programId, versionId)` + `queryProgramResultPopulation`; pure `toResultScopeDto` + DTO + spec under `application/queries/results-scope/`; controller `GET results-scope` with `@ApiQuery`; OSF-T-3 fixtures re-shaped to per-result rows (values unchanged); new describe blocks in service + controller specs.
Files: `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.{service,controller}.ts`, `.{service,controller}.spec.ts`, new `application/queries/results-scope/{results-scope.dto.ts, results-scope.mapper.ts, results-scope.mapper.spec.ts}`.
Verification: `npx jest src/api/results-framework-reporting --silent --forceExit` → 23 suites / 255 tests PASS; `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` → clean.

**Attempt 1 — Reviewer: `STATUS: FAIL`** (cleared: bucket-key derivation reproduces old SQL `CASE`/`GROUP BY` exactly; CTE lifted verbatim; params bound, no interpolation; OSF-T-3 shape-only change; source-filter test asserts SQL text and params both ways; mapper fixtures raw rows and `key === codes[0]` guard genuine; 400/404 behavioural; Swagger, `@akili-spec`, JWT posture match siblings).
1. **Discovered Issue:** `queryProgramResultPopulation` selects `r.id` over `results_by_inititiative` with no `DISTINCT`/`GROUP BY`, so a result carrying more than one active membership row emits duplicate entries in `buckets[]`. The sibling total query it claims to mirror (`getScopeBuckets`, same file, same join) deliberately uses `COUNT(DISTINCT r.id)` — the two populations are therefore counted differently, which is exactly the reconciliation drift T-5 must catch.
   * **Violated Rule:** `design.md` §4.1 Response — "one entry per **result of the program at that version** (population = `results_by_inititiative` membership)"; §5 `getResultsScope` — "the same membership the Overview total uses"; `requirements.md` `RAC-R-1` ("one bucket per result").
   * **Remediation Suggestion:** `SELECT DISTINCT r.id AS result_id, r.status_id AS status_id` (or `GROUP BY r.id, r.status_id`), plus one `it` feeding two membership rows for the same result id and asserting a single bucket.

**Attempt 2 — Implementer:** `queryProgramResultPopulation` → `SELECT DISTINCT`; `getResultsScope` additionally dedupes `populationRows` by `result_id` (defense-in-depth — the SQL fix is not observable through the mocked `dataSource.query`); new `it` "collapses a result with two active memberships (owner + contributor) into exactly one bucket, and the population query selects DISTINCT". Files: `results-framework-reporting.service.ts`, `.service.spec.ts`.
Verification: `npx jest src/api/results-framework-reporting --silent --forceExit` → 23 suites / 256 tests PASS; eslint clean.

**Attempt 2 — Reviewer: `STATUS: PASS`** — "The remediation closes issue 1 at both layers — `SELECT DISTINCT r.id, r.status_id` matching the sibling total's `COUNT(DISTINCT r.id)`, and a `seenResultIds` guard in TS; the new `it` asserts both SQL text and one-bucket-per-result. No regression: the TS dedupe is first-row-wins and deterministic, and the discarded `status_id` is only read on the unlinked fallback path where the mapper ignores it."

**ADVISORY (4R, round 1, recorded — no rework):** RELIABILITY — `@ApiQuery({ name: 'versionId', required: true })` while the handler accepts omission and silently resolves the active phase; either document `required: false` or reject the omission. The response echoes the resolved `versionId`, so a client can detect it. *Leader note:* design §4.1 marks `versionId` required; the client (T-2) always sends it. Left as-is; candidate for a one-line follow-up outside this spec.

**Decisions:** none beyond the spec. **Issues:** one FAIL round (missing `DISTINCT`), closed. **Final verification:** 256/256 server tests in the module green, lint clean. Gate: *auto-approved (pre-approved mode)*.

