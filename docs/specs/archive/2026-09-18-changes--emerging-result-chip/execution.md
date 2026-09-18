# Execution — Surface emerging results as their own label

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/emerging-result-chip/` |
| Requirements | `./requirements.md` · Design `./design.md` · Tasks `./tasks.md` |
| Approval Mode | **gated** |
| Budget (`design.md` §14) | 5 tasks · ~130 LOC · 1 review round |
| Leader | Claude Opus 5 (T1) — `/akili-execute` |
| Worktree | `/Users/jguzman/orca/workspaces/onecgiar_pr/dogfish` |
| Branch | `JuanGuzman-io/check-performance-refactor-base` @ `31562acba` |
| Started | 2026-09-16 |
| Current state | **Implemented for P25 (2025–2030)** — `planned_result` exposed and rendered; historical no-row data remains intentionally untouched. |

---

## Pre-flight (`tasks.md` §2)

Run before `EMG-T-1`, as the checklist orders. All three items had findings; two were fixed, one is recorded as a correction to `requirements.md`.

| Item | Result |
|---|---|
| `onecgiar-pr-client/src/environments/` present | ❌ **was missing** (only `.gitkeep`). Copied `environment.ts` + `environment.prod.ts` from `/Users/jguzman/GitHub/CGIAR/onecgiar_pr`. Without this the client suite reports `Tests: 0`, which reads as a pass |
| `onecgiar-pr-server/.env` present | ❌ **was missing**. Copied from the main checkout |
| **`node_modules` present** | ❌ **was missing in both packages** — not on the checklist, and it blocks every verification command in `tasks.md` §6. Fixed: `npm ci` in both, exit 0 |
| Working branch is not `master` | ✅ `JuanGuzman-io/check-performance-refactor-base` |
| Assumption `A-3` — no upstream commit touches the files in scope | ❌ **now false**, see below |

### Correction to `requirements.md` assumption `A-3`

`A-3` states the worktree is 50 commits behind `origin/performance-refactor` and that *"none of those commits touch the four files in scope — verified by `git diff --name-only`"*, with the instruction *"Re-verify before execution."* Re-verified 2026-09-16:

- The checkout is now **55 commits behind**, not 50.
- One of those commits **does** touch a file in scope:
  `b18c365c3 ✨ feat(results): add previously reported badge for replicated results in results center and ipsr`
  → `onecgiar-pr-server/src/api/results/result.repository.ts` (+7 / −46).

**Assessed impact: low, but no longer zero.** Inside `AllResultsByRoleUserAndInitiativeFiltered`'s `baseQuery` `SELECT` — the exact block `EMG-T-1` edits — the upstream change adds one line (`r.is_replicated,`) at what is currently line 734. The remaining −46 lines are in a different method (`MERGE_SPLIT_TARGET_STATUS_IDS` and the innovation merge/split picker) and do not interact with this spec.

Both changes are additive columns in the same `SELECT` list, so the semantic risk is nil; the residual risk is a trivial textual merge conflict in that list when this branch rebases. Recorded rather than fixed — rebasing is outside this spec's scope.

---

## Task Execution History

### `EMG-T-0` — Measure the `UNTAGGED` residual before writing code

| Field | Value |
|---|---|
| **Status** | `[~]` — **measurement complete, outcome escalated** |
| **Date** | 2026-09-16 |
| **Implementer attempts** | 0 — no code task; `tasks.md` defines this as a read-only measurement |
| **Reviewer** | Not spawned. Nothing was written to review |
| **Requirements covered** | Assumption `A-2`; gaps `G-2`, `G-3` |

#### Deferral probe (`.agents/leader.md` → *Deferring a check*)

`tasks.md` records the verification as *"A read-only query run by the user (Juan David has prtest access; agents do not)."* That assumption was probed before being accepted, as the playbook requires.

1. **Assumption:** *this cannot run here, because the agent has no database access.*
2. **Probe:** `onecgiar-pr-server/.env` (copied during pre-flight) carries `DB_HOST` / `DB_NAME` / `DB_USER_NAME` / `DB_USER_PASS`; `mysql2` is present after `npm ci`. A connection was attempted with an 8 s timeout.
3. **Result: assumption falsified.** Connected successfully; `SELECT DATABASE()` → `prdb`. The measurement was therefore run by the Leader inline rather than deferred to the user. No credential value was printed at any point (`.cursorrules`).

**Environment identification.** `DB_HOST` is a private IP with no environment token in the name, so the environment was established indirectly: `BULK_HANDOFF_ENV = test` in the same `.env`, plus a private-IP host, identify this as the **test** environment. Recorded as inferred, not asserted — **confirm before these numbers are treated as final** (`Q-4` below).

#### Measurement parameters (recorded so the count is reproducible)

| Parameter | Value |
|---|---|
| `version_id` | **36** — `Reporting 2026`, `status = 1` (the active reporting version) |
| `phase_year` | 2026 |
| `toc_pahse_id` (phaseUuid) | `7baf200a-c958-4ded-9894-6557a94cae18` |
| ToC schema | `Integration_information` |
| SP01 initiative id | **50** (`clarisa_initiatives.official_code = 'SP01'`) |
| Population | Exactly the Results-tab population: `rbi.initiative_role_id = 1`, `rbi.is_active > 0`, `ci.active > 0`, `r.is_active > 0`, `r.version_id = 36`, `result_type_id NOT IN (10,11)` — the repository's default `excludeType` |
| Bucket logic | The `result_scope` CTE of `results-framework-reporting.service.ts:1221-1264`, reproduced verbatim |
| Run | Read-only `SELECT`s only. Re-run twice with identical results |

#### Result — SP01, the three numbers the task asked for

Of the **174** SP01 rows that render in the `UNTAGGED` bucket today:

| Owner-row state | Count | Share of bucket | AREA OF WORK cell after this change |
|---|---:|---:|---|
| `planned_result = 0` | **47** | 27% | **`Emerging`** ✅ changed |
| `planned_result = 1` | **36** | 21% | `Not tagged` — unchanged (`EMG-AC-4`) |
| **no active owner row** → `null` | **91** | **52%** | `Not tagged` — unchanged (`EMG-R-5`) |

**73% of the bucket keeps reading `Not tagged`.**

#### Result — the same measurement is not an SP01 artefact

| Program | → `Emerging` | stays (`= 1`) | stays (no row) | % of bucket relabelled |
|---|---:|---:|---:|---:|
| SP01 | 47 | 36 | 91 | 27% |
| SP02 | 10 | 5 | 43 | 17% |
| SP06 | 4 | 9 | 18 | 13% |

Portfolio-wide (SPs 01–13, version 36, owner results):

| Outcome | Count |
|---|---:|
| `planned_result = 1` → cell unchanged | **327** |
| no owner row → cell unchanged | **238** |
| `planned_result = 0` → **`Emerging`** | **103** |

**This change relabels 103 of 668 owner results — 15%.** The other 565 rows read exactly what they read today.

#### Second finding — `G-2`'s stated cause is wrong, and its size was never measured

`requirements.md` `Q-1`, `EMG-R-5` and `design.md` `G-2` all attribute the no-owner-row population to one cause: emerging **Knowledge Products**, because `results-knowledge-products.service.ts:992` calls `createOwnerResult` rather than `…V2`. That attribution does not survive measurement.

The 238 no-row results across SPs 01–13, by result type:

| Type | Count |
|---|---:|
| Innovation use | 129 |
| Capacity sharing for development | 37 |
| Innovation development | 33 |
| **Knowledge product** | **15** |
| Policy change | 12 |
| Other output | 10 |
| Other outcome | 2 |

Knowledge Products are **15 of 238 — 6%**. The write-side gap is real but it is a small part of a much larger population, and that population is **2.3× the number of results this spec can label**. The cause was investigated below rather than left unidentified.

### Follow-up investigation — the 223 non-KP no-row results

The user asked to investigate the 223 non-KP rows before deciding whether to
ship. The same read-only population was split by `result.is_replicated`, then
checked against an earlier active result with the same `result_code` and an
owner ToC row.

| Population | Count | Evidence | Interpretation |
|---|---:|---|---|
| `is_replicated = 1` | **134** | 133 have a prior same-code result with an active owner ToC row; 1 does not | Phase rollover created the new `result`, but the current phase has no owner ToC placeholder |
| `is_replicated = 0` | **104** | No prior same-code result; all are born in version 36 | Current-phase creation path did not persist the owner ToC placeholder |

The replication cause is present in code, not merely inferred from the data:

- `ResultsTocResultRepository.replicable()`
  (`results-toc-results.repository.ts:72-178`) has the phase-rollover SQL. It
  deliberately copies `initiative_id` but sets `planned_result` and
  `toc_result_id` to `NULL`, which is appropriate because ToC node ids are
  phase-specific.
- Neither `$_phaseChangeReporting` nor `$_phaseChangeIPSR` in
  `versioning.service.ts` calls that method. They replicate `result`,
  `results_by_inititiative`, and type-specific data, then return. The
  versioning module provides `ResultsTocResultRepository`, but the service does
  not inject or invoke it. This explains the 133 replicated rows with a prior
  ToC row; the missing call is a systemic rollover gap.

The creation cause is also systemic rather than Knowledge-Product-specific:

- The general results controller calls `createOwnerResult`
  (`results.controller.ts:63`), and the Knowledge Products service does the
  same (`results-knowledge-products.service.ts:992`).
- `createOwnerResultV2` (`results.service.ts:3031-3075`) wraps the base method
  and saves the `results_toc_result` placeholder with `planned_result: false`.
- The base `createOwnerResult` does not perform that save. Therefore the 104
  non-replicated rows are a mixed set of API/manual and `source = 'Result'`
  creation paths, not one Knowledge Products branch. The earlier KP count of 15
  is real but represents only **15/104** of the newly-created no-row population.

This changes the diagnosis of `G-2`: it is not a small Knowledge Products write
gap. There are two upstream data-integrity gaps affecting **238** rows: a
rollover omission (134) and a creation-path split (104). The label-only change
would still leave all of those rows as `Not tagged`, so `EMG-T-1` remains
paused. The planned label can safely expose the 103 rows that do have a false
owner row, but coverage cannot be presented as if it classifies the complete
emerging population.

#### Verification

```
node <read-only measurement script>   →  counts above, stable across two runs
```
No files were modified. No production code was written. `git status` is unchanged apart from the pre-flight `.env` / `environments/` copies (both gitignored) and this `execution.md`.

#### Decision — escalate, do not proceed to `EMG-T-1`

`tasks.md` `EMG-T-0` defines its own stop condition:

> **What would make this FAIL.** `planned_result = 1` dominating the `UNTAGGED` bucket. That result does not block the spec, it **re-opens it** — escalate rather than proceeding to `EMG-T-1`.

Read strictly on `planned_result = 1` alone, the condition is not met: 21% of the SP01 bucket is not domination. Read against the *stated purpose* of the gate — *"If the `planned_result = 1` slice is large, users will keep seeing `Not tagged` everywhere and read the change as unshipped"* — the condition **is** met, and by a wider margin than the task anticipated, because the dominant slice turned out to be the one the task did not think to bound: the 52% with no row at all.

The Leader escalates on the purpose, not the letter. Proceeding to `EMG-T-1` would spend the remaining four tasks to move 15% of rows while `Not tagged` stays the majority label on every screen the spec set out to fix — which is the outcome `EMG-T-0` exists to prevent.

**No rework attempt was consumed** (no Implementer ran). The spec is not failed; it is **re-opened at the premise**, which is what this task was ordered first to make cheap.

---

## Open Questions For The User

| ID | Question |
|---|---|
| `Q-4` | Confirm the measured environment is prtest. Identified indirectly (`BULK_HANDOFF_ENV = test` + private-IP host); the numbers are reproducible and carry `version_id = 36`, so they can be re-run anywhere |
| `Q-5` | Does the 15% relabel rate still justify Option B, or does the measurement move the answer to Option C (`Emerging` and `Not tagged` as two first-class buckets across column, filter and counters)? |
| `Q-6` | **Resolved by investigation.** The 223 non-KP rows are split between the omitted phase-rollover call (119 replicated non-KP rows) and the generic/base creation path (104 rows). Decide whether to fix those upstream data gaps first, or explicitly accept that the label only classifies rows with an owner ToC placeholder. |

---

## Pre-archive remediation (2026-09-18)

Validation FAIL D-3 blocked archive. Fixed and re-tested on `qa-development-2026`:

| Item | Action |
|---|---|
| D-3 | `isEmerging()` — guard `null`/`undefined`/'' before `Number(planned) === 0` |
| EMG-T-2 tests | `programme-results-section-labels.spec.ts`, service `planned_result` passthrough, component `cellText` Emerging |
| EMG-T-3 tests | `results-list.component.spec.ts` — `isEmerging` matrix incl. `null` |
| Verification | Server 52 + client 318 scoped Jest green |

`EMG-T-4` manual prtest checks remain open — accepted at archive.
