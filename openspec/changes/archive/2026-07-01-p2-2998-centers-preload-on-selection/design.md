## Context

The 2026 Contributors & Partners section preloads Contributing CGIAR Centers from the ToC selection. The reference set lives in `rdPartnersSE.tocReferenceCenterInstitutionIds` (signal) and is populated by the `syncTocReferenceIds` effect in `multiple-wps-content.component.ts` (lines ~127-160).

The effect iterates `this.allTabsCreated` — an `@Input()` **plain array**, not a signal — to union centers from each node's `toc_partners` plus each selected indicator's `toc_target_center_ids`. Its only reactive dependencies are the ToC lists (`outputList/outcomeList/eoiList`) and `activeTabSignal()`.

**Root cause of the bug:** selecting an HLO/Outcome (`getIndicatorsList()`, via the level/node dropdown `(ngModelChange)`) or a KPI Statement (`mapTocResultsIndicatorId()`, via the indicator dropdown `(ngModelChange)`) mutates `allTabsCreated[i]` **in place**. Neither touches a signal the effect observes, so the effect does not re-run. Only switching tabs updates `activeTabSignal` (in the parent's `onActiveTab()`), which is why centers appear only after a tab change.

## Goals / Non-Goals

**Goals:**
- Recompute `tocReferenceCenterInstitutionIds` immediately when the user selects/changes an HLO/Outcome node or its KPI Statement, in any tab.
- Preserve the existing union/dedupe contract across all tabs and the backend contract exactly.

**Non-Goals:**
- No change to the union/dedupe logic, the "Other(s)" split, the save/persist flow, or Science Programs.
- No backend change.
- Not addressing the secondary `tocConsumed` re-render timing (radio "Yes" removing/re-adding the component) unless testing shows the trigger alone is insufficient — tracked as a follow-up.

## Decisions

**Decision: add a reactive "selection version" signal as an explicit effect dependency.**
- Introduce `selectionVersion = signal(0)` on the component.
- Read `this.selectionVersion()` inside `syncTocReferenceIds` so the effect subscribes to it.
- Increment it (`this.selectionVersion.update(v => v + 1)`) at the end of the two selection handlers: `getIndicatorsList()` (HLO/Outcome change) and `mapTocResultsIndicatorId()` (KPI change).
- Rationale: the effect keeps reading `allTabsCreated` (already up to date via `[(ngModel)]` two-way binding by the time the handlers run), and the version bump is the minimal, explicit signal that "a ToC selection changed." It keeps the reactive-effect pattern intact.

**Alternatives considered:**
- *Convert `allTabsCreated` to a signal / clone on change.* Larger blast radius — it is bound from the parent and consumed elsewhere; risk of breaking existing tab logic. Rejected as over-scoped for a bug fix.
- *Extract the effect body into a plain method and call it directly from the handlers.* Works, but duplicates the "when to run" logic and loses the single reactive entry point (load + tab switch already flow through the effect). The version-signal keeps one code path.
- *Call `activeTabSignal.set({...})` in the handlers to force a change.* Abuses the active-tab signal semantics and could trigger unintended parent behavior. Rejected.

## Risks / Trade-offs

- **[Ordering: handler runs before `allTabsCreated` mutation is visible]** → `[(ngModel)]` updates the bound `activeTab.*` before the `(ngModelChange)` handler body executes, and `allTabsCreated` holds the same tab object references, so the effect reads fresh values. Verify in-browser that centers appear on the first selection (not one selection behind).
- **[Extra effect runs]** → the version bump also re-runs on KPI change even when only `toc_partners` matter; recomputation is cheap (small sets, in-memory filter), so negligible.
- **[Secondary `tocConsumed` timing not covered]** → if the radio "Yes" path still shows empty lists, a follow-up may need to also re-fetch/repopulate lists on re-render. Out of scope here; flagged for QA.
