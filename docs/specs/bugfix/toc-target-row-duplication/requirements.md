# Requirements — Saving the ToC section must update its target rows, not multiply them

## 1. Module / Feature

- **Module:** `results` (defect lives in `results-toc-results`, surfaces through `results-framework-reporting/contributors-partners`)
- **Sub-feature:** ToC indicator targets write path (`saveInditicatorsContributing`) + the catalog metas the GET injects
- **Owner:** Juan David Delgado (j.delgado@cgiar.org)
- **Status:** draft
- **Ticket(s):** `P2-3817` item 6 (under story `P2-2932`). Items 1-5, 7, 8 of that ticket belong to the consistency-check feature and are **out of scope**
- **Depth:** Standard · **Mode:** Bug · **Approval Mode:** gated
- **Requirement prefix:** `TTD` (toc-target-duplication)
- **Proposal:** `./proposal.md` (root cause confirmed by code trace, §9)

## 2. Context

The *Contributors & partners* section (2026 form) saves its ToC mapping through one bottleneck, `ResultsTocResultRepository.saveInditicatorsContributing`. For every meta that comes from the ToC catalog that write cannot recognise the row it already owns, so it inserts a new one — every save, without ceiling.

Two id vocabularies collide. The GET fills the payload field `indicators_targets` — the PRMS auto-increment primary key — with a **ToC** id (`results-toc-results.service.ts:3329`), and the write reads it back as a primary key (`repository.ts:1883-1892`). The fallback lookup then compares the meta's raw `number_target` against rows written with a canonical value the same method stamps on every meta (`:1899` vs `:1916`). Both lookups miss; `save()` runs (`:1933`).

The same method first deactivates **every** target of the indicator (`:1857-1866`). A row written by the creation flow — which stores the meta's own `number_target` and the contribution the reporter typed (`framework-result-toc-indicators.service.ts:215-247`, `create-result-payload.util.ts:308-310`) — is therefore deactivated and never re-found, and the GET filters `rit.is_active = 1` (`repository.ts:483-484`). That is the reported symptom: the contribution disappears on the first save of the section.

Baseline this spec answers to:

- `docs/prd.md` — **AC-1** typed result integrity (a result must not accumulate contradictory rows for one meta), **AC-6** ToC alignment at submit (a dropped contribution fails the green check through no action of the reporter's), **AC-7** soft delete (`is_active = 0` must mean "retired", not "lost").
- `docs/trd/trd.md` — `results` module and the `toc/` module (§175, §450: PRMS attaches results to ToC, never authors it); entities `results_toc_result`, `results_toc_result_indicators`, `result_indicators_targets`.
- `docs/ux-ui/design.md` — no UI change. The loss is visible in *Contributors & partners* → *Contribution to Indicator Target*.
- Sibling spec `bugfix/reported-results-center-scoping` — introduced `result_indicators_targets.toc_indicator_target_id` (migration `1790002419754`) and documents NULL as the tested fallback state for read paths.

## 3. In Scope / Out of Scope

### In scope

- Row identity on the shared write bottleneck: a meta is matched to the row it already owns, for every one of its five callers.
- Row identity stops depending on `number_target`, whose stored value is left exactly as today (canonical) because three other consumers key off it.
- Deactivation limited to the metas a save did not re-affirm.
- The GET stops putting a ToC id into `indicators_targets`.
- Regression coverage that is red on `ca99689b4` for both the duplication and the lost contribution.
- Repair of the rows already created on prtest for `result_id 12055`, plus a detection query for the other environments.

### Out of scope

- The `contribution_consistency` feature — P2-3817 items 1-5, 7, 8 (Yecksin; `22c4ca658`, `e688c0cdf` already pushed).
- Re-keying the creation-flow writer (`framework-result-toc-indicators.service.ts`), which upserts by `number_target` — sibling risk, recorded in `design.md`, not a task here.
- The client's single-target assumption (`multiple-wps-content.component.ts:108` binds `targets?.[0]`).
- A DB unique constraint on `(result_toc_result_indicator_id, toc_indicator_target_id)` — follow-up once this has held one phase.
- Backfilling `toc_indicator_target_id` across history beyond what the repair touches.
- PROD repair execution — sized separately from the detection query (`TTD-OQ-2`).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | The contribution typed at creation survives the first save; the section stops flipping back to "required, missing" |
| QA reviewer | Stops seeing results whose ToC contribution vanished between save and QA |
| PMU / portfolio lead | Progress aggregates stop being exposed to duplicate rows that would multiply a reported value |
| Platform admin | One-off repair on prtest; detection query available for the rest |

## 5. User Stories

- **`TTD-US-1`** — As a result submitter, I want the contribution I entered to still be there after I save the section, so that I do not have to retype it to make the section complete. *Enforces `AC-1`, `AC-6`.*
- **`TTD-US-2`** — As a platform owner, I want one row per ToC meta however many times a section is saved, so that progress aggregates read one answer per meta. *Enforces `AC-1`.*

## 6. Functional Requirements

### Required (MUST)

- **`TTD-R-1`** Saving the ToC mapping twice with an unchanged payload MUST leave the set of active `result_indicators_targets` rows for the indicator unchanged — same count, same ids.
- **`TTD-R-2`** A contribution already stored for a meta MUST survive any save whose payload does not change it, including the first save of the section after the result was created from the ToC panel.
- **`TTD-R-3`** The write MUST resolve the row a meta owns by a stable identity: the ToC target id when one is available for the meta, otherwise `number_target` + `target_date`, matching both stored conventions (the canonical value this path writes and the meta's own value the other two writers store). It MUST NOT treat a ToC-namespace id as a `result_indicators_targets` primary key.
- **`TTD-R-4`** When the write resolves a row whose `toc_indicator_target_id` is NULL, it MUST backfill that column so the next save resolves by identity.
- **`TTD-R-5`** The stored `number_target` MUST keep resolving exactly as it does today (the ToC canonical value for the indicator). Row identity MUST NOT depend on it, so two metas of one indicator MUST be able to coexist as distinct active rows while sharing that value.
- **`TTD-R-6`** A save MUST deactivate only the metas it did not re-affirm. A meta present in the payload MUST NOT pass through an intermediate state where the value it already holds is unreachable.
- **`TTD-R-7`** The GET for the section MUST NOT report a ToC id in `indicators_targets`. A meta with no PRMS row yet MUST report `indicators_targets: null` and carry its ToC id in a field that means the ToC id.
- **`TTD-R-8`** Rows already duplicated MUST be collapsible to one active row per meta, preferring the row that carries a `contributing_indicator`, and the repair MUST leave every indicator with at least the active rows it had answers for.

- **`TTD-R-10`** The GET MUST report each ToC meta once. A meta that already has a stored row MUST NOT also be appended as a catalog entry.

### Should (SHOULD)

- **`TTD-R-9`** When a meta cannot be resolved to any ToC target for the indicator and reporting year, the system SHOULD log a warning naming result id, indicator id and the unresolved number (no user data, no secrets) instead of silently inserting.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No migration (the column exists since `1790002419754`), no DTO removal. `indicators_targets` keeps its meaning — the change is that it stops carrying a foreign id. A client that ignores the new field MUST keep working: identity is resolved server-side. |
| **Data integrity** | After the fix, no save path may leave two active rows for one `(result_toc_result_indicator_id, toc_indicator_target_id)` pair; and no save may leave a meta's previously stored `contributing_indicator` unreachable (`is_active = 0` with no active successor carrying it). |
| **Performance** | The write MUST stay within one catalog read per indicator per save (the existing `getCanonicalIndicatorTarget` cache is the budget); no per-meta round trip to the ToC database. |
| **Security** | Unchanged — JWT-gated. The `TTD-R-9` warning MUST NOT include tokens, emails or names (`.cursorrules`, `AC-9`). |
| **Observability** | `TTD-R-9` through the module `Logger`; no new noise on the happy path. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `TTD-AC-1` | An indicator whose payload carries 11 ToC metas and no stored rows | The section is saved twice with the same payload | 11 active rows after the first save, the **same 11** after the second — no insert on the second save. |
| `TTD-AC-2` | A result created from the ToC panel with a contribution of 6 stored on meta `M` | The section is saved once with the payload the GET returned | Meta `M` still carries 6, active, and the GET returns it. |
| `TTD-AC-3` | A payload meta carrying `indicators_targets` equal to a ToC target id | The write resolves the row | No lookup is issued against `result_indicators_targets` by primary key with that value, and the row is resolved by the ToC target id instead. |
| `TTD-AC-4` | An indicator with two ToC metas that resolve to the **same** canonical `number_target` | The section is saved, twice | Two active rows throughout, told apart by `toc_indicator_target_id` — neither collapsed onto the other, neither duplicated. |
| `TTD-AC-5` | A stored row whose `toc_indicator_target_id` is NULL, matched by number and date | The section is saved | The row is updated in place and its `toc_indicator_target_id` is filled. |
| `TTD-AC-6` | A stored meta that the new payload no longer contains | The section is saved | That row is deactivated; every meta still in the payload stays active. |
| `TTD-AC-7` | `result_id 12055` with its duplicated rows | The repair runs | One active row per meta, each carrying the value it had if any; per-indicator active-row counts recorded before and after. |
| `TTD-AC-8` | The existing `results-toc-results`, `contributors-partners` and `share-result-request` suites | Run after the fix | Green with **zero** assertions edited. |
| `TTD-AC-9` | A meta that already has a stored row, plus the catalog read for the same indicator | The GET builds the section payload | That meta appears once in `targets`, not twice. |
| `TTD-AC-10` | The stored `number_target` of any row this path writes | Compared before and after the fix for the same payload | Identical — the fix changes no stored `number_target`. |

### Scenario — the duplication (`TTD-R-1`, `TTD-AC-1`)

- GIVEN result `12055`, whose indicator carries 11 ToC metas for reporting year 2026 with `number_target` 17, 28 … 127
- AND the payload the GET returned for that indicator
- WHEN *Contributors & partners* is saved, and saved again with the same payload
- THEN `result_indicators_targets` holds 11 active rows for that indicator after both saves
- AND the rows are told apart by `toc_indicator_target_id`, which is what makes them distinguishable while they share the canonical `number_target`
- BUT the second save must NOT execute an INSERT for any meta already stored
- AND IT MUST resolve every meta by its ToC target id, not by the incoming `indicators_targets` read as a primary key.

### Scenario — the lost contribution (`TTD-R-2`, `TTD-R-6`, `TTD-AC-2`)

- GIVEN a result created from the ToC "Report result" panel with *Contribution to Indicator Target* = 6, stored by the creation flow against meta `M` with `M`'s own `number_target`
- WHEN the reporter opens *Contributors & partners* and saves the section once without editing the field
- THEN the row for `M` is still active and still carries 6
- AND a reload of the section shows 6 in the field
- BUT the save must NOT deactivate that row without re-affirming it in the same operation
- AND IT MUST NOT insert a second row for `M` carrying `contributing_indicator` null.

### Scenario — the legacy row (`TTD-R-3`, `TTD-R-4`, `TTD-AC-5`)

- GIVEN a stored row for meta `M` written before this fix, with `toc_indicator_target_id` NULL
- WHEN the section is saved with a payload that carries `M`
- THEN the existing row is updated in place
- AND its `toc_indicator_target_id` is filled with `M`'s ToC target id
- BUT a new row must NOT be inserted for `M`
- AND IT MUST match the legacy row on the same resolved `number_target` the write itself uses **and** its `target_date`, never on a number the payload alone supplied.

Cross-cutting project ACs that already apply: `AC-1`, `AC-3`, `AC-6`, `AC-7`, `AC-9`.

## 9. Defect classes and the gate for each

| # | Defect this spec can produce | Gate | Blind spot / substitute |
|---|---|---|---|
| D1 | Identity still misses → rows keep multiplying | `TTD-TEST-1`: repository spec, red on `ca99689b4`, drives two consecutive saves of the same multi-meta payload through the real method with mocked repositories and asserts `save()` is called on the first pass only | — |
| D2 | The stored contribution is still dropped on the first save | `TTD-TEST-2`: red today — a stored row carrying a value, a payload that re-affirms it, assert the row is updated and never left `is_active = 0` without a successor carrying the value | — |
| D3 | Metas collapse onto one row — the naive "key the fallback lookup on the canonical value" fix | `TTD-TEST-3`: two metas that resolve to the **same** canonical number MUST produce two distinct active rows. **The fixture must carry two metas sharing one canonical value** — a fixture whose metas differ by number cannot tell the correct fix from the collapsing one | — |
| D9 | The fix changes the stored `number_target` and breaks the consumers that key off it (v1 cross-result roll-up, v2 catalog merge, and the two other writers) | `TTD-AC-10` plus a diff review: no task may touch `resolvedNumberTarget` at `repository.ts:1870-1874` / `:1956-1960` | — |
| D10 | Retiring last, without the identity fix, leaves the duplicates **active** and double-counts the progress aggregates | Ordering constraint: the retire-last change MUST NOT ship in a commit that does not also carry the identity fix; `TTD-TEST-1` asserts both together | — |
| D4 | The fix regresses the other four callers of the bottleneck (accept-request, IPSR, bilateral centers, ToC v1) | Existing suites unchanged: `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results\|contributors-partners\|share-result-request"` | — |
| D5 | Lookup compiles against mocks but not against MySQL | **No automated gate** — repository specs mock `findOne`, so no SQL is generated | Human check at the HITL pause: run the reproduction on prtest after deploy and confirm the row count is stable and the value survives |
| D6 | Type or lint break | `npx tsc --noEmit` (server) and `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` | — |
| D7 | Repair statement collapses the wrong row, or empties an indicator | none automated | Substitute: the repair runs inside a transaction and prints per-indicator active-row counts before and after (`TTD-AC-7`); reviewed by the owner before commit |
| D8 | Green-check verdicts move because active target rows changed | none automated in this repo — the live `validation_*` functions are applied by hand and the migration copies are stale | Substitute: read `SHOW CREATE FUNCTION` from the environment and compare the green check for `12055` before and after the repair |

## 10. Dependencies & Assumptions

- `result_indicators_targets.toc_indicator_target_id` exists in every environment this ships to (added by `1790002419754`, `bugfix/reported-results-center-scoping`, 2026-09-21). **Confirm it is applied on prtest before execution** — `TTD-OQ-3`.
- The ToC catalog read (`getCatalogTargetsByIndicatorNodeIds`, `toc/toc-results/toc-results.repository.ts:1216-1226`) returns, for an indicator node and reporting year, the metas the payload was built from. The fix resolves identity against that same source, so the two sides stop disagreeing.
- The reporting year used by the write equals the one used to build the payload (`version.phase_year` for the result).
- Three writers key their own dedup on `number_target` holding the canonical value — `framework-result-toc-indicators.service.ts:215-221` (whose comment at `:173-181` documents the dependency on this very code path), `bilateral.service.ts:1778-1791`, and this path. The fix therefore leaves that column's meaning untouched and moves identity to `toc_indicator_target_id`.
- prtest result `12055` is available for the manual re-check and is the repair target.

## 11. Open Questions

- `TTD-OQ-1` Does the duplicated set on `12055` contain a deactivated row carrying `contributing_indicator`? Confirms the lost-value mechanism end to end. **Owner: Juan David, one query, before execution.** Does not change the fix — a negative result only means the value was lost at a different step, and `TTD-R-2` still holds.
- `TTD-OQ-2` Does the repair ship as a migration or as a reviewed statement applied by hand, and what is the PROD exposure from the detection query? **Blocks the repair task, not the code tasks.**
- `TTD-OQ-4` Why does the canonical query return `6` for an indicator whose catalog metas are 17…127? The two reads enter the ToC through different keys (`tri.related_node_id → trit.id_indicator` vs `trit.toc_result_indicator_id`) and the canonical falls back to any year when the phase year matches none. **Does not block the fix** — identity moves off `number_target` entirely — but it decides whether `TTD-OQ-2`'s repair should also correct stored numbers. Owner: Juan David, one ToC query.
- `TTD-OQ-3` Is migration `1790002419754` applied on prtest and the other target environments? **Blocks execution** — without the column the fix silently degrades to the number+date fallback.

## 12. Out-of-Band Notes

- One method, five callers: the fix lands once in the repository, never per caller.
- Checkout pulled to `ca99689b4` on 2026-09-25 (31 commits). `results-toc-results/` came back unchanged, so every citation here holds; only the live-path line numbers in `contributors-partners.service.ts` moved and were corrected.
- Yecksin is working P2-3817 in the same area (client side). Tell him before touching anything under `contributors-partners`; if both sides touch one file, merge rather than pick a side.
