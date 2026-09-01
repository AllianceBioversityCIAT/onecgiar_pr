# P2-3218 parent-story acceptance audit — "All evidence uploaded in PRMS must be stored in SharePoint"

**Scope:** read-only audit against `performance-refactor` @ `86dfc2cc5` (branch `audit/p2-3218-sharepoint-evidence`).
Builds on the closed P2-3219 backend inventory (`onecgiar-pr-server/docs/sharepoint-evidence-upload-inventory.md`,
198 lines, "Verified: 2026-08-31") — that document is treated as baseline and re-verified line by line below,
not repeated. No application code was changed for this audit.

**Since that baseline was written**, commit `e014ee987` (P2-3220, Aug 27, already on this branch) fixed the
silent-failure behavior for two of the three known client upload surfaces. This audit re-verifies what that
commit closed, and finds one of the three surfaces still open.

---

## 1. Verdict per acceptance criterion

### AC1 — 100% of evidence upload points route through `SharePointService.createUploadSession`

**Verdict: Met for the 3 "evidence" surfaces; not met for one surface the ticket's own inventory already
scoped as ambiguous ("formal evidence" in bilateral-ai).**

Exhaustive re-grep confirms the P2-3219 inventory's claim still holds — exactly two server call sites and
three client call sites exist, no more, no fewer:

- Server: `onecgiar-pr-server/src/api/results/evidences/evidences.controller.ts:42-48` and
  `onecgiar-pr-server/src/api/results-framework-reporting/innovation_dev/innovation_dev.controller.ts:35-41`
  are the only two controllers calling `SharePointService.createUploadSession`
  (`onecgiar-pr-server/src/shared/services/share-point/share-point.service.ts:29`).
- Client: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts:290`,
  `.../rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.ts:268`, and
  `onecgiar-pr-client/src/app/pages/bilateral/components/section-evidence/section-evidence.component.ts:439`
  are the only three callers of `POST_createUploadSession`/`POST_createUploadSessionP25`
  (`onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:385,623`).
- Repo-wide interceptor grep (`FileInterceptor|FilesInterceptor|FileFieldsInterceptor|@UploadedFile`) confirms
  only 3 server controllers accept file bytes at all: `evidences.controller.ts`, `innovation_dev.controller.ts`
  (both SharePoint-routed), and `bilateral-ai.controller.ts` (S3-routed, see below).

**Gap (pre-existing, re-confirmed current):** `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:248-298`
`promoteDraft` computes `formalEvidence` at line 254 (documents the user explicitly flagged as
"real evidence for the result" via `setFormalEvidence`, line 227) but never calls `EvidencesService`,
`SharePointService`, or writes an `Evidence`/`EvidenceSharepoint` row with it — confirmed by reading the
full method body: it only calls `populateResultFromExtractedMds`, `populateInitiativeAndTocFromProgramCode`,
`populateTypeSpecificFromExtractedMds`, flips `status_id`, and discards the draft. `DraftEvidence.file_management_reference`
(`onecgiar-pr-server/src/api/bilateral-ai/entities/draft-evidence.entity.ts:48`) is set to `null` at every
write site (`bilateral-ai.service.ts:438,451,464`) and never assigned. This is the same gap the P2-3219
document flagged in its §4.1 and explicitly declined to fix, correctly, since it's a product decision
(S3→SharePoint migration + rollback semantics), not a bug fix.

### AC2 — Every stored evidence exposes `link` + `is_sharepoint` and opens from the UI

**Verdict: Met, for all three surfaces.**

- Server read path selects both columns explicitly:
  `onecgiar-pr-server/src/api/results/evidences/evidences.repository.ts:409-410` (`e.link, e.is_sharepoint`
  inside `getEvidencesByResultId`, used by both `findAll` — surfaces #1 — and `findAllV2` — surface #2).
  `evidences.service.ts:502` / `:574` coerce `is_sharepoint` to a clean `0`/`1` before the response goes out.
- Client rendering confirmed working `<a>` links gated on the field being populated, for all three surfaces:
  - Surface #1: `rd-evidences.component.html:62-63` — `*ngIf="evidence.link"` → `[href]="evidence.link"`.
  - Surface #2: `.../innovation-dev-info/components/user-evidence/user-evidence.component.html:56` —
    `*ngIf="this.evidence.link"` → `[href]="this.evidence.link"`.
  - Surface #3 (bilateral): `section-evidence.component.html:50-51` — `@if (item.link) { <a [href]="item.link" ...> }`.
- The new bilateral review drawer (`result-review-drawer.component.ts`, under `dashboard-lab`'s sibling
  `bilateral-results` tree) round-trips `is_sharepoint` too:
  `normalizeDataStandardForComparison` (line 284-289) reads `ev?.is_sharepoint`, and the save payload
  builder (line 784-788) writes it back unchanged. This is a metadata pass-through for the admin correction
  flow described in AC1's discussion below, not a rendering path — no `<a>` binding was needed there because
  the drawer is otherwise read-only.

### AC3 — Upload failures surface a clear error to the user; no silent evidence rows without a file

**Verdict: Partially met. Two of the three known surfaces were fixed by P2-3220 (commit `e014ee987`,
already on this branch) and are now compliant. The third (Innovation Development evidence, surface #2)
is still silent. See §3 for the ranked defect list.**

Traced both failure points for each surface — (a) the client-side byte `PUT` to the Microsoft Graph
`uploadUrl`, and (b) the server-side `addFileAccess` permission call inside `saveSPData` (the P2-3219 §5
fix already makes this throw a diagnosable error instead of an opaque `TypeError`) — plus whether that
error reaches the user:

| Surface | (a) byte-PUT failure surfaced? | (b) server `saveSPData` failure surfaced? |
|---|---|---|
| #1 rd-evidences | **Yes** — `rd-evidences.component.ts:279-317` `loadAllFiles()` collects failed file names and `onSaveSection` (`:319-345`) raises `alertsFe.show(...)` naming them (P2-3220). | **Yes** — `POST_evidences` uses `isSavingPipe()` (`results-api.service.ts:367`), whose `catchError` shows "There was an error saving the section" (`save-button.service.ts:137-148`) and the interceptor (`Return-data.interceptor.ts:46`) sets a real non-2xx HTTP status when `create()` catches the thrown error, so the toast fires. |
| #3 section-evidence (bilateral) | **Yes** — `uploadPendingFiles()` (`section-evidence.component.ts:419-452`) increments `failed` and `saveSection`'s `next` handler (`:400-406`) sets `saveStatus('error')`, rendered as a persistent "Save failed" bar (`section-evidence.component.html:239-256`, no auto-dismiss on error — only the success state auto-clears, `:404`). | **Yes** — same mechanism; `saveStatus('error')` also fires from the subscribe's `error:` branch (`:407-411`). |
| #2 innovation-dev-info (P25 "Evidence of user need") | **No** — `uploadPendingFiles()` (`innovation-dev-info.component.ts:252-305`) rethrows (`:301`, confirmed correct per the P2-3220 commit message: "innovation-dev-info already rethrew and is untouched"), but `onSaveSection`'s catch (`:215-219`) only does `console.error(...)` and `return`s — no toast, no alert, the whole section save (not just the file) is silently abandoned. | **No** — `POST_createEvidenceDemandP25` (`results-api.service.ts:627-635`) ends in a bare `.pipe()`, unlike every sibling call in the same file that appends `.pipe(this.saveButtonSE.isSavingPipe())` — so even a genuine server error (500, wrong SharePoint data, `saveSPData` throwing) reaches `onSaveSection`'s `error:` callback (`:236-239`) which again only `console.error`s. |

**Data-integrity gap, orthogonal to the visibility question (still open, all 3 surfaces):**
`onecgiar-pr-server/src/api/results/evidences/evidences.service.ts` `_upsertEvidenceItemV1` (line 168-203)
and `_createNewEvidence` (line 695-751) both `save()` the `Evidence` row *before* calling `saveSPData`
(line 203, 751), and no transaction/`queryRunner` wraps the two calls (confirmed by grep — zero matches for
`transaction|queryRunner` in this file). If `saveSPData` throws (now a clean error, not a `TypeError`), the
`Evidence` row is already committed — with `is_sharepoint=1` and no matching `EvidenceSharepoint` row — and
there is no rollback. **This is now correctly surfaced to the user as a failed save** (per the table above),
so it is not the "user sees nothing" failure mode the ticket is chasing, but the orphaned row itself is a
real, unaddressed inconsistency: a retry after the toast does not clean up the first attempt's leftover row.

**Also still open, unrelated to the client-facing flows above:**
`replicateSPFiles` (`evidences.service.ts:429-458`), invoked during phase replication
(`onecgiar-pr-server/src/api/versioning/versioning.service.ts` inside the phase-change transaction), builds
`link: accessData?.link?.webUrl` (`:454-456`). `SharePointService.addFileAccess`
(`share-point.service.ts:106-109`) still `catch`es its own HTTP error and `return`s the raw `Error` object
instead of rejecting, so on failure `accessData?.link` is `undefined`, `link: undefined` is a TypeORM
`update()` no-op, and the phase-change request completes with **no error, no log line** — a document
replication silently doesn't happen during a phase change. This is a genuinely different code path (no
Angular component is involved; nothing calls it from user-initiated evidence upload) and is correctly the
one the P2-3219 document declined to fix, since making `addFileAccess` throw would also change behavior
inside the phase-change transaction it shares. Confirmed unchanged since the baseline document.

### AC4 — Upload point list documented and not drifted

**Verdict: Mostly met, needs one update.** The P2-3219 inventory's list of the 3 compliant surfaces + the
non-evidence paths in §3 is still accurate — no new byte-upload evidence surface was found anywhere in the
areas flagged as highest-risk (`result-framework-reporting/pages/dashboard-lab/**`, `api/ai/**`, the
bilateral module). Repo-wide `type="file"` and `FileInterceptor`-family greps (below) turned up exactly the
same surfaces already in the inventory, nothing new.

**What the inventory does not yet capture** (not a violation, but drift the ticket's own AC4 asks to avoid):

1. The P2-3220 fix (commit `e014ee987`) that closed the silent-failure gap for surfaces #1 and #3 — the
   inventory's "Fixed in this pass" §5 only documents the *backend* `saveSPData` fix from P2-3219; the
   *frontend* fix from the sibling ticket isn't cross-referenced anywhere.
2. Surface #2 (innovation-dev-info) is still silent — not recorded as an open item anywhere.
3. `result-review-drawer.component.ts` (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-results/components/results-review-table/components/result-review-drawer/`)
   is a new (post-dates the P2-3219 audit) admin-only correction path: `addEvidenceLink()`/`removeEvidenceLink()`
   (lines 1655-1676), gated behind `canEditDataStandards()` (`api.rolesSE?.isAdmin` + drawer-edit permission,
   line 199-200 comment block explains the design intent). It lets a Science Program admin attach a **plain
   URL** as evidence during review, never a file, never through SharePoint — the same category of behavior
   the existing `link` field / `CLOUD_STORAGE_LINK_REGEX` rule already covers for bilateral (P2-3219 §2), just
   reimplemented in the new review UI. Not an AC1 violation (no bytes, nothing to route to SharePoint) but
   worth a line in the inventory so a future reader doesn't rediscover it as a "missing surface."

---

## 2. Upload surfaces missing from the existing inventory

**None found that create an `evidence`/`EvidenceSharepoint` row.** Specifically checked and ruled out:

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/**` — grepped every file
  for `upload|FormData|evidence|multipart|type="file"`; the only hits were a code comment referencing a
  design-mock asset path (`reporting-program-band.component.ts:43`, `uploads/pasted-....png` — not a runtime
  path) and the word "evidences" used as a verb in help text (`lab-report-form.component.html:243`,
  `aow-hlo-create-modal.component.html:217`). No file input, no `FormData`, no evidence persistence.
- `onecgiar-pr-server/src/api/ai/` — this is the DAC-score AI-review module (proposals, sessions, field
  revisions). Zero matches for `upload|Multer|FormData|multipart|@UploadedFile`. Not an upload surface at all.
- Repo-wide `type="file"` grep across the client turned up exactly 5 files, all already accounted for:
  `bilateral-ai-upload.component.html` (S3, §4.1 territory, already flagged), `section-evidence.component.html`
  (surface #3), `ai-upload-file.component.html` (the AI-assistant text-mining upload, correctly out of scope
  per P2-3219 §3), `evidence-item.component.html` (surface #1's sub-component), `user-evidence.component.html`
  (surface #2's sub-component).
- `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.ts:352`
  posts to `POST_bilateral​AiJob` (S3-backed `bilateral-ai.controller.ts`) — this is the client side of the
  already-flagged §4.1 gap, not a new one. Its own upload-failure handling (`onSubmit`'s `error:` callback,
  `:359-363`, `handleUploadError`) is fine — errors from the S3 upload itself are surfaced; the gap is
  downstream, in `promoteDraft` never migrating the flagged file.

---

## 3. Defects found, ranked by user impact

### 1. (Highest) Innovation Development evidence save fails completely and silently when SharePoint upload fails

**Where:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.ts:205-251`
(`onSaveSection`, `uploadPendingFiles`) and `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:627-635`
(`POST_createEvidenceDemandP25`, missing `.pipe(this.saveButtonSE.isSavingPipe())`).

**Scenario:** A user on the Innovation Development section (2025+ "P25" flow) attaches a file under
"Evidence of user need/user demand" and clicks Save. The SharePoint byte upload fails (network blip, expired
app token, Graph API hiccup — the same conditions the P2-3220 fix handles for the other two surfaces).
`uploadPendingFiles()` throws (`:301`, correctly — this line is intentional per the P2-3220 commit note),
`onSaveSection`'s `catch` block (`:215-219`) logs to the browser console and clears the saving spinner. **The
user sees the spinner stop and nothing else** — no toast, no error banner, no indication the save failed.
Worse than the other two surfaces: because `uploadPendingFiles` throwing aborts the whole `onSaveSection`
before `POST_createEvidenceDemandP25`/`PATCH_innovationDevP25` ever run, **every other edit in the section is
also silently discarded**, not just the evidence.

Even a server-side failure of `evidence_demand/create/:resultId` itself (not just the byte upload — e.g. the
`saveSPData` `addFileAccess` error) hits the same silent path, because `POST_createEvidenceDemandP25` is the
one call in `results-api.service.ts` among its many siblings that was never wired to `isSavingPipe()`.

**Evidence this is not accidental-but-untested:** the existing spec
(`innovation-dev-info.component.spec.ts:999-1009`, `'should stop saving when uploadPendingFiles throws'`)
only asserts `component.savingSection` becomes falsy — it does not assert any alert/toast was raised, which
is consistent with there being none to assert.

**Contrast:** the P2-3220 fix explicitly left this component "untouched," reasoning that it "already
rethrew" the error — true, but rethrowing into a `console.error`-only catch is not user-facing feedback.

### 2. (Medium — design gap, not silent, already flagged in the baseline) Bilateral AI "formal evidence" never reaches the `evidence` table or SharePoint

Unchanged from P2-3219 §4.1 (see AC1 above for the current-code re-verification). Re-flagging here per the
task's request to spend effort on AC3-adjacent gaps: this is architecturally the *opposite* problem from
defect #1 — no error occurs, no toast is warranted, but the user completes a flow ("mark document as formal
evidence" → "Create Result") that visually promises the file becomes evidence, and it silently doesn't. From
the end user's point of view the effect is identical to a silent failure. Still correctly a product decision
per the baseline document's own reasoning (S3→SharePoint migration + rollback semantics needed), not
something to guess a fix for here.

### 3. (Low — data hygiene, not user-visible) Orphaned `Evidence` rows with no `EvidenceSharepoint` match on `saveSPData` failure

`evidences.service.ts:203,751` save the `Evidence` row before `saveSPData` can fail; no transaction wraps
the two. The user now correctly sees a failed-save toast (§AC3 table above), but the already-committed row
is not rolled back or cleaned up, so a retry that then succeeds may leave a duplicate/orphaned row behind
depending on how `saveSPData`'s upsert logic (`sp_evidence_id` matching, lines 346-360) reconciles it on the
next attempt — not traced further since it needs a live failure+retry sequence to confirm (see §4).

### 4. (Low, pre-existing, confirmed unchanged) `replicateSPFiles` drops the link silently during phase replication

`evidences.service.ts:454-456`, root cause `share-point.service.ts:106-109` (`addFileAccess` swallows and
returns its error instead of throwing). No user is in the loop for phase replication in the same way as an
evidence upload — this is a background consequence of a phase change, not a click-driven "user does X" flow
— but a document silently fails to replicate to the new phase with zero log trace. Confirmed unchanged from
baseline; correctly left unfixed pending a decision on whether a phase change should roll back on this.

---

## 4. What could not be determined statically

- **Whether the orphaned-row scenario (defect #3) actually produces a duplicate/inconsistent row on retry**,
  as opposed to `saveSPData`'s `sp_evidence_id`-based upsert cleanly reconciling it — this needs either a
  live failure injected against a real (or mocked) SharePoint tenant plus a retry, or a very close read of
  every branch of `saveSPData`'s upsert logic (`evidences.service.ts:346-420`) against every possible client
  payload shape on retry. Not attempted here; flagging as a question for whoever picks up the transaction/
  reconciliation fix in §4.2 of the baseline document.
- **Whether `SharePointService.addFileAccess`/`createFileFolder`/etc. actually behave as read (rate limits,
  transient 5xx patterns, token expiry timing) against the real Microsoft Graph tenant** — inherently requires
  a live tenant; nothing here can be confirmed from source alone.
- **Live test execution.** `onecgiar-pr-server/node_modules` is not installed in this worktree (a fresh
  worktree, per the task setup), so `npx jest --testPathPattern="evidences" ...` could not be run here. I
  did not run `npm ci` to avoid a long, unbounded install inside an audit-scoped task. Statically confirmed
  instead that the relevant test exists and covers the claimed behavior:
  `evidences.service.spec.ts:324-385` (`saveSPData` describe block, success + failure-message assertions) and
  `innovation-dev-info.component.spec.ts:999-1009` (confirms defect #1's current, untested-for-visibility
  behavior). The P2-3219 document's own claim of "15/15 passed" for that suite and the P2-3220 commit
  message's "20 suites / 296 tests green" were not independently re-run in this session.
- **Whether any Cypress e2e coverage exercises the upload-failure toast paths** — not searched exhaustively;
  out of scope for a source-level audit within the time available, and Cypress requires a running app to be
  meaningful, which this audit does not stand up.

---

## 5. What P2-3218 still needs before it can close

**Genuinely outstanding (not blocked on P2-3220/P2-3221):**

1. **Fix defect #1** (innovation-dev-info silent failure) — add `isSavingPipe()` to
   `POST_createEvidenceDemandP25` (`results-api.service.ts:635`, one-line change matching every sibling
   method in the same file) and/or surface `uploadPendingFiles`'s rethrow with a user-visible alert in
   `onSaveSection`'s catch (`innovation-dev-info.component.ts:215-219`), mirroring the P2-3220 pattern
   already applied to the other two surfaces. This is client-side work in the exact area P2-3220 covers, so
   coordinate with whoever owns that ticket rather than fixing it out from under them — but it is not yet
   done, and it is the one AC3 gap left with a concrete "user sees nothing" reproduction.
2. **Decide and implement the bilateral-ai "formal evidence" migration path** (baseline §4.1) — a product/
   architecture call (S3→SharePoint migration timing, rollback semantics on partial failure), not something
   this audit or a quick patch should resolve. This is the largest remaining AC1 gap.
3. **Decide the evidence-row/SharePoint-row transaction or reconciliation strategy** (baseline §4.2,
   sharpened by this audit: the visibility half of this is now fixed by P2-3220, only the data-hygiene half
   remains) — needs an owner decision on transaction scope vs. a cleanup job.
4. **Decide whether `addFileAccess` should throw during phase replication** (baseline §4.3) — a reliability
   trade-off (silent no-op vs. rolling back an entire phase change on a transient SharePoint hiccup) that
   needs an explicit product/eng call, not a default.
5. **Update `onecgiar-pr-server/docs/sharepoint-evidence-upload-inventory.md`** to record: the P2-3220 fix
   and its file/line references, that surface #2 is still open, and a one-line mention of the bilateral
   review drawer's plain-link admin path (AC4, §1 above) so it isn't rediscovered as a false "missing
   surface" by a future auditor.

**Blocked on / coordinate with other sub-tasks:**

- Any further client-side upload-flow changes (including item #1 above, if picked up now rather than left
  for the next pass) collide with P2-3220, which is actively in flight on this same set of files per the
  task brief — that ticket's owner should decide whether to fold this in or take it as a fast-follow.
- P2-3221 was referenced in the task brief's framing but no artifact for it (spec, code, doc) was found
  anywhere in this branch during the audit — nothing to report against it; if it covers one of the items
  above, that should be reconciled by whoever tracks the sub-task breakdown.

---

## Correction — the root cause named above is wrong, and the defect is bigger

**Added 2026-09-01 after fixing the defect (commit `52af7e9a4`).** The audit's findings stand; two
statements about *why* do not.

### `isSavingPipe()` is not the cause and would not have helped

The report attributes the silence to `POST_createEvidenceDemandP25` ending in a bare `.pipe()`
instead of `.pipe(this.saveButtonSE.isSavingPipe())`, and recommends adding it.

`innovation-dev-info.component.ts` **does not use `saveButtonSE` at all** — zero references. It tracks
its own `savingSection` flag and never reads the shared save button. Adding that pipe would have
driven a global control this screen does not use, and produced no message for its user. The empty
`.pipe()` is real but cosmetic; it was deliberately left alone.

The cause is simply that the three `catch` / `error:` blocks called `console.error` and nothing else.

### There were three silent paths in that method, not one

The report identifies the `uploadPendingFiles()` catch (`:215-219`). Two more sit in the same method
and fail the same acceptance criterion:

| Path | What failed | What the user saw |
|---|---|---|
| `uploadPendingFiles()` catch | SharePoint upload | nothing — and the **whole section save** was abandoned, not just the evidence |
| `POST_createEvidenceDemandP25` `error:` | registering the evidence row | nothing |
| `PATCH_innovationDevP25` `error:` | the section's own fields | nothing |

All three are fixed in `52af7e9a4`, with three different messages, because the user's next action
differs: re-attach / the files are uploaded but unattached / **the evidence was stored, do not
re-attach**.

### Why the tests did not catch it

Each of the three paths already had a test. All three asserted only that `savingSection` went false —
which was true throughout the defect's life. They now assert what the user is actually shown, plus a
fourth that a successful save shows nothing.

This is the same shape of gap that hid two defects in P2-3296 the same week: the assertions stopped
one layer above the thing that was broken.
