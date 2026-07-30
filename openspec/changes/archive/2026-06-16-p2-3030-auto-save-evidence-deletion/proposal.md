## Why

Jira **P2-3030**. After the evidence-section redesign (P2-2935), confirming an evidence deletion via the **"Yes, delete"** popup removes the item from the in-memory list but does **not** persist the change. If the user navigates to another section and returns, the deleted evidence reappears, causing confusion and rework. Creating/editing evidence already auto-saves on confirm — deletion is the odd one out.

This change is **frontend-only**. No backend changes are required: the existing `POST_evidences` save flow already persists deletions; it is simply not being invoked on confirmed delete.

## What Changes

- When the user confirms an evidence deletion through the **"Yes, delete"** popup, the section now **auto-saves immediately** (same `onSaveSection()` flow used by create/edit confirm), so the deletion is persisted without requiring a separate **Save** click.
- The first confirmation popup behavior is unchanged (it already shows on **Delete**).
- The raw `deleteEvidence(index)` method stays pure (splice + checkbox revalidation only) — the auto-save is wired in the confirmation callback, preserving the existing unit test that calls `deleteEvidence` directly.

## Capabilities

### New Capabilities
- `evidence-deletion-persistence`: Confirming an evidence deletion persists the change immediately via the section save flow, so the deleted evidence does not reappear after navigating away and back, without the user clicking **Save** again.

### Modified Capabilities
<!-- None. The delete-with-confirmation behavior was introduced by the still-active p2-2935 change (capability `result-evidence`), not yet promoted to openspec/specs/; this granular persistence behavior is captured as its own capability consistent with the existing evidence-* spec split. -->

## Impact

- **Code (client only):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` — `deleteEvidenceWithConfirm()` confirmation callback.
- **Tests:** `rd-evidences.component.spec.ts` — add coverage asserting the confirm callback triggers `onSaveSection()`; existing `deleteEvidence` test stays valid.
- **Backend:** none (uses existing `POST_evidences`).
- **SDD baseline:** UI behavior consistent with `docs/system-design/design.md` (modal/confirm-for-destroy pattern); evidence section under Result Detail per `docs/detailed-design/detailed-design.md`.
- **Related:** P2-2935 (evidence redesign that introduced delete-with-confirm).
