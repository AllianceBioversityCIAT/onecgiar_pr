# Requirements — Bilateral External Partners Not Saving (Lite / Bug)

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `section-contributors` (External partners field)
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** approved
- **Ticket(s):** none (ad-hoc user report, 2026-09-21)
- **Depth:** Lite (Bug Mode)

## 2. Context

In the bilateral result creator, Section 3 "Partners & partnerships" (`section-contributors.component.ts`), a center user can select an external partner (e.g. FAO) in the multi-select, see it visually checked, and still have the section refuse to save with "Still missing: External partners." Confirmed root cause (see `proposal.md` § Bug Diagnosis, sharpened below): `loadCenters()` has no failure path — if `CentersService.getData()` exhausts its retries and rejects, the `.catch(() => {})` swallows it, `centersReady()` never becomes `true`, the `hydrateWhenReady` effect never runs, `partnersHydrated()` never becomes `true`, and `buildContributorsPayload()` permanently omits the `institutions` key from every PATCH — with **no visible error** to the user.

Touches `docs/ux-ui/design.md`'s existing error/retry pattern (already used for the sibling partners-GET failure in the same component) and `docs/trd/trd.md`'s bilateral result creator flow (W3). No API/DTO contract change.

## 3. In Scope / Out of Scope

### In scope
- Give `loadCenters()` an explicit failure path that surfaces a visible, actionable error state (mirroring the existing `partnersLoadFailed` → Retry banner already in this component) instead of leaving the section silently stuck.
- Regression test proving the bug (red before fix, green after).

### Out of scope
- Any change to `CentersService` itself (shared, app-wide; out of blast radius for this fix — see proposal Option C, rejected).
- Any change to `partnersHydrated`'s data-loss-prevention gating (must stay).
- `rd-contributors-and-partners` (classic P22/P25 flow) — not reported as affected.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center user (bilateral result submitter) | When the centers catalogue fails to load, sees a clear error + Retry instead of an unexplained, permanently-stuck "External partners" validation error. |

## 5. User Stories

- **`BIL-US-1`** — As a center user filling the bilateral Partners & partnerships section, I want to be told when the page failed to load required catalogue data, so that I can retry instead of being stuck with no explanation.

## 6. Functional Requirements

### Required (MUST)

- **`BIL-R-1`** WHEN `CentersService.getData()` (invoked from `loadCenters()`) rejects, the system MUST surface a visible error state on the contributors section (same `app-alert-status status="error"` + Retry pattern already used for the partners-GET failure) instead of leaving the section silently incomplete.
- **`BIL-R-2`** The Retry action MUST re-attempt `loadCenters()` and, on success, allow the normal hydration chain (`centersReady` → `hydrateWhenReady` → `partnersHydrated`) to proceed exactly as it does today.
- **`BIL-R-3`** WHEN the centers catalogue loads successfully (happy path, unchanged), external partner selection and Save draft MUST continue to work exactly as before — no regression to the working case.

#### Scenario: Centers catalogue fails to load

- GIVEN a bilateral result open in Editing state
- AND `CentersService.getData()` rejects after exhausting its internal retries (e.g. backend outage)
- WHEN the Partners & partnerships section renders
- THEN the section shows a visible error with a Retry action
- AND the "External partners" field is NOT silently reported as an unexplained missing field with no way to recover
- BUT it must NOT send a PATCH with an empty `institutions: []` that could wipe previously-saved partners (existing `partnersHydrated` guard stays intact)

#### Scenario: Centers catalogue loads successfully (regression guard)

- GIVEN a bilateral result open in Editing state
- AND the centers catalogue loads successfully
- WHEN the user selects an external partner and clicks Save draft
- THEN the PATCH includes the `institutions` key with the selected partner
- AND IT MUST match today's existing passing behavior (no new failure introduced)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No change to `SaveBilateralContributorsDto` or any API contract. Additive UI-only change. |
| **Observability** | The new error state must be visually distinguishable (reuse existing `app-alert-status`), no new console logging of secrets. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-AC-1` | Centers catalogue load fails (all retries exhausted) | Section 3 renders | A visible error banner with Retry appears; selecting a partner still does not silently pass validation without the underlying data being persistable. |
| `BIL-AC-2` | Centers catalogue load fails, then user clicks Retry, then it succeeds | User selects an external partner and clicks Save draft | The section saves successfully (PATCH includes `institutions`). |
| `BIL-AC-3` | Centers catalogue loads successfully on first try (today's happy path) | User selects an external partner and clicks Save draft | Behaves identically to current passing behavior (no regression). |

## 9. Dependencies & Assumptions

### Upstream dependencies
- `CentersService` (`shared/services/global/centers.service.ts`) — read-only dependency, not modified.

### Downstream consumers
- None (UI-only change local to `section-contributors`).

### Assumptions
- `CentersService`'s existing retry (2 attempts, 600ms) is sufficient for transient blips; this fix only handles the case where all attempts are exhausted.

## 10. Open Questions

None outstanding — the root cause is confirmed by code trace (see `design.md` § Root Cause Confirmation) and does not require a live-session repro to proceed to implementation.

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — general submission-workflow goals (no specific `AC-*` overridden; this is a defect fix, not new product scope).
- `docs/ux-ui/design.md` — reuses the existing error/retry visual pattern already present in this component; no new pattern introduced.
- `docs/trd/trd.md` — bilateral result creator (W3) flow, `section-contributors` sub-component.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md` — documents the `partnersHydrated` invariant this fix must not violate.
