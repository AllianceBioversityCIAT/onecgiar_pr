# Archive Summary — Previously reported tag + grouped versions on the SP Results list

> **Outcome:** delivered. The SP Results tab marks carried-over results with the Results Center `Previously reported` pill. Its versions of one result code read as one block under any sort. All 4 tasks passed review on the first attempt.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `result-framework-reporting/programme-results-previously-reported` · Lite · gated |
| Ticket | P2-3953 |
| Branch | `qa-development-2026-ss` |
| Implementation commit | `f456f64ee` (pushed 2026-10-13) |
| Archived by | `/akili-archive`, 2026-10-13 |

## 2. Original Spec Path

`docs/specs/result-framework-reporting/programme-results-previously-reported/`

## 3. Archive Date

2026-10-13

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 4 of 4 `[x]` (PRP-T-1..T-4), each with a Reviewer PASS on attempt 1 |
| Pivot | 1 scope amendment (PRP-R-5, grouping). The user approved it after HITL-1 |
| HITL-1 | Pill and block look confirmed by the user on SP09 (2026-10-13) |
| `test-report.md` / `validation-report.md` | **Not produced, accepted.** The user asked to close the spec. Evidence comes from the per-task Jest runs, the mutation checks and HITL-1 |

## 5. Requirements Delivered

| ID | What | Proven by |
|---|---|---|
| PRP-R-1 | Pill on every replicated row, decided by the row flag | PRP-TEST-1, PRP-TEST-2, HITL-1 |
| PRP-R-2 | Same wording, tooltip and look as the Results Center, which is unchanged | Exemplar values matched · `git diff` on `pages/results/` empty · HITL-1 |
| PRP-R-3 | The pill stays whole and the title truncates | flex / `flex: none` structure · HITL-1 |
| PRP-R-4 | Search, CSV, counters, total and paging unchanged | PRP-TEST-2, PRP-TEST-4 |
| PRP-R-5 | Versions of one code stay together under any sort and are drawn as one block | PRP-TEST-3, PRP-TEST-4, HITL-1 |
| PRP-NFR-1..3 | Client only · tokens · read as text | Diff scope · scss · no `aria-hidden` |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| `programme-results/` | `services/programme-results.service.ts` + spec · `programme-results.component.ts/.html/.scss` + spec · `CLAUDE.md` (contract lines and a fresh `Verified:` stamp) |
| `shared/components/pr-table/` | `pr-table.component.ts` + spec. Opt-in `groupBy`; the default path is unchanged |

The diff totals 9 code files and about 420 lines, including tests. There are no server, payload or migration changes.

## 7. Test Evidence Summary

| Check | Result |
|---|---|
| Final scoped Jest run (`pr-table\|programme-results\|my-work-board`, `--runInBand`) | 14 suites · 518 tests · all passed |
| Red-first runs | T-1: 11 failed before the change · T-3: 4 failed before the change |
| Mutation checks | 5 of 5 failed the intended test: `@if` dropped, pill text in CSV, `groupBy` ignored, `groupBy="code"` dropped (T-1's `!!flag` check was reasoned, not run) |
| Lint / types | eslint clean (`ESLINT_USE_FLAT_CONFIG=false`) · `tsc` clean (T-1) |

## 8. Validation Summary

There was no `/akili-validate` run, by user decision. The substitutes were the Reviewer PASS on every task and the user's visual check on SP09.

## 9. Accepted Warnings Or Follow-Ups

| Follow-up | Source |
|---|---|
| Checkbox alignment on grouped rows is not visually checked; fix with `:not(:first-child)` if it is off | T-4 advisory 1 |
| Test hardening: a positive control for the search test, `URL.*` restore in the CSV tests, a robust line-1 selector, a `statusCounts()` assertion, and a descending fixture that differs from the input order | T-2 / T-3 / T-4 advisories |
| The `pr-table` class docblock should mention `[groupBy]`; document the null/undefined group-key behaviour | T-3 advisories |
| Trim the folder `CLAUDE.md` (203 lines, above the 120-line cap) | T-4 advisory 3 |
| Extract a shared `Previously reported` badge (Results Center + `innovation-package-custom-table`) | `tasks.md` §7 |
| Fix the stale payload-key list in the `ProgrammeResultRow.updated` doc comment | `tasks.md` §7 |
| Run `codegraph sync`, because `pr-table` changed | Archive Step 3 |

## 10. Historical Notes

- The spec was approved as **Option A (tag only)**, with proposal OQ-1 (stacking) parked for the BA. At HITL-1 the user, who was also the requester, asked for the stacked look from their Results Center screenshot. It came back as PRP-R-5 through a Pivot Record, which raised the budget from 2 to 4 tasks.
- Free RAM was 1.1–1.8 GB. The user authorised running anyway, so every Jest run used `--runInBand`.
- The user's two answers on how to draw the block conflicted (code shown once vs. code repeated in their screenshot). The screenshot won. The violet border was dropped under UI hard rule 7.
