# Archive Summary — `changes/overview-chart-view-toggle`

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/overview-chart-view-toggle/` |
| Archive date | 2026-08-27 |
| Final status | **Complete — all tasks `[x]`, HITL passed, morph kept** |
| Owner | j.cadavid@cgiar.org |
| Branch | `qa-development-2026` (spec branch; guide/TRD syncs recorded as pending items) |
| Depth / Type | Standard / Change · Approval Mode gated |

## 2. Outcome (lead)

The SP Overview matrix cards gained a Heatmap↔Bars toggle — and, through five owner amendments at the CVT-T-3 HITL gate, the Overview was reshaped around it: **bars default with bar-end totals, the redundant W1/W2 single-series card removed (matrix full-width), W1/W2 · W3/Bilateral section separators, and the two remaining bilateral single-series cards converted to ECharts.** Morph decision: **kept** (CVT-R-5, no fallback).

## 3. Requirements Delivered

| ID | Delivered by | Note |
|---|---|---|
| CVT-R-1 toggle | CVT-T-2 | Default amended to **bars** (CVT-A-1) |
| CVT-R-2 stacked bars | CVT-T-1/T-2 | + bar-end totals (CVT-A-2, OQ-1 override) |
| CVT-R-3 nav parity | CVT-T-1 | Full-matrix parity specs |
| CVT-R-4 a11y/motion | CVT-T-2/T-3 | Single host, same tableModel; reduced-motion wrapper-owned |
| CVT-R-5 morph SHOULD | CVT-T-3 | **Kept**; decision recorded |
| CVT-A-1..A-5 | under CVT-T-3 | Owner amendments, each Reviewer-PASSed attempt 1 |

## 4. Files Changed (from execution.md)

`program-overview/`: `program-overview.charts.ts` + `.spec.ts`, `program-overview.component.ts/.html/.spec.ts`; `dashboard-lab/`: `dashboard-lab.component.ts/.html` (CVT-A-3-authorized dead-chain cleanup only). 7 code files total across commits `400abcb2b`, `5020e8503`, `ce1fcc88a`, `6d8869168`, `6cb055298` (+ docs commits `2cdaaa546`, `e064ecc83`).

## 5. Test & Validation Evidence

- Final tree: FULL client suite **482 suites / 6,914 tests green**, `ng lint --quiet` clean, `ng build` exit 0.
- Static gates: 0 new hex; no `package.json` diff; code diff confined to `program-overview/**` + authorized dashboard-lab cleanup.
- Heading contract: pinned assertion deliberately 8→7 (CVT-A-3, cited in-test).
- HITL / CVT-AC-3: owner verdict "perfect" on the fully-amended build (2026-08-28); morph kept.
- No separate `test-report.md`/`validation-report.md` — evidence lives in `execution.md` (accepted at archive).

## 6. Accepted Warnings / Follow-Ups (all recorded in execution.md advisories)

1. **Keyboard drill-down gap (cumulative, A-3+A-5):** Overview navigation is now chart-click only; candidate proposal: hidden-table cells as links. Owner-notified, undecided.
2. `barWidth: 0` on the totals artifact is inert-by-design (documented risk if ECharts ever honors it).
3. Separator count test's tree-wide selector could collide with a loading chart host; scope-to-grid suggested.
4. Hidden-table *content* render not asserted for the two converted cards (one-line test suggested).
5. `changes/overview-toc-map` proposal drafted (`0a9ff21da`) — awaiting owner review.

## 7. Historical Notes

- Proposal→spec→execute all on 2026-08-27; 3 tasks + 5 gate-time amendments, **0 rework rounds, 0 HALTs, 0 pivots** — every Reviewer verdict PASS on attempt 1.
- Budget (3 tasks / ~300 LOC / 1 review round) exceeded ~4× by owner-directed amendments; each gated, recorded, individually PASSed.
- Supersedes OVW-DD-4 (archived family) and, for two cards, the family's "DOM bars for single-series rows" pattern (CVT-DD-9); P2-3303's card placement superseded by CVT-A-3.
- Concurrent foreign session shared this worktree (kp-cgspace-browse quick) — commit hygiene incident recorded in execution.md (resolved via `--only` pathspec commits).
