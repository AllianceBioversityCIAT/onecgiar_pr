# Kaizen Entry — changes/kp-related-strongest-first

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-related-strongest-first` |
| Date | 2026-10-23 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (the user then asked to continue to the end) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (3 code, 1 PRTest acceptance) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-3: unapproved copy, plus a partial copy test) | execution.md — KRS-T-3 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 (no test-report; PRTest 7/7) | execution.md — KRS-T-4 |
| Judgment-day severe findings | n/a | — |
| Validation FAIL / WARN | n/a (no validation-report; the user accepted archiving) | archive-summary.md |
| Budget | LOC about 710 vs about 500 (+40%, all tests); rounds within range | execution.md — Budget check |

## Lessons

- **KZ-changes--kp-related-strongest-first-1 — The Implementer added user-visible copy that no spec defined, to give a rule "something to show".** (Product + Methodology, Medium)
  - **Root cause:** design §8 is the copy contract, but neither the brief nor the Implementer persona says the copy table is a closed list. The Implementer read "count not presented as filtered" (R-3) as needing a positive indicator. It invented the line "Only KPs with a matching subject, Center or Science Program are listed." That line also over-promised, because of the accepted stemming residual (design §10).
  - **Evidence:** execution.md — KRS-T-3, attempt 1, Reviewer issue 1 (Violated Rule: design.md §8 copy contract; KRS-R-2 accepted-residual clause).
  - **Standardization:** → P1 (local). Upstream recommended: it is stack-agnostic.

## Noted, not a lesson

- **Leader write-order slip.** The T-4 `[x]` landed in tasks.md a moment before its execution.md entry, because the entry write failed on a Python escape error. It was fixed in the same minute and is recorded in execution.md. One-off tooling slip: use raw strings for Windows paths in inline scripts.
- **Probe vs live totals.** The T-1 live probe approximated project inputs (titles, keywords) without the PRMS DB. Its totals differed from PRTest (494 vs 444, 1073 vs 1419), but the direction held. Below the lesson bar. If a future spec gates on probe numbers, pull the real project record first. This relates to KRR P1 ("design against real records").
- **Spec literal vs test input.** The T-2 append test fed [None, Strong] where the spec wrote [Strong, None]. The Reviewer judged it stronger. No action.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` (append to scope rules) |
| Edit | "User-visible text is a closed list: ship only strings that design.md (or the task) defines verbatim. If a requirement seems to need new copy, report it under `Not Done / Assumptions` for the Leader — never invent it." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-notifications--bell-read-state-1` |
| Edit | Add source `changes/kp-related-strongest-first` as a recurrence. LOC was now measured, and the tripwire fired at the end of T-3. The overrun again came entirely from tests: server tests were about 263 LOC against about 110 planned (byte-identity loops over 3 adapters × related/linked/non-project). KRR showed the same pattern (about 4×). Suggest that budget estimates size test LOC at about 2× prod for contract and byte-identity work. Merge with the KRR recurrence at apply time. |
| Severity | Medium |
| Status | pending |
