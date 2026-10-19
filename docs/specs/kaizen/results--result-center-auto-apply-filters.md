# Kaizen Entry — results/result-center-auto-apply-filters

## Document Control

| Field | Value |
|---|---|
| Spec Path | `results/result-center-auto-apply-filters` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 1 (`RCF-T-1` attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 (no test-report.md — tests authored inline under `RCF-T-1`) | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | n/a (no validation-report.md; Reviewer PASS + user manual QA served as closure evidence) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 1 (`RCF-T-2`, manual browser verification, zero code diff) | execution.md |
| Escaped defects (§3) | 0 (user confirmed pass, no issue raised) | execution.md |

## Lessons

- **KZ-results--result-center-auto-apply-filters-1 — A task's Definition of Done didn't itemize the specific Jest gates its own requirements doc's defect-class table named, so the first attempt satisfied every literal DoD line while still missing two required gates.** (Product + Methodology, Medium)
  - Root cause (5W1H — *why did a correctly-implemented task still FAIL Review on its first attempt?*): `requirements.md` §9's defect-class table explicitly named two Jest gates for `RCF-T-1` — "for each of the 7 filter fields + 2 checkboxes, assert..." (row 1) and "open panel, change a filter, close via each of the three affordances, assert the applied signal still holds the new value" (row 4) — and `design.md` §10 restated them in prose. But `tasks.md`'s own `RCF-T-1` **Definition of Done** checklist (the list an Implementer works against directly) never itemized either gate as its own line; it only referenced the "Falsifier/Red run above" for the renamed `menu`-layout test and said nothing matching row 4 at all. Attempt 1's Implementer wrote a single-field test and no close-affordance test — a plan that satisfied every literal DoD bullet it was given — and the gap was caught only because the Reviewer independently re-read `requirements.md` §9 against the diff, not because `tasks.md` told the Implementer to produce it. The task's own `Review: checklist` depth flagged exactly this check as something the Reviewer "specifically checks," which is itself a tell that the authors anticipated the DoD might not carry it.
  - Evidence: `execution.md` — `RCF-T-1` attempt 1, Reviewer Issues 1 & 2 (citing `requirements.md` §9 rows 1 and 4, not `tasks.md`'s own DoD, as the Violated Rule); `tasks.md` `RCF-T-1` Definition of Done (lines 44-53, pre-fix) vs. `requirements.md` §9 (defect-class table).
  - Standardization: → P1 (local), P2 (upstream) — generalizable (no project-specific content: it is about how `/akili-specify` fills a task template, not about Results Center or Angular specifically), so both halves apply per the dual-lesson rule.

## Noted, not a lesson

- The Leader (not a Reviewer) decided `RCF-T-2` (a zero-diff manual-browser-QA task) did not need a conformance Reviewer spawn, reasoning that no agent in session held login credentials or a live dev DB to independently re-perform the walkthrough, so a Reviewer re-reading the same human attestation would add no real verification — recorded transparently as a `REVIEW_SKIPPED` judgment call in `execution.md` rather than a mechanical application of Step 2.3's four conditions (which technically fail condition 2, "fully deterministic", for any human-judgment manual-QA task). Below the lesson bar this run (zero defect resulted, user confirmed pass), but worth watching: if this ad hoc reasoning recurs across multiple specs with manual-QA-only tasks, it may be worth a standing, explicitly-named exemption clause in `/akili-execute`'s Review Intensity section for "task type: manual, zero files changed" rather than each Leader re-deriving the same judgment call independently every time.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | In the Definition of Done guidance, add: "When `requirements.md` names a defect-class → gate table for this task's area, restate each gate row this task implements as its own explicit DoD checklist line — a reference to 'the table' or 'the Falsifier above' is not enough for an Implementer working from this file alone." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | `methodology` |
| Edit | `/akili-specify`'s task-template authoring step should require that every row of a task's linked `requirements.md` defect-class table be restated as its own line in that task's `tasks.md` Definition of Done — not merely cited by reference — so an Implementer working only from the task file (not independently cross-referencing the requirements doc) cannot satisfy every literal DoD line while still missing a named gate. Evidence: `onecgiar_pr` spec `results/result-center-auto-apply-filters`, `RCF-T-1` attempt 1 FAIL (two defect-class-table rows named in `requirements.md` §9 were absent from `tasks.md`'s DoD; caught only by the Reviewer independently re-reading the requirements doc). |
| Severity | Medium |
| Status | pending |
