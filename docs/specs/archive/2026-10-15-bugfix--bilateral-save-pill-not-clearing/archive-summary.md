# Archive Summary — bugfix/bilateral-save-pill-not-clearing

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/bilateral-save-pill-not-clearing/` |
| Archive Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Depth | Standard (Bug Mode) |
| Final Status | **Shipped** — `BSP-T-1` PASSed on attempt 3, after 2 genuine `FATAL_FAIL`s |

## 2-3. Original Spec Path / Archive Date

`docs/specs/bugfix/bilateral-save-pill-not-clearing/` → `docs/specs/archive/2026-10-15-bugfix--bilateral-save-pill-not-clearing/`. 2026-10-15.

## 4. Final Status

| Task | Status | Attempts | Reviewer rounds | Outcome |
|---|---|---|---|---|
| `BSP-T-1` | `[x]` PASS | 3 (2 `FATAL_FAIL` + 1 checkpoint, 1 final PASS) | 3 (`FATAL_FAIL` → `FATAL_FAIL` → PASS) | Shipped. Page-wide `BilateralAutoSaveService.hasAnyUnsavedAnywhere()` gates `savedTick` bumps from all 3 save call sites. |

## 5. Requirements Delivered

All delivered: `BSP-R-1..5`, `BSP-AC-1..7`. `BSP-AC-8` delivered as **documented accepted risk** (by its own definition — not a passing-test closure).

## 6. Files Changed Summary

| File | Change |
|---|---|
| `bilateral-auto-save.service.ts` | New `hasAnyUnsavedAnywhere()` — page-wide scan of `fieldStatus()`, no exclusions |
| `bilateral-auto-save.service.spec.ts` | +8 tests for it, including the Evidence-key case |
| `bilateral-result-creator.component.ts` | New `maybeBumpSavedTick(section, hadRealChange)`; wired into `triggerManualSave()`, `selectSection()` (new `pendingStatusKeysFor` capture), `handleGiFieldSaveRequested()` (old `safeToBumpSavedTick` guard deleted, replaced — keyed on `openSectionName()`, not the fixed `'general-info'` target) |
| `bilateral-result-creator.component.spec.ts` | Rewritten GI-drawer `savedTick` tests + 2 new describe blocks covering all 6 falsifier cases |
| `bilateral-result-creator/CLAUDE.md` | Restructured (242→120 lines, at the cap) — documents the guard replacement AND the new ToC carve-out; audited by the Reviewer against `docs/COMPONENT-DOCS.md`'s actual convention and found compliant (no live trap lost) |

`section-toc.component.ts` — read, understood, deliberately **not modified** (its gap is accepted, not fixed, this spec).

## 7. Test Evidence Summary

Final: `npx ng lint --quiet` clean; `npx jest --testPathPattern="bilateral-result-creator.component.spec|bilateral-auto-save.service.spec"` **195/195 passed** — independently re-run by the Leader at every attempt, matching the Implementer's reports exactly, never a MISMATCH. Falsifier re-walks performed at every attempt (temporary reverts/strips of the safety check, confirming red-before/green-after in both directions).

## 8. Validation Summary

No standalone `/akili-validate` pass (folded into the 3 Reviewer rounds, all `Review: full` given the task reverted delivered behavior and followed prior FATAL_FAILs). Two genuine `FATAL_FAIL`s:
- **Attempt 1:** the design's core premise ("only the currently-open section can have unsaved data") was false — `selectSection()` skips its flush during the AI quality-assessment drawer's `'refreshing'` window — and the SAME false premise underlay the already-shipped 2026-09-29 GI-drawer guard.
- **Attempt 2:** (after a mid-attempt checkpoint correctly caught and fixed a related Evidence-protection detail) a full Reviewer pass, instructed to hunt adversarially for a third gap of the same shape, found one: `section-toc.component.ts`'s narrative field double-debounces (1500ms + 1000ms) before staging, leaving it invisible to the new page-wide check for ~2.5s.
- **Attempt 3 (PASS):** the same, fully-vetted logic, with both gaps (Evidence's pre-existing one, ToC's newly-found one) explicit and documented as equal carve-outs, verified compliant with the project's own doc-pruning convention.

## 9. Accepted Warnings Or Follow-Ups

- **ToC narrative-field carve-out** (`BSP-AC-8`, `design.md` P-12) — explicitly accepted, not fixed. Recommended follow-up: a synchronous debounce-flush hook exposed from `section-toc.component.ts`, called by `triggerManualSave()`/`selectSection()` before reading staged state — would also close a pre-existing silent-data-loss window on Next/Back that predates this spec.
- `ADVISORY` items from the final Reviewer pass, not actioned (non-gating): a one-line ticket-ID pointer for pruned AI-queue history per `docs/COMPONENT-DOCS.md` §4(3); a Gotchas wording tweak ("rail's section buttons" vs "the rail's buttons"); a cosmetic "second Pivot" vs "first Pivot" mislabel in a test comment. The `Verified:` stamp format nit was fixed directly by the Leader (trivial, matches the convention's own stated format).

## 10. Historical Notes

This spec is the clearest demonstration this session of the Pivot Protocol and Fail-Fast rule working exactly as designed under real pressure: two genuine, reproducible architectural defects were found and neither shipped — the first reshaped the whole design (single-section guard → page-wide check, also fixing a dormant bug in already-shipped code), the second was explicitly surfaced to the user and consciously accepted rather than silently absorbed or indefinitely deferred. See `docs/specs/kaizen/bugfix--bilateral-save-pill-not-clearing.md` for the distilled lessons.
