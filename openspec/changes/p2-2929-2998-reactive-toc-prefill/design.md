# Design: Reactive ToC prefill for Science Programs & Centers

## Context

`rd-contributors-and-partners.component.ts` preloads the from-ToC part of two selections when the 2026 C&P section opens: `preselectScienceEffect` (~L220, target `rdPartnersSE.scienceSelected`) and `preselectCentersEffect` (~L145, target `partnersBody.contributing_center`). Both effects:

- only act when the selection is **empty** (`sel.length === 0`) — so any later node change never reconciles;
- early-return forever once `userTouchedScience`/`userTouchedCenters` is true — any dropdown interaction permanently freezes the prefill;
- carry the P2-3115 anti-resurrection guard: `if (sectionHydratedFromToc() && !tocSelectionTouched()) return` — the persisted (possibly empty) GET state is authoritative until the user makes a genuine ToC selection in-session (`markUserTocSelection()` fires from the HLO/KPI dropdowns' `ngModelChange`, `multiple-wps-content.component.ts:258`).

Preloaded items are stamped `{ ...ref, new: true, is_active: true }`. Persisted items hydrated from the GET carry no `new` flag; accepted/pending SP are tracked in `loadedAcceptedScienceIds` / `loadedPendingScience`. Reference sets are signals resolved through `referenceScience()` / `referenceCenters()` (computed = raw ids ∩ catalog), fed by `multiple-wps-content` on node/KPI changes.

QA findings (Santi 2026-07-03): stale SP/Centers after node change (until F5), no preselection union on a 2nd Outcome, same for Centers. DEV-ORACLE F3: stale items get saved as `from_toc: true` → persistence corruption.

## Goals / Non-Goals

**Goals:**
- Node change (add/change/remove, Output/Outcome/2030 Outcome) reconciles the from-ToC preselection immediately: remove session-preloaded items that left the refs, add missing refs (union+dedup), empty node → only "Other(s)" remains.
- Preserve the P2-3115 contract: cold-load never resurrects a deliberately-emptied saved selection.
- A user who touched the dropdowns still receives reconciliation on later node changes (kill-switch removed).
- Lead-center consistency when a reconciliation removes the current lead.

**Non-Goals:**
- Auto-pruning **persisted** items (no `new` flag) on node change — deliberately NOT done: removing them would feed `cancel_pending_requests` on save and silently cancel stored share requests without an explicit user action. The user removes them manually; save handles the cancels (existing contract).
- Popup surface (P2-3114, Juanda) and W3/Bilateral dropdown (node-independent by design, P2-3001).
- `applyTocMappingOnLoad` timing (`from_toc: null` fallback is dead code — 2026-07-02 audit, NOT NULL columns).

## Decisions

1. **Signature-based reconciliation.** Each effect keeps the previous *resolved* ref ids (`referenceScience()/referenceCenters()` output, not the raw id signal — avoids a phantom "change" when the CLARISA/SP catalog resolves late on cold load). Same signature → no-op (protects user edits from unrelated signal re-runs). Changed signature → reconcile.
2. **Removal rule = `new: true` only.** Reconciliation removes only items stamped `new: true` (session-preloaded) that are no longer in the refs. Persisted (GET-hydrated), accepted/pending, manual "Other" selections and the "Other(s)" sentinel are never removed. More conservative than both DeepSeek proposals (their "keep overlapping" variant would drop persisted items outside the new refs).
3. **Kill-switch removal.** `userTouchedScience`/`userTouchedCenters` no longer early-return the effects (DEV-ORACLE/LOBO F2). Their remaining uses (clearing `other*Selected` on deselection) stay. Protection against overwriting user edits comes from Decision 1+2.
4. **P2-3115 guard stays, above reconciliation.** `sectionHydratedFromToc() && !tocSelectionTouched()` → return. In-session node changes mark `tocSelectionTouched` via `markUserTocSelection()`, so they reconcile; cold loads don't.
5. **Centers extra steps:** after reconciling call `setPossibleLeadCenters(true)`; if the removed set included the current `leadCenterCode`, it is cleared/recalculated by the existing auto-lead logic.
6. **Align `deleteContributingCenter` to filter-reassignment** (LOBO F4): replace in-place `splice` with a new-array `.filter()` like `deleteScience`, so chip removal renders reliably and object identity stays predictable.
7. **Node change re-adds a previously deleted preloaded item** if the new node references it — the node mandates the prefill (Ángel's scenarios); the user can delete again. Cold-load resurrection remains impossible (Decision 4).

## Risks / Trade-offs

- [Persisted items from an old node stay selected after a node change] → intentional (Non-Goal 1); user removes them manually, save cancels them. Documented for QA.
- [Effect writes plain properties (not signals)] → no re-trigger loop; signature short-circuit also guards re-entry.
- [Union across tabs] → refs signals already aggregate the selected nodes (fed by multiple-wps-content `selectionVersion`), so union+dedup falls out of the reconciliation naturally.

## Migration Plan

Front-only, epic branch `P2-2928-TOC-Improvements`, same release train. Rollback = revert commit.

## Open Questions

- None. QA-expected behavior matches Ángel's scenarios 2/3/4; persisted-item pruning explicitly deferred as a business decision if ever requested.
