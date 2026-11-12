# Requirements — Contribution saved without its ToC target anchor (`bugfix/contribution-target-anchor`)

## Document Control

| Field | Value |
|---|---|
| Module / sub-feature | `results` · ToC indicator contributions (`result_indicators_targets`) |
| Spec Path | `bugfix/contribution-target-anchor` |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Status | draft |
| Ticket | Freshservice INC-168252 |
| Source | `proposal.md` (approved 2026-11-12) + PROD reads 2026-11-12 |
| Deviation from proposal | **S-1 (client stamps the anchor) dropped.** The list the form loads has no target id: PROD `GET /v2/toc/result/33767/initiative/50/level/1?planned=true` → indicator `4549a001-…` `targets: [{"target_value":"5"}]` (run 2026-11-12). The client has nothing to send; the server already reads the catalog on every save, so the fix lives there. |

## Executive Summary

When a contribution reaches the server without saying which ToC target it belongs to, the server SHALL anchor it to the indicator's target for the result's phase year **when there is exactly one**, reject a target id that does not belong to the indicator, and leave ambiguous cases unanchored (logged). Existing PROD rows are backfilled by a user-run script using the same rule.

## Glossary

| Term | Meaning |
|---|---|
| Anchor | `result_indicators_targets.toc_indicator_target_id` — which ToC target row (`toc_result_indicator_target`) a contribution counts toward |
| Catalog meta | One row of `toc_result_indicator_target` for the indicator node |
| Phase year | `version.phase_year` of the result |
| Unanchored rule | RRC read rule: a contribution without anchor counts on a KPI row only if the result's lead centre is one of the row's centres |

## System Context & Scope

- Contributors & partners sends `targets: [{ contributing_indicator }]` for a newly added indicator (`multiple-wps.component.ts:319`; KPI selection only sets `toc_results_indicator_id`, `multiple-wps-content.component.ts:385-390`).
- The server resolves identity by own id → PK → `number_target`+year (`results-toc-results.repository.ts:2783-2823`); with none present it inserts the row with a NULL anchor (`:1982-1983`, `:2117-2118`).
- PROD 2026 rows with a contribution and NULL anchor: 58 (status 1: 19 · status 2: 29 · status 3: 10), user SELECT 2026-11-12.

| In scope | Out of scope |
|---|---|
| Server identity fallback (unique meta per phase year) | Lead-centre rule (RRC) |
| Server rejection of a foreign own id | Client form changes (no data to send — see Deviation) |
| PROD backfill script (handed to the user) | Overview "0 of 111" (not a bug) |
| Regression tests | Result 21527 status change (user) |

## Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter | Contribution entered from Result detail counts on the KPI row |
| PMU lead (Nicoleta) | KPI Achieved / roll-ups reflect linked results |
| Platform admin (Santiago) | Runs the PROD backfill |

## Functional Requirements

### CTA-R-1 — Contribution without identity anchors to the year's single target

The system SHALL store the anchor of the indicator's only catalog target for the result's phase year when the saved target carries no usable identity.

#### Scenario CTA-S-1: Failing case of INC-168252

- GIVEN result 33767 (phase year 2026) mapped to indicator node `4549a001-…`, whose catalog has exactly one 2026 meta (`333606`, number_target 6)
- AND the save payload's target is `{ contributing_indicator: 1 }` with no `toc_indicator_target_id`, `indicators_targets` or `number_target`
- WHEN Contributors & partners is saved
- THEN the stored `result_indicators_targets` row has `toc_indicator_target_id = 333606`
- AND `contributing_indicator = 1`, `number_target = 6`, `target_date = 2026` as today
- BUT it must NOT change the stored row count (still one active row for that indicator)

#### Scenario CTA-S-2: Ambiguous year is not guessed

- GIVEN the indicator's catalog has two or more metas for the phase year
- AND the payload target carries no usable identity
- WHEN saved
- THEN the row is stored with `toc_indicator_target_id = NULL` (today's behaviour)
- AND a `warn` log names result id, indicator node and the candidate count
- BUT it must NOT pick any of the candidates

#### Scenario CTA-S-3: Existing anchor is never overwritten

- GIVEN a stored row that already has an anchor
- WHEN the same target is re-saved without identity
- THEN the stored anchor is kept (TTD-R-4 rule unchanged)

### CTA-R-2 — A target id that is not the indicator's is not trusted

The system SHALL ignore a payload `toc_indicator_target_id` that is not among the indicator's catalog metas and continue with the remaining resolution steps.

#### Scenario CTA-S-4: KPI switched on an existing tab

- GIVEN a payload target carrying `toc_indicator_target_id = X` where X belongs to a different indicator
- WHEN saved under indicator node N
- THEN X is not stored for N
- AND the row resolves through the next steps (PK, number+year, CTA-R-1), ending NULL only if all fail
- AND IT MUST keep accepting an own id that IS in N's catalog (TTD behaviour unchanged)
- BUT when the catalog read returns no metas at all, the own id is kept as today (nothing to validate against)

### CTA-R-3 — PROD backfill of existing unanchored rows

The deliverable SHALL include a PROD SQL script the user runs that anchors existing rows using the CTA-R-1 rule.

#### Scenario CTA-S-5: Backfill

- GIVEN active rows with a contribution, NULL anchor, result phase year 2026
- WHEN the user runs the script in PROD
- THEN a preview SELECT lists every candidate row with its resolved anchor and an ambiguity flag
- AND a backup table holds the rows before change
- AND the UPDATE changes only rows whose indicator has exactly one meta for the year
- AND the script ends with an active `COMMIT` and a verification SELECT run from a fresh tab
- BUT it must NOT touch ambiguous rows — they are listed separately for a manual decision
- AND IT MUST be labelled **PROD** in the hand-off

### CTA-R-4 — Existing resolution unchanged

The system SHALL keep TTD's resolution order and outcomes for payloads that already carry a valid own id, a catalog PK, or a matching number+year.

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| CTA-NFR-1 | No additional DB query per save: reuse the catalog list already read once per indicator per save |
| CTA-NFR-2 | No API request/response shape change; no migration |
| CTA-NFR-3 | Tests run scoped: `--findRelatedTests` on changed files, `--maxWorkers=2` |

## Defect Classes → Gate

| Defect class | Gate |
|---|---|
| Wrong/no anchor chosen (CTA-R-1/R-2) | Jest on `results-toc-results.repository.spec.ts` — new regression cases (red before, green after) |
| TTD regression (CTA-R-4) | Existing TTD cases in the same spec, unchanged and green |
| Type error in the repository | `npx tsc --noEmit -p tsconfig.json` (server) |
| Backfill updates wrong rows (CTA-R-3) | **No automated check** — substitute: preview SELECT counts reviewed by the user at the HITL pause before UPDATE + post-COMMIT verification count |
| Read-side figure not moving after anchor | Live check on PRTest/PROD after deploy: KPI 9378 Achieved = 1 (human check) |

## Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| CTA-R-1 | Anchor to the year's single target | CTA-S-1, CTA-S-2, CTA-S-3 |
| CTA-R-2 | Reject foreign own id | CTA-S-4 |
| CTA-R-3 | PROD backfill | CTA-S-5 |
| CTA-R-4 | TTD resolution unchanged | (existing TTD scenarios) |
