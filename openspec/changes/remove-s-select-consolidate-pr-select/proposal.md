## Why

`s-select` (`app-s-select`) is a legacy, pre-signals "simple select" that duplicates almost all of `pr-select`'s behavior. A deep audit (subagent swarm) found it is used in **exactly one** place — the IPSR **Innovation Packages Notification** entity filter — and that its internals are partially/incorrectly migrated: `options` is a plain `@Input()` but `optionsIntance` calls `this.options()` as a function, so it only works when the consumer passes a Signal reference by accident. It is identical on `master` (a pre-existing hazard), not introduced by the signals refactor.

Rather than fix a barely-used duplicate, we consolidate on `pr-select` (the modern, signals-based, well-tested field). This removes a fragile component and one more source of drift as the platform migrates toward Spartan UI + Tailwind.

Consolidating exposes one real gap from the earlier `pr-select` signals refactor: that refactor **removed the `optionsInlineStyles` input** (assuming no consumer used it), but **Admin → Knowledge Products** still binds `optionsInlineStyles="max-height: 180px; bottom: -185px;"` on an `app-pr-select` phase dropdown — making it a silent no-op and regressing that dropdown's tuned upward positioning/height. We restore that input.

Scope: **frontend-only**. No backend change. Part of the `front-redesign` custom-fields consolidation (no dedicated P2 ticket).

## What Changes

- **Restore `optionsInlineStyles` on `pr-select`** as an optional `input<string>('')`, applied to the dropdown panel only when `overlayToBody()` is false (`[style]="overlayToBody() ? overlayStyles() : optionsInlineStyles()"`). Fixes the Knowledge Products phase dropdown regression without touching that template. `overlayToBody` consumers keep the internal auto-positioning (`overlayStyles`) unchanged.
- **Migrate the single `app-s-select` consumer** (`innovation-packages-notification.component.html`) to `app-pr-select`, passing `[options]="initiativesByPortfolio()"` (the array value, not the Signal reference). ngModel contract is identical (scalar `optionValue`), no `(selectOptionEvent)` needed, no `@ViewChild`.
- **Delete `s-select`**: remove `s-select.component.{ts,html,scss,spec.ts}` and drop `SSelectComponent` from `CustomFieldsModule` declarations/exports.
- **NON-BREAKING for `pr-select` consumers:** same selector, inputs, output, `[(ngModel)]`. The new `optionsInlineStyles` input is additive.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `pr-select-field`: adds a consumer-facing `optionsInlineStyles` input to position/size the dropdown panel when not using `overlayToBody`. Restores parity with the pre-signals component for the one consumer that relied on it.

### Removed Capabilities
- `s-select-field`: the `app-s-select` component is removed. Its sole consumer is migrated to `app-pr-select`, which provides equivalent single-select ControlValueAccessor behavior (scalar `optionValue`, `selectOptionEvent`, label/placeholder/disable handling).

## Impact

- **Code:**
  - `onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.component.{ts,html}` (add `optionsInlineStyles`).
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-packages-notification/innovation-packages-notification.component.html` (swap `app-s-select` → `app-pr-select`).
  - `onecgiar-pr-client/src/app/custom-fields/custom-fields.module.ts` (drop `SSelectComponent`).
  - Delete `onecgiar-pr-client/src/app/custom-fields/s-select/*`.
- **Consumers:** only the IPSR notifications entity filter changes. All other `pr-select` consumers untouched; `optionsInlineStyles` is additive so the Knowledge Products dropdown is restored automatically.
- **Tests:** `pr-select.component.spec.ts` + the innovation-packages-notification specs must stay green; the deleted `s-select.component.spec.ts` is removed.
- **Manual QA:** (1) IPSR → Innovation Packages Notification → the **Entity** filter selects/filters correctly and resets when the phase changes; (2) Admin → Knowledge Products → the **phase** dropdown opens with the tuned height/upward position (not clipped at page bottom).
