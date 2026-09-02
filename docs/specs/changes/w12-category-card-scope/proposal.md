# Proposal — Give the W1/W2 category card a scope dimension

**One line:** the card that today declares itself `Program-wide` has no Theory-of-Change join at all; this proposal asks whether to give it one — and finds a reason to doubt that filtering is the right answer.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w12-category-card-scope` |
| Type | **Change** |
| Approval Mode | `gated` |
| Date | 2026-09-02 |
| Depends on | none |
| Parallel-safe | **yes** — server query + one card; shares no markup with the other two follow-ups |
| Source | Owner report 2026-09-02 (`docs/specs/changes/overview-aow-followups.md` §1) |
| Related | `docs/specs/archive/2026-09-02-changes--overview-aow-cross-filter/` (`OSF-R-5`, `OSF-AC-6`, `OSF-DD-2b`) |

## 2. Intent

The owner filtered by an Area of Work and reported that *W1/W2 results by category and status* did not change. It is deliberate — but the surprise is the signal, so the question is whether the limitation should be removed rather than better explained.

## 3. Problem / Current Behavior

**Today's behaviour is correct and declared.** `OSF-R-3` settled the rule: *a card that CAN filter, filters; the `Program-wide` declaration is only for cards that structurally cannot.* This card cannot. `getIndicatorContributionSummaryByProgram` (`result.repository.ts:~2694`) joins:

```
FROM result r
INNER JOIN results_by_inititiative rbi   -- ownership
INNER JOIN `version` v                   -- phase integrity
INNER JOIN result_type rt                -- category label
```

No ToC table appears. There is no area-of-work dimension to filter on, so filtering would produce a number that is not what it claims. The card already renders a `Program-wide` pill and a sentence saying so, and `OSF-T-8` proved by effect that its figures are byte-identical filtered and unfiltered.

**The complication.** That query is *deliberately* reconciled with the meter's base query — origin, ownership, phase and universe all mirrored (`W12-R-2`, `W12-DD-2`, comments at `:2698-2702`). Changing its population desynchronises the card from the meter, which is a different and worse bug than the one being fixed.

## 4. Proposed Outcome

The user can tell, for the W1/W2 category mix, how much of it belongs to the selected scope — **without** any figure on screen becoming untrue.

## 5. Scope

- A scope dimension for this card's data, added on a **second join basis** so the existing totals keep their exact current population.
- Whatever the card renders under an active scope must reconcile: parts sum to the declared whole, per `OSF-R-13`'s precedent.
- The `Program-wide` declaration is removed **only if** the card genuinely becomes scope-aware; otherwise it stays and is the honest answer.

## 6. Non-Goals

- Not changing the meter's own query or the card's unfiltered totals.
- Not changing `resultsCount.editing` / `submitted` (`OSF-AC-12`).
- No new endpoint — this is an additive payload change to an existing one, as `OSF-T-3` did.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| `result.repository.ts` | the query gains a scope dimension |
| `results-framework-reporting` payload | additive |
| `program-overview.component.*` | the card's filtered rendering; possibly deletes the `Program-wide` branch |
| Archived spec | `OSF-R-5` and `OSF-AC-6` lose their only subject if the exception disappears |

## 8. Visual Reference

- **Source:** None yet — depends on which option below is chosen. Option B needs a visual; Option A does not.
- **Notes:** if the card gains a per-scope breakdown, it should reuse the breakdown block `OSF-T-13` restored from the mockup rather than inventing a second pattern.

## 9. Requirement Delta Preview

### ADDED
- A scope dimension on the category×status data.

### MODIFIED
- `OSF-R-5` / `OSF-AC-6` — the `Program-wide` declaration's only subject, if the card becomes filterable.

### REMOVED
- Potentially the `Program-wide` pill and its explanatory sentence.

## 10. Approach Options

| Option | What it does | Trade-off |
|---|---|---|
| **A — Two join bases, card filters** | Keep the INNER basis for today's totals; add a LEFT-joined scope dimension. Exactly `OSF-DD-2b`'s shipped pattern. | Removes the exception. **But see the risk below: a large untagged share means the filtered card shows a minority of its own results.** |
| **B — Two join bases, card gains a scope *breakdown* instead of filtering** | The card keeps program totals and gains a per-scope split beneath, like the `By scope` block. | Nothing on screen ever becomes untrue, the untagged mass stays visible instead of vanishing, and the `Program-wide` sentence becomes a fact the user can *see* rather than a claim they must trust. Does not literally do what was asked. |
| C — Filter on an INNER ToC join | Simplest query. | Silently drops every untagged result. `OSF-DD-3` rejected this basis for the buckets and the same reasoning applies. Rejected. |

## 11. Recommended Approach

**Start at B, and let the measured untagged share decide whether A is defensible.** The reason is a number this project already has: on SP01 the scope breakdown reads **55 untagged of 96** results. `OSF-T-1` measured the same effect on the bucket query — an INNER basis would have labelled 150 ToC-linked results as untagged, and moving to LEFT dropped the residual from 59% to ~22%.

If a comparable share of this card's population has no ToC area, then filtering it (Option A) shows the user a minority of the card's own results with no indication that the majority went somewhere. That is a *different* lying figure, not a fix for one — and it is exactly the failure the archived spec spent itself preventing.

**Confirm the real distribution against the dev DB before choosing.** That measurement is the first task either way.

## 12. Risks, Dependencies, And Open Questions

| Item | Note |
|---|---|
| **Meter desynchronisation** | HIGH. The query is deliberately reconciled with the meter (`W12-DD-2`). The scope dimension must be additive on a second basis; the existing totals must be provably unchanged. |
| **Untagged mass** | The deciding number, and it is not yet measured for *this* population. Task 1 measures it. |
| **`OSF-AC-12`** | `resultsCount.editing`/`submitted` keep their names and values. |
| **Open question** | If the card becomes filterable, does the `Program-wide` rule (`OSF-R-5`) lose all subjects, or does another card inherit it? Worth checking before deleting the mechanism. |

## 13. Success Criteria

- The card's unfiltered figures are **byte-identical** to today's — proved, not asserted.
- Under an active scope the card either filters honestly (every result accounted for, untagged included) or declares itself program-wide **with visible evidence**.
- No change to the meter's numbers.

## 14. Next Step

```text
/akili-specify changes/w12-category-card-scope
```

Specify starts with the untagged-share measurement — the A-vs-B choice depends on it, and choosing without it repeats the mistake this proposal exists to avoid.
