# Requirements — "Other(s) External Partners" shown by default

**Depth:** Lite (Bug Mode). Single component, template/label-only change; no data model, no API, no payload change.

## 1. Module / Feature

- **Module:** `bugfix/external-partners-toc-visibility` (client-only; `results/result-detail/rd-contributors-and-partners`)
- **Sub-feature:** External Partners picker — ToC-empty-state labeling
- **Owner:** Current user (santiago.sanchez@cgiar.org)
- **Status:** draft
- **Ticket(s):** none linked — user-reported, framed as the same defect class as P2-3499

## 2. Context

`CPNormalSelectorComponent` (`normal-selector`) renders the External Partners picker inside Result Detail → Contributors & Partners for 2026-phase, non-knowledge-product results. It implements a P2-3066 "ToC split + Other(s)" pattern: when the ToC found reference partners, they're listed first with a trailing "Other" sentinel; when the user picks that sentinel, a second dropdown opens for additional partners. When the ToC found **zero** reference partners, the same second dropdown auto-opens (so the user isn't stuck with an empty primary list) — but it keeps the static label **"Other(s) External Partners"**, which is misleading: there is nothing to be "other" than when the ToC found nothing.

This is the identical defect class already fixed for Contributing Centers/Science Programs in `docs/specs/bugfix/other-fields-toc-visibility/` (P2-3499) — External Partners was out of that spec's scope. Full diagnosis: `docs/specs/bugfix/external-partners-toc-visibility/proposal.md` §3 (Bug Diagnosis).

This touches `docs/ux-ui/design.md` DD-5 (shared section components — pickers must not drift in label/behavior across call sites) and the result-creation flow in `docs/prd.md` US-S1/US-S2 (typed result capture; type-specific / shared sections).

## 3. In Scope / Out of Scope

### In scope

- Conditionally label the auto-activated empty-ToC External Partners dropdown in `normal-selector` so it no longer reads "Other(s) External Partners" when the ToC found nothing.
- Preserve the "Other(s) External Partners" label for the genuine opt-in case (ToC found partners, user selected the sentinel).
- A regression test proving the empty-ToC case renders no "Other(s) External Partners" text, and the opt-in case still does.

### Out of scope

- Any change to which partners are selectable (the full catalog is already offered in the empty case via `otherPartnersList()`; only its label/framing changes).
- The non-empty-ToC flow (found-first, opt-in "Other(s)") — already correct, must stay unchanged.
- Save/payload wiring (`from_toc` tagging, `partnersBody`/`otherPartnersSelected`) — untouched.
- P22 / legacy / knowledge-product flows (the single flat dropdown at `html:54-68`) — unaffected, no ToC-split branch there.
- Merging this fix's mechanism with the Centers/Science components from the sibling spec — separate file, separate review.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees a normally-labeled "External partners" dropdown (not "Other(s)…") when their 2026-phase result's ToC node has no mapped external partners. |
| QA reviewer | No change (read-only mirror unaffected). |

## 5. User Stories

- **`EPT-US-1`** — As a result submitter, I want the External Partners picker to look like a normal dropdown (not "Other(s)…") when the ToC found nothing for my result, so that the UI doesn't imply a nonexistent base ToC selection.
  Refines `US-S1`, `US-S2`.

## 6. Functional Requirements

### Required (MUST)

- **`EPT-R-1`** In `normal-selector` (External Partners), when `hasReferencePartners()` is `false` (2026-phase, non-knowledge-product result, ToC found zero external partners), the system MUST render the auto-activated full-catalog partners dropdown **without** the label/`labelText` "Other(s) External Partners".
- **`EPT-R-2`** In the same empty-ToC state, the system MUST continue to render the orange advisory note ("No External Partners related to the established HLO/Outcomes were found") directly above the relabeled dropdown, unchanged from today.
- **`EPT-R-3`** In the same empty-ToC state, the system MUST offer the same full, unfiltered partner catalog as today (`otherPartnersList()` selectable values unchanged) — only the label changes, not the options.
- **`EPT-R-4`** When `hasReferencePartners()` is `true` and the user selects the "Other" sentinel from the primary dropdown, the system MUST continue to render the second dropdown labeled "Other(s) External Partners" — unchanged from today (regression guard).

### Should (SHOULD)

- **`EPT-R-10`** The relabeled empty-state field SHOULD reuse this component's own primary-field label ("External partners", `html:2`) rather than inventing new copy, unless the user/QA requests different wording during review.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No change to selectable values, save payload shape, or `from_toc` tagging — presentation-only. |
| **Consistency** | Empty-state framing MUST match this component's own primary-field framing (no "Other(s)" text with nothing to be "other" than). |
| **Accessibility** | The control already carries a programmatic `label` today; it MUST keep one (conditionally resolved, not removed) — no regression on WCAG 2.1 AA per `docs/ux-ui/design.md` §10. |
| **Internationalization** | The new/changed label string stays an inline literal consistent with the existing (non-i18n-wrapped) labels already used by this component — no new i18n debt introduced beyond what exists today. |

### 7.1 Defect classes this spec can produce, and what catches each

| Defect class | Catching command / check |
|---|---|
| Stale "Other(s) External Partners" text still shown in the empty-ToC state (the bug itself, un-fixed or half-fixed) | Jest assertion on the resolved label text via a `data-testid` hook (`EPT-TEST-1`) — not on the DOM `label` attribute (a property-bound `[label]` doesn't reflect as one, matching `RB-S1` from the sibling spec). |
| Opt-in "Other(s)" case (non-empty ToC, user selects the sentinel) accidentally relabeled — regression of `EPT-R-4` | Same Jest suite, explicit opt-in-state test case (`EPT-TEST-1`). |
| A test selector that silently never matches (false-negative gate) | Every regression test must be verified RED against a pre-fix checkout and GREEN after (stated in the task's DoD) — a selector that never matches would show as an *always-green* test regardless of code state. |
| Selectable catalog values change in the empty-ToC state (scope creep beyond the label fix) | Not independently tested by a new case — mitigated by construction: the task does not touch `otherPartnersList()`/`dropdown1OptionsPartners()`/`referenceExternalPartners()`. Recorded as a low-risk accepted gap rather than a false "covered." |
| Existing, unrelated test broken by this change | Full existing `cpnormal-selector.component.spec.ts` suite run — task DoD. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `EPT-AC-1` | A 2026-phase, non-knowledge-product result open in Result Detail → Contributors & Partners, whose ToC node maps to 0 external partners | The External Partners section renders | The orange "No External Partners…" note is shown, AND a full-catalog partners dropdown is shown, AND its resolved label is NOT "Other(s) External Partners". |
| `EPT-AC-2` (regression guard) | Same section, ToC node maps to **at least 1** external partner | The user selects the "Other" sentinel from the primary dropdown | The second dropdown appears and its resolved label IS "Other(s) External Partners" — unchanged from current behavior. |

Cross-cutting project ACs that already apply (do NOT restate): `AC-1` (typed result integrity — unaffected), `AC-9` (no secrets in logs — unaffected).

### Scenario detail for `EPT-AC-1`

```
### Requirement: Empty-ToC External Partners dropdown is not labeled "Other(s)"

The system SHALL render a normally-labeled full-catalog dropdown when the ToC found no reference external partners.

#### Scenario: ToC node has zero mapped external partners
- GIVEN a 2026-phase, non-knowledge-product result whose ToC node/HLO maps to 0 external partners
- WHEN the submitter opens the Contributors & Partners section
- THEN the orange "No External Partners related to the established HLO/Outcomes were found" note is shown
- AND a full-catalog partners `app-pr-multi-select` is shown, auto-activated (no click needed)
- BUT its resolved label MUST NOT be "Other(s) External Partners"
- AND IT MUST offer the same full institutions-without-centers catalog as before (selectable values unchanged)
```

### Scenario detail for `EPT-AC-2`

```
### Requirement: Opt-in "Other(s)" case keeps its label

#### Scenario: ToC node has at least one mapped external partner, user opts into "Other"
- GIVEN a 2026-phase, non-knowledge-product result whose ToC node maps to 1+ external partners
- WHEN the submitter selects the trailing "Other" sentinel in the primary dropdown
- THEN the second dropdown appears
- AND its resolved label IS "Other(s) External Partners" — unchanged
```

## 9. Dependencies & Assumptions

### Upstream dependencies

- `InstitutionsService.institutionsWithoutCentersPartners()` (signal-backed catalog) and `RdContributorsAndPartnersService.tocReferencePartnerInstitutionIds()` — unchanged, already consumed by `normal-selector`.

### Downstream consumers

- None beyond `normal-selector` itself — no API/payload consumer is affected.

### Assumptions

- The exact replacement label text defaults to reusing the primary field's label ("External partners", per `EPT-R-10`); confirm during design review if QA wants different wording.

## 10. Open Questions

- `EPT-OQ-1` — Exact label text for the relabeled empty-state field: reuse the primary label verbatim (default, per `EPT-R-10`), or a distinct string ("Select partner", the primary dropdown's placeholder)? Does not block the fix itself since either choice satisfies "MUST NOT be labeled Other(s)…" — resolved in `design.md`.

## 11. Out-of-Band Notes

- None.

## Required cross-references

- `docs/prd.md` — `US-S1`, `US-S2`.
- `docs/ux-ui/design.md` — DD-5 (shared section components), §10 (accessibility, unaffected).
- `docs/trd/trd.md` — §2 client page-module table (`pages/results`).
- `docs/specs/bugfix/external-partners-toc-visibility/proposal.md` — Bug Diagnosis (root cause, reproduction).
- `docs/specs/bugfix/other-fields-toc-visibility/` — structural precedent (`OTV-DD-1` conditional-binding mechanism, `RB-S1` testid finding).
