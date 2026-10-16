# Archive Summary — bugfix/field-card-save-pill-truncation

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/field-card-save-pill-truncation/` |
| Archive Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Depth | Lite (Bug Mode) |
| Final Status | **Shipped** — `FCT-T-1` PASSed on attempt 4 (rework attempt 3 of 3, the ceiling) |

## 2-3. Original Spec Path / Archive Date

`docs/specs/bugfix/field-card-save-pill-truncation/` → `docs/specs/archive/2026-10-15-bugfix--field-card-save-pill-truncation/`. 2026-10-15.

## 4. Final Status

| Task | Status | Attempts | Reviewer rounds | Outcome |
|---|---|---|---|---|
| `FCT-T-1` | `[x]` PASS | 4 (1 checkpoint + 3 rework) | 3 (FAIL → FAIL → PASS) | Shipped. Final value: `grid-cols-[repeat(auto-fit,minmax(min(390px,100%),1fr))]` |

## 5. Requirements Delivered

All delivered: `FCT-R-1`, `FCT-R-2` (added mid-spec after attempt 3's FAIL — original framing didn't anticipate a bare floor's overflow case), `FCT-R-3`, `FCT-AC-1`, `FCT-AC-2`, `FCT-AC-3`.

## 6. Files Changed Summary

| File | Change |
|---|---|
| `type-policy-change.component.html:55` | Grid floor `190px` → `minmax(min(390px,100%),1fr)` (final, after 2 intermediate corrections); divergence comment added |
| `type-policy-change.component.spec.ts:634` | Literal updated to match |
| `type-policy-change.grid-collapse.cy.ts` | New — 8 Cypress CT cases, sourcing the grid class live from the production template (catches a revert), covering collapse-free widths (760/1150/1220/1210px), the narrow single-column fallback (600px), and the sub-390px overflow guard (300px) |
| `type-policy-change/CLAUDE.md` | Re-stamped 4 times across attempts; final trap bullet explains the `min()` guard and the overflow case it solves (114/120 lines, under the cap) |

## 7. Test Evidence Summary

Final state: `npx ng lint --quiet` clean; `npx jest --testPathPattern="type-policy-change"` 41/41 passed; `npx cypress run --component` 8/8 passed, "All specs passed!" — all three independently re-run by the Leader at every attempt, matching the Implementer's reports exactly (never a MISMATCH). Falsifier evidence included temporary reverts of the production template at every attempt (to `190px`, to `360px`, to bare `390px`), each confirming the test suite actually catches the specific defect it claims to.

## 8. Validation Summary

No standalone `/akili-validate` pass run (not required for a Lite client-only spec); validation folded into the Reviewer rounds. Two genuine Reviewer FAILs (not false alarms):
- **Attempt 2:** `minmax(360px,1fr)`, locked from sampling only 2 widths, left squeeze zones (~760px, ~1120-1180px) where a column still shrank to exactly the floor, below the pill's 380px collapse threshold.
- **Attempt 3:** the correction, a bare `minmax(390px,1fr)`, fixed that but introduced a new regression — a fixed-minimum grid track can't shrink below itself, so content narrower than 390px would overflow horizontally instead of degrading (a real regression of the old `190px` floor's phone-width behavior).
- **Attempt 4 (PASS):** `minmax(min(390px,100%),1fr)` — the standard CSS Grid pattern for this exact case — independently re-verified by the Reviewer on 6 separate points (regex correctness in both directions, the CSS mechanism itself, no gap between 300-390px, column-count arithmetic redone by hand, `CLAUDE.md` line-cap and accuracy, scope containment).

## 9. Accepted Warnings Or Follow-Ups

- 4 `ADVISORY` (non-gating) findings from the final Reviewer pass, not actioned per "Advisory Never Becomes A Task": two stale comments in the Cypress spec overstating that a `190px` revert fails every case (1220px/1210px coincidentally still pass under `190px`); two test titles saying `minmax(390px,1fr)` instead of `min(390px,100%)`; the regex's reliance on "first `class="grid` in the file" being a latent fragility; `requirements.md`'s stale `FCT-OQ-1` value (fixed in this archive pass, see below).
- The Implementer's standing judgment call across all 4 attempts — substituting a manual `ng serve` check with Cypress CT evidence against the real production markup and real components — was accepted by the Leader as equivalent-or-stronger evidence each time; recorded, not re-litigated.
- The separately-documented "Unsaved changes doesn't clear after save" architectural gap (`SaveButtonService.savedTick` not bumped by `triggerManualSave()`) remains explicitly out of scope, per `requirements.md` §3.

## 10. Historical Notes

This spec is itself a case study in disciplined rework: 3 attempts past the initial Pivot checkpoint, 2 of them genuine Reviewer FAILs, both caught *before* shipping a defect — never waived, never rushed past the ceiling. The underlying pattern across both FAILs is the same: a design correction made in response to one Reviewer finding was verified against the specific counterexample that triggered it, but not against the *general* behavior space (CSS Grid's `auto-fit`/`minmax()` has two failure modes — a column that's too narrow, and a floor that can't shrink — and each correction initially addressed only one). See `docs/specs/kaizen/bugfix--field-card-save-pill-truncation.md` for the lesson distilled from this.
