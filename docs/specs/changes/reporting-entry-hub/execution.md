# Execution Log — `changes/reporting-entry-hub`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/reporting-entry-hub/` (requirements + design + tasks; judgment.md APPROVED) |
| Approval Mode | pre-approved (owner, 2026-08-28) — routine gates auto-pass; HALT / Pivot / budget tripwire / FATAL_FAIL still stop |
| Owner constraints | max **1** Reviewer round per task (second FAIL → escalate, no retry); targeted jest only; client lint `npx ng lint --quiet`; no Cypress |
| Leader | Claude Fable 5 (session model; registry T1 = opus — session model is the newer generation, registry entry flagged for update) |
| Implementer | `.claude/agents/akili-implementer.md` (sonnet) |
| Reviewer | `.claude/agents/akili-reviewer.md` (opus, read-only) |
| Budget (design §14) | 7 tasks · ~650 LOC · ≤1 review round/task · tripwire >9 tasks or >900 LOC |
| Branch / worktree | `qa-development-2026` (git worktree). ⚠️ Unrelated uncommitted changes from another session exist in `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/*` and `docs/specs/bilateral/overview-redesign/` — never touched, never staged by this spec. |
| Started | 2026-08-28 |

## 2. Task Execution History

_(entries appended below, evidence before checkbox)_

### `REH-T-1` — Server: `ReportingEntryHubService` + DTOs

- **Date:** 2026-08-28 · **Implementer:** akili-implementer (sonnet, effort medium → high on retry) · **Reviewer:** akili-reviewer (opus)
- **Skills assigned:** `nestjs-expert`, `tdd` (as listed; `api-design-principles` dropped — no new contract design beyond the DTO the design already fixes)

**Attempt 1**
- Files: `onecgiar-pr-server/src/api/results-framework-reporting/services/reporting-entry-hub.service.ts` (new), `…/services/reporting-entry-hub.service.spec.ts` (new), `…/dto/reporting-entry-hub-projects.dto.ts` (new), `…/results-framework-reporting.module.ts` (edit: `TypeOrmModule.forFeature([ClarisaProject, ClarisaCenter, ClarisaInitiative])`, providers `ReportingEntryHubService`, `BilateralProjectsService`).
- Implementer verification: `npx jest --forceExit src/api/results-framework-reporting/services/reporting-entry-hub.service.spec.ts` → Tests: 10 passed; `npx jest --forceExit …/results-framework-reporting.module.spec.ts` → 3 passed; `npx eslint src/api/results-framework-reporting --quiet` → clean.
- Implementer note: explicit return type + cast in the catch branch (TS union with `HandlersError.returnErrorRes`); no behaviour change.
- Reviewer verdict: **FAIL** — (1) case (a) fixture does not discriminate the `role_level_name === 'Center'` filter (deleting the filter keeps all 10 tests green) — violates `tasks.md` REH-T-1 "input that makes it fail" / REH-R-9 / REH-AC-12; remediation: add a non-Center role row pointing at C3 to case (a). (2) project-id fixtures are numbers; `ClarisaProject.id` is bigint → string at runtime — violates REH-TEST-1 "fixture ids as strings" / KZ-OPF-1; remediation: `project(id: string)`, `'1368'`-style ids, DTO comment on `id`. Everything else verified conformant (scoping/dedupe, numeric sort with `'100'/'40'/'9'`, cap + order, `error: true`, 400/404, `activeYear`, logs, `@akili-spec`, DI graph traced by hand).
- ADVISORY (recorded, not gating): module spec is a metadata presence test, not a DI compile; pre-existing `getProjectsByCenter` resolves `institutionId` before `code` (numeric collision risk — out of scope, follow-up); `_trim` drops `null` keys instead of keeping `null`; dedupe of a repeated `center_id` untested; design §5 sentence "`center_id` is `undefined` (not `null`)" should read "no `center_id` key" (tasks.md wording is the one implemented) — tighten at archive.

**Attempt 2** (effort high)
- Files: `…/services/reporting-entry-hub.service.spec.ts` (case (a) adds a non-Center role row pointing at C3; `project(id: string)`, string ids, `.toBe('1')`), `…/dto/reporting-entry-hub-projects.dto.ts` (comment: `id` arrives as bigint string). No service/module change.
- Implementer verification: spec 10/10 passed; module spec 3/3; eslint clean. Mutation check performed and restored: deleting the `role_level_name` clause → `getProjectsByCenter` called 3× → red.
- Reviewer verdict (scoped re-review): **PASS** — both issues resolved; mutation-kill traced independently (three assertions go red); no fix-caused defects; advisories from attempt 1 stand (non-gating).

**Final:** PASS · attempts 2 · requirements covered REH-R-3/3.2/3.6/4.6/9/9.1, REH-AC-12/13 · verification: 10/10 + 3/3 + lint clean · gate: auto-approved (pre-approved mode).
- Follow-ups recorded (not tasks): `getProjectsByCenter` resolves `institutionId` before `code` (collision risk, pre-existing); design §5 wording "`center_id` is `undefined` (not `null`)" → "no `center_id` key" at archive.
