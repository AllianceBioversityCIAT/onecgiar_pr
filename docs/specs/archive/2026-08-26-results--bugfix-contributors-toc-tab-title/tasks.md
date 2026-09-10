# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `results` / `rd-contributors-and-partners` — ToC KPI Tabs Title (HLO vs Outcome)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** Antigravity AI
- **Status:** done
- **Approval Mode:** gated
- **Budget:** 1 task, ~25 LOC, 1 review round.

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Root cause confirmed with 100% certainty in `multiple-wps.component.ts:178-182`.
- [x] No backend changes or migrations required.

---

## 3. Task list

### `RES-T-TOCTAB-1` [x] — Implement `isOutput` & `dynamicTabTitle` with Regression Tests

- **Type:** `client | tests`
- **Description:** 
  1. In `cpmultiple-wps.component.spec.ts`, write regression tests for `dynamicTabTitle` verifying that:
     - Outcome results (`result_level_id: 3`) render tab headers containing `"Outcome N~1"` and `"Outcome N~2"`.
     - Output results (`result_level_id: 4`) render tab headers containing `"HLO N~1"` and `"HLO N~2"`.
     - Confirm that before the fix, the Outcome test fails (RED state) because `dynamicTabTitle` returned `'HLO'`.
  2. In `multiple-wps.component.ts`, implement `isOutput` and fix `dynamicTabTitle`:
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
  3. Also update lines 189 and 240 to use `this.isOutput()`.
  4. Run tests to confirm GREEN state and verify clean linting.
- **Implements:** `RES-R-TOCTAB-1`, `RES-R-TOCTAB-2`, `RES-R-TOCTAB-3`
- **Design Ref:** `design.md` §3 (`RES-DD-1`, `RES-DD-2`)
- **Files:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/cpmultiple-wps.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S` (~25 LOC)
- **Skills:** `angular-developer`, `tdd`, `systematic-debugging`
- **Definition of done:**
  - [ ] Regression tests authored and proven RED before fix.
  - [ ] `dynamicTabTitle` renders `"Outcome N~X"` for Outcome results and `"HLO N~X"` for Output results.
  - [ ] Delete confirmation uses `this.isOutput()`.
  - [ ] All unit tests pass (GREEN).
  - [ ] `ng lint` passes cleanly.
