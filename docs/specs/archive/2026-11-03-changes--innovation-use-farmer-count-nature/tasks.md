# Tasks — Innovation Use: unit and nature of the number for Farmers actors

## 1. Scope

- **Feature:** `changes/innovation-use-farmer-count-nature` (P2-4048)
- **Linked spec:** `requirements.md` (IFC-R-1..10) + `design.md` (IFC-DD-1..8, budget §11)
- **Owner:** Santiago Sanchez · **Status:** in-progress · **Approval Mode:** gated
- **Branch:** `qa-development-2026-ss` (then fast-forward to `performance-refactor` for PRTest)

## 2. Pre-flight

- [x] requirements + design approved (by `/akili-execute` invocation, 2026-11-03)
- [x] IFC-OQ-1 resolved: option A (Santiago, 2026-11-03); 139 PROD results, all Editing
- [x] IFC-T-1 confirms the Farmers id = 1 in test **and** prod (2026-11-03: **both confirmed** by Santiago with screenshots. Note that id 3 is named "Agricultural extension agents" in prod and "Extension agents" in test, which confirms IFC-DD-4 (match by id, never by name); `1 = Farmers/ (agro)pastoralist/ herders/ fishers`, 2 Researchers, 3 Agricultural extension agents, 4 Policy actors, 5 Other; the second environment is still pending)
- [ ] Test runs: Jest always with `--maxWorkers=2`, scoped (`--findRelatedTests <changed files>`), one run at a time, never a full suite

## 3. Task list

### IFC-T-1 — Verify Farmers id, size the impact, snapshot the live function (HITL)
- **Type:** rollout
- **Description:** Santiago runs, in test and prod: (a) `SELECT actor_type_id, name FROM actor_type;` and confirms Farmers = 1; (b) the R-1 query from `proposal.md` §12 (2026 W1/W2 Farmers rows per section); (c) saves the current `validation_innovation_use_P25` body (already pasted 2026-11-03) as `sql/validation_innovation_use_P25.before.sql`. No code.
- **Implements:** prerequisite for IFC-R-1, R-6 (Farmers identity); IFC-OQ-1 sizing
- **Files:** `docs/specs/changes/innovation-use-farmer-count-nature/sql/validation_innovation_use_P25.before.sql`
- **Depends on:** — · **Blocks:** T-2, T-4, T-5 · **Estimate:** S · **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** Farmers ≠ 1 in either environment → the pinned constant is wrong.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if the ids differ between test and prod, stop: re-specify IFC-DD-4 to resolve by name.
  - **Consumers:** none (no shared symbol changed)
- **Done:** [x] id confirmed in both · [x] counts recorded in `execution.md` · [x] before-body saved

### IFC-T-2 — Schema, entity, write whitelist and replication of the two columns
- **Type:** db + server
- **Description:** Migration adding `count_unit` and `use_nature` (`varchar(32)` NULL) to `result_actors`, with a working `down`. Entity columns. `farmer-follow-up.constant.ts` (Farmers id, the 4 codes, a whitelist helper). `buildActorData` writes both through the whitelist (`?? null`; an unknown value → NULL). Both column lists of `ResultActorRepository` (createQueries find/insert + the INSERT-SELECT and custonFunction paths) carry the columns.
- **Implements:** IFC-R-7 (all clauses), IFC-R-8 (replication half; recovery needs no change per design §3), IFC-R-10 (no reader/sum touched)
- **Files:** `onecgiar-pr-server/src/migrations/<ts>-AddFarmerCountNatureToResultActors.ts`, `.../result-actors/entities/result-actor.entity.ts`, `.../result-actors/farmer-follow-up.constant.ts`, `.../result-actors/repositories/result-actors.repository.ts`, `.../innovation-use/innovation-use.service.ts` (`buildActorData` only)
- **Depends on:** T-1 · **Blocks:** T-3, T-4, T-6 · **Estimate:** M · **Review:** full (migration + shared table)
- **Verification:**
  - **Falsifier:** saving `count_unit: 'people'` stores `'people'`; or a replicated actor row comes back with `count_unit` NULL when the source had `households`.
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/api/results-framework-reporting/innovation-use/innovation-use.service.ts src/api/results/result-actors/repositories/result-actors.repository.ts` (new cases: whitelist keeps the 4 codes / drops others; replicate SQL text contains both columns in the SELECT and INSERT lists of every path)
  - **Disqualifier:** `npm run migration:check` reports drift that is not this migration → stop and report (another session's schema change).
  - **Consumers:** `ResultActor` entity is read by IPSR step 1/2, the bilateral services, summary, versioning, delete-recover (columns are nullable and additive; none must change; run their related specs).
  - **Cannot prove:** the SQL-text assertion proves the columns are listed, not that MySQL copies them → covered by T-7's manual duplicate check.
- **Done:** [x] migration up/down run locally (HITL, Santiago, 2026-11-03: run → revert → run, columns verified varchar(32) NULL in test) · [x] `npm run migration:check` green (Pending: 0, 2026-11-03) · [x] related specs green (except `qa-catalog.completeness.spec.ts` → owned by T-6) · [x] `npx eslint <files> --quiet` — code PASS 2026-11-03, see execution.md

### IFC-T-3 — Save matching: Farmers rows de-dup on (type, unit, nature)
- **Type:** server
- **Description:** In `saveInnovationUse`'s actor loop, for rows without `result_actors_id` whose type is Farmers, the lookup adds `count_unit` and `use_nature` (`IsNull()` when empty, like `other_actor_type`). Other types: unchanged.
- **Implements:** IFC-R-4 ("BUT the second row must NOT overwrite the first"; both rows survive with their own answers), design DD-8
- **Files:** `.../innovation-use/innovation-use.service.ts`, a new `innovation-use.service.farmer-follow-up.spec.ts` (pattern: `Object.create(InnovationUseService.prototype)`), and `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use.handler.ts` (`prepareActors` only) + its spec
- **Execute-time amendment (2026-11-03, Santiago, "Guard bilateral"):** the disqualifier fired because the bilateral handler (`afterCreate` -> `saveInnovationUse`) is a second caller. `prepareActors` must force `count_unit: null, use_nature: null` on every actor, so bilateral merges and stores exactly as today (IFC-R-1 out-of-scope, IFC-R-10). There is no bilateral payload shape change.
- **Depends on:** T-2 · **Blocks:** T-7 · **Estimate:** S · **Review:** checklist
- **Verification:**
  - **Falsifier:** with one saved Farmers row (individuals, received), a new Farmers row (individuals, applied) without an id produces an `update` on the first row's id instead of a `save`.
  - **Red run:** `npx jest --maxWorkers=2 src/api/results-framework-reporting/innovation-use/innovation-use.service.farmer-follow-up.spec.ts` (cases: different answers → insert; identical answers → update; both NULL → update; Researchers duplicate → update as today)
  - **Disqualifier:** if the loop turns out to rely on type-only matching elsewhere (e.g. the bilateral handler calls it), stop and re-specify.
  - **Consumers:** `saveInnovationUse` callers: the v2 controller only (verify with codegraph_callers).
- **Done:** [x] spec red→green · [x] existing innovation-use specs green (PASS 2026-11-03, incl. bilateral guard)

### IFC-T-4 — Client: follow-up block, gate, duplicates, Households coupling
- **Type:** client
- **Description:** In `innovation-use-form` (both blocks): `farmer-follow-up.ts` (Farmers id, codes, verbatim copy from the mock-up), gate `isFarmerFollowUpRow(actor)` (not IPSR, result phase ≥ 2026 via `isPhaseYearAtLeast`, `source_name !== 'W3/Bilaterals'`, type Farmers, active). The block goes right under the Actor type select: title, Q-a (2 inline radios, required), Q-b (2 radios with bold label + grey description, required), italic helper; no developer note. Type change away from Farmers clears both answers. `removeOther` stops disabling Farmers when the result-level gate is true. Households → `sex_and_age_disaggregation = true` + `cleanActor`, "does not apply" checkbox hidden for that row; Individuals → `false`, grid back. Load the `angular-developer` + `spartan` skills; confirm the `pr-radio-button` option-description support (Spartan MCP) before choosing the radio primitive.
- **Implements:** IFC-R-1 (both scenarios, every clause incl. "MUST disappear… cleared" and the 3 out-of-scope surfaces), IFC-R-2, IFC-R-3 (incl. "must NOT render the developer note"; same text in 2030), IFC-R-4 (client half + "other types stay disabled"), IFC-R-5 (all clauses; "must NOT change rows of other actor types"), IFC-R-6 (client mandatory feedback half)
- **Files:** `onecgiar-pr-client/src/app/shared/components/innovation-use-form/{innovation-use-form.component.html,.ts,farmer-follow-up.ts,innovation-use-form.component.spec.ts}` (+ folder `CLAUDE.md` if present)
- **Execute-time amendment (2026-11-03, Leader forward pointer from the T-2 review, Reviewer B accepted it):** also `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component.{ts,spec.ts}` + its `CLAUDE.md` (the save payload always carries `count_unit`/`use_nature`, `?? null`, both blocks, so stored answers are never blanked by the server's whole-payload update), and type-only `count_unit?`/`use_nature?` on the `Actor` models in IPSR `step-n1/model/Ipsr-step-1-body.model.ts` and `innovation-dev-info/model/innovationDevInfoBody.ts` (compile-only; no runtime key, no IPSR payload change).
- **Depends on:** T-1 (id), T-2 (field names) · **Blocks:** T-7 · **Estimate:** L · **Review:** full (shared template with IPSR)
- **Verification:**
  - **Falsifier:** any of: block visible for Researchers; visible with `isIpsr = true`; visible for `phase_year = 2025` or `null`; visible for `source_name = 'W3/Bilaterals'`; Farmers option disabled in a second row on a 2026 W1/W2 result; Researchers option enabled in a second row; Households leaves the Women input rendered; switching type keeps `use_nature`.
  - **Red run:** `npm run test:local -- --findRelatedTests src/app/shared/components/innovation-use-form/innovation-use-form.component.ts` (one case per falsifier above, both blocks; one exact-string assertion per copy constant)
  - **Disqualifier:** if the gate cannot read `source_name` from `currentResultSignal` reliably (field absent on the P25 load), stop and re-specify the source check.
  - **Consumers:** `innovation-use-form` is used by `innovation-use-info` and IPSR `step-n1` (`isIpsr`). Run IPSR step-n1's related specs too.
  - **Cannot prove:** jsdom cannot check placement or visual likeness to the mock-up → T-7 visual check.
- **Done:** [x] specs red→green · [x] lint (`ng lint --lint-file-patterns`; `npx eslint` has no flat config in the client) · [x] `npm run build` compiles the template (PASS 2026-11-03)

### IFC-T-5 — Green-check function: Farmers rule in both actor blocks (HITL apply)
- **Type:** db
- **Description:** Write `sql/validation_innovation_use_P25.after.sql` from the T-1 before-body: read `r.source` next to `result_phase_year`; inside the `section_id = 1` and `= 2` actor blocks, when `COALESCE(result_phase_year,0) >= 2026 AND source <> 'API'`, return FALSE if any active Farmers row of that section has `count_unit NOT IN ('households','individuals')` or `use_nature NOT IN ('information_received','innovation_applied')` (NULL included). Everything else byte-for-byte. Plus `sql/checks.sql`: the function's output for real result ids (2025 W1/W2, 2026 bilateral, 2026 W1/W2 Farmers with/without answers, 2026 without Farmers), run before and after. Body-only variant for the DBeaver routine editor. Santiago applies it (test first, then prod at deploy).
- **Implements:** IFC-R-6 (server half, both blocks; "BUT a 2025 or bilateral result MUST keep today's outcome")
- **Files:** `docs/specs/changes/innovation-use-farmer-count-nature/sql/*`
- **Depends on:** T-1, T-2 (columns exist) · **Blocks:** T-7 · **Estimate:** M · **Review:** lenses (live DB logic)
- **Verification:**
  - **Falsifier:** any 2025 or bilateral result id changes value between before and after; a 2026 W1/W2 result with an unanswered Farmers row still returns 1.
  - **Red run:** n/a (no test gate; the function is not in the repo). Substitute: `checks.sql` before/after table recorded in `execution.md`.
  - **Disqualifier:** the before-body differs from the T-1 snapshot at apply time (someone changed it) → stop, re-diff.
  - **Consumers:** every green check of Innovation Use results (W1/W2 and W3).
  - **Cannot prove:** the checks only cover the sampled ids; the gate expression is reviewed line by line in the lenses review.
- **Done:** [x] after-body + diff reviewed (PASS attempt 2, 2026-11-03) · [x] applied in test (HITL, Santiago, 2026-11-03, SQL Editor + Alt+X with test DEFINER) · [x] before/after table shows only the intended change (11026 + 11619 1→0, rest unchanged; prod apply owed at deploy)

### IFC-T-6 — QA catalog: two subfields per block, closed lists, revision 33
- **Type:** server
- **Description:** In `qa-catalog/definitions/sections/innovation-use.ts`, the actor list of both `usageLists` blocks gains `count_unit` and `use_nature` subfields (`visible_when` / `required_when` actor type = Farmers, `FROM_2026`). Closed lists `actor_count_unit` / `actor_use_nature` in `closed-control-lists.ts`; `versions.ts` 2026 revision 32 → 33; row in `docs/qa-catalog.en.md`; update snapshots only for these keys.
- **Implements:** IFC-R-9 (all clauses)
- **Files:** `onecgiar-pr-server/src/api/qa-catalog/definitions/{sections/innovation-use.ts,closed-control-lists.ts,versions.ts}`, `onecgiar-pr-server/docs/qa-catalog.en.md`, `__snapshots__`
- **Depends on:** T-2 · **Blocks:** T-7 · **Estimate:** M · **Review:** checklist
- **Verification:**
  - **Falsifier:** the catalog for 2026 Innovation Use lacks either key in either block; a list accepts a fifth code; the revision is still 32; the snapshot diff touches other keys.
  - **Red run:** `npx jest --maxWorkers=2 src/api/qa-catalog/qa-catalog.innovation-use.spec.ts src/api/qa-catalog/qa-catalog.shape.spec.ts src/api/qa-catalog/qa-results.golden-bindings.spec.ts src/api/qa-catalog/qa-catalog.snapshot.spec.ts`
  - **Disqualifier:** the golden-bindings spec cannot bind a varchar column of `result_actors` without a mapper change → stop and size it.
  - **Consumers:** `QaCatalogSyncService` (bootstrap), the QA catalog/results endpoints.
- **Done:** [x] specs green · [x] snapshot diff limited to the new keys + revision (PASS attempt 2, 2026-11-03)

### IFC-T-7 — End-to-end check on local + PRTest, docs sync
- **Type:** tests + docs
- **Description:** With the function applied in test: on a **non-production** 2026 W1/W2 Innovation Use result (create one or use a test result; the local stack writes to the shared DB, so never touch a real result), check save/reload of two Farmers rows, Households → single total, green-check red → green, and a phase duplicate keeping the answers; open a 2025 result, a bilateral result and IPSR step 1 to confirm no change. Visual check against `mockup/` (HITL, T6 multimodal). Update `innovation-use/CLAUDE.md` (where the two columns live, the Farmers de-dup rule) and re-stamp `Verified:`.
- **Implements:** IFC-R-1..R-8 end-to-end, IFC-R-10 ("existing totals unchanged": the Total actors figure of a result with no Farmers is identical before and after)
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md`, `execution.md`
- **Depends on:** T-3, T-4, T-5, T-6 · **Blocks:** — · **Estimate:** M · **Review:** checklist
- **Verification:**
  - **Falsifier:** any step above behaves differently from its requirement scenario.
  - **Red run:** n/a (manual, recorded with screenshots in `execution.md`)
  - **Disqualifier:** a check needs writing to a real (non-test) result → stop and ask.
  - **Consumers:** none (no shared symbol changed)
- **Done:** [x] all checks recorded (phase duplication covered by the T-2 replicate specs, not run in a browser; 2025/IPSR covered by the T-4 falsifier specs) · [x] visual approved by Santiago (2026-11-03) · [x] CLAUDE.md synced (server `innovation-use/CLAUDE.md`, 2026-11-03)

## 4. Dependency graph

```
IFC-T-1 (HITL)
  └── IFC-T-2 (schema + write + replicate)
        ├── IFC-T-3 (save de-dup)      ─┐
        ├── IFC-T-4 (client)           ─┤  T-3, T-4, T-6 can run in parallel (different files)
        ├── IFC-T-6 (QA catalog)       ─┤
        └── IFC-T-5 (SQL, HITL apply)  ─┤
                                        └── IFC-T-7 (end-to-end + docs)
```
Tests: only one Jest run at a time even when tasks run in parallel.

## 5. Coverage map (scenario/clause → task)

| Requirement clause | Task |
|---|---|
| R-1 main scenario + "must NOT appear for other types" + "MUST disappear and clear" | T-4 |
| R-1 out-of-scope (2025, bilateral, IPSR) | T-4 (UI) · T-5 (green check) · T-7 (manual) |
| R-2, R-3 wording, verbatim copy, no developer note, same text in 2030 | T-4 · T-7 visual |
| R-4 second row does not overwrite / survives reload | T-3 (server) · T-4 (select) · T-7 |
| R-4 "other types stay disabled" | T-4 |
| R-5 Households hides the grid, total required, values cleared; Individuals restores; other types untouched | T-4 · T-7 |
| R-6 missing answer → not green / no Submit; answering → green | T-5 · T-4 (feedback) · T-7 |
| R-6 "2025 / bilateral keep today's outcome" | T-5 checks.sql |
| R-7 only 4 codes; unknown → empty; old rows untouched | T-2 |
| R-8 replication | T-2 (lists) · T-7 (real duplicate); recovery needs no change (design §3), confirmed in T-7 |
| R-9 catalog | T-6 |
| R-10 totals, use level, IPSR, bilateral unchanged | T-2 (no reader touched) · T-4 (IPSR spec) · T-7 (total identical) |

## 6. PR strategy

~550 LOC → two PRs:
1. **PR 1, server + data:** T-2, T-3, T-6 (+ T-5 SQL files). Review the migration and the replicate lists first.
2. **PR 2, client:** T-4 + T-7 docs. Depends on PR 1 being deployed so the fields round-trip.
