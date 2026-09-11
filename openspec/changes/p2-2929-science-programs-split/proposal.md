## Why

P2-2929 (Contributing Science Program/Accelerator behaviour from ToC). 2026 redesign: split the field into "from ToC" + "Other(s)", same shape as Centers (P2-2998). Confirmed with Juan David (Slack 2026-06-24): the front applies NO precedence logic (the backend resolves the 4 KPI/HLO scenarios); the front just unions the resolved ids across selected nodes. Visual layer only; the real contribution-request (pending) happens on Save and is DEFERRED.

## ⚠️ STATUS: IN PROGRESS — blocked on backend mapping

`contributing_synergy_program_initiative_ids` currently arrives **empty** from the control list for the test data — Juan David needs a backend mapping fix so the synergy program ids actually come through. Until then the UI correctly shows the "no Science Programs" note, but the populated split (dropdown + Other) cannot be exercised end-to-end. Front is ready; waiting on backend.

## What Changes

In `rd-contributors-and-partners` (P25), gated by `isCP2026()`:

1. **Info note** (Excel row): "The Programs/Accelerators listed below were identified in your 2026 ToC. To select a different… choose 'Other'…".
2. **Dropdown 1 "Contributing Science Program/Accelerator"**: only the SP whose `id` is in the union of `contributing_synergy_program_initiative_ids` across ALL selected nodes/tabs → cross `/clarisa/initiatives` (GET_AllInitiatives) by `id`. Preselected; "Other(s) Science Program(s)" item at the end.
3. **Dropdown 2 "Other(s) Science Program(s)"**: the remaining (non-ToC) SP, shown when "Other(s)" is picked.
4. **No-SP note**: when the ToC brings no synergy programs → show "No Science Programs related to the established HLO/Outcomes were found" and NO dropdown / Other.
5. The legacy contributing-initiatives dropdown (accepted/pending/new + sharing) is shown only for non-2026.

Same union plumbing as Centers: `multiple-wps-content` feeds `tocReferenceSynergyInitiativeIds` (union across tabs) to the shared service.

### Deferred (NOT in this change)
- SAVE / pending contribution request: per Juan David, selecting an SP should create a pending contribution request, done on Save. NOT wired yet — the split binds to temporary arrays (`scienceSelected` / `otherScienceSelected`), the existing save is untouched.
- Backend mapping so `contributing_synergy_program_initiative_ids` is populated (Juan David).

## Capabilities

### New Capabilities
- `toc-contributors-science`: visual split of Contributing Science Program/Accelerator (from ToC + Other), 2026-gated, with the no-SP note. Save/pending deferred.

## Impact

- Files: rd-contributors-and-partners.service.ts (scienceSelected / otherScienceSelected / tocReferenceSynergyInitiativeIds), multiple-wps-content.component.ts (union effect), rd-contributors-and-partners.component.ts (computeds + methods + GET_AllInitiatives load), rd-contributors-and-partners.component.html (split + no-SP note, legacy gated to non-2026).
- No backend/save change from the front. Risk: medium (touches a shared section) — mitigated by isCP2026() gating.
