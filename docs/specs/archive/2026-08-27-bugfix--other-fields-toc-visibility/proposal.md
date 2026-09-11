# Proposal — "Other" Contributing Centers / Science Programs shown by default (P2-3499)

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `other-fields-toc-visibility` — derived from free-text argument (Jira ticket P2-3499 pasted inline) |
| Spec Path | `docs/specs/bugfix/other-fields-toc-visibility/` |
| Type | Bug |
| Approval Mode | gated |
| Ticket | P2-3499 — "7. 'Other' Contributing Centers and Science Programs fields should not be visible by default" |
| Reporter | Ángel Alberto Jarrín Rivas |
| Assignee | Current user (santiago.sanchez@cgiar.org) |

## 2. Intent

Stop the "Other(s) Contributing CGIAR Centers" / "Other(s) Science Program(s)" pickers from presenting themselves as a distinct **"Other" field** when the Theory of Change (ToC) found no reference centers/programs for the node. In that empty-ToC case the user should see one **normal, unlabeled-as-"Other"** dropdown listing the full catalog — not a field that visually implies something is being added on top of a ToC set that doesn't exist.

## 3. Problem / Current Behavior

Three sibling implementations of the same "Contributing CGIAR Centers" / "Contributing Science Programs" pattern all carry the identical P2-2998 AC4 "empty state" rule: **when the ToC brings zero reference centers/programs, the field literally labeled "Other(s) Contributing CGIAR Centers" / "Other(s) Science Program(s)" auto-activates and is shown**, alongside the orange advisory note. This is by design (P2-2998 AC4 / P2-2929), but Ángel's ticket says the design itself is wrong: showing a field titled "Other(s)" makes no sense when there is nothing to be "other than" — the user should just get a normal full-catalog picker.

Confirmed in code, three call sites, two different symptoms:

1. **`rd-contributors-and-partners`** (Result Detail → Contributors & Partners, P25/2026 phases — `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html:117-124,162` and `:316-324,337`) — when `hasReferenceCenters()` / `hasReferenceScience()` is `false`, the primary dropdown is replaced by the orange note, and the block titled **"Other(s) Contributing CGIAR Centers"** / **"Other(s) Science Program(s)"** auto-shows (`@if (isCP2026() && (showOtherCenters || !hasReferenceCenters()))`, `component.ts:150-154,264-267`).
2. **`aow-hlo-create-modal`** (the "Report result" modal — `.../aow-hlo-table-create-modal/aow-hlo-create-modal.component.html:212-219,235` and `:284-291,312`) — identical pattern (`hasReferenceCenters`/`hasReferenceScience`, `component.ts:100-122`).
3. **`lab-report-form`** (the drawer-hosted copy of the same form, mounted from the Reporting tab's `Report` button in `dashboard-lab` — `fundingSource` defaults to `'w1w2'`, i.e. the W1/W2 result-creation form the ticket references — `.../lab-report-form/lab-report-form.component.html:236,300`) — this copy is **missing** `hasReferenceCenters`/`hasReferenceScience` and the orange note entirely (`component.ts` has no such computed). Its `showOtherCenters()`/`showOtherScience()` only key off the sentinel being present in the selection, so in the empty-ToC case the "Other(s)" block never auto-activates and the user is stuck with a primary dropdown whose only option is the "Other(s)" sentinel itself — a related but distinct defect (dead-end UX, no note) from the same root design decision.

### Reproduction Steps

1. Open a W1/W2 result whose ToC node/HLO maps to **no** CGIAR Centers and/or **no** Science Programs (any of the three entry points above — Result Detail → Contributors & Partners on a 2026-phase result, the "Report result" modal, or the Reporting-tab drawer form).
2. Observe: instead of a plain "Contributing CGIAR Centers" / "Contributing Science Program/Accelerator" dropdown with the full catalog, the UI shows the orange "No CGIAR Centers/Science Programs related to the established HLO/Outcomes were found" note **and** a field explicitly titled "Other(s) Contributing CGIAR Centers" / "Other(s) Science Program(s)" (in `rd-contributors-and-partners` and `aow-hlo-create-modal`), or a dead-end primary dropdown offering only the "Other(s)" sentinel (in `lab-report-form`).
3. Expected instead (per Ángel): orange note stays, but the picker underneath reads as a normal full-catalog dropdown — no "Other(s)" framing — because there is no ToC-found set for it to be "other" relative to.

### Root Cause (confirmed)

The P2-2998 AC4 / P2-2929 "empty ToC" rule was implemented by **reusing the same "Other(s)" labeled component and copy that serves the non-empty case** (where a genuine ToC-found list exists and "Other(s)" is a legitimate escape hatch), instead of branching to a differently-labeled, non-"Other" full-catalog picker for the empty case. The `!hasReferenceCenters()` / `!hasReferenceScience()` condition is correct (it does force the picker open), but it forces open the wrong-labeled component. `lab-report-form` additionally never received the `hasReferenceCenters`/`hasReferenceScience` computeds at all when it was copied from `aow-hlo-create-modal` (per its own `CLAUDE.md`, it is "a deliberate COPY... not a refactor"), so it has neither the correct nor the incorrect version of the AC4 branch — just a gap.

### Impact & Scope

- Affects every W1/W2 (P25/2026) result creation or edit flow where a ToC node/HLO has no mapped CGIAR Centers or Science Programs — a materially common case per Ángel's ticket, not an edge case.
- Three call sites, one shared conceptual fix: `rd-contributors-and-partners`, `aow-hlo-create-modal`, `lab-report-form`.
- No backend/data impact — `from_toc` tagging and the save payload shape are unaffected; this is presentation-only (label + which component renders, not which values are selectable — the empty-ToC case already offers the full catalog, just under the wrong name/framing).
- `lab-report-form`'s gap is a second, related defect (missing AC4 branch) uncovered while diagnosing this ticket — worth fixing in the same pass since it's the same root pattern and the same ticket's "W1/W2" forms, but it is a distinct code change (add the branch) rather than a relabel.

### Fix Strategy

Not cosmetic-only (it changes which computed drives which template branch and requires a genuinely new branch in `lab-report-form`) — route to **`/akili-specify` (Bug Mode)**, which will require a regression test (red before / green after) per call site.

Recommended shape for `/akili-specify` to detail:
- Give the empty-ToC branch its own label/copy that does **not** say "Other(s)" (e.g. reuse the primary field's own label — "Contributing CGIAR Centers" / "Contributing Science Program/Accelerator" — on the auto-activated full-catalog dropdown) in `rd-contributors-and-partners` and `aow-hlo-create-modal`.
- Add the missing `hasReferenceCenters`/`hasReferenceScience` computeds + orange note + correctly-labeled empty-state branch to `lab-report-form`, mirroring `aow-hlo-create-modal`'s pattern but with the corrected (non-"Other") label.
- Keep the non-empty ToC branch unchanged in all three: found items first, "Other(s)" opt-in second — this already matches Ángel's expected behavior and is not in scope.

## 4. Proposed Outcome

| ToC result | Current behavior | Expected behavior (Ángel) |
|---|---|---|
| No centers/programs found | Orange note + field titled **"Other(s) Contributing CGIAR Centers"** / **"Other(s) Science Program(s)"** (or, in `lab-report-form`, a dead-end dropdown with only the sentinel) | Orange note + a **normal** dropdown (same label as the primary field) with the full catalog — no "Other(s)" framing |
| Centers/programs found | Found items shown first; "Other(s)" dropdown appears only after the user opts in | Unchanged — already correct |

## 5. Scope

- `rd-contributors-and-partners.component.ts` / `.html` — relabel the auto-activated empty-state dropdown.
- `aow-hlo-create-modal.component.ts` / `.html` — relabel the auto-activated empty-state dropdown.
- `lab-report-form.component.ts` / `.html` — add the missing `hasReferenceCenters`/`hasReferenceScience` computeds, the orange note, and the correctly-labeled empty-state branch (parity with the other two, corrected).
- Regression tests (Jest `*.spec.ts` for the two components with existing Jest coverage; Cypress for `rd-contributors-and-partners`, which is excluded from Jest `collectCoverageFrom` — see its `CLAUDE.md`) covering: empty-ToC → no "Other(s)"-labeled field visible; non-empty-ToC → unchanged two-dropdown flow.

## 6. Non-Goals

- No change to which values are selectable in the empty-ToC picker (already the full catalog) — only its label/framing.
- No change to the save payload, `from_toc` tagging, or backend contract.
- No change to the non-empty-ToC flow (found-first, then opt-in "Other(s)") — already matches the expected behavior.
- No change to P22/legacy (non-`isCP2026()`) flows, which use a single flat dropdown and are unaffected by this AC4 branch.

## 7. Affected Users, Systems, And Specs

- **Users:** Result submitters (Initiative/Center staff) authoring W1/W2 results whose ToC node has no mapped Centers/Science Programs.
- **Systems/code:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/`
- **Related prior work:** P2-2998 (Centers split + AC4), P2-2929 (Science Programs split), P2-3114 (`aow-hlo-create-modal` parity), P2-3231/P2-3479 (`lab-report-form` as a copy of the modal).
- **No spec exists yet** under `docs/specs/` for this shared "ToC split + Other(s)" pattern — `/akili-specify` for this bug is the first formal spec touching it.

## 8. Visual Reference

- Source: None (no Figma link or mockup provided in the ticket).
- Location: n/a — the ticket description includes a screenshot (not attached to this session) marking the two "Other(s)" fields with a red X in the empty-ToC state. Re-attach or link it during `/akili-specify` if available.
- Notes: This is a copy/branching fix on existing, already-styled components (`app-pr-multi-select`, `app-pr-field-header`, `app-alert-status`) — no new visual design is needed.

## 9. Approach Options

1. **Relabel the empty-state branch to drop "Other(s)" framing (recommended).** Smallest safe change: same components, same auto-activation condition (`!hasReferenceCenters()`), just a different `label` string (reuse the primary field's label) on the dropdown that's already rendered. Add the missing branch to `lab-report-form` following the same shape. Low risk, no payload/behavior change beyond the visible label.
2. **Merge the two dropdowns into one component with an internal branch.** Cleaner long-term (single source of truth for "Contributing Centers/SP" across all three call sites, ends the copy-paste drift already flagged in each component's `CLAUDE.md`), but touches shared save-wiring (`from_toc` tagging in `onSaveSection`) across three call sites and is a bigger diff than the ticket asks for — a separate change once this bug is fixed and stable.
3. **Do nothing / relabel only where the ticket's screenshot points.** Risks leaving `lab-report-form`'s separate dead-end defect unfixed, and leaves `aow-hlo-create-modal` inconsistent with whichever single screen gets fixed — three near-identical components should not diverge further.

**Recommended: Option 1.** It directly satisfies Ángel's stated expectation, is the smallest diff, and closes the `lab-report-form` gap in the same pass since it's the same root cause. Option 2 is worth flagging as a follow-up kaizen item given the repeated copy-paste drift already called out in three separate `CLAUDE.md` files.

## 10. Recommended Approach

Option 1, executed as one Bug-Mode spec covering all three call sites (they share the exact same defect and fix shape), with a regression test per call site.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** `lab-report-form`'s `CLAUDE.md` documents `optionValue` as load-bearing for `app-pr-multi-select` identity — the new empty-state branch must set it correctly (`code` for centers, `id` for science programs) or selection will misbehave (documented trap: "sin ella cada clic borra el elemento 0").
- **Risk:** `rd-contributors-and-partners` folder is excluded from Jest `collectCoverageFrom` — verification there leans on its existing Cypress suites (`cypress/e2e/result-detail/contributors-and-partners.cy.ts`, `save-validation.cy.ts`, `save-contract.cy.ts`), not just a `.spec.ts`.
- **Open question:** exact wording for the relabeled empty-state field — reuse the primary field's label verbatim ("Contributing CGIAR Centers" / "Contributing Science Program/Accelerator"), or a distinct third label? Proposed default: reuse the primary label, since the field genuinely *is* the primary picker in this state, just auto-opened. Confirm with Ángel/QA during `/akili-specify` if a different string is preferred.
- **Dependency:** none outside the client — no server/API contract change.

## 12. Success Criteria

- On a ToC node with **zero** mapped Centers and/or Science Programs, none of the three forms show a field titled "Other(s) Contributing CGIAR Centers" or "Other(s) Science Program(s)"; instead each shows the orange note plus one normally-labeled full-catalog dropdown.
- On a ToC node with **at least one** mapped Center/Science Program, behavior is unchanged (found items shown first, "Other(s)" only after opt-in) in all three forms.
- `lab-report-form` gains the previously-missing empty-state note + auto-activated dropdown (parity with the other two).
- Regression tests (per call site) fail against the pre-fix code and pass after.

## 13. Next Step

```text
/akili-specify bugfix/other-fields-toc-visibility
```

Run in **Bug Mode** — convert the confirmed root cause above into a fix plan and a mandatory regression test per call site (`rd-contributors-and-partners`, `aow-hlo-create-modal`, `lab-report-form`).
