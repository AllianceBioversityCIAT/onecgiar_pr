# Requirements — ToC indicator, target and contribution on the bilateral contract

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `toc-indicator-target-contribution` |
| Module code | `BTC` |
| Owner | Juan David Delgado |
| Status | approved (2026-09-28) |
| Depth | **Lite** · Type **Change** |
| Proposal | none — requested by STAR (David Casañas) and confirmed in Slack: `https://cgiar-ibd.slack.com/archives/C06MC9RJLTY/p1790625679851389` |
| Base branch | `performance-refactor` (bilateral lives there, not on `staging`) |

## 1. Context

Two related gaps on the external bilateral contract (`/api/bilateral/*`, authoritative doc `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`):

1. **Read side.** The ToC block of the enriched bilateral result (`data.obj_results_toc_result[].toc_mappings[]`) exposes only the ToC result (`toc_result_id`, `official_code`, `aow`, `level`, `title`, `planned_result`) — `onecgiar-pr-server/src/api/results/result.repository.ts` (`getTocMappingsByResultId`). It never exposes the indicator the result was mapped to, that indicator's target, or the contribution to it, although all three are stored (`results_toc_result_indicators`, `result_indicators_targets`). STAR sends `result_indicator_description` in the push and does not get it back in the review-decision webhook.
2. **Write side.** `POST /api/bilateral/create` has no input for *Contribution to indicator target*: the Fetcher already forwards `toc_mapping.target_contribution`, but `TocMappingDto` does not declare it and the endpoint's `whitelist: true` drops it. When the ToC match finds an indicator with a target, it persists `contributing_indicator: 1` as a constant (`onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:1792`). STAR holds the real figure and wants to send it.

The enriched result is built by one function (`enrichBilateralResultResponse`) for three outputs: the review-decision webhook (`webhook-dispatch.service.ts:164` → `BilateralService.findOne`), the `POST /create` response (`bilateral.service.ts:559`) and `GET` detail (`bilateral.service.ts:756`). The read change reaches all three.

Terminology used in this spec: **push** = `POST /api/bilateral/create`; **webhook** = the APPROVE/REJECT callback PRMS sends to the registered platform URL.

## 2. In Scope / Out of Scope

### In scope

- Expose, per ToC mapping, the mapped indicator(s) with description, type, target and contribution.
- Accept an optional contribution figure on the push's `toc_mapping` and persist it instead of the constant `1`.
- Change-log entry in `bilateral-result-summaries.en.md`.

### Out of scope

- `contributing_programs[]`: they never resolve a ToC indicator (persisted as `share_result_request` drafts, `bilateral.service.ts`, `roleId === 2` branch), so they gain no input and no indicator data.
- Changing the ToC matching rules (`findTocResultsForBilateral`).
- The Fetcher's `toc_mapping` schema (separate repo `onecgiar_result_functions`) — already declares `target_contribution` as `integer` (`BTC-OQ-1`); widening it to decimals is a separate change, only if STAR needs them.
- Client UI.

## 3. Functional Requirements

### `BTC-R-1` — Indicator, target and contribution on each ToC mapping (read)

Every entry of `obj_results_toc_result[].toc_mappings[]` SHALL carry an `indicators` array; each element states the mapped indicator's id, description, type, target number, target year and contribution to that target.

#### Scenario: mapped indicator with target

- GIVEN a result whose owner ToC mapping has an active indicator row with an active target (`number_target = 50`, `target_date = 2026`, `contributing_indicator = 12.5`)
- WHEN the platform receives the webhook (or reads `GET` detail, or the `POST /create` response)
- THEN that mapping's `indicators[0]` carries the indicator's description and type, `number_target: 50`, `target_date: 2026` and a contribution of `12.5`
- AND every key that `toc_mappings[]` exposes today is still present with the same value
- BUT it must NOT add, remove or duplicate `toc_mappings[]` entries — a mapping with two indicators is still one mapping entry with two `indicators` elements
- AND IT MUST return `indicators: []` (never `null`, never a single element full of `null`s) when the mapping has no active indicator

#### Scenario: indicator without target row

- GIVEN a mapped indicator with no active `result_indicators_targets` row
- THEN its element is present with `number_target`, `target_date` and contribution set to `null`

### `BTC-R-2` — Contribution to indicator target on the push (write)

`POST /create` SHALL accept an optional `toc_mapping.target_contribution` (non-negative number, at most 2 decimals) and persist it as the result's contribution to the matched indicator's target.

#### Scenario: contribution sent and indicator matched

- GIVEN a push whose `toc_mapping` resolves to a ToC indicator with a target, carrying `target_contribution: 12.5`
- WHEN the result is created
- THEN the stored contribution for that target is `12.5`
- AND the `POST /create` response's `indicators[0]` shows `12.5` (`BTC-R-1`)

#### Scenario: contribution not sent (backward compatibility)

- GIVEN a push without the field
- THEN the stored contribution is `1`, exactly as today
- BUT it must NOT reject or change any push that is valid today

#### Scenario: invalid value

- GIVEN `target_contribution` is negative, non-numeric, or has more than 2 decimals
- THEN the push is rejected with 400 before any result is created

#### Scenario: contribution sent but nothing to attach it to

- GIVEN the field is sent and the ToC match yields no indicator, or an indicator whose target has no `number_target`
- THEN the result is created as today and the figure is not stored
- AND IT MUST log a warning naming the result and the reason (no secrets, per `.cursorrules`)

### `BTC-R-3` — Contract documentation

The change log of `bilateral-result-summaries.en.md` SHALL record both changes, the new input, the new `indicators` shape, and that `contributing_programs[]` is unaffected.

## 4. Non-Functional Requirements

- **Additive only** (TRD ADR-004): no existing key renamed, retyped or removed.
- **No extra query per result:** indicator data comes from the same `getTocMappingsByResultId` call.

## 5. Defect classes → gate

| Defect class | Gate |
|---|---|
| Row multiplication — joining indicators duplicates `toc_mappings` entries | Unit test over the repository mapper with a two-indicator fixture + manual SQL run against TEST DB for one real result (substitute: the SQL cannot run in Jest; human check at the HITL pause) |
| Wrong SQL join (indicator id type mismatch `related_node_id` vs `toc_results_indicator_id`) | Same manual SQL run on TEST DB — no automated gate; accepted as a HITL check |
| Contribution ignored / still `1` | `bilateral.service.spec.ts` assertion on the saved target row |
| Existing consumers break (QA mapper reads `toc_mappings[0]`) | `bilateral-quality-payload.builder.spec.ts` + mapper specs stay green |
| DTO accepts bad values | `npx tsc --noEmit` + DTO validation test |

## 6. Requirement ID Index

| ID | Title | Tasks |
|---|---|---|
| `BTC-R-1` | Indicator, target and contribution on each ToC mapping | `BTC-T-1` |
| `BTC-R-2` | Contribution on the push | `BTC-T-2` |
| `BTC-R-3` | Contract documentation | `BTC-T-3` |

## 7. Open Questions

- `BTC-OQ-1` — **Resolved 2026-09-28.** STAR pushes through the Fetcher (confirmed by David Casañas). The Fetcher's `toc_mapping` schema already declares `target_contribution` (`integer`) — `onecgiar_result_functions/services/fetcher/src/validator/schemas/common_fields.json:135`, `knowledge_product.json:175`, present on `origin/main`, `origin/dev`, `origin/dev-fetcher`, added in `e775010` (2026-02-25). It forwards the field today; PRMS drops it (`whitelist: true`, undeclared in `TocMappingDto`). No Fetcher change needed.
- `BTC-OQ-2` — **Resolved 2026-09-28.** Name is `target_contribution`, the name the Fetcher already forwards, used on input and output.
