# Archive Summary — Portfolio Overview: cleanup + W3 Approved (`PCA`)

**Outcome:** `/portfolio-overview` shows no percentage figures in the KPI deck, the status tiles or the Centers block. The W3/Bilateral card splits New and Replicated by status, Approved included. The CGIAR Centers block counts each W3 result once, applies the deck's lead-P/A rule (PCA-DD-6), and shows a "N W3 results have no Center" note. The "Centers reporting" card is gone. All 4 tasks PASS. Client only, in commit `fb4526f9b`, which is on `master`, `staging`, `performance-refactor` and `qa-development-2026-ss`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/cleanup-and-approved` |
| Parent | `changes/portfolio-overview-feedback-round` (family child #1, the last one open) |
| Archive Date | 2026-11-04 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete**. 4/4 tasks PASS; R-3 and R-4 scenarios met on the live page; prod pre-check reconciles |
| Commit | `fb4526f9b` (code + spec). `execution.md`'s "No commit yet" line and its "code not yet deployed" prod note are older than that commit |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-feedback-round/cleanup-and-approved/`

## 3. Requirements Delivered

| Req | Delivered by | Evidence |
|---|---|---|
| PCA-R-1 no `%` on the deck | T-1, T-2 | DOM test + falsifier (re-added chip → fails) |
| PCA-R-2 no `%` in status tiles, bar kept | T-2 | 6-tile test, bar width 60% |
| PCA-R-3 W3 split with Approved | T-1, T-2 | Live: deck Approved 41 = Results Center W3 + Approved 41 |
| PCA-R-4 Centers counts distinct results + lead-P/A rule | T-3 (+ note, + DD-6 pivot) | Live v36: Centers 605 + note 10 = deck 615. Prod: 287 + 1 = 288 |
| PCA-R-5 no `%` in Centers chip/tiles | T-3 | Jest DOM assertions |
| PCA-R-6 "Centers reporting" card removed | T-3, T-4 | Desktop + 390 px: W3 card full width |
| PCA-R-7 guide kept true | T-4 | Reviewer PASS on attempt 2 |

## 4. Files Changed Summary

All under `onecgiar-pr-client/src/app/pages/…/portfolio-overview/` unless noted.

| Task | Rounds | Files |
|---|---|---|
| T-1 | 1 | `services/portfolio-overview.service.ts` (+spec), `internationalization/portfolio-overview.copy.ts`, `portfolio-overview.component.html` (+spec) |
| T-2 | 1 | `portfolio-overview.component.html`, `portfolio-overview.component.spec.ts` |
| T-3 | 1 + 2 (note) + 1 (DD-6) | `centers-block.aggregate.ts` (+spec), `centers-block.component.ts/.html` (+spec), `internationalization/portfolio-centers-block.copy.ts`, `portfolio-overview.component.ts/.html` (note bindings) |
| T-4 | 2 | `portfolio-overview/CLAUDE.md` (component guide) |

**Budget:** 4 tasks as planned. Review rounds 8 vs ~5, because of the scope the user approved: the V-1 note and the PCA-DD-6 pivot. LOC was above the ~220 budget, mostly tests. No server change, no migration.

## 5. Test Evidence Summary

| Run | Result |
|---|---|
| `jest --testPathPattern=portfolio-overview.service` | 2 suites, 91/91 |
| `jest --testPathPattern=portfolio-overview.component` | 15 suites, 360/360 |
| `jest --testPathPattern=centers-block` (after DD-6) | 97/97 |
| `jest --findRelatedTests` on the 12 changed source files (final) | **31 suites, 1077/1077** |
| `ng lint --quiet` on touched ts | clean |
| Live check (`ng serve`, v36), desktop + 390 px | deck, tiles and Centers OK; no horizontal scroll |

## 6. Validation Summary

There is no `test-report.md` or `validation-report.md`. The user accepted their absence by running `/akili-archive` directly, the same call made for the sibling `funding-filter`. In their place: a Reviewer PASS per task, the R-3 and R-4 scenarios checked on the live page, and the user's prod pre-check (P1 288 = 287 + 1; P2 and P3 return 0 rows).

## 7. Accepted Warnings Or Follow-Ups

- [ ] PRTest/prod smoke after deploy: deck W3 = Centers + note (prod expected 288 = 287 + 1).
- [ ] Accepted risk (PCA-DD-6): the client `submitter` predicate matches the deck only while no lead initiative is inactive or has a blank code. A durable fix is a server `has_active_lead_pa` flag.
- [ ] Product decision: the sr-only "Share %" column and the donut tooltip `({d}%)` in the Centers block.
- [ ] The 30 replicated innovations without a P/A stay out of the Portfolio until they get one (PAA follow-up).
- [ ] `portfolio-overview/CLAUDE.md` is over its line cap (127+ vs 120).
- [ ] `npm run test:local` exits 1 with no output on this machine (also seen in `funding-filter`).
- [ ] CodeGraph sync.
- [x] ~~Prod W3 results linked only to CENTER-16~~: P2 returned no rows (closed 2026-11-04).

## 8. Historical Notes

- **Pivot (PCA-DD-6):** the deck required an active lead P/A and the Centers block did not, which left a 41-row gap. The user chose "Centers follows the deck". Gap analysis and equivalence check are in `execution.md`.
- **V-1 (324 vs 287)** was run on prod, while the live numbers came from the local stack (PRTest, v36). The two cannot be compared; `execution.md` records both sets.
- **Residue of 1:** result 11528 was linked only to CENTER-16 (SMO, deactivated 2026-10-16). The user re-linked it to CENTER-17 in the local DB.
