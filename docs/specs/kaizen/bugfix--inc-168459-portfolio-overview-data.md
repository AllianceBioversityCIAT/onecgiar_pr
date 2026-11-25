# Kaizen Entry — bugfix/inc-168459-portfolio-overview-data

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/inc-168459-portfolio-overview-data` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-3 attempts 1 and 2) | execution.md — POD-T-3 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (HITL PASS with one accepted 390 px warning) | execution.md — POD-T-2 HITL 2026-11-23 |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 (T-3's skip claim was overridden) | execution.md — POD-T-3 |
| Escaped defects (§3) | 0 | execution.md |
| Budget tripwires | 2 (LOC +363 vs about 260; review rounds 5 vs 4), both accepted by the user | execution.md — Gate decisions 2026-11-19 |
| Runtime incident | 1 (worker repo-wide `git stash`, no loss) | execution.md — POD-T-1 Issues |

## Lessons

- **KZ-bugfix--inc-168459-portfolio-overview-data-1 — The Leader copied a Reviewer's unmeasured number into the next brief, so the same wrong premise cost a second review round.** (Product + Methodology, Medium)
  - Root cause: in POD-T-3 attempt 1 the Reviewer said the guide was "already 122 lines". The Leader put "pre-existing overage, do not shrink" in the attempt-2 brief without running `git show HEAD:<file> | wc -l`, which gives 120. Attempt 2 failed on the cap, and attempt 3 fixed it. The check takes one command.
  - Evidence: execution.md — POD-T-3 attempt 2 ("The Leader's attempt-2 brief had carried the Reviewer's wrong premise") and "Issues encountered" (cost: one review round of the 5 that tripped the budget).
  - Standardization: → P1 (local), P2 (upstream)

## Noted, not a lesson

- Workers must never `git stash` a shared tree: recurrence of an existing lesson, see P3.
- `migration:check` could not run locally (no MySQL, probe-confirmed: no `docker`, port 3306 closed); the user deferred it to the CI `migration:check:ci` gate. Routine for a change with no schema impact.
- A `skip-eligible` claim on a task that edits an agent guide was correctly overridden by the Review-intensity rule (a). The rule worked.
- Jest red evidence from a `TypeError` (missing export) is not behavioural evidence; the Implementer already discounted it. First occurrence.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (append, brief-writing rules) |
| Edit | `- Before a brief states a number (line count, test count, size) taken from a Reviewer or Implementer report, run the one command that measures it and quote the output (KZ-bugfix--inc-168459-portfolio-overview-data-1).` |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | `methodology` |
| Edit | Leader persona / `akili-execute` rework step: a rework brief must not carry a factual premise from the previous FAIL report unless the Leader measured it at HEAD; the brief quotes the measuring command and its output. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope-2` |
| Edit | Add `bugfix/inc-168459-portfolio-overview-data` as a source (a POD-T-1 Implementer ran a repo-wide `git stash` / `pop` and briefly reverted the other Implementer's client files). Same root cause as `bugfix--contribution-target-anchor-1` and `bugfix--innovation-use-youth-required-3`: several specs hit the shared-checkout stash. Raise severity from Low to Medium and move the "no `git stash` / `restore` / `checkout --` in a shared tree" rule into the worker brief template. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None to write: the module guide `portfolio-overview/CLAUDE.md` was updated inside the spec (POD-T-3, stamp re-done, 119 lines). No new module; root guides name nothing this spec changed. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | — |
| Edit | None identified from the spec evidence: no guide claim about the three P/A blocks listing every Program/Accelerator was found falsified outside files the spec already edited. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |

### P6

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` (module `results-framework-reporting`, dependencies) |
| Edit | Record POD-DD-1: `results-framework-reporting` reads the per-phase switch (`PhaseInitiativeReportingAccess`, owned by `admin-panel`, `reporting_enabled = false` for the resolved version) to hide switched-off Programs/Accelerators from the three Portfolio Overview seeds. Aggregation is not filtered, so totals are unchanged. A shared read helper for the switch is a later option. No ADR number (allocated at apply time). |
| Severity | Low |
| Status | pending |
