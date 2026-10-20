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
