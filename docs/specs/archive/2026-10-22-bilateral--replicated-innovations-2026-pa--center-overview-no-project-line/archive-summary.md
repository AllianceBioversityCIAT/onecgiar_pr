# Archive Summary — "Updated 2025 innovations with no 2026 project" line in the Center Overview

**Outcome:** shipped to PRTest and verified live on CIP. The line shows 52, and Results shows the same 52. The Overview identity holds: 18 + 3 + 52 + 49 = 122. All 5 tasks passed on the first attempt.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/replicated-innovations-2026-pa/center-overview-no-project-line` (family child #2) |
| Ticket | Freshdesk INC-164073 |
| Owner | Santiago Sanchez |
| Branch | `qa-development-2026-ss` → `performance-refactor` (PRTest) |
| Commits | `7fc31ddb1` (code + spec), `77897c6bb` (T-5 closure); perf merge `d35c6e9ff` |

## 2. Original Spec Path

`docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-no-project-line/`

## 3. Archive Date

2026-10-22

## 4. Final Status

**Done.** CNP-T-1..T-5 are `[x]`. No `/akili-test` or `/akili-validate` was run; the owner accepted their absence, as for sibling child #3. The evidence is the per-task Reviewer PASS, the scoped Jest runs and the live PRTest check.

## 5. Requirements Delivered

| Req | What | Evidence |
|---|---|---|
| `CNP-R-1` | Bucket = replicated + type 7/2 + W3 + no project, counted live, no double count | T-1 truth table, T-2 identity spec, T-5 live 18+3+52+49 = 122 |
| `CNP-R-2` | Line links to Results through `group=updated-no-project`; removable chip; Overview ignores `group`; Reporting/Draft links never carry it | T-3, T-4 specs; T-5 live |
| `CNP-R-3` | Hidden at 0; empty state accounts for it | T-3 specs; T-5 Reporting 2025 (absent) |
| `CNP-R-4` | Generic no-project line excludes the bucket, `null` when empty | T-2 specs |
| `CNP-R-5` | Label "Updated {Y−1} innovations with no {Y} project" + a11y summary sentence | T-2, T-3 specs; T-5 live text |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Shared contract | `pages/bilateral/bilateral-result-filter.ts` (`isUpdatedNoProjectRow`, `UPDATED_INNOVATION_TYPE_IDS`), `bilateral-query-params.ts` (`group` key) |
| Overview | `bilateral-overview.aggregate.ts`, `.charts.ts`, `.component.ts`, `.component.html`, `CLAUDE.md` (trimmed to 120 lines) |
| Results tab | `bilateral-results-list.component.ts`, `CLAUDE.md` |
| Specs | 7 spec files (+ compile-only `group: null` in 2 helpers) |
| Size | 16 client files, +527 / −37 (≈110 production LOC; the rest is tests and guides) |

## 7. Test Evidence Summary

- **Red → green per task:** every task's new cases failed on behavior before the change.
- **Final pre-push run:** `--findRelatedTests` on all 6 changed source files → 35 suites / 1538 tests green.
- **Other checks:** `tsc -p tsconfig.app.json` clean; `ng lint` clean on touched files.

## 8. Validation Summary

- **Reviewer:** 4 code tasks, 4 PASS, 0 FAIL, 0 rework.
- **Live (CNP-T-5, PRTest, CIP, Reporting 2026):** all 12 checks ✅. Those cover the count match, the identity, the link params, chip removal, the chip not being sticky, `?group=` isolation, deep links, 1920/899/375 px, and Reporting 2025.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner / where |
|---|---|---|
| 1 | Compare the 52 with Nicoleta's 13-Oct "Without 2026 project" sheet in the INC-164073 reply (owner decision: moved out of T-5) | owner |
| 2 | `bilateral-results-list/CLAUDE.md` is 185 lines vs the 120 cap (176 at HEAD before this spec) | kaizen P1 (guide-sync) |
| 3 | The "Twelve keys" header comment in `bilateral-query-params.ts` and design `CNP-DD-2` "(12)" should both read 13 | small follow-up |
| 4 | A hand-typed `?group=` on Results without `role`/`source` skips the W3+Lead default (spec silent; the Overview link always sends explicit defaults) | decide if needed |
| 5 | Optional test hardening: `type:[1]` filter-to-0 case; isolated `deepLinkParams` group case | optional |
| 6 | `codegraph sync` after merge | owner |

## 10. Historical Notes

- T-2 and T-4, then T-3 and T-4, ran in parallel. A shared lock directory serialized every Jest and `tsc` run, so only one test run was on the machine at a time.
- The first PRTest attempt (2026-10-21) found the server slow, with a blank page, and was abandoned without a reading. The check on 2026-10-22 confirmed the served bundle first.
- Chrome did not honor a window resize while maximized. The 899 and 375 px checks loaded the same page in a fixed-width, same-origin iframe.
- With this child done, every child of `replicated-innovations-2026-pa` is done.
