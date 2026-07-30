## Context

The Evidence section (`rd-evidences.component`) shows a local completeness flag via the `appFeedbackValidation` directive. Today the gate is:

```html
[isComplete]="this.evidencesBody.evidences.length > 0 || this.dataControlSE.currentResult?.result_type_id == 5"
```

So the green check flips as soon as one evidence exists, regardless of mandatory marker/readiness evidence. Meanwhile the component already computes the missing-evidence conditions, but only to render yellow warnings:

- `validateCheckBoxes()` returns a non-empty HTML string when any Impact-Area marker at Principal level (`*_tag_level === '3'`) lacks tagged evidence; empty string means all Principal markers are covered.
- `validateHasInnoReadinessLevelEvidence()` returns `true` when readiness is optional (level 0 / `isOptionalReadinessLevel`) or there is at least one `innovation_readiness_related` evidence; `false` when readiness is mandatory but missing.

The backend green-check (`onecgiar-pr-server/.../results-validation-module.repository.ts` → `evidenceValidation()`) already enforces the same three rules in raw SQL (markers `tag_level_id = 3`; readiness for `result_type_id = 7`, level ≠ 0; type 5 exempt). The bug is purely the client's local flag being more permissive than the rules.

Requirements confirmed with reporter Santiago Sánchez via Slack on 2026-06-18.

## Goals / Non-Goals

**Goals:**
- Make the client Evidence green check honor: base evidence presence + Principal-marker evidence (all types) + Innovation-Readiness evidence (Innovation Development, readiness 1–9).
- Rename the five Impact-Area checkbox labels to canonical names, without changing field bindings.
- Reuse the existing validation helpers so the gate and the warnings stay in sync.

**Non-Goals:**
- No backend changes — the server validation already implements these rules.
- No change to the warning messages (already correct), to evidence creation/deletion, or to other evidence labels (those belong to `p2-2981`).
- No change to the `youth_related` ↔ Climate mapping.

## Decisions

**Decision 1 — Reuse existing helpers in `isComplete` instead of new logic.**
Extend the Evidence `isComplete` to:
`evidences.length > 0 (or type 5)` **AND** `validateCheckBoxes()` is empty **AND** `validateHasInnoReadinessLevelEvidence()` is true.
Rationale: the helpers already encode the exact rules and already drive the warnings; reusing them guarantees the green check and the yellow alerts never disagree. Alternative (re-deriving the conditions inline) was rejected as duplicate, drift-prone logic.
To keep the template readable, expose a single getter (e.g. `get evidenceSectionComplete()`) on the component that combines the three conditions, and bind `[isComplete]` to it.

**Decision 2 — Labels changed only in the two display spots.**
Update the `tagFields` label strings (`rd-evidences.component.ts`) and the five `app-pr-checkbox` labels (`evidence-item.component.html`). `getSelectedImpactTags()` derives the read-only chips from `tagFields`, so the chips update automatically. Bindings/`field` keys are untouched.

**Decision 3 — Verify where the user-visible check is sourced before claiming the fix.**
The side-menu check is painted from the backend green-check; the in-section flag is the client `isComplete`. During verification, confirm which one the user saw turning green prematurely, so the fix demonstrably closes the reported bug. If the backend value already blocks correctly, the client fix removes the visual inconsistency; if the side menu also relied on the client flag, the same fix covers it.

## Risks / Trade-offs

- [Calling `validateCheckBoxes()` from a getter bound in the template runs it on each change detection] → It is a light array scan over ≤6 evidences and a 5-element list; negligible. Avoid heavier work in the getter.
- [`isOptionalReadinessLevel` must be correctly populated for non-Innovation-Development types so readiness never blocks them] → The readiness rule is already guarded by `result_type_id === 7` in the template alert; mirror that guard in the getter so non-Innovation-Development results are never blocked by readiness.
- [Client gate could diverge from backend SQL if rules change later] → Both now reflect the same rules; document the coupling in the spec so future edits update both.

## Migration Plan

Pure frontend change, no migrations. Deploy with the client build. Rollback = revert the commit; no data impact.

## Open Questions

- Confirm during verification whether the reported premature green check is the in-section flag, the side-menu (backend) check, or both. (To be answered by manual testing on prtest/local before closing.)
