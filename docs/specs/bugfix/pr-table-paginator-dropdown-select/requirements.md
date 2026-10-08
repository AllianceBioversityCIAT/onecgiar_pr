# Module Spec — `pr-table-paginator-dropdown-select` — Requirements

## 1. Module / Feature

- **Module:** `shared` (client) — `pr-table` / `pr-group-table`
- **Sub-feature:** rows-per-page paginator dropdown
- **Owner:** M. Giraldo (relaying a report from Santiago Sánchez)
- **Status:** approved
- **Ticket(s):** none (internal defect report)
- **Depth:** Lite · **Type:** Bug
- **Proposal:** `../proposal.md` (same folder) — Bug Diagnosis and Blast Radius already confirmed there; this spec converts them into a fix plan

## 2. Context

The bilateral results table (`/bilateral/:centerAcronym`) was changed on 2026-09-29 to default to 100 rows per page instead of 10 (`[SPEC:quick/bilateral-results-default-100-rows]`). The table correctly renders and paginates 100 rows, but its rows-per-page `<select>` still visually shows "10." Root cause (confirmed in `proposal.md` §9): both `pr-table.component.html:52-61` and `pr-group-table.component.html:53-63` bind a **native** `<select [value]="effectiveRows()">` with `<option>`s generated dynamically by `@for`; a native `<select>`'s `[value]` only "sticks" when a matching `<option>` is already present at assignment time, so the browser falls back to showing the first option. This is a shared-component defect, not a bilateral-specific one — it was invisible everywhere else only because every other table's default `rows` already equals the first entry of its own `rowsPerPageOptions`.

Touches `docs/ux-ui/design.md` §5 ("Tables MUST use `src/styles/table-custom-styles.scss`"; PrimeNG/Spartan paginator component family) and the client's own hard rule in `onecgiar-pr-client/CLAUDE.md` §5 ("never a bare `<select>`/`<input>`" — noted as pre-existing, accepted debt, not corrected here). No `docs/prd.md` acceptance criterion names UI chrome correctness directly; this falls under general platform reliability (`G4`).

## 3. In Scope / Out of Scope

### In scope

- Fix the rows-per-page `<select>` in `pr-table.component.html`/`.ts` and `pr-group-table.component.html`/`.ts` so it visually reflects `effectiveRows()` at all times, including on initial render with a non-first-option default.
- Regression test in both components' spec files asserting the rendered DOM value (not just the internal signal).

### Out of scope

- Migrating the native `<select>` to `app-pr-select` / Spartan select (separate tech-debt item, logged in proposal §6 Non-Goals).
- Changing any table's `rows` default or `rowsPerPageOptions` values.
- Any change to the 26 consumer-table files themselves.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Any table they use (results list, IPSR tables, etc.) shows the correct rows-per-page selection |
| QA reviewer | Same |
| PMU lead | Same (programme-results, bilateral review tables) |
| Platform admin | Same (user management, user report, phase management tables) |
| Bilateral consumer (downstream) | Unaffected — UI-only fix, no payload change |

## 5. User Stories

- **`PTD-US-1`** — As any user of a PRMS table, I want the rows-per-page dropdown to show the page size that is actually in effect, so that I don't mistakenly think the table is only showing a partial page when it isn't.

## 6. Functional Requirements

### Required (MUST)

- **`PTD-R-1`** The rows-per-page `<select>` rendered by `pr-table` and `pr-group-table` MUST visually display the option matching the component's current `effectiveRows()` value at all times, including immediately on first render, regardless of that value's position in `rowsPerPageOptions`.
- **`PTD-R-2`** The fix MUST NOT change `effectiveRows()`'s computed value, the actual row count rendered, or any other paginator behavior (page navigation, page range label).
- **`PTD-R-3`** The fix MUST be contained to `pr-table.component.ts`/`.html` and `pr-group-table.component.ts`/`.html` — no consumer-table file changes.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | MUST NOT alter the visual appearance or markup contract of the paginator beyond correcting the selected option — no change to any of the 26 consumer tables' rendering. |
| **Accessibility** | The `aria-label="Rows per page"` and keyboard operability of the native `<select>` MUST be preserved unchanged. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PTD-AC-1` | A `pr-table` (or `pr-group-table`) instance with `rowsPerPageOptions=[10,25,50,100]` and `[rows]="100"` (the bilateral case — 100 is not the first option) | The component renders | The `<select>`'s rendered/DOM-visible value is `"100"`, not `"10"` |
| `PTD-AC-2` | A `pr-table` instance with `rowsPerPageOptions=[10,25,50]` and `[rows]="10"` (the common case — 10 is already first) | The component renders | The `<select>`'s rendered value is `"10"` (unchanged behavior, no regression) |
| `PTD-AC-3` | Any `pr-table`/`pr-group-table` instance | The user changes the dropdown via `(change)` | `setPageSize(...)` still fires with the chosen value and the `<select>` reflects the newly chosen option |

Cross-cutting project ACs that already apply: none of `AC-1..AC-9` govern UI paginator chrome directly; this is a presentation-only correctness defect with no data/auth/contract surface.

### Defect classes this spec can produce, and their gate

| Defect class | Gate |
|---|---|
| Wrong DOM-visible `<select>` value (the bug itself) | Jest assertion reading the rendered `<select>` element's `.value` (or the `<option>` marked `selected`) in `pr-table.component.spec.ts` / `pr-group-table.component.spec.ts` — a real DOM read, not the internal `effectiveRows()` signal |
| Regression in page-size change handling (`setPageSize`) | Existing/extended Jest test dispatching a `change` event and asserting `setPageSize` was called with the right value |
| Regression in the "already-first-option" case (the 25 unaffected tables) | `PTD-AC-2` — explicit test with a first-option default, asserting no change in displayed value |
| Visual/layout regression (paginator styling) | Not automatable here (no visual tokens touched); accepted risk — covered by a manual spot-check of bilateral + one first-option table during Done criteria, no visual diff tool in scope |

## 9. Dependencies & Assumptions

### Upstream dependencies

- None — self-contained client-side fix.

### Downstream consumers

- All 26 tables consuming `app-pr-table` / `app-pr-group-table` (enumerated in `proposal.md` §7). None require their own code change.

### Assumptions

- Angular's `@for`-generated `<option>` list, combined with `[selected]` binding per option, correctly drives native `<select>` visual selection in both Jest/jsdom and real browsers (standard DOM behavior) — this is the Fix Strategy's working assumption, tested directly by `PTD-AC-1`/`PTD-AC-2`.

## 10. Open Questions

None blocking — the proposal's Fix Strategy is sufficiently scoped for `design.md` to finalize without further input.

## 11. Out-of-Band Notes

Tech-debt follow-up (not this spec): migrate the native `<select>` to `app-pr-select`/Spartan, closing the "never a bare native control" violation — logged in `proposal.md` §6.

## Required cross-references

- `docs/prd.md` — `G4` (platform reliability); no specific `AC-*` governs this UI-chrome defect.
- `docs/ux-ui/design.md` §5 (Tables use `table-custom-styles.scss`).
- `onecgiar-pr-client/CLAUDE.md` §5 (Interactive controls rule — native `<select>` noted as pre-existing, accepted debt).
- `../proposal.md` — Bug Diagnosis, Blast Radius, Fix Strategy (source of the confirmed root cause this spec builds on).
