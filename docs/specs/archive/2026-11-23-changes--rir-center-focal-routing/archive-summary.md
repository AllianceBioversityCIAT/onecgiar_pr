# Archive Summary — Center focal point routing for replicated-innovation reminders (RCF)

> **Outcome:** A Center can opt in so all its pending replicated innovations (W1/W2 and W3) go to its focal points in one Center email, with the W1/W2 MELIA contacts in CC; opted-out Centers route exactly as before. ICARDA (`CENTER-07`) is opted in by the migration; admins manage contacts and the opt-in in a Center focal points tab. In PROD. Verified on PRTest 2026-11-14 and the 1280 px overflow rework on 2026-11-23.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/rir-center-focal-routing` (RCF) |
| Ticket | SR-167303 |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/changes/rir-center-focal-routing/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 5/5 tasks `[x]`** (the one open checkbox was a branch pre-flight line, waived at archive). No Reviewer FAIL. One budget tripwire (≈2,115 added lines vs ≈650, 3.3x), accepted by the owner. T-4 overflow rework closed `REVIEW_SKIPPED` (3 CSS class tokens). T-5 step 3 (non-admin 403) and dark mode waived by the owner on 2026-11-14.

## 5. Requirements Delivered

| Req | Delivered by |
|---|---|
| R-1 opt-in default off, R-6 no "bilateral" in Center copy, R-11 ICARDA at release | T-1 migration `RCF-CenterRouting` + entity |
| R-2..R-5, R-10 routing and unreachable handling, preview | T-2 `build()` + dispatcher |
| R-7..R-9 admin API, no hard delete, 403 guard | T-3 |
| R-7, R-8 UI, states | T-4 Center focal points tab |
| R-2, R-3, R-4, R-10 proven on real data | T-5 (CENTER-01 temporary opt-in) |

## 6. Files Changed Summary

Server `api/replicated-innovation-reminders/` (digest-builder, dispatcher, pending-innovation repository, `center-focal-points.service`, controller, DTOs, entity, module) and migration `1793400000000-RCF-CenterRouting.ts`. Client: `center-focal-points` component, host component, `results-api.service.ts`, interface, copy. Commits `5f7ad600d` (feature) and `2ffb3e887` (1280 px overflow fix); in `master`.

## 7. Test Evidence Summary

No `test-report.md` (accepted). Per task, red runs, falsifiers and non-author re-runs in `execution.md`: server 4 suites / 137, then 3 suites / 40, tsc 0; client folder 4 suites / 62, `ng build` 0; pre-push `--findRelatedTests` server 13 suites / 195 and client 448 suites / 12,221. Migration up/down/up checked on the PRTest database.

## 8. Validation Summary

No `validation-report.md`. PRTest HITL: preview with CENTER-01 opted in (4 rows incl. the W1/W2 row, CC 1, developer digest gone, total 124 unchanged); opted out equals the baseline; duplicate POST gives 409. 2026-11-23: at 1280 px, 17 rows, 0 buttons cut off, `scrollWidth === clientWidth`; campaign 12 no longer pending. PROD read-only counts: ICARDA 85 pending rows, 1 active focal point, 0 open campaigns.

## 9. Accepted Warnings Or Follow-Ups

- [ ] Add a second ICARDA contact through the admin UI if wanted.
- [ ] T-3 advisories: canonicalise `:code` / `center_code` to the stored `clarisa_center.code` (case-insensitive collation can make an opt-in silently ineffective); concurrent first routing toggles can 500 (use upsert).
- [ ] T-4 advisories: `closeDialog()` no-ops while busy; the warning clears after deactivating the last active contact of an opted-in Center.
- [ ] Dispatcher sends `lead_center_code` untrimmed to `findCenterMel`.
- [ ] Migration `down` drops opt-ins made after release (add a rollback note to design §12).

## 10. Historical Notes

- The PRTest preview for ICARDA proved nothing (W3 only); CENTER-01 was the only TEST Center with W1/W2 rows and was opted in temporarily.
- The overflow cause was Spartan `hlmTd` `whitespace-nowrap`.

## 11. Diagrams

None.
