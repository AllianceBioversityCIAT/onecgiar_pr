# Archive Summary — bugfix/bilateral-project-codes

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/bilateral-project-codes/` |
| Archive Date | 2026-11-13 |
| Ticket | INC-164536 |
| Final Status | Done. Code in master; data fixed and verified in PROD. Reporter reply open |

## Requirements Delivered

| Requirement | Status | Evidence |
|---|---|---|
| BPC-R-1: `bilateral_projects[]` items carry `external_code` (`null` when unknown) | Done | 2587e28b0, in master |
| BPC-R-2: payload contract doc + change log | Done | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| BPC-T-2: projects moved 1353 → 49, Alliance codes loaded | Done | execution.md "BPC-T-2 post-checks" |
| BPC-NFR-2: exposed key never copied | Done | Reviewer PASS |

## Files Changed Summary

`bilateral.service.ts` (+10/−6), `bilateral.service.spec.ts` (+74), `bilateral-result-summaries.en.md` (+2/−1). Data writes in CLARISA PROD on 2026-10-06: 12 owner rows and 31 codes.

## Test Evidence Summary

- Red, then green: 3 failing cases before the fix; 134/134 after it. Lint clean.
- PROD checks on 2026-11-13, PRMS and CLARISA give the same counts:

  | Check | Result |
  |---|---|
  | Projects still owned by 1353 | 0 |
  | Projects owned by 49 | 85 |
  | Of those, with a code | 84 |
  | Org 49 projects without a code | only id 233 |

## Validation Summary

No `validation-report.md` (Lite · Bug Mode). The user accepted archiving on the strength of the Reviewer PASS and the PROD checks.

## Accepted Follow-Ups

| Follow-up | Owner |
|---|---|
| Reply to the reporter: the field is live, `"ABC"` is now `"Bioversity (Alliance)"`, and they must rotate the exposed key | Santiago |
| Re-index OpenSearch so search shows the new owner and codes | Juan David (status unknown) |
| Code for project 233 (missing from the Alliance mapping file) | Alliance |
| Optional: run the `contributors-and-partners.mapper` specs against the new shape (Reviewer advisory) | — |

## Historical Notes

- The runbook's "32" was the number of moved and mapped projects only. Org 49 already held other coded projects, so the real total is 85/84.
- The planned PRMS ↔ CLARISA join cannot run, because `clarisadb8` is on a different server. The same counts were run separately on each database instead.

## Diagrams

None.
