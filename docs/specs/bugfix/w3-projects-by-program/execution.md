# Execution — W3/bilateral projects by program (`bugfix/w3-projects-by-program`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/w3-projects-by-program/` · Lite · Bug Mode |
| Ticket | P2-4042 · `[167167-1]` |
| Approval Mode | `gated`; user asked (2026-10-30) to chain tasks without a continue prompt — stops only on HALT / pivot / tripwire |
| Leader | Claude (Opus) · Implementers `akili-implementer` · Reviewers `akili-reviewer` |
| Budget | 3 tasks · ~180 LOC · ≤2 review rounds per task |

## 2. Task Execution History

### WPP-T-1 — Server: merge CLARISA-approved projects into by-program — **PASS** (2026-10-30)

- **Attempts:** 2 Implementer attempts · 2 Reviewer verdicts (FAIL → PASS). Effort medium → high on rework.
- **Files:** `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` (+ `.spec.ts`), `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` (+ `.spec.ts`), `results-framework-reporting.controller.ts` (Swagger text).
- **Changes:** new `ClarisaProjectsRepository.findApprovedProjectsByProgramCode(programCode, phaseYear)` — bound SQL, P2-3313 approval rule (`APPROVED_MAPPING_STATUSES`, `allocation > 0`, `cp.phase = ?`, active), row shape mirrors the ToC query (`toc_result_id`/`official_code`/`project_summary` NULL). Service resolves `phase_year` via `resolveReportingVersion(tocContext.versionId)`; unresolved/throw → CLARISA skipped (WPP-DD-3); merges `[...tocRows, ...clarisaRows]` through the existing `seenProjectIds` dedupe.
- **Attempt 1:**
  - RED (before service change, `-t "P2-3001"`): S-1.1 failed "Expected: "SP09", 2026 / Number of calls: 0"; S-1.2 failed (`[11, 12]` vs `[11, 12, 10]`) — 2 failed, 6 passed. Falsifier satisfied.
  - GREEN scoped run: 10 passed / 135 skipped; eslint exit 0.
  - Reviewer `STATUS: FAIL` — Issue 1: test case 5 not done; the pre-existing "empty array" test did not mock both sources nor assert the CLARISA call, and its path depended on run order (`mockVersionRepository.findOne` implementations leak across describes). Violated: tasks.md WPP-T-1 case 5. Remediation: mock year + CLARISA `[]`, assert call `('SP02', 2026)`, `mockReset()` both mocks.
- **Attempt 2 (spec only):** outer P2-3001 `beforeEach` resets both mocks; "empty array" test now mocks both sources empty and asserts the CLARISA call; WPP-DD-3 test uses `mockResolvedValueOnce(null)` ×2.
  - Scoped run 10 passed / 135 skipped; **full-file run 122/122 passed** (order-independence); eslint exit 0.
  - Reviewer `STATUS: PASS` — fixes issue 1; production code unchanged and compliant with WPP-R-1 S-1.1…S-1.5, NFR-1/2, DD-1/2/3; MySQL DISTINCT/ORDER BY valid; `resolveReportingVersion(undefined)` falls back to the open/newest version.
- **ADVISORY (non-gating, recorded only):**
  - Resilience: a CLARISA query failure is not caught — the endpoint errors instead of degrading to ToC-only (DD-3 covers only an unresolved year).
  - Readability: the version-lookup catch swallows DB errors without a log line.
  - Risk: program code matched with `UPPER(TRIM())` both sides vs design's `TRIM() = ?` — same result under case-insensitive collation; real-data parity is WPP-T-3's job.
- **Requirements covered:** WPP-R-1 (S-1.1…S-1.5), WPP-NFR-1, WPP-NFR-2.
- **Not Done carried:** SQL filters not proven on real data → WPP-T-3 #1.

### WPP-T-2 — Client: Centers error + Retry, banner waits for "Yes" — **PASS** (2026-10-30)

- **Attempts:** 1 Implementer attempt · 1 Reviewer verdict (PASS).
- **Ran in parallel with WPP-T-1**; Jest runs serialized (client run only after the server run finished).
- **Files:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/` → `rd-contributors-and-partners.component.ts`, `.component.html`, `.zoneless.spec.ts`, `CLAUDE.md` (175+ / 4−).
- **Changes:** `centersLoadFailed` signal + `loadCentersCatalogue()` wrapping `centersSE.getData()` (true on reject or empty resolve, false while pending/loaded); `@if (centersLoadFailed())` block with `app-alert-status status="error"` + `app-pr-button` Retry (`data-testid` `cp-centers-load-error` / `cp-centers-retry`); note branch `@else` → `@else if (planned_result === true)`.
- **Verification:**
  - Folder run `npx jest src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners --maxWorkers=2 --silent --no-coverage`: 1 failed / 357 passed (new S-3.1 rig missing `FeedbackValidationDirectiveModule`) → import added → zoneless spec 28/28 passed.
  - Falsifier: reverting to `@else` makes exactly S-3.1 fail (27 passed / 1 failed); restored.
  - eslint clean (`ESLINT_USE_FLAT_CONFIG=false`, legacy `.eslintrc.json`).
- **Reviewer:** `STATUS: PASS` — meets S-2.1 (incl. BUT), S-3.1 (incl. AND), S-3.2, design §8 and WPP-DD-5; reuses primitives; diff within the 4 named files. Empty-resolve-as-error is consistent with WPP-R-2 wording and unreachable in production (`CentersService.getData()` rejects on empty).
- **ADVISORY (non-gating):**
  - Reliability: after the spec-only import fix only the zoneless spec was re-run; run `npx jest --findRelatedTests <changed files> --maxWorkers=2` and eslint on the spec before pushing.
  - Coverage: "on success the dropdowns list the centres" is only asserted as "error disappears"; covered by WPP-T-3 #4 — keep that manual step.
  - Optional polish: `[loading]` on the Retry button.
- **Requirements covered:** WPP-R-2 (S-2.1), WPP-R-3 (S-3.1, S-3.2).
- **Not Done carried:** none (pre-push `--findRelatedTests` is a pre-push gate, tracked in the advisory).
