# Design: Results Center SP-style layout

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-sp-layout` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Depth** | Standard |
| **Status** | in-review |
| **Depends on** | `changes/sp-shell-app-viewport` (shipped) |
| **Date** | 2026-09-11 |

---

## 1. Summary

Lock the Results Center page host with the existing `pr-viewport-page` mixin, split chrome (hero + filters) from data (`#workArea`), migrate filters to a programme-results-style popover toolbar, move **Update result** into the hero, and remove Results Center from the footer allow-list. **Client-only**; reuses `SAV` infrastructure — no new scroll model.

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touch |
|---|---|
| **Client** | `results-list.*`, `results-list-filters.*`, `results-outlet.*` (geometry only), `footer.component.ts` |
| **Shared styles** | `@include pr-viewport-page` from `src/styles/_viewport-page.scss` |
| **Server** | none |

### 2.2 Box model (≥900px)

```
app.component outlet slot (relative flex-1)
└── app-results-list :host.pr-viewport-page     ← absolute inset-0, flex col, overflow hidden
    ├── header.rc-hero (flex-none)              ← eyebrow + title + actions
    ├── app-results-list-filters (flex-none)    ← static toolbar + chips
    └── div#workArea (flex-1 min-h-0 overflow-y-auto custom_scroll)
        ├── alert (optional)
        ├── rc-showing count
        └── table + pagination
```

Below 900px: mixin inert; host block-level; document scroll (current behavior preserved).

### 2.3 Primary interaction flow

| Action | Behavior |
|---|---|
| Land on RC ≥900px | Host locked; hero + filters visible; `#workArea` scrollTop 0 |
| Scroll table | Only `#workArea` moves; hero/filters fixed |
| Open Filter popover | Panel anchors to toolbar button (in-DOM); Apply/Cancel commit pattern unchanged |
| Open row menu + scroll | `#workArea` scroll event closes menu |
| Navigate away | Footer rules unchanged on other routes |

---

## 3. Data Model Changes

None.

---

## 4. API Design

None.

---

## 5. Backend Module Design

Not applicable.

---

## 6. Frontend / UX Component Architecture

### 6.1 `results-list.component`

| Concern | Decision |
|---|---|
| Host class | Always bind `pr-viewport-page` at ≥900px via SCSS `:host { @include pr-viewport-page }` (RC route renders only this page — no conditional like `dashboard-lab`) |
| Template split | Move count, alert, table block inside `#workArea`; hero stays in parent template |
| `workAreaEl` | `viewChild('workArea')` for scroll listener wiring |
| Scroll listener | Replace `@HostListener('window:scroll')` with listener on `#workArea` (passive); keep window listener as no-op fallback <900px |
| Column picker | Remains in hero; document click still closes |

### 6.2 Hero band (`rc-hero`)

Restructure existing `.rc-page-header` into a band aligned with SP visual hierarchy:

| Element | Treatment |
|---|---|
| Eyebrow | New `.rc-hero-eyebrow` — `PLATFORM · RESULTS CENTER`, `--pr-text-subtle`, uppercase tracking |
| Title row | Existing `rc-page-title` + optional info tooltip hook (future) |
| Subtitle | Existing `rc-page-sub` |
| Actions | Columns, Export CSV, **Update result** (moved from filters meta row) |

Tokens: `--pr-surface-band` or `--pr-surface-card` background, bottom border `--pr-border-divider`, horizontal padding aligned with SP filter bars (16px / 32px responsive).

### 6.3 `results-list-filters.component`

Migrate from **five inline multiselects + More filters** to **Search + Filter popover + chips**:

| Before | After |
|---|---|
| Primary row: 5 multiselects + More filters button | Primary row: search + Filter button (+ badge count) |
| More filters popover: secondary dimensions only | **Single Filter popover:** all dimensions grouped (Program, Phase, Category, Status, Portfolio, Center, Submitter, Funding, My activity) |
| Update result in `.rc-meta-row` | **Removed** — lives in hero (parent passes `activeButtons` or hero reads same guard) |
| Phase chips in meta row | Chips row below toolbar (unchanged logic via `filterChipGroups()`) |

**Reference templates:** `programme-results.component.html` filter bar (popover grid, Apply/Cancel footer) and Reporting band `.pr-band-filter` grouping styles.

**Service boundary:** `results-list-filter.service.ts` unchanged — component only reshapes UI bindings and temp-state for unified popover.

Controls: continue using `app-pr-filter-multiselect` / `app-pr-filter-select` — never `pr-select` (green-check DOM scan rule).

### 6.4 `results-outlet.component`

Verify `.local_container--flush` still provides zero padding under locked host; adjust only if locked absolute host needs `min-h-0` on wrapper.

### 6.5 Footer

Remove `{ path: '/result/results-outlet/results-list' }` from `footer.component.ts` `routes` array.

**Reversion challenge (RCS-DD-6):** Removing footer breaks `FOVL-AC-3` (footer intentionally shown on RC today). **Answer:** Product explicitly requested footer removal for web-app parity; glossary/legal links remain on sidebar EXTRAS and other routes. No data-loss — footer was informational only on RC.

---

## 7. Shared Contracts

| Contract | Notes |
|---|---|
| `pr-viewport-page` mixin | Identical to `SAV`; no fork |
| `#workArea` id | Same convention as dashboard-lab / programme-results |
| Filter signals | Existing `results-list-filter.service` public API |

---

## 8. Design Decisions

### RCS-DD-1: Always-on viewport lock on `results-list` host

**Decision:** Apply mixin unconditionally on this component host (not route-gated).

**Why:** The routed component IS Results Center; no other views share this host.

**Rejected:** Lock on `results-outlet` — would affect sibling routes if added later.

### RCS-DD-2: Static filters outside `#workArea` (Reporting pattern)

**Decision:** Hero + filter toolbar are `flex-none` siblings above `#workArea`.

**Why:** User requirement and SP Reporting screenshot — filters must not scroll away.

**Rejected:** programme-results pattern (filters inside `#workArea`) — contradicts RCS-R-3.

### RCS-DD-3: Unified Filter popover (popover-first)

**Decision:** One popover for all dimensions; search stays inline.

**Why:** Reduces horizontal clutter; matches programme-results JIRA-style panel.

**Rejected:** Keep five inline multiselects — fails RCS-R-3.

### RCS-DD-4: Platform eyebrow copy

**Decision:** `PLATFORM · RESULTS CENTER`.

**Why:** Cross-program surface; no SP code in eyebrow.

### RCS-DD-5: Update result in hero

**Decision:** Move button to hero actions cluster.

**Why:** Primary action alongside Export; cleans filter meta row.

### RCS-DD-6: Footer removal from allow-list

**Decision:** Remove RC path from footer routes.

**Reversion challenge outcome:** Breaks FOVL-AC-3 test and footer glossary on RC only — accepted; sidebar Glossary shipped (P2-3145).

---

## 9. Testing Plan

| Layer | Coverage |
|---|---|
| `results-list.viewport.spec.ts` | Host includes viewport mixin in SCSS; template authors `#workArea`; hero/filters outside workArea (parsed template) |
| `results-list-filters.component.spec.ts` | Popover opens; all dimensions present; Apply/Cancel; chip parity |
| `results-list.component.spec.ts` | Scroll closes menu; Update result in hero template |
| `footer.component.spec.ts` | Invert FOVL-AC-3 — footer NOT on RC |
| Manual HITL | ≥900px: document no scroll, hero/filters fixed; <900px smoke; compare to user screenshots |

Optional follow-up: extend `cypress/e2e/results-list.cy.ts` if token available — not blocking for this spec.

---

## 10. Risks & Rollback

| Risk | Mitigation |
|---|---|
| Popover clipped by `overflow: hidden` on host | Filters are **outside** `#workArea`; host overflow hidden only affects work area subtree |
| Filter regression | Spec lists all dimensions; service untouched |
| Mobile sticky complexity | Defer sticky filter bar; document scroll fallback acceptable |

**Rollback:** Revert host mixin + template split + footer entry.

---

## 11. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| **Tasks** | 5 |
| **LOC (net)** | ~280–380 |
| **Review rounds** | 2 |

Depth **Standard** confirmed — multi-component UX migration with viewport contract.
