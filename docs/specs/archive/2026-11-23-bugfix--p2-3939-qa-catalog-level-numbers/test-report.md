# Test Report — QA catalog level rules on level numbers (P2-3939)

**Overall: PASS.** Every requirement has test evidence. No product bugs. The only red suite is `qa-catalog.module.spec.ts`, which already failed at the base commit (`JwtService` import, environmental — not this spec).

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Depth | Lite (Bug Mode) |
| Date | 2026-11-23 |
| Branch / base | `qa-development-2026-ss` / `b143445bd` (uncommitted working tree) |
| Leader / Tester | Leader ran the suite **inline** (`opus`); Implementers were `sonnet` → author ≠ tester holds. The `akili-tester` wrapper is bound to `sonnet` (= Implementer model), so it was not used |

## 2. Summary

| Metric | Value |
|---|---|
| Suites run | 1 backend unit suite (inline, Deployment Rule: Lite) + 1 definition-diff check |
| Testers spawned | 0 (inline) |
| Full `qa-catalog` run | `Test Suites: 1 failed, 52 passed, 53 total · Tests: 1282 passed, 1282 total` |
| Red suite | `qa-catalog.module.spec.ts` "Test suite failed to run" — baseline (`tasks.md` §2) |
| New tests this phase | 2 (`qa-catalog.level-numbers.read-plan.spec.ts`) |
| Author TDD tests cited, not rewritten | `qa-catalog.level-numbers.spec.ts` (T-1 + T-2), `qa-catalog.ipsr-step-3.spec.ts` (guard replacement), version pins in controller / service / shape specs, `qa-catalog.snapshot.spec.ts` |
| tsc / eslint | `npx tsc --noEmit -p tsconfig.json` clean · `npx eslint "src/api/qa-catalog/**/*.ts" --quiet` clean |
| Product bugs | none |

What this phase added beyond the author tests:
1. **Real read-plan wiring (LVL-R-1 "WHEN `GET /api/qa/results` returns its values").** The author tests built the lookup bindings by hand (LVL-T-2 Reviewer advisory). The new spec takes them from `buildReadPlans(CATALOG_FIELDS, entityTableKeys())`, the same call `values/value-reader.ts:62` makes, and resolves values through `resolveLookups`.
2. **Whole-catalog additive check (LVL-NFR-1, LVL-R-1 BUT, LVL-R-4 BUT, LVL-R-5 BUT).** Every field and subfield definition at HEAD was compared with the working tree.

## 3. Backend Unit Tests

| Command | Result |
|---|---|
| `npx jest src/api/qa-catalog/qa-catalog.level-numbers.read-plan.spec.ts` | 2 passed |
| Mutation: all four `value_column: 'level'` in `ipsr-step-3.ts` → `'id'` (restored, `cmp` identical) | 1 failed — `Expected: 0  Received: 11` (core readiness row id 11 read as its id instead of level 0) |
| `npx jest src/api/qa-catalog --silent --reporters=summary --forceExit` | 52/53 suites, 1282/1282 tests; module baseline red only |

**Definition diff, HEAD vs working tree** (`CATALOG_FIELDS` dumped with `ts-node` in a temporary HEAD worktree and in the working tree, compared per key; worktree removed afterwards):

```
ADDED   innovation_use.use_level.innovation_use_level_number
ADDED   ipsr_step_3.core.readiness_level_number
ADDED   ipsr_step_3.core.use_level_number
ADDED   ipsr_step_3.complementary_components/readiness_level_number
ADDED   ipsr_step_3.complementary_components/use_level_number
CHANGED innovation_use.use_level.readiness_level_explanation   required_when, visible_when: innovation_use_level → innovation_use_level_number (in [5..9])
CHANGED ipsr_step_3.core.readiness_evidences                    required_when: undefined → readiness_level_number in [1..9]
CHANGED ipsr_step_3.core.use_evidences                          required_when: undefined → use_level_number in [1..9]
CHANGED ipsr_step_3.core.current_use.actors|organizations|measures   visible_when: undefined → core.use_level_number in [1..9]
CHANGED ipsr_step_3.complementary_components/readiness_evidences  required_when: undefined → readiness_level_number in [1..9]
CHANGED ipsr_step_3.complementary_components/use_evidences        required_when: undefined → use_level_number in [1..9]
```

No key removed. No other property changed: no `type`, `control_list`, `storage`, `required` or `required_confirmed` change anywhere, and no current-use row subfield changed.

## 4. Frontend Unit Tests

n/a — backend-only spec (`design.md` §8).

## 5. Integration Tests

None against a live DB: this session has no DB access (no `.env`, no `DB_*`, no `mysql`/`docker`; probe recorded in `execution.md` LVL-T-2). The read-plan spec covers the plan → resolver wiring over the fixture runner. See Accepted Gaps.

## 6. E2E Tests

n/a — no UI journey.

## 7. Coverage & Traceability

| Requirement | Scenario / clause | Test type | Test file or command | Result | Notes |
|---|---|---|---|---|---|
| LVL-R-1 | Resolved from the row (IU) | unit | `qa-catalog.level-numbers.spec.ts` (T-1); `qa-catalog.level-numbers.read-plan.spec.ts` | PASS | id 5 → 4 via real plan |
| LVL-R-1 | Resolved from the row (S3 core + complementary) | unit | `qa-catalog.level-numbers.spec.ts` (T-2); `…read-plan.spec.ts` | PASS | core id 11 → 0; complementary 20 → 9, 13 → 2 |
| LVL-R-1 | AND IT MUST: repeated row id 13 → 2 | unit | both level-number specs | PASS | |
| LVL-R-1 | BUT existing value / `control_list` unchanged | unit + definition diff | `…read-plan.spec.ts` (row ids kept); HEAD diff | PASS | no `control_list` / `storage` change |
| LVL-R-1 | Unset level → empty | unit | both level-number specs | PASS | |
| LVL-R-2 | Level 4 (id 5) not visible / required, BUT not because of id 5 | unit (red-first) | `qa-catalog.level-numbers.spec.ts`; pins `display-rules.spec.ts`, `required-follows-form.spec.ts` | PASS | red observed before the fix (`execution.md`) |
| LVL-R-2 | Level 9 (id 10) visible + required | unit | `qa-catalog.level-numbers.spec.ts` | PASS | |
| LVL-R-3 | Level 0 → not required; AND stays visible | unit + structural | `qa-catalog.level-numbers.spec.ts`, `qa-catalog.ipsr-step-3.spec.ts` | PASS | "stays visible" is a declared property: structural coverage only |
| LVL-R-3 | Repeated row id 13 → required; BUT no `visible_when` | unit + structural | same; HEAD diff (no `visible_when` added to evidence lists) | PASS | |
| LVL-R-4 | Use level 0 → current use hidden | unit | `qa-catalog.level-numbers.spec.ts` | PASS | keyed on `core.use_level`, not `current_use_level` |
| LVL-R-4 | BUT required flags / row subfield rules unchanged | definition diff | HEAD diff | PASS | covers actors and organizations as well as measures (closes the LVL-T-2 advisory) |
| LVL-R-5 | Version 2026.36 | unit | `qa-catalog.controller.spec.ts`, `qa-catalog.service.spec.ts`, `qa-catalog.shape.spec.ts`, `qa-catalog.snapshot.spec.ts` | PASS | snapshot red without bump observed on an LF copy (`execution.md` T-3) |
| LVL-R-5 | Change-log row; AND IT MUST gap / D28 removed | doc sweep | `git grep` sweep (`execution.md` T-3) | PASS | Reviewer re-ran the sweep |
| LVL-R-5 | BUT no key renamed or removed | snapshot + definition diff | snapshot diff; HEAD diff | PASS | additions only |
| LVL-R-6 | Residual NULL gap documented | doc review | `qa-catalog.en.md`, `ipsr-step-3.ts` header | PASS | Reviewer-checked (T-2, T-3) |
| LVL-NFR-1 | Additive only | definition diff | HEAD diff | PASS | |
| LVL-NFR-2 | No migration | inspection | `git status` (no file under `src/migrations/`) | PASS | |
| LVL-NFR-3 | Lookups batched per source | unit | `qa-catalog.level-numbers.spec.ts` (batched SELECT case) | PASS | |

## 8. Remediation

None required: no failures attributable to this spec.

## 9. Accepted Gaps

| Gap | Why | Follow-up |
|---|---|---|
| No live-DB integration run | No DB access in this session | Smoke `GET /api/qa/results` on test after deploy for one IU result at level 4 and one IPSR package with a repeated-row level |
| P-5: real `id → level` rows on test / prod not read | User check pending | Fixtures are synthetic; the rule reads `level` whatever the id |
| Complementary VS3 rule provenance | Deployed `validation_ipsr_step_three_P25` not re-read (user decision "as approved") | Optional: read the deployed body |
| `qa-catalog.module.spec.ts` red | Pre-existing `JwtService` import failure | Out of scope |
| Snapshot correctness on CRLF copies | LF CI is authoritative | Confirm in CI |
