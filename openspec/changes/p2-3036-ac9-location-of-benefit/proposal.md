## Why

P2-3036 AC9 (new adjustment requested by Santiago Sanchez): for the P25 Geographic location section, the main question and its description should reflect "location of benefit" wording instead of "geographic focus". Per Santi's clarification (Slack, 2026-06-25): apply **only to phase 2026** (2025 stays identical) and **only to Innovation results** (innovation use + innovation development, which already share this question).

**Frontend-only change.** No backend.

Jira ticket: **P2-3036** (AC9).

## What Changes

- In `rd-geographic-location.component.html`, for P25 **Innovation** results in **phase 2026+**:
  - Change the main question label from "What is the current geographic focus of the innovation development, testing and/or use?" to **"What is the location of benefit for this result?"** (field stays mandatory).
  - Change its description to **"Location of benefit refers to the country, region, or global area where this result is reasonably expected to create benefit — directly or through partners."**
- Phase 2025 P25 Innovation keeps the current wording; non-Innovation and P22 results are unaffected.
- Add `ReportingDesignYear.GeographicLocationRedesign = 2026` and a `FieldsManagerService.isGeographicLocation2026` computed to gate by phase year (same pattern as `isContributorsPartners2026`).

## Capabilities

### New Capabilities
- `geographic-location-phase-gating`: phase-year gating of the P25 Innovation geographic-location question label and description (2026 "location of benefit" vs 2025 "geographic focus").

### Modified Capabilities
<!-- none -->

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.html` — label + description wording, gated.
- `onecgiar-pr-client/src/app/shared/enum/reporting-design-year.enum.ts` — new `GeographicLocationRedesign = 2026` member.
- `onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts` — new `isGeographicLocation2026` computed.
- No backend. The geoscope question stays mandatory (`app-geoscope-management [required]="true"` unchanged).
- `rd-geographic-location` is shared across portfolios; the change is scoped by `isP25() && isAnInnovation() && isGeographicLocation2026()`, so P22 / non-Innovation / 2025 are untouched.
