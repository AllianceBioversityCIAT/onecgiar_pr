# Design — Filter the programme Results tab by Created by

**One line:** add an eighth clientside filter dimension (`createdBy`) to the existing Results tab filter service and URL bridge. No backend, no new component, no new token.

## 1. Summary

This design extends the programme Results tab (`entity-details/:entityId/results`) so **Created by** is a first-class filter, identical in shape to Center. The display string already on each row is the match key, the option list, and the chip value. The Filter popover gains one `app-pr-filter-select`; the hydrate/mirror effects gain one query param.

Biggest constraint: stay inside `programme-results/` and reuse `RFD-DD-1`…`RFD-DD-5`. Do not invent a second filter stack.

Linked: `./requirements.md` (`CBF-R-1`…`R-3`) · `docs/prd.md` G1 / `US-P1` · `docs/ux-ui/design.md` §2 / §10 · `docs/trd/trd.md` results list · archived sibling `docs/specs/archive/2026-08-27-changes--sp-overview-echarts/results-tab-filter-deeplink/`.

**Status:** `approved` (Phase 2, 2026-09-03).

**Budget (Step 2.4):** **2 tasks · ~160 LOC (≈70 src + ≈90 spec) · 1 review round.** Matches Lite (same size as the Center + URL sibling).

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Touched? |
|---|---|
| Server | No |
| Client | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/` only |
| External | No |

| File | Change |
|---|---|
| `services/programme-results-filter.service.ts` | Eighth dimension: signal, state field, predicate clause, chip, `clearChip` / `clearAll` |
| `services/programme-results-query-params.ts` | One new map entry (`createdBy` → `createdBy`) |
| `services/programme-results.service.ts` | One more `optionsOf(rows, createdBy)` list |
| `programme-results.component.ts` | Hydrate + mirror the new param; one `onCreatedByChange`; one select-options computed |
| `programme-results.component.html` | One Created by `app-pr-filter-select` on the Center row |
| the three `*.spec.ts` | Cases in §10 |

Filter service stays **router-free** (`RFD-DD-1`). URL I/O stays in the component.

### 2.2 Sequence / interaction diagram

```
User opens Filter → picks Created by "Angel Jarrin"
  → component writes filter.selectedCreatedBy
  → filterRows() AND-matches row.createdBy (case-insensitive)
  → table + status pills + chip + badge update
  → mirror effect replaceUrl-merges ?createdBy=Angel%20Jarrin

Landing on ?createdBy=Angel%20Jarrin
  → hydrate effect writes the signal (only if different)
  → same filter path as a manual pick
  → unknown name → chip + filtered-empty state (RFD-DD-2)
```

## 3. Data Model Changes

None. `ProgrammeResultRow.createdBy` already exists (`create_first_name` + `create_last_name`). No entity, migration, or CLARISA change.

## 4. API Surface

None. The only new contract is the optional query param `createdBy` (single string, URL-encoded display name). Additive on the existing Results tab URL; no collision with `phase`, `reviewResult`, `reviewResultId`, `status`, `category`, `origin`, `center`.

Bilateral / platform-report: no impact (`AC-4`).

## 5. Server Workflow / Business Rules

N/A. Clientside AND-of-dimensions over rows already loaded by `GET …/roles/filter` (`PROGRAMME_RESULTS_PAGE_LIMIT`). Does not change W1..W8.

## 6. Frontend Plan

### 6.1 Routes / modules

No new route. `entity-details/:entityId/results` honors one more query param.

### 6.2 Components & services

No new component. Extend the three existing owners:

| Owner | Responsibility |
|---|---|
| `ProgrammeResultsService` | Distinct, sorted, blank-free Created by options from loaded rows (same helper as Center). |
| `ProgrammeResultsFilterService` | `selectedCreatedBy` (`null` = off). Predicate compares `normalize(selected)` to `normalize(row.createdBy)`. Chip label `Created by: {name}`. `clearChip` / `clearAll` reset it. |
| `ProgrammeResultsComponent` | Popover control; `toFilterValue` on change (empty sentinel → `null`); hydrate/mirror `createdBy` with the same equality + `untracked` guards as Center (`RFD-DD-5`). Badge already counts `activeChips()` — no extra counter. |

Phase chip default behavior is unchanged (`CBF-R-2` BUT).

### 6.3 Design system usage

- Control: `app-pr-filter-select` only. Never `custom-fields/pr-select` (`programme-results/CLAUDE.md` mandatory-field scan).
- Placement: Filter popover **row 3 becomes a two-column grid** — Contributing Center | Created by — then Section (Coming soon) stays below. Matches Category | Funding source. No new token, no new SCSS.
- Label / placeholder / `aria-label`: **Created by** / **Filter by created by**.
- Tokens: existing `--pr-text-muted` overline, `--pr-focus-ring` on the shared select.
- Responsive: popover already wraps; two 1-col stacks under the existing popover width. No new breakpoint.
- i18n: hardcoded English, same as Status / Center on this surface (`CBF` NFR).

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

No new auth. The param only narrows an already-authorized programme list. Do not log tokens (`.cursorrules`, `AC-9`). Names in the URL are the same names already shown in the table.

## 8. Performance & Capacity

One extra `computed` (options) and one extra signal read in two existing effects. No new HTTP, no new dependency, no bundle impact. Filtering stays O(rows) clientside — same bound as today.

## 9. Observability

None. Does not move a PRD metric by itself; G1 is the product rationale only.

## 10. Testing Plan (forward-looking)

Scoped Jest only (no full client suite).

| Spec | Cases that must exist |
|---|---|
| `programme-results-filter.service.spec.ts` | Match / no-match / blank-name row excluded; chip `Created by: X`; `clearChip` leaves other dimensions; `clearAll` nulls Created by |
| `programme-results.service.spec.ts` | Options sorted, deduped, **no blanks** |
| `programme-results.component.spec.ts` | Select Angel Jarrin → only those rows + chip + badge; combine with Status; hydrate `createdBy` without extra `navigate`; unknown name → empty-filter state; `onCreatedByChange` → `replaceUrl: true`, `merge`, key `createdBy`; Clear all writes `createdBy: null` and keeps default phase |

jsdom cannot prove popover layout — live Filter-open check at HITL (`CBF` defect table).

## 11. Backwards Compatibility & Migration Plan

- No-`createdBy` URL and the five existing dimensions behave as now.
- `replaceUrl` + `merge` so Back still leaves the tab (`RFD-DD-4`).
- No feature flag, no backfill, no downstream consumer notice.
- `programme-results/CLAUDE.md` “seven dimensions” wording updates at archive (pending on this spec branch).

## 12. Design Decisions

### `CBF-DD-1` — Copy Center, do not invent a filter

- **Context:** The tab already has a proven single-select + chip + URL dimension.
- **Decision:** Eighth dimension on the same service, same select, same hydrate/mirror.
- **Alternatives considered:** New service (rejected — splits state the table already joins). “Created by me” only (rejected — `CBF` out of scope; does not cover Angel / Santiago / …). Server query (rejected — counters and filters are clientside by design).
- **Consequences:** Two people with the identical display name are indistinguishable, as they already are in the column.

### `CBF-DD-2` — Center and Created by share one popover row

- **Context:** Center is alone on row 3; Section below is disabled.
- **Decision:** Two-column row: Contributing Center | Created by.
- **Alternatives considered:** A fourth full-width row (rejected — grows the popover for one control). Put Created by next to Section (rejected — pairs an active control with a Coming-soon one).
- **Consequences:** At narrow popover width the two selects stack; accepted, same as Category | Funding source.

### `CBF-DD-3` — Param name `createdBy`

- **Context:** Sibling params are plain lowercase (`status`, `center`). Requirements scenario already writes `createdBy`.
- **Decision:** Query key is `createdBy` (single string, encoded display name).
- **Alternatives considered:** `created_by` (numeric id — rejected; column and options are names, payload id is not shown). `createdby` (rejected — harder to read, fights the locked scenario).
- **Consequences:** Overview deep links do not send this param in this spec; adding it later is additive.

### `CBF-DD-4` — Hydrate immediately; unknown name is honest

- **Context:** Same as `RFD-DD-2`.
- **Decision:** Do not wait for rows. Unknown `createdBy` stays on the chip and yields the existing filtered-empty state.
- **Alternatives considered:** Drop unknown silently (rejected — URL lies). Wait for options then coerce (rejected — pending-state machine for no gain).
- **Consequences:** A typo in a shared link shows “No results match these filters.” plus Clear all.

**Reversion challenge (Step 2.3):** none triggered — the design only adds; nothing shipped is removed or inverted. Center, Section Coming soon, and the RFD bridge stay.

## 13. Open Gaps & Follow-ups

- Multi-select and **Created by me** remain out (`CBF` §3).
- Result-detail ⓘ Created by is a different payload gap; not this spec.
- CLAUDE.md “seven dimensions” → “eight” at `/akili-archive` (spec-branch write discipline).

## Required cross-references

- `./requirements.md`
- `docs/prd.md` G1 · `US-P1` · `AC-3` · `AC-4` · `AC-9`
- `docs/ux-ui/design.md` §2 · §10
- `docs/trd/trd.md` results list / `GET …/roles/filter`
- `docs/specs/archive/2026-08-27-changes--sp-overview-echarts/results-tab-filter-deeplink/design.md` (`RFD-DD-1`…`5`)
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/CLAUDE.md`
