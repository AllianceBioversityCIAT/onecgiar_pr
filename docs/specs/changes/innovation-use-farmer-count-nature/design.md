# Design — Innovation Use: unit and nature of the number for Farmers actors

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-farmer-count-nature` |
| Requirements | `requirements.md` (IFC-R-1..10) |
| Depth | Standard |
| Approval Mode | gated |
| Date | 2026-11-03 |

## 2. Executive Summary

Two nullable code columns on `result_actors`, written and read through the existing P25 Innovation Use endpoints (`/v2/api/innovation-use/*`). The client renders a follow-up block inside the actor row of `innovation-use-form`, behind a single gate (Innovation Use, phase year ≥ 2026, not bilateral, not IPSR, type Farmers). **Households reuses the existing "Sex and age disaggregation does not apply" path**, so totals, validation and readers need no new counting logic. The green check adds one rule per actor block in the live DB function, behind the same gate. The QA catalog gets two subfields per block. No new endpoint, no payload change for bilateral consumers.

## 3. Architecture Overview

| Layer | Change | Requirement |
|---|---|---|
| DB schema | `result_actors.count_unit`, `result_actors.use_nature` (nullable `varchar(32)`) | IFC-R-7 |
| Server entity / save | Entity columns; `buildActorData` writes them through a whitelist; save matching for Farmers rows includes both answers | IFC-R-4, R-7 |
| Server replicate | Both column lists in `ResultActorRepository` (`createQueries` + the `custonFunction`/INSERT-SELECT path) | IFC-R-8 |
| Server read | Nothing: `getActorsData` is an entity `find`, so the new columns come back automatically | IFC-R-4 |
| DB function | `validation_innovation_use_P25`: a Farmers check inside the `section_id = 1` and `= 2` actor blocks | IFC-R-6 |
| Client | Follow-up block + gate + duplicates + Households coupling in `innovation-use-form` (both blocks) | IFC-R-1..5 |
| QA catalog | Subfields + closed lists + revision 33 | IFC-R-9 |

Recovery (`delete-recover-data`) only flips `is_active`, so the answers survive with no change (IFC-R-8, recover half).

## 4. Extended Directory Structure

```text
onecgiar-pr-server/src/
├── migrations/<ts>-AddFarmerCountNatureToResultActors.ts        (new)
├── api/results/result-actors/entities/result-actor.entity.ts    (2 columns)
├── api/results/result-actors/repositories/result-actors.repository.ts (replicate lists)
├── api/results/result-actors/farmer-follow-up.constant.ts       (new: Farmers id + the 4 codes + whitelist helpers)
├── api/results-framework-reporting/innovation-use/innovation-use.service.ts (build + match)
├── api/results-framework-reporting/innovation-use/CLAUDE.md    (doc sync)
└── api/qa-catalog/definitions/{sections/innovation-use.ts, closed-control-lists.ts, versions.ts} + docs/qa-catalog.en.md
onecgiar-pr-client/src/app/shared/components/innovation-use-form/
├── innovation-use-form.component.{html,ts}                     (block, gate, duplicates, Households)
├── farmer-follow-up.ts                                         (new: codes + copy constants)
└── CLAUDE.md (if present) / spec files
docs/specs/changes/innovation-use-farmer-count-nature/sql/      (function body + before/after checks, applied by Santiago)
```

## 5. Data Model

| Column | Type | Values | Default |
|---|---|---|---|
| `result_actors.count_unit` | `varchar(32)` NULL | `households` \| `individuals` | NULL |
| `result_actors.use_nature` | `varchar(32)` NULL | `information_received` \| `innovation_applied` | NULL |

- `varchar` + a server whitelist, not a MySQL `ENUM`: adding a value later is then a code change, not an `ALTER` on a large shared table, and TypeORM `enum` columns have bitten `migration:check` before.
- **Farmers identity:** `actor_type_id = 1` (first row of `1679588387039-insertActorsType`). It is pinned as one server constant and one client constant **after T-1 confirms it in test and prod**. The SQL function uses the same literal.
- Existing rows stay NULL (IFC-R-7). Households rows use the existing `sex_and_age_disaggregation = 1` + `how_many`.

## 6. API Design

No new endpoint. `PATCH /v2/api/innovation-use/create/result/:id` accepts `count_unit` / `use_nature` on each actor; `GET …/get/result/:id` returns them on each actor (the entity is serialized as is). The DTO's `actors: ResultActor[]` is entity-typed, so the whitelist lives in the service (`buildActorData`): an unknown value is stored as NULL, never persisted. That satisfies IFC-R-7 (only the four codes or empty) without a 400 that would cost the submitter the whole section save. **Requirement wording note:** IFC-R-7's "reject" is implemented as "never stored". The scenario asserts the stored value.

## 7. Backend Module Design

1. **`buildActorData`**: adds both fields through the whitelist helper (`?? null`, never `|| null`; see the folder CLAUDE.md rule).
2. **Save matching** (rows without `result_actors_id`): today it reuses any active row with the same result + section + type. For **Farmers only**, the match also requires equal `count_unit` and `use_nature`. Two Farmers rows with different answers then insert separately (IFC-R-4). Two with identical answers still merge, which is the correct reading of the helper text (one row per group).
3. **Replicate:** add both columns to the two SELECT/INSERT lists in `ResultActorRepository`. Keep the existing behavior about `section_id` (the P2-3514 note) untouched; that is not this spec's defect.
4. **DB function** (`sql/validation_innovation_use_P25.sql`, applied by Santiago in DBeaver: body only, per the routine-editor rule): inside each `IF EXISTS (… section_id = N)` actor block, after the existing completeness `SELECT`, add a check that runs only when `COALESCE(result_phase_year,0) >= 2026` and the result's `source <> 'API'`. It fails when any active Farmers row of that section has `count_unit` or `use_nature` outside the codes. The source is read once next to the existing `result_phase_year` lookup. Everything else stays byte-for-byte. Ship with before/after SQL checks (2025 W1/W2, 2026 bilateral, 2026 W1/W2 with and without answers).
5. **No change** to `getActorsData`, `currentUseActorCount`, previous-phase sums or the bilateral handlers/builders (IFC-R-10).

## 8. Frontend / UX Component Architecture

**Gate (one method, `isFarmerFollowUpRow(actor)`)** = `!isIpsr` AND result phase year ≥ 2026 (via the existing `isPhaseYearAtLeast`, which fails toward the legacy form) AND `currentResult.source_name !== 'W3/Bilaterals'` AND `actor.actor_type_id === FARMERS_ACTOR_TYPE_ID` AND the row is active.

**Placement:** inside the existing left `<div>` of each actor row, right after the "Actor type" `app-pr-select` (and after the "Other actor type" input slot, which never coexists with Farmers), in **both** blocks (current use ~L96 and 2030 ~L512).

**Block content** (from `mockup/farmer-follow-up-questions.png`):
- Section label (14px/600 title) with the block title.
- Q-a: `app-pr-radio-button` (required), two inline options.
- Q-b: `app-pr-radio-button` (required), two options, each with a bold label and a grey multi-line description.
- Italic helper paragraph.
- All copy lives in `farmer-follow-up.ts` constants, with exact strings, and is unit-tested once.
- Styling with Tailwind utilities and explicit px sizes (no rem type utilities); no new SCSS blocks. Use Spartan only where `pr-radio-button` cannot render the option description; T-4 checks this against the Spartan MCP before choosing.

**Behaviors:**
- **Type change away from Farmers** → clear `count_unit` and `use_nature` (hooked into the existing `(ngModelChange)` of the select) (IFC-R-1).
- **Duplicates:** `removeOther()` excludes Farmers from the disabled list when the gate's result-level part is true. Other types keep today's rule (IFC-R-4).
- **Households** → set `sex_and_age_disaggregation = true`, call the existing `cleanActor(actor)`, and hide the "does not apply" checkbox for that row, because it is implied. **Individuals** after Households → set it back to `false`, and the grid returns (IFC-R-5). This reuses the single-total path end to end: `how_many` input, the validation branch and `currentUseActorCount`.
- **Mandatory feedback:** both radios are `[required]` inside the section DOM, so `someMandatoryFieldIncompleteResultDetail` lists them (IFC-R-6, client half). The green check is the server half.

## 9. Shared Contracts

- The four codes and the Farmers id are defined once per side (server `farmer-follow-up.constant.ts`, client `farmer-follow-up.ts`). The SQL function repeats the literals, and the spec's SQL file names them.
- QA catalog: in `usageLists`, the actor list of both blocks gains two subfields (`count_unit`, `use_nature`), `visible_when`/`required_when` = `actor_type` equals Farmers, `FROM_2026`, closed lists `actor_count_unit` / `actor_use_nature` in `closed-control-lists.ts`; `versions.ts` 2026 revision 32 → 33; `docs/qa-catalog.en.md` row. The sync service writes them to `qa_catalog_*` at bootstrap, so no catalog migration.

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| IFC-DD-1 | Two columns on `result_actors` | `result_questions` answers; a side table | Answers are per **row** (IFC-R-4); a side table doubles replicate/recover paths for two fields |
| IFC-DD-2 | Households = force "disaggregation does not apply" | A new single-total field/path | Zero new counting or validation logic; every existing reader already understands it |
| IFC-DD-3 | Whitelist in service, NULL on unknown | 400 on unknown; MySQL ENUM/CHECK | Never loses a section save; extensible without `ALTER` |
| IFC-DD-4 | Farmers by pinned id 1, verified in T-1 | Resolve by name at runtime | The name differs between catalogue and docs (`pastoralist` vs `pastoralists`, spacing; see the bilateral handler) |
| IFC-DD-5 | Gate on the result's phase year + `source_name`, plus `isIpsr` | Portfolio (`isP25`) gate | P25 holds 2025 results (epic P2-3243 rule) |
| IFC-DD-6 | Function change shipped as a reviewed SQL file applied by Santiago | A TypeORM migration recreating the function | The repo copy of the function is stale vs the live one (folder CLAUDE.md); a migration would overwrite live logic with stale logic |
| IFC-DD-7 | **(reversion)** Allow duplicate Farmers in the select | Keep the guard | Required by IFC-R-4 |
| IFC-DD-8 | **(reversion)** Narrow the save de-dup for Farmers | Keep the type-only match | Otherwise the second row overwrites the first |

### Reversion challenges (Step 2.3) — "what does removing this break?"

- **DD-7 (select guard):** the guard prevents accidental duplicate rows of one type, which would double-count in totals. *Answer:* for Farmers, a duplicate is now intended and each row carries a distinct nature/unit. The risk that remains is two identical Farmers rows; DD-8 merges them on save. ✅ addressed.
- **DD-8 (save de-dup):** the type-only match protects against a second PATCH re-sending rows without ids (double-click, slow reload) and creating copies. *Answer:* the save path reloads the section after every PATCH (`innovation-use-info.component.ts` ~L522), so ids come back. A Farmers row re-sent without an id still matches on (type, unit, nature). The case that remains is an unanswered Farmers row (both NULL) sent twice, which still merges, because NULL = NULL is compared explicitly with `IsNull()`, like `other_actor_type`. ✅ addressed, and noted for the T-3 spec.

## 11. Budget (Step 2.4 tripwire)

| Measure | Expected |
|---|---|
| Tasks | 7 (1 HITL data check, 2 server, 1 client, 1 SQL, 1 QA catalog, 1 verification + docs) |
| LOC (incl. tests) | ~550 (server ~180, client ~220, catalog ~80, SQL ~70) |
| Review rounds | 2 |

Matches Standard. Above ~400 LOC, so the tasks phase will recommend the PR split.

## 12. Risks

| ID | Risk | Mitigation |
|---|---|---|
| IFC-RK-1 | Replicated 2026 Farmers rows turn red (IFC-OQ-1) | Accepted by default; T-1 measures it so it can be told to users |
| IFC-RK-2 | Wrong Farmers id in an environment | T-1 verifies test + prod before any code |
| IFC-RK-3 | The function edit breaks 2025/bilateral green checks | Gate + before/after SQL on real rows (feedback: verify SQL fixes against real data) |
| IFC-RK-4 | Shared template leaks into IPSR | `isIpsr` in the gate + a spec with `isIpsr = true` |
| IFC-RK-5 | Forced `sex_and_age_disaggregation` surprises a user switching back | Individuals restores the grid; values were already cleared by `cleanActor`, as today |

## 13. Rollback

Revert the client and server commits; the columns can stay (nullable, unread). Re-apply the saved previous function body (T-5 keeps it in `sql/`). The QA catalog reverts with its revision.
