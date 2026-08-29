# Design — Stop ToC-reference "not found" notes when unmapped

## 1. Summary

Add one extra boolean (`planned_result !== false`) to the three existing `@if (isCP2026())` gates that decide between the ToC-reference-filtered dropdown (with its "not found" note) and the plain full-catalog dropdown. No new markup, no new state, no API/data change. Biggest constraint: must not touch the AC4 "Yes + genuinely empty refs" path, which stays exactly as-is.

Links: `requirements.md` (same folder) — TOC-R-1/2/3. Baseline: `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md`.

## 2. Architecture Overview

**Client modules touched:**
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html` (Centers block, Science Program block)
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html` (External Partners block) — this component is also rendered from `ipsr-contributors.component.html:209`, so the fix is inherited by IPSR automatically (no IPSR-specific file changes needed).

No server, data model, or API changes.

### Interaction (unchanged control flow, gate added)

```
User answers "Can this result be mapped to a ToC KPI?" → planned_result
  ├── true  (Yes) → isCP2026() branch unchanged: reference-filtered dropdown,
  │                 "not found" note only if hasReferenceX() is false (AC4)
  └── false (No)  → NEW: falls through to the plain full-catalog dropdown
                    (the branch that already exists for pre-2026 phases)
```

## 3. Data Model Changes

None. No entity, migration, or CLARISA cache change.

## 4. API Surface

None. Purely a client-side conditional-render fix.

## 5. Server Workflow / Business Rules

None — no server change.

## 6. Frontend Plan

### 6.1 Routes / modules

No new routes or modules. Existing `rd-contributors-and-partners` (classic Result Detail) and its child `normal-selector` component (also used by `ipsr-contributors`).

### 6.2 Components & services

No new components or services. State already exists: `RdContributorsAndPartnersService.partnersBody.result_toc_result.planned_result`, read directly in templates (consistent with existing sibling conditions in the same files, e.g. `rd-contributors-and-partners.component.html:85`).

Condition change (applied identically to all three blocks):

- Before: `@if (isCP2026()) { @if (hasReferenceX()) {...} @else {...note...} } @else {...flat...}`
- After: `@if (isCP2026() && this.rdPartnersSE.partnersBody.result_toc_result.planned_result !== false) { @if (hasReferenceX()) {...} @else {...note...} } @else {...flat (unchanged markup)...}`

Files:
- `rd-contributors-and-partners.component.html` — Centers block (~L100), Science Program block (~L302).
- `normal-selector.component.html` — External Partners block (~L33).

No `.ts` changes needed — the condition only adds a read of existing state already exposed via the injected `rdPartnersSE`.

### 6.3 Design system usage

No new tokens, no new components. The flat-dropdown branch being reused already uses the project's `app-pr-multi-select` and existing `--pr-color-orange-400` icon convention (removed from the newly-suppressed path, not introduced).

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

Not applicable — no auth surface, no new input, no data exposure change.

## 8. Performance & Capacity

Negligible — removes a computed evaluation path in the unplanned case (fewer renders), no new queries.

## 9. Observability

Not applicable — no new logging surface for a template-condition fix.

## 10. Testing Plan (forward-looking)

- Component (Jest + Angular TestBed): `rd-contributors-and-partners.component.spec.ts` — assert Centers/Science blocks render the flat dropdown and no `.pr-message` when `planned_result === false`; assert the note still renders when `planned_result === true` and reference ids are empty (AC4 regression guard).
- Component (Jest + Angular TestBed): a `normal-selector.component.spec.ts` case with the same two assertions for External Partners.
- No Cypress needed — this is a pure conditional-render assertion, fully exercisable in TestBed with mocked service state.

## 11. Backwards Compatibility & Migration Plan

- Purely additive guard; no migration, no flag, no rollout coordination. Legacy (non-`isCP2026`) rendering is untouched (already falls to the flat branch unconditionally).

## 12. Design Decisions (ADRs)

### TOC-DD-1 — Gate the reference-split on `planned_result !== false` instead of a new branch or hiding only the note

- **Context:** The reference-filtered dropdown + note pair is architecturally wrong to evaluate when nothing was ever mapped (empty refs are the expected, not exceptional, state).
- **Decision:** Extend the existing `isCP2026()` gate with `planned_result !== false`, reusing the already-implemented flat-dropdown `@else` branch.
- **Alternatives considered:**
  1. Suppress only the note, keep the reference-filtered (now-empty) dropdown — rejected: leaves a dropdown with zero options, worse UX than the full catalog.
  2. New dedicated "unplanned" markup branch — rejected: same visual/behavioral result as reusing the existing flat branch, for more template churn (same reasoning already applied in P2-3001's design.md for the bilateral-projects gate).
- **Consequences:** None negative — the flat branch is already tested for the pre-2026 case; this just makes it reachable for one more condition.

### TOC-DD-1 — Reversion Challenge (Step 2.3)

This DD **reverts** the current always-evaluate-the-split behavior for the unplanned case — worth one challenge question.

- **Challenge:** "What does removing the reference-split evaluation break, for the unplanned case?"
- **Answer:** Nothing. When `planned_result === false`, no ToC node was ever selected, so `tocReferenceCenterInstitutionIds()` / `tocReferenceSynergyInitiativeIds()` / `tocReferencePartnerInstitutionIds()` are always empty already — the reference-filtered dropdown could never have shown real options in this state, only the always-firing false-positive note. No functional path is lost; only a permanently-empty, misleading branch stops being reachable.

## 13. Open Gaps & Follow-ups

None. Confirmed with user: IPSR Centers/Science notes are not reachable (different template), so no follow-up needed there beyond the automatic External Partners parity (TOC-R-3).

## Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | 2 (one code+test task per file pair: classic Centers/Science, shared normal-selector External Partners) |
| Expected LOC | ~15-20 changed (condition edits) + ~60-90 added (test assertions) |
| Expected review rounds | 1 |

Matches the **Lite** depth chosen — no adjustment needed.

## Required cross-references

- `docs/specs/bugfix/toc-unmapped-orange-notes/requirements.md` (same folder)
- `docs/specs/bugfix/toc-unmapped-orange-notes/proposal.md` (Bug Diagnosis)
- `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md`
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
