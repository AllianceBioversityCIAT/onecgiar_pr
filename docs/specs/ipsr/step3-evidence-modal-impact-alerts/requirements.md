# Module Spec — `requirements.md` (Lite)

## 1. Module / Feature

- **Module:** `ipsr`
- **Sub-feature:** `step3-evidence-modal-impact-alerts`
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Ticket(s):** none provided

## 2. Context

Step 3 of the IPSR Innovation Use Pathway (`step-n3.component.ts/html`) already computes, for the whole step, which principal-scored (score 2) Impact Areas have no evidence tagged anywhere in the step yet (`missingPrincipalImpactAreas()` / `principalImpactAreaAlert()`), and renders one `app-alert-status` warning per missing area above "Core innovation". A reporter who opens the "Add New Evidence" dialog (`ipsr-step3-evidence-list.component`) to tag evidence does not see these warnings there — they must scroll back up to remember which Impact Area(s) need tagging. This spec surfaces the same warnings inside the dialog itself.

Screens/flows touched: IPSR → Innovation Package Detail → Innovation Use Pathway → Step 3 (`docs/ux-ui/design.md` general alert-banner pattern, `custom-alert.scss`). No API/data model touched.

## 3. In Scope / Out of Scope

### In scope

- Render the existing missing-principal-Impact-Area alerts inside the "Add New Evidence" / "Edit Evidence" dialog body, for every instance of `app-ipsr-step3-evidence-list` (core innovation, and each complementary/enabler item, both `readiness` and `use` levels).
- Reuse the existing computation (`missingPrincipalImpactAreas()`) and copy (`principalImpactAreaAlert`) — same list, same wording, shown in both places (page + dialog) at once.

### Out of scope

- Changing the alert-computation logic itself (still step-wide, not owner/level-filtered).
- Removing the existing alert block above "Core innovation" (kept as-is; this is additive).
- Any backend/API change.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| IPSR reporter (result submitter) | Sees the missing-Impact-Area warning(s) directly inside the evidence dialog, without scrolling back to the page, while deciding which tag checkboxes to mark. |

## 5. User Stories

- **`IPSR-US-1`** — As an IPSR reporter, I want to see which Impact Areas still need tagged evidence while I'm inside the "Add New Evidence" dialog, so that I tag the right checkbox(es) without leaving the dialog to check.

## 6. Functional Requirements

### Required (MUST)

- **`IPSR-R-1`** WHEN the "Add New Evidence" or "Edit Evidence" dialog (`ipsr-step3-evidence-list.component`) opens AND `missingPrincipalImpactAreas()` (computed by the parent `step-n3.component`, over the whole step) is non-empty, the system MUST render one `app-alert-status` (status `warning`) per missing Impact Area inside the dialog body, above the tag checkboxes, using the existing `principalImpactAreaAlert(area)` copy.
- **`IPSR-R-2`** The dialog-body alerts MUST appear for every instance of the evidence list component: the two core-innovation instances (`step-n3.component.html`) and both instances per complementary/enabler item (`step-n3-complementary-innovations.component.html`), via a new `@Input` passed down from `step-n3.component`.
- **`IPSR-R-3`** WHEN `missingPrincipalImpactAreas()` is empty, the dialog MUST render no alert block (no empty container).

### Should (SHOULD)

- **`IPSR-R-10`** The existing page-level alert block above "Core innovation" SHOULD remain unchanged, so a reporter scanning the page still sees the same warnings before opening any dialog.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | New alerts reuse `app-alert-status`, already accessible; no new a11y surface. |
| **Internationalization** | Reuses existing `IPSR_STEP3_EVIDENCE_COPY.principalImpactAreaAlert` — no new hardcoded strings. |
| **Backwards compatibility** | Purely additive; no existing `@Input`/output contract of `app-ipsr-step3-evidence-list` is removed. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `IPSR-AC-1` | Core innovation has a principal score of 2 on "Environmental health and biodiversity" with no evidence tagged anywhere in the step | The reporter opens "Add New Evidence" on the core-innovation readiness list | The dialog shows the warning "A principal contribution score (2) has been recorded for the **Environmental health and biodiversity** Impact Area. Please provide evidence tagged to it in this step." above the tag checkboxes |
| `IPSR-AC-2` | Same scenario as AC-1, but the dialog opened is on a complementary/enabler item's use-level list | The dialog opens | The same warning appears inside that dialog too |
| `IPSR-AC-3` | No Impact Area currently has a missing-evidence principal score | Any evidence dialog opens | No alert block renders inside the dialog |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity, `AC-6` Evidence and ToC alignment at submit.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `step-n3.component.ts` — `missingPrincipalImpactAreas()`, `principalImpactAreaAlert()`.
- `ipsr-step3-evidence-list.copy.ts` — `IPSR_STEP3_EVIDENCE_COPY.impactAreaNames`, `.principalImpactAreaAlert`.
- `step-n3-complementary-innovations.component` — intermediate pass-through for complementary items.

### Downstream consumers

- None outside this component tree.

### Assumptions

- The step-wide (not owner/level-filtered) list is the intended behavior: tagging evidence to an Impact Area anywhere in the step satisfies that area's alert, so showing the same global list in every dialog is consistent with what the page already communicates. Confirmed with the requester's own framing ("para que la gente pueda marcar el impact area al que hace referencia esta evidencia").

## 10. Open Questions

None — resolved via the assumption above (global list, not per-owner filtered).

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — no dedicated IPSR evidence goal exists yet; treat as a UX quality-of-life fix under the general reporting-accuracy goal.
- `docs/ux-ui/design.md` — alerts use the existing warning pattern (`custom-alert.scss`, `app-alert-status`); no new token.
- `docs/trd/trd.md` — no entity/API change.
