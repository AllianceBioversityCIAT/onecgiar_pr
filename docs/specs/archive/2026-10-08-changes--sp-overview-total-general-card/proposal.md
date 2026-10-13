# Proposal — SP Overview "Total General" card: replicated / new / awaiting review

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/sp-overview-total-general-card/` |
| Slug | `sp-overview-total-general-card` — derived from free-text argument (request to give the Science Program Overview the same card style as the center Overview, with the figures the reviewer asked for in English) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-08 |
| Module | `result-framework-reporting` → `dashboard-lab` / `program-overview` (client only) |
| Depends on | none (reuses the visual pattern of `quick/overview-total-results-mockup`, commit `e25eeba49`) |
| Parallel-safe | yes |

## 2. Intent

Restyle the **Total General** KPI card on `/result-framework-reporting/entity-details/<SP>/overview` to match the center Overview's Total results card: big count, then a divider, then breakdown rows with right-aligned count chips. Swap its figures for the ones the reviewer asked for, so the card shows **what the program has to act on**.

## 3. Problem / Current Behavior

`program-overview.component.html:32-67` (card `data-testid="overview-kpi-total"`) shows:

```
TOTAL GENERAL                [Program]
73 results
69 W1/W2 · 4 W3/Bilateral
```

Reviewer feedback (image shared 2026-10-08, "General box"):

| # | Reviewer said | Reading |
|---|---|---|
| 1 | "69 w1/w2 should become **# of innovations replicated for update**" | The W1/W2 figure must be relabelled. Its count must be replicated results, not all W1/W2 results. |
| 2 | "4 w3/bilateral … not the program's responsibility to update these — pls remove this figure" | Drop the W3/Bilateral figure from this card. |
| 3 | "Add a figure for **# of new results**" | W1/W2 results of this phase that were **not** replicated. |
| 4 | "Add a figure for **# of w3/bilateral results awaiting revision**" | Bilateral results tagged to the SP in **Pending Review** (status 5). This is the program's job: it reviews them. |

The reviewer also cannot find the W3/Bilateral results the "4" refers to. That fits a known gotcha: the bilateral figure counts only results that reached review (`status_id IN (5,6,7)`, see `program-overview/CLAUDE.md`). They are not "innovations replicated under the SP".

## 4. Proposed Outcome

```
TOTAL GENERAL                         [Program]
69 results
──────────────────────────────────────────────
Innovations replicated for update        [ 62 ]
New results                              [  7 ]
W3/Bilateral results awaiting review     [  2 ]
```

- The card is restyled the way the center card was (`e25eeba49`): count, then `border-t border-white/20` divider, then rows with `bg-white/15` mono chips. The **purple gradient, header and `Program` pill stay**.
- The `N W1/W2 · N W3/Bilateral` line is removed.
- Each row has a `title` tooltip explaining exactly what it counts. The center card does the same.
- The card stays a `<button>` that runs `setActiveSection('all')`. Loading skeletons keep their current behavior.

## 5. Scope

- `program-overview.component.html`: KPI 1 markup only.
- `program-overview.component.ts`: three small `computed()`s, `replicatedCount`, `newCount` and `bilateralPendingReviewCount`, derived from inputs the component **already receives** (`programResults`, `bilateralStatusSegments`). No new HTTP call.
- If needed, `dashboard-lab.component.ts` so that `programResults` is scoped to the effective phase (see Risk R1).
- Specs: `program-overview.component.spec.ts`, which covers the card's figures and the removed W3 line.
- `program-overview/CLAUDE.md`, re-stamped in the same commit as the folder-doc convention requires.

## 6. Non-Goals

- KPI cards 2–5 (`W1/W2 Results`, `W3 / Bilateral`, `Contributing Centers`, `Areas of Work`) stay as they are. The feedback was about the "General box" only.
- No server change, no new endpoint and no change to `GET_ScienceProgramsProgress`, unless R1 forces Option B.
- No change to the center Overview card.
- No replicated/new pills under the rows. The center card has them, but here they would repeat rows 1–2 (see OQ-3).

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| SP focal points / PMU reviewers | The headline card now answers "what do I still have to update or review?" |
| `program-overview` (Overview tab of the programme shell) | KPI 1 template plus 3 computeds |
| `dashboard-lab` host | Maybe: phase-scoping of `overviewProgramResults` (R1) |
| Related specs | `changes/overview-replicated-new-badges` (center: same replicated/new semantics, `BOV-R-1/R-2`). `quick/overview-total-results-mockup` (the visual being reused). `changes/overview-aow-cross-filter` (scope filter, R3) |

## 8. Visual Reference

- Source: reviewer screenshot (English labels, "General box", 2026-10-08) plus the shipped center card markup in `bilateral-overview.component.html` (commit `e25eeba49`) as the visual pattern.
- Location: no mockup file. The pattern is the live center card at `/bilateral/<center>/overview`.
- Notes: one card is affected. Its row/chip classes are copied as-is from the center card.

## 9. Requirement Delta Preview

### ADDED Requirements

- Row **"Innovations replicated for update"**: count of the program's W1/W2 results in the effective phase with `is_replicated = 1`.
- Row **"New results"**: count of the program's W1/W2 results in the effective phase with `is_replicated ≠ 1`. Replicated plus new equals the headline count. The center card uses the same rule (`BOV-DD-1`).
- Row **"W3/Bilateral results awaiting review"**: count of the program's bilateral rows in **Pending Review** (status 5). This is the `pending` slot of `overviewBilateralStatusSegments`, which is already computed.

### MODIFIED Requirements

- The headline count becomes the program's **W1/W2** results (replicated + new) instead of W1/W2 + W3/Bilateral (OQ-1).
- The card is restyled to the divider + chip-row layout.

### REMOVED Requirements

- The `N W1/W2 · N W3/Bilateral` sub-line on the Total General card.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Client-only (recommended)** | Count `is_replicated` over the `programResults` input (already loaded from `get/all/roles`, whose SQL selects `r.is_replicated` and `source_name`), filtered to `source_name = 'W1/W2'` and the effective `version_id`. Take "awaiting review" from the existing bilateral `pending` segment. | No server change. All data is already on the page. Mirrors how the center card does it. | `programResults` is fetched **without** `version_id` and capped at `limit: 2000` (R1). The figures must reconcile with `statusTotal()`. |
| B. Server adds counts | Add `replicatedCount`/`newCount` to the per-version `GET_ScienceProgramsProgress` payload. | Same source as the meter, so it reconciles by construction. | Repository + DTO + tests on the server. Slower to deliver for a visual request. |
| C. Relabel only | Rename "69 W1/W2" to "replicated" without computing anything. | Fastest. | **Wrong**: it presents all W1/W2 results as replicated, which is the reviewer's assumption, not a fact. Rejected. |

## 11. Recommended Approach

**Option A.** It is the smallest safe path. Every figure needed is already in the component's inputs, and the template change copies one that already shipped. The first `/akili-execute` task is a reconciliation check against real data (SP01, plus the reviewer's program): replicated + new must equal `statusTotal()`. If it does not, the spec escalates to Option B instead of shipping a number that disagrees with the W1/W2 card next to it.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R1 | `loadProgramResults` (`dashboard-lab.component.ts:2624`) calls `GET_AllResultsWithUseRole` with **no `version_id`**, so rows from every phase arrive. The counts must filter by the effective phase (client-side, or by passing `version_id`, which the API already supports). Without that, "replicated" includes prior-phase rows. |
| R2 | `statusTotal()` comes from the meter (`GET_ScienceProgramsProgress`), not from `programResults`. Status inclusion (e.g. discontinued) may differ, so replicated + new ≠ headline. That is the reconciliation gate in §11. |
| R3 | **Scope filter** (`overviewScope`): `statusSegments` narrows by AoW but `programResults` does not. Proposed: the rows follow the scope when the data allows, or show a `Program-wide` hint like card 4 already does (`OSF-R-5`). Decide in `/akili-specify`. |
| R4 | Memory note: `is_replicated` comes from the phase-duplication flow. Per the 2026 bulk rule, every innovation except Editing/Rejected was duplicated. Non-innovation results can be replicated too, so the label "Innovations replicated" is accurate only if 2026 replication was innovations-only (OQ-2). |
| OQ-1 | Headline: show **W1/W2 total** (replicated + new, recommended, so the rows add up), or keep W1/W2 + W3 total? |
| OQ-2 | Count `is_replicated = 1` on **all** result types, or only innovation types (dev/use)? The label says "innovations". |
| OQ-3 | The reviewer wrote "awaiting **revision**". The app's vocabulary is "Pending **Review**". Recommendation: label it "awaiting review" to match the bilateral status card. |
| OQ-4 | Should the bilateral row count only status 5 (Pending Review), or also Editing (1/8)? Recommendation: 5 only, since that is what the program actually reviews. |

## 13. Success Criteria

- On SP01 and on the reviewer's program, the card shows the three rows and no W3/Bilateral figure.
- Replicated + new equals the headline and reconciles with the W1/W2 Results card (or the gap is explained in a tooltip and the spec).
- "Awaiting review" equals the `Pending Review` segment of the W3/Bilateral Reporting Status card.
- The visual matches the center card's row/chip pattern. Gradient, header, pill, click target and skeleton are unchanged.
- The touched Jest specs pass (`--testPathPattern=program-overview --maxWorkers=2`) and ESLint is clean on the touched files.

## 14. Next Step

```text
/akili-specify changes/sp-overview-total-general-card
```
