# Design — ToC HLO/Outcome selector must stay editable (Lite)

Requirements: `requirements.md` (same folder). Root cause + user decision: `proposal.md` §4/§11.

## 1. Summary

Remove the `tocAlignmentReadOnly()` gate from the four `[readOnly]`/`[disabled]`/`[editable]`
bindings in `multiple-wps-content.component.html` (Level select + the 3 per-level node selects).
No data model, API, or contract change — purely a client template/computed change.

## 2. Where this lives

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/`
  - `multiple-wps-content.component.html` — remove `!tocAlignmentReadOnly()` / `tocAlignmentReadOnly()` from the 4 bindings (lines ~10-12, 28-31, 43-46, 62-64).
  - `multiple-wps-content.component.ts` — `tocAlignmentReadOnly` computed (`:199-206`) becomes dead code from the template's perspective. Delete it rather than leave an unused computed (no future re-enable planned; if the PO wants it back later, `git log`/this spec is the record).
- No server, DB, or API surface touched.

## 3. Frontend Plan

### 3.1 Components & bindings

Each of the 4 selects currently has:

```
[editable]="editable && !tocAlignmentReadOnly()"
[readOnly]="tocAlignmentReadOnly()"
[disabled]="!editable || tocAlignmentReadOnly()"   (or "(resultLevelId === 1 && false) || !editable || tocAlignmentReadOnly()")
```

Becomes:

```
[editable]="editable"
[readOnly]="false"
[disabled]="!editable"   (drop the dead "(resultLevelId === 1 && false)" clause too — always false, no behavior change removing it)
```

This restores the exact pre-P2-3235 gating: only the existing `editable` input (parent-controlled)
and the implicit role/read-only handling already inside `app-pr-select` continue to apply.

### 3.2 Untouched by this fix

- `selectionVersion`, `syncTocReferenceIds`, `hloStatementValue`/`hloStatementLabel`,
  `tocResultListFiltered`, `getIndicatorsList`, `markUserTocSelection` — none reference
  `tocAlignmentReadOnly`, so removing it does not change their behavior.
- `isUnplanned` tabs were already always-editable (`tocAlignmentReadOnly()` returns `false` for
  them) — no change in that path either; removing the computed just makes that the only path.

### 3.3 A11y / i18n

No new strings, no new markup — pure removal of a state, so no new a11y/i18n surface.

## 4. Design Decisions

### `BUG-DD-1` — Remove the lock outright rather than add an "unlock" affordance

- **Context:** `proposal.md` originally recommended Option A (keep the lock, add a link to
  Results Framework). The user explicitly overrode this: "el campo puede seguir siendo un dropdown
  editable, no más."
- **Decision:** delete `tocAlignmentReadOnly()` and its 4 template bindings entirely, rather than
  keep the computed around disabled-by-default for a possible future re-enable.
- **Alternatives considered:** (1) keep the computed but hardcode it to always return `false` —
  rejected, leaves dead/misleading code that looks load-bearing; (2) feature-flag it — rejected,
  no flag infrastructure exists for this component and the PO's ask is unconditional, not
  environment-gated.
- **Consequences:** if the double-writer problem P2-3235 was written for resurfaces, a future spec
  has to re-derive the fix; this spec's git history and `proposal.md` are the record of why it
  existed and what it did.

### Step 2.3 — Reversion challenge (this DD reverts already-delivered behavior — P2-3235)

**Question asked: what does removing this break?**

**Answer:** Section 2 (Contributors & Partners) becomes able to set `toc_level_id`/`toc_result_id`
independently of the Results Framework/AOW module again — the two can disagree on the same
result's ToC alignment, which is exactly the divergence P2-3235 closed. No code path enforces
reconciliation between them; nothing else in this component or its save flow (`onSaveSection` in
the parent `rd-contributors-and-partners.component.ts`) currently reads or writes back to the
Results Framework module. This is a known, accepted trade-off — the user was told this before
choosing Option B (see `proposal.md` §11) — not a defect this spec needs to fix. No design change
mitigates it here; flagged as an open risk in §5.

## 5. Open Gaps & Follow-ups

- **Risk (accepted, not mitigated by this spec):** Section 2 and the Results Framework/AOW module
  can independently set the same result's ToC alignment again, and nothing detects or surfaces a
  disagreement between them. If this becomes a real support burden, a future spec should revisit
  reconciliation (e.g., a one-way sync, or a warning when the two disagree) rather than re-locking
  the field.
- `tocAlignmentReadOnly()`'s deletion is a pure removal — no migration, no rollout flag needed.

## Budget (Step 2.4)

- **Expected tasks:** 1 (fix + regression test, Lite/Bug Mode requires exactly one focused task).
- **Expected LOC:** ~15-20 (4 attribute edits across `.html`, one computed removed from `.ts`, one
  new/updated spec).
- **Expected review rounds:** 1.

Matches the `Lite` depth chosen in `/akili-propose` / `/akili-specify` — no escalation needed.
