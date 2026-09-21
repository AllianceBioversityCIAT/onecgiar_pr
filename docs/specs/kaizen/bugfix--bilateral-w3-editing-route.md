# Kaizen Entry — bugfix/bilateral-w3-editing-route

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-w3-editing-route` |
| Date | 2026-09-15 |
| Branch | qa-development-2026 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 1 | proposal.md § Bug Diagnosis |
| Judgment-day severe findings | 0 | execution.md |
| Validation FAIL / WARN | 0 / 0 | archive-summary.md |
| Leader-inline audits | 2 | execution.md |

## Lessons

### L1 — Polymorphic route destination consolidation across list surfaces
- **Root Cause:** Multiple list views (`programme-results` and `results-list`) maintained separate, ad-hoc predicate implementations (`usesBilateralReviewFlow`) to decide whether a row should open the bilateral review drawer or Result Detail. Both omitted `status_id = 1` (Editing), inadvertently sending editable bilateral draft rows to an empty review drawer.
- **Evidence:** `proposal.md` § Bug Diagnosis, `programme-results.component.ts`, `results-list.component.ts`.
- **Classification:** Product.
- **Action:** Consolidate polymorphic routing rules into a shared utility (`shared/routing/bilateral-result-open-route.util.ts`) backed by a comprehensive unit test matrix covering all status and funding origin permutations, ensuring all table views and copy-link actions share identical navigation logic.

## Noted, not a lesson

- Copy link actions in both Programme Results and Results Center rely on the same routing utility to guarantee URL fidelity with row activation clicks.
- Carry-forward update eligibility predicate was decoupled from open-route logic via `isW3BilateralForUpdate`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/shared/routing/AGENTS.md` |
| Edit | Document the 3-way bilateral result open-route resolution pattern (`shared/routing/bilateral-result-open-route.util.ts`). |
| Severity | Low |
| Status | pending |

