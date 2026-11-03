# Design — Impact results card: expand / collapse

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/impact-results-card-collapse` |
| Module code | `ICC` · Depth: **Lite** |
| Requirements | `requirements.md` (ICC-R-1..3, approved 2026-11-03) |
| Status | approved (2026-11-03) |
| Date | 2026-11-03 |

## 1. Summary

Client-only, one component: `impact-results-card` gets a local `expanded` signal (seed `true`), a chevron toggle in the header and an `@if` around the rows list. No API, data, host or server change.

## 2. Files

| File | Change |
|---|---|
| `onecgiar-pr-client/.../dashboard-lab/components/impact-results-card/impact-results-card.component.ts` | `expanded` signal + `toggle()`; stable list id for `aria-controls`; `NgIcon` + `provideIcons({ lucideChevronDown })` in the component |
| `.../impact-results-card.component.html` | Chevron button at the start of the header; header click toggles; header bottom border only when expanded; rows `<ul>` inside `@if (expanded())` with the id |
| `.../impact-results-card.component.spec.ts` | Replace the "no chevron" assertion; add toggle / aria / no-refetch cases |
| `.../impact-results-card/CLAUDE.md` | Update the "Trampas" line that forbids a chevron (now allowed by ICC) |

Host (`dashboard-lab.component.html`) is **not** touched: state is internal, no new input/output.

## 3. Component design (ICC-R-1, ICC-R-2)

- **State:** `expanded = signal(true)` local to the component. Not persisted (ICC-R-1 §1.2). A program/phase change does not re-create the card instance, so the state survives it; acceptable: §1.2 "default on page load" is met on load, and inputs changing does not reset it — see DD-3.
- **Toggle control:** a native `<button type="button">` holding the decorative chevron (`aria-hidden`), placed first in the header (same position as the AoW cards and the screenshot). `aria-expanded` = `expanded()`, `aria-controls` = list id, `aria-label` = "Impact results" (name contains the title; ICC-R-2). Native button gives Tab focus and Enter/Space for free.
- **Whole-header click:** the `<header>` carries the single `(click)` handler; the button has none and its click bubbles to it → exactly one toggle per click/keypress. The header holds no other interactive element, so no `stopPropagation` is needed. `cursor-pointer` on the header.
- **Visuals (ICC-NFR-1):** copy the AoW chevron classes — `lucideChevronDown`, `text-[16px]`, `--pr-text-secondary`, `transition-transform duration-200`, rotated when the panel is in the opposite state (match the AoW convention: `rotate-180` bound to open). Header `border-b` only while expanded so the collapsed card has no double line. Focus ring: existing `focus-visible` outline utilities used by other header buttons; no new token.
- **Rows:** `@if (expanded())` around the `<ul>`; the `<ul>` keeps its testids. Removed from DOM when collapsed (not `hidden`), so collapsed rows are out of the tab order.
- **Counts (ICC-R-3):** `rxResource` params depend only on `initiativeId`/`versionId`; `expanded` is not read there → toggling never refetches. Total lives in the header → unaffected.

## 4. Design decisions

| ID | Decision | Rejected alternative |
|---|---|---|
| ICC-DD-1 | Native button + header click bubbling | Whole `<header>` as `role=button` (duplicates native semantics, h3 inside a button is invalid); `<details>` (styling/animation mismatch with AoW cards) |
| ICC-DD-2 | `@if` removes rows from DOM | `[hidden]` — keeps 5 Report buttons focusable-in-tree concerns and diverges from AoW pattern |
| ICC-DD-3 | State not reset on program/phase change | `effect` resetting on input change — extra logic for no requested behaviour; the scenario's "page load" default still holds |
| ICC-DD-4 | Chevron rule lifted only for this card; `IRE-R-1` other negatives (no bar/ratio/%/By AOW) kept and still asserted | Removing the whole negative test |

### Reversion challenge (Step 2.3) — ICC-DD-4

Reverted: IRE-R-1's "no chevron" rule and the spec assertion `querySelector('ng-icon, [aria-expanded]')` is null. *What does removing it break?* — Only that assertion (Jest) and the folder guide line; the CT (`.cy.ts`) asserts row count/layout with the card expanded (default), so it stays valid; the host spec `dashboard-lab.impact-card.spec.ts` only checks placement/wiring. The rule existed to keep the card target-free (no AoW-like drill-down); a collapse chevron adds no drill-down. **No unaddressed breakage.**

## 5. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 1 |
| LOC (src + spec + guide) | ~50 |
| Review rounds | 1 |
