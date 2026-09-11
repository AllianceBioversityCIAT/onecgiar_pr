# Archive Summary — "My results" board (4th Science Program tab)

The SP hub gained a fourth tab, **My results**: a read-only, status-grouped board of the user's results with server-folded completeness, the same filter surface as the Results tab (now multi-select on both tabs), motion, a board-shaped skeleton, and a responsive strip below 900 px. 13 of 14 tasks PASS; T-13 phase 2 (board consumes the shared filter service) deferred by the user.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-board` · Prefix `MWB` |
| Type / Depth | Change · Standard · Approval `pre-approved` (user, 2026-09-04) |
| Branch | `qa-development-2026` (spec branch; default pin `master`) |
| Archive Date | 2026-09-05 |
| Final Status | **Done with one accepted follow-up** — 13/14 `[x]`, `MWB-T-13` `[~]` (part A + part B phase 1 done; phase 2 deferred) |
| Judgment Day | round 1 pre-execution: 8 confirmed severe, all fixed (`judgment.md`) |

## 2. Original Spec Path

`docs/specs/changes/my-work-board/` (proposal, requirements, design, tasks, judgment, execution, pending-archive, mockup/, evidence/).

## 3. Archive Date

2026-09-05

## 4. Final Status

| Task | Status | Attempts |
|---|---|---|
| T-1 server `include_completeness` flag | PASS | 1 |
| T-2 client foundation (SP-id service, mapper, section map, view-model) | PASS | 1 |
| T-3 board + badge services | PASS | 1 (+1 in-attempt adjustment) |
| T-4 route, tab, page, column, card | PASS | 3 |
| T-5 Cypress CT viewport/overflow/no-DnD | PASS | 1 (axe TEST_GAP) |
| T-6 real-browser evidence + docs | PASS | blocked → resolved (stale dev server, DB VPN) |
| T-7 motion | PASS | 2 (rail width animation accepted partial) |
| T-8 filter row, Where to report, phase select, skeleton | PASS | 1 |
| T-9 search, Filter popover, chips | PASS | 2 |
| T-10 Quality assessed column, collapse, equal widths | PASS | 1 |
| T-11 responsive strip + jumper, floors | PASS | 1 (resumed after a session restart) |
| T-12 multi-select Category/Funding source/Center (board) | PASS | 1 |
| T-13 same on Results via the shared service | **PARTIAL** | part A PASS, part B phase 1 PASS, phase 2 deferred |
| T-14 chip aggregation, `+N more`, multiselect stays open | PASS | 3 |

## 5. Requirements Delivered

`MWB-R-1`…`R-9`, `R-11` delivered; `R-10` (explainer) withdrawn by the user; `R-20` removed. `MWB-AC-1`…`AC-9` evidenced (Jest, Cypress CT, real browser). Post-spec user requests delivered as T-7…T-14 (motion, layout corrections, skeleton, filters parity, Quality assessed, collapse, responsive, multi-select ×2, chips overflow).

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Server | `results-validation-module/completeness.ts` (+spec), `results.service.ts` (+spec), `results.controller.ts` |
| Client — board | `pages/my-work-board/**` (page, column, card, services, view-model, section map, CT) |
| Client — shell | `routing-data.ts`, `reporting-program-band.*`, `dashboard-lab.component.*`, `programme-results.component.*`, `science-program-id.service.ts`, `results-api.service.ts`, `api.service.ts` |
| Client — shared | `programme-results-filter.service.*` (multi-value), `programme-results-query-params.ts`, `pr-filter-multiselect.*` (trackBy + memo), `programme-results/CLAUDE.md` |
| Taken over from a concurrent session | tour step + returnTab (`0e400a68d`), smart-navigation Back (`3c28f307c`), `pr-filter-select` search (`cc0aadf66`), in-place Where-to-report modal (`5a37308a3`) |

Commits: `5fb293138` … `467715a72` (all `[SPEC:changes/my-work-board]` except the four take-over commits and two foreign sweeps `b1ca9ef1f`, `9e0d9b54f`-era noted in `execution.md`).

## 7. Test Evidence Summary

| Suite | Result |
|---|---|
| Server Jest (completeness + results.service) | 13 / 13 |
| Client Jest — board folder | 7 suites / 156 (final) |
| Client Jest — programme-results + dashboard-lab | 30 suites / 1224 |
| Client Jest — pr-filter-multiselect + programme-results | 4 suites / 232 |
| Cypress CT `my-work-board.cy.ts` | 14 cases at 390 / 768 / 1000 / 1280 / 1440 (1 known ~1-in-6 smooth-scroll flake on the 390 jumper landing) |
| Real browser (Orca) | badge, deep links (`contributor-partners`), one request per scope, OR counts (26+9=35; 61+26=87), popover +3.4 / +6 px, multiselect open across ticks, chips 4 → 2 lines, timing +215 ms for 2 eligible items |

`test-report.md` / `validation-report.md` were not authored (YOLO; evidence lives in `execution.md`) — absence accepted.

## 8. Validation Summary

No `/akili-validate` run. Every task PASSed an independent Reviewer (opus) on a frozen diff; T-4, T-7, T-9, T-14 needed rework rounds (all closed). Human visual sign-off happened live during the session (user screenshots drove T-8, T-10, T-14).

## 9. Accepted Warnings Or Follow-Ups

See `pending-archive.md` (`MWB-PA-1`…`PA-5` doc syncs; follow-ups from T-5/6/7/11/12/14; T-13 phase 2 deferred) and the kaizen entry's `## Pending Items`. Notables: completeness cost ~100–200 ms per eligible row (cap 60 → 2–3 s worst case); `cypress-axe` not installed; collapsed board still scrolls horizontally with the sidebar open at 1280.

## 10. Historical Notes

- Judgment Day overturned three proposal premises before any code (dead `validation` table, 8-row status catalogue, client-side phase label) — the single biggest saver of the cycle.
- Two foreign-commit sweeps and one take-over came from a second session in the same checkout; the T-4 Implementer was also killed once by an API session limit and T-11 by a Claude Code restart (both resumed).
- Scope grew from 6 planned tasks (~1,350 LOC) to 14 (~3,260 LOC) through the user's live review — every addition is recorded with its request date.
