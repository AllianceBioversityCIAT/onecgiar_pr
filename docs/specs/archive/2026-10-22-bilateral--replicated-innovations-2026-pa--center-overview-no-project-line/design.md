# Design — "Updated 2025 innovations with no 2026 project" line in the Center Overview

## 1. Summary

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-no-project-line/` |
| Requirements | `requirements.md` (`CNP-R-1..5`, `CNP-AC-1..9`) |
| Depth | Standard |
| Status | approved 2026-10-21 (owner) |
| Date | 2026-10-21 |
| Budget (`/akili-execute` tripwire) | **5 tasks (4 code + 1 HITL) · ~300 LOC incl. tests (~110 production) · ≤ 2 review rounds per task** |

**Approach.** Client only. One exported predicate, `isUpdatedNoProjectRow(row)`, lives next to `filterCenterResults` and is the single definition of the group. Three things use it:

1. The Overview aggregate, which counts the bucket and subtracts it from the generic no-project line.
2. `filterCenterResults`, when the new contract key `group=updated-no-project` is set.
3. The Results tab, which reads the key from an Overview link and shows it as a removable chip.

Reconciliation holds by construction (`COV-R-13`): the same function runs over the same scoped rows on both sides. No server, migration or payload change.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `CNP-P-1` | The bars and the generic no-project line group by the row's `project_id`. `project_id` is any active `results_by_projects` row (center-owned first, then lead, then newest), null only when the result has no active project | `result.repository.ts` `getResultsByBilateralCenter`, correlated subquery `ORDER BY rbp.project_id IN (center_projects) DESC, rbp.is_lead DESC` · `rollupByProject` in `bilateral-overview.aggregate.ts` (`project_id == null` → `noProject`) | Read both 2026-10-21 | `verified` | If `project_id` were lead-only, a contributing-only row would sit in the no-project line; the predicate stays the same, only `CNP-OQ-3` wording changes |
| `CNP-P-2` | Overview and Results tab filter the same rows with `filterCenterResults` | `bilateral-overview.component.ts:279` `scopedRows = filterCenterResults(entry.results, params())` · `bilateral-results-list.component.ts:586` `filteredResults = filterCenterResults(results(), currentContractParams())`. Results fetches the `scope=bilateral` row set when its URL has `scope` (`:735-743`) | Both call sites quoted | `verified` | Reconciliation would need a second mechanism; re-specify `CNP-T-1` |
| `CNP-P-3` | `project=[]` in a link means "no project filter", so the current no-project link opens every scoped W3 row | `bilateral-result-filter.ts:17` `projectIds = params.project.length ? … : null` | Read 2026-10-21 | `verified` | — (this is why a new key is needed, `CNP-DD-2`) |
| `CNP-P-4` | Only the Overview and the Results tab call `filterCenterResults`. `bilateral-projects-panel` and `my-draft-results` parse the contract but read individual keys | grep `filterCenterResults` over `pages/bilateral` (non-spec): `bilateral-results-list`, `bilateral-overview.component`, `aggregate` (import), `bilateral-overview.cy.ts` | grep 2026-10-21 | `verified` | A consumer that spreads all params into the filter would start narrowing on `group`; `CNP-T-1` runs `--findRelatedTests` on the contract files |
| `CNP-P-5` | `buildOverviewModel` already receives the selected `Phases` (with `phase_year`) | `bilateral-overview.component.ts:305` | Read | `verified` | Label falls back to the year-free copy (`CNP-R-5`) |
| `CNP-P-6` | Wire flags arrive as strings or booleans (`is_replicated: true`, `'1'`; `result_type_id: '7'`) | `bilateral-overview/CLAUDE.md` gotchas; `resolveOverviewCategory` uses `Number(row.is_replicated) === 1` | Read | `verified` | — (predicate uses `Number()` on every field) |
| `CNP-P-7` | Replication copies innovations only, so on real data the generic line usually becomes empty | Memory `project_innovation_bulk_duplication_rule` (Nicoleta); not queried | Not verified | `assumed` | Nothing breaks: the type condition is explicit. The generic line simply keeps the non-innovation rows (§13) |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | File | Change |
|---|---|---|
| Contract | `pages/bilateral/bilateral-query-params.ts` | New key `group`, value space `['updated-no-project']`, `group: BilateralGroup \| null` in `BilateralQueryParams`, `'group'` in `ContractKey`, parse/serialize/strip like `scope` |
| Filter | `pages/bilateral/bilateral-result-filter.ts` | Exported `isUpdatedNoProjectRow(row)`; `filterCenterResults` keeps only matching rows when `params.group` is set |
| Overview model | `pages/bilateral-overview/bilateral-overview.aggregate.ts` | `rollupByProject` routes matching rows to a new `updatedNoProject` count before the no-project branch; `OverviewByProjectModel.updatedNoProjectCount`; generic `noProjectRow` excludes them |
| Overview charts | `bilateral-overview.charts.ts` | `byProjectTable` summary adds one sentence for the new count |
| Overview view | `bilateral-overview.component.ts` / `.html` | New line + link, label computed from `selectedPhase().phase_year`, empty-state condition gains one term, `params()` forces `group: null`, `deepLinkParams` emits `group: null` |
| Results tab | `pages/bilateral-results-list/bilateral-results-list.component.ts` | `group` signal hydrated by `applyUrlParams`, included in `currentContractParams`, new chip dimension `'group'`, key added to `RESULTS_TAB_MANAGED_QUERY_PARAMS`, cleared by "Clear filters" |
| Folder docs | `bilateral-overview/CLAUDE.md`, `bilateral-results-list/CLAUDE.md` | Invariant line + re-stamped `Verified:` (the Overview guide is over its 120-line cap: trim while editing) |

### 2.2 Interaction

1. The Overview builds the model from `scopedRows`. `rollupByProject` sends each matching row to `updatedNoProject`, other null-project rows to `noProject` (as today), and the rest to bars.
2. The card renders the line when `updatedNoProjectCount > 0`. Its link is `resultsLinkParams({ group: 'updated-no-project' })`, so it carries `scope=bilateral`, `phase`, the current filters and the explicit defaults.
3. The Results tab parses `group`, fetches the scoped rows for the phase (as today with `scope`), and `filterCenterResults` keeps the matching rows. A chip "Updated innovations with no project" is shown.
4. Removing the chip clears the signal, `writeUrl` drops the key, and the computed list widens. No refetch is needed (the filter is client-side; the row set does not change).

## 3. Data Model Changes

None.

## 4. API Surface

No endpoint change. The only new surface is the client query key:

| Key | Values | Read by | Emitted by |
|---|---|---|---|
| `group` | `updated-no-project`; anything else → `null` and reported in `stripped` | Results tab only | The Overview updated-no-project link only |

`explicitDefaults` never emits it. Serialized only when non-null. `bilateral-result-summaries.en.md` is not touched.

## 5. Server Workflow / Business Rules

No server work. Business rule (client), written once in `isUpdatedNoProjectRow`:

- `Number(row.is_replicated) === 1`
- `row.source === 'API'`
- `Number(row.result_type_id)` ∈ {7, 2}, via a named constant (`UPDATED_INNOVATION_TYPE_IDS`)
- `row.project_id` is null or undefined

## 6. Frontend Plan

### 6.1 Routes / modules

No route change.

### 6.2 Components & services

| Unit | Design |
|---|---|
| `bilateral-query-params.ts` | `BILATERAL_GROUP_QUERY_PARAM = 'group'`, `GROUP_VALUES = ['updated-no-project']`, parsed with the same single-enum helper as `scope` (no `all` token). Update the header comment's key count (also clears the stale "nine keys" follow-up from child #3 where it is touched) |
| `bilateral-result-filter.ts` | `isUpdatedNoProjectRow` exported; `filterCenterResults` adds one guard `if (params.group === 'updated-no-project' && !isUpdatedNoProjectRow(row)) return false`. Placed after the project guard; independent of it |
| `bilateral-overview.aggregate.ts` | Imports the predicate (no second copy, `COV-DD-1`). `ProjectRollup` gains `updatedNoProject: number`. The predicate check comes **before** the `project_id == null` branch, so a row is counted once. `noProject` (total and categories) therefore excludes it with no subtraction arithmetic. `buildByProjectModel` exposes `updatedNoProjectCount`. `buildProjectsCoveredKpi` is unaffected (it reads only `perProject`) |
| `bilateral-overview.charts.ts` | `byProjectTable` summary: `" {n} updated innovations have no project in this phase."` when `n > 0` |
| `bilateral-overview.component.ts` | `updatedNoProjectLabel` computed from `selectedPhase()?.phase_year` (`CNP-R-5`, fallback copy when null). `params()` is set with `group: null` wherever it is assigned from the URL, so the Overview never narrows its cards (`CNP-R-2` BUT). `deepLinkParams` adds `group: null` next to `scope: null` |
| `bilateral-overview.component.html` | New `<a data-testid="by-project-updated-no-project">` **before** the generic line, same dashed pattern, count in `font-mono tabular-nums`, `aria-label` = label + count + "open in Results". Empty-state `@if` adds `!model().byProject.updatedNoProjectCount` |
| `bilateral-results-list.component.ts` | `readonly group = signal<BilateralGroup \| null>(null)`; set in `applyUrlParams`; in `currentContractParams`; chip `{ dimension: 'group', label: 'Updated innovations with no project' }`; `removeChip('group')` and `clearFilters` reset it; `hasActiveFilters` counts it; key added to `RESULTS_TAB_MANAGED_QUERY_PARAMS` (comment count updated). Not added to the fetch `combineLatest` (client-side filter) |

### 6.3 Design system usage

No new component. The line copies the generic line's classes (dashed border, 12px, `--pr-*` tokens, focus ring). The chip reuses the Results tab chip. No Spartan primitive is added, so no Spartan MCP lookup is needed. Responsive: the card's link row already wraps; the new line is a block like the generic one, so ≤ 899 px behaves the same (checked in `CNP-AC-9`).

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

No new server input. The key is a closed enum; unknown values are stripped. Nothing logged.

## 8. Performance & Capacity

One predicate call per row inside loops that already exist. No new request.

## 9. Observability

None.

## 10. Testing Plan

Jest only, `--maxWorkers=2`, `--findRelatedTests` on the changed files (memory `findrelatedtests_before_push`).

| Spec | Assertion | Covers |
|---|---|---|
| `bilateral-query-params.spec.ts` | `group` parse / serialize / unknown → stripped; absent from `explicitDefaults` output | `CNP-AC-4` |
| `bilateral-result-filter.spec.ts` | Predicate truth table incl. string/boolean flags; `filterCenterResults` with `group` returns exactly the rows the aggregate counts on a shared fixture | `CNP-AC-2`, `CNP-AC-5` |
| `bilateral-overview.aggregate.spec.ts` | 24 / 3 / 2 fixture → 24 and 5; identity bars + generic + updated + unmatched = Total; `type=[1]` → 0 | `CNP-AC-1..3` |
| `bilateral-overview.charts.spec.ts` | Summary sentence present when n > 0, absent at 0 | `CNP-R-5` |
| `bilateral-overview.component.spec.ts` | Line rendered/hidden; link params carry `group` + `scope` + `phase`; Reporting/Draft links lack `group`; `?group=` on the Overview URL does not change the Total; label 2026 → "2025/2026", null year → fallback; empty-state condition | `CNP-AC-3`, `-6`, `-8` |
| `bilateral-results-list.component.spec.ts` | `?group=` → chip + filtered rows; chip removal → key gone, rows widen; no key → unchanged | `CNP-AC-7` |
| HITL on PRTest | One center with rows (ILRI/CIP), Reporting 2026: line = Results visible count; identity; visual at desktop and ≤ 899 px | `CNP-AC-9` |

What fixtures cannot prove: real `project_id` resolution and real row shapes (`KZ-EVM-1`). That is the HITL check.

## 11. Backwards Compatibility & Migration Plan

- Additive client key; a URL without it behaves as today on every tab.
- No server dependency beyond child #3, which is already on PRTest.
- Rollback: revert the client commit. Old links carrying `group` are then ignored (the reverted parser does not read the key), which is harmless.

## 12. Design Decisions

### `CNP-DD-1` — "No project" = row `project_id` null (`CNP-OQ-3`)

- **Context:** `family.md` §3 defines "no 2026 project" as no active **lead** row; the card groups by `project_id`, which is any active project.
- **Decision:** use `project_id` null.
- **Alternatives:** (a) lead-only — needs a new server field and would count a contributing-only result on a bar and on this line; (b) center-owned-only — same overlap with the other-centers line.
- **Consequences:** a replicated innovation with only a contributing project stays on that project's bar. Stated in the INC-164073 reply.

### `CNP-DD-2` — One `group` key with a shared predicate

- **Context:** the link must reconcile; the Results tab has no "no project" filter (`CNP-P-3`).
- **Decision:** a single enum key whose filter is the same function the aggregate uses.
- **Alternatives:** (a) `project=none` token + a `replicated` key — two keys, and `project` changes type from `number[]`, touching every project multiselect; (b) `project=[]` + `type=7,2` + `source=w3` — does not filter no-project rows, so it never reconciles.
- **Consequences:** one more contract key (12) and chip dimension. A future group (e.g. "generic no project") can reuse the key with a new value, which would also close `CNP-OQ-4`.

### `CNP-DD-3` — The Overview ignores `group` in its own URL

- **Context:** the Overview and Results share `filterCenterResults`; a pasted URL could carry `group`.
- **Decision:** the Overview sets `group: null` before filtering and in `deepLinkParams`.
- **Alternatives:** narrow every card (confusing: one line would equal the Total); strip and rewrite the URL (more code, same effect).
- **Consequences:** none for users; documented in the folder guide.

### `CNP-DD-4` — Generic no-project line loses the bucket *(reversion)*

**Challenge (Step 2.3, run inline): "what does removing these rows from the generic line break?"**

1. `byProjectTable` summary reads `noProjectRow.total` — updated to add the new sentence, so the a11y text still accounts for every row.
2. `CWS-AC-5` identity spec (bars + no-project + unmatched = Total) gains a term; the spec is updated in the same task.
3. The card's empty-state condition reads `noProjectRow`; without the new term, a center whose only rows are updated-no-project would show "No project has reported…" next to a line. Fixed in `CNP-T-3`.
4. `bilateral-projects-panel` and Projects covered do not read `noProjectRow` (grep). The Cypress CT fixture only measures layout.

No other consumer. Accepted with fixes 1-3.

## 13. Open Gaps & Follow-ups

- Copy confirmation with Nicoleta: `CNP-OQ-1` (label), `CNP-OQ-2` (types), `CNP-OQ-3` (no project vs no lead).
- `CNP-OQ-4`: the generic no-project link still opens all scoped W3 rows (pre-existing).
- `CNP-P-7` assumed: if replicated non-innovation W3 rows exist, they stay in the generic line, by design.
- Sizing: 5 tasks (contract + filter, aggregate + charts, Overview view, Results tab, HITL), ~300 LOC including tests. That matches Standard depth; no change of depth recommended.
