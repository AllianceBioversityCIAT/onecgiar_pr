# Archive Summary — QA value labels (`quality-assurance/qa-value-labels`)

**Outcome:** shipped and verified live on prtest for `knowledge_product`.
- `POST /api/qa/results/details` now returns `labels` on every result: the canonical Reporting-form text of each option id in that result's projected `values`, for all 55 control lists of the 2026 catalog.
- The labels are resolved in batch, with one statement per source table.
- People's labels (`users`, `directory_users`) appear only when their fields are returned, and never carry an email.
- `catalog_version` is unchanged at 2026.34. The contract is `qa-catalog.en.md` v1.33.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/quality-assurance/qa-value-labels/` |
| Archive Date | 2026-11-10 |
| Ticket | P2-3910 (supports AC-1 and AC-14; the assessor UI belongs to `onecgiar_qa`) |
| Branch | `JuanGuzman-io/p2-3910-qa-value-labels`, fast-forwarded into `performance-refactor` at `c2053151b` |
| Final Status | **Done.** 7 of 7 tasks `[x]` |
| Approval Mode | gated |

## Requirements Delivered

| Req | What | Task |
|---|---|---|
| Premises | 21 of 22 row premises verified on test and prod. P-20 was refuted, so the pick rule became active row first, then lowest PK | T-1 |
| QVL-R-8 | `LABEL_SOURCES` registry with 55 entries (constant / table / chained / toc), checked three ways: completeness against `CATALOG_FIELDS`, entity metadata, and the client mirror | T-2 |
| QVL-R-2 | Collector of (list, id) pairs from the projected values, across fields and subfields at depth 1 and 2 | T-3 |
| QVL-R-7 | Batched resolver: one query per (table, key), two hops for `centers`, ToC sources grouped, ids matched case-insensitively | T-4 |
| QVL-R-1/3/6/9 | `labels` wired into `details`; generic 500 on a failed read; person-bearing gate; log line `labels=<n>` | T-5 |
| QVL-R-11 | Contract: shape and example, 55-row label table, "What QA must NOT assume", gap 6 narrowed, gaps 19 to 25, change log v1.33 | T-6 |
| AC-1/2/8 | Live on prtest: result 8793, 13 of 13 ids labelled; owner form check passed; catalog still 2026.34 | T-7 |

## Files Changed Summary

Source: `execution.md`.

- **Server (`onecgiar-pr-server/src/api/qa-catalog/`):**
  - `values/label-sources.ts`, `values/label-collector.ts` and `values/label.resolver.ts`, each with a spec;
  - `values/fixtures.ts`;
  - `qa-results.service.ts` and `dto/qa-results-response.dto.ts`;
  - `qa-results.details.spec.ts`.
- **Contract:** `onecgiar-pr-server/docs/qa-catalog.en.md`, from v1.32 to v1.33.
- **Size:** about 2 380 LOC of code and tests, against the owner's ceiling of about 2 800.
- **Not touched:** `onecgiar_qa`. QA copies the contract example into its own fixture (owner decision, 2026-11-10).

## Test Evidence Summary

- **No `test-report.md` and no `validation-report.md`.** The owner accepted their absence at archive time (2026-11-10).
- **Unit specs:** 1227 qa-catalog tests green, re-run by a non-author.
  - The catalog snapshot guard holds `2026.34`.
  - eslint and `tsc` are clean.
  - Every code task observed a falsifier red.
- **T-6:**
  - The table and the registry name the same 55 lists, and the kinds match.
  - In the contract example, every id in `values` has its `labels` entry.
- **T-7 (live on prtest):**
  - AC-1 and AC-8 pass.
  - AC-2 passes on the owner's reading of the rendered form. The tag control prefixes a digit, and the evidence URL sits in `values`; both are documented.

## Validation Summary

There was no `/akili-validate` run. Every task passed its Reviewer, with three FAIL rounds in total: T-1 ×2 for evidence labelling, and T-6 ×1 for a duplicated details section.

## Accepted Warnings Or Follow-Ups

| Item | Owner decision |
|---|---|
| Live AC-1 and AC-2 cover only `knowledge_product`, because prtest has one eligible 2026 result. Re-check the other 8 types when eligible results exist | Accepted 2026-11-10 (known gap) |
| Latency is not measured. The NFR gate is a statement-count proxy | Accepted 2026-11-09 |
| The impact-area binding returns every area's components: a separate bugfix spec and ticket | Accepted 2026-11-09 |
| Three commits sit only on the local branch (`0e245c141`, `897bff216`, `8c9bd0ae5`), plus the archive commit; push only on the owner's order | Pending owner order |
| The P2-3910 Jira comment, in English, on what PRMS shipped | Pending |

## Historical Notes

- prtest had no eligible 2026 batch during T-1, so the latency baseline was impossible. The owner replaced it with a deterministic statement count.
- On prod, the same ToC indicator id carries several descriptions (530 groups, 135 differing, 20 among active rows). Pick rule: active row first, then lowest PK.
- A stored `<` is returned as-is (owner decision). QA escapes it on render.

## Diagrams

The spec has no `diagrams/` folder or slot. No baseline diagram is made stale.
