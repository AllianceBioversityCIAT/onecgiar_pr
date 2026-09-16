# Requirements — AI draft evidence promotion

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` (server: `api/bilateral-ai`) |
| Sub-feature | `ai-draft-evidence-promotion` |
| Requirement prefix | `ADE` (`APF`, `BADR`, `BIL` already in use by sibling bilateral specs) |
| Owner | Juan David Delgado |
| Status | **draft — awaiting approval** |
| Depth | **Standard** — server-only, no migration, no auth change, no payload-contract change; but it introduces a new integration behavior (server-originated SharePoint upload) and writes to a core table (`evidence`). |
| Type | Change |
| Approval Mode | **gated** (inherited from `proposal.md`) |
| Date | 2026-09-16 |
| Ticket(s) | [P2-3700](https://cgiarmel.atlassian.net/browse/P2-3700) (epic [P2-2338](https://cgiarmel.atlassian.net/browse/P2-2338)) |
| Proposal | `proposal.md` — approved |
| Model | T1 Architect (`opus`) per `.agents/model-routing.md` |

## 1. Executive Summary

When a bilateral user promotes an AI draft to a real result, the office documents they gave the AI **SHALL** already be attached to that result's Evidence section, with a working SharePoint link and no user action. Audio, plain text and free-text context **SHALL NOT** be attached. If the transfer fails, the promotion still succeeds — a result stranded between Draft and Editing is worse than a missing evidence row the user can add by hand.

This closes the last unbuilt step of the approved AI workflow design (`archive/2026-07-31-bilateral-ai-workflow/bilateral-spec.md:181-185`).

## 2. Glossary

| Term | Meaning here |
|---|---|
| **AI job** | One upload batch (`bilateral_ai_jobs`): up to 6 sources — documents, audio, free text — screened together. Holds only S3 coordinates. |
| **Draft** | One AI-proposed candidate result (`bilateral_ai_drafts`). **One job yields N drafts**, each bound to its own `result` row in `Draft` status. |
| **Draft evidence** | A row in `bilateral_ai_draft_evidence` — one per source *per draft*. Typed `DOCUMENT`, `VOICE_NOTE` or `TEXT_CONTEXT`. |
| **Promotion** | `POST /api/bilateral-ai/drafts/:draftId/promote` — the draft's result flips to `Editing` and becomes a normal PRMS result. |
| **Formal evidence** | Evidence as PRMS means it: a row in the `evidence` table bound to a `result_id`, shown in the result's Evidence section. |
| **Qualifying document** | A source whose file extension is in the office allowlist (see `ADE-R-2`). The determinant of what gets attached. |
| **File management** | SharePoint via Microsoft Graph, reached through `shared/services/share-point`. The only store PRMS evidence links resolve against. |

## 3. Context

**Gap.** Result 9349 was created by AI screening a report; its Evidence section reads *"No evidence added"*. The user must locate and re-upload the file they just handed the AI. This is not a design gap — the origin spec specified *"Backend copies marked DraftEvidence to ResultsByEvidences"* and that step was never implemented. Three independent defects sustain it (`proposal.md` §Problem, gaps G1–G3): nothing can be marked formal, the promote reads the marks only to validate, and the file never leaves S3.

**Flows touched.** `docs/ux-ui/design.md` §3 *Primary User Flows* — the submitter's `… → Evidence → DAC scores` sequence; §12 — the Evidence block is a **shared section**, so the attached row renders through the existing component with no visual change.

**Entities / surfaces touched.** `docs/trd/trd.md` §3 (`evidence`, `evidence_sharepoint`, `bilateral_ai_draft_evidence`), §7 *Integration Points* (S3 and SharePoint), **W8** *AI helpers* (auth-gated, audit-logged), W1 *Result lifecycle*, W7 *Soft delete*.

**PRD linkage.** `docs/prd.md` — **AC-6** (submit requires at least one evidence row where the type requires it) is what AI-created results cannot satisfy today without manual work; **G2 / M2.2** (% of submitted results carrying a valid evidence link) is the metric this moves; **US-S1** is the story; **AC-7** (soft delete) and **AC-9** (no secrets in logs) constrain it; **OQ-5** (whether AI-assisted authoring earns product-level metrics) stays open and is not resolved here.

## 4. In Scope / Out of Scope

### In scope

- Attaching qualifying documents of an AI job to the promoted result as formal evidence, automatically.
- A server-side SharePoint upload path (S3 → Graph), which does not exist today.
- An office-format allowlist that decides what qualifies.
- Defaulting `is_formal_evidence` for qualifying documents at draft creation.
- Idempotency and fail-soft behavior for the transfer.

### Out of scope

- **Backfill** of results already created through AI screening with an empty Evidence section (9349 and any others). Decided 2026-09-16.
- **Any client work.** No toggle in `draft-evidence-list`, no change to the Evidence section component; `PATCH_bilateralAiEvidence` stays uncalled.
- Changes to the AI upload screen, its accepted extensions, size limits or source count.
- Changes to the bilateral payload contract (`/api/bilateral/*`) — ADR-004 untouched.
- New async infrastructure (queue, worker, job state machine) — see `design.md` escalation path.

## 5. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result submitter** (bilateral / center staff) | Stops re-uploading a file they already provided. The Evidence section is pre-populated on first open. Primary beneficiary. |
| **QA reviewer** | AI-created results arrive with their source document attached — the gap that made the data curator the de-facto QA gate in the origin spec. |
| **PMU lead** | Indirect: **M2.2** (evidence completeness) improves for the AI-created cohort. |
| Platform admin | No change. |
| Bilateral consumer (downstream) | **No change** — no payload field added or altered. |

## 6. User Stories

- **`ADE-US-1`** — As a **result submitter**, I want the document I gave the AI to already be in my result's Evidence section, so that I do not re-upload a file the system already has. *(Refines `US-S1`.)*
- **`ADE-US-2`** — As a **QA reviewer**, I want AI-created results to arrive with their source document attached, so that I can judge the claim against its evidence without chasing the submitter. *(Refines `US-Q1`.)*

## 7. Functional Requirements

### Required (MUST)

- **`ADE-R-1`** When a draft is promoted, the system MUST attach every **qualifying document** of that draft as formal evidence on the promoted result, with no user action.
- **`ADE-R-2`** The system MUST decide what qualifies by an **allowlist of office file extensions**: `pdf`, `docx`, `xls`, `xlsx`, `pptx`. Any extension outside the allowlist MUST NOT be attached — including `txt`, which the AI uploader accepts as a document source.
- **`ADE-R-3`** Attached evidence MUST be resolvable by the user: stored in file management and represented as a SharePoint-backed evidence row, indistinguishable in the Evidence section from one the user uploaded by hand.
- **`ADE-R-3.1`** Attached evidence MUST carry an **explicit** answer to the public/confidential question, and that answer MUST be **not public**. A `null` answer is not an option: the server refuses to store a SharePoint-backed evidence whose `is_public_file` is unanswered once a document exists (`evidences.service.ts:447-458`), because no sharing link can be minted without it. The user MUST be able to change the answer afterwards from the Evidence section, which re-issues the link (`evidences.service.ts:480`).
- **`ADE-R-4`** Attaching MUST be **idempotent per source document**: a repeated promotion, retry or redelivery MUST NOT produce a second evidence row for a document already attached.
- **`ADE-R-5`** A failure to transfer a document MUST NOT fail the promotion. The result MUST still reach `Editing` and the promotion MUST still report success.
- **`ADE-R-6`** At draft creation, `is_formal_evidence` MUST default to **true** for qualifying documents, and remain **false** for every other source.
- **`ADE-R-7`** Evidence attached automatically MUST behave as ordinary evidence afterwards: the user MUST be able to add more, and to remove it through the normal soft delete (`AC-7`). The automatic attachment MUST NOT lock, pin or otherwise special-case the row.

### Should (SHOULD)

- **`ADE-R-8`** The system SHOULD record the outcome of each document transfer — success and failure alike — so an operator can tell why a result has fewer evidence rows than its job had documents, without any secret, token or signed URL appearing in the log (`AC-9`, `QAS-10`).
- **`ADE-R-9`** When several documents are transferred and some fail, the system SHOULD commit each success independently rather than discarding the batch, so that a retry moves only what is still missing.

### Could (MAY)

- **`ADE-R-10`** The system MAY persist the source file's real MIME type on the draft-evidence row (today always `null`), which would allow a future content-type check to complement the extension allowlist.

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Promotion is synchronous. `POST /drafts/:draftId/promote` p95 MUST be measured against **`QAS-3`** (p95 ≤ 2 s for a section save) with a representative document. Exceeding it is an escalation to async, not a silent accept. Ceiling per file is 25 MB (`bilateral-ai-file-storage.service.ts:19`). |
| **Availability** | Fail-soft per `ADE-R-5`: a SharePoint or S3 outage degrades to "no evidence attached", never to a failed promotion or a result stranded between `Draft` and `Editing`. Mirrors the `QAS-6` posture for external-dependency outages. |
| **Security** | The promote route stays JWT-gated and user-scoped exactly as today (`AC-3`, `W8`). No signed S3 URL, Graph token or sharing URL may be logged (`AC-9`). |
| **Privacy** | An AI-screened source document MUST NOT be automatically public. Attached evidence is created **not public**, with the answer explicitly set (`ADE-R-3.1`); the user publishes it later if they choose (`ADE-AC-7`). |
| **Backwards compatibility** | No change to `/api/bilateral/*` or `/api/platform-report/*` payloads (`AC-4`, ADR-004). No migration — `npm run migration:check` MUST stay clean. |
| **Observability** | Per `ADE-R-8`. |
| **Accessibility / i18n** | Not applicable — no UI in scope. |
| **Cost** | No new always-on compute (`QAS-12`, ADR-001). The synchronous choice exists partly to avoid buying a worker. |

## 9. Acceptance Criteria

Each row is coverable by at least one test assigned in `tasks.md`.

### `ADE-AC-1` — A qualifying document becomes evidence

- **GIVEN** an AI job whose sources include `report.pdf`, and a draft created from that job
- **WHEN** the user promotes that draft
- **THEN** the promoted result has exactly one active `evidence` row for `report.pdf`
- **AND** that row is SharePoint-backed and carries a resolvable link
- **AND IT MUST** be bound to the `result_id` of the promoted draft, not to any sibling draft's result
- **AND IT MUST** be stored as **not public**, with the public/confidential answer explicitly set rather than left `null`

### `ADE-AC-7` — The user can publish it afterwards

- **GIVEN** a result carrying an automatically attached, not-public evidence row
- **WHEN** the user answers *"Can this evidence be shared publicly?"* as **yes** in the Evidence section and saves
- **THEN** the sharing link is re-issued for the new scope and the stored link reflects it
- **AND IT MUST** follow the same code path a manually uploaded evidence follows when its answer changes — no bilateral-AI-specific branch

### `ADE-AC-2` — Non-qualifying sources are never attached

- **GIVEN** an AI job carrying `notes.txt`, `voice-note.m4a` and free text alongside `report.pdf`
- **WHEN** the user promotes a draft from that job
- **THEN** only `report.pdf` produces an evidence row
- **BUT** it must NOT produce any evidence row for `notes.txt`, for the voice note, or for the free-text context
- **AND IT MUST** exclude `notes.txt` on the extension allowlist, not merely on `source_type` — `txt` is registered as a `DOCUMENT` source today

### `ADE-AC-3` — Promotion survives a transfer failure

- **GIVEN** a draft with one qualifying document, and file management unavailable
- **WHEN** the user promotes the draft
- **THEN** the result still reaches `status_id = Editing (1)` and the promote responds success
- **AND** the failure is recorded for an operator
- **BUT** it must NOT surface any secret, token or signed URL in that record
- **AND IT MUST NOT** leave the result in `Draft`, nor leave a half-written evidence row pointing at nothing

### `ADE-AC-4` — Re-promotion does not duplicate

- **GIVEN** a draft whose document was already transferred and attached
- **WHEN** the promotion runs again (retry, redelivery, double click)
- **THEN** the evidence row count for that result is unchanged
- **AND IT MUST** decide this from stored state, not from an in-memory guard that a second process would not see

### `ADE-AC-5` — Partial failure commits what succeeded

- **GIVEN** a draft with three qualifying documents where the second transfer fails
- **WHEN** the promotion runs
- **THEN** documents one and three are attached and the second is not
- **AND** a subsequent promotion attaches only the second
- **AND IT MUST NOT** re-attach or duplicate documents one and three

### `ADE-AC-6` — The attached row behaves like any other evidence

- **GIVEN** a result carrying an automatically attached evidence row
- **WHEN** the user deletes it from the Evidence section
- **THEN** it is soft-deleted exactly as a manually added evidence row (`AC-7`)
- **AND** the user can add further evidence normally

Cross-cutting project ACs that already apply (referenced, not restated): `AC-3` authorization · `AC-4` payload stability · `AC-6` evidence at submit · `AC-7` soft delete · `AC-9` secrets.

## 10. Defect Classes And Their Gates

The classes of defect **this spec can actually produce**, and what catches each. A gate blind to the dominant class is not a gate.

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| **DC-1** | Wrong filtering — a `.txt` or audio becomes evidence, or a `.pdf` does not | Jest cases on the allowlist, one per excluded and included type (`ADE-AC-1`, `ADE-AC-2`) | ✅ |
| **DC-2** | Duplicate rows on retry | Jest idempotency case (`ADE-AC-4`, `ADE-AC-5`) | ✅ |
| **DC-3** | Promotion breaks on transfer failure — result stranded, or a 500 | Jest with a failing file-management stub asserting the status flip and the success response (`ADE-AC-3`) | ✅ |
| **DC-4** | Evidence bound to the wrong result (sibling draft of the same job) | Jest multi-draft case (`ADE-AC-1` final clause) | ✅ |
| **DC-5** | **Broken or unreachable link** — the row exists, the link 404s or the user lacks permission | ❌ **No automated gate.** Jest mocks SharePoint, so a green suite proves the row's *shape*, never that the URL resolves. **Substitute: a mandatory manual check at the HITL pause** — promote a real draft on prtest and open the link as a user who is not the uploader | ❌ → manual |
| **DC-6** | **The document ends up publicly reachable** although it was attached as not public | ⚠️ Jest can assert the *stored* answer is `false` (`ADE-AC-1`), which catches a wrong default — but **not** whether the minted link is actually private, because `addFileAccess` has a *documented* revocation defect (measured prtest 2026-09-09, result 9075 / evidence 13081: an anonymous and an organization link coexist on the item). A green assertion would certify a value the platform does not honor. **Substitute: manual verification on prtest — open the link in an incognito session and confirm it does not serve the file** | ⚠️ partial → manual |
| **DC-7** | **Latency regression** on promote | ❌ Not visible to unit tests. **Substitute: a measured check with a disqualifier** — see `tasks.md`; a single timing run is not evidence | ❌ → measured |
| **DC-8** | Secret leakage in the new log statements | `grep` gate over the added logging plus review against `.cursorrules` | ⚠️ partial |
| **DC-9** | Coverage / regression elsewhere in the module | `npx jest --testPathPattern="bilateral-ai"` and `npx eslint` | ✅ |

**Accepted risk:** DC-5 and DC-6 have no automated gate and are discharged by human verification at an approval pause. This is recorded deliberately — an acknowledged blind spot is recoverable; an unacknowledged one consumes rework rounds (KZ-EVL-1).

## 11. Dependencies & Assumptions

### Upstream dependencies

- `shared/services/share-point` (Microsoft Graph) — must gain a server-originated upload path; today it only mints an upload-session URL for the browser.
- `api/results/evidences` — `evidence` / `evidence_sharepoint` persistence, reused rather than reimplemented.
- AWS S3 (`BILATERAL_AI_BUCKET_NAME`) — the server already signs `getObject`; it must now read object bodies.
- Global parameters `sp_drive_id`, `sp_microsoft_graph_api_url` must resolve in the target environment.

### Downstream consumers

- None. No API contract, payload or client surface changes.

### Assumptions

- **A-1** The S3 key preserves the original filename and extension (`{prefix}/{jobId}/{uuid}-{safeName}`), so the extension is recoverable without a `HeadObject` call. *Verified in code.*
- **A-2** `result_code` is populated before promotion — the `result_code: 0` in the insert is overwritten by the `result_auto_code` BEFORE INSERT trigger — so the result-scoped SharePoint folder resolves. *Verified in migration `1769300000000`.*
- **A-3** The 25 MB per-file ceiling holds, so a single upload-session `PUT` is plausible; chunking is a design fallback, not an assumption.
- **A-4** Only the promote path creates these rows; no other caller writes `bilateral_ai_draft_evidence` → `evidence`.

## 12. Open Questions

Both questions are resolved; `tasks.md` is unblocked.

- **`ADE-OQ-1`** ~~Sharing scope: `organization` or `anonymous`?~~ **RESOLVED 2026-09-16** (Juan David, after checking the current upload rules). Attached evidence is created **not public**; the user changes it from the Evidence section afterwards. See `ADE-R-3.1` and `ADE-AC-7`.
  - *Why not "leave it open and let the user decide":* that state does not exist. The manual flow gates the file drop zone on the answer (`section-evidence.component.html:187`) and the server refuses to store a SharePoint evidence with an unanswered `is_public_file` (`evidences.service.ts:447-458`). An unanswered attachment would be saved without a link and the section would never complete.
  - *Why "not public" and not "public":* reversibility, not preference. `false → true` re-issues the link and works (`evidences.service.ts:480`). `true → false` is the direction the platform demonstrably cannot honor — the revocation defect measured on prtest 2026-09-09 (result 9075 / evidence 13081) leaves the anonymous link serving the file. Starting public would be the one choice the code cannot undo.
- **`ADE-OQ-2`** ~~Silence on a `.txt`-only job.~~ **RESOLVED 2026-09-16** — accepted for v1. A user whose only source is `notes.txt` gets an empty Evidence section and no explanation. The resolution follows from a scope boundary already agreed, not a new decision: the explanation would be copy on the AI upload screen, which is client work, and §4 puts all client work out of scope. If it proves confusing in use, it is a `/akili-quick` copy change against its own ticket.

## 13. Out-of-Band Notes

- `bilateral-ai` has **no module file of its own** — it is wired into `api/bilateral/bilateral.module.ts`. `EvidencesModule` is already imported there and exports `EvidencesRepository` and `EvidencesService`, but **not** `SharePointService`. Dependency wiring is a `design.md` concern; flagged here so it is not discovered during execution.
- `KZ-EVL-1` (`kaizen/bugfix--evidence-storage-link-validation.md`) shaped §10: a fully-green fix on a path the real scenario never travels ships nothing. `design.md` must restate the live dispatch chain from controller to `status_id` write.

## 14. Requirement ID Index

| ID | Strength | Summary | ACs | Defect classes |
|---|---|---|---|---|
| `ADE-R-1` | MUST | Qualifying documents attach on promotion | `ADE-AC-1` | DC-4, DC-5 |
| `ADE-R-2` | MUST | Office extension allowlist decides; `txt` excluded | `ADE-AC-2` | DC-1 |
| `ADE-R-3` | MUST | Evidence is resolvable and SharePoint-backed | `ADE-AC-1` | DC-5 |
| `ADE-R-3.1` | MUST | Created **not public**, answer explicitly set, user can publish later | `ADE-AC-1`, `ADE-AC-7` | DC-6 |
| `ADE-R-4` | MUST | Idempotent per source document | `ADE-AC-4` | DC-2 |
| `ADE-R-5` | MUST | Transfer failure never fails the promotion | `ADE-AC-3` | DC-3 |
| `ADE-R-6` | MUST | `is_formal_evidence` defaults true for qualifying docs | `ADE-AC-1`, `ADE-AC-2` | DC-1 |
| `ADE-R-7` | MUST | Attached evidence behaves as ordinary evidence | `ADE-AC-6`, `ADE-AC-7` | — |
| `ADE-R-8` | SHOULD | Transfer outcome logged, no secrets | `ADE-AC-3` | DC-8 |
| `ADE-R-9` | SHOULD | Partial failure commits successes independently | `ADE-AC-5` | DC-2 |
| `ADE-R-10` | MAY | Persist real MIME type on draft evidence | — | — |

## Required cross-references

- `docs/prd.md` — G2/M2.2, US-S1, US-Q1, AC-3, AC-4, AC-6, AC-7, AC-9, OQ-5.
- `docs/ux-ui/design.md` — §3 primary submitter flow, §12 shared Evidence section.
- `docs/trd/trd.md` — §3 data model, §7 integration points (S3/SharePoint), W1, W7, W8, QAS-3, QAS-6, QAS-10, QAS-12, ADR-001, ADR-004.
- `docs/specs/archive/2026-07-31-bilateral-ai-workflow/bilateral-spec.md:181-185` — the origin design this completes.
- `docs/specs/kaizen/bugfix--evidence-storage-link-validation.md` — KZ-EVL-1.
