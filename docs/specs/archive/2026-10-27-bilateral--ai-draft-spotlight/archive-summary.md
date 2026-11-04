# Archive Summary — Bilateral AI Draft Results: Spotlight the Run's Drafts

**Outcome:** delivered. 4 of 4 tasks are `[x]`. Validation came out WARN with 0 FAIL (13 PASS / 3 WARN, R-2 and R-3 since resolved). One follow-up is open: a ticket the user still has to file for two existing issues at 375 px.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/ai-draft-spotlight` |
| Ticket | P2-4029 |
| Owner | Maria Camila Giraldo |
| Branch | `qa-development-2026-mc-2` (spec branch; integration branch `staging`) |
| Approval Mode | gated |
| Baseline → head | `edcf190f0` → `794ee1dd4` |

## 2. Original Spec Path

`docs/specs/bilateral/ai-draft-spotlight/`

## 3. Archive Date

2026-10-27

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | ADS-T-1, T-2 and T-4 closed on a Reviewer PASS. ADS-T-3 (HITL) closed on the user's approval under `REVIEW_WAIVED (inline)` |
| Pivot | 1, after the first HITL run. Design rev. 4 added DD-10, DD-11 and the tour's overlay colour, plus the new task ADS-T-4. The user approved it |
| Validation | WARN: 0 FAIL, 0 BLOCKED. The independent T3 auditor ran on opus in a fresh context |
| Budget | Over the LOC budget, **accepted by the user**: +1 332 / −62 client lines against ≈ 530 planned and a 600 tripwire. Tasks: 4 of 4. Review rounds: 3 (4 Reviewer verdicts) out of 4 |

## 5. Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| ADS-R-1 Open drafts lands on the run's drafts (toast and drawer) | T-1, T-2 | Unit tests; HITL H-1, H-2, H-3 |
| ADS-R-2 Only that run's drafts are lit | T-2, T-4 | Unit tests; HITL H-1, H-6 (re-run), H-7 |
| ADS-R-3 Dismissal returns the page to normal | T-2 | Unit tests; HITL H-4, H-5 |
| ADS-R-4 One-shot, click-driven | T-1, T-2 | Unit tests; HITL H-9 |
| ADS-R-5 Hidden or missing target | T-2 | Unit tests; HITL H-10 |
| ADS-R-6 No clash with other overlays | T-2, T-4 | Unit tests; HITL H-8, W-1 |
| ADS-R-7 Works across screen sizes | T-2, T-4 | HITL at 375 and 1280 px. AC-7a is WARN because of the existing horizontal scroll at 375 px |
| ADS-R-8 No data change | T-1, T-2 | Unit tests (no write calls) |

## 6. Files Changed Summary

| File | Change |
|---|---|
| `services/draft-spotlight.service.ts` (+ spec) | **New.** driver.js wrapper: show, close, refresh, HTML escaping, scroll margin |
| `services/bilateral-ai.service.ts` (+ spec) | The spotlight request (nonce, 10 s expiry). `openDraftsForJob` now adds `?job=` and navigates only when the URL changes |
| `components/ai-processes-drawer/ai-processes-drawer-host.component.ts` (+ spec, `CLAUDE.md`) | "View N drafts" requests the spotlight and uses the same URL rule |
| `pages/my-draft-results/my-draft-results.component.{ts,html}` (+ spec, `CLAUDE.md`) | The request effect: attach or re-arm, settle, then the gates for filters, layers and the tour. Also refresh, close paths and card focus |
| `services/bilateral-tour.service.ts` (+ spec) | The tour does not start while the spotlight is active |
| `internationalization/bilateral-ai-processes.copy.ts` | `drafts.spotlight` copy |

All paths are under `onecgiar-pr-client/src/app/pages/bilateral/`, except the copy file. Commits: `ff4a2d63e`, `a7cc290f5`, `74b26abce`, `ce95635f2`, `3ee6b944a`, `794ee1dd4`.

## 7. Test Evidence Summary

- **Unit:** the full client Jest suite passes (677 suites, 14 584 tests). The changed files have 94.5 % line coverage. Every task records its first red tests and its falsifier reds in `execution.md`.
- **HITL:** a real Chromium browser at 375 × 812 and 1280 × 900 (`execution.md` ADS-T-3, `hitl/*.png`). The job-completion poll was simulated through `announceTerminalJob`, which the auditor judged adequate.
- **`test-report.md`:** absent, because `/akili-test` was not run. The user proceeded to archive after being told it was optional (validation R-6).

## 8. Validation Summary

| Result | Count | Notes |
|---|---|---|
| PASS | 13 | |
| WARN | 3 | WARN-1: AC-7a, the existing horizontal scroll at 375 px. WARN-2 and WARN-3: doc drift, **resolved** on 2026-10-27 (R-2, R-3) |
| FAIL / BLOCKED | 0 / 0 | |

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner | State |
|---|---|---|---|
| F-1 | **R-4 ticket.** At 375 px, Draft Results scrolls horizontally (HITL-O1, AC-7a WARN), and a `?job=` reload does not scroll to the card (HITL-O2). Both are `UNVERIFIED` against `edcf190f0` | User / PMU | **Not yet filed.** Cite the ticket here when it is filed |
| F-2 | Optional `/akili-test` gaps (validation R-6): ring and badge survive a dismiss; write-call check on `ResultsApiService`; jsdom `img` check; try/catch around driver start | — | Optional |
| F-3 | 4R advisories carried in `validation-report.md` §7 | — | Advisory |

## 10. Historical Notes

- **The pivot came from the browser, not from the tests.** The mocked unit tests could not see two problems. driver.js's `block:'start'` scroll put a tall card's header under the sticky `.app-shell-header` at 375 px. And the clash guard only blocked the spotlight from starting over another layer, not a layer opening later over the spotlight. See the kaizen entry.
- **The Leader once misread a screenshot as "not dimmed".** Pixel sampling disproved it, and the correction is recorded in `execution.md`.
- **ADS-T-2's task text keeps the rev. 3 config on purpose**, with "superseded by ADS-T-4" pointers.

## 11. Diagrams

The spec has no `diagrams/` folder or diagram slot. No baseline diagram is stale.
