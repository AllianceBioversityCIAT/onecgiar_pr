# Requirements — Innovation Use: Youth required, no silent Non-youth

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/innovation-use-youth-required` |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Module | results (Innovation Use, result type 2) |
| Ticket(s) | Marc Schut batch 1, item 7 · INC-167167 · epic P2-3094 · Jira child P2-4049 (confirmed by Santiago 2026-11-12) |
| Proposal | `proposal.md` (approved 2026-11-10, Option A) |
| Status | approved (Santiago, 2026-11-11) |

## Executive Summary

For 2026+ W1/W2 Innovation Use results, a Women or Men total greater than 0 needs its Youth figure (0 allowed) before the actor section can be complete. While Youth is empty, Non-youth shows empty instead of copying the total.

## Glossary

| Term | Meaning |
|---|---|
| Grid | Women / Youth / Non-youth and Men / Youth / Non-youth inputs of an actor row with "Sex and age disaggregation does not apply" unticked |
| Non-youth | Never stored. Always derived as total − Youth |
| In-scope result | Innovation Use, phase year ≥ 2026, source not W3/Bilaterals, not IPSR (the gate already used by the P2-4048 Farmers questions) |
| Age fallback | "Age disaggregation not available" tick, which splits 50/50 (P2-3537) |

## System Context & Scope

Current behavior (cited in `proposal.md` → Bug Diagnosis):
- Non-youth = total − Youth in the client (`innovation-use-form.component.ts:693`) and on the server read (`summary.service.ts:394-395`). An empty Youth therefore yields Non-youth = total.
- `validation_innovation_use_P25` requires women/men only, never youth (archived after.sql `:194-199`, `:382-387`).

In scope: both grids (current use, 2030 projection) of the shared form; the server read; the DB function.
Out of scope: IPSR (item 11), bilateral W3, 2025 results, the age fallback, Households rows (no grid), editable Non-youth (Option B), data backfill.

## Stakeholders / Personas

| Persona | Change |
|---|---|
| Result submitter (2026 W1/W2) | Must type Youth, 0 if none |
| QA reviewer / PMU | Youth figures come from the reporter, not from a system default |

## Functional Requirements

### IUY-R-1 — Non-youth is never the total by default

The form SHALL show Non-youth empty while Youth is empty, and SHALL show total − Youth once Youth has a value.

#### Scenario: the failing case from the reproduction
- GIVEN an in-scope result and an actor row with the grid shown and the age fallback unticked
- WHEN the reporter types Women = 100 and leaves Youth empty
- THEN Women Non-youth stays empty
- AND a hint under the grid asks for the Youth number (0 if none)
- BUT it must NOT show 100 (or any value) in Non-youth

#### Scenario: Youth typed
- GIVEN the same row
- WHEN the reporter types Youth = 0
- THEN Non-youth shows 100 and the hint disappears

#### Scenario: both grids
- GIVEN an in-scope result
- THEN IUY-R-1 holds the same way in the 2030 projection grid

### IUY-R-2 — Youth is required for completeness when the total is above 0

The completeness check SHALL treat an in-scope actor row as incomplete when Women > 0 and Women Youth is empty, or when Men > 0 and Men Youth is empty, in both sections (current use and 2030 projection).

#### Scenario: blocked
- GIVEN an in-scope result whose other Innovation Use fields are complete
- AND an actor row with Women = 100 and Women Youth empty
- WHEN the section is validated
- THEN the section is incomplete (red) and the result cannot be submitted

#### Scenario: zero total
- GIVEN a row with Women = 0 and Women Youth empty
- THEN that row does not block completeness
- AND IT MUST still require Women and Men to be present, as today

#### Scenario: unaffected results
- GIVEN a 2025 result, a W3/bilateral result, an IPSR package, a row with "Sex and age disaggregation does not apply", or a block marked "to be determined"
- THEN the completeness outcome is exactly what it was before the change
- BUT the age-fallback row must NOT turn red (its Youth values are filled by the split)

### IUY-R-3 — The server read does not invent Non-youth

The Innovation Use read for the result form SHALL return Non-youth as empty (null) when the matching Youth or total is empty, and total − Youth otherwise.

#### Scenario
- GIVEN a stored actor row with men = 5000 and men_youth null
- WHEN the form loads it
- THEN men_non_youth is null, not 5000
- AND a row with men = 10 and men_youth = 4 still returns 6

Note: this read is shared by every phase and source. For a 2025 or W3 row with empty Youth, Non-youth now shows empty instead of the total. This is a display-only correction: nothing is stored and no completeness rule changes for those results (IUY-R-2 scope).

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| IUY-NFR-1 | No schema change and no migration. Only the DB function body changes, applied by hand in TEST then PROD with before/after snapshots and a checks file (P2-4048 pattern) |
| IUY-NFR-2 | Copy in English, under the existing `explanation_message` style; no new UI primitive |
| IUY-NFR-3 | Tests run scoped and with `--maxWorkers=2`; `--findRelatedTests` on the changed files before push |

## Defect Classes and Gates

| Defect class | Gate |
|---|---|
| Client still derives Non-youth from an empty Youth | Client Jest on `innovation-use-form` (regression test, red before / green after) |
| Server read returns the total | Server Jest on `summary.service` `getInnovationUse` (regression test) |
| DB rule wrong, or leaks to 2025/W3/fallback | `checks.sql` before/after categories on TEST (falsifier: an in-scope row with Women > 0 and youth null still returns 1) |
| Type errors the runner hides | `npx tsc --noEmit -p` on client and server (or the build) |
| Hint placement and copy look wrong | No automated check. Visual check by Santiago at the HITL pause on PRTest |
| Live PROD function drifted from the archived snapshot | T-0 `SHOW CREATE FUNCTION` diff. Stop if it differs |

## Requirement ID Index

| ID | Title | Tasks |
|---|---|---|
| IUY-R-1 | Non-youth never the total by default | IUY-T-2, IUY-T-4 |
| IUY-R-2 | Youth required when total > 0 | IUY-T-0, IUY-T-3 |
| IUY-R-3 | Server read does not invent Non-youth | IUY-T-1 |
