# Requirements — IPSR empty-state check counts unsaved rows

## 1. Document Control

| Field | Value |
|---|---|
| Module | `ipsr` (client) — Step 1 (Facilitators, Experts), Step 3 Current Use (Actors, Organizations, Other) |
| Spec path | `docs/specs/bugfix/ipsr-empty-state-active-check/` |
| Owner | santiago.sanchez@cgiar.org |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Depth · Mode | Lite · Bug |
| Approval Mode | gated |
| Ticket | none yet (proposal OQ-2 n/a — not raised) |
| Source | [`proposal.md`](./proposal.md) — Bug Diagnosis (confirmed root cause) |

## 2. Executive Summary

`hasElementsWithId(list, attr)` in three IPSR components decides whether to show the "No … provided" empty state while editing. It currently counts only rows with `item.is_active === true`. Row models never initialize `is_active` on creation — it stays `undefined` until an explicit delete sets it `false` — so a brand-new row the user just filled in is not counted, and the empty state renders next to real data. The fix SHALL count any row that is not explicitly `is_active === false`, matching the pattern already correct elsewhere in the same codebase (`innovation-use-form.component.ts:509`, `step-n1-innovaton-use.component.ts:109`).

> **Pivot (2026-09-28, see `execution.md` → Pivot Record: `IPSR-ESC-T-2`):** the `is_active != false` rule alone is not sufficient for **Facilitators, Actors, and Organizations**. These three lists are auto-populated with a blank placeholder row by `getSectionInformation()` (`step-n1.component.ts:110-127`, `step-n3.component.ts:82-87`) whenever their array is empty — on initial load AND after every save. That placeholder is structurally identical to a genuine unsaved user row (`is_active` also `undefined`), so `is_active != false` alone makes the empty state disappear permanently once a section has been saved once, even with no real data entered. `IPSR-ESC-R-2` below adds the fix for this. **Experts and Other quantitative measures are NOT auto-populated this way** — `is_active != false` alone remains correct and unchanged for those two lists.

## 3. Glossary

| Term | Meaning |
|---|---|
| Unsaved row | A row added client-side this session via an "Add …" button, not yet persisted, so it has no server id |
| `is_active` | Row-level soft-delete flag; `undefined` at creation, set to `false` only on delete, never set to `true` |
| Edit mode | `!api.rolesSE.readOnly` — the branch of `hasElementsWithId` affected by this fix |

## 4. System Context & Scope

- **In scope:** the edit-mode branch of `hasElementsWithId(list, attr)` in `step-n1.component.ts`, `step-n1-experts.component.ts`, `step-n3-current-use.component.ts`. **(Pivot 2, 2026-09-28)** also the edit-mode branch of `hasElementsWithId(list, attr)` in `shared/components/innovation-use-form/innovation-use-form.component.ts`, for its "current use" Actors/Organizations/Measures call sites only (`IPSR-ESC-R-3` below) — this file renders the same auto-populated arrays as `step-n1.component.ts` and was incorrectly assumed correct-by-reference; see `execution.md` → Pivot Record 2.
- **Out of scope:** the read-only branch (unchanged, still keyed on `item[attr]`); `step-n4-bilateral-investment-table.component.ts` / `step-n4-partner-co-investment-table.component.ts` (same pattern, not reproduced — proposal OQ-1); any server, DTO, or green-check change; `innovation-use-form.component.ts`'s `innovation_use_2030.*` call sites (never auto-populated, unaffected); `innovation-use-form.component.ts`'s usage from the Results module (`rd-result-types-pages/innovation-use-info/`) is affected only incidentally (the opt-in parameter changes nothing there since that usage never auto-populates blank rows either).
- Refs: `docs/prd.md` (general reporting-form usability); `docs/trd/trd.md` IPSR module (client). No prior spec touches these three files' `hasElementsWithId`.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| IPSR reporter, Step 1 | Adding a Facilitator or Expert row and filling it in no longer shows a contradictory "No … provided" message |
| IPSR reporter, Step 3 Current Use | Same for Actors, Organizations, and Other (measures) rows |

## 6. Functional Requirements

### Requirement `IPSR-ESC-R-1`: An unsaved, non-deleted row counts as present

In edit mode, the system SHALL count a row as present when `item.is_active` is not strictly `false` (i.e. `true` or `undefined`), for the Facilitators, Experts, Actors, Organizations, and Other (measures) lists.

#### Scenario 1.1: Newly added row with data, not yet saved (the reported case)

- GIVEN an editable IPSR package, Step 1 Facilitators, with one row added via "Add Lead/Co-Lead" and no `is_active` set
- AND the row's fields are filled in (First Name, Last Name, Email, Role)
- WHEN the section renders
- THEN the "No facilitators provided" empty state SHALL NOT be shown
- AND IT MUST also not be shown for the equivalent newly added row in Experts (Step 1), and in Actors / Organizations / Other (Step 3 Current Use)

#### Scenario 1.2: All rows deleted in this session

- GIVEN one or more rows whose `is_active` was explicitly set to `false` by the delete action, and no other rows present
- WHEN the section renders
- THEN the empty state SHALL be shown

#### Scenario 1.3: Read-only mode is unaffected

- GIVEN a read-only (submitted/locked) view of the same section
- WHEN the section renders
- THEN presence SHALL still be determined by `item[attr]` (the saved id), exactly as before this fix
- BUT it must NOT start reading `is_active` in read-only mode

### Requirement `IPSR-ESC-R-2`: A system-added blank placeholder row does not count as present

In edit mode, for **Facilitators, Actors, and Organizations only**, the system SHALL additionally require that the row's primary/gating field be filled in before counting it as present — a row that only exists because `getSectionInformation()` auto-pushed a blank placeholder (all fields unset) SHALL NOT suppress the empty state. **Experts and Other quantitative measures are unaffected** — `IPSR-ESC-R-1` alone governs them, unchanged.

| List | Primary/gating field(s) required |
|---|---|
| Facilitators | any of `first_name`, `last_name`, `email`, `workshop_role` |
| Actors | `actor_type_id` |
| Organizations | `institution_types_id` |

#### Scenario 2.1: Auto-added blank placeholder row, no data entered

- GIVEN an editable IPSR package, Step 1 Facilitators (or Step 3 Actors/Organizations), where the array was empty and `getSectionInformation()` auto-pushed a blank placeholder row
- AND no field on that row has been filled in
- WHEN the section renders
- THEN the "No … provided" empty state SHALL be shown, even though the array's length is 1

#### Scenario 2.2: User fills in the primary field of that same placeholder row

- GIVEN the state in Scenario 2.1
- WHEN the user fills in the row's primary/gating field (e.g., picks an Actor type, or types a Facilitator's first name)
- THEN the "No … provided" empty state SHALL NOT be shown — this is `IPSR-ESC-R-1` scenario 1.1, still in effect

#### Scenario 2.3: Experts and Other quantitative measures are unaffected

- GIVEN an editable IPSR package, Step 1 Experts, or Step 3 Other quantitative measures
- WHEN the section renders, with or without an unsaved/blank row
- THEN behavior SHALL be governed by `IPSR-ESC-R-1` alone (`is_active != false`), exactly as before this addendum — these two lists are never auto-populated with a blank placeholder, so no additional check is needed or applied

### Requirement `IPSR-ESC-R-3`: The shared `innovation-use-form` component gets the same placeholder-row fix

`shared/components/innovation-use-form/innovation-use-form.component.ts` renders IPSR Step 1's "Targeted innovation use" Actors, Organizations, and Other quantitative measures — the same `ipsrStep1Body.innovatonUse.*` arrays `step-n1.component.ts` auto-populates with a blank placeholder row when empty (per `IPSR-ESC-R-2`). This component's `hasElementsWithId` SHALL receive the same `significantFields` mechanism as `IPSR-ESC-R-2`, for these 3 lists only.

| List | Primary/gating field(s) required |
|---|---|
| Actors | `actor_type_id` |
| Organizations | `institution_types_id` |
| Other quantitative measures | `quantity` (NOT `unit_of_measure` — the auto-pushed placeholder pre-fills it to `'# of hectares'`, a non-empty default, so it cannot be the significant field) |

#### Scenario 3.1: Auto-added blank placeholder row in "Targeted innovation use"

- GIVEN an editable IPSR package, Step 1, "Targeted innovation use" section, where the Actors (or Organizations, or Measures) array was empty and `step-n1.component.ts`'s `onSectionInformation()` auto-pushed a blank placeholder row
- AND no significant field on that row has been filled in (for Measures: `quantity` is unset, even though `unit_of_measure` may already read `'# of hectares'`)
- WHEN the section renders
- THEN the "No … provided" / "Other quantitative measures not added" empty state SHALL be shown

#### Scenario 3.2: User fills in the primary field

- GIVEN the state in Scenario 3.1
- WHEN the user fills in the row's significant field (Actor type, Organization, or a real Quantity)
- THEN the empty state SHALL NOT be shown

#### Scenario 3.3: The 2030 projection and the Results-module usage are unaffected

- GIVEN the same component rendering `innovation_use_2030.*` (IPSR Step 1's 2030 projection block), or rendering from `rd-result-types-pages/innovation-use-info/` (Results module)
- WHEN the section renders
- THEN behavior SHALL be unchanged — these call sites are not passed `significantFields`

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No change to save payloads, green checks, or the read-only branch |
| Regression safety | Existing specs in the three affected `.spec.ts` files (which fix `is_active` explicitly to `true`/`false`) stay green |

## 8. Requirement ID Index

| ID | Summary | Scenarios |
|---|---|---|
| `IPSR-ESC-R-1` | Unsaved/non-deleted row counts as present, in edit mode only | 1.1, 1.2, 1.3 |
| `IPSR-ESC-R-2` | A system-added blank placeholder row (Facilitators/Actors/Organizations only) does not count as present until its primary field is filled | 2.1, 2.2, 2.3 |
| `IPSR-ESC-R-3` | Same fix applied to the shared `innovation-use-form.component.ts` (IPSR Step 1 "Targeted innovation use": Actors/Organizations/Measures) | 3.1, 3.2, 3.3 |

## Defect Classes → Verification

| Defect class | Caught by |
|---|---|
| Fix not applied / reverted in one of the 3 files (empty state still shows over unsaved data) | Jest regression per file with `is_active: undefined` — RED on current code, GREEN after |
| Fix applied but breaks the "all deleted" empty state | Existing `is_active: false` fixtures in each `.spec.ts`, kept green |
| Fix leaks into the read-only branch | Existing readOnly-branch test in each file (keyed on `attr`, e.g. `id`), kept green — asserts the count is unchanged |
| A blank placeholder row (all fields unset) counts as present for Facilitators/Actors/Organizations | Jest regression per file with the primary field unset — RED before `IPSR-ESC-R-2`'s fix, GREEN after |
| The primary-field check leaks into Experts or Other quantitative measures | Existing Experts/measures tests (no third `significantFields` argument), kept green and unchanged |
| Real render (does the empty state actually toggle in the DOM, not just the helper's return value) | **No automated gate** in this spec (component unit tests call the method directly, not through a fixture-driven `*ngIf` render). Substitute: manual check at the HITL pause — reproduce scenario 1.1 AND scenario 2.1/2.2 in a running app |
