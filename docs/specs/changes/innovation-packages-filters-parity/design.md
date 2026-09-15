# Innovation Packages — Filter & Toolbar Parity — `design.md`

Links: `docs/specs/changes/innovation-packages-filters-parity/requirements.md` (same folder) · `docs/prd.md` `US-P3` · `docs/ux-ui/design.md` §6/§8 · `onecgiar-pr-client/CLAUDE.md` §5.

## 1. Summary

Rebuild the Innovation Packages list toolbar as a signal-backed component that mirrors Results Center's `results-list-filters` toolbar: a primary filter row (Program, Phase, Package status — all multiselect, applied live) plus a "More filters" popover (Center, Portfolio) and a removable filter-chip row. This is a **client-only** change — no server endpoints, entities, or migrations are touched. The biggest constraint: two of the three secondary facets Results Center offers (Submitter-as-secondary, Funding source) have no IPSR equivalent and are deliberately excluded rather than faked; a third candidate facet (Core innovation) is dropped entirely because the underlying data doesn't exist in a filterable shape (see `requirements.md` `IPSR-OQ-1`, resolved).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched (all under `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/`):**
  - `innovation-package-list.component.ts` / `.html` — minor: no structural change, still hosts `<app-ipsr-list-filters>` in the same place
  - `components/ipsr-list-filters/` — rebuilt (component + template + styles)
  - `services/ipsr-list-filter.service.ts` — rewritten from a plain chip-array object to a signal-based state service
  - `components/innovation-package-custom-table/pipes/innovation-package-list-filter.pipe.ts` — extended filtering logic (kept as a pipe; see DD-1)
- **Existing API method reused (no new endpoints):** `ApiService.resultsSE.GET_ClarisaPortfolios()` — already implemented and consumed by Results Center; this design is its second consumer, not a new capability. (`GET_AllCLARISACenters()` was originally scoped in alongside it but is unused by this spec — see `IPSR-DD-3`, revised.)
- **No server modules touched.** `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts` is read-only reference context (confirms `core_innovation` doesn't exist on the list query); nothing there changes
- **No external integrations touched** beyond the two existing CLARISA-backed endpoints above (already production-used by RC, so no new integration risk)

### 2.2 Interaction flow (primary filter row — applied live)

```
[User selects Program/Phase/Status in the primary row]
  └── IpsrListFilterService.selected{Program,Phases,Status} signal updated directly (no popover, no Apply button)
        └── Filtered list computed signal recalculates (component-level `computed()`
            wrapping InnovationPackageListFilterPipe's logic, or the pipe itself if kept impure — see DD-1)
              └── Table re-renders via `[tableData]` binding, same as today
```

### 2.3 Interaction flow ("More filters" popover — Portfolio)

Mirrors Results Center's temp-then-apply staging exactly, to keep the interaction model consistent across the app and avoid a filtered-list re-render on every checkbox click inside the popover:

```
[User opens "More filters"]
  └── tempPortfolio signal seeded from current selectedPortfolio
[User toggles options inside the popover]
  └── only temp signals mutate — no filtering happens yet
[User clicks Apply]
  └── temp → selected copy, popover closes, filtered list recalculates once
[User clicks Cancel / clicks outside / presses Escape]
  └── temp discarded, popover closes, no filter change
```

---

## 3. Data Model Changes

**None.** No entity, column, or migration changes. This is purely a client-side filtering feature over data the list endpoint (`GET /api/ipsr/all-innovations` → `IpsrController.allInnovationPackages`) already returns.

---

## 4. API Surface

**No new or changed endpoints.** One already-existing endpoint gains a second caller:

| Endpoint | Already used by | New caller |
|---|---|---|
| `GET_ClarisaPortfolios()` | Results Center (`clarisaPortfolios`) | Innovation Packages "More filters" → Portfolio |

`GET_AllCLARISACenters()` is not called by this design — Center was descoped (`IPSR-DD-3`, revised).

Package status is **not** fetched from `GET_allResultStatuses()` (RC's source) — see DD-2 for why it's derived client-side instead. No bilateral/platform-report payload is touched.

---

## 5. Server Workflow / Business Rules

N/A — no server-side business logic changes. `IpsrRepository.getAllInnovationPackages` continues to run exactly as today; its already-scaffolded but unwired sibling `getAllInnovationPackagesFiltered(filters, pagination)` (with `statusId`/`portfolioId`/`submitterId` params) is **not** adopted by this design — see Open Gaps §13.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routing changes. `app-ipsr-list-filters` keeps its existing mount point inside `innovation-package-list.component.html` (between the action buttons and the table), preserving `requirements.md`'s placement requirement implicitly (it's already correctly placed — only its internals change).

### 6.2 Components & services

**`IpsrListFilterService` (rewritten):**

- Replaces the `filters.general[0/1]` chip-array-with-`selected`-flags model with explicit signals: `programOptions`, `selectedPrograms`, `phaseOptions`, `selectedPhases`, `statusOptions`, `selectedStatus`, plus a secondary-facet pair `portfolioOptions`/`selectedPortfolios` and its `temp*` popover counterpart. (A `centerOptions`/`selectedCenters` pair was originally scoped in here too but was removed during execution — `IPSR-DD-3`, revised — because IPSR list rows carry no center field.)
- `programOptions` is derived from `api.dataControlSE.myInitiativesListIPSRByPortfolio` (the same source the page already reads for `initsSelectedJoinText`/`deselectInits()`), reshaped to the `{official_code, displayName}` shape RC uses for its Program filter — no new data source, just a new projection.
- `phaseOptions` is derived from `PhasesService.phases.ipsr`, reshaped via a new `buildIpsrPhaseOptions()` helper that mirrors RC's `buildPhaseOptions()` (adds the `(Open)`/`(Closed)` label suffix) instead of the current bare `{attr, selected, name, id}` shape `PhasesService` writes directly into the old service today. `PhasesService`'s direct-write into the filter service's array is removed; the filter service now owns its own derivation, keeping `PhasesService` a pure data source (matches its role for every other consumer).
- `statusOptions` is a `computed()` over `ipsrDataControlSE.ipsrResultList` — the distinct set of `status` strings already present in the loaded rows (see DD-2), not a separate API fetch.
- `portfolioOptions` is populated on component init the same way RC populates it (a one-time fetch on `ngOnInit`, same as `getClarisaPortfolios()` in `results-list-filters.component.ts`).
- Retains `filterJoin`-equivalent bump-counter semantics only if a consumer still needs change detection nudging; Angular signals make this largely unnecessary — drop it unless a spec-time check in `/akili-execute` finds a real need (flag as a task-time judgment call, not a blocking design decision).

**`app-ipsr-list-filters` (rebuilt):**

- Template restructured to the RC shape: `.ip-toolbar` → `.ip-filter-bar` (search input, Program multiselect, Phase multiselect, Status multiselect, "More filters" button) → `.ip-more-panel` (Portfolio, Apply/Cancel) → `.ip-meta-row` (chips + "Clear all" + existing Download button, unchanged).
- Reuses the same `app-pr-filter-multiselect`-equivalent control RC uses if it's a shared/Spartan-composable component; if it turns out to be local to the `results` module, `/akili-execute` should promote it to `shared/components/` rather than duplicate it into `ipsr` — record this choice at task time based on the component's actual location (not yet confirmed; a task should check before either promoting or duplicating).
- `filterChipGroups` computed signal built the same way as RC's — one group per active facet (Program/Phase/Status/Portfolio), each chip removable by reference, "Clear all" resets every signal to empty.
- Download/export button and its click handler (`onDownLoadTableAsExcel`) are unchanged in logic; only the filter values it reads (`onFilterSelectedInits()`/`onFilterSelectedPhases()`) are re-pointed at the new signals instead of the old `filters.general[...]` arrays.

**`InnovationPackageListFilterPipe` (extended, not replaced — DD-1):**

- Gains `filterByStatus`, `filterByPortfolio` methods alongside the existing `filterByInits`/`filterByPhase`/`filterByText`, each reading the new service signals instead of the old chip arrays. (A `filterByCenter` method was originally scoped in here too but was removed during execution — `IPSR-DD-3`, revised.)
- `combineRepeatedResults` (dedupe by `result_code`) is unchanged.

### 6.3 Design system usage

- **Tailwind utilities only** for all new toolbar markup, per `onecgiar-pr-client/CLAUDE.md` §5 hard rule — no new `.pr-*`/`.ip-*` SCSS blocks beyond `:host` box setup if truly needed. The RC reference component (`results-list-filters.component.scss`) predates full enforcement of this rule; new IPSR code should not copy its SCSS, only its visual result.
- Tokens: `--pr-color-primary-*` for active/selected states, `--pr-color-secondary-*` for chrome, per `docs/ux-ui/design.md` §7 (noting client CLAUDE.md is authoritative on the *mechanism* — Tailwind utilities referencing the same CSS vars, not new SCSS).
- Responsive: desktop-first, tablet must remain usable — same requirement RC's toolbar already satisfies; verify the IPSR rebuild at the same breakpoints during the browser-verification step (`requirements.md` Defect Coverage table already flags this as a manual, non-automatable check).
- A11y: labelled controls, visible focus rings, `Escape` closes the "More filters" popover — same as RC's existing `@HostListener('document:click')` / `Escape` pattern, reused verbatim in the new component.
- i18n: filter labels ("Program", "Phase", "Package status", "More filters", "Clear all") are checked against `terminology.config.ts` first; if no P22/P25 split applies (Innovation Packages are P25-only), a plain string constant is acceptable per existing IPSR page conventions — no new `TermKey` required unless the wording turns out to already exist as one (reuse, don't duplicate).

### 6.4 Real-time / notification UX

N/A — no socket/Pusher events involved in filtering.

---

## 7. Security & Authorization

No change. The list endpoint's existing JWT/role gating is untouched; filtering is a pure client-side view concern over already-authorized data. No new input reaches the server (no new request payloads), so no new DTO/validation surface.

---

## 8. Performance & Capacity

No new network calls on filter interaction (client-side filtering preserved, per `requirements.md` NFR). One new one-time fetch on page load (`GET_ClarisaPortfolios`) — a cheap, cached catalog call already paid for by Results Center's initial load elsewhere in the app; negligible added cost. No Lambda cold-start or bundle-size concern (no new heavy dependency).

---

## 9. Observability

No new structured logging needed — this is a pure UI interaction feature with no server round-trip to instrument. If `centerOptions()`/`clarisaPortfolios()` calls fail, surface the same error handling pattern RC already uses (silent fallback to empty options list, not a blocking error) rather than inventing new error UX.

---

## 10. Testing Plan (forward-looking)

- **Unit (Jest, client):** `IpsrListFilterService` — signal derivation (`programOptions`, `phaseOptions`, `statusOptions` computed correctly from source data), chip-group computed logic, apply/cancel temp-staging behavior for the More-filters popover.
- **Unit (Jest, client):** `InnovationPackageListFilterPipe` — each new `filterBy*` method, plus the existing ones re-verified against the new signal sources (regression coverage).
- **Component (Jest, client):** `ipsr-list-filters.component.spec.ts` — chip removal (single vs. "Clear all"), popover open/cancel/apply, `Escape` closes popover.
- **Manual/browser (not automatable — see `requirements.md` Defect Coverage):** side-by-side visual comparison against Results Center's toolbar; keyboard-only pass through all new controls.
- **Coverage:** client thresholds (50/60/60/60) must not regress; new service/pipe logic is exactly the kind of code that raises coverage, so this change should net-improve the module's numbers.

---

## 11. Backwards Compatibility & Migration Plan

- No database or API contract change — nothing to migrate.
- No feature flag needed; this ships as a direct replacement of the old toolbar (no dual-toolbar rollout requested or justified for a page with moderate traffic).
- No backfill.
- No downstream consumers to notify (filter state is page-local).

---

## 12. Design Decisions (ADRs)

### `IPSR-DD-1` — Keep `InnovationPackageListFilterPipe` as an (extended) impure pipe rather than migrating to a `computed()`-driven filtered signal

- **Context:** Results Center's actual filtering execution is server-side (`buildReportingListFiltersPayload()` triggers a fresh `GET_reportingList` call); Innovation Packages filters an already-fully-loaded in-memory list, so there's no RC precedent to copy 1:1 for *this* part.
- **Decision:** Extend the existing `pure: false` Angular pipe with the new `filterBy*` methods, keeping the current filtering mechanism (pipe re-evaluated on change detection) rather than refactoring to a service-level `computed()` signal.
- **Alternatives considered:** (a) Replace the pipe with a `computed()` signal on `IpsrListFilterService` or the component — more idiomatic for the Angular-21-signals direction the codebase is moving, and easier to unit-test in isolation from the DOM, but a strictly larger diff that also touches `innovation-package-list.component.html`'s `[tableData]` binding and risks regressing the existing dedupe (`combineRepeatedResults`) behavior for no functional gain this spec requires. (b) Move filtering server-side via the already-scaffolded `getAllInnovationPackagesFiltered()` — correctly-sized for a future performance spec, but out of scope here (no backend changes committed in `requirements.md` §3).
- **Consequences:** Slightly less idiomatic than a full signals refactor, but minimizes diff size and regression risk, matching the Standard-depth budget (§ below). The `computed()` migration is recorded as a follow-up in §13, not silently dropped.

### `IPSR-DD-2` — Derive Package status options from the loaded list, not a dedicated `GET_allResultStatuses()` call

- **Context:** RC fetches a canonical status catalog via a dedicated endpoint. IPSR already has the full row set in memory with a `status` string per row (`status` comes from a real FK join to `result_status` server-side — confirmed bounded, not free text).
- **Decision:** `statusOptions` is a `computed()` over the distinct `status` values already present in `ipsrDataControlSE.ipsrResultList`.
- **Alternatives considered:** Call `GET_allResultStatuses()` like RC — gives a complete catalog even for statuses not currently present in the loaded list (e.g., a status no package currently holds), but adds a new network dependency and a value set that could show filter options yielding zero results, which is arguably worse UX than "only show statuses that exist right now."
- **Consequences:** Filter option list is always non-empty and always meaningful (every option yields ≥1 result), at the cost of not matching RC's exact data-sourcing mechanism. Acceptable given the underlying values are already confirmed bounded/consistent (FK-joined), not a data-quality risk.

### `IPSR-DD-3` — Exclude Submitter, Funding source, AND Center from the "More filters" popover; include only Portfolio

- **Context:** RC's "More filters" popover has four facets (Portfolio, Center, Submitter, Funding source) plus "My activity" checkboxes. IPSR has no Funding-source concept surfaced anywhere in the IPSR module, and "Submitter" in IPSR is synonymous with the primary-row "Program" filter (both key off `official_code`/initiative) — a secondary Submitter facet would be a confusing duplicate of the primary filter, not a distinct capability.
- **Decision (REVISED during `/akili-execute`, `IPSR-T-3`/`IPSR-T-5` Pivot, 2026-09-14):** IPSR's "More filters" popover ships with **Portfolio only** — no Submitter, no Funding source, no "My activity" checkboxes, and **no Center**. Center was originally scoped in alongside Portfolio (both assumed to "already have real, wireable data" per `IPSR-OQ-2`'s resolution), but execution-time investigation (`IPSR-T-3` Reviewer, confirmed independently against `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts`) found `IpsrRepository.getAllInnovationPackages`'s SELECT list contains **zero** center-related columns under any name — Innovation Package list rows carry no center field at all. A Center filter built on this data would render and accept a selection but silently return zero results for any selection made, in production. This mirrors `IPSR-OQ-1`'s Core-innovation descope exactly: same failure shape (assumed list-row field turns out not to exist), same resolution (descope, don't invent a client-side workaround, don't add a backend join in this spec).
- **Alternatives considered:** Match RC's popover 1:1 including placeholder/disabled Submitter and Funding-source rows — rejected as UI clutter with no function, contradicting the intent of the change ("same filters" was about *capability* parity, not slot-for-slot duplication of facets that don't apply). For Center specifically: (a) add a backend join now — rejected, explicit scope violation of `requirements.md` §3 ("Backend/API contract changes... not delivered here"); (b) ship the non-functional Center control anyway and fix later — rejected, ships a known-broken filter, worse UX than omitting it; (c) **descope Center, Portfolio-only popover — chosen**, approved by the user at the `/akili-execute` Pivot checkpoint.
- **Consequences:** The popover is intentionally asymmetric with RC's — smaller, IPSR-appropriate, and now single-facet (Portfolio only). This is called out explicitly so a future reviewer doesn't "fix" it back toward RC's exact facet count or reintroduce Center without a backend change. **Follow-up:** a future spec could add Center filtering once `IpsrRepository` gains a center-identifying join (see §13 Open Gaps).

### `IPSR-DD-4` (reversion challenge — Step 2.3) — Replacing the single-active-chip toggle with multiselect

- **What's being reverted:** Today, selecting a new Submitter/Phase chip deselects the previous one (`onSelectChip`, `cleanAllFilters`) — a single-active-filter constraint. The new design allows multiple simultaneous selections per facet (`requirements.md` `IPSR-R-1`/`IPSR-R-2`, explicitly a MODIFIED requirement).
- **Challenge asked:** "What does removing the single-active constraint break?"
- **Answer:** Nothing observed relies on "only one active at a time" as a feature — it reads as an artifact of the original chip-toggle implementation, not an intentional constraint (no requirement, design doc, or code comment asserts users should be prevented from viewing multiple initiatives/phases at once; RC itself already allows multi-select on the equivalent facets with no reported issue). The one behavior that must be explicitly preserved: **empty selection means "no filter, show all"** — same semantic as today's "All results" cleanAll chip — the new multiselect's empty-array state must map to the unfiltered list, not to "zero results," matching `IpsrListFilterService`'s current `cleanAllFilters()` intent.
- **Outcome:** No design change required; the empty-selection-means-unfiltered rule is written into §6.2 implicitly via the `filterBy*` methods (each already returns the full list unmodified when its selection is empty, per the existing pipe's pattern for `filterByPhase`/`filterByInits`) and should be asserted explicitly in `IPSR-TEST-*` tasks.

---

## Budget (Step 2.4 sizing check)

| Signal | Estimate |
|---|---|
| Expected tasks | 7–8 (service rewrite, component/template rebuild, pipe extension, Center/Portfolio wiring, chip+popover interaction, Jest specs, manual browser verification) |
| Expected LOC | ~500–650 (service ~150, component+template ~200, pipe ~70, styles/Tailwind ~60, tests ~150–200) |
| Expected review rounds | 1–2 |

This matches the **Standard** depth chosen in `requirements.md` — no signal to downgrade to Lite (multiple new facets, a new popover interaction, and cross-cutting service rework exceed a "narrow UI tweak") or upgrade to Full (no data/API/auth/migration surface). If `/akili-execute` actuals exceed ~650 LOC or 8 tasks materially, the Leader should stop and escalate per the tripwire rule rather than continue silently.

---

## 13. Open Gaps & Follow-ups

- **Server-side filtering migration.** `IpsrRepository.getAllInnovationPackagesFiltered()` already exists, unwired, with `initiativeCode`/`versionId`/`submitterId`/`resultTypeId`/`portfolioId`/`statusId` params — a natural home for this filtering logic if the Innovation Packages list ever grows large enough that full client-side loading becomes a performance problem. Deliberately not adopted here (out of scope, no backend changes committed) — flagged for a future perf-driven spec.
- **`computed()` signal migration for the filter pipe** (see `IPSR-DD-1`) — a reasonable follow-up once the team is doing a broader signals modernization pass on the IPSR module, not bundled into this change.
- **Shared multiselect component location** — `/akili-execute` must confirm whether RC's filter-select control is already shared or `results`-module-local before either reusing or duplicating it (see §6.2); if local, promoting it to `shared/components/` is a small, low-risk addition worth doing in the same PR rather than duplicating markup.
- **Center filtering** — descoped during execution (`IPSR-DD-3`, revised 2026-09-14): `IpsrRepository.getAllInnovationPackages` has no center-identifying column. A future spec could add one (e.g. via the initiative→center relationship, or a new join) and re-introduce the Center facet this spec removed.
- **Accessibility and visual-parity verification** have no automated gate in this repo (see `requirements.md` Defect Coverage) — accepted risk, mitigated by a manual pass at the `/akili-execute` HITL checkpoint.

---

## Required cross-references

- `docs/specs/changes/innovation-packages-filters-parity/requirements.md` (same folder)
- `docs/prd.md`, `docs/ux-ui/design.md` §6/§8, `onecgiar-pr-client/CLAUDE.md` §5
- No bilateral/platform-report doc — not touched by this spec
