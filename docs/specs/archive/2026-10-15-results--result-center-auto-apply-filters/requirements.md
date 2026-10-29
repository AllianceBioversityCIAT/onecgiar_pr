# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `results`
- **Sub-feature:** `result-center-auto-apply-filters`
- **Owner:** Platform Dev Team
- **Status:** `draft`
- **Ticket(s):** TBD

---

## 2. Context

**Naming correction (verified in code):** the user-facing request called this page both "Result Center" and "Resource Center." Neither spelling exists in the codebase. `grep -rli "resource center"` under `onecgiar-pr-client/src` returns zero hits; the actual nav label is **"Results Center"** (`onecgiar-pr-client/src/app/shared/routing/routing-data.ts:14` → `prName: 'Results Center'`; confirmed again in `reporting-nav-sidebar.component.ts:206`). This spec uses "Results Center" throughout.

**What exists today (verified by reading the component, not assumed):** Results Center's filter toolbar is one component, `ResultsListFiltersComponent` (`onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/components/results-list-filters/results-list-filters.component.ts`). It already renders its 7 filter dropdowns (Program, Phase, Indicator category, Status, Portfolio, Center, Funding source) plus 2 "My activity" checkboxes through **one shared template**, `#filterFields` (`results-list-filters.component.html:232-329`), reused in two layouts:

- **`menu`** (today's default, floating popover) — every field's `(changed)`/`(ngModelChange)` handler calls `onFilterFieldChanged()` (`.ts:818-821`), which only commits the pending (`temp*`) signals into the applied `ResultsListFilterService` signals when `isSidebarLayout()` is true. In `menu` layout it is false, so nothing is applied until the popover's **Apply** button (`.html:63`, calls `applyFilters()` at `.ts:824-828`) is clicked. **Cancel** (`.html:62`, calls `cancelFilters()` at `.ts:843-847`) discards the pending picks back to the last-applied values.
- **`sidebar`** ("Filters in a side column," toggled via the icon button at `.html:84-93`, `setFilterLayout()` at `.ts:812-816`) — the exact same fields render in the parent page's side column (`#filterSidebar` template, `.html:217-230`, mounted by `results-list.component.html:171`), and because `isSidebarLayout()` is now true, `onFilterFieldChanged()` commits on every single change. **No Apply/Cancel buttons exist in this layout** — they were never built for it (`.html:21` wraps the whole popover, including its footer buttons, in `@if (!isSidebarLayout())`).

The default layout is `menu` (`results-list-filter.service.ts:35-41,48`: `readStoredFilterLayout()` returns `'menu'` unless the browser's `localStorage['rc-filter-layout']` is explicitly `'sidebar'`). This is why most users experience Apply/Cancel-gated filtering: they have never toggled the side-column view.

**Already instant, independent of layout (verified, not assumed):** removing a filter chip (`removeFilter()`, `.ts:683+`) and "Clear all" (`clearAllNewFilters()`, `.ts:653-681`) already write directly to the applied `ResultsListFilterService` signals — they do not go through `temp*`/Apply at all. The gap is isolated to the **initial selection** of a dropdown option while in `menu` layout.

**Why it updates the list automatically once applied (verified):** `results-list.component.ts`'s constructor registers two `effect()`s (`.ts:294-319`) that re-run `api.updateResultsList(...)` whenever the applied phase/text/submitter/category/createdByMe/submittedByMe signals change, and the template's `resultsListFilter` pipe (`pipes/results-list-filter.pipe.ts`) re-filters client-side on the applied status/portfolio/funding-source/center signals. Both paths are driven purely by the **applied** signals — nothing new needs to be wired for the results to update the moment a filter is applied; the only change needed is to make every `menu`-layout dropdown change **commit** to those applied signals immediately, the way `sidebar` layout already does.

Reference: `docs/prd.md` (G1 submission completeness is indirectly served by faster, friction-free result discovery for submitters/QA/PMU personas); `docs/ux-ui/design.md` §8 "Filters lists MUST use `src/styles/filters-list.scss`" (unaffected — no visual restyle here, only interaction-timing and the removal of two buttons).

---

## 3. In Scope / Out of Scope

### In scope

- Make every Results Center filter dropdown (Program, Phase, Indicator category, Status, Portfolio, Center, Funding source) and both "My activity" checkboxes apply immediately on selection/change, in **both** `menu` and `sidebar` layouts — i.e., stop gating the commit on `isSidebarLayout()`.
- Remove the **Apply** and **Cancel** buttons from the `menu`-layout filter popover (`results-list-filters.component.html:61-64`).
- Preserve the popover's existing close affordances (✕ button, outside-click, `Escape`) as pure "close the panel" actions — they no longer need to discard anything, because nothing is left pending.
- Keep chip removal and "Clear all" working exactly as today (already instant — regression-only, no new work).
- Keep the "Filters in a side column" / "Filters as a menu" layout toggle (`.html:70-94`) — it is a visual-placement preference, not an apply-timing choice, and is not mentioned in the acceptance criteria.

### Out of scope

- Any change to the `sidebar` layout's own appearance or the layout toggle's behavior.
- Any change to the IPSR (Innovation Packages) list filters (`ipsr-list-filters.component.*`) — a sibling component with its own Apply/Cancel on its secondary "Portfolio" popover. It is architecturally similar but not part of this request and is not touched.
- Any change to the server-side `GET_reportingList` / `BasicReportFiltersDto` payload shape, or to the client-side `resultsListFilterPipe` filtering logic itself.
- Any change to the free-text search box (`.html:10-16`) — it already binds directly to the applied `text_to_search` signal with no Apply step, in both layouts, today.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Selecting a Results Center filter updates the list immediately — no Apply click, no risk of forgetting to click Apply and reading stale results. |
| QA reviewer | Same instant-filter benefit when narrowing the QA-relevant result set from Results Center. |
| PMU lead | Same instant-filter benefit when scanning results across Initiatives from Results Center. |
| Platform admin | No change — this page carries no admin-only behavior. |

---

## 5. User Stories

- **`RCF-US-1`** — As a result submitter, I want Results Center filters to apply the moment I pick an option, so that I don't have to find and click a separate Apply button to see filtered results.
- **`RCF-US-2`** — As a result submitter, I want the filter panel to have no Apply/Cancel buttons, so that the interaction matches the one-step filtering I already know from the Results list's other instant filters (chips, Clear all, search).

Refines: PRD `US-S1` (capture/consume results efficiently) — this is friction removal, not a new capability.

---

## 6. Functional Requirements

### Required (MUST)

- **`RCF-R-1`** When a user selects, deselects, or changes an option in any Results Center filter dropdown (Program, Phase, Indicator category, Status, Portfolio, Center, Funding source) or either "My activity" checkbox, the system MUST apply that change to the results list immediately, with no separate confirmation step, regardless of whether the filter panel is in `menu` or `sidebar` layout.
- **`RCF-R-2`** The system MUST NOT render an **Apply** button or a **Cancel** button anywhere in the Results Center filter interface.
- **`RCF-R-3`** Removing an applied filter (chip "×") or using "Clear all" MUST continue to update the results list immediately (pre-existing behavior; MUST NOT regress).
- **`RCF-R-4`** The filter panel's existing close affordances (✕ button, outside-click, `Escape`) MUST continue to close the panel, without reverting or discarding any selection (there is nothing left to discard once `RCF-R-1` is implemented).
- **`RCF-R-5`** The "Filters as a menu" / "Filters in a side column" layout toggle MUST continue to work exactly as today; only the apply-timing gate tied to it is removed.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | No new risk: once `RCF-R-1` ships, `menu` layout fires the applied-signal writes at the same rate `sidebar` layout already does today (one write per option toggle, verified at `pr-filter-multiselect.component.ts:98-99` — `changed` emits per toggle). `sidebar` layout has shipped this rate of change with no reported performance issue; this spec does not add debouncing, since none exists today for either layout. |
| **Backwards compatibility** | The applied-signal shape, the `ResultsListFilterService` API, and the `GET_reportingList` / `BasicReportFiltersDto` payload are unchanged — only the timing of writes to already-existing signals changes. |
| **Accessibility** | The popover remains closable via `Escape` and an accessible ✕ button (`aria-label="Close filters"`) after the Apply/Cancel buttons are removed, so keyboard-only users retain a way to dismiss the panel. |
| **Consistency** | Filter interaction timing must no longer diverge between `menu` and `sidebar` layout — today's split is the defect this spec removes. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RCF-AC-1` | A submitter is on Results Center with the filter panel in `menu` layout (today's default) | They select an option in any filter dropdown (e.g., Status) | The results list updates immediately; no Apply click is required. |
| `RCF-AC-2` | A submitter has the `menu`-layout filter panel open | They look at the panel | No **Apply** button and no **Cancel** button are rendered anywhere in the panel. |
| `RCF-AC-3` | A submitter has applied one or more filters | They remove a filter chip or click "Clear all" | The results list updates immediately (unchanged from today). |
| `RCF-AC-4` | A submitter has the `menu`-layout filter panel open with filters already selected | They press `Escape`, click the ✕, or click outside the panel | The panel closes; the already-applied selections remain exactly as selected (nothing is reverted, because nothing was pending). |
| `RCF-AC-5` | A submitter switches to the "side column" (`sidebar`) layout | They select an option in any filter dropdown | Behavior is identical to `RCF-AC-1` (already true today — regression check only). |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization (unaffected — no new route/role), `AC-9` Security and secrets (unaffected).

---

## 9. Defect Classes & Verification Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| A dropdown change still requires Apply in `menu` layout (the gate not actually removed, or removed for only some of the 7 fields) | Jest: for each of the 7 filter fields + 2 checkboxes, assert `onFilterFieldChanged()` (or the field's own change path) writes the applied signal with `filterLayout() === 'menu'` and no further action. |
| Apply/Cancel buttons still present in the DOM (markup not fully removed, or re-appear under some `@if` branch) | Jest `fixture.nativeElement.querySelector(...)` assertions that `.rc-more-footer`, `.rc-btn--primary` (Apply), and `.rc-btn--ghost` (Cancel) are absent from the rendered template in `menu` layout. |
| Chip removal / Clear all regress (e.g., an edit accidentally routes them through the removed Apply gate) | Existing Jest suites for `removeFilter()` / `clearAllNewFilters()` stay green, unmodified assertions. |
| Closing the panel (✕/outside-click/Escape) starts reverting selections again, because leftover `cancelFilters()`/`syncTempFromApplied()` plumbing is still wired to a "discard" behavior that now fires on data that was never a draft | Jest: open panel, change a filter (already applied per `RCF-R-1`), close via each of the three affordances, assert the applied signal still holds the new value (not the pre-change value). |
| Visual/layout regression in the popover or the side column from removing the footer | No automated gate for visual layout (jsdom cannot assert rendered layout). **Accepted as a human-check gap** — verify at the manual QA step (`task.md` §6) in a real browser, both layouts, before merge. |

Every class above has an automated Jest gate except the visual-layout class, which is explicitly named as a human-check substitute rather than silently uncovered.

---

## 10. Dependencies & Assumptions

### Upstream dependencies

- `ResultsListFilterService` (`results-list-filter.service.ts`) — holds every applied filter signal this spec writes to earlier. No change to the service itself is required.
- `app-pr-filter-multiselect` (`shared/components/pr-filter-multiselect/`) — the shared dropdown control; its `(changed)` output already fires per-option-toggle. No change required.

### Downstream consumers

- `results-list.component.ts`'s two `effect()`s (`.ts:294-319`) and the `resultsListFilter` pipe (`pipes/results-list-filter.pipe.ts`) — both already react to the applied signals this spec starts writing sooner. No change required to either.
- Any other reader of `ResultsListFilterService`'s applied signals or of `ResultsListFiltersComponent`'s public `applyFilters()`/`cancelFilters()` methods. A repo-wide grep for external callers of these two methods found none outside this component's own template and spec (`grep -rn "applyFilters(\|cancelFilters("` across `onecgiar-pr-client/src` — the only other hits are the unrelated, sibling `IpsrListFiltersComponent` / `IpsrListFilterService`, out of scope per §3). `design.md`'s Premise Ledger carries this as a verified row.

### Assumptions

- The popover's close affordances (✕, outside-click, `Escape`) are sufficient UX for dismissing the panel once Apply/Cancel are gone — no replacement "Done" button is required by the acceptance criteria, and none is added.

---

## 11. Open Questions

- `RCF-OQ-1` Should the stale code comment at `.ts:818` ("Side column behaves like a shop's filter rail: each change applies at once") be corrected now that both layouts behave this way? (Recommendation in `design.md`: yes, one-line fix, zero behavioral risk — resolved there, not blocking.)

---

## Required cross-references

- `docs/prd.md`
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
