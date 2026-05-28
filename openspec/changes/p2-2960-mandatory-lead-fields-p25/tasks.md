## 1. Lead Center — P25 Partners (`rd-contributors-and-partners`)

- [x] 1.1 Mark the Lead Center header required when not led by partner: `app-pr-field-header [required]="!is_lead_by_partner"`. (Note: the field is a raw `<p-select>`, so the asterisk alone does NOT enter the `.pr-field.mandatory` scan.)
- [x] 1.2 Add `appFeedbackValidation` after the `<p-select>` with `labelText="Lead center"` and `[isComplete]="is_lead_by_partner || !!leadCenterCode"` — this is what `someMandatoryFieldIncompleteResultDetail` actually scans.
- [x] 1.3 Lead Partner stays `[required]="is_lead_by_partner"` via `app-pr-select` (already emits `.pr-field.mandatory`) — no regression.

## 2. Lead Contact Person — P25 General Information (`rd-general-information`)

- [x] 2.1 Use `generalInfoBody.lead_contact_person` as the validity proxy (set only on valid selection/load by `lead-contact-person-field`).
- [x] 2.2 Add `@if (isP25()) { <div appFeedbackValidation labelText="Lead contact person" [isComplete]="!!lead_contact_person"></div> }` right after `<app-lead-contact-person-field>`.
- [x] 2.3 Incomplete when empty, complete when a valid contact is present (P25 only).

## 3. Tests

- [x] 3.1 Ran `rd-contributors-and-partners.component.spec.ts` + `rd-general-information.component.spec.ts` → 104 passed, 104 total.
- [ ] 3.2 (Optional follow-up) Add explicit assertions for the new `appFeedbackValidation` divs. HTML-only change; `.ts` coverage unaffected, existing specs green.

## 4. Verify & document

- [x] 4.1 Dev server (`npm start`) recompiled clean; provide General Information + Partners URLs (template with `:id`).
- [ ] 4.2 Capture prtest URLs (current: fields not enforced) vs local (enforced) — pending a fresh API token / real P25 id. **Screenshots → `.local-screenshots/`** at repo root (gitignored; do not commit PNGs).
- [x] 4.3 Backend green-check gap documented: the `green-checks` / `p25 green-checks` completeness query must include `lead_contact_person` / `lead_center` for the section to stay gray (server change, out of frontend scope).
- [x] 4.4 Extend `onecgiar-pr-client/src/CLAUDE.md` with the lead-fields navigation notes + the "document-as-you-go" instruction.
