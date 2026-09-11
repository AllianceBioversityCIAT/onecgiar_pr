# Kaizen Retrospective: results/bugfix-impact-area-scores

## 1. Document Control

| Attribute | Value |
|---|---|
| Spec Path | `results/bugfix-impact-area-scores` |
| Slug | `results--bugfix-impact-area-scores` |
| Date | 2026-08-26 |
| Branch | `qa-development-2026` (spec branch) |
| Outcome | Resolved (Bug Mode, 2 tasks completed) |

---

## 2. Metrics

| Metric | Value |
|---|---|
| Tasks Completed | 2 / 2 |
| Total Attempts | 4 (Task 1: 2 attempts, Task 2: 2 attempts) |
| Reviewer Verdicts | 2 FAIL, 2 PASS |
| Spec Pivots | 0 |
| Total LOC | ~50 LOC (Implementation + Tests) |

---

## 3. Lessons

### `KZ-RES-01`: CVA Event Emission Ordering in Custom Elements
- **Target:** Product
- **Evidence:** `execution.md` Task `RES-T-SCORE-1` Attempt 1 review finding.
- **Root Cause:** When implementing custom interactive tracks (e.g. `<button>` acting as radio) inside a `ControlValueAccessor`, calling output event emitters (`selectOptionEvent.emit()`) before the internal value assignment and `onChange`/`onTouch` calls exposes stale state to parent event listeners.
- **Rule:** In Angular custom input components, state assignment and form hooks MUST always precede external custom event emissions.

---

## 4. Noted, not a lesson

- Change detection NG0100 in Angular 21 tests: Modifying component inputs on an already detected fixture (`f.detectChanges()`) outside Angular zones can trigger `ExpressionChangedAfterItHasBeenCheckedError`. Resolved by passing input states at fixture initialization.

---

## 5. Pending Items

| Kind | Target | Description | Status |
|---|---|---|---|
| standardization | `CLAUDE.md` / `src/app/custom-fields/` | Document CVA event emission ordering pattern for custom form components | pending |
