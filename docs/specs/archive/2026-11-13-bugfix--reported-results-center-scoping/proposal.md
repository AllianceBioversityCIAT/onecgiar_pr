# `bugfix/reported-results-center-scoping` — Proposal

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/reported-results-center-scoping` |
| Slug | `reported-results-center-scoping` — derived from free-text argument (user-reported symptom, not a Jira ticket) |
| Type | `Bug` |
| Approval Mode | `gated` (default — no explicit pre-approval mandate given) |
| Author | AKILI (proposal), reported by santiago.sanchez@cgiar.org |
| Date | 2026-09-21 |
| Related spec (fixed, does NOT cover this bug) | `docs/specs/bugfix/indicator-achieved-value-per-center/` (execution PASS, commit pending) |
| Related spec (introduced the affected surface) | `docs/specs/archive/2026-09-04-changes--indicator-reported-results/` (IRR) |

## 2. Intent

Make the indicator drawer's **"Reported results"** panel show only the results actually reported against the specific center-scoped ToC node the panel is open for — not every result reported against any sibling node of the same indicator concept, regardless of center.

## 3. Problem / Current Behavior

The user created a result under "Number of knowledge products on FAIR data and modeling tools" scoped to **CIMMYT** (target 5). Opening the indicator drawer's Reported results tab for the **CIMMYT** row correctly shows that result. Opening the same tab for the **IITA** sibling row of the same indicator (target 1, a different center, different target) **also shows the same result** as if it had been reported there too — even though the result was never tagged with IITA.

This is visually confirmed in three screenshots: the Reporting table lists 5 distinct rows for this one indicator (different center combinations: CIMMYT+IITA, Bioversity(Alliance)+IITA, CIP+IITA, IITA, CIMMYT — each with its own target), and the Reported-results panel for both the CIMMYT node (target 5) and the IITA node (target 1) list the identical result `#9482` with `Σ contribution 1`.

## 4. Proposed Outcome

Reported results panel intersects a result's own center tag(s) against the specific node's center(s) before listing it — mirroring the approach `bugfix/indicator-achieved-value-per-center` already established for the aggregate Achieved/Prel sums.

## 5. Scope

- `onecgiar-pr-server/src/api/results-framework-reporting/application/queries/get-existing-result-contributors/` (handler, loader service, mapper).
- Possibly `results-framework-reporting.service.ts` if it pre-processes the query result.
- No client changes expected — `indicator-drawer.component.ts`'s `loadExisting()` already passes the node's own `related_node_id`; the fix is server-side filtering.

## 6. Non-Goals

- Not touching `aow-bilateral.repository.ts`'s `getIndicatorContributions` / `getIndicatorContributionsByCenter` — those are already correct (verified by `bugfix/indicator-achieved-value-per-center`, PASS).
- Not changing how `related_node_id` is assigned or synced from the ToC service — it is confirmed to be a shared, indicator-concept-level identifier by design (see Root Cause), and changing that would be a much larger, riskier change to the ToC sync contract.
- Not re-litigating `changes/indicator-reported-results`'s existing scope semantics (`reviewed` vs `all`, IRR-R-3) — this bug is orthogonal to that scope toggle.

## 7. Affected Users, Systems, And Specs

- **Users:** any result submitter or PMU/QA reviewer viewing a shared indicator's per-center rows in the Reporting table (`dashboard-lab`) and opening "View reported results" per row.
- **Systems:** `onecgiar-pr-server` — `api/results-framework-reporting/application/queries/get-existing-result-contributors/*`.
- **Specs:** `bugfix/indicator-achieved-value-per-center` (sibling fix, same root defect family, different query surface); `changes/indicator-reported-results` (introduced the affected panel, archived).

## 8. Visual Reference

- Source: None (bug reproduction via in-app screenshots supplied by the user in conversation, not a Figma/mockup asset)
- Location: n/a
- Notes: no UI change is anticipated — the panel's shape/markup is correct; only the underlying data set is wrong. No new visual design needed.

## 9. Bug Diagnosis

### Observed Symptom

A result reported against one center-scoped ToC node of a shared indicator appears in the "Reported results" panel of every sibling center-scoped node of that same indicator, inflating each sibling's contribution count/list even though the result was never tagged with that sibling's center(s).

### Reproduction Steps

1. Open a Science Program's Reporting table where one indicator (e.g. "Number of knowledge products on FAIR data and modeling tools") has multiple rows for different center combinations (e.g. `CIMMYT` target 5, `IITA` target 1).
2. Report a result against the `CIMMYT` row only.
3. Open the indicator drawer for the `CIMMYT` row → Reported results tab: the result appears correctly (`Σ contribution 1 of target 5`).
4. Open the indicator drawer for the `IITA` row → Reported results tab: the **same result** appears (`Σ contribution 1 of target 1`), despite never being tagged with IITA.

### Root Cause (confirmed — revised 2026-09-21 after Juan David Delgado's direct DB check)

**Initial hypothesis (partially wrong):** that `related_node_id` was merely a shared "indicator concept" id while some other identifier still distinguished center-specific nodes. **Disproven.**

**Confirmed against real data** (SP02, `tri_id 9851`, all 55 target rows spanning 2020-2030 × 5 center groups):

- `related_node_id` — identical across all 55 rows.
- `toc_result_indicator_id` (uuid) — identical across all 55 rows.
- `toc_results_indicators.id` (numeric) — identical across all 55 rows.
- **None of the three indicator-level identifiers distinguishes anything.** The only column that does is `toc_indicator_target_id` (on `toc_indicator_targets`, one row per center-group × year).

**Second, more important correction: these are not "rows per center" — they are rows per *combination of centers*.** Five groups exist for this indicator, not five centers:

| `toc_indicator_target_id` | Centers | 2026 Target |
|---|---|---|
| 607878 | CIMMYT | 5 |
| 607889 | IITA | 1 |
| 607900 | CIP, IITA | 1 |
| 607911 | CIMMYT, IITA | 1 |
| 607922 | Bioversity (Alliance), IITA | 2 |

**IITA appears in 4 of the 5 groups.** "IITA's target" is therefore not a well-defined single number from the data model's own perspective — the reportable unit is the *combination*, not the individual center. What "IITA's target/achieved" should mean when IITA is split across four overlapping combinations is a **product decision**, not something inferable from the schema. This must be answered by Nicoleta or Ángel before any fix is designed (see Open Question, §12).

**Why the leak happens, mechanically:** `results_toc_result_indicators` — the table PRMS writes to when a result is reported against an indicator — stores only `toc_results_indicator_id` (text) plus the FK to `results_toc_result`. **It has no column for center or for `toc_indicator_target_id`.** Because all 5 groups share the identical uuid/numeric id, reporting a result against any one of the 5 groups persists the exact same value that all 5 groups would match on read. This is not an aggregation or filtering bug in the read path — **the fact of which combination-group a result was reported against was never captured at write time.** There is nothing to filter by, because the distinguishing value doesn't exist in the row.

**The one existing anchor** is `result_indicators_targets.number_target` + `target_date` — `number_target` is a global 0-54 position counter across the whole indicator (0-10 CIMMYT, 11-21 IITA, 22-32 CIP+IITA, 33-43 CIMMYT+IITA, 44-54 Bioversity+IITA for this specific indicator), so it *does* disambiguate today, but **positionally and silently**: if the ToC tree ever re-syncs and reorders, this breaks without any error. The durable fix would be to persist `toc_indicator_target_id` itself, and **nothing in the current write path stores it anywhere.**

**Not universal across indicators:** in SP01, most indicators split center at the ToC-node level itself (distinct `related_node_id` per center, no shared-group problem) — this combination-group pattern needs to be reconfirmed case-by-case, not assumed for every shared indicator.

### Impact & Scope

- Affects every indicator whose ToC-side target split is modeled as *combination-groups* (this SP02 case confirmed; likely other SP02-style indicators, not confirmed for SP01 which mostly splits center at the node level).
- **This is a data-capture gap, not a query bug.** Read-side filtering (the original proposed fix, Option A below) cannot solve it — there is no per-combination value to filter on in `results_toc_result_indicators` today.
- Also affects the aggregate Achieved/Prel numbers this indicator's siblings show, independently of the already-fixed `bugfix/indicator-achieved-value-per-center` — that fix corrected the *aggregation join key* (node-specific `tri.id`), but if all 5 combination-groups share the same `tri.id` too (to be confirmed — Juan David's dump covered `related_node_id`/`toc_result_indicator_id`/`id`, all three identical), the sibling fix may not actually separate these 5 rows either. **Needs re-verification once the business question is answered**, since the fix approach will likely change what gets checked.

### Fix Strategy — BLOCKED on a product decision

Cannot proceed to a technical fix strategy yet. The read-side "add a center-intersection filter" approach proposed initially (`getIndicatorContributionsByCenter`-style) does not apply here, because:

1. There is no per-combination-group value persisted anywhere in `results_toc_result_indicators` to filter on — a fix requires a **write-path change** (persist `toc_indicator_target_id`, or an equivalent stable anchor, at the moment a result is linked to an indicator), not just a smarter read query.
2. The correct semantics for "target/achieved" when a center is split across multiple overlapping combination-groups (IITA in 4 of 5 groups) is undefined without a product answer.

**Next action:** get Ángel (or Nicoleta) to answer the simplified business question in §12 before any `/akili-specify` work starts. Once answered, this proposal's Fix Strategy will be rewritten to match.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Persist `toc_indicator_target_id` at write time (recommended)** | When a result is linked to an indicator, also store which exact combination-group (`toc_indicator_target_id`) it was reported against; every read (Reported results panel + achieved/prel aggregates) filters/groups on that instead of the shared indicator id. | Matches Ángel's decision exactly (strict per-group isolation, zero cross-attribution). Requires a schema/write-path change (new column on `results_toc_result_indicators` or a new join table + backfill strategy for historical rows) — bigger than the originally scoped read-only fix, but it's the only option that is actually correct per the confirmed semantics. |
| **B — Derive the combination-group positionally from `number_target`** | Use the existing fragile anchor (`result_indicators_targets.number_target` + `target_date`) to infer the group without a schema change. | Works today per Juan David's finding, but silently breaks on ToC re-sync/reorder — acceptable only as a short-lived interim mitigation, not the final fix. |
| **C — Client/read-side center-intersection filter (originally proposed, now insufficient)** | Filter by intersecting a result's center tag(s) against the node's center(s), as in `getIndicatorContributionsByCenter`. | **Ruled out by Ángel's answer** — this would make a solo-IITA result also match "CIMMYT, IITA" (since IITA is in both sets), which is exactly the cross-attribution Ángel said must NOT happen. Intersection logic is the wrong model; exact-group-match is required instead. |

## 11. Recommended Approach

**Option A**, with **Option B as a possible short-term backfill helper only** (to migrate historical rows where `toc_indicator_target_id` was never captured — use the positional anchor once, at migration time, not as an ongoing runtime dependency).

Concretely:

1. **Write path:** when a result is linked to an indicator (`framework-result-toc-indicators.service.ts` or wherever the client currently sends the combination-group context — needs confirmation of what the client already knows at creation time, since the Reporting table already renders 5 distinct rows, so the combination-group is selectable/known at that point), persist the exact `toc_indicator_target_id` (or an equivalent stable per-group anchor) on `results_toc_result_indicators` (new column) — not just the shared indicator id.
2. **Read path — Reported results panel:** `existing-result-contributors-loader.service.ts` filters by that new exact-group anchor instead of `related_node_id` alone.
3. **Read path — aggregates:** re-verify `bugfix/indicator-achieved-value-per-center`'s fix (`aow-bilateral.repository.ts`, `getIndicatorContributions`/`getIndicatorContributionsByCenter`) against this same exact-group-isolation rule — Juan David's dump showed `tri.id` (the join key that fix uses) is *also* identical across all 5 groups for this indicator, so that fix may need the same new anchor to actually separate these 5 rows correctly. This must be confirmed during `/akili-specify`, not assumed.
4. **Historical data:** backfill existing `results_toc_result_indicators` rows using Option B's positional anchor (`number_target` + `target_date`) as a one-time migration, with a clearly logged "could not be resolved" fallback for any row where the position no longer safely maps (e.g. after a ToC reorder) — never a silent wrong guess.

## 12. Risks, Dependencies, And Open Questions

- **Dependency:** the fix now spans the result-to-indicator write path (`framework-result-toc-indicators.service.ts` or equivalent) AND the read path — larger surface than the sibling spec `bugfix/indicator-achieved-value-per-center`, which was read-only.
- **Dependency:** must re-verify whether `bugfix/indicator-achieved-value-per-center`'s existing fix is *also* affected by this same combination-group collapsing (see §11.3) — if so, that spec's fix may need a follow-up, not just this one.
- **Risk:** historical rows need a migration/backfill plan (§11.4) — must not silently drop or misattribute already-reported results.
- **Risk:** need to confirm what the client (Reporting table / result-creation flow) already knows about which combination-group row the user picked, at creation time — if that context doesn't currently reach the create payload at all, capturing it is an additional (client + server) change, not just a server-side column.
- **Risk:** the pattern (combination-groups, not per-center rows) may not be universal — SP01 was flagged by Juan David as mostly splitting center at the node level. The chosen fix must not assume every shared indicator looks like this SP02 case; verify per-indicator during `/akili-specify`, not generalize from one example.

### Simplified question for Ángel — ANSWERED 2026-09-21

> Para el indicador "Number of knowledge products on FAIR data and modeling tools" (SP02), la meta 2026 está repartida en 5 grupos, no por centro individual:
>
> | Centros | Meta 2026 |
> |---|---|
> | CIMMYT | 5 |
> | IITA | 1 |
> | CIP, IITA | 1 |
> | CIMMYT, IITA | 1 |
> | Bioversity (Alliance), IITA | 2 |
>
> IITA está en 4 de los 5 grupos. Cuando alguien reporta un resultado para uno de esos grupos (ej. "CIMMYT, IITA"), ¿ese resultado debe contar como logro **solo para ese grupo exacto**, o debe también sumar al avance de **IITA por separado** y/o al de **CIMMYT por separado**?

**Respuesta de Ángel (product decision, binding):** cada combinación de centros es una meta **completamente independiente**. Un resultado creado con centro **solo IITA** debe descontar/contar **únicamente** en la fila "IITA" — nunca en "CIMMYT, IITA", "CIP, IITA" ni "Bioversity (Alliance), IITA", aunque todas incluyan IITA. Simétricamente, un resultado creado con centro **solo CIMMYT** afecta únicamente la fila "CIMMYT", nunca "CIMMYT, IITA". **No hay atribución cruzada ni suma entre grupos que comparten un centro** — cada `toc_indicator_target_id` (cada fila de la tabla de arriba) es su propio contenedor aislado, sin excepción, para todos los centros.

This resolves the ambiguity from §9's Impact & Scope and confirms **Option A** below as the correct fix shape: exact combination-group matching, zero cross-attribution.

## 13. Success Criteria

- A result reported against exactly one combination-group (e.g. "IITA" alone) counts **only** toward that group's target/achieved — never toward any other group that happens to share a center (e.g. "CIMMYT, IITA", "CIP, IITA", "Bioversity (Alliance), IITA"), confirming Ángel's zero-cross-attribution rule end to end.
- This holds in **both** the Reported results panel (this bug's original symptom) **and** the aggregate Achieved/Prel numbers (re-verified per §11.3).
- Historical (pre-fix) `results_toc_result_indicators` rows are migrated to the new exact-group anchor, or explicitly and visibly flagged as unresolved — never silently misattributed.
- Regression test red-before-fix, green-after, covering: (a) a solo-center result not leaking into a multi-center group sharing that center, and (b) the reverse — a multi-center group's result not leaking into a solo-center group.
- No regression in `changes/indicator-reported-results`'s existing `scope=all`/`scope=reviewed` behavior.

## 14. Next Step

Product decision received (§9, Ángel, 2026-09-21) — proposal unblocked.

```text
/akili-specify bugfix/reported-results-center-scoping
```
in **Bug Mode** — convert the confirmed root cause + Ángel's exact-group-isolation rule into a fix plan spanning the write path (persist the combination-group anchor) and both read paths (Reported results panel + achieved/prel aggregates), with a mandatory red-before-green regression test.
