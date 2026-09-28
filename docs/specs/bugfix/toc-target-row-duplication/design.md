# Design — Give a ToC target row a real identity, then upsert against it

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-target-row-duplication` |
| Depth | Standard · **Mode:** Bug · **Approval Mode:** gated |
| Requirements | `./requirements.md` (`TTD-R-1 … R-9`, `TTD-AC-1 … AC-8`) |
| Root cause | `./proposal.md` §9 |
| Verified at | `ca99689b4` (`performance-refactor`, pulled 2026-09-25) — every citation in this document was re-run at this SHA |
| Baseline | `docs/trd/trd.md` `results` + `toc/` modules; `docs/prd.md` AC-1, AC-6, AC-7 |

## 2. Executive Summary

One method owns the defect: `ResultsTocResultRepository.saveInditicatorsContributing` (`onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts:1790`). It cannot recognise the row a ToC meta already owns, because the only two keys it tries are a field carrying a foreign id space and a column it overwrites itself. So it retires every row and inserts new ones, every save.

The design gives the row the identity it has been missing since the column was added: `result_indicators_targets.toc_indicator_target_id`. The write resolves each meta against the **same ToC catalog read the payload was built from**, so the two sides stop disagreeing; it upserts, then retires only what it did not touch. `number_target` is left exactly as it is — the Step 2.3 challenge found three other consumers and two other writers keying off its canonical value (§10 `TTD-DD-3`). Server-only. No migration (the column exists), no client change required, one additive field on the GET.

## 3. Architecture Overview

### 3.1 Where this lives

- **Server, changed:** `api/results/results-toc-results/repositories/results-toc-results.repository.ts` (identity resolution, upsert order, catalog read) · `api/results/results-toc-results/results-toc-results.service.ts` (GET payload field) · their specs.
- **Server, read-only context:** the four caller sites (`results-toc-results.service.ts:214`, `:219`, `:2086`, `:2093`, `:2909`; `share-result-request.service.ts:1318`; `ipsr/results-package-toc-result/results-package-toc-result.service.ts:285`, `:290`), `create-result-from-framework/framework-result-toc-indicators.service.ts` (the sibling writer whose convention this adopts).
- **Client:** none required. The payload gains a field; nothing is removed.
- **External:** one read against `DB_TOC` per indicator per save — the budget the current code already spends.

### 3.2 Sequence — saving the section after the fix

```
[rd-contributors-and-partners]
  └── PATCH /api/results-framework-reporting/contributors-partners/:resultId
        └── ContributorsPartnersService.updateContributorsAndPartners (:240)
              └── [branch: sections.hasUnifiedToc] applyTocMappingSectionUpdate (:402)
                    └── updateTocMappingV2 (:217) → ResultsTocResultsService.createTocMappingV2 (:1496)
                          └── [branch: hasPrimaryIndicators / hasContributorIndicators] (:2086 / :2093)
                                └── repository.saveIndicatorsPrimarySubmitter (:2674) / saveIndicatorsContributors (:2755)
                                      └── saveInditicatorsContributing (:1790)
                                            ├── 1. read the ToC catalog ONCE per indicator  → metas[{tocTargetId, number, date}]
                                            ├── 2. per meta: resolve identity → tocTargetId
                                            ├── 3. per meta: find row by (indicator, tocTargetId)
                                            │        ↳ miss → by (indicator, PK) SCOPED to the indicator
                                            │        ↳ miss → by (indicator, number+date), own number then canonical
                                            ├── 4. hit → UPDATE in place, backfill tocTargetId + number  |  miss → INSERT
                                            └── 5. retire ONLY the rows step 3/4 did not touch      ← was: step 5 ran first, blindly
```

Steps 1-4 are new; step 5 is today's blanket deactivation moved to the end and narrowed.

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/api/results/results-toc-results/
├── repositories/
│   ├── results-toc-results.repository.ts        # CHANGED — identity, upsert order, catalog read
│   └── results-toc-results.repository.spec.ts   # CHANGED — 3 new regression describes
├── results-toc-results.service.ts               # CHANGED — GET stops overloading indicators_targets
├── results-toc-results.service.spec.ts          # CHANGED — payload shape assertion
└── dto/create-results-toc-result-v2.dto.ts      # CHANGED — additive optional field
```

No new files. No migration file.

## 5. Data Model

No schema change. The design activates a column that already exists and is already written by a sibling path.

| Column | Today | After |
|---|---|---|
| `indicators_targets` (PK) | Auto-increment PK; the GET reports a **ToC** id here for a meta with no row yet | Unchanged meaning. The GET reports `null` for a meta with no row yet |
| `toc_indicator_target_id` | Nullable bigint, added by `1790002419754`; written only by the creation flow | Written by every path; the identity the upsert keys on |
| `number_target` | The canonical value of the indicator, stamped on every meta by this path | **Unchanged.** Identity no longer depends on it, so metas sharing it stay distinguishable |
| `is_active` | Retired for all targets of an indicator on every save, before any lookup | Retired only for the metas a save did not re-affirm |

Historical rows with `toc_indicator_target_id IS NULL` keep working through the number+date fallback, and are backfilled the first time a save touches them (`TTD-R-4`) — the fix is self-healing per row.

## 6. API Design

| Endpoint | Change |
|---|---|
| `GET /api/results-framework-reporting/contributors-partners/:resultId` | **Additive.** Each target gains `toc_indicator_target_id`. A meta with no PRMS row yet now reports `indicators_targets: null` instead of a ToC id (`TTD-R-7`) |
| `PATCH …/contributors-partners/:resultId` | No required change. The server accepts `toc_indicator_target_id` when a client echoes it and resolves identity itself when no client does |

Request/response contracts elsewhere are untouched; `ResultTocIndicatorTargetDto` gains one optional property. There is no global `ValidationPipe`, so no client is at risk of having a field stripped or rejected (P-6).

## 7. Backend Module Design

**Identity resolution, per meta, in order.** The first hit wins; every step is scoped to `result_toc_result_indicator_id`, so a foreign id can never reach another indicator's row.

| # | Key | Purpose |
|---|---|---|
| 1 | `target.toc_indicator_target_id` | Clients that already send it (creation flow, bilateral) |
| 2 | `target.indicators_targets`, **only if** it matches a catalog meta id for this indicator + year | What today's GET actually puts there |
| 3 | catalog meta whose `number_target` + `target_date` equal the meta's | Payloads carrying neither id |

When step 3 also fails, the meta is treated as new. It is never matched on the canonical number alone — that is the collapsing fix `TTD-TEST-3` guards against.

**Row lookup, per meta, in order.** (a) by `(indicator, toc_indicator_target_id)`; (b) by `(indicator, indicators_targets)` — the PK lookup **scoped to the indicator**, which is what today's unscoped `findOne` lacks; (c) by `(indicator, number_target, target_date)`, trying **both** stored conventions — the canonical value this path writes, and the meta's own value the creation and bilateral writers store — so every legacy row is findable whichever writer created it.

**Catalog read.** One query per indicator per save, cached in the existing per-call map, returning every meta for the indicator and reporting year — the canonical is derived from that same list instead of a second query. The query joins both doors at once (`trit.id_indicator = tri.id AND trit.toc_result_indicator_id = tri.related_node_id`), the relation the repository already relies on at `:3137-3139`, so it serves both the node-id and numeric-id spellings PRMS stores in `toc_results_indicator_id` (`:486-499`).

**Write.** Hit → `UPDATE` in place, backfilling `toc_indicator_target_id`. Miss → `INSERT` carrying it. `number_target` keeps resolving through today's `canonical ?? payload ?? 0` (`:1870-1874`, `:1956-1960`) — untouched. Either way the row id is collected.

**Retire.** After the loop, one `UPDATE … WHERE result_toc_result_indicator_id = ? AND indicators_targets NOT IN (touched)` sets `is_active = 0`. An empty payload retires everything, exactly as today — **and so does an indicator whose `targets` is absent or not an array**, a DTO-legal shape (`create-results-toc-result-v2.dto.ts:81`) that today is retired by the sweep running before the `Array.isArray` check at `:1868`. The retire pass runs for every indicator in the payload, never only for those that collected ids.

## 8. Frontend / UX Component Architecture

No change. The section keeps binding `targets?.[0]` (`multiple-wps-content.component.ts:108`) — a single-target assumption that this spec does not touch and records as a follow-up (§12). Visible effect: the field stops emptying itself, and the section stops flipping back to "required, missing".

## 9. Shared Contracts or Package Extensions

- `ResultTocIndicatorTargetDto` (`dto/create-results-toc-result-v2.dto.ts:47-68`) gains `toc_indicator_target_id?: number | null`. Additive, optional.
- `result_indicators_targets.toc_indicator_target_id` becomes a contract shared by three writers (creation flow, this path, bilateral reads). Its meaning — "the ToC target this row answers" — is the one `bugfix/reported-results-center-scoping` established.

## 10. Design Decisions

### `TTD-DD-1` — Resolve identity server-side, never trust the client echo

- **Context:** the payload field that should carry identity carries a foreign id; no client sends `toc_indicator_target_id` on this path today.
- **Decision:** the server resolves each meta against the ToC catalog it can read itself; the client echo is an accelerator, never a requirement.
- **Alternatives:** (a) require the client to send the ToC id — couples the fix to a client release and leaves every other caller broken; (b) heuristically guess whether `indicators_targets` is a PK or a ToC id — the ambiguity that caused the bug.
- **Consequences:** the fix ships server-only and protects all four callers at once. One catalog read per indicator, which the current code already spends.

### `TTD-DD-2` — Scope every lookup to the indicator

- **Context:** today's first lookup is `findOne({ indicators_targets })` with no other condition (`:1883-1892`). A ToC id that happens to equal a real PK returns **another result's row**; the `UPDATE` that follows is scoped by indicator, so it matches zero rows and the value is silently dropped.
- **Decision:** every lookup carries `result_toc_result_indicator_id`.
- **Alternatives:** trust the corrected key alone — correct today, silent again the next time an id space is overloaded.
- **Consequences:** a cross-result hit becomes structurally impossible, not merely unlikely.

### `TTD-DD-3` — Leave `number_target` exactly as it is (reversion withdrawn)

- **Context:** the first draft of this design inverted the precedence so each meta would persist its own number instead of the canonical one stamped at `:1870-1874` / `:1956-1960`.
- **Decision:** **withdrawn.** The stored value keeps resolving as `canonical ?? payload ?? 0`. Identity moves to `toc_indicator_target_id`, which makes the inversion unnecessary — metas sharing a canonical number are still distinguishable.
- **Reversion challenge (Step 2.3) — the finding that withdrew it.** Four live dependencies on the stored value being the canonical, all verified first-hand at `ca99689b4`:
  1. `results-toc-results.repository.ts:1328`, `:1380`, `:1567`, `:1752` — the v1 ToC read correlates results **across results**, `WHERE rtri.toc_results_indicator_id = ? AND rit.number_target = ?`, unscoped by result. Per-result numbers would silently drop rows from `results_contributing` and `itemIndicator.total`.
  2. `results-toc-results.service.ts:3313-3314` — the v2 catalog merge matches saved targets to catalog metas by number; a mismatch appends a phantom extra target instead of merging.
  3. `framework-result-toc-indicators.service.ts:215-221` — a second writer whose dedup key is `number_target`, and whose comment at `:173-181` documents the dependency on **this exact code path** verbatim.
  4. `bilateral.service.ts:1778-1791` — a third writer, same dedup key, no `is_active` filter.
  Plus the `?? 0` fallback (`:1874`, `:1959`) feeding the green check's `rit.number_target > 0` (`1762528725798-createValidtionP25.ts:139`, `:325`).
- **What the challenge also proposed, and why it is rejected:** keying the fallback lookup on `resolvedNumberTarget` instead of the payload value. That closes the write/read key mismatch in one line, but the canonical is resolved **per indicator** and cached per indicator (`getCanonicalTarget(indicatorId)`, `:1819-1824`), so every meta of one indicator resolves to the same number — the second meta would find the first meta's row and overwrite it. Eleven metas would collapse to one row and ten answers would be lost. `TTD-TEST-3` exists to keep that fix out.
- **Consequences:** the diff shrinks, no consumer moves, and the green-check exposure disappears. `TTD-AC-10` asserts no stored `number_target` changes.

### `TTD-DD-4` — Upsert first, retire the untouched rows last

- **Context:** the blanket `is_active = false` at `:1857-1866` runs **before** the lookups, so a row the save is about to re-affirm passes through a state where its value is unreachable — and stays there when the lookup misses.
- **Decision:** collect the touched row ids during the loop and retire only the complement afterwards.
- **Alternatives:** keep the order and rely on the corrected lookups — the value then depends on the lookup never missing, which is exactly the assumption that failed.
- **Reversion challenge (Step 2.3): SAFE, with two conditions, both adopted.** No test pins the target sweep — the nearest (`results-toc-results.repository.spec.ts:467-553`, R-8.b) pins the *parent indicator* sweep at `:1800-1807`, which this design does not touch, and takes the INSERT branch so `:1857` never runs in it. No caller passes an empty `targets` array expecting a wipe (all four guard with `Array.isArray` or `.length`). It was introduced as a 2023 restructure (`8d52b83f2`), never as a fix. The two conditions: **(a)** the retire pass must also cover an indicator whose `targets` is absent or not an array — today's sweep runs *before* the `Array.isArray` check at `:1868`, and that payload shape is DTO-legal (`:81`); **(b)** it must not ship without the identity fix, or the accumulated duplicates stop being retired and start double-counting in `aow-bilateral.repository.ts:938-948` / `:1070-1082` and `results-framework-reporting.service.ts:983-986`. Both are written into §7 and into `TTD-AC-6` / defect class D10.

### `TTD-DD-5` — The GET reports a null PK, not a foreign id

- **Context:** `results-toc-results.service.ts:3329` writes `indicators_targets: catalog.toc_indicator_target_id`.
- **Decision:** report `indicators_targets: null` for a meta with no PRMS row, and carry the ToC id in `toc_indicator_target_id`.
- **Alternatives:** leave the GET alone and let the server keep interpreting — works, but preserves the trap for the next reader.
- **Also in this decision:** the merge that builds those entries (`applyCatalogTargetsToInitiativesMap`, `:3300-3320`) matches a saved target to a catalog meta **by `number_target` + year**. Since saved rows carry the canonical value and the catalog carries each meta's own, the match fails and every catalog meta is appended on top of the rows that already represent it — the payload grows on every read (`TTD-R-10`). The merge matches on `toc_indicator_target_id` first, falling back to number + year for rows that predate the column.
- **Consequences:** one payload field changes value for metas that have no row yet, and the duplicate-entry growth stops. Consumers swept (P-9): the only client reader of this field is the bilateral review drawer, on a different payload.

### `TTD-DD-6` — Repair the existing rows with a reviewed statement, not a migration

- **Context:** the duplicates already exist on prtest; a migration would run unreviewed in every environment.
- **Decision:** a transactional statement that collapses to one active row per meta, preferring the row carrying a `contributing_indicator`, printing per-indicator active-row counts before and after.
- **Open:** `TTD-OQ-2` — the owner decides migration vs. by-hand, and sizes PROD from the detection query. House practice applies `validation_*`-adjacent data work by hand.
- **Consequences:** the fix itself is self-healing per row (§5), so the repair only has to remove the surplus, not restore identity.

## 10.1 Budget (Step 2.4)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 5 (regression tests · identity + upsert · retire-last · GET payload/merge + DTO · repair & detection) | ~300 (≈120 fix, ≈155 tests, ≈25 docs/DTO) | 2 |

Matches **Standard**: above Lite (two files, a payload contract, a data repair), below Full (no migration, no rollout flag, no new module). The Step 2.3 challenge removed a decision rather than adding one, so the estimate came down. `/akili-execute` escalates if actuals exceed this.

## 11. Premise Ledger

**Count:** 16 rows — 13 verified, 3 `UNVERIFIED` (1 High impact, 2 Low).
**Blast-radius triggers:** all three fire — `live-path` (the design names a user action and two branch points), `shared-state` (`result_indicators_targets` has three writers), `consumer` (the design changes a stored field's reported value and a DTO).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Saving *Contributors & partners* reaches `saveInditicatorsContributing` | `live-path` | `contributors-partners.controller.ts:48` → `contributors-partners.service.ts:240` → branch `sections.hasUnifiedToc` → `:402` → `:217` → `results-toc-results.service.ts:1496` → branch `hasPrimaryIndicators`/`hasContributorIndicators` → `:2086`/`:2093` → `repository.ts:2674`/`:2755` → calls at `:2722`, `:2831`, `:2867` | `ca99689b4` | The whole spec targets the wrong method — **High** | verified |
| P-2 | `result_indicators_targets.toc_indicator_target_id` exists in the schema and on the entity | `existence` | `migrations/1790002419754-AddTocIndicatorTargetIdToResultIndicatorsTargets.ts:7`; `entities/result-toc-result-target-indicators.entity.ts` (`toc_indicator_target_id`, nullable bigint) | `ca99689b4` | `TTD-DD-1` loses its key; the design falls back to number+date only — **High** | verified |
| P-3 | That migration is applied in prtest and the other target environments | `data-env` | `UNVERIFIED — confirm at source before relying on it` | — | The fix silently degrades to the weaker fallback and the duplication persists — **High** | `TTD-OQ-3`; owner Juan David, `SHOW COLUMNS FROM result_indicators_targets`, as task T-1's first step |
| P-4 | The GET writes a ToC id into the PK field `indicators_targets` | `data-env` | `results-toc-results.service.ts:3329` — `indicators_targets: catalog.toc_indicator_target_id ?? null` | `ca99689b4` | `TTD-DD-5` is unnecessary and the primary lookup was never poisoned — **High** | verified |
| P-5 | In `DB_TOC`, `toc_result_indicator_target.toc_result_indicator_id` equals `toc_results_indicators.related_node_id`, and `trit.id_indicator = tri.id` | `data-env` | `repository.ts:3137-3139` — both conditions joined in one `JOIN` | `ca99689b4` | The single catalog read cannot serve both id spellings; the design needs two reads — **Low** | verified |
| P-6 | No global `ValidationPipe`: unknown payload fields are neither stripped nor rejected | `existence` | `grep -rnE "useGlobalPipes\|ValidationPipe\|whitelist\|forbidNonWhitelisted" src/main.ts src/main.routes.ts src/app.module.ts` → **0 hits** (alternate names covered: `useGlobalPipes`, `whitelist`, `forbidNonWhitelisted`) | `ca99689b4` | An added DTO field could be stripped, so the client echo path would need a DTO release — **Low** | verified |
| P-7 | No UNIQUE index guards `result_indicators_targets`; only the PK and the FK | `existence` | `grep -rn "result_indicators_targets" src/migrations/*.ts \| grep -iE "unique\|index\| key "` → **3 hits**, all in `1694081217251-CreateTableIndicatorTarget.ts:7,8,12` = `PRIMARY KEY`, `ADD CONSTRAINT FK_…`, `DROP FOREIGN KEY` | `ca99689b4` | Option C were already half-done and duplicates impossible — **Low** | verified |
| P-8 | Three writers touch `result_indicators_targets`, with different conventions | `shared-state` | `framework-result-toc-indicators.service.ts:215-247` (creation flow; upserts by `indicator + number_target + is_active`, **persists** `toc_indicator_target_id`) · `results-toc-results.repository.ts:1857-1866`, `:1921-1939`, `:1967-1983` (this path) · `results-toc-results.repository.ts:95-125` (logical delete, scoped by indicator ids) · `result-toc-result-target-indicator.repository.ts:20`, `:36` (delete / update by result) | `ca99689b4` | The convention clash is not the root cause and `TTD-DD-3` loses its justification — **High** | verified |
| P-9 | The payload field `indicators_targets` is read by exactly these consumers | `consumer` | `grep -rn "indicators_targets" --include="*.ts" --include="*.html" onecgiar-pr-client/src onecgiar-pr-server/src \| grep -v result_indicators_targets \| grep -v /migrations/` → 26 hits / 22 files; after excluding table-name matches the **payload-field** readers are: `dto/create-results-toc-result-v2.dto.ts:49` · `results-toc-results.service.ts:647-651`, `:3329` · `repository.ts:396`, `:466`, `:506`, `:1883-1925` · `achieved-value-derivation.ts` · client `result-review-drawer.component.ts:724` + `.interfaces.ts:143` (bilateral payload, different endpoint). Test files pinning it: `results-toc-results.service.spec.ts`, `results-toc-results.repository.spec.ts`, `result-toc-result-target-indicator.repository.spec.ts`, `result-review-drawer.component.spec.ts`. Cypress: `grep -rn "indicators_targets" onecgiar-pr-client/cypress` → **0** | `ca99689b4` | A reader outside this list breaks on the null PK — **Low** | verified; carried into T-4's `Consumers` field |
| P-10 | Result `12055` holds 22 active rows with `number_target = 6` and `contributing_indicator` null | `data-env` | `UNVERIFIED — confirm at source before relying on it` | — | Only the scale of the repair changes; the code defect stands on P-1/P-4 — **Low** | `TTD-OQ-1`; `user-stated` (Yecksin, Slack 2026-09-24); owner Juan David, one query before T-5 |
| P-11 | The canonical value overrides the payload's `number_target` on every meta today, and is resolved and cached **per indicator** | `other` | `repository.ts:1870-1874`, `:1956-1960` (`canonical?.number_target ?? this.toNumberOrNull(target.number_target) ?? 0`); cache keyed by indicator at `:1808-1824` | `ca99689b4` | Keying the lookup on the canonical would not collapse the metas, and the challenge's cheaper cut would be viable — **High** | verified |
| P-13 | A third writer keys its dedup on `number_target` | `shared-state` | `bilateral.service.ts:1778-1791` — `findOne({ result_toc_result_indicator_id, number_target: firstMap.number_target })`, no `is_active` filter | `ca99689b4` | `TTD-DD-3`'s withdrawal loses one of its four reasons; the other three stand — **Low** | verified |
| P-14 | The v1 ToC read correlates rows **across results** on `number_target`, unscoped by result | `consumer` | `repository.ts:1287`, `:1328-1330`, `:1380`, `:1567`, `:1752` — `WHERE rtri.toc_results_indicator_id = ? AND rit.number_target = ?`; feeds `results_contributing` and `itemIndicator.total` (`:1763-1774`) | `ca99689b4` | Changing the stored number would be safe and `TTD-DD-3` could stand — **High** | verified; carried into T-2's `Consumers` field |
| P-15 | The **live** green check requires every active row to hold `number_target > 0`, grouped per indicator with `COUNT = SUM` | `consumer` | `UNVERIFIED — confirm at source before relying on it` (the repo copies say so at `migrations/1762528725798-createValidtionP25.ts:139`, `:325` and `1762866499786-updatepartnersContributors.ts:53`, `:194`, but those are applied by hand and known stale, so they are secondary for the live behaviour) | — | A stored `0` would not flip a result to invalid, and the repair needs no green-check comparison — **Low** | `SHOW CREATE FUNCTION` on the target environment; owner Juan David, before T-5 |
| P-16 | The creation-flow writer documents its dependency on this path's canonical resolution in prose | `other` | `framework-result-toc-indicators.service.ts:173-181` — cites `results-toc-results.repository.ts:1813-1816` and `canonical ?? typed ?? 0` verbatim | `ca99689b4` | The two writers were never coordinated and the convention is accidental — **Low** | verified |
| P-12 | The existing repository spec exercises both branches of this method and must stay green | `consumer` | `repositories/results-toc-results.repository.spec.ts:1-10` (P2-3608 sign guard, "UPDATE and INSERT"), assertions at `:81`, `:94`, `:109`, `:124`, `:137`, `:146`, `:158`, `:172`, `:185` | `ca99689b4` | The fix may reshape the write freely — **Low** | verified; carried into T-2's `Consumers` field |

## 12. Open Gaps & Follow-ups

- Three writers key their dedup on `number_target` (`framework-result-toc-indicators.service.ts:215-221`, `bilateral.service.ts:1778-1791`, and this path's legacy fallback). Two metas sharing a canonical number collide for the first two. Align them on `toc_indicator_target_id` once this has held a phase — that is the change `TTD-DD-3` was reaching for, and it belongs in its own spec with its own consumer sweep.
- `TTD-OQ-4`: the canonical read and the catalog read enter the ToC through different keys and can return different rows (`6` vs `17…127`). Worth settling even though this fix no longer depends on it.
- A UNIQUE index on `(result_toc_result_indicator_id, toc_indicator_target_id)` — viable only after the repair (P-7 confirms nothing guards the table today).
- The client binds `targets?.[0]`; an indicator with eleven metas is outside what that UI models.
- `getCanonicalIndicatorTarget`'s year fallback returns a target from **any** year when the phase year matches none (`:2500-2517`). Narrowed in effect by `TTD-DD-3`, not removed.
- `TTD-OQ-2` PROD sizing and the repair's delivery form.
