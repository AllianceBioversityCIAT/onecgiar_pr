## Why

The 2026 Contributors & Partners redesign (P2-3036) removed the **Submitter** field for 2026+ reporting phases. Business has reversed that decision: Nicoleta (via Ángel) and Santi confirmed the field must stay. The Submitter must therefore render in **all** reporting phases again, not only 2025 and earlier.

**Frontend-only change.** No backend work is required — `changePrimaryInit` is still set in `rd-contributors-and-partners.service.ts`, so the save payload is unaffected; only the field's visibility gate changes.

Jira ticket: **P2-3036**.

## What Changes

- Remove the `@if (!isCP2026())` wrapper that hides the Submitter `app-pr-select` block in the 2026 redesign of `rd-contributors-and-partners.component.html`, so the Submitter renders in every reporting phase.
- Keep the inner `@if (this.rdPartnersSE.getConsumed())` guard and the "cannot change the submitter" note exactly as they are — only the phase-year gate around the field is removed.
- All other 2026 redesign changes (question label, KPI Statement/description, info notes, Level/HLO hidden in No, 50-word limit) stay gated by `isCP2026()` and are unchanged. 2025 behavior is unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `contributors-phase-gating`: The "2026+ shows the redesigned section" requirement no longer treats the Submitter as absent. The Submitter field is now present in both the 2026 and the 2025 scenarios; only the rest of the redesigned UI (labels, info notes, Level/HLO visibility, word limit) remains phase-gated.

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html` — remove one `@if (!isCP2026())` wrapper.
- No backend, no API, no service changes. `isCP2026()` stays in use for the other redesign deltas.
- SDD baseline: UI behavior of the P25 Contributors & Partners section (`docs/system-design/design.md`). Module spec capability touched: `contributors-phase-gating` (introduced by the archived P2-3036 phase-year-gating change).
