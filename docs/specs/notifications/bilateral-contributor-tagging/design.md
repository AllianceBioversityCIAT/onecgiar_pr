# Module Spec — Bilateral Contributor Tagging — Design

> **Answer first:** one pure resolver (project → owning Center code) becomes the single source for three consumers: derivation, notifications and the project catalog. The server derives owner Centers **after** projects are persisted, in both write paths, and never deactivates anything. The client learns each project's owner from one additive catalog field and locks those Centers. On Pending Review, one orchestrating call announces both the review request and the tagging. No migration.

## Document Control

| Field | Value |
|---|---|
| Requirements | `requirements.md` (BCT-R-1..R-12, BCT-NFR-1..7) |
| Proposal | `proposal.md` rev 2 |
| Depth | Standard (confirmed against the budget in §14) |
| Status | approved (Juan David, 2026-09-22) |
| Kaizen | `docs/specs/kaizen-log.md` absent, so no Active Lessons. Field lessons applied from session memory: the ingest create "fakes" a transaction; constructor changes break the specs that `new` services by hand |

## 1. Summary

- **What:** owner-Center derivation (form and ingest) plus Pending Review tagging notifications for bilateral results.
- **Shape:** server changes in `api/bilateral`, `api/notification` and `clarisa/clarisa-projects`; a client change in `pages/bilateral/components/section-contributors`; a change-log line in `bilateral-result-summaries.en.md`.
- **Accepted trade-off:** the server re-asserts derived Centers (D-2) on every save that carries the project list (§5.2 guard), so the form, which always sends both keys (BCT-P-1), cannot remove a Center while its project remains. A centers-only API `PATCH` can, until the next save that includes projects (BCT-R-3 as amended 2026-09-22).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| BCT-P-1 | The form always sends `contributing_center` and `contributing_bilateral_projects` together, and only once hydrated | `section-contributors.component.ts` `buildContributorsPayload` | Lines 430-433: both keys are assigned inside the same `if (this.contributorsHydrated())` | verified | Derivation after the projects sync still covers it (DD-2 does not depend on this) |
| BCT-P-2 | The lead Center is the `results_center` row with `is_leading_result = true`, and `syncContributingCenters` already folds it back in | `bilateral-center.service.ts` | Lines 1854-1876: `leadingRows` query, then `codesToKeep = [...centerCodes, ...leadingCodes]` | verified | Lead exclusion must read from the result's lead project instead |
| BCT-P-3 | Owner resolution is `organization_code → clarisa_center.institutionId → code`, else the W3 acronym alias | `result-tagged-notification.service.ts` | Lines 130-146 (`resolveProjectCenterCode`) | verified | — (this is what the extraction preserves) |
| BCT-P-4 | In ingest, the lead Center is persisted before the contributing Centers and projects | `bilateral.service.ts` | `handleLeadCenter` at :400, `handleNonPooledProject` at :471, `handleContributingCenters` at :486 | verified | Derivation would have to resolve the lead from the DTO |
| BCT-P-5 | Ingest writes are not truly transactional (`dataSource.transaction` enlists no repository) | Session memory "El create de bilateral finge transacción", plus the comment at :300-302 | Comment: "an unresolvable project thrown from inside would leave an orphan result" | verified (memory + code comment) | Derivation could run inside the transaction |
| BCT-P-6 | Both Pending Review announcements run post-commit | `bilateral-center.service.ts:2037-2043`; `bilateral.service.ts:531-539` | Both are called after the transaction closure | verified | Hooks would need moving |
| BCT-P-7 | The client renders `Result Bilateral Project Tagged` as `The result <link>` + `notification.text` | `notification-type.constants.ts:153-165` | Per the P2-3793 investigation | assumed (not re-opened in this session) | A client text case is needed; add a task |
| BCT-P-8 | `GET clarisa/projects/get/all` returns entity rows with `obj_organization`; an extra field is additive for its 7 client callers | `clarisa-projects.service.ts:12-32`; client grep | `find({ relations: { obj_organization: true } })`; callers in results, ipsr, bilateral, bilateral-review | verified | Use a bilateral-only endpoint instead (DD-4 alternative) |
| BCT-P-9 | `ResultTaggedNotificationService` and `BilateralService` are built with `new` in their specs | `result-tagged-notification.service.spec.ts:43`, `bilateral.service.spec.ts:148` | grep `new …(` | verified | — (tasks must update those constructors) |
| BCT-P-10 | `BilateralModule` imports `NotificationModule`, which exports `ResultTaggedNotificationService`, with no cycle | `bilateral.module.ts:90,161`; `notification.module.ts:33` | Import lines and module comment | verified | Use `forwardRef` |
| BCT-P-11 | `result_review_history.action` accepts `UPDATE` in every environment | DB per environment | Not checked | assumed | Submit fails; scenarios 4/6/7 never fire. Manual gate (requirements §9) |

## 2. Architecture Overview

### 2.1 Where this lives

| Unit | Location | Role |
|---|---|---|
| Owner resolver (pure) | `onecgiar-pr-server/src/api/bilateral/utils/project-owner-center.util.ts` (new) | Given a project and a preloaded center index, returns the owning Center (code + institutionId) or null |
| Derivation | `BilateralService.ensureDerivedContributingCenters(resultId, userId)` (new, public) | Reads the active non-lead projects and upserts owner Centers; never deactivates |
| Pending Review orchestration | `BilateralService.announcePendingReview(resultId, emitterUserId)` (new, public) | Calls the existing `emitBilateralSubmittedNotification`, then the new tagging emitter |
| Tagging emitter | `ResultTaggedNotificationService.notifyBilateralContributorsOnSubmission` (new) + `emitFor` lead-in | Builds targets (projects first) and emits |
| Catalog enrichment | `ClarisaProjectsService.findAll` | Adds `owner_center_institution_id` per project |
| Client lock | `SectionContributorsComponent` | Owner map, locked set, auto-select, disabled options |

### 2.2 Interaction

Form save (autosave):
`PATCH contributors` → `saveContributors` → `syncContributingCenters` (unchanged) → `syncContributingProjects` (unchanged) → **`ensureDerivedContributingCenters`** → response.

Ingest:
`POST create` → transaction closure: `handleLeadCenter` → `handleNonPooledProject` → `handleContributingCenters` → **`ensureDerivedContributingCenters`** → commit → **`announcePendingReview`** (replaces the direct `emitBilateralSubmittedNotification` call).

Submit:
`submitForReview` → transaction → **`announcePendingReview`** (replaces the direct call at :2040).

`announcePendingReview` → `emitBilateralSubmittedNotification` (unchanged, guards status 5) → `notifyBilateralContributorsOnSubmission` (guards status 5 and bilateral source itself), each wrapped so that a failure in one never skips the other or throws.

## 3. Data Model

- **Entities:** none changed. The spec reads and writes `results_center` (`result_id`, `center_id` = center code, `is_active`, `is_leading_result`, `is_primary`, `from_cgspace`) and reads `results_by_projects` (`result_id`, `project_id`, `is_active`, `is_lead`), `clarisa_projects` (`organizationCode`, `sourceCenterAcronym`, `shortName`) and `clarisa_center` (`code`, `institutionId`).
- **Derived rows:** created with `is_leading_result = false`, `is_primary = false`, `from_cgspace = false`, `is_active = true`. No origin marker (D-1 sticky, no migration, BCT-NFR-7).
- **Migrations:** none.
- **CLARISA:** relies on the W3 alias map for Alliance-descended projects. Accuracy against live data is a manual gate (requirements §9).

## 4. API Surface

| Endpoint | Change | Contract |
|---|---|---|
| `PATCH /api/bilateral/center/contributors/:resultId` | Response unchanged. Persisted Centers may now include derived owners | No shape change |
| `POST /api/bilateral/create` | Response unchanged. Stored `contributing_center` = sent ∪ derived | No shape change; change-log note (BCT-R-6) |
| `GET /api/bilateral/*` (read payloads) | `contributing_center` lists may be longer | No shape change |
| `GET clarisa/projects/get/all` | **Adds** `owner_center_institution_id: number \| null` per project | Additive; not part of the bilateral contract |

### 4.1 Bilateral contract impact

`bilateral-result-summaries.en.md` gains one change-log entry (date, P2-3793): "Ingest and the Center form derive the owning Center of each non-lead contributing project as a contributing Center. No field added, removed, or renamed." This satisfies AC-4 and ADR-004.

## 5. Server Workflow / Business Rules

### 5.1 Owner resolver (BCT-R-1, R-2, R-7)
- Input: a project (`organizationCode`, `sourceCenterAcronym`) and an index of Centers keyed by institutionId and by code, loaded **once** per call site (the table has about 15 rows, BCT-NFR-5).
- Output: `{ code, institutionId }` or null.
- Order: `organizationCode` → Center by institutionId; else the alias map by `sourceCenterAcronym` → Center by code; else null.
- This replaces the body of `ResultTaggedNotificationService.resolveProjectCenterCode`. It is a behavior-preserving extraction, and the existing spec is the proof (§10).

### 5.2 `ensureDerivedContributingCenters(resultId, userId)` (BCT-R-1..R-5)
1. Return unless the result exists with `source = Bilateral` (BCT-R-5).
2. Read the active `results_by_projects` rows where `is_lead` is falsy. If there are none, return.
3. Load those projects and the Center index; resolve each owner. For each unresolved one, log a warning with the result id and project id (BCT-NFR-6) and skip it.
4. Read the result's leading codes (`is_leading_result = true`) and drop them from the set (reporting-Center exclusion).
5. For each remaining code: if an active row exists, do nothing; if an inactive row exists, reactivate it (keeping `is_leading_result` false); if there is none, insert it.
6. **Never deactivate. Never call `updateCenter`.** This is what makes the empty-list trap (BCT-NFR-4) impossible from this path.
7. Wrap in try/catch: log and return. The caller's save continues (BCT-NFR-1).

Call sites:
- `saveContributors`: after the `sync*` calls, **only when `dto.contributing_bilateral_projects !== undefined`**, so a save that did not touch projects does not pay the lookup.
- Ingest: right after `handleContributingCenters` (`bilateral.service.ts:486`), inside the closure, like its siblings (BCT-P-5).

Effect on the form round-trip: if the client omitted a derived Center, `syncContributingCenters` deactivates it and step 5 reactivates it in the same request. The end state honors D-2 (BCT-R-3, second scenario).

### 5.3 `notifyBilateralContributorsOnSubmission(resultId, emitterUserId)` (BCT-R-7..R-11)
1. Load the result. Return unless `status_id === 5` and `source = Bilateral` (BCT-R-10).
2. Reporting Center: the leading `results_center` row → Center → institution `acronym || code`. If there is none, log and use the lead-in `reported by a CGIAR Center` (degraded, never blocking).
3. Project targets **first**: active non-lead `results_by_projects` rows → resolver → `{ centerCode, label: "<shortName ?? fullName ?? 'project <id>'> of your center (<acronym || code>)", type: RESULT_BILATERAL_PROJECT_TAGGED }`. Skip unresolved projects with a warning (AC38). Label amended by `changes/notification-tagged-center-name` (NTC-R-1/R-2).
4. Center targets: active `results_center` rows with `is_leading_result` falsy → `{ centerCode, label: <institution name ?? code>, type: RESULT_CENTER_TAGGED }`, with the same label rule `notifyTaggedCenters` uses.
5. `emitFor(resultId, emitterUserId, targets, leadIn)`.
6. try/catch: log and return.

### 5.4 `emitFor` lead-in (BCT-R-12)
- New optional last parameter `leadIn`. When absent, the text is exactly today's `created by ${programCode ?? 'a Science Program'}`, and the program code is only computed in that branch. The suffix template otherwise stays `${leadIn} has tagged the ${label}. Click to see the result.`
- Dedup (`getAlreadyNotifiedUserIds` + the in-loop set) and emitter exclusion (`emitResultNotification`) are unchanged. They provide BCT-R-9 and R-11, with target order supplying "project message first".

### 5.5 `announcePendingReview(resultId, emitterUserId)`
- Two independent try/catch blocks, in order: submitted → tagging. It never throws (BCT-NFR-1).
- `ResultTaggedNotificationService` is injected into `BilateralService` as an `@Optional()` trailing constructor parameter, mirroring `_notificationService` (`bilateral.service.ts:242-243`). If it is absent, tagging is skipped with a log.

## 6. Frontend Plan

### 6.1 Routes / modules
No change. The feature lives in `/bilateral/:center/result/:id` → `BilateralResultCreatorComponent` → `<app-section-contributors>`.

### 6.2 `SectionContributorsComponent` (BCT-R-1, R-3, R-4)
- `ProjectOption` gains `ownerCenterInstitutionId: number | null`, mapped from `owner_center_institution_id` in the catalog load (`:310-318`).
- New computed **locked set**: owners of the selected projects, excluding the lead project and excluding the lead Center institution id, and dropping nulls.
- `availableCentersComputed`: `disabled` = lead **or** in the locked set.
- `onProjectsChange`: after setting projects, union the locked set into `selectedCenterInstitutionIds`, then persist once (the current single persist call is kept).
- `onCentersChange` and `removeCenter`: re-add or refuse locked ids, exactly as the lead is handled today (`:702-709`, `:764-767`).
- Removing a project does not touch the Center selection (sticky, BCT-R-4). The lock lifts on its own, because the locked set is computed.
- Hydrate (`hydrateLeadAndSelection`): after the selection is restored, union the locked set in. **No network** (keep the existing contract). The server fills legacy results on their next save.
- Keep the `contributorsHydrated` guard. Nothing here may emit a payload before hydration (BCT-NFR-4).

### 6.3 Design system
It reuses the existing disabled-option state of the Centers multiselect (the same as the lead Center). No new tokens and no new strings, since the lock carries no copy.

### 6.4 Notification UX
No client change: the types, text rendering and routing exist (BCT-P-7).

## 7. Security & Authorization
No new endpoint or guard. Derivation runs under the caller's existing authorization for the Contributors save or the ingest. Logs carry ids only.

## 8. Performance & Capacity

| Path | Added cost |
|---|---|
| Contributors save touching projects | 1 query for non-lead projects + 1 for `clarisa_projects` `IN` + 1 for the Center index + 1 for leading rows + ≤ N upserts (N = derived owners, typically 0–3) |
| Ingest | Same, once per result |
| Submit / ingest announce | Existing `emitFor` cost × targets; targets = projects + Centers |
| Catalog `get/all` | +1 Center index query; O(projects) in-memory mapping |

## 9. Observability
Warnings: an unresolved project owner (result id, project id), a missing reporting Center, an emitter failure. No new metrics.

## 10. Testing Plan

| Layer | Spec | Cases |
|---|---|---|
| Resolver | new `project-owner-center.util.spec.ts` | org-code hit; org-code miss → alias hit; alias unknown → null; null org and null acronym → null |
| Notification | `result-tagged-notification.service.spec.ts` | **All existing cases unchanged and green** (R-12 proof); status ≠ 5 → no emit; projects-before-Centers order; label suffix; lead-in with acronym, and fallback to code; derived Center plus project → one notification; lead project skipped; lead Center skipped; unresolved project skipped while others emit; throw → swallowed |
| Derivation | `bilateral.service.spec.ts` | foreign owner inserted; inactive reactivated; active untouched; owner = lead skipped; lead project ignored; unresolved warns; never deactivates; pool funding source → no-op; throw swallowed |
| Form save | `bilateral-center.service.spec.ts` | derivation called only when projects are in the DTO; omitted derived Center ends active; `announcePendingReview` replaces the direct call in `submitForReview` |
| Ingest | `bilateral.service.spec.ts` | a Center sent and derived is not duplicated; derivation runs after `handleContributingCenters`; `announcePendingReview` post-commit; `keep_editing` → tagging no-op (status guard) |
| Catalog | `clarisa-projects.service.spec.ts` (create if absent) | field present; null when unresolved |
| Client | `section-contributors.component.spec.ts` | owner auto-selected on add; locked disabled; `removeCenter` refuses locked; project removal keeps the Center and unlocks it; hydrate unions without persisting; the lead project's owner is not locked |
| Types | `npx tsc --noEmit` (server) | The constructor changes compile in every spec |

## 11. Backwards Compatibility & Migration
- No migration, no payload shape change, one additive catalog field.
- Legacy results (projects without derived Centers) converge on their next Contributors save. There is no backfill (a backfill would be a data migration; see §13).
- Rollback: revert the commits. Derived rows written in the meantime are ordinary contributing Centers and stay valid.

## 12. Design Decisions

### BCT-DD-1 — One pure resolver, three consumers
- **Context:** owner resolution exists privately in the notification service, and a name-only variant exists in `BilateralProjectsService.resolveProjectLeadCenter`; this spec needs it in two more places.
- **Decision:** extract it into a pure function over a preloaded Center index; the notification service delegates to it.
- **Alternatives:** make the notification method public for bilateral to call (couples data writes to a notification service); a DI provider in `ClarisaProjectsModule` (module wiring and a constructor change in 3+ specs for no behavior gain); a third copy (drift).
- **Consequences:** the alias map stays single-sourced; `resolveProjectLeadCenter` is left as is (it returns name and acronym for creation, and is out of scope).

### BCT-DD-2 — Derive after persistence, from the DB, additively
- **Context:** the two paths identify projects differently (form: ids; ingest: `grant_title` resolved to a map).
- **Decision:** after projects are persisted, read the result's active non-lead project rows and upsert owners, never deactivating.
- **Alternatives:** fold owners into the DTO list before `syncContributingCenters` (form-only; ingest needs its own mapping; it touches the lead-folding code); client-only (misses ingest and null-org projects).
- **Consequences:** one code path for both; the form round-trip may deactivate and reactivate a derived row in one request (harmless; `last_updated_*` moves).
- **Reversion challenge (Step 2.3):** *what does taking away the caller's ability to remove a Center while its project remains break?* (a) Existing `bilateral-center.service.spec.ts` expectations on `saveContributors` could assert the exact persisted set. They are updated only where a foreign-owned project is in the fixture. (b) A caller that wants a project without its owner as contributor can no longer do it. That is accepted by D-2, and business-owned (Ángel informed via BCT-OQ-1). (c) The AI extraction path (`populateResultFromExtractedMds`) is not hooked, so it keeps today's behavior. No unaddressed breakage.

### BCT-DD-3 — The notification trigger lives in one orchestrator
- **Context:** two call sites must announce both the review request and the tagging.
- **Decision:** `BilateralService.announcePendingReview` replaces both direct `emitBilateralSubmittedNotification` calls.
- **Alternatives:** add a second call at each site (duplication; a third site would forget one); put the tagging call inside `emitBilateralSubmittedNotification` (mixes recipients; its early returns, such as "no owner initiative", would suppress tagging).
- **Consequences:** a failure in the submitted announcement cannot suppress tagging (independent try/catch).
- **Reversion challenge:** it removes the direct call and adds nothing that is taken away; the submitted announcement is preserved verbatim. N/A.

### BCT-DD-4 — The client learns ownership from the catalog, not from the save response
- **Context:** the lock must be correct on page load, before any save (BCT-R-3), and for null-`organization_code` projects.
- **Decision:** an additive `owner_center_institution_id` on `GET clarisa/projects/get/all`, computed with the DD-1 resolver.
- **Alternatives:** echo derived Centers on the save response (the lock is unknown until the first save and needs autosave plumbing; resolves BCT-OQ-2 worse); the client reads `obj_organization` (wrong for Alliance-descended projects); a client copy of the alias map (a second source of truth).
- **Consequences:** 7 client callers receive one extra field and ignore it. Resolves **BCT-OQ-2**.

### BCT-DD-5 — Projects before Centers; skip the lead project and the lead Center
- **Context:** after Part A, most project owners are also contributing Centers; one notification per user per result.
- **Decision:** order targets project-first; exclude `is_lead` projects and leading Center rows.
- **Alternatives:** Centers first (owners would get the generic text); notify both (breaks AC37).
- **Consequences:** a Center tagged by hand that also owns a project gets the project text. This matches BCT-R-9.

## 13. Open Gaps & Follow-ups
- BCT-P-7 is `assumed`. The first client check at the HITL pause confirms the text renders.
- BCT-P-11: `SHOW CREATE TABLE result_review_history` per environment before QA (Juan David).
- No backfill of derived Centers for existing results; decide separately if reports need it.
- BCT-OQ-1: tell Ángel that Part A goes beyond P2-3792.
- `resolveProjectLeadCenter` keeps its own lookup; unifying it is a follow-up, not this spec.

## 14. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 7 |
| LOC | ~420 production + ~480 tests ≈ 900 |
| Review rounds | 2 |

Standard depth is confirmed: two packages and two write paths, but no migration or contract change, so Full is not warranted. `/akili-execute` stops and escalates if it exceeds 9 tasks or ~1,200 LOC.
