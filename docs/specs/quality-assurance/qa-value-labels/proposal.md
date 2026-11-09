# Proposal — QA value labels on the results details feed

> **Answer first.** Add one property, `results[].labels`, to `POST /api/qa/results/details`. It carries, per result, the display label of every control-list id found in that result's `values`, grouped by control list. `values` is not touched. The labels are resolved in one batched read per control list (or one `UNION ALL` per database). The name of each list's source sits in a code registry next to `LOOKUP_SOURCES`, and a completeness test makes every catalogued `control_list` resolvable. `catalog_version` does not move.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `quality-assurance/qa-value-labels` |
| Ticket | P2-3910 (support: QA Platform assessor view, AC-1 and AC-14) |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Branch | `JuanGuzman-io/p2-3910-qa-value-labels` (from `origin/performance-refactor` @ `4cf7bc01f`) |
| Date | 2026-11-09 |
| Sources | Requirements: the brief plus Jira P2-3910 (read 2026-11-09). Visual: none, backend-only contract change. The source questions were not asked: the brief supplies both. |
| Depends on | `quality-assurance/qa-results-feed` (shipped) |
| Parallel-safe | yes. It touches only `api/qa-catalog/values/`, the details service and the contract doc. No migration. |

## Intent

QA's assessor (P2-3910) must see a result "organised exactly like the Reporting Tool form" (AC-1), and every comment records "the value the field had when the comment was written" (AC-14). An id is not a value a person can assess. QA needs the label the Reporting form shows, captured in the same immutable snapshot as the ids.

## Problem / Current Behavior

- Select values reach QA as ids only. `single_select` returns "the option id as stored … The contents of the control list are not served" (`qa-catalog.en.md:468`). `multi_select` returns "array of option ids" (`:469`). Known gap 6: "Control-list contents are not served" (`qa-catalog.en.md:680`). Under "What QA must NOT assume": "Control-list contents are not provided here, only their names" (`:288`).
- The catalog names **46 distinct control lists** across fields and subfields (`grep -rhoE "control_list: '[a-z0-9_]+'" definitions/sections | sort -u | wc -l` → 46; corrected at specify to **55** by walking `CATALOG_FIELDS`, because computed names escape the grep — see `requirements.md` §3). Only 13 are closed lists with ids fixed in code (`definitions/closed-control-lists.ts:22-111`). Two more are code lists (`:118-126`). The rest are reference lists that change at runtime, as stated in the comment at `:10-12`.
- The feed already resolves *lookups* in batch. That is one SELECT per (source, key columns) over the distinct keys of the whole batch (`values/lookup.resolver.ts:5`, `:257`). The location of each source is held in a fixed code registry that never leaks physical names (`values/lookup-sources.ts:1-45`). No equivalent exists for control-list labels.
- `RelationBinding.control_list_table` is declared (`definitions/types.ts:57`) but no section sets it (the grep over `definitions/sections` returns nothing). There is no binding from a list to its label source today.
- An empty-runner smoke of the details plan over the 2026 catalog counts **51 statements for all 9 types** (`docs/specs/quality-assurance/qa-results-feed/execution.md:296`). That is the baseline the labels add to.

## Proposed Outcome

For each eligible result, `POST /api/qa/results/details` also returns `labels`:

```json
{
  "result_id": 900001,
  "result_code": 5120,
  "result_type_key": "policy_change",
  "values": {
    "policy_change.policy_type": 1,
    "policy_change.amount_status": 2,
    "geo.countries": [ { "country": 48, "subnational": ["CO-ANT"] } ]
  },
  "labels": {
    "policy_types": { "1": "Program, budget or investment" },
    "policy_amount_statuses": { "2": "Estimated" },
    "countries": { "48": "Colombia" },
    "subnational_areas": { "CO-ANT": "Antioquia" }
  }
}
```

The label values in this example are illustrative. The spec fixes the real ones against the form.

- `labels` holds only the lists and ids that occur in **this** result's `values`, at every depth (field, subfield and depth-2 subfield). It respects `field_keys`: a field that is not returned contributes no labels.
- Keys are always strings: JSON object keys, with numeric ids stringified and code ids as stored. An id whose label cannot be resolved is present with `null`. An id is never dropped.
- The label is the text the **2026 Reporting form** shows for that option. When it differs from the stored name (a composed label such as `code - title`, a client-only constant, or a renamed option), the contract notes say so per list.

## Scope

- One additive property, `results[].labels`, on `POST /api/qa/results/details`. `GET /api/qa/results` and `GET /api/qa/catalog` are unchanged.
- A label-source registry covering every `control_list` of the 2026 catalog. It spans three source kinds:
  - **Closed and code lists** whose labels live only in the client: `policy_amount_statuses`, `evidence_sources`, `actor_count_unit`, `actor_use_nature` and similar. These are server constants that mirror the form, each citing its client source line.
  - **PRMS reference tables:** results, projects, directory users, question options, discontinued reasons, result types, levels, statuses and similar.
  - **CLARISA-cached tables** (countries, regions, sub-national areas, institutions, institution types, initiatives, centers, partner types and similar) and **ToC-database tables** (`toc_results`, indicators, levels, EOI outcomes, MELIA studies), the latter through the existing `DB_TOC` resolution.
- A collector that walks `values` with the catalog definitions (control list per field and subfield, depth ≤ 2) and gathers distinct ids per list for the whole batch.
- Batched resolution: one statement per list touched, or one `UNION ALL` per database (decided in design). No per-id or per-result query.
- A completeness test: every `control_list` named in the 2026 catalog has a registry entry, or the build fails. It follows the `PENDING_CATALOG` / `NOT_FOR_QA` pattern.
- Contract update in `qa-catalog.en.md`: the shape, the example, the per-list label notes, "What QA must NOT assume" (the labels are a display snapshot, not a list's full contents), known gaps, and a change-log row.
- Measurement: 50 results with `field_keys` absent, statements and duration, before and after.

## Non-Goals

- Serving the **full contents** of any control list (a catalogue of options). QA gets labels for the ids it holds, nothing more.
- Changing the shape of `values` or of any existing key (ADR-004).
- Translating labels or serving labels from years other than the 2026 form.
- A new route or a new CLARISA grant. The route is unchanged, so the existing `/api/qa/results/details` grant covers it.
- Fixing known gaps 15 and 18 (environment-specific question ids of `policy_change.related_to`). Labels are read by id from the environment's own rows, so they are correct per environment, but the binding gap stays.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| QA Platform (`onecgiar_qa`), assessor view P2-3910 | Reads `labels` and stores them in the result snapshot |
| `onecgiar-pr-server/src/api/qa-catalog/` (`qa-results.service.ts:143-175`, `values/`) | New collector, registry and resolver. `values` assembly is unchanged |
| `onecgiar-pr-server/docs/qa-catalog.en.md` | Shape, notes, known gaps, change log (v1.33) |
| Specs | Extends `quality-assurance/qa-results-feed` (QRF-R-7, details); reads `qa-field-catalog`'s control-list names |

## Visual Reference

- Source: None.
- Notes: a backend contract change. The "visual" truth is the 2026 Reporting form's option text, which the spec cites per list (client component and line).

## Requirement Delta Preview

### ADDED Requirements

- Each `results[]` element of `details` carries `labels: { <control_list>: { <id as string>: <label | null> } }`, limited to the ids present in that element's returned `values`, at every depth.
- The label equals the 2026 form's display text for that option. Where the form composes or overrides the stored name, the contract notes state the rule per list.
- An unresolvable id gets `null`. It is never omitted, and it never fails the batch.
- Label resolution is batched per list (or per database), independent of the number of ids and results.
- A build-time check fails when a catalogued `control_list` has no label source.
- Labels are never logged. The details log line keeps counts only, with one count added: `labels=`.

### MODIFIED Requirements

- "Control-list contents are not provided" becomes: contents are not provided, but **labels of the ids a result holds are**, in `labels`. Known gap 6 is narrowed accordingly.
- The person-bearing keys table gains the label side: `directory_users` / `users` labels are names. They are returned only alongside the person-bearing fields that hold those ids, under the same "request knowingly" rule (see OQ-2).

### REMOVED Requirements

- None.

## Approach Options

| Option | Shape | For | Against |
|---|---|---|---|
| **A. Per-result `labels` grouped by list** (recommended) | `results[].labels.<list>.<id>` | `values` is untouched (pure addition). Each result is self-contained, so QA's immutable snapshot needs no cross-reference. Grouping by list means an id is labelled once per result even if several fields use it. QA already knows each field's `control_list` from the catalog | A label repeats across results in one batch. That is small: only ids present, at most 50 results |
| B. Batch-level `labels` dictionary | top-level `labels.<list>.<id>` | Smallest payload, no repetition | The snapshot is per result, so QA must slice the dictionary per result before storing. Pairing a result with the wrong dictionary is a silent error |
| C. Inline `{ id, label }` in `values` | `values` changes | Easiest to render | Breaks the value shape (not additive, ADR-004). Rejected |
| D. New `GET /api/qa/control-lists` | separate route | Reusable for pickers | Not what was asked. It serves full contents (institutions run to thousands of rows), gives no point-in-time label per result, and needs a new grant and route. Rejected |

## Recommended Approach

Use **Option A**. It is the smallest safe path:

1. **Registry** (`values/label-sources.ts`). Maps `control_list` to one of three kinds:
   - a server constant (closed or code lists shown from client constants);
   - a table source: logical name, id column and label expression;
   - a ToC source.

   Physical names stay inside the reader, as `LOOKUP_SOURCES` does today (QRF-R-9). A list whose form label is composed declares the composition there, with its client citation.
2. **Collector.** Reuses the catalog definitions to map each returned value path to its `control_list`, then gathers `Map<list, Set<id>>` for the batch and per result.
3. **Resolver.** One bound `IN (...)` read per touched list, or a `UNION ALL` per database if the measurement asks for it. A missing row is `null`.
4. **Projection.** Adds `labels` beside `values` (`qa-results.service.ts:164-165`) and never mutates `values`.
5. **`catalog_version` does not move.** The label sources sit outside the hashed catalog content (`definitions/content-hash.ts:23-31`: the hash covers the catalog projection and bindings). The catalog endpoint's response is unchanged. Precedent: v1.26 added the whole feed with `catalog_version` unchanged (`qa-catalog.en.md:729`). The design confirms this with the snapshot guard. If any label source has to live on a field binding, the revision bumps, as v1.27 did.

## Risks, Dependencies, And Open Questions

| # | Item | Impact | Handling |
|---|---|---|---|
| R-1 | **"What the form displays" is verified per list against the client, 55 times (46 in the first count).** Composed labels (results, initiatives, institutions), renamed options and client-only constants differ from the stored name. Lesson **KZ-quality-assurance--qa-intake-1**: a premise about an external behavior (here, the form's text) is settled by observing it, not by reading our own column names | Main effort and main drift source | Each list is a Premise Ledger row citing the client component line. For lists that are environment-sensitive, add a spot check of the rendered form on prtest |
| R-2 | **Server constants mirroring client constants drift** when the client text changes | A stale label in QA | Each constant cites its client file. A spec test pins the client source string where it is importable, otherwise it is recorded as a known gap |
| R-3 | **Statement budget.** Up to ~55 extra reads over the 51-statement baseline | Latency for 50 results | One `UNION ALL` per database (PRMS, ToC) caps it at 2 extra statements. The design picks after the measurement |
| R-4 | **ToC database** may be unconfigured in an environment (`resolveLookupSource` returns `undefined` without `DB_TOC`) | ToC labels missing | `null` labels plus a known gap, the same behavior as today's ToC lookups. It never fails the batch |
| OQ-1 | **Inactive reference row:** the brief says inactive or deleted gives `null`. But the form still shows the stored option's name when the row is inactive (UNVERIFIED — confirm at source before relying on it) | `null` would hide a label the assessor sees in Reporting | Recommend: label when the row exists (active or not); `null` only when the row is missing. The owner decides |
| OQ-2 | **Person-bearing labels** (`directory_users`, `users`): with `field_keys` absent they would return names for every result | Personal data flows by default | Recommend: same rule as the keys (returned with the person-bearing field, documented in the table). Alternative: returned only when that field is named in `field_keys`. The owner decides |
| OQ-3 | **"Contract fixtures QA copies":** no fixture file is referenced in `qa-catalog.en.md` or the feed spec (`grep -i fixture` finds only internal test fixtures) | The deliverable is unclear | Ask the owner which file QA copies (an `onecgiar_qa` repo path, or a new JSON example under `onecgiar-pr-server/docs/`) |
| OQ-4 | Labels for lists whose ids are **result ids** (`results`, `qa_innovation_dev_results`, `ipsr_bundle_candidates`): the form text is probably `code - title` (UNVERIFIED — confirm at source before relying on it) | Label rule | Settled per list in the spec |

## Success Criteria

- Every id in every returned `values` of a 2026 result, at every depth, has an entry in that result's `labels` (a property-based test over the fixtures and one live result per type).
- `values` is byte-identical before and after the change, for the same request (golden comparison).
- The label of each list matches the 2026 form on prtest for a sampled option (one per list, recorded in execution).
- 50 results with `field_keys` absent: the statement count rises by at most a fixed bound independent of the ids (target ≤ 2 with `UNION ALL`, or ≤ the number of lists touched), and the duration stays within the bound the design sets after a baseline measurement.
- The completeness test fails when a `control_list` has no label source (falsifier run).
- No label, id or name appears in any log line.
- `qa-catalog.en.md` documents the shape, the per-list notes, the known gaps and a v1.33 change-log row. `catalog_version` is unchanged, and the snapshot guard stays green.

## Next Step

```text
/akili-specify quality-assurance/qa-value-labels
```
