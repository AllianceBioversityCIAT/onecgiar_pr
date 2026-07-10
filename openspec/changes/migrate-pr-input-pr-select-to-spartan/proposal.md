## Why

First real component migration off PrimeNG onto Spartan UI + Tailwind (foundation landed in `install-spartan-tailwind-foundation`). Targets the two most-used field wrappers, `app-pr-input` and `app-pr-select`, converting their **internals** to Spartan/Tailwind with **zero PrimeNG** — while keeping their public facade (selector + inputs + `ControlValueAccessor`) identical so the ~230 consuming templates are untouched. Proves the migration pattern end-to-end.

Scope: **frontend-only**, branch `angular-upgrade-19-22` (Angular 21). No backend. `front-redesign` initiative.

## What Changes

- **`pr-input`** — remove all PrimeNG:
  - `pInputText` (text/email) → native `<input>` with Spartan `hlmInput` styling.
  - `p-message` (email validation) → plain Tailwind-styled error `<div>`.
  - `p-inputNumber` (number + currency USD) → native `<input>` + component-side numeric/currency formatting (PrimeNG has no Spartan equivalent). Currency keeps `$`/thousands formatting via a format-on-blur helper.
- **`pr-select`** — remove all PrimeNG:
  - The search box (`p-iconfield` + `p-inputicon` + `pInputText`) → native `<input hlmInput>` + a `material-icons-round` search icon. The rest of pr-select is already custom (CDK virtual scroll + bespoke dropdown) — untouched.
- Add the Spartan **`hlm-input`** Helm component (via Spartan CLI) as the shared input primitive.
- Remove the now-unused PrimeNG module imports (`InputTextModule`, `InputNumberModule`, `IconFieldModule`, `InputIconModule`, `MessageModule`) from `custom-fields.module.ts` **only if** no other custom-field still uses them.
- **NON-BREAKING**: same selectors, inputs, CVA, visual result. Consumers untouched.

## Capabilities

### New Capabilities
- `pr-input-spartan`: `app-pr-input` renders via Spartan/Tailwind (no PrimeNG), preserving its input/CVA contract, all types (text/email/number/currency/link), validation, and field states.
- `pr-select-spartan`: `app-pr-select` renders with zero PrimeNG (search box on Spartan input), preserving its custom dropdown, filtering, virtual scroll, and CVA contract.

### Modified Capabilities
<!-- None at the spec-requirement level — internal rendering swap, same behavior. -->

## Impact

- **Code:** `pr-input.component.{ts,html,scss}`, `pr-select.component.{ts,html,scss}`, `custom-fields.module.ts` (drop unused PrimeNG imports), one new `hlm-input` component folder.
- **Consumers:** ~230 usages untouched (facade preserved).
- **Behavioral note:** the currency field loses PrimeNG's live keystroke masking; formatting is applied on blur instead (documented). Verify budget/contribution fields.
- **PrimeNG:** these two components reach zero PrimeNG; PrimeNG stays installed for the rest of the app.
- **Verify:** `build:dev` green; browser smoke of a text field, an email field, a currency field, and a select with search on a real screen.
