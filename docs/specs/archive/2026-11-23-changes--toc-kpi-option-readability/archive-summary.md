# Archive Summary — ToC KPI dropdown readability (TKR)

> **Outcome:** In the 2026 Contributors & partners ToC KPI question, long KPI options now show on two lines with no sideways scroll, and the chosen KPI statement shows clamped to 3 lines with Show more / Show less. Client only, no payload change. In PROD. Verified on PRTest 2026-11-23 (result 8954 as a substitute for #953).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/toc-kpi-option-readability` (TKR) |
| Ticket | P2-3094 (Marc Schut feedback, item 3) |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/changes/toc-kpi-option-readability/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 3/3 tasks `[x]`.** Validation PASS with 5 WARN, 0 FAIL; the open PRTest WARN was closed on 2026-11-23. One Reviewer FAIL (T-2, attempt 1, clamp falsifier did not reach the height assertion), fixed on attempt 2. One LOC budget tripwire (≈480 vs ~180, all in tests), accepted by the owner.

## 5. Requirements Delivered

| Req | Delivered by |
|---|---|
| TKR-R-1 two-line options, no sideways scroll | T-1 `app-pr-select` opt-in `wrapOptions` |
| TKR-R-2 chosen KPI in full, 3 lines + toggle | T-2 `app-clamped-text`, T-3 wiring |
| TKR-R-3 default select unchanged | T-1 (all rules under `.options_wrap`) |
| TKR-NFR-1..4 | copy file, Tailwind, no payload change, scoped tests |

## 6. Files Changed Summary

Client only. New shared `shared/components/clamped-text/` and `internationalization/clamped-text.copy.ts`; `custom-fields/pr-select` (`wrapOptions` input, `custom-fields.scss`); `multiple-wps-content` (KPI select + clamped statement). Commit `13ee7a4a9` on qa-dev; merged into `performance-refactor` as `e68696ef8`; in `master`.

## 7. Test Evidence Summary

No `test-report.md` (accepted). Per task: red runs, falsifiers and non-author re-runs in `execution.md` (Jest `pr-select` 10/10, `clamped-text` 4/4, related 22 suites / 793; CT `pr-select.cy.ts` 20/1/1 with the same pre-existing reds as baseline; `ngc` exit 0).

## 8. Validation Summary

`validation-report.md`: PASS, 5 WARN, 0 FAIL. WARN-1 (PRTest real data) closed 2026-11-23: PASS on 8954, KPI panel `options_wrap`, 2-line options with ellipsis at 900 px, `scrollWidth === clientWidth`, clamp + Show more/less working, `hasUnsavedChanges()` stays false. Not done and accepted: Save draft payload DevTools check (writes to the shared DB).

## 9. Accepted Warnings Or Follow-Ups

- [ ] Reply to Marc on item 3 of the feedback document.
- [ ] Cosmetic: opening a `pr-select` list (no selection) turns on the field-card "Unsaved changes" pill; section state stays clean, no payload impact.
- [ ] Side finding, outside TKR: result 8700 ToC column renders "SP09 Scaling for Impact..." one letter per line.
- [ ] No test asserts the clamp ellipsis (WARN-3); `pr-select.cy.ts` had no ESLint flat config.
- [ ] `codegraph sync` (new shared component).
- [ ] PR note "W3/bilateral payload: no impact (view-only)" belongs in the PR description.

## 10. Historical Notes

- #953 has no 2026 version on PRTest, so the real-data check used SP09 2026 result 8954.
- Option hover tooltip was in the proposal only, not in the requirements; none added (TKR-DD-3).

## 11. Diagrams

None.
