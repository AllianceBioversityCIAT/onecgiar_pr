# section-zero-dashboard (bilateral)

**Verified:** 2026-09-22 · branch yzuniga/p2-3760-contribution (P2-3760 Contribution percentage)

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
- 🛑 **P2-3760: the Contribution % is stored on the LEAD `results_by_projects` row, not on the
  project.** It rides the same `PATCH primary-assignment` save, and the endpoint requires
  `project_id` + `primary_science_program_id` even when only the percentage moved — that is why
  `saveAssignment()` still demands a primary program. `contribution_percentage` is sent **only when
  it changed**: an omitted key means "leave the stored value alone", which is what keeps an older
  client from blanking it. Stored `NULL` = never answered and renders as the 100 the story asks for.
  ⚠️ `BilateralCreationService` is a **root singleton** and the percentage hydrates only from a lead
  row that carries `obj_clarisa_project`, so it MUST stay in `loadResult`'s reset block — without it
  the previous result's number shows on the next one and gets saved onto it (caught pre-merge).
- 🛑 **P2-3759: the Lead Center field goes ABOVE the W3/Bilateral Project field and is labelled
  "Lead Center", not "Center"** — the story says "Positioned above the W3/Bilateral Project field".
  `.bp-project-fields` is a flex column with no `order`, so DOM order IS screen order; the specs
  assert the label index, and they assert `indexOf(...) >= 0` too, because a missing label indexes
  to `-1` and would otherwise satisfy "before Project" while the field is not on screen at all.

## Pending / Coming soon
- `Generate Narrative`, `Download PDF`, `AI Review` — **not rendered at all since 2026-09-04** (the
  Actions card was removed); when one ships, it needs a new home, not a resurrection of the card as-was.
