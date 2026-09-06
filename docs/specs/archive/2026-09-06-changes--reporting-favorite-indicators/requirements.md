# Requirements — Favorite Indicators & Focus View (`changes/reporting-favorite-indicators`)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-favorite-indicators` |
| Short Prefix | `RFI` |
| Type | Change |
| Approval Mode | `pre-approved` (user mandate 2026-09-05, see `proposal.md`) |
| Depth | Standard |
| Status | approved |
| Proposal Ref | [`proposal.md`](./proposal.md) |
| Baseline | `docs/prd.md` (G1 submission completeness, US Result submitter), `docs/ux-ui/design.md` §6 Listing screens, §7 tokens, §8 component rules, §10 a11y; `docs/trd/trd.md` §6 Frontend architecture & state boundaries |
| Related | `changes/mass-reporting-flow` (Only-pending pipeline, `__allIndicators`), `changes/reporting-hierarchical-search-filters` (Phase 1, concurrent) |

---

## 1. Module / Feature
- **Module:** `result-framework-reporting` (client) → `pages/dashboard-lab/`
- **Sub-feature:** Reporting tab personalization — favorite indicators + focus view
- **Owner:** Results Reporting & UX/UI Core Team
- **Ticket(s):** — (follows P2-3251 PO suggestion "remember what the user left open"; distinct feature)

## 2. Context
The Reporting tab of a Science Program (`DashboardLabComponent`, `showPlanned()`) lists every planned ToC indicator of the programme grouped by Area of Work. `dashboard-lab/CLAUDE.md` documents the host as owner of the five filters and of the Only-pending / sort pipeline (`applyBurndownFilterAndSort` → `reportingGroupsForTable`). `reporting-aow-table/CLAUDE.md` documents the table as **presentation-only** (no injected services) with a fixed input/output contract. `reporting-program-band` owns the toolbar.

This spec adds a personal layer on top of that pipeline without changing any existing rule: a per-row pin and a focus switch, persisted per user. PRD alignment: G1 (submission completeness — less time locating indicators), US Result submitter. UX flows: F1 (submitter creates results) — the Reporting tab is the entry point. TRD: §6 state boundary "component-local / feature service" — a feature-local root service.

## 3. In Scope / Out of Scope

### In scope
- Star toggle on every indicator row in the grouped cards and in the flat *All indicators* table.
- `★ Favorites (N)` switch in the Reporting toolbar — Grouped and All-indicators browse views; hidden in the By AOW focused view.
- Favorites-only filtering composed with the existing filters; active-filter semantics; empty state.
- Persistence: pins in `localStorage` per user + programme; the switch in `sessionStorage`.
- Unit tests in new spec files; child `CLAUDE.md` guide updates for the two components touched.

### Out of scope
- Result-type quick filter (delivered by RHSF-T-3). Backend persistence. Stars in the *By AOW* view rows or in the indicator drawer. Favorite AoWs. URL query parameter for the switch. Keyboard shortcuts.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Pins the 4–5 indicators they report against; opens the tab focused on them. |
| PMU / portfolio lead | Pins the indicators they oversee across AoWs; the focus view becomes a personal watch-list. |
| QA reviewer / admin / bilateral consumer | No change. |

## 5. User Stories
- **`RFI-US-1`** — As a result submitter, I want to mark an indicator as a favorite with one click, so that I can find it again without searching. (Refines PRD US Result submitter, G1.)
- **`RFI-US-2`** — As a result submitter, I want to see only my favorite indicators, so that the 300+ programme catalogue does not compete for my attention while I report.
- **`RFI-US-3`** — As a user of several programmes, I want my favorites of one programme to stay out of the others, so that the focus view never shows foreign indicators.

## 6. Functional Requirements

### Required (MUST)

#### `RFI-R-1` — Favorite toggle on indicator rows
- **`RFI-R-1.1`** Every indicator row rendered by `reporting-aow-table` — grouped cards (`#indicatorRow` template, AoW / Intermediate / 2030) and the flat table — MUST render a star button before the *Copy link* control in the action cell.
- **`RFI-R-1.2`** Clicking the star MUST toggle the row's favorite state and MUST NOT open the row (`openRow`), the card, or any other row action (event isolation via `emitAndStop`, Kaizen `KZ-changes--reporting-aow-jira-hierarchy-2`).
- **`RFI-R-1.3`** The star MUST reflect state visually (filled `star` when favorite, `star_outline` otherwise) and programmatically (`aria-pressed`, `aria-label` "Add to favorites" / "Remove from favorites", `title` matching).
- **`RFI-R-1.4`** The table MUST remain presentation-only: favorite state arrives through an input (`favoriteKeys: ReadonlySet<string>`) and toggles leave through an output (`toggleFavorite: ReportingIndicator`). It MUST NOT inject `ReportingFavoritesService`.

#### `RFI-R-2` — Favorites focus switch
- **`RFI-R-2.1`** The Reporting toolbar (`reporting-program-band`, `showToolbar`) MUST render a `role="switch"` button labelled `Favorites` with the live count of the programme's favorites (`Favorites (N)`), placed immediately after *Only pending*.
- **`RFI-R-2.2`** The switch MUST be hidden in the *By AOW* focused view (`compactFilters() === true`), where no stars are rendered.
- **`RFI-R-2.3`** When the switch is on, the table MUST list only rows whose favorite key is in the programme's favorite set; a settled card (`loading === false`) left with zero rows MUST be hidden; a card still `loading` MUST stay visible.
- **`RFI-R-2.4`** When the switch is on, each AoW header ratio (`ratioOf`, `x of y · z%`) MUST keep counting the pre-focus set — the same `__allIndicators` side-channel Only-pending uses. AND IT MUST NOT recompute the ratio rule itself (`buildRatio` stays the single home).
- **`RFI-R-2.5`** The switch MUST count as an active Reporting filter **in the views where it filters** (`plannedBrowseView() === 'aows'`, i.e. Grouped and All indicators): `reportingFiltersActive()` is `true` while on there, and `clearReportingFilters()` turns it off from any view. BUT it MUST NOT delete any pin, AND IT MUST NOT report the switch as an active filter in the By AOW view, where no favorites filtering is applied (JD-1).
- **`RFI-R-2.6`** With the switch on and zero favorites for the programme, the table MUST show the copy `No favorite indicators yet. Use the ★ on any indicator row to build your focus list.` with a `Show all indicators` button that turns the switch off. With the switch on and favorites that are all hidden by other filters, the generic `No indicators match your filters.` + *Clear filters* state applies.
- **`RFI-R-2.7`** The switch state MUST persist for the browser session (`sessionStorage`, key `pr.reporting.favoritesOnly`, `'1'`/`'0'`), mirroring `pr.burndown.onlyPending`; default off.

#### `RFI-R-3` — Persistence and identity
- **`RFI-R-3.1`** Favorites MUST persist across full page reloads for the same signed-in user (`localStorage` key `pr.reporting.favorites.v1.<userId>`; `userId` from the stored user, `anon` when absent).
- **`RFI-R-3.2`** A favorite key MUST be `${indicator_id}::${center_id ?? ''}::${__aowCode ?? ''}` — byte-identical to `ReportingAowTableComponent.rowKey()` — and the set MUST be scoped by programme code (`selected()?.initiativeCode`). A pin in SP01 MUST NOT appear in SP02 even when the indicator id and AoW code coincide.
- **`RFI-R-3.3`** When storage is unavailable or throws (private mode, quota), the service MUST keep working in memory for the session and MUST NOT throw. Corrupt or non-object JSON MUST load as an empty store.
- **`RFI-R-3.4`** The stored payload MUST contain only programme codes and favorite keys — no names, e-mails, or tokens (`.cursorrules`, PRD AC-9).

#### `RFI-R-4` — Composition with existing filters
- **`RFI-R-4.1`** Favorites-only MUST compose by intersection (AND) with every other Reporting filter: at the host, with Section / Type / Category (already applied in `reportingGroups()`) and Only-pending — the favorites step runs **after** `applyBurndownFilterAndSort`, so the Remaining-work order and the `__allIndicators` semantics are preserved; at the table, the child's own search, Status and in-card Center / Type filters keep applying to the favorites subset through `visibleRows` (nothing bypasses them).
- **`RFI-R-4.2`** With the switch off, `reportingGroupsForTable()` MUST be byte-identical to today's output (no silent default change — same rule as MRF).

### Should (SHOULD)
- **`RFI-R-10`** The star SHOULD be 28px in the flat table and 26px in the grouped rows, matching the adjacent *Copy link* control; the action grid tracks SHOULD widen by exactly the control + gap (32px grouped, 34px flat) and the grouped sub-header floor (`.pr-hlo-head` min-width) by the same 32px, so nothing wraps or overflows at 1280 / 1024 / 900 / 768px.

### Could (MAY)
- **`RFI-R-20`** A future spec MAY replace the `localStorage` store with a backend preferences endpoint behind the same service API (RFI-DD-2).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | Favorites filtering is O(rows) per recompute over an in-memory `Set`; no network calls. |
| Security / Privacy | No PII beyond the numeric user id already stored under `user`; nothing logged. |
| Accessibility | Star: `aria-pressed`, `aria-label`, `focus-visible` ring (`--pr-color-primary-300`). Switch: `role="switch"`, `aria-checked`. Colour-independent state (icon glyph changes). WCAG 2.1 AA per `docs/ux-ui/design.md` §10. |
| Design system | Tailwind-first; `material-icons-round` glyphs; violet accent tokens for active states (`docs/ux-ui/design.md` §7 brand line). |
| Backwards compatibility | All new inputs have defaults; existing consumers of `reporting-aow-table` / `reporting-program-band` compile unchanged. |
| i18n | Copy is English literal, like every other string in `dashboard-lab` (module convention — no i18n keys exist there yet). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RFI-AC-1` | A grouped card with two rows, none favorite | The user clicks the star on row A | `toggleFavorite` emits row A exactly once; `openRow` does not emit; the star of row A renders `aria-pressed="true"` once `favoriteKeys` contains its key. |
| `RFI-AC-2` | The flat *All indicators* table | The user clicks the star on a row | Same as AC-1 for the flat cell (`.pr-flat-cell`). |
| `RFI-AC-3` | Service with user id 7 and empty storage | `toggle('SP01', k1)`, then a new service instance is created | `setOf('SP01')` contains `k1`; `setOf('SP02')` is empty; `localStorage['pr.reporting.favorites.v1.7']` holds `{"SP01":["k1"]}`. |
| `RFI-AC-4` | `localStorage.getItem` throws | Service loads and the user toggles | No exception; the in-memory set reflects the toggle. |
| `RFI-AC-5` | Storage holds `"not json"` or `[]` | Service loads | Empty store, no exception. |
| `RFI-AC-6` | Two cards: AoW01 (rows a,b), AoW02 (rows c) ; favorites = {a} ; switch on | `reportingGroupsForTable()` recomputes | AoW01 lists only `a` with `count 1` and `__allIndicators = [a,b]`; AoW02 is absent; a `loading` card remains. |
| `RFI-AC-7` | Same data, switch off | Recompute | Output deep-equals the pre-change pipeline output (no `__allIndicators`, counts untouched). |
| `RFI-AC-8` | Switch on, Only-pending on | Recompute | Rows are the intersection; `__allIndicators` equals the pre-Only-pending set (burndown's), not the favorites-filtered set. |
| `RFI-AC-9` | Switch on | `clearReportingFilters()` | `favoritesOnly()` is `false`; `reportingFiltersActive()` is `false`; the favorite set is unchanged. |
| `RFI-AC-10` | Switch on, zero favorites | Table renders | Empty state shows the RFI-R-2.6 copy and `Show all indicators`; clicking it emits `exitFavoritesOnly`. |
| `RFI-AC-11` | Band with `favoritesCount = 3`, `favoritesOnly = false`, `compactFilters = false` | Renders / user clicks the switch | Button text contains `Favorites` and `3`; `aria-checked="false"`; click emits `favoritesOnlyChange(true)`. |
| `RFI-AC-12` | Band with `compactFilters = true` | Renders | No `[role="switch"]` labelled Favorites in the DOM. |
| `RFI-AC-13` | `sessionStorage['pr.reporting.favoritesOnly'] = '1'` | Host is created | `favoritesOnly()` is `true`; `setFavoritesOnly(false)` writes `'0'`. |
| `RFI-AC-14` | Any `ReportingIndicator` fixture | `favoriteKeyOf(row)` vs `component.rowKey(row)` | Strings are identical. |
| `RFI-AC-15` | Host with switch on, favorites = {a}, card AoW01 rows a,b | `component.toggleFavorite(b)` | `reportingGroupsForTable()` now lists `a` and `b` for AoW01 (the service `Set` is signal-reactive end to end). |
| `RFI-AC-16` | Table with `favoritesOnly = true`, `favoriteKeys = {a}`, `filtersActive = true`, and `statusFilter` that hides `a` | Renders | The generic `No indicators match your filters.` + *Clear filters* state shows — not the RFI-R-2.6 "No favorite indicators yet" copy. |

Cross-cutting PRD ACs that apply unchanged: AC-3 (authorization — client-only, no new surface), AC-9 (security and secrets).

## 9. Dependencies & Assumptions
- Upstream: `ApiService.authSE.localStorageUser.id` for the user scope (already read by `dashboard-lab` for the tour). `ReportingAowGroup` / `ReportingIndicator` shapes from `reporting-aow-table.component.ts`.
- Concurrent: RHSF-T-2..T-5 edit the same components in another checkout; this spec's hunks are confined to the action cells, the toolbar row after *Only pending*, the host bindings, and new members. Merge order: RHSF first, then this branch.
- Assumption: the `user` entry in `localStorage` is present for every authenticated session (it is written by `AuthService.localStorageUser`).

## 10. Open Questions
- `RFI-OQ-1` Session persistence of the switch — **resolved** (yes, `sessionStorage`; see `proposal.md` §11).
- `RFI-OQ-2` Should Intermediate / 2030 bucket rows be pinnable? **Resolved:** yes — same template, same key format (`__aowCode` carries the source AoW code or the bucket sentinel), no special case.

## 11. Out-of-Band Notes
- Backend preferences endpoint is a candidate follow-up spec (`changes/user-preferences-api`); the service API (`setOf`, `isFavorite`, `toggle`, `count`) is the contract it must honour.
