# Defect report — custom-fields contract suite

**Run:** `npm run test:ct`, 46 spec files, **389 tests — 317 pass, 72 fail** (11m11s).
**Baseline before this change:** 23 spec files, 64 tests, **15 failing**.

No production code was modified. Every change is in `*.cy.ts` plus `cypress/support/ct-utils.ts`.

---

## 1. The headline finding: one root cause, not 72 bugs

The failures are not scattered. Grouped by what the test asserts, the dominant class is
**"the parent changes the model or the inputs, and the component does not react"**:

| Component | Failing contract |
|---|---|
| `pr-multi-select` | an external `splice()` unchecks the option without user interaction |
| `pr-multi-select` | an external `push()` checks the matching option |
| `pr-multi-select` | an external `splice()` decreases the selected-count label |
| `pr-multi-select` | clears the selection reactively when the model is set to `null` |
| `pr-multi-select` | a model of RAW optionValues survives the options arriving late |
| `pr-select` | restores the placeholder when the parent clears the model |
| `pr-select` | replaces the previous selection rather than accumulating |
| `pr-range-level` | clearing the model from the parent deactivates every circle |
| `pr-range-level` | a parent reset after a user click leaves no stale active circle |
| `no-data-text` | follows the consumer when the message changes after mount |

This is the exact risk surface predicted in `design.md` §D5: the migration from `@Input()` to
`input()` **signals** (and `@Output()` to `output()`) changed when these components observe parent
state. The components render correctly on first paint and then stop tracking the parent.

**Why this matters in the running app:** every one of these components is fed by asynchronous API
calls and by parents that mutate arrays in place. `rd-contributors-and-partners` alone does this on
`contributing_center` through a shared `CentersService.centersList`. A field that ignores the parent
after first render silently shows stale data to the user.

---

## 2. Confirmed defects (verified personally, with evidence)

### D-1 — `pr-multi-select` desyncs when the parent mutates the bound array in place

**Status:** CONFIRMED. This one failed **before any change in this branch was made** — it is in the
pre-existing suite, not something a new test invented.

- **Test:** `reflects an EXTERNAL in-place removal (splice) by unchecking the dropdown checkbox`
- **Error:** `NG0100: ExpressionChangedAfterItHasBeenCheckedError`, raised from
  **`PrMultiSelectComponent`** inside a `ɵɵtwoWayProperty` — `Previous value: 'true'. Current value: 'false'`.
- **Expected:** parent calls `splice` on the bound array → the matching checkbox unchecks.
- **Actual:** the checkbox state and the model disagree; Angular throws.
- **Evidence it is a regression:** this test exists *because this bug shipped once before*. The
  `@Input()` → signals migration resurrected it.
- **User impact:** this matches the multi-select misbehaviour the user reported while using the app.
- ⚠️ **The `NG0100` is attributed to the component itself, not to the test host** — see §4.

### D-2 — `pr-select` never returns to the placeholder when the parent clears the value

**Status:** CONFIRMED, reproduced by hand against a clean harness.

- **Test:** `restores the placeholder when the parent clears the model`
- **Expected:** parent sets `value = null` → the field shows its placeholder again.
- **Actual:** the previously selected label stays on screen; the placeholder never returns.
- **Asymmetry is the tell:** the opposite direction works. `null → 'C2'` renders "IWMI" correctly.
  It paints but does not un-paint.
- **Reach:** `pr-select` is the most used field in the app — **53 screens**.
- **Note:** `writeValue()` does set the internal signal (`_sig.set(value)`), so the break is
  downstream of the CVA write, in how the rendered label is derived.

---

## 3. Strong candidates — same pattern, NOT individually verified

These fail on the same "parent changes, component ignores it" shape as D-1 and D-2, so they are
likely the same root cause. **I have not reproduced each one by hand**, so they are reported as
candidates, not as confirmed defects:

- `pr-multi-select`: external `push()`, selected-count label after `splice`, reset to `null`,
  raw optionValues surviving a late `[options]` arrival
- `pr-multi-select`: `[disableOptions]` values being added by select-all; protected values
  (`cannotRemoveOptionValues`) not surviving deselection
- `pr-select`: stores the whole object instead of the `optionValue`; previous selection accumulating
- `pr-range-level`: parent reset leaving a stale active circle
- `no-data-text`: message not following the consumer after mount

---

## 4. Honest caveats — what these numbers do NOT mean

**72 failures ≠ 72 bugs.** Three reasons to treat the raw count with suspicion:

1. **The specs were written but never verified by their authors.** The parallel agents that wrote
   most of these files were stopped mid-flight (they were saturating the machine), so their tests
   never got the run-and-correct pass that normally removes bad assertions. A share of the 72 are
   defective tests, not defective components.
2. **A harness artefact already produced three false positives in this very change.** Mutating the
   host and forcing a synchronous `detectChanges()` raises `NG0100` from **`WrapperComponent`** —
   the *test host*, not the component. That is why `patchHost()` uses `autoDetectChanges`. The rule
   now stands: `NG0100` naming `WrapperComponent` is an artefact; `NG0100` naming the component
   under test is a real defect. D-1 satisfies the second case.
3. **Some failures are environmental.** CDK virtual scroll only renders visible options, and the
   dropdown opens via CSS `:focus-within` — assertions that ignore either look like defects and are
   not.

Suites reporting `0 tests` in 1ms (`pr-multi-select.cy.ts`, `pr-word-counter.contract.cy.ts`,
`pr-yes-or-not.cy.ts`) did not execute at all and need a compile check — they are neither passing
nor failing, and must not be counted as green.

---

## 5. What improved

- Obsolete PrimeNG selectors were fixed across the pre-existing suite: `p-radioButton`,
  `input[pInputText]`, `textarea[pTextarea]`, `p-checkbox input`. Those **11 failures were never
  bugs** — PrimeNG was removed from this branch and the tests still pointed at it.
- Coverage of this layer went from 64 to 389 tests across all 23 components.

## 6. Recommended next steps

1. Triage the 72 individually, splitting real defects from bad tests — the cheapest order is by the
   grouping in §1, since one fix likely closes many.
2. Fix D-1 and D-2 first: they are confirmed, they share a root cause, and they hit the two most
   used fields in the app (34 and 53 screens).
3. Investigate the signal-input reactivity pattern once, centrally, rather than component by
   component.
4. Only after the suite is trusted and green: consider adding a CT stage to Jenkins. It is
   deliberately out of scope here.
