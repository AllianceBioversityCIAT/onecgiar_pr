# Execution — Bilateral evidence: public / private tag per piece of evidence

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/evidence-privacy-tag` |
| Ticket | P2-4110 |
| Approval Mode | ~~gated~~ → **pre-approved** from 2026-11-19 (user: "todo pasa preaprobado … cuando despierte esta tarea ya esté hecha"). Delivery mandate: push to `qa-development-2026-ss`, and also to `performance-refactor` if needed; push the Fetcher (T-11) to that repo's dev branch. Exceptions still stop: HALT, Pivot, budget tripwire, FATAL_FAIL, PRODUCT_BUG, destructive actions |
| Branch | `qa-development-2026-ss` (base `cfc18d03e`) |
| Leader | Claude Code session, `opus` (T1) |
| Implementer / Reviewer | `akili-implementer` wrapper (T2) / `akili-reviewer` wrapper (T3) |
| Budget (design §11) | 11 tasks · ~780 LOC · ~15 review rounds |
| Started | 2026-11-19 |

## Pre-flight (2026-11-19)

- In-flight spec check (`grep -rln "section-evidence\|result-review-drawer\|evidence.entity" docs/specs --include=tasks.md`): hits outside `archive/` are `bilateral/review-toc-only-editing` (not-started), `bugfix/bilateral-geography-extra-metadata` (not-started), `bugfix/innovation-developer-prefill-stale-lead-contact` (done), `bugfix/p2-3382-bilateral-long-term-degree` (not-started), `bugfix/p2-3542-section-bar-toc-tabs` (in-progress, only a D9 browser walk on TEST outstanding, no code), `bugfix/toc-target-row-duplication` (not-started). None is touching these files now.
- `akili doctor --agents`: `leader.md` → `primary-instructions` OUTDATED (matched 2.36.0). Implementer/Reviewer personas current. Not fixed here: `.agents/` is a shared file, which spec branches don't touch. Pending item: run `akili doctor --agents --fix` on `staging`.
- Local environment pre-check: `node -v` → v26.13.1 (contract says 20.x). No `onecgiar-pr-server/.env`; `docker info` fails (daemon off); no `mysql` client. **No database is reachable locally.**

## Execute-time spec edits

| Date | File · section | Change | Reason / approval |
|---|---|---|---|
| 2026-11-19 | `tasks.md` EVP-T-1 · Verification | Added an "Execute-time amendment": `migration:check` doesn't detect entity drift. T-1 closes on the QA-catalog red→green, `tsc` and a static up/down review. Real-DB up/down/up, the P-17 row count and `migration:check:ci` become an open gap (CI / validate HITL) | The premise was probed (`scripts/check-pending-migrations.ts:66-80` compares files against the migrations table) and no DB is reachable. User picked "Proceed, mark DB gates gap" at the Leader's question. The requirement meaning (NFR Data) is unchanged |

## Task Execution History

### EVP-T-2 — Pure visibility resolver · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer `akili-implementer` (T2, effort medium); Reviewer `akili-reviewer` (T3, effort high, lens checklist). It ran in parallel with EVP-T-1, with disjoint files.
- **Files changed:** `onecgiar-pr-server/src/api/results/evidences/utils/evidence-visibility.ts` (new), `evidence-visibility.spec.ts` (new).
- **Implementer verification:**
  - `npx jest src/api/results/evidences/utils/evidence-visibility.spec.ts` → `Tests: 11 passed, 11 total`.
  - Reds, quoted from the report:
    - Import red: `error TS2307: Cannot find module './evidence-visibility'`.
    - Stub `{visibility:'public', exposed:null}`: `Tests: 9 failed, 2 passed, 11 total`, for example `● link, is_public = 0 -> private, exposed false  - "exposed": false, - "visibility": "private", + "exposed": null, + "visibility": "public"`.
    - Mutation "treat NULL as private": `Tests: 2 failed, 9 passed` (`● link, is_public NULL (untagged) -> public, exposed null`, `● treats undefined is_public on a link as untagged`).
    - Mutation "files follow is_public": `Tests: 4 failed, 7 passed` (including `● file ignores is_public: is_public = 1 with is_public_file = 0 -> private`).
    - Both mutations were reverted; 11/11 after the revert.
  - `tsc`: 2 TS2345 errors in `innovation-pathway-step-four.service.spec.ts`. They come from EVP-T-1's entity change, not from this task's files (routed to T-1).
- **Evidence re-run (Leader inline):** `npx jest src/api/results/evidences/utils/evidence-visibility.spec.ts src/api/qa-catalog/qa-catalog.completeness.spec.ts --silent --reporters=summary` → `Tests: 41 passed, 41 total` (11 + 30) → **VERIFIED**.
- **Reviewer:** `STATUS: PASS`. All six §3.1 rows plus the two "file ignores is_public" rows are asserted. The function is pure and meets EVP-DD-2 and EVP-R-1. The task has a `Review: checklist` field and meets Review intensity, but the Leader spawned a Reviewer anyway under override (b)/(g), because the task creates a new exported symbol that T-5/T-6/T-7 consume.
- **ADVISORY (4R, not gating):**
  - RELIABILITY: a NULL/undefined `is_sharepoint` is treated as a link, but no test pins it. Suggested case: `{is_sharepoint:null,is_public:0}` → private.
  - READABILITY: `toFlag` uses `Boolean(Number(v))`, so a string `'true'` → false. Only 0/1/boolean are expected.
- **Not Done / Assumptions (verbatim, summarised):** "The tsc failure comes from the `Evidence` entity now declaring `is_public` as a required, non-optional property … most likely from the EVP-T-1 entity change." "Judgment call: `is_sharepoint` NULL/undefined treated as a link." No owed item for T-2 → not a continuation. The tsc item is carried to EVP-T-1.
- **spawns:** implementer 37 calls, ~150.6k tokens, ended complete; reviewer 7 calls, ~74.7k tokens, ended complete.
- **Requirements covered:** EVP-R-1 (derivation rule), EVP-DD-2.
- **Running totals vs budget:** tasks 1/11 · LOC ~140 / ~780 · review rounds 1 / ~15.
- **Gate:** auto-approved (pre-approved mode).

### EVP-T-1 — Migration + entity column `evidence.is_public` · PASS (attempt 3) · 2026-11-20

- **Attempts:** 3. Implementer `akili-implementer` (T2): effort high → xhigh → xhigh. At the T2 ceiling it was held at xhigh as a fresh spawn carrying the full attempt history. Reviewer `akili-reviewer` (T3, high). Effort ceiling: held xhigh.
- **Attempt 1:**
  - Files: `src/migrations/1793500000000-EVP-AddEvidenceIsPublic.ts` (new), `evidence.entity.ts`, `qa-catalog/definitions/not-for-qa.ts`.
  - Red, quoted: `uncatalogued column evidence.is_public: bind it to a field, or list it in NOT_FOR_QA or PENDING_CATALOG with a reason` — `Tests: 1 failed, 29 passed, 30 total`. With the entry: 30/30.
  - The Implementer reported `tsc` exit 0. **Evidence re-run (Leader inline): MISMATCH** — `tsc` exit 1, two errors `TS2345 … Property 'is_public' is missing … but required in type 'Evidence'` at `ipsr/innovation-pathway/innovation-pathway-step-four.service.spec.ts(507,64)` and `(613,64)`. Implicit FAIL.
- **Attempt 2:**
  - Files: `evidence.entity.ts`. Changed `is_public!:` to `is_public?: boolean | null`, because the pool spec must stay unedited (AC 10).
  - `tsc` exit 0, completeness 30/30, IPSR step-four 6/6.
  - The `src/api/results/evidences` run was killed by an OS low-memory reap before it produced a result. Runtime event: worker verification reaped. The Leader killed the orphaned jest/tsc trees and serialized all workers from then on.
  - **Leader re-run:** `evidences.repository.spec.ts` failed on G1, G2 and G6 (`EvidencesRepository.createQueries (entity parity guard) › G1 names every replicable entity column in the INSERT column list`, and the same for G2 and G6). `Tests: 3 failed, 111 passed, 114 total`. Implicit FAIL.
- **Attempt 3:**
  - Files: `evidences.repository.ts`. Added `is_public` to the `createQueries` phase-copy `findQuery`, the INSERT column list and the INSERT SELECT half.
  - Before: `3 failed, 15 passed, 18 total`. After: 18/18.
  - `npx jest src/api/results/evidences src/api/qa-catalog/qa-catalog.completeness.spec.ts src/api/versioning` → `12 passed / 177 passed`. `tsc` exit 0.
- **Evidence re-run (Leader inline):** `npx jest src/api/results/evidences src/api/qa-catalog/qa-catalog.completeness.spec.ts src/api/versioning src/api/ipsr/innovation-pathway/innovation-pathway-step-four.service.spec.ts --silent --reporters=summary --coverage=false -w 2` → `Test Suites: 13 passed, 13 total · Tests: 183 passed, 183 total`. `tsc` exit 0 (re-run after attempt 2) → **VERIFIED**.
- **Reviewer:** `STATUS: PASS`. The migration meets §3.2 (idempotent `up` guarded by `information_schema` with bound params, TINYINT NULL with no default, guarded `down`, four futures). The entity meets §3.1. The not-for-qa reason text is exact. The `createQueries` edit meets EVP-R-11: without it, a phase rollover would make a private link read public (D10). It is pool-neutral, since NULL stays NULL.
- **ADVISORY (4R, not gating):**
  - DoD gaps must stay open (see below).
  - Kaizen candidate: the Consumers sweep for a new column should grep the `createQueries` / replicable copy SQL.
  - MySQL ≥ 8.0.12 uses ALGORITHM=INSTANT for a trailing nullable ADD COLUMN; P-17 is still required.
  - `down` loses the tags, as documented.
  - Run the full qa-catalog suite on a clean tree or in CI: the `qa-catalog.snapshot.spec.ts` (CRLF) and `qa-catalog.module.spec.ts` (Node v26 `buffer-equal-constant-time`) failures are inferred to be environmental, not measured.
  - Cosmetic: use a local alias for the TABLE constant.
- **Decisions:**
  - The property is optional in TS: the column metadata is unchanged and no pool spec is edited.
  - `createQueries` was outside the expected-files list. The parity guard forced it and EVP-R-11 backs it. It doesn't overlap T-3's region (`:420-450`).
- **OPEN GAPS (not passed, owned by CI / `/akili-validate`):** migration up/down/up on a real DB; `npm run migration:check` / `migration:check:ci`; P-17 `evidence` row count on TEST. Probe: no `.env`, `docker info` fails, no `mysql` client (Leader pre-flight, 2026-11-19).
- **Not Done / Assumptions (verbatim gist):** "DB gates (migration run and `migration:check`) remain the approved gap. I created no `.env`." No owed item → not a continuation.
- **runtime events:** verification reaped by low memory ×2 (attempt 2, plus T-7 in parallel) → the Leader killed orphaned processes and serialized workers. No attempt consumed.
- **spawns:** implementer#1 39 calls ~143.8k tokens ended complete (MISMATCH); implementer#2 14 calls ~117.7k ended partial (reaped run); implementer#3 9 calls ~116.7k ended complete; reviewer not reported by host.
- **Requirements covered:** EVP-R-1 (storage), NFR Data, EVP-R-11 (phase copy).
- **Running totals vs budget:** tasks 2/11 · LOC ~275 / ~780 · review rounds 2 / ~15.
- **Gate:** auto-approved (pre-approved mode).

### EVP-T-7 — AI quality payload honours link visibility · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer T2 (medium); Reviewer T3 (high).
- **checkpoints:** 1 (OS low-memory reap killed the worker's jest and tsc runs; the worker stopped by the reap notice instead of retrying). A fresh worker was respawned with the checkpoint report copied verbatim.
- **Files changed:** `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/evidence.mapper.ts` (+17/−7), `bilateral-quality-payload.builder.spec.ts` (+76, new `describe('EVP-R-10: link visibility from is_public')` with 4 tests; no existing expectation edited).
- **Red (before the fix):** `-t "EVP-R-10"` → 1 failed, 3 passed: `- "link": null, + "link": "https://example.org/contract.pdf", - "visibility": "private", + "visibility": "public"`. This matches B-4.
- **Mutation "NULL ⇒ private"** (`is_public: row?.is_public ?? 0`): `× legacy link (is_public NULL) stays public with the normalized link` — `- "link": "https://www.example.org/a", + "link": null`. Reverted.
- **Implementer verification:** `npx jest src/api/bilateral/services/quality-assessment` → 6 suites / 263 tests passed; `tsc` exit 0.
- **Evidence re-run (Leader inline, after the revert):** same command → `Test Suites: 6 passed, 6 total · Tests: 263 passed, 263 total` → **VERIFIED**.
- **Review intensity:** not met. `Consumers` names the builder spec (condition 3 fails), and override (f) applies (privacy/link leak). A Reviewer was owed.
- **Reviewer:** `STATUS: PASS`. EVP-R-10 is met term by term. File output is unchanged (§3.1 note). The disqualifier is clear. At runtime, `evidence_array` is loaded as a TypeORM relation, so `row.is_public` is populated (`bilateral.service.ts:1325`).
- **ADVISORY (4R, not gating):**
  - `source` uses `Number(is_sharepoint) === 1`, while the resolver uses `Boolean(Number(x))`. They could drift for values other than 0/1 (none exist today).
  - A string `"0"` now reads private for files. This is fail-closed, and the driver never produces strings.
- **Not Done / Assumptions (gist):** the wider `evidence_array` consumer suites outside quality-assessment were not run. No owed item: the task's Consumers list names only the builder spec.
- **runtime events:** low-memory reap ×1 → checkpoint respawn (rung: checkpoint, not a runtime-ladder rung).
- **spawns:** implementer#1 24 calls ~151k ended checkpoint; implementer#2 7 calls ~99k ended complete; reviewer not reported by host.
- **Requirements covered:** EVP-R-10, EVP-R-1 (Legacy item).
- **Running totals vs budget:** tasks 3/11 · LOC ~360 / ~780 · review rounds 3 / ~15.
- **Gate:** auto-approved (pre-approved mode).

### EVP-T-3 — Shared evidence endpoint: bilateral-only write + load column · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer T2 (medium); Reviewer T3 (high).
- **Files changed:** `onecgiar-pr-server/src/api/results/evidences/evidences.service.ts`, `evidences.repository.ts` (`getEvidencesByResultId` only), `dto/create-evidence.dto.ts`, `evidences.service.evp.spec.ts` (new, 5 tests).
- **Reds before the fix:**
  - (a) `Expected: false Received: undefined`
  - (c) `Expected: null Received: undefined`
  - (d) bilateral link with no field: `Expected: null Received: undefined`
  - `findAll`: expected `true,false,null,null`, received `1,0,null,undefined`
  - (b) was green before the fix, since nothing wrote the property.
- **Mutations:**
  - `if (true)` in place of the source check: only (b) red, `Received: false`.
  - Write the input for SharePoint items: only (c) red, `Received: false`.
  - Both restored.
- **Implementer verification:** `npx jest src/api/results/evidences src/api/versioning` → 12 suites / 152 tests passed; `tsc` exit 0.
- **Evidence re-run (Leader inline):** same jest command → `Test Suites: 12 passed · Tests: 152 passed` → **VERIFIED**.
- **Reviewer:** `STATUS: PASS`. The guard matches EVP-DD-3 exactly. Pool rows are never assigned the property. No consumer assertion was edited. The other caller, `replicateSPFiles`, is unaffected. Rulings on the deviations:
  - `findAllV2` normalisation accepted: pool rows stay null, which EVP-R-12 allows.
  - `result` passed on both upsert paths accepted.
  - `calls[0][0]` confirmed to be the evidence-entity save.
- **ADVISORY (4R, not gating):**
  - **RISK, sequencing:** until EVP-T-8 makes the centre form send `is_public`, a centre-form save of a bilateral result rewrites API-set tags to `null`. **T-3 must ship in the same release as T-8.** Both are in this run, and the push happens only after T-8 lands. Also confirm that no other client posts `evidences/create` for a `source='API'` result. Recorded for `/akili-validate`.
  - RELIABILITY: there is no runtime boolean check on this JWT endpoint. Suggested hardening: `typeof v === 'boolean' ? v : null`.
  - READABILITY: the normalisation is duplicated in `findAll` and `findAllV2`.
- **Decisions:** accepted the `findAllV2` normalisation, outside the task text, per the Reviewer's EVP-R-12 ruling.
- **spawns:** implementer 25 calls ~143.9k ended complete; reviewer not reported by host.
- **Requirements covered:** EVP-R-3 (persistence), EVP-R-12 (pool link save), EVP-DD-3.
- **Running totals vs budget:** tasks 4/11 · LOC ~560 / ~780 (tests are the bulk) · review rounds 4 / ~15.
- **Gate:** auto-approved (pre-approved mode).

### EVP-T-4 — Bilateral API input: is_public + conditional storage-link rule + writer · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer T2 (high); Reviewer T3 (high).
- **Deviation:** the task's Review field says `lenses`, but the Leader ran one Reviewer covering all four lenses with explicit depth on Risk and Reliability. Reason: memory/context budget on a 16 GB host that had already been reaped twice.
- **Files changed:**
  - `onecgiar-pr-server/src/shared/validators/is-not-cloud-storage-link.validator.ts`: new `IsNotCloudStorageLinkUnlessPrivate`; the original is byte-identical.
  - `src/api/bilateral/dto/create-bilateral.dto.ts`: `is_public` added; `link` uses the conditional decorator.
  - `src/api/bilateral/bilateral.service.ts`: `handleEvidence` stores `is_public ?? null`.
  - `src/api/bilateral/dto/evidence-is-public.dto.spec.ts` (new, 30 tests).
  - `bilateral.service.spec.ts` (+1 resubmission test).
- **Red vs the old code:** `Tests: 8 failed, 22 passed, 30 total`:
  - 6 × `is_public:false` refused (`expect(errors).toEqual([])`, Received +14);
  - `"no"` → `Received: undefined` for the `is_public` error (B-3);
  - whitelist retention `Expected: false, Received: undefined`.
- **Mutations:**
  - Validator `!is_public` → `Tests: 12 failed, 18 passed` (null and absent × 6 hosts).
  - Writer assignment removed → Expected `false,true,null,null`, Received `undefined`×4.
  - Both restored. A first mutation `== false` stayed green, because `null == false` is false; it was discarded as a non-mutation.
- **B-1:** `evidence.dto.spec.ts` 13/13, unedited. Disqualifier clear.
- **Implementer verification:**
  - dto + validators → 5 suites / 62 tests passed;
  - `bilateral.service.spec.ts` → 291 passed;
  - `tsc` exit 0.
- **Evidence re-run (Leader inline):** `npx jest src/api/bilateral/dto src/shared/validators src/api/bilateral/bilateral.service.spec.ts` → `Test Suites: 6 passed · Tests: 353 passed` → **VERIFIED**.
- **Reviewer:** `STATUS: PASS`. Ruling on the constraint key `isNotCloudStorageLinkUnlessPrivate`: **not a contract change**. The bilateral `ValidationPipe` has no `exceptionFactory`, and Nest's default flattens errors to message strings. `HttpExceptionFilter` (`shared/handlers/error.exception.ts:38-44`) passes them through, so consumers see the same message and envelope. Removing the old decorator from the DTO is correct.
- **ADVISORY (4R, not gating):**
  - `IsNotCloudStorageLink` now has no consumers.
  - The two constraint classes duplicate logic; the conditional one could delegate to the original.
  - A string `"false"` doesn't lift the refusal → T-10 should say "JSON boolean `false` only".
  - Baseline note: B-2's "kept is_public: false" was the probe's `plainToInstance` output before the pipe's whitelist. In the real pipe, the old DTO stripped it (the retention red shows `Received undefined`).
  - The new cases went into a new spec file instead of `evidence.dto.spec.ts`, which is safer for the disqualifier.
- **Constitution Impact:** none. The public surface change is the documented `/api/bilateral/create` input (T-10 owns the doc).
- **spawns:** implementer 28 calls ~147.7k ended complete; reviewer not reported by host.
- **Requirements covered:** EVP-R-4 (API), EVP-R-5, EVP-R-11, EVP-DD-4, EVP-DD-9.
- **Running totals vs budget (measured, `git diff --numstat` from `cfc18d03e`):** tasks 5/11 · LOC ≈ 771 / ~780 (server prod ≈ 203, tests ≈ 568; this may include in-flight EVP-T-6 edits) · review rounds 5 / ~15. **Tripwire:** not exceeded yet, but close. Test volume is running ~40% over plan, so the next task is expected to cross ~780. When it does, the run stops and escalates per Step 2.4 (never auto-approved, even under pre-approved mode).
- **Gate:** auto-approved (pre-approved mode). The tripwire has not fired yet.

### EVP-T-6 — Review detail returns description + is_public · PASS (attempt 2) · 2026-11-20

- **Attempts:** 2. Implementer T2 (medium → high); Reviewer T3 (high).
- **Attempt 1:**
  - Files: `onecgiar-pr-server/src/api/results/result.repository.ts` (`getEvidenceBilateralResult`: + `e.description`, `e.is_public`, LEFT JOIN on the active SP row, `GROUP BY e.id`, `MAX(esp.is_public_file)`), `results.service.ts` (`_loadBilateralRelatedData` maps through the resolver), `result.spec.ts` (+71), `result.repository.spec.ts` (+33).
  - Red: `Expected substring: "e.description"  Received string: " SELECT e.id, e.link, e.is_sharepoint FROM result r JOIN evidence e ON r.id = e.result_id AND e.is_active = 1 WHERE r.id = ? AND r.is_active = 1; "`.
  - Mutation LEFT→INNER JOIN went red, then was restored. 3 suites / 286 tests passed. Leader re-run VERIFIED.
  - **Reviewer FAIL (verbatim gist):** "`MAX(esp.is_public_file)` … If an evidence has two active SP rows with values 1 and 0 … the review drawer shows the file as public … Violated Rule: design.md §3.1 resolver table; requirements.md EVP-R-7 'Private file item'. Remediation: Replace it with `MIN(esp.is_public_file)` … pin with `toContain('MIN(esp.is_public_file)')` / `not.toContain('MAX…')`."
- **Attempt 2:**
  - Change: MIN in place of MAX, with a fail-closed TS comment above `const query`. The `@akili-spec` comment was moved out of the SQL string, and the describe block was moved above the orphaned JSDoc (both advisories).
  - Red against MAX: `Tests: 1 failed, 95 skipped, 96 total`. After the fix: 3 suites / 287 tests passed; `tsc` exit 0.
- **Evidence re-run (Leader inline):** `npx jest src/api/results/results.service.spec.ts src/api/results/result.spec.ts src/api/results/result.repository.spec.ts` → `Test Suites: 3 passed · Tests: 287 passed` → **VERIFIED**.
- **Reviewer (attempt 2):** `STATUS: PASS`. MIN fails closed, as §3.1 requires. One query, one row per evidence. ONLY_FULL_GROUP_BY is safe. The change is additive: `is_public_file` is not leaked.
- **ADVISORY:**
  - Add public file and public link rows to the mapping fixture.
  - A NULL `is_public_file` plus a 1 would read public; the column is NOT NULL with default 0 (C1), so this shouldn't happen.
- **OPEN GAP (task Disqualifier, not passed):** real-DB check that an evidence with two SP rows (one active, one inactive, and also 1 + 0 active) returns exactly one row with `is_public_file = 0`. No DB is available locally. Added to the `/akili-validate` checklist.
- **spawns:** implementer#1 27 calls ~133.1k ended complete; implementer#2 14 calls ~123.2k ended complete; reviewers not reported by host.
- **Requirements covered:** EVP-R-7 (data), EVP-R-8 (data), NFR Performance, EVP-DD-6.
- **Running totals vs budget (measured from `cfc18d03e`):** tasks 6/11 · **LOC 808 / ~780** (server prod 232 vs ~190 planned; tests 576 vs ~400 planned) · review rounds 7 / ~15.

## BUDGET TRIPWIRE — fired at the EVP-T-6 finalize (2026-11-20)

> "No mandate widens pre-approval: an owner brief that says "never stop" or "treat every gate as approved" pre-approves routine gates only. The exceptions in `/akili-propose` Step 1 *Approval Mode* (HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG`, destructive actions) still stop, and the stop message quotes this sentence." — `/akili-execute` Step 2.4

| Measure | Budget (design §11) | Actual after 6/11 tasks | Projected at 11/11 |
|---|---|---|---|
| Tasks | 11 | 6 done (T-1, T-2, T-3, T-4, T-6, T-7) | 11 |
| LOC | ~780 (server prod ~190, client prod ~130, Fetcher ~20, tests ~400, docs ~40) | **808** (server prod 232, tests 576) | ≈ 1,350–1,400 (T-5 ~80, T-8 ~250, T-9 ~120, T-10 ~40, T-11 ~70) |
| Review rounds | ~15 | 7 | ≈ 13 |

**Cause:**
1. Test volume. The falsifiers demand matrices: T-4's 6 hosts × 4 states = 30 cases, T-3's 5-case spec, T-6's SQL plus mapping specs. Tests are about 1.45× the plan.
2. Two consumers the spec didn't list, both forced by guards and both reviewer-approved:
   - `EvidencesRepository.createQueries` (phase copy, EVP-R-11), added in T-1;
   - the `findAllV2` normalisation, added in T-3.
3. Production code is ~1.2× plan. Review rounds are on budget.

**State at the stop:**
- 6 tasks committed on `qa-development-2026-ss`: `5b2092171`, `61b1b166f`, `4db9c7563`, `880da5d7f`, `6a1885972`, plus the EVP-T-6 commit.
- **Nothing pushed.** EVP-T-3 changes the centre-form save path, and until EVP-T-8 ships, a centre-form save resets API-set tags to `null` (T-3 Reviewer advisory). The branch must not reach any shared or deployed environment before T-8.
- Remaining: T-5 (bilateral reads), T-8 (centre form), T-9 (review drawer), T-10 (contract doc), T-11 (Fetcher).

**Question for the user:** accept the overrun and continue the remaining 5 tasks (projected ~1.75× LOC, mostly tests), or re-scope.

**User decision (2026-11-20):** "Si acepto el sobrecosto". The overrun is accepted, and the run continues with T-5, T-8, T-9, T-10 and T-11, then the pushes per the delivery mandate. New ceiling: about 1,400 LOC and about 15 review rounds. Going past either one re-fires the tripwire.

### EVP-T-5 — Bilateral reads expose is_public per item (+ AI context flag) · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer T2 (medium); Reviewer T3 (high).
- **Files:**
  - `evidence-visibility.ts`: new helper `exposedEvidenceIsPublic`. It uses active SP rows only, any 0 makes the item private (fail closed), and no SP row reads private.
  - `bilateral.service.ts`: `filterActiveRelations` overwrites `e.is_public`; `evidenceSharepointArray` is untouched.
  - `results.service.ts`: `getAIContext` items add `is_public`, and no link is withheld (EVP-DD-8).
  - Specs: `bilateral.service.spec.ts` (+44) and `results.service.spec.ts` (+64).
- **Red:** with the overwrite disabled, the five-row fixture read `[0, 1, null, null, null]` against the expected `[false, true, null, false, true]`. `Tests: 1 failed, 291 skipped, 292 total`.
- **Mutations:**
  - "Raw column" was red: the file rows read `null`.
  - "`Boolean()`" was red: `- null, + false` on link/NULL.
  - Both were reverted.
- **Evidence re-run (Leader inline):** `npx jest src/api/bilateral/bilateral.service.spec.ts src/api/results/results.service.spec.ts --coverage=false -w 2` → `Test Suites: 2 passed · Tests: 324 passed` → **VERIFIED**. The Implementer reported `tsc --noEmit` exit 0.
- **Reviewer:** `STATUS: PASS`.
  - Behaviour matches §3.1.
  - The change is additive: the key-superset assertion is present and the existing `filterActiveRelations` test is untouched.
  - Both read paths load the SP relation.
- **Leader decision, spec conflict raised by the Reviewer:**
  - `GET /v2/api/results/ai/context` serves pool results too, so pool file items now carry `is_public: true/false`.
  - EVP-R-12 ("no change in any pool response other than the new column appearing as null") vs design §4.5 / EVP-DD-8 (approved): the approved design governs.
  - The key is additive, and its single consumer (`ai-review.service.ts`) forwards the context and ignores unknown keys.
  - Recorded as an execute-time clarification: EVP-R-12 covers the W1/W2/IPSR form and the read endpoints, while the AI context flag is exempt by EVP-DD-8. Routed to `/akili-validate`.
- **ADVISORY:**
  - The helper and T-6's `MIN` differ only for active SP rows `[NULL, 1]`. The helper says private; that errs safe.
  - Add a multi-SP-row test (`[1, 0]` → false, plus an inactive 0 that is ignored).
  - `results.service.ts:162/166` has a duplicate import from `evidence-visibility`; merge it.
  - T-10 must cover the per-item `is_public` on reads.
- **spawns:** implementer#1 23 calls ~138.7k ended complete; reviewer#1 21 calls ~99.7k ended complete.
- **Requirements covered:** EVP-R-6, EVP-R-1 (Mixed visibilities), EVP-DD-5, EVP-DD-8.
- **Running totals:** tasks 7/11 · LOC ≈ 948 / ceiling ~1,400 · review rounds 8 / ~15.

### EVP-T-8 — Centre form: question for links, storage rule, mapping, lock · PASS (attempt 2) · 2026-11-20

- **Attempts:** 2. Implementer T2 (high → xhigh); Reviewer T3 (high).
- **Attempt 1:**
  - Changes in `section-evidence.component.{ts,html,spec.ts}` and `section-evidence.model.ts`:
    - the shared `#publicQuestion` template;
    - `isDraftValid` / `hasDraftAnswer`;
    - `draftLinkError` / `hasValidLink` allow a storage link only on No;
    - `fromWire` / `toWire` (link `is_public` ↔ draft slot);
    - `showEvidenceLock`;
    - the No-note copy.
  - Red: 7 failed, 65 passed, with the old component and the new spec. Examples: `Expected: "" Received: "Links to file storage platforms (Google Drive, Dropbox, SharePoint, OneDrive) are not accepted."` and `isDraftValid` `Expected: false Received: true`.
  - Mutation "allow storage links regardless" made the (ii) Yes case red (`Expected: true / Received: false` at `confirmDisabled`). Reverted.
  - Leader re-run: `Tests: 72 passed` → VERIFIED.
  - **Reviewer FAIL:**
    - (1) The on-screen storage refusal text was rewritten. That violates EVP-R-4: "MUST keep today's refusal and today's message".
    - (2) `setDraftFileMode()` did not clear the answer, so Link Yes → Upload file pre-selected Yes and the file was uploaded as public. That violates design §6.2: "switching the source still clears it".
- **Attempt 2:**
  - The refusal text was restored verbatim. The "answer No" hint is now a separate `storage-link-hint` line.
  - `setDraftFileMode()` now sets `is_public_file: null`. Two existing assertions were extended, none deleted.
  - New cases `(ii-b)` (exact text pin) and `(iii-b)`.
  - Red before the fix: 4 failed, 70 passed. Example: `(iii-b) … expect(component.draftItem().is_public_file).toBeNull() → Received: true`.
- **Evidence re-run (Leader inline):**
  - `npx jest src/app/pages/bilateral/components/section-evidence --no-coverage -w 2` → `Tests: 74 passed` → **VERIFIED**.
  - In the html diff, the refusal-description line is a context line.
- **Implementer-reported:**
  - Pool regression set (`user-evidence` ×2, `rd-evidences`/`evidence-item` ×5, `step-n3`/`ipsr-step3-evidence-list`): `Test Suites: 15 passed · Tests: 404 passed`. Pool files untouched.
  - `npx ng build --configuration development` exit 0.
- **Reviewer (attempt 2):** `STATUS: PASS`.
  - API-set `is_public` true/false/null survives a centre-form save (closes the T-3 sequencing risk).
  - File items are unchanged.
  - An untouched legacy link does not block the save.
- **Design route:** playbook `refine`, polish `light` (no new SCSS/tokens; the hint uses `--pr-text-secondary`); finish review: not run (AKILI execute).
- **ADVISORY:**
  - The `@if` condition is duplicated at html:169/176.
  - No DOM-level test of the radio `(ngModelChange)` binding.
  - The lock `<i>` lacks `role="img"` and `aria-label` (pre-existing pattern).
  - The new hint is hard-coded English (pre-existing pattern).
- **spawns:** implementer#1 47+3 calls ~208k ended complete; reviewer#1 18 calls ~122k + re-review ended complete.
- **Requirements covered:** EVP-R-2 (all), EVP-R-3, EVP-R-4 (form), EVP-DD-7.
- **Running totals:** tasks 8/11 · LOC ≈ 1,196 / ceiling ~1,400 · review rounds 10 / ~15.

### EVP-T-10 — Contract doc + change log · PASS (attempt 2) · 2026-11-20

- **Attempts:** 2. Implementer T2 (medium → high); Reviewer T3 (checklist).
- **Attempt 1:** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (+28/−2). It covered:
  - the core-fields Evidence table, including the P-9 fix (the slim `evidences[]` list is the Fetcher's output) and an `evidence_array[]` row;
  - a new subsection "Per-item visibility: `is_public` (P2-4110)" covering input, the storage-link exception, output and the rewrite rule EVP-R-11;
  - a sentence on the resubmission replace row;
  - a 2026-11-20 change-log row that cites P2-4110 and the spec path, states the partial reversal of the 2026-08-26 entry, and gives the PRMS-first deploy order.
- **Claim → test map:**

  | Claim | Test |
  |---|---|
  | Input / storage exception | `evidence-is-public.dto.spec.ts` |
  | `?? null` | `bilateral.service.spec.ts` handleEvidence |
  | Reads | `bilateral.service.spec.ts` "exposes is_public" |
  | AI withholding | `bilateral-quality-payload.builder.spec.ts` EVP-R-10 |
  | Phase copy | `evidences.repository.spec.ts` G1 parity guard |
  | Centre-form preserve | `section-evidence.component.spec.ts` (iv) |

- **Reviewer FAIL (attempt 1):**
  - (1) The doc listed "Box and the like", but Box is not in `CLOUD_STORAGE_LINK_REGEX`.
  - (2) The doc said fail-closed applies "of the result", but the code checks each item's own SP rows.
- **Attempt 2:**
  - The platform list now matches `CLOUD_STORAGE_LINK_MESSAGE` exactly (Google Drive, Dropbox, SharePoint, OneDrive).
  - The file row is now per item, and also covers "no active SharePoint row → false".
- **Evidence re-run:** n/a (docs, no test gate). The Leader grep confirms the only diff is in the doc file.
- **Reviewer (attempt 2):** `STATUS: PASS`.
- **Requirements covered:** EVP-R-13.
- **Running totals:** tasks 9/11 (T-9 in flight) · review rounds 13 / ~15.

### EVP-T-9 — Review drawer: Private tag + description · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer T2 (medium); Reviewer T3 (checklist).
- **Files:** in `result-review-drawer.component.{html,ts,spec.ts}` and `result-review-drawer.interfaces.ts`:
  - Line 1 of the row: a Private pill under `@if (evidence.is_public === false)`. It uses the tokens `--pr-border-strong`, `--pr-surface-sunken` and `--pr-text-secondary`, and has the EVP-R-9 tooltip via `prTooltip`, an `aria-label`, and `data-testid="evidence-private-tag"`.
  - Line 2 of the row: the description, when it is non-blank.
  - The anchor and the admin add-link input are unchanged.
- **Red:** `Expected: 1 Received: 0` at `expect(tags.length).toBe(1)` — `Tests: 1 failed, 238 skipped, 1 passed, 240 total`.
- **Mutation `!evidence.is_public`:** `Expected: 1 Received: 2`. Reverted.
- **Evidence re-run (Leader inline):** `npx jest …/result-review-drawer.component.spec.ts --no-coverage -w 2` → `Tests: 240 passed` → **VERIFIED**. The spec diff removes 0 lines. The Implementer reports `ng build` development exit 0.
- **Reviewer:** `STATUS: PASS`.
  - The markup conforms to §6.3, and the R-9 text is exact.
  - **Save-path probe (Leader-requested):** the drawer's `PATCH review-update/data-standard` → `updateEvidencesPartial` never rewrites rows the body names by id. It only deactivates rows that are missing from the body and inserts rows that have no id. So a drawer save can't reset `is_public` or the description. Admin-added links are stored untagged, per §6.3.
  - Future risk: if `updateEvidencesPartial` ever starts updating rows by id from this partial body, it would wipe the tag.
- **Design route:** playbook `refine`, polish `light` with a clean result; finish review: not run (AKILI execute).
- **OPEN GAP D9 → `/akili-validate` HITL**, at desktop and at ≤640px. Check:
  - a long URL truncates and the pill stays visible and unclipped;
  - a long description wraps;
  - the pill's contrast, `--pr-text-secondary` on `--pr-surface-sunken`, estimated at about 6:1 but not measured.
- **Requirements covered:** EVP-R-7, EVP-R-8, EVP-R-9, NFR Accessibility (presence).

### EVP-T-11 — Fetcher: accept, forward and return is_public · PASS (attempt 1) · 2026-11-20

- **Repo:** `onecgiar_result_functions`. Worktree based on `origin/dev-fetcher`. Implementer T2 (medium); Reviewer T3 (full).
- **Files:**
  - `services/fetcher/src/validator/schemas/common_fields.json`: `is_public: ["boolean","null"]`. Not required; `additionalProperties:false` is kept.
  - `src/mappers/response-result.mjs`: `EvidencesMapper` maps `is_public ?? null`.
  - Docs: `src/docs/openapi.json` (evidences schema; examples regenerated by `docs:build`), guides `04-common-fields.md` and `02-changelog.md` (the stale "Confidential evidence has no route" note was rewritten), the `policy.json`/`inno_use.json` examples, and `services/api-docs/app/lib/types.ts`.
  - New test: `test/evidence-is-public.test.mjs` (6 tests).
- **Red (ajv `removeAdditional: true`):** `actual: [ { link: 'https://cgiar.sharepoint.com/x', description: 'Contract' } ]`; `expected: [ { …, is_public: false } ]`.
- **Mutation "drop the schema key":** red, `ℹ fail 3`. Restored.
- **Evidence re-run (Leader inline):** `npm ci` succeeded, so the suite is valid evidence. `npm test` → `ℹ tests 91 · ℹ pass 91 · ℹ fail 0` → **VERIFIED**.
- **Reviewer:** `STATUS: PASS`. Every doc claim was checked against the PRMS code:
  - the validator `=== false`;
  - the regex platform list;
  - `evidence.mapper.ts:74` link null;
  - the drawer tag.
- **ADVISORY:**
  - Tighten the `"no"` rejection assertion to the instancePath.
  - Qualify the guide's "Publicly accessible link" wording (:428/:438) with "unless `is_public: false`".
  - PRMS comment `cloud-storage-link.constant.ts:14-16` is stale and goes to the pending list.
- **Fetcher finding:** the Fetcher code itself does not refuse storage links. PRMS enforces the rule.
- **Requirements covered:** EVP-R-14.

## Delivery — 2026-11-20

**Pre-push regression:**
- **Server, full suite:** `Tests: 2 failed, 7235 passed`; `Test Suites: 23 failed, 379 passed`. All 23 are environmental and none is caused by this spec:
  - 22 hit `TypeError: Cannot read properties of undefined (reading 'prototype')` in `buffer-equal-constant-time` (via `@nestjs/jwt`) on local Node v26.13.1;
  - 1 is `qa-catalog.snapshot.spec.ts`: the diff is line endings only, with the same `revision: 35` and the same `content_hash` on both sides.
- **Client, full suite:** `Test Suites: 5 failed, 700 passed`; `Tests: 91 failed, 15282 passed`. The same 5 specs at the base commit `cfc18d03e` (temporary worktree) give an identical `Tests: 91 failed, 44 passed, 135 total`, so they are **pre-existing**. The 5 specs:
  - `impact-level-info.component.spec.ts`
  - `shell-topbar.component.spec.ts`
  - `general-interceptor.service.spec.ts`
  - `dashboard-lab.kpi-status-chip.spec.ts`
  - `quality-assurance.component.spec.ts`

**Pushes:**
1. **`qa-development-2026-ss`:** first merged `origin/qa-development-2026-ss`, which brought in 3 remote commits (P2-3094) with no file overlap. `ng build` development was green. Pushed `e07aeb8bd..cda63960a`.
2. **`performance-refactor`:** 11 P2-4110 commits cherry-picked in a separate worktree with no conflicts.
   - Server: specs for evidences, bilateral, results, ipsr → `Tests: 2292 passed`. The 3 failed suites are the Node v26 jwt ones; `tsc` exit 0.
   - Client: section-evidence, drawer, rd-evidences → `15 suites / 577 passed`; `ng build` green.
   - Fast-forward push `3f271a5f9..2c1e902bc`.
3. **Fetcher `dev-fetcher`:** `7a27c43..3882e8d`, pushed after PRMS. `dev-fetcher` was chosen over `dev` because a push to `dev` triggers the Jenkins DEV ingestion deploy (`jenkins-trigger*.yml` on `dev`), and agents never deploy. Merging `dev-fetcher` → `dev` is the owner's deploy step, done **after** the PRMS server is deployed.

**Open for `/akili-validate`:**
- migration up/down/up on a real DB, plus `migration:check:ci`;
- P-17 TEST row count;
- T-6 one-row-per-evidence check on a real DB;
- D9 visual check of the Private pill (desktop and ≤640px);
- P-16 Results Dashboard;
- the EVP-R-12 vs EVP-DD-8 AI-context clarification.

**Pending (non-spec):** `akili doctor --agents --fix`; PRMS comment `cloud-storage-link.constant.ts:14-16`.
