# Design — Favorite Indicators & Focus View (`changes/reporting-favorite-indicators`)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-favorite-indicators` |
| Short Prefix | `RFI` |
| Approval Mode | `pre-approved` |
| Depth | Standard |
| Requirements Ref | [`requirements.md`](./requirements.md) (`RFI-R-1` .. `RFI-R-4`, `RFI-AC-1` .. `RFI-AC-14`) |
| Baseline | `docs/ux-ui/design.md` §7 (tokens, brand line), §8 (component rules), §10 (a11y); `docs/trd/trd.md` §6 (frontend state boundaries) |
| Execution limits | ≤ 1 Reviewer rework round per task (a second FAIL escalates); verification = targeted `npx jest <spec>` only; no full client test run (`feedback-pragmatic-akili-execution`) |

---

## 1. Summary
A root-provided `ReportingFavoritesService` keeps `Record<programCode, favoriteKey[]>` per user in `localStorage` behind a signal. `DashboardLabComponent` (host) owns the wiring: it derives the programme's favorite `Set`, applies a favorites-only step **after** the burndown pipeline, and passes state down to two presentation components — `reporting-aow-table` (star per row, empty state) and `reporting-program-band` (focus switch). No server change. Trade-off accepted: pins are per browser until a backend store exists (RFI-DD-2).

## 2. Architecture Overview

### 2.1 Where this lives
- **Client modules touched:** `pages/result-framework-reporting/pages/dashboard-lab/` — `services/reporting-favorites.service.ts` (new), `dashboard-lab.component.{ts,html}`, `components/reporting-aow-table/reporting-aow-table.component.{ts,html,scss}`, `components/reporting-program-band/reporting-program-band.component.{ts,html}`.
- **Server / integrations:** none.

### 2.2 Interaction sequence
```
[reporting-aow-table]  click ★ on row  ──emitAndStop──►  (toggleFavorite: row)
        ▲                                                       │
        │ [favoriteKeys] [favoritesOnly]                        ▼
[dashboard-lab host] ── favoritesSE.toggle(programCode, favoriteKeyOf(row))
        │                     └─ signal update ─► localStorage.setItem(key, JSON)
        │ programFavoriteKeys = computed(() => favoritesSE.setOf(programCode))
        │ reportingGroupsForTable = applyFavoritesFilter(applyBurndownFilterAndSort(reportingGroups()))
        ▼
[reporting-program-band]  [favoritesOnly] [favoritesCount]  ──(favoritesOnlyChange)──► host.setFavoritesOnly(v)
                                                                                └─ sessionStorage 'pr.reporting.favoritesOnly'
```

## 3. Data Model & State Contracts

### 3.1 Storage
| Key | Store | Shape | Owner |
|---|---|---|---|
| `pr.reporting.favorites.v1.<userId>` | `localStorage` | `{ [programCode: string]: string[] }` — arrays of favorite keys, deduplicated, insertion order | `ReportingFavoritesService` |
| `pr.reporting.favoritesOnly` | `sessionStorage` | `'1' \| '0'` | `DashboardLabComponent` |

`userId` = `api.authSE?.localStorageUser?.id ?? 'anon'`. The `v1` segment is the schema version.

### 3.2 Favorite key
```ts
export function favoriteKeyOf(row: Pick<ReportingIndicator, 'indicator_id' | 'center_id' | '__aowCode'>): string {
  return `${row.indicator_id}::${row.center_id ?? ''}::${row.__aowCode ?? ''}`;
}
```
Lives in `reporting-favorites.service.ts` (exported). Must stay byte-identical to `ReportingAowTableComponent.rowKey()` (RFI-AC-14 pins it).

### 3.3 Service API (`ReportingFavoritesService`, `@Injectable({ providedIn: 'root' })`)
```ts
readonly byProgram: Signal<Readonly<Record<string, readonly string[]>>>;   // whole store (read-only view)
setOf(programCode: string): ReadonlySet<string>;   // reactive when read inside computed()
isFavorite(programCode: string, key: string): boolean;
toggle(programCode: string, key: string): void;    // add ⇄ remove, then persist
count(programCode: string): number;
```
Internals: `private readonly store = signal<Record<string, string[]>>(this.load())`; `load()` wraps `getItem` + `JSON.parse` in try/catch and rejects non-plain-object payloads (arrays, null, strings) → `{}`; `persist()` wraps `setItem` in try/catch (comment: storage may be unavailable — memory copy still serves the session). Empty program arrays are deleted from the record on persist so the store never grows with `[]` entries. Uses `inject(ApiService)` for the user id (`api.authSE?.localStorageUser?.id`); `ApiService` is already a host dependency and is mocked as `{ resultsSE: ... }` in the host specs, so the optional chain must tolerate a missing `authSE`.

## 4. API Surface
None (client only).

## 5. Server Workflow
None.

## 6. Frontend Plan

### 6.1 `reporting-aow-table` (presentation only — RFI-R-1.4)
New members:
```ts
readonly favoriteKeys = input<ReadonlySet<string>>(new Set<string>());
readonly favoritesOnly = input<boolean>(false);
readonly toggleFavorite = output<ReportingIndicator>();
readonly exitFavoritesOnly = output<void>();
isFavorite(row: ReportingIndicator): boolean { return this.favoriteKeys().has(this.rowKey(row)); }
favoriteLabel(row): string { return this.isFavorite(row) ? 'Remove from favorites' : 'Add to favorites'; }
```
Template — star button inserted as the **first** child of both action cells (grouped `#indicatorRow` block "7 — Report / Continue", flat `<td class="pr-flat-cell flex items-center justify-end gap-[6px]">`), before *Copy link*:
```html
<button type="button"
  class="inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer appearance-none items-center justify-center rounded-[6px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pr-color-primary-300)]"
  [class]="isFavorite(row)
    ? 'border-[var(--pr-color-primary-200)] bg-[var(--pr-color-primary-50)] text-[var(--pr-color-primary-500)] hover:bg-[var(--pr-color-primary-100)]'
    : 'border-[var(--pr-border)] bg-[var(--pr-surface-card)] text-[var(--pr-text-subtle)] hover:bg-[var(--pr-surface-subtle)] hover:text-[var(--pr-color-primary-500)]'"
  [attr.aria-pressed]="isFavorite(row)"
  [attr.aria-label]="favoriteLabel(row)"
  [title]="favoriteLabel(row)"
  data-testid="favorite-toggle"
  (click)="emitAndStop(toggleFavorite, row, $event)">
  <span class="material-icons-round text-[15px]" aria-hidden="true">{{ isFavorite(row) ? 'star' : 'star_outline' }}</span>
</button>
```
Flat cell uses `h-[28px] w-[28px] rounded-[8px]` to match its *Copy link*. Angular merges static `class` with `[class]` string bindings — the shared utilities stay in the static attribute, the state-dependent ones in the binding (same pattern as the band's *Only pending* button).

Grid tracks (`reporting-aow-table.component.scss`): `$pr-reporting-tracks` action track `108px → 140px` (26px star + 6px gap); `$pr-flat-tracks` last track `150px → 184px`, and its two wider breakpoint overrides `176px → 210px`, `190px → 224px` (28px star + 6px gap = 34px, JD-3); `.pr-hlo-head { min-width: 820px }` → `852px` so the sub-header's floor grows with the row (JD-4). Only numeric edits to existing rules — no new SCSS blocks, brand rule §7.1.

Empty state — both table-level blocks (`prTableEmpty` and `@if (!visibleGroups().length)`): add a first branch
```html
@if (favoritesOnly() && favoriteKeys().size === 0) {
  <p class="m-0 text-[14px]">No favorite indicators yet. Use the ★ on any indicator row to build your focus list.</p>
  <button type="button" class="pr-clear-filters" (click)="exitFavoritesOnly.emit()">Show all indicators</button>
} @else if (filtersActive()) { …existing… } @else { …existing… }
```
The per-card empty block (`@if (!bands.length)`, ~line 598) IS reachable under favorites-only (JD-5): (a) a still-`loading` card kept by RFI-R-2.3 has no bands yet, and (b) a card kept for one favorite whose rows the child's own search / Status / Center / Type filters then hide. Guard it: `@if (!bands.length && !group.loading)` so case (a) shows nothing while the data arrives; case (b) correctly falls into the existing `filtersActive()` branch ("No indicators match the current filters.") because the host sets `filtersActive` while the switch is on.

### 6.2 `reporting-program-band`
```ts
readonly favoritesOnly = input<boolean>(false);
readonly favoritesCount = input<number>(0);
readonly favoritesOnlyChange = output<boolean>();
```
Template — immediately after the *Only pending* switch, inside `@if (!compactFilters())`:
```html
@if (!compactFilters()) {
  <button type="button" role="switch" [attr.aria-checked]="favoritesOnly()"
    data-testid="favorites-switch"
    class="flex h-[34px] shrink-0 cursor-pointer items-center gap-[6px] rounded-[8px] border px-[12px] text-[13px] font-medium transition-colors"
    [class]="favoritesOnly()
      ? 'border-[var(--pr-color-primary-300)] bg-[var(--pr-color-primary-50)] font-semibold text-[var(--pr-color-primary-400)]'
      : 'border-[var(--pr-border)] bg-[var(--pr-surface-card)] text-[var(--pr-text-secondary)] hover:border-[var(--pr-color-primary-300)] hover:text-[var(--pr-color-primary-400)]'"
    (click)="favoritesOnlyChange.emit(!favoritesOnly())">
    <span class="material-icons-round text-[16px]" aria-hidden="true">{{ favoritesOnly() ? 'star' : 'star_outline' }}</span>
    Favorites
    <span class="tabular-nums text-[12px] text-[var(--pr-text-subtle)]">({{ favoritesCount() }})</span>
  </button>
}
```
`hasActiveFilters` / `activeFilterCount` are **not** changed: the host already passes `filtersActive`, which drives the *Clear filters* button.

### 6.3 `dashboard-lab` host
```ts
private readonly favoritesSE = inject(ReportingFavoritesService);
private static readonly FAVORITES_ONLY_STORAGE_KEY = 'pr.reporting.favoritesOnly';
readonly favoritesOnly = signal<boolean>(this.readStoredFavoritesOnly());   // same shape as readStoredOnlyPending
setFavoritesOnly(value: boolean): void;                                     // same shape as setOnlyPending
readonly programFavoriteKeys = computed(() => this.favoritesSE.setOf(this.selected()?.initiativeCode ?? ''));
readonly programFavoritesCount = computed(() => this.programFavoriteKeys().size);
toggleFavorite(row: ReportingIndicator): void { const code = this.selected()?.initiativeCode; if (!code) return; this.favoritesSE.toggle(code, favoriteKeyOf(row)); }
readonly reportingGroupsForTable = computed(() => this.applyFavoritesFilter(this.applyBurndownFilterAndSort(this.reportingGroups())));
```
`applyFavoritesFilter<G extends { indicators: any[]; count: number; loading?: boolean; __allIndicators?: any[] }>(groups: G[]): G[]`:
- `if (!this.favoritesOnly()) return groups;` (RFI-R-4.2 — identity, same array reference).
- Else for each group: `kept = g.indicators.filter(r => keys.has(favoriteKeyOf(r)))`; return `{ ...g, indicators: kept, count: kept.length, __allIndicators: g.__allIndicators ?? g.indicators }`; then drop `kept.length === 0 && !g.loading`.
- `reportingFiltersActive` adds `|| (this.favoritesOnly() && this.plannedBrowseView() === 'aows')` — the favorites step only wraps `reportingGroupsForTable`, not `plannedByAowSections`, and the switch is hidden in By AOW (RFI-R-2.2); an ungated clause would light *Clear filters* and the "match your filters" empty states in a view where nothing is filtered (JD-1, the P2-3405 defect class). `clearReportingFilters()` adds `this.setFavoritesOnly(false)` unconditionally.
- Return type of `applyFavoritesFilter` mirrors `applyBurndownFilterAndSort`: `(G & { __allIndicators?: any[] })[]`, not `G[]` — the object spread does not narrow back to `G` (JD-10).
- Accepted precedent (JD-13): with the switch on, the card's KPI pill (`countLabel(group.count)`), the in-card Center/Type chip counts (built from `group.indicators`) and the Remaining-work order (`groupPendingCount` runs in the burndown step, before favorites) all describe the favorites subset or the pre-favorites set exactly as they do under Only-pending today; only the header ratio is pinned to the full set (RFI-R-2.4).
- Template (`dashboard-lab.component.html`): table gets `[favoriteKeys]="programFavoriteKeys()" [favoritesOnly]="favoritesOnly()" (toggleFavorite)="toggleFavorite($event)" (exitFavoritesOnly)="setFavoritesOnly(false)"`; the Reporting band (the second `<app-reporting-program-band` instance, the one with `[search]`) gets `[favoritesOnly]="favoritesOnly()" [favoritesCount]="programFavoritesCount()" (favoritesOnlyChange)="setFavoritesOnly($event)"`.
- Add `// @akili-spec changes/reporting-favorite-indicators` on the new members.

### 6.4 Design system / a11y
- Icons `material-icons-round` (`star`, `star_outline`) — §7 brand line "always".
- Active state = violet accent tokens (`--pr-color-primary-50/200/300/400/500`), mirroring the *Only pending* active look — one visual language for "personal filter on".
- Focus ring `ring-[var(--pr-color-primary-300)]`; state conveyed by glyph + `aria-pressed`, never colour alone.
- Known, amplified gap (JD-11): the card collapse has no `inert` (`reporting-aow-table/CLAUDE.md`), so the star is one more tabbable-but-`aria-hidden` control per row while a card is closed. Not introduced here; recorded in §13, not fixed in this spec.

## 7. Security & Authorization
No new endpoint. Storage payload contains programme codes and composite numeric keys only (RFI-R-3.4). Nothing logged.

## 8. Performance & Capacity
`Set` lookups per row; the computed recomputes only when the store, the programme or the pipeline inputs change. No bundle-size impact (no new dependency).

## 9. Observability
None added.

## 10. Testing Plan
- **New spec files only** (merge-friendly with RHSF): `services/reporting-favorites.service.spec.ts`, `components/reporting-aow-table/reporting-aow-table.favorites.spec.ts`, `components/reporting-program-band/reporting-program-band.favorites.spec.ts`, `dashboard-lab.favorites.spec.ts`.
- Table spec: reuse the echarts `jest.mock` block from `reporting-aow-table.component.spec.ts` only if it imports from `dashboard-lab.component`; otherwise import the component alone. Assert via `data-testid="favorite-toggle"` inside `.pr-collapse.is-open` (collapsed panels stay mounted — see `reporting-aow-table/CLAUDE.md`).
- Host spec: mimic `dashboard-lab.mrf-burndown-session.spec.ts` (template overridden to `''`, `ApiService` mock, `emitToc` helper); assert on `reportingGroupsForTable()` shapes (RFI-AC-6..9, 13). Provide the real `ReportingFavoritesService` (jsdom `localStorage`) and clear storage in `beforeEach`.
- Band spec: mimic `reporting-program-band.component.spec.ts`'s `build()` helper.
- What a presence assertion cannot prove: that the widened tracks avoid wrapping. Recorded as a visual HITL check at merge (tasks.md §5) — jsdom cannot measure layout.

## 11. Backwards Compatibility
All new inputs default; outputs unbound elsewhere are inert. Unknown `localStorage` payloads load as `{}`. Removing the feature = deleting the two keys.

## 12. Design Decisions

### `RFI-DD-1` — Host-owned favorites, table stays presentation-only
- **Context:** `reporting-aow-table/CLAUDE.md` contract: no injected services; host owns data and filters.
- **Decision:** favorites travel as `favoriteKeys` input + `toggleFavorite` output; the host injects the service.
- **Alternatives:** inject in the table (breaks the contract, complicates the ratio interplay); a directive per star (over-engineering for one glyph).
- **Consequences:** four host bindings; testable pipeline in isolation.

### `RFI-DD-2` — `localStorage` store behind a signal service, versioned key
- **Context:** the brief allows "backend user preferences or local profile"; a backend store needs migration + API + VPN-backed verification and would delay Phase 2.
- **Decision:** `localStorage`, key `pr.reporting.favorites.v1.<userId>`, per-user and per-programme, with the whole store as one signal.
- **Alternatives:** backend endpoint now (rejected for cost); `sessionStorage` (loses pins on tab close — defeats the feature).
- **Consequences:** per-browser only; the service API is the contract a later backend swap must honour.

### `RFI-DD-3` — Favorites filter runs AFTER the burndown step
- **Context:** `applyBurndownFilterAndSort` writes `__allIndicators` (pre-Only-pending rows) for `ratioOf`.
- **Decision:** `applyFavoritesFilter` consumes burndown output, preserves order, sets `__allIndicators = g.__allIndicators ?? g.indicators`.
- **Alternatives:** before burndown (ratio would then count only favorites — wrong per RFI-R-2.4); inside the table's `visibleRows` (would hide rows but keep empty cards and break `count`).
- **Consequences:** one extra `map`/`filter` pass; identity return when off keeps RFI-R-4.2 trivially true.

### `RFI-DD-4` — Violet accent (not yellow) for the active star and switch
- **Context:** the brief's mockup uses ⭐; `--pr-color-yellow-300` is reserved for warnings / in-progress (§7 colour families).
- **Decision:** active star = `--pr-color-primary-500` on `primary-50`, matching *Only pending* on; glyph change carries the state.
- **Alternatives:** yellow (semantic collision with warnings); emoji (mixed icon set, brand rule).
- **Consequences:** consistent "personal filter" language across star and switch.

### `RFI-DD-5` — The focus switch is session-global, pins are programme-scoped
- **Context:** `pr.reporting.favoritesOnly` is one scalar (RFI-R-2.7) while favorites live per programme (RFI-R-3.2); switching programme with the switch on lands on a programme with no pins (JD-12).
- **Decision:** accept it. The user sees the RFI-R-2.6 empty state ("No favorite indicators yet … Show all indicators") with a one-click way out, and the switch stays visible in the toolbar. Mirrors *Only pending*, which is also session-global.
- **Alternatives:** scope the session key by programme (more state, and a user who focuses usually works one programme at a time); auto-disable on programme change (silent state change — rejected, same rule as MRF).
- **Consequences:** documented behaviour, covered by the empty-state AC.

## 13. Open Gaps & Follow-ups
- Stars in the *By AOW* view rows and in the indicator drawer header (follow-up spec).
- Backend preferences endpoint (`changes/user-preferences-api`).
- URL parameter `fav=1` once RHSF-T-5's URL sync effect has landed.
- Kaizen candidate: RHSF and RFI touch the same three components concurrently — record the worktree-per-spec practice.
- `inert` on `.pr-collapse` (shared `src/styles/collapse.scss`) — closes the tabbable-but-hidden gap for all 20+ controls per closed card (JD-11).
- Cross-tab sync of pins (`storage` event) and per-entry array validation in `load()` — Reviewer advisories from RFI-T-1.

## 15. Judgment pass (single T3 review, 2026-09-05)
| ID | Severity | Disposition |
|---|---|---|
| JD-1 | BLOCKER | Fixed — `reportingFiltersActive` clause gated on `plannedBrowseView() === 'aows'` (§6.3, RFI-R-2.5) |
| JD-2 | MAJOR | Fixed — `RFI-AC-15` (toggle through the host with the switch on updates the table pipeline) added to T-4 |
| JD-3 | MAJOR | Fixed — flat tracks +34px (`184/210/224`), RFI-R-10 reworded |
| JD-4 | MAJOR | Fixed — `.pr-hlo-head` min-width `852px`; HITL-1 now covers 1280 / 1024 / 900 / 768 |
| JD-5 | MAJOR | Fixed — per-card empty block guarded with `!group.loading` (§6.1) |
| JD-6 | MINOR | Fixed — RFI-R-4.1 restated (host vs child filters); table-level composition test added to T-2 |
| JD-7 | MINOR | Fixed — `RFI-AC-16` (favorites present, all hidden → generic empty state) added to T-2 |
| JD-8 | MINOR | Accepted as a Reviewer check ("no import of `reporting-favorites.service` in the component"); a TestBed assertion cannot falsify a root-provided service |
| JD-9 | MINOR | Fixed — requirements §3 wording |
| JD-10 | MINOR | Fixed — return type mirrors `applyBurndownFilterAndSort` |
| JD-11 | MINOR | Recorded (§6.4, §13) |
| JD-12 | MINOR | Recorded as `RFI-DD-5` |
| JD-13 | MINOR | Recorded (§6.3 accepted precedent) |
| JD-14 | MINOR | Fixed — T-2 corrects the stale track numbers in `reporting-aow-table/CLAUDE.md`; `design-tokens.spec.ts` added to T-4's verification |

## 14. Sizing & Tripwire Budget
| Metric | Expected |
|---|---|
| Tasks | 4 (T-2 ∥ T-3 after T-1; T-4 last) |
| Production LOC | ~300 (service 90, table 60, band 30, host 80, scss 4, docs 40) |
| Test LOC | ~350 across four new spec files |
| Reviewer rounds | ≤ 1 rework per task (4 first-pass reviews + ≤ 4 reworks hard cap; expected 0–1 reworks total) |
| Wall time | ~25–35 min/task with the triad |
Depth `Standard` matches.
