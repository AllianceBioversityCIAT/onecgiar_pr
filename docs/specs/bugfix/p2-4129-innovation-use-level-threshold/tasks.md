# Tasks — Innovation Use level thresholds on the level number (P2-4129)

## 1. Scope of this task list

- **Module / feature:** P25 Innovation Use service (`onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/`). Bug Mode, Lite
- **Linked spec:** `requirements.md` (ULT-R-1..3) + `design.md` (DD-1..6, P-1..10)
- **Owner / driver:** Santiago Sanchez (ticket assignee)
- **Status:** executed — ULT-T-1 PASS 2026-11-23 (see `execution.md`)

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-23)
- [x] `design.md` approved (2026-11-23)
- [ ] P-5: user runs `SELECT id, level FROM clarisa_innovation_use_levels` on test + prod (impact only, non-blocking; same check as P2-3939 P-5)
- [x] No migration (ULT-NFR-1)
- [x] Baseline observed 2026-11-23 at `868a115a3`: `npx jest src/api/results-framework-reporting/innovation-use --silent --reporters=summary --forceExit` → `Test Suites: 9 passed, 9 total · Tests: 99 passed, 99 total`

## 3. Task list

### [x] ULT-T-1 — Gate the explanation, scaling answer and study links on the level number (regression first)

- **Type:** server + tests
- **Description:** Write the regression spec (DD-6) first and observe it red. Then:
  - keep the level number from the save-path `findOne` (DD-1);
  - move the gates at `innovation-use.service.ts:215`, `:254`, `:299` (explanation and answer ≥ 5; URLs deactivated < 6) and `:342` (sync ≥ 6) to the number (DD-2, DD-3);
  - gate `getScalingStudiesUrls` (`:1017`) on `Number(innDevExists.level)` ≥ 6 (DD-4, DD-5);
  - add one line to the module `CLAUDE.md`.
  - Backend route: lead `nestjs-expert` · test-first (`tdd`) · stack `nestjs-expert` (Skill Map)
- **Implements:**
  - ULT-R-1: all 4 scenarios, incl. `BUT` not kept because id ≥ 6, and `AND IT MUST` hold on the existing / new / duplicate-retry branches;
  - ULT-R-2: all 3 scenarios, incl. `BUT` answer not cleared at level 5;
  - ULT-R-3, ULT-NFR-1..3.
- **Files (expected):** `innovation-use.service.ts`, new `innovation-use.service.level-threshold.spec.ts`, `CLAUDE.md` (module guide); any existing `innovation-use.service.*.spec.ts` whose stub breaks (P-8)
- **Depends on:** — · **Blocks:** —
- **Estimate:** M
- **Review:** `full` — changes which stored values are kept and returned by a live write path
- **Verification:**
  - **Falsifier:** stub `findOne` with `{ id: 13, level: 2 }`, `{ id: 6, level: 5 }`, `{ id: 5, level: 4 }`, `{ id: 7, level: 6 }`; read stub `InnovUseExists` → `{ innovation_use_level_id: 13, level: 2 }` plus `{ innovation_use_level_id: 5, level: 6 }`. Mutations, each executed against the post-change code and reverted:
    - (a) any of the 4 save gates back on the row id → the 13/2 case keeps the explanation, or the 5/6 read returns `[]` → red;
    - (b) the explanation threshold at 6 → the 6/5 case clears the explanation → red;
    - (c) the URL threshold at 5 → the 6/5 case syncs URLs → red;
    - (d) the read gate on `innovation_use_level_id` → both read cases flip → red.

    Run (a) on **each** of `:215`, `:254`, `:299`, `:342` (enumeration-wide).
  - **Red run:** `predicted — greenfield artifact (observed in ULT-T-1)`. Command: `npx jest src/api/results-framework-reporting/innovation-use/innovation-use.service.level-threshold.spec.ts`. Predicted red: "row 13 / level 2 → explanation null" (received: the explanation) and "read row 13 / level 2 → []" (received: URLs). Quote verbatim in `execution.md` before changing the service; a red from setup or DI is not the red.
  - **Disqualifier:** a test that hand-writes the threshold comparison instead of calling `saveInnovationUse` / `getInnovationUse` is not evidence. A green where the duplicate-retry branch was never entered (assert the `ER_DUP_ENTRY` path ran) does not cover that branch.
  - **Consumers:** `innovation-use.service.use-level.spec.ts` (stubs `findOne` → `{ id: 3, level: '3' }`) and the other 8 `innovation-use.service.*.spec.ts`; `bilateral/handlers/innovation-use.handler.ts` (caller; its specs if any pin scaling fields). Grep `scaling_studies_urls\|readiness_level_explanation\|has_scaling_studies` over `src/**/*.spec.ts` and list the hits in the report.
- **Definition of done:**
  - [x] Red observed and quoted (assertion-level), then green
  - [x] Mutations (a) ×4, (b), (c), (d) executed → red, reverted
  - [x] `npx jest src/api/results-framework-reporting/innovation-use --silent --reporters=summary --forceExit` green (baseline 99 + new)
  - [x] Consumer grep listed and every hit's suite green
  - [x] `npx tsc --noEmit -p tsconfig.json` clean (falsifier: compare a `string | undefined` without `Number(...)` under strict typing → tsc red, if the type allows)
  - [x] `npx eslint "src/api/results-framework-reporting/innovation-use/**/*.ts" --quiet` clean
- **Skills:** `nestjs-expert`, `tdd`

## 4. Dependency graph

Single task.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| ULT-TEST-1 | unit (regression, red-first) | ULT-R-1, R-2 | `innovation-use.service.level-threshold.spec.ts` |
| ULT-TEST-2 | unit (existing suites) | ULT-R-3 | `innovation-use.service.*.spec.ts` |

### Coverage closure

| Requirement · scenario / clause | Owner |
|---|---|
| R-1 repeated row low level · `BUT` not kept by id | T-1 (13/2) |
| R-1 level 5 kept · `AND IT MUST` 3 branches | T-1 (6/5 × existing, new, duplicate retry) |
| R-1 level 4 cleared | T-1 (5/4) |
| R-1 no level | T-1 (NULL case) |
| R-2 save at 5 · `BUT` answer kept | T-1 (6/5 sync + answer) |
| R-2 read repeated row | T-1 (read 13/2) |
| R-2 read ≥ 6 | T-1 (read 5/6) |
| R-3 / NFR-1 | T-1 (no schema / DTO change; existing suites green) |
| NFR-2 no extra query | T-1 (read uses `InnovUseExists.level`) |
| NFR-3 number or string | T-1 (one case with `level: '5'`) |

## 6. Rollout & verification

- [ ] Commits `[P2-4129]` on `qa-development-2026-ss`, merged into `performance-refactor` like P2-3939
- [ ] Post-deploy: save a level-5 and a level-4 result on test; check the explanation is kept and cleared respectively
