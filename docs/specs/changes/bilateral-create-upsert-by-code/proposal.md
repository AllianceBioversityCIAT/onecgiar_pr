# Proposal — Bilateral create accepts a `result_code` to update or version a result with new data

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-create-upsert-by-code` |
| Type | **Change** |
| Approval Mode | `gated` |
| Status | **approved** — user, 2026-09-30 (invoked `/akili-specify`) |
| Date | 2026-09-30 |
| Author (session) | on behalf of j.delgado@cgiar.org |
| Jira | **none yet** |
| Origin | Manuel Almanzar (STAR), Slack 2026-09-30: *"¿Cómo podríamos enviar una actualización de un resultado del mismo año? … si ya existe un resultado en 2025, ¿cómo enviar los datos de ese resultado versión 2026 manteniendo el mismo result_code?"* The user answered with the proposed direction and asked whether STAR sends full MDS. **The answer is pending** (`OQ-1`) |
| Branch | `feat/bilateral-create-upsert-by-code` from `performance-refactor` @ `35e58fd87` |
| Depends on | none. Extends `POST /api/bilateral/version` (P2-3228; guard fixes in `bugfix/p2-3652-bilateral-versioning-guard-dead-branch`) |
| Parallel-safe | **no** — it touches the `/api/bilateral/*` payload contract and `bilateral.service.ts` create path, which the constitution serialises |
| Cross-repo | `onecgiar_result_functions` (Fetcher) — see `R-4` |

## 2. Intent

A producer platform (STAR, MEL, TIP) sends the same `create` call it already sends, plus the `result_code` of an existing result.

| Where PRMS finds the `result_code` | What happens |
|---|---|
| In the open phase | The result is updated in place |
| Only in a previous phase, where it is approved | A new version is created in the open phase, keeping the same code and holding the new data |

## 3. Problem / Current Behavior

- **There is no update through the API.** The only write routes are `POST create` and `POST version` (`bilateral.controller.ts:49`, `:70`).
  - An update did exist: `PATCH update/:id` was added in `5a50ad429` (2025-12-09) and removed in `f21d0103d` (2026-04-13), alongside `delete/:id`. As run: `git log --all -G"@(Patch|Put)\(" -- …/bilateral.controller.ts`.
  - The old update was keyed by the internal `id`. It had no platform-ownership check and no status check.
- **Re-sending the same result through `create` in the same phase fails.** It gets `400 "A result with the title … already exists."` (`bilateral.service.ts:4385-4406`, `ensureUniqueTitle`, scoped to `version_id`).
- **`op: "update"` is advertised but does nothing.**
  - The Fetcher's OpenAPI lists `op ∈ {dataset.ingest.requested, update, delete}` (`onecgiar_result_functions` `services/fetcher/src/docs/openapi.json`, `IngestRequest`, on `origin/main`, `dev`, `dev-fetcher`).
  - The Fetcher forwards `op` unread (`external-api.mjs:81`; `git grep -E "op\s*===|case ['\"]update"` → 0 hits).
  - PRMS declares `op` (`create-bilateral.dto.ts:1453-1459`) and never reads it (`grep -rn "\.op\b" src/api/bilateral` → 0 hits).
- **Versioning exists, but carries no data.**
  - `POST /api/bilateral/version { result_code, external_reference? }` copies the approved prior-phase version and leaves the copy in **Editing** (`bilateral-versioning.service.ts:95-104`).
  - Its guards: exists and active; not already in the current phase; W3/Bilateral; not a KP; Approved; same platform or in-scope centre (`bilateral-versioning-rules.service.ts`, the `resolveVersionableResult` throws; `bilateral-versioning.service.ts` `assertCallerMayVersion`).
- **The create already picks its initial status from a flag.** `keep_editing: true` sets Editing; otherwise it sets Pending Review (`constants/initial-status.constants.ts:21-27`).
- **The create's transaction does not enrol its repositories.** A late throw leaves partial rows, so every aborting check must run before the first write. This is from the memory note `project-bilateral-create-fake-transaction`. `UNVERIFIED — confirm at source before relying on it` for the create's current line numbers.
- **The Fetcher may drop `result_code` before it reaches PRMS.**
  - Its AJV runs with `removeAdditional: true` (`validator/ajv.js:6`).
  - `common_fields.json` sets `additionalProperties: true` at its root (`:6`), so a `result_code` inside `data` *may* survive.
  - Per-type schemas and the hand-built envelope (`external-api.mjs:76-83`, six fixed keys) would drop it elsewhere.
  - `UNVERIFIED — confirm at source before relying on it` for the exact path. Owner: `/akili-specify` Phase 2, with a real Fetcher run.

## 4. Proposed Outcome

`POST /api/bilateral/create` accepts an optional `result_code` in each result's `data`.

| `result_code` | PRMS finds | Outcome |
|---|---|---|
| absent | — | New result, exactly as today |
| present | An active row in the **open phase**, owned by the caller, in an editable status | **Update in place:** same id, same code, new data |
| present | Only in a **previous phase**, approved, owned by the caller, not a KP | **Version with data:** a new row in the open phase with the same code and the payload's data. The prior version is untouched |
| present | Not found, another platform's, a KP, not approved, or not editable | **Rejected** with the same 4xx vocabulary `/version` uses. It is never silently created as new |

The response echoes `result_code`, `operation` (`created | updated | versioned`) and the resulting status. `/version` (no data) is unchanged.

## 5. Scope

- The create path in `bilateral.service.ts`: a `result_code` branch, an update core, and version-then-apply.
- Reuse of the versioning rules and `versionProcessV2` for the version branch.
- The duplicate-title check excluding the row being updated.
- Contract doc `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log, plus the Notion "Versioning" section.
- **Fetcher:** make sure `result_code` reaches PRMS, and that `op` stops advertising unimplemented values. The Fetcher lives in the other repo.

## 6. Non-Goals

- Delete through the API.
- Partial updates (PATCH semantics), unless `OQ-1` says STAR sends only changed fields.
- Versioning Knowledge Products. Those stay per-phase, by handle.
- Changing `/version`.
- Any UI change.

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| STAR / MEL / TIP (producers via Fetcher) | Gain update and versioning with data. Callers who send no `result_code` see no change |
| `api/bilateral` create path | New branches before any write |
| `api/bilateral/versioning-rules` | Reused, not changed |
| Fetcher (`onecgiar_result_functions`) | Schema/envelope and the `op` enum |
| Centre users in PRMS | See updated or versioned results, in the status the payload asks for |

## 8. Visual Reference

- Source: **None**. This is a backend and contract change with no UI surface.

## 9. Requirement Delta Preview

### ADDED

- `create` accepts `data.result_code`. When present, it updates the open-phase row, or versions the approved prior-phase row with the payload's data.
- The response carries `operation: created | updated | versioned`.
- Ownership and eligibility guards apply to `result_code` on `create`: the same guards as `/version`, plus the editable-status rule for updates.

### MODIFIED

- The duplicate-title check ignores the row being updated.
- The contract doc and the Fetcher's `op` enum reflect what is actually implemented.

### REMOVED

- Nothing. The misleading `op: update|delete` documentation is corrected, not removed from the payload.

## 10. Approach Options

### Option A — `result_code` on `create`, where PRMS decides by phase *(recommended)*

- ✅ One route for producers. The Fetcher only has to let the field through.
- ✅ The phase where the code is found disambiguates the operation, so no flag is needed.
- ✅ Version-with-data is `versionProcessV2` plus the same update core.
- ❌ `create` gets more complex. It needs clear 4xx outcomes so a typo in `result_code` never silently creates a new result.

### Option B — a separate `update` endpoint, plus a `data` payload on `/version`

- ✅ Each route stays single-purpose.
- ❌ Two new contract surfaces. The Fetcher needs two new routes. Producers must choose the operation themselves.

### Option C — honour `op: "update"` on `create`

- ✅ Uses a field the Fetcher already forwards.
- ❌ An explicit flag duplicates what the phase lookup already tells us. It still needs `result_code`. It also adds a contradictory state (`op: update` with no code).

## 11. Recommended Approach

**Option A.** It matches what the user already proposed to STAR, and it keeps one route. The real work is one well-built **update core** that applies a full payload onto an existing row:
- **Update** = the core on the open-phase row.
- **Version with data** = `versionProcessV2` on the prior row, then the core on the new row.

Every eligibility check runs before the first write, because the create's transaction is not real.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Owner |
|---|---|---|
| `OQ-1` | Does STAR send the **full** result (all MDS), or only changed fields? Full → replace semantics (recommended). Partial → a much larger merge design | **Manuel (STAR)**, asked 2026-09-30 |
| `OQ-2` | Which statuses may be **updated** in the open phase: Editing, Draft, Pending Review? Approved → reject, or reopen? | User / PO (Ángel) |
| `OQ-3` | After **version with data**: Pending Review (like `create`) or Editing (like `/version`)? Proposal: honour `keep_editing`, the same rule `create` uses | User |
| `OQ-4` | Should Knowledge Products be excluded from update too, or only from versioning? | User |
| `R-1` | A wrong `result_code` must never create a new result. Every miss is a 4xx | Design |
| `R-2` | Partial writes: the create's transaction does not enrol repositories. All validation must run before the first write | Design |
| `R-3` | Replacing sections on update may orphan child rows (partners, ToC, evidence). The update core must reuse the create's per-section writers idempotently | Design |
| `R-4` | Whether the Fetcher lets `result_code` through is `UNVERIFIED` (§3). Needs a Fetcher change and a real run, and is cross-repo | Fetcher owner (David Casañas?) |
| `R-5` | Payload-contract change: additive only. The change-log row in `bilateral-result-summaries.en.md` is mandatory | Design |

## 13. Success Criteria

- A `create` without `result_code` behaves exactly as today.
- A `create` with the code of an open-phase result owned by the caller updates it in place: same `id`, same code, new data, and no duplicate-title error.
- A `create` with the code of an approved prior-phase result creates the open-phase version with the payload's data and the same code. The prior version is unchanged.
- Every ineligible code is rejected with a 4xx and leaves no rows behind.
- A `result_code` sent through the Fetcher reaches PRMS, proven by a real run.

## 14. Next Step

```text
/akili-specify changes/bilateral-create-upsert-by-code
```

Standard depth. It is best started **after `OQ-1`** (Manuel's answer), because full versus partial payload decides the size of the update core.
