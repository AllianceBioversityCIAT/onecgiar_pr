# Archive Summary — Module Spec — `requirements.md`

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/notifications-revamp` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 22 `[x]`, 19 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `96afc19b0 2026-09-25 ✨ feat(results-notifications): revamp Requests/Received/Sent notifications UI + fix bilateral-project facet` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/changes/notifications-revamp/`

## 3. Requirements Delivered

`NOTIF-R-1`, `NOTIF-R-2`, `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-5`, `NOTIF-R-6`, `NOTIF-R-7`, `NOTIF-R-8`, `NOTIF-R-9`, `NOTIF-R-10`, `NOTIF-R-20`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `Summary`:

All 8 planned tasks' CODE has PASSed review, plus one unplanned defect-fix task (`NOTIF-T-9`, three separate rounds) the user's own live testing surfaced after everything else was already green:
- Filter popover rendering centered/global instead of anchored to its trigger — a real, traced library-internals bug (the button never registered itself as the CDK overlay's anchor), not a guess, independently verified against the compiled `@spartan-ng/brain` source. Fixed via a `viewChild` + `[attachTo]` binding. **Same latent bug found in a sibling component (`program-overview`'s Scope popover) — out of scope, flagged for a follow-up ticket.**
- Filter popover panel width (280px per the mockup, was 340px).
- Row avatars now show the requester's initials in a circle (individual rows) vs. an icon in a rounded square (bilateral/entity rows), replacing a generic person icon for both — matching the mockup's own distinct shapes.
- Accept/Decline buttons restyled per an explicit, user-confirmed mockup reference (bordered/white/accent-text Accept, plain muted-gray Decline) — a legitimate scope amendment recorded as `NOTIF-DD-6`, since the original spec had explicitly kept these buttons "unchanged." Took 2 rounds: attempt 1 had a genuine CSS-specificity bug (Angular's compiled encapsulation attribute made the override lose the cascade silently) that attempt 2 fixed with `!important`, matching an existing codebase precedent for the same problem.

**What's left is not code — it's the manual QA sweep that is `NOTIF-T-8`'s own Definition of Done** (desktop + tablet, Received/Sent, filters incl. the popover anchoring/width fix, accept/decline incl. bilateral ToC dialogs and their new colors, decision chips, avatar shapes, bell, Updates-tab regression check). Per the task's own Disqualifier, this has no automated gate and a skipped manual check counts as incomplete, not passed — so the spec is not `[x]`-closeable yet. Nothing has been committed — all changes sit unstaged, per the user's standing no-auto-commit rule.

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 3 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- Filter popover rendering centered/global instead of anchored to its trigger — a real, traced library-internals bug (the button never registered itself as the CDK overlay's anchor), not a guess, independently verified against the compiled `@spartan-ng/brain` source. Fixed via a `viewChild` + `[attachTo]` binding. **Same latent bug found in a sibling component (`program-overview`'s Scope popover) — out of scope, flagged for a follow-up ticket.**
- What's left is not code — it's the manual QA sweep that is `NOTIF-T-8`'s own Definition of Done** (desktop + tablet, Received/Sent, filters incl. the popover anchoring/width fix, accept/decline incl. bilateral ToC dialogs and their new colors, decision chips, avatar shapes, bell, Updates-tab regression check). Per the task's own Disqualifier, this has no automated gate and a skipped manual check counts as incomplete, not passed — so the spec is not `[x]`-closeable yet. Nothing has been committed — all changes sit unstaged, per the user's standing no-auto-commit rule.

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/changes--notifications-revamp.md` (no lessons distilled in batch mode).
