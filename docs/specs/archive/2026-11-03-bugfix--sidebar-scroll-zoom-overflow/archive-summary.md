# Archive Summary — `bugfix/sidebar-scroll-zoom-overflow`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bugfix/sidebar-scroll-zoom-overflow/` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-mc-2` (spec branch, ≠ pin `master`/`staging`) |
| Approval Mode | `gated` |
| Final Status | **Shipped, pending close.** Fix committed (`4cc998db7`) and PR open (`#789` → `performance-refactor`). `SBZ-T-3` (manual real-browser zoom check) remains open; **accepted by the user as a follow-up**, not a blocker to archiving — the spec's own `judgment.md`/`tasks.md` only require it before marking the spec *closed*, not before shipping. |

## 2. Original Spec Path

`docs/specs/bugfix/sidebar-scroll-zoom-overflow/`

## 3. Archive Date

2026-11-03

## 4. Final Status

| Task | Status |
|---|---|
| `SBZ-T-1` (regression test) | `[x]` PASS, attempt 1/1 |
| `SBZ-T-2` (fix) | `[x]` PASS, attempt 3/3 (2 Reviewer FAILs, both evidence/harness gaps — the fix itself never changed) |
| `SBZ-T-3` (manual real-zoom check on PRTest) | `[ ]` **Open — accepted as follow-up**, not performed in this cycle (requires real Chrome + real keystrokes + PRTest deployment, which this session cannot perform) |

## 5. Requirements Delivered

- **SBZ-R-1** (sidebar reachability at every `--pr-font-scale` value) — closed, `SBZ-T-1` + `SBZ-T-2`.
- **SBZ-R-2** S-2.1 (fix without width regression) — closed, `SBZ-T-2`.
- **SBZ-R-3** (S-3.1, S-3.2 — real-zoom confirmation) — **open**, gated on `SBZ-T-3`.

## 6. Files Changed Summary

(from `execution.md`)

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/hlm-sidebar.ts` | `h-svh` → `h-[calc(100svh/var(--pr-font-scale,1))]` on `_sidebarContainerComputedClass`, plus explanatory comment (11 insertions, 1 deletion) |
| `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/sidebar-root-zoom-reachability.cy.ts` | New regression test (362 lines final, evolved over 3 attempts: bare mount → host component mounting through `hlmSidebarWrapper` → assertion reorder for a provably-observed Falsifier) |
| `docs/specs/bugfix/sidebar-scroll-zoom-overflow/{requirements,design,tasks}.md` | Wording correction: width-preservation check reworded from "flat scale-1 baseline" to "proportional to scale" (spec-tension amendment, §3 below) |

## 7. Test Evidence Summary

- Red run (pre-fix): 15/25 failing at `--pr-font-scale` 1.15/1.3/1.5, control scales 0.9/1 green.
- Green run (post-fix, final): 25/25 passing — all five scales, two viewport heights, both "My Admin" expand states, keyboard-focus suite.
- Falsifier (rejected counter-zoom candidate): width assertion fails at every non-1 scale (11–33% deviation, all above 5% tolerance) while reachability assertions pass — both halves independently observed in the same run on attempt 3, plus an isolation run confirming each half separately.
- All verification commands independently re-run by the Leader (non-author) at every attempt; no mismatches.

## 8. Validation Summary

No separate `test-report.md`/`validation-report.md` was produced — `/akili-test`/`/akili-validate` were not run as distinct phases for this spec. **Accepted**: verification was performed inline throughout `/akili-execute` via non-author Leader re-runs of the task's own verification command plus a full-intensity Reviewer PASS per task, which this spec's `tasks.md` §5 ("no task is mechanical enough to skip review") already required in place of a separate validation pass.

## 9. Accepted Warnings Or Follow-Ups

| Item | Source | Status |
|---|---|---|
| `SBZ-T-3` manual real-zoom check on PRTest | `tasks.md`, `judgment.md` round-2 B-6 | **Open, accepted as follow-up** (user decision, 2026-11-03) |
| Dead SCSS code: `[data-slot='sidebar-container']`/`[data-slot='sidebar-inner']` `!important` blocks in `reporting-nav-sidebar.component.scss` are unreachable under Angular view-encapsulation scoping | execution.md — SBZ-T-2 attempt 1 Reviewer FAIL | Out of scope, flagged as follow-up (not filed as a separate spec) |
| `localStorage` `sidebar_width_px` could make the CT harness non-deterministic (`restoreWidthFromStorage` can override the test's 260px) | execution.md — SBZ-T-2 attempt 2 ADVISORY | Non-gating, open |
| Permanent collapsed-icon-rail reachability test case | execution.md — SBZ-T-2 attempt 1 ADVISORY | Recommended follow-up, not filed |
| Test file's banner comment still reads "Scope: this task only adds this spec file..." (stale, originally `SBZ-T-1`'s wording) | execution.md — SBZ-T-2 attempt 3 ADVISORY | Cosmetic, open |

## 10. Historical Notes

- **Judgment Day** (pre-execute): 2 rounds, 3 severe findings round 1 + 1 severe/1 High round 2, all resolved and independently re-verified by the architect before `tasks.md` was written. `APPROVED ✅`.
- **Pivot-Detection spec tension**, caught mid-execute by `SBZ-T-1`'s Reviewer (L-1): `design.md`/`requirements.md`'s "unchanged from `--pr-font-scale: 1` baseline" wording contradicted how its own cited measurement data was actually gathered. Routed to the user as a one-line amendment proposal per the Pivot Detection rule (not silently absorbed); user approved; applied before `SBZ-T-2` started. See `execution.md` §3.
- **Budget Tripwire**, fired twice, both explicitly user-approved (never auto-approved): review-round overage on `SBZ-T-2` (3 rounds vs. ≤2 budgeted) and total LOC overage (~375 vs. ~100–180 budgeted) — both driven by rework evidence/harness-correction work, not scope creep.
- **Effort Ceiling** held at `xhigh` for `SBZ-T-2` attempt 3 — no distinct, at-least-as-strong Implementer escalation model existed in this project's registry beyond the tier already in use by the Reviewer.

## 11. Diagrams

No `diagrams/` folder or diagram slot exists in this spec — nothing to link or flag stale.
