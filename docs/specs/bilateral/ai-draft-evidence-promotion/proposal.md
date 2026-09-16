# Proposal — Carry the AI-screened document into the result's Evidence section on promotion

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-draft-evidence-promotion/` |
| Slug | `ai-draft-evidence-promotion` — derived from the conversation intent, not from the free-text argument ("iniciemos entonces con el proporse", which carries no scope). Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/bulk-uploader-handoff`, `bilateral/webhook-external-platforms`). |
| Type | **Change** — the behavior never existed. It is, however, the *unimplemented last step of an already-approved design* (see Problem), not a new idea. |
| Approval Mode | **gated** (default). No pre-approval mandate given. |
| Status | draft — awaiting approval |
| Owner | Juan David Delgado |
| Date | 2026-09-16 |
| Ticket(s) | [P2-3700](https://cgiarmel.atlassian.net/browse/P2-3700) — Enhancement under epic [P2-2338](https://cgiarmel.atlassian.net/browse/P2-2338) *Enhancements 2026*. Reported by Nicoleta; created and assigned 2026-09-16. |
| Baseline | `docs/prd.md` — **AC-6** (submission requires at least one evidence row where the type requires it), **AC-7** (soft delete/recovery), AC-9 (no secrets in logs), G2/M2.2 (% of submitted results carrying at least one valid evidence link), US-S1, OQ-5 (AI-assisted authoring) · `docs/trd/trd.md` — **W8** (AI helpers: auth-gated, audit-logged), W1 (result lifecycle), W7 (soft delete), §7 Integration Points (S3/SharePoint), **QAS-3** (p95 ≤ 2 s section save), QAS-10 (observability, no secrets), QAS-12 / ADR-001 (LITE tier — no new always-on compute) · `docs/ux-ui/design.md` — §8 Component Inventory, §12 *shared sections over copy-paste forms* (the Evidence block is a shared section) |
| Related specs | `archive/2026-07-31-bilateral-ai-workflow` (**the origin design — `bilateral-spec.md:181-185` specifies exactly this behavior**) · `archive/2026-09-14-bilateral--ai-drafts-redesign` · `archive/2026-09-15-bilateral--ai-processing-feedback` (the `APF-R-*` requirement ids the current job/draft code cites) |
| Depends on | none in-repo |
| Parallel-safe | **yes** — all work lands inside `api/bilateral-ai` plus one new reusable server-side upload method in `shared/services/share-point`. No migration, no existing API contract changed, no client page touched. |
| Kaizen | **KZ-EVL-1** (`kaizen/bugfix--evidence-storage-link-validation.md`) applies directly: *design must cite the actual live dispatch chain, not the function that superficially does the work.* Honored here — the promote path was traced end to end before writing this (see Problem). |

## Intent

When a bilateral user creates a result through AI screening, the document that produced the result must already be sitting in the result's **Evidence** section when they open it. Today the section is empty and the user has to find and re-upload the very file they just gave the AI.

## Problem / Current Behavior

Reported by Nicoleta on result **9349** (*Growing private sector investment in organic and eco-friendly inputs in Ghana…*, Reporting 2026, Other outcome, W3/Bilateral, Editing): created via AI screening of a report, Evidence section shows *"No evidence added"*.

**This is not a missing idea — it is a missing implementation.** The origin spec already specified it (`archive/2026-07-31-bilateral-ai-workflow/bilateral-spec.md:181-185`):

> - User marks which DOCUMENT items become formal evidence (`is_formal_evidence=true`)
> - Voice notes and text context cannot be marked as formal evidence
> - User clicks "Promote to Editing"
> - **Backend copies marked DraftEvidence to ResultsByEvidences (formal evidence table)**

That last line was never built. Tracing the live chain (KZ-EVL-1) shows three independent gaps:

| # | Gap | Evidence |
|---|---|---|
| **G1** | Nothing can be marked formal. `is_formal_evidence` is written `false` for every source at draft creation and the `PATCH drafts/:draftId/evidence/:evidenceId` endpoint that flips it (`bilateral-ai.controller.ts:107`) **has no caller** — `PATCH_bilateralAiEvidence` exists in `bilateral-api.service.ts:237` but no component invokes it. | `bilateral-ai.service.ts:936`, `:947`, `:960` |
| **G2** | The promote reads the formal evidence but only to **validate**, never to copy. `promoteDraft` loads the draft's evidence, filters `is_formal_evidence`, and throws if a non-`DOCUMENT` source is formal — then flips `status_id` to Editing and returns. It never writes a row to `evidence` for `draft.result_id`. | `bilateral-ai.service.ts:541-607` |
| **G3** | The file never leaves S3. The AI job keeps only S3 coordinates (`bucket_name`, `document_keys`, `audio_keys`); each `bilateral_ai_draft_evidence` row is written with `file_management_reference = null`. PRMS evidence needs a resolvable `link` (`evidence.link`, `evidence.is_sharepoint`, `evidence_sharepoint`), so nothing in the current data can become a working evidence row. | `bilateral-ai.service.ts:933-939`; `draft-evidence.entity.ts:45-49` |

Consequence for the product baseline: an AI-created result cannot satisfy **AC-6** without manual re-upload, and it drags down **M2.2** (% of submitted results carrying a valid evidence link) for exactly the flow meant to reduce reporting friction.

## Proposed Outcome

1. Promoting an AI draft attaches every **office-format document** of that job to the created result as evidence, automatically, with no user action.
2. The evidence appears in the result's standard Evidence section with a working SharePoint link, indistinguishable from a manually uploaded one.
3. Audio, plain text and free-text context are never attached.
4. The user can add more evidence, and can remove the automatic one through the normal (soft) delete — the default never blocks editing.
5. Re-running a promote (retry, redelivery) does not duplicate evidence rows.

## Scope

| Layer | Work |
|---|---|
| Server — SharePoint | New **server-side upload** capability in `shared/services/share-point/share-point.service.ts`: stream an S3 object into a Graph upload session and return the resulting `document_id`. Today `createUploadSession` (`:29`) only hands a URL back to the **client**, which performs the upload; no server-side path exists. Reuses `generateFilePath` (`:433`, `/{phase_name}/Result {result_code}`), the `result-{code}-Document-{date}-{n}.{ext}` naming (`:39-42`) and `addFileAccess` for the shareable link. |
| Server — `promoteDraft` | After the result reaches Editing, for each qualifying draft-evidence document: read from S3 (`bilateral-ai-file-storage.service.ts:103` already signs `getObject`), push to SharePoint, then create the `evidence` row (`result_id`, `link`, `is_sharepoint=true`, `evidence_type_id=1`) plus its `evidence_sharepoint` row (`document_id`, `file_name`, `folder_path`, `is_public_file`), and stamp `file_management_reference` back onto the draft-evidence row. |
| Server — qualifying-format rule | An **allowlist** of office formats decides what is carried: `pdf`, `docx`, `xls`, `xlsx`, `pptx`. `txt` is explicitly excluded even though the uploader accepts it (`bilateral-ai-file-storage.service.ts:48-55` allows `pdf, docx, txt, xls, xlsx, pptx`). Allowlist, not denylist, so a future accepted extension never becomes evidence silently. |
| Server — default formal | `is_formal_evidence` is set `true` at draft creation for sources that match the allowlist, instead of the blanket `false` today. The existing `PATCH` endpoint keeps working as the opt-out seam for a future UI. |
| Server — idempotency | A promote must not double-attach. Guarded on `file_management_reference` already being set (mirrors the existing late-completion guard at `bilateral-ai.service.ts:880`). |
| Tests | Jest on `bilateral-ai.service.spec.ts` (allowlist filtering, evidence row shape, idempotency, audio/text exclusion) + the new SharePoint upload method. Scoped run only: `npx jest --testPathPattern="bilateral-ai"`. |

## Non-Goals

- **No backfill.** Results already created through AI screening with an empty Evidence section (9349 and any others) stay as they are. Decided 2026-09-16; a separate ticket if Ángel asks — the S3 objects of old jobs may no longer exist and those results have since been hand-edited.
- **No UI work.** No toggle in `draft-evidence-list`, no change to the Evidence section component. The `PATCH` endpoint stays uncalled.
- **No change to the AI upload screen**, its extension allowlist, size limits or source count.
- **No new async infrastructure** (queue, worker, job state machine) — see Approach Options.
- **No change to the bilateral payload contract** (`/api/bilateral/*`) — ADR-004 untouched.

## Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| **Result submitter** (bilateral / center staff) | Stops re-uploading a file they already provided. Primary beneficiary. |
| **QA reviewer** | AI-created results arrive with source evidence attached — the gap that made Nicoleta the de-facto QA gate in the origin spec. |
| **SharePoint / Microsoft Graph** | New write pattern: uploads originated by the API instead of by the browser. Same drive, same folder convention. |
| **AWS S3** (`BILATERAL_AI_BUCKET_NAME`) | New read pattern: server reads objects it previously only signed URLs for. |
| Code | `api/bilateral-ai/services/bilateral-ai.service.ts` · `shared/services/share-point/share-point.service.ts` · `api/results/evidences` repositories (reuse, read-only intent) |
| Specs | Completes `archive/2026-07-31-bilateral-ai-workflow`'s promote step; no spec is contradicted. |

## Visual Reference

- **Source:** None required (server-only change).
- **Location:** n/a. The two screenshots on P2-3700 document the defect (result 9349's empty Evidence section), not a target design.
- **Notes:** The surface where the result appears is the existing shared Evidence section (`docs/ux-ui/design.md` §12 — *prefer shared sections over copy-paste forms*). It already renders SharePoint-backed evidence; an automatically attached row renders through the same component with no visual change. A mockup was considered and is not warranted: nothing new is drawn. Should the *"Todos por defecto + toggle"* option ever be revisited, that toggle would need a visual pass before specifying.

## Requirement Delta Preview

### ADDED Requirements

- On promoting an AI draft, every draft-evidence row whose file extension is in the office allowlist (`pdf`, `docx`, `xls`, `xlsx`, `pptx`) is uploaded to SharePoint under the result's folder and attached to the result as an active evidence row.
- The server can upload a file to SharePoint on its own behalf (stream from S3 → Graph upload session), without a browser in the loop.
- Attaching is idempotent per draft-evidence row.

### MODIFIED Requirements

- `is_formal_evidence` defaults to **`true`** for allowlisted document sources at draft creation, instead of `false` for every source (`bilateral-ai.service.ts:936`).
- `promoteDraft` gains a side effect: it writes evidence rows. Its existing guard (only `DOCUMENT` sources may be formal) is preserved and becomes load-bearing rather than decorative.

### REMOVED Requirements

- None. The origin spec's *"user marks which DOCUMENT items become formal evidence"* is **not removed** — it is inverted to opt-out and left unimplemented on the client, exactly as today.

## Approach Options

| | **A. Attach at promotion** (recommended) | **B. Attach at draft creation** | **C. Upload once per job, link at promotion** |
|---|---|---|---|
| When the file reaches SharePoint | Inside `POST drafts/:draftId/promote` | When the AI returns candidates, in `createDraftFromCandidate` | At draft creation, into a neutral (non-result) folder |
| Duplicate uploads | None — one upload for the one draft the user keeps | **N copies of the same file.** One job yields N candidates → N results, and the `document_keys` loop runs inside *each* draft (`bilateral-ai.service.ts:933`); the folder is per result (`/{phase}/Result {code}`) | None |
| Orphans in SharePoint | None | One folder per discarded draft, each holding the file | Files for jobs whose drafts were all discarded |
| Promote latency | **Added** (S3 read + Graph upload) | None | Minimal (metadata only) |
| Fit with existing code | Highest — reuses `generateFilePath` and the result-scoped naming untouched | Same folder convention, wrong multiplicity | **Breaks the folder convention** — `generateFilePath` is result-scoped by construction; a neutral folder is a new storage concept |
| `result_code` availability | Available | Available — the `result_code: 0` in the insert is overwritten by the `result_auto_code` BEFORE INSERT trigger (`migrations/1769300000000-BilateralResultCodeAutoIncrement.ts`), so this is **not** a discriminator between A and B | Available |

## Recommended Approach

**Option A — attach at promotion, synchronously.**

The multiplicity argument decides it: a single AI job produces N candidate results, the same document is registered against every one of them, and the user keeps one. Uploading at draft creation would copy one report into N SharePoint folders and orphan all but one. Promotion is also the only moment that already means *"this result is real"* — it is where `status_id` flips to Editing — and `promoteDraft` already loads the draft evidence, so the data is in hand.

**Synchronous, then measure** (decided 2026-09-16). The promote call absorbs an S3 read plus a Graph upload of a ≤ 25 MB file. `/akili-specify` must carry a measurement task against **QAS-3** (p95 ≤ 2 s for a section save) using a representative document; async is the documented escalation if the measurement fails, not the starting design. Starting async would buy a job state machine, a "processing" evidence state, client polling and partial-failure handling — real cost against **ADR-001 / QAS-12 (LITE tier)** — for a latency problem not yet demonstrated.

**Failure posture:** a SharePoint failure must **not** roll back the promotion. The result reaching Editing is the user's actual goal; a missing evidence row is recoverable (the user adds it manually, as they do today). The promote responds success with the evidence gap logged — never a 500 that strands a result between Draft and Editing.

## Risks, Dependencies, And Open Questions

| # | Risk / Question | Handling |
|---|---|---|
| **R-1** | **Server-side SharePoint upload does not exist yet.** Today the browser uploads to the session URL; `share-point.service.ts` only mints it. Streaming a 25 MB body from the API is a new runtime behavior under the Lambda path (memory, timeout). | Size the work explicitly in `design.md`; confirm the deployed runtime (`docs/infrastructure.md` §6) and the 25 MB ceiling against the Lambda budget (**QAS-4**). Chunked upload-session semantics are the fallback if a single `PUT` is unsafe. |
| **R-2** | **`addFileAccess` revocation is documented as unreliable** — measured on prtest 2026-09-09 (result 9075, evidence 13081): both an anonymous and an organization link end up living on the document at once (`share-point.service.ts`, `addFileAccess` docblock). | Create these links as **`organization` scope (non-public)** by default — an AI-screened source document is not automatically public. Recorded below as OQ-1. |
| **R-3** | **Mime type and size are dropped between upload and draft.** `StoredAiFile` carries `mimeType`/`size` (`bilateral-ai-file-storage.service.ts:87-89`) but the job persists only `document_keys: string[]`, so draft evidence stores `mime_type: null`. | Filter on the **extension** parsed from the key — the key is `{prefix}/{jobId}/{uuid}-{safeName}` (`:75`), so the original extension survives. Persisting the real mime is a possible tidy-up, not a requirement. |
| **R-4** | **The stored `file_name` is `{uuid}-{original}.ext`**, not a clean display name. | Cosmetic only — SharePoint renames to `result-{code}-Document-{date}-{n}.{ext}` on arrival (`share-point.service.ts:39-42`), so the display name never comes from the S3 key. Note it in `design.md` so nobody surfaces the raw name. |
| **R-5** | **Partial failure across multiple documents** (job allows up to 6 sources): doc 1 uploads, doc 2 fails. | Per-document, not all-or-nothing: each success is committed and stamped on `file_management_reference`; failures are logged and left un-stamped, so a retry picks up exactly the missing ones. This is also the idempotency mechanism. |
| **R-6** | **KZ-EVL-1 recurrence** — patching a path the real scenario never travels. | Mitigated at proposal stage: `promoteDraft` was traced from `bilateral-ai.controller.ts:122` to the `status_id` write. `design.md` must restate the chain and name the one client caller of the promote. |
| **OQ-1** | ~~Should these evidence links be **public (anonymous)** or **organization-scoped**?~~ | **RESOLVED 2026-09-16 during `/akili-specify`** — attached evidence is created **not public**, and the user publishes it later from the Evidence section. The proposal's framing was wrong on one point: leaving the answer open is not possible. The manual flow gates the file upload on the answer and the server rejects a SharePoint evidence with an unanswered `is_public_file`. See `requirements.md` `ADE-R-3.1`, `ADE-AC-7`, `ADE-OQ-1`. |
| **OQ-2** | `txt` is accepted by the AI uploader but excluded from evidence by this proposal (user's rule, 2026-09-16). A user who uploads only a `.txt` gets an empty Evidence section and no explanation. | Silent by design for v1 (no UI in scope). If it turns out to confuse users, the fix is a line of copy on the AI upload screen — a separate, trivial change. |
| **D-1** | Dependency: the SharePoint drive and Graph credentials (`sp_drive_id`, `sp_microsoft_graph_api_url` global parameters) must resolve in the target environment. | Already in use by manual evidence upload; no new configuration expected. Verify on prtest before execution. |

## Success Criteria

| # | Criterion | How it is verified |
|---|---|---|
| **SC-1** | Promoting an AI draft whose job carried a `.pdf`/`.docx`/`.xlsx`/`.pptx` produces exactly one active `evidence` row per such document, bound to the promoted `result_id`. | Jest on `bilateral-ai.service.spec.ts` + one manual promote on prtest. |
| **SC-2** | The Evidence section of the resulting result shows the document, with a link that opens it, with zero user action. | Manual verification on prtest (the reproduction from P2-3700, inverted). |
| **SC-3** | Voice notes, `txt` and free-text context produce **no** evidence row. | Jest, one case per excluded source type. |
| **SC-4** | A second promote / redelivery of the same draft adds no duplicate evidence row. | Jest idempotency case. |
| **SC-5** | A SharePoint failure leaves the result in **Editing** with the promote returning success, and the failure logged without any secret, token or signed URL in the log line (**AC-9 / QAS-10**). | Jest with a failing SharePoint stub + a grep gate over the added log statements. |
| **SC-6** | Promote latency with one representative document is measured and recorded against **QAS-3**. | Measurement task in `tasks.md`; the number goes in `execution.md`, not a guess. |
| **SC-7** | `npx jest --testPathPattern="bilateral-ai"` and `npx eslint` are green; no migration is added (`npm run migration:check` stays clean). | CI gates. |

## Next Step

```text
/akili-specify docs/specs/bilateral/ai-draft-evidence-promotion
```
