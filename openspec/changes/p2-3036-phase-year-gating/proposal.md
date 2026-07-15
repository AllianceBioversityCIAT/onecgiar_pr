## Why

The P2-3036 Level 1 (copy) and Level 2 (edits) changes were applied **unconditionally** to the P25 `rd-contributors-and-partners` section. That component renders for **any** P25 result regardless of reporting phase year, so the 2026 redesign also altered how **2025-phase** results display. The 2025 phase must stay **exactly as it was before**. This change gates all the L1/L2 modifications behind the reporting phase year so only phase **2026+** sees the new UI, and the threshold is centralized for future years.

## What Changes

- **New enum** `ReportingDesignYear` (`shared/enum/reporting-design-year.enum.ts`) — single source of truth for the redesign threshold year (`ContributorsPartnersRedesign = 2026`).
- **New helper** `FieldsManagerService.isContributorsPartners2026` (computed) — `true` when the open result's `phase_year >= 2026` (falls back to the active reporting phase year).
- **Gate every L1/L2 change** in `rd-contributors-and-partners` and `multiple-wps-content` so that:
  - **2026+**: new question label, new info notes, "KPI Statement/description" + help text, 2026 Contribution-Target note, Submitter removed, Level/HLO hidden in the No scenario, 50-word limit.
  - **2025 and earlier (legacy, restored verbatim from git)**: original question label, original info notes, "Indicator" label, 2025 Contribution-Target note, Submitter present, Level/HLO shown in No, 30-word limit.
- Gated copy is provided via `computed` text getters in each component; structural gates use the helper inline (`@if (!isCP2026())`, `isCP2026() ? … : …`).

## Capabilities

### New Capabilities
- `contributors-phase-gating`: Phase-year–gated rendering of the Contributors & Partners (P25) ToC section, so the 2026 redesign applies only to phase 2026+ while 2025 keeps the legacy layout, labels and validations. Threshold centralized in an enum.

### Modified Capabilities
<!-- toc-contributors-copy and toc-contributors-edits become conditional on phase year; their requirements are unchanged for 2026, with a 2025 legacy fallback added. Captured here rather than as deltas. -->

## Impact

- **Files (client):**
  - NEW `src/app/shared/enum/reporting-design-year.enum.ts`
  - `src/app/shared/services/fields-manager.service.ts` (helper)
  - `rd-contributors-and-partners.component.ts` + `.html` (gated label/info-note/Submitter/maxWords)
  - `multiple-wps-content.component.ts` + `.html` (gated indicator label/help/Contribution-Target note, Level/HLO visibility)
- **No** API/DTO/entity/backend changes. Component tree excluded from Jest coverage → gate is build + visual before/after on a 2026 and a 2025 result.
- **Risk:** low–medium. The 2025 branch is the pre-L1 markup restored verbatim from git (commit `a089bffe6`), so legacy behavior is preserved by construction. Main risk is `phase_year` not being populated → defaults to legacy (safe-ish, but a 2026 result could briefly show legacy until the result loads); mitigated by the active-phase-year fallback.
