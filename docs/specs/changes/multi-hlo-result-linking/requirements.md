# Module Spec — Multi-HLO Result Linking — `requirements.md`

## 1. Module / Feature

- **Module:** `results` (ToC alignment sub-feature, `ResultsTocResults`)
- **Sub-feature:** Link one result to multiple High-Level Outcomes (HLOs) under the same Area of Work (AoW)
- **Owner:** santiago.sanchez@cgiar.org (support escalation intake)
- **Status:** draft
- **Ticket(s):** #163059

---

## 2. Context

PRMS currently lets a submitter link a result to only one HLO per AoW: the ToC-alignment selector (`multiple-wps-content.component.ts`) disables every other HLO in an AoW once one is picked, and the sibling tab-count logic caps the number of addable ToC links to the number of distinct AoWs. This was reported by IRRI and CIMMYT submitters (ticket #163059) as a blocker: they need to attribute one Knowledge Product (or other typed result) to more than one HLO sharing an indicator type within the same AoW — behavior the legacy POD tool supported and that 2027 reporting expectations assume (per Scarlett Crawford's escalation note).

Investigation (`docs/specs/changes/multi-hlo-result-linking/proposal.md`, §3) confirmed this is a **frontend-only** restriction: the write DTO and service (`onecgiar-pr-server/src/api/results/results-toc-results/`) already accept and persist an array of ToC-result links per result, with no uniqueness constraint and no typology check. This spec closes the gap in both directions — relax the UI ceiling and add the typology-match guard the ticket asks for, on both client and server.

This touches the **Results submitter** flow from `docs/prd.md` (US-S1, US-S2 — capturing type-specific detail and ToC alignment) and **AC-6** (evidence and ToC alignment at submit). It touches `docs/trd/trd.md` §"ToC" module (`toc/`, `toc-results`) and the `ResultsTocResults` entity (TRD §"Results" data model list, line ~234).

---

## 3. In Scope / Out of Scope

### In scope

- Allowing a result to hold 2+ active `results_toc_result` rows against distinct HLO ToC nodes that share the same AoW (`work_package_id`), as long as each HLO's indicator type matches the result's typology.
- Correcting the client selector (`multiple-wps-content.component.ts`, `multiple-wps.component.ts`) so it disables/limits choices by **typology mismatch**, not by **AoW membership**.
- Adding an explicit typology-match validation on the server write path (`results-toc-results.service.ts`) so the rule holds regardless of client, bulk import, or direct API use.

### Out of scope

- Intermediate Outcome / 2030 Outcome attribution (handled by the separate `results/intermediate-outcome-aow-visibility/aow-selector` spec).
- Loosening or removing the typology-match rule itself — only the "one HLO per AoW" ceiling is removed.
- Backfilling or auditing historical results that may already have single-HLO links.
- Any change to bilateral / platform-report payload shape (the `results_toc_result` array surfaces unchanged; confirmed against `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` at design time).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can select and save more than one HLO under the same AoW for one result, as long as indicator types match; still blocked from linking a mismatched-typology HLO. |
| QA reviewer | Sees multiple HLO links per AoW in the review drawer where the submitter added them; no new review action required. |
| PMU lead | ToC-alignment counts/rollups may now reflect more than one HLO per AoW per result — no dashboard change in this spec, but rollups should be re-checked (see Open Questions). |
| Platform admin | No change. |
| Bilateral consumer (downstream) | No payload shape change; the array field already carried multiple rows. |

---

## 5. User Stories

- **`MHL-US-1`** — As a result submitter, I want to link my result to more than one HLO within the same Area of Work, so that I can accurately represent contributions the legacy POD tool allowed and 2027 reporting expects. *(Refines US-S1, US-S2)*
- **`MHL-US-2`** — As a result submitter, I want the system to stop me from linking an HLO whose indicator type doesn't match my result's typology, so that ToC alignment stays meaningful even when multi-select is allowed. *(Refines US-S1)*
- **`MHL-US-3`** — As a platform admin/API consumer, I want the typology-match rule enforced by the API itself, so that bulk import or direct API writes can't create mismatched ToC links the UI would have blocked. *(Refines AC-6)*

---

## 6. Functional Requirements

### Required (MUST)

- **`MHL-R-1`** The ToC-alignment selector MUST allow selecting more than one HLO node under the same AoW for a single result.
- **`MHL-R-2`** The ToC-alignment selector's candidate lists (`outcomeList`/`outputList`/`eoiList`, sourced from `GET_tocLevelsByconfig`) already arrive typology-filtered server-side (`toc-results.repository.ts` `_appendResultTypeIndicatorFilter`, via `RESULT_TYPE_TO_INDICATOR_PATTERN`) for the planned/non-bilateral path — the client MUST NOT re-disable a candidate for typology reasons; it MUST only disable/omit a candidate the server already excluded.
- **`MHL-R-3`** The tab/link count ceiling in the ToC-alignment selector MUST be driven by the count of candidates already present in the (typology-filtered) list, not by the count of distinct AoWs (`getMaxNumberOfTabs()` currently uses a `Set` of `work_package_id`; it MUST switch to counting candidates directly).
- **`MHL-R-4`** The server write path (`results-toc-results.service.ts`, `createTocMappingV2`) MUST reject a `results_toc_result` link whose HLO indicator type does not match the result's typology, reusing the existing `RESULT_TYPE_TO_INDICATOR_PATTERN` / `indicatorResultTypeCaseSql` mapping (`shared/constants/indicator-type-mapping.constant.ts`) rather than a new comparison — this is the guard for writes that bypass the pre-filtered UI list (direct API, bulk import, and the `bilateral`/`isUnplanned` cases where `_appendResultTypeIndicatorFilter` is currently skipped).
- **`MHL-R-5`** The server write path MUST continue to accept and persist multiple `results_toc_result` rows for the same result across the same AoW when their typology matches.

### Should (SHOULD)

- **`MHL-R-10`** The client SHOULD surface a clear inline reason (tooltip/disabled-state label) when an HLO option is disabled for typology mismatch, so submitters understand why an option is unavailable.

### Could / Nice-to-have (MAY)

- **`MHL-R-20`** The system MAY add a soft warning (not a hard block) when a result already has 3+ HLO links under one AoW, MAY not be required for this ticket — deferred to `/akili-specify` design discussion if raised.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | MUST be additive: existing single-HLO-per-AoW results and their saved links remain valid and unaffected; no `results_toc_result` migration or backfill required (`AC-4` scope — bilateral/platform-report payload shape unchanged since it is already array-shaped). |
| **Security** | Server-side typology validation MUST run under the existing JWT-gated `results-toc-results` write route; no new route or auth exclusion. |
| **Data quality** | The server MUST be the source of truth for the typology-match rule (`MHL-R-4`) — the UI guard alone is not sufficient given the pre-existing API gap identified in the proposal. |
| **Observability** | Rejected typology-mismatch writes MUST return a clear validation error (no raw stack trace, no secret) and MUST NOT be silently dropped. |
| **Accessibility** | Disabled HLO options and their reason MUST remain screen-reader-accessible per `docs/ux-ui/design.md` §10 (disabled state + accessible label, not color alone). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `MHL-AC-1` | A result with typology `T`, and two HLOs `H1`, `H2` under the same AoW both with indicator type `T` | The submitter selects `H1` then opens the selector again | `H2` is selectable (not disabled) and can be added as a second ToC link |
| `MHL-AC-2` | A result with typology `T`, and an HLO `H3` under any AoW with indicator type `≠ T` | The submitter opens the selector | `H3` is disabled and cannot be selected |
| `MHL-AC-3` | A direct API write (bypassing the UI) with a `results_toc_result` payload linking a result to an HLO whose indicator type doesn't match | The request reaches `results-toc-results.service.ts`'s upsert path | The server rejects the mismatched row with a validation error; matching rows in the same request still persist |
| `MHL-AC-4` | A result already linked to `H1` and `H2` (same AoW, matching typology) | The result is read back via the results detail API / bilateral payload | Both links are present in the response array; no payload shape change |
| `MHL-AC-5` | A submitter viewing the ToC-alignment selector with a mix of matching and mismatched HLOs across multiple AoWs | The selector renders | Tab/option count reflects only typology-matching candidates, not one-per-AoW |

Cross-cutting project ACs that already apply (not restated):

- `AC-1` Typed result integrity.
- `AC-4` Bilateral / platform-report stability.
- `AC-6` Evidence and ToC alignment at submit.
- `AC-9` Security and secrets.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- ToC catalog (`toc/toc-results`) supplying HLO nodes, their `work_package_id` (AoW), and indicator type.
- CLARISA-backed indicator-type data already consumed elsewhere in the ToC module.

### Downstream consumers

- Bilateral / platform-report payloads that read `results_toc_result` rows (array-shaped already; no shape change expected — confirm at design time).
- PMU rollups / progress-bar aggregations (`aow-bilateral.repository.ts` `indicatorResultTypeCaseSql`) that may currently assume at-most-one HLO per AoW per result — flagged as an open question below.

### Assumptions

- "Typology match" means the HLO ToC node's indicator type equals the result's own indicator/result type — exact field-level definition to be confirmed with a BA/product owner and locked in `design.md`.
- No new database column or migration is needed; this is a validation-logic change on existing fields.

---

## 10. Open Questions

- **`MHL-OQ-1`** ~~What is the exact field-level definition of "typology match"?~~ **Resolved during scoping**: there is no shared `indicator_type_id` column — match is `Result.result_type_id` (enum) → `RESULT_TYPE_TO_INDICATOR_PATTERN[id]` → LIKE-pattern against the ToC indicator's `type_value` (`shared/constants/indicator-type-mapping.constant.ts`). `design.md` reuses this mapping rather than inventing a new comparison.
- **`MHL-OQ-2`** ~~Does any existing PMU rollup or progress-bar calculation assume at-most-one HLO per AoW per result?~~ **Checked 2026-09-18 (MHL-T-4) — outcome: `no-doesn't` for the PMU/AoW progress rollup; one non-rollup singularity assumption recorded as a follow-up.** Evidence, `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`: the achieved-value subquery `act` (`getIndicatorContributions`, lines 829-871) fans a result out over its `results_toc_result` rows (line 838) and each row joins its own `toc_results`/`toc_results_indicators` node (847-850), then `GROUP BY tri.toc_result_indicator_id` (869-870) — i.e. keyed per indicator, never per AoW or per result — with no `COUNT(DISTINCT)`; a result linked to two HLOs adds its `contributing_indicator` once to each HLO's indicator. `buildTocQuery` (430-559) groups by ToC node/indicator/target and never touches `results_toc_result`; `groupTocRows` (599-658) and `rollUpIndicators` (`toc-progress-rollup.ts`) average per-indicator progress and sum only `indicators_counted`/`indicators_total`, not result counts. Residual, not blocking: (a) a result linked to 2 HLOs of the same AoW now weighs in both HLOs' numerators, so the AoW-level average counts it twice — intended per-node semantics, but product should confirm; (b) `ResultRepository.getResultsByProgramAndCenters` (`result.repository.ts:3257-3282`, join at 3302) collapses a result's ToC links with `MAX(tr.result_title)` / `MAX(twp.acronym)` / `MAX(t_selected.indicator_description)` — no double count (grouped per result), but a multi-HLO result would show one arbitrary HLO title/indicator, possibly mismatched. **Follow-up (for the user to file; not fixed here):** spec/ticket to make that list query multi-HLO-aware, and to confirm point (a). Coverage note: the many per-result detail reads in `results-toc-results.repository.ts` and the export queries in `result.repository.ts` (~2198, ~2630, ~2755, ~3855) were sampled, not exhaustively audited; they are row-per-link reads, not aggregates.
- **`MHL-OQ-3`** ~~Is a soft cap desired?~~ **Resolved 2026-09-18: no soft cap, by design (`MHL-DD-2`).** Any number of typology-matching HLOs is accepted; only the same-node duplicate is blocked. Revisit only if product asks for a cap (Nicoleta Trifa/BA).
- **`MHL-OQ-4`** ~~Does the multi-HLO capability apply to `bilateral` / `isUnplanned` flows?~~ **Explicitly deferred 2026-09-18 (`MHL-DD-3`):** the `_appendResultTypeIndicatorFilter` skip for those flows is left as a follow-up (UX of any selector there is not addressed by this spec). Correctness is covered: the write guard now applies to these flows and returns 422 on a typology mismatch, so a mismatched link cannot be saved even though the list may be unfiltered.
- **Known write-guard behavior (accepted open item, 2026-09-18):** a legacy, already-linked mismatched node is still offered by the read-path candidate list (its `OR EXISTS already-mapped` branch, `toc-results.repository.ts:651-657`) but is rejected by the write guard, so the submitter receives a 422 on each save until that link is removed. Needs product confirmation before release.

---

## 11. Out-of-Band Notes

None — no migration order or cross-spec rollout coordination needed; disjoint from the `intermediate-outcome-aow-visibility` family.

---

## Required cross-references

- `docs/prd.md` — G2 (data quality), US-S1, US-S2, AC-6.
- `docs/ux-ui/design.md` — §10 (accessibility, disabled-state pattern).
- `docs/trd/trd.md` — Results module (`api/results/`), `ResultsTocResults` entity, ToC module (`toc/`, `toc-results`).
- `docs/specs/changes/multi-hlo-result-linking/proposal.md` — approved intent and confirmed root cause.
