# Requirements — Accepting a contributor must never touch the owner's ToC indicators

## 1. Module / Feature

- **Module:** `results` (defect lives in `results-toc-results`, surfaces through `share-result-request`)
- **Sub-feature:** contribution-request acceptance → contributor ToC mapping (`saveIndicatorsPrimarySubmitter`)
- **Owner:** Juan David Delgado (j.delgado@cgiar.org)
- **Status:** draft
- **Ticket(s):** none — owner decision 2026-09-11: proceed without a Jira ticket
- **Depth:** Lite · **Mode:** Bug · **Approval Mode:** gated
- **Requirement prefix:** `RTR` (results-toc-results)
- **Proposal:** `./proposal.md` (root cause confirmed by code trace, §9)

## 2. Context

When a contribution request is accepted, the server writes the contributor's ToC rows and then attaches the contributor's indicators to the row it just wrote. The "find the row" step (`ResultsTocResultRepository.saveIndicatorsPrimarySubmitter`) filters on `initiative_id` and `toc_result_id`, but TypeORM 0.3 silently drops both: `null` values are skipped, and `initiative_id` is the `@ManyToOne` relation on this entity, so a primitive value on it builds no condition. With **Planned = No** the tab carries `toc_result_id: null`, the lookup degrades to `WHERE results_id = ? AND is_active = 1 LIMIT 1`, lands on the **owner's** row, and deactivates the owner's indicators. With **Yes** the node id keeps the lookup honest — unless the contributor picks the owner's own node.

Baseline this spec answers to:

- `docs/prd.md` — **AC-1** typed result integrity, **AC-6** evidence and ToC alignment at submit (an owner whose indicator vanished fails the green check with no action of their own).
- `docs/trd/trd.md` — `results` module, entities `results_toc_result`, `results_toc_result_indicators`, `result_indicators_targets`; **W4** notifications (the accept lives in the contribution-request flow).
- `docs/ux-ui/design.md` — no UI change; *Contributors & partners* (P25) is where the loss is visible.
- `onecgiar-pr-client/.../notification-item/CLAUDE.md` — the accept PATCH contract this spec must not change.

## 3. In Scope / Out of Scope

### In scope

- The indicator-attach step targets only a ToC row of the **tab's own initiative**, for every caller of `saveIndicatorsPrimarySubmitter` (accept V1/V2, `createTocMappingV2 → _handleIndicators`, IPSR share).
- Regression coverage that fails on current code for the *Planned = No* accept.
- Repair of the prtest row used to reproduce (indicator `35494` on `results_toc_result 42189`).

### Out of scope

- Payload, client or accept-flow redesign (P2-3187 settled Option A; the payload is correct).
- How "No" is stored (`toc_result_id NULL`, matching the owner's own `_handlePlannedResult`).
- The two-properties-one-column shape of `ResultsTocResult` (`initiative_ids` column + `initiative_id` relation) → follow-up.
- Repo-wide audit of other `where: { <relation>: <primitive> }` / `where: { col: null }` usages → follow-up (`design.md` §13).
- PROD data repair — sized separately with the detection query in `proposal.md` §9 (`RTR-OQ-2`).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (owner SP) | Keeps indicator + contribution to target after any contributor is accepted |
| Contributor SP member | Nothing visible — their "No" / "Yes" row is written exactly as today |
| QA reviewer | Stops seeing owners who "lost" their indicator between save and QA |
| Platform admin | Nothing |

## 5. User Stories

- **`RTR-US-1`** — As an owner submitter, I want accepting a contributor to leave my ToC mapping exactly as I saved it, so that my indicator and contribution to target are never silently removed. *Refines `US-S*` submission stories; enforces `AC-1`, `AC-6`.*

## 6. Functional Requirements

### Required (MUST)

- **`RTR-R-1`** When a contribution request is accepted with **Planned = No**, the system MUST write one `planned_result = false` row for the contributor (no ToC node) and MUST leave every active indicator and target of every other initiative on that result unchanged.
- **`RTR-R-2`** When a contribution request is accepted with **Planned = Yes**, the system MUST attach the contributor's indicators to the **contributor's** row — including when the contributor maps the same ToC node the owner uses — and MUST leave the owner's indicators unchanged.
- **`RTR-R-3`** The indicator-attach step MUST resolve its target row by `(result, tab's initiative, tab's node — where "no node" means `IS NULL`, not "any")`. If no such active row exists it MUST write nothing and MUST NOT fall back to a row of another initiative.

### Should (SHOULD)

- **`RTR-R-4`** When `RTR-R-3` finds no matching row, the system SHOULD log a warning naming result id, initiative id and node id (no user data, no secrets) so the skipped write is traceable.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No migration, no DTO change, no client change; `PATCH /api|v2/api/results/request/update` request/response shapes unchanged. |
| **Performance** | The corrected lookup MUST remain one indexed `SELECT` per tab (same as today); no extra queries in the accept path. |
| **Security** | Unchanged — JWT-gated endpoints; the warning in `RTR-R-4` MUST NOT include tokens, emails or names (`.cursorrules`, `AC-9`). |
| **Observability** | `RTR-R-4` warning through the module `Logger`; no new noise on the happy path. |
| **Data integrity** | After the fix, no accept path can deactivate a `results_toc_result_indicators` row whose parent `results_toc_result.initiative_id` differs from the tab's initiative. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RTR-AC-1` | Result with owner row `A` (initiative 50, node 5926, one active indicator + target) and a pending contributor 54 | Accept PATCH with `planned_result: false`, tab `{ initiative_id: 54, toc_result_id: null, indicators: [placeholder] }` | A new row for 54 with `planned_result = 0`, `toc_result_id NULL`; owner indicator and target still active; **no** `UPDATE` on indicators of row `A`. |
| `RTR-AC-2` | Same owner row `A`; contributor 54 maps node **5926** with indicator `X` | Accept PATCH with `planned_result: true` | Indicator `X` attached to the **54** row; owner indicator untouched. |
| `RTR-AC-3` | Tab `{ initiative_id: 54, toc_result_id: null }` but the result has **no** active row for 54 | The attach step runs | Nothing is deactivated or inserted; a warning is logged; the accept still returns success. |
| `RTR-AC-4` | The existing `share-result-request`, `results-toc-results` and `results-package-toc-result` suites | Run after the fix | All green with **zero** assertions edited. |

### Scenario — the exact failing case (`RTR-R-1`, `RTR-AC-1`)

- GIVEN result `32278` whose owner SP01 has `results_toc_result 42189` (node 5926) with active indicator `35494` and target `24709`
- AND SP05 has a pending contribution request
- WHEN the request is accepted with `planned_result: false` and a tab `{ initiative_id: 54, toc_result_id: null, indicators: [{ toc_results_indicator_id: null }] }`
- THEN a row for SP05 exists with `planned_result = 0` and `toc_result_id IS NULL`
- AND indicator `35494` and target `24709` remain `is_active = 1`
- BUT the attach step must NOT issue any write against `results_toc_results_id = 42189`
- AND IT MUST resolve its target with the initiative filter applied on the **plain column** and the null node as `IS NULL`.

### Scenario — the latent variant (`RTR-R-2`, `RTR-AC-2`)

- GIVEN the same owner row on node 5926
- WHEN SP05 is accepted with `planned_result: true`, tab `{ initiative_id: 54, toc_result_id: 5926, indicators: [X] }`
- THEN indicator `X` is written under SP05's row
- BUT the owner's indicator on 42189 must NOT be deactivated
- AND IT MUST pick SP05's row even though both rows share `toc_result_id = 5926`.

Cross-cutting project ACs that already apply: `AC-1`, `AC-3`, `AC-6`, `AC-9`.

## 9. Defect classes and the gate for each

| # | Defect this spec can produce | Gate | Blind spot / substitute |
|---|---|---|---|
| D1 | Lookup still resolves to another initiative's row | `RTR-TEST-1` (repository spec, red today) asserts the `where` carries `initiative_ids` and `IsNull()` **and** that `saveInditicatorsContributing` never receives a row id of another initiative | — |
| D2 | Fix regresses the Yes path or the other three callers | Existing suites: `--testPathPattern="share-result-request\|results-toc-results\|results-package-toc-result"` unchanged | — |
| D3 | `IsNull()` / plain-column `where` compiles in mocks but not against MySQL | **No automated gate** — repository specs mock `findOne`, so SQL generation is never exercised | Human check at the HITL pause: repair `35494`, re-run proposal §9 steps on prtest, confirm owner indicator survives (`GET /v2/api/contributors-partners/32278`) |
| D4 | Type or lint break | `npx tsc --noEmit`, `npx eslint … --quiet` | — |
| D5 | prtest / PROD repair statement wrong or incomplete | none automated | Accepted risk: repair is one `UPDATE` by primary key, verified by the same GET as D3; PROD sizing is `RTR-OQ-2` |

## 10. Dependencies & Assumptions

- **TypeORM `^0.3.20` semantics** — `null` in `where` is skipped, a primitive on a relation builds no condition (verified in `node_modules/typeorm/query-builder/SelectQueryBuilder.js:2468, :2631-2637`). A future upgrade that changes this makes the fix redundant, never wrong.
- The accept payload keeps carrying the contributor's `initiative_id` on every tab (client contract, `notification-item/CLAUDE.md`).
- prtest result `32278` is available for the manual re-check; its indicator `35494` is repaired before the check.

## 11. Open Questions

- `RTR-OQ-1` ~~Jira ticket~~ — **resolved 2026-09-11:** owner decided no ticket is needed.
- `RTR-OQ-2` PROD exposure: run the detection query (`proposal.md` §9) and decide whether affected owners are repaired by SQL or asked to re-select. **Does not block design or execution; blocks release notes.**

## 12. Out-of-Band Notes

- Same method, four callers: the fix must land once, in the repository, not per caller.
- Registry note carried from the proposal: `.agents/model-routing.md` T1 entry is stale (`opus`); update on the default branch.
