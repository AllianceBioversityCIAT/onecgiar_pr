# Tasks — Lead Contact Person "Use this name anyway" Completeness

## 1. Scope of this task list

- **Module / feature:** `results` / `ipsr` (Lead Contact Person completeness feedback)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** Santiago Sánchez (s.sanchez@cgiar.org)
- **Status:** ready
- **Depth:** Lite · **Mode:** Bug

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Root cause confirmed and reproduction documented.
- [x] No server or database schema changes required.

## 3. Task list

### `RES-T-1` — Regression test for free-text contact completeness (Bug Mode mandatory) `[x]`

- **Type:** `tests`
- **Description:** Add/update unit test cases in `rd-general-information.component.spec.ts` and `ipsr-general-information.component.spec.ts` asserting that a contact name accepted without Active Directory data (`lead_contact_person` present, `lead_contact_person_data` is null) marks the field complete in the feedback DOM marker and in the completeness getter. Also assert that an empty contact and an unconfirmed query remain incomplete.
- **Implements:** `RES-R-1` (all scenarios and `BUT`/`AND IT MUST` clauses)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `RES-T-2`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - Command: `npx jest --silent --reporters=summary onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.spec.ts`
  - **Fails on current code (RED)** because current implementation requires `lead_contact_person_data`.
  - Input that produces failure: `lead_contact_person = 'Santiago Sanchez'`, `lead_contact_person_data = null`.
  - Disqualifier: If test passes without touching template/code, test is asserting the wrong property or mock.

### `RES-T-2` — Decouple completeness check from Active Directory object presence `[x]`

- **Type:** `client`
- **Description:** In `rd-general-information.component.html`, update `appFeedbackValidation [isComplete]` to evaluate `!!this.generalInfoBody.lead_contact_person?.trim()`. In `ipsr-general-information.component.ts`, update `isLeadContactPersonComplete` to check `!!this.ipsrGeneralInformationBody.lead_contact_person?.trim()`.
- **Implements:** `RES-R-1`, `RES-DD-1`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.html`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.ts`
- **Depends on:** `RES-T-1`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] `rd-general-information.component.html` evaluates `[isComplete]` on `!!this.generalInfoBody.lead_contact_person?.trim()`.
  - [x] `ipsr-general-information.component.ts` evaluates `isLeadContactPersonComplete` on `!!this.ipsrGeneralInformationBody.lead_contact_person?.trim()`.
  - [x] Both test suites pass **(GREEN)**.
  - [x] `npx ng lint --quiet` passes clean.
  - [x] Clicking "use this name anyway" decrements the missing fields counter in the bottom bar.

## 4. Dependency graph

```text
RES-T-1 (Regression tests - RED)
   └── RES-T-2 (Template & Component fix - GREEN)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RES-TEST-1` | unit (client) | `RES-R-1` (free text accepted complete) | `rd-general-information.component.spec.ts` |
| `RES-TEST-2` | unit (client) | `RES-R-1` (empty contact incomplete) | `rd-general-information.component.spec.ts` |
| `RES-TEST-3` | unit (client) | `RES-R-1` (IPSR free text complete) | `ipsr-general-information.component.spec.ts` |
| `RES-TEST-4` | unit (client) | `RES-R-1` (IPSR empty incomplete) | `ipsr-general-information.component.spec.ts` |
