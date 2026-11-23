# Archive Summary — QA catalog level rules on level numbers (P2-3939)

**Outcome: delivered.** The QA catalog now states its level rules against the level number (0–9) instead of the stored row id. Catalog `2026.36`, contract v1.36. 3/3 tasks PASS on the first attempt; validation PASS with one accepted WARN. **Not committed at archive time** (the user has not asked for a commit yet).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Ticket | P2-3939 (epic P2-2340) |
| Type / Depth | Bug · Lite · gated |
| Branch | `qa-development-2026-ss` (spec branch for archive purposes; integration branch is `staging`) |
| Base commit | `b143445bd` |

## 2. Original Spec Path

`docs/specs/bugfix/p2-3939-qa-catalog-level-numbers/`

## 3. Archive Date

2026-11-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | LVL-T-1, LVL-T-2, LVL-T-3 `[x]`, each with a Reviewer PASS and a VERIFIED non-author re-run |
| Tests | PASS — `qa-catalog`: 52/53 suites, 1282/1282 tests; the red suite (`qa-catalog.module.spec.ts`, `JwtService` import) already failed at the base commit |
| Validation | PASS; W-1, W-2, W-4 fixed; W-3 (P-5) accepted |
| Budget | tripwire fired at T-2 (~800 vs ~260 LOC); overrun accepted by the user |

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| LVL-R-1 | Five read-only level-number entries (`lookup` of `level` by row id): `innovation_use.use_level.innovation_use_level_number`, `ipsr_step_3.core.readiness_level_number`, `ipsr_step_3.core.use_level_number`, complementary `readiness_level_number` / `use_level_number` |
| LVL-R-2 | Innovation Use explanation visible and required at use level number 5–9 (was row ids 5–9) |
| LVL-R-3 | Four IPSR Step 3 evidence lists required at level number 1–9; no `visible_when` |
| LVL-R-4 | Core current use (actors / organizations / measures) visible at core use level number 1–9 |
| LVL-R-5 | Version `2026.36`; `qa-catalog.en.md` v1.36 change-log row; no key renamed or removed |
| LVL-R-6 | Residual NULL-level gap documented in code and contract |
| NFR-1..3 | Additive only (HEAD-vs-tree definition diff); no migration; lookups batched |

## 6. Files Changed Summary

All under `onecgiar-pr-server/`:

| Area | Files |
|---|---|
| Definitions | `src/api/qa-catalog/definitions/sections/innovation-use.ts`, `…/sections/ipsr-step-3.ts`, `…/closed-control-lists.ts`, `…/versions.ts` |
| Lookup registry | `src/api/qa-catalog/values/lookup-sources.ts` |
| Tests (new) | `src/api/qa-catalog/qa-catalog.level-numbers.spec.ts`, `src/api/qa-catalog/qa-catalog.level-numbers.read-plan.spec.ts` |
| Tests (pins) | `qa-catalog.display-rules.spec.ts`, `qa-catalog.required-follows-form.spec.ts`, `qa-catalog.ipsr-step-3.spec.ts`, `values/lookup-sources.spec.ts`, `qa-catalog.controller.spec.ts`, `qa-catalog.service.spec.ts`, `qa-catalog.shape.spec.ts` |
| Snapshot | `src/api/qa-catalog/__snapshots__/qa-catalog.snapshot.json` (regenerated on LF) |
| Contract | `docs/qa-catalog.en.md` |

≈ 130 definition lines, ≈ 600 test lines, ≈ 25 doc lines.

## 7. Test Evidence Summary

- Red-first regression for the ticket case (level 4 stored as row 5) observed before the fix; 2 + 9 mutation checks red, then reverted.
- A read-plan test proves the wiring via `buildReadPlans` (the `value-reader` path).
- A definition diff of HEAD vs the tree shows only the 5 added entries and the 8 intended rule changes.

## 8. Validation Summary

PASS. Fixed: W-1 (DD-4 wording on `required_confirmed`), W-2 (§11 `UNVERIFIED` tally), W-4 (DoD boxes). Accepted: W-3 (P-5). No FAIL.

## 9. Accepted Warnings Or Follow-Ups

| Item | Owner |
|---|---|
| Commit and PR to `staging` with `[P2-3939]` commits, T-1..T-3 together; re-check that revision 36 is still free at merge (DD-7) | user |
| P-5: `SELECT id, level` on test + prod (fixtures synthetic) | user |
| Deployed `validation_ipsr_step_three_P25` not re-read; the complementary rule is cited from the 2026-10-09 code read | optional |
| Post-deploy smoke of `GET /api/qa/results` (an IU result at level 4; an IPSR package with a repeated-row level) | user / QA |
| Notify the QA app owner of 2026.36 | user |
| Follow-up ticket: `innovation-use.service.ts` `Level_6` vs row id | user |
| `akili doctor --agents --fix` on `staging` (`leader.md` drift) | user |

## 10. Historical Notes

- P-7 was settled by user decision. The repo migration `1769532691577-CreatIPSRGreen.ts` is an older body than the deployed function. The Leader first framed the decision on that wrong premise, then withdrew it before any spec edit (`execution.md` LVL-T-2).
- `qa-catalog.service.spec.ts` and `qa-catalog.shape.spec.ts` also hard-pin the version; the P-12 consumer grep missed them, and T-3 fixed them.
- `/akili-test` ran inline on `opus`: the `akili-tester` wrapper is bound to `sonnet`, the Implementer's model.

## 11. Diagrams

The spec has no `diagrams/` folder; its only diagram is the inline Mermaid flow in `design.md` §3. No baseline diagram slot was made stale.
