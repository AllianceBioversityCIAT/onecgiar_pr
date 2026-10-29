# Design — Previously reported tag on the SP Results list

> **In one line:** map the existing `is_replicated` flag into `ProgrammeResultRow.isReplicated`, and render a local copy of the Results Center pill in front of the title text. This is template-only, so search, CSV and counters cannot see it.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `result-framework-reporting/programme-results-previously-reported` · Lite |
| Implements | `requirements.md` PRP-R-1..R-5, PRP-NFR-1..3 |
| Status | approved (2026-10-13) · Approval Mode `gated` · **amended 2026-10-13 (§11, PRP-DD-5..DD-8), approved by the user 2026-10-13** |

## 2. Architecture Overview

| Layer | Change |
|---|---|
| Server | **None.** `AllResultsByRoleUserAndInitiativeFiltered` (`onecgiar-pr-server/src/api/results/result.repository.ts:686`) already selects `r.is_replicated` (`:738`) for `GET get/all/roles/filter/:userId` |
| API client | **None.** `GET_AllResultsWithUseRole` passes items through unchanged |
| Row model | `ProgrammeResultRow` gains `isReplicated` and `toProgrammeResultRow()` fills it in (`services/programme-results.service.ts:281`) |
| Template / styles | RESULT cell (`programme-results.component.html:444-456`) + one class in `programme-results.component.scss` |

## 3. Directory Structure (touched files)

```text
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/
├── services/programme-results.service.ts        # interface field + mapper
├── services/programme-results.service.spec.ts   # PRP-TEST-1
├── programme-results.component.html             # pill in RESULT cell
├── programme-results.component.scss             # .pgr-badge-replicated
├── programme-results.component.spec.ts          # PRP-TEST-2
└── CLAUDE.md                                    # one contract line
```

## 4. Data Model

| Field | Type | Source | Rule |
|---|---|---|---|
| `ProgrammeResultRow.isReplicated` | `boolean`, **optional** in the interface | `raw.is_replicated` | `true` only for `1`, `'1'` or `true`. Anything else (`0`, `'0'`, `null`, absent) is `false`. The mapper always sets it |

Optional for the same reason as `aowCodes`: row literals in the `programme-results` and `my-work-board` fixtures need not name it, so no shared fixture churn (R-2 of the proposal).

## 5. API Design

No change.

## 6. Backend Module Design

No change.

## 7. Frontend Component Architecture

**RESULT cell, line 1** becomes a single-line flex row (`min-w-0`, `items-center`, gap 6px):

1. **Pill**, only when `row.isReplicated`. Text `Previously reported`, `prTooltip="Previously reported in an earlier phase"`, `prTooltipPosition="top"`. `PrTooltipDirectiveModule` is already imported in the component.
2. **Title text**: the existing span moves inside the row unchanged. It keeps `truncate`, the 14px medium heading token and `[attr.title]="row.title"`, and gains `min-w-0`.

Line 2 (indicator) is untouched.

**Pill styles:** a local class `.pgr-badge-replicated` in `programme-results.component.scss` with the **same values** as `.rc-badge-replicated` (`results-list.component.scss:809`):

| Property | Value |
|---|---|
| Layout | `flex: none`, `inline-flex`, `align-items: center`, `white-space: nowrap` |
| Box | padding `1px 7px`, radius `999px` |
| Type | `10px` / `600` / line-height `1.25` / letter-spacing `0.02em` |
| Colour | `var(--pr-color-primary-100, #ede9fe)` background, `var(--pr-color-primary-700, #4c2882)` text |

The class carries a comment pointing at the source class. `flex: none` on the pill plus `min-w-0` and `truncate` on the text are what make PRP-R-3 hold.

## 8. Shared Contracts

`ProgrammeResultRow` is shared with `my-work-board`. The field is additive and optional, and the board does not render it.

## 9. Design Decisions

| ID | Decision | Covers | Rejected alternative |
|---|---|---|---|
| **PRP-DD-1** | Normalise the flag to a boolean in the mapper | R-1 (S-1.2/1.3) | Reading `row.raw.is_replicated` in the template: `'0'` is truthy, so the pill would show on `'0'` |
| **PRP-DD-2** | Local CSS copy, not a shared component | R-2 (BR5) | Extracting it to `shared/` and refactoring the Results Center to use it: that touches a screen the ticket freezes. Logged as a follow-up |
| **PRP-DD-3** | Pill before the text, inside a flex row; the pill does not shrink, the text truncates | R-3 | Pill after the title: it would be pushed out by long titles, and it would not match the Results Center order |
| **PRP-DD-4** | Template-only; `cellText()` and the search predicate are untouched | R-4 | Prefixing the title string: it would leak into search and CSV |

**Reversion challenge (Step 2.3):** not applicable. No DD removes or inverts shipped behaviour; everything is additive.

## 10. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | **2** |
| LOC | **~90** (≈30 prod: mapper 2, interface 2, template ~8, scss ~16, CLAUDE.md 2 · ≈60 tests) |
| Review rounds | **1** |

Depth check: this matches Lite. It is not a `/akili-quick`, because it changes a shared row model and adds logic (the truthiness rule).

## 11. Amendment — group versions of one result (PRP-R-5, OQ-1)

Added 2026-10-13 after HITL-1. On SP09 the user saw a 2026 replica and its 2025 original as two unrelated rows, and asked for the Results Center look (user screenshot: one block per code, code repeated on each line, no divider inside the block).

### 11.1 Touched files (additional)

```text
onecgiar-pr-client/src/app/shared/components/pr-table/
├── pr-table.component.ts        # opt-in groupBy input + group-aware sort
└── pr-table.component.spec.ts   # PRP-TEST-3
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/
├── programme-results.component.ts/.html   # pass groupBy, order members, mark group rows
├── programme-results.component.spec.ts    # PRP-TEST-4
└── CLAUDE.md                               # contract line + Verified re-stamp
```

### 11.2 Mechanism

1. **`app-pr-table` gains an optional `groupBy` input** (a field name; default empty). When it is empty, `sortedValue` is byte-for-byte today's code path. That matters because 50 templates use this table. When it is set:
   - rows are bucketed by `resolve(row, groupBy)`, and each bucket keeps its members in **input order**;
   - buckets are sorted with today's comparator, applied to each bucket's **first member** under the active `sortField` / `sortOrder`;
   - the result is flattened. With no `sortField`, the buckets keep their input order.
2. **`programme-results` passes `groupBy="code"`.** It feeds `[value]` with `filteredRows()` re-ordered so that inside each code the newest phase comes first (`phaseSort` descending, stable). It does this in a new `computed`, so `filteredRows()` itself (counters, CSV, search) is untouched.
3. **Row marking.** The body template receives `index`. A row whose predecessor on the current page (`tbl.pagedValue()[i-1]`) has the same `code` is a *continuation* row. A row followed by a same-code row is a *group start*. Classes `pgr-group-start` / `pgr-group-cont` drive the look.

### 11.3 Look (user's screenshot)

| Element | Rule |
|---|---|
| Divider | No row divider between members of one block. The divider sits only above the first and below the last member |
| Spacing | Tighter vertical padding inside the block, so the members read as one unit |
| Code | Repeated on every member, as in the screenshot |
| Colour | **No violet border or tint.** UI hard rule 7 (client CLAUDE.md §5: no violet in content surfaces) |
| Hover | Hover and focus stay per row. Each member is still its own clickable row with its own action |

### 11.4 Design decisions

| ID | Decision | Covers | Rejected alternative |
|---|---|---|---|
| **PRP-DD-5** | Group-aware sort lives in `app-pr-table` behind an opt-in input | S-5.2, S-5.4 | Re-keying the sort fields per row in the component: the members would flip order whenever the sort direction flips. Replacing `prSortableColumn` with a component-side sort: it duplicates the table's sort logic |
| **PRP-DD-6** | The newest member anchors the block's sort position | S-5.2 | Using the "best" member value per direction: the block would jump when the direction flips |
| **PRP-DD-7** | Rows stay separate rows, only drawn as one block | S-5.1, S-5.4 | A merged row like the Results Center `combine` (proposal Option C): it rewrites counters, CSV and row actions |
| **PRP-DD-8** | Paging stays row-based, so the total label is unchanged | S-5.4 | Paging by group: it changes "x – y of N". *Accepted edge:* a block can split across a page boundary (page size 100). The first row on the next page then renders as a normal row |

### 11.5 Budget delta (tripwire re-baselined by the user's request)

| Metric | Was | Now |
|---|---|---|
| Tasks | 2 | **4** (+PRP-T-3, PRP-T-4) |
| LOC | ~90 | **~300** (+≈60 prod, ≈150 tests) |
| Review rounds | 1 per task | 1 per task |
