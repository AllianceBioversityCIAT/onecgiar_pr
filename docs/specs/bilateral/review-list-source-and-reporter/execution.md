# Execution — Source and Reporter on the Bilateral review list

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-list-source-and-reporter/` |
| Module code | **`BSR`** |
| Depth | **Lite** (Change track) |
| Approval Mode | **pre-approved** (Juan Carlos Cadavid, 2026-09-21) |
| Owner | Juan Carlos Cadavid |
| Branch | `qa-development-2026` |
| Started | 2026-09-21 |
| Leader model | `opus` (T1) |
| Implementer model | `sonnet` (T2, via `.claude/agents/akili-implementer.md`) |
| Reviewer model | `opus` (T3, via `.claude/agents/akili-reviewer.md`) — author ≠ auditor holds |
| Budget (`design.md` §12A) | 6 tasks · ~680 LOC · 2 review rounds. **Tripwire:** stop and escalate above ~750 LOC or 8 tasks |

### Environment pre-check (Step 2.1, run by the Leader before the first spawn)

`BSR-T-1`'s first step needs a live database (the `P-11` probe). Probed inline before spawning:
a connection built from `onecgiar-pr-server/.env` reached the TEST database and
`SELECT COUNT(*) FROM result WHERE source = 'API' AND is_active = 1` returned **1505**.
The primary route is available; no fallback route was needed. No `.env` value is recorded here
(`.cursorrules`).

### Kaizen Active Lessons consulted

`docs/specs/kaizen-log.md` does not exist in this repository — kaizen entries live as one file per
spec under `docs/specs/kaizen/`. No `## Active Lessons` table was available to carry into the
Implementer briefs. Recorded so the absence reads as checked, not skipped.

---

## Task Execution History

<!-- Entries appended per task, oldest first. -->

### `BSR-T-2` — Stamp `creation_method = EXTERNAL` on API ingestion

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-09-21 |
| Implementer attempts | 1 |
| Implementer / Reviewer models | `sonnet` (T2) / `opus` (T3) — author ≠ auditor holds |
| Effort | `high` |
| Skills assigned | `nestjs-expert`, `tdd` |
| Wave | ran concurrently with `BSR-T-1` (disjoint server folders, `tasks.md` §4) |

**Requirements covered:** `BSR-R-3`, `BSR-AC-3`.

#### Attempt 1 — PASS

- **runtime events:** none.
- **Files changed (4, +51 insertions, 0 deletions):**
  - `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` — `creation_method: ResultCreationMethod.EXTERNAL` on the base header save in `initializeResultHeader` (~:4179) + enum import.
  - `onecgiar-pr-server/src/api/bilateral/handlers/knowledge-product.handler.ts` — same stamp on the KP handler's own header save (~:64) + enum import.
  - `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` — new `describe('creation_method stamp on the base header save (BSR-T-2)')`.
  - `onecgiar-pr-server/src/api/bilateral/handlers/knowledge-product.handler.spec.ts` — new case asserting the KP save payload.
- **Disqualifier sweep (run before editing):** `grep -rn "creation_method" onecgiar-pr-server/src --include="*.ts"` → **24 matching lines**, exactly `design.md` P-2's recorded baseline. No behavioral reader beyond `bilateral-center.service.ts:556`, which gates on `!== ResultCreationMethod.AI` and is therefore not moved by `UNKNOWN → EXTERNAL`.
- **Implementer verification:** `npx jest src/api/bilateral --silent --reporters=summary --forceExit`.
  - **Red before**, on both new cases: `Expected: "EXTERNAL" Received: undefined` (base save) and `Expected: ObjectContaining {"creation_method": "EXTERNAL"} Received: {...no creation_method key...}` (KP handler). `Test Suites: 2 failed, 35 passed, 37 total · Tests: 2 failed, 835 passed, 837 total`.
  - **Green after:** `Test Suites: 37 passed, 37 total · Tests: 837 passed, 837 total`.
  - The falsifier was shown red on **both** header paths independently, as the task required (a single-path test would have been inert against the KP handler).
- **Reviewer verdict: `PASS`.** Both API-ingestion header paths stamp `EXTERNAL` exactly as `design.md` §5 / `BSR-R-3` / `BSR-AC-3` require, each with its own falsifiable spec, no migration, no logging, no payload or behavioral reader affected. The Reviewer re-derived rather than accepted the brief, confirming independently: `ResultCreationMethod.EXTERNAL === 'EXTERNAL'` (`shared/constants/result-creation-method.enum.ts:5`); both import paths resolve; the entity column is `varchar(20)` with DB default `UNKNOWN` (`result.entity.ts:515-522`), so the value is type- and length-compatible; and — the load-bearing check — that these really are the **only two** header-creation sites on the ingestion path (`bilateral.service.ts:4135-4159` returns early on `custom?.resultHeader`, so the KP handler genuinely bypasses the base save, and `NoopBilateralHandler` returns `null` and falls through to it). The other `save` calls in the module are not header creations.

#### `ADVISORY` findings (recorded, never gating — `/akili-execute` §2.4)

- **RELIABILITY** — the stamp survives the post-create re-saves at `bilateral.service.ts:411` and `:439` only because both *spread* the already-persisted `newResultHeader`. Neither new test covers that leg, so a future refactor that rebuilt the object there instead of spreading it would drop the stamp with both `BSR-T-2` specs still green. Not required for this task, whose falsifier is the header save itself.
- **RISK** — rows ingested before this ships keep `UNKNOWN` and rely on `BSR-R-4`'s `external_platform_code` fallback, which is blank for rows predating that column. Already recorded as `BSR-OQ-2` / `BSR-DD-5` and deliberately not taken; flagged so `BSR-T-6`'s HITL row check watches for rows carrying neither value.

Per *Advisory Never Becomes A Task*, neither advisory mints a task or widens one in this spec. They are recorded here and die here; if either warrants work it goes through a new proposal.

#### Evidence re-run (non-author, Step 2.3 — never waived)

| Field | Value |
|---|---|
| Mode | Leader-inline |
| Command | `npx jest src/api/bilateral --silent --reporters=summary --forceExit` |
| Result | `Test Suites: 37 passed, 37 total · Tests: 837 passed, 837 total` — **`VERIFIED`**, identical to the Implementer's reported figures |
| Lint | `npx eslint <the 4 changed files> --quiet` → exit 0, no output. Clean |
| Spec-level suite | full server run `npx jest --silent --reporters=summary --forceExit` → `253 passed, 253 total suites · 3102 passed, 3102 total tests` |

**Decisions made:** none beyond the task text. No execute-time spec edit was made.

**Issues encountered:** none.

**Final verification result:** green. No migration added (`design.md` §3.2 / `BSR-DD-5` honoured); `git status` shows only the four intended files under `src/api/bilateral/`.

**`Not Done / Assumptions` (Implementer, verbatim):** `none`.

---

### `BSR-T-1` — List payload: three additive fields

| Field | Value |
|---|---|
| **Final status** | **PASS** (attempt 2) |
| Date | 2026-09-21 |
| Implementer attempts | 2 |
| Implementer / Reviewer models | `sonnet` (T2) / `opus` (T3) — author ≠ auditor holds on both attempts, each Reviewer a fresh context |
| Effort | `xhigh` (attempt 1), `xhigh` held (attempt 2) |
| Skills assigned | `nestjs-expert`, `api-design-principles`, `tdd` (attempt 1); `nestjs-expert`, `tdd` (attempt 2) |
| Wave | ran concurrently with `BSR-T-2` (disjoint server folders, `tasks.md` §4) |

**Requirements covered:** `BSR-R-1`, `BSR-R-2`, `BSR-AC-1`, `BSR-AC-2`.

*Chronology note: `BSR-T-2` closed first and appears above, though `BSR-T-1` is first in `tasks.md` document order. This log is append-only in closing order.*

#### `P-11` settled — the premise ledger's one `UNVERIFIED` row

`design.md` §1A **P-11** ("`users.first_name` / `users.last_name` are populated for the submitters that
reach this review queue") was the spec's single unverified premise, owned by this task as its first step.
Probed against the TEST database before any code was written:

| Measurement | Value |
|---|---|
| `(programId, versionId)` sampled | `SP06` / `34` — the highest-volume active `source='API'` pair |
| Rows in sample | 215 |
| **Baseline row count** (current query, no `users` joins) | **215** |
| **Post-change row count** (both `LEFT JOIN users` added) | **215** — identical |
| **Non-null `reporter_name` ratio** | **215 / 215 = 100.0 %** |
| `creation_method` distribution | `{ EXTERNAL: 215 }` |
| `external_platform_code` distribution | `{ NULL/blank: 215 }` |

**P-11 is confirmed, at the strongest end of its range.** The user's standing hard-stop
("if the ratio is ~0, stop and report before building the UI on it") did **not** fire; UI work proceeds.

**The row-count parity is the `BSR-R-2` / §7-Performance guard measured on data, not argued from SQL
text**, which is what the task's Disqualifier demanded. The attempt-1 Reviewer added that the parity is
also *structurally* guaranteed — both joins are equality on `users.id`, a `@PrimaryGeneratedColumn`
(`auth/modules/user/entities/user.entity.ts:26`) — so the 215→215 measurement corroborates the claim
rather than carrying it alone, and the single-program sample is therefore not a weakness.

**Carried forward — a real limit on what the HITL pass can witness.** Every sampled row is
`EXTERNAL` + null platform code, so only the `Via API` branch of the `BSR-R-4` matrix is observable on
TEST data. `BSR-T-6`'s HITL check **cannot** witness `Via API · STAR`, the `AI` badge, or `Manual entry`
on this program, and `BSR-T-2`'s stamp is invisible on existing rows (they already read `EXTERNAL` from
the `1784921547596` backfill, P-3). A green HITL must not be read as covering the matrix — the matrix is
covered by `BSR-T-3`'s seven-row unit gate. To be carried into the `BSR-T-3` and `BSR-T-6` briefs.

#### Attempt 1 — Reviewer `FAIL`

- **runtime events:** none.
- **Files changed (4, +184 / −4):** `result.repository.ts` (SELECT + two `LEFT JOIN users` + `GROUP BY`), `results.service.ts` (mapper +3 keys), `result.spec.ts` (mapper falsifier), `result.repository.spec.ts` (SQL-string spec).
- **Implementer verification:** `npx jest src/api/results/result.spec.ts src/api/results/result.repository.spec.ts --silent --reporters=summary --forceExit` — red before (`2 failed, 150 passed, 152 total`), green after (`152 passed, 152 total`).
- **Reviewer verdict: `FAIL`, one issue.** Verbatim:

  > 1. **Discovered Issue:** The repository spec's SELECT-presence assertions are not scoped to the SELECT list, so one of the three new aliases is inert. `expect(sql).toContain('r.creation_method,')` is satisfied by the `GROUP BY` clause alone — `result.repository.ts:3384` emits `r.creation_method,` (trailing comma, because `r.external_platform_code` follows it). Deleting `r.creation_method` from the SELECT list at `:3283` leaves the whole suite **green** while the payload silently loses the field. The same hazard affects four of the sixteen `previouslySelectedAliases` entries — `'r.id,'`, `'r.result_code,'`, `'rs.status_name,'` are all matched by `GROUP BY` lines `:3376`, `:3377`, `:3380`, so the "every previously selected alias still present" gate is also partly inert.
  >    **Violated Rule:** `tasks.md` §3 `BSR-T-1` Definition of done — "Repo spec asserts: the three new aliases present · **every previously selected alias still present**"; and `requirements.md` §8 defect class **D2**. A presence assertion that cannot falsify the mutation it exists to catch has certified nothing.
  >    **Remediation Suggestion:** Slice the SELECT segment once and assert against it, not against the whole string […] Prove it: delete `r.creation_method,` from the SELECT list only, confirm red, restore.

  Everything else PASSED at attempt 1 and was explicitly not re-litigated at attempt 2: `design.md` §4.1 SQL fidelity character-for-character modulo whitespace; the `MAX(COALESCE(...))` per-row precedence argument (`COALESCE` evaluates per row **before** aggregation, and `us`/`uc` are functionally determined by `r.id`, so `MAX` cannot synthesise a third user's name); row-multiplication safety; privacy (only `first_name`/`last_name` reach the SELECT — no `users.id`, no email, per `requirements.md` §7 and `AC-9`); additive backwards compatibility per ADR-004; and the Implementer's **15-vs-14** correction to the pre-existing mapper key count, which the Reviewer confirmed is right.

- **Leader note — the Leader flagged this hazard in the Reviewer brief as a check, not a finding**, and the Reviewer confirmed it independently *and widened it* (the Leader saw it only on the two new aliases; the Reviewer found it also hollowed three entries of the 16-alias loop). Recorded because the widening, not the flag, is what the independent audit added.

#### Attempt 2 — Reviewer `PASS`

- **runtime events:** none.
- **Files changed (1):** `onecgiar-pr-server/src/api/results/result.repository.spec.ts` only. Production files unchanged from the attempt-1 diff **except** one further incidental trailing-whitespace trim (`SELECT ` → `SELECT`, ~`:3254`), a side effect of the mutation round-trips, disclosed by the Implementer and confirmed inert by the Reviewer (`lastIndexOf('SELECT', …)` is whitespace-agnostic and no spec asserts `'SELECT '` against this query).
- **The fix improved on the prescribed remediation.** The Reviewer had suggested slicing on the literal `sql.indexOf('SELECT \n')`. The Implementer checked that marker and **rejected it**: `'SELECT'` is *not* unique in this query — it also opens the `lead_centers` CTE — so `indexOf('SELECT')` would have anchored the slice on the CTE and silently mis-scoped the very fix it was meant to be. It used `sql.lastIndexOf('SELECT', fromIndex)` instead, with `'FROM result r'` as the anchor and an inline assertion that that marker is unique.
- **Four mutation proofs, each applied, shown red, and restored** (no `git stash` — the stack is shared across worktrees):
  1. delete `r.creation_method,` from the **SELECT list only**, keeping it in `GROUP BY` → red at `:1082`
  2. delete `r.external_platform_code,` from the SELECT list only → red at `:1083`
  3. delete `r.id,` from the SELECT list only, keeping it in `GROUP BY` → red in the `previouslySelectedAliases` loop — **the exact gate attempt 1 left inert**
  4. delete the `reporter_name` expression from the SELECT → red at `:1084` on the regex

  The Implementer disclosed that its first pass at mutation 4 was imprecise (it clipped a neighbouring comma and tripped a different assertion first) and that it redid it surgically to isolate the regex. Recorded because self-reported imprecision is evidence of a real mutation run rather than a narrated one.

  **Citation correction (Reviewer advisory, verified by the Leader at source):** the Implementer reported mutation 3's red at `:1096`; the `previouslySelectedAliases` loop assertion is actually at **`:1091`** (`:1096` is the `LEFT JOIN users us` argument string). The falsification is real — only the line citation was a transcription slip. `:1091` is the correct reference for a future reader.

- **Reviewer verdict: `PASS`.** Independently confirmed, against the source rather than the report: the slice isolates the outer projection for **every** parameter combination — all conditional appends (`hasCenterFilter`, `hasVersionFilter`, the `statusIds` branches, the `GROUP BY`) and the only in-`baseQuery` interpolation (`${joinType} JOIN lead_centers lc`) land **after** both markers, so no filter combination can move the slice; and **all 16** alias needles falsify, not merely the four originally named — near-misses fail correctly (`'r.id,'` is not matched by `project_id,`/`result_status_id,`/`initiative_role_id,`; `'AS indicator,'` is not matched by `AS indicator_category,`; `'rs.status_name,'` is not matched by `rs.result_status_id,`). The scoping split is right in both directions: the `LEFT JOIN users` assertions and the `(?<!LEFT )JOIN users` negative correctly stay whole-string (they live outside the slice), and `groupByClause` is correctly GROUP-BY-scoped.

#### `ADVISORY` findings (recorded, never gating — `/akili-execute` §2.4)

- **RISK (attempt 1)** — only the `EXTERNAL` + null-platform-code branch of `BSR-R-4` is observable on TEST data. Carried into the `BSR-T-3` / `BSR-T-6` briefs; recorded in full under *`P-11` settled* above.
- **READABILITY (attempt 1)** — `previouslySelectedAliases` would read better as 16 entries mirroring SELECT order with a comment naming why each string was chosen. Offered to the Implementer as explicitly optional; it declined, to keep the rework diff scoped strictly to the falsification fix. A defensible call.
- **RELIABILITY (attempt 2, evidence hygiene)** — the `:1096` vs `:1091` citation slip. **Acted on**: corrected above rather than left in the record, since the whole point of the citation is that a future reader can find the gate.
- **RISK (attempt 2, future-proofing)** — the comma-less needles are prefix-satisfiable, so a *rename* (e.g. `AS lead_center` → `AS lead_center_name`) would keep this gate green. A pure **drop** — which is what defect class `D2` targets — is caught; renames are covered by the 15-key mapper assertion in `result.spec.ts`. No action required.

Per *Advisory Never Becomes A Task*, none of these mints a task or widens one in this spec.

#### Evidence re-run (non-author, Step 2.3 — never waived)

| Field | Value |
|---|---|
| Mode | Leader-inline |
| Command | `npx jest src/api/results/result.spec.ts src/api/results/result.repository.spec.ts --silent --reporters=summary --forceExit` |
| Result | `Test Suites: 2 passed, 2 total · Tests: 152 passed, 152 total` — **`VERIFIED`**, identical to the Implementer's reported figures |
| Lint | `npx eslint` over the four changed files, `--quiet` → exit 0, no output. Clean |
| Spec-level suite | full server run → `253 passed, 253 total suites · 3102 passed, 3102 total tests` |
| Migration gate | `npm run migration:check` → `Pending: 0`, and `git status -- src/migrations/` empty. Green **and unchanged**, as `tasks.md` §2 and `BSR-DD-5` require |

**Decisions made:**

1. **Effort held at `xhigh` on the retry rather than escalating the tier.** The dial says bump one level per rework, and `xhigh → max` is barred by *never `max` a cheaper tier — escalate the tier instead*. Escalating the Implementer to `opus` would have forced the re-review onto a different model and produced a `PASS (degraded-pair)` record. Since the remediation was precisely specified and mechanical in nature, the Leader judged a clean T2/T3 pair worth more than the nominal bump. Recorded as a deliberate deviation from the default.
2. **No execute-time spec edit was made.** `requirements.md` and `design.md` are untouched by this task; the "14 pre-existing keys" figure in `tasks.md` is wrong (it is 15) but was left as written — correcting an approved task's text mid-execution is not this command's business, and the discrepancy is recorded here and in the code's own assertion instead.

**Issues encountered:** one Reviewer `FAIL` (attempt 1), resolved at attempt 2. No runtime events, no pivot, no blocked verification.

**Final verification result:** green on all gates — scoped Jest, full server Jest, lint, and the migration gate.

**`Not Done / Assumptions` (Implementer, attempt 2, verbatim):** declined the optional readability advisory (item 5) to keep the diff scoped to the falsification fix; items 1–4 complete. Adjudicated by the Leader as **no scope owed** — the declined item was tagged advisory-grade and optional in the brief, and an advisory can never be owed scope.
