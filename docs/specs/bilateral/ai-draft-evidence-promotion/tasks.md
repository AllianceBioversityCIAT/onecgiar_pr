# Tasks — AI draft evidence promotion

## 1. Scope

| Field | Value |
|---|---|
| Module / feature | `bilateral` / `ai-draft-evidence-promotion` |
| Linked spec | `requirements.md` + `design.md` (both approved) |
| Owner | Juan David Delgado |
| Ticket | [P2-3700](https://cgiarmel.atlassian.net/browse/P2-3700) |
| Status | `in-progress` |
| Budget (`design.md` §11) | 5 tasks · ~300 LOC · 2 review rounds — **exceeding any of these escalates to the user** |

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Open questions resolved — `ADE-OQ-1` (not public, user publishes later) and `ADE-OQ-2` (silence accepted for v1).
- [x] No migration in scope — `npm run migration:check` must stay clean, not become green.
- [x] No conflicting in-flight spec touches `api/bilateral-ai` or `shared/services/share-point` (`docs/specs/` searched 2026-09-16).
- [ ] CLARISA dependencies — **n/a**, this spec touches no CLARISA cache or endpoint.
- [ ] Confirm `sp_drive_id` and `sp_microsoft_graph_api_url` resolve on prtest before `ADE-T-5`.

## 3. Task list

---

### `ADE-T-1` — Office allowlist and the qualifying-document predicate  `[x]` PASS — see `execution.md`

- **Type:** `server`
- **Description:** Add the office-format allowlist as a module constant and a pure predicate that decides whether one draft-evidence row qualifies to become evidence. The predicate parses the extension from the stored `file_name` and requires `source_type = DOCUMENT`. No I/O, no dependencies — the foundation `ADE-T-4` selects with.
- **Implements:** `ADE-R-2` · `ADE-AC-2` (all three clauses: the THEN, the `BUT it must NOT`, and the `AND IT MUST` extension-not-`source_type` clause)
- **Design refs:** §7.1 selection rule · §9 · DD-5
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral-ai/constants/evidence-formats.constant.ts` (new) + spec
- **Depends on:** — · **Blocks:** `ADE-T-2`, `ADE-T-4`
- **Estimate:** `S`
- **Skills:** `nestjs-expert`
- **Negative constraints to encode:** `txt` MUST NOT qualify although it is an accepted `DOCUMENT` upload type; audio extensions and `TEXT_CONTEXT` rows MUST NOT qualify; the allowlist MUST NOT be derived from `bilateral-ai-file-storage.service.ts`'s upload list (§9 — different question, and `txt` is the case that proves it).
- **Verification:** `npx jest --testPathPattern="evidence-formats"`
- **The input that would make this FAIL:** a case asserting `notes.txt` with `source_type = DOCUMENT` does **not** qualify. If the predicate were written against `source_type` alone — the natural mistake — this input returns `true` and the test fails. A suite without this exact case cannot falsify the implementation and is not evidence.
- **Disqualifier:** a green run where the allowlist is asserted against itself (e.g. iterating the constant to build the expectations) proves nothing. Expected values are written literally, from `requirements.md` `ADE-R-2`.
- **Done:**
  - [x] Allowlist is exactly `pdf, docx, xls, xlsx, pptx`, literal, one source of truth.
  - [x] Cases for each allowed extension, for `txt`, for one audio extension, for `TEXT_CONTEXT`, for a `file_name` with no extension, and for mixed case (`REPORT.PDF`).
  - [x] Lint clean.

---

### `ADE-T-2` — Default `is_formal_evidence` for qualifying documents at draft creation

- **Type:** `server`
- **Description:** In `createDraftFromCandidate`, set `is_formal_evidence = true` for document sources that satisfy `ADE-T-1`'s predicate, leaving every other source `false`. Per DD-5 this flag is **descriptive in v1** — it records intent and gives a future opt-out UI something to bind to; it does **not** gate what `ADE-T-4` transfers.
- **Implements:** `ADE-R-6` · contributes to `ADE-AC-1`, `ADE-AC-2`
- **Design refs:** §5 · DD-5
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts` (~`:933-965`) + `bilateral-ai.service.spec.ts`
- **Depends on:** `ADE-T-1` · **Blocks:** —
- **Estimate:** `S`
- **Skills:** `nestjs-expert`
- **Negative constraints to encode:** voice notes and text context MUST remain `false` — otherwise `promoteDraft`'s existing non-`DOCUMENT` validation (`bilateral-ai.service.ts:547-556`) starts throwing `BadRequestException` and **breaks promotion entirely**. This is the regression this task is most likely to cause; it gets its own test.
- **Verification:** `npx jest --testPathPattern="bilateral-ai.service"`
- **The input that would make this FAIL:** a job carrying one `.pdf` **and** one `.m4a`, promoted end to end. If the flag were set for every source, the existing validation throws and the promote test fails. A test that only creates drafts and inspects rows would never exercise that guard.
- **Disqualifier:** asserting only that the flag is `true` for the `.pdf` is a half-test; the run is inconclusive unless it also asserts the promote of that same draft still succeeds.
- **Done:**
  - [ ] `.pdf`/`.docx`/`.xls`/`.xlsx`/`.pptx` sources created with `true`; `.txt`, audio and text context with `false`.
  - [ ] A promote test over a mixed-source job passes, proving the non-`DOCUMENT` guard is still satisfied.
  - [ ] Lint clean.

---

### `ADE-T-3` — Server-side SharePoint upload, with a bounded timeout

- **Type:** `server`
- **Description:** Two additions that together move bytes without a browser. (a) `BilateralAiFileStorageService` gains a method returning an object's readable stream plus its size. (b) `SharePointService` gains `uploadFromStream`: mint the upload session exactly as `createUploadSession` does, then `PUT` the stream with `Content-Type: application/octet-stream` and `Content-Range: bytes 0-{size-1}/{size}`, returning the driveItem `id` and `name`. **Every outbound Graph call is bounded by an explicit timeout** (DD-3) — without it `ADE-R-5` is unreachable, because the `HttpModule` these calls ride has none.
- **Implements:** `ADE-R-3` · `ADE-R-5` (the fault-*detection* half) · `ADE-QAS-3`
- **Design refs:** §7.2 · DD-3
- **Files (expected):** `onecgiar-pr-server/src/shared/services/share-point/share-point.service.ts` · `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-file-storage.service.ts` + both specs
- **Depends on:** — (parallel with `ADE-T-1`/`ADE-T-2`) · **Blocks:** `ADE-T-4`
- **Estimate:** `M`
- **Skills:** `nestjs-expert`, `error-handling-patterns`
- **Negative constraints to encode:** MUST NOT change any existing `SharePointService` signature (`evidences`, `toc-results`, `versioning` depend on them); MUST NOT set a global `HttpModule` timeout (DD-3 rejected alternative); MUST NOT buffer the whole object in memory; MUST NOT log the session URL, the signed S3 URL or the Graph token (`AC-9`).
- **Verification:** `npx jest --testPathPattern="share-point|bilateral-ai-file-storage"`
- **The input that would make this FAIL:** a stubbed Graph call that never settles. If no timeout is wired, the test hangs to the Jest timeout and reports failure; with the timeout it rejects promptly and the assertion passes. This is the single input that distinguishes DD-3 being implemented from DD-3 being described.
- **Disqualifier:** a passing test whose Graph stub resolves immediately says nothing about timeout behavior — it exercises only the happy path. The timeout case is not optional coverage; without it this task's central claim is unverified.
- **Note on chunking:** a single request is correct here — Graph refuses requests ≥ 60 MiB (P2-3318) and the AI cap is 25 MB (§7.2). Do **not** port the client's fragmenting variant; it is unreachable code on this path.
- **Done:**
  - [ ] `uploadFromStream` returns `{ id, name }` from the final Graph response.
  - [ ] A never-settling stub is abandoned by the timeout and surfaces as a rejection.
  - [ ] No existing signature changed; `npx jest --testPathPattern="evidences"` still green (blast-radius check).
  - [ ] `grep` over the added lines shows no token, session URL or signed URL in any log statement.
  - [ ] Lint clean.

---

### `ADE-T-4` — Evidence transfer service, wired into `promoteDraft`

- **Type:** `server`
- **Description:** The core. New `BilateralAiEvidenceTransferService` selects the draft's qualifying, not-yet-transferred document rows and, **sequentially and independently per document**, streams S3 → SharePoint (`ADE-T-3`), inserts the `evidence` row (`result_id`, `is_sharepoint = true`, `is_public_file = false`, `evidence_type_id = 1`), calls `EvidencesService.saveSPData` to mint the link and write `evidence_sharepoint`, then stamps `file_management_reference` **last** (DD-6). Each document is wrapped so a throw is logged and the loop continues; the service never throws. `promoteDraft` calls it once, **after** the `status_id` write. `bilateral.module.ts` imports `SharePointModule` and registers the service.
- **Implements:** `ADE-R-1`, `ADE-R-3.1`, `ADE-R-4`, `ADE-R-5`, `ADE-R-7`, `ADE-R-8`, `ADE-R-9` · `ADE-AC-1`, `ADE-AC-3`, `ADE-AC-4`, `ADE-AC-5`, `ADE-AC-6`, and `ADE-AC-7`'s `AND IT MUST` clause
- **Design refs:** §3.1, §3.2, §4, §5, §7.1, §7.3, §7.4 · DD-1, DD-4, DD-5, DD-6
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-evidence-transfer.service.ts` (new) + spec · `bilateral-ai.service.ts` (`promoteDraft`) · `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts`
- **Depends on:** `ADE-T-1`, `ADE-T-3` · **Blocks:** `ADE-T-5`
- **Estimate:** `L`
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`
- **Clause-level coverage this task owns:**

| Clause | Encoded as |
|---|---|
| `ADE-AC-1` *AND IT MUST* bound to the promoted draft's result, not a sibling's | A job producing 2 drafts; promote one; assert the other's result has **0** evidence rows |
| `ADE-AC-1` *AND IT MUST* stored not public, explicitly, not `null` | Assert `is_public_file === false` — **not** falsy. `null` must fail the assertion, because `null` is what the platform rejects |
| `ADE-AC-3` *AND IT MUST NOT* leave the result in `Draft` nor a half-written evidence row | Failing SharePoint stub; assert `status_id = Editing`, promote resolves, and **0** `evidence` rows exist |
| `ADE-AC-3` *BUT it must NOT* surface a secret | `grep` gate over this task's added log statements |
| `ADE-AC-4` *AND IT MUST* decide from stored state, not an in-memory guard | Run the transfer twice through **two separate service instances** over the same stamped rows; a field- or closure-held set would pass a same-instance test and fail this one |
| `ADE-AC-5` *AND IT MUST NOT* re-attach documents 1 and 3 | Three documents, second stub fails; re-run; assert exactly one new row and no duplicates |
| `ADE-AC-7` *AND IT MUST* use the same code path, no AI-specific branch | Assert `saveSPData` is the collaborator invoked — not a forked local implementation |

- **Verification:** `npx jest --testPathPattern="bilateral-ai"` and `npx jest --testPathPattern="evidences"` (blast radius), then `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
- **The input that would make this FAIL:** a `saveSPData` stub that throws — the DD-4 confidentiality refusal, which is a *real* runtime outcome, not a hypothetical. If the per-document `try` is missing or placed around the whole loop, the promote rejects and the test fails. This input also falsifies the `ADE-AC-5` partial-commit claim in one shot.
- **Disqualifier:** a green suite here proves the **shape** of the rows and the **control flow**, because Graph and S3 are stubbed throughout. It does **not** prove the link resolves, that the file is actually private, or that the folder is right — those are `ADE-T-5`'s job (DC-5, DC-6). Reading this task's green as "the feature works" is the specific misreading `KZ-EVL-1` was written about.
- **Presence-assertion caveat (`ADE-AC-6`):** asserting the created row carries `is_active`, `result_id` and `evidence_type_id` like a manual one proves the row's *shape*, not that soft delete and "add more evidence" behave. Those run through client and controller paths this spec does not touch; `ADE-T-5` exercises them by hand. Recorded as a gap, not claimed as covered.
- **Done:**
  - [ ] Every clause in the table above has a named, passing test.
  - [ ] The service never throws — asserted, not assumed.
  - [ ] `promoteDraft`'s response contract is byte-identical to today (`resultId`, `resultCode`, `versionId`, message, 200).
  - [ ] `bilateral.module.ts` compiles with the new provider; `npx jest --testPathPattern="app.module"` green (constructor change → per the project's standing rule).
  - [ ] `npx tsc --noEmit` clean.
  - [ ] No migration added; `npm run migration:check` still clean.
  - [ ] Swagger/DTOs untouched — no API surface changed (§6).
  - [ ] Bilateral payload change log **not** touched — no payload change (`AC-4`).

---

### `ADE-T-5` — Measure the latency and verify on prtest what Jest cannot see

- **Type:** `tests` / `rollout`
- **Description:** The gate for every defect class no automated check covers. Three parts: (a) measure promote latency against `ADE-QAS-1` and `ADE-QAS-2`; (b) manually verify DC-5 (the link actually resolves) and DC-6 (the file is actually private); (c) manually verify `ADE-AC-7` (publishing it afterwards re-issues the link) and `ADE-AC-6` (soft delete behaves).
- **Implements:** `ADE-QAS-1`, `ADE-QAS-2` · `ADE-AC-6`, `ADE-AC-7` · DC-5, DC-6, DC-7
- **Design refs:** §2 · DD-2, DD-3
- **Depends on:** `ADE-T-4` · **Blocks:** —
- **Estimate:** `M`
- **Skills:** — (manual verification + measurement; no code)
- **Procedure:**
  1. Promote a draft carrying one representative document (≤ 5 MB) on prtest. Record total wall time. **Repeat 5 times.**
  2. Open the resulting evidence link **as a user who did not upload it**. Then open it in an **incognito session with no CGIAR account**.
  3. In the Evidence section, answer "Can this evidence be shared publicly?" as **yes**, save, and confirm the link is re-issued and now opens anonymously.
  4. Soft-delete the attached evidence and add a new one manually; confirm both behave as on a non-AI result.
  5. If a 6-document job can be staged, repeat step 1 once against `ADE-QAS-2`.
- **The input that would make this FAIL:** step 2's incognito open **serving the file**. That is a real, previously-measured outcome on this platform (prtest 2026-09-09, result 9075 / evidence 13081), not a theoretical one — which is precisely why it is a manual step and not a Jest assertion.
- **Disqualifier — this is the task where a number can be produced without meaning anything:**
  - A **single** timing run is not evidence. Report the five runs.
  - If the five runs vary by more than the margin being judged — i.e. the spread is wider than the distance between the measurement and the 3 s threshold — **the measurement is inconclusive**. Report the spread and say so; do **not** commit a mean as if it were a p95.
  - A measurement taken while another heavy job runs on the same environment is void. Note what else was running.
  - **"Inconclusive" is a legitimate, reportable outcome.** It must not be collapsed into a pass because the promote returned 200.
- **Escalation:** exceeding `ADE-QAS-1` or `ADE-QAS-2` triggers DD-2's async escalation, which is an **amendment to this spec presented to the user** — never an improvisation during execution.
- **Done:**
  - [ ] Five timings recorded in `execution.md` with the spread, not a single number.
  - [ ] Link resolves for a second CGIAR user; does **not** resolve incognito.
  - [ ] Publishing afterwards re-issues the link and it then resolves incognito.
  - [ ] Soft delete and manual add behave as on a non-AI result.
  - [ ] Any inconclusive result is written down as inconclusive.

---

## 4. Dependency graph

```
ADE-T-1 (allowlist predicate) ──┬──▶ ADE-T-2 (formal-evidence default)
                                │
                                └──┐
ADE-T-3 (SP upload + timeout) ─────┼──▶ ADE-T-4 (transfer service + promote) ──▶ ADE-T-5 (measure + prtest)
```

**Parallel-friendly:** `ADE-T-1` and `ADE-T-3` have no dependency on each other and can run concurrently. `ADE-T-2` is independent of `ADE-T-3` and never blocks `ADE-T-4` — it can land at any point after `ADE-T-1`. No cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ADE-TEST-1` | unit (server) | `ADE-R-2`, `ADE-AC-2` (all clauses) | `api/bilateral-ai/constants/evidence-formats.constant.spec.ts` |
| `ADE-TEST-2` | unit (server) | `ADE-R-6`, non-`DOCUMENT` guard regression | `api/bilateral-ai/services/bilateral-ai.service.spec.ts` |
| `ADE-TEST-3` | unit (server) | `ADE-R-3`, `ADE-R-5` detection half, timeout | `shared/services/share-point/share-point.service.spec.ts` |
| `ADE-TEST-4` | unit (server) | `ADE-R-1`, `R-3.1`, `R-4`, `R-5`, `R-7`, `R-8`, `R-9`; `ADE-AC-1`, `AC-3`, `AC-4`, `AC-5`, `AC-6` shape, `AC-7` path | `api/bilateral-ai/services/bilateral-ai-evidence-transfer.service.spec.ts` |
| `ADE-TEST-5` | blast radius | no regression in the reused evidence path | `api/results/evidences/evidences.service.spec.ts` (existing, must stay green) |
| `ADE-TEST-6` | manual (prtest) | `ADE-QAS-1`, `QAS-2`, `ADE-AC-6`, `AC-7`, DC-5, DC-6, DC-7 | `ADE-T-5` procedure; results recorded in `execution.md` |

Server coverage must stay above 5/20/35/40. **Never run the full backend suite** — always `--testPathPattern`.

## 6. Coverage closure

Every scenario and every `BUT` / `AND IT MUST` clause has a named owner. Nothing is discharged by citing a different requirement.

| Scenario | Clause | Owner |
|---|---|---|
| `ADE-AC-1` | THEN one active row · AND SharePoint-backed, resolvable | `ADE-T-4` (shape) · `ADE-T-5` (resolvable) |
| `ADE-AC-1` | AND IT MUST bound to the promoted result, not a sibling | `ADE-T-4` |
| `ADE-AC-1` | AND IT MUST not public, explicit not `null` | `ADE-T-4` |
| `ADE-AC-2` | THEN only the `.pdf` · BUT NOT txt/audio/text | `ADE-T-1` (predicate) · `ADE-T-4` (integration) |
| `ADE-AC-2` | AND IT MUST exclude on extension, not `source_type` | `ADE-T-1` |
| `ADE-AC-3` | THEN Editing + success · AND failure recorded | `ADE-T-4` |
| `ADE-AC-3` | BUT NOT surface a secret | `ADE-T-4` (grep gate) |
| `ADE-AC-3` | AND IT MUST NOT strand the result nor half-write a row | `ADE-T-4` |
| `ADE-AC-4` | THEN count unchanged · AND IT MUST decide from stored state | `ADE-T-4` (two instances) |
| `ADE-AC-5` | THEN 1 and 3 attached · AND only 2 on re-run · AND IT MUST NOT duplicate | `ADE-T-4` |
| `ADE-AC-6` | THEN soft-deleted as ordinary · AND can add more | `ADE-T-4` (shape only — **declared gap**) · `ADE-T-5` (behavior) |
| `ADE-AC-7` | THEN link re-issued | `ADE-T-5` |
| `ADE-AC-7` | AND IT MUST use the same path, no AI-specific branch | `ADE-T-4` |
| `ADE-QAS-1`, `QAS-2` | latency measures | `ADE-T-5` |
| `ADE-QAS-3` | bounded, promotion survives | `ADE-T-3` (bound) · `ADE-T-4` (survives) |
| `ADE-QAS-4` | per-document checkpoint | `ADE-T-4` |
| `ADE-QAS-5` | not public, fail closed | `ADE-T-4` (stored) · `ADE-T-5` (actual) |
| `ADE-QAS-6` | one line per outcome, no secrets | `ADE-T-4` |
| `ADE-QAS-7` | substitutable seam | `ADE-T-4` (DI) |

**Deliberately unowned:** `ADE-R-10` (MAY — persist the real MIME type on the draft-evidence row) has **no task by decision**, not by oversight. `design.md` §7.1 parses the extension from `file_name` instead, which removes the need; recorded in `design.md` §13. Implementing it would add a field nothing reads.

## 7. Rollout & verification

- [ ] Commit convention: `✨ feat(bilateral-ai-evidence) [P2-3700]: <description>`.
- [ ] Branch per the project rule — **never merge to `staging` or `performance-refactor` without being asked**.
- [ ] CI green: lint, tests, build, `migration:check:ci`, SonarCloud.
- [ ] `ADE-T-5` completed on prtest **before** the ticket moves to Ready For UAT — its defect classes are the ones no CI gate can see.
- [ ] Confirm the deployed environment's pipeline actually points at this branch before diagnosing any "it does not work".
- [ ] No downstream notification needed — no bilateral or platform-report payload changed.

## 8. Estimated LOC & PR strategy

| Part | LOC |
|---|---|
| `ADE-T-1` constant + predicate | ~30 |
| `ADE-T-2` default flag | ~15 |
| `ADE-T-3` stream read + `uploadFromStream` + timeout | ~70 |
| `ADE-T-4` transfer service + promote wiring + module | ~90 |
| Tests (T-1 … T-4) | ~130 |
| **Total** | **~335** |

**Recommendation: a single PR.** ~335 LOC is under the ~400 threshold, the change is one coherent slice on one dispatch chain, and splitting it would produce a first PR (`ADE-T-1`/`ADE-T-3`) of dead code no caller reaches — harder to review, not easier. `ADE-T-5` produces no code; its findings go in `execution.md` and the Jira comment.

Should `ADE-T-5` trigger DD-2's async escalation, **that** becomes its own PR against its own amended spec — not a late addition to this one.

## 9. Cleanup & follow-ups

| # | Item | Where it goes |
|---|---|---|
| 1 | The opt-out UI — wire the existing `PATCH .../evidence/:evidenceId` to a toggle in `draft-evidence-list`, and make `promoteDraft` gate on `is_formal_evidence` (DD-5 makes it descriptive in v1) | New spec + ticket under P2-2338 |
| 2 | Backfill for AI results already created with an empty Evidence section (result 9349 and others) | Separate ticket if Ángel asks; needs an S3-liveness check on old jobs first |
| 3 | TRD correction: deploy target is a container, not Lambda (`design.md` §12) | Pending write, applied on `master`, never from this branch |
