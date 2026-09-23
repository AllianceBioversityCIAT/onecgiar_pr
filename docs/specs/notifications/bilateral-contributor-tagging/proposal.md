# Proposal — Bilateral Contributor Tagging (Owner-Center Derivation + Notifications)

> **In one line:** on a Center-authored bilateral result, (1) the owning Center of every non-lead contributing project becomes a contributing Center automatically, in both the form and the ingest API, and (2) when the result reaches **Pending Review**, every tagged Center and every project-owning Center is notified. No migration, no API contract shape change, and one small client change (locking the derived Centers in the selector).

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/notifications/bilateral-contributor-tagging/` |
| Slug | `bilateral-contributor-tagging`, derived from the ticket (the command was run with no argument) |
| Type | Change |
| Approval Mode | gated |
| Tickets | [P2-3793](https://cgiarmel.atlassian.net/browse/P2-3793) (technical sub-task) · parent US [P2-3792](https://cgiarmel.atlassian.net/browse/P2-3792) · epic [P2-3487](https://cgiarmel.atlassian.net/browse/P2-3487) |
| Base branch | `performance-refactor` (checked out at `d2ac12f9e`; the ticket was investigated at `0890f0a`, 9 commits behind, and the cited lines still match) |
| Depends on | none |
| Parallel-safe | yes. No migration, no API contract shape change |
| Scope revision | 2026-09-22, rev 2: Part A (owner-Center derivation) added by Juan David on top of the US; decisions D-1..D-5 below |
| Date | 2026-09-22 |
| Superseded in part | By `design.md`: **DD-2** derives owners *after* persistence from the DB (not by folding them into the DTO before `syncContributingCenters`); **DD-4** gives the client ownership through the projects catalog (no save-response echo). §5, §10 A1, §11 steps 2–4 and R-5 below are kept as the historical proposal |

## 2. Intent

A CGIAR Center reporting a bilateral result must be able to tell other Centers "you contributed to this" through the platform. The data must say so too: a Center whose project contributed to the result **is** a contributing Center of that result.

## 3. Problem / Current Behavior

| Flow | Tags a Center? | Project owner becomes a contributing Center? | Notifies? |
|---|---|---|---|
| Pool funding: SP saves Contributors and Partners (P25 V2) | yes | no | **yes**: `results_by_institutions.service.ts:492,730` |
| **Bilateral form: Center saves Contributors** (`/bilateral/:center/result/:id`) | yes | **no** | **no** |
| **Bilateral ingest `POST /api/bilateral/create`** | yes | **no** | **no** |

Evidence:
- **No notification.** `BilateralCenterService.saveContributors` (`bilateral-center.service.ts:1332`) calls `syncContributingCenters` / `syncContributingProjects` / `syncExternalPartners` / `syncContributingPrograms`, and none of them emits anything. The ingest path (`bilateral.service.ts:470-492`) doesn't either.
- **No owner derivation.** In the form, `onProjectsChange` (`section-contributors.component.ts:711-718`) only updates the project list. It is persisted through `bilateral-auto-save.service.ts:494` → `PATCH /api/bilateral/center/contributors/:resultId` → `syncBilateralProjects` (`results_by_projects.service.ts:76`), which writes `results_by_projects` only. In ingest, `handleNonPooledProject` (`:472`) and `handleContributingCenters` (`:486`) are independent, and the latter receives only `bilateralDto.contributing_center`.
- The only Center derived from a project today is the **lead** Center, from the lead project at creation (`bilateral-center.service.ts:465-477`, `resolveProjectLeadCenter`).

## 4. Proposed Outcome

### Part A — Owner-Center derivation (new, added by Juan David)

| Rule | Behavior |
|---|---|
| A-1 Add | When a non-lead project is added under `Contributing W3/bilateral projects`, its owning Center is added under `Contributing CGIAR centers`, if not already there. |
| A-2 Skip | If the owner is the result's lead Center, or cannot be resolved, nothing is added. An unresolvable owner produces a warning log only, and the save succeeds. |
| A-3 Lock | While any selected contributing project is owned by Center X, X is **disabled** in the Centers selector, the same pattern used today for the lead Center (`section-contributors.component.ts:88-96`, `702-709`). |
| A-4 Sticky | Removing the project **does not** remove X. X becomes unlocked and the user can remove it by hand. |
| A-5 Both paths | The rule applies to the form **and** to the ingest API. The server is authoritative: it merges owner Centers into the contributing Center set before persisting, in both paths. |
| A-6 Contract | Payload shapes are unchanged. Ingest may now store more `contributing_center` rows than the consumer sent. This is documented in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (change-log entry, behavior note only). |

### Part B — Notifications (US P2-3792, scenarios 6 and 7)

| # | Trigger | Recipients | Message |
|---|---|---|---|
| 6 | result reaches Pending Review (5), from submit or ingest | active Center Users of each non-lead contributing Center | `The result <code> - <title> reported by <reporting Center acronym> has tagged the <tagged Center name>. Click to see the result.` |
| 7 | same | active Center Users of the owner of each **non-lead** contributing project, including the reporting Center's other users (AC36) | `The result <code> - <title> reported by <reporting Center acronym> has tagged the <project name> of your center. Click to see the result.` |

Rules shared by both scenarios:
- The submitter is never notified (`notification.service.ts:73-75`).
- A user is notified at most once per result (`getAlreadyNotifiedUserIds` plus the in-loop set in `emitFor`), covering AC32 and AC37.
- Nothing is sent in Editing, Draft, or on an ingest with `keep_editing: true` (AC27, AC34).
- A notification failure never blocks the submit or the ingest (AC40).
- `user_notification_settings` is not consulted (AC41).

**Interaction between A and B:** after Part A, almost every scenario-7 owner is *also* a contributing Center. Since one notification is sent per user per result, the emitter processes **project targets first**, so the owner receives the more specific scenario-7 message (naming the project) and not a generic scenario-6 one. Centers tagged by hand with no project still get scenario 6.

## 5. Scope

| Part | Change |
|---|---|
| A: server | One owner-resolution helper shared by both paths (reusing `resolveProjectCenterCode` / `resolveProjectLeadCenter` and the W3 acronym fallback). The helper is merged into the Center list before `syncContributingCenters` (`bilateral-center.service.ts:1376`) and before `handleContributingCenters` (`bilateral.service.ts:486`). The save response returns the effective Center set. |
| A: client | `section-contributors`: derive the locked Center set from the selected projects, auto-select the derived Centers, and disable them in the selector. Reconcile with the server's effective set, because the catalog's `obj_organization` is null for Alliance-descended projects and only the server has the acronym fallback. |
| A: docs | Change-log entry in `bilateral-result-summaries.en.md`. |
| B: server | `ResultTaggedNotificationService.notifyBilateralContributorsOnSubmission(resultId, emitterUserId)`, plus an optional lead-in on `emitFor` (the default keeps the three existing callers byte-for-byte unchanged, AC42), hooked post-commit after `emitBilateralSubmittedNotification` in `bilateral-center.service.ts:2040` and `bilateral.service.ts:536`. |
| Tests | Server: `result-tagged-notification.service.spec.ts`, `bilateral-center.service.spec.ts`, bilateral ingest spec. Client: `section-contributors.component.spec.ts`. |
| QA | Regression of scenarios 1–5 only. No code changes there. |

## 6. Non-Goals

- Removing a derived Center automatically when its project is removed (D-1: sticky).
- Tracking whether a Center was added by hand or derived. No new column, no migration.
- Notifying on the Contributors **save** (AC27, AC34).
- New notification types, email delivery, settings, and list filters.
- Applying the rule to pool funding (P25 Contributors and Partners) or to AI extraction (`populateResultFromExtractedMds`, `bilateral.service.ts:4544`).
- The known limitations recorded in the US: primary-SP reassignment, the legacy V1 partners endpoint, and no retraction.

## 7. Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| Server: notification | `api/notification/services/result-tagged-notification.service.ts` (+ spec) |
| Server: bilateral | `api/bilateral/services/bilateral-center.service.ts`, `api/bilateral/bilateral.service.ts`, `api/bilateral/services/bilateral-projects.service.ts` (+ specs); `api/bilateral/bilateral.module.ts` if the tagged-notification service has to be injected |
| Client | `pages/bilateral/components/section-contributors/` (+ spec; read its `CLAUDE.md` first: an empty `contributing_center` array is **not** "no change", since `syncContributingCenters` deactivates every row) |
| Data | `results_center` (`is_active`, `is_leading_result`), `results_by_projects` (`is_active`, `is_lead`), `clarisa_projects.organization_code` / `sourceCenterAcronym` |
| Docs | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (change log) |
| Users | Reporting Center users (form), ingest consumers (the Bulk Uploader partner among them), Center Users of tagged or owning Centers |
| Related specs | `docs/specs/notifications/`, `docs/specs/notifications/bilateral-review-decision/` (NFR-1) |
| Baseline | PRD AC-4 (bilateral stability: behavior documented, shape unchanged), AC-8 · TRD W4, `trd.md:324` · ADR-004 (additive only: satisfied, since no field changes) |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: the only visual change is a derived Center shown as **selected and disabled** in `Contributing CGIAR centers`, reusing the existing lead-Center disabled state. No mockup needed.

## 9. Requirement Delta Preview

### ADDED Requirements

- The owning Center of each non-lead contributing project is persisted as a contributing Center (form and ingest), except when it is the lead Center or cannot be resolved.
- Derived Centers are locked in the selector while any project they own is selected.
- On the transition to Pending Review, emit `Result Bilateral Project Tagged` for the owners of non-lead contributing projects, then `Result Center Tagged` for non-lead contributing Centers, one notification per user per result.
- The tagging text for Center-authored results reads `reported by <acronym || code>`; project labels append ` of your center`.

### MODIFIED Requirements

- Ingest `contributing_center` is now the union of the sent Centers and the derived owners (shape unchanged).
- `emitFor` accepts a caller-supplied lead-in. Existing callers keep `created by <SP code | a Science Program>`.

### REMOVED Requirements

- none

## 10. Approach Options (Part A: where the derivation lives)

| Option | How | Pros | Cons |
|---|---|---|---|
| **A1. Server-authoritative + client mirror (recommended)** | The server merges owners before persisting in both paths; the client locks and auto-selects them, reconciling from the save response | One rule for form and API; covers projects whose owner is only resolvable server-side (W3 acronym fallback); the client cannot drift from the data | Touches both packages; the client needs the effective Center set back from the save |
| A2. Client-only | `onProjectsChange` adds `obj_organization` to the Center selection | Smallest diff | Does not cover the API (violates D-3); misses Alliance-descended projects whose `organization_code` is null |
| A3. Server-only | Merge on the server, no client change | No client diff | The UI shows the Center missing until reload, and the next autosave sends a list without it (the merge re-adds it, but the screen lies); no lock (violates D-2) |

Part B keeps the option already agreed: **emit on submission** (the save-time and new-type alternatives were rejected in rev 1: AC27/AC34, plus a seed migration and client work).

## 11. Recommended Approach

**A1 + emit-on-submission.**

1. **Owner resolution (shared):** `projectId → owning Center code` via `clarisa_projects.organization_code → clarisa_center`, falling back to `W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE[sourceCenterAcronym]`. This is the same logic as `resolveProjectCenterCode` (`result-tagged-notification.service.ts:130-146`), so it moves to one shared helper instead of a third copy.
2. **Form save:** in `saveContributors`, when `contributing_bilateral_projects` is present, union the owners of the non-lead projects into `contributing_center` before `syncContributingCenters`. Return the effective Center set.
3. **Ingest:** same union before `handleContributingCenters` (`bilateral.service.ts:486`), using the already-resolved projects.
4. **Client:** a `lockedCenterIds` computed from the selected projects plus the server echo; auto-select on add; disable in `availableCentersComputed`; never auto-remove.
5. **Notify on Pending Review:** guard `status_id === 5`; targets are non-lead projects' owners (project label + ` of your center`) **first**, then non-lead Centers; lead-in `reported by <lead acronym || code>`; try/catch and never throw.

## 12. Decisions And Open Items

| ID | Item | Status |
|---|---|---|
| D-1 | Removing the project leaves the derived Center in place (sticky) | Decided, Juan David, 2026-09-22 |
| D-2 | A derived Center is locked while its project is selected | Decided, Juan David, 2026-09-22 |
| D-3 | The rule applies to the ingest API too; no contract change; documented | Decided, Juan David, 2026-09-22 |
| D-4 | Scenario-7 text follows AC35 (`… of your center`) | Decided (delegated), 2026-09-22 |
| D-5 | Reporting Center shown by acronym (`acronym \|\| code`) | Decided, Juan David, 2026-09-22 |
| D-6 | The lead project is excluded from scenario-7 targets (its owner is the reporting Center; notifying its colleagues about their own lead project is noise) | Proposed, confirm at specify |
| R-1 | **Scope beyond the US:** Part A is not in P2-3792. Tell Ángel so QA tests it and the story is not closed without it. | Open, Juan David |
| R-2 | With Part A, a Center manually removed while its project remains gets re-added by the server. This is intended (D-2), but a direct API caller may be surprised. | Accepted |
| R-3 | Dedup has no phase or status filter; users already notified by an SP tag on the same result are not re-notified (one-per-result rule). | Accepted, state to QA |
| R-4 | `submitForReview` writes `ReviewActionEnum.UPDATE`. If `result_review_history.action` is still `enum('APPROVE','REJECT')` somewhere, the submit fails and scenarios 4/6/7 never fire. Run `SHOW CREATE TABLE result_review_history` per environment before QA. | Open, Juan David |
| R-5 | The client autosave does not currently consume an effective Center set from `PATCH contributors`; specify must confirm how the response reaches `section-contributors`. | Open, specify |
| R-6 | `section-contributors/CLAUDE.md` trap: `contributing_center: []` wipes every row, the lead included. The client union must never produce an early empty list. | Constraint |
| R-7 | Jira: due date missing on P2-3793. | Open, Juan David |

No Active Lessons: `docs/specs/kaizen-log.md` does not exist.

## 13. Success Criteria

- Form: adding a CIP-owned project to an AfricaRice result selects CIP under `Contributing CGIAR centers`, disabled. Removing the project leaves CIP selected and enabled. Adding an AfricaRice-owned project adds nothing.
- Ingest: a payload with a CIP-owned contributing project and no `contributing_center` stores CIP as a contributing Center. The response and read payload shapes are unchanged.
- AC27–AC42 of P2-3792 pass. With Part A, CIP users receive **one** notification, with the scenario-7 text naming the project.
- Existing `result-tagged-notification.service.spec.ts` cases pass unchanged (pool funding text intact).
- No migration.

## 14. Next Step

```text
/akili-specify notifications/bilateral-contributor-tagging
```

Confirm D-6 at specify time. R-5 is the first thing specify has to settle in `design.md`.
