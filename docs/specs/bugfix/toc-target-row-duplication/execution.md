# `bugfix/toc-target-row-duplication` — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-target-row-duplication` |
| Approval Mode | `gated` (from `proposal.md` §1) — every continue/pause gate stops for the user |
| Branch | `performance-refactor` @ `ca99689b4` (the spec's base SHA) |
| Leader model | Opus 5 (registry T1 → `opus`; no downgrade needed) |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) via the Step 8E wrappers |
| Budget (design §10.1) | 5 tasks · ~300 LOC · 2 review rounds |
| First run | 2026-09-25 |

## 2. Pre-flight — environment pre-check (Step 2.1)

Verification for `TTD-T-1 … T-4` is Jest + `tsc` + `eslint`: no running stack needed. `TTD-T-5` is data work and does
need the DB. The DB was reachable for the read-only pre-flight queries below (VPN up; no credential was printed, per
`.cursorrules`). No `mysql` client on the host — queries ran through the server's own `mysql2` from `onecgiar-pr-server/.env`.

| Item | State |
|---|---|
| `requirements.md` / `design.md` user-reviewed | ✅ (Phase 1 and Phase 2 gates passed) |
| **P-3 / `TTD-OQ-3`** — identity column applied | ✅ **settled at source** — see below |
| **P-10** — the 22-row count on `12055` | ✅ **settled at source** — see below |
| Rebased on `performance-refactor` | ✅ `ca99689b4`, tree clean apart from this untracked spec folder |
| No conflicting in-flight spec | ⚠️ **open, user-owned** — Yecksin's P2-3817 work sits in `contributors-partners`; `TTD-T-1` touches only `results-toc-results.repository.spec.ts`, so the collision risk starts at `TTD-T-2` (`results-toc-results.repository.ts`). DM owed before `T-2`. |
| `TTD-OQ-2` (repair delivery form) | ⚠️ open — blocks `TTD-T-5` only, not `T-1 … T-4` |

### P-3 — `toc_indicator_target_id` is PRESENT on prtest

`SHOW COLUMNS FROM result_indicators_targets LIKE 'toc_indicator_target_id'` → `{Field: toc_indicator_target_id,
Type: bigint, Null: YES, Key: "", Default: null, Extra: ""}`. MySQL `8.0.46`. Migration `1790002419754` is applied.

Environment identified **by data, not by hostname** (the active `DB_HOST` is an IP with no env marker):
`result.id 12055` = `result_code 9587`, title *"QA test - Policy Change AC4 key actors branch"* — the exact result
Yecksin reported from prtest. Answer status moves from `UNVERIFIED` to **verified at source** for prtest.
Still `UNVERIFIED` for the *other* target environments; indirect support is that `aow-bilateral.repository.ts:1071`
already selects `rit.toc_indicator_target_id` in production SQL on this branch, which would throw `Unknown column`
wherever the migration were missing.

**Impact: none on the plan.** `TTD-T-2` keeps its designed shape; the escalation branch in `TTD-T-1`'s Done list does not fire.

### P-10 — the 22 rows are one indicator, not 11 metas × 2 saves

`result_toc_result_indicator_id = 2563` (of `results_toc_result 13940`, ToC indicator
`77d4f004-1eba-4814-857c-8b33c48764b4`) holds **22 rows, all `is_active = 1`** — zero inactive rows exist for it.
`active_rows 22 · with_contribution 1 · distinct_numbers 1 · distinct_toc_ids 1 · null_toc_ids 21`.

| PK range | Created | `toc_indicator_target_id` | `contributing_indicator` | `last_updated_date` |
|---|---|---|---|---|
| `2235` | `19:30:49` (result creation) | `624180` | `1.00` | `19:47:02` |
| `2236-2245` (10) | `19:37:49` (save 1) | NULL | NULL | `19:47:02` |
| `2246-2256` (11) | `19:47:02` (save 2) | NULL | NULL | `19:47:02` |

All 22 carry `number_target = 6`, `target_date = 2026`.

### Leader reading of the live mechanism — recorded before any task ran

Every row shares `last_updated_date = 19:47:02`, so the last save touched all of them. That resolves as:

1. The blanket sweep (`repository.ts:1857-1866`) sets the indicator's rows inactive.
2. Lookup 1 (`findOne({ indicators_targets })`, `:1883-1892`, **unscoped to the indicator**) **hits** for the stored
   rows, because the GET reports their real PKs in that field — so `2235-2245` are updated back to `is_active: true`.
3. The 11 catalog metas the GET *appended* carry **ToC-namespace ids** in the same `indicators_targets` field. They
   miss lookup 1, and miss lookup 2 because it compares the **raw** `number_target` (17…127) against the **canonical**
   stored value (`6`) written by `resolvedNumberTarget` (`:1870-1874`). Each one INSERTs.
4. Net: one new row per catalog meta per save — `1 → +10 → +11 = 22`.

Two consequences, both recorded into `tasks.md` at the matching tasks:

- **`TTD-T-4` is co-causal with the duplication, not a cosmetic payload change.** The GET appending a catalog meta on
  top of the row that already represents it is what supplies the duplicate half of every payload. Its `Review: checklist`
  classification is left as approved, but override (b) applies anyway (payload shape + DTO field), so it gets a full Reviewer.
- **`TTD-TEST-3`'s shared-canonical fixture is confirmed realistic.** `distinct_numbers = 1` across 11 distinct catalog
  metas is the collapse the test is written to forbid.
- **The contribution is not lost in the DB.** `2235` keeps `contributing_indicator = 1.00` and stays active. The reported
  *"comes back empty, flagged required missing"* is the GET returning a duplicated meta whose surviving twin carries no
  contribution. `TTD-R-2`'s no-deactivation-without-successor clause still stands as a guard — it is simply not the live
  symptom. **Not a Pivot:** the approved fix direction is unchanged and is in fact validated by this data.

## 3. Task Execution History

<!-- appended per task -->
### `TTD-T-1` — Regression tests, red first — IN PROGRESS (`[~]`)

**Attempt 1 — Reviewer `FAIL`** · 2026-09-25 · Implementer T2 (`akili-implementer`) / Reviewer T3 (`akili-reviewer`), effort `high`
- runtime events: none
- files changed: `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts` (+323 / −0, append-only)
- Implementer verification: `npx jest --testPathPattern="results-toc-results.repository.spec" --forceExit` → 3 red (`:727`, `:803`, `:870`), each on its behavioural assertion. Sign-guard 7/7 · `saveIndicatorsPrimarySubmitter` 4/4 · `deactivateChildrenForParents` 3/3 · R-8.b 1/1. Wider scoped run 287 passed / 3 failed. `npx eslint <file> --quiet` clean.
- **Leader evidence re-run (non-author, Leader-inline): `VERIFIED`.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results"` → `Test Suites: 1 failed, 10 passed, 11 · Tests: 3 failed, 215 passed, 218`. Failing names and assertion text identical to the report at `:727`, `:803`, `:870`. `TTD-TEST-2` received array: `[{contributing_indicator: 6, indicators_targets: 2235, is_active: true, number_target: 6, target_date: 2026}, {contributing_indicator: null, indicators_targets: 9000, is_active: true, number_target: 6}]` — mirrors the prtest rows. `eslint` exit 0.
- Reviewer `FAIL`, 1 issue:
  > **Discovered Issue:** `TTD-TEST-2` asserts only the *final* state of row `2235` (`is_active === true`, `contributing_indicator === 6`) plus the absence of a null sibling. It never asserts that no `update` sets `is_active: false` on that row without a successor carrying the value. In the current run the blanket sweep (`repository.ts:1857-1866`) *does* deactivate `2235`, and the row is active at the end only because lookup 1 (`:1883-1892`) happens to hit its real PK. So the intermediate-unreachable-state clause is unguarded: a fix that keeps the blanket sweep and merely restores the row would pass this test.
  > **Violated Rule:** `tasks.md` → `TTD-T-1` (as amended 2026-09-25), item 2: "Assert it is updated in place **and that no `update` sets `is_active: false` on it without a successor row carrying the value**"; same assertion named as the D2 gate in `requirements.md` §9 (D2) and as the *lost contribution* `BUT` clause in `TTD-T-1`'s `Implements:` line.
  > **Remediation Suggestion:** In `TTD-TEST-2`, add an assertion over `targetRepo.update.mock.calls` — e.g. no call whose `where` resolves to `{result_toc_result_indicator_id: 501}` or `{indicators_targets: 2235}` may carry `is_active: false` while no other active row holds `contributing_indicator: 6`. It will be red today on the sweep (correct, red-first) and record its own failure text alongside the existing `toHaveLength(1)` red.
- Reviewer verified clean: harness faithful to today's semantics (`query` stub dispatch traced against the real SQL; lookup 1 modelled **unscoped**; `update` honours the real criteria; sweep marks inactive; fresh PKs) — **the three reds are earned by the repository, not by the harness**. Append-only diff, no new imports, no `jest.mock`, no shared mutable module state, no collision with the existing describe-scoped helpers, one file, zero production diff, no secrets. `TTD-TEST-3`'s falsifier traced and holding (named mutation caught by `activeIdsAfterSecondSave` `[9000]` vs `[9000, 9001]`).

**`ADVISORY` findings (recorded; never gate, never become tasks)**

- **Reliability — the consequential one.** `TTD-TEST-1` and `TTD-TEST-3` are red for the right reason but, as the fixture stands, **are not green-able by the designed fix**. The catalog stub returns one meta (`number_target: 6`, no ToC id) while the payload metas are `700001/700002` and `700004/700005` with raw numbers `17/28`. Under `design.md` §7 the resolution then misses at all three steps, so every meta is still treated as new. The only correct path to green is enriching the stubbed catalog rows to carry per-meta `toc_indicator_target_id`. The Reviewer notes `TTD-T-2`'s `Files:` names only `results-toc-results.repository.ts`, so as written `TTD-T-2` could not satisfy its own Done list.
- **Readability / Resilience.** `buildTtdStatefulRepository`'s `save` spreads `...row` *after* the generated PK (`{indicators_targets: nextTargetId++, ...row}`), so a future INSERT carrying the key would silently override the fake's PK. Today's path never passes it. Recorded for `TTD-T-2`'s attention when it reshapes the INSERT payload.
- **Readability.** `rowIdsAfterFirstSave.sort()` uses the default lexicographic comparator; harmless for `9000/9001`, brittle if id ranges straddle digit counts. `(a, b) => a - b` is the cheap fix.

**Leader decision on the reliability advisory — recorded at the moment of the call.** The catalog-stub enrichment is ruled **inside `TTD-T-1`'s existing scope**, not an advisory absorbed into the task and not a widening. `TTD-T-1`'s own **Red run** clause already requires it: *"these three MUST stub the catalog read with real rows instead, or they assert nothing about identity."* Real catalog rows for this indicator carry a `toc_indicator_target_id` — verified at source, row `2235` carries `624180` — so a catalog stub without per-meta ToC ids is not stubbing real rows, and a gate that stays red under the correct fix is a broken gate rather than a red-first one. No task was minted, no task's `Files:` list was widened, and `TTD-T-2` is left exactly as approved. Surfaced to the user at the Step 5 gate for review under `gated` mode.

**Attempt 2 — Reviewer `PASS`** · 2026-09-25 · Implementer T2 (resumed, context retained) / Reviewer T3 (fresh instance), effort bumped `high` → `xhigh` per the rework rule
- runtime events: none
- files changed: same single file, cumulative `+443 / −0` (still append-only; the only `^-` line is the `--- a/...` diff header)
- changes: (1) the FAIL fix — `TTD-TEST-2` split into two `it`s sharing one seed, adding *"must never deactivate the stored row without an active successor already carrying its value"*, which inspects live state **at the instant the sweep sets `is_active: false` on `2235`**, before any lookup runs. (2) the catalog-stub enrichment ruled in-scope above.
- Implementer verification: 4 red at `:761`, `:837`, `:920`, `:990`, each on its named behavioural assertion, no `TypeError`/unmatched mock. Sign-guard 7/7 · RTR 4/4 · BIL-RTE-T-5 3/3 · R-8.b 1/1. Wider scoped run 287 passed / 4 failed (the four new reds only). Lint clean.
- **Leader evidence re-run (non-author, Leader-inline): `VERIFIED`.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results"` → `Test Suites: 1 failed, 10 passed, 11 · Tests: 4 failed, 215 passed, 219`. Four failing names and assertion texts identical to the report: `:761` (0 vs 2), `:837` (length 1 vs 2), `:920` (`true` vs `false`), `:990` (0 vs 2). `npx eslint <file> --quiet` → exit 0. `git diff --stat` → 443 insertions, 0 deletions.
- Reviewer `STATUS: PASS` — *"Attempt 2's split `it` closes the clause attempt 1's FAIL named — it inspects state at the sweep instant, so it stays red under a 'sweep-then-restore' fix — and the catalog enrichment is faithful to the real ToC catalog and is genuinely load-bearing for `TTD-T-2`'s green-ability."*

**The three green-ability seams the Leader raised, answered at source by the Reviewer:**

| Seam | Verdict |
|---|---|
| Does the stub's `toc_result_indicator_target` dispatch substring necessarily appear in the read `design.md` §7 specifies? | ✅ **Served.** `getCanonicalIndicatorTarget` (`repository.ts:2480-2513`) and the real catalog read `TocResultsRepository.getCatalogTargetsByIndicatorNodeIds` (`toc-results.repository.ts:1222`) both name `${env.DB_TOC}.toc_result_indicator_target` in `FROM`/`JOIN`; the both-doors join cannot be written without binding the `trit` alias to that table. `getPhaseYearByResult` (`:2450-2453`) contains neither substring, so the two branches cannot cross-dispatch |
| `toc_indicator_target_id` (stub) vs `tocTargetId` (design §7) — alias mismatch? | ✅ **Not a mismatch.** `toc_indicator_target_id` is the literal ToC-side column, selected verbatim at `toc-results.repository.ts:1218` and typed at `:1200`; `tocTargetId` is the design's shorthand. `TTD-T-2` lands on the same key the stub emits |
| `target_date: '2026-01-01'` (stub, string) vs `2026` (live rows, integer year) | ✅ **Legal, with a caveat.** The date-string form is real — the year-extraction `REGEXP` at `:2489-2491` and `:3120-3122` exists precisely because `trit.target_date` holds both `'YYYY-'` and `'YYYY'` rows. The PRMS side of the fixture is separately correct: the seeded row carries `target_date: 2026` (integer), matching prtest and `resolvedTargetDate = phaseYear` (`:1876-1880`). No test's outcome turns on the format — in `TTD-TEST-1`/`-3`, resolution step 2 matches on the id before any date compare |
| `TTD-TEST-3` falsifier still intact after the catalog changed underneath? | ✅ Canonical still resolves from `rows[0]` → `6` (`:2497` `LIMIT 1`, `:2522`), so both rows share it while `toc_indicator_target_id` `700004`/`700005` differ. Named mutation re-traced: keying lookup 2 on `resolvedNumberTarget` makes meta 2 match meta 1's row `9000`, leaving `9001` inactive → `activeIdsAfterSecondSave` `[9000]` vs `[9000, 9001]` → red |
| Is the new `length > 0` guard non-vacuous? | ✅ At the sweep instant no write has run and the only row is the seed literally carrying `contributing_indicator: 6`, so the predicate can be false **only** because `is_active` was just flipped. Under the designed retire-last fix the same check fires with the row still active → green |
| Is splitting `TTD-TEST-2` into two `it`s conformant? | ✅ The Description constrains the **`describe` count** (still three), and `TTD-T-1`'s `Implements` explicitly claims the *lost contribution* `BUT` clause |

**`ADVISORY` findings (recorded; never gate, never become tasks) — three are forward pointers and MUST be copied into the named task's brief**

- **→ `TTD-T-2` · RELIABILITY · the one that can bite.** `TTD-TEST-2`'s phantom meta (`number_target: 42`) is unresolvable against its empty `catalogMetas`, so **test A is green-able only if `TTD-T-2` honours `TTD-R-9`** ("instead of silently inserting"). `design.md` §7 lookup (c)'s *"canonical value this path writes"* branch would instead hit row `2235` and overwrite `contributing_indicator` with null — **turning test A red *after* the fix.** Settle in `TTD-T-2` before writing it: skip-or-warn on an unresolvable meta, and exclude already-touched rows.
- **→ `TTD-T-2` · READABILITY.** The two real catalog reads disagree on the `target_date` convention (year-form at `toc-results.repository.ts:1224`, date-form tolerated at `:2489`). When `TTD-T-2` lands, give one `catalogMetas` entry the `'2026'` year form so design §7's *"trying both stored conventions"* is actually staged rather than assumed.
- **→ `TTD-T-3` · RESILIENCE.** `ttdMatches` compares with `===`, so a TypeORM `Not(In([...]))` retire criterion from `TTD-T-3` would match zero rows and be **silently inert** in this fake. `TTD-T-3` owns this file and must teach the fake before trusting a green there.
- READABILITY (carried from attempt 1, unapplied by instruction): default `.sort()` on row ids is lexicographic — harmless at 4-digit PKs, latent if a future fixture crosses a digit boundary.

**Requirements covered:** `TTD-R-1`, `TTD-R-2`, `TTD-R-5`, `TTD-R-6` (the `BUT` clause); `TTD-AC-1`, `TTD-AC-2`, `TTD-AC-4`, `TTD-AC-8`. Defect-class gates D1, D2, D3 armed; D4 held (zero regressions).

**Decisions made:** (1) `P-3` and `P-10` settled at source and recorded into `tasks.md` (`TTD-T-1`, `TTD-T-5`) — no approved requirement's meaning changed; `requirements.md` and `design.md` untouched. (2) The catalog-stub enrichment ruled inside `TTD-T-1`'s scope under its own Red run clause, rather than widening `TTD-T-2`'s `Files:` list — the alternative the Reviewer offered, deliberately declined. (3) The two readability advisories deliberately not applied, as out of task scope.

**Issues encountered:** one Reviewer `FAIL` (attempt 1, the missing `is_active: false` assertion), fixed in attempt 2. Review rounds used: **2 of the 2 budgeted** (`design.md` §10.1) — the budget is met, not exceeded, but `T-2 … T-5` now have no review-round headroom. Flagged to the user at the Step 5 gate.

**Final verification:** 4 red on their behavioural assertions (the deliverable — red-first), 215 green, zero regressions, lint clean, append-only, zero production diff. **Status: `PASS`.**

### `TTD-T-2` — Identity resolution, scoped lookups, upsert — `PASS`

**Attempt 1 — Reviewer `PASS`** · 2026-09-25 · Implementer T2 / Reviewer T3, effort `xhigh`
- runtime events: none
- files changed: `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts` (+338 / −56, one production file). `results-toc-results.repository.spec.ts` untouched by this task (its `+443/−0` is `TTD-T-1`'s PASSed diff).
- what landed: `interface TocTargetCatalogMeta`; the per-indicator cache now holds `{number_target, target_date, catalogMetas}`; `getCanonicalIndicatorTarget` replaced by `getIndicatorTargetCatalog` (both ToC doors joined at once with `CONVERT(... USING utf8mb4)`, copied verbatim from the live production query at `:3420-3421`; `LIMIT 1` dropped, canonical derived from `rows[0]` of the same result set, year-filter fallback retained); new private helpers `resolveTargetIdentity` and `resolveExistingTargetRow`; `touchedTargetIds` collection for `TTD-T-3`.
- Implementer verification: 3 green / 1 red as designed. Wider scoped suite `1 failed, 290 passed, 291`. `tsc --noEmit` clean; `eslint` clean.
- **Leader evidence re-run (non-author, Leader-inline): `VERIFIED`.** Scoped suite `Test Suites: 1 failed, 19 passed, 20 · Tests: 1 failed, 290 passed, 291`. Per-test: `TTD-TEST-1` ✓, `TTD-TEST-2` test A ✓, `TTD-TEST-3` ✓, test B ✕ at `:920` (`Expected: true / Received: false`) — the only failure, and it is `TTD-T-3`'s gate. `tsc --noEmit` exit 0; `eslint` exit 0; `git status --porcelain` shows only the two expected files.
- **`TTD-AC-10` verified independently by the Leader against `HEAD`**, not taken from the report: both `resolvedNumberTarget` blocks byte-identical, shifted only (`HEAD:1871-1874 → 1902-1905`, `HEAD:1956-1959 → 2008-2011`).
- Reviewer `STATUS: PASS` — Done list fully met; all three row lookups scoped to `result_toc_result_indicator_id`; sweep still blanket and still pre-loop (`TTD-T-3`'s work not shipped early); one production file; spec file unchanged.

**Reviewer answers to the two adjudication questions the Leader posed**

- **Q1 — is the backfill correct?** *Yes, both clauses of the legacy row scenario.* Identity step 3 supplies `tocTargetId`; lookup (b)/(c) finds the NULL row; the UPDATE branch spreads `payload` carrying `toc_indicator_target_id`, so the column is filled in place and no row is inserted. The never-regress claim is **verified**: `tocTargetId ?? targetInfo?.toc_indicator_target_id ?? null` reads a real column (`result-toc-result-target-indicators.entity.ts:58-63`, no `select:` projection on any `findOne`), so an unresolved identity writes the stored value back unchanged. `toNumberOrNull('2026-01-01') → null`, so a date-string `target_date` falls through to `phaseYear` rather than poisoning the year compare.
- **Q2 — is the missing `TTD-AC-5` gate a FAIL against `TTD-T-2`?** *No — it is a **spec gap**, and `TTD-T-2` is the wrong task to charge for it.* `TTD-T-2`'s binding Done list never names the legacy-row test; only its *Red run* prose does, and its `Files:` is the repository alone, so it is structurally unable to write one. Authorship of the three `describe` blocks belonged to `TTD-T-1`, which closed `[x]` without it. **The only existing task that can own it is `TTD-T-3`** — `Type: server + tests`, `Depends on: TTD-T-2`, and the only remaining task whose `Files:` already lists `results-toc-results.repository.spec.ts`. No new task is needed. Until then `TTD-AC-5` is implemented-but-unpinned, and **`tasks.md` §4's row "`TTD-R-4` · `AC-5` … | `TTD-T-2`" overstates coverage.**
  → **Escalated to the user** (a spec gap is not the Leader's to close by widening `TTD-T-3` unilaterally). Not yet actioned.

**`ADVISORY` findings (recorded; never gate, never become tasks)**

- **RISK — carry to the D5 HITL check on prtest.** The both-doors join narrows the canonical row set versus `HEAD`'s single-door canonical read, and `TTD-OQ-4` records that the two doors disagree in practice (`6` vs `17…127`). `TTD-AC-10`'s automated falsifier (diff-clean lines) **cannot see this**; an empty intersection would silently move stored `number_target` from the canonical to the payload value — the exact D9 class. The join is copied verbatim from the live production query at `:3420-3421`, so it is spec-mandated and precedented, **but the post-deploy check on prtest must explicitly assert that indicator `2563`'s stored `number_target` is still `6`.**
- **RELIABILITY — actioned as a Leader correction, see below.** The `claimedByAnother && !identityResolved` skip can drop a *legitimate* meta carrying a typed `contributing_indicator`.
- READABILITY — `design.md` §3.2 says "own number then canonical"; §7 lists canonical first; the code does canonical first. Worth reconciling, since the order is what triggers the advisory above.
- RELIABILITY — `tocTargetId ?? targetInfo?.toc_indicator_target_id` can overwrite a stored non-null id with a *different* resolved one when the row was matched by PK or number+date. Referred to the Implementer for an opinion, not a change.
- RESILIENCE — `if (savedTarget?.indicators_targets != null)` degrades silently to the collapsing behaviour if a repository ever returned a saved row without its generated PK. Referred likewise.

**Leader correction — recorded at the moment of the decision (does NOT consume a rework attempt; the accounting rule counts only a Reviewer `FAIL` or an Implementer-reported verification failure)**

My own Step 2.2 adjudication for this task was **too broad and I am correcting it**. I instructed: *"an unresolvable meta is NOT inserted; it is skipped with a `TTD-R-9` warning."* The approved clause I grounded it on is narrower — the *lost contribution* scenario forbids inserting *"a second row for `M` carrying `contributing_indicator` **null**"*. It says nothing against inserting a row that carries a real value.

Under my over-broad instruction, an unresolvable meta **carrying a reporter's typed contribution** is silently dropped, and the Reviewer showed the path is reachable: `resolvedNumberTarget` is shared by every meta of the indicator, so once any meta claims the row carrying it, each later unresolvable meta collides and is skipped. With `TTD-OQ-4` documenting that the two ToC doors disagree in production, this is not hypothetical. **A silently dropped contribution is the exact defect class this spec exists to eliminate, and is strictly worse than a duplicate row** — the duplicate is visible, recoverable, and is what `TTD-T-4` fixes; the lost value is none of those.

Correction dispatched to the Implementer: skip **only** when the unresolvable, colliding meta's `contributing_indicator` resolves to `null`; when it carries a value, insert it and still log the `TTD-R-9` warning. Additionally order `numberCandidates` **raw-first**, so an unresolvable-by-id meta gets its own row before it can collide on the shared canonical — to be abandoned and reported if it moves any currently-green test. Expected end state unchanged at 3 green / 1 red, with test A staying green (its phantom carries `null`, so the narrowed skip still covers it).

**Correction round 1 applied — Implementer report, Leader-verified below**
- three edits, all inside `saveInditicatorsContributing`'s two branches plus `resolveExistingTargetRow`: the skip condition gains `&& resolvedContributingIndicator === null`; `contributing_indicator` is hoisted to a local reused by the payload; `numberCandidates` reordered **raw-first** (`[rawNumberTarget, resolvedNumberTarget]`).
- `resolveTargetIdentity`, the catalog read, the touched-set mechanism and the (a)→(b)→(c) lookup order are unchanged.
- Implementer trace of the path the correction rescues: indicator `501`, stored row PK `2235` (canonical `6`, `contributing_indicator: 6`); payload carries meta1 (echoes PK `2235`) and meta2 (ToC id `700003`, raw `number_target: 42`, **`contributing_indicator: 8`**). meta1 resolves and claims `2235`; meta2 fails identity at all three steps, lookup (c) tries raw `42` (miss) then canonical `6` (hits `2235`, already in `touchedTargetIds` → `claimedByAnother`), and because `resolvedContributingIndicator = 8 ≠ null` the skip no longer fires → **INSERT**, preserving the reporter's typed `8`. Before the correction that value was dropped entirely.

**Leader decisions on the two referred advisories — recorded at the moment of the call**

- **Advisory 1 (`tocTargetId ?? targetInfo?.toc_indicator_target_id` overwriting a non-null stored id) — ACTIONED.** Flip to `targetInfo?.toc_indicator_target_id ?? tocTargetId ?? null` (fill only when absent). This is **tightening to `TTD-R-4`'s literal mandate, not widening scope**: the requirement is scoped to a row whose column is *NULL*, and its purpose clause — *"so the next save resolves by identity"* — is defeated by rewriting an identity that already exists. The Implementer established reachability: a row matched by (b) PK-echo holding id X, where step-3 resolution independently yields a different catalog meta's id Y, silently rewrites the row's identity; `TTD-OQ-4` records the two ToC doors disagreeing in production, so the path is live. The failure modes are asymmetric and settle the tie — a **stale id left alone** stays recoverable through lookup (c)'s number+date fallback, whereas an **id overwritten wrongly** makes the row unfindable by its true identity on every future save. Correcting genuinely bad stored ids belongs to `TTD-T-5`'s data repair, not to this write path.
- **Advisory 2 (`if (savedTarget?.indicators_targets != null)` degrading silently) — NOT actioned, recorded.** The Implementer's own analysis establishes it is **not reachable in production** (TypeORM returns the generated PK on an auto-increment `.save()`). Its reasoning is preserved here because the failure mode would be severe if it ever became reachable: the row would never enter `touchedTargetIds`, and a later meta sharing the canonical number could match and overwrite it through lookup (c) — silently reproducing the D3 collapse `TTD-TEST-3` exists to forbid. A `Logger.warn` was proposed. Defensive instrumentation for an unreachable state is scope this spec did not approve, and an advisory is recorded rather than built; the record is the deliverable.

**Correction round 2 applied (advisory 1) — Leader-verified, task CLOSED `PASS`**
- both `payload.toc_indicator_target_id` sites flipped to `targetInfo?.toc_indicator_target_id ?? tocTargetId ?? null`, each carrying a comment tying the choice to `TTD-R-4`'s NULL-scoped mandate and the asymmetric-failure reasoning.
- Implementer re-trace of `TTD-AC-5`: a stored row with an explicit `null` still backfills — `null ?? 624180 ?? null` = `624180`, since JS `??` treats explicit `null` as nullish. Only an *already non-null* stored id is now protected. Behaviour of the legacy-row scenario is unchanged; only the overwrite path is closed.
- **Leader final evidence re-run (non-author, Leader-inline): `VERIFIED`.**
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results|contributors-partners|share-result-request"` → `Test Suites: 1 failed, 19 passed, 20 · Tests: 1 failed, 290 passed, 291`. Sole red: test B (`:920`) — `TTD-T-3`'s gate.
  - **`TTD-AC-10` re-proved independently against `HEAD`**, not from the report: both `resolvedNumberTarget` blocks (now `:1902-1905` and `:2030-2033`) diffed byte-for-byte against `HEAD:1871-1874` and `HEAD:1956-1959` → **IDENTICAL**.
  - `npx tsc --noEmit` → exit 0, zero output. `npx eslint <file> --quiet` → exit 0.
  - `git status --porcelain`: only the two expected files plus the untracked spec folder.

**Requirements covered:** `TTD-R-3`, `TTD-R-4`, `TTD-R-5`, `TTD-R-9`; `TTD-AC-3`, `TTD-AC-8`, `TTD-AC-10`. **`TTD-AC-5` is implemented and Reviewer-verified but UNPINNED by any assertion** — see the escalated spec gap above.

**Review rounds:** 1 Reviewer verdict (`PASS`), plus 2 Leader-initiated correction rounds. Per the accounting rule neither correction consumes a rework attempt — an attempt is consumed only by a Reviewer `FAIL` or an Implementer-reported verification failure.

**Issues encountered:** my own Step 2.2 adjudication was over-broad and was corrected mid-task (round 1); advisory 1 required a second tightening round to match `TTD-R-4`'s literal mandate. Both are recorded above with their grounds.

**Final verification:** 290 green / 1 red (the red being `TTD-T-3`'s designed gate), `tsc` clean, `eslint` clean, `TTD-AC-10` proved, sweep untouched, one production file. **Status: `PASS`.**

### `TTD-T-3` — Retire only the untouched rows — `PASS`

**Attempt 1 — Reviewer `PASS`** · 2026-09-25 · Implementer T2 / Reviewer T3, effort `xhigh`
- runtime events: none
- files changed: `results-toc-results.repository.ts` and `results-toc-results.repository.spec.ts` (the task's two declared files, nothing else). Spec file **`+659 / −0` — pure append**, so `ttdMatches` was extended by addition without editing a single existing line.
- what landed: `Not` added to the `typeorm` import; the blanket pre-loop sweep **removed**; `const touchedTargetIds = new Set<number>()` hoisted to run unconditionally in its place (`:1894`, outside the `Array.isArray` guard at `:1896`); a narrowed retire pass added after the loop (`:2024-2034`) keyed on `indicators_targets: Not(In(Array.from(touchedTargetIds)))`. `ttdMatches` taught to evaluate a real `FindOperator`; new `describe` block `TTD-TEST-4` with two `it`s.
- Implementer verification: full scoped suite `20 passed / 293 passed`. Test B (`:920`) **green**. Both new cases red pre-change on `expect(operator).not.toBeNull()`, green after. Disqualifier applied for real: mutating to `if (touchedTargetIds.size > 0)` turned the condition-(a) test red (`toHaveLength(2)`, stored rows stayed active) while (b) stayed green; mutation reverted and confirmed removed.
- **Leader evidence re-run (non-author, Leader-inline): `VERIFIED`.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results|contributors-partners|share-result-request"` → `Test Suites: 20 passed, 20 · Tests: 293 passed, 293`. `TTD-AC-10` re-proved against `HEAD` (both blocks `:1903`, `:2053` **IDENTICAL**). No diff hunk touches the parent sweep's `results_toc_results_id`. `npx tsc --noEmit` exit 0; `npx eslint` on both files exit 0; `git status --porcelain` shows only the two expected files.
- **Leader independent verification of the load-bearing premise.** The whole task rests on `Not(In([]))` matching every row, and the fake was *taught* that semantics — so a false premise would have produced a confidently wrong fake. Verified at source in `node_modules/typeorm/query-builder/QueryBuilder.js:738-752`: `case "in"` returns the literal `"0=1"` when `parameters.length <= 1`; `case "not"` wraps its child as `NOT(...)`. Net: `NOT(0=1)` → true for every row.

**Reviewer `STATUS: PASS`** — it re-verified the rendering independently rather than accepting the brief's quote, and answered every scrutiny point:

| # | Finding |
|---|---|
| 1 | **Condition (a) holds in production SQL, not merely in the fake.** `touchedTargetIds` at `:1894` is outside the `Array.isArray` guard at `:1896`; the retire pass at `:2024-2034` sits after the guard's closing brace. `QueryBuilder.js:1030-1043` builds `{operator:'not', condition:{operator:'in', parameters:[aliasPath]}}` (an empty `In` contributes no parameters), `:738-744` returns `"0=1"`, `:752-753` wraps it. Net SQL `... AND NOT(0=1)` — **byte-equivalent in effect to the removed blanket sweep** |
| 2 | `touchedTargetIds` is per-indicator and per-payload-entry, declared inside `if (targetIndicators)` within the indicator loop — cannot leak across indicators. The second declaration at `:2050` is block-scoped to the brand-new-indicator branch, whose `save(...)` carries no PK so no `result_indicators_targets` row can reference it; the "no retire needed there" reasoning is correct, and the old sweep was indeed confined to the `if` branch |
| 3 | `indicators_targets` is `@PrimaryGeneratedColumn()` (`result-toc-result-target-indicators.entity.ts:13-14`) — never NULL, so no row escapes `NOT(col IN (…))` through three-valued logic |
| 4 | **The fake is faithful, not merely non-inert.** `FindOperator.js:46-72` confirms `type`/`child`/`value` behave as assumed; `In([])` is **false** for every row and `Not(In([]))` **true** — the same polarity as `NOT(0=1)`, not the inverted reading that would have made the test assert the opposite of the requirement. The unknown-type `throw` stops a future operator matching nothing silently |
| 5 | `R-8.b` / parent sweep intact at `:1814-1822`; the first post-import hunk starts at `:1823`. Its `expect(indicatorRepo.update).toHaveBeenCalledTimes(1)` (spec `:531`) is on the *indicator* repo, unaffected by the new *target* repo call |
| 6 | **`TTD-AC-8` closed, including the indirect path.** Hunk is `@@ -552,3 +552,662 @@`; everything at `:1-552` byte-identical. `ttdMatches`'s non-operator branch is still `row[key] === value`, so earlier blocks read as before; the new `targetRepo.update` call is filtered out of the `updatedTarget()` helper at `:67` (no `contributing_indicator` key) and of `:800` (`includes()` on a numeric array rejects the operator object) |
| 7 | D10: nothing committed; `TTD-T-2`'s work is present in the same tree. The pair is coherent and condition (b) transfers intact to the commit step |

**`ADVISORY` findings (recorded; never gate, never become tasks)**

- **RISK → carry to the D5 HITL check on prtest.** Condition (a) rests entirely on TypeORM's `parameters.length <= 1 → "0=1"` branch, which **no test exercises against real MySQL** (`requirements.md` §9 D5 already records this blind spot). At the prtest check, add one explicit case: save a section for an indicator whose `targets` is omitted and confirm its rows go `is_active = 0`. A silent inversion would leave stale rows active — the exact double-count `aow-bilateral.repository.ts:938-948` would surface.
- RELIABILITY — an indicator appearing twice in one payload gets two retire passes, the second retiring the first's rows. The removed blanket sweep behaved identically, so this is pre-existing shape, not a regression. No action.

**Requirements covered:** `TTD-R-6`, `TTD-AC-6`, `TTD-AC-8`; the *lost contribution* scenario's `BUT` clause. Defect gates D4 and D10 held.

**Decisions made:** none beyond the task as written. `TTD-AC-5` was deliberately kept **out** of this task's scope despite `TTD-T-3` being the only remaining vehicle for it — widening an approved task is the user's call, and the gap stays escalated.

**Final verification:** full scoped suite **293/293 green**, `tsc` clean, `eslint` clean, `TTD-AC-10` proved, parent sweep untouched, pure-append spec diff. **Status: `PASS`.**

### `TTD-T-4` — GET: stop overloading the PK field, match the merge on the ToC id — `PASS`

**Attempt 1 (two rounds) — Reviewer `PASS`** · 2026-09-25 · Implementer T2 / Reviewer T3, effort `xhigh`
- runtime events: none
- files changed: `results-toc-results.service.ts` (+117/−17), `results-toc-results.service.spec.ts` (+192), `dto/create-results-toc-result-v2.dto.ts` (+8), and **one line** in `repositories/results-toc-results.repository.ts` (see the scope ruling below).
- what landed: a private `extractTargetYear()` (number passthrough → `Number(value)` → `new Date(value).getUTCFullYear()`, mirroring the repository's `extractYear`); `toc_indicator_target_id` added to both target-shape types and both object-literal write sites; the merge rewritten to key on `toc_indicator_target_id` first, falling back to number+year **only** when that field is null/undefined; the DTO field with `@ApiPropertyOptional`.
- **Leader evidence re-run (non-author, Leader-inline): `VERIFIED`.** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results|contributors-partners|share-result-request"` → `Test Suites: 20 passed, 20 · Tests: 297 passed, 297` (218 at spec start). `tsc --noEmit` exit 0; `eslint` on all four files exit 0; `TTD-AC-10` re-proved against `HEAD` (both blocks `:1904`, `:2054` **IDENTICAL**); `repository.ts` moved from `488/72` to `489/72` — exactly one inserted line.

**Round 2 — the `getRTRPrimaryV2` SELECT gap, and the Leader scope ruling it forced**

The Implementer disclosed in round 1 that `getRTRPrimaryV2` does **not** `SELECT rit.toc_indicator_target_id`, so every stored target reached the merge with the field `undefined`. I verified it at source. The consequence was worse than an inert optimisation: `design.md` §6 states the contract as *"**Additive.** **Each target** gains `toc_indicator_target_id`"* — *each*, not only catalog-only ones — and `TTD-R-7` requires a meta to *"carry its ToC id in a field that means the ToC id."* With the column unselected, prtest row `2235` (which holds `624180`) would report `null`, and the task's own primary merge key would be dead data.

**Leader ruling:** adding `rit.toc_indicator_target_id,` to that SELECT is **inside `TTD-T-4`'s mandate**, not scope growth, even though `repository.ts` is absent from the task's `Files:` list — it is the minimum that makes approved behaviour operative, and it is a read-only projection that stores nothing. I directed it explicitly; the Implementer complied while recording that it had not decided this itself, and I asked the Reviewer to audit **the ruling**, not just the diff.

**Reviewer verdict on the ruling — agreed**, with an independent inertness proof I had not done:
> `tasks.md`'s `Files:` list is a derived planning artifact that was drafted assuming the raw-row branch already carried the column; without the SELECT, the merge's primary key is dead for every stored row and the approved mechanism would pass its tests while never firing in production — the exact "green test certifies a no-op" outcome my contract requires me to refuse. I verified the addition is inert: `getRTRPrimaryV2` has no `DISTINCT` and no `GROUP BY` (`repository.ts:514-522` is `WHERE` + `ORDER BY`), so one extra projected column cannot change row count, order or any stored value.

**Reviewer verdict on the Implementer's in-memory backfill — endorsed, and inside `TTD-R-10`:**
> `TTD-R-10` says each meta is reported **once** — once, not zero. Without the stamp, two catalog metas that both satisfy the fallback (notably any meta whose `number_target` is `null`, which makes `sameNumber` vacuously true) would both `continue` onto the same legacy row and the second meta would vanish from `targets`. The stamp is on the in-memory merge object only; `indicators_targets` is untouched, so `TTD-T-2` lookup (b) still resolves on the real PK.

**⚠️ CORRECTION TO THE RECORD — the Leader's consumer premise was WRONG; the conclusion survives.**

I told the Implementer, and recorded, that the client's `result-review-drawer` sits on *"a different endpoint"*. **That is false.** The Reviewer caught it and I re-verified at source: `ResultsService._loadBilateralBaseData` (`results.service.ts:~3905-3910`) calls **`this._resultsTocResultsService.getTocByResultV2(resultId)`** — the very method `TTD-T-4` changed — and forwards it as `detail.tocMetadata`. The drawer is at `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.ts` (line drifted `724 → 731`): **re-pathed, not stale**, and it consumes this payload.

The no-break conclusion still holds, for a different and verified reason: the drawer maps with `any` and drops the unknown field, and sends `indicators_targets: null` for a catalog-only meta, which `resolveExistingTargetRow` null-guards (`repository.ts:2883`) while `resolveTargetIdentity` resolves it via catalog `number_target` + `target_date` (`:2807-2820`). Server-side, no consumer outside the module reads the new field (the bilateral QA mappers read `contributing_indicator` only).

**Anyone doing the next consumer sweep must use the corrected reason.** "Different endpoint" would mislead it into skipping a real consumer.

**`ADVISORY` findings (recorded; never gate, never become tasks)**

- **RELIABILITY → D5 HITL check on prtest.** No automated check proves the SELECT actually returns the column; the new test proves the mapping half only (legitimate, not tautological — the conversion code at `:664-690` is real and was `undefined` pre-fix). Extend the prtest check to: **row `2235` reports `toc_indicator_target_id: 624180`**.
- **RELIABILITY — an echoed id is trusted unvalidated.** The GET now reports a *heuristically resolved* ToC id on a legacy row whose DB column is still NULL. `resolveTargetIdentity` step 1 (`repository.ts:2788-2791`) trusts `target.toc_indicator_target_id` unconditionally, unlike step 2 which validates against `catalogMetas`. A mis-matched fallback could be echoed back and persisted. Narrow and self-healing per `TTD-R-4`; worth a follow-up, not a change here.
- RELIABILITY — a stored row with `target_date` NULL plus a catalog meta with a year still appends rather than merges. Identical to pre-fix behaviour and absent from the prtest shape. No action.
- READABILITY — `extractTargetYear` handles `2026`, `'2026'`, `'2026-06-30'` and `Date`; its docstring names the SQL `REGEXP` it mirrors. Nothing to change.

**Tooling note:** CodeGraph MCP tools (`codegraph_context` / `codegraph_impact`) were **unavailable in the subagent's session** despite the brief requiring them. The Implementer flagged it rather than skipping silently and substituted `grep -rln "ResultTocIndicatorTargetDto"` (self-referenced only) plus a clean whole-server `tsc --noEmit`; the Reviewer judged that adequate for a DTO addition. **Future briefs should not assume CodeGraph is reachable from a subagent.**

**Requirements covered:** `TTD-R-7`, `TTD-R-10`, `TTD-AC-9`, `TTD-AC-8`, `TTD-AC-10`. Defect class D6 held.

**Final verification:** scoped suite **297/297 green**, `tsc` clean, `eslint` clean, `TTD-AC-10` proved, one-line read-only repository change audited and endorsed. **Status: `PASS`.**

### `TTD-T-5` — Repair the existing rows + detection query — IN PROGRESS (`[~]`)

**`TTD-OQ-2` — RESOLVED by the Leader, 2026-09-25.** Delivery form is a **reviewed SQL statement applied by hand** (`repair.sql`), not a migration. Grounds: `design.md:164` records that *"House practice applies `validation_*`-adjacent data work by hand"*, and the task's own `Files:` line names `repair.sql` first. The user asked to finish the spec without re-opening the question, and the documented house default answers it.

**`P-15` — SETTLED at source, and it CONTRADICTS the spec's hypothesis. The Disqualifier fired and was honoured.**

`TTD-T-5`'s Disqualifier says: *"the green check must be re-read from the environment (`SHOW CREATE FUNCTION`, not the stale repo copies)… If the live function text differs from `1762528725798-createValidtionP25.ts:139`, stop and re-derive — `UNVERIFIED` until then."* It differs. Re-derived:

| | Predicate on target rows |
|---|---|
| `design.md` P-15 **hypothesis** | *"every active row must hold `number_target > 0`, grouped per indicator with `COUNT = SUM`"* |
| **Live `validation_contributor_partner_P25` on prtest** | `AND COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1` — **at least one** active row with a positive `contributing_indicator` |

The live function's surrounding block also requires `rtr.toc_result_id IS NOT NULL` and `COUNT(rtri.result_toc_result_indicator_id) > 0`, joins `rtri` on `results_toc_results_id` with `is_active = TRUE AND is_not_aplicable = FALSE` and `rit` on `is_active = TRUE`, and its `COUNT(temp.valid) = SUM(temp.valid)` is over the outer `results_toc_result` rows — **not** over per-indicator target rows. It further branches on `planned_result`, `lead_by_partner`, `no_applicable_partner`, `institutions_count_leading` and an innovation-link path, none of which the repair touches.

**Current verdict: `validation_contributor_partner_P25(12055)` = `1` (TRUE).**

**Consequence — the repair's green-check risk is lower than the spec assumed, and now falsifiable.** The predicate needs *one* surviving active row with `contributing_indicator > 0`. Row `2235` carries `1.00`. So deactivating `2236`–`2256` while keeping `2235` **must** leave the verdict at `1`; the 21 NULL rows contribute nothing to it and cannot flip it. That is the prediction the owner's before/after comparison tests. `number_target` does not enter this predicate at all, so the spec's worry that a stored `0` could flip a result to invalid does not apply to **this** function.

> **Consumer note for `/akili-archive`:** `design.md`'s P-15 row and §12 should be corrected — they describe a predicate the live function does not use. Recorded, not silently patched, because it changes an evidence claim rather than a task instruction.

**Framing recorded for the repair's header, verified at source:** the code fix stops *new* duplication but does **not** self-heal `12055`. `results-toc-results.service.ts:656-690` pushes one target entry per **distinct active stored row** (deduped only by PK), so all 22 rows keep being reported; on the next save each arrives with a real PK, `TTD-T-2` resolves it via lookup (b), all 22 land in `touchedTargetIds`, and `TTD-T-3`'s retire pass therefore retires none of them. **The reported result `#9587` stays visibly broken until this repair runs** — the repair is not optional cleanup.

**Attempt 1 — Reviewer `PASS` on the artifact; task remains `[~]` pending the owner's run** · 2026-09-25 · Implementer T2 / Reviewer T3, effort `xhigh`
- runtime events: none
- deliverable: `docs/specs/bugfix/toc-target-row-duplication/repair.sql`. **The Implementer executed nothing** — no credentials, no connection, none sought.
- structure: header (spec id, P-10/P-15 evidence, predicted outcome, run-by-owner warning) → BEFORE snapshot + green check → abort guard 1 (conflicting contributions) → **abort guard 3b (conflicting ToC ids)** → `START TRANSACTION` + the `UPDATE` (`COMMIT`/`ROLLBACK` commented out, opt-in) → AFTER snapshot + green check → parameterless detection query.
- keeper precedence: non-null `contributing_indicator` → non-null `toc_indicator_target_id` → lowest PK, via `ROW_NUMBER() OVER (PARTITION BY result_toc_result_indicator_id …)`, deactivating `keeper_rank > 1`. `is_active = 0`, never `DELETE`.

**Leader evidence re-run — I executed every read-only statement in the file against prtest myself (the author could not). These are observations, not predictions.**

| Check | Result |
|---|---|
| BEFORE snapshot | ✅ runs clean — `12055` / `9587` / indicator `2563` / `active_rows 22` / `with_contribution 1` / `distinct_toc_ids 1` / `null_toc_ids 21`. Matches P-10 |
| Green check before | ✅ `validation_contributor_partner_P25(12055)` = **`1`** |
| Abort guard 1 (conflicting contributions) | ✅ **EMPTY** — no indicator has two active rows with differing non-null contributions |
| Abort guard 3b (conflicting ToC ids) | ✅ **EMPTY** |
| `EXPLAIN` on the `UPDATE` | ✅ parses and plans; `<derived3>` wrapper dodges MySQL 8's "can't reopen the same table for UPDATE"; after hardening, `r2` resolves `const` — **confirming `id 12055` and `result_code 9587` agree on this environment** |
| Keeper logic (read-only mirror of the ranking subquery) | ✅ rank 1 = PK **`2235`** (`contributing_indicator '1.00'`, `toc_indicator_target_id 624180`); rank 2 = `2236` (null, null) |
| AFTER snapshot statements | ✅ run clean (returning pre-repair numbers, nothing applied) |
| Secrets | ✅ none anywhere (`.cursorrules`) |

**🔴 The detection query's real finding — exposure is 13 indicators, not one**

Run against prtest, it flags **13** indicators. `12055` is *not* the worst:

| result_id | result_code | indicator | active_rows | with_contribution | distinct_toc_ids | null_toc_ids | distinct_number_date_pairs |
|---|---|---|---|---|---|---|---|
| 11524 | **9056** | 2441 | **57** | 1 | 0 | 57 | 1 |
| 12055 | 9587 | 2563 | 22 | 1 | 1 | 21 | 1 |
| 11337 | 8869 | 2345 | 10 | 1 | 0 | 10 | 1 |
| 11533 | 9065 | 2452 | 10 | 1 | 0 | 10 | 1 |
| 11994 | 9526 | 2552 | 9 | 1 | 1 | 8 | 1 |
| 11996 | 9528 | 2555 | 8 | 1 | 1 | 7 | 1 |
| 12000 | 9532 | 2557 | 8 | 1 | 1 | 7 | 1 |
| 11950 | 9482 | 2546 | 5 | 1 | 1 | 4 | 1 |
| 11123 | 8655 | 2285 | 4 | 1 | 0 | 4 | 1 |
| 11424 | 8956 | 2376 | 4 | 1 | 0 | 4 | 1 |
| 11030 | 8562 | 2384 | 3 | 1 | 0 | 3 | 1 |
| 6856 | 5290 | 903 | 2 | 1 | 0 | 2 | **2** |

Every flagged indicator has `rows_with_contribution = 1`, so the keeper precedence has a value-carrying row to preserve in each. `6856` is the one to inspect by hand — `distinct_number_date_pairs = 2` is the file's own documented "may not be this bug" signal (possibly a legitimate two-meta indicator).

**Reviewer `STATUS: PASS`**, with the scope question answered:
> **Repairing only `12055` is conformant.** `requirements.md` §3 puts *"Repair of the rows already created on prtest for `result_id 12055`, plus a detection query for the other environments"* in scope and *"PROD repair execution"* out of scope; `TTD-AC-7` names `12055`; `TTD-R-8` is a capability requirement that the generic statement satisfies. The 12 other results are exactly what the detection query exists to surface, and deciding them is the user's call, not a gap in this task… It should not be silent, though: the code fix does **not** self-heal these rows, so those 12 stay visibly broken (result `9056` at 57 active rows) until someone decides.

Reviewer's structural confirmations: candidate PKs come only from the derived table filtered to `12055`, and the upward chain is 1:1, so no partial-partition risk · `ROW_NUMBER()` always yields exactly one rank-1 per partition, so **no indicator can reach 0 active rows** · the keeper precedence is aligned with the *live* green check, so the one row that can satisfy `MAX(contributing_indicator > 0)` is never the row deactivated — the `1 → 1` prediction follows from the statement's own ordering, not from a comment.

**Leader-directed hardening round (two RISK advisories, actioned — not scope growth, both harden the task's own deliverable against a named failure mode)**

1. **`result_code` pin.** `r.id = 12055` is a PK; on another environment that id is a different result, and the file explicitly ships a detection query *"for the other environments"*, so reuse is the expected path. `AND r.result_code = 9587` was added at every site that scopes to the result (BEFORE snapshot, both guards, the repair's ranking subquery — which needed a new `JOIN result r2` — and the AFTER snapshot). If the two ever disagree the statement matches nothing instead of repairing the wrong result. The two `validation_…(12055)` calls take a single PK by signature and carry an explanatory comment instead.
2. **Guard 3b — refuse an indicator holding more than one distinct ToC id.** The partition key is the *indicator*, not the meta, so re-pointing the literal at a result where one indicator holds two identified metas would deactivate a legitimate meta while guard 1 stayed silent — colliding with `TTD-AC-4`. The **refuse** option was chosen over re-partitioning: it fails loudly rather than silently changing behaviour. Verified **latent today** (all 13 flagged indicators have `distinct_toc_ids ≤ 1`), which is exactly why it had to be structural.

Left deliberately unchanged: `last_updated_by` unset (no safe value; guessing is worse) · `COMMIT`/`ROLLBACK` commented out · the detection query's scope (the Reviewer's suggestion to add `is_active`/phase columns for triage is a real improvement but scope nobody approved — recorded, not applied).

**`ADVISORY` findings (recorded; never gate, never become tasks)**

- **RELIABILITY — a forensic cost the owner should know before running.** `last_updated_date` carries `ON UPDATE CURRENT_TIMESTAMP(6)` (DDL `1694081217251`), so the repair **will** rewrite it on all 21 rows, erasing the `19:47:02` stamp this spec used as evidence. `created_date` survives, which is what preserves the trail of how the rows were generated.
- RESILIENCE — both guards are prose-enforced ("IF THIS RETURNS ANY ROW: STOP"). Folding them into the derived table would make them structural and survive an operator running the file as one script.
- RESILIENCE — an open transaction left after step 4 holds row locks on live data (`innodb_lock_wait_timeout` on a concurrent save). Commit or roll back promptly.
- READABILITY — the detection query filters only `rit.is_active = 1`; adding `r.is_active`, `rtr.is_active`, `rti.is_active` and a phase/`version_id` column would let the owner triage past-phase and deleted results (e.g. code `5290`) before deciding.
- The guards' shared false-negative boundary: neither can catch two genuinely separate metas that both have NULL `toc_indicator_target_id` — indistinguishable from duplicates by any column this table stores (`TTD-DD-6`). Documented in the guard's own comment.

**Status: the artifact is `PASS`; the TASK is `[~]`, not `[x]`.** Done items 2–4 require the owner to actually run the statement and record the before/after pair. Per the Reviewer: *"this passes the artifact… the task cannot be closed on this review alone."*

**DESCOPED BY THE USER — `repair.sql` deleted, 2026-09-25**

The user directed: *"Borrá el repair.sql, eso no lo necesitamos… Esos datos fallan en test, valen chimba y media."* The corrupted rows live on **prtest**, a disposable environment, so repairing them is not worth the risk or the time. The file was deleted; nothing was executed against any database at any point, so **no data was changed by this spec**.

**Consequences, recorded so they are not discovered later as a surprise:**

- **`TTD-R-8` and `TTD-AC-7` are NOT met, by explicit user decision** — not by oversight, and not by a failed attempt. `TTD-T-5` is descoped rather than completed.
- **`result_code 9587` (`12055`) and the other 12 flagged results stay visibly broken.** The code fix does not self-heal them (see the `T-5` framing note above: the GET reports one entry per active stored row, all of them get re-affirmed on save, so `TTD-T-3`'s retire pass retires none). **Anyone verifying this fix must test on a NEWLY created result, not on `#9587` or `#9613`** — retesting the old ones will read as "not fixed".
- The detection query was deleted with the file. Its **output is preserved** in the `T-5` entry above (13 indicators, worst `result_code 9056` at 57 active rows), which is the finding that mattered. The query itself is ~15 lines and can be re-issued on request if the pattern is ever suspected in PROD — where the same code defect existed before this fix and the same silent duplication would have accumulated.
- The `P-15` re-derivation above stands on its own and remains valuable: the live green check predicate is `COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1`, **not** the `number_target > 0` rule `design.md` claims. That correction is independent of the repair and still needs to reach `design.md` via `/akili-archive`.

**Spec outcome: 4 of 5 tasks delivered (`TTD-T-1` … `TTD-T-4`, all Reviewer `PASS`); `TTD-T-5` descoped by the user.**
