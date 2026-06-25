## ADDED Requirements

### Requirement: 2026 Innovation geographic question uses "location of benefit"
For a P25 **Innovation** result (innovation use or innovation development) whose reporting phase year is 2026 or later, the Geographic location section's main question SHALL read "What is the location of benefit for this result?" and its description SHALL read "Location of benefit refers to the country, region, or global area where this result is reasonably expected to create benefit — directly or through partners." The question remains mandatory. Earlier phases and non-Innovation/P22 results are unchanged.

#### Scenario: 2026 P25 Innovation result
- **WHEN** a P25 Innovation result whose `phase_year >= 2026` opens the Geographic location section
- **THEN** the main question reads "What is the location of benefit for this result?", its description reads the "Location of benefit refers to…" text, and the field is still mandatory

#### Scenario: 2025 P25 Innovation result unchanged
- **WHEN** a P25 Innovation result whose `phase_year < 2026` opens the section
- **THEN** the question still reads "What is the current geographic focus of the innovation development, testing and/or use?" with its original description

#### Scenario: Non-Innovation / P22 unaffected
- **WHEN** a non-Innovation result, or any P22 result, opens the section
- **THEN** the question still reads "What is the main geographic focus of the Output?" regardless of phase year

### Requirement: Geographic redesign threshold is centralized
The geographic-location redesign year SHALL be defined as `ReportingDesignYear.GeographicLocationRedesign` and exposed via a single `FieldsManagerService.isGeographicLocation2026` computed, mirroring the contributors gating.

#### Scenario: Threshold defined once
- **WHEN** the geographic-location question needs phase gating
- **THEN** it reads `FieldsManagerService.isGeographicLocation2026()` (backed by `ReportingDesignYear.GeographicLocationRedesign`) rather than a hard-coded year literal in the template
