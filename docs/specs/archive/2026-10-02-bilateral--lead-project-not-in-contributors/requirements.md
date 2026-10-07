# Requirements — Bilateral lead W3/bilateral project shown apart from contributors

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `lead-project-not-in-contributors` |
| Owner | Santiago Sánchez |
| Status | approved (2026-10-02) |
| Depth | **Lite** |
| Type | Change (mirror of P2-3864, which did the same for the lead Center) |
| Proposal | none — escalated from `/akili-quick` (fails the triviality gate: new computeds + payload invariant) |
| Decisions | User, 2026-10-02: label **"Lead W3/bilateral project"**; applies to API-reported results too |
| Approval Mode | gated |

## 1. Context

In the bilateral **Contributors & partners** section (`onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/`), the lead project currently shows up inside **Contributing W3/bilateral projects** in two ways: as a starred orange chip that can't be removed (e.g. `★ R-A-2018-144`), and as a disabled option in the picker. P2-3864 (`155f1c091`) already removed the lead **Center** from Contributing CGIAR centers. It did this as a display-only change: the lead is still stored and still sent in the PATCH. The lead project gets the same treatment, plus a read-only field of its own.

Cross-references: `docs/prd.md` AC-4 (bilateral stability; the payload is unchanged) · `docs/ux-ui/design.md` DD-6 (bilateral result-creator) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: no change.

## 2. Scope

**In:** where the lead project is displayed in the section: a new read-only field, and its removal from the contributors chips, options and picker model.
**Out:** the server, DTOs, `buildContributorsPayload()`, the MDS tracker item `lead-project`, the Center filter pills (P2-3859), the lock on derived Centers (BCT-T-6), and the W1/W2 `rd-contributors-and-partners` page.

## 3. Functional Requirements

### Requirement LPC-R-1: Lead project shown apart

The section SHALL show the result's lead project once, in a read-only field labelled **"Lead W3/bilateral project"**, placed directly above "Contributing W3/bilateral projects". It applies to manual and API-reported results alike.

#### Scenario: Result with a lead project (manual or API)

- GIVEN a bilateral result whose lead project is `R-A-2018-144` and is present in the projects catalogue
- WHEN the Contributors & partners section renders
- THEN a read-only field "Lead W3/bilateral project" shows `R-A-2018-144` (short name, falling back to the full name)
- BUT it must NOT be editable or removable, in either edit or read-only mode

#### Scenario: Result with no lead project (rare: no `is_lead` row — every API-ingested result checked on 2026-10-02 had one)

- GIVEN a result with no lead project
- WHEN the section renders
- THEN the "Lead W3/bilateral project" field is not rendered at all (no empty placeholder, no `-`)

### Requirement LPC-R-2: Lead project not repeated under contributors

"Contributing W3/bilateral projects" SHALL NOT show the lead project, either as a chip or as an option (enabled or disabled), with or without a Center filter pill selected.

#### Scenario: Lead hidden, other projects intact

- GIVEN lead project L and contributing projects A, B
- WHEN the section renders
- THEN the chips show exactly A and B, in their stored order, and the picker's model is [A, B]
- AND the picker's options do not include L
- BUT it must NOT hide any non-lead project, including selected projects that belong to another Center (the P2-3859 union)

### Requirement LPC-R-3: Stored lead and PATCH unchanged (display only)

The lead project SHALL stay stored as the lead. Every contributors save SHALL carry it with `is_lead: true`, exactly as before this change.

#### Scenario: Picker change and chip removal keep the lead in the payload

- GIVEN lead L and contributing A
- WHEN the user adds B through the picker, or removes A through its chip
- THEN the saved `contributing_bilateral_projects` still includes L with `is_lead: true`, plus the remaining non-lead projects
- AND IT MUST NOT send a list that lacks L, at any step

#### Scenario: Lead not resolvable in the catalogue

- GIVEN a lead project id that is not in the loaded projects catalogue, or a catalogue that failed to load
- WHEN the section renders
- THEN nothing is hidden or added compared with today's behaviour (no lead is identified, so nothing is filtered out)

## 4. Non-Functional Requirements

- **NFR-1:** No new design tokens. The new field reuses the existing "Lead center" read-only pattern (`app-pr-field-header` with `readOnly` + `.sc-readonly-value`).
- **NFR-2:** The lead must not be dropped by `app-pr-multi-select.writeValue`: whatever ids the picker model holds must also be in its options.

## 5. Defect classes → gate

| Defect class | Caught by |
|---|---|
| PATCH loses the lead (LPC-R-3) | Jest: assert the payload after a picker change and after a chip removal |
| Lead still listed, or a non-lead project hidden (LPC-R-2) | Jest: assert the computed option/model/chip lists |
| Template still bound to the old lists | Jest markup-contract test. This only checks the bindings are present; it cannot prove the rendered result |
| Wrong placement or styling of the new field, or the field shows when there is no lead | **No automated check** (jsdom does no layout). Substitute: a manual browser check at the HITL pause on one manual result and one API result |

## 6. Requirement ID Index

| ID | Title |
|---|---|
| LPC-R-1 | Lead project shown apart |
| LPC-R-2 | Lead project not repeated under contributors |
| LPC-R-3 | Stored lead and PATCH unchanged |
