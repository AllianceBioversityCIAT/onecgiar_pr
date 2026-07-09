## Why

`pr-multi-select` (`app-pr-multi-select`, 58 usages / 32 templates) is the **third and hardest** custom field in the signals migration. It is the most behavior-dense field in the platform: it is a `ControlValueAccessor` multi-select with a search box, `cdk-virtual-scroll` flat list, an alternate **grouped** mode, chip rendering, `logicalDeletion` (soft-delete via `is_active`), `confirmDeletion` (alert before removing), a `selectAll`/`unselectAll` bulk action, `selectedPrimary`/`cannotRemoveOptionValues` guards, and a `displayLabelFormatter` hook.

Its internals carry the same root problems `pr-select` had, amplified:
- `get optionsIntance()` runs on every change-detection and **mutates the shared option objects** (`selected`/`disabled`) — and, worse, it **reassigns the model** (`this.value = []` / `this.value = newSelection`) as a side effect of a getter (the `selectAll` branches). A getter that mutates the model is a correctness hazard.
- `syncSelectionFlags()` writes `option.selected` onto the **original** option objects passed by the parent (shared by reference), so two multi-selects sharing one list can corrupt each other.
- `selectAllF()` emits its event via `setTimeout(500)`.
- `_beforeValueLength` is dead (assigned, never read).

Refactoring so the flat view derives **purely from the value signal** makes the reset reactive, removes the getter-side-effect model mutation, and — in a later phase — lets the consumer `*ngIf`-toggle reset hacks be removed safely.

Scope: **frontend-only**. No backend change. Part of the `front-redesign` initiative (no dedicated P2 ticket). Follows the exact pattern of `refactor-pr-input-signals` and `refactor-pr-select-signals`.

## What Changes

- `@Input()` decorators → `input()` signal inputs (public names/defaults preserved).
- `@Output() selectOptionEvent`, `@Output() removeOptionEvent` → `output()` (same names/payloads).
- `value` backed by an internal `signal`; `get/set value` become a side-effect-free CVA bridge (the setter still calls `onChange`, and re-syncs grouped flags); `writeValue` sets the signal (keeping the array-of-IDs → objects mapping).
- **Backward-compat bridge (critical):** keep `_value` as a **public** get/set over the signal. `user-management.component.ts` (the only external consumer of internals, via `@ViewChild`, in "Clear filters") pokes `entitiesSelect._value = []` and `entitiesSelect.writeValue([])` — a `_value` get/set bridge keeps this working **without touching user-management**.
- **Flat mode:** replace the side-effecting `get optionsIntance()` with a **pure `computed`** that decorates a **cloned copy** of the options (never mutates the parent's array — fixes the shared-reference corruption) and derives `selected`/`disabled` from `value()` + `disableOptions()` (respecting `logicalDeletion`'s `is_active`).
- **Select all / unselect all:** move the model mutation out of the getter into `selectAllF()` (explicit), keeping the exact end-state (select-all ⇒ value = all options; unselect ⇒ value = `[]`) and the `setTimeout(500)` emit.
- **Grouped mode:** kept behaviorally as-is (`syncSelectionFlags()` still decorates the grouped children in place) — see the design doc for why grouped is deliberately out of the pure-clone rewrite in this change, and the QA note for the two admin consumers to verify.
- Remove dead `_beforeValueLength`; move constructor-injected services to `inject()` (keep `rolesSE`/`dataControlSE` public for the template).
- **NON-BREAKING:** same selector, inputs, both outputs, `[(ngModel)]` binding, chip UI, and search/virtual-scroll behavior. The 32 consuming templates are untouched.
- **Out of scope (explicit):** the consumer `*ngIf`-toggle / parent→clear reset hacks are NOT removed here (Phase B, per-consumer with manual QA); `user-management`; the full grouped-mode pure-clone rewrite; `.scss`.

## Capabilities

### New Capabilities
- `pr-multi-select-field`: the behavioral contract of `app-pr-multi-select` — public inputs/outputs, multi-value ControlValueAccessor semantics (array of objects, array-of-IDs write mapping), `_value` compatibility surface, flat-mode option decoration without mutating the source, reactive reset, `logicalDeletion`, `confirmDeletion`, `selectAll`/`unselectAll`, chip removal guards (`selectedPrimary`, `cannotRemoveOptionValues`), and grouped-mode behavior. Documents what MUST be preserved through the signals refactor.

### Modified Capabilities
<!-- None — pure internal refactor, no spec-level behavior change. -->

## Impact

- **Code:** `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.component.ts` (+ `.html`) only. `.scss` untouched.
- **Consumers:** 32 templates / 58 usages — untouched. External internals coupling limited to `user-management.component.ts` (preserved via the `_value` bridge).
- **Enables (Phase B):** reactive flat reset lets the `*ngIf`-toggle hacks in ToC/Contributors/IPSR/geoscope be removed later (shared with the `pr-select` Phase B list).
- **Dependencies:** none new. Angular 19 + PrimeNG 19 (`p-checkbox`, `p-iconfield`, `p-inputicon`, `pInputText`) + `@angular/cdk` virtual scroll.
- **Tests:** `pr-multi-select.component.spec.ts` (trivial) must stay green; the many consumer specs that declare `PrMultiSelectComponent` must stay green; `user-management.component.spec.ts` (mocks `_value`) must stay green. High manual-QA surface — see the design's test map.
