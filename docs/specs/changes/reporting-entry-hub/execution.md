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

### `REH-T-3` — Client: `ReportingEntryHubComponent`

- **Date:** 2026-08-28 · **Implementer:** akili-implementer (sonnet, effort high) · **Reviewer:** akili-reviewer (opus)
- **Skills assigned:** `angular-developer`, `ui-ux-pro-max`, `tdd` (as listed)

**Attempt 1**
- Files (new): `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub/reporting-entry-hub.component.{ts,html,scss,spec.ts}`, `…/hub-copy.ts`; edit `onecgiar-pr-client/tests/mocks/ngIconsLucideMock.ts` (+`lucideChevronUp`, `lucideArrowRight`).
- Implementer verification: `npx jest …/components/reporting-entry-hub --no-coverage` → 22 passed; `npx ng lint --quiet` → All files pass linting.
- Implementer assumptions: (1) during search, only centers with a match expand (REH-R-3.4 literal); (2) added `id="reporting-entry-hub-w3"` + `tabindex="-1"` on the W3 heading as the anchor T-4/T-5 need (Leader: accepted — it can only live in this template).
- Reviewer verdict: **FAIL** — (1) search behaviour contradicts REH-AC-4 / REH-TEST-3(e) "both expanded" while matching REH-R-3.4. **Leader adjudication:** the spec was internally inconsistent; R-3.4 is the better UX (an expanded zero-match group is an empty box) → `requirements.md` REH-AC-4 and `tasks.md` (e) amended to "matching center expanded, non-matching unchanged"; forward/backward sweep for "both expanded" clean. No code change required for (1). (2) three `aria-live` announcement strings hard-coded in the component instead of `hub-copy.ts` — violates T-3 DoD / NFR i18n → rework.
- Reviewer verified conformant: inputs/outputs per design §6.2; all W3 states; slice/Show all; counters; default expansion; REH-R-12; localStorage try/catch; disabled Create result title; disabled Report with `title`; a11y structure; tokens checked against `colors.scss` and the exemplar — no new hex, no new SCSS class; `@akili-spec`.
- ADVISORY (recorded): `Show all N` label uses `center.matching` while rows come from `center.projects` (can differ under the 300 cap); toggle during search announces without visible effect (Leader folded this one-liner into attempt 2); `laneSubtitle`/`activePhaseNote` render "in ." when the year is unknown; `visibleCenters` naming; `aria-controls` dangles while collapsed; (c)/(d) assert via method not DOM.

**Attempt 2** (effort high)
- Files: `hub-copy.ts` (+`w3.searchAnnouncement`, `centerToggleAnnouncement`, `showAllAnnouncement`, `homeLinkSeparator`, `allocationValue`), `reporting-entry-hub.component.{ts,html}` (use the copy functions; no live announcement while searching), `.spec.ts` (+1 test → 23).
- Verification: 23/23 passed; `npx ng lint --quiet` clean; template grep: no literal text nodes outside HTML comments.
- Reviewer verdict (scoped): **PASS** — issue 2 resolved, argument order checked, strings byte-identical, advisory fix behavioural with a real test; issue 1 closed by spec amendment. Reviewer doc note applied by Leader: REH-AC-4 / TEST-3(e) reworded to "non-matching centers render collapsed while the query is active; pre-search state restored on clear" (matches the code).

**Final:** PASS · attempts 2 · covers REH-R-1/2/2.1/3.x/4.1–4.6/5/6(note)/9.1/12, REH-AC-1,3,4,6,7,8,9,10,13,14 (unit level) · gate: auto-approved (pre-approved mode).
- Surviving advisories (follow-ups, not tasks): `Show all N` / announcement use `center.matching` which may exceed rendered rows under the 300 cap; `aria-controls` dangles while collapsed.

### `REH-T-2` — Server: controller endpoint

- **Date:** 2026-08-28 · **Implementer:** akili-implementer (sonnet, effort low) · **Reviewer:** akili-reviewer (opus) · **Skills:** `nestjs-expert`
- **Attempt 1** — Files: `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.controller.{ts,spec.ts}`. Verification: controller spec 20/20 passed (19 prior + `getReportingEntryHubProjects`); `npx eslint src/api/results-framework-reporting --quiet` clean (after `--fix` on prettier).
- Reviewer verdict: **PASS** — route/query per design §4.1, `@UserToken()` → `user.id`, no duplicated validation, envelope by identity, Swagger trio; route stays under `JwtMiddleware` (`/api/(.*)`, not excluded); DI real provider; no route shadowing.
- **Final:** PASS · attempts 1 · covers REH-R-9 (HTTP), REH-AC-12 · gate: auto-approved (pre-approved mode).
