# Design — Innovation Use 2026: total use per category + "Of which NEW"

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-2026-total-and-new-users` |
| Depth | Full |
| Requirements | `requirements.md` IU26-R-1..R-14 |
| Visual source | Claude Design mockup v2 (artifact version 15): artboards Main, W3, States, IPSR |
| Verified at | `093655d2c` (branch `qa-development-2026-ss`) |
| Exploration | Scout report 2026-11-25 (read-only, citations as run) + inline checks |
| Review | Judgment Day (`judgment.md`): round 1 JD-1..JD-9 fixed in rev 2; round 2 JD-13..JD-17 fixed in rev 3 |
| Status | rev 3 — Judgment Day APPROVED (2026-11-25); info fixes FA-1/FA-2/FB-1..FB-3 applied |

## 1. Summary

The work is mostly client-side. The server side has five parts:
- **Previous use per category:** one util, with the row rule chosen per caller.
- **Stop copying current-use rows:** one branch in the replication funnel. Only Innovation Use's own rows are affected (organizations: role 5). The legacy measures table is left as today (DD-11).
- **Keep the cumulative fields:** for 2026 results, the save paths stop erasing them when the client stops sending them; earlier phases behave as today.
- **One-off SQL cleanup** (PR-1).
- **PR-2:** a nullable `new_users` column on **six** tables, IPSR step 3 (gate + previous use), and the review surfaces.

The client changes stay inside the existing components, styles and copy files.

## 1A. Premise Ledger

Count: **24 verified · 2 UNVERIFIED** (High 0 · Low 2).
Blast-radius triggers:
- **live-path:** user saves and the phase copy, including the annual cron;
- **shared-state:** the shared `innovation-use-form` is also IPSR step 1; replication and `results_by_institution_type` are shared with partner rows and other result types;
- **consumer:** stored `section_id`/roles, the `current_use_previous` shape, the API MDS validator, and the copy strings pinned by specs.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | For type 2, the reporting copy runs the IU answers (`:359`), legacy measures (`:363`), actors once (`:372`), P25 measures (`:373`), and — for every type — organizations (`:445`). There is no second actor copy for type 2 (`:749` is the IPSR flow, log `:813`) | live-path | `onecgiar-pr-server/src/api/versioning/versioning.service.ts:359,363,372,373,445,749,813` | 093655d2c | DD-4 must handle a duplicate copy (High) | — |
| P-2 | `POST /api/bilateral/version` reuses `versionProcessV2` | live-path | `bilateral.controller.ts:70,90` → `services/bilateral-versioning.service.ts:77` | 093655d2c | W3 needs its own stop-copy (Low) | — |
| P-3 | The actor copy (`createQueries`) carries `section_id`. `replicable()` lacks it but has no production caller | existence | `result-actors.repository.ts:45,78,106`; `grep -rn "\.replicable(" onecgiar-pr-server/src` → 1 hit, `result-actors.repository.spec.ts:414` | 093655d2c | Stop-copy cannot filter actors by section (High) | — |
| P-4 | Current use is `section_id = 1`, or NULL when the legacy W3 writer saved it; the 2030 projection is `section_id = 2` | data-env | `result_innov_section.enum.ts:2-3`; `onecgiar-pr-server/src/api/results/summary/utils/previous-phase-current-use.util.ts:33-44`; `innovation_dev.service.ts:173-182` | 093655d2c | Filters would drop W3 rows (High) | — |
| P-5 | Organizations (`results_by_institution_type`) carry `section_id` and are copied with it | data-env | `result_by_intitutions_type.repository.ts:31-80` (find + insert incl. `rbit.section_id`); entity `:52-60` | 093655d2c | DD-4 org filter changes (Low) | — |
| P-6 | Both writers store measures in P25 `result_ip_measure` (with `section_id`). The legacy `results_innovations_use_measures` has no `section_id` | data-env | `innovation-use.service.ts:1051`; `innovation_dev.service.ts:14-15`; `result-ip-measure.entity.ts:46-51`; `results-innovations-use-measures.entity.ts:31-47` | 093655d2c | DD-4/DD-3 must read another table (High) | — |
| P-7 | Measure units are free text (`unit_of_measure` type `text`) | data-env | `result-ip-measure.entity.ts:20-26` | 093655d2c | Group by catalog id instead (Low) | — |
| P-8 | A 2026 IU result finds its 2025 version through `InnovUseExists`: same `result_code`, `version_id = previous phase` | location | `results-innovations-use.repository.ts:227,231,249-255` | 093655d2c | DD-3 needs another join (High) | — |
| P-9 | The previous-use builder returns `{result_id, phase_year, total_actors}` from actors only, or `null`. It has two callers: `summary.service.ts:499-516` (W3 + legacy) and `innovation-use.service.ts:857-878` → `:933-956` (v2 W1/W2) | consumer | `onecgiar-pr-server/src/api/results/summary/utils/previous-phase-current-use.util.ts:64-84`; callers re-read | 093655d2c | A shape change misses a caller (High) | — |
| P-10 | The v2 save writes `new_users_added = value ?? null` (an omitted or null field erases stored data). The legacy save writes when `!== undefined`, so an explicit `null` erases there too | live-path | `innovation-use.service.ts:234-235,280-281` (`:121-122` is the destructuring); `summary.service.ts:284-288` | 093655d2c | DD-6 unnecessary (Low) | — |
| P-11 | `showCurrentUseUpdate()` (W1/W2) = 2026 gate ∧ `!isIpsr` ∧ previous present. W3 additionally hides it when TBD | shared-state | `innovation-use-form.component.ts:225-230`; `type-innovation-use.component.ts:304-310`; readers of `current_use_previous`: `grep -rln "current_use_previous" onecgiar-pr-client/src --include=*.ts` → 8 files (form, `innovation-use-info.component.ts`, W3, `Ipsr-step-1-body.model.ts` type, util, 3 specs) | 093655d2c | D-14 needs more sites (Low) | — |
| P-12 | `current-use-update.util.ts` is imported by the W1/W2 form, the W3 component and its own spec only | consumer | `grep -rln "current-use-update.util" onecgiar-pr-client/src` → 5 files (2 are CLAUDE.md) | 093655d2c | Other callers break (Low) | — |
| P-13 | "Depending on the innovation…" is pinned by 4 specs | consumer | `innovation-use-info.component.spec.ts:88-89`, `innovation-use-form.component.spec.ts:66,69`, `innovation-use-form.zoneless.spec.ts:87-88`, `fields-manager.service.spec.ts:909` | 093655d2c | A hidden spec breaks (Low) | — |
| P-14 | The phase gate `isInnovationUseAgeFallback2026` = `isPhaseYearAtLeast(2026)` on the result's `phase_year` | location | `fields-manager.service.ts:71-74,101-102`; `reporting-design-year.enum.ts:112` | 093655d2c | Gate keyed wrong (High) | — |
| P-15 | `count_unit` ('households' / 'individuals') is on the actor model, in both client models | data-env | `innovationDevInfoBody.ts:82-85`; `Ipsr-step-1-body.model.ts:198` | 093655d2c | Households total impossible (High) | — |
| P-16 | IPSR step 3 tables (`result_ip_result_actors`, `result_ip_result_institution_types`, `result_ip_result_measures`) have no `section_id`; they are remapped at `:799-801`; step 3 has no phase gate; a 2026 package links to 2025 only by `result_code` + `version_id`. The package-level copies at `:743,:749,:793` are not step 3 and stay as today | data-env | `innovation-pathway-step-three.service.ts:455,578,591,713,791`; `results-ip-actor.repository.ts:35,44`; `grep -rn previous_result_id onecgiar-pr-server/src/api/ipsr` (non-spec) → 0 | 093655d2c | IPSR design changes (Low, PR-2) | — |
| P-17 | Readers of `new_users_added` / `use_expansion_narrative`: `grep -rlE "new_users_added\|use_expansion_narrative"` over `*.ts *.html *.md *.hbs *.sql` (excl. node_modules, dist) → **30 files: 3 are this spec, 27 others**. Code readers: entity, DTOs, migration, `InnovUseExists`, summary, v2 service, qa-catalog def + snapshot, W1/W2 info + form, W3. Docs: `bilateral-result-summaries.en.md`, `qa-catalog.en.md`, `qa-field-catalog/inventory/{2026-B-outcomes-impact-ipsr,REVIEW}.md`, 3 folder CLAUDE.md. No PDF, AI QA, drawer or Excel reader | consumer | Command as run, 2026-11-25 | 093655d2c | R-14 scope grows (Low) | — |
| P-18 | The PDF (separate pdf-viewer repo) renders Innovation Use actor rows | location | `UNVERIFIED — confirm at source before relying on it` | — | The PDF task shrinks or moves (Low) | IU26-T-15, first step |
| P-19 | 2026 IU copies whose current rows all equal their 2025 origin ≈ 217 (175 + 48 − 6 edited; 1 discontinued excluded) | data-env | `UNVERIFIED — confirm at source before relying on it` (screenshot count, user-stated) | — | Cleanup scope (Low) | IU26-T-8 dry run, Santiago at the HITL pause |
| P-20 | Every replication path funnels into `$_phaseChangeReporting(result, phase, user)`: `versionProcess` / `versionProcessV2` (`:919`), the bilateral `/version` (P-2) and the annual cron `annualReplicationProcessInnovationUse` (`:1388-1413`). `phase` is a `Version` with `phase_year`. `ReplicableConfigInterface` carries only the phase id | live-path | `versioning.service.ts:271,919,1377,1388,1413`; `shared/globalInterfaces/replicable.interface.ts:7-17` | 093655d2c | DD-4 must patch several entry points (High) | — |
| P-21 | `results_by_institution_type` also holds the result's partner rows (`institution_roles_id` 1 and 2). Innovation Use organizations are role 5. The copy carries every role unfiltered | shared-state | `result_by_intitutions_type.repository.ts:31-80` (no role filter), `:155,:181` (roles 1/2 read); `innovation-use.service.ts:466,594,761,1033` (`institution_roles_id: 5`) | 093655d2c | Stop-copy and cleanup drop partners (High) | — |
| P-22 | Both clients always send the cumulative keys: W1/W2 `innovation-use-info.component.ts:511-512` (`?? null`, value reloaded at `:290-291`); W3 `type-innovation-use.component.ts:956-958` while the block shows | live-path | Lines re-read | 093655d2c | DD-6 client part unnecessary (Low) | — |
| P-23 | The bilateral API MDS validator reads `summaryService.getInnovationUse` and uses `innov_use_to_be_determined`, `actors`, `measures` (an error only when measures exist and none is complete) and `investment_bilateral`; it never reads `current_use_previous` | consumer | `bilateral/services/innovation-use-mds-validator.service.ts:46,51-59,92-101` | 093655d2c | New summary fields leak into the API MDS (Low) | — |
| P-24 | The client source of a package's phase year is `currentResultSignal().phase_year` (precedent: IPSR step 4 gate) | location | `pages/ipsr/.../step-n4/step-n4.component.ts:101` (the read; `:49,:84` are its docstring) | 093655d2c | IPSR gate needs another source (Low, PR-2) | — |
| P-25 | The previous-use row rule differs per caller today: v2 uses `currentUseRows` (`section_id = 1`), W3/legacy uses `notFutureRows` (NULL or ≠ 2) | data-env | `previous-phase-current-use.util.ts:33-44`; `innovation-use.service.ts:863-872`; `summary.service.ts:511-515` | 093655d2c | DD-3 changes W1/W2 figures (Low) | — |
| P-26 | The legacy `results_innovations_use_measures` table (copied at `:363`, no `section_id`, no current writer — P-6) is read by the bilateral GET `getInnovationUseBilateralResultById` and by `getSectionSevenDataForReport`; `bilateral-center.service.ts:839` soft-deletes it | consumer | `grep -rlE "ResultsInnovationsUseMeasures|results_innovations_use_measures" onecgiar-pr-server/src --include=*.ts` (non-spec, non-migration) → 12 files: 2 readers (`result.repository.ts`, `results-innovations-use.repository.ts`), 2 delete paths (`bilateral-center.service.ts`, `delete-recover-data.service.ts`), the copy (`versioning.service.ts`), entity + repository, `excluded-tables.ts`, 4 module wirings; `result.repository.ts:3886,3914`; `results-innovations-use.repository.ts:164,180`; `bilateral-center.service.ts:839` | 093655d2c | Not copying or cleaning it changes `/api/bilateral/*` content (High) | — |

## 2. Architecture Overview

| Layer | PR-1 | PR-2 |
|---|---|---|
| DB | — (cleanup script with backup tables) | Migration: nullable `new_users` on the **six** tables `result_actors`, `results_by_institution_type`, `result_ip_measure`, `result_ip_result_actors`, `result_ip_result_institution_types`, `result_ip_result_measures` |
| Server | Util per category (per-caller pick) · both callers · stop-copy branch in `$_phaseChangeReporting` · cumulative fields never erased | DTO/entity/save/read of `new_users` (v2 + IPSR step 3) · IPSR previous use · qa-catalog |
| Client | W1/W2 form + `innovation-use-info` payload + W3 component | NEW inputs + validation · IPSR step 3 · review drawer |
| Contract | `bilateral-result-summaries.en.md` change log: `/version` (and the phase copy) stop copying current-use rows; API MDS outcome stated | none |

Flow (PR-1, opening a 2026 copy):
1. The client GETs the innovation-use read (v2 for W1/W2, `results/summary` for W3).
2. `InnovUseExists` gives `previous_result_id`.
3. The util summarizes the previous actors, role-5 organizations and P25 measures, with the caller's row rule.
4. The client renders the CUU above the question, and the totals from the live rows.

## 3. Data Model

- **PR-1:** no schema change. `current_use_previous` (an internal response, not `/api/bilateral`) grows additively to `{result_id, phase_year, total_actors, total_organizations, measures: [{unit, quantity}]}`.
- **PR-2:** `new_users` `int unsigned NULL DEFAULT NULL` on the six tables. It is **not** added to any replication list. `result-actors.repository.spec.ts` gets it in `NOT_REPLICATED` on purpose.
- **Cleanup backup (PR-1):** `bkp_iu26_actors_<yyyymmdd>`, `bkp_iu26_orgs_<yyyymmdd>`, `bkp_iu26_measures_<yyyymmdd>`: full row copies plus `cleanup_run_at`.

## 4. API Surface

| Endpoint | Change |
|---|---|
| v2 innovation-use GET (W1/W2) | `current_use_previous` additive. PR-2: rows gain `new_users` |
| v2 innovation-use save | PR-1: for results with `phase_year >= 2026`, `new_users_added` / `use_expansion_narrative` are written only when the value is neither `undefined` nor `null` (DD-6); earlier phases keep today's write (an explicit `null` clears). PR-2: `new_users` per row (`IsOptional`, `IsInt`, `Min(0)`; ≤ row total checked in the service) |
| `results/summary` innovation-use GET/PATCH (W3) | `current_use_previous` additive; same DD-6 rule on save; no `new_users` |
| IPSR `get/step-three` / `save/step-three` | PR-2: `new_users` per row; `current_use_previous` for 2026 packages |
| `/api/bilateral/*` | **No field change.** The API MDS validator does not read the new summary fields (P-23). The legacy measures table keeps feeding the bilateral GET as today (DD-11). The `POST /api/bilateral/version` behaviour change is documented in the change log |

## 5. Server Workflow / Business Rules

### 5.1 Previous use (DD-3)

The util takes a row `pick` per caller (P-25):
- v2 = `section_id = 1`;
- legacy/W3 = NULL or ≠ 2.

It sums:
- the previous result's active actors;
- **active role-5** organizations;
- active P25 measures, grouped by `lower(trim(unit_of_measure))`, with the first-seen spelling as the label.

It returns `null` when all three are empty (R-3).

### 5.2 Stop copy (DD-4)

The branch lives in `$_phaseChangeReporting` (P-20). When `phase.phase_year >= 2026` and the result is type 2:
- **actors** and **P25 measures:** copy only `section_id = 2` rows;
- **legacy measures table:** copied as today (DD-11, P-26);
- **organizations:** copy every row **except** `institution_roles_id = 5 AND (section_id IS NULL OR section_id <> 2)`. The exclusion goes into **both** the find query and the insert-select (`result_by_intitutions_type.repository.ts:39-41,74-76`). Partner roles 1/2 and the 2030 role-5 rows are copied as today (P-21);
- **IU answers** (`results_innovations_use`): copied as today.

The year travels into the repository calls as an added optional field `phase_year` on `ReplicableConfigInterface` (absent → today's behaviour). Other result types are untouched.

**IPSR (PR-2):** `:799-801` are skipped when the target `phase_year >= 2026`. `:743,:749,:793` (package level) stay as today.

### 5.3 Cumulative fields kept (DD-6)

The server: for results with `phase_year >= 2026`, both save paths write the two fields only when the value is neither `undefined` nor `null`. For earlier phases the writes stay exactly as today (v2 `?? null`; legacy `!== undefined`), so a pre-2026 user can still clear them. A 2026 user can still clear the narrative with an empty string.

The clients:
- `innovation-use-info.component.ts` and W3 `buildPayload` omit `new_users_added` for 2026 results and keep sending the narrative; an emptied narrative is sent as `""` (not `null`) for 2026, so clearing it still works under the guard;
- for pre-2026 results they send them as today.

### 5.4 NEW ≤ total (PR-2)

The client blocks it. The server rejects a row whose `new_users` exceeds the row total (actors: `how_many`, or women + men when disaggregated) with a 400 naming the row.

### 5.5 Cleanup (DD-7, SQL run by Santiago)

**Target results.** Innovation Use (type 2) results that meet all of these (the previous result comes from the same join as `InnovUseExists`: `results-innovations-use.repository.ts:227,231,249-255`):
- phase `phase_year = 2026`;
- `status_id = 1` (Editing; status 4 and all others excluded);
- `is_active = 1`;
- a previous result found by that join;
- `created_date` ≤ the PR-1 deploy timestamp (guard against post-deploy copies).

**Rows considered:**
- actors and P25 measures with `section_id IS NULL OR section_id = 1`, `is_active = 1`;
- organizations with role 5, the same section rule, `is_active = 1`.

2030 rows (`section_id = 2`) and other roles are never selected.

**Qualifying result.** **Each** of the three tables must match: the multiset of value columns of the result's considered rows equals the multiset of its previous result's considered rows. A table that is empty on both sides counts as a match. A result whose three tables are all empty is skipped. The legacy measures table is not touched (DD-11); the dry run reports how many target results still have active legacy measure rows.

**Order:**
1. Dry-run SELECT with counts per source (W1/W2 vs W3, via `result.source`) and status.
2. HITL review by Santiago.
3. INSERT into the backup tables.
4. UPDATE `is_active = 0` on exactly the backed-up ids.
5. Recount.

**Green checks / validation:** the stored section validation of each cleaned result is recomputed through the existing validation call for the section, so the result shows as incomplete. It is listed as a task step, not left stale.

## 6. Frontend Plan

### 6.1 Components & services

| Component | PR-1 | PR-2 |
|---|---|---|
| `shared/components/innovation-use-form` (W1/W2, `!isIpsr` only) | Move the CUU above the header/TBD; remove the cumulative input, line and alert; previous use by category; narrative label; 2026 question copy; hide the core-innovation alert in 2026; totals; "– total" labels; description without "expected"; guidance | NEW inputs, validation, "of which new" in totals, NEW sentence in the guidance |
| `innovation-use-info.component.ts` (W1/W2 container) | For 2026 results, omit `new_users_added` from the save payload; keep sending the narrative; pre-2026 unchanged | Send `new_users` per row |
| `shared/utils/current-use-update.util.ts` | `previousUseByCategory`, `totalsByCategory`, narrative-only completeness; the cumulative helpers are deleted once both callers are migrated (P-12) | `newUsersExceedsTotal(row)` |
| `internationalization/current-use-update.copy.ts` | New labels; the hard-coded CUU strings move here (DD-10) | NEW labels |
| `fields-manager.service.ts` | `[innovation-use-form]-core-innovation`: 2026 label, no description in 2026 | — |
| bilateral `type-innovation-use` | Same CUU, totals and copy; `showCurrentUseUpdate` drops the TBD condition (DD-5); mdsTracker `use-current-update` = narrative only; `buildPayload` omits `new_users_added` for 2026 and keeps the narrative | — |
| IPSR `step-n3-current-use` | — | 2026 gate from `currentResultSignal().phase_year` (P-24); copy, totals, NEW, previous use |
| review drawer `innovation-use-content` | — | NEW per row, totals |

### 6.2 Design system usage (mockup v2 → existing tokens)

No new tokens and no new components: the mockup was built from the live app's styles (`colors.scss`, `field-card.scss`).
- **Headers and inputs:** `app-pr-field-header`, `app-pr-input` (number).
- **Totals grid:** surface `#f3f2f7` header, text `#2b2838`, muted `#5d5872`, 20px/700 tabular figures, gap 10px. 4 columns on desktop, 2 below 1024 px.
- **CUU container:** the existing `.current_use_update`.
- **Errors:** `#b91c1c` + `aria-invalid`.
- No Spartan primitive is needed.

Page mode: form (existing section). Environment class: `ENV-2` (an existing design system and live screens reused in the mockup). Direction: extend in place.

## 7. Security & Authorization

No new endpoints or roles. The cleanup SQL holds no credentials and is run by Santiago (standing rule: DB steps are handed off).

## 8. Performance & Capacity

The previous-use read adds 2 indexed queries (organizations, measures) per result read. The totals are computed client-side over tens of rows.

## 9. Observability

The cleanup prints dry-run and final counts per source and status. Replication keeps its existing logs.

## 10. Testing Plan

| Area | Tests |
|---|---|
| Util (server) | Per-caller pick (v2 = section 1; legacy = NULL/1); role-5 only; two units with different case; empty → null |
| Replication | `versioning.service` spec on `$_phaseChangeReporting`: target 2026 type 2 → 0 current rows, 2030 rows kept, **a role-2 partner row kept**; target 2025 → as today; type 7 unchanged; the annual cron path; IPSR (PR-2) |
| Saves | 2026: v2 and legacy, omitted **or null** `new_users_added` keeps the stored value (red today, P-10). 2025: an explicit `null` still clears it (stays green) |
| Client payload | `innovation-use-info` and W3 `buildPayload` omit `new_users_added` for 2026 and send it for 2025 |
| Client form | 2026 order, copy, no cumulative, totals math, TBD keeps the CUU; 2025 fixture unchanged; `isIpsr` unchanged; the 4 "Depending" specs (P-13) pass with pre-2026 fixtures |
| W3 | mdsTracker narrative-only; CUU shown with TBD |
| API MDS | Validator on a 2026 `/version` copy with TBD = No, no actors and no P25 measures → reports actors missing and no measures error (P-23); investment checks unchanged |
| PR-2 | NEW validator, DTO validation, migration check, IPSR step 3 gate + totals, drawer |
| Visual | PRTest at desktop and ~1024 px vs mockup v2 (human, at the HITL pause) |

## 11. Backwards Compatibility & Migration Plan

- `/api/bilateral/*` fields are unchanged.
- **Change log entry (PR-1):** "From the 2026 phase, the phase copy and `POST /api/bilateral/version` no longer copy current-use actors, organizations or quantitative measures of an Innovation Use result; 2030 projection rows are still copied. A versioned result therefore starts without actors, and the API MDS reports actors as missing until the centre adds 2026 actors (an Actors error: missing actors when 'to be determined' is No, or the unanswered-question error when it is not answered). No measures error is raised for an empty measures list; investment checks are unchanged." A notice goes to Juanda.
- Stored cumulative values are kept (DD-6).
- **Rollback:**
  - PR-1: revert the code; the cleanup is undone by `is_active = 1` on the backed-up ids;
  - PR-2: a down migration drops the columns.

## 12. Design Decisions

### IU26-DD-1 — One spec, two PRs
PR-1 has no migration. R-7 is the cut line. Rejected: one PR (it does not fit by Friday).

### IU26-DD-2 — The totals are computed client-side and never stored
They derive from the rows, and no server consumer needs them.

### IU26-DD-3 — Previous use extends the existing util, with a per-caller row rule
- It reuses `InnovUseExists` (P-8) and today's per-caller section rules (P-25), so W1/W2 figures do not shift.
- Organizations are role 5 only (P-21). Measures are grouped by normalized text (P-7).
- Rejected: a new endpoint.

### IU26-DD-4 — Stop-copy is one branch in `$_phaseChangeReporting`, scoped to Innovation Use rows
- It covers every replication path, the annual cron included (P-20).
- It keeps the 2030 rows, partner roles and other types (P-1, P-3, P-5, P-6, P-21).
- **Reverts delivered behaviour** (the 2026-10-14 pre-fill).
- **Reversion challenge — "what does removing this break?":**
  1. W3 versions arrive without actors, so the API MDS reports actors missing until the centre adds them. This is intended, and it is stated in the change log with a notice to Juanda.
  2. Green checks of new copies start incomplete, as for a first report.
  3. Partner rows would have broken without the role filter (JD-1). They are now kept and tested.
  4. Nothing else reads copied rows at replication time (P-17).

### IU26-DD-5 — The CUU sits above the question and ignores TBD (D-14)
- **Reverts** W3's TBD condition (P-11).
- **Challenge:** a W3 result with TBD = Yes and a previous phase now needs the narrative for the screen MDS. This is accepted (Nicoleta's rule). The API MDS is unaffected (P-23).

### IU26-DD-6 — Cumulative fields: the client omits them for 2026, and for 2026 results the server never writes `undefined`/`null` over them
- Both halves are needed: the clients send an explicit `null` today (P-22), and the v2 server nulls omitted fields (P-10).
- The server guard is phase-gated: earlier phases keep today's clear-on-null behaviour (JD-13).
- The narrative keeps flowing, because it is still a live 2026 field.

### IU26-DD-7 — Cleanup by whole result, equal-to-origin, role- and section-scoped, soft and backed up
- The full predicate is in §5.5. Whole-result matching avoids half-cleaned results. Values are compared, not timestamps.
- A `created_date` guard and recomputed validation close the ordering and stale-green-check gaps.
- **Reverts data. Challenge:** a user who kept the 2025 numbers on purpose, without editing, loses them on screen. They stay visible in the CUU and in the backup. Approved by Nicoleta (N-1).

### IU26-DD-8 — NEW is one nullable `new_users` column per row table, never replicated
One number per row (N-15). NULL means "not available".

### IU26-DD-9 — IPSR uses `result_code` + the previous phase's version; the gate uses `currentResultSignal().phase_year`
P-16 and P-24. The join shape is the same as `InnovUseExists` (P-8).

### IU26-DD-10 — The hard-coded CUU strings move to the copy file
This keeps W1/W2 and W3 identical and makes the spec assertions stable.

### IU26-DD-11 — The legacy measures table stays as today
It has no current writer, no `section_id`, and it feeds the bilateral GET and the section-7 report (P-26). Not copying or cleaning it would change `/api/bilateral/*` content. It is left in place, and the cleanup dry run counts the 2026 copies that still hold such rows. A follow-up can retire it with its own contract entry.

## 13. Budget (tripwire for `/akili-execute`)

| Measure | PR-1 | PR-2 | Total |
|---|---|---|---|
| Tasks | 9 | 6 | **15** |
| LOC (prod + tests) | ~800 | ~750 | **~1,550** |
| Review rounds | 14 | 9 | **23** |

Execution that exceeds tasks + 2, LOC × 1.3 or rounds + 4 stops and escalates.

## 14. Open Gaps & Follow-ups

- P-18 → IU26-T-15 · P-19 → the IU26-T-8 dry run.
- Archive sync: `results-framework-reporting/innovation-use/CLAUDE.md` is stale on replication (JD-11); update it together with the folder docs of the form, info and W3.
- Kaizen: the "v2 save nulls omitted fields" lesson and the "shared org table holds partner roles" lesson.
