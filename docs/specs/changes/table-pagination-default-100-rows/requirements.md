# Module Spec — `table-pagination-default-100-rows` — Requirements

## 1. Module / Feature

- **Module:** `shared` (client) — cross-cutting, touches `admin-section`, `ipsr`, `outcome-indicator`, `result-framework-reporting`, `results`, `shared`, `shared/sections-components`
- **Sub-feature:** default page size for the shared table paginator
- **Owner:** M. Giraldo
- **Status:** approved
- **Ticket(s):** none
- **Depth:** Standard · **Type:** Change
- **Proposal:** `../proposal.md` (same folder)

## 2. Context

`bugfix/pr-table-paginator-dropdown-select` (shipped, commit `b936ebf2f`) fixed the paginator dropdown's **visual display** — it made the dropdown correctly show whatever `[rows]` value a table is bound to, system-wide. It explicitly left each table's actual default page size untouched. This spec is the follow-on the user requested after observing a different, correctly-configured table (`programme-results`, 10 of 77) and asking for the *default itself* to become 100 everywhere, matching the bilateral results table's existing (already-shipped) 100-row default.

Every table in `onecgiar-pr-client` is driven by exactly two shared components, `shared/components/pr-table/{pr-table,pr-group-table}.component.{ts,html}` (`app-pr-table` / `app-pr-group-table`) — confirmed, PrimeNG fully removed. A repo-wide audit this session found **25 real consumers**; one further file only references the selectors in a stale comment and is excluded. Of the 25: **1** already matches the target, **18** are in scope for this change (12 "default-only" + 6 "needs options list updated too"), and **6** have no pagination UI bound at all (`[paginator]` unbound → `false`) and are explicitly **out of scope** (confirmed with the user).

Touches `docs/prd.md` `G4` (platform reliability/performance, given the 3 performance-flagged tables) and `docs/ux-ui/design.md` §5 (table styling rule — unaffected; this is a config value, not a visual change).

## 3. In Scope / Out of Scope

### In scope

- Change `[rows]` to `100` on the 12 tables whose `[rowsPerPageOptions]` already contains `100`.
- Add `100` to `[rowsPerPageOptions]` AND change `[rows]` to `100` on the 6 tables that don't have it yet, including `wp-home` (grouped/expandable `app-pr-group-table`) and both near-identical `mapped-results-modal` copies.
- A manual browser performance/scroll spot-check for the 3 tables flagged as render-heavy: `results-list`, `programme-results`, `wp-home`.

### Out of scope

- The 6 tables with no pagination UI bound (`result-history-of-changes-modal`, `indicator-drawer`, `reporting-aow-table`, `aow-hlo-table`, `aow-target-details-drawer`, `aow-view-results-drawer`).
- Deduplicating the 2 byte-identical `mapped-results-modal` copies — same edit applied to both, no merge.
- Any further change to the paginator dropdown's display mechanism (already shipped).
- Rationalizing any table's full `rowsPerPageOptions` list beyond adding `100` (e.g. not touching `[8,12,20]` → something cleaner).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Results list, IPSR tables, mapped-results pickers default to showing more rows |
| QA reviewer | Same |
| PMU lead | Programme results, work-package home default to 100 |
| Platform admin | User management, user report default to 100 |

## 5. User Stories

- **`PTR-US-1`** — As any user of a PRMS table that already supports a 100-row page size option, I want the table to default to showing 100 rows, so that I see most or all of my results without manually changing the page size every time.

## 6. Functional Requirements

### Required (MUST)

- **`PTR-R-1`** Each of the 12 "default-only" tables MUST render with `[rows]="100"` on initial load, with no other binding changed.
- **`PTR-R-2`** Each of the 6 "needs options update" tables MUST render with `[rows]="100"` on initial load AND MUST have `100` present in `[rowsPerPageOptions]`, preserving every existing option value already in that list.
- **`PTR-R-3`** The 6 out-of-scope (no-pagination) tables MUST remain completely unchanged by this spec.
- **`PTR-R-4`** Neither `mapped-results-modal` copy's edit MUST diverge from the other — both receive the identical change (confirmed byte-identical today via `diff`).
- **`PTR-R-5`** No `.ts` logic, no `.spec.ts` assertion that currently passes MUST be broken by this change (per the design-time citations: no spec across any of the 18 files hard-asserts a default `rows` value today).

### Should (SHOULD)

- **`PTR-R-10`** `results-list`, `programme-results`, and `wp-home` SHOULD receive a manual browser spot-check (scroll performance, no layout break) after the change, given their richer per-row rendering (status chips/actions) or, for `wp-home`, its grouped+expandable-row shape.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | No automated perf gate exists for client-side render cost in this repo; `results-list`, `programme-results`, `wp-home` get an explicit manual check (see defect-class table below) rather than being silently assumed safe at 100 rows/page. |
| **Backwards compatibility** | MUST NOT change any binding other than `[rows]`/`[rowsPerPageOptions]` on the 18 in-scope files — no markup, class, or `[paginator]` condition changes. |
| **Consistency** | Every in-scope table's rows-per-page dropdown correctly reflects `100` on load — guaranteed by the already-shipped `bugfix/pr-table-paginator-dropdown-select` (no new dropdown logic needed here). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PTR-AC-1` | Any of the 12 "default-only" tables (e.g. `results-list`) | The page loads | `[rows]` renders as `100`; `[rowsPerPageOptions]` is unchanged from its current value (which already contains `100`) |
| `PTR-AC-2` | Any of the 6 "needs options update" tables (e.g. `user-management`) | The page loads | `[rows]` renders as `100`; `[rowsPerPageOptions]` contains `100` in addition to every value it already had |
| `PTR-AC-3` | `wp-home` specifically | The page loads | `[rows]="100"`, `100` added to `[rowsPerPageOptions]`, grouping (`groupRowsBy`) and row-expansion (`prTableExpandedRow`/`[expandedRowKeys]`) behavior is otherwise unchanged |
| `PTR-AC-4` | Both `mapped-results-modal` copies | Compared after the change | Byte-identical to each other, exactly as they are byte-identical today |
| `PTR-AC-5` | Any of the 6 out-of-scope tables | The page loads | Zero diff — files untouched |
| `PTR-AC-6` | `results-list`, `programme-results`, `wp-home` | A user scrolls/interacts with a 100-row page in a real browser | No visible layout break, no unresponsive scroll (manual check, recorded — see defect-class table) |

### Defect classes this spec can produce, and their gate

| Defect class | Gate |
|---|---|
| Wrong `[rows]`/`[rowsPerPageOptions]` value on any of the 18 files (typo, wrong file, missed file) | Per-task `grep`/read verification quoting the exact post-change line, against the Premise Ledger's pre-change citation |
| Accidentally touching one of the 6 out-of-scope files | Negative-existence check: `git diff --stat` after each task names only its own task's file list, nothing else |
| Accidentally diverging the 2 `mapped-results-modal` copies | `diff` between the two files post-change, asserting zero output (same check that proved them identical pre-change) |
| Breaking an existing spec assertion | Full suite run for every touched file's folder; per the design-time sweep, no spec today hard-asserts a `rows` default, so this class is a regression check, not an expected-failure rewrite |
| Render/performance regression on `results-list`/`programme-results`/`wp-home` | **No automated gate exists in this repo for client render-cost.** Substituted by a manual browser check (`PTR-AC-6`) at the task's Done criteria — explicitly an accepted, human-checked risk, not silently assumed safe |

## 9. Dependencies & Assumptions

### Upstream dependencies

- `bugfix/pr-table-paginator-dropdown-select` (shipped) — without it, setting any table's default away from its first `rowsPerPageOptions` entry would reintroduce the dropdown-display bug. This spec is safe specifically because that fix already landed.

### Downstream consumers

- None beyond the 18 files themselves — no API, no payload, no other spec reads these template values.

### Assumptions

- The 18 files' current `[rows]`/`[rowsPerPageOptions]` bindings are literal integers/arrays in the template (not bound to a `.ts` component property) — confirmed for all 18 by this session's design-time citation sweep; if any were instead a bound property, the task touching it would need to update the `.ts` default too, but none are.

## 10. Open Questions

None blocking — all scope boundaries (include both small modals, proceed on the 3 risk-flagged tables with manual verification, exclude the 6 no-pagination tables) were confirmed with the user during `/akili-propose`.

## 11. Out-of-Band Notes

- `links-to-results-global.component.html` is a baseline outlier among the 12 "default-only" tables: its current default is `[rows]="5"` (not `10` like the other 11) with options `[5, 50, 100]` (not `[10, 50, 100]`) — same edit shape (100 already present), just a different starting value. Noted so the task doesn't assume a uniform "10 → 100" diff across all 12.
- Both `mapped-results-modal` copies use `.component.test.ts` naming (not `.spec.ts`) and live under coverage-excluded folders (`rd-contributors-and-partners` per `package.json`) — consistent with the project's known exclusion list, not a new finding.

## Required cross-references

- `docs/prd.md` — `G4` (platform reliability/performance).
- `docs/ux-ui/design.md` §5 (Tables use `table-custom-styles.scss` — unaffected).
- `onecgiar-pr-client/CLAUDE.md` §9 (Testing) — per-file verification commands.
- `../proposal.md` — intent, scope decisions, and the audit this requirements doc refines with file:line citations.
- `../../bugfix/pr-table-paginator-dropdown-select/` — the prerequisite fix this change builds on.
