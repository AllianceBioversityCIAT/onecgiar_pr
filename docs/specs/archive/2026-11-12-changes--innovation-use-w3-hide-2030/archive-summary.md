# Archive Summary — Hide the 2030 Use Projection on W3/Bilateral Innovation Use (`IWH`)

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/innovation-use-w3-hide-2030/` |
| Archive path | `docs/specs/archive/2026-11-12-changes--innovation-use-w3-hide-2030/` |
| Archive date | 2026-11-12 |
| Ticket | INC-168060 (SR-168060), Nicoleta Trifa, 2026-11-11 |
| Branch | `qa-development-2026-ss` |
| Code commit | `301963541` (on qa-development-2026-ss and performance-refactor; not on staging/master) |

## Final Status

**Delivered.** 3/3 tasks `[x]`. Validation: PASS with 4 WARN, 0 FAIL.

## Requirements Delivered

| ID | What | Task |
|---|---|---|
| IWH-R-1 | Shared Innovation Use form hides the 2030 block for W3/Bilaterals (not IPSR, shown while the source is unknown) | T-1 |
| IWH-R-2 | Bilateral `type-innovation-use` form no longer renders the P2-3428 2030 block; stored 2030 data sent back as loaded | T-2 |
| IWH-N-1/2 | No migration, endpoint or token change; scoped tests with 2 workers | T-1, T-2 |
| Data | W3 2026 rows with `innov_use_2030_to_be_determined` NULL set to `1` (PROD 2 rows, PRTest 149 rows) | T-3 (user-run) |

## Files Changed Summary

| File | Change |
|---|---|
| `shared/components/innovation-use-form/innovation-use-form.component.ts` | `hides2030Projection` getter |
| `…/innovation-use-form.component.html` | `@if (!hides2030Projection)` around the 2030 block |
| `…/innovation-use-form.component.spec.ts` | `IWH — 2030 block by source` (5 tests) |
| `pages/bilateral/…/type-innovation-use.component.html` | P2-3428 block deleted, INC-168060 comment |
| `…/type-innovation-use.component.ts` | `hasActorMissingType` checks current-use actors only |
| `…/type-innovation-use.component.spec.ts` | absence test, inverse save-gate test, `buildPayload` test |
| Both folder `CLAUDE.md` | gate note, P2-3428 marked removed, `Verified:` re-stamped |

## Test Evidence Summary

- Related Jest: 27/27 suites, 1420/1420 tests (`--findRelatedTests`, `--maxWorkers=2`).
- `tsc --noEmit` clean; ESLint clean on touched `.ts`.
- 5 falsifier mutations observed red and reverted. Red runs quoted in `execution.md`.
- No `test-report.md` (accepted, Lite spec: task tests cover every clause).

## Validation Summary

0 FAIL · 4 WARN (see `validation-report.md` §11). W-3 (stale IWH-T-0 reference) fixed in `requirements.md` at archive.

## Accepted Warnings Or Follow-Ups

| Item | Owner |
|---|---|
| W-1 PRTest visual check after deploy of `301963541`: result 5093 keeps the block; one bilateral IU shows no block and no gap | Santiago |
| W-2 / Q-1 tell the P2-3428 requester the bilateral block was removed | Santiago |
| Release: `301963541` reaches PROD only with the next staging → master release | Release owner |
| Data: 32686 (SP12 + 3 institutions) and 32740 (SP02) still red because of empty Investment rows, user-fillable | Nicoleta / submitters |
| Advisory: `projection2030Copy` unused; server check that section-1 and section-2 typeless actors cannot collide | later cleanup |
| CodeGraph sync | Santiago |

## Historical Notes

- This spec reverses P2-3428 for W3/bilateral results, at Nicoleta's request (decision record: `requirements.md` §1.1).
- P-10 ("NULL is the only reason the P25 check fails") was falsified for both PROD rows: empty Estimates budget rows were also blocking. The hide stands regardless.
- An early browser check wrongly concluded P2-3428 was not in PROD. The block was behind the "Complete full metadata" toggle. Git ancestry corrected it the same day.
- 2025 Approved row 29318 left untouched (Q-2 default).

## Diagrams

None. The spec has no `diagrams/` folder and makes no baseline diagram stale.
