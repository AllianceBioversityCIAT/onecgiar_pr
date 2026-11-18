# Design — Bilateral project codes (`bugfix/bilateral-project-codes`)

## 1. Document Control

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements | [`requirements.md`](./requirements.md), approved 2026-10-06 |
| TRD touchpoints | Bilateral read surface (`/api/bilateral/*`), CLARISA catalogue sync |
| Approval Mode | `gated` |

## 2. Executive Summary

There is one code change in one private builder. `buildBilateralProjectsSummary` already loads the `ClarisaProject` entity, which has `externalCode`, so the item just gains a third key. All five bilateral read paths go through `enrichBilateralResultResponse` and inherit the field. The two data defects are corrected in CLARISA, and PRMS only verifies the result. No schema, migration, DTO or client change is needed.

## 3. Architecture Overview

| Path | Role in this fix |
|---|---|
| CLARISA `project` table | **Source of truth.** The `organization_code` and `external_code` corrections are applied here (BPC-R-3, R-4) |
| `ClarisaTaskService.syncProjects` → `ClarisaEndpoints.projectMapper` | Unchanged. It overwrites `clarisa_projects` from CLARISA, which is why the data must be fixed upstream |
| `BilateralService.enrichBilateralResultResponse` (callers at 619, 831, 857, 1043, 1139) | Unchanged. It calls the builder once per result |
| `BilateralService.buildBilateralProjectsSummary` (`bilateral.service.ts:2123`) | **Changed.** It adds `external_code` to each item and widens its return type |

## 4. Directory Impact

| File | Change |
|---|---|
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` | Builder item and return type gain `external_code: string \| null`. JSDoc mentions the field |
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` | New `describe('buildBilateralProjectsSummary — external_code (BPC-T-1)')` that uses the existing `makeService` override for `_resultsByProjectsRepository` |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | `bilateral_projects[]` row describes the three keys, plus a change-log row dated 2026-10-06 |

## 5. Data Model

No schema change. `clarisa_projects.external_code` is `varchar(100) NULL`, added by migration `1786980549228`. The entity property is `externalCode`.

## 6. API Design

The change is additive on every bilateral read that returns a result object:

| Key | Type | Source | Null when |
|---|---|---|---|
| `short_name` | string \| null | `clarisa_projects.short_name` | unchanged |
| `organization_code` | string \| null | owning institution **acronym** (`obj_organization.acronym`) | unchanged |
| `external_code` *(new)* | string \| null | `clarisa_projects.external_code` | project has no code |

Item order and filtering (active link, active result-project relation) stay as they are.

## 7. Backend Module Design

- The builder's existing `find` already loads `obj_clarisa_project` with its scalar columns, so no relation, `select` or query is added (BPC-NFR-1).
- The value is mapped with null-coalescing so a missing value is emitted as `null`, never `undefined` (BPC-S-1.2).

## 8. Frontend / UX

None. No client consumer reads this server-side bilateral builder.

## 9. Data Runbook (BPC-R-3, BPC-R-4) — executed by Santiago

| Step | Where | Action | Gate |
|---|---|---|---|
| 1 | PRMS prod (read) | Run the `source = 'API'` check from `proposal.md` §12 for the 15 non-CENTER-02 results | Zero rows, or the listed results go into the reporter reply |
| 2 | CLARISA | Set the owning institution of the 12 project ids to **49** | Snapshot the 12 rows' previous values first so the change can be rolled back |
| 3 | — | Get the Alliance mapping file from the reporter | **Blocks steps 4–5 only** |
| 4 | CLARISA | Load `external_code` for the mapped ids only | No value for an unmapped id |
| 5 | PRMS prod (read) | After sync 1 and sync 2: 1353 count = 0; the 12 ids = 49; mapped ids match the file | Both syncs green, otherwise investigate before replying |
| 5b | OpenSearch pipeline (CLARISA team, outside this repo) | After the BPC-T-1 deploy **and** steps 2–5: re-index the bilateral results, at least phase 2025 / those linked to the 12 projects. The pipeline consumes `GET /api/bilateral/list` / `/results` and stores snapshots. Fixing `clarisa_projects` changes no `result` row, so an incremental sync may never re-pull them | **Resolved by reading `onecgiar_result_functions/services/sync`** (local `main` @ b934d42, 2026-09-24):<br>• The pipeline consumes `GET <PRMS>/api/bilateral/list` with an `X-API-Key` header (`clients/external-api.mjs`).<br>• The daily cron (`rate(1 day)`) is **incremental**: it only takes results whose `last_updated` falls on the current UTC day (`utils/cron-date-window.mjs`). So it will never re-pull these results by itself.<br>• Each item is indexed **as-is**: the item is spread into the document, and only `created_by`, `last_updated_by` and `submitted_by` are removed. The mapping lets the new key through: top-level fields are dynamically mapped, and `payload` has `dynamic: false`, which keeps the key in `_source`.<br>• The Normalizer passes `bilateral_projects` through verbatim (`fetcher/src/mappers/response-result.mjs:669`).<br>• So **no code change** is needed in sync or the Normalizer, only a **re-index**: `GET <sync>/sync?result_type=<type>&phase_year=2025` with no page and no date filter fetches every page of that type. It has to be run once per affected result type. The cron can also be invoked with an explicit `last_updated_from/to` window |
| 6 | Ticket | Reply to the reporter: field live, owner fixed, codes loaded, `"ABC"` → `"Bioversity (Alliance)"`, rotate the `x-api-key`. Only **after step 5b**, because that is when the Normalizer actually shows the changes | — |

Rollback: restore the step-2 snapshot in CLARISA. The next sync carries it back.

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| BPC-DD-1 | Change the single shared builder | Add the field per endpoint | One builder serves all 5 read paths, so it cannot drift (BPC-S-1.1 "AND IT MUST") |
| BPC-DD-2 | Always emit the key, `null` when absent | Omit when null | Stable shape for consumers (S-1.2, `AC-4`) |
| BPC-DD-3 | Fix data in CLARISA | PRMS `UPDATE`, or PRMS override columns | The sync overwrites PRMS; override columns add schema and logic for a data defect (proposal §10) |
| BPC-DD-4 | Keep the `organization_code` name with acronym content and document it | Rename it, or add `organization_acronym` | Renaming breaks consumers; the doc note is enough (`AC-4`) |

**Reversion challenge (Step 2.3):** not applicable. No decision removes or inverts delivered behaviour; the change is purely additive.

## 11. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Code tasks | **1** (BPC-T-1), plus 1 manual data task (BPC-T-2, outside execute) |
| LOC | **~45** (≈5 service, ≈35 spec, doc rows) |
| Review rounds | **1** |

These numbers match Lite. Going past 2 rounds or ~100 LOC means the scope drifted: stop and escalate.
