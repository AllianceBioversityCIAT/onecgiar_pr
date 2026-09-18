# Requirements — Surface emerging results as their own label

## Document Control

| Field | Value |
|---|---|
| Module | `results` + `result-framework-reporting` (read surfaces only) |
| Sub-feature | `emerging-result-chip` |
| Spec path | `docs/specs/changes/emerging-result-chip/` |
| Requirement prefix | `EMG-` (`ERC-` is taken by the archived `emerging-result-cta-placement` spec) |
| Depth | **Standard** |
| Type | Change |
| Approval Mode | gated |
| Owner | Juan David Delgado |
| Status | shipped |
| Ticket(s) | *(none supplied)* |
| Proposal | `./proposal.md` |
| Verified against | `JuanGuzman-io/dogfish` @ `31562acba` (2026-09-16) |

---

## Executive Summary

`results_toc_result.planned_result` already records, since the moment of creation, whether a result was reported against the program's Theory of Change (`1`) or outside it (`0` — an **emerging result**). No read surface exposes it. This spec surfaces it in the two lists where people look for it, driven by that flag and nothing else.

One discovery during specification changed the proposal's shape: **emerging Knowledge Products have no row at all**, so they cannot be labelled by this spec. See `EMG-R-5` and Open Question `Q-1`.

---

## Glossary

| Term | Meaning |
|---|---|
| **Emerging result** | A result reported outside the program's ToC. Canonically: the owner initiative's active `results_toc_result` row has `planned_result = 0`. |
| **Planned result** | The same row with `planned_result = 1`, set when the result is linked to a ToC indicator. |
| **Owner row** | The `results_toc_result` row whose `initiative_id` equals the result's owner initiative (`results_by_inititiative.initiative_role_id = 1`). |
| **`UNTAGGED` bucket** | The residual bucket of `GET /api/results-framework-reporting/results-scope` — a result whose ToC linkage resolves to no AoW and no OUTPUT/OUTCOME/EOI category. **Not** a synonym for emerging. |
| **Not tagged** | The current display label of the `UNTAGGED` bucket in the AREA OF WORK column. |

---

## System Context & Scope

### Context

The reporting model has two entry paths — *report against a ToC indicator* and *Report emerging result* — and PRMS has supported both for the whole cycle. The distinction drives how a result is reviewed, but it is invisible after creation: a reporter scanning either list cannot tell the two apart.

The Program → **Results** tab makes it worse than invisible. Its AREA OF WORK column renders `Not tagged`, which reads as an omission an owner should go fix. For an emerging result that state is correct and final, so the label invites rework that must not happen.

- **PRD:** `US-S1` (typed result creation incl. ToC alignment), `US-P1` (phase-aware progress tracking). Project invariants `AC-5` (phase scoping) and `AC-6` (ToC alignment) apply unchanged.
- **UX:** `docs/ux-ui/design.md` §6 *Listing screens*, §7 *Design Tokens*, §8 *Component rules*.
- **TRD:** result read surfaces; no entity, migration, or workflow change.
- **Extends:** archived spec `changes/results-aow-column-filter` (`RAC-R-1`, `RAC-R-2`), which owns the AREA OF WORK column and the `results-scope` endpoint. This spec **extends** `RAC-R-2`; it does not replace it.

### In scope

- Expose the owner row's planned/emerging state on the result-list payload that already feeds **both** screens.
- Render an `Emerging` chip in the **Title** cell of the Result list.
- Render `Emerging` instead of `Not tagged` in the AREA OF WORK column, for that state only.
- Keep the Results-tab CSV export identical to what the column shows.

### Out of scope

- Any new column, filter, sort, or counter. The "Areas of work" filter keeps its single `Not tagged (N)` option and its current membership.
- The Overview scope chips (`Not tagged to a ToC area`) — different screen.
- Any change to how `planned_result` is written, including the Knowledge Product gap in `EMG-R-5`.
- Backfill, migration, or schema change. None is required.
- Bilateral and platform-report payloads (`AC-4` untouched).

---

## Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter | Can see which of their results are emerging, in both the global list and their program's Results tab |
| PMU lead | Can read a program's Results tab without mistaking emerging results for un-tagged work needing follow-up |
| QA reviewer | No change (the QA drawer is untouched) |
| Bilateral / platform-report consumer | No change — payloads untouched |

---

## Functional Requirements

### Required (MUST)

- **`EMG-R-1`** The result-list payload MUST expose, per item, whether the result is emerging, derived from the **owner** initiative's active `results_toc_result` row.
- **`EMG-R-2`** Both screens MUST derive the emerging state from that **single** payload field. Neither may introduce a second source for the same fact, so the two can never disagree. *(Amended in Phase 2 — see `design.md` `EMG-DD-1`: the Results tab already consumes the same endpoint, so the second payload the proposal assumed is unnecessary.)*
- **`EMG-R-3`** The Result list MUST render an `Emerging` chip inside the **Title** cell, before the title text, when and only when the item is emerging.
- **`EMG-R-4`** The AREA OF WORK column MUST render `Emerging` when the result is emerging; it MUST keep rendering `Not tagged` for every other member of the `UNTAGGED` bucket.
- **`EMG-R-5`** When a result has **no** active owner `results_toc_result` row, both surfaces MUST treat the state as *unknown*: no chip, and the AREA OF WORK column keeps its current label. Absence of a row is not evidence of emergence.
- **`EMG-R-6`** The Results-tab CSV export MUST emit, for the AREA OF WORK column, the exact string the cell renders.

### Should (SHOULD)

- **`EMG-R-7`** The chip SHOULD reuse the existing Result-list chip geometry (`FUNDING_CHIP_BASE`) and read its colours from `docs/ux-ui/design.md` §7 tokens, introducing no new token.

### Could (MAY)

- **`EMG-R-8`** The chip MAY carry a tooltip explaining what an emerging result is.

---

## Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | The Result-list query MUST NOT regress: the added predicate is a correlated subquery over `results_toc_result` keyed by `(results_id, initiative_id)`; p95 for `GET /api/results/get/all/roles/filter/:userId` MUST stay within 10% of its pre-change value on the same page size |
| **Correctness** | The added predicate MUST NOT change the **row count** of either endpoint. This is the dominant risk and is gated explicitly (`EMG-AC-7`) |
| **Backwards compatibility** | Both payload changes are **additive**; no field is renamed or removed. No `v2` rollout needed |
| **Security** | Both endpoints stay JWT-gated (`AC-3`). No new field carries user or secret data |
| **Accessibility** | The chip MUST be readable as text by a screen reader, not conveyed by colour alone; contrast MUST meet WCAG 2.1 AA. **jsdom cannot evaluate this** — see the defect-class table |
| **Internationalization** | New strings follow the existing pattern of these two screens (literal English, as `Not tagged` and `Bilateral` are today) |
| **Observability** | No new logging. No background job touched |

---

## Defect Classes & Their Gates

The classes of defect this spec can actually produce, and the command that catches each. A class with no automated check is named, not hidden.

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| D-1 | Wrong label — chip on a planned result, or missing on an emerging one | Client unit tests over `joinResultScope` / the chip predicate with fixture rows for `0`, `1`, `null`, absent | ✅ |
| D-2 | **Row multiplication** — the new SQL duplicates or drops list rows | Repository spec asserts the SQL uses a correlated subquery, never a `JOIN`. **The spec cannot prove DB behavior.** → substituted by a named manual check against prtest comparing `meta.total` and one known result, before/after (`EMG-AC-7`) | ⚠️ substituted |
| D-3 | Tri-state mishandling — `null` read as emerging (`!value` bug) | Explicit `null` fixture in the unit tests of D-1 | ✅ |
| D-4 | **Contrast / visual clash** of the chip inside the Title cell | **No automated gate exists.** jsdom measures no layout and no contrast; `axe` in this suite cannot evaluate a rendered pixel. → substituted by a human visual check at the Phase-3 HITL pause, or a **T6 Multimodal** review of a screenshot | ⚠️ substituted |
| D-5 | CSV export drifts from the on-screen label | Unit test over `cellText(row, 'aow')` asserting the same string both ways | ✅ |
| D-6 | Collateral breakage in the touched suites | Scoped `jest` per module + lint | ✅ |
| D-7 | Emerging **Knowledge Products** silently show nothing | **Unmeasurable here** — the row is never written (`results-knowledge-products.service.ts:992` calls `createOwnerResult`, not `…V2`). → **accepted risk**, recorded in `EMG-R-5` and `Q-1` | ❌ accepted |

---

## Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `EMG-AC-1` | A result whose owner `results_toc_result` row has `planned_result = 0` | The Result list renders | The Title cell shows an `Emerging` chip before the title |
| `EMG-AC-2` | The same result | The program's Results tab renders | The AREA OF WORK cell reads `Emerging` |
| `EMG-AC-3` | A result whose owner row has `planned_result = 1` and a resolvable ToC node | Either screen renders | No chip; the AREA OF WORK cell shows its AoW code as today |
| `EMG-AC-4` | A result whose owner row has `planned_result = 1` but whose ToC node is absent from the active phase | The Results tab renders | The cell reads `Not tagged` — **not** `Emerging` |
| `EMG-AC-5` | A result with no active owner `results_toc_result` row | Either screen renders | No chip; the AREA OF WORK cell keeps its current label |
| `EMG-AC-6` | Any set of rows rendered in the Results tab | The user exports CSV | The AREA OF WORK column of the CSV equals the on-screen text, row for row |
| `EMG-AC-7` | The same user, filters, and page size, against prtest | The Result list is fetched before and after the change | `meta.total` and the returned row count are identical, and a known result appears exactly once |

Project-level ACs that apply unchanged and are not restated: `AC-3` (authorization), `AC-4` (payload stability — satisfied by additivity), `AC-5` (phase scoping), `AC-9` (secrets).

---

## Scenarios

### Requirement `EMG-R-3`: Emerging chip in the Result list

The system SHALL mark an emerging result in the Result list so a reporter can identify it without opening it.

#### Scenario: An emerging result is listed

- GIVEN a result whose owner initiative's active `results_toc_result` row has `planned_result = 0`
- WHEN the user opens `/result/results-outlet/results-list`
- THEN the row's Title cell renders an `Emerging` chip before the title text
- AND the chip's accessible name is the word `Emerging`, not a colour or an icon alone
- BUT it must NOT occupy a new column or change any column width
- AND IT MUST leave the title's existing truncation and `title` tooltip behavior unchanged

#### Scenario: A planned result is listed

- GIVEN a result whose owner row has `planned_result = 1`
- WHEN the same list renders
- THEN no chip is rendered in the Title cell
- BUT it must NOT remove or displace the existing `discontinued-icon` badge, which shares that slot

### Requirement `EMG-R-4`: Emerging label in the AREA OF WORK column

The system SHALL distinguish an emerging result from a result whose ToC mapping merely failed to resolve.

#### Scenario: Emerging replaces Not tagged

- GIVEN a result in the `UNTAGGED` bucket whose owner row has `planned_result = 0`
- WHEN the program's Results tab renders
- THEN the AREA OF WORK cell reads `Emerging`
- AND IT MUST keep the cell's existing `sectionState` precedence — `loading` still shows the skeleton and `error` / `version-mismatch` still show `—`, ahead of any label

#### Scenario: A planned-but-unresolved result keeps Not tagged

- GIVEN a result in the `UNTAGGED` bucket whose owner row has `planned_result = 1`
- WHEN the same tab renders
- THEN the cell reads `Not tagged`
- BUT it must NOT read `Emerging`, because the result was planned and its mapping is broken — a different problem with a different fix

### Requirement `EMG-R-5`: Unknown state is not emergence

The system SHALL NOT infer emergence from missing data.

#### Scenario: No owner ToC row exists

- GIVEN a result with no active `results_toc_result` row for its owner initiative — a legacy row, or an emerging **Knowledge Product**, which is created through a path that never writes one
- WHEN either screen renders
- THEN no `Emerging` chip appears and the AREA OF WORK cell keeps the label it shows today
- BUT it must NOT render `Emerging` on the strength of the absent row
- AND IT MUST be indistinguishable, to the user, from the behavior before this change

---

## Dependencies & Assumptions

### Upstream

- `results_toc_result.planned_result` is populated for every result created through `createOwnerResultV2`. **Verified** on this branch (`results.service.ts:3064`) and against a live row (`result_toc_result_id 13809`, `planned_result 0`, created 2026-09-16).
- `results_by_inititiative.initiative_role_id = 1` identifies the owner. Already the filter used by the Result-list query (`result.repository.ts:~798`).

### Downstream

- None. No consumer reads the result-list payload outside the two screens in scope.

### Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A-1 | At most one *meaningful* active owner row exists per `(result, owner initiative)`. The design still aggregates defensively (planned wins) rather than trusting it | Aggregation already handles it; no behavior change |
| A-2 | The `UNTAGGED` residual (planned but unresolved) is small | Users keep seeing `Not tagged` and may read the change as unshipped. Measured in task `EMG-T-0` |
| A-3 | This worktree is 50 commits behind `origin/performance-refactor`, but **none of those commits touch the four files in scope** — verified by `git diff --name-only` | Re-verify before execution |

---

## Open Questions

| ID | Question | Recommendation | Blocking? |
|---|---|---|---|
| `Q-1` | Emerging **Knowledge Products** get no chip and no label, because `results-knowledge-products.service.ts:992` calls `createOwnerResult` instead of `createOwnerResultV2` and never writes the row. Accept, or open a follow-up spec to close the write-side gap? | **Accept here, follow-up separately.** Fixing the write path is a change to result creation, which this spec's Non-Goals exclude — and it deserves its own regression test | No — `EMG-R-5` specifies the safe behavior either way |
| `Q-2` | Should the chip carry a tooltip (`EMG-R-8`)? | Ship without; add if reporters ask | No |
| `Q-3` | No Jira ticket is attached | Attach before the commit, so the message carries `[P2-XXXX]` | No |

---

## Requirement ID Index

| ID | Title | Strength | AC | Scenario |
|---|---|---|---|---|
| `EMG-R-1` | Result-list payload exposes emerging state | MUST | `EMG-AC-1`, `EMG-AC-7` | via `EMG-R-3` |
| `EMG-R-2` | Single payload field feeds both screens | MUST | `EMG-AC-2`, `EMG-AC-4` | via `EMG-R-4` |
| `EMG-R-3` | Chip in the Result-list Title cell | MUST | `EMG-AC-1`, `EMG-AC-3` | 2 scenarios |
| `EMG-R-4` | `Emerging` in the AREA OF WORK column | MUST | `EMG-AC-2`, `EMG-AC-4` | 2 scenarios |
| `EMG-R-5` | Unknown state is not emergence | MUST | `EMG-AC-5` | 1 scenario |
| `EMG-R-6` | CSV export matches the cell | MUST | `EMG-AC-6` | — |
| `EMG-R-7` | Reuse existing chip geometry and tokens | SHOULD | `EMG-AC-1` | — |
| `EMG-R-8` | Tooltip on the chip | MAY | — | — |

---

## Required cross-references

- `docs/prd.md` — `US-S1`, `US-P1`, `AC-3`, `AC-4`, `AC-5`, `AC-9`
- `docs/ux-ui/design.md` — §6 Listing screens, §7 Design Tokens, §8 Component rules
- `docs/specs/archive/2026-09-04-changes--results-aow-column-filter` — `RAC-R-1`, `RAC-R-1.1`, `RAC-R-2`
- `./proposal.md`
