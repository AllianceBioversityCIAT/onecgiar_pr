# Execution — Results detail filters and rejection reason in the Portfolio Overview export

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-rejection-reason-export` |
| Ticket | SR-168253 |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (started at `385d46e44`) |
| Leader | Claude Code session (opus, T1) |
| Implementer / Reviewer wrappers | `.claude/agents/akili-implementer.md` (T2) / `akili-reviewer.md` (T3) |
| Started | 2026-11-17 |
| Budget (design §12) | 4 tasks · ≈ 530 LOC · 6 review rounds |

### Pre-flight (Leader, 2026-11-17)

- `git log HEAD..origin/staging`: 1 commit (`262dfcf38`, admin-reminders) — it touches no `results-detail` / `result-dimensions` / `results-framework-reporting` path. Last commits on staging for those paths are all already in this branch. → tasks.md §2 last pre-flight item satisfied.
- `akili doctor --agents`: implementer, reviewer, tester sections current; **leader `primary-instructions` OUTDATED (matched 2.36.0)**. Not fixed here (shared-file write discipline: `.agents/` edits belong on `staging`); reported to the user. Worker personas are current, so the briefs carry no compensating rule.
- `docs/specs/kaizen-log.md`: absent — no Active Lessons to carry.
- Wave 1: PRE-T-1 (server) and PRE-T-3 (client) run in parallel — disjoint package trees, no shared build output, ports, or dependency tree.

## 2. Task Execution History

### PRE-T-1 — Server: `rejections` on `portfolio/result-dimensions` — PASS

| Field | Value |
|---|---|
| Final status | PASS (attempt 1) |
| Date | 2026-11-17 |
| Attempts | 1 |
| Skills | `nestjs-expert`, `api-design-principles` (as listed; no deviation) |
| Effort | medium |
| Requirements covered | PRE-R-8 (all clauses), PRE-R-7 data side, DD-1, DD-2, DD-3, DD-7, DD-9 |

**Attempt 1**

- Files changed: `onecgiar-pr-server/src/api/results/result.repository.ts` (+35/−7), `result.repository.spec.ts` (+41/−2), `results-framework-reporting/results-framework-reporting.service.ts` (+14), `results-framework-reporting.service.spec.ts` (+62), `dto/portfolio-result-dimensions.dto.ts` (+41), `results-framework-reporting.controller.ts` (+1/−1).
- Red run (spec cases written first, before the code existed), as reported:
  ```
  Test Suites: 2 failed, 2 total
  Tests:       5 failed, 214 skipped, 11 passed, 230 total
  ```
  (`--reporters=summary` printed no test names; the Reviewer matched the 5 failures to the new `rejections` assertions.)
- Green: `npx jest src/api/results-framework-reporting src/api/results/result.repository.spec.ts --silent --reporters=summary --forceExit` → `Test Suites: 3 failed, 40 passed, 43 total` / `Tests: 679 passed, 679 total`. The 3 failed suites **fail to load** (0 tests): `contributors-partners.module.spec.ts`, `create-result-from-framework.provenance.spec.ts`, `results-framework-reporting.module.spec.ts`.
  - Leader probe of the load failure: `node --version` → `v26.13.1`; `node -e "console.log(typeof require('buffer').SlowBuffer)"` → `undefined`; `node_modules/buffer-equal-constant-time/index.js` reads `SlowBuffer.prototype.equal` at import time (pulled in by `@nestjs/jwt`). → **Environment fault (Node 26 removed `SlowBuffer`)**, independent of this diff: the failure is raised while importing `node_modules`, before any changed code runs. Not fixed here (out of scope); flagged for the user.
- `npx tsc --noEmit -p tsconfig.json` → no output (clean). `npx eslint "src/api/results-framework-reporting/**/*.ts" src/api/results/result.repository.ts --quiet` → no output (clean).
- Falsifier (executed against post-change code, reverted after):
  1. service `programCode: row.initiative_code ?? ''` → service spec `Tests: 1 failed, 131 skipped, 5 passed, 137 total`.
  2. SQL `IN ('REJECT')` (dropped `'REJECTED'`) → repository spec `Tests: 1 failed, 83 skipped, 9 passed, 93 total`.
- Consumers run: `results-framework-reporting.controller.spec.ts`, `results-framework-reporting.service.spec.ts`, `result.repository.spec.ts`, all green inside the run above. Existing repository spec: "exactly four statements" became five; the return `toEqual` gained `rejections`.
- Evidence re-run (Leader inline, non-author): same jest command → `Test Suites: 3 failed, 40 passed, 43 total` / `Tests: 679 passed, 679 total` (same 3 load failures) → **VERIFIED**.
- Reviewer (akili-reviewer, T3, high, lens checklist): **PASS**. Scope equals `projectLinksSql` + `r.status_id = 7`; newest record via correlated sub-select `created_at DESC, id DESC LIMIT 1` over `REJECT`/`REJECTED`; `INNER JOIN` on the history row, so a Rejected result with no record is left out (design §6); `LEFT JOIN clarisa_initiatives` keeps a null SP; column names match the entities (P-4 settled); `DATE_FORMAT(..., '%Y-%m-%d')` (DD-7); no comment logged; catch, guard untouched; Swagger sentence present; `[7]` in the spec is the fixture's `versionId`, status 7 is a SQL literal.
- runtime events: none.

**ADVISORY (4R, non-gating):**
- Readability/Risk: repository spec uses `versionId = 7`, equal to the Rejected status id; `params toEqual([7])` cannot tell a bound versionId from a bound status (the `toContain('r.version_id = ?')` assertion mostly covers it). A value such as 42 would remove the doubt.
- Resilience/Performance: the correlated sub-select runs once per Rejected result; its cost depends on an index on `result_review_history.result_id`. Check in the PRE-T-4 p95 measurement.
- Reliability: `DATE_FORMAT` on a timestamp uses the DB session time zone; the day could differ from the notice if the notice formats in the browser zone. Note it in the PRE-T-4 comparison.

- spawns: implementer 53 calls, 175,546 tokens, ended complete; reviewer 12 calls, 91,392 tokens, ended complete.
- Decisions: none beyond the design. Issues: the Node 26 suite-load fault above. The tree also holds **unattributed** uncommitted changes in `onecgiar-pr-server/src/api/bilateral/bilateral.service{,.spec}.ts` (sub-national geo resolution, matching the untracked spec `docs/specs/bugfix/ai-draft-subnational-geo/`), written 2026-11-17 22:32 by neither Implementer of this run. Left untouched and excluded from every commit of this spec (pathspec commits only).
- Running totals vs budget: tasks 1/4 · LOC ≈ 204 (194 added, 10 removed; tests included) / 530 · review rounds 1/6. Within budget.
- Final verification: green, apart from the environment load fault above.
