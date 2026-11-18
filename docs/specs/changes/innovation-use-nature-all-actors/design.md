# Design — Innovation Use: `use_nature` on every actor type (W1/W2 + W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-nature-all-actors` |
| Requirements | `./requirements.md` (approved 2026-11-18, Santiago — Phase 1 "Continue") |
| Status | approved (2026-11-18, Santiago — Phase 2 "Continue"; judgment-day not run, user chose Continue) |
| Depth | Standard + rollout/rollback |
| Verified at | `qa-development-2026-ss` @ `a383b1323` (PRMS) · `onecgiar_result_functions` `main` @ `314f3f2`, `origin/dev-fetcher` contains `7a27c43` |
| Skills | Server: `nestjs-expert`, `tdd`, `api-design-principles` · Client: `angular-developer`, `tailwind-design-system` (existing tokens only) · Docs: `cognitive-doc-design` |
| Backend routing | `software-architect/references/backend-routing.md` not present in this repo (`.claude/skills/` holds only openspec-* and spartan) — backend leads follow the project `## Skill Map`; said once here |
| Design route | Reuse of existing primitives (`app-pr-radio-button`, `pr-native-radio`), no new visual direction; `impeccable-bridge` not loaded — no new surface, page mode unchanged |

## 1. Summary

One server predicate flips, one rules key widens, and the shared writer learns to tell same-type rows apart by their nature — **only for rows that carry the field**, so the four callers that do not send it keep today's behaviour. The client splits the Farmers block into a Farmers part (title + unit) and a nature part (every row), separates "where the questions show" (follow-up scope, W1/W2 **and** W3) from "where they are mandatory" (W1/W2 only), and lets every type repeat. The live green-check function drops `actor_type_id = 1` for `use_nature`. The bilateral editor gains the questions and its legacy writer persists them, presence-gated. Docs in both repos; release cut 1 = server, cut 2 = UI + SQL; prod with the fetcher `main` promotion.

## 1A. Premise Ledger

Count: 20 verified · 3 `UNVERIFIED` (High: 1, Low: 2).
Blast-radius triggers: `live-path` (user actions: bilateral POST, Centre form save, bilateral editor save) · `shared-state` (`asksUseNature`, the follow-up gate predicates, `saveAnticipatedInnoUser`, legacy `saveAnticipatedInnoUser`) · `consumer` (warning codes/messages, `result_actors.use_nature` readers, QA catalog, contract doc).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `asksUseNature` is the only switch for `use_nature` applicability and its only reader is the bilateral rules file | shared-state | `grep -rn "asksUseNature\|asksCountUnit" onecgiar-pr-server/src --include=*.ts` (non-spec) → definition `farmer-follow-up.constant.ts:53,:56`; readers `innovation-use-actor-follow-up.rules.ts:91,:98,:107,:113,:120` only | a383b1323 | DD-1 must touch other readers (High) | — |
| P-2 | Bilateral step 9 (duplicate warning) runs only for Farmers and keys on `count_unit|use_nature` | location | `innovation-use-actor-follow-up.rules.ts:139-151` | a383b1323 | DD-2 changes (Low) | — |
| P-3 | Live path of a bilateral create: `POST /api/bilateral/create` → handler `applyFollowUpRules` (`innovation-use.handler.ts:193-214`) → rules → `prepareActors` (`:175-191`) → `InnovationUseService.saveInnovationUse` → `saveAnticipatedInnoUser` (`innovation-use.service.ts:410`); resubmission deactivates every stored actor first (`bilateral-resubmission.service.ts:1127-1130`) | live-path | file:line as listed | a383b1323 | Rules change would not reach stored rows (High) | — |
| P-4 | Shared writer matches a row without id on (`result_id`, `is_active`, `section_id`, `actor_type_id`) + `other_actor_type` (type 5) + `count_unit`/`use_nature` for Farmers only | location | `innovation-use.service.ts:474-500` | a383b1323 | DD-3 changes (High) | — |
| P-5 | `buildActorData` stores `toUseNature(el.use_nature)` for any type, so a full update with the property absent writes NULL | location | `innovation-use.service.ts:684-685` | a383b1323 | — none; informs DD-3 caveat (Low) | — |
| P-6 | `saveAnticipatedInnoUser` (v2) has 4 production callers: `innovation-use.service.ts:359,:367` (v2 save), bilateral handler via `saveInnovationUse`, `results-framework-reporting/innovation_dev/innovation_dev.service.ts:229`, `results/results.service.ts:5434` | shared-state | `grep -rn "saveAnticipatedInnoUser" onecgiar-pr-server/src --include=*.ts` (non-spec) | a383b1323 | DD-3 caller protection incomplete (High) | — |
| P-7 | The W1/W2 page sends `count_unit`/`use_nature` (`?? null`) on **every** actor row, new ones included | data-env | `innovation-use-info.component.ts:464-466` (`withFarmerFollowUp`) | a383b1323 | DD-3 would not distinguish new Centre rows (High) | — |
| P-8 | Shared form saves through v2 when `fieldsManagerSE.isP25()` (`PATCH v2 innovation-use/create/result/:id`), else through legacy `PATCH summary/innovation-use/create/result/:id` | live-path | `innovation-use-info.component.ts:524-545`; `results-api.service.ts:581-584, :593-596` | a383b1323 | 2026 W1/W2/W3 saves would reach the legacy writer (High) | — |
| P-9 | The follow-up gate `isFarmerFollowUpResult()` (not IPSR, phase ≥ 2026, not W3) has 4 readers: `removeOther` (`innovation-use-form.component.ts:516`), `isFarmerFollowUpRow` (`:554`), youth non-youth derivation (`:711`), youth hint (`:727`); `isFarmerFollowUpRow` is read by `isHouseholdsRow` (`:559`) and the template (`.html:853`); `isHouseholdsRow` by `.html:128,:263,:568,:680` | shared-state | `grep -rn "isFarmerFollowUpResult\|isFarmerFollowUpRow\|isHouseholdsRow\|removeOther\|farmerRowKey" onecgiar-pr-client/src/app --include=*.ts --include=*.html` (non-spec) | a383b1323 | DD-5 would change youth rules on W3 (High) | — |
| P-10 | Other components define their **own** `removeOther` (IPSR step-n1/n3, anticipated-innovation-user, bilateral review drawer) — not the shared form's | shared-state | same grep: `step-n1-innovaton-use.component.ts:88`, `step-n3-current-use.component.ts:110`, `anticipated-innovation-user.component.ts:134`, `innovation-use-content.component.ts:105` | a383b1323 | DD-5 would ripple to IPSR / Innovation Dev (Low) | — |
| P-11 | The bilateral editor `type-innovation-use` loads via `GET summary/innovation-use/get/result/:id` (entity read → both columns returned) and saves the loaded rows as-is through `PATCH summary/innovation-use/create/result/:id` | live-path | `bilateral-api.service.ts:193-199`; `summary.service.ts:389` (`_resultActorRepository.find`); `type-innovation-use.component.ts:776-791, :823` | a383b1323 | DD-9/DD-10 wrong surface (High) | — |
| P-12 | Legacy writer `results/summary/innovation_dev.service.ts` never writes `count_unit`/`use_nature` (update and insert branches list fields explicitly) | existence | `innovation_dev.service.ts:254-273` (update), `:283-300` (save); `grep -rn "count_unit" onecgiar-pr-server/src/api/results/summary` → 0 hits (alternate name `use_nature` same scope → 0 hits) | a383b1323 | DD-9 unnecessary (Low) | — |
| P-13 | Legacy writer callers: `summary.service.ts:91, :107` (PATCH summary endpoint) and `:898` (Result Review, `innovationUseDto != null`) | shared-state | `grep -rn "saveAnticipatedInnoUser" onecgiar-pr-server/src/api/results/summary` | a383b1323 | DD-9 caller protection incomplete (High) | — |
| P-14 | The bilateral review drawer edits actors via the review update (`results.service.ts:5434` → v2 writer) and has no follow-up questions | location | `innovation-use-content.component.ts:17-19, :105`; `results.service.ts:5427-5440` | a383b1323 | Drawer would need DD-3 handling (Low) | — |
| P-15 | Bilateral editor completeness (`mdsTracker`) lists only `use-actors` etc.; follow-up answers are not in it | location | `type-innovation-use.component.ts:896-916` | a383b1323 | R-21 "not blocking" would need tracker work (Low) | — |
| P-16 | Green-check body that runs: Farmers-only condition on `count_unit`/`use_nature`, sections 1 and 2, gates `phase_year >= 2026`, `source <> 'API'` | data-env | `UNVERIFIED — confirm at source before relying on it` (archived copy `archive/2026-11-12-bugfix--innovation-use-youth-required/sql/validation_innovation_use_P25.after.sql:221-231, :427-437`) | — | DD-7 SQL edit built on the wrong base (High) | INA-T-7 first step: `SHOW CREATE FUNCTION validation_innovation_use_P25` on prtest; owner Santiago |
| P-17 | QA catalog: `use_nature` uses `FARMERS_RULE`; a rule `ALWAYS = { required: true }` exists; catalog revisions bump in `versions.ts` | location | `qa-catalog/definitions/sections/innovation-use.ts:149, :151-154, :267-275`; `qa-catalog/definitions/versions.ts:7-8`; doc `onecgiar-pr-server/docs/qa-catalog.en.md:586, :865` | a383b1323 | DD-8 changes (Low) | — |
| P-18 | Readers of the warning codes / duplicate message: server rules + specs and the contract doc only; no client reader | consumer | Grep `actor_use_nature_not_applicable\|Another Farmers actor\|actor_duplicate_merged` over `onecgiar-pr-server/src` → `rules.ts`, `rules.spec.ts`, `innovation-use.handler.spec.ts`, `bilateral.service.spec.ts`; over `onecgiar-pr-client/src` (pattern incl. `use_nature`) → no warning-code hit; whole repo excl. `docs/specs` + `node_modules` → adds `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | a383b1323 | Retiring the code breaks a reader (High) | — |
| P-19 | Readers of `result_actors.use_nature`: entity, `result-actors.repository.ts` (`:49-50, :82-83, :110-111, :192-193, :228-229, :252-253, :285-286`), bilateral read mapper `bilateral.service.ts:2966-2967`, QA catalog, client innovation-use-form / innovation-use-info; server specs listed in INA-T-3/T-4 Consumers | consumer | `grep -rn "count_unit\|use_nature" onecgiar-pr-server/src --include=*.ts -l` (non-spec) and the Grep over `onecgiar-pr-client/src` | a383b1323 | A report that assumed non-Farmers NULL changes meaning (Low) — see §12 reversion challenge | — |
| P-20 | The fetcher accepts `use_nature` on any type (enum only, no type condition) on `dev-fetcher`; prod (`main`) does not have it and AJV strips unknown keys | data-env | `git show 7a27c43 -- services/fetcher/src/validator/schemas/innovation_use.json` (enum `["information_received","innovation_applied","",null]`, only `if count_unit=households then how_many`); `services/fetcher/src/validator/ajv.js:6` `removeAdditional: true`; `git log origin/main..origin/dev-fetcher --no-merges` → 4 commits incl. `7a27c43`; `.github/workflows/jenkins-trigger-prod-ingestion.yml:5-6` `main` | 314f3f2 / dev-fetcher | INA-T-10 must change schema logic (High) | — |
| P-23 | Every bilateral Innovation Use write lands on a result with **no active actor rows**: no-code create and `versioned` insert a new header (`bilateral.service.ts:594-605`); `updated` (resubmission) deactivates every `ResultActor` of the result first (`services/bilateral-resubmission.service.ts:1127-1130`, branch entered at `bilateral.service.ts:424`) | live-path | file:line as listed | a383b1323 | DD-3 needs a NULL-nature fallback for bilateral re-syncs (High) | — |
| P-21 | TEST rows of results 10118–10120 have `use_nature` NULL on non-Farmers and 10120 kept one Researchers row | data-env | `UNVERIFIED — confirm at source before relying on it` (`user-stated` via Daniel Lozano, 18 Nov) | — | Root cause differs from P-1/P-4 (Low) | INA-T-11 E2E on TEST re-posts the payload; owner Santiago |
| P-22 | TEST deploy route `qa-development-2026-ss` → `performance-refactor` | data-env | `UNVERIFIED — confirm at source before relying on it` (P2-4106 `execution.md` records it; not re-checked) | — | Release step changes (Low) | INA-T-11 / HITL; owner Santiago |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Component | Change |
|---|---|---|
| Server constants | `api/results/result-actors/farmer-follow-up.constant.ts` | `asksUseNature` → any resolved type (DD-1) |
| Bilateral rules | `api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts` | step 4 never fires for `use_nature`; step 6 any type; step 9 any type, wider key, new message (DD-1, DD-2, DD-4) |
| Shared writer (v2) | `api/results-framework-reporting/innovation-use/innovation-use.service.ts` `saveAnticipatedInnoUser` | presence-gated `use_nature` key for non-Farmers (DD-3) |
| Legacy writer | `api/results/summary/innovation_dev.service.ts` `saveAnticipatedInnoUser` | presence-gated write of both codes (DD-9) |
| QA catalog | `api/qa-catalog/definitions/sections/innovation-use.ts`, `versions.ts`, snapshot, `docs/qa-catalog.en.md` | `use_nature` rule for every type + revision bump (DD-8) |
| DB function | `validation_innovation_use_P25` (manual SQL) | `use_nature` condition on every type (DD-7) |
| Shared form | `shared/components/innovation-use-form/*` | scope vs mandatory split, block split, type change, repeat (DD-5, DD-6) |
| Bilateral editor | `pages/bilateral/.../type-innovation-use/*` | questions on actor cards (DD-10) |
| Docs | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`, DTO Swagger; fetcher guides (other repo) | DD-11 |

### 2.2 Sequence

Bilateral create: producer → fetcher `/ingest` (AJV keeps `use_nature`) → `POST /api/bilateral/create` → handler resolves types → rules (store `use_nature` any type; warn missing; merge-warn same identity) → v2 writer (identity incl. `use_nature`) → `result_actors`.
Centre save (2026, P25): form → `PATCH v2 …/innovation-use/create/result/:id` (every row carries both keys, P-7) → v2 writer.
Bilateral editor save: form → `PATCH summary/…/create/result/:id` → legacy writer (writes codes only when the key is present).

## 3. Data Model Changes

None. `result_actors.count_unit` / `use_nature` exist (`varchar(32)` NULL, migration `1793300000000`). No backfill (non-goal).

## 4. API Surface

| Endpoint | Change | Additive? |
|---|---|---|
| `POST /api/bilateral/create` (+ resubmission) | `use_nature` stored on any type; `actor_use_nature_missing` on any type; `actor_use_nature_not_applicable` no longer emitted; `actor_duplicate_merged` on any type with new message | Yes — shapes unchanged, codes kept |
| `GET /api/bilateral/:id` | No shape change (already returns both fields on every actor) | — |
| `PATCH v2 innovation-use/create/result/:id` | Row identity includes `use_nature` when sent | Behavioural |
| `PATCH summary/innovation-use/create/result/:id` | Persists `count_unit`/`use_nature` when the key is present | Additive |
| QA catalog GET | `use_nature` sub-rule required/visible for every type; new `catalog_version` revision | Additive |

New duplicate message (exact): `Another actor of the same type with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins.`

## 5. Server Workflow / Business Rules

Bilateral rules, per active actor (BIF order kept; changes in bold):

| Step | Rule |
|---|---|
| 1 | empty = absent / `null` / `''` |
| 2 | invalid code → 400 on any type (unchanged) |
| 3 | `count_unit` on non-Farmers → NULL + `actor_count_unit_not_applicable` (unchanged) |
| 4 | **`use_nature`: asked of every resolved type → never "not applicable"** (a row whose type did not resolve already failed with 400 in the handler) |
| 5 | Farmers missing `count_unit` → warning (unchanged) |
| 6 | **any type** missing `use_nature` → warning `actor_use_nature_missing` |
| 7-8 | households rules (unchanged, Farmers only) |
| 9 | **any type**, rows without `result_actors_id`: identity = `typeId` + (`other_actor_type` when type 5) + `count_unit` + `use_nature`; repeat → `actor_duplicate_merged` (new message) |

Identity in the v2 writer, row without `result_actors_id` (DD-3):

| Row | Key added today | Key after |
|---|---|---|
| Farmers | `count_unit`, `use_nature` (always, `IsNull()` when empty) | unchanged |
| Other (type 5) | `other_actor_type` | + `use_nature` **if the row has the `use_nature` property** |
| Any other type | — | `use_nature` **if the row has the property** |

The bilateral step-9 key must equal what the writer will merge on. **Amended 2026-11-18 (execute, user-approved, INA-T-2):** the bilateral handler (`innovation-use.handler.ts` `prepareActors`) sets `use_nature` as an explicit property on every actor row it passes to the writer (`null` when the payload omits it). The writer therefore always keys bilateral non-Farmers rows on `type + (other_actor_type) + use_nature`, where empty matches `IsNull()`. That is exactly the rules' identity, where empty equals empty, so the warning and the storage agree on every mix of present and absent values. Without this, a same-type pair where only one row carries the property merged silently in the writer while the rules saw two rows (found in INA-T-3). This is safe because every bilateral write lands on a result with no active actors (P-23), so there is no stored NULL row to collide with.

## 6. Frontend Plan

### 6.1 Shared form (`innovation-use-form`)

| Predicate | Meaning | Readers after |
|---|---|---|
| `isFollowUpScope()` (new) | not IPSR, phase year ≥ 2026 — **any source** | `removeOther`, `isFarmerFollowUpRow`, `isNatureFollowUpRow` |
| `isFollowUpMandatory()` (new) | `isFollowUpScope()` and not W3 | `[required]` of both questions |
| `isFarmerFollowUpResult()` (kept, unchanged meaning: W1/W2 only) | youth rules | youth derivation `:711`, youth hint `:727` only |
| `isFarmerFollowUpRow(actor)` | scope + active + Farmers | Farmers part of the block, `isHouseholdsRow` |
| `isNatureFollowUpRow(actor)` (new) | scope + active + type selected | nature card |

Template: the `#farmerFollowUp` template becomes two parts — Farmers part (title + unit question) under `isFarmerFollowUpRow`; nature part (question card + radios) under `isNatureFollowUpRow`, outside the Farmers condition, no title. Both blocks (`.html:120` current use, `:561` 2030) keep the same outlet, so the 2030 block gets it on W1/W2 and stays hidden on W3 (IWH). Radio `name` stays per row (`farmerRowKey`, renamed in meaning only — unique per row object).
`onActorTypeChange`: clear `count_unit` (and restore the grid after Households) when leaving Farmers; keep `use_nature`.
`removeOther`: inside the scope return no type to disable except none — every type repeatable; outside the scope unchanged (Other only).

### 6.2 Bilateral editor (`type-innovation-use`)

In the `#actorCard` template (`.html:344`), under the type select, for current-use cards with a selected type and a phase year ≥ 2026: the unit question on Farmers cards and the nature question on every card, same copy constants (`shared/components/innovation-use-form/farmer-follow-up.ts`) and the same native-radio pattern. Households → the card's existing "does not apply" path (single total) via the component's own handler (`.ts:597-606`); leaving Farmers clears `count_unit`. Changes call `onFieldChange()` (autosave). Not added to `mdsTracker` (P-15) and no REQUIRED marker (R-21).

### 6.3 Design system

Existing primitives only (`app-pr-radio-button`, `pr-native-radio`, `--pr-text*` tokens). No new tokens, no copy changes beyond hiding the title on non-Farmers rows.

## 7. Security & Authorization

No change: same guards and `auth` header. Logs keep counts per warning code only (`.cursorrules`).

## 8. Performance & Capacity

One extra `where` column on the existing per-actor `findOne`. No new queries.

## 9. Observability

Existing bilateral log line (counts by code) covers the new warnings. No new logs.

## 10. Testing Plan

| Layer | Suite | What |
|---|---|---|
| Rules | `innovation-use-actor-follow-up.rules.spec.ts` | R-1..R-5 incl. Daniel's payloads |
| Handler / service | `innovation-use.handler.spec.ts`, `bilateral.service.spec.ts` | warning list on the 10120 payload, message text |
| v2 writer | `innovation-use.service.farmer-count-nature.spec.ts` (+ new `…nature-all-actors.spec.ts`) | real `where` per row class (Farmers / Other / other type, with / without property) |
| Legacy writer | `results/summary/innovation_dev.service.spec.ts` | key present → written; absent → untouched |
| QA catalog | `qa-catalog.innovation-use.spec.ts`, snapshot | rule + version |
| Shared form | `innovation-use-form.component.spec.ts` | gates, block split, required per source, type change, repeat, radio names |
| Bilateral editor | `type-innovation-use.component.spec.ts` | render, households, payload, no tracker field |
| SQL | `sql/checks.sql` (spec folder) | before/after counts on prtest |
| E2E | manual on PRMS TEST | INA-AC-10 |

Compile gate: `npx tsc --noEmit -p onecgiar-pr-server` (server); client `npx ng lint --quiet` + jest.

## 11. Backwards Compatibility & Rollout / Rollback

| Item | Plan |
|---|---|
| Contract | Additive; retired code stays declared; change-log row |
| Cut 1 (server + contract doc: T-1…T-5, T-9) | Merge → `performance-refactor` → PRMS TEST; Daniel re-tests; post TEST date. T-9 rides with cut 1 because a bilateral payload change ships with its change-log row (root `CLAUDE.md`) |
| Cut 2 (UI + SQL: T-6…T-8) | Same route; green check applied on prtest right after deploy, then prod at prod deploy |
| Prod | PRMS prod + fetcher `dev-fetcher` → `main` (T-10) in the same window; post prod date |
| Rollback server | Revert commits; data stays valid (codes are whitelisted values) |
| Rollback SQL | Re-apply `sql/…before.sql` (saved from the live body in T-7) |
| Rollback UI | Revert; stored answers remain and are simply not shown on non-Farmers rows |

## 12. Design Decisions

### INA-DD-1 — `asksUseNature` = any resolved type (supersedes BIF-OQ-1 = a)
The predicate seam from BIF-DD-4 is used as designed. A null/empty type stays "not asked" (unresolved types already 400). `asksCountUnit` untouched. *Rejected:* a bilateral-only predicate — would keep W1/W2 and W3 apart (proposal Option C).
**Reversion challenge:** no unaddressed breakage (§12.R).

### INA-DD-2 — Step 9 for every type, identity incl. `other_actor_type`
The warning must predict what the writer stores; the writer distinguishes Other by `other_actor_type` (P-4), so the rules do too. Message drops "Farmers".

### INA-DD-3 — Writer identity: presence-gated `use_nature` for non-Farmers
`'use_nature' in row` decides whether the key joins the match. Callers that send the property (v2 Centre save — every row, P-7; bilateral — rows that carry it) get same-type separation; callers that do not (`innovation_dev.service.ts:229`, review update `results.service.ts:5434`) keep the type-only match, so they update instead of duplicating (S-8). Farmers keep the always-on key (no regression of IFC-R-4). **Amended 2026-11-18:** bilateral rows always carry the property. The handler normalises an absent value to `null`, as described in §5. Under P-23 this makes bilateral the always-on case without the duplicate risk. *Rejected:* always-on key (proposal Option B — duplicates on review update). Lesson **KZ-changes--innovation-use-farmer-count-nature-1** applied: all callers listed in P-6/P-13, each with a test class.

### INA-DD-4 — Retire, do not remove, `actor_use_nature_not_applicable`
Kept in `BilateralActorWarningCode` and the doc as "retired — no longer emitted (INC-168062)". P-18 shows no client reader; external producers may switch on it.

### INA-DD-5 — Client: separate "scope" from "mandatory"; keep the youth gate
`isFarmerFollowUpResult()` keeps its exact meaning (W1/W2) because the youth rules (`:711`, `:727`) are W1/W2-only (IUY) — widening it to W3 would change youth behaviour on W3. New `isFollowUpScope()` / `isFollowUpMandatory()` drive the follow-up only (P-9).
**Reversion challenge** (type change keeps `use_nature`; every type repeatable): no unaddressed breakage (§12.R).

### INA-DD-6 — W3 = shown, editable, not mandatory
`[required]` bound to `isFollowUpMandatory()`; on W3 the cards render without the REQUIRED marker, so the mandatory-field scan does not count them (R-20, OQ-3).

### INA-DD-7 — Green check: `use_nature` on every type, `count_unit` Farmers
Split today's Farmers-only condition into (a) Farmers + invalid `count_unit`, (b) any type + invalid `use_nature`, for sections 1 and 2, same gates. Built **from the live body** (P-16), stored as `sql/validation_innovation_use_P25.{before,after,after.body-only}.sql` + `sql/checks.sql` in this spec folder (IFC/IUY pattern). Applied by hand, prtest then prod.

### INA-DD-8 — QA catalog: `use_nature` uses `ALWAYS`; revision bump
`count_unit` keeps `FARMERS_RULE`. `catalog_version` revision bump in `versions.ts` and a v-row in `docs/qa-catalog.en.md` (consumers cache by version, P-17).

### INA-DD-9 — Legacy writer persists the codes, presence-gated
In both branches of `results/summary/innovation_dev.service.ts` (`:254-273`, `:283-300`), write `count_unit` / `use_nature` through `toCountUnit` / `toUseNature` **only when the key is present** on the incoming row. The bilateral editor sends loaded rows (values round-trip, P-11); Result Review and pre-P25 callers that omit the keys leave stored answers untouched (P-13). **Amended 2026-11-18 (execute, user-approved; found in the INA-T-3 review):** the same presence rule applies to the v2 writer's `buildActorData` (`innovation-use.service.ts:693-694`). Before this, `toUseNature(undefined)` wrote NULL on every update, so the review update (`results.service.ts:5434`) and `innovation_dev.service.ts:229` erased natures they never sent (P-5 is reclassified from Low to High now that non-Farmers natures are stored). It is delivered in INA-T-4.

### INA-DD-10 — Bilateral editor reuses the shared copy and its own single-total path
No new component: the actor card gets the two questions inline with the shared constants. Households reuses the card's "does not apply" handler. Not in the MDS tracker (P-15).

**Amended 2026-11-18 (execute, from the INA-T-8 review):** leaving Farmers clears `count_unit`, but it does **not** restore the grid that Households wiped. The forced "does not apply" tick stays visible, and the user can untick it. This is a deliberate difference from the shared form: INA-R-8, the grid restore, is written for the Centre form, while R-21 is a SHOULD and the card owns its own tick.

### INA-DD-11 — Docs in both repos, schema logic untouched
PRMS: `bilateral-result-summaries.en.md` (§ actor follow-up table `:324-333`, ingestion steps `:512-528`, messages `:535-546`, inactive rows `:553`, alignment `:561-563`, new change-log row), Swagger text on `InnovationUseActorDto.use_nature` (`create-bilateral.dto.ts:489-500`). Fetcher (`onecgiar_result_functions`, branch from `dev-fetcher`): `docs/guides/08-innovation-use.md`, `02-changelog.md`, `openapi.json`, `use_nature.description` in `validator/schemas/innovation_use.json`. No enum or condition change (P-20).

### INA-DD-12 — Review drawer out of scope, protected
The bilateral review drawer (`bilateral-review/.../innovation-use-content`) gets no questions; it saves through the review update (P-14), which DD-3 protects (rows carry ids; new rows without the property match by type as today).

### 12.R — Reversion challenge (Step 2.3)

Reversions: DD-1 (bilateral stops dropping `use_nature` on non-Farmers), DD-4 (warning no longer emitted), DD-5 (type change keeps `use_nature`; every type repeatable). Challenge: one independent read-only reviewer (Explore agent, 2026-11-18), question "what does removing this break?".

| Reverted behaviour | Challenger's answer | Disposition |
|---|---|---|
| DD-1 predicate flip | Nothing crashes; QA catalog, green check and the read-mapper comment still assume Farmers | Already in scope: DD-8, DD-7, T-4 (mapper comment) |
| DD-4 warning retired | Nothing found outside `rules.ts` and its spec (`not_applicable` over server + client `src`) | Matches P-18; spec updated in T-2 |
| DD-5 type change / repeat | No unique constraint, no `GROUP BY actor_type_id`, `getActorsData` is a plain `find` (`innovation-use.service.ts:926`), `calculateTotalField` is per row (`innovation-use-form.component.ts:626`). Two cautions: same-type rows with the same nature merge on save; leaving Farmers must still clear Households | First = accepted behaviour (R-5, §14); second = already DD-5 / R-8 |
| DD-3 key (extra) | Claimed: a bilateral re-sync of a result whose stored non-Farmers rows have NULL nature would insert duplicates | **Refuted** by P-23: every bilateral write lands on a result with no active actors |

No design change required.

## 13. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 11 (server 5, client 2, SQL 1, docs 2, release/E2E 1) |
| LOC | ~1,150 total (≈330 prod, ≈700 test, ≈120 docs/SQL) |
| Review rounds | ~14 (1–2 per code task; docs 1 each) |

Tripwire: stop and escalate above ~1,450 LOC, ~420 prod LOC, or 18 review rounds. **Raised 2026-11-18 by the user to ~2,600 LOC total (prod 420 and rounds 18 unchanged) after it fired on test volume at T-4 (execution.md).**

## 14. Open Gaps & Follow-ups

- OQ-7 (Nicoleta's comments) may change copy or scope.
- AI QA payload still lacks both fields (BIF deferred).
- Bilateral review drawer does not show the answers (DD-12) — candidate follow-up if reviewers ask.
- Duplicate same-type rows with the same nature in the Centre form merge on save (R-d of the proposal) — no client hint.

## Required cross-references

`requirements.md` · `proposal.md` · `bilateral/innovation-use-actor-follow-up/design.md` (BIF-DD-4, §5) · `archive/2026-11-03-changes--innovation-use-farmer-count-nature/design.md` · `archive/2026-11-12-bugfix--innovation-use-youth-required/sql/` · `archive/2026-11-12-changes--innovation-use-w3-hide-2030/` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `onecgiar-pr-server/docs/qa-catalog.en.md`
