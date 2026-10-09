# Archive Summary — Topbar: Release notes left of the notification bell

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/topbar-release-notes-bell-position` |
| Archive Date | 2026-09-23 |
| Branch (at archive time) | `qa-development-2026-mc` (spec branch — neither `Default Branch: master` nor `Integration Branch: staging`) |
| Depth | Lite |
| Approval Mode | standard (HITL at each phase gate) |

## 2. Final Status

**Shipped.** Single task (`TRN-T-1`) PASSed on first Implementer attempt, Reviewer `PASS`, independently re-verified by the Leader, committed, pushed, and merged into `performance-refactor` (the branch this project's redesign work integrates through) at the user's explicit direction. Live-verified in the browser against a running `ng serve` instance.

## 3. Requirements Delivered

| ID | Description | Status |
|---|---|---|
| `TRN-R-1` | Release notes renders immediately left of the notifications bell in `.pr-topbar-right` | ✅ Delivered |
| `TRN-R-2` | No markup/class/aria-label/title/binding/icon change to either control — sibling order only | ✅ Delivered |
| `TRN-R-3` | Existing separator count/grouping structure (`shell-topbar.component.spec.ts:562-578`) still holds | ✅ Delivered (superseded — see §9) |
| `TRN-AC-1` | Release notes' DOM index < bell's DOM index | ✅ Delivered, pinned by new Jest assertion |
| `TRN-AC-2` | Existing grouping test still passes | ✅ Delivered |

## 4. Files Changed Summary

(From `execution.md`, Attempt 1 of `TRN-T-1`.)

- `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html` — swapped sibling position of the Release notes `<a>` block and the `.pr-topbar-actions` bell wrapper; separators kept in their original two slots per `TRN-DD-1`.
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.spec.ts` — new order-pinning assertion (`TRN-AC-1`).
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md` — folder-doc `Verified:` line re-stamped, per `docs/COMPONENT-DOCS.md`.

**Post-spec follow-up (out of this spec's approved scope, tracked separately):** `quick/topbar-remove-sep` (same day) removed the two `.pr-topbar-sep` divider lines between Help, Release notes and the bell per direct user request, and updated the `TRN-R-3`/P2-3682 separator-count assertion from 2 → 0. See `docs/specs/quick/quick-log.md`. This is recorded here only for traceability continuity — it is not part of this spec's delivered scope and was executed under `/akili-quick`, not this triad.

## 5. Test Evidence Summary

No standalone `test-report.md` was produced — **absence accepted** (see §9). Verification ran inline inside the Implementer → Leader → Reviewer loop (Step 2.3 evidence re-run, mechanical, non-author):

- `npx jest --testPathPattern="shell-topbar.component.spec"` — 43/43 pass (Implementer run + independently re-run by the Leader, identical output).
- `npx jest --testPathPattern="reporting-nav-sidebar.component.spec"` — 74/74 pass (untouched, re-run only, per `TRN-P-3` consumer check).
- `npx ng lint --quiet` — clean.
- Disqualifier grep (`shell-topbar|pr-topbar-actions|pr-topbar-sep|lucideRocket|aria-label="Release notes"`) — no new positional consumer, run twice (Implementer + Leader).

## 6. Validation Summary

No standalone `validation-report.md` was produced — **absence accepted** (see §9). Equivalent evidence: a conformance Reviewer `PASS` (task was explicitly not `skip-eligible`, per tasks.md's own `Review: checklist` field and override (b) — shared shell chrome reachable on every authenticated route) plus a live-browser DOM verification against a running `ng serve` (`localhost:4200`, authenticated session): confirmed accessibility-tree order `Help → Release notes → Notifications → User menu`, confirmed the bell popover still opens normally, confirmed no visual regression.

## 7. Accepted Warnings Or Follow-Ups

- Reviewer's one non-blocking observation: the Leader's brief cited the folder-doc convention at repo-root `docs/COMPONENT-DOCS.md`; the actual path is `onecgiar-pr-client/docs/COMPONENT-DOCS.md`. A brief-authoring inaccuracy, not a diff defect — the diff itself followed the file's existing stamp pattern correctly. No follow-up task needed.
- Budget: design.md recorded 1 task / ~15-25 LOC / 1 review round; actual was 1 task / ~39 LOC across 3 files / 1 review round — within budget, no tripwire.

## 8. Historical Notes

- `design.md` §13 records design.md's own observation that this change was small enough that `/akili-quick` would have sufficed — noted there as non-blocking awareness, not corrected here.
- `requirements.md` `TRN-OQ-1` (whether the separator moves with Release notes or stays fixed) was resolved during specify as `TRN-DD-1` (separators stay fixed) before execution began — no open question carried into execution.
- The branch state at archive time (`qa-development-2026-mc`, a personal/dev branch) is not this project's designated apply-capable branch (`staging`, per the `Integration Branch:` pin). The user explicitly directed a direct-merge integration path instead of a PR: `qa-development-2026-mc` was synced from `performance-refactor`, then merged forward into `performance-refactor` and pushed (commits `f8a4e92d4`, `6d064b04a`, merge `3844a7970`) — `performance-refactor`, not `staging`, is the actual integration branch for this redesign line of work; this is recorded as a factual observation for the constitution factual-claims sweep (§9), not acted on here since this run is on a spec branch.

## 9. Absences Accepted at Archive

| Artifact | Accepted because |
|---|---|
| `test-report.md` | Lite-depth, single-task, template-only spec; verification evidence captured inline in `execution.md` per the rework-loop's mandatory non-author evidence re-run — equivalent rigor, no separate Tester needed for a mechanical DOM-order assertion. |
| `validation-report.md` | Conformance Reviewer `PASS` (task explicitly not `skip-eligible`) plus live-browser DOM/a11y-tree verification cover what `/akili-validate` would check for a presentational, no-API, no-data change. |
