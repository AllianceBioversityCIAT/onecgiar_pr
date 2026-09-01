# Tasks — KP Report Modal Auto-Create

## 1. Scope of this Task List

- **Module / Feature:** `changes/kp-report-modal-auto-create`
- **Linked Spec:** `docs/specs/changes/kp-report-modal-auto-create/requirements.md` + `design.md`
- **Sprint / Target Phase:** QA Development 2026
- **Status:** execute-complete (T-1..T-4 PASS 2026-08-31; shipped after merge)
- **Owner / Driver:** Results & Reporting Team

---

## 2. Pre-flight Checklist

Pre-flight confirmed by Leader (not Implementer checkboxes):

- `requirements.md` is approved and all OQs closed (`KPAC-OQ-4` = aside only).
- `design.md` is approved; budget rebaselined (4 tasks, ~90–120 LOC, 1 review round).
- No server changes; no migration.
- Primary surface confirmed: `LabReportFormComponent` (Reporting-tab Report). Modal / guided-creation out of scope.
- `preselectTocCenters()` in `lab-report-form` is the Promise to store (constructor `effect` call site).
- Regression gate: existing `lab-report-form.component.spec.ts` and `create-result-payload.util.spec.ts` run green before work begins.

---

## 3. Task List

### `KPAC-T-1` — Contribution = 1, disabled field, Promise-returning preselect [x]

- **Status:** `[x]` PASS 2026-08-31 — Reviewer `cursor-grok-4.5-high-fast`; evidence in `execution.md`

- **Type:** `client`
- **Description:** Atomic contract change before any auto-create call.
  1. **`create-result-payload.util.ts`** — `contributing_indicator` = `resultTypeId === 6 ? 1 : options.body.contribution_to_indicator_target`.
  2. **`lab-report-form.component.ts`** — After `resetForm()` in the constructor `effect`, if `currentResultIsKnowledgeProduct()`, `patch('contribution_to_indicator_target', 1)`. Refactor `preselectTocCenters()` to **return** the `getData()` Promise; store it on the instance from the effect (`this.preselectCentersP = this.preselectTocCenters()`).
  3. **`lab-report-form.component.html`** — On the contribution `app-pr-input`, `[disabled]="creatingResult() || currentResultIsKnowledgeProduct()"`. No `[readonly]`. No new control.
- **Implements:** `KPAC-R-1`, `KPAC-R-2`, `KPAC-AC-1`, `KPAC-AC-2`
- **Design ref:** `design.md` §6.2, `KPAC-DD-1`, `KPAC-DD-2`, `KPAC-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
- **Depends on:** —
- **Blocks:** `KPAC-T-2`, `KPAC-T-3`, `KPAC-T-4`
- **Estimate:** `S` (~20–30 LOC)
- **Skills:** `angular-developer`
- **Definition of Done:**
  - `buildCreateResultPayload({ indicator: indicatorOfType(6), body: { … contribution null or 0 } })` returns `contributing_indicator: 1`.
  - After arming a KP indicator, `createResultBody().contribution_to_indicator_target === 1` and `missingFields()` does not include contribution.
  - Contribution `app-pr-input` is disabled when KP.
  - `preselectTocCenters()` returns `Promise<…>`; the effect stores that Promise.
  - Non-KP: contribution stays `null` / editable.
  - `npx ng lint --quiet` clean (or no new lint in these files).

---

### `KPAC-T-2` — Auto-create on CGSpace browse path [x]

- **Status:** `[x]` PASS 2026-08-31 — Reviewer `cursor-grok-4.5-high-fast`; evidence in `execution.md`

- **Type:** `client`
- **Description:** In `onCgspaceItemSelected()` MQAP `next`, after `mqapJson` + title are set: if `currentResultIsKnowledgeProduct()`, await the **stored** `preselectCentersP`, then `createResult()`. Do not call `createResult()` unless `canSave()` will be true (title + mqap + contribution 1). No extra loading flag — `createResult()` already sets `creatingResult`.
- **Implements:** `KPAC-R-3`, `KPAC-R-5`, `KPAC-AC-3`, `KPAC-AC-5`
- **Design ref:** `design.md` §2.2, §6.2, `KPAC-DD-1`, `KPAC-DD-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
- **Depends on:** `KPAC-T-1`
- **Blocks:** `KPAC-T-4`
- **Estimate:** `S` (~10 LOC)
- **Skills:** `angular-developer`
- **Definition of Done:**
  - Browse selection on a KP indicator dispatches `POST_createResult` after MQAP success.
  - `validatingHandler` is false before `createResult()` (metadata already set).
  - Non-KP browse selection does not auto-create.
  - Lint clean.

---

### `KPAC-T-3` — Auto-create on Manual Entry path [x]

- **Status:** `[x]` PASS 2026-08-31 — Reviewer `cursor-grok-4.5-high-fast`; evidence in `execution.md`

- **Type:** `client`
- **Description:** Same pattern in `validateHandle()` MQAP `next` (this is the aside method — **not** `GET_mqapValidation()`). Existing “Metadata successfully retrieved” toast may fire before auto-create; either keep or suppress — both correct.
- **Implements:** `KPAC-R-4`, `KPAC-R-5`, `KPAC-AC-4`, `KPAC-AC-5`
- **Design ref:** `design.md` §2.2, §6.2, `KPAC-DD-1`, `KPAC-DD-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
- **Depends on:** `KPAC-T-1`
- **Blocks:** `KPAC-T-4`
- **Estimate:** `S` (~10 LOC)
- **Skills:** `angular-developer`
- **Definition of Done:**
  - Sync with a valid KP handle dispatches `POST_createResult` on MQAP success.
  - Invalid handles (`validateKpHandle` fail) do not reach auto-create.
  - Non-KP manual sync does not auto-create.
  - Lint clean.

---

### `KPAC-T-4` — Unit tests for KPAC-R-1 through KPAC-R-6 [x]

- **Status:** `[x]` PASS 2026-08-31 — Reviewer `cursor-grok-4.5-high-fast`; evidence in `execution.md`

- **Type:** `tests`
- **Description:** Add the six KPAC tests. Follow existing spec style (no unnecessary TestBed if the file already uses a lightweight setup). Prefer asserting `POST_createResult` was called, not only that `createResult()` was invoked (`canSave` can swallow the latter).
  1. **`create-result-payload.util.spec.ts`:** `KPAC-TEST-1`, non-KP half of `KPAC-TEST-5`.
  2. **`lab-report-form.component.spec.ts`:** `KPAC-TEST-2` (deferred `getData`), `KPAC-TEST-3`, `KPAC-TEST-4`, component half of `KPAC-TEST-5`, `KPAC-TEST-6`.
- **Implements:** `KPAC-R-1..R-6`, `KPAC-AC-1..AC-6`
- **Design ref:** `design.md` §10
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `KPAC-T-1`, `KPAC-T-2`, `KPAC-T-3`
- **Blocks:** —
- **Estimate:** `M` (~50–70 LOC)
- **Skills:** `angular-developer`
- **Definition of Done:**
  - All 6 KPAC test cases pass.
  - No existing tests in those two files broken.
  - Scoped only: `cd onecgiar-pr-client && npm run test -- --testPathPattern="lab-report-form.component.spec|create-result-payload.util.spec"` exits 0.
  - Do **not** run the full client Jest suite.

---

## 4. Dependency Graph

```
KPAC-T-1 (contribution=1 + disabled + stored Promise)
   ├──> KPAC-T-2 (auto-create Browse)  ──┐
   └──> KPAC-T-3 (auto-create validateHandle) ──┴──> KPAC-T-4 (tests)
```

T-2 and T-3 are parallel-safe (two methods in the same `.ts` file; run sequential in one session if needed).

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPAC-TEST-1` | Unit | `KPAC-R-1`, `KPAC-AC-1` | `create-result-payload.util.spec.ts` |
| `KPAC-TEST-2` | Unit | `KPAC-R-5`, `KPAC-AC-5` | `lab-report-form.component.spec.ts` |
| `KPAC-TEST-3` | Unit | `KPAC-R-3`, `KPAC-AC-3` | `lab-report-form.component.spec.ts` |
| `KPAC-TEST-4` | Unit | `KPAC-R-4`, `KPAC-AC-4` | `lab-report-form.component.spec.ts` |
| `KPAC-TEST-5` | Unit | `KPAC-R-6`, `KPAC-AC-2`, `KPAC-AC-6` | Both spec files |
| `KPAC-TEST-6` | Unit | `KPAC-R-1`, `KPAC-AC-1` (`missingFields`) | `lab-report-form.component.spec.ts` |
| **Human check** | HITL | Disabled `app-pr-input` chrome | After T-1 |

---

## 6. Rollout & Verification

- Scoped jest (T-4 command) green.
- `npx ng lint --quiet` clean in `onecgiar-pr-client` if run; do not require a full-app lint unless already cheap.
- Manual / HITL:
  - Reporting tab → KP row → Report → Browse item → auto-create + navigate.
  - Same with Manual + Sync.
  - Non-KP: contribution editable, no auto-create.
  - KP contribution shows `1` and is disabled.
- PR message: `✨ feat(lab-report-form) [KPAC]: auto-create knowledge products on KP selection`

---

## 7. Cleanup & Follow-ups

- Spec status → `shipped` after merge.
- `/akili-archive changes/kp-report-modal-auto-create`
- Optional follow-up spec: same behaviour on `aow-hlo-create-modal` / `guided-creation`.

---

## 8. Roll-Back Plan

1. Revert the client PR.
2. No migration / server rollback.
3. No bilateral / platform-report notice.

---

## Required Cross-References

- `docs/specs/changes/kp-report-modal-auto-create/requirements.md`
- `docs/specs/changes/kp-report-modal-auto-create/design.md`
- `docs/specs/changes/kp-report-modal-auto-create/judgment.md`
- `docs/prd.md` (G1, G2)
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
