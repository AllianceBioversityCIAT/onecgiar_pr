# Requirements — ToC KPI question optional vs. green check (`bugfix/toc-kpi-optional-green-check`)

## 1. Document Control

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Ticket | P2-4061 |
| Proposal | [`proposal.md`](./proposal.md), approved by Santiago on 2026-10-30 |
| OQ-1 | Resolved by Santiago's approval (2026-10-30): the question is optional in Contributors & partners for 2026 |
| Approval Mode | `gated` |
| ID prefix | `TKG` |

## 2. Executive Summary

For 2026+ results, the Contributors & partners green check must stop failing just because *"Can this result be mapped to a ToC KPI?"* is unanswered. That is the rule the form already shows.

## 3. Glossary

| Term | Meaning |
|---|---|
| ToC KPI question | `results_toc_result.planned_result`. Yes = `true`, No = `false`, unanswered = `NULL` |
| Green check | Server completeness flag of the section, from DB function `validation_contributor_partner_P25` |
| Phase year | `version.phase_year` of the result's `version_id` |

## 4. System Context & Scope

- **In scope:** the server completeness rule for the ToC block, and the QA catalog entry `toc.planned_result`.
- **Out of scope:**
  - The client form.
  - The other rules of the function (partners, delivery type, lead, innovation links).
  - Type 9 (P2-3901 already bypasses the ToC block for it).
  - The "Request to be added as contributor" form.

## 5. Stakeholders

Result submitters of 2026 results, who are blocked from Submit. PMU / QA, who read completeness and the QA catalog.

## 6. Functional Requirements

### TKG-R-1 — An unanswered question does not block the green check (2026+)

For a result whose phase year is 2026 or later, the ToC block of the green check SHALL pass when `planned_result` is unanswered. The rest of the section is evaluated exactly as today.

#### S-1.1 — Reproduction case (result 953)
- GIVEN a 2026 result with `planned_result` NULL, no ToC mapping rows, and every other Contributors & partners rule satisfied
- WHEN the green check is computed
- THEN the section is complete
- BUT it must NOT require ToC rows, an indicator, a target or a narrative for that result

#### S-1.2 — Yes keeps today's rule
- GIVEN a 2026 result that answered **Yes** with an incomplete ToC row (for example, no indicator)
- WHEN the green check is computed
- THEN the section is NOT complete

#### S-1.3 — No keeps today's rule
- GIVEN a 2026 result that answered **No** without a valid narrative
- WHEN the green check is computed
- THEN the section is NOT complete

#### S-1.4 — 2025 unchanged
- GIVEN a result whose phase year is 2025 with `planned_result` NULL
- WHEN the green check is computed
- THEN it is evaluated as today: the ToC rows are required, so it is NOT complete without them

#### S-1.5 — The other rules still apply
- GIVEN a 2026 result with the question unanswered
- WHEN another rule fails (for example, a partner with no delivery type)
- THEN the section is NOT complete

### TKG-R-2 — The QA catalog states the same rule

The QA catalog entry `toc.planned_result` SHALL declare the field optional (`required: false`), with the function as its confirmation. The catalog revision for 2026 SHALL increase by one.

#### S-2.1
- GIVEN the 2026 QA catalog
- WHEN `toc.planned_result` is read
- THEN `required` is false and `required_confirmed` is true
- AND the `visible_when` / `required_when` of `toc.entries`, `toc.narrative` and `toc.program_invested_financial_resources` are unchanged

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| TKG-NFR-1 | The change ships as a new migration with a working `down` that restores the body P2-3901 left in place (`1792000000000`). No existing migration is edited |
| TKG-NFR-2 | Outside the new gate, the function body stays byte-identical to the P2-3901 body |
| TKG-NFR-3 | `npm run migration:check` passes |

### Defect classes and their gates

| Defect class | Caught by |
|---|---|
| Gate missing or wrong in the latest function body (the bug itself) | Regression spec over the newest migration that defines the function (SQL text assertion), TKG-T-1 |
| Yes / No / 2025 / type-9 branches altered by accident | Same spec: the body outside the gate equals the P2-3901 body after whitespace normalisation |
| `down` does not restore the previous body | Same spec: `down()` issues the P2-3901 body |
| SQL that does not compile in MySQL, or a wrong column (`phase_year`) | **No automated gate:** Jest cannot run MySQL. Substitute: the migration runs on PRTest through the Jenkins deploy, plus the manual check in TKG-T-3 |
| Function behaviour on real rows (S-1.1 to S-1.5) | **No automated gate.** Substitute: TKG-T-3 on PRTest (953-equivalent, Yes-incomplete, No-without-narrative, 2025 result) |
| Catalog drift | `qa-catalog.contributors-partners.spec.ts` and the snapshot spec, TKG-T-2 |

## 8. Requirement ID Index

| ID | Task |
|---|---|
| TKG-R-1 (S-1.1 to S-1.5), TKG-NFR-1/2 | TKG-T-1 (static), TKG-T-3 (behaviour) |
| TKG-R-2 (S-2.1) | TKG-T-2 |
| TKG-NFR-3 | TKG-T-1 |
