# Kaizen Entry — bilateral/replicated-innovations-2026-pa/center-overview-w3-scope

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/replicated-innovations-2026-pa/center-overview-w3-scope` |
| Date | 2026-10-21 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`; every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated (owner: "continue to the end" after T-2) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 of 6 (4 code + 2 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 0 (T-2..T-5 PASS on attempt 1) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted) | — |
| Budget | 6 tasks as planned, 1 review round each, ~720 LOC vs ~400 (overrun is tests) | execution.md Summary |
| Runtime issues | 1 Implementer ran `git stash`/`pop` in a shared checkout (no loss); 1 non-working lint command in the spec | execution.md CWS-T-3 |

## Lessons

- **KZ-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope-1 — Scoped client lint has no working documented command.** (Product, Low)
  - Root cause: root `AGENTS.md` lists only the whole-project `npx ng lint --quiet`. `tasks.md` DoD lines prescribed `npx eslint <files>`, which fails in the client because `.eslintrc.json` is not a flat config. The Implementer then linted only 2 of 10 touched files, and the Leader had to find `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` by hand.
  - Evidence: execution.md — CWS-T-3 Verification (Leader-run lint). This is the third occurrence: `bugfix--cdk-overlay-root-zoom.md` and `changes--admin-user-login-report.md`, both under "Noted, not a lesson".
  - Standardization: → P1
- **KZ-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope-2 — Workers rewrite the working tree in a shared checkout.** (Product + Methodology, Low)
  - Root cause: neither the Implementer persona nor the brief forbade `git stash` / `restore` / `checkout --`. To measure a tsc baseline, the T-3 Implementer stashed the whole working tree, including another live session's uncommitted files and the reviewed T-2 diff.
  - Evidence: execution.md — CWS-T-3 "Process incident". This is the second occurrence: `bugfix--lead-center-full-catalog.md`, "Noted, not a lesson" (peer-session stash reverted `service.ts` twice). It is related to `KZ-CVT-1` (staging, not stashing).
  - Standardization: → P2 (local) + upstream recommendation (the rule is stack-agnostic)

## Noted, not a lesson

- The red runs for two T-2 suites failed at compile time, not on assertions. The Reviewer traced the mutations instead. Briefs could ask for an assertion-level red (`// @ts-expect-error` or a cast).
- PRTest `/bilateral/*` redirected to `/` for several minutes after the GitHub `reporting-tool-dev-cicd` run reported success, because the Jenkins deploy was still running. The 2026-08-26 `como-validar-un-despliegue-en-prtest.md` already warns that a successful run is not proof of a deploy.
- The LOC budget overran by ~80%, almost all of it tests and fixtures. The specify budget counts test LOC loosely.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `AGENTS.md` (AKILI constitutional baseline, agent-lean verification table, `onecgiar-pr-client` Lint cell) |
| Edit | Replace `` `npx ng lint --quiet` `` with `` `npx ng lint --quiet` (project) · scoped: `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` (client still uses `.eslintrc.json`; plain `npx eslint` fails) `` |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` (append to its git / scope rules) |
| Edit | Never run `git stash`, `git restore`, `git checkout -- <path>` or any command that rewrites the working tree: the checkout may hold other sessions' and other tasks' uncommitted work. Measure baselines from `git show HEAD:<file>` or a scratch copy instead. |
| Severity | Low |
| Status | pending |
| Upstream | Recommend the same line for the AKILI methodology Implementer persona template |
