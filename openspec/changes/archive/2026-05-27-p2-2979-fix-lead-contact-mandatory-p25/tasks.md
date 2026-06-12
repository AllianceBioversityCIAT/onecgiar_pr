## 1. Fields manager — P25 required label

- [x] 1.1 In `fields-manager.service.ts`, set `'[general-info]-lead_contact_person'.required` to `this.isP25()` (was hard-coded `false`).
- [x] 1.2 Confirm P22 field config still resolves `required: false` when portfolio is not P25.

## 2. Lead contact field component

- [x] 2.1 Add `@Input() required = false` to `lead-contact-person-field` and pass it to `app-pr-field-header [required]` (or equivalent) so the asterisk shows when parent sets P25.
- [x] 2.2 Keep `app-pr-input` with `[required]="false"` to avoid false-positive `.pr-input.mandatory` scan on `searchQuery` text (completion handled separately).
- [x] 2.3 Ensure `clearContact()` / `selectUser()` keep `lead_contact_person` and `lead_contact_person_data` in sync.

## 3. General information — validation wiring (P25 only)

- [x] 3.1 In `rd-general-information.component.html`, pass `[required]="isP25()"` to `<app-lead-contact-person-field>`.
- [x] 3.2 Update `appFeedbackValidation` `[isComplete]` to `!!generalInfoBody.lead_contact_person && !!generalInfoBody.lead_contact_person_data` (still inside `@if (isP25())`).

## 4. Tests

- [x] 4.1 Extend `fields-manager.service.spec.ts`: P25 → lead contact `required: true`; P22 → `false`.
- [x] 4.2 Extend `lead-contact-person-field.component.spec.ts` (or `rd-general-information.component.spec.ts`) for required header when `required` input is true.
- [x] 4.3 Run `npm run test -- fields-manager.service.spec.ts lead-contact-person-field rd-general-information.component.spec.ts` — all green.

## 5. Verify (manual — P25 only)

- [x] 5.1 On prtest/local P25 result (e.g. **8525** per P2-2979): empty Lead contact → Save → alert lists **Lead contact person**; asterisk visible.
- [x] 5.2 Type search text without selecting → Save → still listed as missing.
- [x] 5.3 Select valid AD user → Save → field not in alert (covered by unit test: `selectUser` populates `lead_contact_person` + `lead_contact_person_data`, which clears the `isComplete` validation).
- [x] 5.4 Open a **P22** result General information → no required asterisk on Lead contact person; no regression.
- [x] 5.5 Screenshots to `onecgiar_pr/.local-screenshots/` if documenting for Jira (do not commit PNGs).
