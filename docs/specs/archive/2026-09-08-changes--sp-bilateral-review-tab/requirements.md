# Requirements — "Bilateral review" tab in the Science Program shell

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/sp-bilateral-review-tab/` |
| **Module code** | `BRT` |
| **Type** | Change |
| **Depth** | Standard |
| **Approval Mode** | pre-approved (owner, 2026-09-07 — "pre-approved, continue") |
| **Status** | approved (Phase 1 gate: owner "continue" 2026-09-07; judgment-day corrections applied 2026-09-07, see `judgment.md`) |
| **Proposal** | `proposal.md` (approved 2026-09-07) |
| **Owner answers folded in** | band flags preserve sibling behavior · KZ-REH-1 budgeting · tab shown to all SP roles · route rename allowed with a full wiring audit · year/phase mismatch parked |
| **Date** | 2026-09-07 |

---

## 1. Module / Feature

- **Module:** `result-framework-reporting` (client only)
- **Sub-feature:** Science Program shell → new tab **Bilateral review**
- **Owner:** PRMS product owner
- **Status:** draft
- **Ticket(s):** none

---

## 2. Executive Summary

Program leads today review W3/bilateral results contributed by CGIAR centers on a legacy page that is not a tab, has its own filter drawer and center sidebar, and uses the pre-2026 visual language. This spec moves that capability into the Science Program shell as a fifth tab, **Bilateral review**, built from the same band, KPI cards, chips and grouped rows the sibling tabs use. Review behavior (approve with comment, reject with justification) is preserved unchanged; the legacy route becomes a redirect.

Data premises verified in code on 2026-09-07 (KZ-MWB-1 rule):

| Premise | Writer / reader | Verified fact |
|---|---|---|
| Review list | `GET /api/results/by-program-and-centers` (`result.repository.ts:3168-3303`) → `BilateralResultsService` (review page) and `dashboard-lab.component.ts:2529` (overview, with `versionId` + `statusIds='all'`) | Rows are `source = 'API'` results where the program is **primary or contributor** (`initiative_roles` joined, no role filter; `initiative_role_name` returned, hence the Contributor tag). Without `statusIds` the query excludes only Discontinued (`status_id != 4`), so Editing/Submitted/Draft rows can appear. The review page sends neither `versionId` nor `statusIds`, so its list is not phase-scoped. Response grouped by `project_name` |
| KPI cards | `reporting-summary-stats` | Its `stats` input is a fixed four-field shape with hard-coded cards, not clickable; the review tab needs its own small KPI-card strip (design decides) |
| Pending badge | `GET /api/results/pending-review` (`result.repository.ts:3930-3975`) → not consumed by any live UI | Counts `status_id = 5` `source = 'API'` results where the program is **primary only** (`initiative_role_id = 1`). This is a **narrower population than the list** (which includes contributor rows), so this endpoint is **not used** for the badge; the badge is derived from the same list the tab renders (BRT-R-3) |
| Status vocabulary | `result_status` table | `5 Pending Review`, `6 Approved`, `7 Rejected`; other ids exist (Editing, Submitted, Draft…) and the legacy page renders them as "pending" style |
| Decision | `PATCH /api/results/bilateral/:id/review-decision` → `ResultReviewDrawerComponent` | Body `{ decision: 'APPROVE' \| 'REJECT', justification }`; drawer emits `decisionMade` |
| Permission | `results-review-table.component.ts:47-54`, drawer `result-review-drawer.component.ts:178-186` | Table: `canReviewResults` = admin OR program in `myInitiativesList`. Drawer: `canEditInDrawer` = admin OR (`status_id == 5` AND membership) — the drawer adds a status guard the table does not have; `canEditDataStandards` = `canEditInDrawer && isAdmin` |
| Legacy `?center=` | `indicators-sidebar.component.ts:28-30` | Value is the CLARISA center **code** (`CenterDto.code`, matched against `centersService.getData()`), not the acronym; rows carry `lead_center` / `acronym` |
| Emerging-result return hop | `dashboard-lab.component.ts:755, 866` | After "Report emerging result" the host returns to `returnTab` only when it is `results` or `my-work` |

---

## 3. Context

The SP shell (`pages/dashboard-lab` + `reporting-program-band`) already hosts Overview, Reporting, Results and My results with a shared hero, tab bar and toolbar. The legacy review page (`pages/bilateral-results/`) is the last program-level surface outside that shell. This spec touches design.md §5 navigation (tab bar), §6 listing screens, §7 brand line, and TRD §6 frontend rules. It refines PRD `US-Q1` (review in one place), `US-Q3` (advance/reject recorded), `US-P1` (program lead oversight) and respects `AC-2`, `AC-3`, `AC-4`.

Related archived specs: `reporting-entry-hub` (W3 lane copy), `my-work-board` (badge + tab pattern), `sp-tab-explainer-panels`, `reporting-hierarchical-search-filters` (query-param retention), `clear-filters`, `bilateral--overview-redesign` (KPI cards as filters).

---

## 4. Glossary

| Term | Meaning |
|---|---|
| **W3 / bilateral result** | A result reported by a CGIAR center against a bilateral project that maps to a Science Program; `result.source = 'API'` |
| **Review decision** | A program-side APPROVE or REJECT recorded on such a result (`status_id` 5 → 6 or 7) |
| **Band** | `app-reporting-program-band`: hero + tab bar + toolbar shared by SP tabs |
| **KPI row** | `app-reporting-summary-stats` card strip under the toolbar |
| **Quick chips** | The count-bearing filter pills row under the toolbar (typology chips on Reporting) |
| **Project group** | A collapsible row per bilateral project (`project_id` / `project_name`) containing its result rows |

---

## 5. In Scope / Out of Scope

### In scope

- Fifth tab in the band, its route, badge, explainer, and ordering.
- New page body on the 2026 design line: KPI row, toolbar mapping, status chips, project-grouped rows, flat view, review/see actions.
- Reuse of the review drawer and its data service (moved, not rewritten); one shared review-permission rule.
- Redirect from the legacy route; audit and update of every inbound link; deletion of the legacy shell.
- Query-param retention of search/filters/view.
- Unit tests, a layout gate, and a HITL real-page look after the first rendering task.

### Out of scope

- Any server change. Endpoints, DTOs and review rules stay as they are.
- The Platform sidebar "Bilateral Results" module (`pages/bilateral/`, creator side).
- Center-view tabs (`centerMode` Drafts slot stays deferred).
- Drawer internals and per-type content components.
- Server-side pagination (see BRT-OQ-1, resolved: keep client-side).
- The active-year vs open-phase mismatch found on 2026-09-07 (parked for a separate review).

---

## 6. Personas Affected

| Persona | What changes for them |
|---|---|
| PMU / program lead (reviewer) | Finds the review queue as a tab next to Results, with a pending badge; same approve/reject flow |
| Result submitter (center staff) | Sees decision state of their W3 results inside the program shell (read-only) |
| Platform admin | Same as reviewer for every program |
| QA reviewer | No change (QA module untouched) |
| Bilateral consumer (downstream) | No change (`/api/bilateral/*` untouched) |

---

## 7. User Stories

- **`BRT-US-1`** — As a program lead, I want a **Bilateral review** tab in my program's shell, so that I reach the W3 review queue from the same place I reach Reporting and Results. *(Refines US-P1, US-Q1)*
- **`BRT-US-2`** — As a program lead, I want to see how many results await my decision from any tab, so that I know when to act. *(Refines US-P1)*
- **`BRT-US-3`** — As a reviewer, I want to filter and search the queue by status, center, project and category with the same controls the other tabs use, so that I do not relearn a second filter system. *(Refines US-Q1)*
- **`BRT-US-4`** — As a reviewer, I want to approve or reject a result from the tab and see the list, counts and badge update immediately, so that the queue reflects my work without a reload. *(Refines US-Q3)*
- **`BRT-US-5`** — As any user holding an old link or notification, I want `/results-review` links to keep working, so that nothing I saved breaks. *(Refines AC-8 notification usefulness)*

---

## 8. Functional Requirements

### Required (MUST)

- **`BRT-R-1` Tab and route.** The SP shell MUST expose a fifth tab labeled **Bilateral review** at `/result-framework-reporting/entity-details/:code/bilateral-review`, shown to every user who can open the shell, regardless of role.
- **`BRT-R-2` Tab order.** The band MUST render tabs in the order `Overview · Reporting · Results · Bilateral review · My results` on every SP; existing tabs keep their labels, paths, badges and `queryParamsHandling`.
- **`BRT-R-3` Pending badge.** The tab MUST show a count badge equal to the number of rows with `status_id = 5` in the program's review list (the same `by-program-and-centers` population the tab renders, all roles) when that count is greater than zero, on every tab of the shell, for every user (informational); the badge MUST equal the tab's Pending review KPI whenever both are visible and MUST refresh after a review decision.
- **`BRT-R-4` Hero and toolbar parity.** The tab MUST render the same hero (code, cycle, title, info, Tour / Report emerging result / Where to report) and a toolbar visually equivalent to the band's (search with match count, Filter popover with active badge, Only pending, Expand all, Grouped / All results switch, Clear filters) using the same tokens, sizes and icon set. Favorites and the Catalogue / Remaining work control MUST NOT appear on this tab.
- **`BRT-R-5` Sibling behavior preserved.** Band edits are limited to the tab bar, the path computed, the badge mechanism (input or injected service, per `design.md`), the explainer entry, and the type widening this forces in `reporting-guide.service.ts` (`SpTabId`, `SP_TAB_LABELS`; the new tab does not join the tour steps). The band toolbar (`@if (showToolbar())` block) MUST NOT gain tab-specific branches. Overview, Reporting, Results and My results MUST render exactly as today; their host templates are not edited. The two band spec files MAY gain one provider stub and new `it` blocks, nothing else.
- **`BRT-R-6` KPI row.** The tab MUST show four cards: **Bilateral projects** (distinct projects in the list), **Contributing centers** (distinct lead centers), **Pending review** (rows with `status_id = 5`), **Decided this list** (Approved + Rejected rows, with the split as sublabel). The Pending review card MUST act as a filter toggle equivalent to the Pending chip.
- **`BRT-R-7` Status chips.** Under the toolbar the tab MUST show chips `All · Pending review · Approved · Rejected`, each with its count over the search-filtered list; exactly one chip is active; results whose status is none of 5/6/7 are counted under All only and shown with a neutral chip labeled by their `status_name`.
- **`BRT-R-8` Filter popover.** The Filter popover MUST offer multi-select filters for **Center** (lead center), **Bilateral project** and **Indicator category**, with an active-count badge and a Clear filters action consistent with the `clear-filters` spec.
- **`BRT-R-9` Search.** (Extends the legacy scope, which did not match project or center.) The search box MUST match, case-insensitively, `result_code`, `result_title`, `project_name`, `lead_center`, `indicator_category`, `toc_title` and `indicator`; the band's match count MUST reflect the filtered result count.
- **`BRT-R-10` Grouped rows.** Results MUST be grouped by bilateral project; each group header shows the project name as delivered (`project_name`, which already carries the project code prefix), its lead center(s), result count, and pending count; groups are expanded by default; Expand all / Collapse all works over all groups; groups with zero visible rows after filtering are hidden.
- **`BRT-R-11` Result row.** Each row MUST show: code, title (+ "Contributor" tag when `initiative_role_name = 'Contributor'`), indicator category, lead center, status chip, TOC result (`toc_title`), indicator, submission date, and one action button.
- **`BRT-R-12` Action gating.** The action MUST read **Review** when `status_id = 5` and the user can review the program, otherwise **See**; both open the existing review drawer.
- **`BRT-R-13` Decision propagation.** After the drawer emits a decision, the tab MUST re-fetch the list and the pending count, and update rows, chip counts, KPI cards and badge without a full page reload; the drawer MUST close as it does today.
- **`BRT-R-14` Shared permission rule.** Program membership ("can review this program" = `admin OR program ∈ myInitiativesList`) MUST be computed in one place and consumed by the row action label and by the drawer; the drawer MUST keep its additional `status_id == 5` guard (`canEditInDrawer = membership AND pending`, `canEditDataStandards = canEditInDrawer AND admin`) so Approved/Rejected results stay read-only for non-admins.
- **`BRT-R-15` State retention.** `search`, active status chip, popover filters and the view mode MUST be written to query params (`replaceUrl`) and hydrated on load, so that opening the drawer, navigating to a result and coming back restores the same list.
- **`BRT-R-16` Legacy redirect.** `entity-details/:code/results-review` MUST redirect to `entity-details/:code/bilateral-review`, preserving `:code` and query params. `?search=` keeps its meaning; `?center=<CLARISA center code>` keeps its meaning and value space: the new tab's `center` param holds center codes (csv), resolved to acronyms through the CLARISA centers catalog for labels and row matching; `?reviewResult=` / `?reviewResultId=` are honored (BRT-R-21).
- **`BRT-R-17` Inbound links and predicates.** Every routed in-repo producer of the old path MUST emit the new path, and every predicate that tests for it MUST test for the new one. Audit result (2026-09-07, judgment-day corrected): **five** producers — `results-list.component.ts:682`, `programme-results.component.ts:1433`, `pop-up-notification-item.component.ts:107`, `notification-item.component.ts:366`, `update-notification.component.html:7`; one predicate — `smart-navigation.service.ts:48`; **four** spec files hard-code the old string — `results-list.component.spec.ts:951,1023`, `programme-results.component.spec.ts:1654,1716,1723`, `pop-up-notification-item.component.spec.ts:207`, `smart-navigation.service.spec.ts:73,261,315`. The unrouted banner `pages/entity-details/components/bilateral-results-review/` (host `EntityDetailsComponent`, no route) is dead code and is excluded from this requirement. Server side has zero occurrences.
- **`BRT-R-18` Legacy removal.** The legacy shell (`pages/bilateral-results/` page component, breadcrumb, `indicators-sidebar`, `results-review-filters`, `results-review-container`, `results-review-table`) MUST be deleted; the review drawer and its content components and `BilateralResultsService` MUST be relocated under the new tab's folder and keep passing their existing specs. The **four** cross-folder importers MUST be re-pointed and keep passing their specs: `results-list.component.ts:14-17` and `notification-item.component.ts:8` and `programme-results.component.ts:43-45` (service + `reviewResult` / `reviewResultId` constants), and `dashboard-lab.component.ts:73` plus `dashboard-lab.component.spec.ts:18` and `dashboard-lab.scope.spec.ts:18` (`ResultToReview` interface). Service members removed MUST be limited to those with no remaining importer (verified by grep in the task). The unrouted `pages/entity-details/components/bilateral-results-review/` banner and its host `EntityDetailsComponent` are dead code (route maps to dashboard-lab) and are left untouched here, recorded as a follow-up.
- **`BRT-R-19` Explainer.** The band's explainer panel MUST have a **Bilateral review** entry describing the tab in one or two sentences, in American English, in the tone of the sibling entries.
- **`BRT-R-20` Design line.** New markup MUST be Tailwind-first on the 2026 brand tokens and MUST NOT introduce PrimeNG icon fonts or new `.pr-*` SCSS blocks. Icons follow the control being mirrored: controls copied from the band keep the band's icon (Lucide `ng-icon` for search and Expand all, `material-icons-round` elsewhere); new controls use `material-icons-round`.
- **`BRT-R-22` Return after emerging report.** After "Report emerging result" is used from this tab, the host MUST return the user to the Bilateral review tab (the `returnTab` hop honors `bilateral-review` as it does `results` and `my-work`).
- **`BRT-R-21` Deep-linked drawer.** When the tab loads with `?reviewResult=<code>` (and optionally `?reviewResultId=<id>`), it MUST open the review drawer for that result once the list has loaded (falling back to a minimal `{ id, result_code }` object when the code is not in the list), then remove both params with `replaceUrl`, exactly as the legacy table does today. Producers: results list and notification items.

### Should (SHOULD)

- **`BRT-R-30` Flat view.** The view switch SHOULD offer **Grouped** (default) and **All results** (flat rows sorted by submission date descending).
- **`BRT-R-31` States.** The tab SHOULD render explicit loading (skeleton rows and skeleton KPI cards), empty ("No bilateral results reported to this program yet."), filtered-empty (with Clear filters), and error (retry) states, consistent with `reporting-entry-hub` skeleton patterns.
- **`BRT-R-32` Responsive.** Below the `md` breakpoint the KPI row SHOULD wrap to two columns and the row table SHOULD scroll inside its own container; the page body never scrolls horizontally (`all-indicators-table-responsive` rule).

### Could (MAY)

- **`BRT-R-40`** A per-center chip strip MAY be shown above the groups when more than one center is present (clicking sets the Center filter).

---

## 9. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Client-side filtering MUST keep chip/search updates under 100 ms for 500 rows (largest observed program today: 143 rows). No additional endpoints; one list request per program per session for the badge (memoized, shared with the tab), one list request on tab load, one on decision. |
| **Security** | All calls JWT-gated as today (custom `auth` header). Review actions remain gated by the shared rule; the server keeps enforcing (AC-3). No secrets in logs. |
| **Backwards compatibility** | Old route keeps working via redirect (BRT-R-16). No API change (AC-4). |
| **Accessibility** | Tab bar keeps `aria-current="page"`; chips are buttons with `aria-pressed`; group headers are buttons with `aria-expanded`; badge has an `aria-label` ("N pending review"); no native `disabled` on actionable controls (KZ-REH-2: use `aria-disabled` + title + handler guard). WCAG 2.1 AA per design.md §10. |
| **Internationalization** | Copy lives in a local string map (as `hub-copy.ts` does), American English. |
| **Observability** | Console errors on failed fetches only through the existing API error path; no new logging. |
| **Bundle** | No new third-party dependency. |

---

## 10. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BRT-AC-1` | Any SP shell page | It renders | Five tabs in the order `Overview · Reporting · Results · Bilateral review · My results`; the new tab links to `.../bilateral-review` with `queryParamsHandling="preserve"` |
| `BRT-AC-2` | Reporting tab as it exists today | The band renders with the new inputs at their defaults | Toolbar controls, favorites, segmented control and chips are identical to the pre-change snapshot |
| `BRT-AC-3` | Program with 3 pending results | Any tab renders | Badge shows `3`; with 0 pending, no badge |
| `BRT-AC-4` | Tab loads a list with 2 projects, 3 centers, 7 rows: 3 pending (one of them a Contributor-role row), 2 approved, 1 rejected, 1 Editing | KPI row renders | Cards read 2 / 3 / 3 / 3 (sublabel "2 approved · 1 rejected"); chips read All 7 · Pending 3 · Approved 2 · Rejected 1; the Editing row shows a neutral "Editing" chip |
| `BRT-AC-5` | Same list | User clicks the **Pending review** card | Only pending rows are shown, the Pending chip is active, the card shows active state; clicking again restores All |
| `BRT-AC-6` | Search box receives `desira` | Filtering runs | Rows whose project name contains "DESIRA" remain; match count equals their number; groups with no rows are hidden |
| `BRT-AC-7` | Filter popover with Center = CIP | Applied | Only CIP-led rows remain; the Filter badge shows 1; Clear filters removes it and restores the list |
| `BRT-AC-8` | A pending row and a user who can review | Row renders | Action reads **Review**; for a user who cannot review it reads **See**; both open the drawer with that result |
| `BRT-AC-9` | Drawer emits APPROVE for the last pending row | Propagation runs | Row status chip becomes Approved, Pending chip count 0, KPI Pending 0, badge disappears, drawer closed, no full reload (component instance preserved) |
| `BRT-AC-10` | URL `.../bilateral-review?search=potato&status=pending&center=<code of CIP>&view=flat` | Load | Search, chip, filter and view are hydrated; changing any writes back with `replaceUrl` |
| `BRT-AC-11` | URL `.../results-review?center=<code of CIP>&search=x` | Navigation | Lands on `.../bilateral-review?center=<same code>&search=x` for the same program, with the Center filter showing CIP selected |
| `BRT-AC-12` | Grep for `results-review` over `*.ts` and `*.html` under `onecgiar-pr-client/src` and `onecgiar-pr-server/src`, excluding `pages/entity-details/` (unrouted dead code) and the redirect route line | Audit | Zero hits |
| `BRT-AC-13` | `pages/bilateral-results/` | After the spec | Folder does not exist; drawer and service specs pass from their new location |
| `BRT-AC-14` | Effective viewport 840 CSS px (Orca ×1.2 zoom) | Tab renders | KPI row wraps, table scrolls inside its container, `document.documentElement.scrollWidth <= clientWidth` |
| `BRT-AC-15` | Keyboard user | Tabs through the page | Focus order: tabs → toolbar → chips → KPI cards → group headers → row actions; all reachable and operable with Enter/Space |
| `BRT-AC-16` | Explainer panel opened on the tab | Renders | Title "Bilateral review" and the approved description |
| `BRT-AC-17` | URL `.../bilateral-review?reviewResult=8273&reviewResultId=91` and a list containing code 8273 | List loads | Drawer opens for that row; URL no longer carries `reviewResult` / `reviewResultId`; with a code absent from the list the drawer still opens with the id |
| `BRT-AC-18` | Smart Back predicates evaluated for `.../SP02/bilateral-review` and `.../SP02` | `isReportingTab` runs | False for the tab path, true for the bare program path; existing Smart Back specs stay green |
| `BRT-AC-19` | The AC-4 fixture, loaded on the Overview tab and then on the Bilateral review tab | Badge and KPI render | Badge reads 3 on both tabs and equals the Pending review card; after approving the Contributor-role pending row both read 2 |
| `BRT-AC-20` | User on the tab clicks Report emerging result and completes the hop | Host processes `returnTab=bilateral-review` | User lands back on `.../bilateral-review` for the same program |

Cross-cutting project ACs that apply (not restated): `AC-2`, `AC-3`, `AC-4`, `AC-8`, `AC-9`.

### Key scenarios

#### Scenario: Reviewer approves from the new tab (BRT-R-12, R-13)

- GIVEN the Bilateral review tab for SP02 lists a Pending Review result led by CIP and the user is an SP02 member
- WHEN the user clicks **Review**, confirms APPROVE in the drawer
- THEN the drawer closes, the row shows **Approved**, Pending chip and KPI decrement by one, and the tab badge decrements
- AND the list is re-fetched from `by-program-and-centers` and the badge from `pending-review`
- BUT it must NOT reload the route or reset the user's search, chip or filters
- AND IT MUST keep the existing decision payload `{ decision, justification }` unchanged.

#### Scenario: Sibling tabs unchanged (BRT-R-5)

- GIVEN the Reporting tab renders with the band
- WHEN the band receives no value for the new per-tab visibility inputs
- THEN favorites, the Catalogue/Remaining work control and typology chips render as before
- BUT it must NOT require any edit to `dashboard-lab.component.html`, `programme-results.component.html` or `my-work-board` templates beyond none
- AND IT MUST pass the existing band and dashboard-lab specs untouched.

#### Scenario: Old link keeps working (BRT-R-16)

- GIVEN a notification created before this change links to `/entity-details/SP13/results-review?center=IITA`
- WHEN the user opens it
- THEN the app shows the Bilateral review tab for SP13 with the Center filter set to IITA
- BUT it must NOT render the legacy component or a 404
- AND IT MUST keep the URL readable as `/bilateral-review` after the redirect.

#### Scenario: Non-reviewer sees the queue read-only (BRT-R-1, R-12)

- GIVEN a user with a Guest role on SP02
- WHEN they open the tab
- THEN the tab, KPI row, chips and rows render, every action reads **See**
- BUT it must NOT show approve/reject controls in the drawer
- AND IT MUST still show the badge count (visibility is informational, not an action).

---

## 11. Defect classes and gates

| Defect class this spec can produce | Gate that catches it | Substitute if none |
|---|---|---|
| Tab order / link / badge wrong | Band Jest spec (DOM order, hrefs, badge text) | — |
| Sibling toolbar regression (BRT-R-5) | Existing band + dashboard-lab specs plus a new default-inputs snapshot test | — |
| Filter / chip / KPI arithmetic wrong | Component Jest specs with a fixture that makes each counter differ (KZ-KCR fixture rule) | — |
| Decision propagation without reload | Jest: spy on re-fetch calls and assert same component instance | — |
| Redirect / param mapping wrong | Router Jest test with `RouterTestingHarness` | — |
| Dead inbound link | Grep audit recorded in the task with the FAIL input (`results-review` present) | — |
| Layout: horizontal overflow, KPI wrap, chip wrap | **Not visible to jsdom** → Cypress CT at 840 and 1536 CSS px (project harness works: `project-cypress-ct-harness-quirks`) | Real-page check in the Orca browser at the HITL look |
| Visual parity with sibling tabs (spacing, tokens, icon set) | **No automated gate** → HITL real-page look after the first rendering task (KZ-MWB-2) | Accepted risk if the owner skips the look |
| Contrast on chips / badge | `axe` in CT covers text-on-solid; **not** the violet gradient | HITL look; accepted risk |
| Drawer regressions from the move / status guard lost (R-14) | Existing drawer specs re-run from the new path; new spec: member + Approved row → no edit affordances | — |
| Deep-link drawer opener broken (R-21) | Page Jest spec with `reviewResult` present/absent in the list | — |
| Badge ≠ KPI (R-3) | Jest: same fixture through count service and page; AC-19 | — |

---

## 12. Dependencies & Assumptions

### Upstream

- `results-api.service.ts` method `GET_ResultToReview` (the `GET_PendingReviewCount` method stays unused); `bilateral-api.service.ts` drawer methods; CLARISA centers via `centersService`.
- `reporting-program-band`, `reporting-summary-stats`, `app-pr-table`, `pr-filter-*`, `ReportingFavoritesService` (only to hide), `ReportingGuideService` (Tour).

### Downstream

- Notification link builders (client). Server email templates: audited in BRT-T-1; if a server producer exists, the change is a string edit recorded as a follow-up, not a payload change.

### Assumptions

- The badge is derived from the review list itself, so badge, chips and KPI share one population by construction. The `pending-review` endpoint is narrower (primary role only) and is not used. Verified in SQL on 2026-09-07 (judgment-day corrected).
- Client-side filtering remains adequate (largest program 143 rows).
- The Orca embedded browser keeps an authenticated PRMS session for the HITL look.

---

## 13. Open Questions

- `BRT-OQ-1` Pagination — **resolved:** keep client-side filtering; revisit if any program exceeds ~500 rows.
- `BRT-OQ-2` Tab visibility for non-reviewers — **resolved by owner:** shown to all SP roles; actions gated.
- `BRT-OQ-3` Route name — **resolved by owner:** rename to `bilateral-review` with redirect and full wiring audit.
- `BRT-OQ-4` Should the badge be hidden for users who cannot review? **Resolved:** no, informational — auto-approved (pre-approved mode) at the Phase 1 gate.

---

## 14. Out-of-Band Notes

- The active-year (2026) vs open-phase (2025) mismatch in the local DB makes Reporting-tab progress read 0; it does not affect this tab (neither endpoint is phase-scoped) but will be visible during real-page checks. Parked for a separate review per owner.
- Shared-file discipline: this branch does not edit `CLAUDE.md`, `AGENTS.md`, `.agents/` or `docs/trd/trd.md`; module guides under the touched folders are spec deliverables.

---

## Required cross-references

- `docs/prd.md` — US-Q1, US-Q3, US-P1; AC-2, AC-3, AC-4, AC-8, AC-9.
- `docs/ux-ui/design.md` — §5 navigation, §6 listing screens, §7 brand line, §10 accessibility, DD-12.
- `docs/trd/trd.md` — §2 client module table (`result-framework-reporting`), §6 frontend rules.
- `proposal.md` (same folder); archived siblings listed in §3.
