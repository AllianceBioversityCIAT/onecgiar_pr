# Design — Bilateral Knowledge Product: pool-funding parity

## 1. Summary

One predicate, `BilateralCreationService.isKnowledgeProduct` (`Number(resultTypeId()) === 6`), gates every change. The GI section locks Title/Description for a KP, the result creator replaces the AI check with a confirm-then-silent-submit path, and the AI surfaces are hidden. Requirements: `./requirements.md`.

## 1A. Premise Ledger

| # | Premise | Source | Status |
|---|---|---|---|
| KPP-P-1 | The server never calls the AI for a KP and accepts `submitted_anyway` on `skipped_kp_rule` | `bilateral-quality-assessment.service.ts:122-128`, `bilateral-center.service.ts` `assertAssessmentDecision` | verified (read) |
| KPP-P-2 | `pr-input`/`pr-textarea` print "Not applicable" when read-only, empty and NOT required | `pr-textarea.component.html:19`, `pr-input.component.html:37` | verified (read) |
| KPP-P-3 | MDS items flagged `optional` do not count towards `overallStatus` | `bilateral-mds-tracker.service.ts` (`optional`) | verified (spec with the real tracker) |

## 2. Decisions

- **KPP-DD-1** Single predicate on the creation service; no literal `6` in new code (the dialog keeps its older private constant, untouched).
- **KPP-DD-2** `section-general-info` adds `titleDescriptionReadOnly` and does not fold KP into `readOnly()`, which Lead contact person and the impact areas keep using.
- **KPP-DD-3** For a KP, Title/Description are published to the MDS tracker with `optional: true`, so an empty repository value never greys Submit.
- **KPP-DD-4** `BilateralQualityAssessmentUiService.submitKnowledgeProduct(rid)`: POST assessment then PATCH submit with `submitted_anyway`, wrapped in `defer` with an `isKpSubmitting` guard (second call completes empty). It never touches `assessment` or `state`, so `isDialogOpen()` stays false and the rail card and field flags have nothing to show.
- **KPP-DD-5** Confirmation = Spartan `hlm-dialog` (`kp-submit-confirm-dialog`, same shape as `toc-linkage-switch-dialog`); copy in `internationalization/bilateral-kp-submit.copy.ts`. Cancel is the default focus; Escape cancels.
- **KPP-DD-7** (adversarial review, 16-Oct-2026) Server `isReusable` no longer reuses a row that already carries a submit `decision`: a result rejected and resubmitted unchanged (the usual KP case, Title/Description read-only) was refused for good. Applies to every type — it was a latent bug for all of them.
- **KPP-DD-8** `submitKnowledgeProduct` waits for a `running` row (202 from a concurrent tab) with the same poll window as `run()` before the PATCH.
- **KPP-DD-9** `reloadAfterResultTypeChange` resets the held assessment, so a change to KP does not leave the former type's AI flags on screen.
- **KPP-DD-6** `submitResult()` keeps all its guards; the KP branch comes after them. `loadLatest` is skipped for a KP; the rail card and the submit note are behind `!isKnowledgeProduct()`.

## 3. Files

Server: `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-assessment.service.ts` (`isReusable`). Client: `services/bilateral-creation.service.ts`, `services/bilateral-quality-assessment-ui.service.ts`, `components/section-general-info/*`, `components/kp-submit-confirm-dialog/*`, `pages/bilateral-result-creator/*`, `internationalization/bilateral-kp-submit.copy.ts`.

## 4. Tests

GI read-only/required/MDS (`section-general-info.component.spec.ts`); submit opens confirmation not the AI, confirm once, cancel nothing, non-KP unchanged, rail card hidden (`bilateral-result-creator.component.spec.ts`); `submitKnowledgeProduct` single PATCH and no dialog (`bilateral-quality-assessment-ui.service.spec.ts`); predicate (`bilateral-creation.service.spec.ts`); dialog (`kp-submit-confirm-dialog.component.spec.ts`).
