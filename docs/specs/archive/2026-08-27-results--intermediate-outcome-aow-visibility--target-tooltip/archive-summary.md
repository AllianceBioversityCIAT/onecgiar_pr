# Archive Summary — `results/intermediate-outcome-aow-visibility/target-tooltip`

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/` |
| **Parent spec family** | `results/intermediate-outcome-aow-visibility/` (`family.md`, child #1) |
| **Owner** | santiago.sanchez@cgiar.org |
| **Branch** | `qa-development-2026` (spec branch — default branch is `master`) |

## 2. Original Spec Path

`docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/`

## 3. Archive Date

2026-08-27

## 4. Final Status

✅ **Complete.** 2/2 tasks (`RES-T-1`, `RES-T-2`) `[x]` — code, Reviewer PASS, commit, and manual browser verification all done. `RES-T-1` survived one Pivot (a false design premise about keyboard reachability, resolved by amending the spec, not the code); `RES-T-2` was added as a mid-flight scope amendment after the user clarified the requirement was incomplete.

## 5. Requirements Delivered

| Requirement | Delivered |
|---|---|
| `RES-R-1`, `RES-R-2` — tooltip on Intermediate Outcomes card Target cells | ✅ |
| `RES-R-10` | Superseded (hover-only accepted — `PrTooltipDirective` was never keyboard-reachable; see Pivot Record) |
| `RES-AC-1`, `RES-AC-2` | ✅ (keyboard clause removed from `RES-AC-1` per the Pivot) |
| `RES-R-3` — cross-cutting tooltip on AoW-card Outcomes-band rows | ✅ (mechanism: backend `is_aow` field, verified against live data before implementation) |
| `RES-AC-3`, `RES-AC-4` | ✅ |

## 6. Files Changed Summary

(from `execution.md`)

- `reporting-aow-table.component.ts` / `.html` / `.spec.ts` — `isIntermediateRow`, `isCrossCuttingIntermediate`, tooltip binding widened to cover both cases.
- `dashboard-lab.component.ts` — `fromTier` mapping stamps `__isIntermediateCrosscut` using the backend's `is_aow` field.
- `dashboard-lab.component.spec.ts` — new file (first spec for this component), scoped to the `fromTier` stamping logic.
- `reporting-aow-table/CLAUDE.md`, `dashboard-lab/CLAUDE.md` — `Verified:` stamps re-dated to the actual commit hash.

Committed: `971836fe8` (unrelated bilateral wiring fix, same-day), `617f54f91` (`RES-T-1` + `RES-T-2` combined), `618d7743c` (CLAUDE.md re-stamp).

## 7. Test Evidence Summary

- `npx jest --testPathPattern="reporting-aow-table|dashboard-lab"` — 254/254 passing (includes 3 new `dashboard-lab.component.spec.ts` cases covering the `is_aow: false`/`true`/absent stamping branches, `is_aow: true` covered synthetically since no live fixture demonstrates it).
- No separate `test-report.md` — testing embedded in task execution per this spec's scope; Reviewer independently re-read both spec files (not just the diff) and confirmed exact-value assertions throughout.
- Manual browser verification (`RES-TEST-2`, `RES-TEST-4`) — done 2026-08-27, both confirmed correct, no disqualifying inputs observed. One residual gap: no live program with a genuinely AoW-exclusive (`is_aow: true`) outcome existed to spot-check that negative case in a real browser (covered by a synthetic unit test only).

## 8. Validation Summary

No separate `/akili-validate` pass or `validation-report.md`. The Reviewer's two attempt audits (`RES-T-1` FAIL→Pivot→re-review PASS; `RES-T-2` PASS on attempt 1) serve as the validation evidence — both independently re-checked source (`pr-tooltip.directive.ts`, the AoW repository's `is_aow` normalization) rather than trusting the diff or the design doc's claims.

## 9. Accepted Warnings Or Follow-Ups

| Item | Type | Note |
|---|---|---|
| `is_aow: true` live spot-check | Follow-up | No live program has a genuinely AoW-exclusive outcome yet; spot-check once one exists. Not blocking — code path is backend-SQL-supported and unit-tested synthetically. |
| `PrTooltipDirective` keyboard reachability | Follow-up (filed as candidate) | App-wide gap (`focusin`/`focusout` never handled) affecting ~40 existing `[prTooltip]` call sites, not just this spec's. Recommended as a separate `/akili-propose`, not started. |
| Extend tooltip to the `flat` ("All indicators") table | Follow-up | Only if requested later — `design.md` §13. |
| `is_aow`-missing convention divergence | Advisory (Reviewer) | This diff treats a missing `is_aow` as cross-cutting (`!== true`); legacy `entity-aow.service.ts` treats it as AoW-exclusive (`=== false`). Both correct today since the field is always a normalized boolean server-side, but would diverge if that ever changed. Noted in `dashboard-lab/CLAUDE.md` at re-stamp time. |

## 10. Historical Notes

- **Pivot Record (`RES-T-1`):** the Reviewer's FAIL on attempt 1 revealed `design.md` §6.3's premise ("matches `achievedTooltip`'s existing keyboard-reachable pattern") was false — `pr-tooltip.directive.ts` has never handled focus/blur, hover/click only. Resolved by amending `requirements.md`/`design.md` to accept hover-only (matching existing `achievedTooltip` behavior, no regression), and filing the directive's keyboard-reachability gap as a separate follow-up rather than expanding this spec's file boundary. A docs-only re-review (not counted as a second rework attempt) caught two residual stale sentences the correction-closure sweep's literal `keyboard` grep missed (they said "focus"/"Tab-focus" instead) — noted for future sweeps to search `focus|Tab|keyboard` together.
- **Scope amendment (`RES-T-2`):** the user clarified via screenshot that the tooltip also needed to appear on AoW-card Outcomes-band rows that repeat transversally, not just the standalone Intermediate Outcomes card. First raised via `/akili-quick`, correctly declined as non-trivial and routed into this spec.
- **Live-data verification before code:** `RES-T-2`'s design assumption (`indicator_id` matching across two endpoints) was verified against real API responses before any implementation — and revealed a simpler, more robust mechanism already in the payload (`is_aow`), which replaced the original design.
