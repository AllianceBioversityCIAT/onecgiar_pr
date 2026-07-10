## Why

In the 2026 Contributors & Partners section (P2-2998), the "Contributing CGIAR Centers" dropdown is supposed to auto-preload the centers referenced by the selected HLO/Outcome node and its KPI Statement. Today it only refreshes when the user **switches ToC tabs** — selecting an HLO with its KPI Statement inside the current tab does **not** load the centers, so users must change tabs to force the list to appear. This breaks the expected "select → centers appear instantly" behavior and is confusing when more than one HLO/KPI is selected.

**Scope:** frontend-only. Ticket **P2-2998** (epic `P2-2928-TOC-Improvements`).

## What Changes

- Make the ToC → Centers reference sync **reactive to in-tab selection changes**, not just tab switches.
- When the user selects an HLO/Outcome (level dropdown) OR its KPI Statement/indicator, the `Contributing CGIAR Centers` list preloads immediately from the selected node's `toc_partners` + the indicator's `toc_target_center_ids` (existing union/dedupe contract — unchanged).
- No change to the union/dedupe logic, the backend contract, the save flow, or the "Other(s)" split. Only the **trigger/reactivity** of the existing `syncTocReferenceIds` effect changes.

## Capabilities

### New Capabilities
- `toc-centers-reactive-preload`: The Contributing CGIAR Centers reference set must recompute reactively whenever the user changes the selected HLO/Outcome node or its KPI Statement within any ToC tab, not only when the active tab changes.

### Modified Capabilities
<!-- None. The base capability toc-contributors-centers (change p2-2998-centers-from-toc-split) is not yet archived; this change only sharpens the reactivity requirement, expressed as a new capability to avoid coupling to an unarchived delta. -->

## Impact

- **Component:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts`
  - `effect syncTocReferenceIds` (currently only reactive to `outputList/outcomeList/eoiList` + `activeTabSignal`; iterates the non-reactive `@Input() allTabsCreated`).
  - Selection handlers `getIndicatorsList()` (HLO/Outcome select) and `mapTocResultsIndicatorId()` (KPI Statement select).
- **Consumer (read-only, no change expected):** `rd-contributors-and-partners.component.ts` `referenceCenters` / `preselectCentersEffect`, fed by `rdPartnersSE.tocReferenceCenterInstitutionIds`.
- **Backend:** none.
- **SDD baseline:** UI behavior per `docs/system-design/design.md` (Contributors & Partners section); no data-model change vs `docs/detailed-design/detailed-design.md`.
