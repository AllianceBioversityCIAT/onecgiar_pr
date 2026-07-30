## Context

The evidence section (`rd-evidences.component.ts`, introduced/redesigned in P2-2935) supports creating, editing, and deleting evidence items. Create and edit confirm through a modal and call `confirmCreateEvidence()`, which mutates the in-memory `evidencesBody.evidences` array and then calls `onSaveSection()` to persist via `POST_evidences`.

Deletion follows a different path:
- `deleteEvidenceWithConfirm(index)` opens a confirmation popup (`api.alertsFe.show`) whose confirm callback calls `deleteEvidence(index)`.
- `deleteEvidence(index)` only runs `evidences.splice(index, 1)` + `validateCheckBoxes()` — it never persists.

Result: the deletion lives only in memory until the user clicks the section **Save** button. Navigating away discards it (the section re-fetches on `ngOnInit` via `getSectionInformation()`), so the evidence reappears. This is the P2-3030 bug.

## Goals / Non-Goals

**Goals:**
- Confirming a delete persists immediately, mirroring the create/edit confirm flow.
- Keep the change minimal and consistent with existing patterns.
- Preserve the existing unit test that calls `deleteEvidence(index)` directly and asserts only the splice.

**Non-Goals:**
- No backend changes (the existing `POST_evidences` already handles deletions — the persisted body simply omits the removed item).
- No change to the first confirmation popup, the 6-piece limit, link validation rules, the knowledge-product read-only branch, or green-checks.
- No new save endpoint or batching.

## Decisions

**Decision: Add `onSaveSection()` in the confirmation callback, not inside `deleteEvidence()`.**
- Rationale: `deleteEvidence(index)` is a pure list mutation reused by a unit test that expects no side effects (no POST). Auto-save belongs to the *confirmed user intent*, which is the confirmation callback in `deleteEvidenceWithConfirm()`. This mirrors `confirmCreateEvidence()` (mutate → `onSaveSection()`).
- Alternative considered: putting `onSaveSection()` inside `deleteEvidence()`. Rejected — it would couple persistence to the raw mutation, break the existing direct-call unit test, and risk unintended saves from any future caller.

**Decision: Reuse `onSaveSection()` as-is.**
- It already sets `isSaving`, runs `loadAllFiles()` (a no-op for the remaining items that have no pending `file`), POSTs `evidencesBody`, then re-fetches via `getSectionInformation()`. Deleting the last evidence simply POSTs an empty `evidences` array, which the save flow already supports.

## Risks / Trade-offs

- [A delete now triggers a network POST every confirm] → Acceptable and expected: this is exactly the persistence the AC requires; it matches the create/edit behavior users already experience.
- [`loadAllFiles()` runs during the delete save] → It only re-uploads items that still carry an unsaved `file` blob; already-persisted items have a `link` and are skipped, so a delete-only save does not re-upload existing files.
- [Validation state after delete] → `deleteEvidence` already calls `validateCheckBoxes()`; `validateButtonDisabled` is recomputed from the remaining items, so the save proceeds with a valid body.

## Migration Plan

Not applicable — pure frontend behavior fix, no data migration, no flag. Rollback is reverting the one-line callback change.
