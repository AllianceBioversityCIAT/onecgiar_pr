# Kaizen Entry — changes/innovation-use-nature-all-actors

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-nature-all-actors` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 11 | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 2 (T-6 x1, T-8 x1) + T-8 reopened to attempt 3 after a PRTest finding | execution.md — INA-T-6, INA-T-8 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md); 1 HITL defect (Households tick, result 10122) | execution.md — INA-T-8 REOPENED |
| Validation FAIL / WARN | n/a (prtest + TEST HITL in execution.md) | execution.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 (no REVIEW_SKIPPED task) | execution.md |
| Budget tripwire | 1 after T-4 (about 1,560 vs 1,450 LOC; user raised to about 2,600) | execution.md — Budget tripwire |

## Lessons

- **KZ-changes--innovation-use-nature-all-actors-1 — Client tasks keep failing first review on the folder `CLAUDE.md` re-stamp because the Implementer brief does not name it.** (Product + Methodology, Medium)
  - Root cause: `onecgiar-pr-client/CLAUDE.md` section 10 requires updating and re-stamping the touched folder's `CLAUDE.md`, but the Implementer attempt 1 treats it as optional doc work, so the Reviewer catches it every time. Per-spec entries have logged this as "noted, not a lesson" at least 4 times, so the recurrence threshold is crossed.
  - Evidence: execution.md — INA-T-6 attempt 1 and INA-T-8 attempt 1 (the only issue in both FAILs, Violated Rule: `onecgiar-pr-client/CLAUDE.md` §10). Prior occurrences: `kaizen/bugfix--bilateral-status-dropdown-overlay.md`, `kaizen/bugfix--bilateral-save-draft-footer.md`, `kaizen/bugfix--phase-filter-missing-phases-prod.md`, `kaizen/bilateral--replicated-innovations-2026-pa--center-overview-no-project-line.md`.
  - Standardization: → P1 (local), P2 (upstream)

## Noted, not a lesson

- Tripwire fired on test volume: one spec file of about 917 lines against a design estimate of about 700 for the whole spec, while prod LOC (about 96) and review rounds stayed in budget. First occurrence; feeds the estimate rule (estimate tests per rule, not per spec).
- T-8 Households defect: `selectCountUnit` ticked the box once but left it editable, and loaded rows were never normalised. A form invariant ("Households = total only") enforced in one component but not in the second one that reuses the same fields. First occurrence.
- CI `backend checks` OOM (2 suites SIGKILL at about 2 GB) cleared by re-running; unbounded Jest on a shared pipeline. Follow-up proposed, not done.
- Manual prod SQL needs the prod DEFINER and `SHOW CREATE FUNCTION` before-body; handled by `before.prod.sql` snapshot.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` (append-only, harness-role rule) |
| Edit | `- Client tasks: before reporting done, update and re-stamp (Verified:) the CLAUDE.md of every touched folder per onecgiar-pr-client/CLAUDE.md section 10; the Reviewer fails the task without it (KZ-changes--innovation-use-nature-all-actors-1).` |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Implementer persona template: add a pre-report checklist line "update and re-stamp the folder-level agent guide of every touched folder when the project declares such a convention". |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None: the innovation-use module guides were updated inside the spec (T-6, T-8, T-9). No new module for the root guides. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |

### P4

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/CLAUDE.md` |
| Edit | Check at apply time whether any guide still says `use_nature`/`count_unit` apply to Farmers only (superseded by this spec, BIF-OQ-1 and IFC-R-1 for `use_nature`); none was found in the root guides read for this archive. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | — |
| Edit | None: no TRD decision overturned. If `docs/trd/trd.md` records "use_nature is Farmers-only", supersede it with: use_nature applies to every Innovation Use actor type (W1/W2 required, W3 optional). |
| Severity | Low |
| Status | pending |
