# section-zero-dashboard (bilateral)

**Verified:** 2026-09-02 · branch performance-refactor · 2de8884cd

## What it is
Section 0 of the bilateral form: the read-mostly card that identifies the result (code, type,
reporting phase, funding source) and its W3/Bilateral project, plus the Actions column that owns
**Submit for Review**. It is the only section that is not inside an accordion.

## Contract
- Inputs: `isSubmitting` (Submit request in flight), `readOnly` (`isFormReadOnly()` of the editor).
- Output: `submitRequested` — the editor runs the actual PATCH.
- State: `BilateralCreationService` owns every value on screen; `BilateralMdsTrackerService`
  owns `overallStatus()`, which gates Submit.
- `BilateralAutoSaveService` is injected for the project change only. It is provided **by the editor
  component**, so this card cannot be mounted outside `bilateral-result-creator` without providing it.
- Editable project field (P2-3518): `canChangeProject()` = `!readOnly()` **and**
  `creationService.isEditableByCenterUser()` **and** `currentResultId() != null`. When true the
  `Project` value renders `<app-bilateral-project-selector variant="inline">`; when false it stays
  plain text.
- Persistence of that change: `PATCH api/bilateral/center/contributors/:resultId` via
  `autoSave.saveContributors({ contributing_bilateral_projects })`. **No dedicated endpoint exists or
  is needed** — the server's `syncContributingProjects` (`bilateral-center.service.ts:863-918`)
  already owns `is_lead`.

## Where it is used
- `pages/bilateral-result-creator/bilateral-result-creator.component.html:210` — the only host.

## Children without their own file
| Component | What it does | Trap |
|---|---|---|
| `bilateral-project-selector/` (`variant="inline"`) | The W3 project picker, embedded in the `Project` field | `inline` drops the label and the summary/description block (this card renders both) **and** calls `setLeadProject()` instead of `selectProject()` |

## Traps (⚠️ = already broke something)
- ⚠️ **`selectProject()` is the create wizard's entry point and clears `selectedPrimarySp` /
  `selectedSecondarySps`.** Calling it from an existing result blanks the Science Program the result
  already reports against. `setLeadProject()` exists for exactly that reason — use it, and never
  swap it back.
- ⚠️ **`contributing_bilateral_projects` is a SYNC-REPLACE.** `syncBilateralProjects`
  (`results_by_projects.service.ts:76-148`) deactivates every linked project missing from the
  payload, and `syncContributingProjects` clears `is_lead` on every active row before raising the
  flagged ids. So the payload must carry the **whole** list with **exactly one** `is_lead: true` —
  that is what `BilateralCreationService.leadProjectSyncPayload()` builds. An empty array unlinks
  the lead project and the result can never be submitted again.
- ⚠️ **`section-contributors` derives its own `readonlyLeadProjectId` from
  `creationService.selectedProject()`** and re-hydrates whenever it changes, so a project change here
  propagates to the next contributors autosave. It only re-derives if the new project is present in
  its `GET_ClarisaProjects()` catalogue; if it is not, that section keeps the **old** lead id and its
  next save would re-point `is_lead` back. Not reachable today (the picker lists CLARISA projects of
  the same centre), but this is the coupling to check first if the lead link ever flips back.
- The lead **centre** is deliberately NOT touched by a project change. The picker only lists projects
  of the user's own centre, so in practice the centre does not move; persisting a centre change would
  go through `contributing_center`, which deactivates the `is_leading_result` row when sent empty
  (see `section-contributors/CLAUDE.md`).
- Submit is gated on `overallStatus() === 'complete' || isSubmitting() || readOnly()` — three
  conditions, and the read-only one is the P2-3520 lock.
- Every spec assertion about the project field reads the **rendered DOM** on purpose: the client runs
  zoneless, so asserting a class property passes with the defect still on screen.

## Pending / Coming soon
- `Generate Narrative`, `Download PDF`, `AI Review` — visible but disabled, per the mockup.
- **Out of scope of P2-3518, deliberately not built:**
  - the consequence of a project change on the **Science Program** (the ticket's own requirements
    contradict each other; pending business). Today the Science Program is left exactly as it was.
  - **re-pointing the Theory of Change** after a project change — ToC is Juan David's domain.
