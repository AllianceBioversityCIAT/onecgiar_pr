# Proposal: Unsaved Changes Warning on Navigation

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `unsaved-changes-alert` — derived from free-text argument (ticket title + user's Option B decision) |
| Spec Path | `docs/specs/changes/unsaved-changes-alert/` |
| Jira | [P2-3638](https://cgiarmel.atlassian.net/browse/P2-3638) — "Alert user on unsaved changes when navigating away, or implement auto-save" |
| Type | Change |
| Approval Mode | gated |
| Reporter | Ángel Alberto Jarrín Rivas |
| Assignee | Santiago Sanchez Correa |
| Date | 2026-09-10 |

## 2. Intent

Stop the reporting form from silently discarding a user's edits when they leave a section — whether by clicking "NEXT" / "BACK" or by navigating away some other way (e.g. jumping to another section in the sidebar) without saving.

## 3. Problem / Current Behavior

In the multi-step Result Detail reporting form:

- Clicking "NEXT" / "BACK" immediately switches section with no save — any edited field that was never explicitly saved is lost with no warning.
- Clicking a different section directly (sidebar) while the current section has unsaved edits does the same: silent switch, silent loss.

QA reported this as an active data-loss risk during testing.

## 4. Proposed Outcome

Two distinct behaviors, refined after the initial proposal per user feedback (2026-09-10):

1. **`Back` / `Next` (§ figure in `section-bottom-bar`) always save first.** Clicking either button triggers the same save action as "Save Draft" for the current section, then proceeds to the target section. The user never sees a warning on these two buttons — the save just happens.
2. **Any other way of leaving a dirty section without saving** (sidebar section click, browser back, route navigation away from Result Detail, tab close) shows a warning dialog: **"You have unsaved changes. If you leave now, they'll be lost. Do you want to save before continuing?"** with two actions:
   - **Save** — saves the current section, then continues to wherever the user was trying to go.
   - **Discard** — discards the unsaved edits and continues to wherever the user was trying to go (i.e. it does **not** cancel the navigation; it proceeds without saving).

   No third "stay here" option — the user has already committed to leaving by clicking somewhere else; the dialog only decides whether that edit gets saved or dropped, not whether the navigation happens.

## 5. Scope

- Result Detail reporting form (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/`):
  - `section-bottom-bar`'s `Back` / `Next` handlers gain a mandatory save-before-navigate step (reuse the existing "Save Draft" action).
  - Panel-menu section switches triggered any other way (sidebar click) and Angular route navigation away from Result Detail (browser back/forward, breadcrumb, sidebar link to another result) gain the Save/Discard warning dialog, remembering the destination the user was navigating to so it can complete that navigation after the dialog resolves.
- Browser tab close/refresh (`beforeunload`) while a section has unsaved edits — browser-native prompt only (a custom dialog is not possible here); Save/Discard semantics don't apply, this is scoped to just warning the user before the tab actually closes.
- A single reusable "unsaved changes" primitive (dirty-check contract + confirm dialog + pending-navigation replay) so other multi-step forms (IPSR, bilateral) can adopt it later without re-inventing it — but this proposal's own acceptance scope is Result Detail only.

## 6. Non-Goals

- Auto-save (Option A) — explicitly rejected for this ticket (see §9).
- Retrofitting IPSR or the bilateral result creator to use the new primitive — the bilateral result creator already has its own `AutoSaveService` + `beforeunload`/`window.confirm` pattern; touching it is out of scope here.
- Persisting a local draft of discarded changes.
- Detecting unsaved changes at a field-diff level beyond a simple per-section dirty flag.

## 7. Affected Users, Systems, and Specs

- **Users:** anyone editing a Result Detail section (result submitters).
- **Code areas:** `pages/results/pages/result-detail/` (panel-menu, `section-bottom-bar`, `result-detail-routing.module.ts`), a new shared confirm-dialog usage under `shared/components/` or `shared/modals/`, and a new route guard under `shared/guards/`.
- **Related specs:** none existing under `docs/specs/results/` cover this; `docs/specs/general-setup/` templates apply as usual.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: This is a behavior/dialog change, not a new screen. The dialog is a standard confirm pattern (`hlm-dialog`, per `docs/ux-ui/design.md` and the client's "never a modal on top of a modal" hard rule) — no new visual design needed. `/akili-specify` should still confirm dialog copy/spacing against the confirm-dialog pattern already in `docs/ux-ui/design.md` if one exists.

## 9. Requirement Delta Preview

### ADDED Requirements

- A per-section "dirty" signal exposed by each Result Detail section (or inferred from existing form state) that a shared guard can query.
- `Back` / `Next` in `section-bottom-bar` always invoke the section's existing "Save Draft" action before switching section — no dialog, no user decision, this path just saves.
- A confirm dialog ("Save" / "Discard") shown whenever the user tries to leave a dirty section through any path other than `Back`/`Next` — sidebar section click, Angular route navigation (`CanDeactivate`), browser back/forward. The dialog holds the pending destination and completes that navigation once the user picks Save (after a successful save) or Discard (immediately).
- A native `beforeunload` prompt when the tab/window is closed or refreshed while a section is dirty (no custom dialog possible at this event; Save/Discard don't apply here, it's just "are you sure").

### MODIFIED Requirements

- `section-bottom-bar`'s `Back`/`Next` handlers gain a mandatory save-then-navigate step (previously: navigate only, no save).
- Result Detail's route(s) gain a `CanDeactivate` guard (or the panel-menu's own section-switch method gains an equivalent check, since section switches are not always full route changes — see `result-detail/CLAUDE.md`), both wired to the Save/Discard dialog rather than a boolean block.

### REMOVED Requirements

None.

## 10. Approach Options

**Why not Option A (auto-save):** already discussed and rejected for this ticket — auto-saving contributor/SP selections can fire side-effecting notifications (e.g. emailing a contributing SP's focal point) before the user has finished picking the *correct* SP, so a wrong intermediate selection could wrongly notify someone. Option B (warn, don't auto-persist) avoids that risk entirely.

| Option | Description | Trade-offs |
|---|---|---|
| **B1 — Reuse `window.confirm`** | Copy the native-confirm pattern already used in `bilateral-result-creator.component.ts:534`, with 2 native buttons (OK = save, Cancel = discard). | Fastest to ship, zero new UI. But a native `confirm()` only returns yes/no with no custom "Save" vs "Discard" labeling, isn't styled/i18n-ready, and can't distinguish "save" from "just proceed" beyond generic OK/Cancel wording. |
| **B2 — Shared confirm-dialog + dirty-check + pending-navigation contract (Recommended)** | Add a small reusable "unsaved changes" contract: a dirty signal each section exposes, a `Save`/`Discard` `hlm-dialog`, and a "pending navigation" holder that replays the user's original destination after the dialog resolves. `Back`/`Next` bypass the dialog entirely (always save). Sidebar clicks, `CanDeactivate`, and `beforeunload` go through the dialog. | More surface to build/test, but it is the only option that (a) never bothers the user on Back/Next, (b) reliably resumes the navigation the user actually asked for after Save or Discard, and (c) is reusable by IPSR/bilateral later. |
| **B3 — Bottom-bar only** | Only add the save-before-navigate step to `Next`/`Back`; skip the dialog for sidebar clicks, route guard, and `beforeunload`. | Cheapest, but leaves the sidebar section-click path (the second scenario the user explicitly called out) completely unprotected — fails the ticket's own acceptance criterion ("works consistently across all steps ... any navigation action"). |

**Recommended:** B2. It is the smallest option that actually satisfies the Jira acceptance criteria without leaving obvious escape hatches, and it produces a primitive the other two multi-step forms can reuse later instead of copying `window.confirm` again.

## 11. Risks, Dependencies, and Open Questions

- **Dependency:** needs a per-section dirty signal. Several Result Detail sections may not currently track "form touched" state explicitly — `/akili-specify` must audit each `rd-*` section (and `rd-result-types-pages/*`) for how to derive "has unsaved changes" cheaply (e.g. `FormGroup.dirty`, or a comparison against last-saved snapshot).
- **Risk:** the panel-menu "teleporting" `section-bottom-bar` (see `result-detail/CLAUDE.md` §"La bottom bar se teletransporta") means Back/Next handlers are declared per-section — the dirty check must be centralized (e.g. in `DataControlService` or a new `UnsavedChangesService`), not duplicated per section.
- **Risk:** `CanDeactivate` only fires on real Angular route changes; most Result Detail "steps" are panel-menu section swaps, not route changes (per `src/CLAUDE.md` §3.3) — the guard alone is not sufficient, the panel-menu's own section-switch method needs the same check.
- **Risk:** because "Discard" must still complete the original navigation (not just close the dialog), the implementation needs a small "pending navigation" holder (the target section id or route) captured at the moment the dialog opens, so both Save-then-go and Discard-then-go resume the exact click the user made — not a generic "close dialog and do nothing."
- **Risk:** if `Back`/`Next`'s save fails (validation error, network error), the section must NOT silently proceed to the next/previous step with the failed save — surface the existing save-error handling and keep the user on the current section, same as today's "Save Draft" failure behavior.
- **Open question:** should "Discard" also reset the section's form to last-saved values, or just navigate away (leaving the stale in-memory state to be overwritten on next load)? Recommend the latter (simpler, and Result Detail already reloads a section's data on entry).
- **Open question:** does IPSR's non-panel-menu step navigation need the same treatment now, or later as a separate proposal? Recommend later — keep this proposal scoped to Result Detail per the ticket's own examples.

## 12. Success Criteria

- Clicking `Back` / `Next` always saves the current section first, with no dialog interruption, then proceeds.
- Leaving a dirty section any other way (sidebar click, browser navigation, tab close) never silently loses data: the user always sees a Save/Discard choice (or, for tab close, the native browser prompt) before the change is lost.
- Choosing Save or Discard always completes the navigation the user originally requested — the user is never left stuck back on the dialog's originating section after answering it.
- No behavior change for sections with no unsaved edits (navigation stays instant, no dialog).
- No new autosave-triggered side effects (e.g. no new emails fired) are introduced — saves only happen on explicit Back/Next or an explicit Save choice in the dialog.

## 13. Next Step

```text
/akili-specify changes/unsaved-changes-alert
```
