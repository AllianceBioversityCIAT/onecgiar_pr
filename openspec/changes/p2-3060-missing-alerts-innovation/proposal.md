## Why

Jira **P2-3060 "Missing Alerts"** (bug, epic *Bugs 2026*). Three required fields in the Innovation Use and Innovation Development result types show the red required-asterisk but never contribute to the front-end validation-alert counter ("N alerts / `<field>` is missing" in the save button). Users can leave these mandatory fields empty without any warning, discovering the problem only when the section's green check refuses to turn green. This change is **frontend-only**.

## What Changes

- **Field 1 — "Current core innovation use in number of users…" (Innovation Use, P25).** Add a scannable mandatory marker so the alert fires when the user has neither selected "This is yet to be determined" nor added any actor / organization / other quantitative measure. Component: `shared/components/innovation-use-form/`.
- **Field 2 — "Innovation team diversity – Have concrete actions been taken…" (Innovation Development).** Add a scannable mandatory marker so the alert fires when no option is selected in the team-diversity question. Component: `innovation-dev-info/components/innovation-team-diversity/`.
- **Field 3 — "Evidence of user need/user demand" (Innovation Development, P25).** **PENDING** — awaiting QA (Santi) confirmation over Slack. This section is currently optional and its content does not drive the backend green check (the green check validates the *readiness* evidence in the general "Evidence" section instead). Scope documented here but **not implemented** until the expected behavior is confirmed.

No backend changes. The alert layer is computed 100% client-side by `DataControlService.someMandatoryFieldIncompleteResultDetail()` scanning the section DOM for `.pr-field.mandatory` elements without `.complete`. The fix reuses the existing `appFeedbackValidation` directive pattern — no new mechanism.

## Capabilities

### New Capabilities
- `innovation-required-field-alerts`: Client-side required-field validation alerts for the Innovation Use / Innovation Development sections, wiring the affected mandatory fields into the existing `appFeedbackValidation` / `fieldFeedbackList` alert counter so empty required fields surface a "… is missing" alert.

### Modified Capabilities
<!-- None — no existing OpenSpec capability owns these fields; behavior added is net-new required-field feedback. No backend requirement changes. -->

## Impact

- **Frontend-only.** No server, DB, or migration impact. The backend green-check queries are unchanged (read only, for parity of the completeness condition).
- **Files (implement now):**
  - `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.{html,ts}` — Field 1.
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.{html,ts}` — Field 2.
- **Files (Field 3, pending Santi):** `innovation-dev-info/components/user-evidence/` and `innovation-dev-info.component.html` — held until QA confirms expected behavior.
- **Existing pattern reused:** `appFeedbackValidation` directive (`shared/directives/feedback-validation.directive.ts`) and `anticipated-innovation-user.checkAlert()` as reference implementation.
- **SDD baseline:** aligns with `onecgiar-pr-client/src/CLAUDE.md` §21.5 (the two-layer forms/validation model — this touches layer 1, client-side mandatory feedback). No `docs/prd.md` acceptance-criteria change; this is a defect fix.
- **Tests:** Jest unit coverage for the new `checkAlert`-style completeness methods; keep client thresholds (50/60/60/60).
