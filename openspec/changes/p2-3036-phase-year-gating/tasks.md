## 1. Centralized helper

- [x] 1.1 Add `ReportingDesignYear` enum (`shared/enum/reporting-design-year.enum.ts`) with `ContributorsPartnersRedesign = 2026`.
- [x] 1.2 Add `isContributorsPartners2026` computed to `FieldsManagerService` (phase_year >= threshold, with active-phase fallback).

## 2. Gate rd-contributors-and-partners

- [x] 2.1 `isCP2026`, `tocQuestionLabel`, `tocQuestionInfoNote` computeds (new vs legacy strings).
- [x] 2.2 Bind `[label]`/`[description]`; gate Submitter block with `@if (!isCP2026())` (legacy block restored verbatim); `maxWords` `isCP2026() ? 50 : 30`.
- [x] 2.3 `contributorsText` uses `tocQuestionLabel()`.

## 3. Gate multiple-wps-content

- [x] 3.1 `indicatorLabel`, `indicatorHelp`, `contributionTargetNote` computeds (new vs legacy).
- [x] 3.2 Bind them; gate Level wrapper and HLO `@if` with `(isCP2026() ? !isUnplanned : true)`.

## 4. Verify

- [x] 4.1 `build:dev` passes.
- [x] 4.2 2026 result (8562, phase 36): redesigned UI shown, Submitter absent — verified visually.
- [ ] 4.3 2025 result: legacy UI shown (Submitter present, "Indicator", 2025 wording). Legacy markup restored verbatim from commit `a089bffe6`; confirm on a 2025 phase when available.
