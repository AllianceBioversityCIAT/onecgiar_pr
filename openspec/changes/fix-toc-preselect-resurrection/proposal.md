## Why

In the 2026 Contributors & Partners section, ToC-derived Science Programs and CGIAR Centers are auto-prefilled into their dropdowns when the selection is empty. If a user deliberately removes those prefilled items and saves, the backend correctly persists the empty selection — but on page reload the frontend prefill runs again and **re-adds the removed items** (a "resurrection"). This makes deliberate deletions impossible to keep for ToC-sourced Science Programs and Centers.

Confirmed live in prtest (P2-3115) on result 8575: delete all ToC Science Programs → Save → backend `contributing_initiatives` is empty → after F5 the UI shows SP01/SP03/SP12 again while the database stays empty. The backend fix (auto-cancel/omission) is already in place; the remaining defect is purely frontend.

## What Changes

- The ToC prefill (preselect) for Contributing Science Programs and Contributing CGIAR Centers MUST NOT repopulate a selection that the user has deliberately emptied and saved — the emptied state MUST survive a full page reload (F5).
- Prefill MUST remain the behavior only for a section that has **never been saved** (genuine first-time prefill), so newly created results still get their ToC-derived Science Programs and Centers.
- The fix applies identically to **Science Programs** (`preselectScienceEffect`) and **Centers** (`preselectCentersEffect`).
- 2026-only. The 2025 legacy path (the non-`isCP2026()` branch) MUST remain byte-for-byte untouched.
- Investigate whether the `GET /v2/api/contributors-partners/:id` payload can expose a "section was saved" signal to distinguish "saved empty on purpose" from "never touched"; if no backend signal is available, implement a frontend-only mechanism. (Open question raised with backend owner.)

## Capabilities

### New Capabilities
- `toc-contributors-deletion-persistence`: A deliberate, saved removal of ToC-derived Contributing Science Programs and Contributing CGIAR Centers in the 2026 Contributors & Partners section persists across reload and is never resurrected by the ToC prefill; prefill applies only to sections never saved before.

### Modified Capabilities
<!-- No requirement changes to existing specs. `toc-centers-reactive-preload` (reactive recompute on HLO/KPI selection) stays as-is; this change governs the separate on-empty prefill/resurrection behavior. -->

## Impact

- **Frontend only** (`onecgiar-pr-client`), branch `P2-2928-TOC-Improvements`.
- `rd-contributors-and-partners.component.ts`: `preselectScienceEffect` (~line 215), `preselectCentersEffect` (~line 145), and the `userTouchedScience` / `userTouchedCenters` gating.
- Possibly `rd-contributors-and-partners.service.ts` (`applyTocMappingOnLoad`) and the section GET/interface if a "saved" signal is threaded from the payload.
- No change to the 2025 legacy branch. No change to backend contracts unless the team opts to add a "section saved" signal (tracked as an open question).
