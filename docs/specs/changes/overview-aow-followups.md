# Follow-ups from `changes/overview-aow-cross-filter` — seed for `/akili-propose`

**Not a spec.** A loose note so three owner-raised improvements survive until `/akili-propose` runs. Raised 2026-09-02, after all 16 tasks of `overview-aow-cross-filter` closed and before its archive. None is a defect in what that spec built; all three are new scope and were deliberately kept out of it so the spec could close.

## 1 — Give the W1/W2 category×status card a real AoW dimension

**Today's behaviour is correct and deliberate**, not a bug: `OSF-R-3`'s amendment states *"a card that can filter, filters; the `Program-wide` declaration is only for cards that structurally cannot (the W1/W2 category matrix, which has no ToC join at all)."* Its data comes from `getIndicatorContributionSummaryByProgram`, which joins no ToC. `OSF-T-8` proved by effect that its figures are byte-identical filtered vs unfiltered.

**The signal:** the owner still found it surprising *with the `Program-wide` pill and its explanatory sentence both on screen*. So the improvement is not a better explanation — it is removing the limitation.

- **Shape:** server change. Give that endpoint the ToC join. `OSF-T-3` already built this exact query shape for the scope buckets, so the pattern exists and is proven against the real DB.
- **Payoff:** deletes the `Program-wide` exception entirely rather than explaining it. `OSF-R-5` and `OSF-AC-6` would lose their only subject.
- **Watch:** `OSF-AC-12` — `resultsCount.editing`/`submitted` must keep their meaning. `OSF-DD-2b`'s two-join-bases pattern (INNER for legacy counts, LEFT for buckets) is the precedent for doing this additively.

## 2 — Split the AoW row's two gestures

Card body click → **select that AoW as the scope** (cross-filter the page). `Report` button and the `→` arrow → **navigate to reporting** for that AoW.

- **Shape:** client-only, small. The plumbing already exists — the row emits `openAow`, and the action buttons already call `onOpenAowRowAction(row, $event)` with `stopPropagation`, so the two gestures are already separable.
- **Watch:** the row is a `<button>`; nesting interactive controls is already handled here, but any change must keep the `OSF-T-2b` ladder and the `OSF-T-12`-style icon-only collapse intact at narrow widths.

## 3 — A `Progress by AoW` section covering W3/Bilateral as well as W1/W2

Owner asked for analysis, not just a build. Analysis:

**Feasible client-side.** W3/Bilateral rows already carry the AoW acronym in the payload — that is precisely why `OSF-R-3` could filter all four W3 cards with **no server change**. An AoW distribution for W3 needs no new endpoint.

**But W1/W2 and W3 are NOT commensurable, and this is the whole risk.** The W1/W2 hero measures *planned KPIs* (`reported / total`) — a plan-relative metric. W3 has no KPI plan; it has counts. Merging them under one heading would put two numbers that mean different things under one word — "progress" — with different denominators.

That is exactly the **lying-figure failure this spec exists to prevent**, and the reason the `Program-wide` pill and its sentence were built in the first place.

**Recommendation:** one `Progress by AoW` section that shares the **AoW axis and row order** — that shared axis is the actual value, letting both halves be read against the same column — but with two separately labelled blocks, each stating its own metric and denominator. **Not** a single merged table.

**Open question for `/akili-propose`:** does the section keep the existing W1/W2 hero as-is and add a W3 block beside it, or is the hero restructured? That decides whether this is additive or a rework of a surface two specs already touched (`overview-aow-progress-hero`, then this one).
