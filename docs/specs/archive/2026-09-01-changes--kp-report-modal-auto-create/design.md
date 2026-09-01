# Design — KP Report Modal Auto-Create

**Depth:** Standard (Change Mode). Client-only. No migration, no API change, no server change.

**Revised after Judgment Day 2026-08-31** (`judgment.md`, Option A). Linked requirements: `KPAC-R-1..R-6`, `KPAC-AC-1..AC-6`.

---

## 1. Summary

When a user reports a *Number of knowledge products* KPI from the **Reporting table**, the aside (`LabReportFormComponent`) creates the result as soon as MQAP succeeds. Contribution is fixed at **1** (component state + `buildCreateResultPayload`). Auto-create runs only when `canSave()` is true and after `preselectTocCenters()` resolves.

The legacy modal is unchanged.

---

## 2. Architecture Overview

### 2.1 Where this lives

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
- `…/lab-report-form.component.html`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts`

`onecgiar-pr-server` is not touched.

Entry: `dashboard-lab.component.ts` `onReportingRowReport` → `manageIndicator(..., 'report')` → `indicator-drawer` → `app-lab-report-form`.

### 2.2 Sequence — KP auto-create (aside)

```
[User] Report on KP row (Reporting tab)
  └── [LabReportFormComponent] constructor effect
        ├── resetForm()                         → contribution null
        ├── if currentResultIsKnowledgeProduct  → patch contribution = 1   ← KPAC-DD-2
        └── store preselectTocCenters() Promise ← KPAC-DD-1

[User] selects CGSpace item OR clicks Sync
  └── onCgspaceItemSelected / validateHandle
        ├── validatingHandler = true
        ├── GET_mqapValidation (after validateKpHandle)
        ├── set mqapJson, result_name
        ├── if KP:
        │     ├── contribution already 1 (re-assert if needed)
        │     ├── await stored preselect Promise
        │     ├── canSave() must be true (title + mqap + contribution + canReport)
        │     └── createResult()
        │           ├── creatingResult = true     → footer “Creating…”
        │           ├── POST_createResult(buildCreateResultPayload)
        │           │     └── contributing_indicator: 1
        │           └── navigate result-detail/:code?phase=
```

Non-KP: stop after MQAP; footer and Create and continue stay as today.

---

## 3. Data Model Changes

None.

---

## 4. API Surface

None. Existing `POST_createResult` (`/api/results-framework-reporting/create`). Payload shape unchanged; only the source of `contributing_indicator` for type 6.

---

## 5. Server Workflow / Business Rules

N/A. Client fills `contributing_indicator` with `1` for KP instead of waiting for a keystroke.

---

## 6. Frontend Plan

### 6.1 Routes

No routing change. Navigate stays `/result/result-detail/:result_code/general-information?phase=:version_id`.

### 6.2 Components

| File | Change |
|---|---|
| `lab-report-form.component.ts` | (a) After `resetForm()` in the constructor `effect`, if `currentResultIsKnowledgeProduct()`, `patch('contribution_to_indicator_target', 1)`. (b) `preselectTocCenters()` returns its `getData()` Promise; the effect stores that Promise. (c) In `onCgspaceItemSelected` MQAP `next`, if KP: await stored Promise, then `createResult()`. (d) Same in `validateHandle` MQAP `next`. |
| `lab-report-form.component.html` | Contribution `app-pr-input`: `[disabled]="creatingResult() \|\| currentResultIsKnowledgeProduct()"`. Optional: selected-card `@if (validatingHandler() \|\| creatingResult())` so create-in-flight is visible after browse selection. |
| `create-result-payload.util.ts` | `contributing_indicator: resultTypeId === 6 ? 1 : options.body.contribution_to_indicator_target`. |

**Do not:** patch `aow-hlo-create-modal`, bind `[readonly]`, call `GET_mqapValidation()` as a component method, or call `createResult()` while `canSave()` is false.

**`canSave()` contract (load-bearing):** `createResult()` returns immediately if `!canSave()`. `canSave` is `canReport && !creatingResult && missingFields().length === 0`. For KP after MQAP, `missingFields` is empty only when title is set, `mqapJson` is set, and contribution is non-null. Setting contribution to `1` at arming is what makes auto-create possible.

**`preselectTocCenters` (KPAC-DD-1):** today returns `void` and chains `centersSE.getData().then(...)`. Change the method to `return` that Promise. The constructor effect already calls it — store the return value (`this.preselectCentersP = this.preselectTocCenters()`). Auto-create awaits `this.preselectCentersP`. Do not start a second `getData()` from the MQAP callback.

### 6.3 Design system

- Reuse the existing contribution `app-pr-input` (`[isStatic]="true"`). Disable it for KP. Folder guide: `[readonly]` does not lock this control.
- No new PrimeNG/Spartan components, no new tokens.
- No new i18n keys.

### 6.4 Real-time / Notification UX

- Footer button already shows **Creating…** + spinner when `creatingResult()` (`lab-report-form.component.html` ~439). That is the required in-flight feedback.
- `alertsFe` toasts for MQAP / create errors stay as they are.

---

## 7. Security & Authorization

Unaffected. `canReport` remains the host gate.

---

## 8. Performance & Capacity

No new network calls. One extra `await` on an already-started Promise.

---

## 9. Observability

Existing error toasts. On MQAP or POST failure, `creatingResult` / `validatingHandler` reset as today.

---

## 10. Testing Plan

Jest only, scoped to the two spec files below. Visual disabled chrome is HITL.

| Test ID | File | What it verifies |
|---|---|---|
| `KPAC-TEST-1` | `create-result-payload.util.spec.ts` | Type 6 → `contributing_indicator === 1` even if body is `null` or `0`. |
| `KPAC-TEST-2` | `lab-report-form.component.spec.ts` | `getData` deferred; POST runs after resolve; `contributing_center` non-empty. |
| `KPAC-TEST-3` | same | `onCgspaceItemSelected` + MQAP success → `POST_createResult` for KP. |
| `KPAC-TEST-4` | same | `validateHandle` + MQAP success → `POST_createResult` for KP. |
| `KPAC-TEST-5` | both | Non-KP: no auto-create; util does not force `1`. |
| `KPAC-TEST-6` | `lab-report-form.component.spec.ts` | After arming a KP indicator, `contribution === 1` and `missingFields()` does not include contribution. |

---

## 11. Backwards Compatibility & Migration Plan

- No migration, no API contract change.
- Rollback: revert the client PR.
- Modal and guided-creation keep today’s bodies.

---

## 12. Design Decisions (ADRs)

### `KPAC-DD-1` — Await the stored `preselectTocCenters()` Promise

- **Context:** `getData()` is async. Auto-create immediately after MQAP can POST empty centres.
- **Decision:** Method returns the Promise; the arming effect stores it; MQAP success awaits that same Promise.
- **Rejected:** fire-and-forget empty centres; making `CentersService.getData` sync.

### `KPAC-DD-2` — Dual-layer contribution = 1 on the aside path

- **Context:** Aside POST goes through `buildCreateResultPayload`. Footer blocks on `missingFields`.
- **Decision:** (a) component sets body to `1` on every KP arm so `canSave` can become true; (b) util overrides type 6 to `1`.
- **Rejected:** util-only (footer still blocks); component-only (other aside callers of the util could still send `null`).

### `KPAC-DD-3` — Disabled visible field, not hidden

- Same as `KPAC-OQ-1`. Use `[disabled]` on `app-pr-input`, not `[readonly]`.

### `KPAC-DD-4` — Both Browse and Manual

- Hooks: `onCgspaceItemSelected` and `validateHandle`. Product owner named both paths.

### `KPAC-DD-5` — Aside only (Judgment Day Option A)

- **Context:** Reporting-tab Report mounts the aside. Modal is a different entry set.
- **Decision:** This spec ships the aside. Modal / guided-creation are follow-ups if product wants parity.

---

## 13. Open Gaps & Follow-ups

- Science-program list is still not awaited (accepted; same as today).
- Legacy modal KP friction remains for `openLegacyReportModal` entry points.

---

## Budget (Step 2.4) — rebaselined after Judgment Day

| Metric | Estimate |
|---|---|
| Expected tasks | 4 (`KPAC-T-1`–`T-4`) |
| Expected LOC | **~90–120** (aside + util + two spec files). Previous 40–60 assumed the smaller modal hook and is superseded. |
| Expected review rounds | 1 |

---

## Required Cross-References

- `docs/specs/changes/kp-report-modal-auto-create/requirements.md`
- `docs/specs/changes/kp-report-modal-auto-create/judgment.md`
- `docs/prd.md` (G1, G2)
- `docs/ux-ui/design.md` (§1, §10)
- `docs/trd/trd.md`
