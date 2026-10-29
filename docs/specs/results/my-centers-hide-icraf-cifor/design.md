# Module Spec — `design.md`

## 1. Document Control

- **Module / feature:** `results` / `my-centers-hide-icraf-cifor`
- **Depth:** Lite · **Status:** `draft`
- **Linked:** `requirements.md` (MYC-R-1..3) · [P2-3852](https://cgiarmel.atlassian.net/browse/P2-3852)

## 2. Executive Summary

The fix is one filter inside the home component's `myCentersList` computed signal. A constant keyed by phase year names which center acronyms to hide. The roles service, backend and DB are untouched.

## 3. Architecture Overview

```
RolesService.getMyCenters()  ──(unchanged, still used for access)──▶ api.service.ts:297
        │
        ▼
ResultFrameworkReportingHomeComponent.myCentersList  (computed)
   reads: reportingPhaseVersion() + reportingCurrentPhase.phaseYear
   drops: centers whose acronym ∈ HIDDEN_CENTERS_BY_PHASE_YEAR[phaseYear]
        │
        ▼
template: badge = myCentersList().length · @for cards
```

## 4. Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/result-framework-reporting-home.component.ts` | Add constant + filter in `myCentersList` |
| `…/result-framework-reporting-home.component.spec.ts` | Add `dataControlSE` to the ApiService stub; add 2026 / 2025 / null cases |
| `…/result-framework-reporting-home.component.html` | **No change.** It already reads `myCentersList()` for both badge and grid |

## 5–7. Data Model / API / Backend

None. Client only.

## 8. Frontend Component Architecture

- **Constant:** `HIDDEN_CENTERS_BY_PHASE_YEAR`, a module-level map from phase year to an upper-cased acronym list. Seed: `2026 → ['ICRAF', 'CIFOR']`. It sits next to the component with a P2-3852 comment.
- **Filter:** `myCentersList` first reads `api.dataControlSE.reportingPhaseVersion()`, so it recomputes once phases load (same pattern as `phaseLabel`). It also reads the public `rolesSE.rolesVersion` getter (`roles.service.ts:70`) so it recomputes once roles arrive. Today's computed does not read it; adding that read is the minimum needed for the filtered list to stay reactive. It looks up the hidden list for `reportingCurrentPhase.phaseYear`. With no entry, or with `phaseYear` still `null`, it returns the original list. Otherwise it drops every center whose `center_acronym` (trimmed, upper-cased) is in the list.
- **Ordering:** the remaining centers keep their original order.

## 9. Shared Contracts

None changed. `RolesService.getMyCenters()` and `validateCenterAccess()` stay as they are (MYC-R-3).

## 10. Design Decisions

| DD | Decision | Why / rejected alternative |
|---|---|---|
| DD-1 | Filter in the component, not in `RolesService` | `getMyCenters()` drives access in `api.service.ts:297`. Filtering there would break AC5 |
| DD-2 | Match by `center_acronym`, not `center_id` | The acronym is the human-visible identifier the ticket names. The CLARISA `code` values are not known without a DB lookup. **Risk:** the real acronym may differ (e.g. `CIFOR-ICRAF`). Accepted, with QA on TEST as the substitute check (requirements §7) |
| DD-3 | Keyed by phase year in a client constant | Fastest delivery, and AC4 falls out naturally. Rejected for now: a DB/CLARISA per-phase visibility flag, which is cleaner but needs a migration and endpoint, out of Lite scope. Revisit if the list changes each cycle |
| DD-4 | Phase not loaded (`null`) → show all | Avoids flashing a filtered state on an unknown phase. Meets MYC-R-2 |

**Reversion challenge (Step 2.3):** not applicable. This adds a filter and removes no delivered behavior.

## 11. Budget (tripwire for `/akili-execute`)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 1 | ~15 prod + ~35 test | 1 |

The budget matches the Lite depth.
