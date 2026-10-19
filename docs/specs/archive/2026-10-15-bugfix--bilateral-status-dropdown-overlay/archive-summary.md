# Archive Summary — bugfix/bilateral-status-dropdown-overlay

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/bilateral-status-dropdown-overlay/` |
| Archive Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Depth | Lite (Bug Mode) |
| Final Status | **Shipped** — task `[x]` PASS, committed (`cfd25a05b`) |

## 2-3. Original Spec Path / Archive Date

`docs/specs/bugfix/bilateral-status-dropdown-overlay/` → `docs/specs/archive/2026-10-15-bugfix--bilateral-status-dropdown-overlay/`. 2026-10-15.

## 4. Final Status

| Task | Status | Attempts | Reviewer rounds |
|---|---|---|---|
| `BSD-T-1` | `[x]` PASS | 2 | 2 (FAIL → PASS) |

## 5. Requirements Delivered

All of `BSD-R-1..4` / `BSD-AC-1/2` — `expandSpaceOnOpen` removed from Status, matching Policy type's default; overlay behavior confirmed unaffected; folder `CLAUDE.md` re-stamped with a trap bullet (attempt 2 fix).

## 6. Files Changed Summary

| File | Change |
|---|---|
| `type-policy-change.component.html` | -1 line (`[expandSpaceOnOpen]="true"` removed) |
| `type-policy-change.component.spec.ts` | +48 lines (regression test) |
| `type-policy-change/CLAUDE.md` | re-stamped + new trap bullet |

Committed as `cfd25a05b`.

## 7. Test Evidence Summary

Jest 41/41 passing (independently reproduced by the Leader, both attempts). Cypress consumer (`bilateral-policy-change-mds.cy.ts`) reported inconclusive — stale `ng serve` (~2 days old) — not independently re-run; same for the manual "nothing moves" visual check. Both recommended before/at next staging QA pass.

## 8. Validation Summary

Two Reviewer rounds: attempt 1 PASS on code/test correctness, FAIL on missing folder-doc re-stamp (repo convention); attempt 2 PASS after the re-stamp, independently re-confirmed by the Reviewer against the live file.

## 9. Accepted Warnings Or Follow-Ups

- Cypress consumer re-run and the manual visual "nothing moves" check — deferred to staging QA (stale dev server in this environment).

## 10. Historical Notes

Root cause confirmed via scout investigation + git history before specifying: `expandSpaceOnOpen` was an app-wide experiment introduced 2025-06-24, reverted on its other call sites within days/weeks, and reappeared on Status in 2026-08-11 inside an unrelated commit with no rationale. Kaizen retrospective: 1 rework attempt (FAIL→PASS on the folder-doc convention) — see `docs/specs/kaizen/bugfix--bilateral-status-dropdown-overlay.md`.
