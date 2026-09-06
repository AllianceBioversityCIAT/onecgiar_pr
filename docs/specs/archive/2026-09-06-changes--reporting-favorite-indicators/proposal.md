# Proposal — Favorite Indicators & Focus View on the Reporting Tab

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-favorite-indicators` |
| Short Prefix | `RFI` |
| Request Type | Change (feature) |
| Slug | `reporting-favorite-indicators` — derived from the free-text brief "Capa 2: Personalización por Usuario (Focus Mode & Favorites)" |
| Approval Mode | `pre-approved` — explicit user mandate "YOLO MODE - Dale hasta que dejes todo listo usando AKILI" (j.cadavid, 2026-09-05) |
| Depth | Standard |
| Author | AKILI T1 (Claude Code session, 2026-09-05) |
| Related in-flight spec | `changes/reporting-hierarchical-search-filters` (RHSF) — Phase 1; this spec is the **Phase 2** it explicitly deferred |
| Branch / worktree | `feat/reporting-favorite-indicators` at `~/Development/worktrees/onecgiar_pr/reporting-favorites` (RHSF is being executed concurrently in the `qa-development-2026` checkout — see §11) |

---

## 1. Intent

Let a reporter shrink the Reporting tab of a Science Program to *their* indicators. A typical user reports against 2–3 Areas of Work and 4–5 indicators; today every visit shows the whole programme catalogue (e.g. SP01: 367 indicators across 5 AoWs plus Intermediate / 2030 cards).

## 2. Problem / Current Behavior

- The Reporting tab (`dashboard-lab`, `showPlanned()`) has five filters (search, Section, Type, Category, Status) plus *Only pending* and the Catalogue / Remaining-work sort. None of them is *personal*: they describe the data, not the user.
- There is no way to mark an indicator as "mine" and come back to it; the user re-finds it by search or by scrolling every visit.
- RHSF (Phase 1) adds hierarchical search, result-type chips and navigation-state preservation. Its `proposal.md` §4 and `requirements.md` §2 list *"Phase 2 — User Personalization (pinned / favorite indicators, My Focus View)"* as out of scope.

## 3. Proposed Outcome

1. **Pin (★) any indicator row** in the grouped cards and the *All indicators* flat table. The star is a toggle, isolated from the row click, and persists per user and per programme across reloads.
2. **Favorites focus switch** in the Reporting toolbar, next to *Only pending*: `★ Favorites (N)`. When on, only pinned indicators are listed; cards with no pinned rows disappear; AoW header ratios keep counting the full set (same rule *Only pending* follows).
3. Favorites compose with every existing filter (AND), count as an active filter for *Clear filters* (which switches the focus off but never deletes pins), and show a dedicated empty state when the list is empty.

## 4. Scope

### In scope
- Client only: `dashboard-lab` host, `reporting-aow-table`, `reporting-program-band`, one new `ReportingFavoritesService`.
- Persistence in `localStorage`, keyed by the signed-in user id and the programme code.
- Unit tests (Jest) in **new** spec files (to stay merge-friendly with RHSF, which is appending to the existing ones).

### Out of scope
- **Result-type quick filter (KP / Innovation / Policy)** — already delivered by RHSF-T-3 in Phase 1. Not duplicated here.
- Backend-persisted preferences (cross-device sync). The store is abstracted so a server swap is a one-class change (RFI-DD-2).
- Stars inside the *By AOW* focused view rows (`plannedBrowseView() === 'byAow'`) and inside the indicator drawer.
- Favorite Areas of Work, keyboard shortcuts, URL parameter for the focus switch (RHSF-T-5 owns the URL sync effect; adding a key there now would collide).

## 5. Non-Goals
- No change to the header ratio rule (`buildRatio` / `ratioOf`), to *Only pending*, to the sort, or to the RHSF surfaces.
- No new SCSS class blocks — Tailwind-first per `docs/ux-ui/design.md` §7 rule 1 (only the existing grid track variables are widened).

## 6. Affected Users, Systems, And Specs
- Personas: Result submitter (primary), PMU lead (secondary — focus on the indicators they oversee).
- Code: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/**`.
- Specs: builds on `changes/mass-reporting-flow` (Only-pending pipeline), `changes/reporting-hierarchical-search-filters` (concurrent).

## 7. Visual Reference
- Source: None (text mockup in the user brief: `[ ⭐ Mis Favoritos (4) ] [ Todos los AoW (254) ]`, star per row). Reference screenshot of the current Reporting tab (SP01, 2026-09-05) informs placement: the switch sits in the toolbar row between *Only pending* and the Catalogue / Remaining-work tablist; the star sits in the row action cell before *Copy link*.
- Brand: 2026 design line (`docs/ux-ui/design.md` §7) — material-icons-round `star` / `star_outline`, violet accent for the active state.

## 8. Requirement Delta Preview

### ADDED
- Per-row favorite toggle with persistence.
- Favorites-only focus switch with live count and empty state.
- Sixth "active filter" on the Reporting tab (`reportingFiltersActive`, `clearReportingFilters`).

### MODIFIED
- `reporting-aow-table` contract: two new inputs, two new outputs; action column track widened.
- `reporting-program-band` contract: two new inputs, one new output.
- `dashboard-lab.reportingGroupsForTable` pipeline: favorites filter applied **after** the burndown step.

### REMOVED
- None.

## 9. Approach Options

- **A — localStorage store + host-owned wiring (recommended).** New root service holds `Record<programCode, favoriteKey[]>` per user in `localStorage`; the table stays presentation-only (inputs/outputs), the host composes the filter. Smallest safe path; ships without server or VPN dependency; the RHSF team's files are touched only in small, non-overlapping hunks.
- **B — Backend user-preferences endpoint.** Cross-device, but needs migration + entity + controller + client API service, and local verification needs the VPN-backed MySQL. Deferred to a follow-up; the store interface in A is designed for it.
- **C — Table-owned favorites (service injected in the table).** Fewer host bindings, but breaks the documented "presentación pura — no inyecta ningún servicio" contract of `reporting-aow-table` and makes the header ratio / Only-pending interplay harder to test. Rejected.

## 10. Recommended Approach
Option A. Four tasks, ~300 LOC production + ~350 LOC tests, one Reviewer round each.

## 11. Risks, Dependencies, And Open Questions
- **Concurrency with RHSF.** RHSF-T-2..T-5 edit the same three components in the `qa-development-2026` checkout right now. Mitigation: this spec runs in its own worktree/branch, adds tests in new spec files, and touches the shared templates only in the action cell / toolbar row / bindings. Merge into `qa-development-2026` happens after RHSF commits (expect small, mechanical conflicts in `dashboard-lab.component.html` bindings at most).
- **Row identity.** `indicator_id` repeats across AoWs and across programmes; the favorite key must include centre and AoW code and be scoped by programme (RFI-R-3.2).
- **Grid width.** The grouped action track is 108px, the flat one 150/176/190px; a 26–28px star + 6px gap needs +32px. Verified by DOM assertions on class presence plus a Cypress CT layout check is *not* in budget — recorded as a visual HITL check at merge time (tasks.md §5).
- `RFI-OQ-1` Should the focus switch be remembered across sessions (like *Only pending*, `sessionStorage`)? **Resolved:** yes, same mechanism (`sessionStorage`, `pr.reporting.favoritesOnly`), because a user who pins and focuses expects the tab to reopen focused within the same session; pins themselves are `localStorage` (durable).

## 12. Success Criteria
- A pinned indicator survives a full reload and is absent from every other programme.
- With the switch on, the table lists exactly the pinned rows, header ratios are unchanged, and *Clear filters* turns the switch off without unpinning.
- All four task suites green; `npx ng lint --quiet` clean for the touched files.

## 13. Next Step
```
/akili-specify changes/reporting-favorite-indicators
```
