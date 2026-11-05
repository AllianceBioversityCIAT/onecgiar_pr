# Proposal — A reporting platform corrects a Rejected or Editing Knowledge Product

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-kp-correction` — slug suggested by the brief |
| Type | **Change** (widens an existing rule; not a regression) |
| Deliverable | software |
| Approval Mode | `gated` |
| Status | **approved** — converted by `/akili-specify` on 2026-11-05. The `KPC-R-*` IDs in §9 are preview IDs; the final numbering is in `requirements.md` |
| Date | 2026-11-05 |
| Jira | [P2-4065](https://cgiarmel.atlassian.net/browse/P2-4065) (epic P2-3094), status Open, assignee Juan David Delgado |
| Requirement source | Jira P2-4065, read through the Jira MCP on 2026-11-05 (no comments yet), plus the brief passed to `/akili-propose` |
| Visual source | None — backend-only change |
| Builds on | `bilateral/resubmit-rejected-result` (`RSB`, P2-3894, archived 2026-10-06), `bilateral/rejected-result-correction` (`RRC`), `bilateral/resubmit-followups` (`RSF`), `changes/bilateral-create-upsert-by-code` (`UBC`) |
| Supersedes | `RSB-R-7` (KP excluded, any status) **for the `updated` branch only**. `UBC-R-6` / the versioning KP guard stays |
| Traceability prefix | `KPC` |
| Baseline | `docs/prd.md` US-D1, `AC-4`; `docs/trd/trd.md` bilateral module; contract `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Branch at proposal time | `JuanGuzman-io/nereid` (worktree; last merge from `qa-development-2026-ss` → `performance-refactor`) |

## 2. Intent

Let STAR, MEL and TIP correct a Knowledge Product through the same `create` call they already use for the other types. PRMS takes only the fields the centre owns from the payload and re-reads the rest from DSpace.

## 3. Problem / Current Behavior

| Today | Evidence |
|---|---|
| A `create` carrying the `result_code` of an open-phase KP is refused with 409, whatever its status | `bilateral.service.ts:4611` calls `assertNotKnowledgeProduct` in the `updated` branch of `resolveResultCodeTarget` |
| The `updated` branch accepts only Rejected; Editing is refused for every type | `bilateral.service.ts:4681-4691` `assertResultCodeStatusIsEditable` |
| The `versioned` branch refuses KPs too, independently | `versioning-rules/bilateral-versioning-rules.service.ts:106` inside `resolveVersionableResult` |
| The resubmission pipeline re-checks Rejected under the lock and flips 7 → 5 with a CAS | `services/bilateral-resubmission.service.ts:332` (`assertStillRejected`, check at `:948`), CAS at `:489-498` |
| The writers assume "never a KP": they always write `geo_focus`, evidence and the header title/description from the payload | `bilateral.service.ts:4846-4935` `writeResubmittedResult`; comment at `:4840-4841` |
| The preflight always validates `geo_focus` | `services/bilateral-resubmission.service.ts:587` |
| The create path, for KPs, skips `geo_focus` and evidence (DSpace provides them) and validates the handle against MQAP before any insert | `bilateral.service.ts:547-616`, `:4326-4376` `validateKnowledgeProductBeforeCreate` |
| DSpace metadata on an existing KP is refreshed by `ResultsKnowledgeProductsService.syncAgain` | `results/results-knowledge-products/results-knowledge-products.service.ts:129` |

Result for partners: a rejected KP is a dead end. MEL says KPs could be corrected last year (the claim comes from the integration meeting cited in P2-4065: UNVERIFIED — confirm at source before relying on it).

## 4. Proposed Outcome

| The platform sends | PRMS does |
|---|---|
| `result_code` of a KP in **Rejected**, open phase, same platform, same handle | Updates the non-DSpace fields from the payload, re-syncs the DSpace fields by handle, sets **Pending Review**, returns `operation: "updated"` |
| `result_code` of a KP in **Editing**, open phase, same platform, same handle | Same writes; final status follows `keep_editing` (open item OQ-1) |
| `result_code` of a KP in any other status | **409** naming the code and the status. Nothing changes |
| Another platform's KP | **403** |
| A different handle | **409** (BR4). Nothing changes |
| DSpace unreachable or the handle no longer validates | **502**, nothing written (OQ-3 default). *Superseded in `requirements.md` `KPC-R-8`: the cycle-year rule answers 422* |
| `result_code` of a KP from an earlier phase (`versioned`) | **409**, as today |

## 5. Scope

- The KP branch of the `updated` path in `POST /api/bilateral/create` (the Fetcher's `/ingest` forwards to it).
- Status guard: Rejected or Editing, **KPs only**.
- Handle immutability (BR4) as a preflight check.
- A KP variant of the resubmission pipeline: preflight without `geo_focus`, DSpace fetch inside the preflight, reset and writers limited to non-DSpace sections, CAS from 7 or 1.
- Reuse of `ResultsKnowledgeProductsService` for the DSpace sync.
- Review history: the original rejection is kept; the correction adds a `RESUBMIT` row (`RSB-R-9`, `RSB-R-18`).
- Contract doc change-log row in `bilateral-result-summaries.en.md`.
- Unit tests in `bilateral.service.spec.ts` and `bilateral-resubmission.service.spec.ts`, cases listed in §13.

## 6. Non-Goals

- Editing correction for non-KP types (they stay Rejected-only, `RSB-R-2`).
- Versioning a KP across phases (the `versioned` KP guard stays).
- Changing a KP's handle, or its type.
- Any change to the Fetcher (`onecgiar_result_functions/services/fetcher`) or its docs. AC 7 and AC 8 of the brief are listed for traceability only; they belong to the Fetcher repo.
- A new CGSpace/DSpace client.
- Reporting Tool UI.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Producer platforms (STAR, MEL, TIP) | Can close the rejected → corrected → reviewed loop for KPs |
| SP reviewers | Get the corrected KP back in their queue |
| `bilateral.service.ts` | Resolver guard order; KP writers branch in `writeResubmittedResult`; new preflight port member |
| `services/bilateral-resubmission.service.ts` | Status re-read and CAS accept Editing for KPs; KP-aware preflight and reset |
| `handlers/knowledge-product.handler.ts` | Possibly a `resync` entry point beside `afterCreate` |
| `results-knowledge-products.service.ts` | Split `syncAgain` into fetch (read-only) and apply, or add a caller-friendly variant. No new HTTP client |
| `bilateral-versioning-rules.service.ts` | Unchanged (guard kept) |
| Specs | `RSB-R-7` amended (updated branch only); `RSB-R-2` gains a KP exception |
| Fetcher repo | AC 7–8 out of this repo |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: backend-only change on a JWT-less ingestion endpoint.

## 9. Requirement Delta Preview

### ADDED Requirements

- `KPC-R-1`: a KP in Rejected or Editing in the open phase is corrected on the same record (`id` and `result_code` unchanged) and the response is `operation: "updated"`.
- `KPC-R-2`: the DSpace-sourced fields are re-synced from DSpace on every correction, and payload values for them are ignored.
- `KPC-R-3`: the payload's handle (normalised with `extractHandleIdentifier`) must equal the stored handle; otherwise 409 and nothing changes.
- `KPC-R-4`: when the DSpace sync cannot run (fetch fails, MQAP refuses the handle for the cycle), the correction is refused with 502 before any write (OQ-3).
- `KPC-R-5`: a corrected Editing KP ends in the status `keep_editing` gives it (OQ-1).

### MODIFIED Requirements

- `RSB-R-7` (KP excluded) → applies to the `versioned` branch only. In the `updated` branch KPs are accepted under `KPC-R-*`.
- `RSB-R-2` (Rejected only) → unchanged for non-KP types. For KPs: Rejected or Editing.
- `RSB-R-4` (replace semantics) → for KPs, applies only to the non-DSpace sections (OQ-2 list).
- `RSB-R-8` (a refusal changes nothing) → also covers the handle check and the DSpace fetch.

### REMOVED Requirements

- None. The "KPs always 409" rule is narrowed, not removed: the versioned path keeps it.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. KP mode inside the existing resubmission pipeline** | Lift the KP guard only in the `updated` branch; pass `isKnowledgeProduct` through the pipeline; the preflight skips `geo_focus` and **fetches DSpace (read-only)**; the reset and writers skip the DSpace sections; the DSpace apply runs among the writers; the CAS accepts 7 or 1 | One lock, one preflight, one CAS, one history write. Same refusal guarantees as RSB. Smallest diff | The pipeline gains branches; `syncAgain` must be split so the fetch happens in the preflight |
| B. Separate `BilateralKpCorrectionService` | A new service that reuses the lock/CAS helpers | Clean separation | Duplicates the lock, re-read, CAS and history logic that RSB took two review rounds to get right |
| C. Header-only update + call `syncAgain` as is | Update the non-DSpace fields and call `syncAgain` | Least code | `syncAgain` catches its own errors and **returns** them (`results-knowledge-products.service.ts:378-380`), and refuses Journal Articles for non-admins (`:149-160`). A sync failure after the writes breaks BR5 |

## 11. Recommended Approach

**Option A.** It keeps BR5 intact: every refusal (status, ownership, type, handle, DSpace) happens before the first write, which is the property RSB already proves with its tests.

Outline for `/akili-specify`:

1. **Resolver** (`bilateral.service.ts:4605-4616`): for a KP, skip `assertNotKnowledgeProduct` and use a KP status guard (Rejected or Editing). Non-KP types keep the current guard. The order stays bilateral → ownership → status → type.
2. **Lock re-read** (`bilateral-resubmission.service.ts:948`): accept the status the resolver accepted (Rejected, or Editing for a KP).
3. **Preflight, KP variant:**
   - skip `validateGeoFocus`;
   - check the handle against the stored `results_knowledge_product.handle` (BR4);
   - fetch DSpace (read-only, the `findOnCGSpace` half of `syncAgain`), without the Journal Article admin gate. A failure is 502;
   - keep the primary, lead project, allocation, lead centre and user checks;
   - skip `ensureUniqueTitle`, because the title comes from DSpace.
4. **Reset, KP variant**: do not touch evidence, countries, regions or subnationals, or the role-8 MQAP institutions (all owned by the DSpace sync).
5. **Writers, KP variant**:
   - the header takes only the lead contact, `result_level_id` and the submitter columns, never title or description;
   - no geo writers, no evidence writer;
   - ToC, partners (role 2), projects, centres and contributing programs as today;
   - then the DSpace apply with the metadata fetched in step 3.
6. **CAS**: `status_id IN (7, 1)` for KPs. The target status is 5, or 1 when the KP was Editing and `keep_editing` is true. The `RESUBMIT` history row is written in the same transaction, so the earlier REJECT row stays (AC 6).
7. **Versioning**: untouched. A test pins `versioned` + KP → 409.

## 12. Risks, Dependencies, And Open Questions

### Open items (proposed defaults for HITL approval)

| ID | Question | Proposed default | Why |
|---|---|---|---|
| `KPC-OQ-1` | Editing: KPs only, or every type? Resulting status? | **KPs only.** Rejected → Pending Review always. Editing → `keep_editing: true` stays Editing; otherwise Pending Review | Keeps `RSB-R-2` intact for other types; mirrors `resolveInitialStatusId` (`constants/initial-status.constants.ts`) |
| `KPC-OQ-2` | Exact list of payload-owned fields | **From the payload:** lead contact person, `result_level_id`, submitter (`submitted_by`), lead centre, contributing centres, contributing bilateral projects (with lead), contributing partners (role 2), ToC mapping + contributing programs. **From DSpace:** title, description, authors, issue year, DOI, licence, keywords, `metadataCG`, FAIR, altmetrics, institutions (role 8), countries, regions, evidence (handle link) | This is the split the create path already makes (`bilateral.service.ts:547-616`) |
| `KPC-OQ-3` | DSpace sync failure during a correction | **Refuse with 502, nothing written** | BR5; the fetch moves into the preflight so a refusal comes before any write |
| `KPC-OQ-4` | Should an Editing correction add a `RESUBMIT` history row? | **Yes**, so the history shows every API overwrite | An Editing KP may already hold edits made in PRMS (last write wins, `RSB` persona "Centre user") |

### Risks

| Risk | Mitigation |
|---|---|
| `syncAgain` swallows errors and returns them (`:378-380`); called as is, a failed sync looks like success | Split fetch and apply; the preflight checks the fetch's `status` explicitly |
| `syncAgain` refuses Journal Articles for non-admin users (`:149-160`); bilateral users are not admins | The correction path calls the fetch/apply halves without that gate. To be confirmed with the KP module owner (the gate exists for the in-app button) |
| The DSpace apply is a set of non-transactional writes (like the RSB writers, `RSB-P-1`) | Same posture as RSB: the result stays Rejected/Editing until the CAS, so a retry repairs it |
| The KP reset could wipe the DSpace-owned evidence or the role-8 MQAP institutions | The reset excludes them explicitly; a test asserts both survive |
| Editing overwrite can discard in-PRMS edits to the payload-owned sections | Accepted by BR1. Recorded in history (`KPC-OQ-4`) |
| `RSB-R-23` (lead project required) and `RSB-R-13` (primary required) also apply to KPs | Kept; the Fetcher docs must say so |
| Concurrent sessions in other worktrees on `bilateral.service.ts` | Explicit pathspecs; specify on the branch the RSB code lives on (`performance-refactor` lineage) |

### Dependencies

- Fetcher change (AC 7) to forward `data.result_code` on `knowledge_product` payloads. Until it ships, only a direct `create` call can test this.
- DSpace / MQAP reachable from PRTest for the live run.

## 13. Success Criteria

| # | Criterion | Test |
|---|---|---|
| 1 | Rejected KP → `updated`, same `id`/`result_code`, Pending Review | `bilateral.service.spec.ts`, `bilateral-resubmission.service.spec.ts` |
| 2 | Editing KP → `updated`, status per `keep_editing` | both specs |
| 3 | Approved / Pending Review KP → 409 naming the status, nothing written | `bilateral.service.spec.ts` |
| 4 | Another platform → 403 | `bilateral.service.spec.ts` |
| 5 | Different handle → 409, nothing written | `bilateral-resubmission.service.spec.ts` |
| 6 | DSpace fetch failure → 502, nothing written | `bilateral-resubmission.service.spec.ts` |
| 7 | Payload title/description/geo ignored; DSpace values stored | `bilateral-resubmission.service.spec.ts` |
| 8 | History keeps the REJECT row, followed by `RESUBMIT` | `bilateral-resubmission.service.spec.ts` |
| 9 | KP via the `versioned` path → 409 | `bilateral.service.spec.ts` |
| 10 | Non-KP resubmission and versioning suites unchanged and green | scoped jest `--testPathPattern=bilateral` |
| 11 | Live run on PRTest with one Rejected and one Editing KP | task in `tasks.md` |

## 14. Next Step

```text
/akili-specify changes/bilateral-kp-correction
```

Approve the defaults for `KPC-OQ-1` … `KPC-OQ-4` first; `/akili-specify` fixes them as `KPC-R-*`.
