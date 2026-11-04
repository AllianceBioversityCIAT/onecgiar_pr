# Proposal — Make Overview Result Counts Show New vs Replicated

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/overview-replicated-new-badges/` |
| Slug | `overview-replicated-new-badges` — derived from free-text argument (user's Spanish/English request about clarifying the CIP Overview numbers) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-09-29 |
| Module | `bilateral` (center Overview tab) |

## 2. Intent

Make the numbers on the center **Overview** tab self-explanatory the same way the **Reporting** tab's Projects Catalog already is: when results have been carried over ("replicated") from a prior phase vs freshly created ("new") this phase, show it with badges — not just an aggregate count that hides the split.

## 3. Problem / Current Behavior

The "Total results" hero KPI on `bilateral-overview.component.html:88-106` shows:

```
266 results
63 W3/Bilateral · 203 W1/W2
98 lead · 168 contributing
```

The user's question: *"I imagine the 63 W3/Bilateral come from replicated innovations — is that correct?"*

**Confirmed answer: no, that assumption is not correct.** `buildTotalResultsKpi` (`bilateral-overview.aggregate.ts:139-153`) computes `w3Count` from `row.source === 'API'` — i.e. "reported directly under a bilateral project" — with **no relationship at all** to whether the result was carried over from a previous phase. A W3/Bilateral result can be brand-new this phase, and a W1/W2 result can equally be carried over. The two splits (source W3-vs-W1/W2, and new-vs-replicated) are orthogonal, and the Overview tab currently only surfaces the first one.

The second split — **new vs replicated** — already exists as a concept in this codebase, but only at the **per-project** level, on the Reporting tab's Projects Catalog (`bilateral-projects-panel.component.html:265-299`, `.component.ts:104-137`), driven by `BilateralCenterResult.is_replicated` (a server column set when a result row is created via the phase-duplication/versioning flow, not innovation-specific despite the historical naming — confirmed via `result.entity.ts` and the `1694618798352-addedIsReplicatedIntoResult` migration, which apply to the `result` table generally). That per-project computation itself carries an open question tag, `BIL-POM-OQ-1` ("interim 3rd metric, unresolved"), which this spec should read before finalizing behavior.

**Net: the center Overview tab has no figure today that tells the user how much of the 266 (or the 63 W3/Bilateral) is new vs replicated.** That is the actual gap behind the user's question.

## 4. Proposed Outcome

Extend the "Total results" KPI hero (and/or add a companion row) on the Overview tab with a **New / Replicated** breakdown, badge-styled exactly like the Reporting tab's Projects Catalog pills (pi-sync amber "replicated" / pi-plus-circle emerald "new"), computed **center-wide** (aggregated across all of the center's filtered results) rather than per-project. The existing "W3/Bilateral · W1/W2" line stays, but its relationship to the new badges must be visually unambiguous — the two are different axes, not a breakdown of one another.

## 5. Scope

- `bilateral-overview.aggregate.ts` — new computed counts (center-wide `replicatedCount` / `newCount`), derived from the SAME filtered row set as everything else on the page (`filterCenterResults`, `COV-R-13`), never a second independent query.
- `bilateral-overview.component.html` / `.component.ts` — render the badges on/near the "Total results" card.
- `bilateral-overview.component.spec.ts`, `.aggregate.spec.ts`, `.cy.ts` — cover the new figures and, if the card grows, re-verify the layout/breakpoint rules already documented in this file's `CLAUDE.md` (the `sm:` vs `min-[Npx]:` cascade trap).
- `bilateral-overview/CLAUDE.md` — update in the same commit per `docs/COMPONENT-DOCS.md` convention (touched-folder rule).

## 6. Non-Goals

- Changing the per-project Reporting tab badges — they are already correct and are the pattern to copy, not to change.
- Redefining what counts as W3/Bilateral vs W1/W2 (`row.source`).
- Resolving `BIL-POM-OQ-1` itself beyond what's needed to reuse its computation safely — that's the Reporting tab's own open question, not created by this change.
- Server-side changes — `is_replicated` is already delivered on every `BilateralCenterResult` row.
- Adding a new/replicated split to the Pending review / Approved / Needs attention cards (out of scope unless requested later).

## 7. Affected Users, Systems, And Specs

- **Users:** Center reporting leads and PMU/SP reviewers reading the center Overview tab (all portfolios using the bilateral module).
- **Systems:** `onecgiar-pr-client` only — no server change; `is_replicated` is already on the wire.
- **Related specs:** `docs/specs/archive/2026-09-14-bilateral--center-overview-tab/` (original Overview tab spec, `COV-*` ids cited throughout `bilateral-overview/CLAUDE.md`); the Reporting tab's `BIL-POM-T-3`/`BIL-POM-OQ-1`/`BIL-POM-AC-3` ids (badge pattern being reused).

## 8. Visual Reference

- Source: None (no new mockup needed).
- Location: n/a — reusing the **already-shipped** badge pattern from `bilateral-projects-panel.component.html` (Reporting tab), visible today in the running app. The user's own screenshots showed exactly this pattern and asked for it to be mirrored on Overview.
- Notes: Screen in scope is the center Overview tab's "Total results" KPI hero. No other screens change.

## 9. Requirement Delta Preview

### ADDED Requirements

- A center-wide "replicated" count and a center-wide "new" count, computed from the same filtered result set as the rest of the Overview KPIs.
- Badge UI on the Overview tab showing these two counts, styled like the existing Reporting tab pills.

### MODIFIED Requirements

- The "Total results" KPI hero card's layout/content (`bilateral-overview.component.html:88-106`) grows to include the new badges; its `aria-label` should be updated to keep describing the card accurately.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Badges inside the existing "Total results" card (Recommended)** | Add a compact badge row under the existing count/source lines, reusing the Reporting tab's pill markup/tokens. | Smallest safe change; no new KPI tile; keeps the 5-column KPI grid intact (avoids the `sm:`/`min-[Npx]:` breakpoint-cascade risk already documented in this folder's `CLAUDE.md`). Card gets visually denser — needs a layout check at narrow widths. |
| B — New 6th KPI tile "New vs Replicated" | Dedicated card, same visual weight as the other 4 KPIs. | Clearer standalone, but breaks the deck's 5-column grid math and re-opens the exact breakpoint-mixing bug this file's `CLAUDE.md` already documents as fixed once (`min-[900px]:grid-cols-3` / `min-[1280px]:grid-cols-5`). More surface area for a first cut. |
| C — Show the split only in "Results by project" (mirror Reporting tab, per-project) | Reuses `bilateral-projects-panel`'s exact per-project counts inside the Overview's existing "Results by project" card. | Doesn't fix the headline ambiguity the user flagged — the confusing number is the **center-wide hero**, not the per-project chart. |

**Recommended: Option A.**

## 11. Recommended Approach

Add the new/replicated badges to the "Total results" hero card (Option A), computed center-wide in `bilateral-overview.aggregate.ts` from the phase-filtered row set, using the exact same `Number(row.is_replicated) === 1` normalization already documented as load-bearing in `BilateralCenterResult.is_replicated`'s docstring. Confirm during `/akili-specify` whether "new" here should be an unconditional partition of all results (mirrors "not replicated", regardless of status) — recommended, since at the center-hero level status is a different axis (Pending/Approved/Needs attention already cover status) — or should copy the Reporting tab's status-gated definition (`is_replicated !== 1 AND status === pending`). These currently disagree in scope; `/akili-specify` should resolve which one the user means and record it as an explicit acceptance criterion, since the two "new" definitions produce different numbers.

## 12. Risks, Dependencies, And Open Questions

- **Reconciliation (`COV-R-13`):** the new counts MUST come from the same `filterCenterResults` row set as every other Overview figure, or they will disagree with the Results tab's own visible count — that reconciliation is proven live (HITL), never by a fixture alone, per this folder's own `CLAUDE.md`.
- **`BIL-POM-OQ-1`:** the Reporting tab's own replicated/new computation is tagged as an "interim 3rd metric... unresolved" open question. Read that context before locking behavior here, since this proposal reuses its logic at a different aggregation level.
- **Open question (see §11):** does center-level "new" mean "not replicated" (unconditional) or "not replicated AND pending" (mirrors the per-project definition)? Needs explicit user confirmation at `/akili-specify` time.
- **Layout risk:** this file's own `CLAUDE.md` documents a real, previously-fixed bug from mixing named (`sm:`) and arbitrary (`min-[Npx]:`) Tailwind breakpoints on the same property in the KPI deck. Any layout change here must keep one breakpoint style per property.
- **`is_replicated` wire shape:** raw MySQL tinyint — normalize with `Number(...) === 1`, never a strict `===` boolean comparison (documented gotcha in this folder and in the interface docstring).

## 13. Success Criteria

- The "Total results" card visibly answers "how many of these results are new this phase vs carried over (replicated) from a previous phase," using the same badge styling as the Reporting tab.
- The relationship between the existing "W3/Bilateral · W1/W2" line and the new "new/replicated" badges is unambiguous — a user can no longer conflate the two axes the way the current screen invites.
- New/replicated counts reconcile live against the Results tab's own filtered count (`COV-R-13`), verified HITL, not just by a fixture.

## 14. Next Step

```text
/akili-specify changes/overview-replicated-new-badges
```
