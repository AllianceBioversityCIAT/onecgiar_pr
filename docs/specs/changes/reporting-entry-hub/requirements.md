# Module Spec — Reporting Entry Hub — Requirements

> Depth: **Standard**. Approval Mode: **pre-approved** (inherited from `proposal.md` Document Control). Phase gates below are logged as `auto-approved (pre-approved mode)`.

## 1. Module / Feature

- **Module:** `results` (client `pages/result-framework-reporting/pages/dashboard-lab`), server `api/results-framework-reporting`
- **Sub-feature:** `reporting-entry-hub` (spec path `changes/reporting-entry-hub`)
- **Owner:** PRMS engineering (j.cadavid@cgiar.org)
- **Status:** `approved` — auto-approved (pre-approved mode), 2026-08-28
- **Ticket(s):** none yet
- **Proposal:** `docs/specs/changes/reporting-entry-hub/proposal.md` (Type: Change, Variant A chosen)

---

## 2. Context

PRMS has two reporting paths that never meet on screen. **W1/W2** results are program-scoped and reported from the program's **Reporting** tab, grouped by Area of Work (`app-reporting-aow-table`). **W3 / bilateral** results are center-scoped and reported from `/bilateral/:acronym/home` → **Create result**, gated by the Center User role (`validationCenterPermissions`). The Science Program **Overview** (`/result-framework-reporting/entity-details/:code/overview`) already displays both volumes (KPI cards "W1/W2 Results" and "W3 / Bilateral") but neither card leads anywhere a result can be created; the program → center → project bridge exists in data (`clarisa_project_mappings.allocation`) and has no UI in the program context.

This spec adds a **"Where to report" hub** as the first block of the Overview body: a W1/W2 lane (per AoW + program-level outcomes, deep-linking into the Reporting tab) and a W3 lane (the user's centers × their bilateral projects that allocate budget to this program, with a Create result action). It touches `docs/ux-ui/design.md` flow F1 (create a result) and screen "Result Framework Reporting"; server module `api/results-framework-reporting` (`docs/trd/trd.md` §2 module table) and read-only use of `clarisa_projects` / `clarisa_project_mappings` / `role_by_user`.

PRD links: **G1** (submission completeness — M1.2 median time to first submission), **US-S1** (create a typed result), **US-P1** (phase-aware dashboard), **AC-3** (authorization enforced server-side), **AC-5** (phase scoping).

---

## 3. In Scope / Out of Scope

### In scope

- Hub block on the program Overview with two lanes (W1/W2, W3) and a collapse control whose state persists per user.
- W1/W2 lane: one row per Area of Work with progress and a **Report** action that opens the Reporting tab positioned on that AoW group; a "Program-level" sub-list with Intermediate outcomes and 2030 outcomes rows.
- W3 lane: per-center collapsible groups with `N of M projects fund <SP>` counts; a search box over the user's matching projects; a 3-row slice per expanded center; `Show all N`; **Create result** per project opening the bilateral creator for that center with the project preselected.
- Empty / degraded states: no SP reporting rights, no center role, center with zero projects on this SP, endpoint error.
- New read endpoint returning the user's centers and their projects allocating to a program code (active reporting phase).
- KPI cards "W3 / Bilateral" and "Contributing Centers" additionally scroll/focus the hub's W3 lane.
- Fix of the AoW deep link (`onOpenAow()` ignores the AoW code) so it navigates to `?tocView=byAow&tocAow=<code>`.
- Inline **Report** action on the existing "Progress by area of work" rows (borrowed from Variant B).

### Out of scope

- Renaming the `Overview / Reporting / Results` tabs (OQ-1 → **decided: keep names**; revisit after usage data).
- Changing what "Report emerging result" does in either context (OQ-2 → **decided: unchanged**; the W1/W2 lane footer points at it).
- Changes to the bilateral result creator form, MDS sections, or the emerging-result modal internals.
- Permission model changes (`auth/center-user` owns the Center User role).
- Building the reserved per-center dashboards (`/result-framework-reporting/centers`, `/center/:centerCode/report`).
- Any change to `/api/bilateral/*` public payloads (AC-4) or to `GET api/bilateral/center/projects`.
- Portfolio-level (cross-program) hub.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter — AoW lead / PI (W1/W2) | From Overview, one click into the Reporting tab positioned on their AoW. |
| Result submitter — Center focal point (Center User, W3) | Sees which of their center's projects fund this program and starts a bilateral result from the program page. |
| Mixed user (both roles) | Both paths side by side; the split W1/W2 vs W3 is explicit. |
| PMU / SP Leader | Read-only map of who reports what; collapse persists so the dashboard stays primary. |
| Platform admin | No change (admin sees the hub with all rights). |
| Bilateral consumer (downstream) | No change — no payload touched. |

---

## 5. User Stories

- **`REH-US-1`** — As a W1/W2 submitter, I want the Overview to show my Areas of Work with a Report action, so that I land on the right AoW group without browsing the whole Reporting tab. (Refines US-S1, US-P1)
- **`REH-US-2`** — As a Center User, I want the Overview of a program to list my centers' projects that fund it, so that I can create a W3 result for the right project without leaving the program context. (Refines US-S1)
- **`REH-US-3`** — As any user without a center role, I want the W3 lane to tell me why I cannot report W3 and how to get access, so that I do not assume the feature is broken. (Refines US-S1)
- **`REH-US-4`** — As an SP Leader, I want the hub to stay collapsed once I collapse it, so that the dashboard remains the first thing I see. (Refines US-P1)

---

## 6. Functional Requirements

### Required (MUST)

- **`REH-R-1`** The Overview MUST render a hub block titled "Where to report" as the first section of the Overview body (above "About this program"), containing exactly two lanes: **W1/W2 · Pooled funding** and **W3 · Bilateral projects**.
- **`REH-R-2`** The W1/W2 lane MUST list one row per Area of Work of the selected program **and phase**, each showing code, name, done/total KPIs, a progress bar and a **Report** action.
  - **`REH-R-2.1`** Below the AoW rows the lane MUST show a "Program-level · cross-cutting" group with the rows **Intermediate outcomes** and **2030 outcomes** that the page already computes (`overviewXcutProgress()`, which drops rows with `total = 0`); when neither row exists the group MUST show one line "No program-level targets planned for this phase." (They are program-level, not nested under any AoW — see `docs/specs/results/intermediate-outcome-aow-visibility/family.md`.) Row kind is derived from the row code: `INTERMEDIATE_OUTCOMES_CODE` → `intermediate`, `OUTCOMES_2030_CODE` → `2030`.
  - **`REH-R-2.2`** Activating **Report** on an AoW row MUST navigate to `…/entity-details/<code>?tocView=byAow&tocAow=<AoW code>` — the Reporting tab's existing "By AOW" browse view, which restores `tocAow` from the URL and shows that AoW's indicators.
  - **`REH-R-2.3`** Activating **Report** on a program-level row MUST navigate to `…/entity-details/<code>?tocView=aows` (the grouped view). No expansion or scrolling is promised: the grouped table's top-level cards start collapsed and expose no per-group expansion lever (accepted gap, `design.md` §13).
- **`REH-R-3`** The W3 lane MUST show, for the current program code (active reporting phase), the signed-in user's centers (from their Center User role assignments) as collapsible groups, each headed by the center name and `N of M projects fund <SP code>` where `N` = projects with an allocation to this program and `M` = the center's active projects in the active reporting year.
  - **`REH-R-3.1`** The first center with `N > 0` MUST render expanded by default; the others collapsed. A center with `N = 0` MUST render as a non-expandable row with the text "0 of M projects fund <SP> · Open center home" linking to `/bilateral/<acronym>/home`.
  - **`REH-R-3.2`** An expanded center MUST show at most **3** project rows (sorted by numeric allocation to this program descending, then by `shortName` — the project code — ascending) and a `Show all N` action when `N > 3`; `Show all` MUST reveal the remaining rows inside the lane (no navigation) and MUST be reversible (`Show less`).
  - **`REH-R-3.3`** Each project row MUST show the project code (`shortName`, e.g. `B-A1368`), its `fullName`, a chip `<SP code> <allocation>%` for this program and a **Create result** action.
  - **`REH-R-3.4`** The lane MUST provide a search input filtering project rows across **all** the user's centers by code or name (case-insensitive substring); while a query is active every center with a match renders expanded showing only matching rows, and the lane header counter shows `matches / total matching projects across all centers`.
  - **`REH-R-3.5`** Activating **Create result** MUST open the bilateral creator for that project's center (`/bilateral/<acronym>/create`) with the project preselected in the creator's project field.
  - **`REH-R-3.6`** The lane header MUST show the totals `<sum N> projects · <centers with N>0> centers`.
- **`REH-R-4`** Degraded and empty states:
  - **`REH-R-4.1`** When the user has **no** center assignment, the W3 lane MUST render an explanatory empty state ("W3 results are reported by CGIAR Centers. You are not assigned to a center yet.") with a **Request access** link (mailto `PRMSTechSupport@cgiar.org`, subject prefilled) — the lane MUST NOT be hidden.
  - **`REH-R-4.2`** When the user has centers but **none** funds this program, the lane MUST show every center as a `0 of M` row (REH-R-3.1) plus the sentence "None of your centers has a project allocated to <SP code> in <phase>."
  - **`REH-R-4.3`** When the user cannot report W1/W2 on this program (`canReportResults()` false), the W1/W2 lane MUST keep the rows visible, replace the **Report** actions with a disabled state carrying the tooltip "You do not have reporting rights on this program", and show one line "Ask your program admin to add you to <SP code>."
  - **`REH-R-4.4`** If the W3 endpoint fails, the W3 lane MUST show "Could not load your center projects." with a **Retry** action; the W1/W2 lane and the rest of the Overview MUST keep rendering.
  - **`REH-R-4.6`** When one center's project lookup fails server-side, the response MUST still include that center with `error: true, total: 0, matching: 0`, and the lane MUST render it as "Could not load projects for <center>" while the other centers render normally.
  - **`REH-R-4.5`** While loading, each lane MUST show a skeleton of 3 rows; the hub MUST NOT shift layout when data arrives beyond the skeleton height.
- **`REH-R-5`** The hub MUST offer a **Collapse / Expand** control; the collapsed state (a one-line summary "W1/W2 · 5 AoWs · W3 · 61 projects across 2 centers") MUST persist per user in `localStorage` and MUST be restored on the next visit to any program Overview.
- **`REH-R-6`** The hub MUST react to the phase selector: changing the phase MUST recompute the W1/W2 lane for the new `versionId` without a second phase picker (`docs/ux-ui/design.md` DD-7). The W3 lane lists bilateral projects of the **active reporting phase** (the only phase in which bilateral results can be created — same rule as `/bilateral/:acronym/home`); when the selected phase is not the active one, the lane MUST show the note "Bilateral projects are listed for the active reporting phase (<year>)."
- **`REH-R-7`** The KPI cards **W3 / Bilateral** and **Contributing Centers** MUST, in addition to their existing section filter, scroll the hub's W3 lane into view and move focus to its heading.
- **`REH-R-8`** The existing "Progress by area of work" rows MUST expose an inline **Report** button that emits the row's existing `openAow` output (same destination as the row click — REH-R-2.2 / REH-R-10); the button exists as an explicit affordance and carries the disabled state of REH-R-4.3, which the bare row click does not.
- **`REH-R-9`** The server MUST expose a JWT-protected read endpoint returning, for the signed-in user, their centers with the bilateral projects that allocate to a given program code in the active reporting phase (see `design.md` §4), returning `[]` centers when the user has no Center User role and never returning projects of centers the user is not assigned to. A roles result lacking the center columns (the repository's legacy fallback query) MUST be treated as a lookup error (HTTP 500 → REH-R-4.4), never as "no centers".
  - **`REH-R-9.1`** The response MUST be capped at 300 projects in total; when the cap is hit the response MUST carry `truncated: true` and the client MUST show "Showing the first 300 projects — refine your search" in the W3 lane.
- **`REH-R-10`** Bug fix: `onOpenAow(code)` in `DashboardLabComponent` MUST route by code — an AoW code present in the program's `aows()` navigates to `tocView=byAow&tocAow=<code>`; any other code (`'xcut'`, the Intermediate/2030 codes emitted by the cross-cutting rows and the ToC-map click) navigates to `tocView=aows` (today every caller lands on `tocView=aows` and the code is dropped). REH-R-2.2 / REH-R-2.3 reuse it.

### Should (SHOULD)

- **`REH-R-11`** Project rows SHOULD list "recently used" projects first within the same allocation tier, using the last project the user created a bilateral result for (client-side, `localStorage`), falling back to allocation order.
- **`REH-R-12`** The hub SHOULD default to **collapsed** for users whose roles contain no reporting right on this program and no center (pure viewers), and expanded otherwise.

### Could / Nice-to-have (MAY)

- **`REH-R-13`** The collapsed summary MAY show a "Continue where you left off" link to the last project used.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | New endpoint p95 ≤ 1 s for a user with ≤ 10 centers and ≤ 300 matching projects (QAS-3 class). Overview initial render MUST NOT add a blocking request: the W3 call is issued after first paint and the W1/W2 lane reuses `aowStats`/`aowProgress` already computed on the page (no new call). |
| **Payload** | Response ≤ 200 KB at the 300-project cap (`summary`/`description` trimmed to 200 chars — harmless: the creator renders only `fullName`/`shortName`/`leadCenter`). |
| **Security** | JWT via `JwtMiddleware`; center membership resolved **server-side** from `role_by_user` (role 9, `active > 0`) — the client never sends center ids (AC-3). No secrets in logs (AC-9). |
| **Phase correctness** | W1/W2 lane follows the selected `versionId`; W3 projects follow the active reporting year (`clarisa_projects.phase = active year`, `is_active`) — the phase in which bilateral creation is open (AC-5). |
| **Backwards compatibility** | Additive: no existing endpoint or payload changes; `GET api/bilateral/center/projects` untouched (AC-4 not applicable but respected). |
| **Accessibility** | Lanes are `region`s with headings; center groups are disclosure buttons (`aria-expanded`, `aria-controls`); Report / Create result are real `<button>`/`<a>` elements reachable by keyboard with visible focus (`--pr-color-primary-300`); search input labelled; state changes (expand, Show all, results count) announced via an `aria-live="polite"` region. WCAG 2.1 AA contrast on all new text (`docs/ux-ui/design.md` §10). |
| **Icon family** | Hub icons use the `@ng-icons/lucide` set the redesigned band already uses (`reporting-program-band`), declared with the component's own `provideIcons`; accepted deviation from `docs/ux-ui/design.md` §7 (`material-icons-round`) consistent with the surrounding dashboard-lab components. |
| **Internationalization** | Existing `dashboard-lab` templates use literal English; this spec follows the same convention (recorded as an accepted deviation from DD-9, consistent with the rest of the redesign) and keeps every string in one `hub-copy.ts` constant map so a later i18n pass is a single edit. |
| **Responsive** | ≥ 1280 px two lanes side by side; 900–1279 px lanes stacked; < 900 px lanes stacked and the progress bars hidden (numbers stay). |
| **Observability** | Server logs `reporting_entry_hub.projects` with `{userId, programCode, centers, projects, truncated, failedCenters, ms}`; no names/emails. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `REH-AC-1` | A user with W1/W2 rights on SP02 opens the Overview | The page renders | The hub is the first section; the W1/W2 lane lists 5 AoW rows + Intermediate + 2030 rows with the same done/total values as "Progress by area of work". |
| `REH-AC-2` | The hub is rendered | The user clicks **Report** on `AOW03` | URL becomes `…/entity-details/SP02?tocView=byAow&tocAow=AOW03`; the Reporting tab opens in "By AOW" view on `AOW03`. **BUT** navigation from a program-level row (or any non-AoW code such as `'xcut'`) uses `tocView=aows` and no `tocAow`. |
| `REH-AC-3` | A user assigned to Alliance (198 projects, 44 funding SP02) and AfricaRice (17 funding SP02) | The W3 lane loads | Alliance renders expanded with exactly 3 rows and `Show all 44`; AfricaRice renders collapsed with `17 of 52 projects fund SP02`; header reads `61 projects · 2 centers`. **AND IT MUST** show projects sorted by allocation desc. |
| `REH-AC-4` | REH-AC-3 state | The user types `1368` in the search | Only rows whose code or name contains `1368` remain, across all centers; centers with a match render expanded, centers without a match keep their prior expand state (REH-R-3.4); counter shows `1 / 61`. **BUT** clearing the search restores the 3-row slices and collapse states. |
| `REH-AC-5` | REH-AC-3 state | The user clicks **Create result** on `B-A1368` | The app navigates to `/bilateral/<Alliance acronym>/create` and the creator's project field shows `B-A1368` preselected. |
| `REH-AC-6` | A user with no Center User assignment | The Overview renders | The W3 lane shows the "not assigned to a center" empty state with a **Request access** mailto link. **BUT** the lane is not hidden and the W1/W2 lane is unaffected. |
| `REH-AC-7` | A user with centers, none funding SP02 | The W3 lane loads | Every center renders as `0 of M projects fund SP02 · Open center home` plus the "None of your centers…" sentence. |
| `REH-AC-8` | A user without reporting rights on SP02 (not in `myInitiativesList`, not admin) | The Overview renders | W1/W2 rows render with **Report** disabled and the tooltip "You do not have reporting rights on this program". |
| `REH-AC-9` | The W3 endpoint returns 500 | The lane loads | The lane shows "Could not load your center projects." + **Retry**; Retry re-issues the call; the rest of the Overview is intact. |
| `REH-AC-10` | The hub is expanded | The user clicks **Collapse**, reloads, opens SP05 Overview | The hub renders collapsed with the one-line summary on both pages. |
| `REH-AC-11` | Hub loaded for phase 2026 (active) | The user switches the phase selector to 2025 | The W1/W2 lane recomputes with 2025 data; the W3 lane keeps the active-phase projects and shows the active-phase note; a single phase selector exists on the page. |
| `REH-AC-12` | Server: user U assigned to centers C1 (code 10) and C2; C3 also has projects on SP02 | `GET …/reporting-entry-hub/projects?programId=SP02` | Response contains C1 and C2 only, with their SP02-allocated projects and `N`/`M`; C3 is absent. **BUT** a user with no role 9 rows gets `centers: []`, HTTP 200. |
| `REH-AC-13` | Server: a user whose matching projects exceed 300 | Same call | Response has 300 projects and `truncated: true`; client shows the "first 300" notice. |
| `REH-AC-14` | Any state | Keyboard-only navigation | Every Report / Create result / Show all / center group control is reachable with Tab, activates with Enter/Space, and expansion changes are announced. |
| `REH-AC-15` | Overview | The user clicks the **W3 / Bilateral** KPI card | The section filter applies as today **AND** the W3 lane scrolls into view with focus on its heading. |

Cross-cutting project ACs that apply without restating: `AC-3`, `AC-5`, `AC-9`.

### Defect classes and the gate that catches each

| Defect class this spec can produce | Gate |
|---|---|
| Wrong center scoping (projects of a center the user is not in) | Server unit test on the repository/service with an in-memory fixture (REH-AC-12) — fails if the SQL drops the `role_by_user` join. |
| Wrong `N`/`M` counts, wrong sort, cap not applied | Server unit test with a fixture whose allocations are **strings** where lexical and numeric order differ (`'100'`, `'40'`, `'9'` — `clarisa_project_mappings.allocation` is `decimal(5,2)` → string) and a cap-override test (REH-AC-13). |
| Center id mismatch (`role_by_user.center_id` CLARISA code vs `clarisa_projects.organization_code` institution id) | Server unit test asserting the join goes through `clarisa_center.code → institutionId`; fixture uses **string** ids to catch the bigint-as-string class (`KZ-OPF-1`). |
| Deep link drops the AoW code / wrong view | Client unit test on `onOpenAow` (asserts `tocView: 'byAow'` and `tocAow: code` in the navigation extras) — fails on today's code, which sends `tocView: 'aows'` and no `tocAow`. |
| Empty/error/no-rights states not rendered or wrong copy | Client unit tests with mocked `RolesService` / API (REH-AC-6/7/8/9). |
| Collapse state not persisted | Client unit test with a `localStorage` stub (REH-AC-10). |
| Visual regressions (spacing, contrast, truncation, responsive stacking) | **No automated gate** (jsdom cannot measure layout/contrast). Substitute: one manual browser check at the end of execution on the QA URL, recorded in `execution.md` with a screenshot; contrast is guaranteed by reusing existing token pairs only (no new color pairs). Accepted residual risk: sub-900 px layout. |
| Keyboard/a11y announcements | Client unit test asserts `aria-expanded` toggles and the live region text changes; **focus-visible styling** is not measurable in jsdom — covered by the same manual check. |
| Endpoint latency | Not measured automatically (no perf harness). Accepted risk; mitigated by the single-query design and the 300 cap. If a manual timing is taken, three runs varying by more than 2× are not evidence — report the spread. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `auth` — `RoleByUserRepository` center assignments (role 9). `docs/specs/auth/center-user` is in progress: the hub degrades to REH-R-4.1 while assignments are absent.
- `clarisa` — `clarisa_projects`, `clarisa_project_mappings`, `clarisa_center` cache tables (CLARISA sync unchanged).
- `versioning` — `versionId` / phase from the existing phase selector.
- Client: `RolesService.getMyCenters()`, `EntityAowService.canReportResults()`, `ReportingAowTableComponent`, `BilateralProjectsPanelComponent.selectAndCreate()` mechanism for project preselection.

### Downstream consumers

- None (read-only endpoint consumed only by the Overview).

### Assumptions

- A center's project list changes at most daily (CLARISA sync); no realtime refresh needed.
- `clarisa_project_mappings.program_code` matches the program `code` shown in the Overview (`SP02`), as the archived `bilateral-projects/by-program` work already relies on.
- The bilateral creator can receive a preselected project through the same client mechanism `BilateralProjectsPanelComponent.selectAndCreate()` uses (verified in `design.md` §6.2; if it turns out to be session-only state, a `?projectId=` query param is added there — still in scope).

---

## 10. Open Questions

All resolved before `design.md` (pre-approved mode decisions recorded here):

- `REH-OQ-1` Tab renaming → **No** (out of scope).
- `REH-OQ-2` "Report emerging result" behaviour → **Unchanged**.
- `REH-OQ-3` W3 granularity → centers as groups, 3-row slices, search (REH-R-3).
- `REH-OQ-4` Project preselection → yes, via existing client mechanism, query param fallback (Assumptions).
- `REH-OQ-5` W3 lane visibility without a center → always visible with empty state (REH-R-4.1).
- `REH-OQ-6` Paging → all matching projects in one call, hard cap 300 + `truncated` flag (REH-R-9.1).

---

## 11. Out-of-Band Notes

- Neighbouring in-flight spec `auth/center-user` (AUTH-T-11/12) adds server gates for bilateral creation; this spec only reads assignments and does not touch those guards.
- Archived `reporting/bilateral-centers-overview` owns the "Centers with reported W3 results" card — untouched here.
- Kaizen lessons applied: `KZ-OPF-1` (bigint-as-string fixtures), `target-tooltip-1` (verify component claims against source before asserting them — done for `pr-tooltip`, `ReportingAowTableComponent`, `selectAndCreate` in `design.md`).

---

## Required cross-references

- `docs/prd.md` — G1, US-S1, US-P1, AC-3, AC-5, AC-9.
- `docs/ux-ui/design.md` — §3 F1, §4 "Result Framework Reporting", §7 brand line / DD-12 (Tailwind-first), §10 a11y, DD-7 phase awareness.
- `docs/trd/trd.md` — §2 module table (`result-framework-reporting`), §1B QAS-3 / QAS-2.
- `docs/specs/changes/reporting-entry-hub/proposal.md`, `design.md`, `tasks.md`.
- `docs/specs/results/intermediate-outcome-aow-visibility/family.md` — program-level outcomes rule.
