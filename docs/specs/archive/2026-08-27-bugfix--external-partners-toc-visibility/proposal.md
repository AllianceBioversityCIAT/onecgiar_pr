# Proposal — "Other(s) External Partners" shown by default (same pattern as P2-3499)

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `external-partners-toc-visibility` — derived from free-text argument (Jira-style ticket text pasted inline, referencing sibling bug P2-3499) |
| Spec Path | `docs/specs/bugfix/external-partners-toc-visibility/` |
| Type | Bug |
| Approval Mode | gated |
| Ticket | Unlinked — user describes it as "the same issue reported in bug P2-3499 for Contributing Centers and Science Programs, applied here to the External Partners section" |
| Reporter | Current user (santiago.sanchez@cgiar.org) |
| Assignee | Current user (santiago.sanchez@cgiar.org) |

## 2. Intent

Stop the "Other(s) External Partners" picker from presenting itself as a distinct **"Other" field** when the Theory of Change (ToC) found no reference external partners for the node. In that empty-ToC case the user should see one **normal, unlabeled-as-"Other"** dropdown listing the full partner catalog — not a field that visually implies something is being added on top of a ToC set that doesn't exist. This is the same defect class already fixed for Contributing Centers / Science Programs in `docs/specs/bugfix/other-fields-toc-visibility/` (P2-3499); External Partners was not covered by that spec's scope and carries the identical root cause.

## 3. Problem / Current Behavior

**Component:** `CPNormalSelectorComponent` (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.{ts,html}`), rendered inside Result Detail → Contributors & Partners for P25/2026-phase results (the External Partners field within `rd-contributors-and-partners`, gated by `isCP2026() && !dataControlSE.isKnowledgeProduct`).

This component already implements a P2-3066 "ToC split + Other(s)" pattern structurally identical to the one P2-3499 fixed for Centers/Science Programs — same shape, same latent bug, never covered by that fix's scope (which only touched `rd-contributors-and-partners`'s Centers/Science blocks, `aow-hlo-create-modal`, and `lab-report-form`).

### Reproduction Steps

1. Open a 2026-phase (`isCP2026()`) result, non-knowledge-product, in Result Detail → Contributors & Partners.
2. Pick/confirm a ToC node whose HLO/Outcomes map to **zero** external (non-center) partners.
3. Observe: the orange note "No External Partners related to the established HLO/Outcomes were found" renders (`normal-selector.component.html:47-53`), **and immediately below it** a field explicitly labeled **"Other(s) External Partners"** auto-opens (`html:131-146`), offering the full partner catalog — this matches the user-provided screenshot.
4. Expected instead: the note stays, but the picker underneath reads as a normal "External partners" dropdown (no "Other(s)" framing) — because there is no ToC-found set for it to be "other" relative to.

### Root Cause (confirmed)

`normal-selector.component.html` renders the External Partners picker as **two separate template blocks**, not one conditionally-labeled control (unlike the Centers/Science pattern's single conditional-label fix — this one has a structural equivalent, split across two `@if`s):

- **Block 1** (`html:33-53`, gated `isCP2026() && !dataControlSE.isKnowledgeProduct`): `@if (hasReferencePartners())` shows the primary dropdown (ToC-found items + trailing "Other" sentinel, via `dropdown1OptionsPartners()`); `@else` shows **only** the orange note — no dropdown.
- **Block 2** (`html:131-146`, gated `isCP2026() && !dataControlSE.isKnowledgeProduct && showOtherPartners`): a **statically labeled** `app-pr-multi-select` with `label="Other(s) External Partners"` (line 136) and a matching `appFeedbackValidation [labelText]="'Other(s) External Partners'"` wrapper (line 133).
- `showOtherPartners` (`component.ts:76-78`) is `otherSentinelSelected || !hasReferencePartners()` — i.e. it is `true` both when the user genuinely opted into "Other" (non-empty ToC) **and** when the ToC is empty (AC4-equivalent auto-activation).

Because Block 2's label is a **static string**, not conditioned on `hasReferencePartners()` the way OTV-DD-1 conditioned Centers/Science's `label`, the empty-ToC case renders the exact same "Other(s) External Partners" text as the genuine opt-in case. `otherPartnersList()` (`component.ts:53-56`) already resolves to the **full, unfiltered catalog** when the ToC found nothing (its filter excludes zero ids), so the *data* is already correct per the user's Scenario A ("dropdown containing all available external partners") — only the **label/framing** is wrong, exactly as in the sibling bug.

### Impact & Scope

- Affects every 2026-phase, non-knowledge-product result whose ToC node has no mapped external partners — the same class of frequency as the sibling P2-3499 bug for Centers/Science.
- Single call site (`normal-selector.component.html`/`.ts`) — External Partners has no `aow-hlo-create-modal` / `lab-report-form` equivalent (those two forms don't render an External Partners section), so this is a **one-component** fix, smaller in surface than the three-component P2-3499 fix.
- No backend/data impact — `otherPartnersList()` and the save payload (`rdPartnersSE.partnersBody.institutions` / `otherPartnersSelected`, `from_toc` tagging) are unaffected; this is presentation-only (which label/element renders, not which values are selectable).
- Non-empty-ToC behavior (Scenario B: found items listed first, "Other" opt-in after) already matches the desired outcome via Block 1 + the sentinel mechanism — **do not** regress this, per the user's own Scenario B description and by direct analogy to `OTV-AC-7` in the sibling spec.

### Fix Strategy

Not cosmetic-only (it changes which condition drives which label, and removes/relabels a duplicate `appFeedbackValidation` wrapper) — route to **`/akili-specify` (Bug Mode)**, which will require a regression test (red before / green after).

Recommended shape for `/akili-specify` to detail, following the same conditional-binding mechanism as `OTV-DD-1` (`docs/specs/bugfix/other-fields-toc-visibility/design.md` §12) rather than a static relabel (a static relabel would break the genuine opt-in case, the same mistake round 1 of that spec's Judgment Day caught):

- Bind Block 2's `label` (and the `appFeedbackValidation [labelText]`) conditionally: `hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'` (or the primary field's own column-title text, `'External partners'` per `html:2`) — preserving "Other(s) External Partners" for the genuine opt-in case (`otherSentinelSelected === true`, non-empty ToC) and dropping it only for the true empty-ToC auto-activated case.
- Add a `data-testid` hook on the relabeled control, since a bound `[label]` does not reflect as a queryable DOM attribute (the same `RB-S1` finding from the sibling spec applies verbatim to `app-pr-multi-select`).
- Verify Block 1's `@else` orange-note branch and Block 2's auto-activated dropdown render as adjacent siblings with no third, duplicate label element between them (matching the user's "Directly below the banner, the dropdown is shown" expectation).
- Add/extend a Jest regression test in `cpnormal-selector.component.spec.ts` (or a new sibling spec) asserting: empty-ToC → no element carries "Other(s) External Partners" text; non-empty-ToC + sentinel selected → the relabeled control still reads "Other(s) External Partners" (regression guard, mirroring `OTV-AC-7`/`OTV-TEST-1`).

## 4. Proposed Outcome

| ToC result | Current behavior | Expected behavior |
|---|---|---|
| No external partners found | Orange note + field titled **"Other(s) External Partners"**, full catalog | Orange note + a **normal "External partners"**-labeled dropdown with the full catalog — no "Other(s)" framing, no separate "Other" element |
| External partners found | ToC-found items listed first in the primary dropdown; "Other(s) External Partners" appears only after the user selects the "Other" sentinel | Unchanged — already correct |

## 5. Scope

- `normal-selector.component.html` — conditional `label` / `appFeedbackValidation labelText` on the Block 2 (`html:131-146`) auto-activated dropdown, keyed off `hasReferencePartners()`.
- `normal-selector.component.ts` — no new computed strictly required (`hasReferencePartners()` and `showOtherPartners` already exist); may need a small helper/getter for the resolved label text, per `/akili-specify` design.
- Regression test(s) in `cpnormal-selector.component.spec.ts` (Jest) covering empty-ToC (no "Other(s)" label) and non-empty-ToC + opt-in (label preserved).
- Confirm whether Cypress coverage should be added, given `rd-contributors-and-partners` is excluded from Jest `collectCoverageFrom` (see its `CLAUDE.md`) — decide during `/akili-specify` by checking existing `cypress/e2e/result-detail/*.cy.ts` coverage of this component (none found in this proposal's diagnosis).

## 6. Non-Goals

- No change to which values are selectable in the empty-ToC picker (already the full catalog via `otherPartnersList()`) — only its label/framing.
- No change to the save payload, `from_toc` tagging, or backend contract.
- No change to the non-empty-ToC flow (found-first, then opt-in "Other(s)") — already matches the expected behavior (Scenario B).
- No change to P22/legacy (non-`isCP2026()`) or knowledge-product flows, which use the single flat legacy dropdown (`html:54-68`) and are unaffected by this branch.
- No merge of this component with the Centers/Science pattern from the sibling spec — same conceptual fix, kept as a separate, independently-reviewable change since it's a different component/file.

## 7. Affected Users, Systems, And Specs

- **Users:** Result submitters authoring 2026-phase, non-knowledge-product results whose ToC node has no mapped external partners.
- **Systems/code:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/`.
- **Related prior work:** P2-3066 (External Partners ToC split), P2-3335 (catalogue-arrives-late fix, same component), `docs/specs/bugfix/other-fields-toc-visibility/` (P2-3499 — identical defect class, sibling fields, structural precedent for the fix mechanism).
- **No spec exists yet** for this component's own visibility branch — `/akili-specify` for this bug is the first formal spec touching it.

## 8. Visual Reference

- Source: Screenshot provided inline by the user (not a Figma link), showing the orange banner + red-X-marked "Other(s) External Partners" dropdown in the empty-ToC state.
- Location: Provided in the originating chat message (image reference `[Image #17]`), not persisted to this repo.
- Notes: This is a copy/branching fix on an existing, already-styled component (`app-pr-multi-select`, `appFeedbackValidation`) — no new visual design is needed.

## 9. Approach Options

1. **Conditional label/wrapper on the existing Block 2 control (recommended).** Smallest safe change: same component, same auto-activation condition (`showOtherPartners`), just a conditional `label`/`labelText` (and matching `data-testid`) instead of a static "Other(s) External Partners" string. Mirrors `OTV-DD-1`'s proven mechanism from the sibling spec. Low risk, no payload/behavior change beyond the visible label.
2. **Restructure into a true single-branch `@if/@else` like Block 1's Centers/Science pattern** (fold Block 2 into Block 1's `@else`, eliminating the separate `showOtherPartners`-gated block entirely for the empty-ToC case). Cleaner structurally, but a larger diff that also touches the sentinel/opt-in wiring (`onPartnerSelect`, `otherSentinelSelected`) shared by both cases — higher regression risk for a fix this narrow.
3. **Do nothing / defer.** Leaves a confirmed, reproduced UX bug unfixed, inconsistent with the just-completed sibling fix for Centers/Science.

**Recommended: Option 1.** It directly satisfies the user's stated expectation, is the smallest diff, and reuses a fix mechanism already validated (through two Judgment Day rounds) in the sibling spec.

## 10. Recommended Approach

Option 1, executed as one Bug-Mode spec, with a regression test proving both the empty-ToC case (no "Other(s)" label) and the non-empty-ToC opt-in case (label preserved) are correct.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** a bound `[label]` (Angular property binding) does not reflect as a plain DOM attribute — any new/updated test must assert on rendered text or a `data-testid`, not a `[label="…"]` attribute selector (`RB-S1` finding from the sibling spec, directly applicable to `app-pr-multi-select` here too).
- **Risk:** `rd-contributors-and-partners` (parent folder) is excluded from Jest `collectCoverageFrom` — the regression test still must exist and pass, but won't move the coverage percentage; don't rely on the global threshold to prove this is covered.
- **Open question:** exact replacement label text for the empty-ToC case — reuse the primary field's own copy ("External partners", the `column_title` at `html:2`) or a distinct string ("Select partner", the primary dropdown's placeholder)? Proposed default: reuse the primary column-title label, matching `OTV-DD-2`'s "reuse the component's own primary label" precedent. Confirm during `/akili-specify` if a different string is preferred.
- **Dependency:** none outside the client — no server/API contract change.

## 12. Success Criteria

- On a ToC node with **zero** mapped external partners, the External Partners section shows the orange note plus one normally-labeled full-catalog dropdown — no element anywhere in the section reads "Other(s) External Partners".
- On a ToC node with **at least one** mapped external partner, behavior is unchanged: found items shown first in the primary dropdown, "Other(s) External Partners" appears (correctly labeled) only after the user selects the "Other" sentinel.
- A regression test fails against the pre-fix code and passes after.

## 13. Next Step

```text
/akili-specify bugfix/external-partners-toc-visibility
```

Run in **Bug Mode** — convert the confirmed root cause above into a fix plan and a mandatory regression test.
