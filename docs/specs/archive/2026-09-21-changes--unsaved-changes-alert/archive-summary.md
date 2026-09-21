# Archive Summary — changes/unsaved-changes-alert

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | P2-3638 |
| Owner | Santiago Sanchez Correa |
| Branch at archive | `qa-development-2026-ss` (spec branch; default `master`) |
| Kaizen entry | `docs/specs/kaizen/changes--unsaved-changes-alert.md` |

## 2. Original Spec Path

`docs/specs/changes/unsaved-changes-alert/`

## 3. Archive Date

2026-09-21

## 4. Final Status

**Archived with accepted gaps.** Implementation `UCA-T-1`..`UCA-T-11` all PASS (Reviewer-gated). `UCA-T-9` HALTed after 3 attempts, then PASSed on user-authorized attempt 4. Code is on `origin/performance-refactor` (merge `5812d73f3`). Manual QA (`UCA-T-12`) was run by the user on 2026-09-21; two observations remain open (section 9).

## 5. Requirements Delivered

Unsaved-changes guard (`UnsavedChangesGuard` on each section's inner route), Save/Discard dialog, silent save on Back/Next, `beforeunload` directive, and per-section dirty tracking for: general-information, geographic-location, evidences, partners / contributors-and-partners, theory-of-change, links-to-results, and the 5 result-type sections (knowledge-product, cap-dev, innovation-dev, innovation-use, policy-change). Covers `UCA-R-1`, `-2`, `-5`, `-6`, `UCA-AC-1`..`-8` per `execution.md`.

## 6. Files Changed Summary

See `execution.md` per-task entries. Key: `section-bottom-bar`, `unsaved-changes` guard/dialog/service, `*-routing.module.ts` of each covered section, per-section components + specs + folder `CLAUDE.md`s.

## 7. Test Evidence Summary

Per-task Jest runs green with lint + build clean (see `execution.md`). Known pre-existing unrelated failure: 1 test in `innovation-dev-info` (246/247). No `test-report.md`.

## 8. Validation Summary

No `validation-report.md`. Reviewer PASS embedded per task. Manual QA (user-reported, 2026-09-21): Back/Next save OK; dialog Save and Discard OK; clean section navigates without dialog OK; browser-back and keyboard cases OK.

## 9. Accepted Warnings Or Follow-Ups

- **`UCA-AC-2` deviation:** with a required field empty, Next/Back navigated and left the field empty rather than staying with the error UI. Decide: by-design (amend AC-2) or fix.
- **`UCA-AC-7/8` unclear:** after reload the same info showed; no native `beforeunload` prompt was reported. Confirm dirty-vs-clean behavior.
- Missing `test-report.md` and `validation-report.md` accepted.
- `tasks.md` section 6 (PR, CI, staging QA, `shipped` status) and `UCA-T-12` doc items (`result-detail/CLAUDE.md` update) not closed.
- Deferred: `UCA-R-10` adoption by IPSR and the bilateral result creator.
- Advisory carry-overs: load GETs fail open on error (several sections); `scaling_studies_urls` missing from `InnovationDevInfoBody` model.

## 10. Historical Notes

Recurring defect class: async/child writers mutating tracked state after the dirty snapshot (see kaizen lesson 1). HALT rollback was deliberately not run literally because the working tree held other uncommitted PASSed tasks (kaizen lesson 2). Spec files were never committed before this archive.
