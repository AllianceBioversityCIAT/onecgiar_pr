# Kaizen Entry — bugfix/ipsr-empty-state-active-check

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ipsr-empty-state-active-check` |
| Date | 2026-11-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 (planned 2) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 2 (T-2 placeholder row; T-6 reference component) | execution.md — Pivot Record `IPSR-ESC-T-2`, Pivot Record 2 |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Judgment-day severe findings | none recorded | design.md |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 2, both caught at the HITL check before commit (Pivot 1, Pivot 2) | execution.md |

## Lessons

- **KZ-bugfix--ipsr-empty-state-active-check-1 — A fix copied from a "reference implementation" was approved without auditing that reference or the code that fills the list.** (Product + Methodology, High)
  - Root cause: the Bug Diagnosis traced only the predicate (`item.is_active` truthy), and cited `innovation-use-form.component.ts` as "the reference implementation, already correct" without checking it. Nobody traced what populates the arrays the predicate reads. `getSectionInformation()` auto-pushes a blank row identical to a real unsaved row, so the approved rule made the empty state disappear (Pivot 1), and the "correct" reference had the same gap (Pivot 2). Budget went from 2 tasks / ~30 LOC to 6 / ~110.
  - Evidence: execution.md — Pivot Record `IPSR-ESC-T-2` (root cause: auto-pushed placeholder) and Pivot Record 2 (root cause: reference assumed correct by definition); requirements.md §2 Pivot callout.
  - Standardization: → P1 (local), P2 (upstream)

## Noted, not a lesson

- Both escaped defects surfaced only through the user's manual browser check; the DOM-render gap has no automated gate in this client (requirements "Defect Classes"). Feeds recurrence for "HITL is the only render gate".
- Leader ran on Sonnet against the T1 `opus` registry entry (execution.md Document Control); no defect traced to it.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to the Bug Mode root-cause checklist: "Trace who populates the data the faulty predicate reads (initializers, auto-pushed placeholder rows, post-save reloads), and audit any 'reference implementation' the fix copies for the same defect class — never cite one as correct without checking it." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Bug Mode diagnosis template: require (a) a data-origin trace for the predicate under fix (who writes the values it reads, including defaults and placeholder rows) and (b) an explicit audit of any reference implementation the fix copies. Source: bugfix/ipsr-empty-state-active-check, 2 pivots. |
| Severity | High |
| Status | pending |
