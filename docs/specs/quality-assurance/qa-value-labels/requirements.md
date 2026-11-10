# Requirements — QA value labels (`quality-assurance/qa-value-labels`)

## Document Control

| Field | Value |
|---|---|
| Module / feature | `quality-assurance` / `qa-value-labels` |
| Depth | **Full**: an external API contract change, read paths over three databases (PRMS, CLARISA cache, ToC), and person data |
| Type | Change (from `proposal.md`, 2026-11-09) |
| Deliverable | software |
| Approval Mode | gated |
| Owner | Juan David Delgado |
| Status | approved 2026-11-09 (Juan David): OQ-1..3 resolved at Phase 1; R-3 amended at Phase 2; tasks in review |
| Ticket(s) | [P2-3910](https://cgiarmel.atlassian.net/browse/P2-3910) (support: AC-1 "same sections and fields as the Reporting Tool", AC-14 "the value the field had when the comment was written") |
| Requirement prefix | `QVL-R-n`. `QRF-R-n` belongs to `qa-results-feed`, `QAC-R-n` to `qa-field-catalog`, `QIN-R-n` to `qa-intake` |
| Depends on | `quality-assurance/qa-results-feed` (shipped; `POST /api/qa/results/details`, QRF-R-7) |
| Baseline | `docs/prd.md` AC-9 (secrets) · `docs/trd/trd.md` ADR-004 (additive contracts) · `docs/ux-ui/design.md`: n/a (no UI in this repo) · `onecgiar-pr-server/docs/qa-catalog.en.md` (details shape, person-bearing keys, versioning) |
| Kaizen | `docs/specs/kaizen-log.md` does not exist. Entry-file lesson applied: **KZ-quality-assurance--qa-intake-1** (a premise about behavior outside our own code, here the form's displayed text, is settled by observing it). See §7 and QVL-R-3 |

## 1. Executive Summary

`POST /api/qa/results/details` gains one property per result, `labels`. It holds the canonical 2026 form text (QVL-R-3) of every option id found in that result's `values`, grouped by control list. `values` and every other property are unchanged. An id without a label is kept, with a `null` label. The labels are read in batch, never once per id. `catalog_version` does not move.

## 2. Glossary

| Term | Meaning |
|---|---|
| Select entry | A catalog field or subfield (any depth ≤ 2) of type `single_select` or `multi_select` that names a `control_list` |
| Option id | One value a select entry holds: a number, or a string for a list with text ids (for example a center code, a sub-national code, `households`) |
| Label | The canonical 2026 form text of an option id: one text per (list, id), as defined in QVL-R-3 |
| Label source | Where a list's labels come from: a PRMS table, a CLARISA-cached table, the ToC database, or a server constant mirroring a constant that exists only in the client |
| Unresolvable id | An option id for which the label source has no row (deleted, never synced, or the source is a constant that lacks it) |
| Person-bearing list | A control list whose labels identify a person: `users`, `directory_users` |

## 3. System Context & Scope

Today:

- `details` returns select values as option ids only:
  - "the option id as stored … The contents of the control list are not served" (`onecgiar-pr-server/docs/qa-catalog.en.md:468`);
  - multi-selects are an "array of option ids" (`:469`);
  - known gap 6 (`:680`);
  - "What QA must NOT assume" (`:288`).
- The 2026 catalog names **55 distinct control lists** over 122 select entries, plus 1 `text` entry that names a list. Both were counted by walking `CATALOG_FIELDS` at every depth with `npx ts-node -T` over `src/api/qa-catalog/definitions/sections/index.ts:94` (commit `4cf7bc01f`) → `55`. A literal grep finds only 46: `grep -rhoE "control_list: '[a-z0-9_]+'" sections | sort -u | wc -l` → `46`. It misses the computed names: `impact_area_components_${area}` (`general-information.ts:62`, 5 lists), `complementary_innovation_enabler_types` (`ipsr-step-2.ts:57`), and `actor_count_unit` / `actor_use_nature` / `actor_types`, which are passed as arguments (`innovation-use.ts:260-273`). So the completeness check (QVL-R-8) MUST walk the definitions, never grep them.
- Only 13 lists are closed with ids fixed in code (`definitions/closed-control-lists.ts:22-111`), plus 2 code lists (`:118-126`). The rest "change at runtime" (`:10-12`).
- Lookups are already resolved in batch: one SELECT per group over the batch's distinct keys (`values/lookup.resolver.ts:5`, `:257`). Physical source names live in a code registry and never leave the reader (`values/lookup-sources.ts:1-45`).
- An empty-runner smoke of `details` over the 2026 catalog counts 51 statements for the 9 types (`docs/specs/quality-assurance/qa-results-feed/execution.md:296`).
- One catalog entry of type `text` names a control list: `general.lead_contact_person` (`definitions/sections/general-information.ts:258-263`). Its value is free text. The id sits in its subfield `directory_user` (`:276-279`).

**In scope.**
- `labels` on each element of `details.results[]`.
- The per-list label rules and their contract notes.
- Batched resolution.
- A build-time completeness check.
- Updates to the contract document and an example payload.

**Out of scope.**
- `GET /api/qa/catalog` and `GET /api/qa/results`, whose responses are unchanged.
- Serving the full contents of any list.
- Labels for years other than 2026.
- Translation.
- New routes or CLARISA grants.
- Fixing known gaps 15 and 18 (environment-specific question ids of `policy_change.related_to`).
- Fixing the impact-area binding. The five `general.<area>_impact_areas` fields read every `result_impact_area_score` row with no area filter (`definitions/sections/general-information.ts:71-76`), so each field already returns the other areas' components. Owner decision 2026-11-09: a separate bugfix spec and ticket. Here, each id gets its own component name, and the contract records the gap.

## 4. Stakeholders / Personas

| Persona | Need |
|---|---|
| QA Platform (`onecgiar_qa`) integrator | A self-contained per-result snapshot: ids plus their display text, with no second call |
| QA assessor (P2-3910) | Sees the same text the Reporting form shows, and the comment records it (AC-14) |
| Reporting maintainer | Each list's label rule is documented, and a new list without a source fails the build |

## 5. Functional Requirements

### QVL-R-1 — Every result carries `labels` (MUST)

Each element of `results[]` in a 200 from `POST /api/qa/results/details` SHALL carry `labels`. It is an object keyed by control-list name, and each value is an object mapping option id (as a string) to label (a string or `null`).

#### Scenario: Result with selects

- GIVEN an eligible 2026 policy change whose `policy_change.policy_type` holds 1
- WHEN QA posts `details` for it with `field_keys` absent
- THEN `results[0].labels.policy_types["1"]` is the canonical form text of option 1 (QVL-R-3)
- AND IT MUST be keyed by the string `"1"`, never by a number, and never wrapped in an array

#### Scenario: Result with no option id

- GIVEN an eligible result whose returned `values` hold no option id (every select empty, or `field_keys` names only non-select fields)
- WHEN QA posts `details`
- THEN `labels` is `{}`
- BUT it must NOT be absent or `null`

### QVL-R-2 — `labels` covers exactly the ids in that result's returned `values` (MUST)

For each result, `labels` SHALL hold one entry per distinct (control list, option id) pair found in that result's returned `values`, at every depth. The entries come from select entries only: top-level fields, their subfields, and depth-2 subfields, as in `geo.countries[].country` and `geo.countries[].subnational[]`.

#### Scenario: Depth-2 ids are labelled

- GIVEN an eligible result with a Contributing Science Program whose ToC mapping holds a ToC result id
- WHEN QA posts `details`
- THEN `labels` holds that program's id under `initiatives` and the ToC result id under its list
- AND the same id used by two fields of the result appears once under its list

#### Scenario: Only the fields returned

- GIVEN `field_keys` = `["policy_change.policy_type"]`
- WHEN QA posts `details`
- THEN `labels` holds only `policy_types`
- BUT it must NOT hold ids of fields that were not returned, or of fields that do not apply to the result's type

#### Scenario: Only this result's ids

- GIVEN a batch of two results that hold different countries
- WHEN QA posts `details`
- THEN each result's `labels.countries` holds only its own countries
- BUT it must NOT hold the other result's ids

#### Scenario: Non-select entries are not labelled

- GIVEN `general.lead_contact_person`, a `text` field that names a control list
- WHEN `details` returns it
- THEN only its `directory_user` subfield id (a `single_select`) is labelled. The free-text `value` is not an option id and adds no entry

### QVL-R-3 — The label is the option's canonical form text (MUST)

*Amended at the Phase 2 gate, 2026-11-09 (owner decision).* The 2026 form shows some lists with different text in different places: chips versus selects, IPSR versus Results, and a position number in the IPSR workshop table. `labels` is keyed by list, so each option id has **one** label. It is the option's **canonical form text**:

- the name the form shows for that option;
- **without decorations** the form adds in some places only: ids, ISO codes, HTML, definitions or descriptions, position numbers, environment- or program-specific prefixes and renames;
- **with the composition** the form uses consistently for a list (for example a result is `code - title`, a program is `official code - name`).

The contract SHALL state, for each list, the label rule and every place where the form shows a different text. A label never contains HTML **that the server adds**: no composer or constant introduces markup. A table-sourced label is the stored text as-is, even when it contains `<` (user-entered titles such as "yield < 5 t/ha"), and such a text never fails the batch (QVL-R-4). *Clarified 2026-11-10 at /akili-execute, owner decision.*

#### Scenario: Client-only constant

- GIVEN `policy_change.amount_status` holds 2, a list whose texts exist only in the client form
- WHEN QA posts `details`
- THEN `labels.policy_amount_statuses["2"]` equals the form's text for option 2
- AND IT MUST be documented in the contract as mirroring that client constant

#### Scenario: A list shown differently in two places

- GIVEN a center the form shows as its acronym on a chip and as `acronym - name` in a select
- WHEN its code is labelled
- THEN the label is the list's documented canonical text, and the contract names both places
- BUT it must NOT contain the `<strong>` markup the select renders

### QVL-R-4 — An id is never dropped; an unresolvable id is `null` (MUST)

An option id present in `values` SHALL appear in `labels` even when it cannot be resolved; its label is then `null`. Resolution of one id SHALL never fail the batch or another id.

*Resolution rule (QVL-OQ-1, owner decision 2026-11-09):* an id whose source row **exists** gets its label whether the row is active or not, because the result stores it and the form shows it. `null` is reserved for a missing row.

#### Scenario: Missing row

- GIVEN a result whose stored institution id has no row in the institutions source
- WHEN QA posts `details`
- THEN `labels.institutions["<id>"]` is `null`
- AND the rest of the batch is answered normally
- BUT it must NOT omit that id, and must NOT return a 4xx or 5xx because of it

#### Scenario: Inactive row (subject to QVL-OQ-1)

- GIVEN a result whose stored option id is a row marked inactive in its source
- WHEN QA posts `details`
- THEN its label is the row's display text, not `null`

### QVL-R-5 — Everything already returned is unchanged (MUST)

For the same request, these SHALL be identical to the response before this change, compared after removing `labels`:
- `phase`, `catalog_version`, `not_eligible`, and every result's `result_id`, `result_code`, `result_type_key` and `values`;
- the result order;
- the status codes and error bodies.

#### Scenario: Golden comparison

- GIVEN a fixed batch covering every catalogued result type
- WHEN `details` is answered before and after the change
- THEN the two bodies, with `labels` removed from the second, serialize identically under stable key ordering
- BUT it must NOT add, rename or reshape any key inside `values`

### QVL-R-6 — Person-bearing labels follow the person-bearing keys rule (MUST)

The labels of `users` and `directory_users` identify people. They SHALL appear only for ids that a returned person-bearing field holds: `general.created_by`, and `general.lead_contact_person`'s `directory_user`. Each label SHALL be the text the form displays (QVL-OQ-2, owner decision 2026-11-09). The contract's person-bearing keys table SHALL name both lists.

#### Scenario: Requested knowingly

- GIVEN `field_keys` without `general.created_by` or `general.lead_contact_person`
- WHEN QA posts `details`
- THEN `labels` holds no `users` and no `directory_users` entry

### QVL-R-7 — Labels are resolved in batch (MUST)

How many statements the labels add to one `details` call SHALL depend only on which control lists the batch touches (or on which databases, if lists are grouped per database). It SHALL never depend on how many ids or results the batch holds.

#### Scenario: One result versus fifty

- GIVEN batch A with 1 eligible result and batch B with 50 results whose ids span the same lists
- WHEN both are answered
- THEN the label statements of A and B are equal in number
- BUT it must NOT issue one statement per id, per result or per field

### QVL-R-8 — Every catalogued list has a label source (MUST)

A control list named by any select entry of a catalogued year SHALL have a label source. A list without one SHALL fail the build's test run, naming the list.

#### Scenario: A new list is added to the catalog

- GIVEN a new select entry naming a control list that has no label source
- WHEN the qa-catalog tests run
- THEN they fail and name that list

### QVL-R-9 — A failed label read fails the batch generically (MUST)

A label read that fails, a database error included, SHALL fail the whole batch with the same generic 500 the value reads use (`The QA results could not be read`). No table, column, SQL, id or label SHALL appear in the body.

#### Scenario: Source unreachable

- GIVEN a label source whose read throws
- WHEN QA posts `details`
- THEN the response is the generic 500
- BUT it must NOT return partial `labels`, and must NOT name the source

### QVL-R-10 — The catalog stays where it is (MUST)

`catalog_version` SHALL NOT change because of this spec. The response of `GET /api/qa/catalog` and the catalog content hash SHALL be unchanged.

#### Scenario: Snapshot guard

- GIVEN the committed catalog snapshot at 2026.34
- WHEN the qa-catalog snapshot test runs after the change
- THEN it passes with no revision bump

### QVL-R-11 — The contract documents `labels` (MUST)

`onecgiar-pr-server/docs/qa-catalog.en.md` SHALL document:
- the property, its shape and an example;
- the per-list label notes, as a table with one row per list: label source kind, label rule, and whether `null` is possible;
- the narrowed known gap 6, and the change to "What QA must NOT assume";
- the person-bearing lists;
- a change-log row stating that `catalog_version` is unchanged.

~~The QA fixture `onecgiar_qa/server/src/ingestion/fixtures/results-details.json` SHALL be updated to the new example.~~ Amended 2026-11-10 (owner decision, `execution.md` "Owner decisions before T-6"): this spec does not touch `onecgiar_qa`. QA copies the contract example into its fixture inside its own spec (`assessment/step-1-assessment`).

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | With `field_keys` absent, statements added per call ≤ the number of distinct lists the batch touches (QVL-R-7), and equal for a batch of 1 and a batch of 50 over the same lists. *Amended 2026-11-09 at /akili-execute (owner decision): prtest has no eligible 2026 batch, so latency is not measured; the statement count is the gate.* Latency on prtest is a known gap until prtest holds an eligible 2026 batch. |
| Security | The route, guard and grant are unchanged (`/api/qa/results/details`, CLARISA key plus `endpoint_allowed`). |
| Privacy | Labels are never logged. The `details` log line keeps counts only and may add `labels=<count>`. Person-bearing lists follow QVL-R-6. No label, id or name appears in docs, fixtures or chat beyond synthetic examples. |
| Backwards compatibility | Additive only (ADR-004). A consumer that ignores `labels` sees no change (QVL-R-5). |
| Observability | The existing `statements=` count includes the label statements. |

## 7. Defect classes and their gates

| # | Defect class | Gate |
|---|---|---|
| D-1 | **Label text differs from the list's canonical form text (dominant)** | **No automated check sees the form.** Substitutes: (a) each list's rule is cited to its client source line in the design's Premise Ledger, as KZ-quality-assurance--qa-intake-1 requires; (b) live HITL on prtest compares one sampled option per list against the rendered form; (c) where the label is a server constant mirroring a client constant, a unit test pins the server text against the client source file read as text. Accepted risk: a client text changed later drifts until the next sweep. Recorded in known gaps |
| D-2 | An id in `values` missing from `labels` (depth 2 especially) | Property test walking every select entry of the returned `values` against `labels`, over fixtures that hold depth-2 ids. Falsifier: limit the walk to depth 1, and the test goes red |
| D-3 | An extra id (another result's, or from a field not returned) | Scenarios QVL-R-2 on a two-result fixture and a `field_keys` fixture |
| D-4 | `values` or other properties altered | Golden comparison (QVL-R-5) |
| D-5 | Per-id or per-result queries (N+1) | A statement-counting runner on batch sizes 1 and 50 (QVL-R-7) |
| D-6 | A list without a source | Completeness test (QVL-R-8) with a falsifier list |
| D-7 | Key type confusion (number vs string id; text-id lists) | Fixture with a numeric list and a text-id list; the JSON keys are asserted as strings |
| D-8 | Labels or names in logs | Log-line test asserting the exact format |
| D-9 | `catalog_version` or catalog hash moves | Existing snapshot guard (QVL-R-10) |
| D-10 | Type errors not seen by Jest | `npx tsc --noEmit` |
| D-11 | Latency regression | Deterministic proxy (amended 2026-11-09, owner): the label statement count per call, bounded by the lists touched and equal for 1 vs 50 (QVL-R-7, T-4). Latency itself is a known gap until prtest has an eligible batch |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| QVL-AC-1 | An eligible result of each catalogued type on prtest | `details` without `field_keys` | Every option id in `values` has an entry in that result's `labels` (QVL-R-1, R-2) |
| QVL-AC-2 | One sampled option per list touched on prtest | Compared with the 2026 form | The label equals the list's canonical form text, and every documented difference is listed in the contract (QVL-R-3) |
| QVL-AC-3 | A fixture with a missing source row | `details` | That id's label is `null`, and the batch answers 200 (QVL-R-4) |
| QVL-AC-4 | The same request before and after | Compared with `labels` stripped | Identical (QVL-R-5) |
| QVL-AC-5 | Batches of 1 and 50 | Label statements counted | Equal (QVL-R-7) |
| QVL-AC-6 | A list removed from the label sources | Tests run | They fail, naming the list (QVL-R-8) |
| QVL-AC-7 | A throwing label read | `details` | Generic 500 (QVL-R-9) |
| QVL-AC-8 | After the change | Snapshot test, and `GET /api/qa/catalog` | 2026.34, unchanged (QVL-R-10) |

## 9. Dependencies & Assumptions

- **Upstream:**
  - the catalog definitions (control-list names per entry);
  - the feed's value reader;
  - the CLARISA-cached tables in PRMS;
  - the ToC database (`DB_TOC`);
  - the 2026 client form as the source of label text.
- **Downstream:** `onecgiar_qa`: the ingestion client `server/src/ingestion/reporting-results-feed.client.ts` (`parseDetails` ignores unknown properties), its fixture `fixtures/results-details.json`, and the assessor view P2-3910. It has no other consumer, since `details` is QA-only.
- **Assumption (UNVERIFIED — confirm at source before relying on it):** every one of the 55 lists has a row source or a constant from which the form's text can be reproduced on the server. A list whose text the form builds from data the server cannot reach would be documented as a known gap with `null`. It is settled per list in the design.

## 10. Open Questions

All three were resolved by the owner at the Phase 1 gate on 2026-11-09.

| ID | Question | Resolution |
|---|---|---|
| QVL-OQ-1 | An inactive (not deleted) source row: label or `null`? The brief said `null` | **Label.** `null` only when the row is missing. This overrides the brief |
| QVL-OQ-2 | Person-bearing labels: when? | **With their field.** They are returned whenever `general.created_by` or `general.lead_contact_person` is returned, `field_keys` absent included (the existing "request knowingly" rule). The text is the canonical form text (QVL-R-3), settled per list in the design |
| QVL-OQ-3 | Which "contract fixtures QA copies"? | **`onecgiar_qa/server/src/ingestion/fixtures/results-details.json`**, in the QA repository. Today it is a copy of the contract's details example at `catalog_version` 2026.31, consumed by `reporting-results-feed.client.spec.ts:120,156`. QA's `parseDetails` (`reporting-results-feed.client.ts:200-217`) reads named properties only, so an added `labels` is ignored until QA parses it |

## 11. Out-of-Band Notes

- Ships on `performance-refactor` (prtest), then reaches PROD through staging and master like the rest of `/api/qa/*`.
- Change-log entry v1.33. The intake / release numbering differences between branches (v1.29 / v1.30) do not affect it.
