## 1. Fix

- [x] 1.1 Add `isolation: isolate` to `.contact-select-wrapper` in `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.scss`
- [x] 1.2 Confirm no markup/TypeScript/behaviour change is needed (CSS-only)

## 2. Verification

- [x] 2.1 Reproduce the overlap live (prtest, result 8552, phase 34, General Information) and confirm via `document.elementFromPoint()` that the `✕` paints on top before the fix
- [x] 2.2 Apply the fix and confirm via `document.elementFromPoint()` that the feedback widget renders on top after the fix
- [x] 2.3 Confirm the clear `✕` button still sits above the input and clears the selected contact
- [x] 2.4 Run client unit tests for `lead-contact-person-field.component.spec.ts` (no behavioural change expected) — 49/49 passed
