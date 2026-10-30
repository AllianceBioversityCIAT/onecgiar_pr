# Spec Family — Impact Results Reporting (P2-3901)

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/results/impact-results-reporting/` |
| **Date created** | 2026-10-29 |
| **Last updated** | 2026-10-29 |
| **Spec-family status** | `open` |
| **Source proposal** | [`proposal.md`](./proposal.md) · [P2-3901](https://cgiarmel.atlassian.net/browse/P2-3901) · User Guide v2 (2026-10-29) |

---

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `results/impact-results-reporting/server-foundation` | none | no | done |
| 2 | `results/impact-results-reporting/sp-reporting-entry` | `results/impact-results-reporting/server-foundation` | yes (with #3) | pending |
| 3 | `results/impact-results-reporting/result-detail-impact` | `results/impact-results-reporting/server-foundation` | yes (with #2) | pending |

Build order (MoSCoW): all three are **Must** — P2-3901 AC 1–19 span them. #1 carries the only migration and the API contracts; #2 and #3 are client-only and touch disjoint areas (SP Reporting page vs result-detail), so they can run in separate worktrees once #1 is `done`.

---

## 3. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-10-29 | Family created from proposal; 3-way split and proposal OQ defaults (OQ-1, 2, 4, 5, 6) accepted | Santiago Sanchez (user) |
