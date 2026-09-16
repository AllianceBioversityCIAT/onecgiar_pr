# Archive Summary — Previously Reported Badge for Replicated Results

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/results/previously-reported-badge` |
| Slug | `previously-reported-badge` |
| Archive Date | 2026-09-16 |
| Final Status | Completed (PASS, Committed & Pushed) |
| Related Commit | `b18c365c3` |

## 2. Original Spec Path

`docs/specs/results/previously-reported-badge`

## 3. Archive Date

2026-09-16

## 4. Final Status

**Completed.** All 4 tasks executed and passed. Backend queries updated to project `r.is_replicated`, frontend components updated to render "Previously reported" badges using design system tokens (`--pr-color-primary-100` / `--pr-color-primary-700`). All unit tests passing, lint clean, committed and pushed to `qa-development-2026-ss`.

## 5. Requirements Delivered

- `REQ-1`: Results Center table displays a visual badge "Previously reported" next to the result title when `is_replicated` is truthy.
- `REQ-2`: Innovation Packages table displays a matching visual badge "Previously reported" for replicated innovation packages.
- `REQ-3`: Backend queries `AllResultsByRoleUserAndInitiativeFiltered`, `getAllInnovationPackages`, and `getAllInnovationPackagesFiltered` project `r.is_replicated`.
- `REQ-4`: Applies to all result types replicated from a previous phase.

## 6. Files Changed Summary

- `onecgiar-pr-server/src/api/results/result.repository.ts` — Projected `r.is_replicated`.
- `onecgiar-pr-server/src/api/results/result.repository.spec.ts` — Verified `r.is_replicated` presence in SQL query.
- `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts` — Projected `r.is_replicated` in both filtered and unfiltered queries.
- `onecgiar-pr-server/src/api/ipsr/ipsr.repository.spec.ts` — Unit tests for both repository queries.
- `onecgiar-pr-client/.../results-list/results-list.component.html` & `.scss` — Rendered `.rc-badge-replicated`.
- `onecgiar-pr-client/.../results-list/results-list.component.spec.ts` — Unit test for badge differentiation.
- `onecgiar-pr-client/.../innovation-package-custom-table.component.html` & `.scss` — Rendered `.new_tag.prev-reported`.
- `onecgiar-pr-client/.../innovation-package-custom-table.component.spec.ts` — Unit test for badge differentiation.

## 7. Test Evidence Summary

- `result.repository.spec.ts`: 47/47 passed.
- `ipsr.repository.spec.ts`: 14/14 passed.
- `results-list.component.spec.ts`: 76/76 passed.
- `innovation-package-custom-table.component.spec.ts`: 50/50 passed.
- `npx ng lint --quiet`: Clean (0 errors).

## 8. Validation Summary

- Verified across all unit test suites and manual validation checklist.

## 9. Accepted Warnings Or Follow-Ups

- None.

## 10. Historical Notes

- Clean end-to-end execution covering server projection, client table templates, SCSS design tokens, and unit test suites.
