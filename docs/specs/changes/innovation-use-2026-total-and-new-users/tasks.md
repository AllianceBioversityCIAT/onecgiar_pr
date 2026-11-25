# Tasks — Innovation Use 2026: total use per category + "Of which NEW"

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-2026-total-and-new-users` (Full) |
| Inputs | `requirements.md` IU26-R-1..R-14 · `design.md` rev 3 (Judgment Day APPROVED) · mockup v2 |
| PRs | **PR-1** = T-1..T-9 (no migration, target Fri 2026-11-27; cut line = T-6) · **PR-2** = T-10..T-15 (migration) |
| Test rule | Jest always `--maxWorkers=2`, scoped (`--findRelatedTests` / path), one run at a time on the machine; lint only touched files |
| Red-run convention | New test files are greenfield. Their red is `predicted — greenfield artifact (observed in <task>)`, and the task must quote the observed red in `execution.md` before it closes. The baseline behaviour each red relies on is cited at source in the task |

## 2. Pre-flight checklist

- [ ] Branch from `origin/staging` (spec branch), never commit `onecgiar-pr-server/src/a.py`; no commit without Santiago's go-ahead.
- [ ] Skills: server `nestjs-expert` (+ `tdd` where listed); client `angular-developer`, `tailwind-design-system`, `impeccable-bridge` (UI tasks); `api-design-principles` for T-3/T-11; `systematic-debugging` if a red is unexpected.
- [ ] Local stack per `docs/infrastructure.md` §6 when a manual check is needed.

## 3. Task list

### [x] IU26-T-1 — Previous use per category (server util + both callers)

- **Type:** server
- **Description:** Extend `summarizePreviousPhaseCurrentUse` to return `{result_id, phase_year, total_actors, total_organizations, measures:[{unit, quantity}]}`. It takes a per-caller row `pick`: v2 = `section_id = 1`, legacy/W3 = NULL or ≠ 2 (P-25). Organizations are role 5 and active only. Measures come from P25 `result_ip_measure`, are active, and are grouped by `lower(trim(unit))` with the first-seen spelling as the label. Return `null` when all three are empty. Wire both callers: `summary.service.ts:499-516` and `innovation-use.service.ts:857-878`. `total_actors` is kept.
- **Implements:** IU26-R-4 (both scenarios), IU26-R-3 "Previous phase had organizations only", "First report"
- **Files (expected):** `onecgiar-pr-server/src/api/results/summary/utils/previous-phase-current-use.util.ts` (+ spec), `summary.service.ts`, `results-framework-reporting/innovation-use/innovation-use.service.ts` (+ specs)
- **Depends on:** — · **Blocks:** T-4, T-5, T-7, T-13
- **Estimate:** M · **Review:** full — shared util and response shape with two callers
- **Backend route:** `nestjs-expert` · test-first (`tdd`) · stack support: project conventions
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** fixture = previous result with actors (section 1: 100; section NULL: 50; section 2: 999), org role 5 section 1: 9, org role 2: 30, measures "Hectares" 4,000 + "hectares " 100 + "Trees" 500 (section 1) + "Hectares" 77 (section 2). Expected: v2 → actors 100, orgs 9, measures [Hectares 4,100, Trees 500]; legacy → actors 150. Mutation: drop the role filter → orgs 39 (red). Mutation: drop `lower(trim())` → two Hectares lines (red). Orgs only (no actors) → not null.
  - **Red run:** `npx jest src/api/results/summary/utils/previous-phase-current-use.util.spec.ts --maxWorkers=2` — predicted — greenfield artifact (observed in T-1). Baseline: the util sums actors only (`previous-phase-current-use.util.ts:64-84`), so the orgs/measures assertions fail.
  - **Disqualifier:** the v2 W1/W2 actor total changes for an existing fixture (P-25 violated), or the red comes from the fixture setup instead of the totals assertion.
  - **Consumers:** `summary.service.ts:463,499-516`; `innovation-use.service.ts:857-878,933-956`; client readers per P-11 (8 files, additive field). `grep -rn "summarizePreviousPhaseCurrentUse\|currentUseRows\|notFutureRows" onecgiar-pr-server/src` is run at start and listed in `execution.md`.
- **Definition of done:** the falsifier mutations go red and come back green; both callers' specs green; `npx tsc --noEmit -p onecgiar-pr-server` clean; lint on touched files.

### [x] IU26-T-2 — Cumulative fields never erased for 2026 (server)

- **Type:** server
- **Description:** In the v2 save (`innovation-use.service.ts:234-235,280-281`) and the legacy save (`summary.service.ts:284-288`): when the result's `phase_year >= 2026`, write `new_users_added` / `use_expansion_narrative` only if the value is neither `undefined` nor `null`. Earlier phases keep today's exact writes.
- **Implements:** IU26-R-2 "BUT values already stored … kept" (DD-6, JD-13)
- **Files (expected):** the two services + specs
- **Depends on:** — · **Blocks:** T-5, T-7
- **Estimate:** S · **Review:** full — data-preservation rule on two save paths
- **Backend route:** `nestjs-expert` · test-first (`tdd`)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** 2026 result with stored `new_users_added = 845`; save with the key omitted → 845 kept; with `null` → 845 kept. 2025 result with stored 845, save with `null` → NULL (clears, as today). Mutation: remove the phase gate → the 2025 case goes red.
  - **Red run:** `npx jest src/api/results-framework-reporting/innovation-use src/api/results/summary --maxWorkers=2 -t "cumulative"` — predicted — greenfield artifact (observed in T-2). Baseline: `innovation-use.service.ts:234` writes `?? null`.
  - **Disqualifier:** the phase year is not available in either save path without an extra query per save. Stop and re-design (escalate).
  - **Consumers:** none (no shared symbol changed); behaviour readers per P-17.
- **Definition of done:** 4 cases green (2026 omitted/null, 2025 null, 2026 value written); the mutation is observed red.

### [x] IU26-T-3 — Stop copying current-use rows (replication funnel + change log)

- **Type:** server
- **Description:**
  - **Config:** add optional `phase_year` to `ReplicableConfigInterface` and set it in `$_phaseChangeReporting` from `phase.phase_year`.
  - **Copy rules** when `phase_year >= 2026` and the result is type 2:
    - actors and P25 measures copy only `section_id = 2`;
    - organizations exclude `institution_roles_id = 5 AND (section_id IS NULL OR section_id <> 2)` in **both** the find and the insert-select (`result_by_intitutions_type.repository.ts:39-41,74-76`);
    - legacy measures (`:363`) and the IU answers (`:359`) are copied as today.
  - **Unchanged:** other types, and the IPSR paths (IPSR is T-13).
  - **Docs:** add the change-log entry (text in `design.md` §11) to `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`, and update the 2026-10-14 row's cross-reference.
  - **Test:** an API MDS validator test on a 2026 `/version` copy.
- **Implements:** IU26-R-9 (both scenarios incl. "partner organization rows are copied" and "change log"), IU26-R-12 "Payload unchanged"
- **Files (expected):** `shared/globalInterfaces/replicable.interface.ts`, `api/versioning/versioning.service.ts`, `result-actors.repository.ts`, `result-ip-measures.repository.ts`, `result_by_intitutions_type.repository.ts` (+ specs), `bilateral/services/innovation-use-mds-validator.service.spec.ts`, `docs/bilateral-result-summaries.en.md`
- **Depends on:** — · **Blocks:** T-8, T-9
- **Estimate:** L · **Review:** lenses — replication touches every result type and a bilateral endpoint's behaviour
- **Backend route:** `nestjs-expert` · `api-design-principles` (change log) · test-first (`tdd`)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** fixture = 2025 type-2 result with actors (sec 1 ×3, sec 2 ×2), P25 measures (sec 1, sec 2), orgs (role 5 sec 1, role 5 sec 2, **role 2 partner**), legacy measure ×1.
    - Replicate to a 2026 phase → actors only the 2 sec-2 rows; measures only sec 2; orgs role 5 sec 2 + role 2; legacy measure copied.
    - Replicate to a 2025-year phase → everything copied (today).
    - Type-7 result → unchanged.
    - The annual cron path (`annualReplicationProcessInnovationUse`) gives the same 2026 result.
    - Mutations: drop the role clause → the partner row is missing (red); filter only the find query → the insert copies role-5 sec-1 (red).
  - **Red run:** `npx jest src/api/versioning src/api/results/results_by_institution_types src/api/results/result-actors src/api/bilateral/services/innovation-use-mds-validator --maxWorkers=2` — predicted — greenfield artifact (observed in T-3). Baseline: `versioning.service.ts:372` copies actors unconditionally.
  - **Disqualifier:** `result-actors.repository.spec.ts` metadata guard or `replication-insert-lists.spec-helper.ts` cannot express a filtered copy without weakening the guard. Escalate rather than loosen.
  - **Consumers:** `ReplicableConfigInterface` implementers: run `grep -rln "ReplicableConfigInterface" onecgiar-pr-server/src` and list them in `execution.md` (optional field, additive). Org repository callers of `replicate`: `versioning.service.ts:445,743`. Spec guards: `result-actors.repository.spec.ts`, `result-ip-measures.repository.spec.ts`, `result_by_intitutions_type.repository.spec.ts`, `replication-insert-lists.spec-helper.ts`. Fetcher (Juanda): notice drafted in T-9.
- **Definition of done:** every falsifier case is green and each mutation was observed red; the change-log row is added; the validator test shows the actors error and no measures error; PR text says "payload fields unchanged; `/version` behaviour change logged".

### [x] IU26-T-4 — Client util + copy file (shared by W1/W2 and W3)

- **Type:** client
- **Description:**
  - **`current-use-update.util.ts`:** add `previousUseByCategory(current_use_previous)`, `totalsByCategory(actors, organizations, measures)` (Households = `count_unit === 'households'`, every other actor row counts as individuals; measures grouped by `lower(trim(unit))`) and narrative-only `isCurrentUseUpdateComplete/Answered`.
  - **`current-use-update.copy.ts`:** centralize every CUU string. That covers the new narrative label, "Previous reported use (FY{year} · for reference only)", the category labels "Actors - individuals" / "Households" / "Organizations" / "Other quantitative measures", the 2026 question, "How many – total" / "Quantity – total", and the guidance verbatim, without the NEW sentence (that sentence is added in PR-2).
  - **Cleanup:** the cumulative helpers stay until T-5 and T-7 drop their last use, then they are deleted in T-7.
- **Implements:** IU26-R-7 table + "Mixed actors" + "Units never mixed", IU26-R-4 labels, IU26-R-5 completeness, IU26-R-8 copy
- **Files (expected):** `onecgiar-pr-client/src/app/shared/utils/current-use-update.util.ts` (+ spec), `src/app/internationalization/current-use-update.copy.ts`
- **Depends on:** T-1 (shape) · **Blocks:** T-5, T-6, T-7
- **Estimate:** M · **Review:** full — shared util with two components
- **Design route:** copy + logic only; no visual change in this task
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** rows Farmers/households 1,200 + Farmers/individuals 1,800 + Extension 45 → individuals 1,845, households 1,200. Measures Hectares 5,400 + "hectares" 100 + Trees 2,000 → Hectares 5,500, Trees 2,000. Mutation: treat `count_unit` null as households → 1,800 (red).
  - **Red run:** `npm run test:local -- --testPathPattern=current-use-update.util` — predicted — greenfield artifact (observed in T-4).
  - **Disqualifier:** the totals need data the component does not hold (e.g. the organizations list is not on `body`). Re-scope T-6.
  - **Consumers:** `grep -rln "current-use-update" onecgiar-pr-client/src` → the form, W3, the util spec, 2 CLAUDE.md (P-12).
- **Definition of done:** util spec green with the mutations observed red; `npm run build` clean.

### [x] IU26-T-5 — W1/W2 form: CUU move, removals, copy, payload

- **Type:** client
- **Description:** In `innovation-use-form` (`!isIpsr`, 2026 gate `isInnovationUseAgeFallback2026`):
  - **CUU:** render it above the header/TBD; it shows when `current_use_previous` is present regardless of TBD; remove the New users input, the Total cumulative line and the mismatch alert; previous use by category; narrative label + 100-word limit.
  - **Question:** 2026 label in `fields-manager.service.ts` `[innovation-use-form]-core-innovation`, and no "Depending…" description in 2026.
  - **Rows:** labels "How many – total" / "Quantity – total"; the actor description without "expected" (ts `:765`, 2026 only); the guidance block.
  - **Payload:** in `innovation-use-info.component.ts`, omit `new_users_added` for 2026 and send an emptied narrative as `""`.
  - Pre-2026 and `isIpsr` stay byte-identical.
- **Implements:** IU26-R-1 (both scenarios), IU26-R-2, IU26-R-3 "Shown above", "TBD selected", IU26-R-5 "Word limit", IU26-R-6, IU26-R-8 "'expected' only removed in 2026"
- **Files (expected):** `shared/components/innovation-use-form/innovation-use-form.component.{html,ts}` (+ spec, zoneless spec), `shared/services/fields-manager.service.ts` (+ spec), `pages/results/.../innovation-use-info/innovation-use-info.component.ts` (+ spec)
- **Depends on:** T-2, T-4 · **Blocks:** T-6, T-9
- **Estimate:** L · **Review:** full — shared form also rendered by IPSR step 1
- **Design route:** Main + States artboards v2; existing `app-pr-field-header`, `.current_use_update`, field-card states; evidence = PRTest screenshots in T-9
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system`, `spartan` (only if a primitive is touched)
- **Verification:**
  - **Falsifier:**
    - 2026 fixture with `current_use_previous` → the CUU's DOM index < the question's; no element with the "New users added" text; TBD = true → the CUU visible, rows hidden.
    - 2025 fixture → the "Depending on the innovation…" text present and no CUU (amended 2026-11-25 with IU26-R-1, P-11).
    - `isIpsr = true` → no CUU.
    - Payload for 2026 has no `new_users_added` key; for 2025 it does.
    - Mutation: keep the CUU inside the `!TBD` block → the TBD test goes red.
  - **Red run:** `npm run test:local -- --testPathPattern="innovation-use-form|innovation-use-info|fields-manager"` — predicted — greenfield artifact (observed in T-5). The 4 existing "Depending" specs (P-13) must stay green on pre-2026 fixtures.
  - **Disqualifier:** the phase year is not available in `innovation-use-info` at save time. Escalate (T-2 then becomes the only guard).
  - **Consumers:** P-13 specs (`innovation-use-info.component.spec.ts:88-89`, `innovation-use-form.component.spec.ts:66,69`, `innovation-use-form.zoneless.spec.ts:87-88`, `fields-manager.service.spec.ts:909`); IPSR step 1 (`step-n1.component.html:30`); `Ipsr-step-1-body.model.ts` (TS2339 trap → `npm run build`).
- **Definition of done:** scoped specs green; `npm run build` clean; lint on touched files.

### [x] IU26-T-6 — W1/W2 totals per category block (cut line)

- **Type:** client
- **Description:** Read-only totals grid under the question:
  - tiles: Actors - individuals / Households / Organizations / Other quantitative measures (one line per unit);
  - only categories with rows get a tile;
  - hidden when TBD; no "Calculated from…" sentence; no "of which new" line in PR-1;
  - layout: 4 columns ≥ 1024 px, 2 below, existing tokens (`design.md` §6.2).
- **Implements:** IU26-R-7 (all scenarios incl. "Cut line": if this task is not done by Thursday, it moves to PR-2 unchanged)
- **Files (expected):** `innovation-use-form.component.{html,ts,scss}` (+ spec)
- **Depends on:** T-4, T-5 · **Blocks:** T-9
- **Estimate:** M · **Review:** checklist
- **Design route:** Main artboard v2 "2026 use by category"; evidence = PRTest screenshots at desktop + ~1024 px (T-9)
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** the rows from the T-4 fixture render "1,845" and "1,200" in separate tiles; deleting the households row removes the Households tile; TBD → no grid. Mutation: sum all actors into one tile → red.
  - **Red run:** `npm run test:local -- --testPathPattern=innovation-use-form` — predicted — greenfield artifact (observed in T-6).
  - **Disqualifier:** jsdom passes but the layout wraps badly on PRTest. Jsdom cannot see layout, so the human check in T-9 decides.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:** spec green; T-9 visual check accepted.

### [x] IU26-T-7 — W3 full metadata: same changes, narrative-only screen MDS

- **Type:** client
- **Description:** In `type-innovation-use.component.{ts,html}`:
  - **Block:** CUU above "Innovation Use to be Determined"; `showCurrentUseUpdate` drops the TBD condition (DD-5); previous use by category; narrative label.
  - **Totals:** with no "of which new".
  - **Labels:** "– total"; the guidance without the NEW sentence.
  - **Screen MDS:** mdsTracker `use-current-update` = `isCurrentUseUpdateComplete(narrative)` with no mismatch.
  - **Payload:** `buildPayload` omits `new_users_added` for 2026 and sends an emptied narrative as `""`.
  - **Cleanup:** delete the now-unused cumulative helpers from the util (T-4).
- **Implements:** IU26-R-2, IU26-R-3 (W3), IU26-R-5 "W3 submit checklist", IU26-R-7 (W3), IU26-R-8 "W3 guidance", IU26-R-12 (no NEW on W3)
- **Files (expected):** `pages/bilateral/components/section-type-specific/type-innovation-use/*` (+ spec), `shared/utils/current-use-update.util.ts`
- **Depends on:** T-2, T-4 · **Blocks:** T-9
- **Estimate:** L · **Review:** full — W3 form ↔ API rule
- **Design route:** W3 artboard v2
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** 2026 W3 with previous + TBD = Yes → the CUU is visible and the mdsTracker item is missing until the narrative is filled, then complete; no "New users added" anywhere; the payload has no `new_users_added`. Mutation: restore the TBD condition → red.
  - **Red run:** `npm run test:local -- --testPathPattern=type-innovation-use` — predicted — greenfield artifact (observed in T-7).
  - **Disqualifier:** any `/api/bilateral/*` DTO or response type needs a change. Stop: that breaks R-12.
  - **Consumers:** `type-innovation-use.component.spec.ts`; `current-use-update.util.spec.ts` (removed helpers); `grep -rn "hasCurrentUseMismatch\|totalCumulativeUse\|currentUseDifference\|currentUseMismatch" onecgiar-pr-client/src` = 0 after the deletion.
- **Definition of done:** specs green; `npm run build` clean; the grep is 0.

### [~] IU26-T-8 — Cleanup script for the existing 2026 copies (HITL, PROD)

- **Type:** rollout
- **Description:** Write `docs/specs/changes/innovation-use-2026-total-and-new-users/cleanup.sql` implementing `design.md` §5.5:
  1. A dry-run SELECT with counts per source (W1/W2 vs W3 via `result.source`), status, the number of qualifying results, the rows per table, and the target results with active legacy measure rows.
  2. `CREATE TABLE bkp_iu26_{actors,orgs,measures}_<yyyymmdd>` + INSERT.
  3. An UPDATE `is_active = 0` limited to the backed-up ids.
  4. A recount.
  5. The re-validation step for each cleaned result.

  It runs in PROD **by Santiago** only after PR-1 is deployed, with `created_date <=` the deploy timestamp. Settles P-19.
- **Implements:** IU26-R-10 (scenario incl. BUT / AND IT MUST clauses)
- **Files (expected):** `cleanup.sql` (spec folder), `execution.md` notes
- **Depends on:** T-3 deployed · **Blocks:** —
- **Estimate:** M · **Review:** lenses — irreversible-looking data change in PROD
- **Skills:** none beyond project conventions (SQL)
- **Verification:**
  - **Falsifier:** run on TEST/PRTest. The dry run must exclude:
    - (a) a result with one edited actor;
    - (b) a status-4 result;
    - (c) role-2 partner rows;
    - (d) section-2 rows;
    - (e) a result created after the cutoff.

    Seed one of each and confirm 0 of them is selected. Mutation: drop the role clause → (c) selected (red).
  - **Red run:** n/a (no test gate) — the SQL dry run on TEST is the gate. Its output is quoted in `execution.md`.
  - **Disqualifier:** the PROD dry-run counts differ from the TEST logic expectations by more than the ~217 estimate without an explanation. Stop and review with Santiago; never run the UPDATE on an unexplained count.
  - **Consumers:** none (no code symbol); readers of the soft-deleted rows filter `is_active = 1` (`results-innovations-use.repository.ts:180` style). Confirm in `execution.md`.
- **Definition of done:** the script is reviewed; the TEST dry run is quoted; Santiago has the PROD dry run in hand before running steps 2–5 (this agent never runs it).

### [~] IU26-T-9 — PR-1 docs, Fetcher notice, PRTest visual check

- **Type:** docs
- **Description:**
  - **Folder docs:** update `innovation-use-form/CLAUDE.md`, `innovation-use-info/CLAUDE.md`, `type-innovation-use/CLAUDE.md` and `results-framework-reporting/innovation-use/CLAUDE.md` (stale replication note, JD-11).
  - **Notices and text:** draft the short Juanda notice (`/version` behaviour) and the PR description ("payload fields unchanged; `/version` behaviour logged"; review order T-3 → T-1/T-2 → client).
  - **PRTest visual check:** after deploy, check against mockup v2 at desktop and ~1024 px:
    - a 2026 W1/W2 result;
    - a 2026 W3 result;
    - a 2025 result (unchanged);
    - IPSR step 1 (unchanged);
    - a new phase copy (empty rows).
- **Implements:** IU26-R-1 (manual), IU26-R-7 layout gate (requirements §7.1), IU26-R-12 (PR text)
- **Files (expected):** the 4 CLAUDE.md files; PR text in `execution.md`
- **Depends on:** T-3, T-5, T-6, T-7 · **Blocks:** —
- **Estimate:** S · **Review:** checklist
- **Skills:** `cognitive-doc-design`
- **Verification:**
  - **Falsifier:** any of the five PRTest screens differs from mockup v2 in order, labels or tile layout, or the 2025 / IPSR step 1 screens differ from today → not done.
  - **Red run:** n/a (no test gate) — human check at the HITL pause.
  - **Disqualifier:** PRTest is not deployed with PR-1. The visual gate is then pending, never assumed.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:** screenshots attached in `execution.md`; Santiago accepts.

### [x] IU26-T-10 — Migration: `new_users` on six tables (PR-2)

- **Type:** db
- **Description:** One migration adding `new_users int unsigned NULL DEFAULT NULL` to `result_actors`, `results_by_institution_type`, `result_ip_measure`, `result_ip_result_actors`, `result_ip_result_institution_types`, `result_ip_result_measures`, with a down migration. Entity columns go in, and `new_users` is added to `NOT_REPLICATED` in `result-actors.repository.spec.ts`. Never in the replication lists.
- **Implements:** IU26-R-11 "stored, never copied"
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-AddNewUsersToInnovationUseRows.ts`, 6 entities, repository specs
- **Depends on:** PR-1 merged · **Blocks:** T-11, T-13
- **Estimate:** M · **Review:** full — migration
- **Backend route:** `nestjs-expert`
- **Skills:** `nestjs-expert`
- **Verification:**
  - **Falsifier:** `npm run migration:check` is green after the change; a replication test with `new_users = 5` on the source → the target has NULL. Mutation: add the column to the actors insert list → red.
  - **Red run:** `npx jest src/api/results/result-actors --maxWorkers=2` — predicted — greenfield artifact (observed in T-10). The metadata guard fails until `NOT_REPLICATED` lists the column.
  - **Disqualifier:** `migration:check` reports drift on unrelated entities. Stop and report; never bundle a fix.
  - **Consumers:** the replication spec guards listed in T-3.
- **Definition of done:** migration up/down verified locally; `migration:check` green.

### [x] IU26-T-11 — Server: save/read `new_users` (W1/W2 v2)

- **Type:** server
- **Description:** DTOs accept an optional `new_users` per actor, organization and measure row (`IsOptional`, `IsInt`, `Min(0)`). The service rejects a row whose `new_users` exceeds the row total (actors: `how_many`, or women + men when disaggregated) with a 400 naming the row. The read returns `new_users`. W3 (`results/summary`) does not accept it.
- **Implements:** IU26-R-11 "NEW above total" (server half), IU26-R-12
- **Files (expected):** v2 innovation-use DTOs, service, specs
- **Depends on:** T-10 · **Blocks:** T-12, T-15
- **Estimate:** M · **Review:** full — payload contract (internal)
- **Backend route:** `nestjs-expert` · `api-design-principles` · test-first (`tdd`)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** an actor with total 120 and `new_users` 150 → 400; 120 → OK; null → OK; a disaggregated row women 800 + men 1,000 with `new_users` 1,801 → 400.
  - **Red run:** `npx jest src/api/results-framework-reporting/innovation-use --maxWorkers=2 -t "new_users"` — predicted — greenfield artifact (observed in T-11).
  - **Disqualifier:** the bilateral DTO would need the field. Stop (R-12).
  - **Consumers:** `grep -rn "new_users\b" onecgiar-pr-server/src` listed in `execution.md`.
- **Definition of done:** specs green; `npx tsc` clean.

### [x] IU26-T-12 — Client: "Of which NEW" on W1/W2

- **Type:** client
- **Description:** One optional number per row:
  - actors: "Of which NEW users (optional)";
  - organizations and measures: "Of which NEW (optional)".

  Validation ≤ total with the message "New users (N) cannot be higher than the total (M).", `aria-invalid`, and submit blocked. "Of which new: N / not available" goes on each total tile. The guidance NEW sentence is added. 2026 W1/W2 only (never W3, never `isIpsr`).
- **Implements:** IU26-R-11 (both scenarios), IU26-R-7 "of which new" lines, IU26-R-8 NEW sentence
- **Files (expected):** `innovation-use-form.component.*`, `current-use-update.util.ts` (`newUsersExceedsTotal`), copy file, both client models (`innovationDevInfoBody.ts`, `Ipsr-step-1-body.model.ts`)
- **Depends on:** T-6, T-11 · **Blocks:** T-15
- **Estimate:** L · **Review:** full
- **Design route:** Main + States (C) artboards v2
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** total 120 / new 150 → error text and `aria-invalid="true"`; new empty → valid; a disaggregated row shows one NEW input (no women/men/youth NEW inputs); a category with no NEW → "not available"; W3 renders no NEW input. Mutation: compare NEW against women only → red.
  - **Red run:** `npm run test:local -- --testPathPattern="innovation-use-form|current-use-update"` — predicted — greenfield artifact (observed in T-12).
  - **Disqualifier:** the NEW field needs a model field that the IPSR step 1 template cannot compile (R-5). Add it to both models, never with `any`.
  - **Consumers:** `Ipsr-step-1-body.model.ts` (template typing), the W3 spec (asserts absence).
- **Definition of done:** specs green; `npm run build` clean.

### [x] IU26-T-13 — IPSR step 3 server: gate, previous use, `new_users`, stop copy

- **Type:** server
- **Description:**
  - **Gate:** for 2026 packages.
  - **Read:** `get/step-three` returns `current_use_previous` (actors total, organizations total, measures per unit) from the previous package found by `result_code` + the previous phase's version (DD-9), and returns `new_users`.
  - **Save:** `save/step-three` accepts `new_users` (≤ total).
  - **Replication:** `versioning.service.ts:799-801` is skipped when the target `phase_year >= 2026`; `:743,:749,:793` unchanged.
- **Implements:** IU26-R-13 (server), IU26-R-9 (IPSR)
- **Files (expected):** `api/ipsr/innovation-pathway/innovation-pathway-step-three.service.ts`, its DTO, `versioning.service.ts`, specs
- **Depends on:** T-1, T-3, T-10 · **Blocks:** T-14
- **Estimate:** L · **Review:** full
- **Backend route:** `nestjs-expert` · test-first (`tdd`)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** a 2026 package with a 2025 version holding 4,300 actors → `current_use_previous.total_actors = 4300`; a 2025 package → no `current_use_previous`; replication to 2026 → 0 step-3 rows; to 2025 → copied. Mutation: join by `result_id` instead of `result_code` → null (red).
  - **Red run:** `npx jest src/api/ipsr/innovation-pathway src/api/versioning --maxWorkers=2` — predicted — greenfield artifact (observed in T-13).
  - **Disqualifier:** the previous package cannot be found by `result_code` + version for real PRTest data. Escalate (DD-9 premise P-16 refuted → Pivot).
  - **Consumers:** step-3 client (T-14); `step-n3-current-use.component.spec.ts`.
- **Definition of done:** specs green; `npx tsc` clean.

### [x] IU26-T-14 — IPSR step 3 client

- **Type:** client
- **Description:** In `step-n3-current-use` with the 2026 gate from `currentResultSignal().phase_year` (P-24):
  - **Copy:** the 2026 question, "– total" labels, and the description without "expected" (`:179`).
  - **Previous use:** "Previous reported use" by category, as reference.
  - **Totals:** Actors - individuals / Organizations / Other quantitative measures, without Households.
  - **NEW:** one input per row with the ≤ total rule.
  - **Not included:** no narrative.
- **Implements:** IU26-R-13 (all clauses incl. "BUT must NOT show narrative or Households"), IU26-R-1 (step 1 untouched)
- **Files (expected):** `pages/ipsr/.../step-n3/components/step-n3-current-use/*` (+ specs)
- **Depends on:** T-13 · **Blocks:** T-15
- **Estimate:** L · **Review:** full
- **Design route:** IPSR artboard v2
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** a 2026 package → new copy, tiles, NEW inputs, no narrative, no Households tile; a 2025 package → today's copy ("Specify the current use of the core innovation…", "expected" present). Mutation: gate on `isP25()` → red on the 2025 fixture in P25.
  - **Red run:** `npm run test:local -- --testPathPattern=step-n3-current-use` — predicted — greenfield artifact (observed in T-14).
  - **Disqualifier:** `currentResultSignal()` is not populated on step 3. Find the package phase source and re-cite P-24 before coding.
  - **Consumers:** `step-n3-current-use.component.spec.ts`, `step-n3-current-use.zoneless.spec.ts`.
- **Definition of done:** specs green; `npm run build` clean; a PRTest screenshot of a 2026 package.

### [~] IU26-T-15 — Review surfaces: QA catalog, drawer, PDF

- **Type:** server + client
- **Description:**
  - **QA catalog:** `qa-catalog/definitions/sections/innovation-use.ts:548-571` stops listing "New users added" / "Total cumulative" for 2026, and lists NEW per row. Update the snapshot deliberately.
  - **Drawer:** the review drawer `innovation-use-content` shows NEW per row and the totals.
  - **PDF:** first step: settle P-18 by opening the pdf-viewer repo. If the PDF renders actor rows, add NEW there (separate repo PR). If not, record "no change".
- **Implements:** IU26-R-14 (incl. "Drawer" scenario)
- **Files (expected):** qa-catalog definition + snapshot + `qa-catalog.en.md`; `pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/components/innovation-use-content/*`; pdf-viewer repo (if P-18 holds)
- **Depends on:** T-11, T-12, T-14 · **Blocks:** —
- **Estimate:** M · **Review:** checklist
- **Skills:** `nestjs-expert`, `angular-developer`
- **Verification:**
  - **Falsifier:** a 2026 Households row with NEW 300 → the drawer shows "Of which NEW users: 300"; the 2026 catalog has no `new_users_added` item; the 2025 catalog still has it.
  - **Red run:** `npx jest src/api/qa-catalog --maxWorkers=2` + `npm run test:local -- --testPathPattern=innovation-use-content` — predicted — greenfield artifact (observed in T-15).
  - **Disqualifier:** the snapshot diff touches items outside Innovation Use. Stop.
  - **Consumers:** `__snapshots__/qa-catalog.snapshot.json`, `qa-field-catalog/inventory/{2026-B-outcomes-impact-ipsr,REVIEW}.md`.
- **Definition of done:** specs green; P-18 outcome recorded.

## 4. Dependency graph

```
PR-1
T-1 ──┬── T-4 ──┬── T-5 ── T-6 ──┐
      │         └── T-7 ─────────┤
T-2 ──┴─────────────(T-5, T-7)   ├── T-9 (docs + PRTest visual, HITL)
T-3 ─────────────────────────────┘
T-3 (deployed) ── T-8 (cleanup, HITL in PROD)

PR-2
T-10 ── T-11 ── T-12 ──┐
  └──── T-13 ── T-14 ──┴── T-15
```

Parallel-safe: T-1 ∥ T-2 ∥ T-3 (different files); T-5 ∥ T-7 after T-4. Only one Jest run at a time on the machine.

## 5. Coverage (scenario / clause → task)

| Requirement · scenario / clause | Task |
|---|---|
| R-1 2025 unchanged · BUT no totals/NEW/labels | T-5, T-6 (2025 fixture), T-9 |
| R-1 IPSR step 1 and 2030 untouched · AND IT MUST NOT gain… | T-5 (`isIpsr` test), T-14 (step 1 untouched), T-9 |
| R-2 Cumulative inputs gone · no mismatch block | T-5, T-7 |
| R-2 BUT stored values kept | T-2, T-5/T-7 (payload) |
| R-3 Shown above · Orgs only · TBD selected · First report | T-5, T-7, T-1 |
| R-4 All categories · BUT no split · AND IT MUST current rows only · Two units | T-1, T-4 |
| R-5 W3 submit checklist · BUT no New users/mismatch · Word limit | T-7, T-5 |
| R-6 Copy · BUT no "Depending" | T-5 |
| R-7 Table · Mixed actors · AND IT MUST NOT add · Units never mixed · Cut line · hidden when TBD · no tile without rows | T-4, T-6, T-7 |
| R-8 W3 guidance · "expected" only removed in 2026 · labels | T-4, T-5, T-7, T-14 |
| R-9 New copy · AND partner rows copied · BUT 2025 untouched · Bilateral version · AND IT MUST change log | T-3, T-13 (IPSR) |
| R-10 Only untouched rows · BUT edited/non-Editing/2030/partners · AND IT MUST after R-9 · AND IT MUST counts | T-8 |
| R-11 NEW above total · AND cannot submit · BUT empty valid · Disaggregated row · AND IT MUST NOT ask split · stored, never copied | T-10, T-11, T-12 |
| R-12 Payload unchanged | T-3, T-7, T-11 |
| R-13 IPSR step 3 · BUT no narrative/Households | T-13, T-14 |
| R-14 Drawer · catalog · PDF | T-15 |

## 6. Rollout & verification

1. PR-1 merged to `staging` → PRTest deploy (~30 min) → T-9 visual check.
2. Promote to `master` (Santiago) → PROD.
3. T-8: Santiago runs the dry run, reviews, then backup + UPDATE.
4. Reply to Nicoleta, and send the notice to Juanda.
5. PR-2 the week of 30-Nov, same path.

## 7. Roll-back plan

- **PR-1:** revert the commits; the cleanup is undone by `UPDATE … SET is_active = 1` on the ids in the `bkp_iu26_*` tables.
- **PR-2:** revert + down migration (the columns are nullable, nothing else depends on them).
