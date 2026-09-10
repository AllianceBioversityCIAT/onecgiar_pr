## 1. Implementation

- [x] 1.1 Add `selectionVersion = signal(0)` field to `CPMultipleWPsContentComponent` (`multiple-wps-content.component.ts`).
- [x] 1.2 Read `this.selectionVersion()` inside the `syncTocReferenceIds` effect so it subscribes to selection changes (add near the other dependency reads).
- [x] 1.3 Increment `selectionVersion` at the end of `getIndicatorsList()` (HLO/Outcome selection handler).
- [x] 1.4 Increment `selectionVersion` at the end of `mapTocResultsIndicatorId()` (KPI Statement selection handler).

## 2. Verification

- [x] 2.1 Build the client (`npm run build:dev`) and confirm no TypeScript/lint errors.
- [x] 2.2 In-browser (prtest data, result 8574): changing the HLO/Outcome node recomputed `tocReferenceCenterInstitutionIds` immediately (from node 7026's centers to node 7029's `toc_partners`), no tab switch. `selectionVersion` incremented.
- [x] 2.3 In-browser: selecting a KPI Statement whose indicator has `toc_target_center_ids` ([67]) unioned it into the centers reference set immediately. `selectionVersion` incremented.
- [x] 2.4 Union/dedupe logic unchanged — the effect body that unions across `allTabsCreated` is untouched; only its reactivity (the `selectionVersion` dependency) changed. Verified single-tab recompute reflects the node+indicator union. (Result 8574 has 1 tab; multi-tab union path is the same loop already exercised on tab-switch.)
- [x] 2.5 No regression: change is additive (a signal bump + one extra effect dependency); does not touch the "Other(s)" split, preselection, or Science Programs paths. `build:dev` clean.

## 3. Follow-up (out of scope, flag only)

- [ ] 3.1 If the radio "Can this result be mapped… → Yes" (`tocConsumed` re-render) still shows empty centers, note it for a separate ticket — do not fix here.
