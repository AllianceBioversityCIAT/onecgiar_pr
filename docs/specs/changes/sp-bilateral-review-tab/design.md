# Design — "Bilateral review" tab in the Science Program shell

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/sp-bilateral-review-tab/` |
| **Module code** | `BRT` |
| **Depth** | Standard (re-checked in §14: matches) |
| **Approval Mode** | pre-approved (owner, 2026-09-07) |
| **Status** | approved — Phase 2 gate auto-approved (pre-approved mode) after judgment-day one pass, fix-only (`judgment.md`, 2026-09-07) |
| **Requirements** | `requirements.md` (approved 2026-09-07) |
| **Skills applied** | `angular-developer`, `frontend-design`, `cognitive-doc-design`; kaizen `KZ-REH-1`, `KZ-REH-2`, `KZ-MWB-1/2/3`, `KZ-KCR` fixture rule |
| **Budget (§14)** | 8 tasks · ~1,200 added source LOC (≈ 600 net after deletions) + ~1,900 test LOC · ≤1 review round per task |

---

## 1. Summary

Add a fifth Science Program tab, **Bilateral review**, as a new standalone page under `pages/result-framework-reporting/pages/bilateral-review/`, mounted on `reporting-program-band` exactly as My results is (`showToolbar=false`, `frameLocked`, `scrollHost`), with its own Tailwind toolbar, KPI strip, status chips and a `PrGroupTableComponent`-based project → results list. The review drawer and `BilateralResultsService` are relocated, not rewritten; a root-provided `BilateralReviewCountService` derives the tab badge from the same review list (memoized per program) so badge, chips and KPI can never disagree; the legacy `results-review` route redirects. The trade-off accepted: the toolbar markup is duplicated from the band rather than parameterized, to keep the four existing tabs untouched (BRT-R-5).

Links: `requirements.md` · `docs/prd.md` US-Q1/US-Q3/US-P1 · `docs/ux-ui/design.md` §5, §7, §10, DD-12 · `docs/trd/trd.md` §6.

---

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** untouched.
- **Client modules touched:**
  - `pages/result-framework-reporting/pages/bilateral-review/` (new; sibling of `my-work-board/`, `programme-results/`).
  - `pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/` (tab bar, path, badge, explainer only) and its two spec files (one provider stub each).
  - `pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.ts` (`SpTabId` union + `SP_TAB_LABELS` widened; tab not added to tour steps).
  - `pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts` (`ResultToReview` import path; `returnTab` whitelist gains `bilateral-review` at the two sites `:755` and `:866`) and its two specs (import path).
  - `pages/result-framework-reporting/pages/programme-results/programme-results.component.ts` (import path of service + constants; producer at `:1433`) and spec.
  - `shared/routing/routing-data.ts` (new route + redirect).
  - `shared/services/smart-navigation.service.ts` (predicate rename, see `BRT-DD-5`).
  - Link producers: `results-list.component.ts`, `pop-up-notification-item.component.ts`, `notification-item.component.ts`, `update-notification.component.html`, `programme-results.component.ts`.
  - `pages/result-framework-reporting/pages/bilateral-results/` (deleted after relocation).
- **External integrations:** none new.

### 2.2 Primary flow

```
[Any SP tab] band mounts
  └── BilateralReviewCountService.ensure(programCode)          (memoized per program per session)
        └── GET api/results/by-program-and-centers?programId=SPxx → rows.filter(status_id == 5).length → badge

[Bilateral review tab] /entity-details/:code/bilateral-review?search&status&center&project&category&view
  ├── route paramMap → programCode ; programme resolved via ResultFrameworkReportingHomeService (as my-work-board)
  ├── BilateralResultsService.entityId ← code ; getEntityDetails() (hero name/cycle come from the shell services, as siblings)
  ├── GET api/results/by-program-and-centers?programId=SPxx   (single call, all centers; no versionId/statusIds → all roles, all statuses except Discontinued)
  │     └── tableData (GroupedResult[]) + tableResults (flat) ; BilateralReviewCountService.setFromRows(code, rows)
  ├── CentersService.getData() → { code → acronym } map (center filter labels; `?center=` carries codes)
  ├── URL → state hydration (untracked, guarded) ; state → URL (merge + replaceUrl)
  ├── computed pipeline: searchFiltered → statusFiltered → popoverFiltered → groups/flat ; counts per chip/KPI from searchFiltered
  ├── ?reviewResult / ?reviewResultId → open drawer once tableResults non-empty, then clear params
  └── Row action → drawer (visible/resultToReview models)
        └── PATCH api/results/bilateral/:id/review-decision → decisionMade
              └── re-fetch by-program-and-centers → rows, chips, KPIs → setFromRows(code, rows) → badge

[/entity-details/:code/results-review?…] → redirectTo 'entity-details/:entityId/bilateral-review' (query params preserved by the router)
```

---

## 3. Data Model Changes

None. No entity, migration or CLARISA change. Client-side view models only (§6.2).

---

## 4. API Surface

### 4.1 Endpoints used (unchanged)

| Method + path | Used for | Notes |
|---|---|---|
| `GET api/results/by-program-and-centers?programId=` | Review list and badge | Grouped by project; `centerIds` omitted (all centers); `versionId`/`statusIds` not sent (parity with legacy: all roles, all statuses except Discontinued, not phase-scoped). `dashboard-lab` also calls it with `versionId` + `statusIds='all'` for the overview; that caller is untouched |
| `GET api/results/pending-review?programId=` | **not used** | Counts primary-role rows only — a narrower population than the list; using it would let badge and KPI disagree (judgment-day L-1) |
| CLARISA centers (`CentersService.getData()`) | Center filter labels, `?center=` code ↔ acronym | As the legacy sidebar did |
| `GET api/results/bilateral/:id`, `PATCH …/review-decision`, `…/review-update/*`, `…/title` | Drawer | Unchanged |
| `GET api/results-framework-reporting/clarisa-global-units?programId=` | `entityDetails` (kept for drawer parity) | Unchanged |

### 4.2 Bilateral / platform-report impact

None (`/api/bilateral/*` external contract untouched; ADR-004 holds).

---

## 5. Server Workflow / Business Rules

No change. W1 status transitions for review (5 → 6/7) remain enforced by `results.controller.ts:994` and the drawer's existing payload.

---

## 6. Frontend Plan

### 6.1 Routes

| Route (under `result-framework-reporting`) | Change |
|---|---|
| `entity-details/:entityId/bilateral-review` | **New.** `prName: 'Bilateral review'`, `data: { sidebar: { width: 300 }, rfrView: 'bilateral-review' }`, `loadComponent → BilateralReviewComponent`. Placed next to `my-work` (`routing-data.ts:612-624`). |
| `entity-details/:entityId/results-review` | **Becomes** `redirectTo: 'entity-details/:entityId/bilateral-review'`, `pathMatch: 'full'`. Angular carries path params by name and keeps query params on redirect, so `?center=&search=&reviewResult=` survive. The `BilateralResultsComponent` lazy import is removed. |

`smart-navigation.service.ts`: replace the `'/results-review'` substring test with an `isBilateralReviewTab(url)` regex predicate (same shape as `isMyResultsTab`) inside `isReportingTab`'s exclusion list. Note: `isReportingTab`'s final regex already requires the URL to end at `:code`, so the exclusion is defensive, not load-bearing (judgment-day JB-12); the rename keeps the code truthful. The tab is **not** added to `isKnownResultDetailOrigin` (behavior parity, follow-up in §13).

### 6.2 Components & services

Directory (new):

```
pages/result-framework-reporting/pages/bilateral-review/
├── bilateral-review.component.{ts,html,spec.ts}        page: band mount, toolbar, chips, KPI strip, table host, drawer host, URL sync
├── bilateral-review.copy.ts                             string map (labels, explainer text, empty/error copy)
├── bilateral-review.query-params.ts                     key map + (de)serializers
├── components/
│   ├── bilateral-review-kpis/                           4 cards (one toggle) — Tailwind, mirrors reporting-summary-stats classes
│   ├── bilateral-review-table/                          PrGroupTableComponent host (grouped) + plain table (flat), shared row template
│   └── result-review-drawer/                            MOVED from bilateral-results (drawer + 5 content components + AGENTS.md)
├── services/
│   ├── bilateral-results.service.{ts,spec.ts}           MOVED (name kept; exports REVIEW_RESULT_* constants)
│   ├── bilateral-review-count.service.{ts,spec.ts}      root-provided badge cache (pending count derived from the list)
│   └── bilateral-review-access.service.{ts,spec.ts}     isProgramMember(code) shared membership rule
└── CLAUDE.md                                            module guide (spec deliverable)
```

**`BilateralReviewComponent`** (standalone, OnPush, signals)

- Inputs from route: `programCode` via `toSignal(paramMap)`; programme name/cycle resolved like `my-work-board.component.ts:291-298`.
- State (signals): `search`, `status: 'all'|'pending'|'approved'|'rejected'`, `centers: string[]` (CLARISA center **codes**, parity with legacy `?center=`), `projects: string[]`, `categories: string[]`, `view: 'grouped'|'flat'`, `expandAllNonce`, `loading`, `error`, `filterPopoverOpen`. Center codes resolve to acronyms through a `{ code → acronym }` map built from `CentersService.getData()` (the page loads it once, as the legacy sidebar did); row matching uses `lead_center` / `acronym`.
- Computeds: `searchFiltered` (over `tableResults`, fields per BRT-R-9), `chipCounts` (from `searchFiltered`, before status/popover filters so counts explain the chips), `visibleRows` (status + popover), `groups` (rebuild `GroupedResult[]` from `visibleRows`, dropping empty groups), `kpis` (projects, centers, pending, approved, rejected over `searchFiltered`), `filtersActive`, `matchCount`, `filterOptions` (centers / projects / categories from `tableResults`).
- Effects: URL → state hydration (guarded, `untracked` reads); state → URL (`queryParamsHandling: 'merge'`, `replaceUrl: true`, `null` removes keys); deep-link drawer opener (BRT-R-21) copied from `results-review-table.component.ts:134-160`; on every list load `BilateralReviewCountService.setFromRows(code, rows)` (so a decision re-fetch refreshes the badge without a second request).
- Filter popover: state and handlers (open/close, outside click, Escape, focus return) are page-owned, following `my-work-board.component.ts` `toggleFilterPopover` — the band's popover logic lives in the band class (`band.html:409-454`) and is not copied.
- Band mount: `activeTab="bilateral-review"`, `[showToolbar]="false"`, `[frameLocked]="true"`, `[scrollHost]="workAreaEl()"`, `[canReport]="true"`, `[canReportEmerging]` from the same helper the siblings use, `(whereToReport)`, `(reportEmerging)` wired as in `my-work-board.component.html:46-59`.

**Toolbar (inline in the page template, inside `#workArea`)**: search input with match count · Filter button opening a popover with three `app-pr-filter-multiselect` (Center, Bilateral project, Indicator category) and a Clear filters action · Only pending toggle (sets `status='pending'`, mirrors chip) · Expand all / Collapse all · Grouped / All results segmented control. Markup and classes copied from the band's blocks (`reporting-program-band.component.html:359-392` search, `409-454` popover shell, `653-667` only-pending, `721-733` clear filters, `746-786` expand-all + segmented) so the look is identical, **including their icons** (Lucide `ng-icon` `lucideSearch`, `lucideChevronsUpDown/DownUp`; BRT-R-20). No new SCSS.

**Status chips row**: `All · Pending review · Approved · Rejected` with counts, `.pr-chip`-style Tailwind buttons, `aria-pressed`; keyboard operable. Rows with other statuses count in All only (BRT-R-7).

**`BilateralReviewKpisComponent`**: input `kpis` `{ projects, centers, pending, approved, rejected }`, input `pendingActive`, output `togglePending`; four cards in the same grid and typography as `reporting-summary-stats`; the Pending card is a button with `aria-pressed`, active state = violet border + tinted background (as `bilateral--overview-redesign` KPI cards).

**`BilateralReviewTableComponent`**: inputs `groups`, `flatRows`, `view`, `expandAllNonce`, `canReview`; output `openResult(ResultToReview)`. **Grouped view** uses `PrGroupTableComponent` exactly as the legacy table does (`results-review-table.component.html:6`): `[value]=groups`, `groupRowsBy='project_name'`, `dataKey='project_name'` (the key is read from the group object; `GroupedResult` has no `id` — judgment-day L-4), `expandedRowKeys` seeded with every `project_name` and re-seeded on `expandAllNonce`; templates `prTableHeader` (column headers), `prTableGroupHeader` (`let-item let-expanded`, toggler via `prRowToggler`, `aria-expanded`), `prTableExpandedRow` (`let-item` → `@for` over `item.results` rendering the shared row `ng-template`), `prTableEmpty`, `prTableLoading`. `prTableBody` is an `app-pr-table` slot and is **not** used. Group header: `project_name` as delivered (it already carries the project code prefix), distinct lead centers, `N results · M pending`. **Flat view** (BRT-R-30) is a plain `<table>` in the same component with the same column header and the shared row template over `flatRows` (page-sorted by `submission_date` desc) — the group table has no header-hiding option and its `sortField` sorts groups, not rows. Row columns per BRT-R-11; status chip tone by `status_id` with loose equality (5 amber, 6 green, 7 red, else neutral with `status_name`); action = `HlmButton` ghost with `material-icons-round` `edit` / `visibility`. Because `PrGroupTableComponent` renders a real `table/thead/tbody`, column sizing uses `<col>`/`min-w-*` on cells (no CSS-grid overrides); the wrapper is the only horizontal scroll container.

**`BilateralResultsService`** (moved, name kept): importers re-pointed — `results-list.component.ts:14-17`, `notification-item.component.ts:8`, `programme-results.component.ts:43-45` (service + `REVIEW_RESULT_*` constants), `dashboard-lab.component.ts:73` + two specs (`ResultToReview` interface). The page uses one fetch (all centers), so `tableResults` is the whole population: center filter options and per-center pending counts are derived from `tableResults` in the page. Members whose only consumers were the sidebar/table (`centers`, `currentCenterSelected`, `selectedCenterCode`, `selectCenter`, `allResultsForCounts`, `pendingCountByAcronym`, `totalPendingCount`, `centerAcronymsWithResults`, `centersToShowInSidebar`, `refreshAllResultsForCounts`) are removed **only after a grep proves no importer remains** (T-2); everything the four importers use (`entityId`, `entityDetails`, `showReviewDrawer`, `currentResultToReview`, constants) stays.

**`BilateralReviewCountService`** (root): `count(code): number|null`, `ensure(code)` (one `GET_ResultToReview(code)` per program per session, memoized; stores `rows.filter(status_id == 5).length`), `setFromRows(code, rows)` (the page feeds it on every list load, so decisions refresh the badge with no extra request), `refresh(code)`. Mirrors `MyWorkCountService` (`my-work-count.service.ts`). The band injects it and derives the badge from `programCode()` (no host template edits). The two band specs (`reporting-program-band.component.spec.ts:17-20`, `reporting-program-band.favorites.spec.ts:18-21`) provide only the router today and gain one `useValue` stub for this service (allowed by BRT-R-5).

**`BilateralReviewAccessService`** (root): `isProgramMember(code)` = `rolesSE.isAdmin || dataControlSE.myInitiativesList.some(official_code === code)`. Consumers: the page (row action label: Review when `status_id == 5 && isProgramMember`) and the drawer, whose `canEditInDrawer` (`result-review-drawer.component.ts:178-186`) becomes `isAdmin || (statusId == 5 && isProgramMember(entityId))` — the **status guard is kept** (judgment-day L-3); `canEditDataStandards = canEditInDrawer && isAdmin` unchanged.

**Band changes** (`reporting-program-band`): `activeTab` union += `'bilateral-review'`; `bilateralReviewPath` computed next to `myWorkPath` (`.ts:311`); new anchor inserted between Results and My results, cloned from the My results anchor (`html:257-283`) with `queryParamsHandling="preserve"`, `material-icons-round` `fact_check`, label from copy; badge from the injected count service when `> 0` (`aria-label` "N pending review"); `activeTabInfo` (`.ts:503-532`) gains the `bilateral-review` case with the approved copy; the tour ternary at `.ts:266-283` (which maps `activeTab` to a path for `startSpTour`) gains the branch. Because `activeTab` feeds `startSpTour` typed with the closed `SpTabId` union, `reporting-guide.service.ts:6-13` widens `SpTabId` and `SP_TAB_LABELS` with `'bilateral-review': 'Bilateral review'`; the tab is **not** added to the tour's step list.

### 6.3 Design system usage

- Tailwind-first on `brand-*` / `--pr-color-*` tokens; chrome gradient not used on this page (cards and rows are light surfaces like siblings).
- Icons: `material-icons-round` for the tab (`fact_check`), row actions (`edit`, `visibility`), chips/KPI, popover close; controls copied from the band keep the band's Lucide `ng-icon`s (`lucideSearch`, `lucideChevronsUpDown` / `lucideChevronsDownUp`) so the toolbar reads identically (BRT-R-20).
- Status chip colors: reuse the semantic tokens the legacy `approved | rejected | pending` classes map to, expressed as Tailwind utilities (no `.pr-*` blocks).
- Responsive: `md` and up = 4 KPI cards in one row, toolbar single line; below `md` = KPI 2×2, toolbar wraps, table wrapper `overflow-x-auto`; body never scrolls horizontally (BRT-AC-14). Effective widths account for the ×1.2 root zoom (design.md DD-11).
- A11y: tabs `aria-current`; chips/KPI toggle `aria-pressed`; group toggler `aria-expanded`; popover focus trap and Escape (reuse the band's popover behavior); no native `disabled` (KZ-REH-2: `aria-disabled` + `title` + handler guard on Review when a decision is in flight).
- Copy: `bilateral-review.copy.ts`, American English (`american-english-copy` spec).

### 6.4 Real-time / notification UX

No socket events. Notification items keep deep-linking with `reviewResult` / `reviewResultId` (BRT-R-21). "Report emerging result" hops to the dashboard-lab host with `returnTab: 'bilateral-review'`; the host's whitelist (`dashboard-lab.component.ts:755, 866`, today `results | my-work`) gains the new value (BRT-R-22).

---

## 7. Security & Authorization

- All calls JWT-gated via the custom `auth` header; the server enforces review rights on `review-decision` (AC-3). The client rule (`BilateralReviewAccessService`) only shapes affordances.
- No new inputs reach the server; query params are parsed defensively (unknown `status`/`view` → defaults, csv lists trimmed).
- No secrets, tokens or URLs logged (`.cursorrules`, AC-9).

---

## 8. Performance & Capacity

- Same two requests as today on load (list + CLARISA centers), plus one memoized list request per program per session for the badge when the tab itself has not loaded yet; the page feeds the badge cache, so a decision costs one re-fetch.
- Filtering is synchronous over ≤ 500 rows in computeds; group rebuild is O(n). Target < 100 ms per keystroke (BRT NFR).
- No new dependency; lazy `loadComponent` keeps the shell bundle unchanged.

---

## 9. Observability

- Fetch failures surface through the existing API error path; the page shows the error state with retry (BRT-R-31). No new logging.

---

## 10. Testing Plan

- **Unit (Jest):** count service (memoize / `setFromRows` / `refresh`, pending derived from rows), access service (admin / member / guest), drawer `canEditInDrawer` (member + Approved row → false), page computeds with the AC-4 fixture (2 projects · 3 centers · 7 rows: 3 pending incl. one Contributor-role row · 2 approved · 1 rejected · 1 Editing), badge == KPI on that fixture (AC-19), URL hydration and write-back, `?center=` code → acronym resolution, deep-link drawer opener, decision propagation (same component instance, one re-fetch, badge updated via `setFromRows`), band tab order/href/badge, redirect (`RouterTestingHarness`), smart-navigation predicates, `returnTab` whitelist, relocated drawer/service specs unchanged.
- **CT (Cypress):** layout at 840 and 1536 CSS px: KPI wrap, no horizontal body scroll, chips wrap, group header click toggles rows (click the toggler node itself, KZ-MWB-3), run once against the FAIL input (a fixed-width column) to prove the gate can fail.
- **HITL real-page look** in the Orca browser after the first rendering task (KZ-MWB-2), before the table polish task.
- Coverage: client thresholds 50/60/60/60 unaffected; deleted legacy specs are replaced by the new ones.

---

## 11. Backwards Compatibility & Migration

- Route redirect keeps bookmarks, notifications and emails working.
- No API or data change; rollback = revert the PR(s).
- Deleting `pages/bilateral-results/` is safe once the four cross-folder importers are re-pointed (BRT-R-18) and the route no longer references `BilateralResultsComponent`.

---

## 12. Design Decisions

### `BRT-DD-1` — Own toolbar with `showToolbar=false`, not band per-tab flags
- **Context:** BRT-R-4 wants the band's look; BRT-R-5 forbids sibling regressions. Favorites and the segmented control are gated on `compactFilters()`, not on the tab (`band.html:669, 757`).
- **Decision:** Mount the band as My results does and render a toolbar inside the page with the band's classes.
- **Alternatives:** (a) add `showFavorites`/`showBurndownSort` inputs to the band toolbar — small, but couples the shared toolbar to a fifth tab and needs the AoW-shaped popover bent to centers/projects; (b) reuse the band's typology chips for status — the popover and view-switch labels still say AoW/indicators.
- **Consequences:** ~120 LOC of duplicated toolbar markup; zero risk to four tabs; a later "toolbar extraction" refactor is possible once two consumers exist.

### `BRT-DD-2` — Badge count injected in the band, not passed by hosts
- **Context:** BRT-R-3 wants the badge on every tab; passing an input would touch four host templates.
- **Decision:** The band injects `BilateralReviewCountService` and calls `ensure(programCode())` in an effect; hosts stay untouched.
- **Alternatives:** input like `myWorkCount` (host edits, four specs to update); deriving from the list (not loaded on other tabs).
- **Consequences:** both band specs gain one provider stub (recorded in BRT-R-5); one memoized list request per program when the tab has not been opened yet. **Data source (judgment-day L-1):** the count is derived from the review list, not from `pending-review`, because that endpoint counts primary-role rows only while the list includes contributor rows; deriving from the list keeps badge, chips and KPI identical by construction.

### `BRT-DD-3` — `PrGroupTableComponent` as the grouped-row base
- **Context:** need project → results grouping; `reporting-aow-table` is KPI-shaped; `app-pr-table` has no grouping.
- **Decision:** `PrGroupTableComponent` with page-owned Tailwind templates.
- **Alternatives:** fork `reporting-aow-table` (rejected: KPI semantics); hand-rolled `@for` groups (rejected: re-implements toggling/expanded keys the component already provides).
- **Consequences:** the component is the in-house p-table replacement, design-neutral; rows live in `prTableExpandedRow`, keys in `dataKey='project_name'` (judgment-day L-4); the flat view is a plain table in the same component sharing the row template (the group table cannot hide headers or sort rows).

### `BRT-DD-4` — Relocate, do not rewrite, drawer and service
- **Context:** 1,666-LOC drawer with its own AGENTS.md; five content components; four cross-folder importers of the service / interfaces.
- **Decision:** `git mv` to the new folder; only edits are import paths and the permission injection.
- **Alternatives:** leave them in `pages/bilateral-results/` (rejected: BRT-R-18 deletes the folder and the guide would describe a dead page).
- **Consequences:** drawer AGENTS.md path references updated; specs move with the files.

### `BRT-DD-5` — Route rename with redirect; Smart Back predicate renamed, not promoted
- **Context:** owner allowed the rename with a full wiring audit; `isReportingTab` excludes the old path.
- **Decision:** `redirectTo` keeps old links; predicate becomes `isBilateralReviewTab`; the tab is not made a known result-detail origin.
- **Reversion challenge (Step 2.3, "what does removing `/results-review` break?"):** (1) notification deep links → covered by redirect + BRT-AC-11; (2) `?reviewResult` drawer auto-open → was an unlisted behavior, now BRT-R-21 / AC-17; (3) `isReportingTab`'s exclusion for the old path is defensive only — its closing regex already rejects any `/entity-details/:code/<segment>` URL (JB-12), so dropping it would not change Smart Back; the rename keeps the code truthful and AC-18 pins the behavior; (4) four spec files hard-code the old string → updated in the wiring task. No unaddressed breakage found.
- **Consequences:** promoting the tab to a Smart Back origin is a follow-up (§13).

### `BRT-DD-6` — Legacy shell deleted, retired banner left alone
- **Context:** `pages/entity-details/components/bilateral-results-review/` and `EntityDetailsComponent` are unrouted dead code.
- **Decision:** Delete only `pages/bilateral-results/` shell pieces this spec replaces; record the dead banner as a follow-up.
- **Reversion challenge:** removing `indicators-sidebar` removes per-center counts → preserved as popover option counts (derived from `tableResults`) and the Contributing centers KPI; removing the sidebar also removes the only CLARISA code → acronym lookup that `?center=` needs → the page rebuilds that map from `CentersService` (judgment-day JB-7); removing the filter drawer removes temp/apply semantics → replaced by immediate-apply multiselects, consistent with siblings.
- **Consequences:** a small dead-code cleanup remains for a later `/akili-quick`.

### `BRT-DD-7` — Not phase-scoped (parity)
- **Context:** neither endpoint is phase-scoped; the scout flagged `versionId` as an available but unused filter.
- **Decision:** keep parity with the legacy page and the badge endpoint; do not send `versionId`.
- **Alternatives:** send the shell's phase (would desynchronize list and badge unless the count endpoint also grows a phase filter — a server change, out of scope).
- **Consequences:** follow-up candidate once product decides whether review queues are per cycle.

---

## 13. Open Gaps & Follow-ups

- Promote the tab to a Smart Back known origin if "See result" ever navigates to result-detail instead of the drawer.
- Delete the unrouted `EntityDetailsComponent` + `bilateral-results-review` banner (`/akili-quick`).
- Phase scoping of the review queue (server + client) if product asks for per-cycle queues.
- Visual parity and gradient contrast are HITL-only gates (accepted risk recorded in `requirements.md` §11).

---

## 14. Budget (Step 2.4 sizing)

| Number | Estimate | Basis |
|---|---|---|
| Tasks | 8 | §6.2 decomposition (band · count/access services · page shell + toolbar/chips/KPIs · table · relocation + drawer wiring · routing/redirect/links/smart-nav · tests/CT · guide + cleanup) |
| Source LOC | ~1,200 **added** (≈ 600 net after ~600 deleted legacy lines) | page ts 300 + html 320 (KZ-REH-1: state-rich Tailwind template counted at 2× the "one component" guess) · kpis 90 · table 240 (grouped + flat) · services 130 · band + guide service 80 · routing/links/returnTab 50. The tripwire below is measured on **added** source LOC |
| Test LOC | ~1,900 | KZ-REH-1 seventh recurrence: tests ≈ 1.6× source; CT ~350 |
| Review rounds | ≤ 1 per task (pre-approved mode; a second FAIL escalates) | `feedback-pragmatic-akili-execution` |

Matches Standard depth. Tripwire for `/akili-execute`: stop and escalate if **added** source LOC exceeds ~1,500 or any task needs a third attempt.

---

## Required cross-references

- `requirements.md` (same folder) · `proposal.md`.
- `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-results/AGENTS.md` (legacy contract being replaced; its drawer guide moves with the drawer).
