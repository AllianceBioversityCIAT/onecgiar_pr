# Proposal — Link One Result To Multiple HLOs Under The Same AoW

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/multi-hlo-result-linking` |
| **Slug** | `multi-hlo-result-linking` — derived from free-text ticket description (no slug/path given in the argument) |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-09-18 |
| **Requester** | Ticket #163059 (support escalation by Nicoleta Trifa; reported by Ruvicyn Bayot – IRRI, Ruth Musengyá – CIMMYT; additional context from Scarlett Crawford) |

## 2. Intent

Let a result submitter link the same result (e.g. a Knowledge Product) to more than one High-Level Outcome (HLO) inside the same Area of Work (AoW), as long as every selected HLO shares the result's indicator typology — matching what the legacy POD tool allowed and what CIMMYT/IRRI submitters expect for 2027 reporting.

## 3. Problem / Current Behavior

Confirmed in code (backend + frontend investigation, 2026-09-18):

- **No backend or DB restriction exists.** `results_toc_result` (`onecgiar-pr-server/src/api/results/results-toc-results/entities/results-toc-result.entity.ts`) has no unique constraint on `(results_id, initiative_id)` or `(results_id, toc_result_id)`. The write DTO (`dto/create-results-toc-result-v2.dto.ts:84-104`, `ResultTocResultBlockDto.result_toc_results?: ResultTocResultItemDto[]`) already accepts an **array** of links, and `results-toc-results.service.ts` (~L997-1063, 1541-1616, 1651-1690) upserts each array entry independently with no "already linked" check and no dedup by AoW or typology.
- **The restriction is a pure frontend UI guardrail.** `rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/multiple-wps-content.component.ts`, method `validateSelectedOptionOutCome()` (lines 146-165): for every candidate outcome option, it sets `item.disabledd = true` whenever another already-selected tab has any outcome sharing the same `work_package_id` (= AoW) — disabling every other HLO in that AoW regardless of which specific node or indicator type, once one HLO in that AoW is picked. The sibling `multiple-wps.component.ts` caps the number of addable tabs (`getMaxNumberOfTabs()`, L156-176) to the count of distinct AoWs in the typology-filtered list, reinforcing "at most one HLO per AoW" as a UI ceiling.
- Net effect: a submitter sees the first HLO they pick under an AoW, then every other HLO under that same AoW becomes disabled in the dropdown — even when its indicator type matches and the API itself would happily save both links. Nothing stops the same outcome pair from being saved via a direct API call or bulk import today, which is itself a latent data-quality gap this proposal also closes by making the UI and the backend agree on the same rule.
- No existing Jest/Cypress spec asserts "one HLO link per AoW" — the current behavior is undocumented in tests, so removing/loosening it carries low regression risk on that front, but a new regression test must lock in the corrected rule (multi-select, typology-matched) so it doesn't silently regress back to single-select.

## 4. Proposed Outcome

When a submitter links a result to HLOs under an AoW, the selector allows choosing **multiple HLOs within the same AoW**, gated only by **indicator-typology match** (the same rule the ticket describes: "siempre y cuando la tipología del resultado coincida"). The backend continues to accept and persist all selected links (no server change required for the write path itself, since the array-based DTO/service already support it); the change enforces the typology-match rule explicitly at the point of selection/save so the relaxed UI doesn't silently allow mismatched types.

## 5. Scope

- **Client**: `multiple-wps-content.component.ts` — replace `validateSelectedOptionOutCome()`'s "disable every other HLO sharing this AoW" logic with a typology-match check (disable only outcomes whose indicator type differs from the result's, not all AoW siblings). `multiple-wps.component.ts` — adjust `getMaxNumberOfTabs()` so the tab ceiling is no longer artificially capped at one-per-AoW (cap should reflect the number of typology-matching HLOs available, not distinct AoWs).
- **Backend**: add an explicit typology-match validation in `results-toc-results.service.ts`'s upsert path (the methods around L997-1063 / 1541-1616 / 1651-1690) so the API itself rejects a link whose indicator type doesn't match the result's typology — closing the latent gap where a direct API call could already save mismatched or duplicate-AoW links with no guardrail at all.
- **Data**: no migration expected — no new column, no constraint change; this is a validation-logic change, not a schema change. Confirm at `/akili-specify` whether a partial-unique constraint is still desirable to prevent literal duplicate `(results_id, toc_result_id)` rows (accidental double-save of the *same* HLO), which is a narrower and separate concern from "one HLO per AoW".

## 6. Non-Goals

- Not changing Intermediate Outcome or 2030 Outcome attribution — those are handled by the separate `results/intermediate-outcome-aow-visibility/aow-selector` spec and are out of scope here.
- Not relaxing the typology-match rule itself — a result may still only link to HLOs whose indicator type matches its own; this proposal only removes the "one HLO per AoW" ceiling, not typology enforcement.
- Not retrofitting historical results — this is forward-looking for new/edited ToC links, not a backfill of past submissions.
- Not touching bilateral or platform-report payload shapes — `results_toc_result` rows already surface as an array downstream; multiple HLOs per AoW do not change that payload's shape (confirm at `/akili-specify` against `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` in case any consumer assumed at-most-one).

## 7. Affected Users, Systems, And Specs

- **Users**: result submitters (Initiative/Center staff, e.g. IRRI, CIMMYT) reporting KPs and other typed results against HLOs; PMU/portfolio leads relying on ToC alignment counts for 2027 reporting.
- **Client code**: `onecgiar-pr-client/src/app/.../rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/` (`multiple-wps.component.ts`, `multiple-wps-content.component.ts`).
- **Server code**: `onecgiar-pr-server/src/api/results/results-toc-results/` (`results-toc-results.service.ts`, `dto/create-results-toc-result-v2.dto.ts`).
- **Specs**: none pre-existing for this exact rule; related but distinct: `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector` (Intermediate Outcome AoW attribution — different indicator bucket, not touched here).

## 8. Visual Reference

- Source: None.
- Location: n/a.
- Notes: no Figma link or mockup provided by the user. This is a behavior change to an existing multi-tab selector (enable more tabs / stop disabling sibling options), not a new UI surface — recommend confirming at `/akili-specify` whether the existing `multiple-wps` tab UI scales visually to more simultaneous HLO tabs per AoW, or whether a lightweight mockup is warranted at that point.

## 9. Requirement Delta Preview

### ADDED Requirements
- A result may be linked to more than one HLO within the same AoW, provided every linked HLO's indicator type matches the result's typology.
- The backend validates typology match on write (new explicit check), independent of the UI.

### MODIFIED Requirements
- `validateSelectedOptionOutCome()` — disable rule changes from "any HLO sharing this AoW" to "any HLO whose indicator type doesn't match the result's typology."
- `getMaxNumberOfTabs()` — tab ceiling changes from "distinct AoW count" to "typology-matching HLO count."

### REMOVED Requirements
- The implicit "at most one HLO per AoW" ceiling is removed.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Client-only fix** | Change the disable/tab-cap logic in `multiple-wps-content.component.ts` / `multiple-wps.component.ts` to key off typology instead of AoW; leave backend as-is. | Fast, matches the ticket's immediate ask. Leaves the pre-existing gap where a direct API call can save mismatched-typology links, since the backend never enforced typology either. |
| **B. Client fix + backend typology validation (recommended)** | Do (A) and add the typology-match check in `results-toc-results.service.ts` so the API itself is the source of truth for the rule, not just the UI. | Slightly more work, but closes the latent data-quality gap the investigation surfaced and keeps the rule enforced even for bulk import / future API consumers — the smallest safe path that doesn't leave a known hole open while touching this exact code. |
| **C. Add a DB constraint** | Add a partial-unique constraint preventing duplicate `(results_id, toc_result_id)` or a typology-aware constraint at the DB layer. | Overkill for this ticket (duplicate-same-HLO is a separate, narrower concern than "one HLO per AoW"), needs a backfill/migration plan for existing rows, and constraint logic can't easily express "typology match" (that's a cross-table business rule, not a simple unique key). Defer unless `/akili-specify`'s data-model review finds real duplicate-row risk. |

**Recommended: Option B.** It resolves the ticket's actual ask (multi-HLO-per-AoW) and also fixes the API-side gap the investigation found, without the schema risk of Option C.

## 11. Risks, Dependencies, And Open Questions

- **Open question**: what exactly counts as "matching typology" — same `indicator_type_id`, or a broader compatibility rule? Needs confirmation with Nicoleta Trifa / a BA before `/akili-specify` finalizes the validation condition.
- **Open question**: does relaxing this change any existing PMU rollup or progress-bar math that assumed at-most-one HLO per AoW per result (e.g. `aow-bilateral.repository.ts`'s `indicatorResultTypeCaseSql` rollups)? Needs a check against reporting aggregations during `/akili-specify`.
- **Risk**: no existing test locks in current behavior, so there's no regression signal to compare against — the new spec's `tasks.md` must include net-new tests (client: `multiple-wps-content.component.spec.ts` for the corrected disable rule; server: a case in `results-toc-results.service.spec.ts` for the typology validation).
- **Risk**: 2027 reporting implications mentioned by Scarlett Crawford — confirm whether platform-report/bilateral consumers assume one HLO per AoW per result anywhere downstream before this ships, per AC-4 in `docs/prd.md` (bilateral/platform-report payload stability).
- **Dependency**: none on the `intermediate-outcome-aow-visibility` family — different indicator bucket, disjoint files.

## 12. Success Criteria

- A submitter can select 2+ HLOs under the same AoW for one result, as long as their indicator types match the result's typology.
- Selecting an HLO whose indicator type does not match the result's typology stays disabled/blocked, on both client and server.
- Existing Jest/Cypress suites for `multiple-wps`, `multiple-wps-content`, and `results-toc-results.service` stay green; new tests cover both the relaxed multi-select and the typology guard.

## 13. Next Step

```text
/akili-specify changes/multi-hlo-result-linking
```

Standard depth (Change track) — not Bug Mode, since this is new capability layered on confirmed current behavior, not a regression. Recommend the `software-architect` skill during `design.md` to settle the typology-match condition and confirm no downstream rollup assumes at-most-one-HLO-per-AoW.
