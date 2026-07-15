## Context

`rd-geographic-location.component.html` renders the geographic question three times with the same ternary `this.fieldsManagerSE.isP25() && this.fieldsManagerSE.isAnInnovation() ? <innovation text> : <output/undefined>`:
- line 5-9: `appFeedbackValidation [labelText]` (drives the mandatory scan)
- line 20-24: `app-geoscope-management [description]`
- line 25-29: `app-geoscope-management [label]`

`isAnInnovation` already = `result_type_id == 2 (use) || == 7 (dev)`, exactly the two types Santi referenced. The mandatory flag lives on `app-geoscope-management [required]="true"` and is unchanged. The section is not phase-gated today.

## Goals / Non-Goals

**Goals:** swap the innovation question label + description to the "location of benefit" wording only for P25 Innovation results in phase 2026+, keeping 2025 and non-Innovation/P22 identical, and keep the field mandatory.

**Non-Goals:** no backend; no change to the Output/P22 fallback text; no change to mandatory behavior; no touching the shared `geoscope-management` component texts.

## Decisions

**D1 — New threshold member + computed, mirroring contributors.** Add `ReportingDesignYear.GeographicLocationRedesign = 2026` and `FieldsManagerService.isGeographicLocation2026` (same body as `isContributorsPartners2026`: `(currentResult.phase_year ?? reportingCurrentPhase.phaseYear) >= threshold`). A per-feature member keeps the "one-line change per future threshold" pattern and avoids semantically reusing the contributors-named computed in another section.

**D2 — Nested ternary in the template, not new wrappers.** Keep the existing `isP25() && isAnInnovation()` branch; inside it choose by `isGeographicLocation2026()`:
`isP25() && isAnInnovation() ? (isGeographicLocation2026() ? '<location-of-benefit>' : '<legacy innovation text>') : '<output/undefined>'`.
Applied identically to all three bindings (labelText, description, label) so the rendered question and the mandatory-scan label stay in sync.

**D3 — Keep description as helper text.** AC9 allows tooltip or helper text; the field already uses a `[description]` helper, so we keep that channel (least change, consistent with the section).

## Risks / Trade-offs

- [Three bindings must stay in sync] → All three use the identical ternary; the `labelText` (scan) and `label` (display) must match so the mandatory feedback label equals the visible question. Mitigated by copy-pasting the same expression.
- [No unit tests] → component path not heavily covered; verify via `build:dev` + Jest suite + visual on a 2026 P25 Innovation result (new wording) and a 2025 one (legacy).
