# Proposal — Accepting a contributor with "Planned = No" wipes the owner's ToC indicators

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/contributor-accept-owner-indicators` |
| Slug | `contributor-accept-owner-indicators` — derived from free-text argument (symptom report + before/after payloads); routed to `bugfix/` per the Bug Track taxonomy |
| Type | Bug |
| Approval Mode | gated |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-11 |
| Jira | **unknown** — ask before specifying; search P2 by symptom first (`contribution request` / `planned` / `indicator`), duplicates of one defect across tickets are common here |
| Branch base | `performance-refactor` |
| Depends on | none |
| Parallel-safe | yes — one server repository method + its callers' tests; no client change, no migration |
| Related | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/components/notification-item/CLAUDE.md` (accept PATCH contract), P2-3187 / P2-3188 (accept flow history), P2-2932 (indicator read query) |
| Model note | Registry pins T1 → `opus`; this session ran on a newer generation. Registry entry is stale, not a downgrade — update `.agents/model-routing.md` on the default branch |

## 2. Intent

Accepting a contribution request must only ever write the **contributor's** ToC rows. The owner programme's mapping — node, indicator, target contribution — must survive the acceptance untouched, whatever the contributor answered to "Planned in your ToC?".

## 3. Problem / Current Behavior

Result `28922` (`result_id 32278`, P25, phase *Reporting 2026*, owner **SP01**) is mapped to HLO `AOW01` node `5926` with indicator `70f1200f…` and a contribution to target of 1 (`results_toc_result 42189`, indicator row `35494`, target row `24709`). SP05 is a pending contributor.

SP01 accepts SP05's request from *Notifications → Requests → Received* and answers **No** to "Planned". After the accept:

| | Owner SP01 (`42189`) | Contributor SP05 |
|---|---|---|
| **Before** | node 5926 · indicator `70f1200f…` · target 1 | pending, no ToC rows |
| **After** | node 5926 kept · **indicator and target gone** (`toc_results_indicator_id: null`, `target_value: null`) | new row `42196`: `planned_result: false`, `toc_result_id: null`, `toc_level_id: null` |

The same flow with **Yes** leaves both mappings intact. The user reads the SP05 row as an "orphan"; see §9 *Impact & Scope* — that row is the intended representation of "No", the defect is the owner's wipe.

## 4. Proposed Outcome

- Accept with **No**: owner rows and indicators unchanged; contributor gets one `planned_result = 0` row with no node (same shape the owner's own "No" produces via `_handlePlannedResult`).
- Accept with **Yes**: owner unchanged; contributor's rows and indicators written — **also when the contributor maps the same ToC node as the owner** (latent variant of the same defect, see §9).
- A regression test that is red on today's code for the *No* case.

## 5. Scope

- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts` → `saveIndicatorsPrimarySubmitter` (the write bottleneck all four callers share).
- Tests for that method and for `ShareResultRequestService.approveRequest` / `approveRequestV2` on the `planned_result: false` path.
- One-off data repair for the prtest row used to reproduce (`35494`), and a detection query for PROD (§12).

## 6. Non-Goals

- Redesigning the accept payload or the legacy `share-request-modal` flow (P2-3187 already settled Option A; the payload is correct — it carries `initiative_id: 54`, `toc_result_id: null`).
- Changing how "No" is stored (`toc_result_id NULL`) — it matches the owner's own representation.
- Touching the two-properties-one-column shape of `ResultsTocResult` (`initiative_ids` column + `initiative_id` relation). Worth a follow-up, out of scope here.
- Auditing every other TypeORM `where` in the repo for the same trap (§12 lists it as a risk, not a task).

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Owner programmes (SP submitters, P25) | Lose indicator + contribution-to-target silently when any contributor is accepted with "No"; the section still shows the node, so the loss is easy to miss until QA / green check |
| Contributor programmes | None functionally; their "No" row is written as intended |
| Server callers of `saveIndicatorsPrimarySubmitter` | `share-result-request.service.ts:1318` (V1+V2), `results-toc-results.service.ts:204`, `:1846` (`createTocMappingV2` → `_handleIndicators`), `:2483`, `ipsr/results-package-toc-result.service.ts:285` — all share the fix |
| Reporting reads | `getRTRPrimaryV2` is a faithful `LEFT JOIN … rtri.is_active = 1`; it reports the wipe, it does not cause it |

## 8. Visual Reference

- Source: None (server-side data defect). The user's screenshot of *Contributors & partners* before the accept (HLO N~1, indicator, target 1) and the two `/v2/api/contributors-partners/32278` payloads are the evidence; no mockup needed.
- Location: payloads quoted in §3 / §9; screenshot supplied in the session (not stored).

## 9. Bug Diagnosis

### Observed Symptom

After accepting a contribution request with "Planned = **No**", the owner programme's ToC indicator and its target contribution disappear from *Contributors & partners* (and from every read that joins active indicators). The owner's node mapping row itself survives. With "Yes" nothing is lost.

### Reproduction Steps

1. prtest, P25 result in an open phase (e.g. `28922`, phase 8 *Reporting 2026*), owner SP01 mapped to a node **with an indicator selected and a contribution to target**.
2. Add a pending contributor (SP05) from *Contributors & partners* → save.
3. As the accepting side, go to *Notifications → Requests → Received*, **Accept contribution** on that request, answer **No** to planned. The client sends `PATCH /v2/api/results/request/update` with `result_toc_result.planned_result: false` and one tab `{ initiative_id: 54, toc_result_id: null, indicators: [{ toc_results_indicator_id: null, … }] }` (`share-request-modal.component.ts:277-282` nulls the ids on "No").
4. Reload *Contributors & partners* (`GET /v2/api/contributors-partners/32278`).
5. **Expected:** owner unchanged; SP05 accepted with a `planned_result: false` row.
6. **Actual:** owner `result_toc_results[0].indicators[0]` is the all-null placeholder (`result_toc_result_indicator_id: 0`); SP05 row as expected.

### Root Cause (confirmed by code trace)

`approveRequestV2` (`share-result-request.service.ts:1478-1519`) does two writes for a `is_map_to_toc: false` request:

1. `mapWorkPackagesToInitiativeV2` inserts the contributor row (`42196`: `initiative_ids: 54, toc_result_id: null, planned_result: false`). Correct.
2. `saveIndicatorsForPrimarySubmitterV2` → `ResultsTocResultRepository.saveIndicatorsPrimarySubmitter(dto, 32278)` (`results-toc-results.repository.ts:2616`), which has to find the row to attach indicators to:

```ts
const rtrExist = await this.findOne({ where: {
  result_id: toc?.results_id || result_id,   // 32278
  initiative_id: toc?.initiative_id,          // 54
  toc_result_id: toc?.toc_result_id,          // null  ← "No"
  is_active: true,
}});
```

Two of those four filters do not survive TypeORM (`^0.3.20`, `node_modules/typeorm/query-builder/SelectQueryBuilder.js`):

- **`toc_result_id: null` is dropped.** `buildWhere` skips any key whose value is `undefined` **or `null`** (`:2468`); the `IS NULL` branch is commented out (`:2493`). Only `IsNull()` would filter.
- **`initiative_id: 54` is dropped.** On `ResultsTocResult`, `initiative_id` is the `@ManyToOne(ClarisaInitiative)` **relation** (`results-toc-result.entity.ts:84-88`); the plain column on the same DB column is `initiative_ids` (`:77-82`). For a relation, `buildWhere` recurses into `buildWhere(54, ClarisaInitiative, joinAlias)` (`:2631-2637`); `for (key in 54)` yields no keys, so the recursion returns `''` and nothing is added — a dead `LEFT JOIN clarisa_initiatives` is the only trace.

Effective query: `WHERE results_id = 32278 AND is_active = 1 LIMIT 1` → the **owner's** row `42189` (lowest PK). `saveInditicatorsContributing([placeholder], 42189)` then runs `UPDATE results_toc_result_indicators SET is_active = 0 WHERE results_toc_results_id = 42189` (`:1742`), the loop skips the placeholder (`indicatorId` null, `:1775`), and nothing is re-activated. Indicator `35494` is dead; the node row is untouched — exactly the after-state.

Why "Yes" works: the tab carries `toc_result_id = <node>`, which **is** filtered, so the lookup lands on the contributor's freshly inserted row. It only holds because contributors usually pick a node the owner did not — if both map the same node, the owner's row is again the lowest PK and gets wiped (latent).

The update `{ is_sdg_action_impact: undefined }` just before does not abort the flow: the entity has `@UpdateDateColumn`, so the statement is not empty. The C&P save that ran at 20:34:33 (it re-created SP05's request as `10182`) goes through the same method with the owner's own tab (`toc_result_id 5926`) and re-activates what it deactivates, so it is not the culprit — but it shares the hole.

### Impact & Scope

- **PROD exposure.** The lookup is old; the visible damage needs owner **indicators**, which P25 introduced. Any P25 result whose contributor was accepted with "No" is suspect. Detection (approximate — confirm on a copy):
  ```sql
  SELECT rtr_o.results_id, rtr_o.result_toc_result_id owner_rtr, rtr_c.result_toc_result_id contrib_rtr, rtr_c.created_date accepted_at
  FROM results_toc_result rtr_o
  JOIN results_by_inititiative rbi ON rbi.result_id = rtr_o.results_id AND rbi.inititiative_id = rtr_o.initiative_id AND rbi.initiative_role_id = 1 AND rbi.is_active = 1
  JOIN results_toc_result rtr_c ON rtr_c.results_id = rtr_o.results_id AND rtr_c.initiative_id <> rtr_o.initiative_id AND rtr_c.planned_result = 0 AND rtr_c.is_active = 1
  WHERE rtr_o.is_active = 1 AND rtr_o.planned_result = 1
    AND NOT EXISTS (SELECT 1 FROM results_toc_result_indicators i WHERE i.results_toc_results_id = rtr_o.result_toc_result_id AND i.is_active = 1)
    AND EXISTS     (SELECT 1 FROM results_toc_result_indicators i WHERE i.results_toc_results_id = rtr_o.result_toc_result_id AND i.is_active = 0);
  ```
- **Same hole, four callers** (§7). `createTocMappingV2 → _handleIndicators` and the IPSR share flow pass through the identical `findOne`.
- **Collateral in the same call:** `saveImpact` / `saveSdg` / `saveActionAreaToc(42189, undefined)` deactivate the owner row's impact-area, SDG and action-area links too (each does `update({result_toc_result_id}, {is_active:false})` before re-adding from an `undefined` list). Not visible in P25 today; would be in P22.
- **The SP05 row is not a defect.** `toc_result_id NULL` + `planned_result 0` is exactly what the owner's own "No" writes (`_handlePlannedResult`, `results-toc-results.service.ts:2645-2679`).
- Data repair for the repro row is one statement: `UPDATE results_toc_result_indicators SET is_active = 1 WHERE result_toc_result_indicator_id = 35494;` (target `24709` was never deactivated — only the indicator join hides it).

### Fix Strategy

Fix at the bottleneck, not per caller. Route: **`/akili-specify` (Lite) in Bug Mode** — logic change with a mandatory regression test. Not `/akili-quick`: it changes which DB row a write targets.

## 10. Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | **Make the lookup mean what it says**: `where: { result_id, initiative_ids: toc.initiative_id, toc_result_id: toc.toc_result_id ?? IsNull(), is_active: true }` — plain column instead of the relation, `IsNull()` instead of a dropped `null`; if nothing matches, do not touch anything (today it returns an error object nobody reads) | 3-line change; fixes all four callers and the "same node" latent case at once; no payload or client change | Leaves the two-properties-one-column entity shape in place |
| B | Skip `saveIndicatorsForPrimarySubmitter*` in the accept flow when `planned_result === false` (no indicators to save for an unplanned contributor) | Smallest diff in the accept service | Symptom fix: the "Yes + same node" variant, `createTocMappingV2` and the IPSR share keep the hole |
| C | Have `mapWorkPackagesToInitiative*` return the inserted `result_toc_result_id`s and attach indicators by id, no lookup | Removes the lookup entirely for the accept flow | Signature changes across V1/V2 and callers; `createTocMappingV2` still needs the lookup, so A is needed anyway |

## 11. Recommended Approach

**A**, plus one defense-in-depth assertion inside `saveIndicatorsPrimarySubmitter`: if the matched row's `initiative_ids` differs from the tab's `initiative_id`, log and skip instead of writing — the failure mode of this bug can never recur silently. Regression tests:

1. Repository spec: `saveIndicatorsPrimarySubmitter` with a tab `{ initiative_id: 54, toc_result_id: null }` — asserts `findOne` is called with `initiative_ids: 54` and `toc_result_id: IsNull()`, and that `saveInditicatorsContributing` is never handed a row of another initiative. Red today (today's where carries `initiative_id: 54, toc_result_id: null`).
2. Service spec: `approveRequestV2` on `planned_result: false` — owner indicators repository receives no `update` for the owner's row id.

Then re-run the §9 steps on prtest against `28922` after repairing `35494`.

## 12. Risks, Dependencies, And Open Questions

- **Jira:** no ticket identified. Confirm whether QA already logged this (likely under the P2 contribution-request epics); reuse it, never open a parallel one.
- **PROD data:** run the §9 detection query on PROD before release to size the repair; owners may need to re-select indicators if they were changed after the wipe. Coordinate the repair with Juan David (migrations/prod access) — it is data, not a migration.
- **Systemic risk:** `where: { <relation>: <primitive> }` and `where: { col: null }` are silent no-ops in this TypeORM version. A grep for other `findOne({ where: … initiative_id:` on entities where `initiative_id` is a relation is a cheap follow-up audit, out of this bug's scope.
- **Not blocking, worth confirming at runtime (10 s on prtest):**
  ```sql
  SELECT result_toc_result_indicator_id, results_toc_results_id, is_active, last_updated_date
  FROM results_toc_result_indicators WHERE results_toc_results_id IN (42189, 42196);
  ```
  Expect `35494` with `is_active = 0` and `last_updated_date` **after** `2026-09-11 20:34:33` (the C&P save), i.e. at the accept.

## 13. Success Criteria

- Accept with **No** on a result whose owner has an indicator + target: `GET /v2/api/contributors-partners/:id` returns the owner's indicator and `target_value` unchanged; contributor row present with `planned_result: false`.
- Accept with **Yes** on the **same node** the owner uses: both rows keep their own indicators.
- The two regression tests are red before the fix and green after; existing `share-result-request` and `results-toc-results` suites stay green (`--testPathPattern`, never the full suite).
- No client change, no migration; `npm run migration:check` clean.

## 14. Next Step

```text
/akili-specify bugfix/contributor-accept-owner-indicators
```

in **Bug Mode** — convert §9 into the fix plan and the mandatory regression test.
