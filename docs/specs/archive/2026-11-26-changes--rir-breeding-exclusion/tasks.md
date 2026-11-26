# Tasks — RIR breeding exclusion, innovation packages and copy v3

## 1. Scope of this task list

This list implements `requirements.md` (RBX-R-1 … R-6) per `design.md` (DD-1 … DD-8). The work is server-only, in `onecgiar-pr-server/src/api/replicated-innovation-reminders/`, plus one migration.

- Branch: `spec/rir-breeding-exclusion`
- Worktree: `D:\PRMS\onecgiar_pr-rir`
- Baseline: `093655d2c`

**Test rules for every task** (from the user's global rules):
- Jest always runs with `--maxWorkers=2`, scoped to the touched specs.
- Only one test run at a time on the machine.
- Lint only the touched files.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-25)
- [x] `design.md` approved (2026-11-25)
- [x] Open questions (answered 2026-11-26, folded into Pivot P-1): RBX-OQ-1..4 are with Nicoleta. Each has a default written down, so none of them blocks execution. Any answer that changes a default is a Pivot on RBX-R-2 / R-4 / R-1.
- [x] No conflicting in-flight spec touches this module. The active specs under `docs/specs/changes/` are unrelated (listed 2026-11-25).
- [x] Migration name `1793600000000` is above the latest on every branch (`1793500000000`, listed 2026-11-25). **Stale the same day:** IU26 also landed `1793600000000-AddNewUsersToInnovationUseRows`. Kept, because TypeORM keys on the migration name (see `execution.md`, pre-commit finding).

## 3. Task list

Fill `Review:` using the table in `general-setup/task.md`.

### [x] RBX-T-1 — Frozen template copy module (v2 + v3) and the exclusion code list

- **Type:** server
- **Description:** Create `templates/rir-template-copy.ts`.
  - It exports `buildRirTemplatesV2()` and `buildRirTemplatesV3()`. Each returns the 4 bodies keyed by template name (design §6.4, §6.5 verbatim).
  - The file header states it is frozen (DD-5).
  - v3 reuses the v2 shell head unchanged and the linked Result ID cell, swaps intros, tails and the Center SP header, and adds the year variables `previousYear` and `nextNextYear`.

  Create `templates/rir-breeding-exclusion-codes.ts`. It exports the 114 codes from the sheet "Results excluded from notification" (25-Nov-2026) and the reason string (design §4).

  Specs:
  - (a) **v2 equality (DD-7).** Run `RIRRecipientModelV21791700000000.up` against a fake query runner that captures `UPDATE … SET template = ?` and `INSERT … template` params. Apply the `1791900000000` cell replacement and the `1793400000000` Center-intro replacement (run their real `up`) to the captured bodies (amended 2026-11-25). Assert byte equality with `buildRirTemplatesV2()` for all 4 names.
  - (b) **v3 render.** Compile each v3 body with Handlebars using fixed data (phaseYear 2026, previousYear 2025, nextYear 2027, nextNextYear 2028, one result row). Assert:
    - each paragraph of §6.5, including the breeding one;
    - "end of January 2027" in the developer and MELIA bodies and "mid-February 2027" in the Center body;
    - "reported in 2025", and "(2027, 2028 and beyond)" in all bodies;
    - the linked Result ID `<a class="link" href="…">`;
    - the redirect notice when `intendedTo` is set;
    - the disclaimer.
  - (c) **Codes.** Length 114, all distinct integers. Assert set equality against a literal copy in the spec of the sheet's first, last and boundary codes (`26541`, `17`, `347`, `14855`, `28704`) plus the checksum (sum) of the sheet list. **Do not include 28595 in the negative check: it IS on the sheet.**
- **Implements:** RBX-R-1 (seed content: the 114 codes), RBX-R-4 (all scenarios), RBX-R-5 (v2 bodies byte-exact for `down`)
- **Files:** `templates/rir-template-copy.ts`, `templates/rir-template-copy.spec.ts`, `templates/rir-breeding-exclusion-codes.ts`, `templates/rir-breeding-exclusion-codes.spec.ts` (all under `api/replicated-innovation-reminders/`)
- **Backend route:** data/copy constants (pure functions), no I/O; project conventions
- **Depends on:** —
- **Blocks:** RBX-T-2
- **Estimate:** M
- **Review:** full. The copy must be verbatim, and the v2 byte equality is the only gate for `down`.
- **Verification:**
  - **Falsifier:**
    - (a) Change one character of the v2 shell (for example drop the `.kind` style line): the v2 equality spec goes red.
    - (b) Replace "mid-February {{nextYear}}" with "end of January {{nextYear}}" in the Center body: the v3 spec goes red on the Center assertion.
    - (c) Delete one code: the length assertion goes red.
  - **Red run:** `predicted — greenfield artifact (observed in RBX-T-1)`. The Implementer records in `execution.md` the observed red of each falsifier (a)(b)(c), applied to the new code and then reverted, quoted verbatim. Command: `npx jest src/api/replicated-innovation-reminders/templates --maxWorkers=2 --silent`.
  - **Disqualifier:**
    - If the captured v2 bodies from the old migrations cannot be reproduced byte-exactly (spec (a) cannot go green without editing the old migrations), stop and Pivot on DD-7. Never edit `1791700000000`, `1791900000000` or `1793400000000` (P-11).
    - A v3 assertion written from intent rather than from the §6.5 text is not evidence.
  - **Consumers:** none (new symbols; consumed by RBX-T-2 only)
- **Skills:** `nestjs-expert`, `tdd`
- **Definition of done:**
  - [x] 3 specs green; the falsifier reds are quoted in `execution.md`.
  - [x] `npx eslint <touched files> --quiet` clean; `npm run build` green.

### [x] RBX-T-2 — Exclusion entity and migration `1793600000000-RIR-BreedingExclusionCopyV3`

- **Type:** db
- **Description:** Two parts:
  - **Entity.** Add `ReplicatedInnovationReminderExclusion` (`@Entity('replicated_innovation_reminder_exclusion')`, extends `BaseEntity`) with PK `result_code` bigint and `reason` varchar(255) nullable (design §4, DD-2).
  - **Migration.**
    - `up`:
      - CREATE TABLE IF NOT EXISTS with the RCF column pattern;
      - INSERT IGNORE the codes from RBX-T-1 with bound parameters and the reason;
      - UPDATE the 4 template rows by name to `buildRirTemplatesV3()`.
    - `down`:
      - UPDATE the 4 rows to `buildRirTemplatesV2()`;
      - DROP TABLE IF EXISTS.
    - The header documents the four futures, following the RIR migrations.
- **Implements:** RBX-R-1 (seed is idempotent: 114, not 228), RBX-R-4 (no other template row modified), RBX-R-5
- **Files:** `entities/replicated-innovation-reminder-exclusion.entity.ts`, `src/migrations/1793600000000-RIR-BreedingExclusionCopyV3.ts`
- **Backend route:** TypeORM migration and entity; project conventions
- **Depends on:** RBX-T-1
- **Blocks:** RBX-T-5
- **Estimate:** S
- **Review:** full (migration on PROD data, KZ-changes--replicated-innovation-reminders-2)
- **Verification:**
  - **Falsifier:**
    - Replace `INSERT IGNORE` with `INSERT`: a second `up` on prdb fails with a duplicate key. Observed in RBX-T-5 step 1.
    - Use the template `id` instead of `name` in the WHERE: the static read below shows no `name IN` / `name = ?` predicate.
    - Static gate, run by the Reviewer: `grep -n "WHERE name" <migration>` must return the UPDATE lines, and `grep -c "UPDATE \`template\`" <migration>` must return ≥1. No other table is written.
  - **Red run:** n/a (Jest does not discover `src/migrations/`, P-7). Gate = `npm run build` + `npm run migration:check` + the RBX-T-5 prdb up/down/up.
  - **Disqualifier:** if `migration:check` reports a pending schema diff for the new entity (entity and DDL disagree), fix the entity or DDL until it is clean. Never suppress the check.
  - **Consumers:** none. The `template` rows are read only by the dispatcher (P-9).
- **Skills:** `nestjs-expert`
- **Definition of done:**
  - [x] `npm run build` green.
  - [x] `npm run migration:check` green, run in the worktree against the same DB the user's local `.env` points to, with the migration NOT yet applied. A pending list showing only `1793600000000` is the expected state.
  - [x] Lint clean on the touched files.

### [x] RBX-T-3 — Selection: exclusion list and innovation packages in `findPending`

- **Type:** server
- **Description:** Change the one `findPending` SQL per design §6.1 (DD-1, DD-8):
  - branch A: `version_id = ?` AND type IN (2, 7), unchanged;
  - branch B: type = 10 AND version in IPSR versions (`app_module_id = 2`, `is_active = 1`, `status = 1`) whose `phase_year` equals the bound version's;
  - common predicates unchanged;
  - `NOT EXISTS` against an active exclusion row on `result_code`;
  - params `[versionId, versionId]`;
  - the doc comment is updated.

  Update `digest-builder.ts:194-195`: comment only, naming type 10.

  Specs, extending the SQL-seam suite: one assertion per new predicate, each falsified by deleting that predicate:
  - exclusion table and `x.result_code = r.result_code` and `x.is_active = 1`;
  - branch A keeps `r.version_id = ?` together with `IN (2, 7)`;
  - branch B has `result_type_id = 10`, `app_module_id = 2`, `status = 1` and `phase_year = rpv.phase_year`;
  - params equal `[V, V]`, and V is never interpolated;
  - still one statement and a read-only SELECT.
- **Implements:**
  - RBX-R-1: listed results disappear; exclusion follows the code across phases (keyed on `result_code`, not `id`); an inactive entry does not exclude.
  - RBX-R-2: package selection, all negatives: Submitted, not replicated, other year, type 10 in Reporting, 2/7 in IPSR. No IPSR phase means branch B is empty, not an error.
  - RBX-R-6: one statement, no second selection.
- **Files:** `repositories/pending-innovation.repository.ts`, `repositories/pending-innovation.repository.spec.ts`, `digest-builder.ts` (comment)
- **Backend route:** raw-SQL repository; project conventions
- **Depends on:** — (SQL references the table by name; it runs only after RBX-T-2 is applied)
- **Blocks:** RBX-T-5
- **Estimate:** S
- **Review:** full (the core selection; a wrong predicate emails the wrong people)
- **Verification:**
  - **Falsifier:** baseline readings on `093655d2c` (run 2026-11-25), counts in `pending-innovation.repository.ts`:

    | Pattern | Count |
    |---|---|
    | `replicated_innovation_reminder_exclusion` | 0 |
    | `result_type_id = 10` | 0 |
    | `app_module_id = 2` | 0 |
    | `[versionId]` | 1 |

    The new assertions are therefore red on baseline. Mutation after the change: replace `x.result_code = r.result_code` with `x.result_code = r.id`, and the exclusion-key assertion goes red. Drop `AND ipv.status = 1`, and the DD-8 assertion goes red.
  - **Red run:** `npx jest src/api/replicated-innovation-reminders/repositories --maxWorkers=2 --silent`. Write the new assertions first and quote the assertion-level failure (not a setup error) in `execution.md`.
  - **Disqualifier:**
    - The spec proves the SQL text, not that it selects the right rows on real data (inherited RIR limitation). The real-data proof is RBX-T-5 step 2.
    - A green spec is not evidence of correct selection by itself.
  - **Consumers:** `repositories/pending-innovation.repository.spec.ts` pins `[VERSION_ID]` (`:32`), `r.version_id = ?` (`:45`) and `IN (2, 7)` (`:51`); update `:32`. Callers: `reminder-dispatcher.service.ts:166` only (P-1). `reminder-dispatcher.service.spec.ts` mocks `findPending`, so it is unaffected by the SQL.
- **Skills:** `nestjs-expert`, `tdd`
- **Definition of done:**
  - [x] The repository spec is green; the reds are quoted.
  - [x] Lint clean; `npm run build` green.

### [x] RBX-T-4 — Dispatcher: package type name, IPSR link and year variables

- **Type:** server
- **Description:** In `reminder-dispatcher.service.ts` (DD-3, DD-4):
  - `RESULT_TYPE_NAMES[10] = 'Innovation package'`;
  - export the pure `buildResultUrl(resultsUrl, typeId, code, versionId)` per design §6.3, and use it for `resultUrl`;
  - add `previousYear` and `nextNextYear` to the template data.

  Specs:
  - `buildResultUrl` table:

    | Type | Base | Expected |
    |---|---|---|
    | 10 | `https://x/result/result-detail/` | `https://x/ipsr/detail/9001/general-information?phase=9` |
    | 10 | `https://x/result/result-detail` (no trailing slash) | ipsr form |
    | 10 | `https://prms.test/result/` (other shape) | `https://prms.test/result/9001/general-information?phase=9` (fallback) |
    | 2 and 7 | `https://x/result/result-detail/` | unchanged result-detail form |
    | any | `undefined` | no throw |

  - Render spec: one package row and one type-2 row in one message. The package shows "Innovation package" and the ipsr link; the type-2 row keeps result-detail.
  - Data spec: `previousYear` = 2025 and `nextNextYear` = 2028 for a 2026 campaign.
- **Implements:**
  - RBX-R-3: package link; Innovation Use keeps result-detail; unknown base shape.
  - RBX-R-4: years derive from the campaign year (data side).
- **Files:** `reminder-dispatcher.service.ts`, `reminder-dispatcher.service.spec.ts`
- **Backend route:** service; project conventions
- **Depends on:** —
- **Blocks:** RBX-T-5
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** baseline readings on `093655d2c`, counts in `reminder-dispatcher.service.ts`: `Innovation package` 0, `ipsr/detail` 0, `previousYear` 0, `nextNextYear` 0, `buildResultUrl` 0. The new specs are red on baseline. Mutation: drop the `INNOVATION_PACKAGE` check in `buildResultUrl`, and the type-10 rows go red while the 2/7 rows stay green.
  - **Red run:** `npx jest src/api/replicated-innovation-reminders/reminder-dispatcher.service.spec.ts --maxWorkers=2 --silent`. Quote the assertion-level red.
  - **Disqualifier:** if the existing render spec (`:567-585`, `RESULTS_URL = https://prms.test/result/`) has to change its expected URL for a type-7 row, the helper broke the non-package path. Fix the helper; do not edit that expectation.
  - **Consumers:** `reminder-dispatcher.service.spec.ts:126,550,567-585` pin the template data keys and the row render; they must stay green unchanged. `buildResultUrl` is a new export; grep confirms no other importer.
- **Skills:** `nestjs-expert`, `tdd`
- **Definition of done:**
  - [x] Spec green; the existing pins are unchanged and green.
  - [x] Lint clean; `npm run build` green.

### [x] RBX-T-5 — HITL: prdb migration, real-data counts, PRTest render

- **Type:** rollout (user-run DB steps; the agent prepares the SQL and checks)
- **Description:**
  1. **prdb** (user, DBeaver): run the migration up → down → up. After each up, the exclusion table has 114 rows and the 4 bodies contain "Breeding for Tomorrow". After down, the table is absent and the bodies contain no "Breeding for Tomorrow" while still holding `<a class="link" href="{{resultUrl}}">{{resultCode}}</a>`. Re-run up a second time: still 114.
  2. **prdb counts** (read-only):
     - the Admin > Reminders `pending_total` from the local server equals a hand SQL count of the same universe;
     - none of the 114 codes appears in the dry-run preview;
     - type-10 rows appear with "Innovation package".
  3. **PRTest** (after the deploy): with a test campaign, use Send now to the redirect address and receive one developer digest, one MELIA summary containing a package and one Center email. Then:
     - open a package link: it opens `ipsr/detail/…` (settles **P-6**);
     - read the copy against §6.5;
     - forward to Nicoleta for her look (DEP-2).
- **Implements:**
  - RBX-R-1: seed content in the real DB; listed results disappear (real data).
  - RBX-R-2: package selection on real data.
  - RBX-R-4: copy wording (human check).
  - RBX-R-5: up, down, up.
  - RBX-R-6: counts agree.
- **Depends on:** RBX-T-1..T-4
- **Estimate:** S (agent) + user time
- **Review:** checklist (on the recorded evidence)
- **Verification:**
  - **Falsifier:** the hand count ≠ `pending_total`, or any excluded code appears in the preview, or a package link opens result-detail. Each is a FAIL with its own fix route: count → T-3; code in preview → T-3; package link → T-4 / P-6.
  - **Red run:** n/a (no test gate; the evidence is the recorded counts and screenshots)
  - **Disqualifier:** counts taken while another session is writing reminder data, or a preview from a server not running this branch, are not evidence. The rows read must come from prdb at the same moment for both numbers.
  - **Consumers:** none
- **Skills:** —
- **Definition of done:**
  - [x] The three steps are recorded in `execution.md`, with the counts quoted.
  - [x] P-6 is settled (2026-11-26: the PRTest email links 8057 to `ipsr/detail/8057/general-information?phase=37`, which opens the package; see `execution.md` → RBX-T-8 step 3 check).
  - [x] Copy reviewed by the user (approved 2026-11-26). The first real PROD send happens only after Nicoleta's look (DEP-2).

### Pivot P-1 (2026-11-26) — Nicoleta's answers to RBX-OQ-1 and RBX-OQ-4

Recorded in `execution.md` § Pivot P-1. RBX-T-1..T-4 stay done; v3 is applied on prdb (migration id 574), so the copy change is a v4 plus a new migration, never an edit of v3 (frozen module, P-11 spirit).

> Process note: a draft of RBX-T-6 and RBX-T-7 was written by the Leader session **before** this Pivot was approved (AKILI order skipped). It is in the working tree, uncommitted, and is treated as an Implementer draft: it does not count as done until the Pivot is approved and the Reviewer passes it.

### [x] RBX-T-6 — Package routing to the Lead contact person

- **Type:** logic (pure builder)
- **Description:** In `digest-builder.ts` `build`, a W1/W2 type-10 row (after the RCF opt-in check) goes to `byDeveloper` keyed by the normalised `lead_email` (already selected by `findPending`: `ad_users.mail` with `is_active = 1`), with the AD display name kept for the greeting when the address has no PRMS account name. No `lead_email` → `noDeveloper` (MELIA summary). Type 2 keeps INNOVATION_USE_ROUTING. No repository or dispatcher change.
- **Implements:** RBX-R-7 (all scenarios)
- **Depends on:** — · **Blocks:** RBX-T-8
- **Estimate:** S
- **Review:** full (Reviewer)
- **Verification:**
  - **Falsifier:** route type 10 back through INNOVATION_USE_ROUTING → the "lead contact" specs fail; drop the `leadNames` fallback → the greeting spec fails; move the type-10 branch above the opt-in check → the "opted-in Center still wins" spec fails.
  - **Red run:** the Implementer records each falsifier's observed red in `execution.md`. Command: `npx jest src/api/replicated-innovation-reminders/digest-builder --maxWorkers=2 --silent`.
  - **Consumers:** `ReminderDispatcher.plan` (dispatch, dry-run preview, admin counts): one build path, so RBX-R-6 holds. The existing dispatcher spec with a type-10 row and no `lead_email` (MELIA render) must stay green.
- **Skills:** `nestjs-expert`, `tdd`
- **Definition of done:** [x] specs green · [x] reds recorded · [x] Reviewer PASS

### [x] RBX-T-7 — Copy v4 (no breeding paragraph) and migration `1793700000000-RIR-CopyV4NoBreedingNote`

- **Type:** data (copy + migration)
- **Description:** Append `buildRirTemplatesV4()` to `templates/rir-template-copy.ts` = each v3 body with the breeding paragraph removed (throws if it is not found, so an edited v3 can never ship as v4). New migration: `up` writes v4 to the four RIR rows by name, `down` writes v3. v2/v3 builders untouched.
- **Implements:** RBX-R-8
- **Depends on:** — · **Blocks:** RBX-T-8
- **Estimate:** S
- **Review:** full (Reviewer)
- **Verification:**
  - **Falsifier:** make `buildRirTemplatesV4` return v3 → the "no breeding text" spec fails; swap up/down in the migration → the migration spec fails.
  - **Red run:** recorded in `execution.md`. Command: `npx jest src/api/replicated-innovation-reminders/templates --maxWorkers=2 --silent`.
  - **Consumers:** none (migration only). `npm run build` + `npm run migration:check` (the latter moved to RBX-T-8 step (0) on 2026-11-26: no local MySQL; probe in `execution.md` → RBX-T-7).
- **Skills:** `nestjs-expert`
- **Definition of done:** [x] specs green · [x] build green (migration:check deferred to RBX-T-8 (0)) · [x] Reviewer PASS

### [x] RBX-T-8 — HITL: prdb v4 migration, package routing in the preview, PRTest render

- **Type:** rollout (user-run DB steps)
- **Description:** (0) `npm run migration:check` against prdb (moved here from RBX-T-7 on 2026-11-26: no local MySQL, probe recorded in RBX-T-7). (1) prdb: `1793700000000` up → down → up; after up no body contains "breeding" (case-insensitive), after down the bodies equal v3. (2) Dry-run preview on prdb: W1/W2 packages with a lead contact appear in DEVELOPER messages to that address with MELIA in CC; packages without one in MELIA summaries. (3) PRTest Send now to the redirect address: the "Intended recipients" notice of a package email names the lead contact and the MELIA CC. Supersedes RBX-T-5 step 1's "contain Breeding for Tomorrow" check for the final state.
- **Implements:** RBX-R-7, RBX-R-8 (real data, human check)
- **Depends on:** RBX-T-6, RBX-T-7
- **Definition of done:** [x] three steps recorded in `execution.md` · [x] copy reviewed by the user (approved 2026-11-26); Nicoleta looks before she schedules PROD

## 4. Dependency graph

```
RBX-T-1 ──► RBX-T-2 ──┐
RBX-T-3 ──────────────┼──► RBX-T-5 (HITL)
RBX-T-4 ──────────────┘
RBX-T-6 ──┐
RBX-T-7 ──┴──► RBX-T-8 (HITL)          (Pivot P-1)
```

RBX-T-1, T-3 and T-4 are independent. They run sequentially in one worktree (one test run at a time).

## 5. Test plan

| Requirement / clause | Owner |
|---|---|
| R-1 listed results disappear | T-3 (SQL) + T-5 step 2 (real data) |
| R-1 follows the code across phases | T-3 (key = `result_code`) |
| R-1 inactive entry does not exclude | T-3 (`x.is_active = 1`) |
| R-1 seed content, idempotent (114 not 228) | T-1 (c) + T-2 (INSERT IGNORE) + T-5 step 1 (re-run up) |
| R-1 BUT not drop unlisted | T-5 step 2 (hand count equals total) |
| R-2 package selection + negatives | T-3 |
| R-2 no IPSR phase means no error | T-3 (branch B is an IN-subquery; an empty set is valid SQL) + T-5 (none observed, noted) |
| R-3 package link / IU keeps result-detail / unknown base | T-4 |
| R-4 rendered years, breeding paragraph, linked ID, redirect notice, disclaimer | T-1 (b) + T-4 (data) + T-5 step 3 (human wording) |
| R-4 no other template row modified | T-2 (WHERE by name) |
| R-5 up / down / up, byte-exact v2 | T-1 (a) + T-2 + T-5 step 1 |
| R-6 one selection, counts agree | T-3 (one statement) + T-5 step 2 |

## 6. Rollout & verification

1. Commit, only with the user's go-ahead. Branch to `qa-development-2026-ss`, then fast-forward `performance-refactor`. PRTest deploys automatically (about 30 min).
2. RBX-T-5 on PRTest.
3. Staging, then the `master` PR (Cristian). Jenkins applies the migration.
4. PROD read-only after deploy:
   - exclusion count = 114;
   - Admin total ≈ 1,805 + packages;
   - the four bodies are v3.
5. Nicoleta schedules the campaign from Admin > Reminders.

## 7. Cleanup & follow-ups

- Kaizen and `codegraph sync` at `/akili-archive`.
- Enrico's disclaimer request: separate, Nicoleta decides.
- An admin UI for the exclusion list: only if Nicoleta asks.

## 8. Roll-back plan

Run the migration `down` first, then revert the commit (amended 2026-11-25, RBX-T-2 risk Reviewer: reverting first would leave the v3 bodies live while the old dispatcher sends no `previousYear`/`nextNextYear`; running `down` first makes the new code fail loudly with a missing table and email nothing). `down` restores the v2 bodies byte-exact and drops the table. No data outside RIR is touched.

## Required cross-references

`proposal.md` · `requirements.md` · `design.md` · `archive/2026-10-26-changes--replicated-innovation-reminders/` · `archive/2026-11-23-changes--rir-center-focal-routing/`
