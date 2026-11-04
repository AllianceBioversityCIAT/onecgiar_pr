# Module Spec — `requirements.md`

## 1. Document Control

- **Module:** `results` (result-framework-reporting home)
- **Sub-feature:** `my-centers-hide-icraf-cifor`
- **Depth:** Lite
- **Status:** `draft`
- **Ticket(s):** [P2-3852](https://cgiarmel.atlassian.net/browse/P2-3852) (INC-163884-6) · QA subtask P2-3921
- **Requested by:** Nicoleta Trifa — *"Pls hide these two Centers for now, not relevant for 2026 reporting: ICRAF and CIFOR."*

## 2. Executive Summary

The "My CGIAR Centers" grid on the reporting home hides **ICRAF** and **CIFOR** while the active reporting phase is **2026**, and its count badge reflects only the visible cards (16 → 14). This is a display-only filter: access rules and data are unchanged.

## 3. Glossary

| Term | Meaning |
|---|---|
| My CGIAR Centers | Card grid + count badge on the result-framework-reporting home, fed by the user's Center assignments |
| Active reporting phase | `dataControlSE.reportingCurrentPhase` (its `phaseYear`) |
| Hidden center | A center listed as hidden for the active phase year |

## 4. Scope

- **In:** the grid and count badge on the reporting home only.
- **Out:** center access checks (e.g. carry-forward eligibility), admin views, other center pickers/lists, backend, DB.

## 5. Functional Requirements

### MYC-R-1 — Hide ICRAF and CIFOR in Reporting 2026 (AC1, AC2, AC3)

The grid SHALL omit ICRAF and CIFOR when the active reporting phase year is 2026, and the count badge SHALL equal the number of rendered cards.

#### Scenario: 2026 phase

- GIVEN a user assigned to 16 centers including ICRAF and CIFOR
- WHEN the reporting home renders with active phase year 2026
- THEN neither ICRAF nor CIFOR appears in the grid
- AND the badge shows 14
- AND IT MUST match ICRAF/CIFOR by the center's acronym, case-insensitive

### MYC-R-2 — Other phases unaffected (AC4)

The grid SHALL show every assigned center for any phase year other than 2026, or while the phase is not loaded yet.

#### Scenario: 2025 phase

- GIVEN the same user
- WHEN the active phase year is 2025 (or still `null`)
- THEN all 16 centers are shown, including ICRAF and CIFOR

### MYC-R-3 — Display-only (AC5)

#### Scenario: Access unchanged

- GIVEN phase 2026 and a user assigned to ICRAF
- WHEN any center access check runs (`getMyCenters` / `validateCenterAccess`)
- THEN ICRAF is still returned
- BUT the filter must NOT be applied inside the roles service or any shared access helper

## 6. Non-Functional Requirements

- The hidden list lives in a single named constant keyed by phase year, so it can be changed next cycle without editing logic.
- The grid MUST re-filter when the phase finishes loading (zoneless CD — same `reportingPhaseVersion` dependency as `phaseLabel`).

## 7. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong center hidden / still visible in 2026 | Jest: component spec, 2026 case |
| Hidden in other phases | Jest: 2025 + `null` cases |
| Badge count ≠ cards | Jest: `myCentersList().length`; the template reads the same signal |
| Access lost (filter leaked into roles service) | Jest: roles-service stub remains unfiltered; diff review (Review = checklist) |
| Real acronyms in prod are not `ICRAF`/`CIFOR` | **No automated check** — `center_acronym` comes from `clarisa_institutions.acronym`. Substitute: QA check on TEST (P2-3921) with an account assigned to all 16 centers |

## 8. Requirement ID Index

| ID | Ticket AC |
|---|---|
| MYC-R-1 | AC1, AC2, AC3 |
| MYC-R-2 | AC4 |
| MYC-R-3 | AC5 |
