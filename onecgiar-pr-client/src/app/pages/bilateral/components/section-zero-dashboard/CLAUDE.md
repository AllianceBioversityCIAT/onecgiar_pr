# section-zero-dashboard (bilateral)

**Verified:** 2026-09-05 · branch performance-refactor (primary project no longer editable; Submit lives in the rail)

## What it is
Section 0 of the bilateral form: the read-mostly card that identifies the result (code, type,
reporting phase, funding source) and its W3/Bilateral project, single-column since 2026-09-04.
It is the only section that is not inside an accordion.
**The Actions card is GONE (2026-09-04)** — Submit for review lives in the editor's sections rail
(`bilateral-result-creator`, `.bcr-rail__submit`, same slot as the W1/W2 result-detail rail) and the
disabled Coming-soon buttons (Generate Narrative / Download PDF / AI Review) were removed with the
card; bring it back only when one of those actions actually ships.

## Contract
- Input: `readOnly` (`isFormReadOnly()` of the editor) — kept for parity with the other sections;
  nothing in this card writes anymore.
- State: `BilateralCreationService` owns every value on screen. This card is **read-only, full stop**.

## Where it is used
- `pages/bilateral-result-creator/bilateral-result-creator.component.html:210` — the only host.

## Traps (⚠️ = already broke something)
- 🛑 **The primary W3/Bilateral project is NOT editable — decision, not omission (2026-09-05,
  Juan David).** This reverses the P2-3518 inline picker (`<app-bilateral-project-selector
  variant="inline">` + `canChangeProject()` + `onProjectChanged()` saving
  `leadProjectSyncPayload()`): the project is the result's identity, so a draft created against the
  wrong project is discarded and recreated, never re-pointed. The field renders plain text in EVERY
  state, editable results included, and a spec asserts it against the rendered DOM. If the decision
  ever reverses, the removed wiring is in this file's git history — and re-read the P2-3518 traps
  it carried before restoring it: `selectProject()` (the wizard's entry point) clears the Science
  Program, `contributing_bilateral_projects` is a SYNC-REPLACE that must carry the whole list with
  exactly one `is_lead: true`, and `section-contributors` re-derives its `readonlyLeadProjectId`
  from `selectedProject()`.
- The Submit gate (`overallStatus() === 'complete'` + not submitting + not read-only, the last one
  being the P2-3520 lock) moved with the button: it is `canSubmitFromRail()` in
  `bilateral-result-creator`, and `submitResult()` re-checks its own guards regardless.
- Every spec assertion about the project field reads the **rendered DOM** on purpose: the client runs
  zoneless, so asserting a class property passes with the defect still on screen.

## Pending / Coming soon
- `Generate Narrative`, `Download PDF`, `AI Review` — **not rendered at all since 2026-09-04** (the
  Actions card was removed); when one ships, it needs a new home, not a resurrection of the card as-was.
- **Out of scope of P2-3518, deliberately not built:**
  - the consequence of a project change on the **Science Program** (the ticket's own requirements
    contradict each other; pending business). Today the Science Program is left exactly as it was.
  - **re-pointing the Theory of Change** after a project change — ToC is Juan David's domain.
