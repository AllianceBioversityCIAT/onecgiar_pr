# Requirements — Notifications filter toolbar: one dropdown per facet

## 1. Module / Feature

- **Module:** `notifications`
- **Sub-feature:** `filter-toolbar-dropdowns`
- **Owner:** Santiago Sanchez (client)
- **Status:** `approved` (2026-10-05)
- **Depth:** Standard (UI restructure of one page; no server, API or data change)
- **Ticket(s):** —
- **Visual reference:** screenshot supplied in the `/akili-quick` request on 2026-10-05 (toolbar row `Search · Type · Funding · Result type · Program / Accelerator · Center · Bilateral project`, Bilateral project dropdown open with a "Search projects" box and checkbox list). Recorded in §11.
- **Origin:** escalated from `/akili-quick` (failed the triviality gate: behavior change, ~60 references across 5 files).

## 2. Context

**Answer first:** the Notifications page swaps its single **Filter** button (one popover holding every facet) for a row of **one dropdown button per facet**, so users see every filter dimension at a glance and open only the one they need. Filtering logic, facet options, chips and "Clear all" stay exactly as they are today.

- **Today** (`results-notifications.component.html` L52–234): one `Filter` trigger opens a hand-rolled popover (`filterPopoverOpen` signal + `document:click` / `document:keydown.escape` host listeners + a manual left/right alignment calculation). Inside are seven stacked sections: Phase, Program (`entityLabel`), Center, Bilateral project, Type, Funding and Result type.
- **Target:** a toolbar row `Search · Phase · Type · Funding · Result type · Program / Accelerator · Center · Bilateral project`, each facet in its own anchored dropdown.
- **Phase is kept (user decision, 2026-10-05).** The image does not show it, but the phase list carries both **Reporting and IPSR** phases and it scopes the Program list, so removing it would lose function. It becomes its own dropdown at the start of the facet row.
- Touches `docs/ux-ui/design.md` Notifications inbox screen (toolbar + chips) and the client-only `notifications` page module from `docs/trd/trd.md` (§ client modules). No endpoint or entity changes.
- PRD: refines the notification inbox goals carried by the `notifications/inbox-revamp` spec (NOTIF-R-8 toolbar, NOTIF-R-16 Type/Funding/Result-type facets). Cross-cutting `AC-8` (notifications) still applies.

## 3. In Scope / Out of Scope

### In scope

- One trigger button + anchored dropdown per facet: Phase, Type, Funding, Result type, Program / Accelerator, Center, Bilateral project.
- Per-button selected-count indicator.
- At most one dropdown open at a time; outside-click and Escape close it.
- Search box inside the dropdowns whose option list is open-ended (Center, Bilateral project, Result type, Program / Accelerator).
- Search-box placeholder copy update to match the reference ("Search result, person or code").

### Out of scope

- Any change to **what** a facet filters (predicates in `ResultsNotificationsService` stay as-is).
- Server, API, payload or data changes.
- The active-filter chip row, "Clear all", "Mark all as read", "Notification settings", tabs, list, pagination — unchanged except where they read state this spec renames.
- Making Program / Accelerator multi-select (user decision: stays single-select).
- URL/query-param persistence of facet selections beyond what exists today (`init`, `phase`, `search`).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter / SP contributor (inbox user) | Sees every filter dimension as a labelled button; opens one facet at a time; sees how many values each facet has selected without opening it |
| QA / PMU / admin | Same as above — they use the same inbox |
| Bilateral consumer | None |

## 5. User Stories

- **FTD-US-1** — As an inbox user, I want each filter dimension as its own labelled dropdown, so that I can see which dimensions exist and jump straight to the one I need.
- **FTD-US-2** — As an inbox user, I want each dropdown to show how many values I picked, so that I know which filters are active without opening them.

Refines `notifications/inbox-revamp` NOTIF-R-8 / NOTIF-R-16.

## 6. Functional Requirements

### Required (MUST)

#### FTD-R-1 — One trigger per facet, in a fixed order

The toolbar MUST render, after the search input, exactly these facet triggers in this order: **Phase · Type · Funding · Result type · Program / Accelerator · Center · Bilateral project**. Each trigger shows its label and a chevron. The single **Filter** trigger MUST no longer render.

##### Scenario FTD-R-1.S1: toolbar on the inbox route

- GIVEN the user is on `/result/results-outlet/results-notifications`
- WHEN the page renders
- THEN seven facet triggers appear after the search input in the order above
- BUT it must NOT render the legacy `Filter` button
- AND IT MUST NOT render any facet trigger on the `…/results-notifications/settings` route

#### FTD-R-2 — Each trigger opens its own anchored dropdown

Activating a trigger MUST open a dropdown anchored below that trigger that holds **only** that facet's controls.

##### Scenario FTD-R-2.S1: open one facet

- GIVEN no dropdown is open
- WHEN the user activates the `Center` trigger
- THEN a dropdown anchored to `Center` opens with the center search box and the center checkbox list
- AND the trigger reports `aria-expanded="true"`
- BUT it must NOT contain any other facet's controls

##### Scenario FTD-R-2.S2: dropdown stays in the viewport

- GIVEN the `Bilateral project` trigger is the right-most control in the row
- WHEN its dropdown opens
- THEN the whole dropdown is visible inside the viewport (no horizontal page scroll)

#### FTD-R-3 — At most one dropdown open

##### Scenario FTD-R-3.S1: switching facets

- GIVEN the `Type` dropdown is open
- WHEN the user activates the `Funding` trigger
- THEN `Type` closes and `Funding` opens
- AND IT MUST leave exactly one dropdown open

##### Scenario FTD-R-3.S2: toggling the same trigger

- GIVEN the `Type` dropdown is open
- WHEN the user activates the `Type` trigger again
- THEN no dropdown is open

#### FTD-R-4 — Dismissal

##### Scenario FTD-R-4.S1: outside click

- GIVEN a dropdown is open
- WHEN the user clicks outside both the dropdown and its trigger
- THEN the dropdown closes
- BUT clicking a checkbox, option or the search box **inside** the dropdown must NOT close it

##### Scenario FTD-R-4.S2: Escape

- GIVEN a dropdown is open
- WHEN the user presses `Escape`
- THEN the dropdown closes and keyboard focus returns to its trigger

#### FTD-R-5 — Facet behavior is preserved

Selecting or clearing values inside a dropdown MUST update the same filter state and produce the same filtered list, chips and active-filter count as today.

| Facet | Control inside the dropdown | Selection |
|---|---|---|
| Phase | Option list (Reporting + IPSR phases, `phase_name_status`) | single |
| Type | Checkbox list | multi |
| Funding | Checkbox list | multi |
| Result type | Search box + checkbox list | multi |
| Program / Accelerator | Search box + option list | single |
| Center | Search box + checkbox list | multi |
| Bilateral project | Search box + checkbox list | multi |

##### Scenario FTD-R-5.S1: multi-select facet

- GIVEN bilateral rows exist with project `1042`
- WHEN the user checks `1042` in the `Bilateral project` dropdown
- THEN only rows tagged `1042` remain, a `1042` chip appears and the active-filter count rises by 1
- AND the dropdown stays open so more values can be checked

##### Scenario FTD-R-5.S2: Program depends on Phase

- GIVEN no phase is selected
- WHEN the user opens `Program / Accelerator`
- THEN the dropdown shows the hint "Select a phase first" and no selectable options
- AND after a phase is chosen in `Phase`, `Program / Accelerator` lists that phase's programs (same `onPhaseChange` behavior as today)

##### Scenario FTD-R-5.S3: single-select facets close on pick

- GIVEN the `Phase` (or `Program / Accelerator`) dropdown is open
- WHEN the user picks an option
- THEN the selection applies and the dropdown closes
- AND in `Program / Accelerator`, picking the already-selected option again clears it
- BUT `Phase` must NOT be clearable — re-picking the selected phase is a no-op and must NOT reload the inbox (a phase change reloads every loaded row, as today)

##### Scenario FTD-R-5.S4: search inside a dropdown

- GIVEN the `Center` dropdown lists `CIAT`, `CIMMYT`, `IRRI`
- WHEN the user types `cim`
- THEN only `CIMMYT` is listed
- AND when nothing matches, "Nothing matches that search." is shown
- AND when the facet has no options at all, its existing "No … available yet." empty message is shown

#### FTD-R-6 — Per-trigger active indicator

A multi-select or Program trigger whose facet has at least one selected value MUST show that count as a badge, and MUST look active (selected style) compared with an empty trigger. The `Phase` trigger, which always holds a phase once the inbox has loaded, MUST instead show the selected phase name (truncated) and no count badge.

##### Scenario FTD-R-6.S1: count on trigger

- GIVEN two centers are checked
- WHEN the toolbar renders
- THEN the `Center` trigger shows a `2` badge
- AND triggers with nothing selected show no badge
- AND removing a chip or using "Clear all" updates the badge immediately

#### FTD-R-7 — Chips and Clear all unchanged

The chip row and **Clear all** MUST keep today's behavior (Program, Center, Bilateral project, Type, Funding, Result type chips; Clear all also resets Phase).

### Should (SHOULD)

- **FTD-R-10** The facet row SHOULD wrap onto a second line on narrow viewports instead of causing horizontal page scroll.
- **FTD-R-11** The search input placeholder SHOULD read "Search result, person or code" (matches the reference; the search predicate already covers result, person and code).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | Each trigger is a `<button>` with `aria-haspopup` + `aria-expanded`; dropdown has an accessible name equal to the facet label; keyboard: Tab to trigger, Enter/Space opens, Escape closes and restores focus; visible focus ring `--pr-focus-ring` (`docs/ux-ui/design.md` §10) |
| Design system | Spartan/Helm primitives only (popover, checkbox, input, badge); tokens via `var(--pr-*)`; no new hex; px type sizes (client `CLAUDE.md` §5 rule 20) |
| i18n | Every new label/placeholder lives in `CONTRIBUTION_REQUEST_DRAWER_COPY.filterToolbar` |
| Performance | No new HTTP requests; opening a dropdown must not re-derive facet options more than today |
| Backwards compatibility | Query params `init` / `phase` / `search` keep working |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| FTD-AC-1 | Inbox route | Page renders | 7 facet triggers in order, no `Filter` button (R-1) |
| FTD-AC-2 | Settings route | Page renders | No facet trigger (R-1) |
| FTD-AC-3 | No dropdown open | Activate `Center` | Only Center controls are shown; `aria-expanded="true"` (R-2) |
| FTD-AC-4 | `Type` open | Activate `Funding` | Exactly one dropdown open: Funding (R-3) |
| FTD-AC-5 | A dropdown open | Click inside on a checkbox, then outside | Stays open, then closes (R-4) |
| FTD-AC-6 | A dropdown open | Press Escape | Closes, focus on its trigger (R-4) |
| FTD-AC-7 | Bilateral rows | Check a project | List, chip, count update as today (R-5) |
| FTD-AC-8 | No phase | Open Program | "Select a phase first" hint; after phase pick, programs listed (R-5) |
| FTD-AC-9 | Phase / Program open | Pick option | Applies and closes; Program re-pick clears; Phase re-pick is a no-op with no reload (R-5) |
| FTD-AC-10 | 2 centers checked, phase P25 set | Render | `Center` badge `2`; other facets no badge; `Phase` trigger shows the phase name; Clear all → no badges (R-6, R-7) |
| FTD-AC-11 | Desktop 1280 px and 768 px | Open right-most dropdown | Fully in viewport; row wraps at 768 px (R-2.S2, R-10) — **manual/visual** |

## 8A. Defect classes and the gate for each

| Defect class | Caught by | Gap? |
|---|---|---|
| Wrong triggers / order / legacy button still present | Jest DOM test on the component | — |
| Facet state wired to the wrong service field (count, chips, list wrong) | Jest unit tests on the component (existing suite ported) | — |
| More than one dropdown open / toggle wrong | Jest test on the open-facet state | — |
| Outside-click / Escape / focus restore broken | Jest test — **only for the state transitions**. The real CDK overlay dismissal and focus restore depend on the browser | Partial: verified **in a real browser** at the HITL pause |
| Dropdown off-screen / misaligned / overlaps / row doesn't wrap | **No automated check** (jsdom has no layout) | Substitute: manual browser check at 1280 px and 768 px against the reference image (T6 visual review at `/akili-validate`) |
| Visual mismatch with the reference (spacing, chevrons, badge style) | **No automated check** | Same manual/T6 visual check |
| Hard-coded strings | Reviewer grep over the template diff | — |
| Lint / type / template errors | `npx eslint <touched files> --quiet` + `npm run build` (templates are not type-checked by `tsc`) | — |

## 9. Dependencies & Assumptions

- **Upstream:** `ResultsNotificationsService` filter fields (`phaseFilter`, `initiativeIdFilter`, `centerIdsFilter`, `bilateralProjectIdsFilter`, `typeFilter`, `fundingFilter`, `resultTypeFilter`, `searchFilter`) and `onPhaseChange` — consumed unchanged.
- **Spartan popover** (`@spartan/popover`) is generated and already used in `dashboard-lab/program-overview`.
- **Assumption FTD-A-1:** Phase goes **first** in the facet row (before Type). The user chose to keep Phase; placement was not stated.
- **Assumption FTD-A-2:** Program / Accelerator's trigger label is the static "Program / Accelerator" (the image's label), not the dynamic `entityLabel`.

## 10. Open Questions

- **FTD-OQ-1** (non-blocking, defaulted by FTD-A-1): is "Phase first" the right placement? Default: yes.

## 11. Out-of-Band Notes

- Supersedes the single-popover toolbar shape from `notifications/inbox-revamp` (NOTIF-T-6 Pivot re-scope). The NOTIF filter predicates are not touched.
- Visual reference stored only in this conversation (image not committed). The T6/manual check compares against the description in §1.

## Required cross-references

- `docs/prd.md` — `AC-8`; inbox goals refined via `docs/specs/notifications/inbox-revamp/`.
- `docs/ux-ui/design.md` — §7 tokens, §8 components, §10 a11y; Notifications inbox screen.
- `docs/trd/trd.md` — client `pages/results/.../results-notifications` module.
