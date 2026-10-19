# Design — Let Centers pick the 2026 project and P/A on replicated innovations

## 1. Summary

| Field | Value |
|---|---|
| Spec | `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` (`PAA`) |
| Depth | Standard (compact) |
| Status | approved (2026-10-16) |
| Approval Mode | `gated` |
| Date | 2026-10-16 |
| Requirements | `requirements.md` PAA-R-1..R-6 |

**In one line:** open the existing Section 0 project + P/A picker in the no-lead-project state, harden how the loaded lead project gets its Programs, and change one helper line in Contributors. Client only. No API, DB or payload change.

**Budget (tripwire for `/akili-execute`):**

| Measure | Expected |
|---|---|
| Tasks | 4 (3 code + 1 HITL verification) |
| Production LOC | ~90 (template ~45, component ~10, creation service ~15, copy ~10, folder `CLAUDE.md` ~10) |
| Test LOC | ~180 |
| Review rounds | 1 per code task (2 max on T-1) |

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| P-1 | The assignment save inserts the lead `results_by_projects` row when none exists | `bilateral-center.service.ts` `updatePrimaryAssignment` transaction (`if (!existingTargetProject) projectRepository.save({... is_lead: true ...})`) | Read 2026-10-16 | ✅ | Server joins scope |
| P-2 | A P/A change through the assignment save is a direct transfer (no acceptance round) | Same method, branch `changed` → `transferPrimary` ("confirmed by product 2026-10-07") | Read 2026-10-16 | ✅ | Copy would need a "pending" mention |
| P-3 | Section 0 hides the picker when there is no lead project | `section-zero-dashboard.component.html` `@else` → `bp-empty-hint` "No project linked" | Read 2026-10-16 | ✅ | — |
| P-4 | The picker's state (`pendingProject`, `assignmentProject`, `availablePrimaryPrograms`, `assignmentPrimary`, `requiresPrimarySelection`, `saveAssignment`) already works with `selectedProject() == null` | `section-zero-dashboard.component.ts` L177-330 | Read: every computed falls back on `pendingProject()`; `onProjectCandidate` nulls the P/A for a multi-Program project because ids differ from `undefined` | ✅ (by reading) | T-1 tests catch it |
| P-5 | The lead project loaded with the result gets its Programs only if the catalogue response arrives **after** `loadResult` sets it | `bilateral-creation.service.ts` `getProjects` (enriches the selected project) vs `loadResult` (sets `sciencePrograms: []`) | Read 2026-10-16 | ✅ race exists | Group A picker empty → DD-3 |
| P-6 | `app-bilateral-project-selector` loads the shell Center's catalogue (`ctx.centerInstitutionId`) on construction | `bilateral-project-selector.component.ts` constructor effect | Read | ✅ | — |
| P-7 | No client completeness rule needs a lead project | `bilateral-mds-tracker.service.ts` (no "project") | grep 2026-10-16 | ✅ | R-3 at risk |

## 2. Architecture Overview

### 2.1 Where this lives in the system

`pages/bilateral/pages/bilateral-result-creator` hosts `section-zero-dashboard` (Section 0) and `section-contributors`. Section 0 is the **only** writer of lead project + P/A (P2-3283), and it writes through `BilateralApiService.PATCH_primaryAssignment` → `PATCH /api/bilateral/center/primary-assignment/:resultId`. This spec adds no new writer.

### 2.2 Interaction

1. The user opens result 27270 (no lead project, editable).
2. Section 0 renders the **no-project assignment block**: project selector (inline, deferred commit) + Program field + actions.
3. The selector constructs, loads the Center catalogue and lists the projects.
4. The user picks a project → `onProjectCandidate` sets the pending project. With one Program it is preselected; with several the save stays disabled until a Program is chosen.
5. Save → `saveAssignment` → PATCH (project_id, primary_science_program_id) → server inserts the lead row + transfers the P/A → client `applyPrimaryAssignment` + `loadResult`.
6. Section 0 switches to the normal "project linked" branch; the ToC section shows the default block (BIL-TOC) or the Yes/No question.

## 3. Data Model Changes

None. No entity, migration or CLARISA change.

## 4. API Surface

None changed. Reused: `PATCH /api/bilateral/center/primary-assignment/:resultId`, `GET /api/bilateral/center/projects`. `bilateral-result-summaries.en.md` untouched (no payload change).

## 5. Server Workflow / Business Rules

Unchanged. Authority stays server-side: lead-Center catalogue membership, positive confirmed allocation, alignment (P-7), Center permission / admin, editable status (Editing, Draft, Rejected).

## 6. Frontend Plan

### 6.1 Routes / modules
No change.

### 6.2 Components & services

| File | Change | Req |
|---|---|---|
| `section-zero-dashboard.component.html` | Extract the Program field + assignment actions of the linked-project branch into `ng-template`s (DD-1: `#programField` + `#assignmentActions`). In the final `@else`: when `canEditAssignment()` and a result is loaded, render a no-project block with the project selector + those templates + the R-6 hint; otherwise keep "No project linked" / "Select a project to begin" | R-1, R-2, R-3, R-6 |
| `section-zero-dashboard.component.ts` | Expose the R-6 copy. No logic change expected (P-4); if a test shows `assignmentPrimary` falling back to the 2025 P/A as a *selected* value for a different project, show it only as "current" and keep `requiresPrimarySelection` authoritative | R-2 |
| `bilateral-creation.service.ts` | `loadResult`: when the catalogue is **already** loaded and contains the lead project, hydrate `sciencePrograms` (and the rest of the catalogue entry) from it instead of `[]` (DD-3) | R-4 |
| `bilateral-project-selector.component.ts` | `inline` variant: catalogue keyed by `resultLeadCenterCode()` when known, else `ctx.centerInstitutionId()` (DD-6) | R-7 |
| `section-contributors.component.html` | Replace the helper "Assigned from the project's mapping; it cannot be changed here." with copy pointing to Project information | R-5 |
| `internationalization/bilateral-primary-assignment.copy.ts` | Add `contributorsPrimaryHelp` and `noProjectLinkHint` | R-5, R-6 |
| `section-zero-dashboard/CLAUDE.md`, `section-contributors/CLAUDE.md` | Document the new branch + copy; re-stamp `Verified:` | convention |

### 6.3 Design system usage
- Reuse `app-bilateral-project-selector variant="inline" [deferCommit]="true"`, the existing `.bp-primary-selector` picker and `.bp-assignment-actions`. No new tokens, classes or Spartan components. The R-6 hint reuses `bp-primary-help`.
- Proposed copy (final wording is owner-editable):
  - R-5: "Change the primary Science Program in Project information, above."
  - R-6: "No 2026 project linked. Link one of your Center's projects to show its default Theory of Change linkage. Optional."

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization

No change. The picker renders only under `canEditAssignment()` (= not `readOnly()`, which already folds in status + lead-Center membership + admin). The server re-checks everything. No logging added (`.cursorrules`).

## 8. Performance & Capacity

The selector's catalogue call already happens whenever a linked-project result is editable; the no-project case adds the same single call. Negligible.

## 9. Observability

None new. Server already logs the transfer with ids only.

## 10. Testing Plan

| Layer | What | Command |
|---|---|---|
| Jest, `section-zero-dashboard` | No-project + editable → selector rendered, "No project linked" absent; read-only → text present, no selector/save; pick 1-Program project → save enabled, PATCH args; pick 2-Program project → save disabled, no PATCH; PATCH error → error text, no linked project; untouched → 0 PATCH calls; R-6 hint text | `npx jest --maxWorkers=2 --testPathPattern=section-zero-dashboard --silent --reporters=summary --no-coverage` |
| Jest, `bilateral-creation.service` | Catalogue loaded **before** `loadResult` → lead project carries catalogue `sciencePrograms`; catalogue after → unchanged behaviour; lead not in catalogue → `[]` (no crash) | `--testPathPattern=bilateral-creation.service` |
| Jest, `section-contributors` | Helper shows new copy; no "cannot be changed here" | `--testPathPattern=section-contributors` |
| Lint | Touched files | `npx eslint <files> --quiet` |
| Build | Template type-check (`tsc` does not check templates) | `npm run build:dev` (once, at the end, nothing else running) |
| HITL | 27270 (group B) and 28073 (group A) in the browser: open pickers only; the owner runs the save on a designated result (`PAA-OQ-5`) | manual |

## 11. Backwards Compatibility & Migration Plan

Additive UI. Results with a lead project render identically (the extracted template is the same markup). Rollback = revert the commit; no data written by the change itself (only by users through an endpoint that already exists).

## 12. Design Decisions (ADRs)

### `PAA-DD-1` — Shared templates for the Program field + actions
- **Decision:** move the Program picker + assignment actions block of the linked-project branch into an `ng-template` and render it from both branches.
- **Why:** duplicating ~60 lines of picker markup in the no-project branch would fork the RRC single-allocation chip, the declined suffix, `primaryPickerDisabled` and the error/save block. One copy keeps them in step.
- **Amended in execute (PAA-T-1, 2026-10-16):** two templates (`#programField`, `#assignmentActions`) instead of one, because in the linked branch the Contribution field sits between the Program field and the actions (the `<dl>` closes after Contribution); a single template would have moved that DOM. Same intent: one copy of each block, no fork.
- **Rejected:** (a) entering the linked branch with a fake project (it reads `project.summary`, `leadCenter`, etc. → empty fields shown); (b) duplicating markup.

### `PAA-DD-2` — Same rules for every editable bilateral result with no lead project
- **Decision:** the block shows for any editable bilateral result with no lead project, not only replicated innovations (`PAA-OQ-3` recommendation).
- **Why:** it is the same empty state; restricting it adds a condition (`is_replicated`, type) with no product value, and manual or API results with no lead are rare (LPC: every API-ingested result has a lead row).

### `PAA-DD-3` — Hydrate the lead project from an already-loaded catalogue
- **Decision:** in `loadResult`, if `projects()` already holds the lead project, use that entry (with its `sciencePrograms`) instead of an empty `sciencePrograms` list.
- **Why:** P-5. Today correctness depends on the catalogue response arriving after the detail response. When it arrives first (selector constructed earlier, Center catalogue reused across results), the group A picker shows no Programs and "This project has no alternative Primary Science Program", which is exactly the R-4 failure.
- **Rejected:** forcing a catalogue re-fetch on every `loadResult` (extra call per result, still racy).

### `PAA-DD-4` — Replace the "No project linked" empty state when editable (reversion)
- **Decision:** in the editable state, the static text is replaced by the picker block. Read-only and "no result yet" keep their texts.
- **Step 2.3 challenge, "what does removing this break?":**
  1. Existing Jest specs that assert "No project linked" for an editable result would fail → T-1 updates them to the read-only case, which keeps the text.
  2. The Center shell catalogue may differ from the result's lead Center (an admin on another Center's page) → the save is rejected server-side and the generic error shows (R-2 S3). Accepted at Phase 2; **superseded by DD-6 (2026-10-16)**: the picker now lists the lead Center catalogue.
  3. The create wizard ("Select a project to begin", no `currentResultId`) → untouched by the condition.
  - Outcome: no unaddressed breakage.

### `PAA-DD-6` — Picker catalogue = result's lead Center (added in execute, 2026-10-16)
- **Decision:** in the `inline` variant (Section 0 of an existing result), `app-bilateral-project-selector` requests `GET /api/bilateral/center/projects?centerId=<resultLeadCenterCode>` when `BilateralCreationService.resultLeadCenterCode()` is known; otherwise (create wizard, or code not yet loaded) it keeps `ctx.centerInstitutionId()`.
- **Why:** the server validates the save against `getProjectsByCenter(leadCenter.code)` (`bilateral-center.service.ts` `updatePrimaryAssignment`), and `getProjectsByCenter` accepts the code (numeric lookup first, then by code). `resultLeadCenterCode` is read from the same lead `results_center` row (`contributingCenters[is_leading_result=1].code`). Same source on both sides → the list shows exactly what the save accepts. Fixes the two-Alliance case (`CIAT (Alliance)` / `Bioversity (Alliance)`) and any admin opening a result from another Center page.
- **Reversion challenge ("what does removing the page-Center source break?"):** (1) the create wizard has no loaded result → keeps the page Center (variant `wizard` untouched). (2) `projects()` is a shared signal; in the normal flow lead Center = page Center, so the list is identical; it differs only in the cross-Center case, where the page-Center list was the wrong one. (3) Contributors' project multi-select reads its own catalogue (Center pills, P2-3859), not this call. Outcome: no unaddressed breakage.
- Supersedes `PAA-P-2` and the DD-4 point 2 acceptance.

### `PAA-DD-5` — Contributors helper copy (reversion of a shipped string)
- **Decision:** replace "Assigned from the project's mapping; it cannot be changed here." with the pointer copy.
- **Challenge:** specs asserting the old string would break (lesson from memory *Run client tests before commit*: editing asserted copy broke 4 specs). → T-2 greps every `*.spec.ts` and `*.cy.ts` for the old string and updates them in the same task.

## 13. Open Gaps & Follow-ups

- `PAA-OQ-2` (P/A without a project): out of scope; confirm with Nicoleta.
- `PAA-OQ-4` (28634): data check, not code.
- The "Lead Center" field in Section 0 comes from the project; with no project it is not shown. Not requested; left as is.
- Debt: versioning does not replicate `results_by_projects` (separate spec).

## Required cross-references
`requirements.md` · `proposal.md` · `../family.md` · `section-zero-dashboard/CLAUDE.md` · archive BIL-TOC, LPC · `docs/ux-ui/design.md` §8
