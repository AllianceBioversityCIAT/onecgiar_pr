# Requirements — Bilateral create accepts a `result_code` to update or version a result with new data

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-create-upsert-by-code` |
| Type · Depth | Change · **Standard** · Approval Mode `gated` |
| Proposal | [`proposal.md`](./proposal.md) — approved 2026-09-30 (Option A) |
| Module · Code | `api/bilateral` (server) + Fetcher (`onecgiar_result_functions`) · `UBC` |
| Status | `draft` — awaiting Phase 1 approval |
| Branch | `feat/bilateral-create-upsert-by-code` from `performance-refactor` @ `35e58fd87` |
| Contract doc | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — a change-log row is mandatory (root `CLAUDE.md`) |

## 2. Executive Summary

Producer platforms (STAR, MEL, TIP) can already create results through the API. What they cannot do is send new data for a result that already exists in PRMS.

This spec lets `POST /api/bilateral/create` carry an optional `result_code`. PRMS decides the operation from where it finds that code:

| Code found | Operation |
|---|---|
| In the open phase | **update** it |
| Only in an earlier phase, and approved there | **version** it into the open phase, with the new data and the same code |
| Anywhere else, or not found | **reject** it, and never silently create a new result |

Callers that send no code see no change. `POST /api/bilateral/version`, which carries no data, keeps working exactly as today.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Open phase** | The active Reporting phase, the one that `create` and `/version` already target |
| **Owner platform** | The platform that reported the result, identified by the API key, or a platform whose centre scope covers the result's lead centre. This is the same rule `/version` enforces |
| **Update** | The payload replaces the existing open-phase row's data. The row keeps its `id` and `result_code` |
| **Version with data** | A new open-phase row is created from the approved earlier-phase row. It keeps the same `result_code` and takes the payload's data. The earlier row is not touched |
| **Editable status** | A status in which a result may be updated (§6, `UBC-R-5`) |

## 4. System Context & Scope

Current behavior. Every claim below is cited as run at `35e58fd87` unless marked otherwise.

- **Write routes.** The API exposes only `POST create` and `POST version` (`bilateral.controller.ts:49`, `:70`). An earlier `PATCH update/:id` was removed in `f21d0103d` (2026-04-13).
- **Duplicate titles.** Re-sending a result with the same title in the same phase fails with `400 "A result with the title … already exists."` (`bilateral.service.ts:4385-4406`).
- **`op` field.** It is advertised with the values `update` and `delete` in the Fetcher's OpenAPI, but neither the Fetcher nor PRMS reads it (see `proposal.md` §3 for the searches as run).
- **`/version`.** It copies the approved earlier-phase row into the open phase in **Editing**, and it carries no data (`bilateral-versioning.service.ts:95-104`).
- **Initial status on create.** `create` sets it from `keep_editing`: Editing when the flag is true, Pending Review otherwise (`constants/initial-status.constants.ts:21-27`).
- **Fetcher forwarding.** Whether the Fetcher forwards a `result_code` placed inside `data` is `UNVERIFIED — confirm at source before relying on it` (see `proposal.md` §3, `R-4`).

**In scope**
- The create path and its response.
- The new update and version-with-data behaviors.
- Their guards and error vocabulary.
- The contract doc.
- The Fetcher changes that let the code through, plus the corrected `op` documentation.

**Out of scope**
- Delete through the API.
- Partial or PATCH semantics.
- Versioning or updating Knowledge Products.
- Changes to `/version`.
- Any UI.

## 5. Stakeholders / Personas

| Persona | Stake |
|---|---|
| **Bilateral / platform consumers** (`docs/prd.md` §Personas; STAR via Manuel Almanzar) | Can keep one result per `result_code` across updates and phases |
| **Centre users** | See the updated or versioned result in PRMS in the status the producer asked for |
| **PMU / reviewers** | The prior-phase record stays intact, so the trace between phases is preserved |

## 6. Functional Requirements

### MUST

- **`UBC-R-1` — No code, no change.** A `create` result without `result_code` MUST behave exactly as today, including the response shape it already returns.
- **`UBC-R-2` — Update in the open phase.** ⛔ **Descoped 2026-09-30 (Pivot at T-3, user decision):** STAR does not resend results already in the open phase. A `result_code` that matches an active open-phase result is rejected with 409, never updated. The text below is kept as the record of what was descoped. When `result_code` matches an active open-phase result, the result MUST be updated in place:
  - it keeps the same `id` and the same `result_code`;
  - its data is replaced by the payload;
  - no new result row is created.
- **`UBC-R-3` — Version with data.** When `result_code` exists only in earlier phases, and the latest earlier version is Approved, a new open-phase version MUST be created:
  - it has the same `result_code`;
  - its data is the payload's;
  - the earlier version MUST remain byte-identical.
- **`UBC-R-4` — Ownership.** Both operations MUST require the caller to be the owner platform. This is the same rule `/version` applies. Another platform's code is rejected.
- **`UBC-R-5` — Editable statuses for update.** An open-phase result MAY be updated only in **Editing (1), Draft (8), Pending Review (5) or Rejected (7)**. Every other status MUST be rejected: Approved (6), Submitted (3), QA (2), Discontinued (4).
  - ⚠️ *This is a default pending the user's confirmation at the Phase 1 gate (`proposal.md` `OQ-2`).*
- **`UBC-R-6` — Knowledge Products excluded.** A `result_code` belonging to a Knowledge Product MUST be rejected, for update and for version.
  - ⚠️ *This is a default pending the user's confirmation (`OQ-4`).*
- **`UBC-R-7` — Resulting status.** After update or version with data, the status MUST follow the same `keep_editing` rule `create` uses: Editing when true, Pending Review otherwise.
  - ⚠️ *This is a default pending the user's confirmation (`OQ-3`).*
- **`UBC-R-8` — Never silently create.** A `result_code` that is not found, belongs to another platform, is a KP, is not Approved (version), or is in a non-editable status (update) MUST be rejected with a 4xx, and no row may be written.
  - The codes and messages MUST follow `/version`'s vocabulary: 400, 403, 404, 409.
  - A rejected result MUST leave the database unchanged for that result. The guarantee is **per result**: in a multi-result request, results processed before the rejected one stay written (decided by the user at the T-1 gate, 2026-09-30).
- **`UBC-R-9` — Duplicate title excludes itself.** ⛔ **Descoped with `R-2` (2026-09-30).** The version path never needed it, because the source row is not in the open phase. The duplicate-title rule MUST ignore the result being updated or versioned. A payload whose title equals *another* open-phase result's title MUST still be rejected.
- **`UBC-R-10` — Response states the operation.** The response for each result MUST carry `result_code`, `operation`, the resulting `status`, and `external_reference` when one was sent.
  - `operation` is one of `created`, `updated` or `versioned`.
  - The change MUST be additive: every field returned today is still returned.
- **`UBC-R-11` — The code reaches PRMS through the Fetcher.** A `result_code` sent by a producer through the Fetcher MUST arrive at PRMS unchanged.
- **`UBC-R-12` — The documentation is honest.** The contract doc MUST describe `result_code` and the three operations. The Fetcher's `op` documentation MUST stop presenting `update` and `delete` as working operations.

### SHOULD

- **`UBC-R-20` — Same validation as create.** Update and version with data SHOULD run the same payload validation `create` runs: MDS, ToC mapping, contributors. A result that `create` would reject is rejected here too.

### Assumption carried from the proposal

- **`A-1` — Full payload.** Producers send the **full** result on update and on version, including all MDS. Replace semantics follow from this.
  - Source: **confirmed by Manuel (STAR) on 2026-09-30**, relayed by the user. `OQ-1` is closed.
  - If STAR needs partial updates, `UBC-R-2` and `UBC-R-3` change and this spec is re-sized.

## 7. Scenarios

### Update an open-phase result (`UBC-R-2`, `R-4`, `R-5`, `R-9`, `R-10`) — ⛔ descoped 2026-09-30; the code in the open phase gets 409
- GIVEN STAR reported result `28565`, which is in Pending Review in the open phase
- WHEN STAR sends `create` with `data.result_code: "28565"` and a new description, keeping the same title
- THEN result `28565` keeps its `id` and shows the new description
- AND the response says `operation: "updated"`
- BUT it must NOT fail on the duplicate-title rule because of its own title
- AND IT MUST NOT create a second row for `28565` in the open phase

### Version a prior-phase result with new data (`UBC-R-3`, `R-7`, `R-10`)
- GIVEN result `28565` is Approved in phase 2025, and no version of it exists in the open phase
- WHEN STAR sends `create` with `data.result_code: "28565"` and the 2026 data
- THEN an open-phase row with code `28565` exists, holding the 2026 data
- AND the response says `operation: "versioned"`
- BUT the 2025 row must NOT change
- AND IT MUST land in Pending Review, or in Editing when `keep_editing: true`

### Reject instead of creating (`UBC-R-4`, `R-6`, `R-8`)
- GIVEN code `99999` does not exist, code `28111` belongs to MEL, and code `28222` is a KP
- WHEN STAR sends `create` with each of those codes
- THEN the responses are 404, 403 and 409 respectively
- AND IT MUST NOT write any row, no header included

### Non-editable result (`UBC-R-5`, `R-8`)
- GIVEN result `28565` is Approved in the open phase
- WHEN STAR sends `create` with `data.result_code: "28565"`
- THEN the response is 409, naming the status
- BUT the result must NOT change

### Callers without a code (`UBC-R-1`)
- GIVEN a `create` payload without `result_code`
- WHEN it is sent
- THEN the result is created exactly as before this change

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Integrity** | A rejected request leaves no rows behind. Every aborting check runs **before the first write**, because the create's transaction does not enrol its repositories (the note in memory `project-bilateral-create-fake-transaction`; the design verifies it) |
| **Compatibility** | Additive contract only (`AC-4` in `docs/prd.md`). Callers that send no code are unaffected |
| **Security** | Ownership is enforced server-side for every code. No platform can write another platform's result |
| **Traceability** | The earlier-phase record is immutable under versioning |
| **Observability** | Each operation is logged with `result_code`, `operation`, the platform, and the outcome. No payload bodies and no keys are logged (`.cursorrules`) |

## 9. Defect classes and the gate for each

| # | Defect | Gate |
|---|---|---|
| D1 | A wrong or foreign code silently creates a new result | Jest on the service: the not-found, foreign and KP cases each assert a 4xx **and** that no write happened (repository `save` or `insert` not called) |
| D2 | A partial write after a late rejection | Jest: with a failure injected after validation, assert that nothing was written before the check. Plus a code read that every guard precedes the first repository write — **not fully automatable**; it is the Reviewer's obligation |
| D3 | Versioning mutates the earlier-phase row | Jest: the source row is not saved or updated; only `versionProcessV2` and the new row are touched |
| D4 | The update duplicates child rows (partners, ToC, evidence) instead of replacing them | Jest per section writer: an update with N items leaves exactly N active rows. A DB-level check on TEST at the HITL pause |
| D5 | The duplicate-title rule blocks the result's own title, or lets another result's title through | Jest: an update with the same title passes; a title equal to *another* open-phase result is rejected |
| D6 | A regression for callers without a code | The existing `bilateral.service.spec.ts` and `bilateral.controller.spec.ts` stay green; add one case asserting the unchanged path |
| D7 | The Fetcher strips `result_code` | **No automated gate in this repo.** Substitute: a real Fetcher run on TEST (the Fetcher owner, or the user) that shows `result_code` reaching PRMS in the server log |
| D8 | Type drift in the DTO or response | `npx tsc --noEmit` (server) |

## 10. Requirement ID Index

`UBC-R-1`..`R-12`, `UBC-R-20`, `A-1`. Open questions `OQ-1`..`OQ-4` are in `proposal.md` §12. The defaults for `OQ-2`..`OQ-4` are in `R-5`, `R-6`, `R-7`.
