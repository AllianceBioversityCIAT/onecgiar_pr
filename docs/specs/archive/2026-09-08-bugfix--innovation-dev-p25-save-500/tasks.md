# Module Spec — Tasks: Innovation Development (P25) save fails with HTTP 500 from phase 2026

## 1. Scope of this task list

- **Module / feature:** `results-framework-reporting` — `innovation_dev` (bugfix)
- **Linked spec:** `docs/specs/bugfix/innovation-dev-p25-save-500/requirements.md` + `design.md`
- **Depth:** Lite · **Mode:** Bug
- **Owner / driver:** result submitter-facing bug
- **Status:** implemented (pending PR/CI/manual QA per §6)

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (none — root cause confirmed in `proposal.md`)
- [x] No conflicting in-flight spec touching `innovation_dev/` (checked `docs/specs/bugfix/`, `docs/specs/results/` — none found)
- [x] No migration involved — `migration:check` unaffected

---

## 3. Task list

### `IDEV-T-1` — Guard `qN` reads in `saveInnovationDev()` and add regression tests [x]

- **Type:** `server`, `tests`
- **Description:** In `InnovationDevService.saveInnovationDev()`, change all eight `saveOptionsAndSubOptions(...)` call sites for `responsible_innovation_and_scaling.{q1,q2,q3,q4}` and `intellectual_property_rights.{q1,q2,q3,q4}` so `radioButtonValue` is read as `createInnovationDevDto?.group?.qN?.radioButtonValue` and `options` is read as `createInnovationDevDto?.group?.qN?.options ?? []`. Do not touch `innovation_team_diversity` / `megatrends` (single-question groups, unaffected) or any other step in the method. Add regression tests per `IDEV-R-1`, `IDEV-R-2` (payload missing `responsible_innovation_and_scaling.q4` and, separately, `intellectual_property_rights.q4`) and confirm the existing full-payload test (`IDEV-R-3`) still passes unchanged.
- **Implements:** `IDEV-R-1`, `IDEV-R-2`, `IDEV-R-3`, `IDEV-R-10`, `IDEV-AC-1`, `IDEV-AC-2`, `IDEV-AC-3`
- **Files (expected):**
  - `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.ts`
  - `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `nestjs-expert`, `tdd`, `systematic-debugging` (already applied during propose/specify — cite for continuity, no re-diagnosis needed)

**Regression test plan (Bug Mode — mandatory, red before fix / green after):**

1. Build a payload via a variant of the existing `buildInnovationDevQuestions()` helper that **deletes** `responsible_innovation_and_scaling.q4` entirely (not just sets it to `null` — the real 2026+ payload omits the key). Call `service.saveInnovationDev(payload, resultId, userTest)`. **Assert the call resolves** (no thrown error reaching the test, and the returned `status` is `HttpStatus.CREATED`, not the `returnErrorRes` error shape). **Fails on current code**: the unguarded `.q4.radioButtonValue` throws a `TypeError`, which the method's own `try/catch` converts into `returnErrorRes(...)` with `status: HttpStatus.INTERNAL_SERVER_ERROR` — so the pre-fix assertion on `status === HttpStatus.CREATED` fails as expected.
2. Same shape, but delete `intellectual_property_rights.q4` instead. Same assertion.
3. Re-run the two existing `saveInnovationDev` tests (full `q1..q4` payload via unmodified `buildInnovationDevQuestions()`) unchanged — confirm still green, proving no regression on the unaffected shape (`IDEV-R-3`).
4. Optionally assert `mockResultAnswerRepository.find` / `.save` are not called with a `result_question_id` belonging to the deleted `q4` slot's options — a stronger proof that the missing slot was genuinely skipped, not merely "didn't crash."

**No-pass clause:** if test 1 or 2 reports `HttpStatus.CREATED` when run against the **pre-fix** codebase, the test was written wrong (it isn't actually exercising the missing-key path — e.g. it set `q4: undefined` on an object literal instead of omitting the key, which some serialization paths normalize differently). Re-confirm the test fails on pre-fix code by deleting the key with `delete payload.responsible_innovation_and_scaling.q4` (or omitting it from the literal entirely) before trusting the post-fix green.

**Disqualified evidence:** a green Jest run alone does not prove the frontend's actual 2026+ payload is byte-for-byte what the test constructs — the test's payload shape must be built by omitting the key the same way `innovation-dev-info.component.ts`'s server response naturally omits it (confirmed via the live repro in `proposal.md`, not guessed). If the test instead asserts against a shape no real client ever sends, it is not evidence this bug is fixed.

- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` — e.g. `🔧 fix(innovation-dev): guard missing q4 slot in 2026+ save payload`
  - [ ] Lint clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`)
  - [ ] Unit tests added per the plan above; run scoped: `npx jest --silent --reporters=summary --forceExit --testPathPattern="innovation_dev.service"` — all passing, including the two new regression cases
  - [ ] Server coverage thresholds (5/20/35/40 minimum) still met — this module already has spec coverage, no exclusion touched
  - [ ] No migration involved — N/A
  - [ ] No secret/token in logs (`.cursorrules`) — N/A, no logging touched
  - [ ] No API surface changed — N/A, DTO/route/version unchanged, no Swagger update needed
  - [ ] **Manual verification (accepted supplement, not a substitute for the automated test):** using a valid JWT, save the Innovation Development section on a real phase-2026+ result (e.g. the repro result id from `proposal.md`) via the running app or a direct `curl -H "auth: <token>"` PATCH, and confirm a `201`/`CREATED` response instead of `500`.

---

## 4. Dependency graph

```
IDEV-T-1   (single task — no dependents, no dependencies)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `IDEV-TEST-1` | unit (server, Jest) | `IDEV-R-1`, `IDEV-AC-1` | `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.service.spec.ts` |
| `IDEV-TEST-2` | unit (server, Jest) | `IDEV-R-2`, `IDEV-AC-2` | same file |
| `IDEV-TEST-3` | unit (server, Jest) | `IDEV-R-3`, `IDEV-AC-3` | same file (existing tests, re-run unchanged) |
| `IDEV-TEST-4` | manual (curl / app) | `IDEV-AC-1` (end-to-end confirmation) | Local/staging, against a real phase-2026+ result |

Server coverage MUST stay above 5/20/35/40 (`onecgiar-pr-server/CLAUDE.md`).

---

## 6. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, tests, build) — no `migration:check:ci` impact.
- [ ] Manual QA per `IDEV-TEST-4` above, on a phase-2026+ result.
- [ ] No bilateral/platform-report payload touched — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after merge.
- [ ] No new cross-cutting pattern introduced — nothing to promote to `docs/trd/trd.md` §11.
- [ ] No deferred work from `design.md`.
- [ ] No `docs/prd.md` Open Question resolved by this fix.

---

## 8. Roll-back plan

1. Revert the merged PR.
2. No migration to revert.
3. No feature flag involved.
4. N/A — no bilateral/platform-report payload shape touched.
5. N/A — no downstream consumers to notify.

---

## Required cross-references

- `docs/specs/bugfix/innovation-dev-p25-save-500/requirements.md`, `design.md` (this folder).
- `docs/prd.md`, `docs/trd/trd.md`.
- `onecgiar-pr-server/CLAUDE.md` (commit convention, test/lint commands, coverage thresholds).
