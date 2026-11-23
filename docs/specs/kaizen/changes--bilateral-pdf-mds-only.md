# Kaizen Entry — changes/bilateral-pdf-mds-only

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-pdf-mds-only` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 1 (T-1 attempt 1) | execution.md — BPM-T-1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (local visual check PASS) | execution.md — BPM-T-3 DoD |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 1 (Sonar duplication gate on PR #7, fixed in `dfa8180`) | execution.md — Post-PR fix |
| Review-round overrun | 4 vs 3, accepted by the user | execution.md — Running totals |

## Lessons

- **KZ-changes--bilateral-pdf-mds-only-1 — Verification greps and byte-compare claims in tasks.md were written without a trial render, so three were unsatisfiable.** (Product, Medium)
  - Root cause: tasks.md and requirements.md fixed pass criteria (`"Partners"` -> 0, labels "characterize" / "scaling studies", "byte-identical, timestamp masked") from the design, not from a real render of the fixtures. The first trial showed those labels never print or always match, and rebuilds embed per-build tokens, so the Reviewer failed T-1 and the spec needed four execute-time edits.
  - Evidence: execution.md — BPM-T-1 attempt 1 Reviewer FAIL and advisories (a)(b)(c); "Execute-time spec edits" block.
  - Standardization: -> P1

## Noted, not a lesson

- Sonar duplication gate failed on a 2-line change inside a pre-existing clone block (`common-sections.tsx` copy of `results_p25`). First occurrence; the owner's Sonar rules are known per repo.
- Shared-checkout hygiene: `fixtures/out/fals1..3` scratch left in the tree, flagged by the Reviewer at T-2.
- A CRLF patch mismatch made the first falsifier run invalid (T-2 falsifier 3); redone with `sed`. Same CRLF pattern appeared in `bilateral-partners-mds` T-1 mutation (c): recurrence feed, 2 specs, still a tooling note.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Verification section guidance) |
| Edit | When a task's pass criterion is a grep, label or byte-compare on rendered or generated output, run it once against the real output during specify and record the observed count; criteria that cannot be satisfied are rewritten before approval (KZ-changes--bilateral-pdf-mds-only-1). |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None: the change lives in the separate `alliance-ibd-pdf-viewer` repo; no onecgiar_pr guide describes the bilateral PDF template. Re-check `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` PDF mentions during the bilateral-partners-mds sweep. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | — |
| Edit | None found in the spec's own file list; the PDF behavior claims live in `requirements.md` of this spec and `bilateral-partners-mds` (BPX-R-8 amends the non-KP partners line). |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | No ADR: the spec made no architectural decision (a per-section `mdsOnly` prop in the pdf-viewer). Nothing to record. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | follow-up |
| Target | INC-168048 |
| Edit | Reply to Nicoleta; ask OQ-1 (add non-printed MDS fields?) and OQ-2 (KP partners kept). |
| Severity | Low |
| Status | pending |
