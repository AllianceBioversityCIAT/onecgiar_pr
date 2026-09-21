# Module Spec — Requirements: Unsaved Changes Warning on Navigation

## Document Control

- **Spec Path:** `docs/specs/changes/unsaved-changes-alert/requirements.md`
- **Module:** `results` / Result Detail reporting form
- **Sub-feature:** `unsaved-changes-alert`
- **Owner:** Santiago Sanchez Correa
- **Status:** in-review
- **Type:** Change
- **Approval Mode:** gated
- **Ticket:** [P2-3638](https://cgiarmel.atlassian.net/browse/P2-3638)
- **Proposal Ref:** `docs/specs/changes/unsaved-changes-alert/proposal.md`
- **Constitutional Cross-References:**
  - PRD: `docs/prd.md` (submission workflow integrity, data-loss prevention)
  - UX/UI Design: `docs/ux-ui/design.md` (§6 confirm/warning dialog pattern, hard UI rule "never a modal on top of a modal")
  - TRD: `docs/trd/trd.md` (client navigation, Result Detail workflow)

---

## 1. Executive Summary

Result Detail's multi-step reporting form loses unsaved field edits silently whenever the user leaves a section without explicitly clicking **Save Draft** — including clicking **Next**/**Back**, jumping to another section in the sidebar, or navigating away via the browser. This spec closes that gap with two behaviors, refined with the user after the initial proposal (2026-09-10):

1. **`Next` / `Back` always save first.** They now trigger the same save action as **Save Draft** before switching section — no dialog, no decision, it just saves.
2. **Any other way of leaving a dirty section** (sidebar section click, browser back/forward, navigating to a different result) shows a **Save / Discard** warning dialog. Whichever the user picks, the navigation they originally requested completes — the dialog decides only whether the edit is saved or dropped, never whether the user is allowed to leave.

**Investigation finding (supersedes proposal's own working assumption):** section-to-section navigation in Result Detail — including sidebar clicks and the `section-bottom-bar` Next/Back — is real Angular `Router.navigate()` / `routerLink`, not an in-page panel-menu swap (`section-bottom-bar.component.ts:186-189`, `result-sections-sidebar.component.html:69`). A single `CanDeactivate` guard on the routed section components can therefore observe every navigation path in scope, including browser back/forward — no separate non-route hook is needed.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Section** | One routed page of the Result Detail form (`rd-general-information`, `rd-contributors-and-partners`, etc.), each its own route under `/result/result-detail/:id/:section`. |
| **Dirty section** | A section with at least one field changed since it was last successfully saved. |
| **Save Draft** | The existing explicit save action each section's `section-bottom-bar` already exposes (`(clickSave)`). |
| **Pending navigation** | The destination (section, route, or browser action) the user was trying to reach when the guard intercepted it — captured so it can be resumed after Save or Discard. |
| **CanDeactivate guard** | Angular Router hook that runs before leaving a routed component; can return `false`/a `UrlTree` or an `Observable<boolean>` that resolves once the user answers the dialog. |

---

## 3. System Context & Scope

```mermaid
flowchart TD
  A[User edits a field in a Result Detail section] --> B{How does the user leave?}
  B -->|Clicks Back / Next| C[section-bottom-bar auto-saves\n(same action as Save Draft)]
  C --> D[Navigate to target section]
  B -->|Sidebar section click,\nbrowser back/forward,\nleaves Result Detail| E{Section dirty?}
  E -->|No| D
  E -->|Yes| F[Save / Discard dialog]
  F -->|Save| G[Save current section]
  G -->|Success| D
  G -->|Failure| H[Stay on current section, show save error]
  F -->|Discard| D
  B -->|Tab close / refresh| I{Section dirty?}
  I -->|Yes| J[Native beforeunload prompt]
  I -->|No| K[Tab closes normally]
```

### In Scope

- `section-bottom-bar`'s `Back` / `Next` handlers (`goPrevious()` / `goNext()` → `goTo()`) invoke the section's existing save action before calling `Router.navigate`.
- A `CanDeactivate` guard on Result Detail's routed sections (`resultDetailRouting`) that:
  - Allows navigation immediately when the section is not dirty.
  - Shows the Save/Discard dialog when it is dirty, and resumes the exact destination the user requested once the dialog resolves.
- A native `beforeunload` prompt when the tab/window is closed or refreshed while a section is dirty.
- A per-section "dirty" signal/contract each `rd-*` section exposes (or derives from its `FormGroup`) for the guard and the bottom bar to query.

### Out of Scope

- Continuous background autosave while typing (Option A from the proposal) — explicitly rejected because autosaving an in-progress, possibly-wrong contributing-SP selection can fire side-effecting notifications (e.g. an email to the wrong SP's focal point) before the user finishes correcting it. The save triggered by `Back`/`Next` in this spec is a single explicit action tied to a user click, identical in effect to today's manual "Save Draft" — it carries no new side-effect risk beyond what "Save Draft" already carries today.
- Retrofitting IPSR or the bilateral result creator to use the new dirty-check/dialog primitive (the bilateral result creator already has its own `AutoSaveService` + `beforeunload` pattern).
- Persisting a local draft of discarded changes.
- Field-level diffing; "dirty" is a per-section boolean, not a per-field change log.

---

## 4. Personas Affected

| Persona | Problem Today | Experience After Spec |
|---|---|---|
| **Result Submitter** | Can lose typed data with a single misclick on Next, Back, or a sidebar section link. | Next/Back never lose data (auto-saved); any other exit path asks Save or Discard and still goes where they clicked. |
| **QA Reviewer** | Occasionally receives incomplete sections caused by upstream data loss, not submitter error. | Fewer incomplete submissions traceable to accidental navigation. |

---

## 5. User Stories

- **`UCA-US-1`** — As a Result Submitter, I want clicking **Next** or **Back** to save my current section automatically, so that I never have to remember to click Save Draft before moving on.
- **`UCA-US-2`** — As a Result Submitter, I want to be warned before I lose unsaved edits when I jump to a different section or navigate away some other way, so that I don't accidentally lose my work.
- **`UCA-US-3`** — As a Result Submitter, I want to choose Save or Discard when warned, and end up exactly where I was trying to go either way, so the warning never traps me on the current page.
- **`UCA-US-4`** — As a Result Submitter, I want a browser warning before closing or refreshing a tab with unsaved edits, so that I don't lose work by accident outside the app itself.

---

## 6. Defect Classes & Verification Mapping

| Defect Class | Risk Description | Automated Gate | Human / Fallback Check |
|---|---|---|---|
| **Silent data loss on Next/Back** | Save is skipped and navigation proceeds anyway. | Jest test asserting the save action fires and resolves before `Router.navigate` is called. | — |
| **Navigation proceeds after a failed Back/Next save** | User is moved to the next/previous section even though the save errored. | Jest test: on save error, `Router.navigate` is NOT called and the existing save-error UI shows. | — |
| **Guard fires with nothing unsaved** | Dialog interrupts navigation on a clean section (false positive, annoying). | Jest test: guard returns `true` synchronously when the dirty signal is `false`. | — |
| **Wrong destination after Save/Discard** | User answers the dialog but lands somewhere other than the section/page they originally clicked. | Jest test asserting the guard resumes the exact captured destination for both the Save and the Discard path. | — |
| **Dialog not keyboard-operable / no focus trap** | A keyboard-only user cannot answer or dismiss the dialog. `app-pr-dialog` is documented as having no focus trap/autofocus/restore (`src/CLAUDE.md` §21.7) — the wrong dialog primitive silently reintroduces this gap. | Jest test asserting the dialog is built on `hlm-dialog` (CDK Dialog), not `app-pr-dialog`. | Manual keyboard-only pass (Tab/Shift+Tab/Escape) in a real browser — jsdom cannot verify a real focus trap. |
| **`beforeunload` does not fire when dirty** | Tab closes/refreshes silently discarding edits. | N/A — `beforeunload` cannot be triggered/asserted in Jest/jsdom. | Manual browser check: edit a field, attempt to close/refresh the tab, confirm the native prompt appears; confirm it does NOT appear when the section is clean. Recorded as an accepted Lite-style verification gap in automated coverage. |

---

## 7. Functional Requirements

### Required (MUST)

#### `UCA-R-1` Save-Before-Navigate on Back/Next

`section-bottom-bar`'s `Back` and `Next` controls MUST trigger the section's existing save action and wait for it to resolve before navigating to the target section.

##### Scenario: Next saves before navigating
- **GIVEN** the user has edited a field on the current section and not yet saved
- **WHEN** the user clicks **Next**
- **THEN** the section's save action runs
- **AND** on success, the app navigates to the next section
- **BUT** it must NOT show the Save/Discard dialog on this path.

##### Scenario: Failed save blocks the navigation
- **GIVEN** the current section's save action would fail (validation or network error)
- **WHEN** the user clicks **Next** or **Back**
- **THEN** the app does NOT navigate away
- **AND** the existing save-error feedback is shown, same as a manual Save Draft failure today.

---

#### `UCA-R-2` Unsaved-Changes Guard on Other Navigation

A `CanDeactivate` guard on Result Detail's routed sections MUST intercept navigation away from a dirty section when the navigation is triggered by any path other than `Back`/`Next` (sidebar section click, browser back/forward, navigating to a different route).

##### Scenario: Sidebar click on a dirty section
- **GIVEN** the current section has unsaved edits
- **WHEN** the user clicks a different section in the sidebar
- **THEN** navigation is held
- **AND** the Save/Discard dialog appears
- **AND IT MUST** capture the sidebar's target section as the pending navigation.

##### Scenario: Browser back navigates away from a dirty section
- **GIVEN** the current section has unsaved edits
- **WHEN** the user triggers the browser Back action
- **THEN** the same Save/Discard dialog appears before the route actually changes.

---

#### `UCA-R-3` Save/Discard Dialog Content and Actions

The warning dialog MUST be in English, styled as a warning (per `docs/ux-ui/design.md` component patterns), read **"You have unsaved changes. If you leave now, they'll be lost. Do you want to save before continuing?"**, and offer exactly two actions: **Save** and **Discard**.

##### Scenario: Dialog has exactly two actions
- **GIVEN** the dialog is open
- **WHEN** the user inspects the available actions
- **THEN** only **Save** and **Discard** are present
- **BUT** it must NOT offer a third "stay here" / "cancel" action — the user has already committed to leaving by clicking elsewhere; the dialog only decides the fate of the edit.

---

#### `UCA-R-4` Resume Original Navigation After Save or Discard

Choosing **Save** or **Discard** in the dialog MUST resume the exact navigation the user originally triggered (the pending navigation).

##### Scenario: Save then resume
- **GIVEN** the dialog is open because the user clicked sidebar section "Geographic Location"
- **WHEN** the user clicks **Save**
- **THEN** the current section saves
- **AND**, on success, the app navigates to "Geographic Location"
- **AND**, on failure, the app stays on the current section and shows the save error (dialog does not silently swallow a save failure).

##### Scenario: Discard then resume
- **GIVEN** the dialog is open because the user clicked sidebar section "Geographic Location"
- **WHEN** the user clicks **Discard**
- **THEN** the app navigates to "Geographic Location" immediately, without saving
- **AND** the discarded section's stale in-memory edits are not persisted anywhere.

---

#### `UCA-R-5` No Interruption on Clean Sections

When a section has no unsaved edits, navigating away via any path MUST behave exactly as it does today: instant, no save call, no dialog.

##### Scenario: Clean section navigates instantly
- **GIVEN** the current section has no unsaved edits
- **WHEN** the user clicks **Next**, **Back**, or any sidebar section
- **THEN** navigation happens immediately
- **AND IT MUST NOT** invoke the save action or show any dialog.

---

#### `UCA-R-6` Tab Close / Refresh Warning

The system MUST trigger the browser's native `beforeunload` prompt when the active section has unsaved edits and the user attempts to close or refresh the tab.

##### Scenario: Native prompt on close with unsaved edits
- **GIVEN** the current section has unsaved edits
- **WHEN** the user attempts to close or refresh the browser tab
- **THEN** the browser's native "leave site" confirmation appears
- **BUT** it must NOT appear when the section has no unsaved edits.

---

### Should (SHOULD)

#### `UCA-R-10` Reusable Dirty-Check + Dialog Primitive

The dirty-check contract, the Save/Discard dialog, and the pending-navigation replay logic SHOULD be built as a small reusable primitive under `shared/`, so IPSR and the bilateral result creator can adopt it later without re-implementing a second confirm dialog, falling back to being Result-Detail-local if reuse would meaningfully expand this spec's scope.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility (WCAG 2.1 AA)** | The dialog MUST be built on `hlm-dialog` (CDK Dialog: focus trap, autofocus, restore) per `src/CLAUDE.md` §21.7 — not `app-pr-dialog`, which has none of those. Escape MUST NOT silently discard changes (per the client's hard UI rule "Escape closes drawer/dialog/popovers" — closing via Escape should behave like Discard, since there is no third "stay" action to fall back to). |
| **Performance** | The dirty check MUST be a synchronous read (a signal/getter), not an async call, so a clean-section navigation (the common case) shows zero added latency. |
| **Internationalization** | The dialog copy is structural/behavioral, not domain vocabulary that differs between P22/P25 — hardcoded English is acceptable per `src/CLAUDE.md` §11, but SHOULD be authored as a reusable string constant (not duplicated per call site) so a future locale pass has one place to change. |
| **No new side effects** | Saves triggered by this spec (Back/Next, and the dialog's Save action) MUST call the section's existing save action verbatim — no new autosave debounce, no new notification triggers beyond what "Save Draft" already does today. |
| **Backwards compatibility** | Sections with no unsaved edits MUST see no behavior change (`UCA-R-5`). |

---

## 9. Acceptance Criteria (Traceability Matrix)

| ID | Given | When | Then |
|---|---|---|---|
| `UCA-AC-1` | A dirty section | User clicks Next | Section saves, then navigates to the next section, no dialog. |
| `UCA-AC-2` | A dirty section whose save would fail | User clicks Back | App stays on the current section and shows the save error; does not navigate. |
| `UCA-AC-3` | A dirty section | User clicks a different section in the sidebar | Save/Discard dialog appears; navigation is held. |
| `UCA-AC-4` | The dialog is open (triggered by a sidebar click) | User clicks Save | Section saves, then app navigates to the originally clicked section. |
| `UCA-AC-5` | The dialog is open (triggered by a sidebar click) | User clicks Discard | App navigates to the originally clicked section immediately, without saving. |
| `UCA-AC-6` | A clean section (no unsaved edits) | User clicks Next, Back, or any sidebar section | Navigation is instant; no save call, no dialog. |
| `UCA-AC-7` | A dirty section | User attempts to close/refresh the tab | Native `beforeunload` prompt appears. |
| `UCA-AC-8` | A clean section | User attempts to close/refresh the tab | No native prompt appears. |

---

## 10. Dependencies & Assumptions

### Dependencies

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar.component.ts` (`goPrevious`/`goNext`/`goTo`, `onClickSave`).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/` (`routerLink`, `ResultSectionsService.sectionLink`).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail-routing.module.ts` (`resultDetailRouting`) — where the new `CanDeactivate` guard attaches.
- Each `rd-*` section's existing save action (the handler behind `(clickSave)`) and its form state (`FormGroup` or equivalent) to derive "dirty".
- `hlm-dialog` (Spartan/Helm CDK Dialog) for the Save/Discard dialog — consult the Spartan MCP for its current contract before implementing.

### Assumptions

- Every `rd-*` section (including `rd-result-types-pages/*`) can expose or derive a boolean "has unsaved edits" signal without a large refactor; `/akili-specify` design phase must confirm this per-section during design, not assume it uniformly.
- "Save" in the dialog reuses the exact same save action already wired to that section's `section-bottom-bar` — no new save endpoint or payload shape.
- IPSR and the bilateral result creator are explicitly out of scope for this ticket's acceptance criteria (see §3 Out of Scope); `UCA-R-10` only asks that the primitive not be built in a way that forecloses their future reuse.

---

## 11. Open Questions

- **`UCA-OQ-1`** — Should Discard also reset the section's form fields to last-saved values in place, or just navigate away and let the section reload from the server on next visit? *Leaning: reload-on-next-visit (simpler, and Result Detail already fetches section data on entry) — confirm during design.*
- **`UCA-OQ-2`** — Does every `rd-*` section already have an accessible "dirty" signal (e.g. `FormGroup.dirty`), or do some need new instrumentation? *Must be resolved in `design.md` before task breakdown — a section without a cheap dirty signal changes that section's task size.*
- **`UCA-OQ-3`** — Pressing Escape while the dialog is open: treat as Discard (matches "no third stay option"), or ignore Escape here as a deliberate exception to the hard UI rule? *Leaning: treat as Discard, for consistency with "the user has already committed to leaving" — confirm during design.*
