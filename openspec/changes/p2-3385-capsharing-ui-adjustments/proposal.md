## Why

Three UI defects were found during review of the Capacity Sharing reporting flow (Jira **P2-3385**, sub-task of **P2-3241**, epic **P2-3415** — *W1/W2 Results Creation Flow*). Two of them make controls read as broken to the user: the primary action button never shows the pointer cursor, so it does not look clickable, and the PhD / Master follow-up options render loose outside the card that holds every other question on the form. The third — a question that looked already answered without any selection — needs to be reproduced on screen first, because the screenshots in the ticket predate the `field-card` redesign.

This change is **frontend-only**. No backend work is required: no DTO, no endpoint, no migration, and nothing that touches the MySQL green-check functions.

## What Changes

- **Pointer on the primary submit button.** The `Create and continue` button in the lab report form gains the enabled-state pointer cursor it lacks today. Its `disabled:cursor-not-allowed` behaviour is unchanged.
- **PhD / Master options render inside their card.** The capdev sub-term radio group is given its own label so the shared field wrapper stops treating it as a bare control and applies the card container, matching every sibling question on the form.
  - 🛑 **Not changing:** that group stays `[required]="false"`. It is optional on purpose — the server's `valid_text(capdev_term_id)` is already satisfied by the parent group via `validate_capdev_term_id()`'s fallback. Flipping it would change green-check behaviour for the section.
- **Geographic focus "completed without selection" — verification task, not a code change yet.** The ticket's screenshots are from 2026-08-20 and show a green status card with a `MANDATORY` pill. That styling no longer exists: `field-card` was redesigned to drop status colours and pills entirely. The task is to reproduce the symptom in the browser and write the outcome back to the ticket. Only if it still reproduces does a code change get scoped — and it will not be scoped as a change to `hasValue` or the `complete` class.
  - 🛑 **Not changing:** `hasValue` and the `complete` class. `DataControlService` scans `.complete`; both are load-bearing for the section alert list.
- No breaking changes.

## Capabilities

### New Capabilities
- `capsharing-form-field-framing`: how the Capacity Sharing form's conditional sub-questions are framed by the shared field wrapper — when a control renders inside a card versus bare — and the invariant that framing a control must never alter its `required` state.

### Modified Capabilities

_None._ The submit-button cursor is a styling omission with no requirement behind it, and the geographic-focus item is a verification task whose outcome may add no requirement at all. Neither changes spec-level behaviour of an existing capability.

## Impact

**Affected code (client only):**
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html:333` — submit button class list.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/cap-dev-info/cap-dev-info.component.html:44-51` — capdev sub-term radio group.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/cap-dev-info/cap-dev-info.component.spec.ts` — regression guard on `required`.

**Read but deliberately untouched:**
- `onecgiar-pr-client/src/app/custom-fields/field-card/field-card.component.ts:71` (`isBare`) and `field-card.component.html:8` — the mechanism being satisfied, not modified.
- `onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.ts:90` (`hasValue`) and `pr-radio-button.component.html:11` (`.complete`).

**Baseline docs:** `docs/ux-ui/design.md` (field framing and the redesigned field block), `docs/prd.md` (Capacity Sharing reporting flow). No `docs/trd/trd.md` change — no module, data-model, or API impact.

**Backend:** none. Explicitly out of scope, including `validation_capacity_dev_P25` / `_P22`.

**Out of scope by ticket text:** the `Cancel` button at `lab-report-form.component.html:325` has the same missing-cursor defect. Flagged in the Jira technical comment; not fixed here because P2-3385 names only "Create and continue".
