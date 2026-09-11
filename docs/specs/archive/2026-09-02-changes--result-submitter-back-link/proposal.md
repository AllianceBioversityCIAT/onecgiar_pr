# Proposal — Show the submitter SP on Result Detail and make it the way back

After reporting from an indicator, the result form has no Science Program on the header and **Back to results** dumps the user on the global list. Put the submitter SP in the identity strip and make it a link to that program’s reporting home.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-submitter-back-link` |
| Slug | `result-submitter-back-link` — derived from free-text argument (Result Detail header + submitter + click-to-return) |
| Type | Change |
| Approval Mode | gated |
| Depth (if specified) | Standard |
| Ticket | none (not provided) |
| Depends on | none |
| Parallel-safe | yes — header chrome only; no create-navigation query, no migration, no API contract |
| Parent Spec | — |
| Baseline | `US-S1` (`docs/prd.md`); Result Detail + Result Framework Reporting (`docs/ux-ui/design.md` §4–§5); `W1` (`docs/trd/trd.md`) |
| Related specs | `docs/specs/archive/2026-08-29-changes--reporting-entry-hub/`; Kaizen `KZ-changes--kp-report-modal-auto-create-1` (name the live surface by the click path) |

## Intent

A submitter who creates or opens a result from an indicator (By AOW / Reporting) must still **see which Science Program they are reporting under** and **get back there in one click**, without hunting the sidebar or landing on the Results Center list.

## Problem / Current Behavior

1. The redesigned Result Detail header (`app-result-header`) shows **Back to results** → `/result/results-outlet/results-list`, then title, then identity: code · category · level · funding · status. There is **no submitter / SP**.
2. The payload already has it. `dataControlSE.currentResult` carries `initiative_official_code` and `initiative_name` (the header spec fixture uses `SP04` / `Multifunctional Landscapes`). The ⓘ popover lists Center / Phase / Portfolio / Origin / Created by — **Origin is `Coming soon`**, and none of those rows is the SP.
3. The live create path from Image 3 is `onReportingRowReport` → aside `LabReportFormComponent` → on success `router.navigate` to `/result/result-detail/:code/general-information?phase=` only. No return URL, no AOW, no program in query. Same pattern on the legacy AOW create modal.
4. The previous header (Image 2) already labeled **Submitter: SP09 - Scaling for Impact**. The `pageOpen` mockup dropped that chip and did not replace it.

So after Report the user knows the result title and type, but not **which program they just reported into**, and the only chrome back-link is the wrong destination.

## Proposed Outcome

On Result Detail, the identity strip includes a **Submitter** value formatted like the legacy chip (`{official_code} - {short or full name}`). The control is a link. Clicking it opens that Science Program’s reporting home (`/result-framework-reporting/entity-details/{official_code}`). **Back to results** stays as the exit to the Results Center list.

Users who opened Result Detail from the results list still get a useful SP identity + a jump into that program. Users who arrived from Report get a one-click return to the program they were working in.

## Scope

- Result Detail header identity strip (`result-header.component.{html,ts,spec.ts}`).
- Submitter label + value from `currentResult` (`initiative_official_code` + `initiative_name` / short name already on the object).
- Click → SP entity-details route (same destination a program card already uses).
- Hide or degrade the control when there is no official code (do not invent a name).
- Keyboard and hover affordance consistent with **Back to results** (primary color, not a new chip system unless specify picks the Image 2 outline style).

## Non-Goals

- Restoring the full six-chip legacy metadata row.
- Filling ⓘ **Origin / Center / Created by** (`Coming soon`).
- Replacing or removing **Back to results**.
- Browser `history.back()` as the only return (breaks deep links and refresh).
- Returning to the exact AOW / indicator / scroll position (Option C — later if needed).
- Changing create payloads, server APIs, or Tawk / action strip.
- Bilateral / W3 “submitter is a Center” labeling (this slice is the primary SP on a W1/W2 result). Flagged as an open question.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Result submitter (AoW lead / PI) | Sees SP on the form; one click back to the program after Report |
| QA reviewer | Same chrome when they open Result Detail |
| `app-result-header` | New identity item + `routerLink` |
| `LabReportFormComponent` / AOW create modal | No change in Option A (destination is derived from the result, not the referrer) |
| Results list / Result Creator | Unchanged entry; new header still valid |

## Visual Reference

- Source: User screenshots (no Figma)
- Location: `docs/specs/changes/result-submitter-back-link/visual/`
- Notes:

| File | Role |
|---|---|
| `current-header-no-submitter.jpg` | Today: Back to results + identity without SP |
| `legacy-submitter-chip.jpg` | Target copy/data: **Submitter: SP09 - Scaling for Impact** (old chip chrome; restyle to the current strip) |
| `report-from-indicator.jpg` | Journey: Report on By AOW / Market Intelligence → result form loses that context |

## Requirement Delta Preview

### ADDED Requirements

- Identity strip shows the primary submitter Science Program when `initiative_official_code` is present.
- That value is a link to `/result-framework-reporting/entity-details/{official_code}`.
- Accessible name includes “Submitter” so the control is not a bare code.

### MODIFIED Requirements

- Result Detail header identity (code · category · level · funding · status) gains one more item. **Back to results** is unchanged.

### REMOVED Requirements

- None. The mockup’s omission of Submitter is what this change corrects.

## Approach Options

| | A — Submitter link to SP home (recommended) | B — Swap “Back to results” for contextual back | C — Exact return URL (AOW + view) |
|---|---|---|---|
| What | Add labeled Submitter in the strip; click → `entity-details/{code}` | Change the top link to “Back to {SP}” / last reporting URL | Pass `from` / `aow` / `tocView` on every Report navigation; header reads it |
| Pros | Data already on the result; works on refresh and shared links; smallest surface | Matches “devolverse” as the primary back | Lands on the same AOW / By AOW list they left |
| Cons | Lands on program home, not the exact indicator row | Two mental models for “back”; list users lose Results Center | Touches every create/open path; stale query if bookmarked; Kaizen: must trace every click |

## Recommended Approach

**Option A.** The user named the control **Submitter** and said the value **is the SP** and should be clickable. The result already owns that identity. Linking to the program home is the same contract as an SP card on Reporting Home — no new session state.

Keep **Back to results**. That is the Results Center exit; Submitter is “where this result belongs.” Mixing them (Option B) hides the list from anyone who arrived from Report and still needs it.

Option C is the right follow-up **if** HITL shows program home is not enough (lost AOW / filters). Do not take it in this slice: `KZ-changes--kp-report-modal-auto-create-1` already burned a pivot by targeting the wrong create surface; enumerating every Report entry for a return query is the same class of risk.

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| RSBL-OQ-1 | Confirm click destination: program home (A) vs exact AOW (C). Proposal assumes A. |
| RSBL-OQ-2 | W3/Bilateral results: is Submitter still the primary SP, or the Center? Image 2 is an SP. |
| RSBL-OQ-3 | Jira ticket? None attached. |
| RSBL-OQ-4 | Visual: inline text like today’s category/level, or outlined chip like Image 2? Recommend inline + link style of **Back to results** so the strip does not grow a second chip language. |
| Risk | Header wrap at 900px (same squeeze band as recent overview work). Specify must include an `md` check. |
| Risk | SGP-02 / hyphen variants (`SGP-02` vs `SGP02`) on the entity-details route — reuse the existing code, do not invent a third spelling. |
| Lesson | Cite `KZ-changes--kp-report-modal-auto-create-1`: live surface is `result-header` after `LabReportFormComponent.createResult` navigate, not the aside itself. |

## Success Criteria

- On a result with `initiative_official_code` (e.g. SP04), the header shows **Submitter** and `SP04 - {name}` without opening ⓘ.
- Click (and Enter) opens `/result-framework-reporting/entity-details/SP04`.
- **Back to results** still goes to the results list.
- Report from an indicator → land on Result Detail → Submitter is visible and the click returns to that SP.
- Deep link / refresh still shows Submitter (not referrer-only).
- No submitter code → no broken link.
- Scoped Jest on `result-header.component.spec` covers render + `routerLink`.

## Next Step

```text
/akili-specify changes/result-submitter-back-link
```
