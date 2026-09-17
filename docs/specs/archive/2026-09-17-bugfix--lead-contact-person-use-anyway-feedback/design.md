# Design — Lead Contact Person "Use this name anyway" Completeness

## 1. Summary

This design aligns the mandatory feedback mechanism (`appFeedbackValidation`) for Lead Contact Person in both Pooled Results (`rd-general-information`) and Innovation Packages (`ipsr-general-information`) so that explicitly accepted free-text names ("use this name anyway") satisfy the UI completeness check without demanding an Active Directory record.

Related requirements: [`requirements.md`](./requirements.md) (`RES-R-1`).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client components touched:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.html`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.ts`
- **Client test suites touched:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.spec.ts`
- **Server modules touched:** None. Backend already stores free-text contacts with nullable `lead_contact_person_id`.

### 2.2 Data Flow & Interaction

```text
[User types non-directory name]
   │
   ├─► onSearchInput: body.lead_contact_person = null, lead_contact_person_data = null
   │     └── isComplete evaluates FALSE (field missing)
   │
[User clicks "use this name anyway"]
   │
   ├─► acceptTypedNameAnyway():
   │     ├── body.lead_contact_person = trimmed name
   │     └── body.lead_contact_person_data = null
   │
[Feedback evaluation]
   │
   ├─► appFeedbackValidation evaluates [isComplete]="!!body.lead_contact_person?.trim()" -> TRUE
   ├─► FeedbackValidationDirective adds class 'complete' to DOM marker
   └─► DataControlService scan sees 'complete' -> decrements missingFields -> bottom bar clears alert
```

## 3. Data Model Changes

None. Existing payload interface in `generalInfoBody.ts` and database columns in `result` (`lead_contact_person`, `lead_contact_person_id`) remain unchanged.

## 4. API Surface

No changes to REST endpoints or DTO contracts.

## 5. Component Architecture & Design Decisions

### 5.1 Design Decisions

#### `RES-DD-1`: Decouple UI completeness from Active Directory record presence

- **Problem:** `appFeedbackValidation` in `rd-general-information.component.html` and `isLeadContactPersonComplete` in `ipsr-general-information.component.ts` checked `lead_contact_person_data`, making it impossible for free-text contacts to clear the missing fields counter.
- **Decision:** Change the completion predicate to test the presence of a non-empty, trimmed `lead_contact_person` string.
- **Rationale:** The field card itself (`hasSelectedContact`) and the save handler (`onSaveSection`) already treat an accepted free-text name as valid data. Active Directory lookup is an enrichment mechanism, not an exclusionary constraint for reporting non-CGIAR partners or external consultants.

### 5.2 Challenge Reversions (Step 2.3)

- **Reverted behavior:** Inversion of commit `b79779b49` requirement where `lead_contact_person_data` was strictly mandated for completeness.
- **Challenge Question:** *What does removing `!!lead_contact_person_data` break?*
- **Outcome & Analysis:**
  - *Does it allow unselected typing to pass?* No. `onSearchInput` sets `lead_contact_person = null` as soon as keystrokes occur. Only clicking an AD item or clicking "use this name anyway" populates `lead_contact_person`.
  - *Does it break the save path?* No. `acceptTypedNameAnyway()` sets `queryCameFromHydration = true`, which satisfies `onSaveSection()`.
  - *Does it break backend persistence?* No. `results.service.ts` gracefully handles `lead_contact_person_id = null` and stores `lead_contact_person`.

## 6. Budget & Sizing (Step 2.4)

| Metric | Budget |
|---|---|
| Expected tasks | 2 |
| Expected LOC | ~25 LOC |
| Expected review rounds | 1 |
| Sizing classification | Lite (Bug Mode) |
