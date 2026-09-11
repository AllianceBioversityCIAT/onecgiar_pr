# Design — "Other(s) External Partners" shown by default

**Depth:** Lite (Bug Mode). Not architecturally significant — no new module, no persistence/API change, no NFR-scenario impact. `software-architect` Decision Spine not invoked. No new visual design needed (conditional binding on an existing, already-styled control) — `ui-ux-pro-max`/`frontend-design` not invoked.

Linked: `docs/specs/bugfix/external-partners-toc-visibility/requirements.md` (`EPT-R-1..4`, `EPT-R-10`, `EPT-AC-1..2`).

## 1. Summary

- The auto-activated "second dropdown" (`normal-selector.component.html:132-146`) currently carries a **static** `label="Other(s) External Partners"` and a matching static `appFeedbackValidation [labelText]="'Other(s) External Partners'"` wrapper. It renders under one gate — `showOtherPartners = otherSentinelSelected || !hasReferencePartners()` — that is `true` in two semantically different cases: the genuine opt-in case (ToC found partners, user picked the "Other" sentinel) and the true empty-ToC auto-activated case.
- Fix shape: **conditional label/labelText binding**, keyed off the existing `hasReferencePartners()` computed — exactly the mechanism `OTV-DD-1` used for Centers/Science in the sibling spec (`docs/specs/bugfix/other-fields-toc-visibility/design.md` §12), not a static relabel (a static relabel would break the opt-in case, `EPT-R-4`).
- `[label]="hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'"`, same expression mirrored on the `appFeedbackValidation [labelText]` wrapper one line above it.
- Add `data-testid="toc-other-partners"` on the `app-pr-multi-select`, since a bound `[label]` does not reflect as a queryable DOM attribute (`RB-S1` finding, verified against the sibling spec's committed snapshot — applies identically here, same `app-pr-multi-select` control).
- No service, entity, or API change. `otherPartnersList()` (the options source) and `showOtherPartners`/`hasReferencePartners()` (the gates) are untouched — only the two label-bearing bindings change.
- Biggest constraint: the same DOM element must keep working for both the opt-in case (`EPT-AC-2`, unchanged) and the empty-ToC case (`EPT-AC-1`, relabeled) — so the fix is a conditional expression on the existing element, not a new branch or a new component.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched only** — no server module touched.
  - `pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/` — `normal-selector.component.html` only. No `.ts` change (both `hasReferencePartners()` and `showOtherPartners` already exist and are correct — see `component.ts:60,76-78`).
- **No external integrations touched.** `InstitutionsService.institutionsWithoutCentersPartners()` and `RdContributorsAndPartnersService.tocReferencePartnerInstitutionIds()` are read exactly as today.

### 2.2 Interaction

```
[normal-selector renders External Partners block]
  └── hasReferencePartners()  (existing computed, unchanged)
        ├── true  → Block 1 (html:34-46): primary dropdown shows ToC-found items + trailing "Other" sentinel
        │           Block 2 (html:132-146) renders IF the user selects the sentinel (showOtherPartners → true
        │           via otherSentinelSelected) — label resolves to "Other(s) External Partners" (UNCHANGED,
        │           EPT-R-4 regression guard)
        └── false → Block 1 @else (html:48-52): orange note only, no dropdown
                     Block 2 auto-renders (showOtherPartners → true via !hasReferencePartners()) — label now
                     resolves to "External partners" instead of "Other(s) External Partners" (EPT-R-1)
```

No sequence diagram needed beyond this — no new async call, no new state transition. The mechanism is two conditional bindings (label + labelText), not a structural rewrite of either branch's data flow.

## 3. Data Model Changes

None. No entity, DTO, or migration touched.

## 4. API Surface

None. No endpoint added/changed. No bilateral/platform-report impact.

## 5. Server Workflow / Business Rules

None. Purely client-side template/label change; `onSaveSection` / save wiring (`rdPartnersSE.partnersBody`, `rdPartnersSE.otherPartnersSelected`, `from_toc` tagging) are unaffected — the same values already flow through unchanged today.

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. No new lazy-loaded module. No new guard.

### 6.2 Components & services

| File | Change |
|---|---|
| `normal-selector.component.html:133` | Change the static `appFeedbackValidation [labelText]="'Other(s) External Partners'"` to a **conditional binding**: `[labelText]="hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'"`. |
| `normal-selector.component.html:134-146` | Change the static `label="Other(s) External Partners"` on the `app-pr-multi-select` to `[label]="hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'"`. Add `data-testid="toc-other-partners"` on the same element (`RB-S1` — needed because the bound `label` no longer reflects as a selectable DOM attribute). The `@if (isCP2026() && !dataControlSE.isKnowledgeProduct && showOtherPartners)` gate itself is **unchanged** — `EPT-R-3`/`EPT-R-4` require the same options and the same activation condition, only the label resolution changes. |
| `normal-selector.component.ts` | **No change.** `hasReferencePartners` (`:60`) is a `computed()` and is already called with `()` at every other template call site in this file (`html:34,64,132`) — the new bindings reuse it identically, so there is no getter/parenthesis ambiguity to introduce (the class of mistake `RB-S2` caught in the sibling spec does not recur here since no new computed is added). |

No new component is created. No component is deleted.

### 6.3 Design system usage

- No new tokens, no new component. Reuses `app-pr-multi-select` and `appFeedbackValidation` exactly as already styled/wired.
- Copy stays an inline literal (as today) — no i18n regression, no new i18n debt (matches the Internationalization NFR row in `requirements.md`).
- A11y: the control's own presence/position is unchanged; only its `label`/`labelText` value changes conditionally rather than its presence — no new focus-order impact. The accessible name it carries in the empty-ToC case changes from "Other(s) External Partners" to "External partners", which is the intended fix (the old name was misleading, not merely different).

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

Unaffected — no new endpoint, no new role check, no change to JWT/guard posture.

## 8. Performance & Capacity

Unaffected — no new query, no new payload size, no new catalog fetch. The empty-ToC branch already fetches and renders the full catalog today (just under the wrong label); this design does not add a fetch.

## 9. Observability

None added. No new log line needed — this is a pure rendering/label change with no new failure mode to observe.

## 10. Testing Plan (forward-looking)

- **Unit (Jest):** extend `cpnormal-selector.component.spec.ts` with a new `describe` block asserting, **selecting via the new `data-testid="toc-other-partners"` hook — never via `[label="…"]`**, since a bound `label` does not reflect as a DOM attribute:
  - `EPT-TEST-1a` — empty-ToC state (`hasReferencePartners()` false / `referenceExternalPartners()` empty): `[data-testid="toc-other-partners"]` is present, and its resolved label text (read via the component's internal `.pr_label` node, or an equivalent text assertion — not an attribute query) is `"External partners"`, NOT `"Other(s) External Partners"`.
  - `EPT-TEST-1b` (regression guard, `EPT-R-4`/`EPT-AC-2`) — non-empty-ToC state with the "Other" sentinel selected: `[data-testid="toc-other-partners"]`'s resolved label text is `"Other(s) External Partners"`, unchanged.
  - **Process requirement (false-negative gate):** both assertions must be verified RED against a pre-fix checkout (the static-label version) and GREEN after the conditional binding lands — stated in the task's DoD, per `requirements.md` §7.1.
- **No Cypress spec exists today for this component's External Partners block** (`cypress/e2e/result-detail/*.cy.ts` does not reference `normal-selector` or "External Partners" — confirmed during proposal diagnosis). Not adding one is an accepted gap for this Lite bug fix, consistent with the existing coverage boundary (`rd-contributors-and-partners` is excluded from Jest `collectCoverageFrom` per its own `CLAUDE.md`, and this component currently leans on Jest + manual/browser verification, not Cypress).
- Coverage uplift: no threshold change expected (the folder is excluded from `collectCoverageFrom`); the new assertions still exercise the `hasReferencePartners()`-driven conditional and must pass locally.

## 11. Backwards Compatibility & Migration Plan

- No database migration. No API contract. No feature flag needed — ships as a normal client release.
- No data backfill. No downstream consumer to notify.
- Rollback = revert the PR; no data-side cleanup needed since nothing persisted changes shape.

## 12. Design Decisions (ADRs)

### `EPT-DD-1` — Conditional label/labelText binding in place, rather than a static relabel or a structural `@if/@else` rewrite

- **Context:** The empty-ToC branch already renders the correct data (full catalog, `otherPartnersList()`) via an existing, working control (`app-pr-multi-select` at `html:134-146`) — only its label framing is wrong. That same element is shared with the genuine opt-in case (`showOtherPartners = otherSentinelSelected || !hasReferencePartners()`), so a *static* relabel would incorrectly change the opt-in case's label too, breaking `EPT-R-4`/`EPT-AC-2` — the exact mistake the sibling spec's Judgment Day round 1 caught for Centers/Science (`other-fields-toc-visibility/judgment.md`, `C-1`).
- **Decision:** Bind `label` and `appFeedbackValidation [labelText]` to `hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'`, reusing the existing `hasReferencePartners()` computed and the existing `showOtherPartners` gate unchanged. This is `OTV-DD-1`'s proven mechanism, applied to a single component instead of three.
- **Alternatives considered:**
  1. **Restructure into Block 1's `@if/@else` shape** (fold Block 2 into Block 1's `@else`, eliminating the separate `showOtherPartners`-gated block for the empty case). Rejected for this fix: it also touches the sentinel/opt-in wiring (`onPartnerSelect`, `otherSentinelSelected`) shared by both cases, a larger diff and higher regression risk than a fix this narrow warrants (Option 2 in `proposal.md` §9) — flagged as a future structural cleanup, not adopted here.
  2. **Static relabel of the existing element.** Rejected — breaks the non-empty-ToC opt-in case (`EPT-R-4`), the same failure mode `OTV-DD-1` documented and rejected for the sibling bug.
- **Consequences:** The External Partners component keeps a slightly different label-resolution shape from the (also just-fixed) Centers/Science components in the sibling spec — both now use the same *mechanism* (conditional binding keyed off a `hasReferenceX()` computed), but neither shares code, since they live in different components. No new shared abstraction is introduced by this fix (consistent with `other-fields-toc-visibility`'s own decision not to merge the three sibling components — `OTV-DD-1` Alternative 1, still a deferred follow-up, now also applicable to this component if a future consolidation happens).

**Step 2.3 reversion challenge:** This DD changes what text renders in the empty-ToC branch — the static `"Other(s) External Partners"` text is replaced by a conditional value that resolves to `"External partners"` in that branch. Challenge: *what does removing the static "Other(s) External Partners" text from the empty-ToC branch break?* Answer: nothing observable breaks — no test in `cpnormal-selector.component.spec.ts` currently asserts on that label text (confirmed during proposal diagnosis: the existing suite's `describe` blocks cover the P2-3335 late-catalog-arrival bug and the partner-role-group DOM, not label text), and the save payload/selectable-values path (`otherPartnersList()`, `rdPartnersSE.otherPartnersSelected`) is untouched by this change. The one thing that *must* keep working — the opt-in case still showing "Other(s) External Partners" — is preserved by construction (the conditional's `true` branch is the unchanged static string), and is exactly what `EPT-TEST-1b` verifies. No design change needed as a result of this challenge.

## 13. Open Gaps & Follow-ups

- **Follow-up (not this spec):** if the sibling spec's Alternative 1 (extract a shared "ToC-split + Other(s)" section component) is ever pursued for Centers/Science, this component's External Partners pattern is a natural fourth consumer — not in scope here.
- **Resolves `EPT-OQ-1`:** the replacement label reuses this component's own primary-field copy verbatim — `"External partners"` (`html:2`, the `column_title` text), not the primary dropdown's placeholder ("Select partner") or any invented string. This mirrors `OTV-DD-2`'s "reuse the component's own primary label" precedent from the sibling spec.

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 1 — single-file template change (two conditional bindings + one `data-testid`) plus its regression test, in one focused task per Lite depth. |
| Expected LOC | ~15–25 (two `[label]`/`[labelText]` binding changes + one `data-testid` attribute in the template; ~10–15 new lines of Jest assertions in the existing spec file). |
| Expected review rounds | 1 — single conditional-binding mechanism, already validated twice (via Judgment Day) in the sibling spec; no new computed, no new gate, no cross-component surface. |

**Sizing check against declared depth (Lite):** the estimate (1 task, ~15–25 LOC, 1 review round) is comfortably within Lite — smaller than the sibling `other-fields-toc-visibility` spec (5 tasks, ~130–170 LOC) because this fix touches one component instead of three and needs no new computed or missing-branch addition. No depth change recommended.

## Required cross-references

- `docs/specs/bugfix/external-partners-toc-visibility/requirements.md` (same folder) — `EPT-R-1..4`, `EPT-R-10`, `EPT-AC-1..2`.
- `docs/specs/bugfix/external-partners-toc-visibility/proposal.md` — Bug Diagnosis (root cause, reproduction).
- `docs/specs/bugfix/other-fields-toc-visibility/design.md` — `OTV-DD-1` (conditional-binding precedent), `RB-S1`/`RB-S2` (testid + computed-call findings).
- `docs/prd.md` — `US-S1`, `US-S2`.
- `docs/ux-ui/design.md` — DD-5.
- `docs/trd/trd.md` — §2 client page-module table.
