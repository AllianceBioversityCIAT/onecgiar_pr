## Why

`pr-select` (`app-pr-select`, 90 usages / 43 templates) is the second custom field in the signals migration and one of the two "hard" ones. Its internals are the root cause of the **ugly reset hacks scattered across 13 consumer files** (mostly Theory of Change / Contributors / IPSR): today `get optionsIntance()` caches `[...options]` and **mutates the shared option objects'** `selected`/`disabled` flags on every change-detection, and the selected state is derived by mutation rather than by data. Because setting the model to `null`/`''` does NOT reliably repaint the visible selection, developers resort to `*ngIf` boolean-toggle (`false → setTimeout → true`) to destroy+recreate the whole select and force a reset. Fixing the component so it derives its view **purely from its value signal** makes the reset reactive and, in a later phase, lets those consumer hacks be removed safely.

Scope: **frontend-only**. No backend change. Part of the `front-redesign` initiative (no dedicated P2 ticket).

## What Changes

- `@Input()` decorators → `input()` signal inputs (public names/defaults preserved).
- `value` backed by an internal `signal`; `get/set value` become a side-effect-free CVA bridge; `writeValue` sets the signal.
- **Backward-compat bridge (critical):** keep `_value` and `fullValue` as **public** members. `user-management.component.ts` (the only external consumer of internals, via `@ViewChild`, in "Clear filters") pokes `statusSelect._value = ''` / `fullValue = {}` / `writeValue('')` and its spec asserts them — a `_value` get/set bridge over the signal keeps this working **without touching user-management**.
- Replace the side-effecting `get optionsIntance()` with a memoized derivation that **decorates a cloned copy of the options** (so the original `options` array is never mutated — fixes the shared-reference bug where two selects sharing a list corrupt each other's selection) while keeping stable object identity across renders (no `cdkVirtualFor` churn).
- Convert `onDropdownOpen()` / `removeFocus()` DOM-imperative overlay logic to read signal values (kept as-is behaviorally; not rewritten).
- Remove dead `labelName()` method.
- **NON-BREAKING:** same selector, inputs, `selectOptionEvent` output, and `[(ngModel)]` binding. The 43 consuming templates are untouched.
- **Out of scope (explicit):** the 13 consumer `*ngIf`-toggle / parent→clear reset hacks are NOT removed here (that is Phase B, per-consumer with manual QA); `pr-multi-select` (next change); `user-management`; `s-select`; `.scss`.

## Capabilities

### New Capabilities
- `pr-select-field`: the behavioral contract of `app-pr-select` — public inputs, value/ControlValueAccessor semantics, `_value`/`fullValue` compatibility surface, option decoration (selected/disabled without mutating the source), reactive reset, and the search/virtual-scroll dropdown behavior. Documents what MUST be preserved through the signals refactor.

### Modified Capabilities
<!-- None — pure internal refactor, no spec-level behavior change. -->

## Impact

- **Code:** `onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.component.ts` (+ `.html`) only. `.scss` untouched.
- **Consumers:** 43 templates / 90 usages — untouched. External internals coupling limited to `user-management.component.ts` (preserved via the `_value`/`fullValue` bridge).
- **Enables (Phase B):** reactive reset lets the `*ngIf`-toggle hacks in ToC/Contributors/IPSR/geoscope be removed later — see the design doc's test map for the exact 13 sites.
- **Dependencies:** none new. Angular 19 + PrimeNG 19 (`p-iconfield`, `p-inputicon`, `pInputText`) + `@angular/cdk` virtual scroll.
- **Tests:** `pr-select.component.spec.ts` (trivial) must stay green; `user-management.component.spec.ts` (`_value` assertions) must stay green. High manual-QA surface — see test map.
