# Design — Scope the indicator-attach lookup to the tab's own ToC row

## 1. Summary

One repository method, `ResultsTocResultRepository.saveIndicatorsPrimarySubmitter` (`onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts:2616`), resolves the row it attaches indicators to with a `where` that TypeORM silently narrows to `results_id + is_active`. The design makes that `where` mean what it says — plain initiative column, explicit `IS NULL` for "no node" — and adds one guard so the method can never write against a row of another initiative. Server-only, no schema, no API, no client change; the four callers inherit the fix.

- Requirements: `./requirements.md` (`RTR-R-1 … R-4`, `RTR-AC-1 … AC-4`)
- Root cause: `./proposal.md` §9
- Baseline: `docs/trd/trd.md` `results` module / W4; `docs/prd.md` AC-1, AC-6

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/results-toc-results/repositories/results-toc-results.repository.ts` (fix + guard), its spec (regression tests). Read-only context: `api/results/share-result-request/share-result-request.service.ts` (callers `approveRequest*`), `results-toc-results.service.ts` (`_handleIndicators`), `ipsr/results-package-toc-result/…service.ts`.
- **Client modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence — accept with Planned = No (after the fix)

```
[notification-item / share-request-modal]
  └── PATCH v2/api/results/request/update  { result_toc_result: { planned_result:false, result_toc_results:[{initiative_id:54, toc_result_id:null, indicators:[placeholder]}] } }
        └── ShareResultRequestService.updateResultRequestByUserV2
              ├── request_status_id → 2
              ├── approveRequestV2
              │     ├── mapWorkPackagesToInitiativeV2 → INSERT results_toc_result (initiative 54, node NULL, planned 0)
              │     └── saveIndicatorsForPrimarySubmitterV2 → repository.saveIndicatorsPrimarySubmitter
              │           └── findOne WHERE results_id=? AND initiative_id=54 AND toc_result_id IS NULL AND is_active=1   ← was: results_id + is_active only
              │                 ├── found & same initiative → saveInditicatorsContributing(row 54): deactivates nothing of the owner, placeholder skipped
              │                 └── not found / other initiative → warn, write nothing (RTR-R-3/R-4)
              └── emitContributionDecisionNotification
```

The owner's row `42189` is never selected, so its indicators are never touched.

## 3. Data Model Changes

None. No entity change, no migration (`npm run migration:check` stays clean). The two-properties-one-column shape of `ResultsTocResult` (`initiative_ids` column, `initiative_id` relation, both on `initiative_id`) is left as is — §13.

## 4. API Surface

Unchanged. `PATCH /api/results/request/update` and `PATCH /v2/api/results/request/update` keep their DTOs, responses and status codes. No bilateral / platform-report impact.

## 5. Server Workflow / Business Rules

Inside `saveIndicatorsPrimarySubmitter`, per tab:

1. **Resolve the target row** by `result` (`toc.results_id ?? result_id`), **`initiative_ids`** (the plain column — the same property `mapWorkPackagesToInitiative*` and `createTocMappingV2` write), **`toc_result_id`** (the tab's node, or `IsNull()` when the tab has none — never a bare `null`), and `is_active: true`.
2. **Guard** — if a row comes back whose `initiative_ids` is not the tab's initiative, treat it as *not found*. This cannot happen once (1) is correct; it exists so a future regression of (1) fails loudly instead of repeating this bug.
3. **Not found** — keep today's early return (no writes for this call) and add a `Logger.warn` naming result id, initiative id and node id (`RTR-R-4`). No user data.
4. **Found** — unchanged downstream: `is_sdg_action_impact` update, `saveImpact` / `saveSdg` / `saveActionAreaToc`, `saveInditicatorsContributing` on **that** row.

Nothing else in the accept flow changes. The contributor's "No" row (`toc_result_id NULL`, `planned_result 0`, `toc_level_id NULL`) is the intended representation and is out of scope (`requirements.md` §3).

## 6. Frontend Plan

None.

## 7. Security & Authorization

Unchanged. The new warning must contain only numeric ids (`.cursorrules`, AC-9).

## 8. Performance & Capacity

One `SELECT` per tab, as today, now with two more equality/`IS NULL` predicates on indexed-or-small columns. No extra round trips.

## 9. Observability

- New `warn` in `saveIndicatorsPrimarySubmitter` when no matching row exists — event text fixed, ids as fields. Happy path stays silent.

## 10. Testing Plan

Strategy, not the test list (`tasks.md` §5):

- **Regression at the bottleneck (red today).** Extend `results-toc-results.repository.spec.ts` (it already builds the repository with mocked collaborators, P2-3608 block). Stub `repo.findOne` and `repo.saveInditicatorsContributing`; drive a tab `{ initiative_id: 54, toc_result_id: null, indicators: [placeholder] }`; assert the `where` carries `initiative_ids: 54` and `toc_result_id` equal to `IsNull()`, has **no** `initiative_id` key, and that a `findOne` returning a row with `initiative_ids: 50` results in **no** call to `saveInditicatorsContributing`. Today's code fails both assertions.
- **Same-node variant (`RTR-R-2`).** Tab with `toc_result_id: 5926`; `findOne` returns `{ initiative_ids: 54 }` → `saveInditicatorsContributing` called with that row id (`RTR-AC-2`).
- **Not found.** `findOne` → `null`; assert no writes and one `warn` (`RTR-AC-3`).
- **Existing suites unchanged.** `share-result-request`, `results-toc-results`, `results-package-toc-result` — zero assertions edited (`RTR-AC-4`, defect class D2).
- **What mocks cannot prove (D3).** SQL generation of `IsNull()` + plain column is verified by the manual prtest re-run at the HITL pause, after repairing indicator `35494`.

## 11. Backwards Compatibility & Migration Plan

- No migration, no flag, no contract change.
- Rollback = revert the single commit.
- **Data repair (prtest, part of rollout):** `UPDATE results_toc_result_indicators SET is_active = 1 WHERE result_toc_result_indicator_id = 35494;` — target `24709` was never deactivated. Run by the owner before the D3 check.
- **PROD** is sized with `proposal.md` §9's detection query — `RTR-OQ-2`, outside this spec's execution.

## 12. Design Decisions

### `RTR-DD-1` — Fix at the repository bottleneck, not per caller

- **Context:** four callers (`approveRequest`, `approveRequestV2`, `createTocMappingV2 → _handleIndicators`, IPSR share) funnel into one lookup.
- **Decision:** correct the lookup once in `saveIndicatorsPrimarySubmitter`.
- **Alternatives:** (a) skip the call in the accept flow when `planned_result === false` — symptomatic, leaves the same-node and C&P/IPSR holes; (b) return inserted ids from `mapWorkPackagesToInitiative*` and attach by id — larger signature change across V1/V2 and still needs (this) lookup for `createTocMappingV2`.
- **Consequences:** one diff protects all paths; the method name (`…PrimarySubmitter`) stays misleading — rename deferred (§13).

### `RTR-DD-2` — Filter on `initiative_ids` and `IsNull()`, not on the relation and `null`

- **Context:** TypeORM 0.3 drops `null` values in `where` and builds no condition for a primitive on a `@ManyToOne` property (`SelectQueryBuilder.js:2468, :2631-2637`).
- **Decision:** use the plain column property `initiative_ids` (what every writer sets) and `IsNull()` for "no node".
- **Alternatives:** relation-object form `initiative_id: { id: 54 }` — works but joins `clarisa_initiatives` and couples the lookup to relation metadata; raw SQL — loses the `Repository` API for one predicate. Neither adds safety over the plain column.
- **Consequences:** identical intent, now enforced by the SQL that actually runs. The dead `LEFT JOIN` disappears.

### `RTR-DD-3` — Same-initiative guard after the lookup

- **Context:** the failure mode of this bug is *silent*: a wrong row is found and written.
- **Decision:** if the found row's `initiative_ids` differs from the tab's initiative, treat as not found and warn.
- **Alternatives:** trust the corrected `where` alone — correct today, silent again if the entity mapping or ORM semantics move.
- **Consequences:** one comparison; makes the regression test's strongest assertion ("never hands another initiative's row downstream") a property of the code, not only of the query.

### `RTR-DD-4` — Keep the not-found early return; add a warning only

- **Context:** today a missing row returns an error object the callers ignore, aborting remaining tabs of the same call.
- **Decision:** keep that control flow (Bug Mode: fix the root cause, no bundled behavior change), add the `warn`.
- **Alternatives:** `continue` to the next tab — arguably better, but new behavior with no ticket behind it.
- **Reversion challenge (Step 2.3):** not applicable — nothing already delivered is removed or inverted; the only behavior taken away is the wrong row selection, which is the defect.

## 12.1 Budget (Step 2.4)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 3 (regression tests · fix + guard + warn · rollout/data-repair check) | ~80 (≈15 fix, ≈60 tests, ≈5 docs) | 1 |

Matches **Lite**. `/akili-execute` escalates if actuals exceed this.

## 13. Open Gaps & Follow-ups

- Rename `saveIndicatorsPrimarySubmitter` → it serves contributors too; and collapse `initiative_ids` / `initiative_id` into one property on `ResultsTocResult`. Both touch many call sites — separate refactor.
- Repo-wide audit for `where: { <ManyToOne prop>: <primitive> }` and `where: { col: null }` (TypeORM silently ignores both). `results.service.ts:3008` already uses `IsNull()` correctly — precedent to cite.
- `RTR-OQ-2` PROD sizing and repair decision.
- The same `saveImpact/saveSdg/saveActionAreaToc(row, undefined)` calls still deactivate-then-nothing on the *correct* row when a tab carries no lists — harmless for P25 accepts (no such links on a fresh row), noted for P22.
