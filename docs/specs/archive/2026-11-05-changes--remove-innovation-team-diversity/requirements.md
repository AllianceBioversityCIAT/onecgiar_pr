# Requirements — Remove "Innovation team diversity" from the 2026 Innovation Development form

> **Answer first:** from the 2026 phase on, Innovation Development results no longer show or require the team-diversity question; 2025 and earlier render and validate exactly as today; no stored answer changes.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` → Innovation Development info (`rd-result-types-pages/innovation-dev-info`) |
| Spec path | `docs/specs/changes/remove-innovation-team-diversity/` |
| Type | Change (Enhancement, S5) |
| Depth | Standard (small, but touches a live DB validation function) |
| Approval Mode | gated |
| Status | draft — 2026-11-05 |
| Ticket | _pending_ (feedback list item 5) |
| Source | `proposal.md` (approved by Santiago 2026-11-05) |
| Module code | `ITD` |

## 2. Executive Summary

The question is self-reported, unverified and unused downstream, yet required. This spec retires it **by phase**, the same way Megatrends was retired (P2-3264): hidden and not required from 2026, untouched before 2026, and fully reversible because nothing is deleted.

## 3. Glossary

| Term | Meaning |
|---|---|
| Team-diversity question | `result_questions` 112 (Yes 113 / No 114 / Does not apply 115) and the Yes children 116–121 |
| Phase year | The reporting year of the result's phase (not its portfolio) |
| Green check | Section completeness flag computed by the DB routine `validation_innovation_dev_P25` |
| 2026 reduction gate | The existing client rule that retires Innovation Dev blocks from phase year 2026 |

## 4. System Context & Scope

### In scope
- Innovation Dev info section rendering (2026+ hides the question).
- Green check for 2026+ Innovation Development results (question no longer a condition).
- QA field catalog (field becomes a phase-gated 2026 removal).

### Out of scope
- P22 rules and the P22 validation repository query.
- Bilateral payload shape (`innovation_team_diversity` key stays; empty for 2026 results).
- Summary / PDF export structure.
- Deleting or deactivating questions, options or answers.
- Innovation Use / IPSR forms (the component is used only by Innovation Dev info — verified 2026-11-05).

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter | 2026+: one fewer required question |
| QA reviewer | 2026+: field not catalogued |
| PMU lead / bilateral consumer | No new team-diversity data for 2026+; historic data intact |
| Platform admin | Can re-enable later by moving the gate (see proposal "Reversibility") |

## 6. Functional Requirements

### Requirement ITD-R-1: The 2026+ form does not show the question

The system SHALL NOT render the team-diversity question on the Innovation Dev info section of a result whose phase year is 2026 or later.

#### Scenario ITD-R-1.S1: 2026 result
- GIVEN an Innovation Development result in a 2026 phase
- WHEN the user opens the Innovation Dev info section
- THEN the "Innovation team diversity" heading, its three radio options and its multi-select are not rendered
- BUT the rest of the section (responsible innovation, IPR, investment, etc.) MUST render exactly as before

#### Scenario ITD-R-1.S2: gate follows the phase year
- GIVEN a result whose phase year is 2025 but whose portfolio is P25
- WHEN the section opens
- THEN the question IS rendered
- AND IT MUST decide by phase year, never by portfolio

### Requirement ITD-R-2: Earlier phases are unchanged

A result with phase year ≤ 2025 SHALL render the question with its stored answers and keep it required.

#### Scenario ITD-R-2.S1: 2025 result keeps its answers
- GIVEN a 2025-phase result with "Yes" + gender + regional selected
- WHEN the section opens
- THEN the question renders with "Yes", gender and regional checked
- AND the green check still requires an answer to it

### Requirement ITD-R-3: The 2026+ green check ignores the question

The completion routine SHALL NOT require the team-diversity question for results with phase year ≥ 2026.

#### Scenario ITD-R-3.S1: complete 2026 result without the answer
- GIVEN a 2026 Innovation Development result with every other required field complete and no team-diversity answer
- WHEN the green check is computed
- THEN the Innovation Dev info section is complete
- BUT a 2025 result with the same data MUST still be incomplete

### Requirement ITD-R-4: No stored data changes

Hiding the question SHALL NOT insert, update, deactivate or delete any `result_answers` row of questions 112–121.

#### Scenario ITD-R-4.S1: saving a 2026 result with a legacy answer
- GIVEN a 2026 result (e.g. replicated from 2025) that has stored team-diversity answers
- WHEN the user saves the Innovation Dev info section
- THEN those answers remain stored and active, unchanged

#### Scenario ITD-R-4.S2: reversibility
- GIVEN the gate is later removed or moved to a later year
- WHEN a 2026 result is opened
- THEN the stored answers render again without any data restore

### Requirement ITD-R-5: The QA catalog follows the form

The QA field catalog SHALL treat the team-diversity field as a phase-gated 2026 removal, in the same way as Megatrends, and its version SHALL be bumped.

#### Scenario ITD-R-5.S1
- GIVEN the QA catalog definitions
- WHEN the catalog snapshot test runs
- THEN `innovation_dev.team_diversity` is out of the 2026 catalog
- AND `docs/qa-catalog.en.md` and the snapshot reflect it

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | `/api/bilateral/*` payload shape unchanged (`AC-4`); no change-log entry needed |
| Phase correctness | Gate keyed on phase year (`AC-5`) |
| Reversibility | Re-enable = remove/move gate + revert one condition in the DB function; no data restore |
| Security | No secrets in logs or SQL scripts (`.cursorrules`) |

## 8. Defect Classes → Gate

| Defect class | Caught by |
|---|---|
| Question still visible in 2026 / hidden in 2025 | Client Jest on the section (2026 vs 2025 phase) |
| 2026 results never reach green check | **No automated check** (DB function lives only in the DB). Substitute: SQL check by Santiago on real test rows (one 2026, one 2025) before and after, at the HITL pause |
| 2025 green check accidentally relaxed | Same SQL check — 2025 result without answer must stay incomplete |
| Save wipes legacy answers | Server unit test on `_saveSingleQuestion` path + SQL count of active 112–121 answers before/after one 2026 save on test |
| QA catalog drift | `qa-catalog` Jest specs + snapshot |
| Visual leftovers (spacing, orphan divider) | Not caught by jsdom — manual look at one 2026 result on local/PRTest |

## 9. Requirement ID Index

| ID | Summary | Scenarios |
|---|---|---|
| ITD-R-1 | Hidden 2026+ | S1, S2 |
| ITD-R-2 | ≤2025 unchanged | S1 |
| ITD-R-3 | Green check ignores it 2026+ | S1 |
| ITD-R-4 | No data changes, reversible | S1, S2 |
| ITD-R-5 | QA catalog gated | S1 |
