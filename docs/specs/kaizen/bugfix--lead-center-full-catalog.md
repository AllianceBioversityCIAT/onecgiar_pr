# Kaizen Entry — bugfix/lead-center-full-catalog

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/lead-center-full-catalog` |
| Date | 2026-08-29 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (`LC-T-1`..`LC-T-5`) | tasks.md |
| Reviewer FAIL rework attempts | 0 — all 5 tasks PASSED on attempt 1 | execution.md §3 Summary |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots (abandon-spec sense) | 0 — `LC-T-4`/`LC-T-5` were in-spec amendments (`LC-GAP-1`, `LC-DD-5`), not pivots | execution.md §2.1, §2.2 |
| PRODUCT_BUGs | 0 (no `test-report.md`; live-browser verification in §2.4 found zero defects) | execution.md §2.4 |
| Validation FAIL / WARN | n/a (no `validation-report.md`); several non-gating ADVISORY findings recorded per task, none escalated | execution.md |
| Post-completion build-breaking defect (caught only by live-browser check, not by Jest/lint) | 1 | execution.md §2.3 |

## Lessons

- **KZ-bugfix--lead-center-full-catalog-1 — Jest/`ts-jest` verification does not catch Angular-build-breaking TypeScript errors on typed DTO/model field assignments.** (Product + Methodology, High)
  - Root cause: `LC-T-5`'s `onLeadCenterSelected` pushed a light `CenterDto`-shaped object into `partnersBody.contributing_center`, typed `ResultsCenterDto[]` (full DB-row shape). `ts-jest` does not enforce this the same way the real Angular compiler does, so 169/169 Jest tests passed and the Reviewer issued a PASS across all 5 tasks — the code never actually compiled (`ng build` failed outright) until the Leader ran a live-browser check post-hoc.
  - Evidence: `execution.md` §2.3 ("Critical process gap found post-`LC-T-5`") — explicitly names the cause: none of `LC-T-1`..`LC-T-5`'s verification commands (as specified in `tasks.md`) ever named `ng build`, only `npx jest` and `npx ng lint --quiet`.
  - Standardization: → P1 (local, `docs/specs/general-setup/task.md`) + upstream methodology recommendation (see Pending Items).

## Noted, not a lesson

- Mid-implementation `git stash` interference from a concurrent peer session (`toc-unmapped-orange-notes`, same working tree) twice reverted `service.ts`/`.service.spec.ts` to HEAD during `LC-T-5`; recovered without data loss via manual re-application and independent Leader verification (`execution.md` §2.2 "Cross-session note"). No root cause fix proposed — the project's existing pre-flight checklist item ("No conflicting in-flight spec touching ... found") already exists in `tasks.md` §2 but cannot catch a spec that starts *after* that check ran; below the lesson bar for a 1–3-line fix, feeds the recurrence check if it happens again.
- Unexplained commits and a `git reflog` reset appeared during this run, attributable to neither concurrent session — flagged to the user, unresolved (`execution.md` §3). Not a root cause this spec can fix; noted for recurrence tracking only.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | Add to the task Definition-of-done / verification-command guidance: "If a task assigns a value into a typed DTO/model field, its verification command MUST also include the framework build command (e.g. `npx ng build --configuration development`), not just the test runner — `ts-jest`/Jest does not enforce the same compiler-level type checking as a real build." |
| Severity | High |
| Status | pending |

### P2 (methodology upstream recommendation, no local edit)

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology repository — general task-template guidance (upstream, not this repo) |
| Edit | Recommend the same build-command requirement be added to the general `task.md` template shipped by AKILI-SPECS itself, for any stack with a compile step stricter than its test runner's type-checking (TypeScript/Angular, TypeScript/Nest, etc.). |
| Severity | High |
| Status | pending |
