# Archive Summary — Global Search Does Not Find Result 20694 In Production

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bugfix/global-search-prod-deploy` |
| Slug | `global-search-prod-deploy` |
| Author | Santiago Sanchez Correa |
| Archive Date | 2026-09-16 |
| Final Status | Resolved (Shipped & Verified in Production) |
| Related Commit | `27dd8f47b` |

## 2. Original Spec Path

`docs/specs/bugfix/global-search-prod-deploy`

## 3. Archive Date

2026-09-16

## 4. Final Status

**Resolved.** The code fix in commit `27dd8f47b` was promoted to `master` and deployed to production (`reporting.cgiar.org`). The user confirmed that searching `20694` in the production global search palette now returns the matching result as expected.

## 5. Requirements Delivered

- Global search palette matches numeric `result_code` (e.g., `20694`) in addition to titles.
- Relevance ranking prioritizes exact code matches.
- Recent search tracking remains functional.

## 6. Files Changed Summary

From commit `27dd8f47b`:
- `onecgiar-pr-server/src/api/results/result.repository.ts` — Query extended with `OR r.result_code LIKE ?` and relevance ordering.
- `onecgiar-pr-client/src/app/shared/components/global-search-palette/global-search-palette.component.ts` — Result code display and keyboard navigation.
- `onecgiar-pr-client/src/app/shared/components/global-search-palette/global-search-palette.service.ts` — Search query handling and history.

## 7. Test Evidence Summary

- Local and staging verification confirmed working prior to release.
- Production smoke test verified: search for `20694` returns the correct result on `reporting.cgiar.org`.

## 8. Validation Summary

- Verified by human user on production environment with live screenshots.

## 9. Accepted Warnings Or Follow-Ups

- None.

## 10. Historical Notes

- This was a release promotion issue: the bug fix was already committed and verified on `staging`, but production had not yet received the deployment from `master`.
