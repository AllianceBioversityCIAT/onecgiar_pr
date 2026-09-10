## 1. Threshold + computed

- [x] 1.1 Add `GeographicLocationRedesign = 2026` to `ReportingDesignYear` enum (with a short doc comment).
- [x] 1.2 Add `isGeographicLocation2026` computed to `FieldsManagerService` (mirrors `isContributorsPartners2026`, using the new enum member).

## 2. Geographic question wording (2026 P25 Innovation only)

- [x] 2.1 In `rd-geographic-location.component.html`, update the `appFeedbackValidation [labelText]` (lines 5-9) so P25 Innovation in 2026 reads "What is the location of benefit for this result?", else legacy text.
- [x] 2.2 Update `app-geoscope-management [description]` (lines 20-24) so 2026 reads the "Location of benefit refers to…" text, else legacy.
- [x] 2.3 Update `app-geoscope-management [label]` (lines 25-29) to match 2.1.
- [x] 2.4 Leave mandatory (`[required]="true"`) and the Output/P22 fallback untouched.

## 3. Verify

- [x] 3.1 `npm run build:dev` passes.
- [x] 3.2 Jest suite passes (no regressions).
- [x] 3.3 Visual on a 2026 P25 Innovation result: new "location of benefit" question + description, still mandatory.
- [x] 3.4 Visual on a 2025 P25 Innovation result (or by construction): legacy wording unchanged.
