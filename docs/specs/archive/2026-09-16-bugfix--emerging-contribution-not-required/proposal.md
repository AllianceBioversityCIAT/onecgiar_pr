# Proposal — Emerging results should not require "Contribution to indicator target"

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/emerging-contribution-not-required` |
| Type | Bug |
| Slug derivation | Derived from free-text argument: "Ese campo Contribution to Indicator Target no se pide para emerging results ... no debe ser obligatorio" → `emerging-contribution-not-required` |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-09-11 |

## 2. Intent

Reporting an **Emerging Result** through the "Report emerging result" flow should not be blocked by the "Contribution to indicator target" field — that field is meaningless for an emerging result and must not be mandatory in this specific entry path.

## 3. Problem / Current Behavior

`lab-report-form.component.ts` computes `missingFields()` (the sole gate behind `canSave()` / the "Create and continue" button). It unconditionally requires `contribution_to_indicator_target` for **every** result type, including emerging results created via `emergingMode` / `emergingCategory`:

```ts
// lab-report-form.component.ts ~L774-775
if (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === '')
  missing.push('Contribution to indicator target');
```

This requirement was added deliberately (see the component's own `CLAUDE.md`: *"`Contribution to indicator target` pasó a ser OBLIGATORIO — el diseño lo marca con `*`"*) for the normal, indicator-tied reporting flow. Emerging results, however, are created without a `tocNode`/indicator context (`isEmerging()` computed at L225 — `emergingMode() || !!emergingCategory()`), so there is no indicator target to contribute a numeric amount toward. Forcing the field blocks emerging-result creation on an input that has no real meaning in that context.

## 4. Bug Diagnosis

### Observed Symptom
When reporting via **Report emerging result**, the "Create and continue" button stays disabled until the user types a number into "Contribution to indicator target," even though nothing in the emerging flow ties that number to any indicator.

### Reproduction Steps
1. Open the Reporting shell → "Report emerging result" (or the hub card / `?reportEmerging=true` entry point) → the aside opens `lab-report-form` in `emergingMode`.
2. Fill title (and category, if `needsResultLevelChoice()`), leave "Contribution to indicator target" empty.
3. Observe `canSave()` stays `false` and the footer counter still lists "Contribution to indicator target" as missing.

### Root Cause (confirmed)
`missingFields()` (`lab-report-form.component.ts:774-775`) checks `contribution_to_indicator_target` unconditionally — it never reads `isEmerging()`. Every other emerging-specific carve-out in this component (`needsCategoryChoice`, `needsResultLevelChoice`, etc.) already branches on `emergingMode()`/`emergingCategory()`; this check was left out when the field became mandatory.

### Impact & Scope
- Confined to `lab-report-form.component.ts`'s `missingFields()` / `canSave()` computed chain — the single gate consumed by the template (`fieldInvalid('contribution')`) and by `createResult()`.
- No other consumer reads `contribution_to_indicator_target` requiredness; `buildCreateResultPayload` (`create-result-payload.util.ts`) just forwards whatever value is present (or absent) — confirmed no downstream required-field assumption there.
- Non-emerging (indicator-tied) reporting is unaffected — the fix only carves out the emerging path.

### Fix Strategy
Add an `isEmerging()` guard to the existing conditional so the check is skipped when true:

```ts
if (!this.isEmerging() && (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === ''))
  missing.push('Contribution to indicator target');
```

The field stays visible/editable (Card 2 "Target Contribution" is not otherwise gated) — this only removes it from the requiredness contract for emerging results, matching the user's ask ("no debe ser obligatorio," not "hide it"). This is a 1-line conditional change in one file, but it changes validation logic — the `/akili-quick` Triviality Gate explicitly excludes "modified conditionals," so this must go through `/akili-specify` (Lite) in **Bug Mode**, which requires a regression test (red before the fix: `missingFields()` includes 'Contribution to indicator target' with `emergingMode=true` and empty contribution; green after: it does not, while the non-emerging case still requires it).

**NO DEBE DE TOCAR NADA MÁS** — scope is strictly this one conditional in `missingFields()`. No other field, validation, template, or component changes.

## 5. Proposed Outcome

For any result created with `emergingMode() === true` (or a fixed `emergingCategory()`), `missingFields()` never lists "Contribution to indicator target," and `canSave()` is unaffected by that field being empty. Non-emerging (indicator-tied) creation keeps requiring it exactly as today.

## 6. Scope

- `lab-report-form.component.ts` — `missingFields()` computed, add `!this.isEmerging()` guard around the existing contribution check.
- A regression test in `lab-report-form.component.spec.ts` covering both the emerging (not required) and non-emerging (still required) cases.

## 7. Non-Goals

- Do not hide or disable the "Contribution to indicator target" field for emerging results — it stays visible/editable, just optional.
- Do not touch any other field's requiredness, the KP/handle flow, the innovation-link question, or any other `missingFields()` branch.
- Do not change `aow-hlo-create-modal` (the legacy modal) — out of scope, not the live emerging entry point per this folder's `CLAUDE.md`.
- Do not change the server/payload contract — `contribution_to_indicator_target` can already be absent on create; only the client-side gate changes.

## 8. Affected Users, Systems, And Specs

- **Users:** anyone reporting an Emerging Result via `dashboard-lab`'s "Report emerging result" flow.
- **Component:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts` (+ its `.spec.ts`).
- **Related docs to touch on completion:** this component's own `CLAUDE.md` "Layout — alineado al diseño" note, which currently states the field "pasó a ser OBLIGATORIO" without the emerging carve-out — should be updated to note the emerging exception once implemented (folder-doc convention, `docs/COMPONENT-DOCS.md`).

## 9. Visual Reference

- Source: None
- Location: n/a
- Notes: no visual change — the field's appearance, position, and helper text are unchanged; only its requiredness for the emerging path changes. No new/changed UI state to mock.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | Add `!this.isEmerging()` to the existing conditional in `missingFields()`. | Smallest possible change, consistent with existing emerging-mode branches (`needsCategoryChoice`, `needsResultLevelChoice`) in the same file. |
| B | Hide the "Target Contribution" card entirely for emerging results. | Larger UI change than requested; user explicitly said only requiredness should change, not visibility — rejected. |
| C | Default `contribution_to_indicator_target` to `0` for emerging results instead of allowing empty. | Silently fabricates a value with no basis; worse than simply not requiring it. |

## 11. Recommended Approach

Option A — the 1-line conditional guard, implemented via `/akili-specify` (Lite) in Bug Mode with a mandatory regression test.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** none identified beyond the standard regression-test requirement — the change is additive-negative (removes a check under one specific, well-defined condition already used elsewhere in the same file).
- **Dependency:** none.
- **Open question:** none — scope and root cause are both unambiguous and confirmed in code.

## 13. Success Criteria

- Reporting an emerging result with an empty "Contribution to indicator target" no longer blocks "Create and continue."
- Reporting a normal (non-emerging), indicator-tied result still requires the field exactly as today.
- New regression test passes; no other existing test in `lab-report-form.component.spec.ts` regresses.

## 14. Next Step

```text
/akili-specify bugfix/emerging-contribution-not-required
```
Run in **Bug Mode** — convert this confirmed root cause into the fix + the mandatory regression test.
