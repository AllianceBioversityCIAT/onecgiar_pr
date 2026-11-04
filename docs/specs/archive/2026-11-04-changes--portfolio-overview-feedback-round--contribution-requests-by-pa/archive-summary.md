# Archive Summary — Contribution requests by Program/Accelerator (`CRP`)

**Outcome:** `/portfolio-overview` has a new block, **Contribution requests by Program/Accelerator**. Per P/A it shows requests sent and received (Pending / Accepted / Declined) for the page phase, the portfolio totals (each request counted once) and the list of pending requests. Data comes from a new admin-only endpoint. 4/4 tasks `[x]`, V-1 equal, browser check done. Committed in `1d7323e7e` on `qa-development-2026-ss`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Parent | `changes/portfolio-overview-feedback-round` (family child #3, point 6) |
| Archive Date | 2026-11-04 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete** — 4/4 `[x]`, V-1 equal, browser check 1280/390 px recorded |
| Commit | `1d7323e7e` (code + spec); archive move not committed |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-feedback-round/contribution-requests-by-pa/`

## 3. Requirements Delivered

| Req | Delivered by |
|---|---|
| CRP-R-1 counts per P/A, once in totals, zero rows, scope rules | T-1 (query) · T-2 (aggregation) · V-1 (behaviour) |
| CRP-R-2 pending list, fields, oldest first, link in a new tab | T-2 · T-3 |
| CRP-R-3 block position, states, one call per phase/Retry, no `%` | T-3 · T-4 |
| CRP-R-4 Program filter only, not-affected note, unfiltered totals | T-3 · T-4 |
| CRP-R-5 admin only | T-2 |
| CRP-R-6 sorted by received Pending | T-3 |
| CRP-R-7 guide kept true | T-4 (+ polish: Verified stamp) |

## 4. Files Changed Summary

| Task | Attempts | Files |
|---|---|---|
| T-1 | 1 | `share-result-request.repository.ts` + spec |
| T-2 | 1 | RFR `service.ts`, `controller.ts` + specs, new `dto/portfolio-contribution-requests.dto.ts` |
| T-3 | 2 | new interface, `results-api.service.ts`, new `contribution-requests-block/` (component + format + specs), `portfolio-overview.copy.ts`, `portfolio-filters.ts` + spec |
| T-4 | 1 | `portfolio-overview.component.{html,ts,spec.ts}`, `portfolio-overview/CLAUDE.md` |
| Polish | 1 | 6 Reviewer advisories closed at the user's request (a11y, Spartan nested table, UI rule 9 token, guide stamp, server helpers, test guard) |

**Budget (4 tasks · ~650 LOC · 1 round/task, T-3 ≤ 2):** tasks ✓; review rounds ✓ (T-3 = 2); **LOC ≈ 2 200 incl. spec docs (~1 640 code) ✗**. The tripwire fired before T-4 and the user accepted the overrun. Cause: the budget did not size the copied sibling pattern (Projects block + bilateral-projects endpoint). About half of the code is tests.

## 5. Test Evidence Summary

| Run | Result |
|---|---|
| Server repository spec | 23/23 |
| Server RFR service + controller specs | 2 suites, 203/203; findRelatedTests 9 suites, 230/230 |
| Server after polish (service, controller, repository) | 3 suites, 226/226 |
| Client block + format | 2 suites, 30/30 |
| Client `portfolio-overview.component` + block (after polish) | 17 suites, 413/413 |
| Client template type-check `ngc -p tsconfig.app.json --noEmit` | exit 0 |
| Lint: server eslint · client `ng lint --lint-file-patterns` | clean |

## 6. Validation Summary

There is no `test-report.md` or `validation-report.md`; the user accepted their absence by asking to archive. Substitutes:
- Reviewer PASS on every task, plus the polish pass.
- **V-1:** user SQL on the DB the local endpoint reads (version 36). Totals 616 / 29 / 9 match the block, and the per-P/A figures match.
- Read-only browser check at 2560, 1280 and 390 px: the page has no horizontal scroll, and the table scrolls inside its own container.

## 7. Accepted Warnings Or Follow-Ups

- [ ] Prod diagnostic: in the first DB queried, the open phase had no accepted or declined rows. Run the status × `is_active` SQL there to rule out accepted requests being deactivated.
- [ ] `contributionToIso` parses zone-less strings in the server zone. This is safe while servers run UTC.
- [ ] Fix `scripts/run-jest-local.js` on Windows (see kaizen CRP-L-1).
- [ ] CodeGraph sync (new block folder and endpoint).
- [ ] Reach PRTest/prod: the commit is on `qa-development-2026-ss` only.

## 8. Historical Notes

- **CRP-DD-1:** "received" means the P/A that must answer (`approving_inititiative_id`), not `shared_inititiative_id` as the proposal said.
- The first V-1 compared prod SQL with the local block, which reads the test DB. The numbers differed, which is expected; the rerun on the same DB matched.
- 13 requests with a NULL requester count in the totals but in no P/A row (design §7).
