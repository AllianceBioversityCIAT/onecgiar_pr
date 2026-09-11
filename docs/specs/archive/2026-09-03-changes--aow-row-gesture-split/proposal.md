# Proposal — Split the AoW row's two gestures

**One line:** clicking an AoW row should *filter the page to that Area of Work*; only `Report` and the `→` arrow should navigate away.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/aow-row-gesture-split` |
| Type | **Change** |
| Approval Mode | `gated` |
| Date | 2026-09-02 |
| Depends on | none |
| Parallel-safe | **no** — shares `program-overview.component.html`'s AoW row markup with `changes/progress-by-aow-w3` |
| Source | Owner request 2026-09-02 (`docs/specs/changes/overview-aow-followups.md` §2) |
| Related | `docs/specs/archive/2026-09-02-changes--overview-aow-cross-filter/` (built the scope filter this reuses) |

## 2. Intent

The Overview now has a working ToC-scope cross-filter, but the most obvious thing to click — an AoW row — does not use it. Make the row a filter entry point.

## 3. Problem / Current Behavior

The row and its action buttons do **the same thing**. Verified in the shipped template:

| Element | Line | Handler |
|---|---|---|
| Row body | `:620` | `<div (click)="row.code ? openAow.emit(row.code) : null">` — **a bare `<div>`** |
| `Report` + `→` | `:742` | `(click)="onOpenAowRowAction(row, $event)"` → also emits `openAow` |

A template comment at `:735` states it outright: *"both emitting the EXISTING `openAow` output"*. So the row offers one destination through two affordances, and the scope filter — the page's own new axis — is reachable only from the control at the top.

## 4. Proposed Outcome

| Gesture | Today | Proposed |
|---|---|---|
| Click the row body | navigates to the AoW | **selects that AoW as the page scope** |
| Click `Report` | navigates | unchanged |
| Click `→` | navigates | unchanged |

`selectScope(key)` already exists (`:325`, `:344`, `:554`) and already drives the URL round-trip.

## 5. Scope

- Re-point the row's `(click)` at the scope selection instead of `openAow`.
- Keep `onOpenAowRowAction`'s `stopPropagation` guard — it is what makes the two gestures separable, and it already works.
- **Corrected during `/akili-specify` (2026-09-02):** the row is a bare `<div>` with a click handler — **not** a `<button>` as this proposal originally stated. Verified: zero `role="button"` in the file, and its only `tabindex` belongs to the scope listbox. So the row is **already inaccessible today** — not keyboard-focusable, not announced as interactive, not activatable by Enter/Space. Making it a real control is therefore in scope, and this change fixes a pre-existing accessibility defect rather than merely re-pointing a handler.
- Selected-row visual state consistent with the scope control's own active state.

## 6. Non-Goals

- No change to the scope control, the URL contract, or `PROGRAMME_RESULTS_QUERY_PARAM_MAP`.
- No change to what `Report`/`→` navigate to.
- No new server field.

## 7. Affected Users, Systems, And Specs

Client only — `program-overview.component.{html,ts}` + its spec. Users: anyone on the SP Overview. No server, no payload, no migration.

## 8. Visual Reference

- **Source:** None needed — behavioral change to an existing row; no new surface.
- **Notes:** the selected-row state should reuse the active-option treatment already built (`border-2 border-[var(--pr-color-primary-300)]`, measured at 5.78:1) rather than inventing one.

## 9. Requirement Delta Preview

### ADDED
- Clicking an AoW row selects it as the page scope, with the URL round-trip the control already performs.

### MODIFIED
- The row's `(click)` no longer emits `openAow`.
- The row's accessible name changes from an "open" verb to a "filter" verb.

### REMOVED
- The duplicate navigation path (row body → navigate). Navigation stays on `Report` and `→`.

## 10. Approach Options

| Option | Trade-off |
|---|---|
| **A — Row selects scope; buttons navigate** | Smallest change, matches the request, reuses working plumbing. The row loses its navigation shortcut — mitigated by the `→` arrow sitting right there for exactly that. |
| B — Row toggles scope (click again to clear) | Slightly nicer, but introduces a second meaning for the same gesture and a state the control does not have. Divergence for little gain. |
| C — Modifier-click to navigate, plain click to filter | Discoverable by nobody. Rejected. |

## 11. Recommended Approach

**Option A.** It is the request, it is the smallest safe path, and both halves of the plumbing already exist and are tested.

## 12. Risks, Dependencies, And Open Questions

| Item | Note |
|---|---|
| **Markup collision** | `changes/progress-by-aow-w3` may restructure or relocate this row. Small enough to reapply, but the two must not run concurrently. |
| **Pre-existing a11y defect, now in scope** | The row is a `<div>`, so today it is unreachable by keyboard and unannounced to assistive tech. Fixing the gesture without fixing that would ship a *second* inaccessible control — the "treatment not carried to the changed site" failure the archived spec hit twice (§14, §19). |
| **Discoverability of navigation** | If users relied on the row body to navigate, the `→` must read as the navigation affordance. Worth one look at the hover/tooltip copy. |
| **Open question** | Should clicking the *already-selected* row clear the scope, or do nothing? Option A says nothing; the control's `All scopes` clears. Owner decides at specify time. |

## 13. Success Criteria

- Clicking a row filters the page and updates `?scope=`; `Report`/`→` still navigate, and neither fires the other.
- The row's accessible name describes filtering.
- No regression in the scope control, the breakdown, or the AoW row's responsive ladder.

## 14. Next Step

```text
/akili-specify changes/aow-row-gesture-split
```
