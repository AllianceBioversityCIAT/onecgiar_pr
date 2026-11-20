# Module Spec — `design.md`

> Linked: [`requirements.md`](./requirements.md) (same folder). Depth: **Standard**.

---

## 1. Summary

This design removes the redundant bulk "Validate" control from the AI Review modal's Impact Areas section, and fixes the Fields section's save flow (Title/Description/Innovation Short Title) so it warns the user about an unsaved applied proposal and honestly reflects saved/unsaved state on the "Save changes" button. The whole change lives inside two existing files — `ai-review.component.{ts,html,scss}` and `ai-review.service.ts` — plus their spec files. No new component, service, route, or API endpoint is introduced. The biggest constraint accepted: the reminder and the disable-on-success fix must reuse existing shared primitives (`app-alert-status`, the `globalDisabled` class, the DAC-score cards' own `canSave` pattern) rather than adding new bespoke UI, per `onecgiar-pr-client/CLAUDE.md` §5.

Implements `requirements.md` `AIR-R-1`..`AIR-R-20`. No `docs/trd/trd.md` section exists for the AI Review modal today (noted as a gap in `requirements.md` §11).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/` (`ai-review.component.ts/.html/.scss/.spec.ts`) and `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts` (+ `.spec.ts`).
- **Server modules touched:** none.
- **External integrations touched:** none — the two existing endpoints this modal already calls (`POST /ai/sessions/{id}/save` via `POST_saveSession`, `PATCH /ai/dac-scores/{resultId}` via `PATCH_saveDacScore`) are invoked exactly as before; no request/response shape changes.

### 2.2 Sequence / interaction

**Flow A — Fields section (Title / Description / Innovation Short Title), updated:**

```
[User clicks "Apply proposal" on a field]
  └── moveTextToInput(field): field.canSave = true, original_text = proposed_text
        └── Template: field.canSave === true → reminder (app-alert-status, warning) renders
              under the "Result version" input, before "Save changes"

[User edits "Result version" directly] (new)
  └── (ngModelChange) → field.canSave = true
        └── Same reminder + enabled-button state as above, regardless of prior save state

[User clicks "Save changes" on that field]
  └── AiReviewService.onApplyProposal(field, index)
        ├── field.canSave = false; POST_saveSession(...)
        ├── on success (changed): field.canSave stays false → reminder hides, button disabled
        └── on failure (changed): field.canSave = true → reminder stays, button re-enabled, retry possible
```

**Flow B — Impact Areas section (DAC score cards), unchanged individual save, Validate removed:**

```
[User changes a card's tag/component radio or checkbox]
  └── onResultVersionChange / onComponentChange: dacScore.canSave = true

[User clicks that card's own "Save changes"]
  └── onSaveDacScore(dacScore) → persistDacScore(dacScore) → PATCH_saveDacScore(...)
        └── on success: dacScore.canSave = false (unchanged)
        └── on failure: dacScore.canSave stays true, error alert shown (unchanged)

[No bulk action exists anymore — onValidateAll(), isValidatingAll, hasPendingChanges,
 pendingDacScores, and the "Validate" button are deleted]
```

---

## 3. Data Model Changes

Not applicable — no entity, column, or migration is touched. `field.canSave` / `DacScores.canSave` are transient client-side UI state already declared on the existing `DacScores` interface and the plain field objects in `AiReviewService.currnetFieldsList()`; no new fields are added to any interface.

### 3.1 Entities

N/A.

### 3.2 Migrations

N/A — `npm run migration:check` is unaffected by this spec.

### 3.3 CLARISA / external-data implications

N/A.

---

## 4. API Surface

### 4.1 New / changed endpoints

None. This spec changes only client-side state transitions around two already-existing calls:

| Endpoint | Caller | Change |
|---|---|---|
| `POST /ai/sessions/{sessionId}/save` | `AiReviewService.POST_saveSession` (via `onApplyProposal`) | No request/response change. Only the client's post-response handling of `field.canSave` changes (`AIR-DD-3`). |
| `PATCH /ai/dac-scores/{resultId}` | `AiReviewService.PATCH_saveDacScore` (via `persistDacScore`) | No change at all — still reachable only from `onSaveDacScore`, since `onValidateAll` (its other caller) is deleted. |

### 4.2 Bilateral / platform-report impact

N/A — neither endpoint is part of `/api/bilateral/*` or `/api/platform-report/*`.

---

## 5. Server Workflow / Business Rules

N/A — no server code is touched by this spec.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route or module change. `AiReviewComponent` is a standalone component already declared once inside `result-detail.component.html` (`<app-ai-review></app-ai-review>`, `result-detail.component.html:211`). No new lazy-loaded module, no new guard.

### 6.2 Components & services

- **`AiReviewComponent`** (`ai-review.component.ts`):
  - Remove `onValidateAll()`, `isValidatingAll`, `get pendingDacScores()`, `get hasPendingChanges()` — dead once the Validate button is gone (`AIR-DD-1`). Keep `persistDacScore`, `onSaveDacScore`, `isIncomplete` — still owned by the per-card save flow.
  - Template (`ai-review.component.html`): remove the `validate-all-section` block (button + wrapper, `AIR-R-1`). Inside the fields `@for` loop, add the conditional `app-alert-status` reminder (`AIR-R-3`/`R-4`, `AIR-DD-2`) and the `(ngModelChange)` dirty-tracking hook on the "Result version" input/textarea (`AIR-R-7`, `AIR-DD-3`).
  - Styles (`ai-review.component.scss`): remove the now-unused `.validate-all-section` rule. Any spacing the reminder needs stays in this file (legacy SCSS component, not a Tailwind-first surface — see `onecgiar-pr-client/CLAUDE.md` §5's "existing SCSS-heavy components are legacy, migrate opportunistically, don't add to them").
- **`AiReviewService`** (`ai-review.service.ts`):
  - `onApplyProposal(field, index)`: change the `finally` block so `field.canSave` is reset to `true` only on a thrown/rejected save; on success it stays `false` (`AIR-R-5`/`R-6`, `AIR-DD-3`). `savingProposalIndex.set(null)` still runs unconditionally in `finally` — that part is unrelated to `canSave` and stays as-is.
  - No new methods, no new service.
- **State boundary:** unchanged — `field.canSave` / `dacScore.canSave` remain plain mutable properties on the objects held in `AiReviewService.currnetFieldsList()` / `dacScores()` signals, exactly the existing pattern. No new state container.

### 6.3 Design system usage

- **Component:** `app-alert-status` (`custom-fields/alert-status/`), already exported by `CustomFieldsModule`, which `AiReviewComponent` already imports — no new import needed. Used with `status="warning"` so it renders through the component's always-visible branch (the click-to-expand disclosure only applies to `status="info"`) — see `AIR-DD-2`.
- **Tokens:** none new — `app-alert-status` themes itself from its own SCSS.
- **Responsive:** no layout change beyond the reminder's own height; the fields section already stacks vertically at all breakpoints.
- **A11y:** the reminder renders as a DOM sibling immediately after the "Result version" input and before "Save changes," so assistive tech encounters it in reading order without extra ARIA wiring (`requirements.md` NFR row, the DOM-order fallback it explicitly allows). The disabled "Save changes" button reuses the existing `globalDisabled` global class (`styles.scss`), which already pairs opacity + `pointer-events: none` with the DAC score cards — same perceivable-disabled treatment, no new pattern.
- **i18n:** explicit, requester-approved exception — new copy is hardcoded English, matching this component's existing convention (`requirements.md` NFR row, `AIR-R-10`).

### 6.4 Real-time / notification UX

N/A — no socket/Pusher event, no notification-setting interaction.

---

## 7. Security & Authorization

N/A — no new endpoint, no new role/guard, no new input surface. The reminder's `description` text is a static string (not user-controlled), so `app-alert-status`'s `[innerHTML]` rendering introduces no injection surface (flagged as an invariant to preserve in §13).

---

## 8. Performance & Capacity

Negligible. No new HTTP calls are introduced; the `(ngModelChange)` handler is a synchronous property assignment with no I/O. Bundle size is unaffected (`app-alert-status` is already loaded by this component's existing `CustomFieldsModule` import).

---

## 9. Observability

No new logging. `onApplyProposal`'s existing `console.error`-free failure path (the promise simply rejects up to the `finally`) is unchanged in this spec — only which branch resets `canSave` changes.

---

## 10. Testing Plan (forward-looking)

- **Unit — `ai-review.component.spec.ts`:** remove the `describe('onValidateAll', ...)` block and any assertion reading `hasPendingChanges` / `pendingDacScores` / `isValidatingAll` (`AIR-DD-1`, satisfies `AIR-AC-1`). Add cases asserting the reminder renders/hides with `field.canSave` (`AIR-AC-3`, `AIR-AC-4`) and that editing "Result version" directly flips `field.canSave` back to `true` (`AIR-AC-5`).
- **Unit — `ai-review.service.spec.ts`:** add cases for `onApplyProposal` covering the success branch (`field.canSave` stays `false`) and the failure branch (`field.canSave` resets to `true`, `AIR-AC-6`) — this file exists today but has no coverage of either branch.
- **No Cypress/CT needed:** `ai-review/` is not under `custom-fields/`, so Jest/jsdom is sufficient — the affected behavior is conditional rendering and class toggling, not CSS layout that jsdom can't evaluate.
- **Coverage:** client thresholds are 50/60/60/60 (`package.json`). Net effect should be neutral-to-positive: dead code (and its now-meaningless tests) is removed, and the new branches (`AIR-R-3`..`R-7`) each gain direct test coverage.
- **Defect classes this spec can produce, and what catches each:**

  | Defect class | Catching command / check |
  |---|---|
  | Validate button or its handlers resurface somewhere | `ai-review.component.spec.ts` assertion that no element with the removed class/handler exists; compile-time TS error if a template still references a deleted method |
  | Reminder fails to show/hide with `canSave` | New Jest cases in `ai-review.component.spec.ts` (`AIR-AC-3`/`AIR-AC-4`) |
  | `canSave` regresses to the old always-reset behavior | New Jest cases in `ai-review.service.spec.ts` (`AIR-AC-6`) directly asserting the post-success and post-failure values |
  | Manual edit doesn't re-enable a disabled field | New Jest case simulating `(ngModelChange)` (`AIR-AC-5`) |
  | Visual placement/contrast of the reminder looks wrong in the real dialog | **No automated check** — jsdom does not lay out `app-alert-status`'s CSS. Substitute: manual verification in a real browser per `onecgiar-pr-client/CLAUDE.md` §9 ("Verifying in a REAL browser") before marking the spec done — recorded as a task done-criterion, not left silent. |

---

## 11. Backwards Compatibility & Migration Plan

N/A — no database migration, no API versioning, no feature flag. This ships as a normal same-deploy client change; if it needs to be rolled back, reverting the PR is sufficient (see `tasks.md` Roll-back plan).

---

## 12. Design Decisions (ADRs)

### `AIR-DD-1` — Remove the bulk Validate control and its now-dead code

- **Context:** `proposal.md` confirmed `onValidateAll()`, `isValidatingAll`, `hasPendingChanges`, and `pendingDacScores` exist solely to back the "Validate" button; removing only the button would leave dead code and tests exercising an unreachable path.
- **Decision:** delete the button + wrapper (`.html`), the four now-unused members (`.ts`), the `.validate-all-section` rule (`.scss`), and the `describe('onValidateAll', ...)` block (`.spec.ts`).
- **Alternatives considered:** (a) template-only removal, leaving the dead code — rejected, violates the repo's no-dead-code convention and leaves misleading tests; (b) hide behind a feature flag — rejected, nobody asked for a toggle and it adds indirection for a permanent removal.
- **Consequences:** users lose the one-click bulk save; they save each Impact Area card individually, which was already fully supported and unchanged. No data-loss risk — the same `PATCH_saveDacScore` call happens either way.
- **Reversion challenge (Step 2.3) — "What does removing this break?"** A repo-wide search (done during `/akili-propose` and re-confirmed while writing this design) found exactly one call site each for `onValidateAll`, `isValidatingAll`, `hasPendingChanges`, `pendingDacScores`, and the `text="Validate"` button — all inside `ai-review.component.*`. No other component, route, guard, or service references them. **Verdict: safe to remove; nothing else in the app depends on this code path.**

### `AIR-DD-2` — Reminder message reuses `app-alert-status`, not bespoke markup

- **Context:** need a message that is visible immediately (not collapsed behind a click-to-expand icon) under a field with an unsaved applied proposal.
- **Decision:** render `app-alert-status` with `status="warning"`. `warning` (like `error`/`success`) always renders through the component's always-visible branch — only `status="info"` gets the collapsed/expand disclosure — so no extra `[collapsible]` input is needed. `CustomFieldsModule`, which exports `AlertStatusComponent`, is already imported by `AiReviewComponent`.
- **Alternatives considered:** (a) a hand-rolled `<div>` + new SCSS rule — rejected, duplicates styling the shared component already provides and violates the "prefer shared components" convention (`onecgiar-pr-client/CLAUDE.md` §5); (b) `status="info"` — rejected, `info` defaults to collapsed-behind-an-icon, which hides exactly the message that must be seen immediately.
- **Consequences:** the reminder inherits `app-alert-status`'s existing visual language (same family of hints used elsewhere in Result Detail) at zero new SCSS cost.

### `AIR-DD-3` — `canSave` resets only on failure; manual edits get their own dirty hook

- **Context:** `onApplyProposal()`'s `finally` block currently resets `field.canSave = true` on every outcome (success and failure alike), which is why the button looks re-enabled immediately after a successful save. The reset exists for a real reason, per the method's own comment: without it, a failed save left a permanently dead button.
- **Decision:** split the reset by outcome — on success, `field.canSave` stays `false` (disabled); on a thrown/rejected save, set `field.canSave = true` (re-enabled, retry possible). Separately, add `(ngModelChange)="field.canSave = true"` on the "Result version" input/textarea so a direct edit — not only a fresh "Apply proposal" click — can re-enable an already-saved field. This mirrors the DAC score cards' own `onResultVersionChange` / `onComponentChange`, which already set `canSave = true` on every user change.
- **Alternatives considered:** (a) leave the state logic untouched and only restyle the button — rejected, the underlying state is what's wrong, a visual patch would desync from reality again the next time someone touches this code; (b) introduce a new `savedSuccessfully` flag alongside `canSave` — rejected as unnecessary complexity; `canSave`'s existing meaning ("this field has something to persist") already expresses exactly what's needed.
- **Consequences:** the original "never leave a dead button after a failed save" guarantee is preserved, now correctly scoped to the failure path only — matching the DAC score cards' already-correct behavior instead of contradicting it.

---

## 13. Open Gaps & Follow-ups

- This is the first spec covering the AI Review modal; documenting the whole modal (including a `docs/trd/trd.md` entry) is worthwhile future work, out of scope here.
- i18n retrofit of this component's copy into `TermKey`s remains deferred (see `requirements.md` NFR row).
- Invariant to preserve: `app-alert-status`'s `description` renders via `[innerHTML]`. This spec's reminder text is a static string, so there is no injection risk today — any future caller that binds `description` to user-controlled input must sanitize first.
- Visual placement/spacing of the reminder inside the dialog has no automated check (jsdom cannot lay out CSS) — flagged in §10 as a manual-verification requirement, not silently skipped.

---

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 4 |
| Expected LOC | ~180 (implementation ~70 across `.html`/`.ts`/`.scss`; tests ~110 net across `ai-review.component.spec.ts` + `ai-review.service.spec.ts`) |
| Expected review rounds | 1 per task — small, testable, single-file-pair changes with no new architecture |

**Sizing check against the chosen depth (Standard):** the estimate lands within Standard's normal range — larger than a one-line Lite tweak (three distinct, independently testable behavior changes), smaller than anything warranting Full (no API/data/migration/auth surface). No depth change recommended. `/akili-execute` should treat these numbers as the tripwire: if actuals run materially past 4 tasks / ~180 LOC / 1 rework round each, stop and escalate rather than continuing silently.

---

## Required cross-references

- [`requirements.md`](./requirements.md) (same folder).
- `docs/prd.md` — `US-S1`, `AC-1`.
- `docs/ux-ui/design.md` — §10 a11y baseline; no AI Review-specific section exists yet (gap noted in `requirements.md` §11).
- `docs/trd/trd.md` — no AI Review module entry exists yet (same gap).
- `onecgiar-pr-client/CLAUDE.md` §5 — shared-component and legacy-SCSS conventions this design follows.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` — §9 "Verifying in a REAL browser," cited for the manual visual-check follow-up in §10/§13.
