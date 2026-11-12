# Proposal — Contribution saved from Result detail lands without its ToC target anchor

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/contribution-target-anchor` |
| Slug | `contribution-target-anchor` — derived from free-text argument (INC-168252 brief) |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | Freshservice **INC-168252** (Nicoleta Trifa, 2026-11-12) |
| Requirement source | Ticket text + PROD API reads (2026-11-12) + PROD SELECTs run by the user (2026-11-12) |
| Depends on | none |
| Parallel-safe | yes |
| Related specs | `bugfix/toc-target-row-duplication` (TTD — owns `resolveTargetIdentity`), `bugfix/reported-results-center-scoping` (RRC — owns the anchored vs centre-intersection rule), `bugfix/achieved-counts-submitted` (ACS) |

## Intent

When a user links an existing result to a ToC indicator from **Result detail → Contributors & partners**, the contribution must count on that KPI's Achieved, just as it does when the result is created from the KPI's own *Report* button.

## Problem / Current Behavior

- Result **21527** (id 33767, Innovation development, Submitted) was linked today to B4T › AOW02 › HLO7, KPI 9378 (target 2026 = 5, centre CIMMYT), with contribution **1**. The KPI row still shows **Achieved 0** — PROD `GET /api/results-framework-reporting/toc-results?program=SP01&areaOfWork=AOW02` → indicator 9378 `achieved_value_sum: 0` (run 2026-11-12).
- The stored row has no anchor: PROD SELECT → `result_indicators_targets` 25057, `contributing_indicator 1`, `number_target 6`, `target_date 2026`, **`toc_indicator_target_id NULL`**, created 2026-11-12 07:04:46 by user 90 (run by the user 2026-11-12).
- The catalog *does* have the target: PROD SELECT on `Integration_information.toc_result_indicator_target` → `333606 / number_target 6 / target_date 2026` for node `4549a001-…`; result phase year = 2026 (run by the user 2026-11-12).
- Without an anchor, the per-row figure falls back to the result's **lead centre** (`aow-bilateral.repository.ts:1271-1277`, RRC). Lead = Bioversity (Alliance, inst 49) ≠ row centre CIMMYT (inst 50) → 0 (PROD `GET /v2/api/contributors-partners/33767` → `contributing_center`, run 2026-11-12).
- PROD scale (user SELECT, 2026-11-12) — active 2026 rows with a contribution and NULL anchor: **status 1: 19 rows / 19 results · status 2: 29 / 26 · status 3: 10 / 10** (58 rows, ~55 results).

## Proposed Outcome

1. Every new contribution saved from Contributors & partners carries the selected indicator's target for the result's phase year.
2. A payload that still arrives without identity is resolved by the server when the catalog leaves no doubt (exactly one target for that year).
3. The 58 existing PROD rows are backfilled where unambiguous; the ambiguous ones are listed for a human decision.

## Scope

| # | In scope |
|---|---|
| S-1 | Client — `multiple-wps-content`: when a KPI is selected (`mapTocResultsIndicatorId`), stamp `targets[0]` with the selected indicator's phase-year `toc_indicator_target_id` (+ `number_target`, `target_date`), keeping `contributing_indicator`; switching KPI on a tab overwrites the previous identity |
| S-2 | Server — `resolveTargetIdentity` safety net: payload with no usable identity + exactly one catalog meta for the phase year → use it; >1 → keep NULL + `warn` log (no guessing) |
| S-3 | Server — an own `toc_indicator_target_id` that is NOT in this indicator's catalog is ignored (falls through to the other steps) instead of being trusted blindly |
| S-4 | PROD data backfill, handed to the user (environment labelled **PROD**): preview SELECT → backup table → UPDATE only unique-meta rows → active `COMMIT` → verification SELECT from a fresh tab; ambiguous rows listed separately |
| S-5 | Regression tests (red before / green after), scoped Jest `--maxWorkers=2` / `--findRelatedTests` on changed files |

## Non-Goals

- Changing the lead-centre rule for unanchored rows (RRC stays as is).
- Overview "0 of 111" — it counts KPIs that met their target; 1 of 5 does not complete one. Not a bug.
- Changing result 21527's status (Nicoleta asked to return it to Editing — the user does it by hand).
- The framework *Report* create path (already anchors: `framework-result-toc-indicators.service.ts:230,243`).
- Bilateral ingestion writer (`bilateral.service.ts:2038`).

## Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| SP submitters / PMU (Nicoleta) | KPI Achieved becomes correct for results linked from Result detail |
| `onecgiar-pr-client` · `rd-contributors-and-partners/components/multiple-wps/**` | Payload change (S-1) |
| `onecgiar-pr-server` · `results-toc-results.repository.ts` (`resolveTargetIdentity`, `saveInditicatorsContributing`) | Identity resolution (S-2, S-3) |
| PROD DB `result_indicators_targets` | 58 rows (S-4) |
| Specs | TTD (identity), RRC (anchor rule) — this spec extends TTD's resolution order, does not replace it |

## Visual Reference

- Source: None
- Notes: no UI change — the fix is in what the existing form sends and how the server resolves it.

## Bug Diagnosis

### Observed Symptom

KPI row Achieved stays 0 (and the AoW/HLO roll-ups do not move) after a Submitted/QA'd result is linked to the KPI with a contribution from Result detail.

### Reproduction Steps

1. Take a result whose **lead centre differs** from the KPI target's centre (e.g. 21527: lead Bioversity; KPI 9378: CIMMYT).
2. Result detail → Contributors & partners → add a ToC tab, pick the HLO and the KPI, enter contribution 1, save; submit.
3. Reporting tab → KPI row: **expected** Achieved 1 · **actual** 0. DB: new `result_indicators_targets` row with `toc_indicator_target_id NULL`.

### Root Cause (confirmed)

- A new tab is created with `targets: [{ contributing_indicator: null }]` (`multiple-wps.component.ts:319`); selecting the KPI only sets `toc_results_indicator_id` (`multiple-wps-content.component.ts:385-390`, `mapTocResultsIndicatorId`) — `targets[0]` never receives `toc_indicator_target_id`, `indicators_targets`, `number_target` or `target_date`.
- Server identity resolution (`results-toc-results.repository.ts:2783-2823`) tries own id → PK → `number_target`+year. All three are absent → `tocTargetId = null`. The row is inserted anyway with the **canonical** `number_target` (`:1904-1907` / `:2054-2057`), which is why the DB shows `6` with a NULL anchor.
- Read side then applies the unanchored rule (lead-centre intersection) → 0 for a different lead centre.
- Matches every fact: catalog has a unique 2026 meta (333606), phase year 2026, row created by today's save.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline -i --grep="INC-168252"` → no hits; `git log --all -8 -- …/multiple-wps.component.ts` → last touches P2-3542, P2-3245/3275, P2-3171 (none about target identity) — run 2026-11-12 | Not fixed |
| **Live path?** | Save → `PATCH v2/api/contributors-partners/:resultId` (`contributors-partners.controller.ts:48`) → `ContributorsPartnersService` → `ResultsTocResultsService.createTocMappingV2` (`contributors-partners.service.ts:233`) → `saveIndicatorsPrimarySubmitter` (`results-toc-results.service.ts:2104`) → `saveInditicatorsContributing` (`results-toc-results.repository.ts:3067` → `:1806`) → `resolveTargetIdentity` (`:2066`) | On path — confirmed by the row created today with NULL anchor |
| **Siblings on the same state** | (a) contributor-initiative tabs use the same component and reach `saveIndicatorsContributors` → `processToc` → `saveInditicatorsContributing` (`repository.ts:3100-3212`); (b) switching KPI on an existing tab keeps the previous target object → its `toc_indicator_target_id` is trusted by step 1 without catalog check (`repository.ts:2788-2791`) — `UNVERIFIED — confirm at source before relying on it` (owner: Implementer, T-1 test); (c) bilateral review drawer sends `number_target` (`result-review-drawer.component.ts:772`) → resolves via step 3, not affected | (a) covered by S-1/S-2 · (b) covered by S-1 + S-3 · (c) out |
| **Downstream consumers** | `aow-bilateral.repository.ts` `getIndicatorContributionsByCenter` / `sumContributionsForCenters` (KPI Achieved, HLO/AoW/program roll-ups), `getIndicatorResultStatusLinks` (KPI status chip anchors, KRC), `existing-result-contributors-loader.service.ts` (drawer filter by anchor), Overview AoW %, bilateral QA `contributors-and-partners.mapper.ts` | Numbers will rise where rows get anchored — expected; no contract shape change |

- Data integrity: 58 PROD rows under-counted today; 36 of them (status 2/3) already feed Achieved. No security impact.

### Fix Strategy

Smallest safe correction = S-1 (client stops sending an identity-less target) + S-2/S-3 (server tolerant and strict at once) + S-4 (data). Route: `/akili-specify` (Lite) in **Bug Mode** — logic + data change, regression test mandatory.

## Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| A | Client only (S-1) + backfill | Smallest diff | Any other caller sending an identity-less target repeats the bug |
| B | Server only (S-2) + backfill | One choke point, covers every caller | Ambiguous years (several targets/centre groups) stay NULL; client still sends nothing |
| **C** | **Client + server safety net + catalog check + backfill (S-1…S-5)** | Fixes the source, guards the choke point, rejects stale ids | Two packages touched |

## Recommended Approach

**Option C.** The client is the root cause and must send what it knows; the server already owns identity resolution (TTD) and gaining a unique-meta fallback plus a catalog check there is a few lines in one function. Backfill uses the same unique-meta rule, so code and data agree.

## Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R-1 | Achieved figures rise on some KPIs once 36 QA'd/Submitted results are anchored — tell Nicoleta in the ticket reply |
| R-2 | Indicators with several targets for the same year (combination groups by centre) stay unresolved — listed for a manual decision, never guessed |
| R-3 | `saveInditicatorsContributing` is shared with contributor initiatives and the framework edit path — regression tests must cover the existing TTD scenarios unchanged |
| R-4 | Backfill runs on PROD by the user; DBeaver script must end with an active `COMMIT` + fresh-tab check (memory: a commented COMMIT lost a batch before) |
| OQ-1 | Does the client indicator option already carry per-year `targets[].toc_indicator_target_id`? (`selectedIndicatorData()?.targets?.[0]` is rendered at `multiple-wps-content.component.html:121`) — confirm at `/akili-specify` |
| OQ-2 | Status 1 (Editing) rows: backfill too (recommended — they will count on submit) |

## Success Criteria

- Linking a result to a KPI from Result detail stores a non-NULL `toc_indicator_target_id` when the year has one target.
- Result 21527's KPI 9378 row shows Achieved 1 after backfill (or re-save).
- PROD count of active 2026 contribution rows with NULL anchor drops to the ambiguous remainder only.
- Regression test red before / green after; TTD and RRC suites stay green.

## Next Step

```text
/akili-specify bugfix/contribution-target-anchor
```

Bug Mode (Lite) — regression test mandatory.
