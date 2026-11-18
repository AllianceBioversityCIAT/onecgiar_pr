# Kaizen Entry — bugfix/ai-draft-subnational-geo

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Date | 2026-11-18 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (routine gates pre-approved by the user mid-run, 2026-11-17) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| Budget tripwire | 1 — fired after ADS-T-1 (219 test LOC against ~140; total ~200). User accepted a revised ~280. Final ~397 including `/akili-test` additions | execution.md — ADS-T-1 "BUDGET TRIPWIRE"; validation-report.md §8 |
| PRODUCT_BUGs | 0 | test-report.md |
| Judgment-day severe findings | — (none recorded) | design.md |
| Validation FAIL / WARN | 0 / 2 | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | test-report.md / validation-report.md |
| Drift attributable | — (no drift report read for this spec) | docs/specs/audits/ |

## Lessons

No new lesson. The one real waste signal, the test-LOC overrun that fired the tripwire, has the same root cause as an existing lesson, **KZ-changes--portfolio-overview-revamp--w3-projects-section-2** ("Test LOC … runs about 2× the estimate"). It is recorded as a recurrence (P1) instead of a duplicate. The recurrence matters because it shows the root cause is not confined to that spec family.

## Noted, not a lesson

- **The Tester model rule cannot be met by the `akili-tester` wrapper.** `.claude/agents/akili-tester.md` and `akili-implementer.md` are both bound to `sonnet`, so `/akili-test` always runs inline or needs a manual model override. Here the Leader (`opus`) wrote tests h–m and then validated them in the same session, a self-audit that `validation-report.md` §1 records. This is the first sighting; if it recurs, rebind the wrapper (registry T2 Tester column).
- **Diffs given to the Reviewer by file path.** Both diffs went to the Reviewer as a scratchpad path, against the ≤ 300-line inline rule (execution.md, decisions). No defect resulted.
- **P-7 settled in two rounds.** The first query sample covered CO only, while all real drafts were KH; a second query was needed. A premise check should sample the codes that appear in real drafts, not the spec's example.
- **The full `bilateral` suite took ~16 min for the Implementer and ~3 min on re-run.** Workers waited on it in the background, which accounted for most of the wall-clock time.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-changes--portfolio-overview-revamp--w3-projects-section-2 |
| Edit | Add source spec `bugfix/ai-draft-subnational-geo` with the recurrence note: "Recurred outside the portfolio-overview family. A Lite bugfix whose tests run the real handlers with 7 mocked repositories measured 219 test LOC against ~140 estimated (1.6×), which fired the tripwire at T1. Generalize the lesson: estimate test LOC from the measured ratio of the closest prior spec that used the same test harness, not per family." Raise severity: stays Medium (it caused a stop, not rework). |
| Severity | Medium |
| Status | pending |
