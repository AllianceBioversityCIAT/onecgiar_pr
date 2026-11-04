# Archive Summary — Center Overview by P/A (CPA)

**Outcome:** delivered. 8/8 tasks PASS; on `qa-development-2026-ss` and `staging` (32b5ed995) and `performance-refactor` (ea035b494). INC-166545 points 6 + 7.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/center-overview-pa-contribution` · prefix `CPA` · depth Standard |
| Owner | Santiago Sanchez |
| Ticket | Freshdesk INC-166545 (Nicoleta Trifa) |
| Approval Mode | gated |
| Archived by | `/akili-archive` on branch `qa-development-2026-ss` (spec branch → shared-file edits recorded as pending items) |

## 2. Original Spec Path

`docs/specs/bilateral/center-overview-pa-contribution/`

## 3. Archive Date

2026-10-28

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 8/8 `[x]` |
| Reviewer gates | every code task PASS; 1 FAIL rework (CPA-T-4, attempt 2 PASS) + 2 post-T-8 reworks (keyboard, legibility), each PASS first try |
| HALT / FATAL_FAIL / Pivot | 0 / 0 / 0 |
| `test-report.md` / `validation-report.md` | **absent — accepted by the owner's archive request (2026-10-28).** Evidence lives in `execution.md` (per-task Reviewer verdicts + CPA-T-8 live checks) |

## 5. Requirements Delivered

| Req | Delivered by | Evidence |
|---|---|---|
| CPA-R-1 Results by P/A | T-4, T-5, T-6 | execution.md T-4/T-5/T-6; T-8 bars = SQL |
| CPA-R-2 Projects by P/A | T-4, T-5, T-6 + legibility rework | T-8 visual check 900/1280 |
| CPA-R-3 Visible filters | T-6 + 6d5da5026 + keyboard rework | T-8 keyboard re-check |
| CPA-R-4 `category` key | T-3, T-7 | drill-downs reconcile (SP12 tagging 1, SP09 W3 8) |
| CPA-R-5 role fix | T-3 | spec falsifier |
| CPA-R-6 `tagged_center_project_ids` | T-2 | repo spec; CIP count unchanged on prod data |
| CPA-R-7 IFPRI visibility | T-1, T-8 | result 28915 (SP12) → project 252 visible everywhere |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Server | `api/results/result.repository.ts(+spec)` |
| Client contract | `bilateral-query-params.ts(+spec)`, `bilateral-result-filter.ts(+spec)`, `services/bilateral-center-result.interface.ts` |
| Overview | `bilateral-overview.{aggregate,charts,component}.*`, `.fixtures.ts`, `.cy.ts`, `components/overview-controls/*`, `CLAUDE.md` |
| Results tab | `bilateral-results-list.component.{ts,spec.ts}`, `CLAUDE.md` |

Commits: 9c2326d37, aa8e9a2ba, 6d5da5026, c9a19aed7, 32b5ed995.

## 7. Test Evidence Summary

- Pre-promotion run on 72fad2b88: server 121 suites / 2988 tests; client 453 suites / 12297 tests; lint; AOT build — all green.
- Follow-ups: 22 suites / 803, 805, 813 tests; AOT build green each time.

## 8. Validation Summary

CPA-T-8 on the owner's local stack against the prod DB (read-only) compared with reporting.cgiar.org: bars = SQL, drill-downs reconcile, unscoped Results tab and Portfolio Centers block unchanged, keyboard and 900/1280 legibility defects found and fixed. Timing inconclusive (no before-baseline).

## 9. Accepted Warnings Or Follow-Ups

- [ ] INC-166545 reply to Nicoleta: confirm A-1..A-5 + screenshots.
- [ ] Juan's P2-4037 is on `performance-refactor` but not on `qa-dev`/`staging` — next qa-dev → perf promotion needs a merge.
- [ ] `bilateral-overview/CLAUDE.md` (~125 lines) and `bilateral-results-list/CLAUDE.md` (~190) exceed the 120-line cap → kaizen pending item.
- [ ] Advisory: focus drops to `<body>` after "Clear selection"; W3 colour differs between the two P/A charts.
- [ ] CodeGraph re-index (`codegraph sync`).

## 10. Historical Notes

- Spec ran on `qa-development-2026-ss` (owner decision) while another session (ai-drafts-bulk-discard) shared the checkout; promotions were coordinated by message.
- tasks.md CPA-T-4 falsifier was self-contradictory; split into two fixtures (Reviewer: faithful).
- `design.md` handler name aligned to code (`onProjectsByPaChartClick`) at archive.
