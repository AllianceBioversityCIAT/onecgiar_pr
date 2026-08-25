## Why

**Frontend half only. The completion-check half is backend and is NOT delivered here.** Jira: **P2-3263** and **P2-3264** (epic P2-3243 — SIDS Forms Update W1/W2).

Two tickets in the same epic ask for the same thing on the same screen, so they are built as one change:

- **P2-3263** — remove the section _"Demand of anticipated innovation user"_ from the Innovation Development form.
- **P2-3264** — remove the question _"To which of the below Megatrend(s) is this innovation expected to contribute?"_ from the same form.

Both blocks render today for **every** phase: neither sits inside a phase gate. Hiding them outright would also strip them from 2025 results, which the epic's governing rule forbids — previous phases must render exactly as they did, with whatever was reported.

## What Changes

- A new threshold `InnovationDevFormReduction: 2026` in `ReportingDesignYear`, and a matching `isInnovationDevFormReduced2026` computed on `FieldsManagerService`.
- The two blocks render only when that gate is false. From the 2026 phase on they are gone; 2025 and earlier keep both, with their stored answers.
- **No component is deleted.** `anticipated-innovation-user` and `megatrends` are the only renderers for that data and previous phases still need them.
- **No data is deleted, deactivated or migrated.** `result_answers` and the Innovation Development summary keep everything they hold, exactly as both tickets require.

### Gated on the phase YEAR, not on the portfolio

The pre-plan published on both tickets suggested `isP25()`. That is the wrong gate and it is used here deliberately differently: `isP25()` answers **which portfolio**, and the two questions are not interchangeable — the test environment holds **2025-phase results inside the P25 portfolio**, which a portfolio gate would strip the section from, breaking the epic rule the tickets are built on. `ReportingDesignYear` already exists precisely for this and four other 2026 thresholds use it.

## Capabilities

### New Capabilities
- `innovation-dev-form-2026-reduction`: which blocks the Innovation Development form shows from the 2026 phase on, and the guarantee that earlier phases are untouched.

### Modified Capabilities
<!-- None. -->

## Impact

**Code (client only):**
- `src/app/shared/enum/reporting-design-year.enum.ts` — new threshold.
- `src/app/shared/services/fields-manager.service.ts` — new computed.
- `…/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.html:43, 60` — the two blocks.

**Backend: REQUIRED and NOT DONE.** Both tickets state, in their acceptance criteria, that the removed items must stop counting toward the green check. That check is not computed in the screen: `results-validation-module.repository.ts:53` calls the stored procedure `validate_sections_mapped_batch`, which resolves `validation_<section>_<portfolio>`. **This change cannot satisfy those criteria and does not claim to.** See Open Questions.

**Phase scope:** satisfied by construction and verified in the browser on both a 2026 and a 2025 result.

**SDD baseline:** `docs/system-design/design.md` (form layout, phase-gated UI).
