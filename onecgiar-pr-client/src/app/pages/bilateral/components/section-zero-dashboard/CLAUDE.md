# section-zero-dashboard (bilateral)

**Verified:** 2026-09-11 · branch performance-refactor (P2-3283 primary assignment editing; Submit lives in the rail)

## What it is
Section 0 of the bilateral form: the read-mostly card that identifies the result (code, type,
reporting phase, funding source) and its W3/Bilateral project, single-column since 2026-09-04.
It is the only section that is not inside an accordion.
**The Actions card is GONE (2026-09-04)** — Submit for review lives in the editor's sections rail
(`bilateral-result-creator`, `.bcr-rail__submit`, same slot as the W1/W2 result-detail rail) and the
disabled Coming-soon buttons (Generate Narrative / Download PDF / AI Review) were removed with the
card; bring it back only when one of those actions actually ships.

## Contract
- Input: `readOnly` (`isFormReadOnly()` of the editor). Editing/Draft results can update their
  lead project and primary program together; reviewed results remain static.
- State: `BilateralCreationService` owns display state. The assignment is persisted only through
  `PATCH /api/bilateral/center/primary-assignment/:resultId`, never through Contributors.

## Where it is used
- `pages/bilateral-result-creator/bilateral-result-creator.component.html:210` — the only host.

## Traps (⚠️ = already broke something)
- 🛑 **P2-3283: project and primary program are editable only as one server-validated assignment.**
  The client stages the project until a primary program is selected; it must not call
  `saveContributors` because that sync-replaces project rows and cannot update role 1. The server
  accepts only confirmed positive-allocation mappings from the result's immutable lead centre.
  Changing primary program clears its ToC mapping and the replacement must be mapped again.
- The Submit gate (`overallStatus() === 'complete'` + not submitting + not read-only, the last one
  being the P2-3520 lock) moved with the button: it is `canSubmitFromRail()` in
  `bilateral-result-creator`, and `submitResult()` re-checks its own guards regardless.
- Every spec assertion about the project field reads the **rendered DOM** on purpose: the client runs
  zoneless, so asserting a class property passes with the defect still on screen.

## Pending / Coming soon
- `Generate Narrative`, `Download PDF`, `AI Review` — **not rendered at all since 2026-09-04** (the
  Actions card was removed); when one ships, it needs a new home, not a resurrection of the card as-was.
