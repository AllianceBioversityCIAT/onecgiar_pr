## Why

**Frontend-only.** No backend change is required — the data is already in the payload.

The read-only `<Level> Statement` field added by change `p2-3063-hlo-outcome-statement` (ticket **P2-3063**, epic **P2-2928 ToC Improvements**) is stale: when a reporter changes the HLO / Intermediate Outcome / 2030 Outcome dropdown, the statement box keeps showing the **previous** node's statement. It only catches up after the form is saved. A read-only field whose whole purpose is to tell the reporter *which* ToC node they just picked is actively misleading while it lags — the reporter can pick outcome B, read outcome A's statement, and save on a false confirmation.

Root cause is a reactivity gap, not a data gap: `selectedTocNode` is a `computed()` whose only reactive dependencies are `activeTabSignal()` and the three ToC lists, while the node dropdown mutates the plain `activeTab` object **in place** through `[(ngModel)]`. No signal notifies, so the computed keeps its cached value until the parent re-sets the lists on save.

## What Changes

- `selectedTocNode` (in `multiple-wps-content.component.ts`) subscribes to the **already existing** `selectionVersion` signal, so it recomputes on every genuine node selection instead of only when the lists are replaced.
  - `selectionVersion` was introduced by P2-2998 for exactly this class of bug ("in-place mutations don't notify the effect") and is already bumped by `getIndicatorsList()`, which the three node dropdowns already call from `ngModelChange`. The mechanism exists; it simply was never wired to this computed.
- No template change, no new signal, no change to the field's visibility rules, label, tooltip or data source. Behaviour in the No scenario, on phase 2025, and in the IPSR / bilateral / share-request reuses stays byte-identical.
- **Not** a **BREAKING** change.
- Verification is scripted with Playwright against a served build: the script first reproduces the current (broken) behaviour, then proves the fix — see `design.md`.

## Capabilities

### New Capabilities
- `toc-statement-reactivity`: when the reporter changes the selected ToC node, the read-only statement field reflects the newly selected node immediately, without requiring a save.

### Modified Capabilities
<!-- None. The base behaviour of the statement field lives in change `p2-3063-hlo-outcome-statement`,
     which is not archived yet, so there is no published spec under openspec/specs/ to delta against.
     This change adds the reactivity requirement the base spec left implicit. -->

## Impact

**Affected code (client only, 1 file, 1 statement):**
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts` — the `selectedTocNode` computed.

**Not affected (verified):**
- The duplicated `multiple-wps-content` under `rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/` — that copy does not render the statement field at all.
- The `Indicator Tipology` field from `p2-3063-indicator-typology` — it reads `selectedIndicatorData()`, a signal written with `.set()` inside `updateSelectedIndicatorData()`, so it already notifies correctly.
- Server, APIs, DTOs, entities, migrations: untouched. `outcome_statement` already ships in `GET /v2/toc/result/{id}/initiative/{id}/level/{n}` (backend enrichment `df27cc55a`).

**SDD baseline:**
- `docs/detailed-design/detailed-design.md` — frontend state management (Angular signals, `computed()` dependency tracking).
- `docs/system-design/design.md` — Contributors & Partners ToC detail screen, read-only field behaviour.
- Sibling changes for context: `openspec/changes/p2-3063-hlo-outcome-statement/` (introduces the field), `openspec/changes/p2-2998-centers-from-toc-split/` (introduces `selectionVersion`).

**Test gate:**
- This component is excluded from the client Jest coverage set (documented in `p2-3063-hlo-outcome-statement/design.md`), so the gate is `build:dev` + scripted Playwright before/after on a served build. Client lint + full Jest suite still run before any push.
