# Design — Surface emerging results as their own label

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/emerging-result-chip/` |
| Requirements | `./requirements.md` (`EMG-R-*`, `EMG-AC-*`) |
| Depth | **Standard** |
| Approval Mode | gated |
| Status | shipped |
| Delegation | None. All exploration was CodeGraph-free direct inspection under the 4-file threshold; no subagent was spawned |
| Verified against | `JuanGuzman-io/dogfish` @ `31562acba` (2026-09-16) |

---

## 1. Summary

One additive field on one existing query, read by both screens.

The design changed during Phase 2 from what `proposal.md` approved — **for the better, and the change is recorded in §13**. The proposal assumed two backend surfaces (the Result-list query *and* `GET /api/results-framework-reporting/results-scope`). They are not two: the program's **Results** tab builds its rows from the very same list endpoint (`programme-results.service.ts:440` → `toProgrammeResultRow`), and only *decorates* them with scope buckets. So the flag rides on the row for both screens, `results-scope` is untouched, and the two screens cannot disagree because they read one field from one response.

---

## 2. Architecture Overview

```
GET /api/results/get/all/roles/filter/:userId
        │  (+ planned_result: 0 | 1 | null)
        │
        ├──────────────► api.service.ts updateResultsList()
        │                     └─► dataControlSE.resultsList
        │                             └─► results-list.component
        │                                     └─► Title cell → Emerging chip      [EMG-R-3]
        │
        └──────────────► programme-results.service.ts
                              └─► toProgrammeResultRow()  ──► ProgrammeResultRow.plannedResult
                                      └─► joinResultScope()   (spreads ...row — flag survives)
                                              └─► AREA OF WORK cell → "Emerging"  [EMG-R-4]
                                                      └─► cellText() → CSV        [EMG-R-6]

GET /api/results-framework-reporting/results-scope    ── UNCHANGED ──
```

The scope endpoint keeps producing the `UNTAGGED` bucket exactly as it does today. This design does not reinterpret that bucket; it adds an **independent** signal that takes precedence over the bucket's label when, and only when, it says `0`.

---

## 3. Data Model Changes

**None.** `results_toc_result.planned_result` already exists and is already populated. No entity edit, no migration, no `migration:check` impact.

---

## 4. API Surface

| Endpoint | Change | Shape |
|---|---|---|
| `GET /api/results/get/all/roles/filter/:userId` | **Additive** — one new key per item | `planned_result: 0 \| 1 \| null` |
| `GET /api/results-framework-reporting/results-scope` | **None** | — |

`AC-4` is satisfied by additivity: no rename, no removal, no `v2` rollout. No bilateral or platform-report payload is touched, so `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` needs no change-log row.

### Tri-state contract

| Value | Meaning | UI |
|---|---|---|
| `0` | Owner row exists and says emerging | `Emerging` |
| `1` | Owner row exists and says planned | Current behavior |
| `null` | **No active owner row** — legacy result, or an emerging Knowledge Product | Current behavior (`EMG-R-5`) |

`null` is load-bearing, not an accident. Any client read must be `=== 0`, never `!planned_result` — which is the D-3 defect this contract exists to make testable.

---

## 5. Server Workflow / Business Rules

One correlated scalar subquery added to the `SELECT` of `AllResultsByRoleUserAndInitiativeFiltered` (`onecgiar-pr-server/src/api/results/result.repository.ts`, the `baseQuery` block around line 730-770), placed beside the existing `has_discontinued_options` subquery it is modelled on:

- **Correlation keys:** `results_id = r.id` **and** `initiative_id = rbi.inititiative_id` — the owner, because the enclosing query already constrains `rbi.initiative_role_id = 1`.
- **Aggregate:** `MAX(planned_result)` over active rows.
  - zero rows → `NULL` (unknown)
  - `{0}` → `0` (emerging)
  - `{0,1}` → `1` — **planned wins.** A result that claims a ToC link anywhere is not emerging. This is why the aggregate is `MAX` and not `MIN`, and it makes assumption `A-1` non-load-bearing.
- **Filter:** `is_active = 1`, matching every other read of this table.

Column names are the real ones and are deliberately unlovely: `results_toc_result.results_id` (plural), `results_toc_result.initiative_id`, and `results_by_inititiative.inititiative_id` (the preserved typo — see root `CLAUDE.md`). All three were read off the entity and the surrounding query, not assumed.

**Why a subquery and not a `LEFT JOIN`:** a `JOIN` multiplies the result row if more than one active owner row ever exists, silently corrupting `meta.total` and the status counters both screens derive from it. A scalar subquery cannot. This is defect class **D-2** and it is the single most expensive thing this change could get wrong.

---

## 6. Frontend Plan

### 6.1 Result list — `EMG-R-3`

| File | Change |
|---|---|
| `shared/interfaces/current-result.interface.ts` | `planned_result?: number \| null` |
| `results-list/results-list.component.ts` | `isEmerging(result)` predicate (`Number(result?.planned_result) === 0`) + one chip class constant reusing `FUNDING_CHIP_BASE` |
| `results-list/results-list.component.html` | Chip inside the `title` cell (`~:251`), in the same slot as the existing `discontinued-icon` badge, **before** the title text |

Styling follows `docs/ux-ui/design.md` §7 rule 1 (Tailwind-first) and rule 2 (brand tokens). The chip takes the **neutral/muted** triplet already defined as `fundingChipUnknown` semantics — `--pr-border` / `--pr-surface-app` / `--pr-text-muted` — rather than a status colour: *emerging* is a classification, not a warning, and §8's one-brand-button-per-screen discipline extends to not spending an alarm colour on a neutral fact.

Accessibility: the chip is **text**, so its accessible name is the word `Emerging` with no `aria-label` needed (`EMG-R-3` scenario 1). Colour carries nothing the text does not.

### 6.2 Results tab — `EMG-R-4`, `EMG-R-6`

| File | Change |
|---|---|
| `programme-results/services/programme-results.service.ts` | `ProgrammeResultRow.plannedResult?: number \| null`; `toProgrammeResultRow` reads it preserving an explicit `null` — the same `hasOwnProperty` guard `completeness` already uses (`MWB-T-2`/`MWB-R-8`, `:283-285`), because `??` would collapse `null` into "absent" |
| `programme-results/services/programme-results-section-labels.ts` | `sectionLabel(key, plannedResult?)` returns `Emerging` when `key === 'UNTAGGED'` and `plannedResult === 0` |
| `programme-results.component.ts` | `cellText(row, 'aow')` passes the row's flag through — the CSV export calls this same switch, so `EMG-R-6` closes by construction |
| `programme-results.component.html` | The `@default` branch's `@else` arm renders the same `cellText`; **no template restructuring** |

`joinResultScope` needs **no** change: it spreads `...row`, so `plannedResult` survives every branch — including `loading`, `error` and `version-mismatch`, which is exactly why the `sectionState` precedence in `EMG-R-4`'s scenario holds for free.

---

## 7. Security & Authorization

No change. Both screens sit behind `JwtMiddleware` (`AC-3`). The new field is a boolean-ish classification of data the caller is already authorized to see — it leaks nothing (`AC-9` untouched: no secret, no PII).

## 8. Performance & Capacity

One correlated subquery per returned row, over `results_toc_result` keyed by `(results_id, initiative_id, is_active)`. It executes only for rows the outer query already selected, so it scales with page size, not with table size. Measured against the NFR in `requirements.md`: p95 within 10% of the pre-change value at the same page size.

## 9. Observability

None added. No background job, no new log line, no new failure mode that needs a trace.

## 10. Testing Plan

| Defect class | Test | Where |
|---|---|---|
| D-1 / D-3 | `sectionLabel` and the list predicate over `0` / `1` / `null` / absent | `programme-results-section-labels` + `results-list.component.spec.ts` |
| D-5 | `cellText(row,'aow')` equals the rendered cell for an emerging row | `programme-results.component.spec.ts` |
| D-2 | Repository spec asserts the emitted SQL contains the correlated subquery and **no** added `JOIN` — plus the manual prtest count check (`EMG-AC-7`), because jest cannot execute MySQL | `result.repository.spec.ts` + manual |
| D-4 | **No automated gate.** Human visual check or T6 review | HITL pause |

## 11. Backwards Compatibility & Migration Plan

Additive on one payload; no migration; no data backfill. Rollback is a pure revert — nothing is written, so there is no state to unwind.

---

## 12. Design Decisions

| ID | Decision | Rationale | Rejected alternative |
|---|---|---|---|
| `EMG-DD-1` | One field on the **list** payload serves both screens; `results-scope` untouched | The Results tab already consumes the list endpoint. Two sources for one fact is how two screens start disagreeing | Adding the flag to `results-scope` too (the proposal's Option B) — twice the surface for strictly less consistency |
| `EMG-DD-2` | Expose the raw tri-state `planned_result`, not a collapsed `is_emerging: boolean` | `null` (no row) and `0` (emerging) are different facts. A boolean would make `EMG-R-5` untestable and D-3 invisible | `is_emerging: boolean` |
| `EMG-DD-3` | `MAX(planned_result)` — planned wins over emerging | Makes multi-row data a non-issue instead of an assumption | `MIN`, or trusting a single row |
| `EMG-DD-4` | Correlated scalar subquery, never a `JOIN` | A `JOIN` can multiply rows and corrupt `meta.total` | `LEFT JOIN results_toc_result` |
| `EMG-DD-5` | Neutral chip colour, not a status colour | Emerging is a classification, not a warning | Yellow/orange "attention" treatment |
| `EMG-DD-6` | The flag **overrides** the `UNTAGGED` label; it does not redefine the bucket | Keeps `RAC-R-1`'s bucket contract intact and leaves the door open to Option C | Reinterpreting `UNTAGGED` server-side |

### Reversion challenge (Step 2.3)

`EMG-DD-6` reverts delivered behavior: `RAC-R-2` shipped `Not tagged` for every member of the `UNTAGGED` bucket, and this removes that label for a subset.

> **What does removing it break?** The **"Areas of work" filter still offers a single `Not tagged (N)` option** whose membership now spans two visible labels. A user who filters by *Not tagged* gets rows that display *Emerging*.

That is a real, reachable inconsistency, and the design does **not** fix it — `requirements.md` §Out of scope excludes filter changes. It is **accepted, not overlooked**, and it is precisely the trigger for the proposal's Option C (Emerging and Not tagged as two first-class buckets across column, filter and counters). Recorded in §13 and surfaced at the approval gate, because it is the user's call to accept.

---

## 13. Open Gaps & Follow-ups

| # | Gap | Disposition |
|---|---|---|
| G-1 | Filter/label mismatch from the reversion challenge above | **Accepted.** Option C is the follow-up spec if reporters trip on it |
| G-2 | Emerging **Knowledge Products** are never labelled — `results-knowledge-products.service.ts:992` calls `createOwnerResult`, not `…V2`, so no row is ever written | **Accepted** (`Q-1`, `EMG-R-5`, defect class D-7). Closing the write path is a change to result creation and needs its own spec + regression test |
| G-3 | The size of the `UNTAGGED` residual is unmeasured | Task `EMG-T-0` measures it before any code is written; if it is large, the premise is worth rechecking |
| G-4 | `proposal.md` §Approach Options costs Option B at "2 queries, 1 DTO" and `requirements.md` `EMG-R-2` described two payloads. **Both are superseded by `EMG-DD-1`.** `requirements.md` has been amended; `proposal.md` is left intact as the historical record of approved intent | Recorded, not silently rewritten |

---

## 14. Budget (Step 2.4)

| Metric | Expected |
|---|---|
| Tasks | **5** (1 measurement + 1 server + 2 client + 1 verification) |
| LOC | **~130** (server ~15, client ~70, tests ~45) |
| Review rounds | **1** |

This is a **tripwire, not a cap**: `/akili-execute` compares actuals and escalates rather than continuing past it. The estimate sits comfortably inside **Standard** — it is above `/akili-quick` territory (two payload-shaped behaviors, three negative scenarios, a substituted gate) and well below `Full` (no migration, no auth, no cross-cutting contract). Depth confirmed, not merely inherited.

---

## Required cross-references

- `./requirements.md`, `./proposal.md`
- `docs/ux-ui/design.md` §7 Design Tokens, §8 Component rules
- `docs/specs/archive/2026-09-04-changes--results-aow-column-filter` — `RAC-R-1`, `RAC-R-2`
- Root `CLAUDE.md` — preserved-typo rule for `results_by_inititiative`
