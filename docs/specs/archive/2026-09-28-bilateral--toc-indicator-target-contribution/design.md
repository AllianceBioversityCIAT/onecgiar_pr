# Design — ToC indicator, target and contribution on the bilateral contract

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/toc-indicator-target-contribution/` |
| Module code | `BTC` · Depth **Lite** · Type **Change** |
| Requirements | `./requirements.md` |
| Verified at | `dbd3f3b5f` (= `origin/performance-refactor`) |
| Delegation | None — explored inline (3 source files). |

## 1. Summary

Two server-only edits and one doc entry:

- **Read (`BTC-R-1`)** — `ResultRepository.getTocMappingsByResultId` gains, inside each mapping's `JSON_OBJECT`, an `indicators` key filled by a **correlated sub-select** that aggregates the mapping's active indicators with their target and contribution. The TS mapper normalises a `NULL` aggregate to `[]`. Because the join lives in a sub-select, the outer `GROUP BY` row count and `toc_mappings[]` length are untouched.
- **Write (`BTC-R-2`)** — `TocMappingDto` gains optional `target_contribution`; `handleTocMapping` writes `contributing_indicator: contribution ?? 1` and logs a warning when a sent figure has nothing to attach to.
- **Doc (`BTC-R-3`)** — change-log row in `bilateral-result-summaries.en.md`.

No entity, migration, endpoint or client change.

## 2. Premise Ledger

Verified 12 · `UNVERIFIED` 0.
Blast-radius triggers: `consumer` (response shape and a stored field change) and `live-path` (the webhook is a named user-facing output) fire; `shared-state` does not — no shared state, service base or lifecycle hook changes.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The ToC block of the enriched result is built only by `getTocMappingsByResultId`, and today exposes no indicator, target or contribution | location | `onecgiar-pr-server/src/api/results/result.repository.ts:4004` — `JSON_OBJECT` keys: `toc_result_id, official_code, name, aow, planned_result, level, title` | `dbd3f3b5f` | Another builder would also need the change (DD-1 scope) — High | — |
| P-2 | Webhook, `POST /create` response and `GET` detail all reach that function | live-path | webhook: `webhook-dispatch.service.ts:164` `this._bilateralService.findOne(delivery.result_id)` → `bilateral.service.ts:756` `enrichBilateralResultResponse(filteredResult)` → `:3718` `getTocMappingsByResultId(filtered.id)`; create: `bilateral.service.ts:559` `enrichBilateralResultResponse(resultInfo)` | `dbd3f3b5f` | The webhook would not carry the data STAR asked for — High | — |
| P-3 | The only production caller of `getTocMappingsByResultId` is `bilateral.service.ts:3718` | consumer | `grep -rn "getTocMappingsByResultId" onecgiar-pr-server/src` → prod hit `bilateral.service.ts:3718`; others are comments (`contributors-and-partners.mapper.ts:25,136`) and a spec (`bilateral-quality-payload.builder.spec.ts:458`) | `dbd3f3b5f` | Unknown readers would see the new key — Low (additive) | — |
| P-4 | The QA payload mapper reads `toc_mappings[0]` by `toc_result_id`, `title`, `planned_result`, `level` only, and takes indicator/contribution from the form detail, not from this block | consumer | `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/contributors-and-partners.mapper.ts:130-199` (`mapping = ownerRow?.toc_mappings?.[0]`, `readContribution(formIndicator)`) | `dbd3f3b5f` | An extra or reordered mapping entry would change which mapping QA reads — High; guarded by DD-1 (no row multiplication) | — |
| P-5 | Spec fixtures pinning `toc_mappings` shape: `bilateral-quality-payload.builder.spec.ts:411,470` and six `services/quality-assessment/fixtures/*.fixture.json`; none asserts the exact key set | consumer | `grep -rnE "toc_mappings\|obj_results_toc_result" onecgiar-pr-server/src onecgiar-pr-client/src onecgiar-pr-client/cypress` → server bilateral hits listed; client hits are `notification-item.component.spec.ts` (unrelated `obj_results_toc_result` entity relation); `results-framework-reporting/*`, `results.service.ts` hits are the ORM relation, not this query | `dbd3f3b5f` | A key-set assertion would go red — Low | — |
| P-6 | Indicator rows join to the ToC catalogue on `tri.related_node_id = rtri.toc_results_indicator_id` with an explicit `CONVERT(... USING utf8mb4)` on both sides, `tri.is_active = 1`, `rtri.is_active = 1 AND (rtri.is_not_aplicable = 0 OR rtri.is_not_aplicable IS NULL)`, and to targets on `rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id AND rit.is_active = 1` | other | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts:580-589` | `dbd3f3b5f` | The sub-select returns nothing or errors on collation — High; caught by the TEST-DB run (T-1) | — |
| P-7 | The indicator "type" the push matches on is `tri.type_value` (the input `result_indicator_type_name` is compared to it) | data-env | `results-toc-results.repository.ts` `findTocResultsForBilateral`: `'(tri.indicator_description LIKE ? OR tri.type_value = ?)'` | `dbd3f3b5f` | The echoed type would not match what STAR sent — Low | — |
| P-8 | `result_indicators_targets.number_target` is NOT nullable; `contributing_indicator` is `decimal(12,2)` nullable; `target_date` is `int` nullable | data-env | `onecgiar-pr-server/src/api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts:16-56` | `dbd3f3b5f` | A target row without `number_target` would be storable — Low (only changes the warning branch) | — |
| P-9 | The create writes the target row only when a full match returned `toc_results_indicator_id` and `number_target`, with `contributing_indicator: 1` constant | location | `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:1755-1797` | `dbd3f3b5f` | The constant lives elsewhere — High | — |
| P-10 | Validation cascades to `toc_mapping`: `@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))` on `RootResultsDto`, `data` is `@ValidateNested() @Type(() => CreateBilateralDto)`, `toc_mapping` is `@ValidateNested() @Type(() => TocMappingDto)` | location | `bilateral.controller.ts:49-64`; `create-bilateral.dto.ts:1381-1383`, `:1239-1242` | `dbd3f3b5f` | Invalid values would not 400 — High for the invalid-value scenario | — |
| P-11 | `contributing_programs[]` never reach the target write (role 2 `continue`s before ToC search) and `ContributingProgramDto` is a separate class, so the new field does not leak into it | location | `bilateral.service.ts` `handleTocMapping`, `if (roleId === 2) { … continue; }`; `create-bilateral.dto.ts:147` | `dbd3f3b5f` | Scope would include contributing programs — Low | — |
| P-12 | STAR pushes through the Fetcher, and the Fetcher's `toc_mapping` already declares and forwards `target_contribution` (`integer`, `additionalProperties: false`, AJV `removeAdditional: true`) | other | Route: user-stated by David Casañas 2026-09-28. Schema: `git grep -n target_contribution origin/main -- services/fetcher` in `onecgiar_result_functions` → `common_fields.json:135`, `knowledge_product.json:175` (same on `origin/dev`, `origin/dev-fetcher`); `ajv.js:6` `removeAdditional: true` | `b934d42` (`onecgiar_result_functions` local `main`; remote branches grepped after `git fetch`) | Another input name would be stripped by the Fetcher before reaching PRMS — High for `BTC-DD-3` | — |

## 3. Data Model Changes

None. Existing columns only (P-8).

## 4. API Surface

### 4.1 Read — `toc_mappings[].indicators[]` (webhook, `POST /create` response, `GET` detail)

One element per active indicator × active target row of the mapping:

| Key | Source | Absent |
|---|---|---|
| `toc_results_indicator_id` | `results_toc_result_indicators.toc_results_indicator_id` | — |
| `indicator_description` | ToC catalogue `indicator_description` | `null` |
| `indicator_type` | ToC catalogue `type_value` (P-7) | `null` |
| `number_target` | `result_indicators_targets.number_target` | `null` |
| `target_date` | `result_indicators_targets.target_date` | `null` |
| `target_contribution` | `result_indicators_targets.contributing_indicator` (JSON number) | `null` |

`indicators: []` when the mapping has no active indicator, including the all-`null` mapping the `LEFT JOIN` produces for an initiative without ToC row (P-4).

### 4.2 Write — `toc_mapping.target_contribution`

Optional number, `≥ 0`, `≤ 2` decimals (fits `decimal(12,2)`, P-8). Only on `TocMappingDto` (P-11). Invalid → 400 from the existing pipe (P-10).

### 4.3 Bilateral / platform-report impact

Additive under ADR-004 (`docs/trd/trd.md:108`) and QAS-9 (`:136`): change-log entry required (`BTC-R-3`).

## 5. Server Workflow

`handleTocMapping`, role 1, full match (P-9):

| Condition | Stored `contributing_indicator` | Log |
|---|---|---|
| indicator + `number_target`, field sent | sent value | — |
| indicator + `number_target`, field absent | `1` (unchanged) | — |
| field sent, but initiative-only / title-only match, no indicator, or no `number_target` | nothing stored (no target row, as today) | `warn`: result id + reason — never the payload |

## 6. Frontend Plan

Not applicable.

## 7. Design Decisions

### `BTC-DD-1` — Indicators as a nested array built by a correlated sub-select

- **Decision:** add `'indicators', (SELECT JSON_ARRAYAGG(JSON_OBJECT(...)) FROM results_toc_result_indicators … LEFT JOIN catalogue … LEFT JOIN result_indicators_targets … WHERE rtri.results_toc_results_id = rtr.result_toc_result_id AND rtri.is_active = 1)` inside the existing mapping `JSON_OBJECT`, reusing P-6's join conditions verbatim. Normalise `NULL` → `[]` in the existing TS `.map`.
- **Why:** P-4 — QA reads `toc_mappings[0]`; joining indicators in the outer `FROM` would emit one mapping per indicator/target and could change that entry.
- **Rejected:** (a) flat keys on the mapping (`indicator_description`, …) — cannot express two indicators, and still multiplies rows; (b) a second query in `enrichBilateralResultResponse` — extra round-trip per result (NFR).

### `BTC-DD-2` — Absent contribution keeps `1`; unattachable contribution is logged, not rejected

- **Decision:** `contribution ?? 1`; a sent figure with no indicator/target is dropped with a warning.
- **Why:** backward compatibility for every current producer; the ToC match is fuzzy (`LIKE` on title and description), so rejecting on "no indicator matched" would fail pushes that succeed today.
- **Rejected:** 400 on unattachable contribution — turns a matching miss into a lost result.

### `BTC-DD-3` — Field name `target_contribution`

- **Decision:** `target_contribution` on input (`toc_mapping`) and output (`indicators[]`) — the name the Fetcher already declares and forwards (P-12). Confirmed by the user 2026-09-28.
- **Why:** zero Fetcher change; if STAR already sends it, it starts persisting on deploy with no producer change.
- **Rejected:** `contribution_to_indicator_target` — clearer label, but the Fetcher strips it until both of its schemas are edited, and STAR would have to rename.
- **Type note:** the Fetcher declares `integer`; PRMS accepts `≥ 0` with up to 2 decimals (column `decimal(12,2)`, P-8). Through the Fetcher, only integers reach PRMS; widening the Fetcher to `number` is out of scope.

Reversion challenge (Step 2.3): **not triggered** — nothing is removed or inverted; DD-2 keeps the delivered default `1`.

## 8. Testing Plan

- **T-1** repository mapper: fixture rows with `indicators` as JSON string, as array, and `null` → `[]`; two-indicator mapping stays one mapping entry. **Manual:** run the new query on TEST DB for one real bilateral result with an indicator (row count equal to the old query; `indicators` populated) — Jest cannot execute the SQL.
- **T-2** `bilateral.service.spec.ts`: target save receives the sent value; absent → `1`; unattachable → no save + `logger.warn`. DTO: negative / 3 decimals / string → validation errors.
- Existing QA specs (P-5) stay green.

## 9. Backwards Compatibility & Rollback

Additive; producers that send nothing see only a new `indicators` key. Rollback = revert the PR; no data to unwind (values stored are valid under today's schema).

## 10. Budget

| Expected tasks | Expected LOC (prod + test + doc) | Expected review rounds |
|---|---|---|
| 3 | ~150 (≈40 prod · ≈90 test · ≈20 doc) | 1 |

Depth check: matches **Lite** — small, but it changes a contract, so not `/akili-quick`.
