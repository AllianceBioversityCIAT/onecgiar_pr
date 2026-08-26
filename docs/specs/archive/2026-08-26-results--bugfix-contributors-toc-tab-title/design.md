# Module Spec — `design.md`

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/results/bugfix-contributors-toc-tab-title/` |
| **Feature / Bug** | ToC KPI Tabs Title (HLO vs Outcome) |
| **Type** | Bug |
| **Status** | ready-to-implement |
| **Budget** | 1 task, ~25 LOC, 1 review round |

---

## 2. Technical Overview

In `CPMultipleWPsComponent` (`multiple-wps.component.ts`), `dynamicTabTitle` was recently converted into an Angular `computed()` signal. However, it was implemented with two identical truthiness checks:

```typescript
// Existing defective implementation:
dynamicTabTitle = computed(() => {
  if (this.api.dataControlSE?.currentResultSignal().result_level_id) return 'HLO';
  if (this.api.dataControlSE?.currentResultSignal().result_level_id) return 'Outcome';
  return ``;
});
```

Because `result_level_id` is always truthy (`3` for Outcome, `4` for Output, etc.), line 1 always executes, returning `'HLO'`.

---

## 3. Design Decisions & Implementation Plan

### `RES-DD-1` — Unified `isOutput` Computed Signal
Define a computed signal `isOutput` in `CPMultipleWPsComponent` that checks:
1. `this.api.dataControlSE?.currentResultSignal?.()?.result_level_id` (the current result's level ID from backend enum `ResultLevelEnum`: `4 = Output`, `3 = Initiative Outcome`, `2 = Action Area Outcome`, `1 = Impact`).
2. Fallback to `this.resultLevelId` if `currentResultSignal` is not present (handling both `4` and legacy modal mapping `1`).

```typescript
isOutput = computed(() => {
  const levelId =
    this.api.dataControlSE?.currentResultSignal?.()?.result_level_id ??
    (this.resultLevelId !== undefined && this.resultLevelId !== null ? Number(this.resultLevelId) : null);
  return levelId === 4 || this.resultLevelId === 1 || this.resultLevelId === '1';
});

dynamicTabTitle = computed(() => {
  return this.isOutput() ? 'HLO' : 'Outcome';
});
```

### `RES-DD-2` — Reuse `isOutput` for Delete Confirmation and Completeness
In `multiple-wps.component.ts`:
- **Line 189 (`completnessStatusValidation`)**:
  ```typescript
  const baseComplete = this.isOutput() ? tab.toc_result_id !== null : tab.toc_level_id !== null && tab.toc_result_id !== null;
  ```
- **Line 240 (`onDeleteTab`)**:
  ```typescript
  const confirmationMessage = `Are you sure you want to delete contribution TOC-${this.initiative?.planned_result && this.isOutput() ? 'Output' : 'Outcome'} N° ${tabNumber} to the TOC?`;
  ```

---

## 4. Test Strategy

In `cpmultiple-wps.component.spec.ts`:
1. Add regression tests using Red-Green-Refactor:
   - Test suite `dynamicTabTitle`:
     - Sets `result_level_id: 3` (Outcome) in `currentResultSignal` -> verifies tab headers display `"Outcome N~1"` and `"Outcome N~2"`.
     - Sets `result_level_id: 4` (Output) in `currentResultSignal` -> verifies tab headers display `"HLO N~1"` and `"HLO N~2"`.
     - Tests fallback when `currentResultSignal` has no `result_level_id` and `resultLevelId` input is `2` (`"Outcome"`) vs `1` (`"HLO"`).
