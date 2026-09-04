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

### `RAC-T-2` — Client: fetch + join buckets, Area of Work column — **PASS** (attempt 2)

| Field | Value |
|---|---|
| Date | 2026-09-04 |
| Attempts | 2 Implementer attempts · 2 Reviewer rounds (round 2 = confirming round; within the ≤ 1-rework limit) |
| Requirements covered | `RAC-R-2`, `R-2.1`, `R-2.2`, `R-6`, `RAC-AC-2`, `AC-6`, `AC-8`; scenario *Column and filter* THEN clause |
| Skills / effort | Implementer: `angular-developer` + `tdd` (as listed), `high` → `xhigh` on retry. Reviewer: checklist mode, `high`. Diff (1074/1121 lines) handed as a scratchpad file path, as in T-1 |

**Attempt 1 — Implementer:** `GET_ResultsScope(programId, versionId)` in `results-api.service.ts`; `ProgrammeResultsService` gains `ResultScope` type, exported pure `joinResultScope`, `scope`/`scopeLoading`/`scopeError`/`loadScope()` token-guarded, `rows` becomes a `computed` joining `rawRows` with scope state (public API unchanged); `programme-results.component.{ts,html}`: `aow` column after Category (132 px, `sortField:'sectionSort'`), `cellText('aow')`, `aowTitle()`, `currentPhaseVersionId` computed (selected phase label → row `versionId`, mirroring `defaultPhase()`), effect calling `loadScope` on programme/phase change, cell block skeleton/dash/chip/label; new `services/programme-results-section-labels.ts` (`sectionLabel(key)`, `PROGRAMME_RESULTS_FIXED_SECTION_LABELS`) for T-3 to reuse; 4-line search hunk in `programme-results-filter.service.ts` `matchesProgrammeResultSearch()` (`aowCodes` + label).
Files: `shared/services/api/results-api.service.{ts,spec.ts}`, `programme-results/services/programme-results.service.{ts,spec.ts}`, `programme-results/services/programme-results-filter.service.ts`, `programme-results/programme-results.component.{ts,html,spec.ts}`, new `programme-results/services/programme-results-section-labels.ts`.
Verification: `npx jest src/app/pages/result-framework-reporting/pages/programme-results src/app/shared/services/api/results-api.service.spec.ts --silent` → 470/470 green (4 suites); `npx ng lint --quiet` → clean.
Implementer flags (judgment calls, accepted by the Leader — not gaps): (a) the RAC-R-6 search hunk sits in the filter service because that is where `matchesProgrammeResultSearch` lives; T-3 is serial, so no collision; (b) `currentPhaseVersionId` is not literally in `design.md` — the screen has no other phase→version catalog; the Reviewer confirmed it mirrors the filter's phase-match rule.

**Attempt 1 — Reviewer: `STATUS: FAIL`** (cleared: URL/envelope match `ResultScopeDto`; `Number()` join; unmatched → `UNTAGGED`; version-mismatch → `—` + phase title; token-guarded `loadScope`; column literal, 132 px, `sectionSort` ranks sort through `pr-table`'s `resolve()`; `scope="col"` + `aria-sort` inherited; skeleton/error behavioural; RAC-T-3 surface untouched).
1. **Discovered Issue:** Search does not match the bucket **key** for the three fixed keys. `matchesProgrammeResultSearch` adds `aowCodes` + `sectionLabel(section)`. For AoW rows the key is inside `codes`, but for `INTERMEDIATE` / `EOI_2030` / `UNTAGGED` the haystack holds only the label — typing `untagged`, `EOI_2030` or `INTERMEDIATE` matches nothing.
   * **Violated Rule:** `requirements.md` `RAC-R-6`; `design.md` §6.2 row `programme-results.component.ts` ("search haystack adds key + label").
   * **Remediation Suggestion:** add `if (normalize(row?.section).includes(needle)) return true;` and one `it` asserting a search for `untagged` returns `#8702`.
2. **Discovered Issue:** Area of Work cell uses different tokens than the design names. Fixed labels render `text-[var(--pr-text)]` (spec: `--pr-text-secondary`), and ` +N` is concatenated inside the mono `text-[var(--pr-text-heading)]` span, so it never gets `--pr-text-muted`.
   * **Violated Rule:** `design.md` §6.3 ("fixed labels in `--pr-text-secondary`; `+N` in `--pr-text-muted`").
   * **Remediation Suggestion:** swap the fixed-label span to `--pr-text-secondary`; split the cell into `{{ row.section }}` + sibling `<span class="text-[var(--pr-text-muted)]">+N</span>`; keep `cellText('aow')` joined for CSV.

**Attempt 2 — Implementer:** both fixes applied exactly as suggested; new `it`s in `programme-results-filter.service.spec.ts` (key both cases / label / `aowCodes`) and in the component spec ("renders the code in the heading colour and +N in --pr-text-muted, textContent still 'AOW01 +1'"). Files: `programme-results-filter.service.{ts,spec.ts}`, `programme-results.component.{html,spec.ts}`.
Verification: same jest command → 474/474 green (4 suites); `npx ng lint --quiet` → clean.

**Attempt 2 — Reviewer: `STATUS: PASS`** — "Both FAIL issues are closed. `matchesProgrammeResultSearch` now adds `normalize(row?.section)` between the `aowCodes` and label clauses, so the three fixed keys are searchable by key as RAC-R-6 / design §6.2 require. The cell paints the code in mono `--pr-text-heading`, `+N` in a sibling `--pr-text-muted` span, fixed labels in `--pr-text-secondary` per §6.3; `textContent` stays `AOW01 +1`; `cellText('aow')` / CSV / `aowTitle` untouched. 474/474 green, lint clean. No new findings."

**ADVISORY (4R, round 1, recorded — no rework, no new task):**
- RELIABILITY: with `scope === null` and not loading (versionId unresolved, or first frame after rows land) every row reads *Not tagged* — design's fallback formula, but a "never fetched" state would avoid showing a plausible wrong bucket.
- RELIABILITY: `currentPhaseVersionId` reads the joined `rows()`, so the `loadScope` effect has a feedback edge on the scope signals; safe only via numeric `Object.is` stability — reading `rawRows` would remove it.
- READABILITY: `cellText` `case 'section'` still says "Always '' in v1 — no endpoint exposes the AoW" (stale comment).
- TESTING: the sort test re-sorts by `sectionSort` in the test body; no `it` drives `tbl.sort('sectionSort')` / asserts `aria-sort` (AC-6's header-click path).
*Leader note:* the second RELIABILITY item is a one-line hardening T-3 touches the same file for; the stale comment will be removed when T-3 wires `section`. Both are noted for the T-3 brief as in-scope housekeeping of code T-3 edits anyway, not as new tasks.

**Decisions:** search hunk in the filter service accepted (see flags). **Issues:** one FAIL round (two issues), closed. **Final verification:** 474/474 client tests in the two touched areas green, lint clean. Gate: *auto-approved (pre-approved mode)* — but see the budget tripwire below.

## Budget Tripwire — after `RAC-T-2` (2026-09-04)

| Metric | Budget (`design.md` §14) | Actual after T-1 + T-2 (insertions, `git numstat`) | Status |
|---|---|---|---|
| Tasks | 5 | 2 of 5 done | on track |
| Source LOC | ≈ 380 (120 server / 260 client) | **683** (T-1 server 343 · T-2 client 319 + 21 new labels file) | 1.8× |
| Test LOC | ≈ 550 | **747** (T-1 325 · T-2 422) | 1.4× |
| Total | trip at > 1 300 | **≈ 1 430** with T-3, T-4 (client code + tests) and T-5 (docs) still pending | **TRIPPED** |
| Review rounds | ≤ 1 rework per task | 1 rework each on T-1 and T-2 | at limit, not over |

**Cause:** the estimate under-counted the server refactor (the CTE extraction + TS aggregation + population query + DISTINCT guard + JSDoc/traceability comments ≈ 3× the 120 LOC assumed) and the client join/state machine (`sectionState` five-way precedence, phase→version lookup, skeleton/error/mismatch cells). Tests are close to plan per task; there are simply more behaviours to pin than the ≈ 550 figure assumed. Insertion counts include comments and blank lines, so the functional overshoot is smaller than the raw ratio.
**Leader action:** stopped before spawning `RAC-T-3`; escalated to the user with the delta and the options (continue as specified · continue T-3 only and cut · stop here). Pre-approved mode does not absorb a tripwire.

**User decision (2026-09-04):** *Continue all tasks* — T-3, T-4, T-5 run as specified; projected final total ≈ 2 000–2 200 LOC accepted. Budget line in `design.md` §14 is superseded by this record (not edited on the spec branch).

### `RAC-T-3` — Client: Section filter live + `?section=` — **PASS** (attempt 1)

| Field | Value |
|---|---|
| Date | 2026-09-04 |
| Attempts | 1 Implementer attempt (+ 1 Leader-requested remainder before review, see below) · 1 Reviewer round |
| Requirements covered | `RAC-R-3`, `R-3.1`, `R-4.1`, `R-7`, `RAC-AC-3`, `AC-5`; scenario *Column and filter* (WHEN/THEN/BUT/AND IT MUST clauses) |
| Skills / effort | Implementer: `angular-developer` + `tdd` (as listed), `high`. Reviewer: checklist mode, `high`. Diff (638 lines) handed as a scratchpad file path |
| LOC | src +172 · test +151 (insertions) |

**Implementer report (attempt 1):** replaced the dormant `intermediate-outcomes` / `2030-outcomes` constants with bucket-key vocabulary (`PROGRAMME_LEVEL_SECTION_KEYS`); `sectionOptions()` computes live counts from `data.rows()` — *Areas of work* (codes present) + *Program-level* (three fixed keys, zero allowed); Section control enabled (removed `aria-disabled`, `cursor-not-allowed`, `opacity-60`, `title`, `#comingSoon`); `PROGRAMME_RESULTS_SECTION_QUERY_PARAM = 'section'` + dimension + `PROGRAMME_RESULTS_QUERY_PARAM_MAP.section`; URL bridge hydrate (comma-split, raw values, anti-loop guarded by `sameSectionValues`) and mirror (comma-join, `null` when empty, merge + `replaceUrl`); chips `Section: <label>` via `sectionLabel()`; comment housekeeping in the filter service and `cellText` `case 'section'`.
`Not Done / Assumptions` carried in verbatim: (1) *"badge 1" asserted as `badgeBefore + 1` (== `activeChips().length`) because the default Phase chip is always present — same pattern as the file's Created-by/Category tests* → accepted by the Leader (fixture reality, not a weakening). (2) *R-7 (SHOULD — unit name beside the code) not implemented: this component has no path to `clarisa-global-units`* → **rejected as a gap**: the Leader found `ResultsApiService.GET_ClarisaGlobalUnits(entityId)` already exists (`results-api.service.ts:1423`) and sent the remainder before review. (3) *dead `case 'section'` branch left in place, comment fixed* → accepted.
**Remainder (same Implementer, before review):** `ProgrammeResultsService.loadUnits(programId)` — token-guarded, fail-soft (`unitNames = signal<Map<string,string>>`, empty on error, no error signal), called from a separate constructor effect keyed on `programmeCode()` only; *Areas of work* labels `AOW01 · Market Intelligence (12)` when a name resolves, else `AOW01 (12)`; chips unchanged (R-7 is options-only).
Files: `programme-results.component.{ts,html,spec.ts}`, `services/programme-results-filter.service.ts`, `services/programme-results-query-params.ts`, `services/programme-results.service.ts`.
Verification: `npx jest src/app/pages/result-framework-reporting/pages/programme-results --silent` → 3 suites, 186 passed; `npx ng lint --quiet` → clean; `npx ng build --configuration development` → succeeds (pre-existing unrelated warnings only). New `it`s: grouped options with counts; select AOW01 → row/chip/badge/navigate params; select AOW02 → 0 rows; Clear → 3 rows + `section: null`; hydrate `?section=AOW01,INTERMEDIATE` two chips, no navigate; `?section=aow01` matches with raw chip; `?section=NOPE` chip + empty state; Section control LIVE (no disabled attrs, no "Coming soon", old sentinels absent); R-7 happy path (`AOW01 · Market Intelligence (1)`, `GET_ClarisaGlobalUnits('SP01')`, chip stays code-only); R-7 fail-soft (`AOW01 (1)`, cell/`error()`/`scopeError()` unaffected). 5 pre-existing mirror-effect assertions gained the new `section: null` key only.

**Reviewer: `STATUS: PASS`** — "RAC-T-3 conforms. Vocabulary is bucket keys only; the two dormant constants are deleted; `sectionOptions` counts from `rows().section` so `AOW02` yields 0 rows for `#9006`. Options match RAC-R-3 and R-7 appends the unit name only when `unitNames()` resolves, `loadUnits()` token-guarded and fail-soft (the failure test asserts cell, `error()` and `scopeError()` untouched — a real effect check). URL bridge matches design §6.1/§6.2 and the folder guide's (a)–(g). Control is live. The 5 edited mirror assertions only add the new key; `badgeBefore + 1` is legitimate. Scope clean: 6 files under `programme-results/`; T-2's cell logic changed by comment only."

**ADVISORY (4R, recorded — no rework, no new task):**
- RISK: `sectionLabel()` / `PROGRAMME_RESULTS_FIXED_SECTION_LABELS[key]` use plain object lookup, now fed raw URL values — `?section=constructor` returns a prototype member (garbage chip label, mis-grouped option). Suggest `Object.hasOwn()` or `Object.create(null)` in `programme-results-section-labels.ts`.
- RELIABILITY: `toSectionValues` does not dedupe (`?section=AOW01,AOW01` → two identical chips) and `?section=A, B` normalises on hydrate, firing one `replaceUrl` navigate the anti-loop tests do not cover. Both benign.
- READABILITY: the `sectionLabel` chip change in the filter service has no assertion in its own spec; one `it` with `INTERMEDIATE` would pin it at unit level.
- READABILITY: `aria-label` on the non-interactive wrapper `div` is ignored by AT; the `<label>` above already names the control.
*Leader note:* the RISK item is a one-line hardening in a file this spec created; surfaced to the user as a follow-up candidate (not absorbed — advisories never widen a task).

**Decisions:** R-7 treated as owed scope (SHOULD, but named in T-3's description) and closed before review rather than deferred. **Issues:** none. **Final verification:** 186/186 green, lint clean, dev build clean. Gate: *auto-approved (pre-approved mode)*; the spec's cut point after T-3 is covered by the user's tripwire decision (*continue all tasks*).

