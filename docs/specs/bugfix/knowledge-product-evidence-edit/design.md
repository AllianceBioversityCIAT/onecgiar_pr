# Module Spec — Knowledge Product Evidence Tag-Marker Edit — `design.md`

**Depth:** Lite (Bug Mode). Linked: `requirements.md`.

## 1. Summary

Add a scoped, KP-only edit trigger to the Evidence section so the already-existing evidence modal (and its already-correct tag checkboxes) becomes reachable for Knowledge Products. No new component, no new state, no API change — this is a template-level `*ngIf` correction plus one companion check to guard against accidentally widening it into delete/add access.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/` (`rd-evidences.component.html` only). No change expected in `evidence-item.component.*` — its tag checkboxes (lines 105-128) and its lock on Source/Link (lines 5, 20) are already correct for KP.
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Interaction flow (unchanged, now reachable for KP)

```
[Evidence card, KP result]
  └── pencil icon (NEW: visible for KP too) → editEvidence(i)
        └── draftEvidence = clone(evidences[i]); showCreateModal = true
              └── <app-evidence-item [evidence]="draftEvidence" [embedded]="true">
                    ├── Source/Link: hidden/disabled for KP (existing, unchanged)
                    └── Tag checkboxes: editable (existing, unchanged — was already unreachable, not broken)
              └── Save → confirmCreateEvidence() → onSaveSection() → POST_evidences (existing, unchanged)
```

## 3. Data Model Changes

None. `EvidencesCreateInterface` and the `POST /api/evidences/create/:resultId` payload are unchanged.

## 4. Frontend Component Design

### 4.1 `rd-evidences.component.html` — the only file that changes

Current (line 42):

```html
<div class="ev_actions" *ngIf="!dataControlSE.isKnowledgeProduct && !api.rolesSE.readOnly && !api.dataControlSE?.currentResult?.status">
  <button ... (click)="editEvidence(i)">edit</button>
  <button ... (click)="deleteEvidenceWithConfirm(i)">delete</button>
</div>
```

**`KPE-DD-1` — Split the edit and delete triggers into two independently-gated controls, instead of loosening the shared wrapper's `*ngIf`.**

- The edit button's own condition drops the `!isKnowledgeProduct` exclusion — it becomes visible for both KP and non-KP, gated only on `!api.rolesSE.readOnly && !api.dataControlSE?.currentResult?.status` (same read-only / submitted-result guards as today).
- The delete button keeps `!dataControlSE.isKnowledgeProduct` in its own condition, unchanged.
- The "Add evidence" button (line 98) is untouched — its `!isKnowledgeProduct` exclusion stays exactly as-is (`KPE-R-4`).

This directly satisfies `KPE-R-1` (edit visible for KP) and `KPE-R-4` (no delete, no add for KP) without touching `evidence-item.component.*`, since its own `isKnowledgeProduct` gates (Source radio hidden, Link disabled, delete-in-embedded-item hidden) already produce the correct locked-down modal once it's reachable — that's `KPE-R-2` and `KPE-R-10`, already implemented, just newly exercised.

### 4.2 `evidence-item.component.*`

No change. Existing conditions already do the right thing once the modal opens for KP:

- Line 5 (`*ngIf="!isKnowledgeProduct"`) — hides "Source of evidence" radio for KP. Satisfies `KPE-R-2`.
- Line 20 (`[disabled]="isKnowledgeProduct"`) — disables the Link input for KP. Satisfies `KPE-R-2`.
- Lines 105-128 (tag checkboxes) — not gated on `isKnowledgeProduct`; render and bind normally. Satisfies `KPE-R-3`.
- Line 129-141 (description textarea) — not gated on `isKnowledgeProduct`. Satisfies `KPE-R-10`.
- Line 145 (`*ngIf="!embedded && !isKnowledgeProduct && ..."`) — the embedded item's own delete button stays hidden for KP; irrelevant here since the modal always renders `[embedded]="true"` (line 129 of `rd-evidences.component.html`), so this line never shows regardless.

### 4.3 `evidenceSectionComplete` / `validateCheckBoxes()`

No change. Both already compute correctly from `evidencesBody.evidences[i].*_related` — the only gap was that a KP evidence row's `*_related` flags could never be set through the UI. Once `KPE-DD-1` lands, checking a tag box and saving flips the flag, `validateCheckBoxes()` sees a matching related evidence, and the warning clears — this is existing logic being exercised, not new logic.

## 5. Design Decisions

**`KPE-DD-1`** — Split edit/delete gating instead of one shared `*ngIf` (see §4.1). Rejected alternative: remove `!isKnowledgeProduct` from the whole `.ev_actions` wrapper and hide the delete `<button>` with its own inner `*ngIf` instead. Rejected because it changes DOM structure inside the wrapper for no benefit — the two-independent-conditions form matches the existing pattern used elsewhere in this file (e.g. `.evidences` iteration already mixes multiple independent `*ngIf`s) and is a smaller diff.

### Step 2.3 — Reversion challenge

This DD does not revert any already-delivered behavior — it *adds* visibility (the edit button) while *preserving* the existing delete/add exclusion and the existing Source/Link lock. No challenge required per the Step 2.3 trigger definition (challenge applies only to DDs that remove/disable/invert existing behavior).

## 6. Budget (Step 2.4)

- **Expected tasks:** 2 (one implementation task covering the template change + companion visual check; one regression-test task).
- **Expected LOC:** ~6-10 (two `*ngIf` edits in one template file; no new files).
- **Expected review rounds:** 1.

This is well within Lite depth — no downgrade or upgrade indicated. If the Implementer discovers `evidence-item.component.*` needs a change (e.g. the tag checkboxes turn out to be gated somewhere not found during proposal research), that would exceed this budget and the Leader should stop and escalate rather than silently expanding scope.

## 7. Risks Carried From Requirements

- Visual placement of the pencil icon on a KP card is not automatically checked (see `requirements.md` §11) — verify manually in-browser before merge, per `onecgiar-pr-client/CLAUDE.md` §9.
