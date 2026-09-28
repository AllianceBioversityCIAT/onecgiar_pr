# Requirements — IPSR Lead contact person save guard parity

## 1. Document Control

| Field | Value |
|---|---|
| Module | `ipsr` (client) — General information |
| Spec path | `docs/specs/bugfix/ipsr-lead-contact-save-guard/` |
| Owner | santiago.sanchez@cgiar.org |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Depth · Mode | Lite · Bug |
| Approval Mode | gated |
| Ticket | none yet (proposal OQ-2) |
| Source | [`proposal.md`](./proposal.md) — Bug Diagnosis (confirmed root cause) |

## 2. Executive Summary

IPSR General information MUST apply the same Lead contact person save rule as Results W1/W2 on every portfolio: block a name that was **typed and never picked**, and let through a picked contact, an empty field, a name **loaded** with the package, and a name accepted with **"use this name anyway"**. Today IPSR blocks only on P22 and ignores loaded/accepted names, so P25 silently erases the stored contact and P22 cannot save legitimate free-text names.

## 3. Glossary

| Term | Meaning |
|---|---|
| Typed-unpicked | The field holds text the user typed in this session and no directory result was picked |
| Loaded name | A name present when the package was opened (from the server), picked or free text |
| Accepted name | A free-text name the user confirmed with "use this name anyway" (RES-DD-1) |
| Stored contact | `lead_contact_person` (+ `lead_contact_person_id`) persisted on the result row |

## 4. System Context & Scope

- **In scope:** the save action of IPSR General information (P22 and P25), and the guidance presentation of its Lead contact person field from 2026.
- **Out of scope:** the shared `lead-contact-person-field` component behaviour, Results W1/W2, Bilateral, any server/SQL change, and the IPSR green check (proposal OQ-1).
- Refs: `docs/prd.md` `AC-1` (typed result integrity); `docs/ux-ui/design.md` Result Detail / IPSR General information form; `docs/trd/trd.md` IPSR module (client). Antecedents: archived P2-3260 and RES-DD-1 specs.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| IPSR reporter (P25) | A save made mid-search is blocked with the "not found" message instead of erasing the stored contact |
| IPSR reporter (P22) | "Use this name anyway" and loaded free-text names now save |

## 6. Functional Requirements

### Requirement `IPSR-LCG-R-1`: Typed-unpicked name blocks the save on every portfolio

The system SHALL refuse to save IPSR General information while the Lead contact person holds a typed-unpicked name, on P22 and P25.

#### Scenario 1.1: P25 save mid-search (reproduction A)

- GIVEN a P25 Innovation Package in General information
- AND the user typed a non-blank name in Lead contact person without picking a directory result
- WHEN the user presses Save
- THEN no General information save request is sent
- AND the field shows the "not found in the directory" message
- BUT it must NOT send `lead_contact_person: null` or otherwise alter the stored contact

#### Scenario 1.2: same on P22

- GIVEN a P22 Innovation Package, same field state as 1.1
- WHEN the user presses Save
- THEN no save request is sent and the "not found" message is shown

### Requirement `IPSR-LCG-R-2`: Legitimate contact states always save

The system SHALL save IPSR General information, on P22 and P25, when the Lead contact person is a picked contact, an accepted name, a loaded name left untouched, or blank.

#### Scenario 2.1: accepted name (reproduction B)

- GIVEN a typed name with no directory match
- WHEN the user clicks "use this name anyway" and then Save
- THEN the save request is sent carrying that free-text name
- AND IT MUST NOT show the "not found" message

#### Scenario 2.2: loaded free-text name

- GIVEN a package opened with a free-text Lead contact person (no directory record)
- WHEN the user presses Save without touching the field
- THEN the save request is sent and no "not found" message appears

#### Scenario 2.3: picked contact and blank field

- GIVEN a contact picked from the directory, or a blank / whitespace-only field
- WHEN the user presses Save
- THEN the save request is sent

### Requirement `IPSR-LCG-R-3`: Guidance presentation matches Results from 2026

When the 2026 reporting-guidance presentation applies, the Lead contact person guidance SHALL render in the ⓘ tooltip, as on Results; otherwise it SHALL keep the inline description box.

#### Scenario 3.1

- GIVEN the 2026 reporting-guidance flag is on
- WHEN IPSR General information renders
- THEN the Lead contact person field receives the tooltip presentation
- BUT it must NOT change the presentation when the flag is off

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Data integrity | A save MUST NOT erase a stored contact as a side effect of an unfinished search (`AC-1`) |
| Backwards compatibility | No change to request/response contracts or to the shared field component |
| Regression safety | Existing IPSR General information specs stay green, except the one test that pins the P22-only rule, which is inverted and recorded |

## 8. Requirement ID Index

| ID | Summary | Scenarios |
|---|---|---|
| `IPSR-LCG-R-1` | Typed-unpicked blocks save, all portfolios | 1.1, 1.2 |
| `IPSR-LCG-R-2` | Picked / accepted / loaded / blank save | 2.1, 2.2, 2.3 |
| `IPSR-LCG-R-3` | 2026 guidance in ⓘ tooltip | 3.1 |

## Defect Classes → Verification

| Defect class | Caught by |
|---|---|
| Guard still skipped on P25 (data loss persists) | Jest regression for 1.1 — `PATCHIpsrGeneralInfo` not called, `showContactError` true; RED on current code |
| Guard over-blocks accepted/loaded names (P22 today; P25 if only `isP22()` is removed) | Jest regressions for 2.1 / 2.2 with `queryCameFromHydration = true`; 2.1 RED on current code with P22 |
| Guard reads the field before it exists (`@ViewChild` unresolved) | Jest case with no field child → typed-unpicked still blocks |
| Tooltip binding missing / inverted | Jest template assertion on the field's `guidanceAsTooltip` input for flag on/off |
| Real browser flow (field ↔ section wiring through the live DOM) | **No automated gate** in this spec (jsdom + mocked service). Substitute: manual check at the HITL pause — reproductions A and B on a local build |
