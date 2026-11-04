# Execution Log — Name the tagged Center in the project-tagged notification

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/notification-tagged-center-name` · Depth Lite · Approval Mode: gated |
| Budget (design §8) | 2 tasks · ~50 LOC · 1 review round |

## Task Execution History

### T1 — Add owner Center acronym to the project label (tests first) — PASS

- Date: 2026-09-24
- Implementer attempts: 1 · Reviewer verdicts: 1 (PASS on attempt 1)
- Skills: `nestjs-expert`, `tdd` · effort medium
- Files changed:
  - `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` — `loadCenterIndex()` requests `relations: { clarisa_institution: true }`; project label is `<name> of your center (<acronym || code>)`.
  - `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.spec.ts` — exact string (~395) and AC37 (~626) updated; new S1 test; new S2 `it.each` (no institution / no acronym / empty acronym).
- Verification (Implementer): red before change `6 failed, 29 passed, 35 total`; after `1 suite passed, 35/35`; `npx eslint <service> --quiet` clean. Command: `npx jest --silent --reporters=summary --forceExit --testPathPattern result-tagged-notification`. The Reviewer has no shell and did not re-run.
- Reviewer: **STATUS: PASS.** `byCode` key matches the resolver's code; alias-case miss falls back to the code (valid NTC-R-2 text); relation exists on `ClarisaCenter`; `buildCenterIndex` untouched; scope respected; one `centerRepo.find` per call; no new logs.
- Requirements covered: NTC-R-1, NTC-R-2, NTC-R-3, NTC-NFR-1, NTC-NFR-2 · S1, S2, S3, S5 (S4 inherited, no new code/test).
- Implementer `Not Done / Assumptions` (reviewed by Leader, no scope owed):
  - `notifyTaggedBilateralProjects` (~98) builds a label without "of your center"; left unchanged per design §4.
  - Mocks cannot prove real DB rows carry an institution acronym: accepted risk, requirements §5. Falls back to the code.
- ADVISORY (4R, recorded only, not a task): RELIABILITY — no test asserts `centerRepo.find` was called with `{ relations: { clarisa_institution: true } }`. Dropping the relation would keep all tests green while production prints the code instead of the acronym.
- Decisions: none beyond the spec. Issues: none.
- Pending HITL check (T1 "Cannot prove"): verify one real Center has an institution acronym, or read the label on the next QA notification for a non-lead Center's project.

### T2 — Amend the tagging spec text — PASS

- Date: 2026-09-24
- Implementer attempts: 1 · Reviewer verdicts: 1 (PASS on attempt 1)
- Skill: `cognitive-doc-design` · effort low
- Files changed (`docs/specs/notifications/bilateral-contributor-tagging/`, ~10 insertions / 8 deletions): `requirements.md` (BCT-R-7 text + amendment note; scenario aligned via the note), `proposal.md` (row 7, :113, :142, D-4), `design.md` (§5.3 label), `tasks.md` (:104, :207).
- Verification: post-change `grep -rn "of your center"` in the folder: 7 amended hits plus 2 kept on purpose (`execution.md:347` historical log; `requirements.md` A-1 generic client note). BCT-R-7 references re-read: none asserts the old text. The Reviewer ran its own grep, which matched.
- Reviewer: **STATUS: PASS.** No advisories. It has no shell, so it could not run `git diff`. The Leader extracted the diff and it showed only the four named files.
- Requirements covered: NTC-R-1, NTC-R-3 (documentation of BCT-R-7).
- Implementer `Not Done / Assumptions` (no scope owed): the BCT-R-7 scenario body is unchanged, aligned by a note; git warned about LF→CRLF on `requirements.md`, but the diff is small.

## Summary

Both tasks PASS on attempt 1; no rework, no HALT or Pivot. Budget: 2 of 2 tasks, ~1 review round each. Open before merge: the T1 HITL check that a real Center carries an institution acronym.
