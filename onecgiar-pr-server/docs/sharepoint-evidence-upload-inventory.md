# Evidence upload surfaces — SharePoint enforcement inventory

**Ticket:** P2-3219 (backend audit for parent story P2-3218 — "All evidence uploaded in PRMS must be
stored in SharePoint"). **Verified:** 2026-08-31 · branch `performance-refactor`.

This is the maintained list the ticket asked for. Whenever a new evidence/document upload surface is
added anywhere in PRMS (server endpoint or client caller), add a row here in the same pass — this file
is the thing that stops the inventory drifting again.

**Scope note.** "Evidence" here means a file that becomes (or is meant to become) a `evidence` /
`evidence_sharepoint` row attached to a `Result`, retrievable later from the Result's evidence list.
Transient uploads that feed an AI text-extraction pipeline and are never persisted as evidence are
listed separately in §3 for completeness, since the ticket asked for an *exhaustive* inventory of every
upload surface, not just the compliant ones.

---

## 1. Evidence upload surfaces (persisted as `evidence` rows)

| # | Surface | Client caller | Server endpoint | Routes through `SharePointService`? | Persistence |
|---|---|---|---|---|---|
| 1 | Reporting → Result detail → Evidence | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts:290` (`POST_createUploadSession`) | `onecgiar-pr-server/src/api/results/evidences/evidences.controller.ts:42` `POST createUploadSession` → `SharePointService.createUploadSession` (`share-point.service.ts:29`) | **Yes** | `create/:resultId` (`evidences.controller.ts:27`) → `EvidencesService.create` → `saveSPData` (`evidences.service.ts:346`) writes `evidence` + `evidence_sharepoint` |
| 2 | Innovation Development pictures / reference materials | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.ts:228` (`POST_createUploadSessionP25`) | `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.controller.ts:35` `POST evidence_demand/createUploadSession` → `SharePointService.createUploadSession` | **Yes** | `evidence_demand/create/:resultId` (`innovation_dev.controller.ts:45`) → `EvidencesService.createV2` → same `saveSPData` path |
| 3 | Bilateral → Section Evidence | `onecgiar-pr-client/src/app/pages/bilateral/components/section-evidence/section-evidence.component.ts:439` (`POST_createUploadSession`, same client method as #1) | Same `evidences.controller.ts` `createUploadSession` — reused because `EvidencesModule` is imported into `bilateral.module.ts:19,105` (bilateral results are `Result` rows like any other) | **Yes** | Same `EvidencesService.create` / `saveSPData` path as #1 |

All three known surfaces are confirmed compliant: the byte upload itself never touches the PRMS server
— the client PUTs directly to the Microsoft Graph `uploadUrl` returned by `createUploadSession`
(a signed session URL scoped to the app's SharePoint tenant), then the client calls the corresponding
`create[V2]` endpoint with the resulting SharePoint `document_id`/`file_name`/`folder_path`, which
`EvidencesService.saveSPData` persists into `evidence_sharepoint` and mirrors the public `link` from
`SharePointService.addFileAccess`.

No other server endpoint calls `SharePointService.createUploadSession` or persists an
`EvidenceSharepoint` row (`grep -rn "createUploadSession\|EvidenceSharepoint" src` confirms this — the
repository/entity are only referenced from `evidences.service.ts`, `evidences.controller.ts` and
`innovation_dev.controller.ts`).

---

## 2. Persistence model

- `evidence` (`evidences/entities/evidence.entity.ts`) — one row per evidence item; `is_sharepoint`
  flag; `link` holds either an external URL (CGSpace/DOI/public site) or the SharePoint `webUrl` once
  `addFileAccess` succeeds.
- `evidence_sharepoint` (`evidences/entities/evidence-sharepoint.entity.ts`) — 1:1 with `evidence` via
  `evidence_id`; holds `document_id`, `file_name`, `folder_path`, `is_public_file`. This is the only
  place the SharePoint document identity is recorded — lose this row and the file becomes
  unretrievable from the app even if it is still physically sitting in the SharePoint drive.
- `CLOUD_STORAGE_LINK_REGEX` (`shared/constants/cloud-storage-link.constant.ts`) blocks users from
  pasting a raw SharePoint/OneDrive/Google Drive/Dropbox link into the plain-text `link` field on
  `/api/bilateral/*` (mirrors a pre-existing client-side rule) — that is a *different* rule from this
  ticket (it stops a dead, permission-gated link masquerading as public evidence); it does not affect
  the `createUploadSession` flow.

---

## 3. Not evidence — other file/document upload paths found while auditing (documented for completeness)

These surfaced during the broad grep for `upload|multer|FormData|S3|multipart` across both packages.
None of them create an `evidence` row, so they are outside the "every evidence upload must land in
SharePoint" rule as written — but two of them are flagged in §4 because they look designed to *become*
evidence and currently never do.

| Surface | What it is | Storage | Becomes an `evidence` row? |
|---|---|---|---|
| Result Creator → "AI Assistant" document upload | Client-side PDF/DOCX text extraction to prefill a new Result's fields (`onecgiar-pr-client/.../result-ai-assistant/result-ai-assistant.component.ts:95,144`, `POST_uploadFile`/`POST_fileMining`) | External `file-management` microservice (`environment.fileManagerUrl` → `api/file-management/prms/upload-file`, bucket `ai-services-ibd`) — **not `onecgiar-pr-server`, not SharePoint** | No — purely a transient text-mining input; the file is never referenced by any `Result` after the AI suggestion is generated. |
| Bilateral Center AI → job source documents/audio | `onecgiar-pr-server/src/api/bilateral-ai/bilateral-ai.controller.ts:29` `POST center/ai/jobs` (`FileFieldsInterceptor`) → `BilateralAiFileStorageService.uploadFiles` (`bilateral-ai-file-storage.service.ts:66`) | **AWS S3** (`env.BILATERAL_AI_BUCKET_NAME`), served back via `s3.getSignedUrl` (`getSignedUrl`, `bilateral-ai.controller.ts:54`) | See §4 — this one is genuinely ambiguous and flagged below. |
| Reporting metadata export | System-generated Excel/PDF export files | S3 (`reporting-full-metadata-export.service.ts:707` `_uploadToS3AndSign`) | No — generated report downloads, not user-supplied evidence. |
| Platform report PDF export | System-generated PDF | S3 (`platform-report.service.ts`) | No — same as above. |
| Elasticsearch bulk index | Search index payloads | Elasticsearch | No — not a file. |

---

## 4. Flagged gaps — need a product/architecture decision, not guessed at here

### 4.1 Bilateral AI "formal evidence" documents never reach SharePoint or the `evidence` table

**Where:** `onecgiar-pr-server/src/api/bilateral-ai/`

- Source documents/audio for an AI-drafted bilateral result are uploaded to S3
  (`bilateral-ai-file-storage.service.ts:66`) and tracked in `bilateral_ai_draft_evidence`
  (`entities/draft-evidence.entity.ts`).
- A user can flag one as `is_formal_evidence = true`
  (`PATCH center/ai/drafts/:draftId/evidence/:evidenceId` → `BilateralAiService.setFormalEvidence`,
  `services/bilateral-ai.service.ts:227`) — this is presented to the user as "this document is real
  evidence for the result," and `promoteDraft` (`bilateral-ai.service.ts:248`, the handler behind the
  client's "Create Result" action — renamed from "Promote" in commit `7ff462586`) even validates that
  only `DOCUMENT`-type sources can be marked formal.
- **But `promoteDraft` never creates any `Evidence`/`EvidenceSharepoint` row, and never moves the S3
  object into SharePoint.** It only calls `bilateralService.populateResultFromExtractedMds`,
  `populateInitiativeAndTocFromProgramCode`, `populateTypeSpecificFromExtractedMds`, flips
  `Result.status_id`, and marks the draft discarded (`bilateral-ai.service.ts:269-295`). The
  `formalEvidence` array computed on line 254 is read only for its validation check
  (`item.source_type !== DOCUMENT`) — it is never written anywhere afterward.
- `DraftEvidence.file_management_reference` (`draft-evidence.entity.ts:48`, migration
  `1784921546787-CreateBilateralAiTables.ts:65`) looks purpose-built to eventually hold the SharePoint
  reference — every write site sets it to `null` (`bilateral-ai.service.ts:438,451,464`) and nothing in
  the codebase ever assigns it a value.

**Net effect:** a user can go through the full "upload source docs → mark one as formal evidence →
Create Result" flow, and the promoted `Result`'s evidence list (`GET evidences/get/:resultId`) will show
**nothing** — the flagged document stays a private S3 object the app has no other way to surface. This
is exactly the failure mode P2-3218 is meant to close, in a surface the ticket's three known upload
points don't cover.

**Why this is not a "low-risk fix" I made myself:** closing it needs an S3 → SharePoint migration
(download the S3 object, run it through `SharePointService.createFileFolder` +
`createUploadSession`-equivalent byte upload + `addFileAccess`, then create the `Evidence` +
`EvidenceSharepoint` rows) wired into `promoteDraft`, plus a decision on what happens to non-formal
source documents (discarded? kept in S3 as drafting history?) and on error handling if the migration
step fails mid-`promoteDraft` (should promotion roll back, or complete with a warning?). That is a
product/architecture call, not a bug fix — **flagging for Juan Carlos Cadavid / product, not resolving
here.**

### 4.2 No transaction between "evidence row committed" and "SharePoint permission granted"

**Where:** `onecgiar-pr-server/src/api/results/evidences/evidences.service.ts`
`_upsertEvidenceItemV1` (line 168) and `_createNewEvidence` (line 695).

Both call sites persist the `Evidence` row (`_evidencesRepository.save(...)`) **before** calling
`saveSPData`, which is the method that actually talks to SharePoint (`addFileAccess`) and writes the
`EvidenceSharepoint` row. If `saveSPData` throws for any reason — a genuine SharePoint outage, an
expired app token, the TypeError this ticket fixed in §5 — the `Evidence` row is already committed with
`is_sharepoint = 1` and **no matching `EvidenceSharepoint` row**, while the client sees a failed
request and (reasonably) retries or gives up. There is no rollback and no reconciliation job.

This is architecturally the same class of problem as §4.1 (an "evidence" the user thinks was saved with
no retrievable file behind it) but at the single-evidence-item level instead of the whole-draft level.
Fixing it properly means wrapping evidence creation + SharePoint linking in one DB transaction (or
adding a reconciliation/cleanup job for `is_sharepoint=1` rows with no `EvidenceSharepoint` match) —
also a design decision (transaction scope touches `EvidencesRepository`/`EvidenceSharepointRepository`
call sites shared with `updateEvidencesPartial`), not something to guess at under "low risk."
**Flagging, not fixing.**

### 4.3 `replicateSPFiles` silently drops the link on `addFileAccess` failure during phase replication

**Where:** `evidences.service.ts:429` `replicateSPFiles`, called from
`versioning.service.ts:369` inside the phase-change transaction.

`accessData?.link?.webUrl` is optional-chained, so if `SharePointService.addFileAccess` fails (it
resolves with the raw `Error` object instead of rejecting — see §5), `accessData?.link` is `undefined`
and the subsequent `_evidencesRepository.update(sharePointIterator, { link: undefined })` is effectively
a no-op (TypeORM `update()` drops `undefined` fields). The replicated evidence row keeps whatever link
it had before, with **no error, no log line, and no visible failure** — the phase-change request
completes "successfully" even though a document replication silently didn't happen.

I did **not** change `SharePointService.addFileAccess`'s error-swallowing behavior to fix this, because
that method is shared with `replicateSPFiles`'s call site above, which runs inside `versioning.service.ts`'s
phase-change transaction — making `addFileAccess` throw would make a transient SharePoint permission
hiccup roll back an entire phase change, which is a reliability trade-off product/eng should decide on
explicitly, not something to flip as a side effect of an evidence-upload audit. **Flagging, not fixing.**

---

## 5. Fixed in this pass

### `saveSPData` crashed with an opaque `TypeError` instead of a diagnosable error when `addFileAccess` failed

**File:** `onecgiar-pr-server/src/api/results/evidences/evidences.service.ts` (`saveSPData`, inside
`createOrUpdateEvidenceSharepoint`).

**Root cause:** `SharePointService.addFileAccess` (`share-point.service.ts:86`) catches its own HTTP
errors and `return`s the `Error` object instead of throwing (`catch (error) { console.log(error); return
error; }` — unlike its sibling `createUploadSession`, which correctly rethrows). `saveSPData` then did:

```ts
const data: any = await this._sharePointService.addFileAccess(...);
if (data.link.webUrl) { ... }
```

When `addFileAccess` failed, `data` was that `Error` instance (no `.link` property), so `data.link.webUrl`
threw `TypeError: Cannot read properties of undefined (reading 'webUrl')`. The request still failed
end-to-end (the outer `create()`/`createV2()` try/catch reports an error to the client), but:

- the real SharePoint failure reason was hidden behind an unrelated TypeError message, and
- the `evidence_sharepoint` row (`document_id`, `file_name`, `folder_path`) was silently never written
  — nothing logged which document/evidence this happened for.

**Fix:** guard the response shape (`data?.link?.webUrl`) and throw a clear, named error
(`SharePoint addFileAccess failed for document <id>: <reason>`) when it's missing, instead of letting
the TypeError happen implicitly. This does not change the request's outward behavior (it already failed
before and still fails now) — it only makes the failure diagnosable, and stops after the guard instead
of reaching an unrelated crash line. It does **not** solve §4.2 (the `Evidence` row is still committed
before this runs) — that needs the transaction/reconciliation decision flagged above.

**Tests added:** `evidences.service.spec.ts` → `saveSPData` describe block — one test for the success
path (verifies `evidence.link` and `evidence_sharepoint` are written), one for the failure path
(verifies the clear error message and that neither repository write happens). Verified with:

```
npx jest --testPathPattern="evidences" --silent --reporters=summary --forceExit   # 15/15 passed
npx eslint "src/api/results/evidences/evidences.service.ts" "src/api/results/evidences/evidences.service.spec.ts" --quiet   # clean
npx tsc --noEmit -p .   # clean
```

Deliberately **not** touched: `SharePointService.addFileAccess` itself (would also change
`replicateSPFiles`'s behavior inside the versioning transaction — see §4.3), and the
`Evidence`-row-before-`EvidenceSharepoint`-row ordering (see §4.2).
