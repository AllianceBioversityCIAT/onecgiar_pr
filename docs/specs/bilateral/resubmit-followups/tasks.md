# Tasks — Follow-ups from the rejected-result resubmission

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` / resubmission follow-ups (`RSF`) |
| Linked spec | `requirements.md` (`RSF-R-1..R-11`) + `design.md` (`RSF-DD-1..DD-8`, `RSF-P-1..P-16`), same folder |
| Baseline | `docs/prd.md` G3/US-D1/`AC-4`, `AC-8`; `docs/ux-ui/design.md` DD-9, DD-10; `docs/trd/trd.md` W4, W6, QAS-9; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Status | `not-started` (spec approved 2026-10-06, Phase 3 gate: Continue) |
| Skills (Skill Map) | `angular-developer` (T-1), `nestjs-expert` (T-2..T-6), `tdd` (T-1, T-3..T-6), `systematic-debugging` (Bug Mode tasks T-1..T-3: confirm red before fixing), `api-design-principles` (T-2, T-4: contract rows) |
| PR strategy | **PR 1** = `T-1` (client, no `RRC` dependency). **PR 2** = `T-2..T-6` (server, after `RRC-T-5`/`RRC-T-6` or rebased on them). `T-7` after PR 2 is on PRTest |

## 2. Pre-flight checklist

- [ ] `requirements.md` and `design.md` approved.
- [ ] **`RRC` status checked** before T-3 (`RRC-T-5`) and before T-4/T-6 (`RRC-T-6`). If they have not landed, rebase on them or wait (`RSF-DD-8`). This is a warning, not a block. `RRC-T-1` is uncommitted in the working tree: do not include its files in this spec's commits.
- [ ] Tests always scoped, `--maxWorkers=2`, one run at a time on the machine. Never the full suite.
- [ ] Browser checks are read-only: the local stack writes to the shared prdb and the prod mailer. No clicks on Accept/Decline.
- [ ] **No commit without the user's explicit go-ahead.** Subjects carry emoji + type, and no apostrophes, quotes or `$` (Jenkins).

## 3. Task list

### `RSF-T-1` — Client: one request-text builder, primary sentence in the bell

- **Status:** `[x]`: Reviewer PASS, attempt 2, 2026-10-06 (see `execution.md`).
- **Type:** `client` · Bug Mode
- **Description:**
  1. New pure `buildRequestNotificationText(row)` in `inbox/utils/request-notification-text.ts`. It returns the primary sentence when `request_type === 'primary'`, built from the inbox copy (`primaryVerb`, `primaryTail`) and the centre-label rule (`acronym → name → unknownCenterFallback`). For any other row it returns today's two strings **verbatim**.
  2. `filter-notification-by-search.pipe.ts` `createDefaultString` and `bell.generateNotificationTextRequest` both delegate to it.
  3. Bell template: a primary branch before today's markup. Bold centre, verb, bold SP code (`obj_shared_inititiative.official_code`), tail, then the unchanged result-ref span. Non-primary markup stays untouched.
  4. Bell deep link: omit `init` when the row has no initiative (design §9 reversion outcome).
  5. Verify `RSF-P-4`: read one bell request row's shape in the spec fixture or the service, and record whether `creating_center` is present.
- **Implements:** `RSF-R-1` (both scenarios, incl. "must NOT contain…", "IT MUST fall back…"), `RSF-R-2`; `DD-1`, `DD-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/utils/request-notification-text.ts` + spec (new); `…/pipes/filter-notification-by-search.pipe.ts` + spec; `onecgiar-pr-client/src/app/shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.{ts,html}` + spec
- **Depends on:** none · **Blocks:** `T-7` (visual glance)
- **Estimate:** `M` · **Review:** standard
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="request-notification-text|filter-notification-by-search|pop-up-notification-item"`
  - **Red run:** a new bell spec case renders the T-7 fixture (primary, owner = shared = SP12, centre CIAT). On current code it renders "…inclusion of SP12 as a contributor…" → **fails**. After the fix it passes.
  - **Falsifier:**
    - The primary case asserts the full exact string **and** that "as a contributor", "has requested inclusion" and "from SP12" are absent. A template that only adds text and keeps the old `<b>` blocks fails this.
    - The contribution and map-to-ToC cases compare against the **literal** strings copied from today's code, not against the builder's own output. Comparing the builder with itself cannot fail.
    - Centre missing → the string contains the fallback label, and not "undefined" or "()".
    - `R-2`: for each kind, the pipe's haystack contains the bell's `search` text. A builder used by only one side fails the primary case.
  - **Cannot prove:** jsdom checks text, not the two-line clamp. That is a visual glance at `T-7` (read-only).
  - **Disqualifier:** if the bell row carries no `request_type` (`P-4` false for that field), stop and re-specify. The primary branch would then need a server field.
  - **Consumers:** `generateNotificationTextRequest` (bell link only); `createDefaultString` (pipe only). The builder is new. `copy.header.primaryVerb/primaryTail` are read, not changed.
- **Definition of done:** [ ] scoped Jest green · [ ] `npx eslint <touched files> --quiet` · [ ] no new strings outside `src/app/internationalization/`.

### `RSF-T-2` — Bilateral GET: active primary only, budget guard, contract

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** `server` · Bug Mode
- **Description:**
  1. In `rr.getTocMappingsByResultId`, add a predicate that drops role-1 rows with `is_active = 0`. Role-2 rows behave exactly as today (`DD-4`).
  2. Add a guard test on the bilateral GET's innovation budget extras: an inactive parent row → no budget surfaces (`R-8`).
  3. Contract doc: one change-log row ("`obj_results_toc_result` lists only the active primary; the former owner remains visible in `obj_result_by_initiatives` with `is_active:false`").
  4. Record the `R-8` evidence table (11 readers, from the scout report) in `execution.md`.
- **Implements:** `RSF-R-3` (GET + QA rows of its table; scenarios "owner changed" incl. "IT MUST NOT list SP09", "ownerless" for the GET, "contributors untouched"), `RSF-R-8`; `DD-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts` + spec; `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts`; `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/result-header.mapper.spec.ts`; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** none · **Blocks:** `T-7`
- **Estimate:** `S` · **Review:** standard
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="result.repository|bilateral.service.spec|result-header.mapper"`
  - **Red run:** a repository spec asserts that the SQL passed to `query()` restricts inactive role-1 rows → it fails on current code.
  - **Falsifier:**
    - The mapper spec feeds an inactive former owner plus the active owner (as the fixed query would return them) and expects `primary_science_program` = the active one.
    - A second fixture holds no active role 1 and expects none. It must not pick a contributor.
    - The budget guard feeds an inactive parent with an active budget row. A reader that drops the parent filter fails it.
  - **Cannot prove:** the SQL assertion is a presence check, not execution. Behaviour is proven by `T-7`'s live GET of 9550/9762.
  - **Disqualifier:** if the predicate also drops role-2 rows (any contributor fixture loses an entry), the change is out of mandate. Re-scope instead of shipping. *(Historical: T-2 shipped role-1-scoped. `T-8` / `DD-9` later widened it to every role by user-approved amendment, 2026-10-07.)*
  - **Consumers:** `bs.findOne` / list / `/results` (`bs:3912`), `contributors-and-partners.mapper.ts`, `result-header.mapper.ts`.
- **Definition of done:** [ ] scoped Jest green · [ ] eslint on touched files · [ ] change-log row added · [ ] `R-8` evidence in `execution.md`.

### `RSF-T-3` — Notification readers: active owner only, never hide the notification

- **Status:** `[x]`: Reviewer PASS (lenses ×2), attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** `server` · Bug Mode
- **Description:**
  1. `ns.getAllNotifications` and `ns.getPopUpNotifications`: keep the relation `where` **as is**. Select `rbi.is_active` and drop inactive entries from `obj_result.obj_result_by_initiatives` after loading (`DD-3`).
  2. `ns.resolveOwnerProgramCode`: active role 1 only, otherwise `undefined`.
  3. `rtn.resolveOwnerProgramCode`: active role 1 only. Remove the `?? initiatives[0]` fallback so the existing "a Science Program" text applies.
- **Implements:** `RSF-R-3` (notification rows of its table; "ownerless" scenario incl. "BUT it must NOT hide the notification"); `DD-3`
- **Files (expected):** `onecgiar-pr-server/src/api/notification/notification.service.ts` + spec; `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` + spec
- **Depends on:** `RRC-T-5` landed or rebased (warn) · **Blocks:** `T-7`
- **Estimate:** `M` · **Review:** `lenses` (existence trap) · **budgeted 2 rounds**
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="notification.service|result-tagged-notification"`
  - **Red run:** a fixture with an inactive SP09 role 1 and an active SP11 role 1 (SP09 first in the array) → `resolveOwnerProgramCode` returns SP09 today → **fails**.
  - **Falsifier:**
    - **Ownerless:** a result whose only role-1 row is inactive. `getAllNotifications` must still return the notification, with an empty initiatives list. An implementation that adds `is_active` to the relation `where` drops it and fails. The spec asserts the `find` options keep the original `where` object.
    - **Tagged text:** an inactive role 1 plus an active role-2 contributor → "created by a Science Program". The old fallback would print the contributor's code and fail.
  - **Cannot prove:** the mocked repository does not run TypeORM's join. The live check is the bell and inbox read in `T-7` (read-only).
  - **Disqualifier:** if a caller of `obj_result_by_initiatives` in these responses other than the bell chip/link is found to need inactive rows, stop and report it. Do not widen the scope silently.
  - **Consumers:** client bell chip and link (`bell` ts `:96`, `:302`, guarded by T-1), inbox update cards (`getProgramCode` fallback), the emit path (`ns:173`), the tagged flow (`rtn:330`).
- **Definition of done:** [ ] scoped Jest green · [ ] eslint on touched files.

### `RSF-T-4` — Resubmission preflight: lead centre, single lead, contributor ids, status pin

- **Status:** `[x]`: Reviewer PASS (lenses ×2), attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** `server`
- **Description:** in `rsv` preflight, after the existing lead-project check and before any write:
  1. Resolve `lead_center` with the same lookup `handleLeadCenter` uses, read-only. No match → 400 (`design.md` §6 message).
  2. Count flagged `is_lead` projects. More than 1 → 400.
  3. Resolve `contributing_programs` codes to initiative ids and hand them to the reset (`P-13`, used by T-6).
  4. The new refusals emit the existing `RSB-R-21` log line.
  5. Pin `describeResultStatus(5) === 'pending review'` against the doc (`R-10`).
  6. Contract doc: two error-table rows plus a change-log row. Record the `R-10` evidence in `execution.md`.
- **Implements:** `RSF-R-5` (incl. "IT MUST leave R unchanged", "BUT the no-code create must NOT change"), `RSF-R-6` (incl. "BUT a single project … must still pass"), `RSF-R-10`, `RSF-R-11`; `DD-6`
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/bilateral-resubmission.service.ts` + spec; `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (expose the lead-centre lookup through the preflight port, read-only) + spec; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** `RRC-T-6` landed or rebased (warn) · **Blocks:** `T-6`
- **Estimate:** `M` · **Review:** `lenses`
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="bilateral-resubmission.service|bilateral.service.spec"`
  - **Red run:** unknown `lead_center` → a 400 is expected; today it resolves → **fails**. The same for two flagged projects.
  - **Falsifier:**
    - Each refusal spies on every writer (the `RSB-T-3` spy set). One call before the throw → fail.
    - A single project passes, and one flagged project among three passes. A count that rejects ≥ 1 fails them.
    - **No-code create:** an unknown `lead_center` still logs a warn and creates. A check placed in the shared path fails this.
    - The status pin compares against the literal `'pending review'`, the doc's text, not against `describeResultStatus`'s own output.
  - **Disqualifier:** if the lead-centre lookup cannot run without writing (for example it caches into a table), stop and re-specify.
  - **Consumers:** the preflight port built in `bs.create()`; `handleLeadCenter` (unchanged behaviour on the create path).
- **Definition of done:** [ ] scoped Jest green, create regressions included · [ ] eslint · [ ] doc rows.

### `RSF-T-5` — Subnationals: reactivate one row per code

- **Status:** `[x]`: Reviewer PASS, attempt 2 (after live FAIL of attempt 1), 2026-10-07 (see `execution.md`); live re-run owed in `T-7`.
- **Type:** `server`
- **Description:** `bulkUpdateSubnational` reactivates only the newest row (highest id) per (`result_country_id`, `geo_scope_role_id`, code). Rows already active are untouched.
- **Implements:** `RSF-R-4` (incl. "BUT it must NOT reactivate both"); `DD-5`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result-countries-sub-national/repositories/result-country-subnational.repository.ts` + spec; `onecgiar-pr-server/src/api/results/result-countries/result-countries.service.spec.ts`
- **Depends on:** none · **Blocks:** `T-7`
- **Estimate:** `S` · **Review:** standard
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="result-country-subnational.repository|result-countries.service"`
  - **Red run:** the spec asserts the update SQL selects one id per code → it fails on today's plain `WHERE … IN (codes)`.
  - **Falsifier:** a presence check on the SQL alone could pass a wrong subquery. So the spec also asserts the parameters bind the country, role and the code list exactly once. The in-app caller spec passes a code list without duplicates and expects the same call shape as before.
  - **Cannot prove:** MySQL's evaluation of the subquery (for example the "can't specify target table" error 1093 on a self-referencing UPDATE). Proven by `T-7`'s live resubmission over a known duplicate. If MySQL rejects the query, that is a FAIL, not a gap.
  - **Disqualifier:** if the self-referencing UPDATE needs a derived-table wrapper that the reviewer cannot read clearly, prefer a two-step read-then-update by ids inside the same call.
  - **Consumers:** `bs:6418`, `bs:6431` (bilateral), `result-countries.service.ts:291` (in-app geo save).
- **Definition of done:** [ ] scoped Jest green · [ ] eslint.

### `RSF-T-6` — Reset: retire contributors the payload dropped

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-06 (see `execution.md`).
- **Type:** `server`
- **Description:** in the `rsv` reset, after the role-1 step, deactivate `results_by_inititiative` role-2 rows whose `initiative_id` is not in the ids from T-4 step 3. Role-2 rows for listed SPs are untouched. No role-2 row is created (`DD-7`).
- **Implements:** `RSF-R-7` (incl. "BUT a contributor still in the payload must NOT lose…", "IT MUST leave the primary's role-1 row untouched"); `DD-7`
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/bilateral-resubmission.service.ts` + spec; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (resubmission table row + change-log row; added 2026-10-06 by user-approved spec amendment, see `execution.md`)
- **Depends on:** `T-4` · **Blocks:** `T-7`
- **Estimate:** `S` · **Review:** standard
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="bilateral-resubmission.service"`
  - **Red run:** a fixture where SP06 has an accepted role 2 and the payload has no SP06 expects SP06's row deactivated → **fails** today, because the reset spares role 2.
  - **Falsifier:**
    - SP07 is in the payload and already accepted (role 2). It must have **no** update call.
    - An empty `contributing_programs` deactivates all role 2, and no role-1 call happens from this step.
    - An implementation keyed on `initiative_role_id` alone, with no id list, fails the SP07 case.
  - **Disqualifier:** if T-4 step 3 cannot resolve the ids without a write, stop (`P-13` false).
  - **Consumers:** none outside the reset (a private step). Readers of role 2 see fewer active rows by design.
- **Definition of done:** [ ] scoped Jest green · [ ] eslint.

### `RSF-T-7` — Live checks on PRTest (manual, user)

- **Status:** `[ ]`
- **Type:** `manual`
- **Description:** after PR 2 is deployed to PRTest:
  1. `GET /api/bilateral/9550` and `/9762`, before and after the deploy: only the active primary is listed as role 1 in `obj_results_toc_result`. Note the live role label (`RSF-OQ-4`).
  2. A resubmission of a result with a known historic subnational duplicate: count the active rows per code (one).
  3. p95: ≥ 10 resubmissions and ≥ 10 regular creates of the same type and payload size, recorded in `execution.md` (`R-9`).
  4. Bell read-only glance: a primary request card reads the new sentence and fits two lines.
- **Implements:** live halves of `RSF-R-3`, `R-4`, `R-1` (layout gap); `RSF-R-9`; `RSF-OQ-4`
- **Depends on:** `T-1..T-6` deployed
- **Verification:**
  - **Falsifier:** a role-1 entry for SP09 on 9550 after the deploy → `T-2` FAIL. Two active rows for one code → `T-5` FAIL.
  - **Disqualifier (p95):** if the spread inside either series is larger than the gap between them, record **inconclusive** with both spreads. Never record "within +30%".
  - The SQL for the row counts goes to the user inline in chat, never as a file.
- **Definition of done:** [ ] the four results recorded in `execution.md` · [ ] `OQ-4` answered (doc example fixed in a follow-up if the label differs).

### `RSF-T-8` — Bilateral GET: retired contributors leave `obj_results_toc_result` (amendment 2026-10-07)

- **Status:** `[x]`: Reviewer PASS, attempt 1, 2026-10-07 (see `execution.md`); live GET of 12018 owed in `T-7`.
- **Type:** `server` · Bug Mode
- **Description:**
  1. In `rr.getTocMappingsByResultId`, replace the role-1-scoped predicate from T-2 (`AND (rbi.initiative_role_id <> 1 OR rbi.is_active = 1)`) with `AND rbi.is_active = 1` (`DD-9`).
  2. Update the T-2 repository spec. It asserted a role-scoped predicate, which `DD-9` supersedes. Add the T-7 live case: SP06 r2 inactive, SP07 r2 active, SP11 r1 active.
  3. Contract doc: one change-log row ("`obj_results_toc_result` lists only active Science Programs of any role; a retired contributor stays visible in `obj_result_by_initiatives` with `is_active:false`").
- **Implements:** `RSF-R-12`; `DD-9`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts` + spec; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** `T-2` · **Blocks:** `T-7` (live GET of 12018)
- **Estimate:** `S` · **Review:** standard
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="result.repository|bilateral.service.spec|result-header.mapper"`
  - **Red run:** the repository spec asserts the SQL filters inactive rows of every role. It fails on the T-2 predicate, which still keeps inactive role 2.
  - **Falsifier:** the mapper specs (`result-header.mapper`, contributors) still pass. The ownerless GET still returns the result.
  - **Cannot prove:** presence check only. Live proof is the GET of 12018: SP06 is absent, SP07 and SP11 are present.
- **Definition of done:** [ ] scoped Jest green · [ ] eslint · [ ] change-log row.

## 4. Dependency Graph

```
RSF-T-1 (client) ─────────────────────────────┐   PR 1
RSF-T-2 (GET) ────────────────────────────────┤
RRC-T-5 ┄┄▶ RSF-T-3 (notifications) ──────────┤
RSF-T-5 (subnationals) ───────────────────────┤   PR 2
RRC-T-6 ┄┄▶ RSF-T-4 (preflight) ─▶ RSF-T-6 ───┤
                                               └─▶ RSF-T-7 (manual, PRTest)
```

`┄┄▶` = warning-level external dependency (`RSF-DD-8`). T-1, T-2 and T-5 are parallel-safe with each other, but test runs stay serial: one at a time.

## 5. Coverage Closure (by scenario and clause)

| Requirement · scenario / clause | Owner task | Proof |
|---|---|---|
| `R-1` T-7 case: THEN sentence | T-1 | Exact-string bell spec |
| `R-1` BUT must NOT contain "as a contributor" / "has requested inclusion" / "from SP12" | T-1 | Negative substrings in the same spec |
| `R-1` AND IT MUST fall back to the unknown-centre label | T-1 | Centre-missing case |
| `R-1` contribution unchanged (both `is_map_to_toc`) | T-1 | Literal-string cases |
| `R-1` layout (two-line clamp) | T-7 step 4 | Visual glance (gap, accepted) |
| `R-2` THEN inbox keeps the row | T-1 | Pipe-matches-bell per kind |
| `R-2` BUT must NOT produce an empty list | T-1 | Same, primary kind |
| `R-3` table: bilateral GET, QA payload | T-2 | Repo SQL assertion + mapper fixtures |
| `R-3` table: notification list/bell, program code, tagged owner | T-3 | Fixture specs |
| `R-3` owner changed: THEN SP11 / IT MUST NOT list SP09 | T-2 (code), T-7 step 1 (live) | — |
| `R-3` ownerless: THEN no SP presented | T-2 (GET/QA), T-3 (notifications) | No-active-role-1 fixtures |
| `R-3` ownerless: BUT must NOT hide the notification or drop the result | T-3 (notifications), T-2 (GET returns the result) | `where` preserved assertion; GET fixture returns the result |
| `R-3` contributors untouched | T-2 | Role-2 fixture + disqualifier (active contributors; inactive ones leave per `R-12`) |
| `R-12` retired contributor absent from `obj_results_toc_result` | T-8 (code), T-7 (live GET 12018) | Repo SQL assertion + live GET |
| `R-4` THEN exactly one active / BUT must NOT reactivate both | T-5 (code), T-7 step 2 (live) | — |
| `R-5` THEN 400 naming R | T-4 | Refusal spec |
| `R-5` AND IT MUST leave R unchanged | T-4 | Zero-writer spies |
| `R-5` BUT no-code create must NOT change | T-4 | Create regression case |
| `R-6` THEN 400 / AND IT MUST leave R unchanged | T-4 | Refusal + spies |
| `R-6` BUT single or one-flagged must pass | T-4 | Positive cases |
| `R-7` THEN SP06 inactive | T-6 | Red fixture |
| `R-7` BUT listed contributor keeps its row | T-6 | SP07 case |
| `R-7` AND IT MUST leave role 1 untouched | T-6 | Empty-payload case |
| `R-8` no budget under inactive parent | T-2 | Guard test + evidence table |
| `R-9` p95 within +30% (or inconclusive) | T-7 step 3 | User measurement |
| `R-10` status wording pinned | T-4 | Literal pin |
| `R-11` log line on new refusals | T-4 | Logger spy |
| `OQ-4` live role label | T-7 step 1 | User |

No clause is discharged by citing a different requirement.

## 6. Rollout & Verification

- [ ] PR 1 (`T-1`) → `staging`. PR 2 (`T-2..T-6`) → `staging` after the `RRC` overlap is settled.
- [ ] CI green (lint, tests, coverage, `migration:check:ci`; no migration in this spec).
- [ ] Contract change-log rows reach producer platforms (STAR, MEL, TIP): GET content correction plus two new 400s.
- [ ] `T-7` done on PRTest before the `staging → master` promotion, which is owned by Cristian Gamboa.

## 7. Roll-back Plan

1. Revert PR 2 and/or PR 1. They are independent, and neither has a migration.
2. Notify producer platforms if PR 2 is reverted: the two 400s disappear and former owners return to `obj_results_toc_result`.
3. Data written while PR 2 was live (retired role-2 rows, a single reactivated subnational) is correct under either version. Nothing to undo.
