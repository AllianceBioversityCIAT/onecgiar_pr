# pr-select — Hide Search Input Under 5 Options — `requirements.md`

## 1. Module / Feature

- **Module:** `custom-fields`
- **Sub-feature:** `pr-select` search-input visibility
- **Owner:** Frontend
- **Status:** draft
- **Ticket(s):** — (arose from `/akili-quick emerging-result-dropdown`, escalated: shared-component behavior change)

## 2. Context

`app-pr-select` (`onecgiar-pr-client/src/app/custom-fields/pr-select/`) is the app-wide dropdown primitive. Its panel always renders a "Search" input above the option list, regardless of how many options exist. QA flagged this on the emerging-result "Result level" field (2 options: Output/Outcome) — a search box for 2 items is noise. Because `pr-select` is shared across dozens of screens (per `onecgiar-pr-client/src/CLAUDE.md` §14), this is a behavior change to a shared component, not a cosmetic tweak — hence a spec instead of `/akili-quick`.

Touches `docs/ux-ui/design.md` component rules for `custom-fields` primitives (no dedicated screen/flow — this is a primitive-level UX rule). No `docs/trd/trd.md` API/data surface is touched.

## 3. In Scope / Out of Scope

### In scope
- Hide the search input inside `pr-select`'s dropdown panel when the option count is below a threshold (5).
- Show it as today when the option count is 5 or more.

### Out of scope
- Changing `pr-multi-select` (separate component, not requested).
- Changing the threshold value later, keyboard-type-to-select behavior, or any other dropdown chrome.
- Retroactively auditing every existing `app-pr-select` call site for visual regressions beyond the automated check below.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Any `app-pr-select` dropdown with < 5 options (e.g. Result level: Output/Outcome) no longer shows an unnecessary search box. |
| QA reviewer / PMU lead / Platform admin | Same benefit wherever they hit a small `app-pr-select` list app-wide. |

## 5. User Stories

- **`PSEL-US-1`** — As a result submitter, I want short dropdowns (e.g. Output/Outcome) to skip the search box, so that the control doesn't imply a search feature I don't need.

## 6. Functional Requirements

### Required (MUST)

- **`PSEL-R-1`** The system MUST NOT render the search input inside the `app-pr-select` dropdown panel when the number of selectable options (excluding group-label rows) is fewer than 5.
- **`PSEL-R-2`** The system MUST render the search input as today when the number of selectable options is 5 or more.
- **`PSEL-R-3`** When the search input is hidden, typing/search filtering MUST simply be unavailable (no filter applied) — the full option list renders unfiltered.

#### Scenario: Fewer than 5 options — search hidden

- GIVEN an `app-pr-select` bound to an `options` array with 2 items (e.g. Output, Outcome)
- WHEN the dropdown panel opens
- THEN no "Search" input is rendered in the panel
- AND both options render in the virtual-scroll list

#### Scenario: 5 or more options — search shown (unchanged)

- GIVEN an `app-pr-select` bound to an `options` array with 5 or more items
- WHEN the dropdown panel opens
- THEN the "Search" input renders as it does today
- AND typing into it filters the list as it does today

#### Scenario: Option count changes at runtime

- GIVEN an `app-pr-select` whose `[options]` input is a reactive signal
- WHEN the bound options array grows from 4 to 5 items (or shrinks from 5 to 4) while the field is in use
- THEN the search input's visibility MUST reflect the current count on the next render
- BUT switching visibility MUST NOT clear an already-typed search term abruptly in a way that changes the selected value

### Should (SHOULD)

- **`PSEL-R-10`** Group-label rows (`option.isLabel`, used by the `group`/`groupCode` grouping feature) SHOULD NOT count toward the 5-option threshold, so a grouped list with few real selectable items still hides the search box.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | Every existing `app-pr-select` usage with ≥5 options MUST see zero visual/behavioral change. |
| **Accessibility** | No new a11y regression: removing the input must also remove it from the tab order (not just visually hide it). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PSEL-AC-1` | `app-pr-select` with `options = [Output, Outcome]` (2 items) | dropdown opens | no search input in DOM/tab order; both options visible |
| `PSEL-AC-2` | `app-pr-select` with 5+ options (existing usage, e.g. Contributing CGIAR Centers) | dropdown opens | search input renders and filters exactly as before |
| `PSEL-AC-3` | `app-pr-select` with 4 grouped options + 2 group-label rows | dropdown opens | search input hidden (label rows excluded from the count) |

## 9. Dependencies & Assumptions

### Upstream dependencies
- None — self-contained change inside `custom-fields/pr-select`.

### Downstream consumers
- Every screen using `app-pr-select` (result creation, result detail, admin, etc.) — see `src/CLAUDE.md` §14.

### Assumptions
- The "5" threshold is a fixed constant for this spec, not a configurable input — no call site has asked for a different threshold.

## 10. Open Questions

- `PSEL-OQ-1` — Should `noDataText()`'s "no items available" state (0 options) also hide search? (Assumed yes: 0 < 5, already covered by R-1.)

## 11. Out-of-Band Notes

Originates from `/akili-quick emerging-result-dropdown` (2026-09-09), which fixed the unrelated z-index overlay issue on the same field under `[SPEC:quick/emerging-result-level-overlay]` and escalated this piece here.

## Required cross-references

- `docs/ux-ui/design.md` — `custom-fields` primitives rule (prefer `app-pr-select` over bare `<select>`; no dedicated screen).
- `onecgiar-pr-client/src/CLAUDE.md` §14 (`custom-fields/` rules, coverage exclusion) and `src/CLAUDE.md` §21.5 (form validation layers — unaffected here, no `required`/mandatory logic touched).
