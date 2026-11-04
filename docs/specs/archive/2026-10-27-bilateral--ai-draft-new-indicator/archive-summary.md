# Archive Summary — Bilateral AI Draft Results: "New" Indicator

**Outcome: delivered and validated (PASS).** 5/5 requirements are met, with 0 FAIL, 0 PRODUCT_BUG and 0 open WARN. The code is still uncommitted on `qa-development-2026-mc-2`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | Bilateral AI Draft Results: "New" indicator for freshly generated drafts |
| Requirement prefix | `ADN` |
| Depth / Approval Mode | Standard / gated |
| Owner | Maria Camila Giraldo |
| Branch | `qa-development-2026-mc-2` (base `c3dd5409c`) |

## 2. Original Spec Path

`docs/specs/bilateral/ai-draft-new-indicator/`

## 3. Archive Date

2026-10-27 → `docs/specs/archive/2026-10-27-bilateral--ai-draft-new-indicator/`

## 4. Final Status

| Phase | Result |
|---|---|
| Judgment Day (design) | APPROVED ✅ after round 2 (JD-1 critical, fixed) |
| Execute | 2/2 tasks PASS on attempt 1; HITL visual check approved; budget overrun accepted |
| Test | PASS: 65 suites / 2610 tests; 8 gap tests added |
| Validate | PASS: 2 WARN found and fixed |

## 5. Requirements Delivered

| ID | Requirement | Status |
|---|---|---|
| `ADN-R-1` | Mark drafts of fresh own jobs as New | Delivered |
| `ADN-R-2` | Indicator appears as soon as the job completes (auto-refresh, filters and aside kept) | Delivered |
| `ADN-R-3` | Indicator clears when the user leaves the tab or switches center | Delivered |
| `ADN-R-4` | "New" text badge, pattern-10 violet tokens, accessible name, no header overflow | Delivered |
| `ADN-R-5` | No data or status change | Delivered |

## 6. Files Changed Summary

All files are client-only, under `onecgiar-pr-client/src/app/`.

| File | Change |
|---|---|
| `pages/bilateral/services/bilateral-ai.service.ts` | `freshDraftJobIds` signal, `consumeFreshDraftJobs`, one reload per poll on own completion, latest-wins `draftsRequestSeq` guard |
| `pages/bilateral/pages/my-draft-results/my-draft-results.component.ts` / `.html` | `DraftSessionGroup.isNew`, the "New" badge, a `shownFreshIds` consume on destroy and on center change |
| `internationalization/bilateral-ai-processes.copy.ts` | `drafts.newBadge` strings |
| `pages/bilateral/pages/my-draft-results/CLAUDE.md` | Contract and traps updated (119 lines) |
| Two `.spec.ts` files | 20 author tests + 8 tester gap tests |

The diff is ≈480 LOC against a ~290 budget. About 92 LOC are production; the overrun is in the tests.

## 7. Test Evidence Summary

- Jest bilateral: `Test Suites: 65 passed` · `Tests: 2610 passed`. `ng lint` is clean, `tsc` OK, and the dev build is OK.
- HITL Cypress CT probe at 375 / 900 / 1000 / 1280 px: no header item was displaced, and contrast is AA (violet-700 on violet-50).
- Mutation probes showed the new tests catch a PATCH injection and a removed center-switch consume.

## 8. Validation Summary

`validation-report.md` gives PASS, ready to archive. Two WARNs were fixed at validation:

- **WARN-1:** the Done checkboxes in `tasks.md` were ticked.
- **WARN-2:** the `sr-only` text now starts with a space, and C1 asserts it.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| Commit and PR to `staging`; CI; staging manual QA (`tasks.md` §7) | Open: the user commits |
| `ADN-AC-2` relies on server scoping of the jobs list (C-2 / P-1) | Accepted assumption |
| Session-only state (lost on reload after finish) | Product decision (§3.3) |
| A-1: unused `mdr-new-badge` class | Follow-up (cosmetic) |
| A-2: the guide trim dropped 2 facts | Kaizen pending item P3 |
| A-3: X→null gap / same-flush center+list swap | Noted; not reachable in the app |
| A-6: client `CLAUDE.md` rule 21 (lucide) vs DD-12 (`material-icons-round`) | Kaizen pending item P4 |

## 10. Historical Notes

- Revision 1 proposed a violet left accent on the card. Judgment Day found it could not render: an unlayered `--me` SCSS border beats the layered Tailwind utilities. The design moved to a badge-only approach (DD-4, P-9).
- The round-1 premise that `xl` fires near 960 px was wrong; it is 1280 px (P-14). The HITL widths were corrected before execution.
- The design's "read-only signal" wording was amended at execute time to "writable `ReadonlySet` signal" (`execution.md`, ADN-T-1).

## 11. Diagrams

The spec has no `diagrams/` folder and no baseline diagram slot was affected. `design.md` §2.2 holds a text sequence only.
