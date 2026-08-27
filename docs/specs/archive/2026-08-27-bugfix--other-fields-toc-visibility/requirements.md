# Requirements — Other(s) Contributing Centers/Science Programs shown by default (P2-3499)

**Depth:** Lite (Bug Mode). Narrow relabel + one added branch across three sibling components; no data model, no API, no payload change.

## 1. Module / Feature

- **Module:** `bugfix/other-fields-toc-visibility` (client-only; spans `results/result-detail`, `result-framework-reporting/entity-aow`, `result-framework-reporting/dashboard-lab`)
- **Sub-feature:** Contributing CGIAR Centers / Contributing Science Programs — ToC-empty-state labeling
- **Owner:** Current user (santiago.sanchez@cgiar.org)
- **Status:** draft
- **Ticket(s):** P2-3499

## 2. Context

Three sibling components implement the same "split from ToC + Other(s)" picker (P2-2998/P2-2929): `rd-contributors-and-partners` (Result Detail, 2026 phases), `aow-hlo-create-modal` ("Report result" modal), and `lab-report-form` (the drawer copy of that modal, opened from the Reporting tab's `Report` button — the W1/W2 result-creation path the ticket names). When the ToC node has no mapped Centers/Science Programs, the first two auto-activate a dropdown **literally titled "Other(s) Contributing CGIAR Centers" / "Other(s) Science Program(s)"** — which Ángel Alberto Jarrín Rivas (P2-3499) says is wrong: there is nothing to be "other" than when the ToC found nothing, so the user should just see a normal full-catalog picker. `lab-report-form` has a related but distinct gap: it never received the auto-activation branch at all, so the same empty-ToC case leaves the user with a dead-end primary dropdown containing only the "Other(s)" sentinel.

This touches `docs/ux-ui/design.md` DD-5 (shared section components for cross-cutting blocks — Centers/SP pickers must not drift in label/behavior across call sites) and the result-creation flow in `docs/prd.md` US-S1/US-S2 (typed result capture; type-specific / shared sections).

Full diagnosis: `docs/specs/bugfix/other-fields-toc-visibility/proposal.md` §3 (Bug Diagnosis).

## 3. In Scope / Out of Scope

### In scope

- Relabel the auto-activated empty-ToC dropdown in `rd-contributors-and-partners` and `aow-hlo-create-modal` so it no longer reads "Other(s)…".
- Add the missing empty-ToC branch (orange note + auto-activated, correctly-labeled full-catalog dropdown) to `lab-report-form`, mirroring the other two.
- Regression tests proving the empty-ToC case no longer shows an "Other(s)"-labeled field, per component.

### Out of scope

- Any change to which centers/programs are selectable (the full catalog is already offered in the empty case; only its label/framing changes).
- The non-empty-ToC flow (found-first, opt-in "Other(s)") — already correct, must stay unchanged.
- Save/payload wiring (`from_toc` tagging, `onSaveSection`) — untouched.
- P22 / legacy (non-`isCP2026()`) flows — they use a single flat dropdown and don't have this branch.
- Merging the three components into one shared implementation (flagged as a follow-up in the proposal, Option 2 — not this spec).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees a normally-labeled dropdown (not "Other(s)…") when their result's ToC node has no mapped Centers/Science Programs, across all three creation/edit entry points. |
| QA reviewer | No change (read-only mirror is unaffected by this label fix). |

## 5. User Stories

- **`OTV-US-1`** — As a result submitter, I want the Contributing Centers/Science Programs picker to look like a normal dropdown (not "Other(s)…") when the ToC found nothing for my result, so that the UI doesn't imply a nonexistent base ToC selection.
  Refines `US-S1`, `US-S2`.

## 6. Functional Requirements

### Required (MUST)

- **`OTV-R-1`** In `rd-contributors-and-partners`, when `hasReferenceCenters()` is `false` (2026-phase result, ToC found zero centers), the system MUST render the auto-activated full-catalog Centers dropdown **without** the label "Other(s) Contributing CGIAR Centers".
- **`OTV-R-2`** In `rd-contributors-and-partners`, when `hasReferenceScience()` is `false`, the system MUST render the auto-activated full-catalog Science Programs dropdown **without** the label "Other(s) Science Program(s)".
- **`OTV-R-3`** In `aow-hlo-create-modal`, when `hasReferenceCenters()` is `false`, the system MUST render the auto-activated full-catalog Centers dropdown **without** the label "Other(s) Contributing CGIAR Centers".
- **`OTV-R-4`** In `aow-hlo-create-modal`, when `hasReferenceScience()` is `false`, the system MUST render the auto-activated full-catalog Science Programs dropdown **without** the label "Other(s) Science Program(s)/Accelerator(s)".
- **`OTV-R-5`** In `lab-report-form`, when the ToC node maps to zero reference centers, the system MUST show the orange advisory note ("No CGIAR Centers related to the established HLO/Outcomes were found") and auto-activate a full-catalog Centers dropdown that is **not** labeled "Other(s)…" — without requiring the user to first pick the sentinel out of a single-option primary dropdown.
- **`OTV-R-6`** In `lab-report-form`, when the ToC node maps to zero reference Science Programs, the system MUST show the equivalent orange advisory note and auto-activate a full-catalog Science Programs dropdown that is **not** labeled "Other(s)…", under the same condition as `OTV-R-5`.

### Should (SHOULD)

- **`OTV-R-10`** The relabeled/re-framed empty-state field SHOULD reuse **its own component's own primary-field label or heading text** (not a single string forced across all three components — see amendment note below), unless the user/QA requests different wording during review.

> **Amendment (post-design, `design.md` `OTV-DD-2`, `judgment.md` round 2):** the three components' primary Science labels already differ verbatim from each other today (`"Contributing Science Program/Accelerator"` rd / `"Contributing Science Programs/Accelerators"` aow / `"Contributing Science Programs"` lab) — unifying them is out of scope (§3). `OTV-R-10` is satisfied per-component, not by a single cross-component string. Additionally, the mechanism differs by component's existing markup: `rd-contributors-and-partners`/`aow` Centers keep a conditional `label` on `app-pr-multi-select`; `aow` Science suppresses a separate `app-pr-field-header` entirely in the empty case (relying on that section's always-rendered top-level header); `lab-report-form` never had a `label` (only a `placeholder`, which is what changes there — reusing the component's own vocabulary, not label text). The Accessibility NFR row below is scoped accordingly.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No change to selectable values, save payload shape, or `from_toc` tagging — presentation-only. |
| **Consistency** | Within each component, empty-state framing MUST match that component's own primary-field framing (no "Other(s)" text with nothing to be "other" than). Does NOT require the three components' label/placeholder text to read identically to each other — see `OTV-R-10` amendment. |
| **Accessibility** | Where a control already carries a programmatic `label` today (`rd-contributors-and-partners`, `aow` Centers), it MUST keep one — no regression on WCAG 2.1 AA per `docs/ux-ui/design.md` §10. `aow` Science's empty-state relies on that section's always-rendered top-level header for the accessible name (no per-se regression — a static, non-interactive header text node is removed, not a functional label). `lab-report-form` carries no `label` on these controls before or after this fix (placeholder-only, as today) — not a regression introduced by this spec. |
| **Internationalization** | New/changed label strings stay inline literals consistent with the existing (non-i18n-wrapped) labels already used by these three components — no new i18n debt introduced beyond what exists today. |

### 7.1 Defect classes this spec can produce, and what catches each

| Defect class | Catching command / check |
|---|---|
| Stale "Other(s)…" text still shown in the empty-ToC state (the bug itself, un-fixed or half-fixed) | Jest assertion on the resolved `label`/header text via `data-testid` (`OTV-TEST-1/2`) — not on the DOM `label` attribute (a property-bound `label` doesn't reflect as one; see `design.md` RB-S1). |
| Opt-in "Other(s)" case (non-empty ToC, user selects the sentinel) accidentally relabeled — regression of `OTV-AC-7` | Same Jest suites, explicit opt-in-state test case (`OTV-TEST-1/2`) + the Cypress opt-in case (`OTV-TEST-4`). |
| Duplicate/stacked field label rendered in the empty-ToC state (the exact defect Judgment Day round 1 found in the original draft) | Jest DOM query counting header/label occurrences (`OTV-TEST-1/2`); for `lab-report-form`, no automated DOM check exists (see below) — substituted by a mandatory manual/browser check (`OTV-TEST-5`, `OTV-T-3` DoD). |
| A test selector that silently never matches (false-negative gate — e.g. an attribute selector against a property binding, which is exactly what broke the original round-1 test-fix plan) | No automated meta-check exists for "did my selector actually select something." **Substituted by an explicit process requirement**: every regression test in `OTV-T-1`/`T-2`/`T-3` must be verified RED against a pre-fix checkout and GREEN after (stated in each task's DoD) — a selector that never matches would show as an *always-green* test regardless of code state, which the red/green verification step is designed to catch. |
| Existing, unrelated test/snapshot broken by this change (regression to pre-existing coverage) | Full existing Jest suite run per touched file + hand-reviewed snapshot regeneration (not blind `-u`) — `OTV-T-2` DoD. |
| `lab-report-form`'s empty-ToC branch renders incorrectly at the DOM level (wrong placeholder, note in the wrong place, etc.) | **No automated check exists** — this component's Jest suite renders no template (`.overrideComponent(..., { set: { template: '' } })`) and it has no Cypress spec. **Accepted, substituted by a manual/browser check**, recorded as a mandatory DoD item on `OTV-T-3` rather than silently assumed covered by the Jest suite. |
| Selectable catalog values change in the empty-ToC state (scope creep beyond the label/placeholder fix) | Not independently tested by a new case — mitigated by construction: no task touches `otherCentersList()`/`otherScienceList()`/`dropdown1Options()` or the CLARISA catalog services; the fix is confined to `label`/`placeholder`/header-presence bindings. Recorded as a low-risk accepted gap rather than a false "covered." |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `OTV-AC-1` | A 2026-phase result open in Result Detail → Contributors & Partners, whose ToC node maps to 0 CGIAR Centers | The section renders | The orange "No CGIAR Centers…" note is shown, AND a full-catalog Centers dropdown is shown, AND its label is NOT "Other(s) Contributing CGIAR Centers". |
| `OTV-AC-2` | Same result, ToC node maps to 0 Science Programs | The section renders | The orange "No Science Programs…" note is shown, AND a full-catalog Science Programs dropdown is shown, AND its label is NOT "Other(s) Science Program(s)". |
| `OTV-AC-3` | The "Report result" modal (`aow-hlo-create-modal`) opened for an indicator whose ToC node maps to 0 Centers | The modal renders | Same as `OTV-AC-1`, in the modal. |
| `OTV-AC-4` | Same modal, ToC node maps to 0 Science Programs | The modal renders | The orange "No Science Programs…" note is shown, AND the "Other(s) Science Program(s)/Accelerator(s)" header/framing is absent from the empty state (this control is `app-pr-filter-multiselect`, not `app-pr-multi-select` — see `design.md` §6.2/C-2; there is no `label` to assert on, the check is the header's absence). |
| `OTV-AC-5` | `lab-report-form` drawer opened (Reporting tab → `Report`) for an indicator whose ToC node maps to 0 Centers | The form renders | Orange note + auto-activated, correctly-labeled full-catalog Centers dropdown appear WITHOUT the user having to pick anything from the primary dropdown first. |
| `OTV-AC-6` | Same drawer, ToC node maps to 0 Science Programs | The form renders | Same as `OTV-AC-5`, for Science Programs. |
| `OTV-AC-7` (regression guard) | Any of the three components, ToC node maps to **at least 1** Center and/or Science Program | The section/modal/form renders | Found items are shown first from the primary dropdown; the "Other(s)…"-labeled dropdown appears **only** after the user selects the "Other(s)" sentinel — unchanged from current behavior. |

Cross-cutting project ACs that already apply (do NOT restate): `AC-1` (typed result integrity — unaffected), `AC-9` (no secrets in logs — unaffected).

### Scenario detail for `OTV-AC-1` (representative — same shape applies to AC-2..AC-6)

```
### Requirement: Empty-ToC Centers dropdown is not labeled "Other(s)"

The system SHALL render a normally-labeled full-catalog dropdown when the ToC found no reference centers.

#### Scenario: ToC node has zero mapped centers
- GIVEN a 2026-phase (isCP2026) result whose ToC node/HLO maps to 0 CGIAR Centers
- WHEN the submitter opens the Contributors & Partners section
- THEN the orange "No CGIAR Centers related to the established HLO/Outcomes were found" note is shown
- AND a full-catalog Centers `app-pr-multi-select` is shown, auto-activated (no click needed)
- BUT its `label` MUST NOT be "Other(s) Contributing CGIAR Centers"
- AND IT MUST offer the same full CLARISA centers catalog as before (selectable values unchanged)
```

## 9. Dependencies & Assumptions

### Upstream dependencies

- `CentersService` (`centersSE.centers()` / `centersSE.centersList`) and `allScienceProgramsList` / `allInitiatives` catalogs — unchanged, already consumed by all three components.
- `RdContributorsAndPartnersService.tocReferenceCenterInstitutionIds()` / `tocReferenceSynergyInitiativeIds()`, and the equivalent ToC-node-derived sets in `aow-hlo-create-modal` / `lab-report-form` (`tocCenters`, `tocSciencePrograms`).

### Downstream consumers

- None beyond the three components themselves — no API/payload consumer is affected.

### Assumptions

- The exact replacement label text (proposal §11 open question) defaults to reusing the primary field's label ("Contributing CGIAR Centers" / "Contributing Science Program/Accelerator") per `OTV-R-10`; confirm during design review if QA/Ángel wants different wording.
- `lab-report-form`'s missing branch should mirror `aow-hlo-create-modal`'s structure (same computeds, same `optionValue` keys: `code` for centers, `id` for science programs) since it was originally copied from that component.

## 10. Open Questions

- `OTV-OQ-1` — Exact label text for the relabeled empty-state field: reuse the primary label verbatim (default, per `OTV-R-10`), or a distinct third string? Resolve with Ángel/QA before or during `design.md` if it matters to them; does not block the fix itself since either choice satisfies "MUST NOT be labeled Other(s)…".

## 11. Out-of-Band Notes

- The proposal (§9 Approach Options) flags merging the three components into one shared implementation as a future kaizen item — not part of this spec.

## Required cross-references

- `docs/prd.md` — `US-S1`, `US-S2`.
- `docs/ux-ui/design.md` — DD-5 (shared section components), §10 (accessibility, unaffected).
- `docs/trd/trd.md` — §2 client page-module table (`pages/results`, `pages/result-framework-reporting`).
- `docs/specs/bugfix/other-fields-toc-visibility/proposal.md` — Bug Diagnosis (root cause, reproduction).
