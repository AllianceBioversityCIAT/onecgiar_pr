# Execution Log — Replicated innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/replicated-innovation-reminders` |
| Ticket | INC-165323 |
| Approval Mode | gated |
| Leader | Claude Code session (Opus 5.5, T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (T2) / `akili-reviewer.md` (T3) wrappers |
| Started | 2026-10-19 |
| Budget | 8 tasks · ~1,350 LOC · ≤ 2 review rounds per task (design §14) |

## Environment notes

- **Local DB probe (2026-10-19):** Docker daemon off (`docker info` fails), no local `mysql`/`mysqld` binary, and `onecgiar-pr-server/.env` `DB_HOST` points to a remote host, not the local machine. So no local MySQL is available. Under RIR-T-1's Disqualifier, migration up/down is **not** run by agents; it is handed to the user as a HITL step.
- Commits are made only on the user's go-ahead (standing user rule). No commit is made per task.

## Task Execution History

### RIR-T-3: DigestBuilder (pure) — PASS

- **Date:** 2026-10-19
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert`, `tdd` · medium (matches the task; no deviation).
- **Ran in parallel with:** RIR-T-1 (disjoint files; T-3 defines its own row interface).

**Attempt 1**
- **Files:**
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/digest-builder.ts` (new)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/digest-builder.spec.ts` (new)
- **Exports:** `PendingRow`, `CcByInitiative = Map<number, string[]>`, `Digest { to, lead_name, cc, results }`, `DigestBuildResult { digests, unreachable }`, `buildDigests(rows, ccByInitiative)`.
- **Implementer verification:**
  - RED: `npx jest --maxWorkers=2 --testPathPattern=digest-builder` failed with TS2307 (module missing). This is a compile-level red.
  - GREEN: `Tests: 6 passed, 6 total`.
  - `npx eslint <2 files> --quiet` clean after a prettier `--fix`, and Jest was re-run green.
- **Reviewer verdict:** **PASS**. The function is pure and has no I/O. It produces one digest per lead, keyed on the lower-cased and trimmed mail. NULL or blank mail goes to `unreachable`. CC is the deduplicated union of the digest's own initiatives, minus the To address. Results are ordered by SP code, then result code. The Reviewer accepted the compile-level red after checking by reading that dropping each rule (To exclusion, lowercase, unreachable split, ordering, per-digest CC) turns a test red. The tests were not re-run for this check.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: `lead_name` is the first non-null name after sorting. It is display-only; T-4 must not key on it.
  - RISK: the R-3 rule that Lead and Co-lead are not CC'd depends wholly on T-2's CC query selecting role 5 only.

**Implementer assumptions (design notes, not owed scope):**
- `Digest.lead_name` was added for the greeting.
- `unreachable` returns the full `PendingRow`. Mapping it to `PreviewView` (design §4) belongs to T-4/T-5.
- SP ordering uses `localeCompare` with `numeric: true`.

**Forward pointers:**
- → **RIR-T-2:** the repository must return rows conforming to `PendingRow` from `digest-builder.ts`, and the CC map as `CcByInitiative`. The T-2 review must assert that the CC query selects `role = 5` only, with no lead or co-lead role.
- → **RIR-T-4 / T-5:** map `unreachable` and `Digest` to `PreviewView`. Treat `lead_name` as display-only.

**Requirements covered:** RIR-R-2, RIR-R-3 (union, dedup, To ∉ CC), RIR-R-4 (split).
**Final verification:** 6/6 green, lint clean.

### RIR-T-1: Schema, templates and parameters migration + entities — `[~]` code PASS, DB HITL pending

- **Date:** 2026-10-19
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert` · xhigh. Deviation from the T2 `medium` default: migration = correctness-critical. `max` is not used on a cheaper tier.
- **Review mode:** parallel lens reviewers (migration surface): A = conformance + readability + reliability, B = conformance + risk + resilience.
- **Brief deviation:** the 668-line diff was handed to both Reviewers as a frozen snapshot file in the session scratchpad, not pasted inline. The Reviewers read it in full; it was not regenerated.

**Attempt 1**
- **Files:**
  - `onecgiar-pr-server/src/migrations/1791500000000-RIR-CreateReminderTables.ts` (new; class `RIRCreateReminderTables1791500000000`)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/entities/replicated-innovation-reminder-campaign.entity.ts` (new; also exports `ReplicatedReminderKind`, `ReplicatedReminderStatus`)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/entities/replicated-innovation-reminder-log.entity.ts` (new)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/entities/initiative-melia-focal-point.entity.ts` (new)
  - `onecgiar-pr-server/src/shared/microservices/email-notification-management/enum/email-notification.enum.ts` (+`REPLICATED_INNOVATION_Q4_NOTICE`, +`REPLICATED_INNOVATION_FINAL_REMINDER`)
- **Implementer verification (no DB, no Jest):**
  - `npx eslint <5 files> --quiet` exit 0; prettier clean.
  - Scoped `tsc` over the touched files and their import graph: exit 0. The full-project `tsc` was skipped (4.4 GB RAM free, another agent active).
  - Static check against a recording fake QueryRunner:
    - `up` = 3 `CREATE TABLE IF NOT EXISTS` + 2 template inserts + 4 param inserts, with no UPDATE, DELETE, DROP or ALTER. Every insert uses bound params and `WHERE NOT EXISTS`.
    - The HTML contains no `''`, no `{{{` and no `977`.
    - `down` = DELETE the 4 params, DELETE the 2 templates, then DROP log → campaign → melia.
    - Both templates compile and render with handlebars.
- **Reviewer A verdict:** **PASS**.
  - Every column, UNIQUE, index and FK in §3.1 is present in both the DDL and the entity decorators, with identical names.
  - FK types match their targets.
  - The inserts are bound and never touch existing rows.
  - `created_by` has no literal id, which satisfies the Disqualifier.
  - R-11, R-12, R-13 and R-14 storage is present. The enum change is additive.
- **Reviewer B verdict:** **PASS**.
  - FK types and signs match exactly: `version.id` bigint, `clarisa_initiatives.id` int.
  - No name collisions and no reserved-word issues. Index sizes are within limits.
  - The migration can be re-run after a partial failure (IF NOT EXISTS and WHERE NOT EXISTS).
  - `down` uses a safe order and only touches its own names.
  - No secrets or PII.
- **ADVISORY (4R, non-gating):**
  - SPEC-DRIFT: log `created_date` is `timestamp(6)` (`CreateDateColumn`), while §3.1 says `datetime default now`. `cc_count` and `redirected` have `DEFAULT 0`, which §3.1 does not list. → Correct design §3.1 at archive.
  - READABILITY: `created_by` = COALESCE(creator of `email_template_ip_experts_support`, creator of the oldest template row), with **no** literal `977` fallback. This is a deliberate tightening of the exemplar `1788446000000`. Do not "fix" it back.
  - RISK: `down` deletes the templates without the exemplar's guard for referencing `parent_id` / `platform_report.template_id` rows. It fails loudly on an FK rather than losing data.
  - RISK: a hand-made `rir_*` param or template with the same name created before `up` would survive `up` but be removed by `down`. HITL pre-check: `SELECT name FROM global_parameters WHERE name LIKE 'rir\_%'`.
  - RESILIENCE: under a non-strict `sql_mode`, a NULL `created_by` would still fail, but on the `users` FK rather than on NOT NULL.
  - RISK: the tables take the database's default charset and collation. If T-2/T-5 join `email` to `users` / `ad_users`, check that the collations match.
  - RELIABILITY: a param insert writes a NULL category if `platform_global_variables` is missing. This matches repo precedent.
- **Handlebars context for T-4:**
  - `leadName`, `phaseName`, `resultCount`.
  - `results[]` with `{ resultCode, resultTitle, resultTypeName, spCode, spName, resultUrl }`, where `resultUrl` = `${RESULTS_URL}${result_code}/general-information?phase=${version_id}`.
  - Optional `intendedTo` (it switches on the "Intended recipients" block) and `intendedCc` (a joined string).
  - The subject is built in T-4, not stored. The template names are the two new enum values.

**Not Done (verbatim from the Implementer, carried as owed scope):**
- "Up/down on a real DB is NOT verified. HITL needed. On a local DB (not `prdb`): `migration:run` then `migration:revert`. Check that the 3 tables exist after up and are gone after down, that two log rows with the same (campaign_id, recipient_email) raise `ER_DUP_ENTRY`, and that the `email_template_ip_experts_support*` rows are byte-identical before and after."
- "Red run is not possible as written. `scripts/check-pending-migrations.ts` compares migration file names against the `migrations` table. It does not diff entities against the schema, so 'fails while entities have no migration' does not hold. It needs a DB and was not run." This is a spec inaccuracy in the T-1 Red run line, to be corrected at archive.

**Status:** `[~]`. The code passed both Reviewers. The DoD item "Up and down verified, `migration:check` green" is open until the user runs the HITL DB check. The deferral is probe-confirmed; see Environment notes.
**Requirements covered (storage):** RIR-R-5, R-8 (UNIQUE), R-11, R-12, R-13, R-14.
**Forward pointers:**
- → **RIR-T-4:** use the handlebars context above. Apply `addLabel()` to the subject.
- → **RIR-T-2 / T-5:** check collations if any email join is added.

#### RIR-T-1 HITL update — 2026-10-19

- **The user ran `npm run migration:run` themselves against the shared `prdb`** (the `.env` target). This was the user's choice; the Disqualifier only forbids agents from doing it. Output: `Migration RIRCreateReminderTables1791500000000 has been executed successfully` + `COMMIT`.
  - The DDL shown matches the reviewed diff: 3 tables, `UQ_rir_log_campaign_recipient`, `UQ_rir_melia_initiative_email`, `IDX_rir_campaign_status_scheduled` and the 3 `FK_rir_*` constraints.
  - The 2 template inserts and the 4 param inserts are bound and `WHERE NOT EXISTS`. There is no UPDATE or DELETE on any existing row.
  - So `up` is verified on real MySQL.
  - **Consequence:** prdb now has this migration recorded. Jenkins will treat it as already applied in that environment.
- **Still open:**
  - `down` has not been run, and it should not be run on the shared DB now that the tables are live. It is verified only statically (Reviewers A and B).
  - The `ER_DUP_ENTRY` probe has been handed to the user as inline SQL.
- **DEP-1 received:** the user provided the MELIA focal point list (screenshot of "Program/Accelerator Teams", 16 rows across 13 programs, by program **name**). RIR-T-7 is unblocked once the names are mapped to `official_code`; that mapping query has been handed to the user.
- **RIR-T-2 started** on the same date. Its dependency on T-1 is treated as satisfied for code purposes: the entities exist, the tables are live in prdb, and the T-2 tests do not touch the DB. T-1 itself stays `[~]` until the user accepts the static-only `down` check.

#### RIR-T-1 HITL — ER_DUP_ENTRY probe — 2026-10-19

- **The user ran the probe on prdb.** The second log insert for the same (`campaign_id`, `recipient_email`) failed with `SQL Error [1062] Duplicate entry '5-probe@test.org' for key 'replicated_innovation_reminder_log.UQ_rir_log_campaign_recipient'`. → **R-8 UNIQUE verified on real MySQL.**
- **Cleanup.** DBeaver was in auto-commit mode, so the probe rows were committed despite `START TRANSACTION`:
  - campaigns 1–3 came from earlier single-statement runs;
  - campaign 5 and 1 log row came from the scripted run.
  - The user deleted all of them. The final counts are `replicated_innovation_reminder_campaign` = 0 and `replicated_innovation_reminder_log` = 0 (user-confirmed).
- **Lesson for later HITL probes:** in DBeaver with commit mode **Auto**, `START TRANSACTION … ROLLBACK` scripts do not roll back. Switch to Manual commit first, or write probes with explicit cleanup.
- **Still open for T-1:** the user's acceptance of the static-only verification of `down`.

### RIR-T-2: Pending-innovation and CC repository — `[~]` code PASS, prdb count HITL pending

- **Date:** 2026-10-19
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert`, `tdd` · high. Deviation from the T2 `medium` default: these SQL predicates decide who gets emailed.

**Attempt 1**
- **Files:**
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/repositories/pending-innovation.repository.ts` (new)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/repositories/pending-innovation.repository.spec.ts` (new)
- **Implementer verification:**
  - RED: TS2307 (module missing).
  - GREEN: `npx jest --maxWorkers=2 --testPathPattern=replicated-innovation-reminders/repositories` → `Tests: 25 passed, 25 total`.
  - Mutation run (scratch script outside the repo): the 10 predicates `result_type_id IN`, `is_replicated = 1`, `status_id = 1`, `r.is_active = 1`, `source <> 'API'`, `version_id = ?`, `initiative_role_id = 1`, `role = 5`, MELIA `is_active = 1` and `ad.is_active = 1` were each removed, and each removal turned a test red. The file was restored afterwards.
  - `eslint --quiet` exit 0; prettier clean.
- **Implementer judgment calls:**
  - `(r.source IS NULL OR r.source <> 'API')`, so rows with a NULL source are kept.
  - `CONVERT(email USING utf8mb4) COLLATE utf8mb4_unicode_ci` on both UNION branches (idiom from `result.repository.ts:1101`).
  - The ids are bound as `[ids, ids]` with `IN (?)`.
  - No `${env.DB_NAME}` prefix.
- **Reviewer verdict:** **PASS**.
  - All 11 SQL aliases match `PendingRow`. The types are imported from `digest-builder.ts`, not redefined.
  - The CC query selects `role = 5` only; per `RoleEnum`, LEAD = 3, CO_LEAD = 4 and COORDINATOR = 5.
  - Collation is safe.
  - Every table and column was checked against its entity.
  - R-1, R-4 (data side) and R-13 are covered; params are bound.
  - The compile-level red is accepted, with the mutation trace as the behavioural evidence.
- **Forward pointers consumed:** from T-3 (PendingRow/CcByInitiative conformance, role 5 only) and from T-1 (collation). All were satisfied.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: no DISTINCT, so a result with 2 active owner rows would appear twice → HITL check below.
  - RELIABILITY: the CC UNION does not dedupe case variants. *Leader note:* `DigestBuilder` already normalises (trim + lowercase) before dedup and before removing To (T-3 entry), so R-3 holds.
  - RISK: there is no `clarisa_initiatives.active` filter on the owner SP. This matches design §5; review it in the prdb count.

**Not Done (carried as owed scope):** the user-run prdb counts. Per the Disqualifier, P-8 (copies start in status 1) and P-9 (volume) are still unverified. The user has the count SQL and the per-status control query. Additional HITL check from the advisory: `SELECT result_id FROM results_by_inititiative WHERE initiative_role_id = 1 AND is_active = 1 GROUP BY result_id HAVING COUNT(*) > 1`.
**Status:** `[~]`. Code PASS; DoD "User-run prdb counts recorded" is open.
**Requirements covered:** RIR-R-1, R-3 (role 5 only), R-4 (data side), R-13 (inactive excluded).

#### DEP-1 correction — 2026-10-19
The user corrected the code mapping: **Genebanks = `SP13` (clarisa_initiatives id 62)**. `INIT-03` (id 3) belongs to the old portfolio. The correction was relayed to the T-7 Implementer mid-run.

### RIR-T-7: MELIA focal points seed — `[~]` code PASS, apply on hold (user question on DD-3)

- **Date:** 2026-10-19
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert` · medium.
- **Mid-run correction relayed:** Genebanks → `SP13` (the user said `INIT-03` is the old portfolio). Leader grep of the file: 0 occurrences of `INIT-03`.
- **File:** `onecgiar-pr-server/src/migrations/1791600000000-RIR-SeedMeliaFocalPoints.ts` (new; class `RIRSeedMeliaFocalPoints1791600000000`). It holds 16 rows over 13 codes (SP01–SP13), with emails lower-cased.
- **Implementer verification:**
  - eslint and prettier clean; scoped `tsc` exit 0.
  - Fake QueryRunner, three cases:
    - (a) all 13 codes found → 16 bound inserts;
    - (b) SP05 missing → it throws before any insert, and the message names only the code;
    - (c) `down` → 16 deletes over 16 distinct pairs.
- **Reviewer verdict:** **PASS**.
  - The data matches DEP-1 character by character. Nothing is hard-coded; `initiative_id` comes from `INSERT … SELECT` on `official_code`.
  - The pre-check fails loudly. The inserts are bound and idempotent on `UQ_rir_melia_initiative_email`.
  - `down` targets exactly the 16 pairs, and no email appears in the error text.
- **ADVISORY (4R, non-gating):**
  - RISK: `down` also deletes a pair that someone added by hand before `up` ran. The file header claims "left untouched", which holds only for `up`.
  - RESILIENCE: `down` joins `clarisa_initiatives` without `active = 1`.
- **Not Done:** the user runs `migration:run` on prdb and then the per-code count (expected 16 rows; SP06, SP09 and SP10 have 2 each).
- **Hold:** the user asked whether `role_by_user` could replace the new table, to avoid adding tables. The Leader answered with code evidence:
  - `role_by_user.user` is an FK to `users`, so every MELIA person would need a PRMS account;
  - an initiative role row grants team membership and feeds into the `ValidRoleGuard` `role <= required` checks, so access would change;
  - DD-3 already rejected this option.
  - The Leader asked the user to choose: keep DD-3 (recommended) or pivot. **Do not apply the seed until the user answers.** Choosing `role_by_user` or `global_parameters` would be a Pivot that reopens the design, T-1 and T-7.

#### DD-3 decision — 2026-10-19
The user confirmed **keep `initiative_melia_focal_point` (DD-3 stands)**, so there is no pivot. The user has not inserted any rows; they were given the steps to apply the T-7 seed with `migration:run` and the per-code verification query.

#### HITL results — 2026-10-19 (user-run on prdb)

- **T-7 seed applied** by the user (`migration:run`). Per-code check: 13 rows, SP01–SP13. SP06, SP09 and SP10 have 2 emails each; the other ten codes have 1. Total 16, matching the list exactly, with all emails lower-case. → T-7 `up` and count verified.
- **T-2 control query (replicated innovations by status, `version_id = 37`, types 2/7, active) returned 0 rows.** Either 37 is not the active Reporting phase, or no replicated innovations exist in it yet (P-8/P-9 cannot be judged yet). The pending count (query a) was not provided. The active-phase lookup has been re-requested.
- **Duplicate-owner check, all versions (not scoped):** 132 rows, each `result_id` with 2 active `initiative_role_id = 1` rows in `results_by_inititiative`, plus 1 row with NULL `result_id`. This confirms the T-2 advisory: `findPending` would return those results twice. Scoping to the pending set (version, type 2/7, replicated) has been requested before deciding on a fix.

#### HITL results (2) — 2026-10-19

- **The user clarified that `prdb` is the TEST database** (not PROD). The migrations and probes run there are test-environment evidence.
- **Active phases:**
  - `id 36 Reporting 2026` (app_module 1) → this is the active Reporting phase;
  - `id 37 IPSR 2026` (app_module 2).
  - The earlier T-2 control used 37 by mistake, which explains its 0 rows. The probe campaigns used 37 as well; they were deleted.
- **Replicated innovations (types 2/7, active) by version and status:**
  - v36: status 1 → 160 · status 2 → 1 · status 4 → 3 · status 8 → 2;
  - v34: 1 → 13 · 4 → 8;
  - v30: 1 → 70 · 2 → 5 · 3 → 4 · 4 → 1;
  - v18: 1 → 27 · 2 → 3 · 3 → 5 · 4 → 1.
  - → **P-8 verified:** replicated copies start in Editing (status 1); 160 of the 166 replicated rows in v36 are in status 1.
  - → **P-9 verified:** the volume is in the hundreds (160 pending at most before the source and owner joins).
- **Duplicate owners, scoped to replicated innovations of types 2/7: 0 rows.** The 132 duplicate-owner results seen earlier are outside the pending set, so the T-2 DISTINCT advisory does not affect this feature on current data.
- **Still to collect:** pending count (query a) with `version_id = 36`, which gives the con-correo / leads-distintos split.

#### T-1 / T-7 closure — 2026-10-19
The user chose not to run `migration:revert` on prdb (the TEST DB). Both `down` methods are accepted as **verified by review only** (T-1: Reviewers A+B; T-7: Reviewer). `up` is verified on real MySQL for both:
- T-1: tables, UNIQUE (`ER_DUP_ENTRY` probe) and params.
- T-7: 16 rows / 13 codes.

→ T-1 `[x]`, T-7 `[x]`.

### RIR-T-4: ReminderDispatcher — PASS 2026-10-19

**Skills:** nestjs-expert, tdd. **Implementer:** akili-implementer. **Reviewer:** akili-reviewer (different model).

**Files (new):** `reminder-dispatcher.service.ts` + `.spec.ts`, `repositories/reminder-campaign.repository.ts` + `.spec.ts` (all under `onecgiar-pr-server/src/api/replicated-innovation-reminders/`). Not wired into a module yet (T-5 registers `ReminderCampaignRepository` and the dispatcher).

**Attempt 1:**
- Red: the first `npx jest --maxWorkers=2 --testPathPattern=reminder-dispatcher` run failed to compile (service absent). No per-assertion red cycle.
- Green: `--testPathPattern=replicated-innovation-reminders` → 3 suites, 47 tests passed. eslint `--quiet` clean on touched files.
- Falsifiers (a)-(h) each have a named test; (h) spies on all five Logger levels with errors that carry an `@`.
- Disqualifier 1 does not apply: TypeORM's MySQL runner sets `affected = affectedRows` (`MysqlQueryRunner.js:176-177`); same pattern as `webhook-delivery.repository.ts:107-116`. The claim changes `status`, so matched = changed. Verified by code reading, not against a live DB.
- Disqualifier 2 does not apply: 500 digests at batch 25 / pause 2000 ms = 19 pauses = 38 s, plus INSERTs and emits ≈ 40-60 s (arithmetic, not measured).

**Review 1: PASS** with advisories. No double send between servers (claim + log-before-emit + UNIQUE backstop); redirect passes `to=[testEmail]`, `cc=[]`; dryRun has no side effects; payload matches existing `sendEmail` callers. A failed emit is not retried (DD-2 accepts it). Advisories:
1. Cron could re-claim a campaign that already ended FAILED and overwrite it with SENT/zero counts. → fixed in rework.
2. `finalize` guarded only on SENDING; a stale run could stamp a newer claim. → fixed in rework.
3. A retry overwrote `sent_count` (40 then 60 showed 60). → fixed in rework.
4. With `IS_PRODUCTION` unset, mail is redirected but `addLabel()` gives `[PRMS]` not `[PRMS Testing]` (it matches only `'false'`). Compliant with the task as written. **Recorded, not fixed.**
5. `sendEmail` is fire-and-forget (`emit`), so `failed` will be close to 0 in the field; falsifier (c) tests a synchronous throw. Accepted by DD-2 / P-10. **Recorded.**
6. A non-duplicate log INSERT error (e.g. address > 150 chars) leaves no row and the campaign can never end SENT. Low likelihood. **Recorded.**
7. Dispatch uses `campaign.version_id`; a campaign for a closed phase would still send. **Carried to T-5:** refuse preview/send when the campaign's phase is no longer the active Reporting phase.
8. Null `lead_name` rendered "Dear ,"; NOT_FOUND path lacked `dispatch end`. → fixed in rework.

**Attempt 2 (rework of advisories 1, 2, 3, 8, within T-4 scope):**
- `claim(id, claimedAt, allowedStatuses)`; `dispatch(id, {dryRun, allowRetry})`. Cron → PENDING only; Send now (`allowRetry: true`) → PENDING | FAILED.
- `finalize(id, claimedAt, final)` guarded on `status = SENDING AND claimed_at = :claimedAt`; `claimedAt` floored to whole seconds (column is `datetime` without fsp). A lost finalize returns `result: 'NOT_SAVED'`, `status: null`.
- Counts: `sent_count = sent_count + N` across retries; skipped / failed / unreachable hold this run's values (documented at the repository).
- Blank lead name → "colleague"; NOT_FOUND logs `dispatch end` (ids and counts only).
- Green: 4 suites, 55 tests passed. eslint clean on the four files.

**Review 2: PASS.** All four claims confirmed against code (column types in migration L113 and entity L86, same `Date` used for claim and every finalize, no ORM timezone override). Advisories (non-blocking, recorded):
- The `sent_count` increment is built into the SQL string (integer from an internal counter, not injectable); prefer a bound parameter.
- `.spec.ts:377` has a no-op assignment after the assertions.
- The "colleague" test does not assert the call count.

**Contract for T-5:** Send now passes `allowRetry: true`; map `CLAIM_LOST` and `NOT_SAVED` → 409; `status = FAILED` with `last_error = 'test recipient not configured'` → 412; preview must enforce the 409 for non-PENDING/FAILED itself (dryRun skips the claim); refuse when the phase is no longer active (advisory 7).

**Requirements covered:** RIR-R-1 (status evaluated at dispatch), R-6, R-7, R-8, R-9, R-11, R-12, R-14, NFR observability, AC-9.

### RIR-T-5: Campaign service, controller, DTOs, cron, module wiring — PASS 2026-10-19

**Skills:** nestjs-expert, api-design-principles, tdd. **Implementer:** akili-implementer. **Reviewer:** akili-reviewer (different model).

**Files:**
- New, under `onecgiar-pr-server/src/api/replicated-innovation-reminders/`: `replicated-innovation-reminders.{module,controller,service,cron}.ts`, `dto/create-campaign.dto.ts`, `dto/update-campaign.dto.ts`, `dto/campaign-view.ts`, and specs `*.service.spec.ts`, `*.controller.spec.ts`, `*.cron.spec.ts`, `*.module.spec.ts`, `dto/campaign-dto.spec.ts`.
- Modified (additive): `src/app.module.ts`, `src/api/modules.routes.ts`. T-4 cleanups in `repositories/reminder-campaign.repository.ts` (+ spec) and `reminder-dispatcher.service.spec.ts`.

**Endpoints** (mount `/api/replicated-innovation-reminders`). Every handler has `@Roles(ADMIN, APPLICATION)`, `ValidRoleGuard` and `ResponseInterceptor`; ids use `ParseIntPipe`.

| Endpoint | Codes |
|---|---|
| `GET /campaigns` | 200, 404 |
| `POST /campaigns` | 201, 400, 404, 409 duplicate kind |
| `PATCH /campaigns/:id` | 200, 400, 404, 409 not PENDING or phase closed |
| `PATCH /campaigns/:id/cancel` | 200, 404, 409 |
| `GET /campaigns/:id/preview` | 200, 404, 409 |
| `POST /campaigns/:id/send` | 200, 404, 409, 412 |

The cron (`EVERY_HOUR`) calls `dispatchDue`, swallows errors and logs only the error class name.

**Attempt 1:**
- Disqualifier does not apply: `ValidRoleGuard` reads handler-level `@Roles`. Pattern taken from `admin-panel.controller.ts`.
- 412 is checked before the claim (non-prod with an empty test address), so the campaign stays PENDING. The dispatcher's FAILED + `EMPTY_TEST_RECIPIENT_ERROR` mapping is kept as a race fallback.
- Preview and send return 409 when the status is not PENDING/FAILED or the phase is closed (T-4 advisory 7).
- The active phase uses the service's own `Version` query with the same predicate as `$_findActivePhase` (`status`, `is_active`, `app_module_id = REPORTING`). This avoids `VersioningModule`'s forwardRef cycles.
- `scheduled_at` must carry `Z` or an offset.
- **No red run:** specs were written after the code. Recorded as a TDD gap. The reflection, rule and filter tests were checked by the Reviewer for being non-vacuous.
- Green: `--testPathPattern="replicated-innovation-reminders|app.module"` → 9 suites / 102 tests. `--findRelatedTests app.module.ts modules.routes.ts` → 5 / 12. eslint, prettier and tsc clean.

**Review 1: PASS.**
- JWT covers `api/*path` with no matching exclude.
- APPLICATION role = lowest app-level role must be ≤ 1, so it is admin only.
- All 6 handlers are guarded and the active-phase predicate is correct.
- Advisories:
  1. Duplicate-kind race (lookup then insert, no unique index). **Recorded risk:** T-6 disables submit while in flight; a DB-level fix (unique index on a generated column) is a follow-up.
  2. Pin the phase filter in a test. → fixed.
  3. DTO validation spec. → fixed.
  4. Duplicated regex and error string. → fixed.
  5. The cron's `findDueIds` did not check the phase, so a PENDING campaign of a closed phase would be sent; `updateDate` did not check the phase. → fixed.
  6. Runtime 403 is owed by T-8.

**Attempt 2 (rework):**
- `findDueIds` inner-joins `obj_version` with active Reporting filters, all bound.
- `updateDate` gives 409 on a closed phase; cancel stays allowed.
- Added phase-filter pin, DTO spec, and shared `UTC_OFFSET` / `EMPTY_TEST_RECIPIENT_ERROR`.
- Green: 10 suites / 113 tests. eslint, prettier and tsc clean.

**Review 2: PASS.** No regressions; the new tests fail if their behaviour is removed. The `findDueIds` SQL is verified by query-builder mocks only; the live check is T-8.

**Requirements covered:** RIR-R-5, R-6 (hourly), R-7, R-9, R-10, R-15.

### RIR-T-6: Admin UI in Phase management → Reporting — PASS 2026-10-19

**Skills:** angular-developer, spartan, tailwind-design-system. **Implementer:** akili-implementer. **Reviewer:** akili-reviewer (different model).

**Files** (client, under `onecgiar-pr-client/src/app/`):
- New, in `pages/admin-section/pages/phase-management/components/replicated-innovation-reminders/`:
  - `replicated-innovation-reminders.component.{ts,html,spec.ts}`
  - `reminder-preview-drawer.component.{ts,html}`
  - `reminder-time.util.ts` + spec
  - `reminder-api.spec.ts`
- New: `internationalization/replicated-innovation-reminders.copy.ts`, `shared/interfaces/replicated-innovation-reminders.interface.ts`.
- Modified:
  - `shared/services/api/results-api.service.ts`: 6 typed methods using `ReminderEnvelope<T>`.
  - `.../reporting/reporting.module.ts` and `reporting.component.html`.
- Generated with the spartan CLI: `src/app/spartan/table/`, plus the `@spartan/table` path in `tsconfig.json` and the Jest mapper in `package.json`. These shared files sit outside the expected list; the Reviewer confirmed they are consistent with the other spartan entries.

**Disqualifier:** does not apply. Importing the standalone component did not break `reporting.component.spec.ts`.

**Attempt 1:**
- Tests: scoped Jest 375/375 green. `--findRelatedTests` on `reporting.module.ts`, `reporting.component.html` and `results-api.service.ts` gave 434 suites / 11,541 tests green.
- Lint: eslint (legacy flag) and `ngc --noEmit` clean.
- **No red run:** the specs came after the code. As a substitute, a mutation check broke the busy guards and the SENDING-row guards, which turned 2 tests red; the code was then restored.
- Deviations:
  - The confirmation uses `hlm-dialog` with `role="alertdialog"` instead of the Spartan alert-dialog, because the Jest Brain mock lacks it.
  - Errors show as inline `role="alert"` banners, because the client has no toast.
  - Every action locks while any request is in flight.

**Review 1: FAIL.**
1. (major, R-5) The local→UTC conversion used today's offset, not the entered date's, so a date across a DST change was off by an hour. The label and the edit prefill had the same bug.
2. (major, R-4) The unreachable table lacked the free-text contact (`lead_contact_person`).
3. (minor, R-15) The campaign table had no sent-at column.

Advisories from Review 1: text-xs on a 12px root, untyped API, and that `last_error` is shown verbatim.

**Attempt 2:**
- The offset is now a resolver of the instant (`OffsetAt`), using the entered date's offset with one re-check pass.
- The label and the prefill both use the date being entered or edited.
- Added a "Contact (free text)" column; the server already sent the field.
- Added a "Sent at" column.
- Changed the text size to `text-[12px]`.
- Typed the API responses.
- Scoped Jest 379/379 green (4 new tests). eslint and ngc clean.

**Review 2: PASS.**
- DST traced by the Reviewer with Rome as the zone: the normal case, the re-check case, a nonexistent time and an ambiguous time are all deterministic and none throws. The new specs would fail on the old code.
- Advisories (recorded, not fixed):
  - No spec exercises the re-check branch. A suggested test: Rome, `2026-10-25T01:30` should give `2026-10-24T23:30:00.000Z`.
  - The default `getTimezoneOffset()` path is not exercised.
  - One `text-xs` is left in `reminder-preview-drawer.component.html:42`.
  - Design §6.3 asks for a SENDING spinner and an error toast; the code uses a pulsing badge and inline alerts.
  - A SENDING status refreshes only when the page reloads.
- **Owed by T-8:**
  - the visual check at ≥ 1024 px;
  - the real `hlmBtn` disabled attribute and the focus trap;
  - the runtime 403.

**Requirements covered:** RIR-R-4 (UI list), R-5 (local time with zone label), R-7 (confirmation with recipient count), R-9 (UI), R-10 (inside the Admin module, `CheckAdminGuard`), R-15 (UI).

## Pivot Record: RIR-T-2 (data reality vs RIR-R-1/R-4) — 2026-10-19

**Evidence (user-run on prdb, the TEST DB, Reporting phase 36):**
- 160 replicated innovations (types 2/7) are active and in Editing.
- `findPending` keeps **14**, because **146 are `source = 'API'`** (bilateral). They are excluded per the RIR-OQ-3 default.
- Of the 14 kept, only **1 has a reachable lead** (`con_correo = 1`). The other 13 have no `lead_contact_person_id`; 6 carry free text (one of those holds an email inside the text).
- Across all 160: `sin_lead_id = 158`, `lead_id_no_existe_en_ad = 0`, `lead_ad_inactivo = 0`, `lead_ad_sin_mail = 0`, `sin_programa_dueno = 32`, `con_texto_libre = 7`.

**Root cause (found in code):** `result.repository.ts` (replication copy query, comment at L85-95) states that `lead_contact_person_id` was not copied on phase rollover **until 2026-09-14** (P2-3663). Only the free text travelled. The phase-36 copies predate that fix, so they lost the AD link (e.g. result 8555 had `11023` in its 2025 row and lost it in `11617`). The repository query is correct: `lead_id_no_existe_en_ad = 0` and there are no inactive or no-mail AD rows. The data is what is missing.

**Impact:** as specified, a campaign today would email 1 lead and list 13 as unreachable. The 146 bilateral replicated innovations would get nothing. That defeats RIR-US-1/US-4.

**Alternatives presented to the user (decision pending, with Nicoleta for business scope):**
1. **Backfill `lead_contact_person_id`** on the phase-36 copies from each result's previous-phase row (same `result_code`). This is a one-off data fix, outside this spec and not a code change. It would also un-block P2-3663 green checks. It is SQL for the user to run; first a read-only count of how many are recoverable.
2. **Flip RIR-OQ-3** (include bilateral `source = 'API'`). This is a requirements change to R-1 and needs Nicoleta. The 32 rows without an owner program would still be unreachable for CC.
3. **Keep the spec as is.** PMU follows up the unreachable list by hand.

**Status:** T-2 stays `[~]`; T-4 is not started. Spec docs are not modified until the user approves a direction (Pivot Protocol step 4).

#### Pivot Record RIR-T-2 — PROD evidence (user-run, read-only) — 2026-10-19

- **Active Reporting phase in PROD: `id 8` (Reporting 2026).** IPSR 2026 is `id 9`. Ids differ from TEST (36/37), which confirms why the code resolves the phase at runtime.
- **Replicated innovations (types 2/7), active, in Editing:**

| source | total | no owner SP | no lead id | lead id not in AD | lead AD inactive | lead with email | distinct leads |
|---|---|---|---|---|---|---|---|
| Result | 1,711 | 1 | 586 | 0 | 0 | 1,125 | **461** |
| API | 279 | 0 | 254 | 0 | 0 | 25 | 14 |

- **Recoverable from the previous phase** (copies without a lead id): Result 1 of 586; API 0 of 254. A backfill is pointless.
- **Duplicate owners** in the pending set: 0 rows.
- **Coordinators (role 5, active) per SP:** SP01 28 · SP02 15 · SP03 11 · SP04 28 · SP05 4 · SP06 7 · SP07 6 · SP08 16 · **SP09 68** · SP10 1 · SP11 8 · SP12 2 · SP13 6. Every SP has at least 1.

**Leader assessment:**
- The TEST data (prdb) is not representative. In PROD the specified design reaches **461 leads covering 1,125 results**, which meets RIR-US-1/US-4.
- **P-8 verified** (copies start in Editing) and **P-9 verified** (hundreds of digests; 461 × batch 25 / 2 s ≈ 37 s, well inside one cron tick).
- **The pivot is withdrawn: no spec change is required to proceed.**
- Open business points for Nicoleta, neither of which blocks T-4:
  - (a) RIR-OQ-3: should the 279 bilateral results be included? That would add 14 leads and 25 results.
  - (b) **CC fan-out:** SP09 has 68 coordinators, so each SP09 digest would CC about 70 people, and a coordinator could receive dozens of digests per campaign. A fan-out count query has been given to the user.
  - (c) 586 Result innovations (34%) have no lead link and go to the unreachable list for PMU follow-up.
- RIR-T-2 → `[x]`: the HITL counts are recorded (TEST + PROD), and the predicates select a plausible set: not 0, and not every replicated result in every status.

## Pivot Record: RIR-R-3 CC fan-out — 2026-10-19

**Evidence (PROD, user-run, read-only):** under the specified rule (each lead digest CC'd to every coordinator and MELIA of the owning SPs), the **top 15 SP09 coordinators would each receive 104 emails per campaign**. SP09 has 68 active role-5 users. The user judged this too large. The rule is valid as written but unacceptable in volume, so this is a requirements problem, not an implementation one.

**Proposed revised direction (pending Nicoleta's approval):**
- **Lead digest:** one email per lead, listing their pending innovations, **with no CC** (R-2 unchanged; R-3 changed).
- **SP summary (new):** one email per owning SP per campaign, to that SP's coordinators and active MELIA. It lists every pending innovation of the SP, grouped by lead, and includes the SP's results with an unreachable lead (R-4 follow-up moves to the people who can act on it).
  - Volume: about 461 lead emails + 13 SP emails per campaign.
  - Each coordinator receives exactly 1 email.
- **Alternatives:**
  - (b) keep CC but limit it to MELIA only;
  - (c) keep the original rule (104 emails per SP09 coordinator).

**Impact if approved:**
- `requirements.md`: R-3 rewritten, R-4 extended, a new requirement for the SP summary.
- `design.md`: §2.2 / §5 builder split, a third template, §14 budget.
- `tasks.md`:
  - T-3 rework (drop CC, add `buildSpSummaries`);
  - T-1 follow-up migration (third template row);
  - T-4 sends both kinds;
  - T-6 preview shows both.
- T-2 is unchanged: the CC query is reused per SP.
- T-7 is unchanged.

**Status:** T-4 is not started. Spec docs are untouched until the user and Nicoleta approve (Pivot Protocol step 4).

**Decision (user, 2026-10-19): option (c), keep the original R-3 rule. Pivot withdrawn; spec unchanged.**
- Rationale: the 104-per-coordinator figure is a snapshot of freshly replicated innovations. Campaigns run close to the end of the Reporting phase, when most of them will already be submitted, so the real CC volume will be far smaller. It also matches Nicoleta's ticket answer ("Yes, coordinators and MELIA").
- Residual risk (accepted): if a campaign fires while the volume is still high, SP09 coordinators receive many CC'd digests. The T-6 preview shows the recipient and CC counts before "Send now", so the admin can see the volume before dispatching.
- Next: T-4 proceeds on the spec as written.

## Decision: RIR-OQ-3 bilateral innovations — 2026-10-20

The user decided to keep bilateral (`source = 'API'`) innovations **excluded**, which is the RIR-OQ-3 default. The question is not escalated to Nicoleta. RIR-R-1 is unchanged. This affects 279 replicated bilateral innovations in Editing on PROD, 25 of which have a linked lead (14 people).

## Pivot Record: recipient model per Nicoleta — 2026-10-23

**Trigger (external, business):** Nicoleta's reply of 2026-10-23 to the 2026-10-21 list and test email, with Marc Schut in CC. It replaces the recipient model in RIR-R-1..R-4 and the copy in RIR-R-11. The requirements changed, so this is a requirements pivot and not an implementation FAIL.

**What she asked for:**
- **W1/W2 innovations (dev, use and packages):**
  - To = the **innovation developer(s)** listed on each innovation; CC = the P/A **MELIA** focal points.
  - Where the developer is missing, **one email per P/A to its MELIA focal points**, gathering all of that P/A's innovations (not one email per innovation).
  - Some developers are external to CGIAR, so be mindful of their PRMS access.
- **W3/bilateral innovations:** to the **Center MEL focal point only**. The list is in her "Program/Accelerator Teams" dashboard and is not in PRMS today.
- **Copy:**
  - Subject: "Reminder: innovations pending a 2026 update – Reporting 2026".
  - Greeting: "Dear [developer] / Dear [Center MEL FP]".
  - Body: a table (Result ID · Innovation · type · SP), the update / Inactive guidance, and the automatic "Inactive – not updated" closure at the end of January 2027.
- **Separate requests:**
  - (a) replicate innovation packages;
  - (b) distinguish a user-set Inactive from the PRMS automatic Inactive.

**User decisions (2026-10-23):**
1. Email **every** developer listed on the innovation, not only the "(Main contact)".
2. A developer listed without an email address counts as **missing**.
3. Innovation Use (2) and packages have no developer field. **Asked Nicoleta**; this is open as RIR-OQ-7.
4. Developers without a PRMS account (external): **route to the MELIA focal points**.
5. W3: the Center MEL focal point list is in the Program/Accelerator Teams dashboard, so the user exports it (DEP-5); it is not requested from Nicoleta. The view filtered by Roles = "MELIA Focal Point" is the P/A list already seeded by T-7 (16 rows, same people). The "lead center" rule is open as RIR-OQ-8.
6. Requests (a) and (b) are **separate specs, after the Reporting 2026 phase closes**. They are out of RIR.

**Withdrawn decisions:**
- Decision RIR-R-3 option (c), "coordinators + MELIA in CC" (2026-10-19): **reversed**. Coordinators are no longer copied.
- Decision RIR-OQ-3, "bilateral excluded" (2026-10-20): **reversed**. W3/bilateral innovations are included and routed to the Center MEL focal point.

**Impact:**

| Area | Change |
|---|---|
| `requirements.md` | R-1 (W3 included), R-2 (developer digest), R-3 (MELIA-only CC), R-4 (MELIA summary per SP + W3 center email + unreachable), R-9 (preview per message type), R-11 (copy, 4 templates), new R-16 (developer field parsing), R-17 (PRMS-account rule), R-18 (Center MEL focal points); OQ-3 closed; OQ-6..9 added; DEP-5 added |
| `design.md` | P-11..P-14 premises, the 3-message-type flow, log key change, `center_mel_focal_point` table, a second schema migration, DD-7..DD-9, budget |
| `tasks.md` | T-9..T-15 added. T-8 is superseded by T-15 (the T-8 smoke ran on the old model, so its evidence stays valid only for the R-6/R-8/R-10/R-12 mechanics) |
| Shipped code | Already on staging, not used in PROD (no campaign created). RIR-T-2/3/4/6 code is reworked by the new tasks; the claim, log, cron, redirect, auth and scheduling are unchanged |

**Status:** spec revision 2 drafted (requirements / design / tasks), **pending the user's approval** (Pivot Protocol step 4). No code is touched until it is approved. T-9 (parser), T-10 (migration) and T-11 (repository, W1/W2 part) do not depend on RIR-OQ-7/8 and can start on approval.

**Approval (user, 2026-10-23): revision 2 approved.** Pivot Protocol step 4 is complete. T-9 and T-10 start in parallel. RIR-OQ-7 and RIR-OQ-8 ship with their defaults until Nicoleta answers.

### RIR-T-9: Developer field parser (pure) — PASS 2026-10-23

- **Attempt 1 (Implementer):**
  - Files: `developer-parser.ts` and `developer-parser.spec.ts`.
  - Red run: `TS2307 Cannot find module './developer-parser'`; 1 suite failed, 0 tests.
  - Green run: `npx jest --maxWorkers=2 --testPathPattern=replicated-innovation-reminders/developer-parser` passed 18 of 18. It was re-run after `eslint --fix` (a prettier change on one line of the spec) and stayed green. eslint exits 0.
  - Heuristic: entries split on newline, `;`, and `N.`/`N)` numbering after whitespace. A comma never splits on its own. Entries with an email are walked email by email. Names are cleaned of notes and "(Main contact)". Emails are lower-cased and the first of a duplicate is kept.
- **Review 1 (Reviewer): PASS.**
  - Every RIR-R-16 bullet and the Mixed-entries scenario are traced to tests.
  - No probe input loses an email or turns a non-address into a recipient.
  - The patterns cannot backtrack catastrophically.
  - The red run was a missing module, not a failing assertion. That is accepted for a new pure function: the falsifier was checked by hand against spec:6 and spec:103.
- **Advisories (recorded, not new tasks):**
  - A1: `EMAIL_RE` allows a leading `'`, `-`, `.`, `+` or `%` in the local part. Such an address would never match a PRMS user, so the developer is silently not reached. Strip these in `normEmail`.
  - A2: non-ASCII local parts are lost or truncated. Known limit.
  - A3: an unclosed bracket stays in the name, e.g. "Ana Perez (".
  - A4: pin the declared limits with tests: "Juan Ruiz, Ana Perez", "A <e1>, B", "Version 2. x".
  - A5: T-12 should greet by the matched PRMS user's name, not the parsed name.
  - A1, A3 and A4 are cheap and are folded into T-12's brief as a parser touch-up. A5 is applied in T-12's contract.

### RIR-T-10: Migration RecipientModelV2 + entities — `[~]` code PASS, DB HITL pending (2026-10-23)

- **Attempt 1 (Implementer):** files and checks.
  - New: `migrations/1791700000000-RIR-RecipientModelV2.ts`, `entities/center-mel-focal-point.entity.ts`.
  - Edited: `entities/replicated-innovation-reminder-log.entity.ts`, which gets `message_key` and the unique `UQ_rir_log_campaign_message`.
  - `tsc --noEmit` is clean and eslint exits 0. Nothing was run against a DB.
  - The center FK is `center_code varchar(15)` → `clarisa_center.code`.
  - The new unique is added before the old one is dropped, so the FK keeps an index.
  - `down` restores the old bodies through a verbatim copy of the 1791500000000 builder.
- **Review 1 (Reviewer): PASS on code.**
  - `down` is byte-identical.
  - Every template write matches an exact RIR name.
  - The FK/index order is safe and the guards are idempotent.
  - The entities match the DDL.
- **Advisories:**
  - **A1, deploy hazard (Leader: binding).** The T-10 commit must not reach a deploying branch (qa-dev, performance-refactor, staging) without T-11 and T-13. The shipped dispatcher inserts log rows without `message_key`, and the new bodies need `kindLabel`, `phaseYear` and `nextYear`.
  - **A2.** T-13 must store the lower-cased *intended* address in `recipient_email`, never the redirect address. Add a unit assertion for it.
  - **A3.** The `description` text of the two updated templates is stale ("Lead Contact Person").
  - **A4.** Stale comments: `phaseName` appears in the var list, and the log docblock still says "owns that recipient".
  - **A5, spec gap (fixed below).** Nicoleta's verbatim copy was not recorded in the spec.
- **Pending HITL (user, DB):**
  - On prdb: up → verify → down → verify → up → verify, then revert. prdb is shared, and the deployed code still predates T-13.
  - On PROD: the RIR-P-15 count.

#### Appendix: Nicoleta's copy, verbatim (email of 2026-10-23)

Subject: Reminder: innovations pending a 2026 update – Reporting 2026

Dear [Name innov developer]/Dear (Center MEL FP – for w3/bilateral results)

The CGIAR Performance and Results Management System (PRMS) shows that you have [X] innovation(s), reported in previous years, with no update yet to reflect any work done on them during the 2026 reporting period:
Result ID | Innovation | Science Program / Accelerator
8555 | [Innovation title] · [type] | [SP01 – Breeding for Tomorrow]
For existing innovations that receive active investment in 2026, you only need to update changes, all other existing data will be pre-filled for you to review. This should not take much of your time.

For existing innovation that did not receive investment in 2026, were stopped or put on-hold, you can indicate status 'Inactive' and provide the reason for discontinuation.
If you do not update your innovation result, then PRMS will automatically close them with the status 'Inactive – not updated' at the end of January 2027. You can reopen and update an innovation in any later reporting phase (2027, 2028 and beyond).

This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated.

This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.

Deviations in the templates, to confirm at the T-15 copy approval:
- The years come from the phase year: 2026 becomes `{{phaseYear}}`, and 2027 becomes `{{nextYear}}`, written as "({{nextYear}} and beyond)".
- "For existing innovation" is pluralised to "innovations".
- The MELIA summary and the center email have their own intro sentence, which Nicoleta did not write.

### RIR-T-12: MessageBuilder — `[~]` Review 1 FAIL → rework (2026-10-23)

- **Attempt 1 (Implementer):**
  - Rewrote `digest-builder.ts` and its spec (22 cases), and applied T-9 advisories A1, A3 and A4 to the parser.
  - Red runs:
    - parser: 2 assertion failures;
    - builder: TS2305 missing exports, because the module was fully rewritten.
  - Green run: 43 of 43 tests pass, and eslint exits 0.
  - Call sites that no longer compile (T-13 scope): the dispatcher, the campaign service and `campaign-view.ts`.
- **Review 1: FAIL.**
  - (1) A W3 unreachable item loses `lead_center_code` and `lead_center_name`. This violates RIR-R-4, which says to list the SP **or center**.
  - (2) The greeting uses the PRMS user name, while RIR-R-2 said "as written in the developer field". **Leader decision:** the spec is amended to the PRMS user name, per T-9 A5 (a parsed name can merge two people). This is a clarification within the approved Pivot, and the user is informed.
- **Advisories:**
  - **Applied in the rework:**
    - deduplicate results by `result_id` within a message;
    - make `INNOVATION_USE_ROUTING` actually drive the routing.
  - **Recorded:**
    - The W3 owner-SP INNER JOIN in T-11 could drop W3 rows that have no owner SP. The PROD evidence from 2026-10-19 shows `API` rows with no owner SP = 0, so the risk is low. Re-check in the T-11 HITL counts.
    - Use a `NO_SP` reason instead of `NO_MELIA` when `initiative_id` is null.
    - Add a shared `stripRouting` helper.

### RIR-T-11: Pending repository v2 — `[~]` code PASS, PROD HITL counts pending (2026-10-23)

- **Attempt 1 (Implementer):** no Jest run by the Implementer, as instructed.
  - `findPending` no longer excludes W3 and now adds `source`, `developer_text`, `lead_center_code` and `lead_center_name`. Each join is pinned to one row with a MAX/MIN subquery.
  - `findMeliaByInitiatives` replaces the coordinator query. `findCcByInitiatives` is kept as a MELIA-only delegate for the dispatcher until T-13.
  - New: `findActiveUserEmails`, chunked at 1000, and `findCenterMel`.
- **Leader verification:** `npx jest --maxWorkers=2 --testPathPattern=replicated-innovation-reminders/repositories/pending-innovation` passed 27 of 27.
- **Review 1: PASS.** Column names match the entities. The `IN (?)` array binding has a precedent in the codebase. The repository output can be assigned to T-12's `PendingInnovationRowV2`.
- **Advisories:**
  - A1: type `source` as `string | null` and use one shared row contract (T-13).
  - A2: the HITL counts should include `source IS NULL` rows, which are now W1/W2, and `COUNT(*)` vs `COUNT(DISTINCT r.id)`.
  - A3: run `EXPLAIN` on `findPending` to confirm the subqueries use `ref` access.
  - A4: `LOWER(email)` cannot use the email index. That is fine at the current size.
  - A5: remove `findCcByInitiatives` and `CcByInitiative` in T-13.

## Decision: RIR-OQ-7 / RIR-OQ-8 answered by Nicoleta — 2026-10-23

- **OQ-7:** Innovation Use and packages go to the P/A MELIA focal points, "combined with innov dev (without developer address) … in the same notification email to MELIA FPs".
  - This matches the T-12 default: the MELIA summary per SP already holds both type 7 results without a reachable developer and type 2 results.
  - Packages stay out until they are replicated (RIR-OQ-9).
- **OQ-8:** "the Center MEL FP of the Center which has submitted the results (I believe by default that Center becomes lead Center)".
  - Implemented as the lead center (`results_center.is_leading_result = 1`), which is the T-11 default.
  - The PROD HITL counts W3 results that have no lead center.
- **DEP-5:** the Center MEL list "changes based on HR changes in P/As and Centers. Please export it when you need it."
  - RIR-R-18 is amended: the list is re-exported and reloaded before each campaign.
  - **Follow-up, recorded and not a task:** an admin upload or edit for the Center MEL and MELIA lists, so a reload does not need a migration.
- **Attempt 2 (Implementer, collation fix after the prdb run failed with errno 3780):**
  - Changed `center_code` to `varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci`, following the precedent in `1789478669369-BilateralHandoffCodes.ts`. The entity gets `collation: 'utf8mb3_unicode_ci'` (and `charset`).
  - On prdb the failed run had already applied the log-table DDL steps, because MySQL commits DDL implicitly. The guards make re-running `up` safe.
- **Review 2: PASS.**
  - The collation now matches `clarisa_center.code`.
  - The key size is 495 bytes.
  - Re-running from the partial state is safe.
  - Advisories:
    - A6: the `charset` option on the entity is cosmetic.
    - A7 (pending guide fix for staging): `onecgiar-pr-server/CLAUDE.md` §5 says `migration:check` detects entity drift. It only checks for pending migration names.
- **Status:** `[~]` until the user records the prdb up → down → up → down run.
- **Attempt 2 (Implementer):**
  - Changes:
    - W3 unreachable items keep `lead_center_code` and `lead_center_name`.
    - Results are deduplicated by `result_id` within each message.
    - `INNOVATION_USE_ROUTING` now drives the routing, through an optional second parameter of `build`.
    - New helper `baseOf`.
  - Red run: ts-jest compile errors (TS2554, TS2339).
  - Green run: 45 of 45 pass, and eslint exits 0.
- **Review 2: PASS.**
  - Both Review 1 findings are fixed, and the greeting in the spec and the code now agree.
  - W3 rows never reach MELIA, whatever their type.
  - The per-message dedupe keeps a result that belongs in two developers' digests.
  - A manual mutation trace confirms that every new test asserts behaviour.
- **Advisories (go into the T-13 brief, as they are 1-2 line touches):**
  - A1: a W3 type-2 test case.
  - A2: a dedicated unreachable reason when the routing is `'UNREACHABLE'`. Accepted as is, because it is not the default.
  - A3: deduplicate `unreachable` by `result_id`.
  - A4: a comment noting that the routing branch covers every type other than 7.

#### HITL evidence (user-run) — 2026-10-23

**TEST (prdb), RIR-T-10:**
- **Pre-check:** `center_mel_focal_point` was absent.
- **run #1 OK:**
  - The log has `message_key` and `UQ_rir_log_campaign_message`.
  - `center_mel_focal_point` was created with `center_code varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci` and its FK.
  - There are 4 RIR templates: center (kl 1, ctr 1), final (kl 1), melia_summary (kl 1, melia 1), q4 (kl 1).
  - The non-RIR baseline is unchanged: `n=25` and `all_hash=f66171f7ed9b380418dff9be262af4eb`, both before and after.
- **revert OK:** the old unique is restored, `message_key` is dropped, the center table is gone, and 2 templates remain with kl=0.
- **run #2 OK:** the same checks as run #1 pass.
- **EXPLAIN `findPending`, version 36:**
  - The dependent subqueries use `d` = eq_ref and `c` = ref (FK index).
  - The pinned joins `rid` and `lrc` use eq_ref on PRIMARY.
  - No full scans. This answers T-11 advisory A3.
- **Final revert:** done 2026-10-23 (user's output: `RIRRecipientModelV21791700000000 has been reverted successfully`, COMMIT). prdb is back to the pre-T-10 state. **RIR-T-10 → PASS.**

**PROD (read-only, Reporting version 8):**
- **RIR-P-15:** `replicated_innovation_reminder_campaign` is empty, so no campaign has ever been created and the premise is **verified**.
- **Pending counts (T-11):**

  | Bucket | Type | Rows | Results |
  |---|---|---|---|
  | W1/W2 | 2 | 351 | 351 |
  | W1/W2 | 7 | 1,359 | 1,359 |
  | W3 (API) | 2 | 57 | 57 |
  | W3 (API) | 7 | 221 | 221 |

  - There are no `source IS NULL` rows, and rows equal distinct results, so there are no duplicate owner rows (T-11 A2).
  - The W1/W2 numbers match the 2026-10-21 extract (1,710).
- **W3 without a lead center:** 2 of 278 W3 results. They will be listed as unreachable with reason NO_CENTER (RIR-OQ-8).
- **Developer emails (approximate, first email per row, W1/W2 type 7):** 570 distinct; 389 (68%) match an active PRMS user.
  - About 181 addresses (32%) are external or have no account. Their innovations go to the MELIA summary (RIR-R-17).
- **T-10 → [x]** once the final revert is confirmed. **T-11 → [x]**: the PROD counts are recorded.

### RIR-T-13: Dispatcher v2 — `[~]` Review 1 FAIL → rework (2026-10-23)

- **Attempt 1 (Implementer):**
  - Changes:
    - The dispatcher was rewired: `plan()` → `build()` → per-type templates → a log keyed on `message_key` → emit.
    - New `PreviewView` and `SendView` shapes.
    - The T-10 A2, T-11 A1/A5 and T-12 A1/A3/A4 advisories were applied.
  - Results:
    - Module Jest: 10 suites, 165 tests green.
    - `--findRelatedTests` on 15 files: 14 suites, 169 tests green.
    - tsc is clean and eslint exits 0.
  - Red run: TS2339 compile error.
- **Review 1: FAIL.** A dry run that throws inside `plan()` falls through to `end()`/`finalize()`. That breaks RIR-R-9 (no status change), and the preview returns an empty 200.
  - Verified with no findings: exactly-once handling, the non-prod redirect for all types, prod To/CC, no coordinator path, template vars against the migration bodies, the exact subject, logger hygiene, the advisories, and DI.
- **Advisories:**
  - Applied in the rework:
    - the subject label comes from the dispatcher's `isProd`, so an unset `IS_PRODUCTION` still shows Testing;
    - `lead_email`, `lead_name` and `lead_contact_person` are dropped from the preview items (the T-14 contract is updated to match);
    - a dead branch is removed.
  - Deferred to the T-15 copy review: a null `spName` renders "SP01 – ,". The fix is `{{#if spName}}` in the templates.
- **Attempt 2 (Implementer):**
  - Changes:
    - a dry run that throws now rethrows instead of finalizing;
    - the subject label comes from `isProd`;
    - the `lead_*` fields are removed from the output items through `ResultItemBase`;
    - a dead branch is removed.
  - The Leader's Jest run found 1 stale T-4 test that expected `[PRMS Testing]` under prod. The Implementer updated that test only.
  - Module result: 10 suites, 169 tests green.
  - `--findRelatedTests`: 14 suites, 173 tests green.
- **Review 2: PASS.**
  - No dry-run path reaches claim, log, finalize or send.
  - A real dispatch that errors still finalizes FAILED.
  - The prod label is unchanged.
  - No other consumer reads the removed lead fields.
- **Advisory A1 (AC-9) — applied as a small attempt 3.** The rethrown raw error could carry bound emails (QueryFailedError) into the global filter's log and response. The fix wraps it as `InternalServerErrorException(safeReason)`.
- **Advisory A2 (recorded):** the subject comment in migration 1791500000000 is stale. It is not editable after master.

### RIR-T-14: Admin preview v2 — PASS 2026-10-23

- **Attempt 1 (Implementer):**
  - Changes:
    - the client interfaces mirror `PreviewView` and `SendView`, with no `lead_*` fields;
    - the drawer groups messages by type with `by_type` counts;
    - the unreachable table gets Reason and SP-or-center columns plus the developer free text;
    - Send now confirms `totals.messages` and shows the outcome per type;
    - the copy lives in `replicated-innovation-reminders.copy.ts`.
  - Scoped Jest: 3 suites, 38 tests green.
  - `tsc` (app) is clean and eslint is clean.
  - **Not spec-first, so no red run was recorded.** Accepted: the task block has no Red-run field.
- **Leader verification:** after the late interface edit, `--findRelatedTests --maxWorkers=2` on the 4 changed source files passed 435 suites and 11,676 tests.
- **Review 1: PASS.**
  - The contract matches the server field for field (`developerText` vs `developer_text`).
  - The reason copy is exact.
  - Only Spartan components are used.
  - The Send-now test is discriminating: the messages total differs from the digest count.
- **Advisories (recorded):**
  - A1: missing `totals` falls back to 0 with Send enabled. It should be an error state.
  - A2: pin `by_type` with a value that differs from the recomputed one.
  - A3: the `by_type` fallback hides contract drift.
- **Attempt 3 (Implementer, AC-9):**
  - A failed dry run now throws `InternalServerErrorException('preview failed: ' + safeReason)`.
  - The spec rejects with an email in the message and asserts no '@' reaches the thrown error, plus no claim, log, finalize or send.
  - Module Jest: 10 suites, 169 tests green. tsc and eslint are clean.
- **Review 3: PASS.** `safeReason` uses only the class name and the error code, the real-dispatch path is unchanged, and the spec would catch the old raw rethrow. **RIR-T-13 → PASS 2026-10-23.**

## Decision: Center MEL focal point list (DEP-5) — 2026-10-23

- **Sources:**
  - Nicoleta's deck "Reviewing and approving w3-bilat results" (5 Feb 2026, slide 7), which lists names only;
  - "MELIAF Center stocktake dataset v2.xlsx" (Joined Up MELIA, interviews Apr–Sep 2026).
  - The Program/Accelerator Teams dashboard is Power BI and cannot be read by the agent. The user's export only contained the P/A MELIA role.
- **Emails:** resolved through the CGIAR M365 directory.
- **User decision:** "esos son". Seed the deck's people who have a resolvable email, and leave out those without one: Ben Pamatmat (IRRI), plus Leroy Mwanzia (CIP) and Menale Kassie (ILRI) from the stocktake. The result is 15 people across 12 centers, which is 17 rows over 13 center codes, because the Alliance pair (Ivana Cortesini, Fabio Catini) is seeded on both CLARISA Alliance centers, 'Bioversity (Alliance)' and 'CIAT (Alliance)'. *(Corrected 2026-10-23: the Leader had miscounted it as 16.)*
- **Discrepancies between the two sources, recorded:**
  - CIP: the stocktake names Leroy Mwanzia.
  - ILRI: the stocktake adds Menale Kassie as the new Head of MEL.
  - IFPRI: blank in the stocktake.
  - Nicoleta was given an optional confirmation email draft. RIR-R-18 requires a refresh before each campaign anyway.
- **RIR-T-15 code part:**
  - seed migration `1791800000000-RIR-SeedCenterMelFocalPoints`, with centers resolved by acronym and no hard-coded codes;
  - a `{{#if spName}}` fix in the not-yet-deployed RecipientModelV2 templates (T-13 advisory);
  - T-14 advisories A1–A3 on the client.

### RIR-T-14 follow-up: Review 1 advisories A1–A3 (2026-10-23)

- **Changes:**
  - A1: when `totals.messages` is missing or invalid, the component shows a `previewUnavailable` error and opens no confirmation.
  - A2: the `by_type` fixture differs from the count derived from the digests, which pins the contract.
  - A3: the drawer's recompute fallback is removed.
- **Red run:** 1 failed and 38 passed. The failure was the new A1 test, where the dialog rendered "0 messages will be sent".
- **Green runs:**
  - folder-scoped: 3 suites, 39 tests;
  - `--findRelatedTests`: 21 suites, 740 tests;
  - eslint: clean.
- **Review:** the client-side diff is reviewed together with the T-15 code review.

### RIR-T-15 part 1 (code): Center MEL seed + spName template fix — code PASS 2026-10-23

- **Attempt 1:**
  - `1791800000000-RIR-SeedCenterMelFocalPoints.ts`: 17 rows over 13 center labels, with the Alliance pair on both Alliance centers. Centers resolve by acronym, then name.
  - `1791700000000` templates: `{{#if spName}}` wrap. The file is not yet deployed.
  - tsc and eslint are clean.
- **Review 1: FAIL** on a count mismatch. It was a Leader record error (16 vs 17), corrected above.
  - The templates and the client follow-up (T-14 A1–A3) passed.
  - Advisories:
    - make the seed fail loudly on unresolved or colliding Alliance centers;
    - drop the generic Alliance candidates;
    - have `down` delete by email.
- **Attempt 2:**
  - The seed resolves all 13 labels first and throws before any insert if a label is unresolved or the two Alliance labels collide.
  - The Alliance candidates are reduced.
  - `down` is a bound `DELETE … WHERE email IN (…)`.
- **Review 2: PASS.**
  - The throw happens before any insert, every value is bound, and the header is accurate.
  - The email-wide `down` is acceptable for a table this feature owns.
- **Pending (HITL, user):**
  - Query 1: preview of the center resolution on prdb and PROD.
  - On prdb: `migration:run` (applies 1791700000000 + 1791800000000), Query 2 must return 17 rows over 13 codes, then `migration:revert` ×2.

#### RIR-T-15 part 1: HITL evidence on prdb (user-run, 2026-10-23)

- **`migration:run`** applied `RIRRecipientModelV21791700000000` and `RIRSeedCenterMelFocalPoints1791800000000` in one transaction.
  - All 13 labels resolved on the **first acronym candidate**, so no name fallback was used.
  - The resolved codes were: Bioversity (Alliance) → CENTER-02, CIAT (Alliance) → CENTER-03, AfricaRice → 01, CIMMYT → 05, CIP → 06, ICARDA → 07, ICRISAT → 09, IFPRI → 10, IITA → 11, ILRI → 12, IRRI → 13, IWMI → 14, WorldFish → 15.
  - The two Alliance codes are distinct.
- **Query 2:** 17 rows over 13 codes, which matches the decision.
- **Revert:** the user reports both migrations were reverted, leaving prdb back at the pre-revision-2 state.

## Data validation on PROD before T-15 (user-run, read-only, version 8) — 2026-10-23

- **Developer field (1,359 W1/W2 type 7):**
  - 128 empty;
  - 205 with names only, no email;
  - 1,026 with at least one email.
- **Developer emails:**
  - 758 distinct addresses, up to 10 per field.
  - **471 are active PRMS users**, so 471 developer digests go out.
  - 287 (38%) have no PRMS account and are routed to the MELIA summary.
- **Routing:**
  - 822 Innovation Development results go to developers;
  - 537 Innovation Development results go to the MELIA summary;
  - 351 Innovation Use results go to the MELIA summary.
  - Total 1,710 ✓.
- **MELIA summaries:** 13, one per SP, and every SP has at least one MELIA focal point. They cover 888 results. The largest are SP02 with 183 and SP09 with 174.
- **W3:** 12 center emails covering 276 results, plus 2 unreachable with no lead center. CIAT (Alliance) has no pending W3 as lead.
- **Total:** about 496 emails per campaign at today's volume.
- **CC load per MELIA (developer digests):**
  - j.delarueda and v.pede (SP06 + SP09): 152 each.
  - Then SP01 84, SP02 76, SP03 58, SP04 48, SP07 34, SP12 29, SP05 19, SP13 17, SP08 15, SP10 13 each, and SP11 1.
- **User decision (2026-10-23): accepted, same rationale as the 2026-10-19 R-3 decision.**
  - No campaign is sent now. Teams get time to update, and the reminder is scheduled near the end of the year, by which point the pending set (and so the CC load) should be much smaller.
  - The admin preview shows recipient and CC counts before "Send now".
  - Residual risk: if the volume is still high when the reminder is due, raise it with Nicoleta before sending.

## Pivot Record (mini): RIR-R-5 "Send again" — 2026-10-23

**Trigger:** the user found during T-15 that a `SENT` campaign is terminal, and that R-5 allowed only one non-cancelled campaign per kind. As a result an admin could never send the same kind again: not for a second final reminder in production, and not for a re-test on PRTest.

**Decision (user, 2026-10-23):**
- R-5 is amended: at most one *open* (`PENDING`/`SENDING`) campaign per kind per phase. Sent and cancelled campaigns stay as history.
- New "Send again" action on `SENT` rows. It creates a new campaign of the same kind, uses the normal schedule/preview/confirm flow, and has its own send log.
- Exactly-once per campaign is unchanged.
- The user asked for a fast turnaround.

**Impact:**
- Server: the duplicate-kind check in the campaign service and its spec.
- Client: a "Send again" button on SENT rows, its copy and its spec.
- No migration.

**Interim for the T-15 smoke:** the user set the two PRTest (version 36) SENT campaigns to `CANCELLED` by SQL. `rir_test_recipient_email` is confirmed as the user's own address.

#### T-15 PRTest smoke (agent-run in the browser on prtest.ciat.cgiar.org, deploy 68e10f343) — 2026-10-23

- **Revision 2 is live.** The header reads "128 pending replicated innovation(s), 4 without a reachable recipient". The two old SENT campaigns were cancelled by SQL beforehand.
- **Q4 campaign:**
  - Created for 2026-12-31 10:00 local and shown as Pending.
  - **Preview:**
    - "Non-production: every email is redirected"; 15 messages, 124 results, 0 CC.
    - Developer digests: 0, because no TEST developer address matches an active user.
    - MELIA summaries: 6 messages, 14 results.
    - Center MEL emails: 9 messages, 110 results.
    - Unreachable: 4, all with reason "No lead center".
    - 124 + 4 = 128 ✓.
  - **Send now:** the confirmation read "15 messages will be sent". Result: "Dispatch finished: 15 sent, 0 skipped, 0 failed", split 0 / 6 / 9 by type. The row is SENT with Sent 15 and Unreachable 4.
- **Inbox:** the test address received exactly **15** emails, each with subject "TEST - [PRMS Testing] Reminder: innovations pending a 2026 update – Reporting 2026". The "TEST - " prefix is added by the mail service.
  - Sampled MELIA summary:
    - the redirect block names the intended recipients (the SP06 pair);
    - the badge reads "Q4 notice" and the greeting "Dear MELIA focal point(s) of SP06 – Climate Action";
    - the table has a linked title · type, "SP06 – Climate Action" and "Not provided";
    - the copy has 2026/2027 substituted.
  - The S3 header image did not render in Outlook. It is an external SVG and looked the same in revision 1, so it is not a regression.
- **Cron:** a FINAL_REMINDER was scheduled for 16:17 local and is Pending. The hourly tick at 17:00 local should dispatch it; the result is still to be recorded.
- **Not covered by the agent:**
  - The 403 check needs a non-admin account (user step).
  - The developer digest template needs a TEST result whose developer field holds an active user's address.
- **Developer digest (2026-10-23):** the user set result 8555 "Innovation Developer" to their own address. The preview of the pending FINAL_REMINDER then showed:
  - Developer digests: 1 message, To the user's address, CC r.mawia (SP01 MELIA), greeting "Santiago Sanchez" (the PRMS user name, per A5), and result #8555;
  - MELIA summaries: 6 messages with 13 results, one less than before, because 8555 left the SP01 summary.
  - **RIR-R-2, R-3 and R-17 are confirmed live.**

### Mini-Pivot R-5 "Send again" — Review 1 PASS (2026-10-23)

- **Implementer:**
  - Server: the duplicate check blocks only PENDING, SENDING and FAILED. Red 5 → green 175; `--findRelatedTests`: 8 suites, 64 tests.
  - Client: "Send again" on SENT rows presets the kind and shows the hint. Red 3 → green 45; `--findRelatedTests`: 21 suites, 746 tests.
  - The client eslint config fails to start, so style was checked by the Reviewer by hand.
- **Review: PASS.**
- **Advisories (recorded):**
  - The R-5 wording is now aligned to include FAILED.
  - The 409 text says "cancel" although a FAILED campaign cannot be cancelled. Known gap: a FAILED campaign that keeps failing blocks its kind for the phase.
  - `canSendAgain` should also be disabled while that kind has an open campaign.
  - The focus call uses `setTimeout`.
  - The client eslint config needs fixing.
- **Cron (2026-10-23):** the FINAL_REMINDER scheduled for 16:17 local was dispatched by the hourly tick at 22:00 UTC (17:00 local). The test inbox received exactly **16** emails with subject "TEST - [PRMS Testing] **Final reminder:** innovations pending a 2026 update – Reporting 2026", all sent between 22:00:01 and 22:00:09 UTC. That is 1 developer digest + 6 MELIA + 9 Center MEL, with no duplicates.
  - **RIR-R-6 (hourly) and RIR-R-8 (exactly once) are confirmed live.**
  - The developer digest body was confirmed: "Final reminder / Dear Santiago Sanchez … you have 1 innovation(s)", with the MELIA address named in the redirect block's "in copy".
- **T-15 smoke status:**
  - Done: preview, Send now, all 3 templates, redirect, cron, exactly-once.
  - Pending:
    - the 403 check with a non-admin account (user);
    - "Send again" on PRTest once deploy cf0c1bdb4 is live;
    - Nicoleta's copy approval (DEP-2).
- **DEP-2 copy review:** the user emailed Nicoleta the 3 test emails (developer digest, MELIA summary, Center MEL), together with the explanation and the volume estimate (about 496 emails). **Awaiting her approval.** T-15 closes once she approves and the 403 check is done.

### 2026-10-26 — Result ID as an active hyperlink (Marc Schut via INC-165323)

- Request: the Result ID in every reminder email must be an active link to the result page on reporting.cgiar.org.
- Change: migration `1791900000000-RIR-ResultIdHyperlink.ts`, a REPLACE scoped by name on the 4 RIR template rows. The Result ID cell links to the same `{{resultUrl}}` as the title (`RESULTS_URL` + code + `/general-information?phase=<version>`). No code change.
- Verification: eslint and tsc clean. Pending HITL: user runs up/down/up on prdb, then a PRTest send (Send again) to confirm the ID is clickable.

### 2026-10-26 — Production release (PR #786)

- PROD pre-checks, read-only: all 13 seed centers resolve and are active (Alliance CENTER-02 / CENTER-03); 0 open campaigns.
- PR #786 staging → master, approved and merged by Cristian at 15:19 UTC.
- Cristian's review follow-ups:
  - disable Send again while a campaign of the same kind is open;
  - non-admin 403 check;
  - SMTP limits (Infra).
- PROD post-deploy:
  - `center_mel_focal_point` = 17 rows;
  - 0 open campaigns;
  - admin Preview shows about 496 messages, matching the volume estimate.
- Next: Nicoleta receives the how-to email and schedules the Q4 notice. Then T-15 closes and the spec is archived.

### 2026-10-26 — Cristian review follow-up: Send again button state

- `canSendAgain` now also requires the kind to be free (no PENDING/SENDING/FAILED campaign of the same kind). The button is disabled instead of doing nothing on click.
- New component spec case; the component spec is green (30 tests), and `--findRelatedTests` showed the other 20 related suites green.
- Commit `5af580414` on qa-dev, not yet pushed; it ships in the next release.

### RIR-T-15 — PASS 2026-10-26

Closed with the evidence above. Spec archived the same day.
