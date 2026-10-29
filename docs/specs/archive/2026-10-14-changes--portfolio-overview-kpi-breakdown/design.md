# Design — Portfolio Overview KPI Cards: New vs Replicated Breakdown

## 0. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-kpi-breakdown/` |
| Requirements | `requirements.md` (POVKB-R-1..6), approved 2026-10-14 |
| Depth | Standard |
| Approval Mode | gated |
| Status | draft |

## 1. Summary

This is a client-only change inside `pages/result-framework-reporting/pages/portfolio-overview/`. `PortfolioOverviewService.kpiTotals()` learns to read the `is_replicated` flag that the server already sends and returns eight new counts. The component template replaces the subtitle line of cards 1–3 with breakdown rows and deletes card 4. The accepted constraint: the figures are only as complete as the existing 20 000-row payload, and the `isPartial()` banner already covers that.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| POVKB-P-1 | The page's endpoint already returns `is_replicated` on every row | `onecgiar-pr-server/src/api/results/result.repository.ts` → `AllResultsByRoleUserAndInitiativeFiltered` (`:686`) | `r.is_replicated,` is in its SELECT at `:738`; the client calls `get/all/roles/filter/:userId` (`results-api.service.ts:89`), whose service (`results.service.ts:1481`) calls that repository method | verified | A server change is needed; the spec becomes Full |
| POVKB-P-2 | The flag can arrive as `1`, `'1'` or `true` | `programme-results.service.ts:323` already normalises all three for the same column | Read the line | verified | Harmless: the predicate is a superset |
| POVKB-P-3 | Replicated W3 rows are innovations only | Prod query run by the user, 2026-10-14 (proposal §12) | W3 replicated = Innovation development 222 + Innovation use 57 | verified (prod, today) | The label "Innovations replicated from 2025" becomes inaccurate; the copy change is one line |
| POVKB-P-4 | Editing is `status_id = 1` | `STATUS_KEY_TO_ID.editing = 1` (`portfolio-overview.component.ts:59`); prod rows show status_name Editing | Read + prod snapshot | verified | Bucket rule changes; T-1 fixtures change |
| POVKB-P-5 | `scrollToMatrixSection()` has a single caller (card 4) | Grep over `portfolio-overview/` | Only `component.html:210` calls it; no spec calls it | verified | Keep the method |
| POVKB-P-6 | No consumer outside `portfolio-overview/` reads `PortfolioKpis` / `kpiTotals` | Grep over `src/app` | No hits outside the folder | verified | Extending the interface is still additive, so this is safe anyway |

## 2. Architecture Overview

- **Server:** untouched.
- **Client:** `portfolio-overview/services/portfolio-overview.service.ts` (aggregation), `portfolio-overview.component.html` (deck plus skeleton), `portfolio-overview.component.ts` (removal of the dead method and a Spartan separator import), their specs, and the folder's `CLAUDE.md`.

```
load() → GET roles/filter (unchanged, limit 20000)
  └─ apply(): open-phase rows → rows() signal            (unchanged)
       └─ kpiTotals() computed
            ├─ existing: totals, %chips, phaseLabel …   (unchanged)
            └─ NEW: one pass → {source × replicated × editing} tallies
                 └─ template: card 1 (4 rows) · card 2 · card 3
```

## 3. Data Model

There is no persistence change. The client type `RawResult` gains the optional `is_replicated` (number | string | boolean | null).

`PortfolioKpis` gains (all integers ≥ 0):

| Field | Definition | Requirement |
|---|---|---|
| `w1w2New` | W1/W2 rows that are not replicated | R-1, R-2 |
| `w1w2NewSubmitted` | `w1w2New` rows whose status is not Editing | R-2 |
| `w1w2NewEditing` | `w1w2New` rows in Editing | R-2 |
| `w1w2Replicated` | W1/W2 rows that are replicated | R-1, R-2 |
| `bilateralNew` | W3 rows that are not replicated | R-1, R-3 |
| `bilateralNewSubmitted` | `bilateralNew` rows whose status is not Editing | R-3 |
| `bilateralNewEditing` | `bilateralNew` rows in Editing | R-3 |
| `bilateralReplicated` | W3 rows that are replicated | R-1, R-3 |

Invariants (asserted in T-1): `w1w2New + w1w2Replicated = w1w2Count`; `w1w2NewSubmitted + w1w2NewEditing = w1w2New`; the same for bilateral; and `w1w2Count + bilateralCount = totalResults`, which already holds today because the W1/W2 / W3 split is a complement.

## 4. API Design

No change. The same single request is made.

## 5. Business Rules

- **Replicated** if the flag is `1`, `'1'` or `true`; otherwise **New**.
- **Editing** if `Number(status_id) === 1`; otherwise **Submitted**. A missing `status_id` counts as Submitted. That case is not observed in prod (every row joins `result_status`), and it keeps the invariant intact.
- The source split reuses the existing `source_name === 'W3/Bilaterals'` test, so the new counts can never disagree with the headline counts.

## 6. Frontend / UX Component Architecture

**Deck:** a 3-card grid, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. On `sm` the third card wraps alone, the same behaviour the current 4-card deck has between `sm` and `lg`. The skeleton deck goes from `[1,2,3,4]` to `[1,2,3]` with the same grid classes.

**Breakdown row (shared visual pattern, inline markup, no new component):** a flex row with the label on the left (12 px) and the figure on the right (`tabular-nums`, semibold). Rows are real text, not colour-only (a11y §10).

| Card | Header / chip | Headline | Body (new) | Footer |
|---|---|---|---|---|
| 1 Total (gradient) | unchanged + phase chip | `totalResults results` | 4 rows: W1/W2 new · W3/Bilateral new · W1/W2 replicated · W3/Bilateral replicated. Labels in `text-purple-100`, figures in white | `Results Center →` |
| 2 W1/W2 | unchanged + `% submitted / QA` chip | `w1w2Count results` | Row "New" `w1w2New`; sub-line muted "Submitted N · Editing N"; separator; row "Replicated from previous years" `w1w2Replicated` | `Results Center →` |
| 3 W3/Bilateral | unchanged + `% approved` chip | `bilateralCount results` | Row "New" `bilateralNew`; sub-line "Submitted N · Editing N"; separator; row "Innovations replicated from 2025" `bilateralReplicated` | `Bilateral →` |

- The separator between New and Replicated uses Spartan `hlm-separator` (`@spartan/separator`, already in `src/app/spartan/`), following the project rule that visual adjustments use Spartan. On card 1 it takes a translucent white tint so it reads on the gradient.
- Tokens: the existing ones only. `--pr-text-muted` / `--pr-text-secondary` / `--pr-text-heading` on cards 2–3; `text-purple-100` / white on card 1, which is already used on that gradient today. No new colours.
- Since the body grows, the cards keep `justify-between` and the footer stays pinned at the bottom. All three cards size to the tallest one through the grid's default stretch.
- Each card's accessible name remains its visible text. No `aria-label` override is introduced.

## 7. Shared Contracts

None. `PortfolioKpis` is local to the folder (P-6).

## 8. Testing Plan

- **Service spec (`portfolio-overview.service.spec.ts`):** an encoding-matrix fixture for the flag, a mixed-status fixture per source, the reconciliation invariants, the zero-W3 case and the closed-phase fallback.
- **Component spec (`portfolio-overview.component.spec.ts`):** rewrite the "renders 4 KPI cards" test into "renders 3 KPI cards". Assert the breakdown labels and figures, assert that "Science programs" and "% portfolio progress" are absent, and assert 3 skeleton placeholders.
- **Command:** `npm run test:local -- --testPathPattern=portfolio-overview` (or `npx jest --maxWorkers=2 --testPathPattern=portfolio-overview --silent --reporters=summary --no-coverage`). Lint only the touched files.
- **Visual check:** manual, at the HITL pause, at 375 / 768 / 1280 / 1440 px. Browser checks are read-only (no clicks on write buttons).

## 9. Design Decisions

| ID | Decision | Rationale / rejected alternative |
|---|---|---|
| DD-1 | Compute in `kpiTotals()` with one pass over `rows()` | Follows the folder contract ("the service owns every aggregation"). Rejected: a server aggregate endpoint (proposal option B), which would add deploy surface and could drift from the page's own rows. |
| DD-2 | A local `isReplicated` predicate that mirrors `programme-results.service.ts:323` | Rejected: importing from the `programme-results` page, which would couple two sibling pages. The logic is a single expression. |
| DD-3 | Submitted = not Editing | Proposal OQ-1 decision. It keeps Submitted + Editing = New, so the cards always reconcile. |
| DD-4 | Keep the now-unrendered `PortfolioKpis` fields (`w1w2CategoriesCount`, `bilateralCentersCount`, `activeProgramsCount`, `totalProgramsCount`, `portfolioProgressPercent`) | Their existing unit assertions stay valid and they cost nothing. Removing them is churn outside the request. Flagged as follow-up cleanup in §11. |
| DD-5 | **Reversion:** remove card 4 and `scrollToMatrixSection()` | Requested (item 4). |
| DD-6 | **Reversion:** drop the subtitles "Across N result categories" and "Reported across N science programs" | They are replaced by the requested breakdowns, and the cards cannot hold both without crowding. |
| DD-7 | Inline breakdown markup, no new child component | Three cards with three different shapes. A component would be an abstraction for one use. |

### Reversion challenges (Step 2.3: "what does removing this break?")

- **DD-5:** the only caller of `scrollToMatrixSection()` is card 4 (P-5). The anchor `#progress-by-science-program` stays on the matrix section, so nothing else depends on it. The admin loses a "jump to matrix" shortcut, but the matrix is still on the same page below the fold. One component-spec test asserts the card's copy (`spec.ts:155,161-162`) and is rewritten in T-2. **No unaddressed breakage.**
- **DD-6:** the category count is still visible in the "Results by indicator category" bars, and the programme count in the matrix. The spec asserts those strings (`spec.ts:159-160`), and T-2 rewrites those assertions. **No unaddressed breakage.**

## 10. Budget (Step 2.4 tripwire)

| Metric | Estimate |
|---|---|
| Tasks | 3 (service · template/component · docs) |
| LOC | ~220 (≈60 service + ≈90 template + ≈70 specs), net of ≈45 deleted |
| Review rounds | 1 |

This matches Standard-narrow, with no depth change. If execution exceeds 5 tasks or ~350 LOC, the Leader stops and escalates.

## 11. Open Gaps & Follow-ups

- Layout and contrast have no automated gate. A visual check at the HITL pause covers them (requirements §8).
- Follow-up (not in scope): prune the unrendered `PortfolioKpis` fields (DD-4).
- If replicated W3 ever includes non-innovations (P-3), change the card 3 label.

Cross-references: `requirements.md` · `docs/ux-ui/design.md` §7, §9, §10 · `docs/trd/trd.md` (no API change) · `portfolio-overview/CLAUDE.md`.
