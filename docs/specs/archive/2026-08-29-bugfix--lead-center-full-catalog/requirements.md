# Requirements — Lead Center Independent of Contributing Centers

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bugfix/lead-center-full-catalog` |
| Type | Bug |
| Depth | Lite |
| Owner | Santiago Sanchez |
| Status | draft |
| Ticket(s) | P25 |
| Proposal | `docs/specs/bugfix/lead-center-full-catalog/proposal.md` |

## 2. Context

Two surfaces in P25 (`result/result-detail/<id>/contributor-partners?phase=36` and the IPSR Contributors tab) share one state service, `RdContributorsAndPartnersService`. Its `setPossibleLeadCenters()` currently filters the full CLARISA centers catalog down to only the centers already present in Contributing CGIAR Centers (ToC + manual). When Contributing Centers is empty, the required Lead Center field has no options and the form cannot be saved. Root cause confirmed in `proposal.md` §3.

Touches: `docs/trd/trd.md` §"Results Framework Reporting" (`api/results-framework-reporting/` — contributors-partners workflow) and the shared `contributors-partners` section noted in `docs/ux-ui/design.md` ("Prefer shared sections over copy-paste forms").

## 3. In Scope / Out of Scope

### In scope
- Sourcing `possibleLeadCenters` from the full CLARISA centers catalog, independent of Contributing CGIAR Centers state, on both Result Detail and IPSR.
- Removing the stale "select a contributing center first" note in Result Detail.
- Regression test proving the empty-Contributing-Centers case populates Lead Center.

### Out of scope
- The `is_lead_by_partner` required/optional conditional (unchanged).
- How Contributing CGIAR Centers itself is populated, split (ToC vs Other), or validated.
- Any backend/API change (`GET_AllCLARISACenters()` already returns the full catalog).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can always pick a Lead Center, even with 0 Contributing Centers, and is no longer blocked from saving. |
| IPSR preparer | Same fix, same shared service — Lead Center dropdown always populated. |

## 5. User Stories

- **`LC-US-1`** — As a result submitter, I want the Lead Center dropdown to always show the full CGIAR centers catalog, so that I am never blocked from saving because Contributing Centers is empty.

## 6. Functional Requirements

### Required (MUST)

- **`LC-R-1`** The system MUST populate `possibleLeadCenters` from the full CLARISA centers catalog (`centersSE.centersList`), independent of `contributing_center` and `otherCentersSelected` state.
- **`LC-R-2`** The system MUST keep Lead Center's existing required conditional (`!partnersBody.is_lead_by_partner`) unchanged.
- **`LC-R-3`** The system MUST NOT clear an already-selected `leadCenterCode` when Contributing CGIAR Centers changes (add/remove), as long as the previously selected center is still a valid CGIAR center.
- **`LC-R-4`** The Result Detail template MUST remove the "Please select at least one contributing center to choose a lead center" note, since it no longer reflects reality.

### Should (SHOULD)

- **`LC-R-10`** The system SHOULD render the same Lead Center behavior identically on Result Detail and IPSR, since both consume the same shared service.

### Required (MUST) — added post-`LC-T-3`, resolving `LC-GAP-1` (see `design.md` §13)

- ~~`LC-R-11`~~, ~~`LC-R-12`~~, ~~`LC-R-13`~~ — **superseded by `LC-R-14`..`LC-R-17` below** (2026-08-29, after live browser testing on result 8952 surfaced a UI inconsistency the "only when empty" framing didn't anticipate — see `design.md` `LC-DD-5`). Kept struck through rather than deleted per the spec's correction-closure convention; `LC-T-1`'s original implementation of the "empty" case is unaffected in spirit, only generalized.

### Required (MUST) — `LC-DD-5` generalization (added 2026-08-29)

- **`LC-R-14`** When the user selects a Lead Center whose code is NOT already present in Contributing CGIAR Centers (the `contributing_center` ∪ `otherCentersSelected` union, ToC-derived or not) — regardless of whether that union is empty or already has ToC-derived entries — the system MUST automatically add that center to Contributing CGIAR Centers so the save payload persists the lead relationship (`results_center.is_leading_result`), closing `LC-GAP-1` for every reachable state, not only the fully-empty one.
- **`LC-R-15`** The target field for that auto-add depends on which Contributing Centers UI is actually rendered for this result: when the result is not on the CP2026 Contributors & Partners redesign, or is CP2026 but not mapped to a ToC node (`result_toc_result.planned_result === false`) — the "flat" single-dropdown UI is active — the system MUST add the center directly to `contributing_center`. Otherwise (CP2026 and ToC-mapped, whether or not the ToC node brought any reference centers) — the split ToC/Other(s) UI is active — the system MUST add the center to `otherCentersSelected` and ensure the "Other(s) CGIAR Centers" sentinel is present in `contributing_center` (checking that box) so the second dropdown is visible with the auto-added center already selected in it.
- **`LC-R-16`** If the user changes the Lead Center while the previously auto-added entry (per `LC-R-14`/`LC-R-15`) is still present, the system MUST remove ONLY that auto-added entry (never a ToC-derived or manually-added one) and add the newly-selected center in its place, following `LC-R-15`'s same target-field rule for the new selection. If the auto-added entry's removal also empties `otherCentersSelected` AND the "Other(s)" sentinel was itself added by this same auto-add mechanism (not by the user manually checking it), the system MUST also remove that sentinel — it must never leave a checked "Other(s)" box pointing at an empty second dropdown.
- **`LC-R-17`** When the selected Lead Center is already a Contributing Center (ToC-derived, manually added, or the currently auto-added one and unchanged), the system MUST NOT show, add, or remove anything — no second dropdown appears, no chip changes. This is the case the user described as "Lead Center prefilled from ToC — no other dropdown should appear."

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Existing saved results with a Lead Center already set MUST continue to show that value selected after the fix. |
| **Accessibility** | No change to existing labels/ARIA; dropdown remains a standard `app-pr-select` per `docs/ux-ui/design.md`. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `LC-AC-1` | A result with 0 ToC centers and 0 manually-added Contributing Centers | The user opens Contributors & Partners (Result Detail or IPSR) | The Lead Center dropdown shows the full CGIAR centers catalog and is selectable. |
| `LC-AC-2` | A result with a Lead Center already selected | The user adds or removes a Contributing Center | The previously selected Lead Center value remains selected (not cleared). |
| `LC-AC-3` | A result with 0 Contributing Centers and no Lead Center selected | The user attempts to save/submit | Save is blocked only by the missing required Lead Center value (not by an empty options list), and once a value is picked, save succeeds. |
| `LC-AC-4` | Result Detail Contributors & Partners screen with 0 Contributing Centers | The user views the Lead Center field | The stale "select a contributing center first" note is not shown. |
| ~~`LC-AC-5`~~ | ~~0 Contributing Centers~~ | ~~The user selects a Lead Center~~ | ~~superseded by `LC-AC-8`/`LC-AC-9` below~~ |
| ~~`LC-AC-6`~~ | ~~single auto-added entry~~ | ~~different Lead Center~~ | ~~superseded by `LC-AC-10`~~ |
| ~~`LC-AC-7`~~ | ~~2+ entries~~ | ~~Lead Center changes~~ | ~~superseded by `LC-AC-11`~~ |
| `LC-AC-8` | A result NOT on CP2026, or CP2026 but unmapped (`planned_result === false`), 0 Contributing Centers | The user selects a Lead Center | That center is added directly to `contributing_center` (the single flat dropdown) — no "Other(s)" sentinel, no second dropdown. |
| `LC-AC-9` | A CP2026, ToC-mapped result (whether or not the ToC brought reference centers), Lead Center picked is NOT already a Contributing Center | The user selects that Lead Center | The center is added to `otherCentersSelected`; the "Other(s) CGIAR Centers" checkbox becomes checked in the first dropdown; the second ("Other(s) Contributing CGIAR Centers") dropdown appears with that center already selected. |
| `LC-AC-10` | The previously auto-added entry (`LC-AC-8` or `LC-AC-9`) is still present, nothing else changed it | The user selects a DIFFERENT Lead Center | Only the auto-added entry is removed and replaced by the new one (per `LC-AC-8`/`LC-AC-9`'s same target-field rule) — any ToC-derived or manually-added centers are untouched. If removing it empties `otherCentersSelected` and the sentinel was auto-added, the sentinel is also removed. |
| `LC-AC-11` | The Lead Center picked is already a Contributing Center (ToC-derived, manual, or the current auto-added one, re-selected) | The user selects that Lead Center | Nothing changes in Contributing Centers — no dropdown appears/disappears, no chip added/removed. |

Cross-cutting project ACs that already apply:
- `AC-1` Typed result integrity.
- `AC-6` Evidence and ToC alignment at submit.

## 9. Dependencies & Assumptions

### Upstream dependencies
- `CentersService.getData()` / `GET_AllCLARISACenters()` (CLARISA) — already loaded independent of Contributing Centers state; no change needed.

### Downstream consumers
- None outside `rd-contributors-and-partners` and `ipsr-contributors` (both consume the same shared service).

### Assumptions
- No other consumer of `RdContributorsAndPartnersService.possibleLeadCenters` depends on the current filtered-subset behavior (confirmed by research in `proposal.md`).

## 10. Open Questions

- `LC-OQ-1` Does IPSR need an empty-state note for Lead Center (parity with Result Detail's old note), or does removing the filter make that state unreachable in practice? — Resolved in `design.md`: unreachable once sourced from the full catalog; no note needed.

## 11. Out-of-Band Notes

None.

## Defect Classes & Verification Coverage

| Defect class this bug fix could reintroduce | Caught by |
|---|---|
| Lead Center options still empty when Contributing Centers is empty | Regression test (Jest, client) — red before fix, green after (`LC-TEST-1`) |
| Selected Lead Center silently cleared when Contributing Centers changes | Unit test asserting `leadCenterCode` survives an add/remove cycle (`LC-TEST-2`) |
| Stale empty-state note still rendered in Result Detail | Component template test / snapshot assertion (`LC-TEST-3`) |
| A Lead Center chosen while Contributing Centers is empty silently fails to persist (`LC-GAP-1`) | Regression test (Jest, client) — red before `LC-T-4`, green after (`LC-TEST-9`) |
| Swapping Lead Center leaves two auto-added Contributing Centers instead of one | Unit test asserting the old auto-added entry is removed on swap (`LC-TEST-10`) |
| Auto-added center lands in the wrong field for the active UI (flat vs split), producing a duplicate-labeled field or a stray "Other(s)" chip with nothing behind it (found live on result 8952) | Unit tests per branch: flat/unmapped → `contributing_center` direct-add; CP2026+mapped → `otherCentersSelected` + sentinel (`LC-TEST-11`..`LC-TEST-14`) |
| Selecting an already-included Lead Center (ToC-derived) spuriously reveals the Other(s) dropdown | Negative test: no-op when code is already in the union (`LC-TEST-15`) |

All three classes have automated coverage — no manual/HITL substitute needed for this Lite bugfix.

## Required cross-references

- `docs/prd.md` — no specific `G`/`US`/`AC` id names this exact flow; general `AC-1` (typed result integrity) applies.
- `docs/ux-ui/design.md` — "shared sections" principle (contributors-partners section reused across Result Detail and IPSR).
- `docs/trd/trd.md` — "Results Framework Reporting" (`api/results-framework-reporting/`).
- `docs/specs/bugfix/lead-center-full-catalog/proposal.md` — confirmed root cause and diagnosis.
