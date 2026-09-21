# Proposal: AI Review modal — remove redundant Validate button, make the save flow trustworthy

## 1. Document Control

| Attribute | Value |
|---|---|
| Spec Path | `changes/ai-review-save-flow` |
| Slug | `ai-review-save-flow` — derived from free-text argument (original: *"requiero que quitemos el botón que dice 'Validate'..."*, expanded in follow-up to two more save-flow adjustments in the same modal). Renamed from the earlier draft `changes/remove-ai-review-validate` once scope grew beyond a pure removal — no prior approval existed yet, so the rename carries no history to reconcile. |
| Type | Change |
| Approval Mode | gated (default) |
| Date | 2026-09-17 |
| Requester | M.Giraldo@cgiar.org |
| Status | Draft — pending approval |

## 2. Intent

Clean up the save/validate flow inside the **AI Review** modal (`app-ai-review`) so it stops being confusing or untrustworthy:

1. Remove the bulk **Validate** button — it is redundant with each Impact Area card's own **Save changes** button.
2. Warn the user, right after they click **Apply proposal** on a field, that the applied text is only staged locally and will be lost if they close the modal without clicking **Save changes**.
3. Make a field's **Save changes** button honestly reflect save state: disabled once the save succeeds, and only re-enabled if the user edits that field again.

## 3. Problem / Current Behavior

The modal has two independent areas, and all three issues live in the code the requester and I traced together:

### 3.1 "Validate" duplicates "Save changes" (Impact Areas section)

Each DAC score card (gender, climate, nutrition, environment, poverty) has its own **Save changes** button → `onSaveDacScore(dacScore)` → `persistDacScore(dacScore)` → one `PATCH_saveDacScore` call, then `dacScore.canSave = false`.

The **Validate** button at the bottom of the section → `onValidateAll()` → loops over every card with a pending edit (`pendingDacScores`, i.e. `canSave === true`) and calls the **same** `persistDacScore()` for each one, then shows one aggregated success/error alert instead of per-card ones.

There is no extra validation or distinct business step in `onValidateAll()` — it is `persistDacScore()` wrapped in a `for` loop. Everything it does, the user can already do by clicking **Save changes** on each edited card.

### 3.2 Applying an AI proposal gives no warning that it is unsaved (Fields section)

For the top fields (Title, Description, Innovation Short Title), clicking **Apply proposal** calls `moveTextToInput(field)`:

```ts
moveTextToInput(field: any) {
  field.canSave = true;
  field.original_text = field.proposed_text;
}
```

This only copies the AI's proposed text into the editable "Result version" input and flags the field as having a pending change — it does **not** call the API. If the user closes the modal at this point (or navigates away) without clicking **Save changes**, the applied text is silently discarded. Nothing in the UI tells them this.

### 3.3 "Save changes" re-enables itself right after a successful save (Fields section)

`onApplyProposal(field, index)` in `ai-review.service.ts:239-264` is the handler behind each field's **Save changes** button:

```ts
async onApplyProposal(field, index: number) {
  if (this.savingProposalIndex() !== null) return;
  this.savingProposalIndex.set(index);
  field.canSave = false;
  ...
  try {
    await this.POST_saveSession({ fields: [fieldToSave] });
  } finally {
    // `finally`, because a rejected save used to leave `canSave` false forever — a dead button
    // the user could only recover from by reloading the result.
    field.canSave = true;
    this.savingProposalIndex.set(null);
  }
}
```

The `finally` block resets `field.canSave = true` on **every** outcome, including a successful save. Because the button's disabled state is driven by `!field.canSave` (`[ngClass]="{ globalDisabled: !field.canSave }"`), the button goes right back to looking clickable/active immediately after a successful save — the same visual state as "you have an unsaved change." That is exactly the "did this actually save?" distrust the requester flagged.

**Contrast:** the DAC score cards already do this correctly — `persistDacScore()` sets `dacScore.canSave = false` only on success and leaves it `true` (button stays enabled) only when the request threw. This proposal brings the fields section's behavior in line with that existing, correct pattern — it does not change the DAC score cards' behavior.

## 4. Proposed Outcome

- The Impact Areas section no longer has a **Validate** button. Only each card's own **Save changes** persists that card.
- The moment a field has an applied-but-unsaved proposal (`field.canSave === true`), a short reminder is visible under that field, above/near the **Save changes** button, telling the user their change is not yet applied and will be lost if they close the modal without saving.
- After a field's **Save changes** click succeeds, its button becomes visually disabled (like the DAC score cards already do) and stays disabled until that field is edited again (a new "Apply proposal" or a direct edit of the "Result version" input). A failed save still leaves the button enabled so the user can retry — that recovery behavior is preserved unchanged.

## 5. Scope

**A. Remove the bulk Validate action (Impact Areas section)**
- `ai-review.component.html` — remove the `validate-all-section` block (button + wrapper).
- `ai-review.component.ts` — remove `onValidateAll()`, `isValidatingAll`, `hasPendingChanges` getter, `pendingDacScores` getter (used only by the removed button). Keep `persistDacScore`, `onSaveDacScore`, `isIncomplete` — the per-card flow still needs them.
- `ai-review.component.scss` — remove the now-unused `.validate-all-section` rule.
- `ai-review.component.spec.ts` — remove/rewrite the `describe('onValidateAll', ...)` block and any assertion on the deleted members.

**B. Unsaved-proposal reminder (Fields section)**
- `ai-review.component.html` — inside the `@for (field of aiReviewSE.currnetFieldsList(); ...)` block, add a reminder message that renders when `field.canSave` is `true` (an applied proposal is pending), placed between the "Result version" input and the **Save changes** button.
- Reuse the project's existing inline-hint convention (`app-alert-status`, already used elsewhere in Result Detail for this kind of message) rather than introducing new bespoke markup — see Approach Options.

**C. Honest Save-changes state (Fields section)**
- `ai-review.service.ts` — in `onApplyProposal()`, stop unconditionally resetting `field.canSave = true` in `finally`. On success, leave it `false` (disabled). On a thrown/failed save, still reset it to `true` so the user can retry — the existing "don't leave a dead button forever" guarantee is preserved, just scoped to the failure path only.
- `ai-review.component.html` — add a change handler on the "Result version" input/textarea (`app-pr-textarea` / `app-pr-input`, currently plain `[(ngModel)]="field.original_text"` with no change hook) that sets `field.canSave = true` when the user edits the value directly. Without this, a field that was just saved could never be re-enabled by a manual edit — only by clicking "Apply proposal" again, which the template hides once applied (`original_text == proposed_text` shows the "Applied" badge, not the button). This mirrors the pattern the DAC score cards already use (`onResultVersionChange` / `onComponentChange` set `canSave = true` on change).

## 6. Non-Goals

- No change to the DAC score cards' own save/disable behavior — it is already correct and is the reference pattern for item C.
- No change to the "Apply proposal" / "Applied" badge visuals or logic.
- No change to `PATCH_saveDacScore` or `POST_saveSession` API contracts.
- No retrofit of this component's existing hardcoded English copy into the project's `internationalization/` i18n layer. The component already has many hardcoded strings ("Save changes", "Result version", "AI proposal", etc.) that bypass the client's normal i18n rule; new copy from item B will match that existing local convention for consistency. Bringing the whole component into i18n compliance is a separate, larger change — flagged as an open question below, not undertaken here unless the requester asks for it.
- No change to how DAC scores validate "Principal" component selection (`isIncomplete`) — untouched.

## 7. Affected Users, Systems, And Specs

- **Users:** result submitters and anyone opening AI Review on a result (all result types — `app-ai-review` is mounted once, shared, in `result-detail.component.html:211`; confirmed by repo-wide search that there is exactly one `text="Validate"` button in the client).
- **Systems:** `onecgiar-pr-client` only. No server, migration, or API contract change — items B and C only change client-side state (`field.canSave`) and template, not what gets sent to the API.
- **Specs:** none found under `docs/specs/` document the AI Review modal today. `/akili-specify` will create the first requirements/design/tasks triplet for it.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: item A is a removal; items B and C are small state/copy changes to an existing screen. No new layout or mockup is needed — `/akili-specify` should pick the exact reminder-message component/placement from the existing design system (`app-alert-status`) rather than freehand new markup.

## 9. Requirement Delta Preview

### ADDED Requirements
- A visible reminder appears under a field when it has an applied-but-unsaved AI proposal (`field.canSave === true`), warning that the change is lost if the modal closes before saving.
- Directly editing a field's "Result version" input after a save marks that field dirty again (`canSave = true`), re-enabling its Save changes button.

### MODIFIED Requirements
- `onApplyProposal()`'s success path no longer re-enables Save changes; only a failed/thrown save re-enables it (for retry). Save changes for fields now behaves like the DAC score cards already do.

### REMOVED Requirements
- The bulk "Validate" action in the AI Review modal's Impact Areas section (persist all pending DAC score edits in one click) is removed. Persisting a DAC score edit is done exclusively via that card's own Save changes button.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A — Template-only removal (item A only) | Delete just the button/wrapper; leave `onValidateAll()`, `isValidatingAll`, `hasPendingChanges`, `pendingDacScores` and their tests in place. | Smallest diff for item A alone, but leaves dead code and tests exercising an unreachable path — against this repo's no-dead-code convention. |
| **B — Full removal + matching fixes (recommended)** | Item A's full removal (button, dead `.ts`/`.scss`, spec update) plus items B and C as scoped above, reusing `app-alert-status` for the reminder and mirroring the DAC score cards' already-correct disable-on-success pattern for the fields' Save changes button. | Slightly larger diff across two sections of one component, but no dead code, no misleading tests, and the two sections of the same modal end up behaving consistently with each other. |
| C — Bespoke reminder banner instead of `app-alert-status` | Hand-roll new markup/SCSS for the reminder message instead of reusing the existing alert component. | Rejected — the project's own client convention favors shared primitives over new bespoke SCSS-heavy elements (`onecgiar-pr-client/CLAUDE.md` §5), and `app-alert-status` already supports an `info`/hint-style variant used elsewhere in Result Detail. |

## 11. Recommended Approach

**Option B.** It fully satisfies the three explicit asks with no leftover dead code, and item C's fix is only meaningful when paired with the manual-edit dirty-tracking half described in Scope §C — without it, a field saved once could never be re-enabled except by an "Apply proposal" click the template no longer shows after the first application.

## 12. Risks, Dependencies, And Open Questions

- **Risk — test breakage (item A):** `ai-review.component.spec.ts` has a dedicated `describe('onValidateAll', ...)` block and assertions on `hasPendingChanges`. These must be removed/updated in the same change.
- **Risk — new/changed test coverage needed (items B, C):** `onApplyProposal()`'s success-vs-failure branches for `field.canSave`, and the new dirty-tracking handler on manual edits, need test coverage in `ai-review.component.spec.ts` — currently nothing exercises either.
- **Decided — reminder language:** the message MUST be in English (requester confirmed 2026-09-17), matching this component's existing hardcoded-English copy ("Save changes", "Result version", "AI proposal", etc.). Draft wording: *"This change hasn't been saved yet — it will be lost if you close this window."* Exact final phrasing can still be tuned at `/akili-specify` time, but the language is settled.
- **Open question — i18n:** this component's copy already bypasses `internationalization/`; the new English copy will follow that same local (non-compliant) convention for consistency unless the requester wants the whole component migrated to `TermKey`s as a separate change.
- **Dependency:** none — self-contained client-only change, no migration, no other spec to coordinate with.

## 13. Success Criteria

- Opening AI Review on any result and scrolling to Impact Areas shows no "Validate" button; each card still saves individually with unchanged validation/alerts.
- Clicking "Apply proposal" on a field shows a reminder message under that field until it is saved.
- Closing the modal without saving an applied proposal still discards it (unchanged behavior) — but now the user was warned.
- After a field's "Save changes" succeeds, its button is visibly disabled and stays disabled until that field is edited again (new Apply proposal, or a direct edit to the "Result version" input).
- A failed field save still leaves "Save changes" enabled so the user can retry, unchanged from today.
- `ai-review.component.spec.ts` compiles and passes with no reference to the removed Validate members, plus new coverage for the success/failure `canSave` branches and the manual-edit dirty tracking.

## 14. Next Step

```text
/akili-specify changes/ai-review-save-flow
```
