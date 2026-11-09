# Tasks — QA value labels (`quality-assurance/qa-value-labels`)

## 1. Scope of this task list

- **Module / feature:** `quality-assurance` / `qa-value-labels`
- **Linked spec:** `requirements.md` (QVL-R-1..11, R-3 amended 2026-11-09) and `design.md` (DD-1..6, Premise Ledger P-1..22)
- **Ticket:** P2-3910 (support)
- **Owner / driver:** Juan David Delgado
- **Status:** in-progress
- **Branch:** `JuanGuzman-io/p2-3910-qa-value-labels` (from `performance-refactor`). Push and merge happen only on the owner's order. The QA repository change goes on its own branch of `onecgiar_qa`.

## 2. Pre-flight checklist

- [ ] The owner puts the QA CLARISA key in a private scratch file (mode 600). It is never printed (T-1, T-7).
- [ ] The test DB is reachable over VPN, through the local `.env`, read-only. No DDL and no `migration:*` command.
- [ ] Before each commit, re-check that the branch is `JuanGuzman-io/p2-3910-qa-value-labels`.
- [ ] Tests are scoped only (`npx jest src/api/qa-catalog`), never the full backend suite.

## 3. Task list

Review values follow the template: `skip-eligible`, `checklist`, `full`, `lenses`.

### [x] QVL-T-1 — Settle the row premises

- **Type:** rollout (evidence, no code)
- **Description:**
  - Run read-only queries on the test DB. The owner runs the same queries on prod. They settle:
    - **P-14:** duplicate use-level and readiness-level rows have the same `name` as their level among ids 1..10.
    - **P-18:** the primary key of `toc_results_melias`, and whether its titles are equal per `melia_id`.
    - **P-20:** `related_node_id` is unique per phase in `toc_results_indicators`.
    - **P-21:** whether `clarisa_geographic_scope` row 4 exists, and its name.
  - ~~On prtest, measure `details` with the largest eligible 2026 batch.~~ Dropped 2026-11-09 (owner decision): prtest has no eligible 2026 batch. The statement count is the NFR gate.
  - Record everything in `execution.md`, quoting each query and count. Row contents may be quoted for reference tables; person data must not be.
- **Implements:** design P-14, P-18, P-20, P-21 (DD-6)
- **Files (expected):** `docs/specs/quality-assurance/qa-value-labels/execution.md` only
- **Depends on:** —
- **Blocks:** T-4 (the P-14 / P-18 / P-20 outcomes pick the source shape)
- **Estimate:** S
- **Review:** `skip-eligible`. The claim it must prove: no file outside `execution.md` changes, and every number in the entry comes from a quoted command run in the session.
- **Verification:** `git diff --stat` shows only `execution.md`. Every outcome row quotes its query and result.
- **Falsifier:** a P-14 outcome written without the query that produced it, or written for test only when the owner did not run prod. Either case reads as not settled.
- **Red run:** n/a (evidence task)
- **Disqualifier:** a prod row that the owner did not observe stays `UNVERIFIED`.
- **Consumers:** none
- **Definition of done:**
  - P-14, P-18, P-20 and P-21 are each marked verified or refuted in `design.md` §1A, with the citation as run.
  - A refuted P-14 or P-18 is routed to the design change it names before T-4 starts. That change goes to the owner when it alters DD-4.
- **Skills:** `systematic-debugging`

### QVL-T-2 — Label-source registry with its three checks

- **Type:** server
- **Description:** Add `values/label-sources.ts`, which declares one source per control list as §5 of the design states:
  - **constant:** labels plus the client `file:line`;
  - **table:** logical source, key column, columns and composer;
  - **chained:** `centers`;
  - **ToC:** through `resolveLookupSource`.

  It also covers the type 9 override. Three specs check it:
  1. **Completeness:** walk `CATALOG_FIELDS` at every depth for every catalogued year. Each `control_list` of a select entry is in the registry, and the failure names the missing list (QVL-R-8, P-4).
  2. **Metadata:** every table and column of a table or chained source exists in the TypeORM entity metadata (P-7, P-17). ToC sources are exempt; each cites its repository SQL in the registry comment.
  3. **Client mirror:** each constant's cited client file is read as text, and every label string occurs in it (D-1a).

  Physical names stay in this file only.
- **Implements:** QVL-R-3 (canonical text, constants documented), QVL-R-8, QVL-R-10 (registry outside the hashed catalog), D-1, D-6, D-6b
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/values/label-sources.ts`, `label-sources.spec.ts`
- **Depends on:** T-1 (for the use-level / readiness shape; the other lists may start in parallel)
- **Blocks:** T-4
- **Estimate:** M
- **Review:** `full`. It defines the label of every list in a payload contract.
- **Verification:**
  - `npx jest src/api/qa-catalog/values/label-sources --silent --reporters=summary`
  - `npx jest src/api/qa-catalog/qa-catalog.snapshot --silent` stays green (QVL-R-10)
  - `npx tsc --noEmit`
- **Falsifier:**
  - Delete the `toc_levels` entry → the completeness spec is red and names `toc_levels`.
  - Rename `name` to `nmae` in the `actor_type` source → the metadata spec is red.
  - Change "Upload file" to "Upload File" in the `evidence_sources` constant → the client-mirror spec is red.
  - All three run against the post-change code.
- **Red run:** `predicted — greenfield artifact (observed in QVL-T-2)`. The task's `execution.md` entry quotes the three reds verbatim.
- **Disqualifier:**
  - A completeness check built by grepping source text is not evidence: it sees 46 lists, not 55 (P-4).
  - A client-mirror spec that reads a test-authored copy of the client text, instead of the real client file, is not evidence.
- **Consumers:** `values/lookup-sources.ts` (reused, unchanged; its spec `lookup-sources.spec.ts` must stay green)
- **Definition of done:**
  - The three specs are green, and their three falsifiers were observed red.
  - The snapshot guard is green with no revision bump.
  - `tsc` is clean.
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`

### [x] QVL-T-3 — Collector: (list, id) pairs from the projected values

- **Type:** server
- **Description:**
  - Add `values/label-collector.ts`. It walks each result's projected `values` with the applicable field definitions, at the field, subfield and depth-2 subfield levels.
  - At every `single_select` / `multi_select` node that names a `control_list`, it adds each non-null id as `String(id)`.
  - It skips `text` nodes that name a list (`general.lead_contact_person`), and handles the `{ value, <subfield> }` shape of scalar fields with subfields.
  - It returns the per-result pairs and the batch union.
  - Settle P-19 first: put a `status_amount` fixture through `value-typing` and record whether `"2"` or `2` comes out.
- **Implements:** QVL-R-1 (string keys), QVL-R-2 (all four scenarios, including the BUT clauses), QVL-R-6 (person-bearing follows the returned fields), D-2, D-3, D-7
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/values/label-collector.ts`, `label-collector.spec.ts`, fixtures in `values/fixtures.ts`
- **Depends on:** —
- **Blocks:** T-5
- **Estimate:** S
- **Review:** `checklist`
- **Verification:** `npx jest src/api/qa-catalog/values/label-collector --silent --reporters=summary`; `npx tsc --noEmit`
- **Falsifier:**
  - Stop the walk at depth 1 → the spec asserting `contributors.science_programs/toc_entries/toc_result` and `geo.countries/subnational` ids is red.
  - Collect from all fields instead of the returned ones → the `field_keys` fixture is red.
  - Run a `text` node through the select branch → the `lead_contact_person` fixture is red because a free-text value appears as an id.
- **Red run:** `predicted — greenfield artifact (observed in QVL-T-3)`
- **Disqualifier:** a fixture with no depth-2 ids, or with ids identical across its two results, cannot tell the mutated walk from the correct one (inert fixture). Each falsifier's fixture must differ under its mutation.
- **Consumers:** none (new module)
- **Definition of done:**
  - Specs green, with each falsifier observed red.
  - P-19 recorded in `design.md` §1A.
  - `tsc` clean.
- **Skills:** `nestjs-expert`, `tdd`

### QVL-T-4 — Resolver: batched label reads

- **Type:** server
- **Description:**
  - Add `values/label.resolver.ts`. It groups the batch union by source:
    - constants resolve in memory;
    - each (table, key column) gets one `PlanQuery` with `any_in` through the counted runner;
    - a chained source gets one follow-up query;
    - ToC schemas come through `resolveLookupSource` (DD-3).
  - It composes texts in TypeScript, strips no HTML because sources hold none, and asserts that no label contains `<`.
  - A missing row gives `null`; inactive rows are read (OQ-1).
  - Queries run concurrently.
  - A throw propagates to the caller's `guarded` boundary, which applies to an unconfigured ToC as well (P-6).
- **Implements:** QVL-R-3 (BUT no markup), QVL-R-4 (both scenarios, including the BUT clause), QVL-R-7 (BUT no per-id statement), QVL-R-9 (no partial labels), D-5
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/values/label.resolver.ts`, `label.resolver.spec.ts`
- **Depends on:** T-1, T-2
- **Blocks:** T-5
- **Estimate:** M
- **Review:** `full`. It is SQL over 30+ tables, and a wrong key column returns wrong labels silently.
- **Verification:** `npx jest src/api/qa-catalog/values/label.resolver --silent --reporters=summary`; `npx tsc --noEmit`
- **Falsifier:**
  - Issue one query per id → the statement-count spec (union of 1 id vs 50 ids over the same lists) is red.
  - Filter on `is_active` → the inactive-row fixture (OQ-1) is red.
  - Drop ids with no row instead of mapping them to `null` → the missing-row fixture is red.
  - Read `clarisa_center` without the chain → the centers fixture expecting `acronym - name` is red.
- **Red run:** `predicted — greenfield artifact (observed in QVL-T-4)`
- **Disqualifier:**
  - A statement-count spec whose two batches touch different lists compares nothing.
  - A runner fake that ignores the `WHERE` cannot show a filter mutation, so the fake must apply `any_in` and `eq` to its rows.
- **Consumers:** `values/read-plan.ts` (`PlanQuery`, `renderPlanSql`, reused unchanged; `read-plan.spec.ts` stays green), `values/lookup-sources.ts`
- **Definition of done:**
  - Specs green, with each falsifier observed red.
  - `read-plan` and `lookup-sources` specs green.
  - `tsc` clean.
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`

### QVL-T-5 — Wire `labels` into `details`

- **Type:** server
- **Description:**
  - In `QaResultsService.details`, after `values` is projected, collect the pairs (T-3), resolve them inside `guarded` with the counted `run` (T-4), and attach the per-result `labels` (`{}` when there are none).
  - Add `labels=<pairs>` to the log line.
  - Add `labels` to the Swagger DTO.
  - Update the exact key pin at `qa-results.details.spec.ts:218` (P-15).
  - Add specs:
    - **golden:** the response without `labels` is identical to a run with the label step stubbed (QVL-R-5);
    - **failing label read:** generic 500, no partial labels, no source names (QVL-R-9);
    - **person-bearing:** `field_keys` without person fields gives no `users` or `directory_users` entry (QVL-R-6);
    - **empty labels:** `{}`, never absent (QVL-R-1);
    - **log format:** exact, with no ids or labels (D-8).
- **Implements:** QVL-R-1, QVL-R-5 (BUT no reshaping), QVL-R-6, QVL-R-9, QVL-R-10, NFR Observability and Privacy, D-4, D-8, D-9
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/qa-results.service.ts`, `dto/qa-results-response.dto.ts`, `qa-results.details.spec.ts`, `qa-catalog.controller.spec.ts` (if its mocked shape is asserted)
- **Depends on:** T-3, T-4
- **Blocks:** T-6, T-7
- **Estimate:** M
- **Review:** `full`. It changes the payload contract, and it touches a shared service.
- **Verification:**
  - `npx jest src/api/qa-catalog --silent --reporters=summary --forceExit`
  - `npx eslint "src/api/qa-catalog/**/*.ts" --quiet`
  - `npx tsc --noEmit`
- **Falsifier:**
  - Collect from raw `values` before `project/normalize` → the capacity-sharing fixture (stored 1 = PhD) is labelled "PhD" instead of "Long-term", and the spec is red.
  - Resolve outside `guarded` → the failing-read spec sees the driver message, and it is red.
  - Mutate `values` in place while attaching → the golden is red.
- **Red run:** `predicted — greenfield artifact (observed in QVL-T-5)`. The pin at `:218` is expected red until it is updated; quote it.
- **Disqualifier:** a golden whose two runs share the same mutated object compares an object with itself. The golden must compare serialized copies taken before and after.
- **Consumers:**
  - `qa-results.details.spec.ts:218` (pins the key set, P-15);
  - `qa-catalog.controller.spec.ts`;
  - `dto/qa-results-response.dto.ts`;
  - QA repo readers per P-16: `reporting-results-feed.client.ts` / `.spec.ts`, `results-feed.port.ts`, `load-runner.ts` / `.spec.ts`, `loads.service.spec.ts`, `test/support/fake-results-feed.ts`. These are unaffected while `parseDetails` ignores unknown properties, and T-6 confirms it.
- **Definition of done:**
  - The qa-catalog suite, lint and `tsc` are green.
  - The snapshot guard is green with `catalog_version` unchanged.
  - Each falsifier was observed red.
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`

### QVL-T-6 — Contract and QA fixture

- **Type:** docs
- **Description:**
  - Update `onecgiar-pr-server/docs/qa-catalog.en.md`:
    - the `labels` shape and example in the details section;
    - a per-list label table (55 rows: kind, rule, places the form differs, whether `null` can happen), from design §5 as finally verified;
    - "What QA must NOT assume";
    - known gap 6 narrowed;
    - new known gaps: impact-area filter, AVISA ToC levels, table-sourced text drift, ToC indicator ids carrying several descriptions (P-20, lowest PK wins), latency not measured (no eligible prtest batch);
    - the person-bearing keys table names `users` and `directory_users` labels;
    - change log v1.33, stating `catalog_version` unchanged at 2026.34.
  - In `onecgiar_qa`, on a new branch, update `server/src/ingestion/fixtures/results-details.json` to the contract example verbatim, with `labels` and `catalog_version` 2026.34. Run QA's ingestion specs.
  - No push without the owner's order.
- **Implements:** QVL-R-11, QVL-R-3 (contract notes, AND documented)
- **Files (expected):** `onecgiar-pr-server/docs/qa-catalog.en.md`; `onecgiar_qa/server/src/ingestion/fixtures/results-details.json`
- **Depends on:** T-5
- **Blocks:** T-7
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - In `onecgiar_qa/server`: `npx jest src/ingestion --silent`.
  - A spot check that the contract example and the QA fixture are byte-equal: `diff` of the extracted example against the fixture, after `jq -S`.
  - The 55-row table's list names equal the registry keys: a script compares the two sets.
- **Falsifier:**
  - Remove one row from the contract table → the set comparison names the list.
  - Change one label in the fixture → the `diff` is non-empty.
- **Red run:** `predicted — greenfield artifact (observed in QVL-T-6)`
- **Disqualifier:** a set comparison that reads list names from the same table it checks is circular. One side must come from the registry, read through `ts-node`.
- **Consumers:** the QA readers listed in T-5 (their specs run in this task)
- **Definition of done:**
  - The contract is updated and the set comparison matches 55 = 55.
  - The QA fixture is updated on its branch, and QA's ingestion specs are green.
  - Neither repository is pushed.
- **Skills:** `cognitive-doc-design`, `api-design-principles`

### QVL-T-7 — Live verification on prtest (HITL)

- **Type:** rollout
- **Description:** After the owner orders the push and merge to `performance-refactor` and the deploy lands:
  1. `details` for one eligible result of each catalogued type (`field_keys` absent). Every option id in `values` has an entry in that result's `labels` (QVL-AC-1).
  2. One sampled option per list touched is compared with the canonical form text. The owner reads the form, and the Leader reads `labels` (QVL-AC-2).
  3. ~~Latency measurement~~ (dropped 2026-11-09, owner decision). Instead, read `statements=` from the log line if the owner can share it.
  4. `GET /api/qa/catalog` still answers 2026.34 (QVL-AC-8).

  Record everything in `execution.md`. Person labels are recorded as present / absent only, never their text.
- **Implements:** QVL-AC-1, QVL-AC-2, QVL-AC-8, D-1b
- **Files (expected):** `execution.md`
- **Depends on:** T-5, T-6, and the owner's push and merge order
- **Blocks:** —
- **Estimate:** S
- **Review:** `skip-eligible`. The claim it must prove: evidence only, with every reading quoted.
- **Verification:** each step quoted in `execution.md`, with PASS / FAIL per list
- **Falsifier:** a list sampled with an id whose label is `null` proves nothing about the text, so pick a resolvable id.
- **Red run:** n/a (live evidence)
- **Disqualifier:** the same rule for spread as T-1. A form comparison done from the design table instead of the rendered prtest form is not evidence.
- **Consumers:** none
- **Definition of done:**
  - AC-1, AC-2 and AC-8 pass, or each failure is routed (fix task, or a known gap with the owner's approval).
- **Skills:** —

## 4. Dependency graph

```text
T-1 ──┬──► T-2 ──► T-4 ──┐
      │                  ├──► T-5 ──► T-6 ──► T-7 (after the owner's push/merge order)
T-3 ──┴──────────────────┘
```

T-3 is independent of T-1 and T-2, so it can run in parallel with them.

## 5. Coverage — scenario and clause to task

| Requirement · scenario / clause | Task |
|---|---|
| R-1 · Result with selects; AND IT MUST be keyed by the string, never a number or array | T-3 (string keys), T-5 (attached shape) |
| R-1 · Result with no option id; BUT not absent or `null` | T-5 (empty-labels spec) |
| R-2 · Depth-2 ids; AND the same id once | T-3 |
| R-2 · Only the fields returned; BUT no ids of unreturned or non-applicable fields | T-3 |
| R-2 · Only this result's ids; BUT not the other result's | T-3 |
| R-2 · Non-select entries are not labelled | T-3 |
| R-3 · Client-only constant; AND IT MUST be documented as mirroring the client | T-2 (constant + mirror spec), T-6 (contract note) |
| R-3 · Shown differently in two places; BUT no `<strong>` markup | T-2 (canonical composer), T-4 (no `<` assertion), T-6 (both places named) |
| R-4 · Missing row; AND the rest answered; BUT not omitted, no 4xx/5xx | T-4 |
| R-4 · Inactive row | T-4 |
| R-5 · Golden; BUT no key added, renamed or reshaped in `values` | T-5 |
| R-6 · Requested knowingly | T-3 (collector follows returned fields), T-5 (end-to-end spec) |
| R-7 · One vs fifty; BUT no per-id, per-result or per-field statement | T-4 |
| R-8 · A new list fails the tests | T-2 |
| R-9 · Source unreachable; BUT no partial labels, no source name | T-4 (propagates), T-5 (boundary spec) |
| R-10 · Snapshot guard | T-2, T-5 |
| R-11 · Contract sections; QA fixture; QA specs green; push only on order | T-6 |
| NFR Performance (statement count, amended 2026-11-09) | T-4 (1 vs 50), T-5 (`statements=` in the log line) |
| NFR Privacy / Observability (log line, `statements=` includes labels) | T-5 |
| AC-1, AC-2, AC-8 | T-7 · AC-3 T-4 · AC-4 T-5 · AC-5 T-4 · AC-6 T-2 · AC-7 T-5 |

## 6. Rollout & verification

The branch merges into `performance-refactor` on the owner's order. prtest deploys automatically, and then T-7 runs. PROD follows the rest of `/api/qa/*` (staging, then master); that is not part of this spec.

## 7. Cleanup & follow-ups

- The impact-area binding bugfix (separate spec and ticket; a comment on P2-4037). Owner decision 2026-11-09.
- QA side (P2-3910): parse and store `labels` in the snapshot.

## 8. Roll-back plan

Revert the merge commit on `performance-refactor`. There is no data, no migration and no catalog revision to undo. QA ignores the missing property.
