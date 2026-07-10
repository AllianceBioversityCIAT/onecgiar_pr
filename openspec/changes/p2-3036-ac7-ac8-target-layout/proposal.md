## Why

New 2026 adjustments requested by Santiago Sanchez on P2-3036 (AC7, AC8) for the P25 Contributors & Partners "Yes" scenario. They tighten the indicator/target layout so all read-only TOC data sits together, make the contribution input mandatory and clearer, and remove a now-redundant free-text explanation. Everything is gated by `isCP2026()` so phase-2025 results stay identical (consistent with the existing redesign gating).

**Frontend-only change.** No backend required — only template layout, a placeholder string, a required flag, and a visibility condition change.

Jira ticket: **P2-3036** (AC7, AC8). AC9 (geographic location label/description) is intentionally NOT in this change — it is awaiting a scope clarification from Santi.

## What Changes

- **AC7 — layout & validation (2026 only)** in `multiple-wps-content.component.html`:
  - Move the read-only **"Unit of measurement"** and **"Target"** display so it renders directly below the new **"Indicator Tipology"** field, grouping all read-only TOC data together. In 2025 they stay in their current position.
  - Make the **"Contribution to indicator target"** field mandatory with a visible red asterisk.
  - Change the contribution input placeholder from **"Enter target"** to **"Add here contribution to target"**.
- **AC8 — hide explanation (2026 only)**: hide the **"Explanation of how the result aligns with/contributes to the Program's TOC pathway"** textarea in the 2026 Yes scenario. In 2025 it stays.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `contributors-phase-gating`: extends the "2026+ shows the redesigned section" behavior with the AC7/AC8 layout and validation rules (read-only TOC data grouped under Indicator Tipology, mandatory contribution-to-target with asterisk and updated placeholder, hidden alignment-explanation textarea). 2025 behavior unchanged.

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html` — layout reorder, placeholder, `[required]`, and a visibility condition; all conditioned on `isCP2026()`.
- Possibly `multiple-wps-content.component.ts` if a computed/helper is needed for the mandatory feedback.
- No backend, no API, no green-check/completeness change (mandatory here is UI asterisk + client feedback only; server completeness is out of scope).
- Component is excluded from Jest coverage; verification is `build:dev` + visual on a 2026 P25 result and a 2025 P25 result.
