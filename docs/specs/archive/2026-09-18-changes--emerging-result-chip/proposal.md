# Proposal — Surface emerging results as their own label

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/emerging-result-chip` |
| Slug | `emerging-result-chip` — derived from the free-text argument (chip "Emerging" on two result surfaces) |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | none |
| Depends on | none |
| Parallel-safe | yes |
| Status | draft |
| Owner | Juan David Delgado |
| Ticket(s) | *(pending — no Jira ticket supplied)* |
| Baseline | `docs/prd.md` · `docs/ux-ui/design.md` §7–§8 · `docs/trd/trd.md` |
| Related spec | `docs/specs/archive/2026-09-04-changes--results-aow-column-filter` (owns the AoW column and the `results-scope` endpoint) |
| Verified against | branch `JuanGuzman-io/dogfish` @ `31562acba` (2026-09-16) |

---

## Intent

A result reported outside the program's Theory of Change — an **emerging result** — is already recorded as such in the database and has been since creation. Nothing in the UI says so. This change surfaces that fact in the two lists where people look for it.

---

## Problem / Current Behavior

`results_toc_result.planned_result` is the discriminator. Every result gets a row at creation (`results.service.ts:3064`, `planned_result: false`); the row is promoted to `planned_result: true` only when the result is reported against a ToC indicator (`link-framework-result-toc.service.ts:97-117`). So the flag is reliable and already populated — it is simply never read by any read surface.

The consequence differs per screen:

| Surface | Today | Why it is wrong |
|---|---|---|
| Result list (`/result/results-outlet/results-list`) | Nothing distinguishes an emerging result from a planned one | A reporter scanning the list cannot tell which of their results sit outside the ToC — the one attribute that changes how the result is reviewed |
| Program → Results tab, **AREA OF WORK** column (`/result-framework-reporting/entity-details/:id/results`) | Reads `Not tagged` | Reads as an omission — "someone forgot to tag this" — when for an emerging result it is the correct and final state. It invites rework that should not happen |

**The trap:** `Not tagged` is *not* today's rendering of `planned_result = 0`. The column is computed from ToC linkage, not from the flag: `results-framework-reporting.service.ts:1221-1264` builds the `result_scope` CTE, and `results-scope.mapper.ts` falls through to `UNTAGGED` whenever no AoW acronym and no OUTPUT/OUTCOME/EOI category resolve. That bucket therefore also catches:

- a **planned** result whose `toc_result_id` points at a ToC node absent from the current phase (`tr.phase = ?` misses) — mapped, but broken;
- a result whose ToC category is none of `OUTPUT` / `OUTCOME` / `EOI`;
- a result with no `result_scope` row at all, synthesized as untagged by design (`RAC-R-1.1`).

Renaming the bucket wholesale would label those as "Emerging", which they are not. The volume of that residual is **unmeasured**.

---

## Proposed Outcome

| # | Behavior |
|---|---|
| 1 | In the **Result list**, a result whose owner row has `planned_result = 0` shows an `Emerging` chip inside the **Title** cell, before the title text |
| 2 | In the **Results tab** of a program, the **AREA OF WORK** column reads `Emerging` — not `Not tagged` — for the same condition |
| 3 | A result that is planned but whose ToC mapping does not resolve keeps reading `Not tagged`, because that *is* the accurate statement about it |

Both surfaces read one new server-provided field, so the two screens can never disagree.

---

## Scope

- Expose the owner initiative's `planned_result` on the two payloads that already feed these screens.
- Render the chip in the Result list Title cell.
- Render `Emerging` in the AoW column, gated on the flag.
- Update the CSV export of the Results tab, which reuses the same `cellText()` switch verbatim (`programme-results.component.ts:1580-1587`).
- Unit tests for both renderings and for the flag's absence.

## Non-Goals

- No new column, no new filter, no new counter. The "Areas of work" filter group keeps its current `Not tagged (N)` option and its current membership (see Open Questions).
- No change to the Overview scope chips (`dashboard-lab.component.ts:178`, `Not tagged to a ToC area`) — different screen, different spec.
- No change to how `planned_result` is written. The creation flow is correct as-is.
- No backfill or data migration.
- No change to bilateral or platform-report payloads.

---

## Affected Users, Systems, And Specs

| Area | What changes |
|---|---|
| Reporters / PMU | Can see at a glance which results are emerging |
| `onecgiar-pr-server` · `api/results/result.repository.ts` | `AllResultsByRoleUserAndInitiativeFiltered` (~:720-800) gains one derived column |
| `onecgiar-pr-server` · `api/results-framework-reporting/results-framework-reporting.service.ts` | `result_scope` CTE (:1221) gains the flag; `results-scope.dto.ts` / `.mapper.ts` carry it |
| `onecgiar-pr-client` · `results-list.component.{ts,html,scss}` | Title-cell chip |
| `onecgiar-pr-client` · `programme-results.service.ts` (`joinResultScope`) + `programme-results-section-labels.ts` | Label resolution |
| Archived spec `changes/results-aow-column-filter` | Its `RAC-R-2` column contract is extended, not replaced — cite it in the new requirements |

---

## Visual Reference

- **Source:** None (no Figma, no mockup requested).
- **Location:** n/a.
- **Notes:** The change reuses chip patterns that already exist in both screens — `FUNDING_CHIP_BASE` (`results-list.component.ts:504-512`, rounded-full, 11px semibold, token-driven border/bg/text triplet) and the existing in-Title badge slot occupied by `discontinued-icon` (`results-list.component.html:251-266`). Colour comes from `docs/ux-ui/design.md` §7; no new token is introduced. A mockup can be generated with `stitch-design` if the chip's colour family is contested.

---

## Requirement Delta Preview

### ADDED

- The Result list exposes, per row, whether the result is emerging, and renders an `Emerging` chip in the Title cell when it is.
- `GET /api/results/get/all/roles/filter/:userId` returns the owner initiative's planned/emerging state per item.
- `GET /api/results-framework-reporting/results-scope` returns the same state per bucket.

### MODIFIED

- AoW column (`RAC-R-2`): a result in the `UNTAGGED` bucket renders `Emerging` when the flag says emerging; otherwise it keeps rendering `Not tagged`.
- CSV export of the Results tab emits the same string the cell shows.

### REMOVED

- None.

---

## Approach Options

| | Option A — client-only rename | **Option B — flag on both payloads** | Option C — first-class category |
|---|---|---|---|
| **What** | Change `UNTAGGED: 'Not tagged'` to `'Emerging'`; chip in the list from a heuristic | Server returns the owner's `planned_result`; both surfaces read it | Split `Emerging` and `Not tagged` into two buckets across column, filter, counters and export |
| **Backend** | none | 2 queries, 1 DTO | 2 queries, 1 DTO, filter + counter contracts |
| **Correctness** | ✗ mislabels planned-but-unmapped results; the list has no data to drive a chip at all | ✓ reads the actual discriminator | ✓ |
| **Blast radius** | 2 files | ~6 files | ~12 files, touches `RAC-T-3`'s filter contract |
| **Effort** | XS | S | M |

## Recommended Approach

**Option B.** It is the smallest change that is actually true. Option A cannot deliver requirement 1 at all — the Result list payload has no join to `results_toc_result`, so there is nothing to render a chip from; and for requirement 2 it would knowingly mislabel a population we have not measured. Option C is the right end state if emerging turns out to be a dimension people filter by, but that is a product question nobody has asked yet; Option B leaves the door open to it without paying for it now.

Implementation shape, both surfaces:

- **List query** — a correlated `EXISTS` / `MAX(planned_result)` subquery scoped to `rbi.inititiative_id`, mirroring the `has_discontinued_options` pattern already in that same `SELECT` (`result.repository.ts:~768`). A subquery rather than a `LEFT JOIN`, so a result carrying more than one active ToC row cannot duplicate list rows.
- **Scope CTE** — the CTE already `INNER JOIN`s `results_toc_result rtr` filtered by `rtr.initiative_id`; it needs one added aggregate, then the mapper carries it onto the `UNTAGGED` branch.

---

## Risks, Dependencies, And Open Questions

| # | Item | Status |
|---|---|---|
| R-1 | The `UNTAGGED` residual (planned but unmapped) is unmeasured. If it is large, users will see `Not tagged` persisting and may read the change as not shipped | Measure with one query in prtest before specifying; it also validates the whole premise |
| R-2 | The "Areas of work" filter still offers a single `Not tagged (N)` option whose membership now spans two visible labels | Accepted for this change; recorded as the Option C trigger |
| R-3 | A result with **no** active `results_toc_result` row for its owner (legacy rows; possibly the knowledge-product creation branch, which does not go through `createOwnerResultV2`) | **Open question** — see Q-1 |
| R-4 | `planned_result` is `tinyint` and arrives as `0`/`1`/`null` through both payloads; a `!value` check would treat `null` as emerging | Requirements must state the tri-state explicitly |
| R-5 | This worktree is 50 commits behind `origin/performance-refactor` | Verified low: `git diff` shows none of those commits touch the four files in scope |
| Q-1 | When there is no owner ToC row at all, does the result show `Emerging`, or nothing? | **Recommendation: nothing.** Absence of a row is absence of evidence, not evidence of emergence. Needs your confirmation |
| Q-2 | Is there a Jira ticket this should hang from? | Open — the proposal has no ticket id |

---

## Success Criteria

1. A result created through **Report emerging result** shows the `Emerging` chip in the Result list and reads `Emerging` in the program's AREA OF WORK column, without any further user action.
2. A result reported against a ToC indicator shows neither.
3. A planned result whose ToC node is missing from the phase still reads `Not tagged` — proving the label follows the flag, not the bucket.
4. The Results tab CSV export matches the on-screen label.
5. Client and server suites green on the touched modules; no new pending migration (none is needed — no schema change).

---

## Next Step

```text
/akili-specify changes/emerging-result-chip
```
