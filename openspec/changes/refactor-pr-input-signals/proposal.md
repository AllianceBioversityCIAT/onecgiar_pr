## Why

`pr-input` is the most-used custom field in the client (**184 usages across 49 templates**) and still runs on legacy Angular patterns that are actively harmful: a `computed()` (`preventFieldRender`) that **mutates** component state (`label`, `placeholder`, `description`, `required`, `useColon`) as a side effect, and a `value` getter that **recomputes and mutates** `wordCount`/`beforeValue` on every change-detection pass. These break the mental model signals enforce and are fragile under `OnPush`/zoneless. This is the **pilot** for migrating all ~20 custom fields to signals (and later to Spartan UI + Tailwind), so getting the pattern right here sets the template for the rest.

Scope note: **frontend-only**. No backend change. No Jira ticket dedicated to this — it belongs to the `front-redesign` initiative (design-iteration context); to be linked to a P2 ticket when one is opened.

## What Changes

- Migrate `pr-input` `@Input()` decorators to `input()` signal inputs (public names preserved).
- Replace the side-effecting `preventFieldRender` computed with a **pure** `shouldRender` computed, and derive `label`/`placeholder`/`description`/`required`/`useColon` from `FieldsManagerService` via **pure computed** signals (`effectiveLabel`, etc.) instead of mutating fields.
- Remove side effects from the `value` getter: back `value` with a `signal`, and derive `wordCount` from a `computed`/`effect`.
- Keep `ControlValueAccessor` (`writeValue`/`registerOnChange`/`registerOnTouched`) working exactly as today.
- Preserve `fieldState`, `hasValue`, `badLink`, `aTag`, and all integrations (`FieldsManagerService`, `WordCounterService`, `RolesService`, `DataControlService`).
- **NON-BREAKING**: same selector `app-pr-input`, same input/output surface, same template behavior. The 49 consuming templates are not touched.
- Out of scope (explicitly): Spartan/Tailwind migration, `standalone: true` conversion, touching any other custom field.

## Capabilities

### New Capabilities
- `pr-input-field`: the behavioral contract of the `app-pr-input` custom field — its public inputs, value/ControlValueAccessor semantics, FieldsManager-driven overrides, field state derivation, and render gating. Documents the behavior that MUST be preserved through the signals refactor.

### Modified Capabilities
<!-- None — this is a pure internal refactor. No spec-level behavior changes. -->

## Impact

- **Code:** `onecgiar-pr-client/src/app/custom-fields/pr-input/pr-input.component.ts` (+ `.html`) only. `.scss` untouched.
- **Consumers:** 49 templates / 184 usages — untouched (contract preserved). Regression surface is broad, so verification is by real-screen smoke test, not just the trivial `should create` spec.
- **Dependencies:** no new deps. Still Angular 19 + PrimeNG 19 (`pInputText`, `p-inputNumber`, `p-message`).
- **SDD baseline:** aligns with `docs/system-design/design.md` (custom field patterns) and `src/CLAUDE.md` §14 / §21 (signals-first service/component shape). No `docs/prd.md` acceptance-criteria change.
- **Tests:** existing Jest spec is `should create` only; keep it green and consider adding targeted specs for value/CVA and FieldsManager overrides.
