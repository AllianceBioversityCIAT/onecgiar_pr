## Context

P2-2960 introduced P25 mandatory lead fields. General information already has:

```html
@if (isP25()) {
  <div appFeedbackValidation labelText="Lead contact person" [isComplete]="!!generalInfoBody.lead_contact_person"></div>
}
```

`FieldsManagerService` still defines `[general-info]-lead_contact_person` with `required: false`, so `app-pr-input` inside `lead-contact-person-field` renders **without** the required asterisk. QA (P2-2979, result **8525**, P25) expects the same UX as other mandatory fields: visible required marker + validation alert on Save.

Result Detail validation uses two layers (`src/CLAUDE.md` §21.5):

1. **Client alert** — `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` scans `.pr-field.mandatory` (via `appFeedbackValidation` or `app-pr-select`) and `.pr-input.mandatory .input-validation`.
2. **Green check** — backend `green-checks` (out of scope).

**Constraint from review:** enforcement is **P25 portfolio only** (`portfolio === 'P25'`). P22 must keep optional Lead contact person.

## Goals / Non-Goals

**Goals:**

- P25: Lead contact person shows as **required** in General information.
- P25: Save with no valid selected contact triggers the standard missing-fields alert including **Lead contact person**.
- P25: Valid selection (user picked from AD search / locked contact) clears the item from the alert.
- Typing in the search box without selecting a user remains **incomplete** (do not treat `searchQuery` as the completeness proxy).

**Non-Goals:**

- Lead Center / Lead External Partner (Partners section — separate P2-2960 work).
- P22 mandatory lead contact.
- Backend green-check / completeness SQL changes.
- Changing AD search UX (min 4 chars, email auto-select).

## Decisions

### 1. Required flag in `FieldsManagerService` — portfolio-gated

Set `'[general-info]-lead_contact_person'.required` to `this.isP25()` instead of hard-coded `false`.

**Rationale:** `app-pr-input` reads `required` from `fieldsManager.fields()[fieldRef]`; this is the canonical asterisk path. **Alternative:** only pass `[required]` from parent — duplicates portfolio logic outside FieldsManager.

### 2. Do not rely on `.pr-input.mandatory` alone for completeness

`app-pr-input` binds `[(ngModel)]="userSearchService.searchQuery"`. The `.input-validation` div mirrors **search text**, not `lead_contact_person`. If `required: true`, a non-empty partial search would falsely pass the input scan.

**Rationale:** Keep `appFeedbackValidation` (or equivalent) with:

```ts
[isComplete]="!!generalInfoBody.lead_contact_person && !!generalInfoBody.lead_contact_person_data"
```

Align with `selectUser()` / `clearContact()` in `lead-contact-person-field`, which set both properties together.

**Alternative:** Custom `complete` class on the input wrapper — more invasive; feedback directive pattern already used for Lead Center (P2-2960).

### 3. Optional `@Input() required` on `lead-contact-person-field`

Pass `[required]="isP25()"` from `rd-general-information` so the child can suppress misleading `.pr-input.mandatory` styling when portfolio is P22, or force `required` on `app-pr-input` only when parent says so.

**Rationale:** Child component is shared; portfolio gate stays in parent + FieldsManager.

### 4. P25-only `@if` blocks unchanged

Keep `appFeedbackValidation` inside `@if (isP25())`. Do not add P22 feedback hooks.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Stale `lead_contact_person` string without `lead_contact_person_data` from legacy API data | Treat incomplete unless both are set; verify load path in `ngOnChanges` |
| Duplicate "Lead contact person" in alert if both pr-input and feedback scan fire | Gate pr-input mandatory scan: use `required: false` on input when relying on feedback only, OR set `required` for asterisk only via field header override — prefer FieldsManager `required: isP25()` + feedback for **completion**; if double-listing occurs, set `app-pr-input [required]="false"` and use `app-pr-field-header [required]="isP25()"` manually in lead-contact template |
| Green check still green when field empty | Document backend follow-up (unchanged from P2-2960) |

**Note on double-scan:** With `required: isP25()` on FieldsManager, pr-input becomes `.pr-input.mandatory` and may list the field from search text. **Mitigation:** In `lead-contact-person-field`, pass `[required]="false"` to `app-pr-input` and add standalone `app-pr-field-header [required]="requiredInput"` where `requiredInput` comes from parent `isP25()`. Completion stays on `appFeedbackValidation` only. Document this split in implementation tasks.

## Migration Plan

1. Implement behind existing P25 portfolio check (no feature flag).
2. Verify on prtest with result **8525** (or any open P25 result): empty lead contact → Save → alert lists field; asterisk visible.
3. Smoke P22 result: no asterisk, no new alert entry for lead contact.
4. Deploy client only.

## Open Questions

- None blocking — confirm with QA that result 8525 is P25 (repro steps assume prtest P25).
