# pr-select — Hide Search Input Under 5 Options — `design.md`

Requirements: [`requirements.md`](./requirements.md) (same folder). Cross-references: `docs/ux-ui/design.md` (custom-fields primitives rule), `onecgiar-pr-client/src/CLAUDE.md` §14, `onecgiar-pr-client/src/CLAUDE.md` §21.5 (unaffected — no mandatory/validation logic touched).

---

## 1. Summary

Hide the "Search" input inside `app-pr-select`'s dropdown panel whenever the bound option list has fewer than 5 selectable items (group-label rows excluded), and show it unchanged at 5+. The whole change is one new `computed()` signal in `PrSelectComponent` plus an `@if` in its template — no new inputs, no consumer call-site changes, no server surface. The accepted trade-off: the threshold (5) is a hardcoded constant, not configurable, per `PSEL-` assumption in requirements.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/custom-fields/pr-select/` only (`pr-select.component.ts`, `pr-select.component.html`). No other module imports change.
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

```
[Any screen using <app-pr-select [options]="...">]
  └── user focuses the trigger (a.field) → onDropdownOpen()
        └── template evaluates showSearchInput() (computed, already fresh — no extra call)
              ├── showSearchInput() === true  → .search_input_container renders (today's behavior)
              └── showSearchInput() === false → .search_input_container is absent from the DOM
                    └── cdk-virtual-scroll-viewport renders the FULL optionsIntance() list
                        (listFilterByTextAndAttr receives '' instead of searchText while hidden)
```

No async step, no new API call — `options()` is already an `input()` signal or a plain array the consumer passes; `optionsIntance()` (existing computed) already recomputes on every change.

---

## 3. Data Model Changes

N/A — no entities, no migrations, no CLARISA surface. Purely a client-side rendering rule.

---

## 4. API Surface

N/A — no endpoint added or changed.

---

## 5. Server Workflow / Business Rules

N/A — no server module involved.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `PrSelectComponent` stays declared in `custom-fields.module.ts` (unchanged import surface) — every consumer across `pages/**` picks up the new behavior automatically the next time they render the component, with zero call-site edits.

### 6.2 Components & services

**`pr-select.component.ts`** — add two computed signals, both derived from the existing `optionsIntance()` computed (already excludes nothing extra, just decorates `selected`/`disabled`):

```ts
/**
 * Selectable rows for the 5-item search threshold (PSEL-R-1/2/10) — group-label rows
 * (`option.isLabel`, used by the `group`/`groupCode` grouping feature) don't count: a
 * grouped list with 4 real items and 2 label rows must still hide the search box.
 */
readonly selectableOptionCount = computed(() => this.optionsIntance().filter((o: any) => !o?.isLabel).length);

/** PSEL-R-1/R-2: search input only earns its place once there's enough to search through. */
readonly showSearchInput = computed(() => this.selectableOptionCount() >= 5);
```

Both are plain `computed()` — no new `input()`, no `effect()`, no manual subscription. They recompute automatically whenever `options()` (or `disableOptions()`/the current value, which `optionsIntance()` also depends on) changes, which is what makes `PSEL-` runtime-count-change scenario work for free: no extra wiring needed.

**`pr-select.component.html`** — two changes inside the existing `.options` block (`onecgiar-pr-client/src/app/custom-fields/pr-select/pr-select.component.html:53-58`):

1. Wrap the search box in `@if (showSearchInput()) { ... }` so it is removed from the DOM (not just visually hidden) when under threshold — this is what satisfies the a11y "must leave the tab order" requirement (`PSEL-` NFR):

   ```html
   <div class="options" style="min-width: 200px" [style]="overlayToBody() ? overlayStyles() : optionsInlineStyles()">
     @if (showSearchInput()) {
       <div class="search_input_container">
         <span class="material-icons-round search_icon">search</span>
         <input type="text" hlmInput placeholder="Search" [(ngModel)]="this.searchText" style="width: 100%" />
       </div>
     }
     <cdk-virtual-scroll-viewport ...>
   ```

2. Feed the filter pipe an empty string while the box is hidden, instead of touching/clearing the `searchText` property (avoids adding an `effect()` just to reset state, and avoids ever discarding a value the user might see again if the list later grows past the threshold):

   ```html
   *cdkVirtualFor="let option of optionsIntance() | listFilterByTextAndAttr: optionLabel() : (showSearchInput() ? this.searchText : '')"
   ```

   This is also what satisfies `PSEL-R-3` ("no filter applied" while hidden) and the "must not clear an already-typed term abruptly" runtime scenario — `searchText` itself is left alone; only what reaches the pipe changes.

No other template line changes. `virtualOptionItemSize()`, group-label rendering (`option.isLabel`), badges, disabled/selected styling — all untouched.

### 6.3 Design system usage

- No new component, no new token. The search box that disappears already uses `--pr-*`-token-free plain CSS in `custom-fields.scss` (unchanged) — nothing to restyle.
- A11y: covered above (`@if`, not `[hidden]`/`display:none`, removes it from the tab order and the accessibility tree, not just visually).
- Responsive: no layout shift beyond one row's height disappearing — same as the existing empty-list / grouped-list cases already handle.
- i18n: the "Search" placeholder string is unchanged (still hardcoded, pre-existing — out of scope here, not introduced by this change).

### 6.4 Real-time / notification UX

N/A.

---

## 7. Security & Authorization

N/A — no new input, no new endpoint, no auth surface touched. `showSearchInput()` reads only data already flowing into the component today.

---

## 8. Performance & Capacity

Negligible: one extra `computed()` over an array already computed every render (`optionsIntance()`), evaluated with a plain `.filter().length` (options lists in this app are small — dropdown UX, not data grids). No new HTTP call, no new subscription, no bundle-size impact (no new dependency).

---

## 9. Observability

N/A — no logs, no metrics, no error paths added. This is a pure rendering-condition change with no failure mode of its own (worst case: search box shows/hides one row too early/late, which is exactly what the test plan below catches).

---

## 10. Testing Plan (forward-looking)

Per `onecgiar-pr-client/CLAUDE.md` §9, `custom-fields/` is excluded from Jest coverage and validated through **Cypress Component Testing** (`pr-select.cy.ts`, colocated). This is the only test surface this spec needs.

- **`PSEL-AC-1`** — mount `<app-pr-select>` with a 2-item `options` array (reuse the existing `OPTIONS` fixture pattern in `pr-select.cy.ts`, sliced to 2 items, or a dedicated small fixture), open the dropdown, assert `cy.get('.search_input_container').should('not.exist')` (not `.should('not.be.visible')` — must be absent from the DOM per the a11y requirement) and both options render.
- **`PSEL-AC-2`** — mount with the existing 3-item `OPTIONS` fixture bumped to 5 items (or a new 5-item fixture), open the dropdown, assert `cy.get('.search_input_container').should('exist')` and that typing into it filters the list exactly as the current suite already covers for selection (extend, don't replace, existing coverage).
- **`PSEL-AC-3`** — mount with a grouped list (`group`/`groupCode`/`groupName` inputs, per the existing grouping feature) totalling 4 selectable items across 2 group-label rows; assert the search box is absent (label rows excluded from the count).
- Runtime-count scenario (requirements §6, "Option count changes at runtime") — mount with 4 items, assert the box is absent; update `componentProperties`/rebind `options` to a 5-item array via `wrapper.fixture.detectChanges()` (same pattern as the existing "clears the selection reactively" test), assert the box now exists; and the reverse (5 → 4) hides it again.
- No Jest spec needed (folder-level exclusion) and no server test — this spec has no server surface.
- Run scope: `npm run test:ct` (whole custom-fields suite, per the package rule of running it green before committing any `custom-fields/` change) — do not scope down to a single spec file, since this is exactly the kind of shared-primitive change the full local CT suite exists to catch.

---

## 11. Backwards Compatibility & Migration Plan

- **API contract:** none exists to break — no new/changed endpoint.
- **Behavioral contract:** additive-safe by construction — every existing call site with ≥5 options renders identically (`PSEL-R-2`, `PSEL-AC-2`); only call sites currently under 5 options change, and the change is the one requested (drop the search box). No feature flag needed — this is a UX correction, not a risky behavioral toggle, and the spec's own NFR table already commits to zero-regression at ≥5 options as the compatibility bar.
- **Data backfill:** N/A.
- **Downstream consumers:** every screen listed in `src/CLAUDE.md` §14 picks this up automatically on next deploy; no consumer-side action needed. Flagged here only as an FYI for `/akili-archive`, not a rollout risk — no consumer specified a different threshold (per requirements' Assumptions).

---

## 12. Design Decisions (ADRs)

### `PSEL-DD-1` — Compute visibility, don't add a new input

- **Context:** the search box's visibility could either be (a) an explicit new `[showSearch]` input consumers set per call site, or (b) derived automatically from the existing `options` data.
- **Decision:** derive it automatically from `optionsIntance().length` (option b). No new input.
- **Alternatives considered:**
  - A `[showSearch]` boolean input — rejected: requires touching every call site that wants the new behavior (dozens, per `src/CLAUDE.md` §14) instead of fixing the shared primitive once, and contradicts the requirement that ≥5-option sites need zero change.
  - A `[searchThreshold]` configurable input — rejected: `requirements.md` §9 Assumptions states no call site asked for a different threshold; adding a knob nobody needs is speculative surface area.
- **Consequences:** the threshold (5) is a magic number private to `PrSelectComponent`. If a future call site genuinely needs a different threshold, that's a new, small follow-up (add the input then) — not a blocker today.

### `PSEL-DD-2` — Filter the pipe input, not the stored `searchText`

- **Context:** when the box is hidden, `PSEL-R-3` requires no filter effect; the naive fix is to clear `this.searchText` when hiding.
- **Decision:** leave `this.searchText` untouched; instead pass `showSearchInput() ? this.searchText : ''` into the existing `listFilterByTextAndAttr` pipe call.
- **Alternatives considered:** an `effect()` that resets `searchText` to `''` whenever `showSearchInput()` flips to `false` — rejected: adds a side-effecting `effect()` to a component that is otherwise pure computed-signal-driven, and actively conflicts with the requirements' explicit "must not clear an already-typed search term abruptly" runtime scenario (a 5→4→5 flap would visibly wipe what the user typed, even though the box was only briefly hidden).
- **Consequences:** if a list shrinks below 5 while a term is typed, hides, then grows back to 5+, the old term reappears in the box — this is the correct, requirement-mandated behavior, not a bug.

---

## 13. Open Gaps & Follow-ups

- `PSEL-OQ-1` (from requirements): 0-option / `noDataText()` state also hides the search box — already covered for free since `0 < 5`; no separate code path needed. No follow-up.
- If a future spec needs a per-call-site threshold override, revisit `PSEL-DD-1` — not needed today.

---

## Required cross-references

- [`requirements.md`](./requirements.md) (same folder).
- `docs/ux-ui/design.md` — `custom-fields` primitives rule (no dedicated screen/flow; this is primitive-level).
- `docs/trd/trd.md` — not touched (no API/data-model surface); no citation needed beyond confirming absence.
- `onecgiar-pr-client/src/CLAUDE.md` §14 (`custom-fields/` rules, Cypress CT as the coverage surface) and §21.5 (form validation layers — confirmed unaffected, no `required`/mandatory logic touched by this change).
