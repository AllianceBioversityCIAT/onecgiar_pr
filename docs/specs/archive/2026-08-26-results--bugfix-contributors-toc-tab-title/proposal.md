# Module Proposal — Bugfix: ToC KPI Tabs Title (HLO vs Outcome)

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/results/bugfix-contributors-toc-tab-title/` |
| **Type** | Bug |
| **Status** | proposed |
| **Owner / Proposer** | Antigravity AI |
| **Approval Mode** | gated |
| **Parent Spec** | none |
| **Date** | 2026-08-26 |

---

## 2. Intent

Ensure that the ToC contribution tabs in the **Contributors & Partners** section (`rd-contributors-and-partners`) dynamically display the correct result-level prefix:
- **`HLO N~X`** for results of level **Output** (`result_level_id === 4`, e.g. Knowledge Product, Innovation Development, Capacity Sharing for Development, Other Output).
- **`Outcome N~X`** for results of level **Outcome** (`result_level_id === 3` or `2`, e.g. Policy Change, Innovation Use, Capacity Change, Other Outcome).

---

## 3. Problem / Current Behavior

When viewing an Outcome result (such as Result 8836, Policy Change) in `Contributors & Partners` with *"Can this result be mapped to a ToC KPI?"* set to **YES**, the ToC tabs display:
- `HLO N~1`, `HLO N~2`, etc.

This is incorrect because `HLO` stands for *High Level Output*. An Outcome result has outcome options (Intermediate Outcome / 2030 Outcome) and should display a common outcome title: `Outcome N~1`, `Outcome N~2`.

---

## 4. Proposed Outcome

1. If the current result is an **Output** (`result_level_id === 4` or `resultLevelId === 1`):
   - The tabs display `HLO N~1`, `HLO N~2`, ...
2. If the current result is an **Outcome** (`result_level_id === 3` or `2`):
   - The tabs display `Outcome N~1`, `Outcome N~2`, ...
3. Any confirmation messages (such as deleting a tab) also reflect the proper type (`Output` vs `Outcome`).

---

## 5. Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts`
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/cpmultiple-wps.component.spec.ts`

---

## 6. Non-Goals

- No backend changes or database migrations.
- No changes to ToC dropdown options or KPI mappings within `multiple-wps-content`.
- No modification to the 2025/2026 toggle visibility logic.

---

## 7. Affected Users, Systems, And Specs

- **Users:** Result submitters and reviewers editing Policy Change, Innovation Use, or other Outcome results in 2026.
- **Components:** `CPMultipleWPsComponent` (`multiple-wps.component.ts`).

---

## 8. Visual Reference

- **Source:** User screenshot
- **Location:** `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1787762728666-5e451c5d-325c-4276-885f-4fc3a26f2073.png`
- **Context:** Policy Change result 8836 showing tabs `HLO N~1`, `HLO N~2` with level selector dropdown below.

---

## 9. Bug Diagnosis

### Observed Symptom
For Outcome results (e.g. Policy Change, Result ID 8836), the ToC tabs show `HLO N~1`, `HLO N~2` instead of `Outcome N~1`, `Outcome N~2`.

### Reproduction Steps
1. Navigate to: `http://qa-development-2026-3.orca.localhost:62365/result/result-detail/8836/contributor-partners?phase=36` (Result 8836 is Policy Change, which is an Outcome).
2. Answer YES to *"Can this result be mapped to a ToC KPI?"*.
3. Observe the tab headers above the TOC form: they read `HLO N~1`, `HLO N~2`.

### Root Cause (Confirmed)
In `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts:178-182`:
```typescript
dynamicTabTitle = computed(() => {
  if (this.api.dataControlSE?.currentResultSignal().result_level_id) return 'HLO';
  if (this.api.dataControlSE?.currentResultSignal().result_level_id) return 'Outcome';
  return ``;
});
```
Lines 179 and 180 contain the identical conditional `if (this.api.dataControlSE?.currentResultSignal().result_level_id)`. Because `result_level_id` is always truthy (e.g., `3` for Outcome, `4` for Output), line 179 unconditionally returns `'HLO'`. Line 180 (`return 'Outcome'`) is dead code and is never reached.

Furthermore, line 189 and 240 test `this.resultLevelId === 1` based on legacy mapping, rather than checking `result_level_id === 4` (Initiative Output) vs `3` (Initiative Outcome).

### Impact & Scope
All results of level Outcome (Policy Change, Innovation Use, Capacity Change, Other Outcome) mistakenly show "HLO" on their ToC tabs.

### Fix Strategy
1. Implement a reactive helper or update `dynamicTabTitle` to distinguish:
   - Output (`result_level_id === 4` or `resultLevelId === 1` or `resultLevelId === 4`) -> `'HLO'`.
   - Outcome (`result_level_id === 3` or `2` or other outcome levels) -> `'Outcome'`.
2. Align `isOutput` across `dynamicTabTitle`, `completnessStatusValidation`, and `onDeleteTab`.
3. Add unit tests in `cpmultiple-wps.component.spec.ts` asserting that `dynamicTabTitle()` returns `'Outcome'` for `result_level_id: 3` and `'HLO'` for `result_level_id: 4`.

---

## 10. Approach Options

### Option 1: Inline `dynamicTabTitle` Level Inspection (Recommended)
Compute `isOutput` based on `this.api.dataControlSE?.currentResultSignal()?.result_level_id` and `this.resultLevelId`:
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
- **Pros:** Minimal LOC (<15 lines), completely safe, reactive, fixes tab titles and delete tab confirmations.
- **Cons:** None.

### Option 2: Pass explicit `isOutput` input from parent `rd-contributors-and-partners`
- **Pros:** Parent already injects `ResultLevelService`.
- **Cons:** Requires modifying parent templates and interfaces; unnecessary since `currentResultSignal()` is already globally available and reactive.

---

## 11. Recommended Approach

Adopt **Option 1**. It repairs the defective `if` statement directly inside `multiple-wps.component.ts`, respects both the global `currentResultSignal()` and the local `resultLevelId` `@Input()`, and fixes both the visual tab title and the delete confirmation dialog.

---

## 12. Risks, Dependencies, And Open Questions

- **Risks:** Very low. Purely visual text change.
- **Dependencies:** None.
- **Open Questions:** None.

---

## 13. Success Criteria

- [ ] For Result 8836 (Policy Change, Outcome), the tabs display `Outcome N~1`, `Outcome N~2`.
- [ ] For Output results (e.g. Knowledge Product), the tabs display `HLO N~1`, `HLO N~2`.
- [ ] Unit tests verify both Output and Outcome titles in `cpmultiple-wps.component.spec.ts`.
- [ ] `ng lint` passes cleanly.

---

## 14. Next Step

Run:
```bash
/akili-specify results/bugfix-contributors-toc-tab-title
```
