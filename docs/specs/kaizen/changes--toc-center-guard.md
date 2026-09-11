# Kaizen Entry — changes/toc-center-guard

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-center-guard` |
| Date | 2026-08-29 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (`TOC-C-T-1..3`) | tasks.md |
| Reviewer FAIL rework attempts | 1 (`TOC-C-T-1`, attempt 1 FAIL → attempt 2 PASS) | execution.md — `TOC-C-T-1` |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 2, same day, both post-PASS/post-approval corrections (`TOC-C-DD-4`, `TOC-C-DD-5`) | execution.md — `## Pivot Record` (×2) |
| PRODUCT_BUGs | n/a (no `test-report.md`) | — |
| Validation FAIL / WARN | n/a (no `validation-report.md`); evidence is inline per-task Reviewer PASS verdicts | execution.md |

## Lessons

- **KZ-changes--toc-center-guard-1 — A counting/threshold requirement scoped across two state sources was approved without a concrete worked example, causing two same-day post-approval Pivots.** (Product, High)
  - Root cause: `requirements.md`/`design.md` were approved with a "combined across `contributing_center` and `otherCentersSelected`" counting rule (`TOC-C-DD-2`) that the user overturned twice after approval via concrete scenarios: first that the sentinel chip must always be deletable regardless of its cascade (`TOC-C-DD-4`), then that the floor must be scored on ToC-origin count alone, ignoring "Other" entirely (`TOC-C-DD-5`). Neither ambiguity was surfaced during requirements/design review — both needed a specific numeric example (e.g. "2 ToC-origin + 1 Other, delete 2nd ToC-origin") to become visible.
  - Evidence: `execution.md` — `## Pivot Record: TOC-C-T-1 sentinel-deletion behavior` and `## Pivot Record: TOC-C-T-2 count-scope correction`, both dated 2026-08-29, both triggered by the user, not by test/review failure.
  - Standardization: → P1.

- **KZ-changes--toc-center-guard-2 — A test proving a specific counting formula used a fixture where the correct formula and the most obvious wrong formula produce the same result.** (Product, Medium)
  - Root cause: `TOC-C-T-1` attempt 1's `TOC-C-AC-5` test used a single "Other" center, so `otherCentersSelected.length === 1` was numerically identical to a naive `willRemoveCount = 1` — a mutation deleting the entire cascade-counting logic (`TOC-C-DD-3`) would still leave the test green. The Reviewer caught it on attempt 1; fixed in attempt 2 by using two "Other" centers so the two formulas diverge.
  - Evidence: `execution.md` — `TOC-C-T-1` attempt 1 Reviewer verdict FAIL ("Discovered Issue: ... did not discriminate the behavior it claimed to prove").
  - Standardization: → P2.

## Noted, not a lesson

- `rd-contributors-and-partners/CLAUDE.md` is now ~231 lines against the 120-line cap in `onecgiar-pr-client/docs/COMPONENT-DOCS.md` — pre-existing condition, not caused by this diff (`execution.md` — `TOC-C-T-1` ADVISORY). Below the lesson bar for this spec; feeds recurrence if a future spec in this folder hits the same cap.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | Add to the Functional Requirements guidance: "A requirement that defines a counting/threshold rule spanning more than one state source (e.g. two arrays, a combined total) MUST include a concrete worked-example row in the Acceptance Criteria table with specific values for every source, confirmed before design approval — not just a prose description of the formula." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | Add to the negative/boundary-check guidance: "A test proving a specific counting/cascade formula MUST use fixture values that diverge from the most plausible incorrect formula (e.g. 2+ items in the array whose length would otherwise coincide with a naive off-by-one count), not values where the correct and wrong formulas produce the same result." |
| Severity | Medium |
| Status | pending |
