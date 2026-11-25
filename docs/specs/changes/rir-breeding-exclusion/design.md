# Design — RIR breeding exclusion, innovation packages and copy v3

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-breeding-exclusion` |
| Depth | Standard |
| Approval Mode | gated |
| Requirements | `requirements.md` (RBX-R-1 … RBX-R-6), approved 2026-11-25 |
| Verified at | `093655d2c` (`origin/qa-development-2026-ss`) |
| Skills | `nestjs-expert`; backend route: data change via raw-SQL repository + TypeORM migration (no `backend-routing.md` in this repo — project conventions) |

## 1. Executive Summary

The change is server-only, in `api/replicated-innovation-reminders/`, plus one migration:

- **Exclusion and packages** go in the single selection SQL, `findPending`. Dispatch, preview and the Admin totals already share that SQL, so they change together.
- **Package presentation** is a type-name entry and a pure URL helper in the dispatcher.
- **The copy** moves into a frozen, importable template module. One migration uses it to write v3, and it can also produce the exact v2 bodies for `down`. That module is the only part that unit tests can reach, because Jest skips `src/migrations/`.

## 2. Architecture Overview

```
Admin GET / preview / cron / Send now
        └── ReminderDispatcher.plan(versionId)          (unchanged entry)
              └── PendingInnovationRepository.findPending(versionId)   ← DD-1, DD-2
                    rows (2/7 Reporting  ∪  10 IPSR same year) − exclusion list
              └── digest-builder.build(...)              (unchanged routing; 10 → MELIA branch)
        └── dispatch(): template data per row            ← DD-3, DD-4
              resultTypeName (10 = "Innovation package"), resultUrl (buildResultUrl),
              previousYear / nextNextYear
template table rows  ← migration 1793600000000 (v3 up / v2 down)   ← DD-5, DD-6
replicated_innovation_reminder_exclusion  ← same migration (table + 114-code seed)
```

## 3. Extended Directory Structure

```
onecgiar-pr-server/src/
├── api/replicated-innovation-reminders/
│   ├── entities/replicated-innovation-reminder-exclusion.entity.ts      NEW (DD-2)
│   ├── templates/rir-template-copy.ts                                    NEW (DD-5): frozen v2 + v3 builders
│   ├── templates/rir-template-copy.spec.ts                               NEW
│   ├── templates/rir-breeding-exclusion-codes.ts                         NEW (DD-2): the 114 codes + reason
│   ├── templates/rir-breeding-exclusion-codes.spec.ts                    NEW
│   ├── repositories/pending-innovation.repository.ts (+ .spec.ts)        MODIFIED (DD-1)
│   └── reminder-dispatcher.service.ts (+ .spec.ts)                       MODIFIED (DD-3, DD-4)
└── migrations/1793600000000-RIR-BreedingExclusionCopyV3.ts               NEW (DD-6)
```

## 4. Data Model

**New table `replicated_innovation_reminder_exclusion`.** It follows the RCF table pattern (`1793400000000-RCF-CenterRouting.ts:38-50`): the primary key plus the five `BaseEntity` audit columns.

| Column | Type | Notes |
|---|---|---|
| `result_code` | bigint NOT NULL, **PRIMARY KEY** | Same type as `result.result_code` (P-3). The PK makes the seed idempotent (RBX-R-1) and gives the lookup an index. No FK, because `result_code` is not unique in `result` (one row per phase) |
| `reason` | varchar(255) NULL | Seed: `SR-167303: SP01 breeding line/variety updated by B4T (list of 2026-11-25)` |
| `is_active`, `created_date`, `last_updated_date`, `created_by`, `last_updated_by` | as RCF | `BaseEntity` |

**Template rows.** The four RIR rows have their `template` column rewritten by name only (P-9).

## 5. API Design

No endpoint changes. The response shape of `GET` admin reminders is unchanged; only `pending_total` and `unreachable_total` change in value (RBX-R-6).

## 6. Backend Module Design

### 6.1 Selection (DD-1)

`findPending(versionId)` keeps one statement and binds `versionId` twice. The WHERE becomes:

| Predicate | Rule |
|---|---|
| Phase/type branch A | `version_id = ?` **and** type in (2, 7). This is exactly today's rule (RBX-R-2 negative) |
| Phase/type branch B | type = 10 **and** `version_id` in the IPSR versions (`app_module_id = 2`, `is_active = 1`, `status = 1`) whose `phase_year` equals the bound version's `phase_year` |
| Common (unchanged) | replicated, Editing, active, active owner SP |
| Exclusion | NOT EXISTS an active exclusion row with the same `result_code` |

An IPSR phase "active" means `is_active = 1` and `status = 1` (open). When IPSR 2026 closes before Reporting does, packages are no longer reminded, because nobody can edit them.

### 6.2 Routing

No change. Type 10 is not 7, so in `digest-builder` it takes the non-type-7 branch (P-5): W1/W2 go to the MELIA summary and W3 to the Center. The RCF opt-in runs first, as today. Only the comment there is updated to name type 10.

### 6.3 Presentation (DD-3, DD-4)

- `RESULT_TYPE_NAMES` gains `10: 'Innovation package'`.
- **`buildResultUrl(resultsUrl, typeId, code, versionId)`** is pure and exported for testing:
  - Type 10 with a base ending in `result/result-detail/`: the path segment is swapped for `ipsr/detail/`.
  - Everything else, including a package whose base has another shape: today's `${base}${code}/general-information?phase=${v}` (RBX-R-3).
- Template data gains `previousYear = phaseYear − 1` and `nextNextYear = phaseYear + 2`. The existing keys are unchanged.

### 6.4 Copy (DD-5)

`templates/rir-template-copy.ts` exports `buildRirTemplatesV2()` and `buildRirTemplatesV3()`. Each returns the four bodies keyed by template name.

- **v2** reproduces the bodies in PROD today. That is the `1791700000000` builders' output with the `1791900000000` linked-cell replacement and the `1793400000000-RCF-CenterRouting` Center-intro replacement (`{{resultCount}} bilateral innovation(s)` → `{{resultCount}} innovation(s)`) applied. Its spec proves this by running all three landed migrations against a capturing fake query runner (DD-7). *(Amended 2026-11-25 during RBX-T-1: the RCF migration was missing from this list; found by the T-1 Reviewer.)*
- **v3** reuses the v2 shell head unchanged (header, styles, redirect notice, kind label, linked ID) and swaps the intros, tails and Center SP header for Nicoleta's 25-Nov text (§6.5).

The file header states that it is **frozen**: a later copy change adds a new version and a new migration and never edits v2 or v3. That keeps the migration reproducible.

### 6.5 v3 text (verbatim targets; years are Handlebars variables)

**Developer digest (Q4 and final share one body), and the MELIA summary body.**

- **Intro:** "The CGIAR Performance and Results Management System (PRMS) shows that you have {{resultCount}} innovation(s), reported in previous years, with no update yet to reflect any work done on them during the {{phaseYear}} reporting period:"
- **Table:** Result ID · Innovation · Science Program / Accelerator. The MELIA summary also keeps "Innovation developer (as listed)".
- **Paragraphs after the table, in order:**
  1. "For existing innovations that received active investment in {{phaseYear}}, you only need to update what has changed. All other existing data will be pre-filled for you to review, so this should not take much of your time."
  2. "For existing innovations that did not receive investment in {{phaseYear}}, or were stopped or put on hold, you can set the status to 'Inactive' and give the reason for discontinuation."
  3. "If you reported breeding lines or varieties as innovations in previous years, they are not included in the list above and you do not need to update them. The Breeding for Tomorrow Program MELIA focal point will complete their {{phaseYear}} update in PRMS and will contact you directly if she has any questions."
  4. "If you do not update your innovation results, PRMS will automatically close them with the status 'Inactive – not updated' at the end of January {{nextYear}}. You can reopen and update an innovation in any later reporting phase ({{nextYear}}, {{nextNextYear}} and beyond)."
  5. "This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated."
  6. The disclaimer, unchanged.
- **Greetings:** unchanged. The digest uses "Dear {{leadName}},". The MELIA summary uses "Dear MELIA focal point(s) of {{spCode}} – {{spName}},".

**Center email.**

- **Greeting:** unchanged, "Dear Center MEL focal point(s) of {{centerName}},".
- **Intro:** "The CGIAR Performance and Results Management System (PRMS) shows that your Center has {{resultCount}} innovation(s) reported in {{previousYear}} that have not yet been updated to reflect any work undertaken during the {{phaseYear}} reporting period:"
- **Table:** Result ID · Innovation · "Science Program / Accelerator who has approved the result in {{previousYear}}".
- **Paragraphs after the table, in order:**
  1. "If your Center reported breeding lines or varieties as innovations in {{previousYear}}, they are not included in the list above and you do not need to update them. The Breeding for Tomorrow Program MELIA focal point will complete their {{phaseYear}} update in PRMS and will contact you or the relevant teams directly if she has any questions."
  2. "For the innovations listed above that received active investment in {{phaseYear}}, you only need to update what has changed. All other existing data will be pre-filled for you to review, so the update should not take much time."
  3. "For listed innovations that did not receive investment in {{phaseYear}}, or were stopped or put on hold, you can set the status to 'Inactive' and provide the reason for discontinuation."
  4. "If the innovations listed above are not updated, PRMS will automatically close them with the status 'Inactive – not updated' in mid-February {{nextYear}}. You can reopen and update an innovation in any later reporting phase ({{nextYear}}, {{nextNextYear}} and beyond)."
  5. "Keeping these records updated helps CGIAR maintain current information on its innovations and monitor their progress over time. Thank you for your contribution to this process; it is much appreciated."
  6. The disclaimer, unchanged.

### 6.6 Migration (DD-6)

`1793600000000-RIR-BreedingExclusionCopyV3`:

- **`up`:**
  - CREATE TABLE IF NOT EXISTS.
  - Seed with INSERT IGNORE over the 114 codes in `rir-breeding-exclusion-codes.ts`, with bound parameters.
  - UPDATE the four template rows by name to the v3 bodies.
- **`down`:**
  - UPDATE the four rows to the v2 bodies.
  - DROP TABLE IF EXISTS.

It re-runs safely: a second `up` changes no row count and rewrites identical bodies.

## 7. Frontend / UX Component Architecture

None. No client change.

## 8. Shared Contracts or Package Extensions

None. `/api/bilateral/*` is untouched, so the W3 form ↔ API ↔ Fetcher rule does not apply and the payload is unchanged.

## 9. Design Decisions

| ID | Decision | Why / rejected alternative | Reqs |
|---|---|---|---|
| DD-1 | Extend the one `findPending` SQL with branch B and the NOT EXISTS | All three readers share it (P-1), so counts cannot drift. Rejected: filtering in TypeScript after the query, which needs every reader to remember it | R-1, R-2, R-6 |
| DD-2 | Exclusion keyed by `result_code` as PK, with an entity in the module | Survives replication (P-3). The PK gives idempotency and an index. The entity follows the module pattern (RCF), so `migration:check` stays clean. Rejected: a flag on `result` (a shared table, and lost on replication) | R-1 |
| DD-3 | IPSR link derived from `RESULTS_URL`, with a fallback | No new env var to configure on 3 environments two days before release. Rejected: a new `IPSR_URL` env var | R-3 |
| DD-4 | Years passed as template data | Copy stays year-agnostic for 2027. Rejected: hard-coded years in the copy | R-4 |
| DD-5 | Copy in a frozen importable module, not inside the migration | Jest ignores `src/migrations/` (P-7), so text inside a migration has no unit gate. A migration importing from `src/api` has precedent (P-8). Rejected: a migration-only copy, which leaves the copy and `down` untested | R-4, R-5 |
| DD-6 | One migration for table, seed and copy | One `down`, one release step. Rejected: two migrations, which would need two prdb up/down/up checks | R-5 |
| DD-7 | v2 equality proven by executing the three landed migrations that write RIR template bodies (`1791700000000`, `1791900000000`, `1793400000000`) against a capturing fake runner (amended 2026-11-25) | Byte-exact `down` without editing landed migrations (`src/CLAUDE.md` §9: never edit a migration in master) | R-5 |
| DD-8 | IPSR "active" = `is_active = 1` and `status = 1` | Do not remind about packages in a closed phase. Rejected: `is_active` only | R-2 |

**Reversion challenge (Step 2.3).** DD-5 replaces the v2 copy, which is already delivered behaviour. Question: what does removing v2 break? Two things:

1. The MELIA intro sentence about unreachable developers goes away. Rows with a listed but unreachable developer still show the developer column, so the MELIA FP still sees why they received the row.
2. The Center intro "innovation(s), reported in previous years" (RCF `1793400000000` already removed "bilateral") becomes "innovation(s) reported in {{previousYear}}". For RCF opt-in Centers (ICARDA), the email also carries W1/W2 results from other years, so the sentence can be inaccurate. This is accepted as Nicoleta's wording and recorded as proposal R-4. No design change; it is noted for her at the HITL pause.

No other v2 behaviour is removed.

## 10. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 5 (4 code, 1 HITL) |
| LOC | ≈ 900. Copy module ≈ 260, its specs ≈ 220 (templates, DD-7, seed), repository ≈ 30 + spec ≈ 80, dispatcher ≈ 40 + spec ≈ 90, entity ≈ 30, migration ≈ 70, codes ≈ 40. Roughly half is template text and specs. The RCF overrun lesson (3.3×) applies to CRUD APIs, and none is in scope |
| Review rounds | 6 (one per code task, plus 2 margin for the copy task) |

Depth stays **Standard**. The tripwire for `/akili-execute` is more than 7 tasks, more than about 1,300 LOC, or more than 9 rounds.

## 11. Premise Ledger

Count: 11 rows; 10 verified, 1 `UNVERIFIED` (Low).
Blast-radius triggers fired:
- `live-path`: the design names the Admin GET, preview and dispatch.
- `shared-state`: the change touches the shared `findPending` and the template rows.
- `consumer`: the design changes the `findPending` SQL/params and the template data keys.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `findPending` is called only from `ReminderDispatcher.plan`, and `plan` is the path for both dispatch and the Admin list | live-path | `grep -rn "findPending(" src --include=*.ts` (non-spec) → `reminder-dispatcher.service.ts:166`. `grep -rn "\.plan(" src/api/replicated-innovation-reminders` (non-spec) → `reminder-dispatcher.service.ts:310` (dispatch), `replicated-innovation-reminders.service.ts:66` (list) | 093655d2c | DD-1 needs a second filter site. **High** | — |
| P-2 | Packages are type 10 in IPSR phases (`app_module_id = 2`). PROD IPSR 2026 is `version_id 9`, open, with 60 replicated type-10 rows (58 Editing) | data-env | `versioning.service.ts:1424-1448` (package replication uses `AppModuleIdEnum.IPSR`). PROD read-only query run by the user 2026-11-25 (group by version, is_replicated, status), screenshot in session | 093655d2c / PROD 2026-11-25 | DD-1 branch B selects nothing. **High** | — |
| P-3 | `result.result_code` is bigint and stable across replication | data-env | `result.entity.ts:65-69` (`type: 'bigint'`). PROD Q1 2026-11-25: 113 of 114 sheet codes matched rows in the 2026 phase by `result_code` | 093655d2c | DD-2 key type changes. Low | — |
| P-4 | `version` has `phase_year`, `status`, `app_module_id`, `is_active` | existence | `version.entity.ts:57,64,79`. `is_active` via `VersionBaseEntity` (`version.entity.ts:13`) and used at `replicated-innovation-reminders.service.ts:233` | 093655d2c | Branch B SQL fails. Low | — |
| P-5 | Non-type-7 W1/W2 rows go to the MELIA summary, and the RCF opt-in runs before source routing | location | `digest-builder.ts:178-199` | 093655d2c | Packages need routing code. **High** | — |
| P-6 | `RESULTS_URL` ends in `result/result-detail/` on PRTest and PROD | data-env | `UNVERIFIED — confirm at source before relying on it` (no `RESULTS_URL` in the local `.env`; client routes use `/result/result-detail/…`, e.g. `step-n3.component.ts:304`, a secondary hint) | — | Package links fall back to result-detail (DD-3 fallback). Low | T-5: open a package link from the PRTest email; owner: user at the HITL pause |
| P-7 | Jest does not discover specs under `src/migrations/` | existence | `package.json:124-132` (`testPathIgnorePatterns` contains `/src/migrations/`) | 093655d2c | DD-5 not needed. Low | — |
| P-8 | A migration may import from `src/api` | other | `grep -ln "from '\.\./api\|from '\.\./shared" src/migrations/*.ts` → `1701879395364-InsertResultFoldersType.ts`, `1701962575579-InsertResultFolders.ts` | 093655d2c | DD-5 copy would have to be inlined. Low | — |
| P-9 | The four RIR template rows are read only by the reminder dispatcher | shared-state | `grep -rn "email_template_replicated_innovation" src --include=*.ts` (non-migration, non-spec) → `reminder-dispatcher.service.ts:83-84`, `email-notification.enum.ts:53,58`. The enum values are used only through `TEMPLATE_BY_KIND` (`reminder-dispatcher.service.ts:75-80`) | 093655d2c | The copy change affects another email. **High** | — |
| P-10 | Test consumers pinning the changed contracts: `pending-innovation.repository.spec.ts` pins params `[VERSION_ID]` (`:32`), `r.version_id = ?` (`:45`) and `IN (2, 7)` (`:51`). `reminder-dispatcher.service.spec.ts` pins the template data keys (`:126`, `:550`) and the result-row render with `RESULTS_URL = https://prms.test/result/` (`:567-585`) | consumer | `grep -rln "findPending\|general-information\|RESULT_TYPE_NAMES\|resultTypeName\|nextYear" src --include=*.spec.ts`, narrowed to the module, → the 2 files above. The other hits are unrelated modules (qa-catalog, results, bilateral, email-notification) matching `general-information` | 093655d2c | Unlisted specs break. Low | — |
| P-11 | Standing rule: never edit a migration already in master. The landed migrations that write RIR template bodies are `1791700000000`, `1791900000000` and `1793400000000` (Center intro REPLACE, `1793400000000-RCF-CenterRouting.ts:66-70`; amended 2026-11-25, `1791500000000-RIR-CreateReminderTables` also creates the Q4/final rows, but `1791700000000` overwrites their bodies by name, so no other migration leaves an RIR body in effect) | other | `onecgiar-pr-server/src/CLAUDE.md` §9 Rules. `1791700000000` and `1791900000000` are in `origin/master` (`git merge-base --is-ancestor` on RIR commits, run 2026-11-25) | 093655d2c | DD-7 could edit the old migrations instead. Low | — |
