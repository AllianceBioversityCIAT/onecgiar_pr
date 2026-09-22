# Archive Summary — `bugfix/bilateral-section-autosave-on-navigate`

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/bilateral-section-autosave-on-navigate` |
| Archive date | 2026-09-22 |
| Branch at archive time | `performance-refactor` (Default Branch `master`, Integration Branch `staging` — neither, so this run is a spec branch: constitution/guide edits are recorded as pending items, not written) |
| Reported by | santiago.sanchez@cgiar.org, 2026-09-18 |
| Depth / mode | Lite, Bug Mode |

## 2. Archive Date

2026-09-22

## 3. Final Status

**Shipped.** All 3 tasks (`BIL-T-1`, `BIL-T-2`, `BIL-T-3`) closed `[x]` PASS. The fix is committed on
this branch as `6a2dff325` — `fix(bilateral-result-creator) [SPEC:bugfix/bilateral-section-autosave-on-navigate]: flush pending edits instead of confirm popup on Next/Back` — and verified present in
the current working tree (`bilateral-result-creator.component.ts:648-681` — async
`selectSection`/`moveSection`, no `window.confirm`). The folder's `CLAUDE.md` already carries the
corrected contract line and re-stamped `Verified:` entry.

## 4. Requirements Delivered

| ID | Delivered |
|---|---|
| `BIL-R-1` | Yes — flush-then-navigate replaces `window.confirm`, no popup |
| `BIL-R-2` | Yes — a flush error keeps the section open with the existing save-failure alert |
| `BIL-R-3` | Yes — clean-section fast path unchanged, no flush call |
| `BIL-R-4` | Yes — applies uniformly to Next, Back, and side-rail selection (all route through `selectSection()`) |
| `BIL-R-10` | Yes — `bilateral-result-creator/CLAUDE.md` corrected and re-stamped (`BIL-T-3`) |
| `BIL-AC-1..4` | Yes — all four covered by regression tests in `bilateral-result-creator.component.spec.ts` |

## 5. Files Changed Summary (from `execution.md`)

| File | Task | Change |
|---|---|---|
| `onecgiar-pr-client/.../bilateral-result-creator.component.spec.ts` | `BIL-T-1` | +regression test cases for `BIL-AC-1..4` (red on cases 1–2 against pre-fix code, confirmed by the Leader's own stash/re-run discipline pattern used elsewhere in this session) |
| `onecgiar-pr-client/.../bilateral-result-creator.component.ts` | `BIL-T-2` | `selectSection()`/`moveSection()` made `async`; `window.confirm(...)` replaced with `flush()` → `waitForSectionSave()` → error branch reusing `triggerManualSave()`'s alert shape |
| `onecgiar-pr-client/.../bilateral-result-creator/CLAUDE.md` | `BIL-T-3` | Contract line corrected ("navegar... nunca escribe" → Next/Back/riel now flush), `Verified:` re-stamped |

## 6. Test Evidence Summary

No standalone `test-report.md` was produced — accepted absence; equivalent evidence is embedded
verbatim in `execution.md`:

- `BIL-T-1` attempt 2: `npx jest ... --testPathPattern=bilateral-result-creator.component.spec` →
  `Tests: 2 failed, 74 passed, 76 total`, with the two failing cases confirmed as genuine
  assertion mismatches (not timeouts/TypeErrors) by full-output re-run.
- `BIL-T-2` attempt 1: same command → `Tests: 76 passed, 76 total` (all 4 new cases green, zero
  regressions). `npx ng lint --quiet` clean at every task.
- Manual browser smoke check performed directly by the user 2026-09-18 (Chrome extension was not
  connected in the executing session, so the Leader could not run it itself): edited a field,
  clicked Next, confirmed no popup and the edit persisted across reload. User-reported: "quedó
  funcionando bien."

## 7. Validation Summary

No standalone `validation-report.md` was run (`/akili-validate` was not invoked) — accepted
absence. In its place: independent per-task Reviewer verification for all 3 tasks, with one
genuine FAIL → fix → PASS cycle on `BIL-T-1` (see §9 Historical Notes) and PASS-on-attempt-1 for
`BIL-T-2` and `BIL-T-3`. No unresolved FAIL findings remain.

## 8. Accepted Warnings Or Follow-Ups

| # | Finding | Task | Disposition |
|---|---|---|---|
| 1 | `Next`/`Back`'s flush omits `manualSave$.next(activeSection)`, a side-channel `triggerManualSave()` also emits that `evidence` and `general-info` (lead-contact) subscribe to — Next/Back now saves strictly less than Save draft for those two sections specifically (no *new* data loss vs. before, since navigation wrote nothing previously). | `BIL-T-2` Reviewer ADVISORY | Accepted as a documented gap, not a blocker. Raised as a Kaizen Standardize proposal this archive pass (pending item `P3` in the kaizen entry) to record it in the module guide. |
| 2 | `goToQualitySection()` calls the now-async `selectSection()` without awaiting; a flush error there closes the quality dialog and lands the user on a generic "Save failed" alert instead of the flagged section. | `BIL-T-2` Reviewer ADVISORY | Accepted — pre-existing fire-and-forget shape, low blast radius, explicitly out of `BIL-T-2`'s scope. |
| 3 | Test asserted an expected value computed from the same mock under test instead of a literal. | `BIL-T-1` attempt 1 Reviewer ADVISORY | Resolved in attempt 2 (uses the literal `['generalInfo']`). No follow-up needed. |
| 4 | `CLAUDE.md`'s `Verified:` stamp format (stacked `prior:` entries) deviates from `COMPONENT-DOCS.md` §5's single-stamp convention — extended by one entry per this task's own explicit instruction. | `BIL-T-3` Reviewer ADVISORY | Accepted as a pre-existing deviation; flagged as a separate cleanup candidate for the apply-capable branch, not gated here. |

## 9. Historical Notes

- Root cause (confirmed in `proposal.md`): two independent, non-overlapping navigation-guard
  mechanisms existed in the codebase — W1/W2's route-based `UnsavedChangesGuard` (auto-saves, no
  popup) and Bilateral's ad hoc `window.confirm(...)` (never auto-saved). Bilateral's sections are
  not separate routes, so the shared guard structurally could not apply; the fix instead reuses
  `BilateralAutoSaveService.flush()`, already proven correct by the "Save draft" path.
- `BIL-T-1` attempt 1 → Reviewer FAIL (2 issues): the async mock for `flush()` never settled the
  polled `hasPendingFor` condition (would hang past Jest's 5s timeout once `BIL-T-2` landed), and
  the test never asserted the mid-flight state, so an implementation that switched sections before
  awaiting the flush would still have passed. Attempt 2 fixed both with a manually-controlled
  deferred promise. See the Kaizen entry (`P1`/`P2`) for the standardization proposal this produced.
- `BIL-T-2` closed `[~]` (code PASSed, manual-QA item open) for one cycle because the executing
  session's Chrome browser extension was not connected — a tooling-level blocker, not a stack
  problem (both frontend and backend dev servers were confirmed live and healthy). The user
  performed the manual check directly and confirmed it worked, unblocking `[x]`.
- No `/akili-quick` escalation (the proposal explicitly ruled it out — this is real async
  save-sequencing logic, not a copy/color tweak). No HALT, no Pivot, no budget tripwire hit.

## Constitution Sync (Step 3)

- **Agent guide sync:** already complete — `bilateral-result-creator/CLAUDE.md` was the spec's own
  named deliverable (`BIL-T-3`, `BIL-R-10`) and is exempt from the branch-write restriction; no
  further edit needed or made.
- **Factual-claims sweep of root guides:** performed (grepped root `CLAUDE.md`/`AGENTS.md` for
  `window.confirm`, Bilateral-autosave, and stage-of-project claims this cycle could have
  falsified) — no stale claim found, no edit needed.
- **TRD & ADR sync:** `design.md`'s `BIL-DD-1` is additive (a new client-side sequencing decision),
  not a supersession of any documented TRD ADR — no TRD edit needed.
- **CodeGraph:** `.codegraph/` exists — recommend a fresh `codegraph sync` to pick up the reshaped
  `selectSection`/`moveSection` signatures.
- **Spec family:** this spec is not listed as a child in any `family.md` manifest — no flip needed.

See `docs/specs/kaizen/bugfix--bilateral-section-autosave-on-navigate.md` for the full Kaizen
retrospective and its pending items (`P1`, `P2`, `P3` — all `pending`, none applied, per the spec
branch gate).
