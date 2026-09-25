# Proposal — Saving Contributors & partners duplicates the ToC target rows and drops the contribution typed at creation

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-target-row-duplication` |
| Slug | `toc-target-row-duplication` — derived from free-text context (no argument was passed; the request is the Slack hand-off on P2-3817 item 6), routed to `bugfix/` per the Bug Track taxonomy |
| Type | Bug |
| Approval Mode | gated |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-25 |
| Jira | **P2-3817** item 6 (QA-Bug, `Open`, assignee Yecksin Zuñiga) under story **P2-2932**. Items 1-5, 7, 8 of the same ticket are the consistency-check feature and are **not** this spec |
| Branch base | `performance-refactor` @ `ca99689b4` — pulled 2026-09-25 during Phase 2; every citation below re-verified at this SHA |
| Depends on | none |
| Parallel-safe | **no** — touches `saveInditicatorsContributing`, the single write bottleneck every ToC save shares, and needs a data repair. Do not run it beside another spec that writes `result_indicators_targets` |
| Related | `bugfix/reported-results-center-scoping` (added `result_indicators_targets.toc_indicator_target_id`, the key this fix adopts) · `bugfix/contributor-accept-owner-indicators` (last fix on the same method) · P2-3618 (clamp on the same write bottleneck) |
| Model note | Registry pins T1 → `opus`; this session runs Opus 5. No downgrade needed |

## 2. Intent

Saving the **Contributors & partners** section must leave one row per ToC target, and must never silently discard a contribution the reporter already entered. Today every save of that section multiplies the rows and, on the first save after creation, deactivates the row that carried the typed value.

## 3. Problem / Current Behavior

| Claim | Evidence |
|---|---|
| Each save of the section inserts fresh `result_indicators_targets` rows for the ToC metas instead of updating them. Result #9587 (`result_id 12055`) holds 22 rows with `number_target = 6` and `contributing_indicator` null — 11 ToC metas × 2 saves | Reported by Yecksin Zuñiga from prtest data, 2026-09-24 (Slack DM `D041JR08VJ4`, ts `1790309615.958929`). Row counts **UNVERIFIED by this session — confirm at source before relying on it**; the code mechanism below is confirmed |
| An indicator with a single meta does not duplicate (#9613, `result_id 12081`) | Same source. **UNVERIFIED by this session** |
| The contribution entered in the creation modal is shown in the section, is not saved by the first submit, and comes back empty and flagged "required, missing" | P2-3817 item 6, reported by María Camila Giraldo R. on result #9587 |
| The section save reaches the duplicating code | Live path traced as run, §9 |

The two code defects behind it, both confirmed by reading the code at `ca99689b4`:

**D1 — the row-identity lookup keys on values that do not identify the row.** `saveInditicatorsContributing` (`onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts:1790`) tries two lookups and both miss for a ToC catalog meta:

| # | Lookup | Why it misses |
|---|---|---|
| 1 | `findOne({ indicators_targets })` — `:1883-1892` | `indicators_targets` is the **PRMS auto-increment PK** (`entities/result-toc-result-target-indicators.entity.ts`), but the GET fills that field with a **ToC-namespace id**: `indicators_targets: catalog.toc_indicator_target_id` (`results-toc-results.service.ts:3329`). Two id spaces in one field |
| 2 | `findOne({ result_toc_result_indicator_id, number_target: target.number_target })` — `:1893-1902` | Compares the **raw** incoming `number_target` (17/28/…/127) while the row that exists was written with `resolvedNumberTarget` (the canonical value) at `:1916`. The write and the lookup disagree on the same column |

Both miss → `save()` at `:1933` → a new row, on every save.

**D2 — the canonical override makes the metas mutually indistinguishable.** `getCanonicalIndicatorTarget` (`:2468-2528`) returns **one** row (`ORDER BY trit.target_date DESC LIMIT 1`) and `:1870-1874` stamps that single `number_target` onto *every* meta of the indicator. Eleven distinct ToC metas land as eleven rows carrying the same number — after which no key can tell them apart. That is why the one-meta indicator survives.

D2 also reads the ToC through a different door than the payload it is correcting: the canonical query joins `toc_results_indicators.related_node_id → toc_result_indicator_target.id_indicator` with a year filter that **falls back to any year when the phase year matches nothing** (`:2500-2517`), while the metas in the payload come from `toc_result_indicator_target.toc_result_indicator_id` filtered by `target_date = reportingYear` (`toc/toc-results/toc-results.repository.ts:1216-1226`). Different rows, so the canonical `6` need not even appear among the payload's `17…127`.

**How the contribution gets lost (mechanism, code-confirmed; the data check is pending).** Two writers disagree about what `number_target` means:

| Writer | Reached from | `number_target` written | `toc_indicator_target_id` |
|---|---|---|---|
| `framework-result-toc-indicators.service.ts:215-247` | the "Report result" creation modal | the meta's own value | **persisted** |
| `saveInditicatorsContributing:1933` | every Contributors & partners save | the canonical value | **never written** |

The creation modal writes the typed contribution (`create-result-payload.util.ts:308-310`) into a row keyed the first way. The first section save then deactivates **every** target of that indicator unconditionally (`:1857-1866`), fails both lookups, and inserts new rows with `contributing_indicator` null. The row holding the value stays `is_active = 0` and is never revived; the GET filters `rit.is_active = 1` (`:483-484`), so the box comes back empty. That is exactly the symptom in item 6.

## 4. Proposed Outcome

- Saving the section twice with no edits leaves the row count unchanged.
- A contribution entered in the creation modal survives the first section save.
- ~~Each ToC meta keeps its own `number_target`~~ → **amended at design Step 2.3:** metas of one indicator stay distinguishable *by `toc_indicator_target_id`*; the stored `number_target` is left unchanged. See `design.md` `TTD-DD-3`.
- A regression test that is red on today's code for both the duplication and the lost value.
- The rows already created on prtest are repaired, and a detection query exists for PROD.

## 5. Scope

- `results-toc-results.repository.ts` → `saveInditicatorsContributing` (`:1790-1985`): row identity, the unconditional deactivation, the canonical `number_target` override, and writing `toc_indicator_target_id`.
- `results-toc-results.service.ts` → `applyCatalogTargetsToInitiativesMap` (`:3252-3340`): stop overloading `indicators_targets` with a ToC id; emit the ToC id in a field that means the ToC id.
- Tests for that method plus its three call sites (`:2722`, `:2831`, `:2867`).
- One-off data repair for `result_id 12055` and a PROD detection query (§12).

## 6. Non-Goals

- The `contribution_consistency` feature — items 1-5, 7, 8 of P2-3817. Yeck owns those and already pushed two fixes (`22c4ca658`, `e688c0cdf`).
- Re-keying the framework write path (`framework-result-toc-indicators.service.ts`), which upserts by `number_target`. It is a sibling risk (§9), not a task here.
- The client's single-target assumption (`multiple-wps-content.component.ts:108` binds `targets?.[0]`). An indicator with eleven metas is already outside what that UI models; a separate change.
- Adding a DB unique constraint. Considered as Option C and rejected for now (§10).
- Backfilling `toc_indicator_target_id` for historical rows beyond what the repair in §5 needs.

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Reporters on the 2026 form | Lose a contribution they already typed, and are told the section is incomplete after it said "Section complete" |
| `result_indicators_targets` | Grows by one row per ToC meta per save, with no ceiling |
| Live progress reporting | `contributing_indicator` feeds six surfaces and the aggregates **SUM** the boxes (`achieved-value-derivation.ts:16-21`). Today's duplicates carry null, so nothing is inflated **yet** — a duplicated row that carries a value would multiply the achievement |
| The consistency check (P2-2932) | Reads a section whose value may have been dropped, so it can have nothing to compare and correctly show nothing — P2-3817's own recommendation names this as a possible explanation of items 3-5 |
| `bugfix/reported-results-center-scoping` | Its `toc_indicator_target_id` column is the key this fix adopts; its read paths document NULL as the tested fallback |

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: server-side persistence defect. The only UI evidence is the empty field in item 6, already described in the ticket.

## 9. Bug Diagnosis

### Observed Symptom

Two symptoms from one cause: (a) `result_indicators_targets` gains a full set of new rows on every save of Contributors & partners; (b) the contribution entered in the creation modal is gone after the first save of that section, and the field is flagged "required, missing".

### Reproduction Steps

1. On prtest, create a Policy Change result from the ToC "Report result" panel, entering a value in *Contribution to Indicator Target*, against an indicator that has more than one ToC meta for the reporting year.
2. Open **Contributors & partners**. The value shows.
3. Save the section (e.g. "Next"), navigate away, come back → the field is empty and flagged required.
4. Save twice more and count `result_indicators_targets` for the result's indicator: one fresh set of rows per save.
5. Expected: stable row count, value preserved. Actual: rows multiply, value lost.

Reference data: #9587 / `result_id 12055` (reproduces), #9613 / `result_id 12081` (single meta, does not reproduce).

### Root Cause (confirmed)

`result_indicators_targets.number_target` carries **two conflicting meanings** depending on which writer created the row, and `saveInditicatorsContributing` bases the row's identity on it — after first deactivating every target of the indicator (`:1857-1866`).

- The field `indicators_targets` is overloaded with a ToC id on the way out (`service.ts:3329`) and read as a PRMS PK on the way in (`repository.ts:1883-1892`), so the primary lookup can never hit.
- The fallback compares the raw `number_target` against rows written with the canonical one (`:1899` vs `:1916`).
- `getCanonicalIndicatorTarget` (`:2468`) collapses every meta onto one value, so even a corrected lookup could not tell the metas apart — this is why the fix cannot simply swap the fallback to the canonical value.

Nothing throws; the deactivated row with the value is never revived and the GET filters `is_active = 1`.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline --grep="3817"` → `e688c0cdf`, `22c4ca658` (both Yecksin, 2026-09-24, client consistency-warning rendering only). `git log --all --oneline --since=2026-09-01 -- .../results-toc-results/` → newest is `ca031a59b` (P2-3794), nothing on this path. `git log --oneline HEAD..origin/performance-refactor -- .../results-toc-results/` → **empty** | **Not fixed.** The two P2-3817 commits address the warning's rendering, not the write path. They are ahead of the local checkout — rebase first |
| **Live path?** | `PATCH /api/results-framework-reporting/contributors-partners/:resultId` (`contributors-partners.controller.ts:48`) → `updateContributorsAndPartners:240` → `applyTocMappingSectionUpdate:402` → `updateTocMappingV2:217` → `results-toc-results.service.ts → createTocMappingV2:1496` → `saveIndicatorsPrimarySubmitter` / `saveIndicatorsContributors` (`repository.ts:2674`, `:2755`) → `saveInditicatorsContributing` (`:2722`, `:2831`, `:2867`) | **On the path.** Root cause confirmed. A first pass of this trace stopped at `saveMapToToc` (`service.ts:1197`), which only the accept-request flow calls — that is a neighbouring route; the three real call sites were found inside the repository itself |
| **Siblings on the same state** | `bilateral.service.ts:1778-1791` (third writer, dedup on `number_target`, no `is_active` filter — **found at design Step 2.3, missing from this sweep**) · `framework-result-toc-indicators.service.ts:215-247` (creation flow; upserts by `result_toc_result_indicator_id + number_target + is_active`, **does** persist `toc_indicator_target_id`) · `results-toc-results.repository.ts:95-125` (logical delete by result) · `result-toc-result-target-indicator.repository.ts:20,36` (delete / update by result) · `aow-bilateral.repository.ts:1071-1098` (reads per `toc_indicator_target_id`) | The framework writer is the other half of the root cause: same column, other convention. Its own `number_target` key would collide for two metas sharing a number — recorded as a risk, out of scope |
| **Downstream consumers** | Readers: `results-toc-results.repository.ts:396`, `:466-506`, `:571`, `:1286`, `:1321`, `:1373`, `:1560`, `:1745` · `result.repository.ts:1110` · `pt-porb.repository.ts:122` · `aow-bilateral.repository.ts:945`, `:1079` · the `validation_*` SQL in `1762528725798-createValidtionP25.ts:144,330` and `1762866499786-updatepartnersContributors.ts:58,199` (green checks) · `achieved-value-derivation.ts` (not wired yet) · specs `results-toc-results.repository.spec.ts`, `contribution-consistency.service.spec.ts` | Any repair must keep one active row per meta: the green-check SQL joins targets per indicator, and the progress aggregates SUM `contributing_indicator`. **The live `validation_*` functions are applied by hand and the repo copies are stale — get `SHOW CREATE FUNCTION` from the environment before trusting them** |

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode** — logic and data, with a mandatory regression test. Not `/akili-quick`.

Smallest safe correction: give the row a real identity (`toc_indicator_target_id`, the column `bugfix/reported-results-center-scoping` already added and the framework path already fills), ~~stop overwriting each meta's own `number_target`~~, and stop deactivating rows the save is about to re-find. Detail in §11.

> **Amended at design Step 2.3 (2026-09-25).** The `number_target` half was **withdrawn**: the reversion challenge found four live dependencies on the stored value being the ToC canonical — the v1 cross-result roll-up, the v2 catalog merge, and two other writers whose dedup keys assume it. Identity moves to `toc_indicator_target_id` alone, which makes the change unnecessary. `design.md` `TTD-DD-3` carries the evidence.

## 10. Approach Options

| # | Option | Trade-off |
|---|---|---|
| **A** | **Key the upsert on `toc_indicator_target_id`.** The GET emits the ToC id in its own field and leaves `indicators_targets` for real PKs; the write resolves the row by `(result_toc_result_indicator_id, toc_indicator_target_id)`, falls back to `(indicator, number_target, target_date)` for legacy rows with a NULL column, backfills the column when it does (the `number_target` half was withdrawn — see the amendment above) | Fixes both defects at the shared bottleneck and adopts the key the neighbouring path already persists. Touches the GET payload, so the client contract needs checking (§12) |
| **B** | **Deduplicate the incoming targets before writing.** Collapse the payload by resolved key in the loop, keep the lookups as they are | Cheapest; stops the growth. Leaves the metas indistinguishable, does **not** restore the lost value, and leaves the canonical override in place. A patch over the symptom |
| **C** | **Unique index + `ON DUPLICATE KEY UPDATE`.** Enforce one row per `(result_toc_result_indicator_id, toc_indicator_target_id)` in the schema | Strongest guarantee, but needs the data cleaned first and a migration on a table two writers share with different conventions. A good follow-up once A has held for a phase; too wide to carry the fix |

## 11. Recommended Approach

**Option A**, in this order:

1. **Stop the bleeding at the key.** Resolve the row by `(result_toc_result_indicator_id, toc_indicator_target_id)`; only when the column is NULL fall back to `(number_target, target_date)`, and backfill the column on that hit.
2. ~~**Stop overwriting the meta's number.**~~ **Withdrawn** at design Step 2.3 — three consumers and two other writers key off the canonical value. The stored `number_target` does not change.
3. **Narrow the deactivation.** Deactivate the targets the save did not re-affirm, instead of all of them before the lookups run (`:1857-1866`).
4. **Un-overload the GET field.** `applyCatalogTargetsToInitiativesMap` emits `toc_indicator_target_id` and leaves `indicators_targets` null for a meta that has no PRMS row yet.
5. **Repair and detect.** Collapse the existing duplicates for `result_id 12055`, preferring the row that carries a value, and ship a detection query for PROD.

Steps 1-3 are server-only and already stop the duplication and the loss; step 4 removes the trap that caused it. If the client turns out to drop unknown fields (§12), step 4 grows a small client change and steps 1-3 still stand on their own.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R1 | **The row counts and the lost-value mechanism are not verified against the data by this session.** The code mechanism is confirmed; the binding to #9587 is not | Before specifying, query `result_indicators_targets` for `result_id 12055` including `is_active = 0`: a deactivated row carrying `contributing_indicator` confirms the mechanism end to end. Cheap — Juanda has the access |
| R2 | ~~Local checkout behind origin~~ — **closed 2026-09-25:** pulled to `ca99689b4`. The diff over `results-toc-results/` is empty; only `contributors-partners.service.ts` moved (Yeck’s `22c4ca658`), shifting three live-path line numbers, now corrected |
| R3 | The client may not echo an unknown `toc_indicator_target_id` back on save | Confirm in `rd-contributors-and-partners` before step 4. Steps 1-3 do not depend on it |
| R4 | The repair must not leave an indicator with zero active targets, or the green checks change verdict | Repair inside a transaction, with a before/after count per indicator. Read the live `validation_*` definition from the environment, not from the repo migrations |
| R5 | The framework writer keys on `number_target` and would collide for two metas sharing a number | Out of scope; record as a follow-up once A lands |
| R6 | Two fixes to one shared component tend to collide across tickets | Yeck is on P2-3817 in the same area. Tell him before touching `contributors-partners`, and merge rather than pick a side if both touch it |
| Q1 | Should the repair ship as a migration or be applied by hand? | Ask before specifying. House practice is to generate and prune migrations, and `validation_*` procedures are applied by hand |
| Q2 | Does item 6 get its own Jira ticket, or stay a comment on P2-3817? | Yeck offered to annotate the ticket; item 6 is his item 6. Default: stay on P2-3817, record the confirmed cause as a comment |

## 13. Success Criteria

- Saving the section twice with no edits leaves the row count for the indicator unchanged.
- A contribution entered in the creation modal is still there after the first section save and a full reload.
- The metas of one indicator remain distinguishable — by `toc_indicator_target_id`, with the stored `number_target` unchanged (amended at design Step 2.3).
- Regression tests red on `ca99689b4`, green after: one for the repeated save, one for the value surviving the first save.
- `result_id 12055` holds one active row per meta; the PROD detection query returns a known, reviewed set.
- Scoped suites green: `npx jest --silent --reporters=summary --forceExit --testPathPattern="results-toc-results|contributors-partners"` plus `npx eslint` on the touched files.

## 14. Next Step

```text
/akili-specify bugfix/toc-target-row-duplication
```

Bug Mode — the confirmed root cause becomes a fix plan plus the two mandatory regression tests. Settle R1 and Q1 first.
