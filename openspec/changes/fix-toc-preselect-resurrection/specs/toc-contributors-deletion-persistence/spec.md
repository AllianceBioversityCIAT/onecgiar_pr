## ADDED Requirements

### Requirement: Saved deletion of ToC-derived Science Programs persists across reload

In the 2026 Contributors & Partners section (`isCP2026()`), when a user removes every ToC-derived Contributing Science Program and saves, the frontend prefill (`preselectScienceEffect`) SHALL NOT re-add those Science Programs on a subsequent load or full page reload. The emptied Contributing Science Program selection SHALL match the persisted backend state.

#### Scenario: Deleting all ToC Science Programs, saving, then reloading keeps them gone
- **WHEN** a result whose ToC node carries synergy Science Programs is opened, the prefilled Science Programs are removed, and the section is saved so the backend `contributing_initiatives` is empty
- **AND** the user reloads the page (F5)
- **THEN** the Contributing Science Program/Accelerator selection stays empty, with no Science Programs re-added by the prefill

#### Scenario: Saved partial deletion of ToC Science Programs is preserved
- **WHEN** the user removes some (not all) prefilled ToC Science Programs, saves, and reloads
- **THEN** only the Science Programs persisted by the backend are shown, and the removed ones are not re-added by the prefill

### Requirement: Saved deletion of ToC-derived Centers persists across reload

In the 2026 Contributors & Partners section (`isCP2026()`), when a user removes every ToC-derived Contributing CGIAR Center and saves, the frontend prefill (`preselectCentersEffect`) SHALL NOT re-add those Centers on a subsequent load or full page reload. The emptied Contributing CGIAR Centers selection SHALL match the persisted backend state.

#### Scenario: Deleting all ToC Centers, saving, then reloading keeps them gone
- **WHEN** a result whose ToC node carries Centers is opened, the prefilled Centers are removed, the section is saved so the backend persists no contributing centers, and the user reloads the page
- **THEN** the Contributing CGIAR Centers selection stays empty, with no Centers re-added by the prefill

### Requirement: First-time prefill still applies to never-saved sections

The ToC prefill SHALL continue to populate Contributing Science Programs and Contributing CGIAR Centers from the ToC only for a section that has never been saved, so that newly created or never-edited results still receive their ToC-derived contributors.

#### Scenario: A never-saved result still gets its ToC contributors prefilled
- **WHEN** a 2026 result whose Contributors & Partners section has never been saved is opened and its ToC node carries synergy Science Programs and/or Centers
- **THEN** the Contributing Science Program/Accelerator and Contributing CGIAR Centers dropdowns are prefilled from the ToC as they are today

### Requirement: 2025 legacy behavior is unchanged

This deletion-persistence behavior SHALL apply only under the 2026 path (`isCP2026()` / `isContributorsPartners2026()`). The 2025 legacy branch SHALL remain unchanged.

#### Scenario: 2025 results are unaffected
- **WHEN** a 2025-phase result Contributors & Partners section is opened, edited, saved, and reloaded
- **THEN** its behavior is identical to before this change, with no new prefill/deletion logic applied
