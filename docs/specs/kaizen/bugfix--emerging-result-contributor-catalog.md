# Kaizen Entry — bugfix/emerging-result-contributor-catalog

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/emerging-result-contributor-catalog` |
| Date | 2026-09-09 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (`ERC-T-1`, `ERC-T-2`) | tasks.md |
| Reviewer FAIL rework attempts | 1 (`ERC-T-1` attempt 1 FAIL — vacuous async test assertion — attempt 2 PASS) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (`ERC-T-1`'s target component turned out not to be the live "Report emerging result" entry point) | execution.md — `## Pivot Record: ERC-T-1` |
| PRODUCT_BUGs | n/a — no `test-report.md` (Lite bugfix executed inline) | — |
| Validation FAIL / WARN | n/a — no `validation-report.md` (Reviewer PASS + user manual browser verification substituted) | — |

## Lessons

- **KZ-bugfix--emerging-result-contributor-catalog-1 — A `requirements.md` "user-confirmed, no grep needed" reachability assumption was accepted without a live-code grep, and was already stale at confirmation time.** (Product + Methodology, Medium)
  - Root cause: `requirements.md` §9 recorded "user-confirmed (2026-09-09): `openReportResultModal` is the only caller that opens this modal with `indicators: []`... no grep/verification step is needed during implementation." That claim was about **code reachability** (which component a named UI flow, "Report emerging result", actually routes through) — not a visual/UX detail a person can reliably hold in memory across a fast-moving codebase. The claim had in fact been false since 2026-09-05 (`changes/emerging-result-cta-placement` moved the flow to a different component, `lab-report-form.component.ts`), four days before this spec's own confirmation date. `ERC-T-1`'s pre-flight grep (`tasks.md` §2) only checked "does another spec touch this same target file" — it never asked "does the file even own the flow the requirement names." `ERC-T-1` was implemented, reviewed twice, and PASSed against a component that was no longer reachable from the described user action; the miss surfaced only when the user manually re-tested the live browser flow.
  - Evidence: `execution.md` — `## Pivot Record: ERC-T-1`; `requirements.md` §9 Assumptions; `tasks.md` §2 pre-flight checklist (the "only caller" risk item).
  - Standardization: → P1 (Product, local template edit) + upstream recommendation (Methodology, no local edit — see below).
  - Methodology recommendation (upstream to the AKILI repo): `docs/specs/general-setup/requirements.md`'s Assumptions section should carry a standing note that a "user-confirmed, downgrade the grep" reachability claim (as opposed to a visual/UX assumption) requires at least one live code-search for the named UI action's current handler before the pre-flight grep is allowed to be downgraded to a "cheap sanity check" — user confirmation is not a substitute for verifying against current `HEAD`, because the user's own memory of the codebase can itself be stale.

## Noted, not a lesson

- None below the lesson bar this cycle — the pivot and its single rework attempt are the only two non-clean signals, and both are captured in the one lesson above.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` §9 "Assumptions" |
| Edit | Add: "A reachability assumption ('component X is the only caller of flow Y') MUST be backed by a live grep for the named flow's current handler before being accepted as `user-confirmed, no verification needed` — a person's confirmation reflects their memory of the code, not its current state." |
| Severity | Medium |
| Status | pending |

