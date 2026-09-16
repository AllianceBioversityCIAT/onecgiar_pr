# Requirements — Emerging results should not require "Contribution to indicator target" (Lite, Bug Mode)

## 1. Module / Feature
- **Module:** `result-framework-reporting` (dashboard-lab)
- **Sub-feature:** `lab-report-form` — emerging-result creation
- **Status:** approved (from `proposal.md`)
- **Bug Mode:** yes — see confirmed root cause in `proposal.md` §4.

## 2. Context
`lab-report-form.component.ts`'s `missingFields()` unconditionally requires `contribution_to_indicator_target`, even when the result is being reported as an **Emerging Result** (`isEmerging()` true — no `tocNode`/indicator, so there is no target to contribute toward). This blocks `canSave()` on a field that has no real meaning in that flow. See `docs/prd.md` general reporting-completeness goals; no PRD `AC-*` explicitly names this field, this is a defect in a recently-added requiredness rule (see component's own `CLAUDE.md`).

## 3. In Scope / Out of Scope

### In scope
- Skip the `contribution_to_indicator_target` requiredness check in `missingFields()` when `isEmerging()` is `true`.

### Out of scope
- Hiding or disabling the field for emerging results (stays visible/editable).
- Any other field's requiredness, the KP/handle flow, or the innovation-link question.
- The legacy `aow-hlo-create-modal` (not the live emerging entry point).
- Server/payload contract changes.

## 4. Functional Requirements

### Required (MUST)
- **ECN-R-1** WHEN `isEmerging()` is `true`, the system MUST NOT include `'Contribution to indicator target'` in `missingFields()`, regardless of whether `contribution_to_indicator_target` is empty, `null`, or a value.
- **ECN-R-2** WHEN `isEmerging()` is `false` (indicator-tied reporting), the system MUST continue to include `'Contribution to indicator target'` in `missingFields()` when the value is `null` or an empty/whitespace string — unchanged from current behavior.

## 5. Scenarios

#### Scenario: Emerging result — empty contribution does not block save
- GIVEN `emergingMode` is `true` (`emergingCategory: null`, `indicator: null`, `tocNode: null`)
- AND the user has filled the result title (and category/level, if required)
- WHEN `contribution_to_indicator_target` is left empty
- THEN `missingFields()` does NOT contain `'Contribution to indicator target'`
- AND `canSave()` is `true` once every other required field is filled

#### Scenario: Non-emerging (indicator-tied) result — unchanged behavior
- GIVEN a normal indicator-tied result (`isEmerging()` is `false`)
- WHEN `contribution_to_indicator_target` is empty
- THEN `missingFields()` DOES contain `'Contribution to indicator target'`
- BUT it must NOT regress the existing "0 counts as answered" rule for the non-emerging case (a `0` value satisfies the check)

## 6. Non-Functional Requirements
Not applicable — pure client-side validation-logic fix, no performance/security/a11y surface.

## 7. Defect Classes & Verification Mapping

| Defect class | Catching command |
|---|---|
| Emerging path still blocked by the contribution check (fix not applied / applied wrong) | New Jest test asserting `missingFields()` excludes the field when `emergingMode: true` |
| Non-emerging path accidentally stops requiring the field (over-broad fix) | Existing Jest tests at `lab-report-form.component.spec.ts:333-351` (already assert requiredness + the "0 counts" rule) — must stay green |
| Regression in unrelated `missingFields()` branches (category, title, handler, innovation link) | Full existing suite for `lab-report-form.component.spec.ts` — must stay green |

No class here is unmeasurable — this is a pure computed-signal unit-test surface, fully covered by Jest.

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| ECN-AC-1 | `emergingMode: true`, title filled, contribution empty | `missingFields()` is read | List does not contain `'Contribution to indicator target'`; `canSave()` is `true` |
| ECN-AC-2 | Non-emerging indicator, title filled, contribution empty | `missingFields()` is read | List contains `'Contribution to indicator target'` (unchanged) |
| ECN-AC-3 | Non-emerging indicator, title filled, contribution `0` | `missingFields()` is read | List does not contain it (existing "0 counts as answered" rule preserved) |

## 9. Dependencies & Assumptions
- Depends on existing `isEmerging()` computed (`lab-report-form.component.ts:225`) — no new signal needed.
- Assumes no other consumer reads `missingFields()`'s content string for anything besides display/gating (confirmed in proposal §4 Impact & Scope).

## 10. Open Questions
None — root cause and scope confirmed in `proposal.md`.

## Required cross-references
- `proposal.md` (this folder) — approved intent, Bug Diagnosis.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/CLAUDE.md` — documents the current (incomplete) requiredness rule; to be updated on completion.
