# Innovation Packages — Filter & Toolbar Parity — `requirements.md`

## 1. Module / Feature

- **Module:** `ipsr` (Innovation Packages list — `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/`)
- **Sub-feature:** List-page filter toolbar
- **Owner:** Frontend (client team)
- **Status:** draft
- **Ticket(s):** none provided
- **Depth:** Standard (frontend-only enhancement; no data model, API, auth, or migration surface)
- **Approval Mode:** gated (inherited from `proposal.md`)

---

## 2. Context

The Innovation Packages list is one of two places in PRMS where users browse a catalog of results (the other is the **Results Center**, `pages/results/pages/results-outlet/pages/results-list`). Results Center was recently rebuilt (`results-list-filters.component.html`) with a modern toolbar — Program/Phase/Indicator category/Status dropdowns, a "More filters" popover, and removable filter chips, all backed by a signal-based `ResultsListFilterService`.

Innovation Packages never received the same rebuild. It still runs the legacy pattern: two chip-toggle facets (Submitter, Phase), both single-select, filtered entirely client-side in `InnovationPackageListFilterPipe`. There is no way to filter by Program (in RC's terminology), by package status, or by core innovation — exactly the gap the user (screenshot `Image #32`) reported.

This spec touches the **listing screen pattern** in `docs/ux-ui/design.md` §6 ("Filter strip at top… server-side filters, paging") and §8 rule 4 ("Filters lists MUST use `src/styles/filters-list.scss`") — both authored before the current Tailwind/Spartan stack landed; `onecgiar-pr-client/CLAUDE.md` supersedes them on styling mechanics (Tailwind-first, no new SCSS blocks) while the *pattern* (filter strip + table) still holds. It refines `docs/prd.md` **US-P3** ("As a PMU lead, I want to manage IPSR pathways… so that innovation packages are reported coherently") by making the existing catalog of packages actually searchable/filterable at scale, and supports **G1** (submission completeness) indirectly — a lead cannot track what they cannot find.

---

## 3. In Scope / Out of Scope

### In scope

- Rebuilding the Innovation Packages list toolbar to match Results Center's toolbar **shape and placement**: primary filter row + "More filters" popover + removable filter chips row, positioned in the same place (directly under the page header/action buttons, above the table)
- Adding **Program** (initiative), **Phase** (multi-select), and **Package status** filters
- Adding a **Core innovation** filter IF the confirmed data shape supports a bounded option set (see Open Questions — this is a conditional scope item)
- Extending `IpsrListFilterService` and `InnovationPackageListFilterPipe` (or their signal-based replacements) to support the new facets
- Preserving existing behavior: free-text search, Excel export, admin deselect-inits flow, P25 phase gating (`ipsrReportingEnabled`)

### Out of scope

- Any change to the Results Center toolbar itself (reference only, not modified)
- Innovation Package detail/creator flows
- Backend/API contract changes — if a facet's option catalog isn't available client-side today, this spec accommodates it from existing payload fields only; a new endpoint or query param is an explicit follow-up, not delivered here
- Moving filtering from client-side to server-side (flagged as a possible future optimization in `proposal.md` §12, not committed here)
- P22 legacy portfolio parity — Innovation Packages are P25/IPSR scoped only, no P22 equivalent exists

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can now filter their own Innovation Packages by status/program instead of scrolling/searching by text only |
| PMU lead | Can filter the full Innovation Packages catalog by program, phase, and status to track portfolio progress (US-P3) |
| Platform admin | Same filter set available when reviewing all packages across initiatives |

---

## 5. User Stories

- **`IPSR-US-1`** — As a PMU lead, I want to filter Innovation Packages by Program (initiative), so that I can see only the packages relevant to my portfolio without scanning the full list.
- **`IPSR-US-2`** — As a result submitter, I want to filter Innovation Packages by Package status, so that I can quickly find packages still in "Editing" vs already submitted.
- **`IPSR-US-3`** — As any user of the list, I want to filter by multiple phases at once (not just one), so that I can compare packages across reporting cycles the way I already can on the Results Center.
- **`IPSR-US-4`** — As any user, I want to see my active filters as removable chips and clear them individually or all at once, so that the toolbar behaves consistently with the rest of the app.

Refines `docs/prd.md` **US-P3**.

---

## 6. Functional Requirements

### Required (MUST)

- **`IPSR-R-1`** The system MUST provide a Program (initiative) multiselect filter on the Innovation Packages list, applied live (no separate "Apply" step) to match Results Center's primary-row Program filter behavior.
- **`IPSR-R-2`** The system MUST provide a Phase multiselect filter (replacing the current single-select phase chip toggle), so multiple phases can be active simultaneously.
- **`IPSR-R-3`** The system MUST provide a Package status multiselect filter, using the same `status` values already rendered in the table's Status column.
- **`IPSR-R-4`** The system MUST render active filters as chips below the primary filter row, each individually removable, with a single "Clear all" action — matching `results-list-filters.component.html`'s `.rc-meta-row` / chip pattern.
- **`IPSR-R-5`** The system MUST preserve free-text search (title/code) exactly as it works today (`filterByText` over `full_name`).
- **`IPSR-R-6`** The system MUST preserve the existing Excel export flow (`onDownLoadTableAsExcel`) and its current column set, unaffected by the new filter UI.
- **`IPSR-R-7`** The system MUST preserve the admin "deselect all initiatives on load" behavior (`deselectInits()` / `ngOnDestroy` restore) under the new filter model.
- **`IPSR-R-8`** The system MUST preserve P25 phase-gating (`ipsrReportingEnabled`, `checkIpsrReportingAccess`) — filter changes MUST NOT alter which action buttons are enabled.

### Should (SHOULD)

- **`IPSR-R-10`** The system SHOULD provide a "More filters" popover for secondary facets (candidates: Submitter, Center, Portfolio) mirroring Results Center's `.rc-more-panel`, scoped to whichever secondary facets have real IPSR data support.
- ~~**`IPSR-R-11`** The system SHOULD provide a Core innovation filter~~ — **DESCOPED.** `IPSR-OQ-1` is resolved (see §10): `core_innovation` does not exist on the list query (`IpsrRepository.getAllInnovationPackages`) at all. Server-side, "core innovation" names a different concept — the linked core result fetched separately in the pathway-step-3 detail flow (`innovation-pathway-step-three.service.ts`), not a per-row list field and not a bounded lookup value. Adding this filter would require a new backend field/join, which is out of scope (see §3 Out of scope). Not carried into `design.md`.

### Could / Nice-to-have (MAY)

- **`IPSR-R-20`** The system MAY reuse literal RC toolbar SCSS classes (`.rc-toolbar`, `.rc-filter-bar`, etc.) if they get promoted to a shared stylesheet; otherwise a parallel, structurally identical class namespace is acceptable.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Filtering MUST remain responsive (no visible jank) against the current in-memory list size; no new network round-trip is introduced by this spec (client-side filtering preserved). |
| **Accessibility** | New filter controls (multiselects, popover, chip removal buttons) MUST meet WCAG 2.1 AA per `docs/ux-ui/design.md` §10 — labelled controls, focus-visible states, `Escape` closes the "More filters" popover (per `onecgiar-pr-client/CLAUDE.md` Hard UI Rule #4). **jsdom-based Jest tests cannot verify rendered focus order or contrast** — this class of defect is NOT covered by an automated gate; it requires a manual keyboard-and-screen-reader pass at the Phase 3 HITL checkpoint (see §Defect Coverage below). |
| **Backwards compatibility** | Existing filter behavior (search, export) MUST NOT regress — covered by existing Jest specs on `ipsr-list-filters.component.spec.ts` / `ipsr-list-filter.service.spec.ts`, updated rather than deleted. |
| **Internationalization** | All new filter labels ("Program", "Package status", "Core innovation", "More filters", "Clear all") MUST go through `src/app/internationalization/` if they differ P22/P25-style; since Innovation Packages are P25-only today, a hardcoded but centrally-defined string constant is acceptable per existing IPSR page conventions — confirm against `terminology.config.ts` before assuming a new `TermKey` is required. |
| **Design consistency** | New toolbar MUST use Tailwind utilities per `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first hard rule) — NOT new `.pr-*`/`.rc-*`-style SCSS blocks, even though the RC reference component itself currently has SCSS (`results-list-filters.component.scss`); new IPSR code should not replicate that SCSS debt. |

### Defect Coverage (what can go wrong, and what catches it)

| Defect class | Catching mechanism |
|---|---|
| Filter logic bugs (wrong AND/OR combination, chip removal not clearing state, "Clear all" leaving stale filters) | Jest unit tests on the filter service/pipe (`IPSR-TEST-*`, see `tasks.md`) |
| Regression to existing search/export/admin-deselect/phase-gating behavior | Existing + updated Jest specs (`ipsr-list-filters.component.spec.ts`, `innovation-package-list.component.spec.ts` if present) |
| Visual/layout mismatch vs. Results Center reference (spacing, alignment, responsive breakpoints) | **No automated gate** — jsdom cannot render real layout. Requires a manual side-by-side browser check (RC page vs. IPSR page) at the `/akili-execute` HITL pause, per `onecgiar-pr-client/CLAUDE.md` §9 browser-verification guidance. |
| Accessibility (focus order, keyboard `Escape`, contrast) | **No automated gate in this repo's toolchain** (no `axe` wired into client Jest/Cypress). Recorded as an accepted risk unless the user asks to add one — manual keyboard pass recommended at the same HITL pause. |
| Wrong assumption about `core_innovation`/`status` data shape | Resolved BEFORE task execution via a manual API-response inspection task (not a test) — see `IPSR-OQ-1`. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `IPSR-AC-1` | The Innovation Packages list is loaded with packages across 3+ initiatives | The user selects two initiatives in the Program filter | Only packages belonging to those two initiatives are shown, and a "Program: X" + "Program: Y" chip pair appears |
| `IPSR-AC-2` | The list has packages across multiple phases | The user selects two phases | Packages from both phases are shown simultaneously (not just one, as today) |
| `IPSR-AC-3` | The list has packages with different `status` values (e.g., "New", "Editing") | The user selects one status | Only packages matching that status are shown |
| `IPSR-AC-4` | Program, Phase, and Status filters are all active | The user clicks the "x" on the Program chip | Only the Program filter is cleared; Phase and Status filters remain active |
| `IPSR-AC-5` | Any filters are active | The user clicks "Clear all" | All filters reset and the full list (minus any still-active free-text search) reappears |
| `IPSR-AC-6` | The admin role loads the page | The page loads | `deselectInits()` still runs and all initiatives start deselected, matching today's behavior |
| `IPSR-AC-7` | A non-admin user with no role in the active portfolio loads the page | The page loads | "Create"/"Update" buttons remain disabled per `ipsrReportingEnabled`/`activeButtons`, unaffected by the new filter toolbar |
| `IPSR-AC-8` | The user has applied filters and clicks Download | The exported Excel file is generated | Column set and row content match today's export logic (`onDownLoadTableAsExcel`), scoped by the currently-applied filters exactly as `onFilterSelectedInits()`/`onFilterSelectedPhases()` do today |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization (admin gating unaffected), `AC-9` Security and secrets (no new data exposure).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `IpsrDataControlService.ipsrResultList` — the in-memory list this spec filters (no change to how it's populated)
- `ApiService.resultsSE.GETAllInnovationPackages()` — existing endpoint, assumed to already return `status`, `official_code`, and (unconfirmed) `core_innovation`-equivalent fields per row

### Downstream consumers

- None outside this page — the filter state is local to the Innovation Packages list

### Assumptions

- The full Innovation Packages list already fits comfortably in client memory today (current architecture fetches everything unfiltered) — this spec does not change that assumption
- `results-list-filters.component.html` (Results Center) remains stable during this spec's implementation window (no concurrent RC toolbar rework in flight — confirmed: no active spec found under `docs/specs/` touching `results-list-filters`)

---

## 10. Open Questions

- ~~**`IPSR-OQ-1`**~~ — **RESOLVED (design-phase investigation).** `core_innovation` is absent from `IpsrRepository.getAllInnovationPackages` / `getAllInnovationPackagesFiltered` (`onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts`) entirely — no column, alias, or join. The only server-side `core_innovation` concept lives in `innovation-pathway-step-three.service.ts` (a linked core result fetched per-package-detail, not a list-row field). Result: `IPSR-R-11` is descoped (see §6).
- **`IPSR-OQ-2`** — **RESOLVED (design-phase investigation).** No IPSR-side equivalent of RC's `centerOptions()`/`clarisaPortfolios()`/dedicated `statusOptions()` exists today — `IpsrDataControlService` and `IpsrListFilterService` carry none of these catalogs. The underlying API endpoints (`GET_AllCLARISACenters()`, `GET_ClarisaPortfolios()`) already exist and are used by Results Center, so wiring them into the IPSR list is a frontend-only addition (no backend change). Package status is instead derived client-side from the already-loaded `ipsrResultList` (see `design.md` DD) rather than a new dedicated status endpoint call, to avoid an unnecessary new network dependency. Full resolution and facet list are recorded in `design.md`.

---

## 11. Out-of-Band Notes

None — this is a self-contained, additive spec with no cross-spec coordination or rollout flag needed.

---

## Required cross-references

- `docs/prd.md` — `US-P3`, `G1`
- `docs/ux-ui/design.md` — §6 Listing screens, §8 Component Inventory rule 4 (superseded on styling mechanics by `onecgiar-pr-client/CLAUDE.md` §5 Tailwind-first rule)
- `docs/trd/trd.md` — no entity/endpoint changes; module reference only (`ipsr` client module)
- `onecgiar-pr-client/CLAUDE.md` — Tailwind-first styling, Spartan component usage, i18n rule
- `docs/specs/changes/innovation-packages-filters-parity/proposal.md` — approved intent this spec converts
