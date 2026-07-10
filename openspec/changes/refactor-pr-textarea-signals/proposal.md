## Why

`pr-textarea` is the narrative-text workhorse of the client (**68 usages across 26 templates** — result descriptions, evidence narratives, policy/innovation write-ups) and still runs on the same legacy patterns already eliminated from `pr-input` (commit `6661baa56`): a `computed()` (`preventFieldRender`) that **mutates** component state (`label`, `placeholder`, `description`, `required`) as a side effect, and a `value` getter that **recomputes `wordCount` and mutates `beforeValue` on every change-detection read**. These are invalid under signals semantics and fragile under `OnPush`/zoneless. This is the fourth step of the custom-fields signals migration (after `pr-input`, `pr-select`, `pr-multi-select`), applying the exact pattern already proven in `refactor-pr-input-signals`.

Scope note: **frontend-only**. No backend change. No dedicated Jira ticket — it belongs to the `front-redesign` initiative (design-iteration context); to be linked to a P2 ticket when one is opened. Branch: `front-redesign-fields`.

## What Changes

- Migrate `pr-textarea` `@Input()` decorators to `input()` signal inputs (public names preserved).
- Replace the side-effecting `preventFieldRender` computed with a **pure** `shouldRender` computed, and derive `label`/`placeholder`/`description`/`required` from `FieldsManagerService` via **pure computed** signals (`effectiveLabel`, `effectivePlaceholder`, `effectiveDescription`, `effectiveRequired`), mirroring `pr-input`.
- Remove side effects from the `value` getter: back `value` with a `signal`, derive `wordCount` from a `computed`, delete `beforeValue`.
- Keep `ControlValueAccessor` (`writeValue`/`registerOnChange`/`registerOnTouched`) working exactly as today — consumers bind via `[(ngModel)]`.
- Preserve `fieldState`, `hasValue`, `notProvidedText`, and all integrations (`FieldsManagerService`, `WordCounterService`, `RolesService`, `DataControlService`).
- **NON-BREAKING**: same selector `app-pr-textarea`, same input surface, same template behavior. The 26 consuming templates are not touched.
- Out of scope (explicitly): Spartan/Tailwind migration, `standalone: true` conversion, touching any other custom field, `.scss` changes.

## Capabilities

### New Capabilities
- `pr-textarea-field`: the behavioral contract of the `app-pr-textarea` custom field — its public inputs, value/ControlValueAccessor semantics, FieldsManager-driven overrides, word-count derivation, field state, and render gating. Documents the behavior that MUST be preserved through the signals refactor.

### Modified Capabilities
<!-- None — pure internal refactor. No spec-level behavior changes. -->

## Impact

- **Code:** `onecgiar-pr-client/src/app/custom-fields/pr-textarea/pr-textarea.component.ts` (+ `.html`) only. `.scss` untouched.
- **Consumers:** 26 templates / 68 usages — untouched (contract preserved). Heaviest surfaces: Result Detail General Information, Evidences, Innovation Dev/Use narratives, IPSR steps.
- **Dependencies:** no new deps. Still Angular 19 + PrimeNG 19 (`pTextarea`).
- **SDD baseline:** aligns with `docs/system-design/design.md` (custom field patterns) and `src/CLAUDE.md` §14 / §21 (signals-first component shape). No `docs/prd.md` acceptance-criteria change.
- **Tests / gates:** Cypress CT `pr-textarea.cy.ts` must stay green (`npm run test:ct`), `npm run build:dev` must pass, and the component's Jest spec must stay green. QA documented in `onecgiar-pr-client/docs/refactor-signals-qa.md`.
