# Execution — `bugfix/contribution-target-anchor`

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/contribution-target-anchor` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (base `5d9ba6729`; HEAD moved to `042e5d154` by another session during T-1) |
| Leader | Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` (sonnet, T2) / `akili-reviewer` (opus, T3) |

## Task Execution History

### T-1 — Server: resolve the anchor from a unique phase-year meta; reject a foreign own id

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-11-12 |
| Attempts | 1 |
| Requirements covered | CTA-R-1, CTA-R-2, CTA-R-4, CTA-NFR-1, CTA-NFR-2 (CTA-S-1…S-4) |
| Skills | nestjs-expert, tdd, systematic-debugging (as in tasks.md) · effort medium |

**Attempt 1**

- Files changed: `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts` (+52/−3: `resolveTargetIdentity` + 4th arg at its two call sites), `…/results-toc-results.repository.spec.ts` (+212: new `describe('… CTA (bugfix/contribution-target-anchor)')`, 7 `it`).
- **P-8 settled (no Pivot):** no caller sends an own `toc_indicator_target_id` of another year. IPSR (`results-package-toc-result.service.ts:299/:304` → `saveIndicatorsPrimarySubmitter` / `saveIndicatorsContributors`) and share-request (`share-result-request.service.ts:2199` → `saveIndicatorsPrimarySubmitter`) pass the client DTO `indicators[].targets[]` verbatim; neither file synthesizes the id. Ids a client holds come from the GET merge (`results-toc-results.service.ts:3300-3430`) using `getCatalogTargetsByIndicatorNodeIds` called at `:701-720` with `reportingYear = phase_year`, filtered `trit.target_date = ?` (`toc-results.repository.ts:1224`). Only `saveInditicatorsContributing` writes the rit anchor; `result-toc-result-target-indicator.repository.ts` has no replicate/INSERT path. Unverified: client code and hand-edited payloads — a foreign id from either now falls through (DD-2) and DD-5 keeps any stored anchor. (Brief line refs for P-8 pointed at call sites, not at literal `toc_indicator_target_id` — noted, no impact.)
- **Red run** (spec appended, resolver unchanged; `npx jest <spec> --maxWorkers=2 -t "CTA"`): 3 failed / 4 passed, all on behavioural assertions:
  - CTA-TEST-1: `expect(targetRows[0]).toEqual(...)` — expected `"toc_indicator_target_id": 333606`, received `"toc_indicator_target_id": null`
  - CTA-TEST-2: `expect(warn).toHaveBeenCalledTimes(1)` — `Expected number of calls: 1`, `Received number of calls: 0`
  - CTA-TEST-4a: `expect(targetRows[0].toc_indicator_target_id).toBe(333606)` — `Expected: 333606`, `Received: 999999`
  - CTA-TEST-3/4b/4c/5 green on old code (guards for S-3, R-4, empty-catalog trust, DD-3).
- **Falsifier mutations** (on the fixed file, restored after): whole-list count → CTA-TEST-5 red (`Received: 333607`); step 4 `identityResolved: true` → CTA-TEST-1 red (`save` calls expected 1, received 2). Revert-to-HEAD = the red run above.
- Disqualifier: not triggered — every CTA case asserts `catalogReads.length > 0`; `it(` count 28 → 35.
- Warn placement: optional 4th param `logContext?: { resultId, indicatorId }` on `resolveTargetIdentity`, warn emitted in the method (smaller diff than duplicating the count at both call sites). Message: `saveInditicatorsContributing: ambiguous ToC target for the phase year - result_id=…, indicator_id=…, candidates=N`.
- Implementer verification: spec 35/35; findRelatedTests 79 suites / 2632 tests; tsc 0; eslint 0 (tsc/eslint/related re-confirmed on sibling copies after the stash race below).
- **Evidence re-run (Leader inline, non-author): VERIFIED** — spec `Tests: 35 passed, 35 total`; `--findRelatedTests` `Test Suites: 79 passed, 79 total` / `Tests: 2632 passed, 2632 total`; `tsc --noEmit` exit 0; `eslint --quiet` exit 0. Run on the restored working-tree files after confirming them identical (CR-stripped) to the Implementer's scratchpad copies.
- Reviewer verdict: **PASS** — diff conforms to CTA-R-1/R-2/R-4, S-1…S-4, DD-1…DD-6, NFR-1/2; tests assert the T-1 table and consult the catalog mock.
- runtime events: none
- spawns: implementer 53 calls, 211693 tokens, ended partial (Not Done: tree state + related re-run — both resolved by Leader, see Issues); reviewer not reported by host, ended complete

**ADVISORY (Reviewer, non-gating)**

- READABILITY: JSDoc above `resolveTargetIdentity` (~:2774-2788) still lists steps 1–3; add step 4 and the narrowed step-1 rule.
- RELIABILITY: with several identity-less targets in an ambiguous year, the warn fires once per target (incl. ones TTD later skips) — noisy, harmless.
- RISK: DD-2 membership runs against the all-years fallback list when the phase year has no metas → an other-year own id is accepted there, and a foreign id now ends NULL where it used to be stored. Both per DD-2/DD-3 as written; watch in PROD.
- READABILITY: CTA-TEST-2 does not assert the warn omits payload content (`not.toContain('contributing_indicator')` would pin DD-6's exclusion half).

**Not Done / Assumptions (Implementer, verbatim summary)**

- "The working tree does not hold the deliverable yet" — resolved: the other session popped its stash; both files back, identical to scratchpad copies.
- "The findRelatedTests consumer run needs a re-run on the restored real file" — resolved by the Leader re-run (79/2632 green).
- Assumption: "The DD-2 membership check runs against `catalogMetas`, which can be the all-years fallback list … An own id of another year is then still accepted. This matches design DD-2/DD-3 as written, and I did not widen it." — carried as RISK advisory above.

**Issues encountered**

- Concurrency: another session (IUY/IWH work) created `stash@{0}` "iwh-temp-during-iuy-ci-check-3" mid-run, sweeping the two T-1 files, and committed `042e5d154`. Implementer did not touch the stash; kept scratchpad copies. The stash was popped by its owner before the Leader re-run. One AKILI session per checkout was not held here (constitution concurrency convention).

**Decisions made**

- None beyond the warn-placement choice above; no spec edits.

**Running totals vs budget (design.md §Budget)**

| | Budget | Actual so far |
|---|---|---|
| Tasks | 2 | 1 done |
| LOC | ~40 code + ~160 tests + ~80 SQL (~280) | 52 code + 212 tests = 264 (T-1 alone; code+tests over by ~64 / +32%) |
| Review rounds | 1–2 per task | 1 |

Final verification: VERIFIED + Reviewer PASS. Not committed (no user go-ahead).

### T-2 — PROD backfill script

**Attempt 1** (2026-11-12, effort medium) — Reviewer **FAIL**

- Files changed: `docs/specs/bugfix/contribution-target-anchor/backfill-prod.md` (new).
- Implementer verification: none automatic (hand-off SQL); self-check of Schema sources citations.
- Evidence re-run: n/a (no command); Reviewer verified schema citations against entities.
- Reviewer FAIL (verbatim issues):
  1. Discovered Issue: "Order of execution" step 2 (line 20) says "Run blocks 2 + 3 + 4 together in ONE session" — block 4 is `COMMIT;`, so COMMIT fires before the user reads the `decision` line; with `@admin_user_id` filled and a MISMATCH the mismatched UPDATE is committed. Step 3 (line 21) contradicts step 2. Violated Rule: tasks.md T-2 Disqualifier ("UPDATE affected-rows count ≠ count of meta_count = 1 rows in (1) → stop, do not commit (roll back)"); CTA-S-5. Remediation: step 2 → "Run blocks 2 + 3 together in ONE session; do NOT include block 4"; step 3 stays the only place COMMIT is run; optionally first comment line in block 4: run only after `decision = OK`.
  2. Discovered Issue: Block 6 lists candidate ids but no centres (initiative `official_code` instead); the stated reason does not hold — centre lives on the result side: `results_center` (`center_id`, `is_primary`, `is_leading_result`, `is_active`; `results-centers/entities/results-center.entity.ts:14-57`). Violated Rule: tasks.md T-2 scope item 6 ("with candidate ids and centres"). Remediation: add a centres column via `LEFT JOIN (SELECT result_id, GROUP_CONCAT(DISTINCT center_id ORDER BY is_primary DESC SEPARATOR ', ') AS centres FROM results_center WHERE is_active = 1 GROUP BY result_id) rc ON rc.result_id = r.id`; add its source to Schema sources.
- Reviewer judgement on assumptions: 25057 rit-id + OR fallback conformant; remaining-NULL = ambiguous + no_meta disclosed, user acknowledges at preview; parent-chain active filters defensible, user confirms if ≠ 58; numeric-id NO_META conformant; block order acceptable.
- ADVISORY: 5a strict only right after commit (live saves); `CREATE TABLE … AS SELECT` rejected pre-8.0.21 with GTID consistency → fallback `LIKE` + `INSERT … SELECT`; REGEXP vs `extractYear` edge (`'2026.0'`) minimal; `m` derived table could filter `meta_year = 2026` for speed.
- runtime events: none
- spawns: implementer 26 calls, 150292 tokens, ended partial (assumptions only); reviewer not reported by host, ended fail

**Attempt 2** (2026-11-12, effort high — bumped after FAIL) — Reviewer **PASS**

- Files changed: `backfill-prod.md` — "Order of execution" steps 2/3 (blocks 2+3 only, then COMMIT only after `decision = OK`), block 4 first comment line, block 6 `rc.centres` from `results_center` (+ Schema sources rows, entity `:14`, `:19-20`, `:22-23`, `:25-30`, `:48-49`, `:51-57`).
- Evidence re-run: n/a (no automatic command; SQL is user-run in PROD).
- Reviewer PASS: both FAIL items resolved; no path runs COMMIT before the decision line; block 6 valid MySQL 8 under ONLY_FULL_GROUP_BY, citations hold; no regression in blocks 1–5/7 or the UPDATE guards.
- ADVISORY: line 23 "Block 4 is the only place COMMIT is run" is not literal (post-commit rollback block has its own COMMIT); no DISTINCT in centres GROUP_CONCAT (cosmetic duplicates); `group_concat_max_len` 1024 may truncate `candidates`/`centres` → `SET SESSION group_concat_max_len = 8192;` before block 6.
- Not Done / Assumptions (Implementer): block 6 unexecuted; `*`/`L` centre marks are a presentation choice.
- runtime events: none
- spawns: implementer 11 calls, 126536 tokens, ended complete; reviewer not reported by host, ended complete

**T-2 status: `[~]` — authoring PASS, HITL owed.** Done criteria still owed by the user (not agent work): run block 1 and confirm counts (P-12; parent-chain filter may make total ≠ 58; remaining-NULL expectation = ambiguous + no_meta, a disclosed reading of CTA-S-5), supply `@admin_user_id`, run 2+3 → 4 on `decision = OK`, run 5 from a fresh tab, check KPI 9378 Achieved = 1.

**Running totals vs budget**

| | Budget | Actual |
|---|---|---|
| Tasks | 2 | 1 `[x]`, 1 `[~]` (HITL) |
| LOC | ~280 (40 code / 160 tests / 80 SQL) | 52 code + 212 tests + ~480-line backfill doc (~330 SQL lines) — over budget, mainly tests + the doc's guard/verification blocks |
| Review rounds | 1–2 per task | T-1: 1 · T-2: 2 |

**T-2 HITL — block 1 preview (user, PROD, 2026-11-12, screenshot):** 58 rows = 46 `WILL_UPDATE` + 12 `AMBIGUOUS` + 0 `NO_META` → total equals the spec's 58 (parent-chain filter excluded nothing); expected affected rows = 46; expected remaining NULL = 12. Known case present: rit 25057, result_code 21527 (SP01), resolved_anchor 333606 (P-11 confirmed). P-12 settled: 46/58 single-meta. Ambiguous metas per node: 2–12; two ambiguous rows carry contributing_indicator 0 (results 31272, 31274).

**T-2 HITL — block 2 error (user, PROD, 2026-11-12):** `SQL Error [1292] [22001]: Data truncation: Truncated incorrect datetime value: '2024-12-30T22:00:00.000Z'`. Cause: `YEAR(trit.target_date)` on ISO-8601 strings with `T…Z`; in a plain SELECT it is a warning (block 1 ran), but strict mode turns it into an error inside `CREATE TABLE … AS SELECT`. CTAS runs before `START TRANSACTION`, so no UPDATE ran. **Decision (Leader, inline 1-file edit):** in `backfill-prod.md` all 4 occurrences of `THEN YEAR(trit.target_date)` → `THEN CAST(LEFT(trit.target_date, 4) AS UNSIGNED)` (still gated by `REGEXP '^[0-9]{4}-'`). Equivalence: for `YYYY-…` strings the first 4 chars equal MySQL's truncated `YEAR()` result and the server's `extractYear` (`new Date(v).getUTCFullYear()`, repository `:2758-2772`) for UTC `Z` timestamps; server SQL filter (`:2675-2682`) keeps `YEAR()` — fine there (SELECT, warning only). Not re-reviewed: mechanical expression swap with equal output; user re-checks via the backup sanity line (expect 58 / 46 / 12 / 0).

**T-2 HITL — PROD run (user, 2026-11-12):** backup created; block 3 `expected_rows = 46`, `affected_rows = 46`, `decision = OK` → `COMMIT;` in the same tab. Block 5 from a fresh tab: 5a `SINGLE` 46 rows / still_null_now 0 / anchored_as_expected 46; `AMBIGUOUS` 12 / 12 still NULL. 5b rit 25057 (result_code 21527) anchor_now 333606, anchor_is_333606 = 1. Falsifiers held (no ambiguous row touched; remaining NULL = 12 = ambiguous + no_meta). Backup `bkp_rit_anchor_20261112` kept in PROD (rollback block in `backfill-prod.md`).
Still owed for T-2 Done: in-app check KPI 9378 Achieved = 1 (human). Open, outside T-2: decide the 12 ambiguous rows (block 6); T-1 server fix uncommitted.

**T-2 HITL — in-app check (user, PROD reporting.cgiar.org, 2026-11-12, screenshot):** SP01 Reporting → AOW02 Accelerated Breeding → HLO 7 → indicator "68-GATES W2 DLC … CROP: Sorghum ESA" (CIMMYT): Target 5 · **Achieved 1** · 20% · "1 result reported"; AOW02 header now "1 of 111". No deploy needed (read side unchanged, CTA design Architecture Overview). Note: app target shows 5 while catalog meta 333606 has number_target 6 (P-11) — display value comes from the level list (P-6 `target_value: "5"`); not in scope, recorded only.

### T-2 — final

| Field | Value |
|---|---|
| Final status | PASS (authoring: Reviewer PASS attempt 2) + HITL done |
| Attempts | 2 (attempt 1 FAIL: COMMIT order, centres) |
| Requirements covered | CTA-R-3 / CTA-S-5 |
| Decisions | `YEAR()` → `LEFT(…,4)` after PROD 1292 error (see above) |

## Summary

- T-1 `[x]` — server anchor fallback + foreign-id guard; Reviewer PASS; VERIFIED re-run (35/35, related 79 suites / 2632 tests, tsc, eslint). **Not committed.**
- T-2 `[x]` — PROD backfill: 46 anchored, 12 ambiguous left NULL, backup `bkp_rit_anchor_20261112`; KPI shows Achieved 1.
- Budget: over on LOC (tests + backfill doc guard blocks); review rounds T-1 1, T-2 2.
- Open outside the spec: 12 ambiguous rows (block 6, manual); T-1 commit → qa-dev → perf/PRTest → staging → master (Cristian); re-run backfill (new backup name) for rows created before T-1 reaches PROD; notify Nicoleta (SP09 Achieved jumps, 34 rows).
