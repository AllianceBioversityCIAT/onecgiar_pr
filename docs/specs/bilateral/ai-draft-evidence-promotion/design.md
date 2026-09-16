# Design — AI draft evidence promotion

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-draft-evidence-promotion/` |
| Status | **draft — awaiting approval** |
| Depth | Standard |
| Requirements | `requirements.md` (`ADE-R-*`, `ADE-AC-*`) — approved |
| Owner | Juan David Delgado |
| Date | 2026-09-16 |
| Skills applied | `software-architect` (Decision Spine — scenarios → tactics → tier → pattern → record). `nestjs-expert` is assigned per task in `tasks.md`, not here. |
| Tier | **LITE, unchanged** — ADR-001 holds. No new deployable, no queue, no always-on compute (`QAS-12`). |
| Kaizen | `KZ-EVL-1` — the live dispatch chain is stated in §3.1 and is what every task targets. |

## 1. Executive Summary

A new **evidence transfer** step runs at the end of `promoteDraft`. For each qualifying document of the draft it streams the object from S3 into a Microsoft Graph upload session, then reuses the platform's existing evidence persistence (`EvidencesService.saveSPData`) to mint the sharing link and write `evidence` + `evidence_sharepoint`. Every document is independent: bounded by a timeout, committed on success, logged on failure, and skipped on a later run if already transferred. Nothing about the transfer can fail the promotion.

Three findings from tracing the live code shaped this design more than the proposal anticipated — each is a Design Decision below:

1. **The HTTP client has no timeout** on Graph calls, so "fail soft" is unreachable without adding one (DD-3).
2. **The platform already refuses to store an evidence it cannot confirm private** (DD-4) — our not-public default walks straight into that guard, by design.
3. **Gating the attach on the `is_formal_evidence` flag would silently skip every draft created before deploy** (DD-5, surfaced by the Step 2.3 reversion challenge).

## 2. Feature-Scale Quality Attribute Scenarios

Feature deltas only. Project-level `QAS-1..12` in `docs/trd/trd.md` continue to apply unchanged.

| ID | Attribute | Scenario (`Source → Stimulus on Artifact during Environment ⇒ Response measured by Measure`) | Tactic |
|---|---|---|---|
| `ADE-QAS-1` | **Performance** | Submitter → promotes a draft carrying one representative document (≤ 5 MB) on `POST /drafts/:id/promote` during normal ops ⇒ result reaches Editing with evidence attached, measured by **p95 ≤ 3 s end to end**, of which **≤ 2 s** is attributable to the transfer | Bound execution times; reduce overhead (stream, do not buffer) |
| `ADE-QAS-2` | **Performance (worst case)** | Submitter → promotes a draft whose job carried the maximum 6 sources, all 25 MB documents ⇒ all six attach, measured by **p95 ≤ 45 s**; exceeding it triggers the async escalation in DD-2, not a silent accept | Bound execution times; (rejected: introduce concurrency — DD-2) |
| `ADE-QAS-3` | **Availability** | Microsoft Graph or S3 → unavailable or hanging during a promotion ⇒ the promotion still succeeds and the result still reaches Editing, measured by **0 promotions failed by a transfer fault** and **every call this spec adds bounded by the DD-3 timeout** (the `saveSPData` leg is an inherited unbounded window — DD-3 *Scope correction*) | Detect faults (timeouts); graceful degradation |
| `ADE-QAS-4` | **Availability (partial)** | One document of several → fails mid-batch ⇒ the successful documents stay attached and the failed one is absent, measured by **0 rollbacks of a committed document** and **0 duplicates on a subsequent run** | Checkpoint per document (the `file_management_reference` stamp) |
| `ADE-QAS-5` | **Security / Privacy** | The platform → mints a sharing link for an AI-screened document ⇒ the document is not anonymously reachable, measured by **0 attached evidences stored as public** and **0 stored as private without `verifiedPrivate` confirming it** | Limit exposure; fail closed (inherited from `saveSPData`) |
| `ADE-QAS-6` | **Observability** | Operator → asks why a result has fewer evidences than its job had documents ⇒ the reason is in the logs, measured by **one structured line per document outcome** and **0 tokens, signed URLs or sharing URLs in them** (`AC-9`) | Structured logging; redaction |
| `ADE-QAS-7` | **Testability** | Tester → needs to exercise transfer failure without a live Graph ⇒ the transfer is substitutable, measured by **the failure paths of `ADE-AC-3` and `ADE-AC-5` being coverable with an injected double, no network** | Interface/implementation separation; DI seam (DD-1) |

**Attributes explicitly marked not architecturally significant here:** *scalability* (no change to load shape — one transfer per promotion, promotions are human-paced), *modifiability beyond the DD-1 seam*, *cost* (no new compute; `QAS-12` untouched), *usability/accessibility/i18n* (no UI in scope).

**Trade-off disclosed — Performance ↔ Availability.** DD-3's timeout caps the wait, which means a slow-but-succeeding upload can be abandoned and the evidence lost. Availability of the *promotion* wins over completeness of the *attachment*, because a missing evidence row is recoverable by the user in thirty seconds and a hung promote is not recoverable at all.

## 3. Architecture Overview

### 3.1 The live dispatch chain (`KZ-EVL-1`)

The exact path the reported scenario travels. Every task targets a node on it; nothing else is in scope.

```
Client  bilateral-ai.service.ts (Angular)  →  POST /api/bilateral-ai/drafts/:draftId/promote
          │
          ▼
Server  bilateral-ai.controller.ts:122  promoteDraft(draftId, user.id)
          │
          ▼
        bilateral-ai.service.ts:541     promoteDraft()
          ├─ getDraftRaw(draftId, userId)                    ← ownership/entitlement gate (unchanged)
          ├─ evidenceRepository.find({ draft_id, is_active }) ← draft evidence, already loaded today
          ├─ formal-source validation (DOCUMENT only)        ← unchanged
          ├─ populateResultFromExtractedMds(...)             ← unchanged
          ├─ populateInitiativeAndTocFromProgramCode(...)    ← unchanged
          ├─ populateTypeSpecificFromExtractedMds(...)       ← unchanged
          ├─ resultRepository.update(status_id = Editing)    ← unchanged, and the point of no return
          ├─ ▶ NEW: evidenceTransfer.transferForDraft(...)   ← everything this spec adds
          └─ draftRepository.update(is_discarded = true)     ← unchanged
```

**The insertion point is after the `status_id` write, before the draft is discarded.** After the status write because the promotion must already be irreversible when the transfer runs — that is what makes a transfer failure incapable of stranding the result (`ADE-R-5`). Before the discard only for readability; the transfer does not depend on it.

### 3.2 The transfer, per document

```
for each qualifying draft-evidence row (sequential):
    already stamped with file_management_reference?  ──yes──▶ skip        (ADE-R-4)
                     │ no
                     ▼
    S3 getObject stream  ──────────────────────────────────┐
    SharePointService.createUploadSession(result, name)    │  bounded by
    PUT the stream to the session URL  ─▶ { id, name }     │  the DD-3 timeout
    EvidencesRepository: insert evidence row               │
    EvidencesService.saveSPData(...)  ─▶ link + sp row     │
    stamp draft_evidence.file_management_reference  ───────┘  ← the checkpoint
                     │
                  failure at any step
                     ▼
    log the outcome, leave unstamped, continue to the next document      (ADE-R-9)
```

The stamp is written **last**, so a crash between the SharePoint upload and the evidence insert leaves the row unstamped. The cost of that choice is a possible orphan file in SharePoint on a retry; the benefit is that a stamped row always means a complete, linked evidence. Orphan files are inert — `replicateSPFiles` documents that Graph writes here have no compensating delete anyway — whereas a stamped-but-incomplete row would be an evidence the user can never see and the system will never retry.

### 3.3 What is deliberately **not** built

| Not built | Why |
|---|---|
| Queue / worker / job state machine | `QAS-12`, ADR-001 — LITE tier. The synchronous path is measured first (DD-2). |
| Parallel transfer | DD-2 rejected alternative. |
| Backfill of existing results | Out of scope (`requirements.md` §4). |
| Any client change | Out of scope. The Evidence section already renders SharePoint-backed rows. |
| A new `bilateral-ai.module.ts` | `bilateral-ai` is wired through `api/bilateral/bilateral.module.ts`; creating a module now is unrelated refactoring. |

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/
├── api/bilateral-ai/
│   ├── constants/
│   │   └── evidence-formats.constant.ts        ★ NEW — the office allowlist, single source of truth
│   └── services/
│       ├── bilateral-ai-evidence-transfer.service.ts       ★ NEW — orchestration (§7.1)
│       ├── bilateral-ai-evidence-transfer.service.spec.ts  ★ NEW
│       ├── bilateral-ai.service.ts                         ✎ promoteDraft calls the transfer;
│       │                                                      createDraftFromCandidate sets the flag
│       └── bilateral-ai-file-storage.service.ts            ✎ + a read-object-stream method
├── api/bilateral/
│   └── bilateral.module.ts                                 ✎ import SharePointModule; register the service
└── shared/services/share-point/
    └── share-point.service.ts                              ✎ + uploadFromStream (§7.2)
```

**Why a separate service rather than more of `bilateral-ai.service.ts`:** that file is already ~1000 lines and carries the job lifecycle, the consumer and the promote. A dedicated collaborator gives the transfer its own test surface without standing up the whole promote (`ADE-QAS-7`, modifiability tactic *semantic coherence*), and gives `promoteDraft` a one-line, mockable call.

## 5. Data Model

**No migration.** No column is added, removed or retyped — `npm run migration:check` must stay clean.

| Table | Field | Today | After |
|---|---|---|---|
| `bilateral_ai_draft_evidence` | `is_formal_evidence` | always `false` at creation | `true` for qualifying documents; `false` otherwise (`ADE-R-6`) |
| `bilateral_ai_draft_evidence` | `file_management_reference` | always `null` | the SharePoint `document_id` once transferred — **the idempotency checkpoint** (`ADE-R-4`) |
| `evidence` | — | no AI-created rows | one row per transferred document: `result_id`, `link`, `is_sharepoint = true`, `evidence_type_id = 1`, `is_active = true`, `created_by` = the promoting user |
| `evidence_sharepoint` | — | no AI-created rows | one row per transferred document: `document_id`, `file_name`, `folder_path`, `is_public_file = 0` |

`evidence_type_id = 1` matches what the platform already writes for uploaded documents (`evidences.service.ts:358`, `:872`).

**Storage location.** Unchanged convention: `generateFilePath` puts the file in `/{phase_name}/Result {result_code}` and names it `result-{code}-Document-{date}-{n}.{ext}`. The result's `result_code` is populated before promotion — the `result_code: 0` passed at insert is overwritten by the `result_auto_code` BEFORE INSERT trigger (`migrations/1769300000000`) — so the folder resolves. The raw S3 filename (`{uuid}-{original}.ext`) never surfaces: SharePoint renames on arrival.

## 6. API Design

**No API change.** No new route, no new DTO, no altered response shape.

`POST /api/bilateral-ai/drafts/:draftId/promote` keeps its exact contract — `{ resultId, resultCode, versionId }`, message, status 200 — because the transfer is a side effect the caller does not branch on (`ADE-R-5`). A partial or total transfer failure is **not** reported to the client: the client's job is to navigate to the result, and the user sees the truth in the Evidence section either way. Reporting it would force a client change this spec has ruled out of scope, and would invite exactly the failure posture `ADE-R-5` forbids.

`/api/bilateral/*` payloads are untouched (`AC-4`, ADR-004).

## 7. Backend Module Design

### 7.1 `BilateralAiEvidenceTransferService` (new)

| Responsibility | Detail |
|---|---|
| Select | Load the draft's active evidence; keep rows with `source_type = DOCUMENT` **and** an allowlisted extension **and** no `file_management_reference` yet |
| Transfer | Per row, sequentially: stream from S3 → Graph upload session → evidence row → `saveSPData` → stamp |
| Isolate | Each row in its own `try`; a throw is logged and the loop continues (`ADE-R-9`) |
| Report | Return a per-document outcome summary for the caller to log; never throw |

**The extension is parsed from the stored `file_name`**, not from `mime_type` (always `null` today) and not from `source_type` alone — `txt` is registered as a `DOCUMENT`, so a `source_type` filter would attach exactly the file the user excluded (`ADE-AC-2`).

**Collaborators (all injected — the `ADE-QAS-7` seam):** `BilateralAiFileStorageService`, `SharePointService`, `EvidencesRepository`, `EvidencesService`, the `DraftEvidence` repository.

### 7.2 `SharePointService.uploadFromStream` (new)

The gap: `createUploadSession` (`:29`) mints a session URL and hands it to the **browser**, which performs the `PUT`. No server-side path exists.

The new method mints the session the same way, then performs the `PUT` itself with `Content-Type: application/octet-stream` and `Content-Range: bytes 0-{size-1}/{size}`, mirroring the client's `PUT_loadFileInUploadSession`. The response carries the driveItem `id` and `name`.

**A single request is safe here and chunking is not needed.** Graph refuses any single upload request ≥ 60 MiB (P2-3318, documented at `results-api.service.ts:346-355`) and the AI uploader caps every source at 25 MB (`bilateral-ai-file-storage.service.ts:19`). The client needs its fragmenting variant only because the *manual* evidence forms advertise 1 GB; this path cannot reach the limit.

### 7.3 Reuse of `EvidencesService.saveSPData`

`saveSPData` (`evidences.service.ts:405`) already does everything after the upload: it calls `addFileAccess`, verifies the privacy outcome, writes `evidence.link` from `link.webUrl`, and persists `evidence_sharepoint`. Reimplementing it would fork the confidentiality guard — the one piece of this flow with a documented, still-live platform defect behind it. It is reused as-is; see DD-4.

### 7.4 Module wiring

`bilateral.module.ts` already imports `EvidencesModule` (which exports `EvidencesRepository` and `EvidencesService`) and registers the `DraftEvidence` entity. It must additionally import `SharePointModule`, which provides and exports both `SharePointService` and `EvidenceSharepointRepository`. The new service is registered as a provider there.

## 8. Frontend / UX Component Architecture

**Not applicable — no client work in scope.** The attached row renders through the bilateral Evidence section (`pages/bilateral/components/section-evidence/`), which already displays SharePoint-backed evidence with a public/private padlock and already offers the public/confidential radio in its edit modal. That modal is how the user exercises `ADE-AC-7`; it needs no change.

## 9. Shared Contracts or Package Extensions

- `SharePointService` gains one method. Additive; no existing signature changes, so `evidences`, `toc-results` and `versioning` are unaffected.
- The office allowlist is a new module constant. It is deliberately **narrower** than `bilateral-ai-file-storage.service.ts`'s upload allowlist and must not be merged with it: what the AI may *read* and what may become *evidence* are different questions, and `txt` is the case that proves it.

## 10. Design Decisions

### DD-1 — A dedicated transfer service, not inline in `promoteDraft`
- **Issue:** where does ~120 lines of transfer orchestration live?
- **Decision:** a new `BilateralAiEvidenceTransferService`; `promoteDraft` calls it once.
- **Alternatives:** inline in `promoteDraft` (rejected — a 1000-line service grows, and the failure paths of `ADE-AC-3`/`ADE-AC-5` could then only be tested by standing up the whole promote); a shared generic "attach a file as evidence" utility (rejected — premature; one caller).
- **Implications:** one new file plus its spec; `promoteDraft`'s diff stays a few lines, which keeps the Reviewer's attention on the failure posture rather than on mechanics.

### DD-2 — Synchronous and sequential
- **Issue:** the transfer adds an S3 read plus a Graph upload to a request a human is waiting on.
- **Decision:** synchronous, documents one after another, with the measurement of `ADE-QAS-1`/`ADE-QAS-2` as the gate.
- **Alternatives:** *background after responding* (rejected — a container restart mid-transfer loses the work silently and the user sees an empty Evidence section with no error anywhere); *parallel via `Promise.all`* (rejected — six concurrent 25 MB transfers multiply memory and Graph pressure to shorten a case that is theoretical; the real distribution is one document); *queue/worker* (rejected — `QAS-12`, ADR-001, and it buys a state machine and client polling for an unmeasured problem).
- **Implications:** if `ADE-QAS-1` or `ADE-QAS-2` fails on measurement, the escalation is background-with-status, and it is an amendment to this spec, not an improvisation during execution.
- **Runtime note:** the 29 s API Gateway integration cap does **not** apply — there is no `lambda.ts` in the repo and `main.ts:102` starts a listening container, which is the deployed runtime. Recorded as a pending TRD correction (§12).

### DD-3 — A timeout on the Graph calls is part of this change
- **Issue:** `ADE-R-5` promises the promotion survives a file-management fault. It cannot, today: `replicateSPFiles`' own docblock records that these are *"~6 Microsoft Graph round-trips per evidence on an HttpModule with no timeout"*. A hanging Graph call does not fail — it hangs the promotion forever.
- **Decision:** the transfer bounds **every outbound call this spec adds** with an explicit timeout and treats expiry as an ordinary per-document failure.
- **Alternatives:** rely on the platform default (rejected — there is none); a global `HttpModule` timeout (rejected — it would change behavior for `evidences`, `toc-results` and `versioning`, which is out of scope and unreviewed here).
- **Implications:** "fail soft" becomes reachable rather than aspirational. A slow-but-viable upload can be abandoned — the trade-off disclosed in §2.
- **Open:** the timeout value is an execution-time decision informed by the `ADE-QAS-1` measurement; `tasks.md` sets it, `design.md` only mandates that one exists. *Resolved at execution:* 30 s, applied once to the session-mint chain and once to the byte PUT (`ADE-T-3`).

> **Scope correction — applied during `/akili-execute` with the user's approval (2026-09-16).** As
> originally written this Decision said "every outbound call", which **DD-4 makes unachievable**:
> DD-4 mandates reusing `EvidencesService.saveSPData` *unchanged*, and its `addFileAccess` leg
> (`share-point.service.ts:193` — `removeAllFilePermissions` + `getToken` + `createLink`) is ~6 Graph
> round-trips on the same timeout-less `HttpModule`. `ADE-T-3` delivered the bound for the two calls
> this spec adds (`createUploadSession` chain, byte `PUT`); the `saveSPData` leg remains unbounded.
> A hang there still blocks the `promoteDraft` request — the result is already `Editing`, so it is
> never stranded (`ADE-R-5` holds), but the HTTP response and the draft discard wait.
>
> **Racing a timeout around `saveSPData` is rejected as actively dangerous:** the abandoned call can
> still write `evidence.link` and `evidence_sharepoint` *after* `ADE-T-4`'s compensation has
> deactivated the evidence row, producing exactly the inconsistent state `ADE-AC-3` forbids.
>
> The inherited window is therefore **accepted for v1** and measured by `ADE-T-5`. Bounding
> `SharePointService.addFileAccess` itself is a **follow-up proposal** (see `tasks.md` §9) — it is a
> shared service `evidences`, `toc-results` and `versioning` also depend on, so it earns its own
> spec and its own review rather than a late amendment here. Surfaced by the Resilience lens
> reviewer during `ADE-T-4`; full record in `execution.md` → *Pivot Record: `ADE-T-4`*.

### DD-4 — Reuse `saveSPData`, including its refusal
- **Issue:** our rows are created not-public, which walks into the confidentiality guard at `evidences.service.ts:503-543` — the guard that **refuses** an evidence when `revocation.verifiedPrivate === false`, and which fails closed so "could not check" never reads as "private".
- **Decision:** reuse `saveSPData` unchanged and let it refuse. A refusal is caught per document and becomes a normal transfer failure: no evidence row, logged, promotion unaffected.
- **Alternatives:** bypass the guard for AI attachments (rejected outright — it exists because a link that already circulated kept serving a file the UI drew as private in four places); relax it to a warning (rejected — same reason, and it is not this spec's decision to make).
- **Implications:** a freshly uploaded file has no prior anonymous permission, so the guard should pass in the normal case; when Graph cannot confirm, we correctly attach nothing rather than claim a privacy we did not achieve (`ADE-QAS-5`).

### DD-5 — The allowlist decides what transfers; `is_formal_evidence` does not gate it
> **Step 2.3 reversion challenge.** This DD inverts a delivered default (`is_formal_evidence` written `false` for every source). Challenged: *what does flipping it break?* The challenge found a concrete breakage the proposal had missed, and changed the design.

- **Issue:** if the promote selected rows by `is_formal_evidence = true`, then **every draft created before this deploys attaches nothing** — those rows are already `false` in the database and no backfill is in scope. Users with drafts in flight at release would hit exactly the reported bug, and it would look like the fix did not work.
- **Decision:** the promote selects on `source_type = DOCUMENT` **and** the extension allowlist **and** not-yet-transferred. `is_formal_evidence` is still set `true` at creation (`ADE-R-6`) as the record of intent and as the seam a future opt-out UI will gate on — but in v1 it is **descriptive, not load-bearing**.
- **Alternatives:** gate on the flag (rejected — the in-flight breakage above); drop the flag change entirely (rejected — it would leave the origin design's concept unimplemented and give a future opt-out UI nothing to bind to); backfill the flag on existing rows (rejected — a data migration for a field nothing reads yet).
- **Implications:** the existing `PATCH .../evidence/:evidenceId` has **no effect on what gets attached** in v1. This must be stated where it can be found — when the opt-out UI is built, adding the gate is a one-line change plus a test, and it is that spec's job.
- **Blast radius checked:** `is_formal_evidence` is read in exactly two places — `promoteDraft`'s non-`DOCUMENT` validation (still satisfied: we only ever set it true for documents) and the `PATCH` setter. No client component reads it.

### DD-6 — Stamp the checkpoint last
- **Issue:** where in the per-document sequence does idempotency get recorded?
- **Decision:** `file_management_reference` is written only after the evidence and its SharePoint row exist.
- **Alternatives:** stamp right after the upload (rejected — a failure in `saveSPData` would then leave a stamped row whose evidence does not exist, i.e. an attachment the user can never see and the system will never retry).
- **Implications:** a retry after a mid-sequence crash may upload the file a second time, leaving an orphan in SharePoint. Accepted: orphans are inert and unreferenced, and Graph writes on this path already have no compensating delete (`replicateSPFiles` docblock). A duplicate *visible evidence* would be worse than an invisible orphan file.
- **Implications (second window — added at execution, 2026-09-16, user-approved).** The bullet above
  prices only the crash window *before* the evidence exists. There is a second window **after**
  `saveSPData` resolves and before the `file_management_reference` UPDATE lands: the evidence is
  complete, linked and visible, but the draft row is unstamped, so a later run re-uploads and creates
  a **duplicate visible evidence** — the outcome this DD itself names as strictly worse than an
  orphan file. It is narrowed, not eliminated, by `getDraftRaw`'s `is_discarded: false` guard
  (`bilateral-ai.service.ts:501`): a second promotion requires **both** the stamp write and the
  discard write to be lost, i.e. a compound failure. **No fix exists inside this design** — stamping
  earlier contradicts DD-6's whole point, and a DB transaction spanning a Graph call is outside the
  LITE tier (ADR-001). Recorded so the accounting is honest, not because the ordering changes.
  Surfaced by the Resilience lens reviewer during `ADE-T-4`.

## 11. Budget (Step 2.4 — the `/akili-execute` tripwire)

| Signal | Expected (approved 2026-09-16) | Corrected (execution, 2026-09-16) |
|---|---|---|
| Tasks | **5** | **5** — unchanged |
| Lines of code | **~300** (≈170 implementation, ≈130 tests) | **~570 code-only** (≈200 implementation, ≈370 tests) |
| Review rounds | **2** | **4** — one per code task; rework, if any, is reported against this |

> **Budget correction — applied during `/akili-execute` with the user's approval, recorded in
> `execution.md` → *Budget Tripwire*.** After `ADE-T-1` and `ADE-T-3`, implementation measured 95
> code-only lines against ~100 estimated — on budget — while tests measured 212 against the ~130
> budgeted for *all four* code tasks. The overrun is test volume only, and it is what `tasks.md`
> §5/§6 mandate: a named falsifying input and a Disqualifier per task, plus a seven-row clause
> coverage table for `ADE-T-4`. The original ≈130 test line never agreed with that task list; the
> correction aligns the budget with the coverage the spec already owns rather than cutting coverage
> to fit a number. The original figures are kept in the first column for traceability.

Matches the declared **Standard** depth — not a candidate to drop to Lite (five tasks, a new integration path, a documented platform defect in the blast radius), not a candidate for Full (no migration, no auth change, no payload change, no rollout sequencing). Exceeding any of these is an escalation to the user, not a reason to continue quietly.

## 12. Pending Shared-File Writes (not applied from this branch)

Current branch `JuanGuzman-io/glaucus` ≠ default `master`, so shared-file edits are recorded, not applied.

| # | Target | Edit | Severity |
|---|---|---|---|
| 1 | `docs/trd/trd.md` §1 / §1A | The deploy target is recorded as *"AWS Lambda + API Gateway (Serverless Framework) — also containerizable"*. The repo has **no `lambda.ts`**; `main.ts:102` starts a listening container and `serverless.yaml` has no handler to point at. The container is the runtime; the TRD reads as though Lambda were primary, which changes latency and timeout reasoning for any future design (it changed this one — DD-2). | Medium |

## 13. Requirement → Design Traceability

| Requirement | Where it is satisfied |
|---|---|
| `ADE-R-1` | §3.1 insertion point, §7.1 |
| `ADE-R-2` | §7.1 selection rule, §9 allowlist constant, DD-5 |
| `ADE-R-3` | §7.2, §7.3, §5 |
| `ADE-R-3.1` | §5 (`is_public_file = 0`), DD-4 |
| `ADE-R-4` | §3.2 checkpoint, §5 `file_management_reference`, DD-6 |
| `ADE-R-5` | §3.1 (after the status write), §6, DD-3 |
| `ADE-R-6` | §5, DD-5 |
| `ADE-R-7` | §5 (ordinary `evidence` row), §8 |
| `ADE-R-8` | §7.1 report, `ADE-QAS-6` |
| `ADE-R-9` | §3.2 per-document isolation, `ADE-QAS-4` |
| `ADE-R-10` | Not implemented (MAY) — the extension parse in §7.1 removes the need |
