# The Innovation Development catalogue is frozen on "Reporting 2025"

**Date:** 2026-09-01 · **Branch:** performance-refactor · **Status:** detected, NOT developed — the
requirement it belongs to is frozen.

## Why this is a note and not a ticket

Ángel Jarrín stopped Innovation Use on 31-Aug-2026 and the rule for the QA'd-innovation dropdown is
being redesigned. A ticket written today would be written against a rule that is about to change, so
this is recorded here instead, with a date, as evidence that the problem was found on 01-Sep-2026 and
deliberately left alone — not missed.

🛑 **The code below was not modified.** Frozen stays frozen.

## What was measured

Two different repository methods answer what is essentially the same question, and only one of them
is correct.

### `getResultsForInnovUse()` — `onecgiar-pr-server/src/api/results/result.repository.ts:2792`

Feeds the Contributors & Partners multi-select and the bilateral section. Three findings:

1. **It never selects `status_id` at all.** The known symptom is "the Quality Assessed filter does not
   bite", but the cause is one level deeper: the column is not in the `SELECT`, so no filter is
   possible here *or* in the client. Measured against the API on 31-Aug: 2,392 rows, 978 Innovation
   Development among them with no status, which is how drafts titled "Ttitleee" and "bua" end up
   being offered.

2. 🔴 **Two values are hardcoded: `v.phase_name = 'Reporting 2025'` and `cp.id = 2`.** This is the one
   that has no ticket anywhere. **When 2026 becomes the open reporting phase, this dropdown will keep
   reading 2025** — and nobody will notice until a user cannot find their own innovation in the list.
   It fails silently: no error, just a list that is quietly a year out of date.

3. **It uses `UNION ALL`, not `UNION`.** A row matching both branches is returned twice.

### `getQaEdInnovationDevelopmentResults()` — same file, `:2740`

Feeds the two W1/W2 creation surfaces, and does all three correctly: it filters on
`QA_LINKABLE_INNOVATION_STATUS_IDS`, it de-duplicates by `result_code` with a `NOT EXISTS`, and it
gates on **`v.phase_year`** — the phase-year axis, resolved by the caller from the active version and
never hardcoded.

## The divergence is deliberate — do not "unify" these

A future reader will be tempted to treat this as an accident and merge the two. It is not. There is an
explicit note at `result.repository.ts:2715` from whoever built P2-3420: the second method was created
*as a new method on purpose*, because widening the first one in place "would silently change" the
Contributors & Partners multi-select and the bilateral section.

So the split was the right call. What is left over is that the older method was never brought up to
the newer one's standard — and item 2 above is the part that will break on its own, with time, with
nobody touching anything.

## What has to happen, and when

Once Ángel publishes the new rule for the dropdown, whoever picks it up should decide explicitly what
happens to `getResultsForInnovUse()`. The phase hardcode is worth fixing **regardless of which rule
wins**, because it is not about the QA filter at all.

## Not verified

Nothing here was re-measured against a live environment: `prtest` and `prtest-back` were down all of
2026-09-01. The row counts are quoted from the 31-Aug measurement. The SQL findings are read directly
from the source and do not depend on the environment.
