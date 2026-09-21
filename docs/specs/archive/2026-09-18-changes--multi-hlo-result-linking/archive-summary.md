# Archive Summary — Link one result to several HLOs under the same AoW

## 1. Document Control
- Spec: `MHL` (ticket `#163059`)
- Author of this summary: AKILI archive step
- Date: 2026-09-18

## 2. Original Spec Path
`docs/specs/changes/multi-hlo-result-linking/`

## 3. Archive Date
2026-09-18

## 4. Final Status
Done. All four tasks (`MHL-T-1`..`MHL-T-4`) marked `[x]` in `tasks.md`, all Reviewer verdicts `PASS`. (Note: `tasks.md`'s top-level header still reads `Status: not-started` — a stale bookkeeping field never flipped during execution; the per-task `[x]` markers and `execution.md`'s own summary table are authoritative and agree.)

## 5. Requirements Delivered
- `MHL-R-3` / `MHL-AC-5` — client tab cap (`getMaxNumberOfTabs`) now sizes by candidate-list length instead of distinct-AoW `Set`, closing an under-count bug.
- `MHL-R-1`, `MHL-R-2`, `MHL-R-10` / `MHL-AC-1`, `MHL-AC-2` — `validateSelectedOptionOutCome` disables only true duplicates (`toc_result_id` match) instead of any AoW sibling, with an accessible `disableOptionsText` label.
- Server typology guard in `createTocMappingV2` rejecting typology-mismatched ToC links (`MHL-T-1`).
- `MHL-OQ-2`, `MHL-OQ-3`, `MHL-OQ-4` closed: no PMU/AoW rollup double-count risk found (per-indicator grouping, sampled not exhaustive); no soft cap needed; bilateral `isUnplanned` filter-skip deferred.

## 6. Files Changed Summary
Committed in `0dbdb4958` (already merged into `qa-development-2026-ss`):
- `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.ts` (+ spec) — typology guard.
- `onecgiar-pr-client/.../multiple-wps/multiple-wps.component.ts` (+ spec) — tab-cap fix.
- `onecgiar-pr-client/.../multiple-wps-content/multiple-wps-content.component.ts/.html` (+ spec) — duplicate-only disable + a11y label.

## 7. Test Evidence Summary
- Server: guard tests green (Reviewer PASS attempt 3 of 3, 2 rework rounds).
- Client `multiple-wps.component.spec.ts`: 39/39 passed, `ng lint` clean.
- Client `multiple-wps-content.component.spec.ts`: 85/85 passed, `ng lint` clean.
- Coverage-floor (`--coverage`, not `--no-coverage`) not independently re-run for either client task — disclosed gap, Reviewer judged non-gating (change strictly reduces branch count / all real paths covered).

## 8. Validation Summary
No standalone `validation-report.md`; Reviewer verdicts embedded per task in `execution.md`, all `PASS`. No unresolved FAIL findings. Several ADVISORY (non-gating) findings recorded (see §9).

## 9. Accepted Warnings Or Follow-Ups
- `MHL-T-1` needed 3 attempts (2 rework rounds) and exceeded the `design.md` LOC budget (~120-180 estimated) — flagged as a budget tripwire for the user, not re-litigated here.
- Open items handed to the user, not filed as tasks: (1) `getResultsByProgramAndCenters` (`result.repository.ts:3226`) is not multi-HLO-aware (`MAX()`-per-result grouping shows one arbitrary HLO title/indicator) — follow-up ticket recommended; (2) confirm with product whether a result linked to 2 HLOs in the same AoW should count in both HLOs' numerators (double weight at AoW-level average); (3) product confirmation needed on the 422-on-every-save behavior for legacy mismatched links before release.
- ADVISORY, non-gating: `validateSelectedOptionOutPut` still disables by AoW even though `MHL-T-2` raised its tab cap — same bug class as `MHL-T-3` fixed for outcomes, recommended as a follow-up (not this spec's scope). `validateSelectedOptionEOI` lacks the own-tab exemption its siblings have (pre-existing, untouched). `NO_ERRORS_SCHEMA` applied TestBed-wide silences unknown-element/binding errors across ~80 other tests — recommend scoping narrower in a future pass.
- `MHL-OQ-3` (soft cap) and `MHL-OQ-4` (bilateral `isUnplanned` filter-skip UX) — not filed as follow-up specs automatically; left for product prioritization per `tasks.md` §7.
- Rollout gates in `tasks.md` §6 (PR/CI already satisfied by commit `0dbdb4958`; manual staging QA and post-deploy telemetry check) are outside this execution run's scope.

## 10. Historical Notes
- `MHL-T-1..T-3` were designed and executed as independent, parallel-safe (disjoint files: one server, two client); `MHL-T-4` ran last as a verification/closure step reading the finished behavior of all three.
- `docs/trd/trd.md` §11 promotion of `MHL-DD-1` (reuse of `RESULT_TYPE_TO_INDICATOR_PATTERN`) judged likely unnecessary since it reuses an existing documented pattern rather than introducing a new architectural decision — left as a judgment call for the user, not auto-applied.
