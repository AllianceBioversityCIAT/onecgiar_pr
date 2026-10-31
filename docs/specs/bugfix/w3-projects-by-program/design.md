# Design — W3/bilateral projects by program (`bugfix/w3-projects-by-program`)

## 1. Document Control

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements | [`requirements.md`](./requirements.md) |
| Approval Mode | `gated` |
| Budget (tripwire for `/akili-execute`) | **3 tasks** (2 code + 1 manual) · **~180 LOC** incl. tests (server ~110, client ~70) · **≤ 2 review rounds** per task |

## 2. Executive Summary

The server merges a second source into the existing endpoint; the client changes two template conditions and adds one error state. No migration, no new endpoint, no response-shape change.

## 3. Architecture Overview

```
client loadBilateralProjectsByProgram()  (unchanged)
  → GET bilateral-projects/by-program?programId=SP09
     getBilateralProjectsByScienceProgram()          results-framework-reporting.service.ts:1345
       ├─ ToC source     findBilateralProjectsByProgramOfficialCode(code, phaseUuid)   (unchanged)
       ├─ CLARISA source findApprovedProjectsByProgramCode(code, phaseYear)            (NEW)
       └─ merge: ToC rows, then CLARISA rows, dedupe by project_id (existing seenProjectIds)
```

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` | + `findApprovedProjectsByProgramCode` |
| `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts` | + spec (create if absent) |
| `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` | merge in `getBilateralProjectsByScienceProgram` |
| `…/results-framework-reporting.service.spec.ts` | `describe('getBilateralProjectsByScienceProgram (P2-3001)')` updated + new cases |
| `onecgiar-pr-client/…/rd-contributors-and-partners/rd-contributors-and-partners.component.{ts,html}` | error + Retry, banner gate |
| `…/rd-contributors-and-partners.zoneless.spec.ts` (real template) | new cases |
| `…/rd-contributors-and-partners/CLAUDE.md` | doc + `Verified:` stamp (client convention) |

## 5. Data Model

No change. Reads `clarisa_projects`, `clarisa_project_mappings`, `clarisa_institutions`, `version.phase_year`.

## 6. API Design

`GET /api/results-framework-reporting/bilateral-projects/by-program?programId=` — same path, auth and envelope. Row keys produced by the CLARISA source mirror the ToC query (`project_id`, `project_name`, `project_summary` = null, `organization_code`, `organization_id`, `organization_name`, `organization_acronym`, `organization_website_link`; `toc_result_id`/`official_code` = null or the program code). Swagger description updated to say "ToC-linked plus CLARISA-approved".

## 7. Backend Module Design

- **New repository method** `findApprovedProjectsByProgramCode(programCode, phaseYear)`: raw bound SQL over `clarisa_projects ⨝ clarisa_project_mappings ⟕ clarisa_institutions`, filters `TRIM(program_code) = ?`, `allocation > 0`, `BINARY TRIM(status) IN (?)` with `APPROVED_MAPPING_STATUSES`, `cp.phase = ?`, `cp.is_active` null or ≠ 0; `DISTINCT` per project; ordered by `full_name`. Errors through `_handlersError.returnErrorRepository` like its siblings.
- **Phase year**: `resolve()` already gives `versionId`; the service obtains the year through the existing private `resolveReportingVersion(versionId)` (`service.ts:1275`). If the year cannot be resolved, the CLARISA source is skipped (ToC-only, today's behaviour) — never a 500.
- **Merge**: the existing `seenProjectIds` filter runs over `[...tocRows, ...clarisaRows]`, so ToC order wins and invalid ids are still dropped.

## 8. Frontend / UX Component Architecture

- **WPP-R-2**: component signal `centersLoadFailed`, set when the `centersSE.getData()` call in `ngOnInit` rejects or resolves with an empty list; cleared on success. Rendered above the centres block as `app-alert-status` (status `error`, existing component) + a `brandSoft`/outline Retry button (existing button primitive) that re-calls `getData()`. Copy is a plain string in the component, matching this file's sibling notes.
- **WPP-R-3**: the `noCentersNote` block (`html` ~L124-129, `@else` of `hasReferenceCenters()`) is wrapped in `@if (planned_result === true)`. The flat/other dropdown visibility (`html` ~L184-200) is untouched.

## 9. Shared Contracts

None. `APPROVED_MAPPING_STATUSES` is reused, not copied.

## 10. Design Decisions

| ID | Decision | Rejected alternative |
|---|---|---|
| WPP-DD-1 | Union ToC + CLARISA, ToC first (proposal option 1) | CLARISA-only (drops ToC-only projects); fallback-on-empty (two rules) |
| WPP-DD-2 | Reuse P2-3313's approval rule so the list equals what Portfolio Overview counts | A looser rule (any mapping) — would disagree with the Overview |
| WPP-DD-3 | Year unresolved → ToC-only, not error | Throwing — would turn a lookup gap into a blocked section |
| WPP-DD-4 | No ToC marker in the UI (OQ-1) | Badge — needs a client change and a PO decision |
| WPP-DD-5 | Hide the banner when unanswered (OQ-2); dropdown stays | Reworded hint — extra copy decision |

**Reversion challenge (Step 2.3)** — WPP-DD-5 removes the banner in the "unanswered" state. *What does removing it break?* Nothing functional: the note is informational, the required dropdown and its `appFeedbackValidation` marker are in a separate block and still render, so "N fields missing" is unaffected. No other code reads `noCentersNote` in the template. Accepted.

**Sizing (Step 2.4)**: 2 code tasks, ~180 LOC, ≤2 rounds — matches Lite.
