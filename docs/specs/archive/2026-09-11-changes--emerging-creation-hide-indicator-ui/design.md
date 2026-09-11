# Design — Hide indicator-only UI in emerging-result creation (Lite)

## 1. Document Control
- Spec: `changes/emerging-creation-hide-indicator-ui`
- Depth: Lite
- Delegation: none (single-file template gating, no scout/design agent needed)

## 2. Executive Summary
Wrap Card 2 ("Target Contribution") in an `@if (!isEmerging())` and wrap only the ToC-attribution note block (not the whole of Card 3) in the same guard, inside `lab-report-form.component.html`. No TS changes, no new signal, no data/API change.

## 3. Architecture Overview
No architectural change. `isEmerging()` already exists (`emergingMode() || !!emergingCategory()`, `.ts:225`) and already gates other template branches in this file (e.g. `needsCategoryChoice`). This spec follows that existing pattern — pure template visibility, same computed.

## 4. Design Decisions

**DD-1 — Card 2: gate the whole `@if` block at line 325, not just its contents.**
Change:
```
@if (!currentResultIsKnowledgeProduct() || kpEntryMode() === 'manual' || createResultBody().handler) {
  <!-- CARD 2 -->
  ...
}
```
to:
```
@if (!isEmerging() && (!currentResultIsKnowledgeProduct() || kpEntryMode() === 'manual' || createResultBody().handler)) {
  <!-- CARD 2 -->
  ...
}
```
- **Why:** the existing condition already gates the whole card; adding `!isEmerging() &&` at the front is the smallest diff and composes correctly with the existing KP logic (emerging KP results, if any, still get no Card 2 — consistent, since there's still no indicator target).
- **Reversion challenge (Step 2.3):** this narrows visibility for `isEmerging()` only; the non-emerging path (the only path this card ever rendered for in practice before Card 2 existed at all) is untouched. No already-delivered non-emerging behavior is removed. No challenge needed (Lite, no visible-surface regression for the untouched mode).

**DD-2 — Card 3's ToC-attribution note: gate only the `data-testid="toc-attribution-note"` div (html ~L396-443), not the whole Card 3.**
Change the div's wrapper from unconditional to `@if (!isEmerging()) { <div data-testid="toc-attribution-note">...</div> }`.
- **Why:** the Contributing CGIAR Centers / Science Programs `<select>`s that follow (html ~L445+) are still fully usable and meaningful for emerging results (EHU-R-2) — only the *note text* assumes an indicator/ToC context. Gating the whole Card 3 would remove functional pickers, which is out of scope and would break result creation for emerging results that need manual center/SP attribution.
- **Reversion challenge:** not applicable — narrows one sub-element's visibility for one mode, non-emerging path unaffected, no already-delivered behavior removed for that path.

## 5. Budget (Step 2.4)
- **Expected tasks:** 1
- **Expected LOC:** ~4 (two `@if` wraps) + ~20-30 LOC of new test code
- **Expected review rounds:** 1

Matches Lite's ceiling — a two-guard template visibility change.

## 6. Frontend Component Architecture
No new components, no new design tokens, no TS logic change. Existing Tailwind/markup unchanged where it renders; nothing added where it doesn't.

## 7. Rollback
Revert the two `@if` wraps; no data/migration to unwind.
