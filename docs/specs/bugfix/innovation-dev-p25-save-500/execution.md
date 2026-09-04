# Module Spec — Execution Log: Innovation Development (P25) save fails with HTTP 500 from phase 2026

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/innovation-dev-p25-save-500`
- **Depth:** Lite · **Mode:** Bug
- **Approval mode:** gated (default — no `pre-approved` marker found in `design.md`/`tasks.md`)
- **Execution started:** 2026-09-03

---

## 2. Task Execution History

### `IDEV-T-1` — Guard `qN` reads in `saveInnovationDev()` and add regression tests

- **Final status:** PASS
- **Date:** 2026-09-03
- **Implementer attempts:** 1

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.ts` — guarded all eight `qN` read sites (`responsible_innovation_and_scaling.{q1..q4}`, `intellectual_property_rights.{q1..q4}`) to `?.group?.qN?.radioButtonValue` / `?.group?.qN?.options ?? []`, per `design.md` §6 / `IDEV-DD-1`. `innovation_team_diversity` / `megatrends` untouched.
  - `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts` — added two regression tests in the `describe('saveInnovationDev', ...)` block: payload with `responsible_innovation_and_scaling.q4` key deleted, and payload with `intellectual_property_rights.q4` key deleted; each asserts `status === HttpStatus.CREATED`.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern="innovation_dev.service"` → 12 passed, 12 total (post-fix).
  - Regression proof (mandatory, tasks.md): stashed the service.ts fix, re-ran same suite → 2 failed, 10 passed (both new tests failed `Expected: 201, Received: 500`, i.e. the pre-fix `TypeError` converted to 500 via `returnErrorRes`); restored the fix, re-ran → 12 passed again.
  - `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` on the two touched files → clean.
- **Reviewer verdict:** PASS
  - All eight `qN` read sites guarded exactly per `design.md` §6 / `IDEV-DD-1`; no collateral edits to `innovation_team_diversity`/`megatrends` or the later evidence/investment/scaling-study steps.
  - `IDEV-R-3`/`IDEV-AC-3` (full-payload regression safety) confirmed — optional chain and `?? []` are no-ops when all slots present; existing tests still green.
  - New tests use `delete payload.<group>.q4` (real key omission, not `undefined`), satisfying the tasks.md **No-pass clause**; proven red-before-fix / green-after via the stash cycle, clearing the **Disqualified-evidence** clause.
  - No DTO/route/version/entity/migration change; envelope shape (`returnFormatService`) unchanged; no logging touched.
  - **ADVISORY** (reliability, non-gating, out of scope for this task): when a slot's `options` resolves to `[]`, `saveOptionsAndSubOptions` still issues a `find({ result_question_id: In([]) })` round-trip that can never match — pre-existing behavior, not introduced by this diff. Recorded for a future task; not actioned here.
- **Requirements covered:** `IDEV-R-1`, `IDEV-R-2`, `IDEV-R-3`, `IDEV-R-10`, `IDEV-AC-1`, `IDEV-AC-2`, `IDEV-AC-3`.
- **Decisions made:** None beyond `design.md`'s `IDEV-DD-1` (already approved) — guard all eight sites uniformly, not just the confirmed-broken `q4` slot.
- **Issues encountered:** None.
- **Final verification result:** Jest 12/12 passing (scoped suite), lint clean, red/green regression proof confirmed.

---

## 3. Summary

All tasks in `tasks.md` are complete (`IDEV-T-1` — the spec's only task — is `[x]`). The backend fix guards every `qN` read site in `InnovationDevService.saveInnovationDev()` so a phase-2026+ payload omitting a `qN` key (confirmed: `responsible_innovation_and_scaling.q4`; hardened defensively: all other slots in both groups) no longer throws, resolving the HTTP 500 on save for results in reporting phase 2026+. No DTO, route, entity, or migration changes; no frontend changes (per scope). Regression safety for the pre-2026 full-payload shape confirmed via existing + re-run tests.

**Remaining before this spec is fully shipped (per `tasks.md` §6/§7, outside this command's automated scope):**
- PR open + CI green.
- Manual QA per `IDEV-TEST-4` (curl/app smoke test against a real phase-2026+ result, e.g. the repro id in `proposal.md`).
- Move spec status to `shipped` after merge.

**Not actioned (advisory, recorded only):** the pre-existing `In([])` no-op query in `saveOptionsAndSubOptions` — out of scope for `IDEV-T-1`, may be worth a follow-up if the team wants it.
