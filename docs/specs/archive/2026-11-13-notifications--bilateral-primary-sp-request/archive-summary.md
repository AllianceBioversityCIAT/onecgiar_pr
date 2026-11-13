# Archive Summary — Bilateral primary Science Program request

**Outcome:** shipped. A bilateral result no longer gets its primary SP written directly. The Center's pick creates a request that the SP accepts or declines in the inbox. On accept, the contributors are released. The code is in `master`.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/notifications/bilateral-primary-sp-request/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none |
| Final status | **Complete**: 11/11 tasks `[x]` (T-11 accepted with gaps, below) |

## Requirements delivered

| Requirement | What it guarantees | Status |
|---|---|---|
| `PSR-R-1`, `R-2`, `R-3` | Create paths make a request instead of writing role 1. Re-pick starts a new round. Non-aligned SP is rejected | Delivered |
| `PSR-R-4`..`R-8` | Accept / decline cascade, swap, 409 on a second answer, authorization | Delivered. Swap decline never auto-moves (Leader decision) |
| `PSR-R-9`, `R-10`, `R-11` | Primary and contributor inbox rows and drawer | Delivered |
| `PSR-R-12`, `R-13` (amended), `R-16` | Contributors wait until accept; approval releases remaining drafts via `releaseContributors`; rollover skips on-hold results | Delivered (Pivot 1) |
| `PSR-R-14` | Center notices accepted / declined / moved | Delivered |
| `PSR-R-15` | On-hold and sent-back banner, submit blocked | Delivered |
| `PSR-R-17` | List marker (MAY) | Skipped, not cheap |

## Files changed

| Area | Change |
|---|---|
| DB | Migration `1790400000000-AddPrimaryProgramRequest.ts`: `request_type`, nullable `owner_initiative_id`, 3 notification types. Two older migrations had their `down` table name fixed (user-requested) |
| Server | New `PrimaryProgramRequestService` (request, accept, decline, release, state). Decide endpoint branches on `request_type`. Creation paths, ownerless guards, Center notices read path in `notification.service.ts` |
| Client | `notification-item`, `contribution-request-drawer`, `section-zero-dashboard`, `section-toc`, `bilateral-api.service.ts`, copy files |
| Docs | `bilateral-result-summaries.en.md` change-log row; folder `CLAUDE.md` files re-stamped |

## Test evidence

| Suite | Result |
|---|---|
| Server, scoped to T-1..T-5 (Leader re-check) | 921/921, `tsc` 0 errors |
| `share-result-request` | 136/136 |
| `bilateral-center`, `results.service`, `versioning` | 307/307; `result.spec` 149/149 |
| Client (`section-zero-dashboard`, `bilateral-api`, `section-toc`) | 172/172; `ng build --configuration development` 0 errors |
| Real DB (user, testing): `migration:run`, `revert`, `run`, `check` | PASS after the attempt-2 fix |
| Local HITL (user, 2026-09-30): result 9728 primary and contributor accept | PASS ("funciona re lindo") |
| PRTest (Leader, 2026-11-13): rows vs mockups; QA accept / decline of primary and contributor requests | PASS |

## Validation summary

No `/akili-validate` run and no `validation-report.md` (accepted). Every task had a Reviewer PASS. PSR-T-11 was closed by the PRTest evidence appended on 2026-11-13.

## Accepted gaps / follow-ups

| Item | Status |
|---|---|
| Project Information banners not checked | Accepted |
| Concurrent accept / decline race not tested (lock and 409 proven only with mocks) | Accepted |
| Staging script §6 decline steps 4-5 | Obsolete: superseded by `notifications/primary-decline-rejects-result` |
| Contributor-release emails are sent before commit (T-3) | Open advisory |
| `_updateContributingInitiatives` could deactivate a pending swap; `reviewBilateralResult` reject deactivates `primary` rows (T-6) | Open advisories |
| Client effect has no request cancellation (T-10); primary chip should use `--pr-color-blue-*` primitives (T-8) | Open advisories |
| Open visual point: Center name is bold on the primary row, the mockup shows it plain | Not re-checked |

## Historical notes

- **Pivot 1 (PSR-T-6, DD-9):** removing the approval-time draft release broke API-ingest and in-flight legacy results. The user approved option A: call `releaseContributors` at approval. `requirements.md` (R-13), `design.md` (§5.6, DD-9) and `tasks.md` were amended.
- **Budget tripwire:** about 3.5x the planned LOC (mostly tests) and about 20 review rounds. The user chose "Continue to the end".
- Three defects were found by the user after Reviewer PASS: `down` used table `notification` instead of `notifications`; `DrawerHeaderParts` TS2339 in `ng serve`; Nest boot crash in `ResultsTocResultsModule`.
- Spec decision: a swap decline never auto-moves (follows `PSR-R-2`).

## Diagrams

None. The spec has no `diagrams/` folder (it has `mockup/` PNGs).
