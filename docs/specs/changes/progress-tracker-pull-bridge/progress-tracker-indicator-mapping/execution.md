# Execution Log — Progress Tracker Indicator Mapping and Read Proxy

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping` |
| **Parent family** | `../family.md` (child #1) |
| **Depth** | Full · **Type** Change |
| **Approval Mode** | `gated`, with a standing requester instruction (2026-09-22): *"Do not ask me to approve trivial checklist items — only escalate real design conflicts or AWS P-5 contradictions."* Routine continue gates therefore auto-pass and are logged; HALT, Pivot, budget tripwire, `FATAL_FAIL`, `REVIEW_WAIVED` and the Leader-inline ask still stop for the user |
| **Branch** | `JuankCadavid/progress-tracker-pull-bridge` · base `24a91da0e` |
| **Budget (design.md §13)** | 9 tasks · ≈ 2,350 LOC · 2 review rounds |
| **Model routing** | Leader T1 `opus` · Implementer T2 `sonnet` · Reviewer T3 `opus` (author ≠ auditor) |
| **Execute started** | 2026-09-22 |

---

## 2. Pre-flight — Leader environment check

**`P-5` re-verified firsthand before any task was spawned.** `tasks.md` assigned the two AWS reads to `PTM-T-2`'s first step; the Leader ran them as the Step 2.1 environment pre-check instead, so the Implementer starts from a settled premise rather than owing one. Commands and outputs:

| Command | Result |
|---|---|
| `aws sts get-caller-identity` (profile `IBD-DEV`) | account `569113802249`, `arn:aws:iam::569113802249:user/Prms-test` |
| `aws lambda get-function-configuration --function-name prstaging-dev-main --region us-east-1` | **`Timeout: 30`**, `MemorySize: 1024`, `LastModified: 2026-02-06T13:02:28.000+0000` |
| `aws apigateway get-rest-apis` → `dev-prtesting` | `dlhmzxl1zc` |
| `aws apigateway get-resources` → `{any+}` | `l19ilt` |
| `aws apigateway get-integration --http-method ANY` | **`timeoutInMillis: 29000`**, `type: AWS_PROXY` |

**Outcome: no contradiction.** Both values match `design.md` `P-5` and `../family.md` §5.1 exactly. `PTM-DD-4`'s 25 s call timeout stands with ~4 s of gateway headroom over the 20.2 s measured cold draft.

**One correction recorded, not a contradiction:** the function lives in **`us-east-1`**, not `eu-central-1` — `get-function-configuration` against `eu-central-1` returns `ResourceNotFoundException`. `eu-central-1` is the *Progress Tracker's* region (Guide §3), not PRMS's. `family.md` §5.1 never claimed otherwise, but it did not state the PRMS region either; it is stated here so nobody repeats the failed lookup.

🔒 **Secrets discipline:** every AWS query was projected to scalar fields only (`--query '{Fn:…,Timeout:…}'`). `Environment.Variables` was never requested, returned, or logged (`.cursorrules`, `AC-9`).

---

## 3. Task Execution History

_(appended per task, newest last)_

---

### `PTM-T-2` — Module skeleton, environment keys, and the declared timeout

| Field | Value |
|---|---|
| **Status** | ✅ **PASS** (Reviewer `opus`, attempt 1) |
| **Date** | 2026-09-22 |
| **Implementer attempts** | 1 |
| **Model** | Implementer `sonnet` · Reviewer `opus` (author ≠ auditor) |
| **Requirements covered** | `PTM-R-5`, `PTM-R-8`, `PTM-AC-15` (+ `PTM-R-7` via the config constants) |

**Attempt 1 — files changed**

- `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.module.ts` (new, 21 ln) — bare `HttpModule`, mirrors `results-knowledge-products.module.ts:67-68`
- `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.config.ts` (new, 39 ln) — `PT_INTEROP_TIMEOUT_MS_DEFAULT` = 25 000, `PT_INTEROP_API_GATEWAY_CEILING_MS` = 29 000, `getProgressTrackerTimeoutMs()`
- `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.config.spec.ts` (new, 113 ln) — `PTM-TEST-2`, reads the committed `serverless.yaml` off disk
- `onecgiar-pr-server/serverless.yaml` — three `${env:…}` refs + `timeout: 30` on `functions.main`
- `onecgiar-pr-server/src/api/modules.routes.ts` — `{ path: 'progress-tracker', module: ProgressTrackerModule }`
- `onecgiar-pr-server/src/app.module.ts` — module added to `imports`; **no middleware exclusion added** (`P-7` holds)

**Implementer verification (reported)** — red run pre-edit 4 assertions red · config spec 6/6 · whole server 256 suites / 3158 tests · scoped lint exit 0. Three falsifiers executed and reverted: delete `timeout:` → 2/6 red; `timeout: 29` → 6/6 green; `timeout: 5` → exactly 1/6 red.

**Evidence re-run — `VERIFIED` (Leader-inline, non-author)**

| Command | Reported | Re-run |
|---|---|---|
| `npx jest src/api/progress-tracker/progress-tracker.config.spec.ts --silent --reporters=summary` | 6 passed | **6 passed** ✅ |
| `npx jest --silent --reporters=summary --forceExit` | 256 suites / 3158 tests | **256 suites / 3158 tests** ✅ |
| Falsifier (3) `timeout: 5`, re-applied **by the Leader** | exactly 1/6 red | **exactly 1/6 red**, restore → 6/6 ✅ |

The falsifier was re-applied independently rather than taken on report: a green assertion is cheap, and only an on-demand red proves the gate asserts anything. `serverless.yaml` restored to `timeout: 30`, confirmed by `grep`.

**Decisions made (Leader)**

- **`P-5` re-verified firsthand at execute time** and its `design.md` citation replaced with the Leader's own AWS commands; the row is no longer `UNVERIFIED`. Region recorded as **`us-east-1`** (`eu-central-1` returns `ResourceNotFoundException` — that is the Progress Tracker's region, not PRMS's).
- **Symlinked `node_modules`** from the `qa-development-2026` worktree accepted — established precedent, gitignored, absent from the tracked diff (verified via `git status --porcelain`).
- **11 pre-existing lint errors** in 3 unrelated, unmodified files left untouched. Fixing them would be unapproved scope; the Implementer correctly flagged rather than fixed.
- **Trailing-whitespace change** after `main:` in `serverless.yaml` accepted — whitespace only, no semantic YAML change.
- `forbidNonWhitelisted: true` for the forthcoming `PTM-T-4` routes is **not** a violation of `onecgiar-pr-server/CLAUDE.md` §6's caution, which governs *tightening existing* `/api/*` endpoints. The precedent for a **new** endpoint is `results-knowledge-products.controller.ts:39-50`, which already uses `true`. Carried into `T-4`'s brief.

**Issues encountered** — none blocking. A transient cross-task interference was observed and correctly attributed: the Implementer saw `db-toc-write-guard.spec.ts` (PTM-T-9, concurrent) fail once mid-edit then pass. This is precisely why the Leader deferred T-9's evidence re-run until the tree was stable.

---

### `PTM-T-9` — Repository guard: no writes to the ToC Integration schema

| Field | Value |
|---|---|
| **Status** | ✅ **PASS** (Reviewer `opus`, attempt 1) |
| **Date** | 2026-09-22 |
| **Implementer attempts** | 1 |
| **Model** | Implementer `sonnet` · Reviewer `opus` |
| **Requirements covered** | `PTM-R-12`, `PTM-AC-14` |

**Attempt 1 — files changed:** `onecgiar-pr-server/src/api/progress-tracker/db-toc-write-guard.spec.ts` (new, one file only; siblings from the concurrent PTM-T-2 untouched).

**Implementer verification (reported)** — eslint clean · `Tests: 11 passed, 11 total` green on the clean tree. Falsifier: a temp file `src/__ptm_t9_falsifier_tmp__.ts` carrying the exact mutation → **RED `2 failed, 9 passed`** (both the zero-writes and the no-false-negative assertions firing, printing file+line) → deleted → **re-green 11/11**. Confirmed untracked throughout.

**Evidence re-run — `VERIFIED` (Leader-inline, non-author, run only after the tree stabilised)**

| Command | Reported | Re-run |
|---|---|---|
| `npx jest src/api/progress-tracker/db-toc-write-guard.spec.ts --silent --reporters=summary` | 11 passed | **11 passed** ✅ |

⏸ **Deliberate deferral recorded:** this re-run was withheld while `PTM-T-2` was actively writing into `src/`. The guard scans the whole tree, and a scan of a tree being mutated is not evidence. `PTM-T-2` independently reported observing exactly that flap. The deferral cost nothing and avoided recording a meaningless result.

**Decisions made (Leader) — execute-time spec edits**

- **`requirements.md` §9 — new defect class `D-12`** (accepted risk): a write split across a multi-line template literal is undetectable, because the guard matches per line. Added because `PTM-T-9`'s Disqualifier required a *named gap* rather than a muted check, and the Implementer had recorded it only in the file header.
- **`design.md` §1A `P-2` qualified inline**: the same limitation is **inherited from the premise's own baseline `grep`**, which also matches per line — so the design's "0 write statements" citation was marginally stronger than its evidence supported. This is a Leader error in the design, corrected, not an Implementer error in the code.
- Both edits record a limitation without changing any approved requirement's meaning, and were carried into both Reviewer briefs as named conformance checks per the edit-carry rule.

**Note on the guard's self-exclusion:** scoped by `__filename` identity, not a blanket spec exemption — the baseline `grep` carries no `-v spec` on the write side, so exempting specs as a class would have widened the hole. Flagged to the Reviewer for explicit scrutiny.


---

## Reviewer verdicts — first wave

### `PTM-T-2` → **STATUS: PASS** (`opus`, attempt 1)

Both `PTM-AC-15` clauses are asserted against the **real committed file** — `progress-tracker.config.spec.ts:20-27` resolves `__dirname/../../../serverless.yaml` and `readFileSync`s it (no fixture, no inline YAML, so not a plumbing test), and clause (b) uses `toBeLessThan` (`:68-70`) — genuinely strict, not `<=`. The 25 000 ms default matches `PTM-DD-4` and sits strictly under `PT_INTEROP_API_GATEWAY_CEILING_MS = 29_000`. `.cursorrules`/`AC-9` clean: `serverless.yaml:26-28` are `${env:…}` references only, regression-guarded at `:98-112`. `P-7` holds — `app.module.ts:143-150` adds no exclusion, so `api/*path` carries `JwtMiddleware`; no bespoke guard. `progress-tracker.module.ts:18-20` is a bare `HttpModule`, mirroring the exemplar. Silent-revert risk (`D-4`) closed on **both** edges: removing `timeout:` reds the first test, removing any `PT_INTEROP_*` key reds the last.

**Boundary note accepted:** `progress-tracker.config.ts` / `.spec.ts` are beyond `tasks.md`'s "Files (expected)" list but inside the task's declared directory and **required** by `PTM-AC-15`'s second clause. Not a scope violation.

`ADVISORY` (recorded, non-gating — see the forward pointer below):
- **Resilience:** `getProgressTrackerTimeoutMs()` (`progress-tracker.config.ts:37-39`) is **unclamped** — `PT_INTEROP_TIMEOUT_MS=45000` returns 45 000, above the ceiling.
- **Reliability:** the same function returns `NaN` for a non-numeric env value and `0` for whitespace. **Axios treats both as falsy → no timeout at all** — the precise failure `PTM-R-7` exists to prevent. The empty-string case is covered (`:78-81`); the malformed case is not.
- **Readability:** `extractFunctionsMainTimeoutSeconds()` (`:29-39`) matches the first `timeout:` anywhere in the `functions:` block rather than one scoped under `main:`. Harmless with one function; would silently read a sibling's value if a second is added.

### `PTM-T-9` → **STATUS: PASS** (`opus`, attempt 1)

All seven requested checks run, with the load-bearing claims **independently re-verified by ripgrep** rather than accepted from the transcript:
- The write pattern over all of `src` matches **only** this file's own fixture literals — the real tree is 0, as `P-2` states.
- The non-spec `env.DB_TOC` read population is **exactly 115** (131 total occurrences across 16 files, 16 in specs) — matching the `P-2` baseline precisely.
- Self-exclusion is a single-path `__filename` identity filter (`:91`); the write assertion runs over `scannedFiles` with **no** `spec` filter, so a violation planted in any other spec file is still caught. If the exclusion ever no-ops, the guard fails **loudly on its own fixtures** rather than going quiet — a safe failure direction.
- The ≥100 floor is a vacuity tripwire, not the proof; a `DB_TOC` rename turns the test **red**, never silently green.
- The no-false-positive proof is real (`:116-119` re-runs the write pattern over every read hit's line asserting `[]`), not a count wearing that name.
- Jest config discovers the guard in CI (`testRegex: ".*\\.spec\\.ts$"`; ignores only `node_modules`/`dist`/`src/migrations`), and a `>1000` file sanity assertion blocks a vacuously empty scan.

`ADVISORY` (recorded, non-gating):
- **Risk — partial gap against `PTM-AC-14`'s literal text:** the AC names **two** targets (`env.DB_TOC` *or* `toc_results_indicators`); the guard anchors only on `${env.DB_TOC}`, so a **hardcoded-schema** write (`UPDATE toc_integration.toc_results_indicators …`) is invisible. Reviewer ran the table-name-only variant: **0 real hits today**. Declined as a FAIL because `tasks.md` `PTM-T-9` prescribes mirroring `P-2` exactly, and a genuine cross-schema write must carry the qualifier. **Escalated to the user as a spec-internal inconsistency — see below.**
- **Reliability:** `/i` plus bare `UPDATE` means a future *read* line such as `SELECT last_updated_date FROM ${env.DB_TOC}…` would false-positive — the "muted on first false positive" outcome `tasks.md` warns about. Inherited from the baseline pattern.
- **Readability:** the read-population filter tests `` `${file}:${line}` `` for `spec`, so a read line whose *text* contains "spec" drops out of the false-positive proof. Faithful to `grep -v spec`; disclosed at `:103-105`.

---

## Forward pointer — carried into `PTM-T-3`'s brief (not a new task)

`PTM-T-3` **already owns `PTM-R-7`** (`tasks.md` `PTM-T-3` → `Implements:`). The `T-2` resilience/reliability advisories are therefore not new scope to absorb — they identify *how* `T-3` must discharge a requirement it already carries:

1. **Clamp the env override.** `getProgressTrackerTimeoutMs()` must not return ≥ the gateway ceiling; an unclamped `PT_INTEROP_TIMEOUT_MS=45000` defeats `PTM-R-7` at deploy-config level.
2. **Reject malformed values.** `NaN` / `0` reach axios as falsy → **no timeout at all**, the worst outcome and precisely what `PTM-R-7` forbids. Fall back to the default on `!Number.isFinite(parsed) || parsed <= 0`, with an `'abc'` case in the spec.

🛑 Recorded here **and** to be copied into `PTM-T-3`'s brief verbatim. A forward pointer filed in this log is not carried by having been filed — the brief carries it or nobody does.

---

## Escalation to the user — `PTM-AC-14` vs `PTM-T-9` task text

Not a blocker (0 hits today), but a genuine **spec-internal inconsistency** the Leader will not resolve unilaterally: `requirements.md` `PTM-AC-14`/`PTM-R-12` name `toc_results_indicators` as a second target, while `tasks.md` `PTM-T-9` prescribes mirroring `P-2`'s pattern, which anchors only on `${env.DB_TOC}`. The Reviewer's decision not to FAIL is defensible and stands. Closing the gap is a one-line second `RegExp` with zero false positives today — but widening a task that already PASSed on the strength of an advisory is exactly what the *Advisory Never Becomes A Task* rule forbids. **User decision requested.**

---

### `PTM-T-1` — Mapping table: migration + entity

| Field | Value |
|---|---|
| **Status** | `[~]` **BLOCKED on a user decision** — code complete and verified; one DoD line is unsatisfiable in this environment (see below). Not `[x]`: a task with an outstanding gap never reaches `[x]`, even on a PASS |
| **Date** | 2026-09-22 |
| **Implementer attempts** | 1 (no FAIL — the gap is environmental, so **no attempt was consumed**) |
| **Model** | Implementer `sonnet` · Reviewer `opus` |
| **Requirements covered** | `PTM-R-9`, `PTM-R-21`, `PTM-AC-11` |

**Attempt 1 — files changed**

- `onecgiar-pr-server/src/migrations/1790010000000-CreateProgressTrackerIndicatorMap.ts` (new) — house pattern; `UNIQUE INDEX (toc_results_indicator_id(255), version_id)`; guarded FK helper; `down` refuses to drop a non-empty table
- `onecgiar-pr-server/src/api/progress-tracker/entities/progress-tracker-indicator-map.entity.ts` (new) — extends `BaseEntity`; **both** ToC identifier columns retained; unidirectional `@ManyToOne` FK to `Version` (no edit to `version.entity.ts`)
- `onecgiar-pr-server/src/api/progress-tracker/entities/progress-tracker-indicator-map.entity.spec.ts` (new, 9 tests)

**Evidence re-run — `VERIFIED` (Leader-inline, non-author)**

| Command | Reported | Re-run |
|---|---|---|
| `npx jest src/api/progress-tracker --silent --reporters=summary` | 3 suites / 26 tests | **3 suites / 26 tests** ✅ |
| Migration timestamp above current max | `1790010000000` > `1790002419754` | **confirmed** via `ls src/migrations \| sort \| tail` ✅ |
| `eslint.config.mjs` ignores migrations | claimed | **confirmed** — `eslint.config.mjs:19` `ignores: ['**/.eslintrc.js', '**/migrations/']` ✅ |

**🛑 Blocking gap — `npm run migration:check:ci` cannot run**

Independently confirmed by the Leader, not taken from the report:

| Route | Result |
|---|---|
| `.env` in this worktree | absent |
| Docker daemon (`docker info`) | down / not installed |
| Shared dev `.env` from the `qa-development-2026` worktree | **`ECONNREFUSED`** |

No route exists from this machine. The Implementer disclosed this rather than claiming a round trip it did not perform — correct behaviour, and the reason this is not a FAIL.

**Leader error acknowledged.** `/akili-execute` Step 2.1 requires the environment pre-check **before** spawning when a task's verification needs a running stack. The Leader ran that pre-check for `PTM-T-2` (AWS) and omitted it for `PTM-T-1` (database). The blocker was therefore discovered after the work rather than before it.

**🛑 Spec defect found in `tasks.md` — the gate is mis-specified (Leader's error, authored at specify time)**

`scripts/check-pending-migrations.ts` compares migration **files on disk** against rows in the DB's migrations table (`:71-72`, `SELECT name FROM …`). A newly authored migration is therefore **pending by definition** until it is applied. Consequently:

> **"`npm run migration:check:ci` green" is unsatisfiable by construction for any task whose deliverable IS a migration** — unless `migration:run` is executed against a live database first.

It is the correct gate for proving that *non*-migration work introduced no drift, and for CI *after* Jenkins applies migrations (`onecgiar-pr-server/CLAUDE.md` §5 confirms Jenkins applies them automatically). It was wrong to place it in the DoD of `PTM-T-1` and `PTM-T-6`, the two tasks that author migrations.

A second, smaller defect in the same DoD: it asks for migration lint, but `eslint.config.mjs:19` **globally ignores `**/migrations/`**, so migration files cannot be linted at all.

**Escalated to the user with three options** — (a) unblock a database and run the real round trip; (b) amend the `T-1`/`T-6` DoD to what is locally provable (structural DDL assertion + "exactly one pending migration, namely this one" once a DB is reachable) and move the live `up`/`down` round trip to the rollout checklist in `tasks.md` §6; (c) park `T-1` as `[~]` and proceed with non-migration tasks. Leader recommends **(b)**.

**Pipeline consequence:** with `T-1` at `[~]`, the only other eligible task by the dependency graph is `PTM-T-6` — which carries the identical DoD defect. `T-3`/`T-5` depend on `T-1`; `T-4`/`T-7`/`T-8` depend on those. **The run is genuinely blocked on this decision**, not merely waiting for convenience.

**Reviewer verdict → `STATUS: PASS`** (`opus`, attempt 1)

DDL matches `design.md` §3.1 **column-for-column** — all ten spec columns with the spec's types and nullability, plus the five `BaseEntity` audit columns. Both `toc_results_indicator_id` **and** `toc_indicator_integration_id` retained, so `PTM-T-3`'s lookup decision stays open as the brief required. Unique key is `IDX_ptim_toc_indicator_version (toc_results_indicator_id(255), version_id)` (migration `:77`) — **no `phase_year` anywhere in the file**, and not keyed on the indicator alone. One addition beyond §3.1: `INDEX IDX_ptim_version (version_id)`, which the FK needs because the unique key leads with the indicator column — additive and correct. FK type-compatible with `version.id` (`BIGINT` signed) and `version.entity.ts` untouched, using the same `@Column` + `@ManyToOne` + `@JoinColumn` split as `result.entity.ts:266-277`. `down` verified on both live branches (returns without dropping when `COUNT(*) > 0`; drops only when empty).

**On the structural proof — the Reviewer split it honestly rather than blessing it whole:**

- **Genuine half:** the assertion at `…entity.spec.ts:70-72` is a **literal expected regex written independently in the test**, matched against SQL emitted by the migration's real `up()` through a mocked `QueryRunner`. The closing paren makes it exact on arity, so changing the key to `phase_year`, adding a third column, or renaming it turns that assertion **and** the `exec()` non-null check (`:97-100`) red. **Not a tautology.**
- **Decorative half:** the `wouldCollide` replay (`:84-128`) hardcodes `keyColumns` rather than parsing them from the captured DDL, so it demonstrates MySQL's documented semantics instead of deriving them from the migration. "Decorative, not misleading" — and the file header already discloses exactly that.

**Residual risk left unproven until a database is reachable** (the Reviewer's list, verbatim in substance):
(a) MySQL accepting the 255-char prefix — 1020 bytes at utf8mb4 is fine on `DYNAMIC` but **hits error 1071 on a `COMPACT`/767-byte schema, which is this task's own Disqualifier scenario**; (b) the FK actually creating against `version`; (c) `migration:check:ci` entity↔schema drift (`D-9`); (d) a real duplicate `INSERT` being rejected; (e) the live `run`/`revert`/`run` round trip.

**🛑 Forward pointer — carried into `PTM-T-6`'s brief (critical, not advisory):**

> `1790010000000` exceeds the current maximum `1790002419754`, but the **headroom is only ~2.1 hours of wall-clock milliseconds**. A fresh `Date.now()` taken today would land **below** `1790010000000` and sort `PTM-T-6`'s migration **before** `PTM-T-1`'s — producing a wrong-order schema where the provenance table's migration runs ahead of the mapping table's. **`PTM-T-6` must pick a timestamp explicitly above `1790010000000`, never `Date.now()`.**

This is the kind of defect that is invisible in review and only surfaces at deploy. Recorded here **and** to be copied verbatim into `PTM-T-6`'s brief — a pointer filed in this log is not carried by having been filed.

`ADVISORY` (complete, recorded, non-gating):

- **Reliability:** `@ManyToOne(() => Version, (v) => v.id)` at `progress-tracker-indicator-map.entity.ts:59` omits `{ nullable: false }`, unlike `result.entity.ts:273` and the `result-innovation-merge-split.entity.ts:55` exemplar. Harmless at runtime — the explicit `@Column` on `version_id` already declares NOT NULL and the DDL matches — but a candidate for a **`migration:check` nullability diff on the join column once a DB is reachable**. One-word divergence from the house pattern.
- **Readability:** `…entity.spec.ts:94-128` hardcodes `keyColumns` instead of parsing them from the DDL capture group the preceding `exec()` already produces. Presentation, not a hole — the test still reds on a key change because `exec()` returns null.
- **Risk:** the migration relies on **server defaults for row format and charset**. The 255-char prefix is 1020 bytes at utf8mb4 — fine on `DYNAMIC`, **error 1071 on a `COMPACT`/767-byte schema. That is the one condition that can turn this migration red on first apply.** Once a round trip is possible, assert `ROW_FORMAT=DYNAMIC` or confirm the target schema's row format.

⚠️ **Note the interaction:** the first and third advisories are both *only* detectable once a database is reachable — the same blocker this task is escalated on. They are therefore not deferrable indefinitely; whichever option the user picks should account for them.

Also untested: the `down` table-absent branch.

**Task remains `[~]`** — the Reviewer PASS resolves conformance, but the `migration:check:ci` DoD gap is still open and awaiting the user's decision. Evidence before checkbox; a gap blocks `[x]` even on a PASS.

---

## Requester decision — 2026-09-22 — option (b), DoD amended

**Decision:** amend the DoD for `PTM-T-1` and `PTM-T-6` to what is provable without a live MySQL; move engine-level verification to the rollout checklist. **`migration:run` against the shared dev database explicitly withheld.**

**Applied:**

| Change | Where |
|---|---|
| `PTM-T-1` DoD amended; `migration:check:ci` + round trip removed from the task gate | `tasks.md` `### PTM-T-1` + amendment note |
| `PTM-T-6` DoD amended identically, **plus the timestamp trap promoted into its DoD** | `tasks.md` `### PTM-T-6` |
| Six engine-level checks moved to the rollout checklist, itemised and **tracked, not waived** | `tasks.md` §6 |
| `D-13` recorded — `PTM-AC-14` vs `PTM-T-9` documentation drift, accepted | `requirements.md` §9 |
| `PTM-T-1` → `[x]` | `tasks.md` |

**Risks now tracked at rollout rather than at the task gate** (all three surfaced by the `PTM-T-1` Reviewer, none by the Leader's original spec):

1. **ROW_FORMAT / error-1071** — the 255-char utf8mb4 prefix key is 1020 bytes: fine on `DYNAMIC`, **fails on `COMPACT`/767-byte**. The single condition that can turn this migration red on first apply.
2. **`@ManyToOne` nullability diff** — `progress-tracker-indicator-map.entity.ts:59` omits `{ nullable: false }`; detectable by `migration:check` once a DB exists.
3. **`down` table-absent branch** — untested in unit scope.

Plus, from the same amendment: `migration:check:ci` after apply, live `up`/`revert`/`up` for both migrations, FK creation against `version.id`, and a real duplicate-`INSERT` rejection (the engine half of `PTM-AC-11`).

**`PTM-T-1` closed `[x]`** — Reviewer `PASS` on conformance, evidence re-run `VERIFIED` (26/26), amended DoD satisfied. Evidence preceded the checkbox.

**Two Leader errors stand recorded** and are not amended away: (i) the Step 2.1 environment pre-check was run for `PTM-T-2` (AWS) but omitted for `PTM-T-1` (database), so the blocker surfaced after the work; (ii) the `migration:check:ci` DoD line was mis-specified at specify time for the two tasks whose deliverable is a migration.

---

### `PTM-T-6` — Provenance table: migration + entity

| Field | Value |
|---|---|
| **Status** | ✅ **PASS** (Reviewer `opus`, attempt 1) |
| **Date** | 2026-09-22 |
| **Implementer attempts** | 1 |
| **Model** | Implementer `sonnet` · Reviewer `opus` |
| **Requirements covered** | `PTM-R-13` (storage half), `PTM-AC-12` (schema half) |

**Attempt 1 — files changed**

- `onecgiar-pr-server/src/migrations/1790020000000-CreateProgressTrackerResultProvenance.ts` (new)
- `onecgiar-pr-server/src/api/progress-tracker/entities/progress-tracker-result-provenance.entity.ts` (new)
- `onecgiar-pr-server/src/api/progress-tracker/entities/progress-tracker-result-provenance.entity.spec.ts` (new, 10 tests)

**Evidence re-run — `VERIFIED` (Leader-inline, non-author)**

| Command | Reported | Re-run |
|---|---|---|
| `npx jest …/progress-tracker-result-provenance.entity.spec.ts --silent --reporters=summary` | 10 passed | **10 passed** ✅ |
| `ls src/migrations \| sort \| tail -3` | `1790020000000-…` sorts last | **confirmed** ✅ |
| `{ nullable: false }` on the `@ManyToOne` | claimed | **confirmed** at entity `:49` ✅ |

⏸ **Scoping note:** the re-run was deliberately narrowed to T-6's own spec rather than `npx jest src/api/progress-tracker`, because `PTM-T-3` was concurrently writing a service + spec into the same directory. Same discipline applied at `PTM-T-9`, and for the same reason — a suite run across a directory being mutated is not evidence. (`PTM-T-2` independently observed exactly that flap earlier in this run.)

**🎯 The timestamp trap was avoided — the forward pointer paid for itself**

`PTM-T-1`'s Reviewer found that `1790010000000` cleared the prior maximum by only ~2.1 hours of wall-clock ms, so a fresh `Date.now()` taken today would land **below** it. That finding was carried into `PTM-T-6`'s brief **as a DoD line, not a footnote**, and the Implementer selected `1790020000000` explicitly. Had it used `Date.now()`, the provenance migration would have sorted **ahead of** the mapping table's — a wrong-order schema, invisible in review, failing only at deploy.

**Improvement over the task's own requirement (Implementer initiative, noted):** the task asked for an index on (`pt_indicator_id`, `pt_result_key`); the Implementer additionally asserted that **`pt_indicator_id` is the leading column**, because MySQL serves an equality lookup only on a leftmost index prefix. An index on (`pt_result_key`, `pt_indicator_id`) would satisfy a naive "the index exists" check while **failing** `PTM-R-13`'s actual by-indicator query clause. Flagged to the Reviewer for confirmation.

**Cross-task fix propagation:** `{ nullable: false }` on the `@ManyToOne` — the one-word divergence `PTM-T-1`'s Reviewer flagged — was applied here because the finding travelled in the brief. `PTM-T-1`'s own instance is **not** reopened for a cosmetic divergence; it is tracked at `tasks.md` §6 Rollout as a `migration:check` nullability diff.

**`Not Done / Assumptions`:** no live DB round trip (no `.env`, docker down, shared dev `.env` → `ECONNREFUSED`). Per the amended DoD this is `tasks.md` §6 Rollout, not this task's gate. Everything else in the DoD satisfied.


**Reviewer verdict → `STATUS: PASS`** (`opus`, attempt 1)

§3.1 parity **exact** — eight own columns with the spec's types and nullability, plus the five `BaseEntity` audit columns; nothing missing, nothing extra. The one object not named in §3.1 is `INDEX IDX_ptrp_result (result_id)`, which InnoDB would create implicitly for the FK anyway and which mirrors T-1's explicit twin `IDX_ptim_version` — house-consistent, not drift.

- **Leading-column assertion is real.** `…entity.spec.ts:78-87` matches the literal ``INDEX `IDX_ptrp_indicator_result_key` (`pt_indicator_id`, `pt_result_key`)`` **and** re-checks ordering on the isolated index line. An index built as (`pt_result_key`, `pt_indicator_id`) fails **both** assertions — so the by-indicator lookup clause of `PTM-R-13` is genuinely gated, not decoratively.
- **Structural proof honest, not circular.** Every assertion is a literal regex written in the spec; the SQL under test is captured from a mocked `QueryRunner` driving the real `up()`, never re-derived from the migration source. The FK branch is forced open by stubbing `information_schema.TABLE_CONSTRAINTS` → `total: 0`, so `ADD CONSTRAINT` is actually captured (`:27-32`, `:61-66`).
- **Both live `down` branches covered** (`:147-197`); the table-absent branch untested but trivially correct.
- **Timestamp verified independently** by the Reviewer: `src/migrations/` holds exactly three files at or above `1790…` and none at `18…`/`19…`.
- **FK type-compatible** — `Result.id` is `@PrimaryGeneratedColumn({ type: 'bigint' })` (`result.entity.ts:59-63`); `result.entity.ts` untouched, and the working tree's only modified files remain `serverless.yaml`, `modules.routes.ts`, `app.module.ts`.

**🎯 Risk narrowed — `PTM-T-6` carries NO error-1071 exposure.** Its only composite index is (`varchar(32)`, `varchar(64)`) with **no prefix length** — 384 bytes at utf8mb4, under even the 767-byte `COMPACT` limit. The §6 Rollout ROW_FORMAT item is **`PTM-T-1`-specific** and has been amended to say so. This is a real narrowing of the deploy risk surface, found by the Reviewer rather than assumed by the Leader.

`ADVISORY` (recorded, non-gating):
- **Readability:** `…entity.spec.ts:109-144` builds three literal JS objects and `.filter`s them — those lines prove nothing about the schema; the real proof is the DDL assertion at `:101-107`. A future reader could mistake the filter for a query test.
- **Risk:** `pt_result_key varchar(64)` is design-mandated but **unvalidated against an actual upstream `result_key`** — if PT emits a longer key, `PTM-T-7`'s insert errors or truncates. _(Advisory truncated in transit; tail requested, along with a routing question on whether `PTM-T-8`'s real staging fixture is the right place to assert the observed field lengths against the `varchar(64)`/`varchar(128)` widths.)_

**Ordering note (Leader):** the `[x]` in `tasks.md` was written before this verdict block was appended. The attempt history and `VERIFIED` re-run table were already recorded, so no traceability hole existed at any point — but the status field read "pending" for the duration, and the correct order is evidence-complete first. Recorded rather than quietly fixed.


---

## Forward pointers from `PTM-T-6`'s review — column-width drift

The Reviewer's `ADVISORY` tail, plus its answer to the Leader's routing question. **Neither is new scope**: each lands inside a deliverable the owning task already has.

**Risk:** `pt_result_key varchar(64)` is design-mandated but unvalidated against a real upstream key. An over-long key **truncates silently under a non-strict `sql_mode`** rather than erroring. Same exposure on `pt_evidence_fingerprint varchar(128)`, `pt_environment varchar(16)` and `pt_model varchar(64)` — **`pt_model` is the most likely to drift**, since upstream model identifiers grow with each vendor rename (`claude-haiku-4-5-20251001` is already 25 characters).

**Routing (Reviewer's answer, adopted):** assert in **both**, for different reasons.

| Task | What it carries | Why |
|---|---|---|
| `PTM-T-8` | Record the **observed lengths** of `result_key` and `cache.evidence_fingerprint` from the real staging capture, in the fixture's provenance header — **already required by its DoD** ("provenance of the capture recorded in the file header"). If an observed value exceeds its column width, that is a **Disqualifier-grade finding: stop and report** | One real sample. A useful early warning that the configured widths still match reality — but a single observation, with no bound on what PT may emit later. **Cannot close the risk on its own** |
| `PTM-T-7` | `@MaxLength(64)` / `@MaxLength(128)` / `@MaxLength(16)` / `@MaxLength(64)` on the provenance DTO block it is already writing, so an over-long upstream value is rejected with a 400 **before** reaching the `INSERT` | The **enforceable** guard. `onecgiar-pr-server/CLAUDE.md` §6 already mandates `class-validator` decorators on DTOs, so this is *how to write T-7's own deliverable correctly*, not extra work |

🛑 Both to be **copied verbatim into their briefs**. A pointer filed in this log is not carried by having been filed.

**Rollout subtlety recorded (`tasks.md` §6):** `down` returns silently when the table holds rows, so TypeORM records the revert as complete **while the table survives**. That is exactly what `design.md` §3.2 mandates and what both migrations do. Whoever runs the §6 round trip must expect a non-empty revert to leave the `migrations` row deleted and the table present — **and not read it as a failure.** Without this note, the correct behaviour looks like a bug at exactly the moment someone is verifying under deploy pressure.

---

### `PTM-T-3` — Proxy service: mapping lookup, upstream call, total status classification

| Field | Value |
|---|---|
| **Status** | ✅ **PASS on attempt 2** (Reviewer `opus`). Attempt 1 FAILed → Pivot → spec amended → reworked. Previously: `[~]` **PIVOT — rework loop stopped.** Reviewer `FAIL` (attempt 1 consumed, 2 remain). One finding is an implementation defect; the other proves the **approved requirements contradict each other**, so no rework attempt is spent on a broken spec |
| **Date** | 2026-09-22 |
| **Implementer attempts** | 1 |
| **Model** | Implementer `sonnet` · Reviewer `opus` |
| **Requirements covered** | `PTM-R-1`, `PTM-R-3`, `PTM-R-4`, `PTM-R-5`, `PTM-R-7`, `PTM-R-20`, `PTM-R-22`; `PTM-AC-1`–`PTM-AC-7` |

**Attempt 1 — files changed**

- `progress-tracker.service.ts` (new) · `progress-tracker.service.spec.ts` (new, 17 tests)
- `progress-tracker.config.ts` — **both `PTM-R-7` holes closed** · `progress-tracker.config.spec.ts` — +3 cases
- `progress-tracker.module.ts` — `TypeOrmModule.forFeature` + provider registration

**Evidence re-run — `VERIFIED` (Leader-inline, non-author)**

| Command | Reported | Re-run |
|---|---|---|
| `npx jest …/progress-tracker.service.spec.ts --silent` | 17 passed | **17 passed** ✅ |
| `npx jest src/api/progress-tracker --silent --reporters=summary` | 5 suites / 56 | **5 suites / 56** ✅ |
| Clamp present in source | claimed | **confirmed** — `progress-tracker.config.ts:58` `!Number.isFinite(parsed) \|\| parsed <= 0`; `:61` `Math.min(parsed, PT_INTEROP_TIMEOUT_MS_MAX)` ✅ |

**🎯 Watch item RESOLVED — and the Leader verified the clinching evidence rather than accepting it**

Decision: `:tocIndicatorId` is the **`related_node_id` string**, joined on `progress_tracker_indicator_map.toc_results_indicator_id` (text) + `version_id`. **Never** the bigint `toc_indicator_integration_id`. Documented in a service header comment.

Leader's independent confirmation against the **primary source**:
- `source/…Guide….txt:337` — the recorded walkthrough issues `GET /api/progress-tracker/indicators/5d51da6c6916/results`
- `source/…Guide….txt:339` — "In the database: … `results_toc_result_indicators.toc_results_indicator_id = 5d51da6c6916`"

Same value on both sides. The path parameter is exactly what that column holds. The requester's watch item (recorded at `design.md` §14 and the `tasks.md` pre-flight) is **closed by primary-source evidence**, not by an argument.

**🎯 Both `PTM-R-7` holes closed** — the forward pointer from `PTM-T-2`'s review paid for itself:
- (a) clamp: `PT_INTEROP_TIMEOUT_MS_MAX = 28000`, `Math.min(parsed, MAX)` → `45000` → `28000`, strictly below the 29 000 ms ceiling
- (b) malformed input: falls back to the 25 000 default on `!Number.isFinite(parsed) || parsed <= 0` — covering `'abc'` (NaN), whitespace (`Number(' ') === 0`), `0` and negatives. **The "axios receives falsy → no timeout at all" failure mode is eliminated.**
- New spec cases: over-ceiling, `'abc'`, whitespace. The pre-existing `28000` case still passes unchanged.

**Falsifier executed and independently credible:** the catch block was replaced with a leaking `{ status, message, url, body }` → **5 of 17 red**, precisely the two `AC-5` leak cases plus the dedicated falsifier test, each failing on the **sentinel assertions** rather than on imports → reverted → 56/56 green.

**🛑 ESCALATION — cross-child spec conflict on `source.pt_url` (open, user decision requested)**

The Implementer strips `indicator.indicator_id`, `indicator.program_id` **and `source.pt_url`** from the `ok` payload. The Leader verified what `pt_url` contains (`source/…Guide….txt:188`):

```
"pt_url": "https://dev-performance-tracker.synapsis-analytics.com/program/…?indicator=8006329bfd49"
```

It embeds the **PT indicator id** as a query parameter, on a **synapsis-analytics host**. The conflict:

| Rule | Strength | Implication |
|---|---|---|
| `PTM-R-3` (child 1) | **MUST** — upstream id absent from any response body | stripping is **required** |
| `PTB-R-23` (child 2) | **SHOULD** — the panel links out to the KPI in the Progress Tracker | **needs** `pt_url` |
| Guide §6 Fig. 6 + `…txt:249` | product feature — "Open in Progress Tracker … so the person can look at the originals" | shipped in the prototype |

A MUST outranks a SHOULD, so the Implementer's choice is **spec-correct** — but it silently deletes a documented product feature and renders child 2's `PTB-R-23` unimplementable. Neither child's spec noticed the collision at specify time; this is a **Leader/spec defect**, not an Implementer error.

Options put to the user: **(A)** keep the strip, amend `PTB-R-23`; **(B)** strip only the `?indicator=` parameter, keeping a program-level link; **(C)** *(recommended)* add `GET /api/progress-tracker/indicators/:id/open` → 302 redirect, server-side, so the browser never sees the id or host — lands naturally in `PTM-T-4`, which is already writing the controller; **(D)** relax `PTM-R-3` to exempt the PT web-app URL.

**Not Done / Assumptions (Implementer, carried verbatim):** response-whitelist judgment call as above; query-DTO whitelisting (`PTM-R-6`) explicitly deferred to `PTM-T-4`; no live DB or upstream round trip (none reachable) — all mocked.


**Reviewer verdict → `STATUS: FAIL`** (`opus`, attempt 1). Both findings **independently confirmed by the Leader** against source before acting.

### Finding 1 — implementation defect: the envelope is inert at the wire (`PTM-DD-1` defeated by its own mechanism)

`Return-data.interceptor.ts:30` reads:

```js
statusCode: (data?.status ? data?.status : data?.statusCode) || 200,
```

It **prefers `data.status` over `data.statusCode`**. The service returns `{ statusCode: 200, status: 'ok' }` (`progress-tracker.service.ts:178-180`), so the interceptor sets the HTTP status from the **classification string** — `response.status('ok')` reaches Express. And `:29` builds `response: data?.response || {}`; the service returns no `response` key, so **the entire proposals payload is discarded** before it reaches the client.

The 17 green tests assert the in-process object and **structurally cannot see this** — `statusCode: 200` is present but inert. A textbook presence-assertion passing while the behaviour is broken.

**Remediation (adopted):** return the house envelope the exemplar uses at `cgspace-discovery.service.ts:528-542` — `{ response: { status, … }, message, statusCode: 200 }`, with **no top-level `status`** — plus a test that pipes the result through `ResponseInterceptor` so the property is *proven*, not merely present.

### Finding 2 — 🛑 **PIVOT: `PTM-R-3` contradicts `PTM-R-13` and the duplicate-detection design**

`sanitizeProposals` strips `indicator.indicator_id`, `indicator.program_id` and `source.pt_url`, then assigns `safe.results = data.results` **verbatim** (`progress-tracker.service.ts:261-263`). But the Guide (`source/…txt:214`) defines:

> `result_key` — `<indicator_id>:<n>` — stable within one generation; **keep it on the created result for duplicate detection**

So **every proposal ships the very id `pt_url` was stripped for embedding.** The stripping is not merely incomplete — it is *incoherent*, because the id cannot be removed:

| Rule | Demands |
|---|---|
| `PTM-R-3` (MUST) | the upstream id MUST NOT appear in any response body |
| `PTM-R-13` (MUST) | PRMS MUST persist `result_key` — which *is* `<indicator_id>:<n>` |
| `PTM-AC-12`, Guide §8.1 A5 | `result_key` must be **queryable** for the duplicate rule |
| `PTB-R-23` (child 2) | the panel links out via `pt_url` |

**`PTM-R-3` as written is unsatisfiable together with `PTM-R-13`.** No implementation can honour both. This is a **Leader/spec defect authored at specify time**, not an Implementer error — which is why the Pivot Protocol applies and **no further rework attempt is spent** until the spec is fixed.

---

## Pivot Record: `PTM-T-3`

**Blocker.** `requirements.md` `PTM-R-3` forbids the upstream `indicator_id` from any response body, while `PTM-R-13` requires PRMS to persist `result_key`, which contains it by construction. The two MUSTs cannot both hold.

**Root cause.** `PTM-R-3` conflates two distinct concerns under one rule:
1. **Secrets** — the API key and the Interop base URL. Genuinely must never leak.
2. **The addressing contract** — the client must address *PRMS* identifiers, so the mapping stays server-side and the two children remain parallel-safe (`family.md` §2, `design.md` `P-9`).

The PT `indicator_id` is **not a secret**. It is an identifier the design itself requires PRMS to store and child 2 to send back. Knowing it grants nothing: calling the upstream needs the base URL **and** the key, neither of which ever leaves the server. Forbidding it was over-reach on my part, and it collided with the provenance requirement two sections later.

**Proposed amendment** — split `PTM-R-3` into three, preserving every genuine protection:

| New | Strength | Text |
|---|---|---|
| `PTM-R-3a` | **MUST** | The upstream **base URL** and **API key** MUST NOT appear in any response body, response header, or log line. *(unchanged in force)* |
| `PTM-R-3b` | **MUST** | Client-facing routes MUST accept and require **PRMS/Integration identifiers only**. No route accepts a PT `indicator_id` from the client, and the mapping is resolved server-side. *(the real contract that keeps the children parallel-safe)* |
| `PTM-R-3c` | **MAY** | The PT `indicator_id` MAY appear inside **opaque provenance values** (`result_key`) and **display-only deep links** (`source.pt_url`), because `PTM-R-13` requires `result_key` to be stored and `PTM-AC-12` requires it to be queryable. |

**Consequences if approved:**
- Finding 2 dissolves — `results[]` passes through verbatim, as `PTM-R-13` needs.
- The earlier **`pt_url` escalation dissolves too**: option **(C)**, the 302-redirect route, becomes unnecessary. Child 2's `PTB-R-23` "Open in Progress Tracker" is restored at zero cost.
- `PTM-AC-1` needs its wording narrowed to match `PTM-R-3a`/`3b`.
- Only Finding 1 remains as real rework — unambiguous and independently fixable.

**Awaiting user approval before resuming.** Per the Pivot Protocol the spec is not amended, and no Implementer is re-briefed, until the user approves — a brief composed against the superseded text would be honoured faithfully into another FAIL.

### `PTM-T-3` — Reviewer's passing checks (tail, received in full)

Everything **outside** the two findings holds, and the four checks the Leader flagged as most likely to be decorative are genuine:

| Check | Finding |
|---|---|
| **Classification is total** (`PTM-R-4`) | `404` → `not_found`; everything else — `422`, `5xx`, timeout, **and an `EmptyError`** (observable completes without emitting) → `unavailable`. **No fall-through, no fourth state.** |
| **`PTM-AC-2` zero upstream calls** | Asserted **behaviourally**, not by status shape: `…service.spec.ts:118` (no mapping row), `:129` (`match_quality: 'none'`), `:139` (no active version) each carry `expect(httpService.get).not.toHaveBeenCalled()`; `:138` additionally asserts `mappingRepository.findOne` was never called in the no-version case |
| **`X-API-Key`** (`PTM-R-5`, `PTM-AC-7`) | `…service.ts:162-163` `const headers = apiKey ? { 'X-API-Key': apiKey } : undefined`, spread conditionally at `:173`. Empty **and** unset both fall to no header. `:349-369` asserts it is sent verbatim when set **and** that a serialisation of every captured `logger.warn` call contains no `SENTINEL-API-KEY-VALUE` |
| **The `PTM-R-7` clamp is airtight** | `MAX = 29_000 − 1_000 = 28_000`. The guard catches `undefined`→`NaN`, `''`→`0`, `'   '`→`0`, `'abc'`→`NaN`, `'0'`, negatives and `'Infinity'`. **No input path yields ≥ 29 000, and none yields a falsy value — axios never sees "no timeout."** |
| **Active version** (`AC-5` phase correctness) | `…service.ts:105-111` replicates `versioning.service.ts:151-161` `$_findActivePhase` exactly (`status: true, is_active: true, app_module_id: AppModuleIdEnum.REPORTING`) via a direct `Repository<Version>` — no `VersioningService` dependency. No open phase → `not_found` with zero HTTP calls (`:115-117`). The mapping lookup is scoped by `version_id: activeVersion.id` (`:119-124`) |

**Primitives-only catch confirmed:** `:221-235` reads only `typeof err?.response?.status === 'number'`; both `Logger.warn` calls (`:152`, `:185`) carry classified status, `reason`, numeric `upstreamStatus`, `durationMs` — no message, `config.url`, body, base URL or key.

`ADVISORY` (recorded, non-gating):
- **Reliability:** both `findOne` calls sit **outside any try/catch** — a DB failure throws past the three-way classification into `HttpExceptionFilter` as a 5xx. Not an upstream outcome, so **not** a `PTM-R-4` violation, but it is the only path that can emit a 5xx from this route.
- **Risk:** any finite positive override is accepted, so `PT_INTEROP_TIMEOUT_MS=0.5` yields a 0.5 ms timeout (every call `unavailable`). Harmless for `PTM-R-7`; a floor would make the override foolproof in both directions.

**Not advisory — a genuine AC-coverage gap, folded into the rework brief:** `PTM-AC-7`'s Given is "`PT_INTEROP_API_KEY` is **empty**", but the test `delete`s the variable (**unset**). Identical code path, but the AC's literal case is untested. One extra case closes it — this is AC coverage the task already owns, not new scope.

### Pivot RESOLVED — requester approved the split, 2026-09-22

`PTM-R-3a` / `3b` / `3c` approved **exactly as proposed**. Option (C) — the 302 `/open` redirect route — **cancelled**: with `3c` in force, `source.pt_url` stays in the `ok` payload and child 2's `PTB-R-23` "Open in Progress Tracker" works as originally designed, at zero cost.

**Correction Closure — swept in both directions, per `/akili-specify`:**

*Forward* (the superseded value at sites the pivot analysis did not cite):

| File | Change |
|---|---|
| `…indicator-mapping/requirements.md` | `PTM-R-3` → `3a`/`3b`/`3c`; §7 Security row; **`PTM-AC-1` narrowed** to base-URL/key only, with the PT id inside `result_key`/`pt_url` explicitly permitted; index rows split |
| `…indicator-mapping/design.md` | §7 Security "Upstream identity" row rewritten |
| `…indicator-mapping/tasks.md` | `PTM-T-3` `Implements:` list |

*Backward* (documents that cited the old text and would now assert a falsehood) — **this is where the sweep earned its keep**:

> **Child 2 carried the identical defect and nobody had noticed.** `PTB-R-6` read *"The Progress Tracker `indicator_id` … MUST NOT appear … in the browser's network log"* — which `PTB-R-16` (send `result_key` back) and `PTB-R-23` (render `pt_url`) make unsatisfiable, exactly as `PTM-R-3` was. Had the sweep run only forward, child 2 would have reached execute with a contradiction already proven fatal in child 1.

| File | Change |
|---|---|
| `…results-browse/requirements.md` | `PTB-R-6` → `6a`/`6b`/`6c`; §7 Security row; **`PTB-AC-16` narrowed** — *no request the browser **issues*** may carry the id; a **received** body may; index rows split |
| `…results-browse/design.md` | §7 "Upstream identity" row rewritten |
| `…results-browse/tasks.md` | `PTB-T-1`, `PTB-T-7`, `PTB-TEST-1` `Implements:` lists; **`PTB-T-7`'s static leak guard explicitly re-scoped** — it must flag the base URL/key and the client *sending* a PT id, and must **not** flag a PT id in a *received* response body |

**Re-sweep verification:** `grep -rn "PTM-R-3\b\|PTB-R-6\b" --include='*.md' . | grep -v execution.md | grep -vE "PTM-R-3[abc]|PTB-R-6[abc]"` → **empty**. Five stragglers were found and fixed on the first pass; none remain.

**`PTM-T-3` re-dispatched as attempt 2 of 3.**


### `PTM-T-3` attempt 2 → **STATUS: PASS** (`opus`)

**Evidence re-run — `VERIFIED` (Leader-inline, non-author)**

| Gate | Attempt 1 | Attempt 2 reported | Re-run |
|---|---|---|---|
| `progress-tracker.service.spec.ts` | 17 | 22 | **22** ✅ |
| `src/api/progress-tracker` | 56 | 61 | **61** ✅ |
| Whole server | 3197 | 3202 | **3202** ✅ |

The +5 reconciles exactly (whitelist pass-through, `PTM-AC-7` empty-string, three interceptor-pipe tests). Leader also read the fix directly: `progress-tracker.service.ts:176-180` emits `{ statusCode: 200, message, response: body }` with **no top-level `status`**.

**Reviewer findings:**
- **Finding 1 fixed at the wire.** The pipe tests import and instantiate the **real** `ResponseInterceptor` (`…spec.ts:10,505,528,556`), feed it the **service's own return value** through `next.handle()`, and assert both `res.status(200)` and that `wired.response` deep-equals the full payload. Not a stub — which was the one way this fix could have repeated attempt 1's mistake in a new costume.
- **Nuance worth recording:** the permanent falsifier at `:549-574` is *regression-insensitive by construction* (it re-adds `status` itself, so it stays green either way). Its job is to prove the interceptor's precedence rule at `Return-data.interceptor.ts:30` is real — which makes the `toHaveBeenCalledWith(200)` assertions at `:516`/`:539` the **load-bearing** ones. The pair together gates the defect; neither alone would.
- **`PTM-R-3c` reversal complete**, `PTM-R-3a` still honoured — verified against the real upstream shape (Guide `…txt:187-188`): `source` is `{system, environment, pt_url}` and **structurally cannot** carry the interop base URL or key.
- **Whitelist survived the reversal** — the new test puts a real unlisted `debug_internal` **in the fixture** and asserts it is `undefined`. Real, not vacuous.
- **`PTM-AC-7`** both cases present (`delete` at `:403`, literal `''` at `:415`).
- **No regression** in the five previously confirmed behaviours; classification total by construction (unconditional `'unavailable'` default at `:269`).

`ADVISORY` (recorded): the test at `:524` is titled "…for the not_found and unavailable cases too" but its body only arranges the `not_found` path — a misleading name, not a coverage gap (`unavailable`'s `statusCode: 200` is covered by the `it.each` at `:449-472`, and all four return sites share `buildEnvelope`).

**Two cross-cutting risks raised by this review — acted on separately:**
1. ✅ **Fixed directly (factual correction, no requirement changed):** `progress-tracker-results-browse/design.md` §2.3 sketched the client reading `200 { status: 'not_found' }` at the **body top level**; post-interceptor it is **`body.response.status`**. The sketch and premise `P-13` are corrected. Left unfixed, child 2 would have implemented against a shape that cannot occur.
2. 🛑 **Escalated to the user:** `design.md` §4.1's whitelist is `{ status, indicator, results, evidence_count, generated_by, source }` — it drops upstream **`cache.evidence_fingerprint`** and top-level **`generated_at`** (Guide `…txt:182,186`). But `PTM-R-13` requires `evidence_fingerprint` **and the generation timestamp** to be persisted by the create path child 2 feeds. **As specified they never reach the client, so `PTM-R-13` is unsatisfiable** — the same defect class as the Pivot, found by the same mechanism. Blocks `PTM-T-7` and child 2; does **not** block `PTM-T-4`.


### `PTM-T-3` — advisory tail + the whitelist answer

**Reliability advisory (now recorded as defect class `D-14`):** no assertion pins `timeout: getProgressTrackerTimeoutMs()` onto the axios request config. The clamp is tested in the config spec, but the **wiring** of the clamped value onto the request is not — deleting the `timeout` line from the `httpService.get` options would leave the suite green. That is precisely the "no input makes this check fail" condition this spec's own task rules forbid, sitting under a **MUST** (`PTM-R-7`). One line closes it: `httpService.get.mock.calls[0][1].timeout`.

Recorded as a **named gap in `requirements.md` §9**, not folded back into `PTM-T-3`, which has PASSed — *Advisory Never Becomes A Task*. Recommended for whichever task next touches the service.

**Whitelist question — answered precisely by the Reviewer:**

Of the five items `PTM-R-13` enumerates, **three already reach the client** under the current five-key list:

| `PTM-R-13` item | Reaches the client? |
|---|---|
| `result_key` | ✅ inside `results[]` |
| upstream environment | ✅ as `source.environment` |
| drafting model | ✅ as `generated_by.model` |
| **`evidence_fingerprint`** | ❌ lives in upstream `cache` — **dropped** |
| **generation timestamp** | ❌ upstream top-level `generated_at` — **dropped** |

So the gap is exactly two fields, and the Reviewer offers a **narrower fix than the Leader proposed**: rather than whitelisting the whole `cache` object (which also carries `hit` and `cached_at`), project **just `evidence_fingerprint`** out of it and add `generated_at`. That keeps §4.1 minimal and adds no field the design has no use for. **Leader adopts this over its own broader suggestion**; awaiting the user's approval to apply, since it changes the contract child 2 consumes (`P-13`).

---

### `PTM-T-4` — Query DTOs, controller, and both read routes

| Field | Value |
|---|---|
| **Status** | ✅ **PASS** (Reviewer `opus`, attempt 1) |
| **Date** | 2026-09-22 |
| **Implementer attempts** | 1 — **no attempt consumed.** Two rounds of owed scope were returned via `SendMessage` continuation, which is not a FAIL |
| **Model** | Implementer `sonnet` · Reviewer `opus` (review depth raised to `full` — override (b), the task touches a response shape child 2 consumes) |
| **Requirements covered** | `PTM-R-1`, `PTM-R-2`, `PTM-R-6`, `PTM-R-13` (client-facing half); `PTM-AC-8` |

**Files changed:** `dto/pt-results-query.dto.ts` (+spec) · `dto/pt-ready-counts-query.dto.ts` (+spec) · `progress-tracker.controller.ts` (+spec) · `progress-tracker.module.ts` (controller registration) · `progress-tracker.service.ts` (+spec) — see the scope note.

**Evidence re-run — `VERIFIED` (Leader-inline, non-author)**

| Gate | Reported | Re-run |
|---|---|---|
| `src/api/progress-tracker` | 8 suites / 98 | **8 suites / 98** ✅ |
| Whole server | 262 suites / 3239 | **3239** ✅ |
| Narrow-projection assertions present | claimed | **confirmed**, 6 refs ✅ |
| `D-14` timeout-pinning assertions present | claimed | **confirmed**, 2 refs ✅ |
| `programId` header comment | claimed absent (stale) | **present** ✅ |

**🛑 Decomposition gap found by the Implementer — Leader's error**

`PTM-T-4`'s `Implements:` names `PTM-R-2` (ready-counts), but `PTM-T-3` built only `getIndicatorResults` and **no task assigned the ready-counts service method**. The controller had nothing to call. The Implementer added `getProgramReadyCounts`, **flagged explicitly** that it had touched a file already PASSed, and offered to hold it to `PTM-T-3`'s bar rather than shipping it quietly.

This is a **coverage-closure defect in the Leader's `tasks.md`**: every requirement appeared in *a* task's `Implements:` line, but `PTM-R-2`'s owning task description did not actually deliver it. ID-level presence is not closure — the exact failure the specify rules warn about, committed by the Leader who wrote the rule into the spec.

**Two rounds of owed scope returned (no attempt consumed):**

1. **Service-level tests for `getProgramReadyCounts`.** Leader measured rather than assumed: `grep -c getIndicatorResults …spec.ts` → 20; `getProgramReadyCounts` → **0**. The method was covered only by controller tests with a **mocked service**, which by construction cannot test the service's own leak behaviour — leaving defect class `D-1` (the spec's highest severity) unproven for it. 16 tests added: sentinel leak falsifier, full status classification, `X-API-Key` unset/empty/non-empty, envelope shape, and proof the mapping repository is never touched.
2. **The §4.1 whitelist projection and `D-14`.** The projection *code* landed but its *assertion* did not — again caught by grep (`cache.hit|cached_at` → 0), and `D-14` → 0. Without the assertion, "narrow projection" is a comment, not a property: a refactor to whitelisting the whole `cache` object would pass every other check.

**Falsifier evidence — the strongest in this run:**

| Mutation | Result |
|---|---|
| `forbidNonWhitelisted` → `false` | both `evil=1` cases red; `max_results=20` **still passed**, proving it gates *range*, not whitelisting |
| Revert the whitelist projection | **exactly 2** tests red (`generated_at`, `evidence_fingerprint` undefined) |
| Delete the `timeout:` line from **both** `httpService.get` call sites | **exactly the 2 new `D-14` tests red, the other 39 green** |
| Leak `err.message` into the ready-counts catch | sentinel `SENTINEL-RC-MESSAGE` found → red |

The third one is the model: naming *which* tests stayed green is what proves the gate is the gate, not merely that something fired.

**`:programId` — resolved by the Leader, recorded in `design.md` §4.1**

The Implementer declined twice to pick between two readings, correctly — they would have produced materially different work. Resolution: `:programId` is the **PRMS program name/code**, forwarded unchanged. Guide §4.3 states the upstream accepts "the program id **or its name**", and the PT id is `md5("PROGRAM|{name}")[:12]` — **derived from the name**, so the name is the PRMS-native form and sending it satisfies `PTM-R-3b` with zero code change. Its pass-through implementation was already correct.

**On its `pt_program_id` finding** (a good catch): that column is **fill-time provenance for audit** — a record of what `/resolve` returned — and is deliberately **not** read by the read path. Recorded in `design.md` §4.1 explicitly so it is not later "fixed" by wiring a lookup the upstream does not need.

**`D-14` closed.** The gap where deleting the `timeout` line left the entire suite green — under a **MUST** (`PTM-R-7`) — is now gated on both service methods.


**`PTM-T-4` Reviewer verdict → `STATUS: PASS`** (`opus`, attempt 1). All eight requested checks verified at source.

- **`PTM-AC-8` is real, and stronger than the task required.** `progress-tracker.controller.spec.ts:92-113` **boots a real Nest app and hits the route over HTTP** rather than calling the handler directly. Three fixtures: `max_results=20` alone (range), **`max_results=5 & evil=1`** — the case only whitelisting can reject — and both together. Each asserts the service mock was **not** called, so nothing reaches the upstream. Ready-counts carries the same pair (`:134-154`).
- **`forbidNonWhitelisted: true` on both routes** (`:53-59`, `:81-87`), identical to the precedent, and **no global pipe overrides it** (none registered in `main.ts`) — the Reviewer checked the override path, not just the declaration.
- **Narrow projection non-vacuous** — the fixture's `cache` carries **all three** keys (`hit`, `evidence_fingerprint`, `cached_at`); asserts `evidence_fingerprint` and `generated_at` present, `response.cache` undefined, `Object.keys(response)` excludes `cache`, and the serialised envelope excludes the `cached_at` sentinel. Implementation projects **one field out of** `cache`, never the object (`service.ts:467-476`).
- **`D-14` pinned on the real request config for both methods** (`:308-317`, `:710-718`) — closes the named gap in `requirements.md` §9.
- **`getProgramReadyCounts` meets `PTM-T-3`'s bar** — sentinel leak falsifier with one sentinel per field (`message`, `config.url`, `response.data`), asserted absent from the return value **and** every logger call; classification total incl. unconfigured base URL (which also asserts `PT_INTEROP_BASE_URL` is never named); `X-API-Key` unset/empty/non-empty; envelope with no top-level `status`.
- **`P-7` holds** — no `@UseGuards` anywhere; `app.module.ts:143-150` still excludes only platform-report and bilateral.
- **Envelope pass-through unmodified** — both handlers return the service result directly; `controller.spec.ts:64-79`, `:117-132` assert the envelope survives **over HTTP** and that the DTO instance with defaults applied is what reaches the service.

`ADVISORY` — both are **child-2 contract items**, recorded as forward pointers, not acted on here:
1. **Reliability:** `refresh` accepts only the literal `true`/`false` (`pt-results-query.dto.ts:38-43`); **`?refresh=1` returns 400**. Child 2's client must not send `1`/`0`.
2. **Readability:** the routes carry `@ApiTags`/`@ApiOperation`/`@ApiParam` but **no `@ApiOkResponse`**, which `src/CLAUDE.md` §11.6 recommends for a non-trivial surface — and which is child 2's best machine-readable description of the envelope it consumes.

→ **Both copied into child 2's `tasks.md` `PTB-T-1` as consumed-contract notes.** A pointer filed in this log is not carried by having been filed.

---

### `PTM-T-8` — Upstream contract fixture test

| Field | Value |
|---|---|
| **Status** | ✅ **PASS** (Reviewer `opus`) — after one FAIL on a Leader-owned document inconsistency, fixed by the Leader |
| **Date** | 2026-09-22 · **Implementer attempts:** 1 |
| **Requirements covered** | `PTM-R-4`, `PTM-R-20`; re-confirms `PTM-AC-4`; **settles `P-14`** |

**🎯 PT staging IS reachable from this machine — `P-14` is now genuinely VERIFIED**

The task was briefed to try, and to fall back to a Guide-derived fixture **clearly labelled as such** if egress failed. It did not fail: `200` in 6.2 s, then a full cold `refresh=true&mode=auto` capture in **23.1 s**.

**Leader's independent confirmation** (not taken from the report): a cached call returned `200`, `cache.hit = true`, `evidence_fingerprint` 64 chars, model `claude-haiku-4-5-20251001`. The committed fixture reads `environment: staging`, `generated_by.mode: ai`, **`cache.hit: false`** — a genuine **cold** capture, not a warm replay. The 422 fixture is a real FastAPI validation body.

**Evidence re-run — `VERIFIED`:** `npx jest src/api/progress-tracker` → 9 suites / **105** (was 98; +7, none modified).

**Column widths — all fit, measured against the live capture:**

| Field | Observed | Column | Margin |
|---|---|---|---|
| `result_key` | 14 (`8006329bfd49:1`) | `varchar(64)` | 78 % free |
| `evidence_fingerprint` | 64 | `varchar(128)` | 50 % free |
| `source.environment` | 7 (`staging`) | `varchar(16)` | 56 % free |
| `generated_by.model` | 25 (`claude-haiku-4-5-20251001`) | `varchar(64)` | **61 % free — tightest** |

`PTM-T-6`'s forward pointer is discharged: no truncation risk on this capture. `pt_model` remains the field most likely to drift on a vendor rename, flagged in the fixture README for re-check rather than treated as closed forever.

**Implementer judgment call, accepted:** PT DEV's documented 422 trigger (`mode=template&refresh=true`) returns **200** on staging — which is itself a finding: **staging matches the contract and DEV's 422 is DEV-only drift**, exactly as `P-14` supposed. Since DEV is disqualified as a fixture source, it captured a **staging-native** 422 via `mode=bogus` (the upstream's own query validation). This satisfies `PTM-AC-4` (any 422 → `unavailable`) without importing a disqualified source, and the provenance is documented in both the fixture README and `design.md` so it cannot be mistaken for a DEV capture.

---

## 🛑 Two measured findings that refine recorded premises

**(1) Warm-path latency is BETTER than recorded; the first call after idle is worse.**

Leader sampled rather than reporting a single reading — the first cached call returned in **3.55 s**, which would have looked like a contradiction of the 1.1 s baseline. Three further samples: **0.70 s, 0.67 s, 0.89 s**, and `mode=template` **0.66 s**.

So the 3.55 s was a **PT-side Lambda cold start**, not a regression. The recorded warm baselines hold and are in fact conservative. But the refinement matters for child 2:

> ⚠️ **`PTB-R-20`** targets "first meaningful paint within **1.5 s** on the template/cached path". Warm, that is comfortably met (0.66–0.89 s). **On the first open after an idle period it is not** — the PT-side cold start alone is ~3.5 s. Child 2's loading state must tolerate ~3.5 s on a *cached* path, not only the ~20 s AI path.

**(2) The cold-draft margin against `PTM-DD-4`'s 25 s client timeout is thinner than assumed.**

| Source | Cold `mode=auto` |
|---|---|
| Requester's measurement (OQ-8) | 20.2 s |
| `PTM-T-8`'s live capture (`refresh=true`) | **23.1 s** |
| `PTM-DD-4` client timeout | 25 s → **1.9 s margin** |

The upstream caps itself inside its own 29 s gateway and falls back to a template, so a call that takes 26–28 s upstream would return *valid* content — but PRMS would have cut it at 25 s and reported `unavailable`. Raising the default toward **27 s** (still strictly below the 29 s ceiling, so `PTM-R-7` holds) would let PRMS receive that fallback.

**Not blocking, and not urgent:** `PT_INTEROP_TIMEOUT_MS` is env-overridable, so this is tunable at deploy without a code change. Surfaced for the requester rather than decided by the Leader, since it revisits an approved `PTM-DD-4` value.

**⚠️ Reachability from a laptop is NOT gate D1.** D1 is egress **from the PRMS TEST VPC/Lambda** to the PT staging host. This session reached staging from a developer machine, which says nothing about the VPC's egress rules. **D1 remains OPEN** in `family.md` §5 and must not be read as closed by this result.


**`PTM-T-8` Reviewer verdict → `FAIL` (attempt 1) → fix → `PASS`**

**The single FAIL issue was in a document the Leader owns, not in the Implementer's work.** `design.md` §1A's Premise Ledger header still read `Verified: 13 · UNVERIFIED: 1` after `P-14` was settled — so §1A asserted an open premise that no longer existed and contradicted its own §14 closure row. A later `/akili-audit` would have hunted for a closed premise.

Fixed by the **Leader**, not re-spawned to the Implementer: the count line is a derived summary of a Leader-authored document — housekeeping, not production code. The Reviewer then confirmed §1A is internally consistent with the `P-14` row, the callout and the §14 closure row, and that nothing else in §1A asserts the pre-update state. **Attempt accounting: 1 consumed, 2 remain. Review rounds: 2 of 2 budgeted — now exactly spent.**

**🛑 The same Reviewer then found a SECOND stale reference the Leader had missed**, outside `PTM-T-8`'s scope: `design.md` `PTM-DD-4` still read *"this decision rests on `P-5`, which is `UNVERIFIED`"* — stale since the Leader's own `P-5` re-verification hours earlier.

This is the **backward-sweep lesson repeating**: when `P-5` was verified, the row was updated and the references **to** it were not. Exactly the failure the Correction Closure rule exists to prevent, committed by the Leader who ran that sweep correctly for the `PTM-R-3` Pivot and skipped it for a premise update. A `grep -n "P-5\b\|P-14\b"` over `design.md` found both in one command — the sweep costs seconds and was simply not run.

Both fixed, plus §8's latency baselines replaced with the live measurements.

**What the Reviewer confirmed on the substance:**
- Fixture is genuinely **cold `mode=auto` staging** — `cache.hit: false`, `mode: "ai"`, `environment: "staging"`, 64-char fingerprint, all three pinned at `fixtures-keys.spec.ts:105-112` so a future template-mode re-capture goes **red rather than silent**
- `PTM-AC-4` **behaviourally** asserted — the 422 body is driven through `getIndicatorResults` as a rejected Axios error and the whole envelope matched, proving classification **and** "resolves, never throws"
- `P-14`'s row is accurate and **not overstated**: it claims staging conformance only, records that DEV's documented trigger returns `200` on staging, and claims no re-test of DEV
- **No vacuous assertion, no silent rot** — every value is read from the committed JSON via `readFileSync`; no fingerprint, timestamp or id is hardcoded, so a re-capture re-derives the checks

`ADVISORY` — Reviewer confirmed explicitly that **none is a conformance violation**; logged as named gaps, not actioned (`PTM-T-8` closed; *Advisory Never Becomes A Task*):
1. **The capture carries a top-level `validation` block that is NOT in the §4.1 whitelist.** The README calls it "correctly dropped" but **no test asserts it** — the fourth instance in this run of *behaviour right, comment says so, nothing proves it*. One assertion (`expect(Object.keys(result.response).sort()).toEqual([…])`) would close `validation`, `cache`, `hit` and `cached_at` together. **Recommended for whichever task next touches these fixtures.**
2. `fixtures-keys.spec.ts:181`'s test name asserts provenance ("not a DEV capture") that no test can verify — a README claim wearing a test's name.
3. The README's "field-for-field" claim holds at the **top level only**; `generated_by` gained `evidence_scope`/`model_key`/`truncated` and `results[]` ~9 keys versus the Guide's trimmed example. Both pass through opaquely.
4. `design.md:34` puts `PTM-T-8` in the **Verified at** column where every sibling carries a commit SHA — column-contract drift; a SHA once the fixture commit lands restores it.

---

### `PTM-T-5` — `/resolve` client and the idempotent fill routine

| Field | Value |
|---|---|
| **Status** | ✅ **PASS on attempt 2** (Reviewer `opus`). Attempt 1 FAILed on two findings; budget tripwire escalated and the overrun accepted by the requester before rework |
| **Date** | 2026-09-22 · **Implementer attempts:** 1 |
| **Requirements covered** | `PTM-R-10`, `PTM-R-11`, `PTM-R-21`, `PTM-R-22`, `PTM-R-30`; `PTM-AC-9`–`PTM-AC-11` |

**Files:** new `progress-tracker-resolve.service.ts` (+spec), `repositories/pt-porb.repository.ts` (+spec), `dto/pt-resolve-trigger.dto.ts` · edited `progress-tracker.controller.ts` (+spec), `progress-tracker.module.ts`, `progress-tracker.service.ts` (`classifyUpstreamFailure` extracted to a module-level export, private method delegating).

**Evidence re-run — `VERIFIED`**

| Gate | Reported | Re-run |
|---|---|---|
| module suite | 11 suites / 127 | **11 suites / 127** ✅ |
| whole server | 3267/3268 (1 "pre-existing" failure) | **265 suites / 3268 — ZERO failures** ✅ |

**🛑 Leader process error, caught and corrected — worth recording in full**

The Leader's own whole-server run reported **3 failures**, not the Implementer's 1, and the Leader had captured it with `--reporters=summary | tail -4`, which gives counts **without suite names**. Three failures that could not be named.

Two Leader mistakes compounded:
1. **Two Jest suites were run concurrently** (module + whole-server), against the root `CLAUDE.md` rule *"never run a measurement command while a delegated agent is active"*. That run took **643 s** versus a normal ~90 s.
2. **The capture format was adequate only for a green result.** `--reporters=summary | tail -4` confirms a known-good number and becomes useless the instant something fails.

The Leader **declined to close `PTM-T-5` on the more convenient of two numbers** and re-ran the suite **solo with the default reporter**, grepping `FAIL` lines by name. Result: **265/265 suites, 3268/3268 tests, zero failures.** Identical test total (3265 + 3 = 3268), so all three were contention artifacts — the diagnosis is now **proven, not assumed**.

Separately, the Implementer's single reported failure (`bilateral-handoff.controller.spec.ts`) was verified in isolation before any of this: **14/14 pass**, and `grep -c "progress-tracker\|ProgressTracker"` on it → **0**. That check was sound but did not extend to failures the Leader had not seen — which is why the solo re-run was necessary rather than optional.

**🎯 `/resolve` contract correction — the second time checking live beat reading the Guide**

The brief told `PTM-T-5` to verify the real `/resolve` shape because PT staging had just been proven reachable. It found, and the **Leader independently confirmed**, that the response has **no top-level `score`**:

```
top-level keys : candidates, computed_indicator_id, indicator_id, match, program, program_id
candidate keys : aow, center, description, hlo_title, indicator_id, kpi_type, score
match=fuzzy    : indicator_id=8006329bfd49, 5 candidates
```

So `match_score` must be `candidates.find(c => c.indicator_id === data.indicator_id)?.score` — **never `candidates[0].score`**. With 5 candidates on a live `fuzzy` match, `candidates[0]` is *often right*, which is exactly the silent-wrongness class `PTM-R-11` exists to prevent. `match: none` returns `indicator_id: null` **with a non-empty `candidates[]`**, confirmed live — which is why the falsifier fixture must carry candidates to be meaningful at all.

Recorded as a contract correction in `design.md` §5 rule 4.

**Falsifier:** mutated the `match==='none'` branch to source `pt_indicator_id` from `candidates[0]?.indicator_id` → **both `PTM-AC-10` tests red** on `expect(row.pt_indicator_id).toBeNull()` with a real id (`"22ba725f9423"`) in the output → reverted → 13/13 green. Idempotency proven against **shared in-memory state** with a real `findOne`+`save` upsert — not two independent mocks that could both "succeed" while proving nothing.

**🛑 Highest-risk unverified item in child 1 — self-declared by the Implementer**

The **PORB-text SQL join** (program / aow / center / hlo_title from `env.DB_TOC`) is a **cited best-effort assumption**, not verified fact: no DB is reachable, and neither `design.md` nor `requirements.md` pins those joins at column level. Its header cites the closest precedents (`aow-bilateral.repository.ts` work-package/center joins, `clarisa_initiatives.official_code` for the program name, `toc_results.category='OUTCOME'` for the HLO parent).

**Why this outranks the migration risks:** a wrong migration fails **loudly on apply**. A wrong join returns **plausible-looking wrong mappings** — every gate in this run passes, because the resolve service's tests depend only on the row *shape* the repository produces, never on the SQL's precision. To be added to `tasks.md` §6 Rollout.

Also self-declared: multi-center indicators pick `MIN(acronym)` (one `/resolve` call per indicator, not per center) — a documented simplification, unverified against real multi-center data. And `@ApiBody` on the trigger DTO is absent.


**`PTM-T-5` Reviewer verdict → `STATUS: FAIL`** (`opus`, attempt 1). All eight checks completed; two gate-blockers, everything else conformed.

### Finding 1 — `match_score` is correct in code but **gate-blind**

The code does the right thing (`progress-tracker-resolve.service.ts:246-252` matches by `indicator_id`). **No input in the suite can distinguish it from the forbidden `candidates[0].score`**: the only resolved-row fixture (`…resolve.service.spec.ts:38-55`) has the matched entry **at index 0**, so `match_score` is `1.0` under both correct and mutated code. There is **no `match: 'fuzzy'` fixture anywhere in the module** — so the exact branch the live capture showed (5 candidates, non-first match) is never exercised, and neither is the `counts.fuzzy` / `match_quality='fuzzy'` write path.

This is the **fifth instance in this run** of *behaviour right, gate blind* — the same shape as `D-14`, and a violation of the spec's own "name the input that would make the check fail" rule, against `design.md` §5 rule 4 **as amended by the live-contract correction I recorded hours earlier**.

**Fix (Reviewer's, adopted):** one `fuzzy` fixture in the live shape with the match **not** first — `candidates: [{id: '22ba725f9423', score: 0.668}, {id: '8006329bfd49', score: 0.91}]`, asserting `match_score === 0.91`, `match_quality === 'fuzzy'`, `fuzzy === 1`. That single test makes the `candidates[0]` mutation red.

### Finding 2 — the PORB join omits the `wp.year` predicate every cited precedent carries

`pt-porb.repository.ts:101` joins on `toc_id` alone, while **every** precedent it cites carries `wp.toc_id = tr.wp_id AND wp.year = ?` (`aow-bilateral.repository.ts:589-590`, `:915-916`, `:953`). With `aow` in the `GROUP BY` (`:116-123`), an indicator whose `toc_work_packages` holds more than one year row yields **N rows → N `/resolve` calls**, an inflated `processed` count, and an **ordering-dependent** `aow`/upsert winner. Violates `PTM-R-10` ("once per indicator row per reporting phase") and `PTM-R-21` in spirit.

🛑 **Leader correction — I had this filed wrong.** I recorded the PORB SQL as "unverifiable without a database" and flagged it as the highest-risk *unprovable* item. The Reviewer draws the distinction I missed: **column-level correctness** needs a DB, but a **structural deviation from the precedents the file itself cites** is verifiable by reading them. *"Closable without a database."* My framing would have shipped a known-checkable bug to TEST under an "unverifiable" label.

**Fix:** add the precedent's year predicate (the reporting version is already in scope in `resolveIndicatorMappings`), or drop `aow` from the `GROUP BY` and aggregate it.

### Checks that passed — recorded

`PTM-R-11`/`PTM-AC-10` real (the `none` branch never touches `candidates`; the fixture carries **two** candidates, so the falsifier is observable) · `PTM-AC-11` real (one shared in-memory table with real `findOne`/`save`, plus a `none → exact` re-resolution) · `PTM-R-12` **no write path** — `pt-porb.repository.ts` is `SELECT`-only · **auth confirmed** — no `@UseGuards`, no exclusion, statically asserted at `controller.spec.ts:241-262`, and genuinely not modelled on the unauthenticated Clarisa controller · `classifyUpstreamFailure` extraction **behaviour-preserving** (identical mapping, private method a pure delegation, both call sites unchanged) · `PTM-R-22` clean, with a serialized-log assertion excluding the key and base URL.

On the PORB SQL the Reviewer's verdict: precedents *"plausible and faithfully reproduced"* for the indicator/target/center chain and `tr.phase` scoping; **sound enough to reach TEST once issue 2 is closed**. What remains genuinely DB-dependent: that the five projected columns are the texts `/resolve` expects, and the single-center simplification.

`ADVISORY` (recorded, not actioned): the center chain drops the precedent's `trit.target_date = ?`, so `MIN(ci.acronym)` picks alphabetically across **all** target years · `resolveTargetVersion:148-150` accepts an explicit `versionId` without checking `status`/`is_active`, so the trigger can fill a **closed phase** — harmless today, but an explicit guard would match `AC-5`.

---

## 🛑 BUDGET TRIPWIRE — escalated to the user, rework held

`design.md` §13 budgeted **2 review rounds**. This is round **3**:

| # | Task | Cause |
|---|---|---|
| 1 | `PTM-T-3` | **Leader spec defect** — `PTM-R-3` vs `PTM-R-13` mutually unsatisfiable (Pivot) **+** a real envelope bug that 17 green tests could not see |
| 2 | `PTM-T-8` | **Leader document defect** — stale Premise Ledger count line |
| 3 | `PTM-T-5` | gate-blindness **+** a real join deviation |

**Two of the three rounds were triggered by my own spec or document errors, not implementation churn.** The Implementers have produced one genuine implementation defect across nine tasks (`T-3`'s envelope); everything else FAILed on specs I wrote or gates I specified too loosely.

Per the tripwire rule, execution **stops here for the user** rather than continuing on the assumption that finishing is what was wanted.

### `PTM-T-5` — Reviewer's passing checks (tail) and an improved remediation

**Check 5 — trigger auth, confirmed clean.** No `@UseGuards` on any route including `POST indicator-map/resolve` (`controller.ts:115-127`); `app.module.ts:143-147`'s exclude list carries only platform-report and bilateral. Routed at `modules.routes.ts:129` under `/api`, so it inherits `JwtMiddleware` exactly like its two read siblings. **Genuinely not modelled on the Clarisa precedent** — the controller header cites `PTM-DD-3` explicitly, and `controller.spec.ts:241-262` **pins both static facts** (no `@UseGuards` token in source, no exclusion entry), so a later regression on either is caught rather than silent.

**Check 6 — the extraction is behaviour-preserving.** Module-level `classifyUpstreamFailure` (`service.ts:130-145`) reads only `err.response.status` when numeric, maps `404 → not_found` and everything else to `unavailable`, attaches `upstreamStatus` only when defined. The private method (`:449-451`) is a **pure one-line delegation** with unchanged signature; both call sites (`:309`, `:414`) untouched; the returned object is still primitives-only, so **no leak surface widened** in a file that PASSed twice.

**Check 7 — logging conforms.** `pt.resolve.completed` logs `versionId` + all five counts; the unconfigured path logs `reason: 'unconfigured'`; per-row failures log `status`, optional numeric `upstreamStatus`, `durationMs`. No host, URL, key or body anywhere, with a serialized-log assertion excluding both the API-key sentinel and the base URL.

**🎯 Improved remediation for Finding 2 — the Reviewer's, adopted over the Leader's**

The Leader proposed **adding the `wp.year` predicate**. The Reviewer recommends **aggregating `aow` first** (drop it from the `GROUP BY`, wrap in `MIN(...)`), *then* adding the year predicate — and the reasoning is better:

> Aggregation guarantees one row per indicator **structurally**, verifiable by reading the SQL. The year predicate alone matches precedent but, **if the year value is off, silently turns every `aow` into `''` via the `LEFT JOIN`** — a quiet degradation of match quality rather than a visible failure.

That is decisive. A wrong year would not fail loudly; it would empty the `aow` text, degrade every `/resolve` match, and produce **plausible-looking wrong mappings** — the exact `D-7` silent-wrongness class this task exists to avoid. The Leader's fix would have swapped one silent failure mode for another. **Both changes go into the rework brief, aggregation named as the load-bearing one.**

### `PTM-T-5` attempt 2 — evidence re-run

| Gate | Reported | Leader re-run |
|---|---|---|
| module suite | 11 suites / 130 | **130/130** ✅ |
| `MIN(CASE` aggregation | claimed | **confirmed** `pt-porb.repository.ts:103` ✅ |
| `wp.year = ?` predicate | claimed | **confirmed** `:114` ✅ |
| `GROUP BY` free of `aow`/`wp.*` | claimed | **confirmed** `:129-134` — `tri.id, tri.related_node_id, program, tr.result_title, tri.indicator_description` ✅ |
| fuzzy fixture match **not** at index 0 | claimed | **confirmed** — `candidates[0]='22ba725f9423'` (0.668), `candidates[1]='8006329bfd49'` (0.91), match = `8006329bfd49`. `candidates[0].score` yields **0.668, not 0.91** — the mutation is genuinely observable ✅ |
| whole server (alone) | 3271, 0 failures | **3269 passed / 2 failed / 3271 total** — see below |

**The 2 failures are a load flake, and this time the Leader could name them.**

`src/auth/guards/otp-throttler.guard.spec.ts` — 2 tests, **38.4 s** under full-suite load. Run alone: **12/12 pass in 5.0 s**, a **7.6× slowdown** under contention. `grep -c "progress-tracker\|ProgressTracker"` on it → **0**. It is a *throttler* guard, so inherently time-sensitive.

📌 **Process note — the capture format was the fix.** The earlier `3 failed` scare was unresolvable because `--reporters=summary | tail -4` gives counts without names. Switching to the default reporter with `grep -E "^(FAIL|Tests:|Test Suites:)"` named the suite immediately and turned a 10-minute mystery into a 30-second isolation check. **Recommended for every whole-suite run.**

📌 **Repo-level observation, not a spec deliverable:** this is the **second distinct load-sensitive spec** found in this run (`bilateral-handoff.controller.spec.ts` was the first). Neither is related to this spec, and neither fails in isolation. Worth passing to the team as a CI-stability note — under parallel load the server suite has at least two specs that flake on timing.


### `PTM-T-5` attempt 2 → **STATUS: PASS** (`opus`)

Both findings genuinely closed, and the Reviewer checked the two things the Leader flagged as most likely to hide a defect:

- **Bound-parameter order is correct.** Placeholders occur in source order `wp.year` (`:114`, in the `LEFT JOIN`, above the `WHERE`) → `tr.phase` (`:124`) → the two `programFilter` slots (`:128`), matching `params = [reportingYear, phaseUuid, programId, programId]`. **No off-by-one** — the specific failure where a new param inserted ahead of an existing one silently binds the wrong value.
- **None of the 4 updated assertions were weakened.** `:93` and `:102-107` remain strict `toEqual` on the exact params array — no `arrayContaining`, no `expect.anything()`. The other two gained the positional argument and kept full `toEqual` row comparisons. An assertion loosened to pass would have been worse than one that failed.
- **Finding 1 covers more than the score:** the test at `:237-252` asserts `match_score === 0.91` **plus** `response.fuzzy === 1` and `match_quality === 'fuzzy'` — the counts and quality write paths too, which were equally unexercised.
- **Finding 2 also aggregated `center`** (`MIN(ci.acronym)` at `:108`) alongside `aow`, which the brief did not ask for but which the same fan-out argument requires.
- **Regression sweep clean** on all six preserved behaviours, and the three explicitly fenced-off items are untouched: `PT_INTEROP_TIMEOUT_MS_DEFAULT = 25_000`, the absent `trit.target_date` predicate, and `resolveTargetVersion`'s unfiltered `findOne`.

On the structural-proof question the Reviewer's judgement: it is *"the best available here — the `GROUP BY` collapse happens in MySQL, and the repository does no grouping of its own, so a fake result set would only assert the fake."* Its limits are recorded at **spec level** (`tasks.md` §6), not only in transient evidence, which satisfies the explicitly-recorded-gap path.

`ADVISORY` → recorded as **named gaps `D-15` and `D-16`**, not actioned (`PTM-T-5` PASSed):
- **`D-15` — introduced by this attempt.** A `versionId` with a NULL `phase_year` binds `NaN` → MySQL 1054 → **500**, where the sibling `phaseUuid` guard returns `not_found`. Asymmetric error handling, one line to close. Worth noting that the rework *introduced* this: threading `reportingYear` made a previously harmless NULL reachable.
- **`D-16`** — a test titled for bound-param **order** that would survive the swap it names. **The sixth instance in this run of a gate asserting less than its title claims.**

---

### `PTM-T-7` — Optional provenance block on the create path, written at the handler hook

| Field | Value |
|---|---|
| **Status** | ✅ **PASS on attempt 1** (Reviewer `fable`, one round; author `opus` ≠ auditor). Advisories 1, 2, 3 and 6 applied after the PASS; 4, 5 and 7 recorded as named gaps below |
| **Requirements covered** | `PTM-R-13` (write half), `PTM-R-14`, `PTM-R-3b`/`3c`; `PTM-AC-12`, `PTM-AC-13` |
| **Runtime note** | Leader-inline implementation under the pragmatic mode (budget overrun already accepted by the requester) |

**Files**

- `onecgiar-pr-server/src/api/progress-tracker/dto/pt-result-provenance.dto.ts` (new) — `result_key` `@MaxLength(64)` + `@Matches(/^[^:\s]{1,32}:\d+$/)`; `evidence_fingerprint` `@MaxLength(128)`; `environment` `@MaxLength(16)` + `@IsIn(dev|staging|prod)`; `model` `@MaxLength(64)`; `generated_at` `@IsISO8601`. These are the `PTM-T-6` forward-pointer widths
- `onecgiar-pr-server/src/api/progress-tracker/progress-tracker-provenance.service.ts` (new) — `validate` / `write` / `findByIndicator`
- `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.module.ts` — `forFeature(ProgressTrackerResultProvenance)`, provides and exports the service
- `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts` — optional `progress_tracker_provenance` + `@ApiPropertyOptional` (Swagger surface)
- `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.module.ts` — imports `ProgressTrackerModule`
- `…/create-result-from-framework/create-result-from-framework.handler.ts` — guard, pre-create validate, hook after associations
- Specs (new): `progress-tracker-provenance.service.spec.ts` (23 tests), `create-result-from-framework.provenance.spec.ts` (10 tests)

**Two Leader decisions, made inside the task and confirmed by the Reviewer (not escalated, since neither contradicts the spec):**

1. **The DTO decorators are enforced explicitly.** `POST /create` binds `@Body()` with **no `ValidationPipe`**, and there is no global pipe (grep confirmed). So `@MaxLength` on the DTO alone would be **inert**, making the forward pointer's guard decorative. A pipe on the whole body would change validation for every existing caller (`PTM-R-14`). Instead `ProgressTrackerProvenanceService.validate` runs `class-validator` (`whitelist` + `forbidNonWhitelisted`) on **the block only**, and runs it **before** the result is created, so a bad block returns 400 with no orphan result row. Error messages name properties only, never values.
2. **`@Optional()` injection.** The pre-existing handler spec and `results-framework-reporting.service.spec.ts` build the handler's DI by hand. A required new dependency would break both, and the DoD forbids editing them. So the dependency is `@Optional()`, and the handler fails with a 500 **before creating anything** if a block is present but the service is not wired. The production wiring is pinned by a new module-import assertion.

**Guard semantics:** `payload.progress_tracker_provenance != null`. A missing key or `null` counts as absent. `''` and `{}` go to validation and return 400. `pt_indicator_id` is **derived server-side** from `result_key` and never accepted from the client (`PTM-R-3b`): a client-sent `pt_indicator_id` key returns 400.

**Evidence (Leader-run)**

| Gate | Result |
|---|---|
| Red run before the hook (`…/create-result-from-framework`) | **4 failed / 45 passed** — the AC-12 cases; existing suites green ✅ |
| `results-framework-reporting` + `progress-tracker` after the hook | **37 suites / 462 tests** ✅ |
| Whole server (default reporter, suite names captured) | **267 suites / 3302 tests, 0 failed** ✅ |
| Existing `results-framework-reporting` specs | **zero `git diff`** — passed **unchanged** (`PTM-AC-13`) ✅ |
| `tsc --noEmit` | clean ✅ |
| eslint on changed files | clean ✅ |
| AC-13 fixture | omits the key entirely: `expect('progress_tracker_provenance' in payload).toBe(false)` ✅ |

**Mutations** (each restored and `cmp`-verified afterwards)

| # | Mutation | Result |
|---|---|---|
| M1 | **Drop the absent-block guard** (`hasProvenance = true`), the task's named falsifier | **5 red** — AC-13 plus the unchanged existing handler spec ✅ |
| M2 | Truthiness guard in place of `!= null` | **1 red** (empty-string test; it survived before that test was added) ✅ |
| M3 | Remove the hook write | **2 red** (AC-12) ✅ |
| M4 | Move the write before associations (the Disqualifier ordering) | **2 red** ✅ |
| M5 | Drop `@MaxLength(128)` | **1 red** ✅ |
| M6 | Drop `model` `@MaxLength(64)` | **2 red** ✅ |
| M7 | Drop `result_key` `@MaxLength(64)` | **1 red** (32-char indicator + 32-digit suffix = 65 chars passes the regex, so the length check does real work) ✅ |
| M8 | Drop `environment` `@MaxLength(16)` | **survives**: `@IsIn` already caps it (gap `D-18`) |
| M9 | Remove `ProgressTrackerModule` from `ResultsFrameworkReportingModule.imports` | **1 red** ✅ |

**Reviewer verdict — `STATUS: PASS`.** All five judgment calls hold. R-13/R-14/R-3a-c and AC-12/AC-13 are covered. The Disqualifier ordering is proven, Swagger is surfaced, and there is no value echo. One advisory-grade weak title turned up: a test titled "present-but-falsy" that only exercised `''`, while `null` is treated as absent. It is the **seventh** gate in this run whose title claimed more than it asserted. **Fixed:** retitled to "empty-string", and a sibling test now pins `null` as absent.

`ADVISORY` → applied: (1) module-import pin (M9 above) · (2) `design.md` §2.3 sequence amended to draw the pre-create validate step · (3) retitle + `null` test · (6) comment on the unreachable-from-handler `null` branch in `validate`.

Named gaps (recorded, not actioned):

- **`D-17` — the provenance write is not transactional with the create.** If the write fails after the result row exists, the client gets an error, and a retry creates a duplicate result whose first copy has no provenance. This is the same exposure class as the existing entity → ToC-link → associations chain. `PTM-DD-5` places the hook there deliberately, and re-architecting the chain is outside `T-7`.
- **`D-18` — `environment` `@MaxLength(16)` is dominated by `@IsIn`** (M8). It is inert but harmless, kept as defence in depth in case the enum is ever widened.
- **`D-19` — the service spec's "real staging shape" test uses inline literals.** They match `fixtures/pt-results.staging.json` (14 / 64 / 7 / 25 chars), but they are not imported from it, so a re-capture could drift silently.
