# Archive Summary — Bilateral project overview metrics

**Outcome:** shipped. Each Bilateral Home project card shows 3 pills: **replicated**, **new** (not replicated and `Pending review`), and **W1/W2 results** that tag the project through `results_by_projects`. All 3 are scoped to the selected phase. Code is in `master` (`d3417ac134`).

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bilateral/project-overview-metrics/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Final status | **Complete**: BIL-POM-T-1..T-4 `[x]`. T-4's PR/CI boxes were closed by the merge to `master` |

## Requirements delivered

| Item | Status |
|---|---|
| Metric #1 replicated, metric #2 new-for-review (AC-1..AC-3) | Delivered |
| Metric #3 W1/W2 contributor count | **Delivered, against the original spec**: execution.md §7 found the real link (`results_by_projects` written by the framework create path) and implemented it, with user sign-off |
| Phase switch refreshes counts without resetting filters | Delivered |

## Files changed

Server: `result.repository` center-results query (`is_replicated`), `bilateral-center.controller/service`, `bilateral-projects.service` (`getW1w2ContributorCounts`, `versionId`). Client: `bilateral-projects-panel` (pills, single effect on center + phase), `bilateral-api.service`, `bilateral-creation.interfaces/service`, specs.

## Test evidence

| Check | Result |
|---|---|
| Server scoped Jest | 142/142 (§7) |
| Client panel + creation specs | 104/104; `--changedSince` 905 tests, 0 failures from this diff |
| **PRTest browser check (2026-11-13, read-only)** | PASS: 87 cards, 3 pills each, W1/W2 tooltip shown, no overflow at 390 px |
| **OQ-3 spot-check (2026-11-13)** | PASS: T-PJ-003812 has `11 new`, and its 11 results are all W3 Manual `Pending review` |

## Validation summary

No `/akili-validate` run. Reviewer PASS per task, plus the browser and data checks above (execution.md §8).

## Accepted warnings / follow-ups

- **Doc divergence:** `requirements.md` (metric #3 out of scope) and `design.md` DD-2 (no third badge) are **superseded by execution.md §7**. Read §7 as the source of truth for metric #3.
- Staging QA by the product owner was never recorded separately; the PRTest check above stands in for it.
- One transient "Could not load projects" on first load (all APIs 200; not reproduced).

## Diagrams

None.
