# Module Spec — Multi-HLO Result Linking — `design.md`

## 1. Summary

Removes the frontend's implicit "one HLO per AoW" ceiling from the ToC-alignment (`multiple-wps`) selector, and adds an explicit server-side typology guard on the actual write path (`createTocMappingV2`) so the rule holds even for writes that bypass the pre-filtered UI list. No schema change: the shape of `results_toc_result` and its DTOs already support multiple rows per result. The biggest constraint accepted: the existing server-side candidate-list filter (`_appendResultTypeIndicatorFilter`) is skipped for `bilateral`/`isUnplanned` flows, so those paths need the new write-time guard to be the *only* enforcement — there is no UI pre-filter safety net for them.

Requirements: `docs/specs/changes/multi-hlo-result-linking/requirements.md` (`MHL-R-1..5`). Project baseline: `docs/prd.md` (US-S1, US-S2, AC-6), `docs/trd/trd.md` (Results module, ToC module).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:**
  - `onecgiar-pr-server/src/api/results/results-toc-results/` — `results-toc-results.service.ts` (method `createTocMappingV2`, ~L1326-2000+).
  - `onecgiar-pr-server/src/api/results-framework-reporting/contributors-partners/` — `contributors-partners.service.ts:217`, the actual caller of `createTocMappingV2` (the P25 Contributors & Partners save flow — this is the real HTTP entry point for the V2 DTO, not `results-toc-results.controller.ts`, which only exposes the legacy `create()`).
  - `onecgiar-pr-server/src/toc/toc-results/` — `toc-results.repository.ts` (`_appendResultTypeIndicatorFilter`), read-only, referenced but not modified.
  - `onecgiar-pr-server/src/shared/constants/indicator-type-mapping.constant.ts` — reused, not modified (`RESULT_TYPE_TO_INDICATOR_PATTERN`, `indicatorResultTypeCaseSql`).
- **Client modules touched:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/multiple-wps.component.ts` (`getMaxNumberOfTabs`).
  - `.../multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts` (`validateSelectedOptionOutCome`).
- **External integrations touched:** none new. CLARISA/ToC data flow is unchanged (still read via `GET_tocLevelsByconfig`).

### 2.2 Sequence / interaction diagram

**Current (broken) flow:**

```
[multiple-wps.component] GET_tocLevelsByconfig(resultId, initiativeId, levelId)
  └── server: toc-results.service.ts findTocResultByConfigV2
        └── toc-results.repository.ts $_getResultTocByConfigV2
              └── _appendResultTypeIndicatorFilter (skipped if bilateral/isUnplanned)
                    → typology-filtered outcomeList/outputList/eoiList
  └── client: getMaxNumberOfTabs() caps tabs to distinct work_package_id count  ◄── BUG
  └── client: validateSelectedOptionOutCome() disables every other option sharing work_package_id  ◄── BUG
```

**Corrected flow:**

```
[multiple-wps.component] GET_tocLevelsByconfig(...)  (unchanged — already typology-pure for planned/non-bilateral)
  └── client: getMaxNumberOfTabs() caps tabs to candidate-list length (no AoW grouping)
  └── client: validateSelectedOptionOutCome() no longer disables AoW siblings — only omits items
        already excluded upstream, or already selected in another tab (duplicate-prevention only)
  └── [submit] PATCH/POST contributors-partners endpoint → createTocMappingV2(dto, user)
        └── NEW: per-item guard — for each ResultTocResultItemDto, resolve the result's result_type_id,
              build the LIKE pattern via RESULT_TYPE_TO_INDICATOR_PATTERN, and reject any item whose
              toc indicator type_value doesn't match (covers bilateral/isUnplanned + direct-API writes)
        └── upsert proceeds for all passing items (existing array-upsert behavior, unchanged)
```

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `ResultsTocResult` | `api/results/results-toc-results/entities/results-toc-result.entity.ts` | No change. Confirmed no unique constraint on `(results_id, initiative_id)` or `(results_id, toc_result_id)` — multiple rows per result already supported. |

### 3.2 Migrations

None. This is a validation-logic change on existing columns; no new column, index, or constraint.

### 3.3 CLARISA / external-data implications

None new. `toc-results.repository.ts` continues to read ToC nodes as today; the new server guard reuses `RESULT_TYPE_TO_INDICATOR_PATTERN` (already sourced from `ResultTypeEnum`, not a live CLARISA call).

---

## 4. API Surface

### 4.1 New / changed endpoints

No new endpoint and no route/path change. The existing endpoint that ultimately calls `createTocMappingV2` (via `contributors-partners.service.ts:217`) gains a new failure mode.

| Field | Value |
|---|---|
| **Method + path** | Existing P25 Contributors & Partners ToC-save route (owned by `results-framework-reporting/contributors-partners`) — confirm exact controller route during task breakdown by grepping the controller that injects `ContributorsPartnersService`. |
| **Version** | Unchanged. |
| **Auth** | Unchanged — JWT required, existing guard chain. |
| **Request DTO** | `ResultTocResultBlockDto` (`create-results-toc-result-v2.dto.ts`) — unchanged shape, `result_toc_results: ResultTocResultItemDto[]`. |
| **Response DTO** | Unchanged. |
| **Errors** | **New:** a typology-mismatch item now yields a validation error identifying which `toc_result_id` was rejected (message text only — no internals, per `HttpExceptionFilter` convention). Matching items in the same request array still persist (partial-success semantics, matching the existing per-item upsert loop). |
| **Telemetry** | Log (Nest `Logger`, no secrets) when a typology-mismatch item is rejected: `resultId`, `toc_result_id`, expected vs. actual pattern — for support/debugging ticket #163059-style reports. |

### 4.2 Bilateral / platform-report impact

Not applicable — `results_toc_result` rows already surface as an array in any downstream consumer; this change does not alter that shape. No entry needed in `bilateral-result-summaries.en.md`. Confirmed during requirements scoping (`MHL-R-` non-goals).

---

## 5. Server Workflow / Business Rules

- **Controller responsibility:** unchanged — DTO in (`ResultTocResultBlockDto`), response envelope out.
- **Service responsibility (`createTocMappingV2`):** gains one pre-upsert step: for each `ResultTocResultItemDto` in the array, resolve the owning result's `result_type_id` (already available in this method's scope — it operates per-result) and the target ToC node's indicator `type_value` (already joined/available since the method already writes `toc_result_id` against catalog data). Compare using the existing `RESULT_TYPE_TO_INDICATOR_PATTERN` mapping (reuse, do not re-derive) — a SQL `LIKE` equivalent (`indicatorResultTypeCaseSql`) is preferred if the check can be pushed into the existing query rather than done row-by-row in application code, to avoid N+1 lookups when the array is large.
- **Repository responsibility:** no new repository method planned unless the mismatch check needs a batched lookup for the ToC nodes' `type_value` — if `createTocMappingV2` doesn't already have that value in scope for every item, add a small repository helper to `toc-results.repository.ts` (read-only) that resolves `type_value` for a batch of `toc_result_id`s. Confirm scope during task breakdown by reading `createTocMappingV2` in full.
- **Transactions:** unchanged — the existing upsert transaction boundary is preserved; the new guard runs as a pre-check before the transactional upsert, not inside it, so a mismatch is a clean 4xx before any write starts for that item.
- **Concurrency:** no new concerns — this is a stateless validation added to an existing per-request flow.
- **Cross-module side effects:** none new (no notification, no audit-row change).

Cite `W1` context only loosely — this is not a status-transition workflow; it is a ToC-alignment write path adjacent to Results but not one of the numbered `W1..W8` workflows in `docs/trd/trd.md`. No TRD workflow section needs updating.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Existing `rd-theory-of-change` feature area, `multiple-wps` component tree.

### 6.2 Components & services

- **`multiple-wps.component.ts` — `getMaxNumberOfTabs(plannedResult, resultLevelId)`:** change the cap from `new Set(outcomeList.map(o => o.work_package_id)).size` (or equivalent AoW-keyed set) to the plain candidate-list length (`outcomeList.length` / `outputList.length` / `eoiList.length` depending on `resultLevelId`), since those lists are already typology-filtered upstream. No new `@Input` needed — the method already receives what it needs.
- **`multiple-wps-content.component.ts` — `validateSelectedOptionOutCome(tab?)`:** remove the `item.disabledd = true` branch keyed on `work_package_id` match against a different tab's selection. Keep (or add, if not already present) a narrower duplicate-prevention check: an item already selected in *another* tab (same `toc_result_id`) stays disabled, so the same exact HLO can't be picked twice — that's a distinct, still-valid rule from "one per AoW".
- No new component, no new API service method — this is a logic change inside existing methods.

### 6.3 Design system usage

- No new PrimeNG component. The existing disabled-option pattern (`disabledd` flag driving a `[disabled]` binding in the template) is reused as-is for the narrower duplicate-prevention case.
- Accessibility: confirm the existing disabled-option template already carries an accessible label/reason (per `docs/ux-ui/design.md` §10); if it doesn't distinguish "already selected elsewhere" from other disabled reasons, add a tooltip/aria-label during task breakdown (`MHL-R-10`, SHOULD).
- No new i18n keys expected unless a new tooltip string is added for the duplicate-prevention case — confirm during implementation.

### 6.4 Real-time / notification UX

None — no socket/notification change.

---

## 7. Security & Authorization

- No auth posture change — the existing JWT-gated route (via `contributors-partners` controller) is unchanged.
- The new server-side guard is a plain validation step inside an already-authenticated, already-role-scoped flow — no new guard/decorator needed.
- No secret handling implications.
- Input validation: the guard operates on data already passing through `class-validator` on `ResultTocResultItemDto`; no DTO field changes.

---

## 8. Performance & Capacity

- The new guard adds, at most, one batched lookup (or a reused join already in scope) per `createTocMappingV2` call — bounded by the size of the incoming `result_toc_results[]` array (typically small, a handful of HLO links per save). No pagination or hot-path concern.
- No Lambda bundle-size impact — reuses existing shared constants, no new dependency.
- No new caching needed.

---

## 9. Observability

- New structured log line on typology-mismatch rejection (event name e.g. `toc_result_typology_mismatch_rejected`, fields: `resultId`, `tocResultId`, no secrets) — gives support a trail for future tickets like #163059's underlying confusion.
- No new DynamoDB log usage.
- No SLO/metric change expected; this is a correctness fix, not a performance-sensitive path.

---

## 10. Testing Plan (forward-looking)

- **Unit (server):** `results-toc-results.service.spec.ts` — add cases: (a) two typology-matching HLO items under the same AoW both persist; (b) a typology-mismatched item is rejected while a matching sibling item in the same request still persists; (c) existing `createTocMappingV2` cases (already present, ~L215-516) stay green — read them fully before writing new cases to avoid duplicate coverage.
- **Unit (client):** `multiple-wps.component.spec.ts` — replace/extend the existing generic `getMaxNumberOfTabs` test with an AoW-sharing case that now returns a higher count than distinct-AoW would; `multiple-wps-content.component.spec.ts` — add a case proving two same-AoW options both stay enabled, and a case proving the same `toc_result_id` selected in two tabs is still blocked (duplicate-prevention, not AoW-based).
- **Integration:** not required — no new endpoint, no new controller route.
- **Payload tests:** not applicable — no bilateral/platform-report shape change.
- **Coverage uplift:** both touched server and client files already have specs; this spec should raise their line coverage, not just hold the floor (server 5/20/35/40, client 50/60/60/60 per `docs/trd/trd.md` §10 / root `CLAUDE.md`).
- **Defect-class mapping (what each gate catches):**

  | Defect class | Catching command |
  |---|---|
  | Server accepts a typology-mismatched write | `npx jest --testPathPattern results-toc-results.service.spec.ts` (new case (b) above) |
  | Client still disables a same-AoW, typology-matching option | `npx jest --testPathPattern "multiple-wps-content.component.spec.ts"` |
  | Tab cap still keyed off distinct AoW instead of candidate count | `npx jest --testPathPattern "multiple-wps.component.spec.ts"` |
  | Regression on existing `createTocMappingV2` callers (contributors-partners flow) | Existing `results-toc-results.service.spec.ts` suite (must stay green) + `contributors-partners.service.spec.ts` if it exercises this call — confirm at task breakdown |
  | Visual/accessibility of the disabled-option reason (tooltip/aria-label) | **No automated check** — Jest/jsdom cannot assert real rendered contrast or screen-reader announcement text meaningfully; this is a **human check at the HITL pause** during PR review, called out explicitly rather than assumed covered |

  The visual/a11y row is an accepted, explicitly recorded gap in automated coverage, substituted with a manual check — not silently left uncovered.

---

## 11. Backwards Compatibility & Migration Plan

- No database migration; additive validation logic only.
- API contract: additive (a previously-allowed-by-accident mismatched write, if any existed via direct API, now gets a 4xx it didn't get before — this is a deliberate tightening the ticket implies, not a breaking change to any documented contract).
- No feature flag needed — this is a straightforward bug-shaped correction, not a risky rollout.
- No data backfill: existing single-HLO-per-AoW rows remain valid untouched rows; nothing needs correcting retroactively (confirmed non-goal in requirements).
- No downstream consumer communication needed (no payload shape change).

---

## 12. Design Decisions (ADRs)

### `MHL-DD-1` — Reuse `RESULT_TYPE_TO_INDICATOR_PATTERN` instead of a new typology comparison

- **Context:** The proposal assumed a client-carried typology field would be needed for validation. Investigation found no shared `indicator_type_id` column between `Result` and ToC nodes — the existing codebase already solves "does this ToC indicator match this result type" via a LIKE-pattern mapping, used both to *filter* candidate lists (client GET path) and to *label* indicators for rollups (`aow-bilateral.repository.ts`).
- **Decision:** The new server-side write guard calls the same `RESULT_TYPE_TO_INDICATOR_PATTERN` / `indicatorResultTypeCaseSql` helpers (`shared/constants/indicator-type-mapping.constant.ts`) rather than introducing a third copy of this logic or a new column.
- **Alternatives considered:**
  - *New `indicator_type_id` column on both sides for a clean id-to-id join* — rejected: schema change, migration, and backfill for a comparison the LIKE-pattern mapping already answers correctly today.
  - *Re-implement the LIKE comparison inline in `createTocMappingV2`* — rejected: the mapping constant's own doc comment warns this exact duplication is how two copies "drift... in silence" (already happened once with `aow-bilateral.repository.ts`'s inline CASE before it was centralized).
- **Consequences:** the guard inherits any future edits to `RESULT_TYPE_TO_INDICATOR_PATTERN` automatically (good — single source of truth) but also inherits its current gaps (e.g., `OTHER_OUTCOME`/`OTHER_OUTPUT`/`IMPACT_CONTRIBUTION`/`COMPLEMENTARY_INNOVATION` result types have no pattern entry — see `MHL-DD-3`/Open Gaps).

### `MHL-DD-2` — Remove the AoW-keyed disable, keep a narrower same-node duplicate guard *(reversion challenge applied — see below)*

- **Context:** `validateSelectedOptionOutCome()`'s current behavior (disable every option sharing `work_package_id` with an already-selected option in another tab) is being removed — this is a reversion of already-shipped behavior, so it gets the Step 2.3 challenge.
- **Reversion challenge — "what does removing this break?"**: The AoW-wide disable was never a deliberate typology safeguard (the investigation confirmed the candidate lists are already typology-pure); it was, in effect, an accidental "one HLO per AoW" ceiling with no product justification found in code comments, tests, or the TRD. The one thing it *does* still usefully prevent — selecting the exact same ToC node twice across two tabs — is preserved as a separate, narrower check (same `toc_result_id`, not same `work_package_id`). No other caller or test asserts the AoW-wide behavior (confirmed: no spec covers it). **Answer: removing the AoW-wide grouping breaks nothing that has a test, a requirement, or a documented rationale; the one real protection it incidentally provided (no duplicate node) is kept explicitly.**
- **Decision:** disable only (a) options the server already excluded from the list (typology-filtered upstream) and (b) options already selected in a different tab by exact `toc_result_id`.
- **Alternatives considered:** keep a configurable per-AoW cap (e.g. "max 3 HLOs per AoW") — rejected for this ticket; no product ask for a cap surfaced (`MHL-OQ-3` left open, not blocking).
- **Consequences:** submitters can now select as many typology-matching HLOs across one AoW as the candidate list offers; if PMU later wants a soft cap, it's a follow-up, not a blocker here.

### `MHL-DD-3` — Leave the `bilateral`/`isUnplanned` filter-skip as-is; rely on the new write guard for those paths

- **Context:** `_appendResultTypeIndicatorFilter` is intentionally skipped for `bilateral` and `isUnplanned` flows (pre-existing behavior, not introduced by this spec). Those flows therefore never got a typology-filtered candidate list to begin with.
- **Decision:** do not change the filter-skip behavior (out of scope — it may be intentional for reasons this spec didn't investigate, e.g. bilateral results not always having a clean `result_type_id` yet at ToC-mapping time). Instead, the new `createTocMappingV2` write guard (`MHL-R-4`) is the enforcement point for these flows, since it runs regardless of which UI path produced the request.
- **Alternatives considered:** extend `_appendResultTypeIndicatorFilter` to also apply to bilateral/unplanned — rejected as out of scope; changing that pre-existing skip could have consequences for bilateral ingestion this spec hasn't scoped (`MHL-OQ-4` in requirements stays open, tracked as a follow-up, not a blocker for this spec since the write guard covers the correctness requirement either way).
- **Consequences:** bilateral/unplanned users may still *see* an unfiltered list in whatever UI drives those flows (if any) until/unless a follow-up spec addresses `MHL-OQ-4`; but they can no longer *save* a mismatched link, which is the ticket's actual correctness concern.

---

## Budget (Step 2.4)

- **Expected tasks:** 5 (server guard + test, client `multiple-wps` fix + test, client `multiple-wps-content` fix + test, a11y/tooltip follow-up for disabled reason, PR/rollout wrap-up). Likely collapses to 4 if the a11y tooltip is folded into the `multiple-wps-content` task.
- **Expected LOC:** ~120-180 (small, surgical: remove ~15-20 lines of AoW-grouping logic, add ~10-15 lines of duplicate-by-node-id logic, add ~40-70 lines of server guard + repository helper if needed, plus test additions which typically run 1.5-2x the production LOC for this kind of unit-test-heavy change).
- **Expected review rounds:** 1, given the change is a well-understood logic correction with no schema/API contract change; 2 if the a11y tooltip or the `MHL-OQ-4` follow-up triggers discussion.

This lands comfortably inside **Standard** depth — confirms the depth chosen in the proposal was appropriate; not dropping to Lite because the server-side guard and its test coverage are non-trivial enough to warrant full requirements/design/task structure, and not escalating to Full since there's no migration, no auth change, and no cross-cutting risk.

---

## 13. Open Gaps & Follow-ups

- **`MHL-OQ-2`** (PMU rollup assumption check) — not fully resolved in this design; `aow-bilateral.repository.ts`'s `indicatorResultTypeCaseSql` usage labels indicators by type but was not confirmed to assume at-most-one-HLO-per-AoW in its aggregation math. Flag for the implementer to verify no `COUNT(DISTINCT ...)` or `GROUP BY` there silently assumed singularity; if it did, that's a separate follow-up spec, not a blocker to shipping this one (the write path is correct either way).
- **`MHL-OQ-3`** (soft cap) — deliberately left open per `MHL-DD-2`; no cap implemented.
- **`MHL-OQ-4`** (bilateral/isUnplanned filter-skip) — deliberately left as a follow-up per `MHL-DD-3`; the write guard covers correctness, but the UX for those flows (if they have a comparable selector) isn't addressed here.
- **Result types with no `RESULT_TYPE_TO_INDICATOR_PATTERN` entry** (`OTHER_OUTCOME`, `OTHER_OUTPUT`, `IMPACT_CONTRIBUTION`, `COMPLEMENTARY_INNOVATION`, per `ResultTypeEnum`) — the guard's behavior for these types needs an explicit decision at task breakdown: treat "no pattern entry" as "no typology restriction" (permissive) or "reject all ToC links" (restrictive)? Recommend permissive (skip the guard when the result's type has no mapping entry) to avoid silently blocking result types the mapping was never extended to cover — record whichever choice is made as a code comment next to the guard.

---

## Required cross-references

- `docs/specs/changes/multi-hlo-result-linking/requirements.md` (same folder).
- `docs/prd.md` (US-S1, US-S2, AC-6), `docs/trd/trd.md` (Results module, ToC module), `docs/ux-ui/design.md` §10 (accessibility).
- No bilateral/platform-report doc change needed (confirmed no payload shape impact).
