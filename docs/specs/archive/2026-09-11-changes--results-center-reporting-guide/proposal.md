# Proposal — Results Center platform reporting guide (“Where to report”)

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `changes/results-center-reporting-guide` |
| **Slug** | `results-center-reporting-guide` — derived from free-text intent (platform-level W1/W2/W3/emerging guide on Results Center) |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | specified |
| **Author** | AKILI propose (2026-09-11) |
| **Depends on** | `changes/results-center-sp-layout` (hero/toolbar chrome — recommended ship order: layout first, then guide CTA) |
| **Parallel-safe** | yes (client-only; coordinate hero CTA slot with RC layout work) |
| **Ticket(s)** | TBD — confirm Jira if exists |

---

## Intent

Add a **platform-level “Where to report” guide** on **Results Center** that helps users understand **where** to enter results in PRMS — **W1/W2 (Science Program pooled funding)**, **W3 (Center bilateral projects)**, and **emerging results** — without requiring them to already be inside a specific SP shell.

Unlike the SP-scoped modal (`app-where-to-report-modal` + `ReportingEntryHubComponent`), this surface is **explanatory first** and **action second**: it orients users who land on Results Center (a cross-program catalog) and routes them to the correct reporting entry point based on **their roles and associations**.

---

## Problem / Current Behavior

| Area | Today | Gap |
|---|---|---|
| **Results Center** | Catalog + filters + export; hero has Update result + info popover about the page itself | **No guidance** on *how to start reporting* a new result from the platform level |
| **SP shell** | “Where to report” modal (`where-to-report-modal`) opens from program band; requires `programCode`; loads AoW rows + W3 projects **for that program** | Only available **in context of one SP**; users on RC never see it |
| **W3 empty state** | Hub shows `no-centers` + mailto **Request access** when user has no Center User role | Behavior exists but is **SP-scoped** — RC users never reach it |
| **W1/W2 without SP role** | In SP modal, Report buttons disabled + tooltip *“You do not have reporting rights on this program”* | No platform copy explaining **how to get SP access** when user has **zero** program associations |

**Code anchors:**

- SP modal: `dashboard-lab/components/where-to-report-modal/`
- Hub lanes + copy: `reporting-entry-hub/` (`hub-copy.ts`, `HUB_COPY`)
- User program list: `DataControlService.myInitiativesListReportingByPortfolio`, `GET_ScienceProgramsProgress` (`mySciencePrograms`)
- Center list: `rolesSE.getMyCenters()`
- W1/W2 rights gate: `EntityAowService.canReportResults()` (program-scoped; needs `entityId` primed)

---

## Proposed Outcome

A **“Where to report”** CTA on Results Center hero (alongside Update result) opens a **platform guide modal** that:

1. **Explains the three reporting paths** (W1/W2 · W3 · Emerging) in the same visual language as the SP modal (two-lane layout + emerging card).
2. **Adapts content to the signed-in user** via explicit persona branches (see below).
3. **Routes to action** when the user *can* report (deep-link into SP Reporting tab / bilateral flow / emerging modal); otherwise shows **clear empty states** with Request access / contact admin guidance.
4. Does **not** duplicate the full AoW/project picker for every SP at once — that remains SP-scoped; the platform guide **selects or links** into the right SP entry.

---

## Scope

### In scope

- Platform guide modal (or platform mode of existing hub) triggered from Results Center hero/toolbar.
- Copy and layout for W1/W2, W3, Emerging at **platform** level.
- **Persona matrix** (empty/partial/full access) with defined UX for each cell.
- Deep links: navigate to `entity-details/{SP}?…` + open SP Where to report or Report emerging where applicable.
- Reuse `hub-copy.ts` strings where possible; extend with platform-specific copy file.
- Unit tests for persona branching logic (service or container component).
- a11y: dialog, focus trap, Escape — match existing `WhereToReportModalComponent`.

### Non-goals

- Replacing the SP-scoped `WhereToReportModalComponent` inside program shells.
- New backend APIs (use existing `GET_ScienceProgramsProgress`, `GET_reportingEntryHubProjects`, role/initiative lists).
- Reporting a result **directly** from Results Center without navigating to SP/AoW/bilateral flows.
- i18n pass (English only, consistent with reporting hub).

---

## Affected Users, Systems, And Specs

| Persona | Need |
|---|---|
| **Result submitter with SP + Center roles** | Quick orientation + jump to their SP(s) or W3 projects |
| **Submitter with SP only (no center)** | W1/W2 + emerging actionable; W3 shows `no-centers` + Request access |
| **Center user without SP association** | W3 guidance if centers exist; W1/W2 explains SP membership requirement |
| **Read-only / no associations** | Guide-only mode — educational copy + Request access paths; no Report buttons |
| **Platform admin** | Sees all paths; may bypass some gates (existing admin patterns) |

| System | Touch |
|---|---|
| **Client** | `results-list.*`, new or extended guide component under `result-framework-reporting/` or `results/` shared |
| **Server** | none (existing endpoints) |
| **Related specs** | `changes/results-center-sp-layout`, shipped reporting-entry-hub behavior |

---

## Visual Reference

- **Source:** Existing SP modal (user screenshot + live `…/entity-details/SP01/results?tocView=aows`)
- **Location:** `where-to-report-modal.component.html` + `reporting-entry-hub.component.html`
- **Notes:** Platform variant keeps the same modal chrome (compass icon, title, subtitle, two-column lanes). RC-specific differences: optional **“Your programs”** strip when user has 1..N SP associations; collapsed W3 when no centers. No new Figma required for propose — reuse shipped hub as visual baseline. Optional Stitch mockup during `/akili-specify` if product wants a platform-specific wire.

---

## Requirement Delta Preview

### ADDED Requirements

- **RCG-R-1:** Results Center SHALL expose a **Where to report** entry point that opens a platform reporting guide modal.
- **RCG-R-2:** The guide SHALL explain W1/W2 (SP pooled), W3 (Center bilateral), and Emerging results using consistent terminology with the SP hub.
- **RCG-R-3:** The guide SHALL branch on user associations:
  - **SP access:** `myInitiativesListReportingByPortfolio.length > 0` OR admin.
  - **Center access:** `rolesSE.getMyCenters().length > 0`.
- **RCG-R-4:** When the user has **no Center role**, the W3 lane SHALL show the existing `no-centers` empty state (body + Request access mailto) — not a broken loader or empty accordion.
- **RCG-R-5:** When the user has **no SP association** (and is not admin), the W1/W2 lane SHALL show guide copy + **how to get access** (program admin / Request access pattern) — not disabled AoW rows for a program they cannot pick.
- **RCG-R-6:** When the user has **one or more SP associations**, the guide SHALL let them **pick a program** (or auto-select when exactly one) before showing SP-scoped W1/W2 rows or opening the existing SP modal inline.
- **RCG-R-7:** Emerging result explanation SHALL respect Avisa exclusion (`isAvisaInitiative`) same as SP modal.
- **RCG-R-8:** Action links SHALL deep-link into existing reporting flows (no duplicate create logic on RC).

### MODIFIED Requirements

- **RC hero actions:** Add Where to report CTA alongside Update result (complements `changes/results-center-sp-layout` hero/toolbar split).

### REMOVED Requirements

- None.

---

## Persona Matrix (draft — to confirm in specify)

| SP access | Center access | W1/W2 lane | W3 lane | Emerging |
|---|---|---|---|---|
| Yes (1+) | Yes | Pick SP → reuse hub AoW/program-level rows; Report enabled if `canReportResults` for selected SP | Load W3 for selected SP; center accordion | Enabled per SP rules |
| Yes | No | Same W1/W2 | **`no-centers`** empty + Request access | Per SP |
| No | Yes | **Guide-only** — explain SP membership; link to portfolio overview or mailto | Show centers **without** SP-scoped project mapping OR explain “select a program first” — **OQ-1** |
| No | No | Guide-only + access instructions | **`no-centers`** | Disabled + explain need SP context |
| Admin | any | Full hub for selected SP | Full W3 | Per existing rules |

---

## Approach Options

### Option A — Platform wrapper + program picker + reuse SP modal (recommended)

New thin `ResultsCenterReportingGuideComponent`:

- Step 1 (if needed): pick SP from `mySciencePrograms` / reporting portfolio list.
- Step 2: embed existing `app-where-to-report-modal` OR `ReportingEntryHubComponent` with `programCode` + preloaded data.

**Pros:** Maximum reuse; AoW/W3/emerging behavior stays identical to SP; lowest regression risk.  
**Cons:** Two-step when user has many SPs; platform-only users still see picker empty state.

### Option B — New `ReportingEntryHubComponent` `mode="platform"`

Extend hub with platform inputs: hide AoW fetch until SP selected; static explainer blocks when no SP.

**Pros:** Single component; unified copy surface.  
**Cons:** More conditional complexity inside an already large hub; higher test burden.

### Option C — Guide-only modal (no data fetch)

Static educational modal with links to Science Programs home / Request access — no hub embed.

**Pros:** Smallest build.  
**Cons:** Fails user expectation set by SP screenshot; no actionable Report rows.

---

## Recommended Approach

**Option A** — platform wrapper with persona-aware shell + reuse `WhereToReportModalComponent` / `ReportingEntryHubComponent` once `programCode` is known.

Implementation sketch:

1. **CTA** on RC hero: “Where to report” (same label/icon as SP band).
2. **`PlatformReportingGuideService`** (or signals on RC component) computes:
   - `hasSpAccess`, `hasCenterAccess`, `spChoices[]`, `singleSpCode`.
3. **Modal states:**
   - `guide-only` — no SP and not admin → three lanes with static copy + access links.
   - `pick-program` — multiple SPs → compact list, then transition to existing hub.
   - `hub` — delegate to existing modal with selected `programCode`.
4. **W3 without center:** pass through to hub `no-centers` — do not invent new copy.
5. **Deep link:** `router.navigate(['/result-framework-reporting/entity-details', code], { queryParams: { tocView: 'aows', whereToReport: 'true', returnTab: … }})` as fallback when full inline embed is too heavy in v1.

Estimated scope: **~250–400 LOC** client + tests; **Lite** specify depth.

---

## Risks, Dependencies, And Open Questions

| Risk / OQ | Notes |
|---|---|
| **OQ-1** | User has **Center role but no SP** — show W3 centers globally or only explain? Likely **guide copy + link to SP portfolio**; no SP-scoped project list without picking a program. |
| **OQ-2** | Should **admin** pick any SP from full catalog vs only “my” list? Recommend: admin gets program search in picker. |
| **OQ-3** | CTA placement: hero vs toolbar row — align with `results-center-sp-layout` (hero = Update result + Where to report; toolbar = Columns/Export). |
| **OQ-4** | Jira ticket / BA acceptance criteria — not provided. |
| **OQ-5** | `returnTab` when deep-linking from RC — new value `results-center` or omit (RC is outside SP shell). |
| **Dependency** | `EntityAowService` must be primed with `entityId` before `canReportResults()` is meaningful — same constraint as dashboard-lab. |
| **Kaizen** | Reuse `HUB_COPY` / `hub-copy.ts`; do not fork W3 empty-state strings. |

---

## Success Criteria

1. RC user can open **Where to report** and understand W1/W2 vs W3 vs Emerging without visiting an SP first.
2. User **without center** sees W3 **no-centers** state with Request access — never a confusing blank panel.
3. User **without SP association** sees explicit **access guidance** — not disabled Report buttons on empty AoW lists.
4. User **with SP access** can reach actionable reporting (picker → hub or deep link) in ≤2 clicks.
5. SP-scoped modal behavior unchanged when opened from program band.
6. Scoped Jest coverage for persona branches; no full-suite requirement.

---

## Next Step

After approval:

```text
/akili-specify changes/results-center-reporting-guide
```

Use **standard** depth if Option A wrapper + reuse; **Lite** only if product accepts guide-only v1 (Option C) — not recommended given user reference screenshot.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
