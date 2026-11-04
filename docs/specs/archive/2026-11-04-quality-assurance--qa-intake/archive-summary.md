# Archive Summary — QA intake (`quality-assurance/qa-intake`)

**Outcome:** shipped and verified live on prtest.
- The QA Platform marks results In QA (`intake`) and takes them out (`release`, `qaed` / `not_qaed`) through two CLARISA-guarded routes.
- Every change is audited.
- Unsubmit is refused while a result is In QA in an open phase.
- All 5 `/api/qa/*` routes require the per-endpoint CLARISA grant.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/quality-assurance/qa-intake/` |
| Archive Date | 2026-11-04 |
| Ticket | P2-4040 (parent story P2-3905) |
| Branch | `JuanGuzman-io/p2-4040-qa-intake`, merged into `performance-refactor` (`d7e249d80`, `825a3b69d`) |
| Final Status | **Done.** 8 of 8 tasks `[x]` |
| Approval Mode | gated |

## Requirements Delivered

| Req | What | Task |
|---|---|---|
| QIN-R-1/2 | `POST /api/qa/results/intake` and `/release`, 1–50 unique ids, DTO-validated | T-4 |
| QIN-R-3 | Intake reuses the feed's `classify`, under a row lock, idempotent | T-2 |
| QIN-R-4 | Release `qaed` → `status_id 2, in_qa 0`; `not_qaed` → `in_qa 0`. `qaed` only from In QA | T-3 |
| QIN-R-5 | Audit table `result_qa_intake_log` (result, action, platform, phase year, time), written in the same transaction | T-1, T-2, T-3 |
| QIN-R-6 | Unsubmit (Reporting and IPSR) refused with 409 while In QA in an open phase; the client shows the server message | T-5 |
| Contract | `qa-catalog.en.md` intake/release sections; change log v1.29 and v1.30 on `performance-refactor` | T-6 |
| Auth | Fail-closed per-endpoint CLARISA grant (`endpoint_allowed`) on all `/api/qa/*` routes | T-4b |
| NFR | Concurrency (race-safe) and p95 ≤ 2 s for a batch of 50 | T-2, T-3, T-7 |

## Files Changed Summary

Source: `execution.md`.

- **Server (`src/api/qa-catalog/`):**
  - `qa-intake.repository.ts`, `qa-intake.service.ts`;
  - DTOs; controller routes;
  - `result-qa-intake-log` entity and migration `1793283760300-AddResultQaIntakeLog`;
  - `excluded-tables.ts` entry;
  - JWT exclude entries in `app.module.ts`.
- **Server (other):**
  - `result.repository.ts` / `ipsr.repository.ts`: the guarded unsubmit UPDATE;
  - `submissions.service.ts`: the 409;
  - bilateral guard: `RequireClarisaEndpointGrant` decorator, grant check, interface fields.
- **Client:** the Reporting and IPSR unsubmit modals show the server's error message (T-5 pivot).
- **Docs:** `onecgiar-pr-server/docs/qa-catalog.en.md`.
- **Size:** about 3 100 LOC, mostly specs and fixtures. That is about 1.9× the ~1 600 budget; the owner accepted the overrun at the T-3 tripwire.

## Test Evidence Summary

- **No `test-report.md`.** The owner accepted its absence on 2026-11-04. Each task carries red/green falsifier runs and a non-author evidence re-run (`execution.md`).
- **Last scoped run** (bilateral + qa-catalog, T-4b): 93 suites, 2 535 tests passed; `tsc` clean.
- **Merge into `performance-refactor`:** 96 suites, 2 563 tests passed.

## Validation Summary

- **No `validation-report.md`.** The owner accepted its absence on 2026-11-04. Its role was covered by the T-7 live verification (HITL) on prtest.
- **T-7 checks, all 9 PASS:**
  - mixed-batch intake;
  - idempotent repeat;
  - UI unsubmit refused, then allowed after release;
  - `qaed` with the QAed badge;
  - two-session race in both orders;
  - p95 = 945 ms for a batch of 50;
  - 401 without a key;
  - test data reverted.
- **Reviewer:** every code task closed on a Reviewer PASS. One FAIL (T-1) was fixed on attempt 2.

## Accepted Warnings Or Follow-Ups

| Item | Owner / where |
|---|---|
| TRD §7: add the QA write surface (intake/release, the write boundary, the unsubmit guard) | Pending item; apply on `staging` |
| Server guides: add `api/qa-catalog/` to the module map, and list `/api/qa/*` in the JWT exclusions | Pending items; apply on `staging` |
| Stop the manual SQL `UPDATE … in_qa` once the QA Platform calls intake/release (P-15) | Reporting team, at rollout |
| Migration `down` never executed. It was verified on its SQL text only; `up` was applied by the pipeline (confirmed in T-7) | Accepted |
| A key without an `allowed_endpoints` list (e.g. the bilateral key) → 401 on `/api/qa/*` was proven in unit tests only; no such key was available live | Accepted |
| T-4b test advisories: webhook controller in (g), an undecorated control class, an e2e 401 body assertion | Optional |

## Historical Notes

- **Pivot T-5 (2026-10-29):** the server's 409 message never reached the user, because both unsubmit modals discarded `err`. T-5 was widened to the client.
- **Pivot T-4b (2026-11-03):** a live probe showed CLARISA validated any valid key on any route. CLARISA then added `allowed_endpoints` / `endpoint_allowed`, and Reporting enforces the grant fail-closed.
- **Every environment validates against CLARISA prod,** so the grant only worked once CLARISA prod deployed it.
- **Owner decisions:** release on finish or reopen; QAed write-back owned by Reporting; intake independent of `pgv_in_qa`; unsubmit guard limited to open phases; neither `result_qaed_log` nor `submission` is written (DD-7, DD-8).

## Diagrams

The spec has no `diagrams/` folder, and no baseline diagram slot was made stale.
