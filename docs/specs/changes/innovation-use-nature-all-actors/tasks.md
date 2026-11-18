# Tasks — Innovation Use: `use_nature` on every actor type (W1/W2 + W3/Bilateral)

> **Answer first:** 11 tasks in two code cuts. Cut 1 is the server and the contract docs: T-1 to T-5 plus T-9. Cut 2 is the UI and the green check: T-6, T-7 and T-8. T-10 handles the fetcher docs and its promotion to `main` at prod time. T-11 covers the TEST/prod release, the E2E and the dates for Daniel. About 1,150 LOC, ~14 review rounds.

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `changes/innovation-use-nature-all-actors` (INC-168062) |
| Linked spec | `./requirements.md` · `./design.md` · `./proposal.md` |
| Ticket / due | Freshservice INC-168062 · due Fri 2026-11-20 |
| Owner / driver | Santiago Sánchez (PRMS) |
| Branch | `qa-development-2026-ss` (TEST route via `performance-refactor`, P-22) |
| Status | in-progress |
| Commit format | `<emoji> <type>(<scope>) [INC-168062]: <description> [SPEC:changes/innovation-use-nature-all-actors]` |

**Routing for every task** (from root `## Model Routing`): Implementer T2 `sonnet` · Reviewer T3 `opus` (author ≠ auditor) · Leader T1.
**Backend route:** the project `## Skill Map` (no `backend-routing.md` in this repo; design Document Control).
**Design route:** reuse existing primitives only (`app-pr-radio-button`, `pr-native-radio`, `--pr-text*` tokens). No new visual direction, so `impeccable-bridge` is not loaded.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-18, Phase 1 "Continue").
- [x] `design.md` approved (2026-11-18, Phase 2 "Continue").
- [ ] OQ-5 / OQ-6 / OQ-7 resolved, or explicitly carried. OQ-7 (Nicoleta's red comments) can change copy only. It does not block T-1..T-5.
- [x] No conflicting in-flight spec on `result_actors` follow-up. P2-4106 (`bilateral/innovation-use-actor-follow-up`) is the base this spec extends. IFC and IUY are archived.
- [x] No migration. The columns already exist (`1793300000000`), so `migration:check` should stay green unchanged.
- [ ] SR-168253 commits `4123fddf0` and `a383b1323` are pushed or set aside first, so the INC-168062 commits don't mix with them.
- [ ] The uncommitted `filter-multi-select` changes (not part of this spec) are stashed or committed by their owner before T-1.

## 3. Task list

### [x] INA-T-1 — `use_nature` asked of every actor type in the bilateral rules

- **Type:** server
- **Description:** In `farmer-follow-up.constant.ts`, `asksUseNature` returns true for any resolved actor type. `asksCountUnit` is untouched. In the bilateral rules:
  - Step 4 never nulls `use_nature`.
  - Step 6 warns `actor_use_nature_missing` on any type.

  `actor_use_nature_not_applicable` stays declared in `BilateralActorWarningCode` with a "retired — no longer emitted (INC-168062)" comment (DD-1, DD-4).
- **Implements:** INA-R-1 (rules part), INA-R-2, INA-R-3, INA-R-4 · INA-AC-1 (rules), INA-AC-2, INA-AC-3 · DD-1, DD-4
- **Files (expected):** `onecgiar-pr-server/src/api/results/result-actors/farmer-follow-up.constant.ts`, `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts`, `…/innovation-use-actor-follow-up.rules.spec.ts`
- **Depends on:** —
- **Blocks:** INA-T-2, INA-T-9
- **Estimate:** S (~25 prod / ~110 test LOC)
- **Review:** full (shared predicate, payload contract)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** Run the rules on Daniel's 10120 actors (`actor_type_id 2`, 25 `information_received` + 12 `innovation_applied`). Correct: both rows keep their `use_nature` and the result has no `actor_use_nature_not_applicable`. Wrong: either row reaches the writer with `use_nature` NULL. Also wrong if a type-4 row with `count_unit: 'households'` keeps the unit; it must still be nulled with `actor_count_unit_not_applicable`.
  - **Red run:** `npx jest src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.spec.ts --silent --reporters=summary`. The new cases (types 2–5 keep nature, missing → warning on types 2–5, no `not_applicable`) fail before the change and pass after. The existing `count_unit` cases stay green.
  - **Disqualifier:** A reader of `asksUseNature` exists outside the rules file (contradicts P-1), or a client or external reader of `actor_use_nature_not_applicable` turns up (contradicts P-18). Either one → stop and re-specify DD-1/DD-4.
  - **Consumers:** `asksUseNature` readers are `innovation-use-actor-follow-up.rules.ts:98,:107,:113,:120` only (P-1). Specs asserting the old warnings: `innovation-use-actor-follow-up.rules.spec.ts`, `innovation-use.handler.spec.ts`, `bilateral.service.spec.ts` (P-18). T-1 updates the rules spec. If the other two go red, fix them in T-2 and say so in the report.
- **Definition of done:**
  - [ ] Rules spec covers R-1 (both Daniel payloads, rules level), R-2 (types 2, 3, 4, 5), R-3, and R-4 (BIF cases unchanged).
  - [ ] `npx tsc --noEmit -p .` and `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` clean.
  - [ ] No secret in logs (`.cursorrules`). The log line still prints counts per code only.

### [x] INA-T-2 — Duplicate rule (step 9) for every actor type, new message

- **Type:** server
- **Description:** Bilateral step 9 runs for every type on rows without `result_actors_id`. The identity is: type + (`other_actor_type` when type 5) + `count_unit` + `use_nature`, where empty equals empty. A repeat emits `actor_duplicate_merged` with the exact new message: `Another actor of the same type with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins.` Update the handler and service specs that assert the warning list (DD-2). **Amended 2026-11-18 (user-approved):** `prepareActors` in `innovation-use.handler.ts` also sets `use_nature` as an explicit property on every actor row it returns, `null` when absent (design §5, DD-3 amendment). Then a same-type pair where only one row carries the field is stored as two rows, matching the rules.
- **Implements:** INA-R-5, INA-R-1 (end-to-end warning list) · INA-AC-1 (handler/service), INA-AC-4 · DD-2, DD-3 (amended)
- **Files (expected):** `…/bilateral/handlers/innovation-use-actor-follow-up.rules.ts`, `…/rules.spec.ts`, `…/bilateral/handlers/innovation-use.handler.ts`, `…/bilateral/handlers/innovation-use.handler.spec.ts`, `…/bilateral/bilateral.service.spec.ts`
- **Depends on:** INA-T-1
- **Blocks:** INA-T-9
- **Estimate:** S (~20 prod / ~90 test LOC)
- **Review:** full (payload contract: warning text)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** Each wrong outcome below breaks the task:

    | Input | Expected |
    |---|---|
    | Two Researchers rows, same nature | Exactly one `actor_duplicate_merged` with the new text |
    | Two Researchers rows, different nature (10120) | No warning |
    | Two Other rows, different `other_actor_type`, same nature | No warning |
    | Two Farmers rows, same unit and nature | One warning (BIF behaviour kept) |
    | Researchers with `information_received` + Researchers with no `use_nature` (through `prepareActors` and the real writer) | Two stored rows, no warning |
    | Two Researchers rows, both without `use_nature` | One stored row and one `actor_duplicate_merged` |
  - **Red run:** `npx jest src/api/bilateral/handlers src/api/bilateral/bilateral.service.spec.ts --silent --reporters=summary`. The new step-9 cases fail before and pass after.
  - **Disqualifier:** The rules key cannot be made equal to what the v2 writer merges on, for example because the writer key from T-3 needs a field the rules do not see. Stop and reconcile DD-2 with DD-3.
  - **Consumers:** The warning message is read by `rules.spec.ts`, `innovation-use.handler.spec.ts`, `bilateral.service.spec.ts` and the contract doc (P-18). The doc changes in T-9.
- **Definition of done:**
  - [ ] Message text is identical in code, specs and (in T-9) the doc.
  - [ ] tsc + eslint clean.

### [x] INA-T-3 — v2 writer: same-type rows apart by nature (presence-gated)

- **Type:** server
- **Description:** In `saveAnticipatedInnoUser` (`innovation-use.service.ts:474-500`), for a row without `result_actors_id`:
  - Non-Farmers types: add `use_nature` to the match **only when `'use_nature' in row`**. Empty matches `IsNull()`. For type 5, keep the `other_actor_type` key too.
  - Farmers: keep the always-on `count_unit` + `use_nature` key (DD-3).

  Add a dedicated spec `innovation-use.service.nature-all-actors.spec.ts` that asserts the real `where` the writer builds for each row class, and one test class per caller (KZ lesson KZ-changes--innovation-use-farmer-count-nature-1).
- **Implements:** INA-R-6, INA-R-1 (storage) · INA-AC-5 · DD-3
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts`, new `…/innovation-use.service.nature-all-actors.spec.ts`, plus touch-ups in `…farmer-count-nature.spec.ts`, `…farmer-follow-up.spec.ts` if they assert the old `where`
- **Depends on:** —
- **Blocks:** INA-T-6 (E2E meaning), INA-T-11
- **Estimate:** M (~40 prod / ~170 test LOC)
- **Review:** lenses (shared writer with 4 callers, correctness-critical identity)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** Each wrong outcome below breaks the task:

    | Input | Expected |
    |---|---|
    | (a) Two new Researchers rows with the property, `information_received` / `innovation_applied` | Two inserts. Today the second one updates the first |
    | (b) A Researchers row **without** the property, existing active Researchers row stored | An update, not an insert (review update `results.service.ts:5434`, `innovation_dev.service.ts:229`) |
    | (c) Farmers, any case | Same `where` as before |
    | (d) Other rows with different `other_actor_type` | Two rows |
  - **Red run:** `npx jest src/api/results-framework-reporting/innovation-use --silent --reporters=summary`. Case (a) fails before the change and passes after. Cases (b)–(d) pass before and after; they guard against regressions.
  - **Disqualifier:** A fifth production caller of `saveAnticipatedInnoUser` appears (contradicts P-6). Or a caller sends `use_nature` on rows whose stored nature it does not know, which would make DD-3 duplicate rows. Stop and re-specify DD-3.
  - **Consumers:** `saveAnticipatedInnoUser` callers (P-6):
    - `innovation-use.service.ts:359, :367` (v2 save; sends the property on every row, P-7)
    - bilateral via `saveInnovationUse` (P-3, P-23)
    - `results-framework-reporting/innovation_dev/innovation_dev.service.ts:229`
    - `results/results.service.ts:5434`

    Specs that mock it: `use-level`, `bilateral-detail`, `current-use-update`, `innovation_dev.service.spec`, `bilateral.service.innovation-use-summary.spec`. All must stay green.
- **Definition of done:**
  - [ ] One test per caller class (with property / without property) asserting the built `where`.
  - [ ] Full innovation-use folder green; tsc + eslint clean.

### [x] INA-T-4 — Legacy writer persists both codes (presence-gated) + read-mapper comment

- **Type:** server
- **Description:** In `results/summary/innovation_dev.service.ts`, both the update branch (`:254-273`) and the save branch (`:283-300`) write `count_unit` / `use_nature` through `toCountUnit` / `toUseNature`, **only when the key is present** on the incoming row (DD-9). Update the stale comment of the bilateral read mapper (`bilateral.service.ts:2966-2967`) so it no longer says the values are Farmers-only. **Amended 2026-11-18 (user-approved, from the INA-T-3 review):** apply the same presence rule to the v2 writer as well. In `innovation-use.service.ts` `buildActorData` (`:693-694`), `count_unit` / `use_nature` join the payload only when the incoming row has the key. A caller that omits them (review drawer `results.service.ts:5434`, `innovation_dev.service.ts:229`) no longer turns a stored answer into NULL on the row it updates. This enforces the requirements NFR "No caller of either writer may clear stored answers it did not send" (requirements §7) for both writers.
- **Implements:** INA-R-21 (persistence), INA-R-6 + NFR (no clearing of unsent answers) · INA-AC-11 (server part), INA-AC-5 · DD-9 (amended)
- **Files (expected):** `onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts`, `…/innovation_dev.service.spec.ts`, `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts` (`buildActorData` only), `…/innovation-use.service.nature-all-actors.spec.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (comment only)
- **Depends on:** —
- **Blocks:** INA-T-8
- **Estimate:** S (~25 prod / ~80 test LOC)
- **Review:** full (shared writer, 3 callers)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** Each wrong outcome below breaks the task:

    | Input | Expected |
    |---|---|
    | A row with `use_nature: 'innovation_applied'` | Saved with that code |
    | A row without the key, over an actor that stores `information_received` | Stored value unchanged (Result Review path `summary.service.ts:898`) |
    | An invalid code | Stored as NULL, matching the v2 helpers' contract |
    | v2 writer: review update (caller `results.service.ts:5434`) of a Researchers row storing `innovation_applied`, sent without the key | `use_nature` stays `innovation_applied` |
    | v2 writer: Centre save of the same row with `use_nature: null` | Stored as NULL, because the key was sent |
  - **Red run:** `npx jest src/api/results/summary src/api/results-framework-reporting/innovation-use --silent --reporters=summary`. The "key present → written" legacy case and the "v2 review update keeps the stored nature" case both fail before and pass after.
  - **Disqualifier:** `toCountUnit` / `toUseNature` are not importable from the legacy module without a circular import. Stop and re-specify where the helpers live; don't copy them.
  - **Consumers:** Legacy `saveAnticipatedInnoUser` callers `summary.service.ts:91, :107, :898` (P-13). Spec `summary.service.spec.ts` must stay green.
- **Definition of done:**
  - [ ] Both branches covered with key present and key absent.
  - [ ] tsc + eslint clean.

### [x] INA-T-5 — QA catalog: `use_nature` required for every type

- **Type:** server
- **Description:** In `qa-catalog/definitions/sections/innovation-use.ts`, the `use_nature` sub-rule uses `ALWAYS`; `count_unit` keeps `FARMERS_RULE`. Bump `CATALOG_VERSIONS[2026].revision` 34 → 35 in `versions.ts`. Regenerate the snapshot (`npm run qa-catalog:snapshot`). Add the v-row in `docs/qa-catalog.en.md` and update the `actor_use_nature` row (`:586`) (DD-8).
- **Implements:** INA-R-11 · INA-AC-8 · DD-8
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/innovation-use.ts`, `…/definitions/versions.ts`, `…/__snapshots__/qa-catalog.snapshot.json`, `…/qa-catalog.innovation-use.spec.ts`, `onecgiar-pr-server/docs/qa-catalog.en.md`
- **Depends on:** —
- **Blocks:** INA-T-11
- **Estimate:** S (~10 prod / ~30 test / ~15 doc LOC + snapshot)
- **Review:** checklist
- **Skills:** `nestjs-expert`
- **Verification:**
  - **Falsifier:** The catalog GET for 2026 must report `catalog_version` `2026.35`, and `use_nature` with no `actor_type` condition in `visible_when` / `required_when`. A Farmers-only condition on `use_nature`, or an unchanged version, means the task is wrong.
  - **Red run:** `npx jest src/api/qa-catalog --silent --reporters=summary`. The updated innovation-use assertion fails before and passes after. The snapshot spec passes only after regeneration.
  - **Disqualifier:** The revision is not 34 when work starts, because another spec bumped it. Rebase on the new value and say so. That is a re-number, not a stop.
  - **Consumers:** Catalog consumers cache by `catalog_version` (P-17). No code reader in PRMS outside `qa-catalog/`.
- **Definition of done:**
  - [ ] Snapshot regenerated, not hand-edited.
  - [ ] Doc v-row names the spec and the new version.

### [x] INA-T-6 — Centre form: nature question on every row, scope vs mandatory, every type repeatable

- **Type:** client
- **Description:** In the shared `innovation-use-form` (DD-5, DD-6):
  - Add `isFollowUpScope()`: not IPSR and phase ≥ 2026, any source.
  - Add `isFollowUpMandatory()`: scope and not W3.
  - Add `isNatureFollowUpRow(actor)`: scope, active, type selected.
  - Re-point `removeOther` and `isFarmerFollowUpRow` to the scope. `isFarmerFollowUpResult()` keeps its W1/W2 meaning for the youth rules (`:711`, `:727`).
  - Split the `#farmerFollowUp` template:
    - Farmers part (title + unit question) under `isFarmerFollowUpRow`.
    - Nature part (question card, no title) under `isNatureFollowUpRow`.
    - Both blocks reach it through the existing outlets (`.html:120`, `:561`).
  - `[required]` is bound to `isFollowUpMandatory()`.
  - `onActorTypeChange` clears only `count_unit`, and restores the grid when leaving Households. `use_nature` is kept.
  - Inside the scope, every type stays enabled in the type select, so every type can repeat.
- **Implements:** INA-R-7, INA-R-8, INA-R-9, INA-R-20 · INA-AC-6, INA-AC-11 (shared form) · DD-5, DD-6
- **Files (expected):** `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.{ts,html,scss}`, `…/innovation-use-form.component.spec.ts`, possibly `…/farmer-follow-up.ts` (copy constants only if OQ-7 changes copy)
- **Depends on:** — (code) · INA-T-3 for the save to keep two same-type rows end to end
- **Blocks:** INA-T-7 (release order), INA-T-11
- **Estimate:** M (~120 prod / ~190 test LOC)
- **Review:** full (shared component with 4 gate readers, youth regression risk)
- **Skills:** `angular-developer`, `tailwind-design-system` (existing tokens only), `tdd`
- **Verification:**
  - **Falsifier:** Each wrong outcome below breaks the task:

    | Result / action | Expected |
    |---|---|
    | 2026 W1/W2, Researchers row | Shows the nature card without the Farmers title; marked REQUIRED; no unit question |
    | Same result, Farmers row | Title + both questions, unchanged |
    | W3 2026 result | Both cards shown without REQUIRED; youth hint/derivation unchanged vs today |
    | Farmers households → Policy actors | `count_unit` null, `use_nature` kept, grid restored |
    | Add a second Researchers row | Allowed |
    | IPSR or phase < 2026 | Nothing changes |
  - **Red run:** `npx jest src/app/shared/components/innovation-use-form --silent --reporters=summary --no-coverage`. The new cases fail before and pass after. The existing youth and W3-2030 cases stay green.
  - **Disqualifier:** A reader of `isFarmerFollowUpResult()` other than the four in P-9 exists. Or the W3 2030 block (IWH) becomes visible. Stop and re-specify DD-5.
  - **Consumers:**
    - `isFarmerFollowUpResult`: `removeOther` `:516`, `isFarmerFollowUpRow` `:554`, youth `:711`, `:727`.
    - `isFarmerFollowUpRow`: `isHouseholdsRow` `:559`, `.html:853`.
    - `isHouseholdsRow`: `.html:128, :263, :568, :680`.

    Hosts of the shared form: `innovation-use-info.component.ts` (P-7, P-8). Other `removeOther` implementations are not touched (P-10).
- **Definition of done:**
  - [ ] Radio `name` unique per row object (two Researchers rows do not share a radio group).
  - [ ] `npx ng lint --quiet` + client jest clean; zoneless spec `innovation-use-form.zoneless.spec.ts` green.
  - [ ] Visual check at the HITL pause: W1/W2 and W3 screenshots, both blocks (defect class "layout", no automated gate). T6 review if available.
  - [ ] No new i18n keys or tokens. Copy comes from `farmer-follow-up.ts`.

### [ ] INA-T-7 — Green check: `use_nature` required on every type (SQL, manual)

- **Type:** db (manual SQL, outside migrations)
- **Description:** Five steps:
  1. Santiago runs `SHOW CREATE FUNCTION validation_innovation_use_P25` on prtest. This settles P-16.
  2. Save the result as `sql/validation_innovation_use_P25.before.sql`.
  3. Build `…after.sql` and `…after.body-only.sql` from the live body. Split the Farmers-only condition into: (a) Farmers with an invalid `count_unit`, and (b) any type with an invalid `use_nature`. Apply this to sections 1 and 2, with the same gates (`phase_year >= 2026`, `source <> 'API'`) (DD-7).
  4. Write `sql/checks.sql`: counts per scenario before and after, including the OQ-1 impact query from proposal §12.1.
  5. Apply on prtest right after cut 2 deploys. Apply on prod at the prod deploy.
- **Implements:** INA-R-10 · INA-AC-7 · DD-7
- **Files (expected):** `docs/specs/changes/innovation-use-nature-all-actors/sql/validation_innovation_use_P25.before.sql`, `…after.sql`, `…after.body-only.sql`, `…/sql/checks.sql`
- **Depends on:** INA-T-6 (users must be able to answer before the check requires it)
- **Blocks:** INA-T-11
- **Estimate:** S (~90 SQL LOC, mostly the copied body)
- **Review:** lenses (live DB function, no automated gate)
- **Skills:** `systematic-debugging` (diff the live body against the archived one)
- **Verification:**
  - **Falsifier:** Run `checks.sql` on prtest before and after the change:

    | Result | Expected after |
    |---|---|
    | 2026 W1/W2, active Researchers row with NULL `use_nature` | Section not green (was green) |
    | Same result once answered | Green |
    | W3 / `source = 'API'` result with NULL nature | Unchanged |
    | Farmers with NULL `count_unit` | Still not green |
  - **Red run:** n/a (no test gate). Gate = `checks.sql` before/after on prtest, recorded at a HITL pause.
  - **Disqualifier:** The live body differs from the archived copy in a way that touches the actor conditions (P-16 false). Rebuild from the live body, record the diff, then continue. If the function no longer exists or has been renamed, stop.
  - **Consumers:** Every caller of `validation_innovation_use_P25`. Green checks for Innovation Use results with phase ≥ 2026. OQ-1 impact query count goes into the report so SO knows how many existing results turn yellow.
- **Definition of done:**
  - [ ] `before.sql` saved from the live body (rollback = re-apply it).
  - [ ] Counts before/after pasted into `execution.md`.
  - [ ] No credentials or connection strings in any file (`.cursorrules`).

### [x] INA-T-8 — Bilateral editor: show and save both answers on actor cards

- **Type:** client
- **Description:** In `type-innovation-use` `#actorCard` (`.html:344`), current-use cards with a type selected and a phase ≥ 2026 show:
  - the unit question on Farmers cards;
  - the nature question on every card.

  Use the shared copy constants (`farmer-follow-up.ts`) and the native-radio pattern. Households routes to the card's existing "does not apply" single-total handler (`.ts:597-606`). Leaving Farmers clears `count_unit`. Each change calls `onFieldChange()` (autosave). No REQUIRED marker, and the answers are not added to `mdsTracker` (DD-10, P-15).
- **Implements:** INA-R-21 · INA-AC-11 (bilateral editor) · DD-10
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.{ts,html,scss}`, `…/type-innovation-use.component.spec.ts`
- **Depends on:** INA-T-4 (the save must persist the codes)
- **Blocks:** INA-T-11
- **Estimate:** M (~80 prod / ~110 test LOC)
- **Review:** full
- **Skills:** `angular-developer`, `tailwind-design-system` (existing tokens only), `tdd`
- **Verification:**
  - **Falsifier:** Each wrong outcome below breaks the task:

    | Card / action | Expected |
    |---|---|
    | Researchers card on a 2026 uploaded result | Shows the nature question and no unit question |
    | Picking `innovation_applied` | The PATCH payload carries `use_nature: 'innovation_applied'` on that row |
    | Farmers → Households | Single-total path, as today |
    | Completeness | `mdsTracker` output unchanged |
    | Pre-2026 card | Shows nothing new |
  - **Red run:** `npx jest src/app/pages/bilateral/components/section-type-specific/type-innovation-use --silent --reporters=summary --no-coverage`. The new cases fail before and pass after.
  - **Disqualifier:** The editor saves through a path other than `PATCH summary/innovation-use/create/result/:id` (contradicts P-11), or loaded rows do not carry the stored codes. Stop and re-specify DD-9/DD-10.
  - **Consumers:** `onFieldChange` / autosave and `updateMds` (`:896`), unchanged. No shared symbol moves.
- **Definition of done:**
  - [ ] Visual check at the HITL pause (screenshot of a card with both questions).
  - [ ] `npx ng lint --quiet` + client jest clean.

### [x] INA-T-9 — PRMS contract docs + Swagger

- **Type:** docs
- **Description:** Update `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (DD-11):
  - the actor follow-up table (`:324-333`);
  - the ingestion steps (`:512-528`);
  - the messages (`:535-546`): new duplicate text, `actor_use_nature_not_applicable` marked "retired — no longer emitted";
  - inactive rows (`:553`);
  - the alignment note (`:561-563`);
  - a new change-log row (INC-168062) after `:741`.

  Update the Swagger text on `InnovationUseActorDto.use_nature` (`create-bilateral.dto.ts:489-500`). Fold in `requirements.md` §10 (field-alignment note for SO). **Amended 2026-11-18 (user-approved):** also correct the stale line "Otros tipos: solo por tipo" in `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md`, so it describes the presence-gated `use_nature` key (DD-3) and the bilateral normalisation (§5).
- **Implements:** INA-R-12 (PRMS side) · INA-AC-9 · DD-11
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`, `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts`, `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md`
- **Depends on:** INA-T-1, INA-T-2 (final rule and message text)
- **Blocks:** INA-T-10
- **Estimate:** S (~50 doc LOC)
- **Review:** checklist
- **Skills:** `cognitive-doc-design`, `api-design-principles`
- **Verification:**
  - **Falsifier:** `grep -n "Farmers" onecgiar-pr-server/docs/bilateral-result-summaries.en.md` must not show a sentence that limits `use_nature` to Farmers. The new duplicate message must be byte-identical to `rules.ts`.
  - **Red run:** n/a (no test gate). Gate = grep check + `npx tsc --noEmit -p onecgiar-pr-server` (Swagger text compiles).
  - **Disqualifier:** none beyond T-1/T-2 changing again. Re-sync the text.
  - **Consumers:** External bilateral producers read the change log. Point Daniel to the new row in T-11.
- **Definition of done:**
  - [ ] Change-log row dated, names INC-168062 and the spec.

### [ ] INA-T-10 — Fetcher docs + promotion `dev-fetcher` → `main` (other repo)

- **Type:** docs + rollout (repo `onecgiar_result_functions`)
- **Description:** On a branch from `dev-fetcher`, update:
  - `services/fetcher/src/docs/guides/08-innovation-use.md` (`use_nature` on every actor type, `count_unit` Farmers only);
  - `…/guides/02-changelog.md`;
  - `…/docs/openapi.json`;
  - the `use_nature.description` in `services/fetcher/src/validator/schemas/innovation_use.json`. Text only: **no enum or condition change** (P-20).

  At prod time, promote `dev-fetcher` → `main` in the same window as PRMS prod. Without that, AJV `removeAdditional` keeps stripping `use_nature` on prod.
- **Implements:** INA-R-12 (fetcher side), INA-R-13 · INA-AC-9, INA-AC-10 (prod step) · DD-11
- **Files (expected):** the four fetcher files above
- **Depends on:** INA-T-9 (same wording)
- **Blocks:** INA-T-11 (prod step)
- **Estimate:** S (~40 doc LOC)
- **Review:** checklist
- **Skills:** `cognitive-doc-design`
- **Verification:**
  - **Falsifier:** `git diff dev-fetcher -- services/fetcher/src/validator/schemas/innovation_use.json` must show only `description` changes. After the promotion, `git log origin/main..origin/dev-fetcher --no-merges` must not list `7a27c43`.
  - **Red run:** n/a (no test gate). Gate = the two git checks above + the fetcher's own test command if the repo has one for schemas.
  - **Disqualifier:** `dev-fetcher` carries unrelated commits that SO/owners don't want on prod. Stop and ask for a cherry-pick plan. Do not promote blindly.
  - **Consumers:** Every producer posting to `/ingest`. The schema logic is unchanged, so validation does not change.
- **Definition of done:**
  - [ ] PR on the fetcher repo. The promotion is done only with explicit owner go-ahead (HITL, outward-facing).

### [ ] INA-T-11 — Release to TEST and prod, E2E, dates for Daniel

- **Type:** rollout
- **Description:**
  - Cut 1 (T-1..T-5 + T-9) → push → merge to `performance-refactor` → PRMS TEST.
  - Re-post Daniel's 10120 and six-actor payloads, directly and via `/ingest` on TEST (settles P-21 and P-22).
  - Cut 2 (T-6..T-8) → same route, then apply T-7 on prtest.
  - Prod: PRMS prod + T-10 promotion + T-7 on prod in one window.
  - Reply on INC-168062 with the TEST date, the prod date and the doc links.
- **Implements:** INA-R-13 · INA-AC-10 · rollout §11
- **Files (expected):** `docs/specs/changes/innovation-use-nature-all-actors/execution.md` (evidence)
- **Depends on:** INA-T-1..T-10
- **Blocks:** —
- **Estimate:** S (wall-clock bound by deploy windows)
- **Review:** checklist
- **Skills:** —
- **Verification:**
  - **Falsifier:** On TEST:

    | Check | Expected |
    |---|---|
    | 10120 payload | Two active Researchers rows (25 `information_received`, 12 `innovation_applied`), no `not_applicable` warning |
    | Six-actor payload | Every row stores its nature |
    | Bilateral read (`GET /api/bilateral/:id`) | Returns those values |
  - **Red run:** n/a (no test gate). Gate = manual E2E recorded at a HITL pause.
  - **Disqualifier:** TEST shows merged rows after cut 1. Diagnose with `systematic-debugging` before cut 2. Do not ship UI on a broken server.
  - **Consumers:** Daniel Lozano (uploader), Nicoleta Trifa (SO), SO "PRMS Normalizer Technical Field Documentation".
- **Definition of done:**
  - [ ] Evidence (request/response with tokens redacted) in `execution.md`.
  - [ ] Ticket reply sent by Santiago (outward-facing, never by the agent without approval).

## 4. Dependency graph

```
INA-T-1 ── INA-T-2 ── INA-T-9 ── INA-T-10 ─┐
INA-T-3 ─────────────────── INA-T-6 ── INA-T-7 ─┤
INA-T-4 ── INA-T-8 ─────────────────────────────┼── INA-T-11
INA-T-5 ────────────────────────────────────────┘
```

Parallel-safe from the start: T-1, T-3, T-4, T-5 (disjoint files). T-6 can be coded in parallel with T-3; only its E2E meaning depends on T-3. T-1 and T-2 touch the same rules file, so they run in series. **Measurement commands (jest/build) never run while a delegated agent is active** (root concurrency rule).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| INA-TEST-1 | unit (server) | R-1, R-2, R-3, R-4 · AC-1, AC-2, AC-3 | `…/bilateral/handlers/innovation-use-actor-follow-up.rules.spec.ts` |
| INA-TEST-2 | unit (server) | R-5, R-1 · AC-1, AC-4 | `rules.spec.ts`, `innovation-use.handler.spec.ts`, `bilateral.service.spec.ts` |
| INA-TEST-3 | unit (server, real `where`) | R-6 · AC-5 | `…/innovation-use/innovation-use.service.nature-all-actors.spec.ts` |
| INA-TEST-4 | unit (server) | R-21 · AC-11 | `…/results/summary/innovation_dev.service.spec.ts` |
| INA-TEST-5 | unit + snapshot (server) | R-11 · AC-8 | `…/qa-catalog/qa-catalog.innovation-use.spec.ts`, `qa-catalog.snapshot.spec.ts` |
| INA-TEST-6 | component (client, jsdom) | R-7, R-8, R-9, R-20 · AC-6, AC-11 | `…/innovation-use-form/innovation-use-form.component.spec.ts` |
| INA-TEST-7 | SQL before/after (prtest) | R-10 · AC-7 | `sql/checks.sql` |
| INA-TEST-8 | component (client) | R-21 · AC-11 | `…/type-innovation-use/type-innovation-use.component.spec.ts` |
| INA-TEST-9 | doc grep | R-12 · AC-9 | T-9 / T-10 falsifiers |
| INA-TEST-10 | manual E2E (TEST) | R-13, R-1 · AC-10 | `execution.md` |

Coverage stays above the server (5/20/35/40) and client (50/60/60/60) thresholds.

## 6. PR strategy, budget and review depth

| Cut | Tasks | Prod LOC | Test LOC | Docs/SQL LOC | Ships to |
|---|---|---|---|---|---|
| 1 — server + contract | T-1, T-2, T-3, T-4, T-5, T-9 | ~120 | ~480 | ~65 | TEST first, for Daniel to re-test |
| 2 — UI + green check | T-6, T-7, T-8 | ~200 | ~300 | ~90 | TEST, then prod |
| Fetcher | T-10 | — | — | ~40 | prod window |
| **Total** | 11 | **~320** | **~780** | **~195** | |

Within the design budget (~1,150 ± tripwire 1,450 LOC / 420 prod LOC / 18 rounds). Design §11 said cut 1 = T-1..T-5. T-9 moved into cut 1 because every bilateral payload change must ship with its change-log row (root `CLAUDE.md`). Design §11 updated to match.

| Review depth | Tasks |
|---|---|
| lenses | T-3, T-7 |
| full | T-1, T-2, T-4, T-6, T-8 |
| checklist | T-5, T-9, T-10, T-11 |
| skip-eligible | none. Every task touches a shared symbol, a contract or a live surface |

## 7. Rollout & verification

- [ ] Commits follow `<emoji> <type>(<scope>) [INC-168062]: …`. Commit only when Santiago asks.
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] Cut 1 on TEST → Daniel re-tests → TEST date posted.
- [ ] Cut 2 on TEST → `checks.sql` before/after on prtest → visual check.
- [ ] Prod window: PRMS prod + fetcher promotion + green check on prod → prod date posted.
- [ ] Change-log entry pointed out to producers (Daniel).

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`. Run `/akili-archive`.
- [ ] Follow-ups from design §14:
  - AI QA payload fields;
  - review drawer display (DD-12);
  - no client hint for same-type rows with the same nature.

## 9. Roll-back plan

1. Revert the cut-2 commits, then the cut-1 commits (reverse order). Stored codes stay valid (whitelisted values).
2. Re-apply `sql/validation_innovation_use_P25.before.sql` on the affected DB.
3. Fetcher: no rollback needed. The schema logic is unchanged and only text moved. If `main` must go back, revert the promotion merge with the owner's approval.
4. Verify `GET /api/bilateral/:id` shape is unchanged (it never changed) and post a change-log "reverted" row.
5. Notify Daniel / SO.

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `onecgiar-pr-server/docs/qa-catalog.en.md` · `docs/specs/bilateral/innovation-use-actor-follow-up/` · `docs/specs/archive/2026-11-12-bugfix--innovation-use-youth-required/sql/`
