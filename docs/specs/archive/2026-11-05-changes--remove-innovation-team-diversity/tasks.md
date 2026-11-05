# Tasks — Remove "Innovation team diversity" from the 2026 Innovation Development form

> **Answer first:** 4 tasks, ~120 LOC, one PR. T-1 (client) and T-2 (QA catalog) are independent; T-3 (DB function) is handed to Santiago; T-4 is the final check.

## 1. Scope of this task list

- **Spec:** `docs/specs/changes/remove-innovation-team-diversity/`
- **Requirements:** ITD-R-1..5 · **Design:** `design.md`
- **Status:** complete (2026-11-05)
- **Budget:** 4 tasks · ~120 LOC · 1 review round (tripwire)

## 2. Pre-flight checklist

- [ ] Branch from `qa-development-2026-ss` (current integration working branch).
- [ ] Test rules: Jest always `--maxWorkers=2`, scoped (`--testPathPattern` / `--findRelatedTests`), one run at a time.
- [ ] No DB access by the agent; DB steps are handed to Santiago with SQL inline in chat.

## 3. Task list

### ITD-T-1 — Hide the question on 2026+ Innovation Dev results (client) [x]

| Field | Value |
|---|---|
| Status | [x] done — PASS 2026-11-05 (execution.md) |
| Size | S (~30 LOC incl. tests) |
| Depends on | — |
| Requirements | ITD-R-1 (S1, S2), ITD-R-2 (S1 — render half), ITD-R-4 (S2) |
| Design | §6, ITD-DD-1, ITD-DD-2 |
| Skills | `angular-developer` |

**Scope**
- `innovation-dev-info.component.html`: wrap `<app-innovation-team-diversity>` (line ~161) in `@if (!this.fieldsManagerSE.isInnovationDevFormReduced2026())` with a comment citing this spec (style of the P2-3264 comment at line 78).
- Do NOT touch the component's `.ts` load/map path or the save body (ITD-DD-2).

**Tests** (`innovation-dev-info.component.spec.ts`)
- 2026 phase (gate true) → no `app-innovation-team-diversity` element; other blocks (e.g. IPR) still present.
- 2025 phase (gate false) → element present.
- Save body on 2026 still carries `innovation_team_diversity` unchanged from the GET (proves no wipe/no strip — ITD-R-4.S1 client half).

**Verification**
- `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.html src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.ts`
- `npx eslint <touched .ts files> --quiet`

**Would fail on:** gate inverted (2025 hidden), or the `@if` placed around a sibling block — the 2025 test expects the element and the 2026 test expects IPR present.
**Disqualifies the evidence:** a test that mocks `isInnovationDevFormReduced2026` but never renders the template (presence of the flag ≠ hidden element). jsdom cannot judge spacing → visual leftovers go to T-4.

**Done when:** both phase tests green, related specs green, lint clean.

---

### ITD-T-2 — Drop the field from the QA catalog (server) [x]

| Field | Value |
|---|---|
| Status | [x] done — PASS 2026-11-05 (execution.md) |
| Size | S–M (~60 LOC, mostly test/snapshot) |
| Depends on | — (parallel-safe with T-1) |
| Requirements | ITD-R-5 (S1) |
| Design | §5.2, ITD-DD-4 |
| Skills | `nestjs-expert` |

**Scope**
- `qa-catalog/definitions/sections/innovation-development.ts`: remove `innovation_dev.team_diversity` and its actions field; add "team diversity (this spec)" to the header's phase-gated 2026 removals note; drop now-unused constants.
- `closed-control-lists.ts`: remove `question_options_team_diversity` / `_actions` only if no other reference remains (grep first).
- Update `qa-catalog.innovation-development.spec.ts`, `qa-results.golden-bindings.spec.ts`, `__snapshots__/qa-catalog.snapshot.json`, `docs/qa-catalog.en.md`; bump `catalog_version` per `content-hash.ts:31`.

**Verification**
- `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern=qa-catalog`
- `npx eslint <touched .ts files> --quiet`

**Would fail on:** field still exported → the updated spec asserting its absence fails; version not bumped → content-hash test fails.
**Disqualifies the evidence:** regenerating the snapshot with `-u` without reading its diff — the diff must show only the team-diversity removal + version.

**Done when:** qa-catalog specs green, snapshot diff limited to this field, doc updated.

---

### ITD-T-3 — Phase short-circuit in `validation_innovation_dev_P25` (DB, handed off) [x]

| Field | Value |
|---|---|
| Status | [x] done — applied PROD + TEST, verified 2026-11-05 (execution.md) |
| Size | S (one condition) |
| Depends on | — (may run any time; T-4 needs it) |
| Requirements | ITD-R-3 (S1 incl. BUT clause), ITD-R-2 (S1 — green-check half) |
| Design | §5.1, ITD-DD-3, premises ITD-P-4/P-5 |
| Skills | `systematic-debugging` (verify against real rows) |

**Scope**
1. Santiago pastes the current function body from **test** (DBeaver).
2. Agent answers P-4 (is q112 required?) and P-5 (phase year reachable?). If q112 is not required → mark task `done (no-op)` with that evidence.
3. Otherwise agent returns, **inline in chat**, the body-only edit: team-diversity block → TRUE when phase year ≥ 2026, unchanged otherwise; plus a check query.
4. Santiago keeps the "before" body (rollback), applies on test, runs the check, then prod.

**Verification (SQL by Santiago, test then prod)**
- One 2026 Innovation Dev result complete except team diversity → section complete.
- One 2025 result in the same state → still incomplete.
- One 2025 result with a valid answer → still complete.

**Would fail on:** short-circuit not keyed on phase (2025 row turns complete) or wrong placement (2026 row stays incomplete).
**Disqualifies the evidence:** checking only the 2026 row; a check run on a result that had other missing fields (incomplete for another reason).

**Done when:** three rows behave as above on test and prod; before-body recorded in `execution.md`.

---

### ITD-T-4 — Data-safety + visual check [x]

| Field | Value |
|---|---|
| Status | [x] done — PASS 2026-11-05 (execution.md) |
| Size | XS |
| Depends on | T-1, T-3 |
| Requirements | ITD-R-4 (S1 server half), ITD-R-1 (visual) |
| Design | ITD-P-2, §6 |
| Skills | — |

**Scope**
- Before/after count of active `result_answers` for questions 112–121 on one 2026 result that has legacy answers (e.g. replicated), around one save on test/local — run by Santiago, SQL inline.
- Open that 2026 result and one 2025 result locally: 2026 has no question and no empty gap; 2025 shows its answers. No write buttons clicked beyond the one planned save (shared prdb).

**Would fail on:** count changes after save; 2025 result missing the question.
**Disqualifies the evidence:** a 2026 result with no stored answers (nothing to lose — proves nothing).

**Done when:** counts equal, visual check OK, noted in `execution.md`.

## 4. Dependency graph

```
T-1 ─┐
T-2  │ (independent)
T-3 ─┴─► T-4
```

## 5. Coverage (scenario/clause level)

| Clause | Owner |
|---|---|
| R-1.S1 hidden on 2026 | T-1 |
| R-1.S1 BUT rest of section unchanged | T-1 (IPR present assertion) + T-4 visual |
| R-1.S2 phase year not portfolio | T-1 (gate premise ITD-P-3, 2025-phase test) |
| R-2.S1 2025 renders answers | T-1 + T-4 |
| R-2.S1 AND green check still requires it | T-3 (2025 rows) |
| R-3.S1 2026 complete without answer | T-3 |
| R-3.S1 BUT 2025 stays incomplete | T-3 |
| R-4.S1 no answer change on save | T-1 (body) + T-4 (DB count) |
| R-4.S2 reversible, renders again | T-1 (2025 path = same render) + design §3 no deletion |
| R-5.S1 catalog + doc + snapshot | T-2 |

## 6. Rollout & roll-back

- One PR to `staging` (via qa-dev → performance-refactor for PRTest). Commit e.g. `✨ feat(innovation-dev) [SPEC:changes/remove-innovation-team-diversity]: hide team diversity question from 2026 phase`.
- DB function applied by Santiago test → prod, independent of the deploy (2026 rows simply stop needing the answer).
- Roll-back: revert the commit; re-apply the before-body of the function. No data restore.

## 7. Follow-ups

- Jira ticket id + reply to the feedback author.
- Open from precedent: P2-3263 task 5.1 (Megatrends/anticipated-user still in the P25 green check?) — check in the same function read during T-3 and report, do not fix here.
