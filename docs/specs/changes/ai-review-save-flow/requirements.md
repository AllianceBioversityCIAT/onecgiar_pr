# Module Spec — `requirements.md`

> Depth: **Standard**. Client-only change (`onecgiar-pr-client`), no server/DB/API surface touched.

---

## 1. Module / Feature

- **Module:** `changes` (client UI/behavior fix, not a domain module)
- **Sub-feature:** `ai-review-save-flow` — AI Review modal save/validate flow
- **Owner:** M.Giraldo@cgiar.org (requester)
- **Status:** draft
- **Ticket(s):** none

---

## 2. Context

The **AI Review** modal (`app-ai-review`, `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/`) is a shared dialog mounted once in `result-detail.component.html`, reachable from every result type via `AiReviewService.showAiReview`. It has two areas: a **Fields** section (Title / Description / Innovation Short Title, each with an "Apply proposal" + "Save changes" flow) and an **Impact Areas** section (one card per DAC score — gender, climate, nutrition, environment, poverty — each with its own "Save changes").

`proposal.md` (approved 2026-09-17) documented three problems, confirmed by reading the component and its service:

1. The Impact Areas section has a bulk **Validate** button (`onValidateAll()`) that does nothing a user can't already do by clicking **Save changes** on each edited card — it calls the identical `persistDacScore()` in a loop.
2. Clicking **Apply proposal** on a field (`moveTextToInput()`) only stages the AI's text locally (`field.canSave = true`) — it does not call the API. Nothing warns the user that closing the modal at this point discards the change.
3. `onApplyProposal()` (`ai-review.service.ts:239-264`) resets `field.canSave = true` inside a `finally` block on **every** outcome, including success — so a field's "Save changes" button looks clickable again immediately after a successful save, giving no visual confirmation the change persisted. The DAC score cards already avoid this (they only reset the save state to "dirty" on a thrown error), so this is bringing the fields section in line with an existing, correct pattern in the same component.

This spec touches the **Result Detail** flow described in `docs/prd.md` (`US-S1` — submitter fills typed result fields including DAC scores; `AC-1` typed result integrity) but the AI Review modal itself is not documented in `docs/prd.md`, `docs/ux-ui/design.md`, or `docs/trd/trd.md` — it is a newer AI-assist layer with no existing spec. This is the first spec for it; scope here is limited to the three save-flow problems above, not a full spec of the whole modal.

---

## 3. In Scope / Out of Scope

### In scope

- Remove the bulk "Validate" button and its supporting dead code from the Impact Areas section.
- Add an unsaved-change reminder under a field that has an applied-but-unsaved AI proposal, in the Fields section.
- Fix the Fields section's "Save changes" button so it disables on a successful save and only re-enables when that field is edited again (matching the DAC score cards' existing behavior).

### Out of scope

- Any change to the DAC score cards' own save/disable logic (already correct; used as the reference pattern here).
- Any change to "Apply proposal" / "Applied" badge visuals or logic beyond the new reminder.
- Any change to `PATCH_saveDacScore` or `POST_saveSession` API contracts.
- Retrofitting this component's existing hardcoded English copy into the `internationalization/` i18n layer (explicitly deferred — see NFR table, Internationalization row).
- Any change to DAC score validation rules (`isIncomplete`, "Principal" component requirement).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Opens AI Review, no longer sees a redundant Validate button; sees a reminder if they apply a proposal without saving; sees the Save changes button correctly reflect saved/unsaved state. |
| QA reviewer | No change — AI Review is a submitter-side authoring tool, not part of the QA review drawer. |
| PMU lead | No change. |
| Platform admin | No change. |
| Bilateral consumer (downstream) | No change — no API/payload surface touched. |

---

## 5. User Stories

Refines `US-S1` (submitter fills typed result fields, incl. DAC scores).

- **`AIR-US-1`** — As a result submitter, I want the Impact Areas section to offer only one clear way to save each score, so that I'm not confused by two buttons (Validate and Save changes) that do the same thing.
- **`AIR-US-2`** — As a result submitter, I want to be warned when I've applied an AI proposal but not yet saved it, so that I don't lose the edit by closing the modal.
- **`AIR-US-3`** — As a result submitter, I want the Save changes button to visibly reflect whether my change is actually saved, so that I trust the system and don't re-click or second-guess it.

---

## 6. Functional Requirements

### Required (MUST)

- **`AIR-R-1`** The system MUST NOT render a bulk "Validate" control in the AI Review modal's Impact Areas section.
- **`AIR-R-2`** Each DAC score card's "Save changes" control MUST remain the only mechanism that persists that card's edits, with unchanged validation (`isIncomplete`) and unchanged success/error alerts.
- **`AIR-R-3`** When a field's AI proposal has been applied (`field.canSave === true`, i.e. staged but not yet saved), the system MUST display a reminder message associated with that field, positioned between its "Result version" input and its "Save changes" button, stating that the change is unsaved and will be lost if the modal is closed before saving.
- **`AIR-R-4`** The reminder message for a field MUST NOT be visible once that field's change has been successfully saved.
- **`AIR-R-5`** After a field's "Save changes" action succeeds, the system MUST disable that field's "Save changes" control (`globalDisabled`-equivalent visual + non-interactive state) until that field is edited again.
- **`AIR-R-6`** When a field's "Save changes" action fails (rejected request), the system MUST keep that field's "Save changes" control enabled so the user can retry, and MUST preserve the field's edited value (existing behavior, unchanged).
- **`AIR-R-7`** Editing a field's "Result version" input directly — not only via "Apply proposal" — MUST re-enable that field's "Save changes" control if it was previously disabled by a successful save.

### Should (SHOULD)

- **`AIR-R-10`** The reminder message text SHOULD be authored in English, matching this component's existing hardcoded-English copy ("Save changes", "Result version", "AI proposal", etc.) rather than mixed-language or routed through `internationalization/` — decided by the requester on 2026-09-17.

### Could / Nice-to-have (MAY)

- **`AIR-R-20`** The reminder message MAY be implemented via the existing `app-alert-status` component's hint/info variant (already used elsewhere in Result Detail for this kind of message — see `result-detail/CLAUDE.md`) rather than bespoke markup, to stay consistent with the project's shared-component convention.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | MUST be a pure client-side, additive/behavioral change — no API/DTO/entity touched, no migration. |
| **Accessibility** | The reminder message MUST be programmatically associated with its field (e.g. `aria-describedby` or adjacent text read by assistive tech in DOM order) so screen-reader users are warned, not only sighted users — per `docs/ux-ui/design.md` §10 a11y baseline. The disabled "Save changes" control MUST remain perceivable as disabled (not just visually faded) — reuse the existing `globalDisabled` pattern already used by the DAC score cards. |
| **Internationalization** | **Explicit, requester-approved exception:** this component's copy already bypasses `src/app/internationalization/` (confirmed: none of "Save changes", "Result version", "AI proposal", etc. use the `term` pipe). The new reminder copy follows that same local convention and is authored directly in English (`AIR-R-10`). Migrating the whole component to `TermKey`s is out of scope (see §3). |
| **Observability** | No new logging required — no new API calls are introduced by this spec; `onApplyProposal`'s existing `console.error` on failure is unchanged. |
| **Security** | No change — no new inputs, no new endpoints, no secrets involved. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `AIR-AC-1` | AI Review modal open, Impact Areas section visible, at least one DAC score card has a pending (unsaved) edit | The user looks at the bottom of the Impact Areas section | No "Validate" button is present anywhere in the section. |
| `AIR-AC-2` | A DAC score card has a pending edit | The user clicks that card's own "Save changes" | The edit is persisted via `PATCH_saveDacScore`, exactly as before this change (unchanged behavior, regression-guarded). |
| `AIR-AC-3` | AI Review modal open, a field (e.g. Description) shows an AI proposal not yet applied | The user clicks "Apply proposal" on that field | The proposed text is copied into "Result version" AND a reminder message appears under that field, before "Save changes", stating the change is unsaved. |
| `AIR-AC-4` | A field has an applied-but-unsaved proposal and its reminder is visible | The user clicks that field's "Save changes" and the save succeeds | The reminder disappears, and the field's "Save changes" button becomes disabled. |
| `AIR-AC-5` | A field's "Save changes" button is disabled after a successful save | The user directly edits the "Result version" input for that field (without using "Apply proposal") | The field's "Save changes" button re-enables, and (per `AIR-R-3`) the reminder reappears for that field. |
| `AIR-AC-6` | A field has a pending change and the user clicks "Save changes" | The save request fails (rejected promise) | The field's "Save changes" button remains enabled, the field's typed value is preserved, and the existing error path is unchanged (no regression). |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity, `AC-9` Security and secrets.

### 8.1 Defect Classes & Verification Gates

Before choosing verification commands, the defect classes this spec can actually produce, and what catches each:

| Defect class | Catching command / check | Automated? |
|---|---|---|
| Validate button or its dead handlers resurface | Jest assertion (no element with the removed class) + TypeScript compile failure on any stray reference | Yes |
| Reminder fails to show/hide with the field's unsaved-change state | Jest — assert both the shown and hidden states, not only one | Yes |
| "Save changes" regresses to re-enabling itself after a successful save | Jest — dedicated success-path assertion on `field.canSave`, written red-before/green-after the fix | Yes |
| A direct edit after save fails to re-enable "Save changes" | Jest — simulated edit + assertion | Yes |
| A failed save wrongly leaves "Save changes" disabled (breaks retry) | Jest — dedicated failure-path assertion, must keep passing (regression guard) | Yes |
| Visual placement, spacing, or contrast of the reminder inside the real dialog | **No automated check** — jsdom cannot lay out `app-alert-status`'s CSS | **No — substitute is a manual browser check** (`AIR-T-4` in `tasks.md`, per `onecgiar-pr-client/CLAUDE.md` §9), not silently skipped |

The one class with no automated check (visual rendering) is substituted with a mandatory manual verification task, not treated as covered by the Jest suite. See `design.md` §10 for the design-time elaboration of this same table.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `app-alert-status` (`onecgiar-pr-client/src/app/custom-fields/alert-status/`) — assumed available for the reminder message per `AIR-R-20`; confirmed by `result-detail/CLAUDE.md` to already support an `info`/hint-style variant used elsewhere in Result Detail.
- No CLARISA, ToC, Cognito, RMQ, or other external service is involved.

### Downstream consumers

- None. This spec produces no new API surface for `bilateral`, `platform-report`, or any other consumer.

### Assumptions

- The existing DAC score card save-state pattern (`persistDacScore` sets `canSave = false` only on success) is the correct reference behavior and is not itself being changed, only mirrored into the Fields section.
- No other template in the app renders a control with the exact text `"Validate"` — confirmed by a repo-wide search during `/akili-propose`; if a future change introduces one elsewhere, it is out of scope here.

---

## 10. Open Questions

None outstanding. The one open item from `proposal.md` (exact reminder wording) is resolved with a default in `AIR-R-10`'s note and Design §12; final phrasing is presented for approval at this document's review gate, not left as a blocker.

---

## 11. Out-of-Band Notes

- This is the first formal spec for the AI Review modal — there is no prior `docs/specs/` entry to reconcile with. Future AI Review work should extend this folder or link back to it rather than re-deriving context.
- No feature flag or rollout plan is needed — this is a same-deploy, always-on behavioral fix with no data migration.

---

## Required cross-references

- `docs/prd.md` — `US-S1` (submitter fills typed result fields, incl. DAC scores), `AC-1` (typed result integrity).
- `docs/ux-ui/design.md` — §10 (a11y baseline), component rules (shared components over bespoke markup).
- `docs/trd/trd.md` — no existing section documents the AI Review modal; flagged here as a documentation gap, not a blocker for this narrowly-scoped fix.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` — authoritative pattern reference for `app-alert-status` usage in this same screen.
- `docs/specs/changes/ai-review-save-flow/proposal.md` — approved intent this spec converts into requirements.
