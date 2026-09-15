# Proposal — Results Center SP-style layout (static hero + filters, app scroll)

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `changes/results-center-sp-layout` |
| **Slug** | `results-center-sp-layout` — derived from free-text intent (align Results Center with SP web-app layout) |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | specified |
| **Author** | AKILI propose (2026-09-11) |
| **Depends on** | `changes/sp-shell-app-viewport` (shipped — `pr-viewport-page` recipe) |
| **Parallel-safe** | yes (client-only; no overlap with in-flight delete-result if scoped to layout shell) |
| **Ticket(s)** | TBD — confirm Jira if exists |

---

## Intent

Reframe **Results Center** (`/result/results-outlet/results-list`) as a first-class **web-app surface** matching the Science Program reporting UX: a **static, well-organized hero**, **static grouped filters**, **single internal vertical scroll** for the table (not document scroll), and **no page footer** on this route. This is a primary entry point for many users — clarity and spatial stability matter more than incremental polish.

---

## Problem / Current Behavior

| Area | Today (Results Center) | SP Reporting reference (user screenshots) |
|---|---|---|
| **Hero** | Flat `.rc-page-header` (title + subtitle + Columns + Export) scrolls away with the page | Tinted band: eyebrow metadata, title + info, primary CTAs — **fixed above content** |
| **Filters** | Inline row of 5 multiselects + “More filters” popover; phase chips on a second row; all scroll with page | Compact toolbar: search + Filter + quick toggles + view mode — **fixed above scroll region** |
| **Scroll** | **Document/window scroll** — entire page moves (`results-list.component.scss`, no `pr-viewport-page`) | **Locked viewport** ≥900px: frame static, `#workArea` is sole scroller (`dashboard-lab`, `SAV-*`) |
| **Footer** | Global footer **shown** on this route (`footer.component.ts` allow-list includes `/result/results-outlet/results-list`) | SP shell pages: footer absent or irrelevant because viewport fills app frame |
| **Visual density** | Functional but “legacy list page” — filters spread horizontally, table pagination at bottom of long document | Deliberate hierarchy: chrome → tools → data |

**Code anchors (confirmed in repo review):**

- Page: `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/`
- Filters: `components/results-list-filters/` — primary inline multiselects + secondary popover
- Outlet flush: `results-outlet.component.html` strips legacy card chrome for this route
- SP viewport recipe: `src/styles/_viewport-page.scss`, adopted by `programme-results`, `dashboard-lab`
- Footer gate: `footer.component.ts` lines 15–16 (Results Center on allow-list)

---

## Proposed Outcome

At **≥900px CSS width** on Results Center:

```
┌─ App shell (sidebar + topbar) — fixed ─────────────────────────┐
│ ┌─ Hero (static) ────────────────────────────────────────────┐ │
│ │ Eyebrow · Title · Columns · Export CSV · [Update result]   │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌─ Filter toolbar (static, grouped) ───────────────────────────┐ │
│ │ Search · Filter popover · active chips · Clear all         │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌─ #workArea (sole vertical scroller) ────────────────────────┐ │
│ │ Showing N of M · table · pagination                        │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
(no global footer on this route)
```

Below **900px**: graceful fallback to document scroll + optional sticky filter bar (same contract as `SAV-R-8` / `my-work-board` jumper pattern).

---

## Scope

### In scope

1. **Viewport lock** on Results Center host using existing `pr-viewport-page` mixin + `#workArea` scroller.
2. **Hero refactor** — reorganize title block and primary actions into a stable header band (tokens from `docs/ux-ui/design.md` §7–8; visual parity with SP hero *structure*, not program-specific band/tabs).
3. **Filter toolbar refactor** — move to SP-style grouped layout:
   - Search + **Filter** popover (JIRA-style panel like `programme-results` / Reporting band toolbar)
   - Active filter chips + Clear all inline
   - Secondary dimensions (Portfolio, Center, Submitter, Funding, My activity) inside popover — **preserve all current filter capabilities**
4. **Scroll behavior** — table, count line, and pagination live inside `#workArea`; hero + filter bar do **not** scroll at ≥900px.
5. **Footer removal** — remove Results Center from `footer.component.ts` allow-list; update footer spec.
6. **Tests** — viewport wiring spec (pattern: `dashboard-lab.viewport.spec.ts`); filter + layout regression tests on touched components.

### Out of scope

- Adding SP program band, tabs, or “Report emerging result” CTAs (cross-program surface).
- Changing filter **logic**, API calls, or export/delete permissions (`delete-result-action` is separate).
- Migrating Results Center from `rc-*` SCSS to full Tailwind in one pass (incremental token alignment OK).
- Removing footer globally on other routes.
- Mobile-native redesign beyond the ≥900px / <900px contract.

---

## Non-Goals

- Feature additions (new filters, columns, bulk actions).
- Backend or pagination model changes.
- Replacing `app-pr-table` or CSV export mechanics.

---

## Affected Users, Systems, And Specs

| Actor | Impact |
|---|---|
| All PRMS users landing on Results Center | Clearer hierarchy; filters always visible; no footer clutter |
| QA / portfolio leads | Stable frame while scanning long result lists |
| Developers | Aligns RC with `SAV` viewport contract; reduces one-off scroll bugs |

| System | Touch |
|---|---|
| `results-list.component.*` | Host viewport + template restructure |
| `results-list-filters.component.*` | Toolbar UX aligned to SP filter popover |
| `results-outlet.component.*` | Possible host geometry tweaks |
| `footer.component.ts` | Remove route from allow-list |
| `docs/ux-ui/design.md` | Possible deviation note (RC platform hero) |

**Related shipped specs:** `changes/sp-shell-app-viewport`, `changes/reporting-hierarchical-search-filters`, `result-framework-reporting/programme-results-created-by-filter`.

---

## Visual Reference

| Source | Location |
|---|---|
| User — SP Reporting hero + static toolbar | `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789162480944-85370e1f-60a5-4cbf-a746-b0ef716743ec.png` |
| User — Results Center current state | `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789162510786-f2c22ea1-a41f-4f45-9f7c-a3cbee456e40.png` |
| Live reference | SP Reporting: `/result-framework-reporting/entity-details/SP03?tocView=aows` |
| Live target | Results Center: `/result/results-outlet/results-list` |

No Figma provided. Recommend referencing `programme-results` filter bar and Reporting band toolbar as implementation templates during `/akili-specify`.

---

## Requirement Delta Preview

### ADDED Requirements

- **RCS-R-1:** Results Center SHALL use the `pr-viewport-page` locked-frame pattern at ≥900px with a single `#workArea` vertical scroller.
- **RCS-R-2:** Hero (title, subtitle, Columns, Export CSV, Update result) SHALL remain visible (non-scrolling) at ≥900px.
- **RCS-R-3:** Filter toolbar SHALL be grouped (search + Filter popover + chips) and remain visible (non-scrolling) at ≥900px.
- **RCS-R-4:** Global footer SHALL NOT render on `/result/results-outlet/results-list`.

### MODIFIED Requirements

- **RCS-R-5:** Filter presentation moves from five inline multiselects to SP-style popover-first layout; **all existing filter dimensions and URL/query persistence behavior preserved**.

### REMOVED Requirements

- **RCS-R-6:** Document-level vertical scroll as the primary navigation model for Results Center at desktop widths.

---

## Approach Options

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — Minimal viewport + footer only** | Add `pr-viewport-page` + `#workArea`; keep current filter HTML | Smallest diff | Does not meet user ask for hero/filter reorganization |
| **B — Viewport + static hero/filters (Reporting tab pattern)** (recommended) | Hero + filter bar outside `#workArea`; table scrolls inside; popover-first filters | Matches user screenshots and Reporting tab; filters always visible | Larger UI refactor; must preserve all filter capabilities |
| **C — Full programme-results clone** | Reuse `reporting-program-band` + programme-results filter row | Maximum visual parity inside SP | Wrong chrome for cross-program page; adds tabs/CTAs noise |

---

## Recommended Approach

**Option B** — reuse the **shipped** `pr-viewport-page` infrastructure (`SAV`) and copy **interaction patterns** from:

- **Static toolbar:** Reporting tab filter row in `reporting-program-band` (user screenshot 1)
- **Filter popover + chips:** `programme-results.component.html` filter bar
- **Platform hero:** new lightweight header component (no program band) using `--pr-surface-band` / divider tokens

Implementation sketch (for specify phase, not code here):

1. `:host { @include pr-viewport-page }` on `results-list` (SCSS only — Angular emission-order rule from `programme-results`).
2. Split template: `rc-hero` + `app-results-list-filters` **outside** `#workArea`; count + table + pagination **inside** `#workArea`.
3. Refactor `results-list-filters` to popover-first grouped layout; keep `results-list-filter.service.ts` as source of truth.
4. Remove footer route entry + update `footer.component.spec.ts`.
5. Add `results-list.viewport.spec.ts` + update filter component specs.

**Depth recommendation:** **Standard** (not Lite) — multi-surface UX, viewport contract, filter UX migration, footer behavior change.

---

## Risks, Dependencies, And Open Questions

| Risk / OQ | Notes |
|---|---|
| **OQ-1:** Jira ticket / BA acceptance criteria? | User did not cite one — confirm before specify if product gate requires it |
| **OQ-2:** Hero eyebrow content | SP shows program metadata; RC might use `PLATFORM · RESULTS CENTER` or active phase from `DataControlService` — needs PO call |
| **OQ-3:** “Update result” placement | Currently near filters; keep in hero actions or filter bar? |
| **OQ-4:** Filter static vs scroll-with-table | User asked for **static** (Reporting pattern), not programme-results Results-tab pattern — confirm if intentional |
| Row action menu + scroll | Today closes on `window:scroll`; must listen to `#workArea` scroll when locked |
| Sticky filter bar <900px | Follow `SAV-R-8` fallback; manual QA on narrow viewports |
| Regression on export, column picker, delete/update modals | Overlay anchoring must be verified inside locked host |

**Kaizen alignment:** Reuse `SAV` viewport recipe and programme-results filter popover — do not invent a third scroll model.

---

## Success Criteria

1. At ≥900px on Results Center: document does not vertically scroll; only `#workArea` scrolls.
2. Hero and filter toolbar remain visible while scrolling a long table (1999+ rows paginated).
3. All pre-change filter dimensions still reachable; chip + Clear all behavior intact.
4. Footer absent on Results Center; still present on other allow-listed routes.
5. Scoped tests green (viewport spec + filters + footer); manual QA matches user-provided SP reference screenshots.

---

## Next Step

After approval:

```text
/akili-specify changes/results-center-sp-layout
```

Recommended depth: **Standard**. Confirm OQ-1 (Jira) and OQ-2 (hero eyebrow) during specify Phase 1 if not answered here.
