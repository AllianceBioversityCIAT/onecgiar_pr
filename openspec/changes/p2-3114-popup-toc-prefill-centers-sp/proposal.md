# Proposal: P2-3114 — Apply ToC business rules for Centers & Science Programs in the Report-result popup

## Why

The 2026 ToC business rules for **Contributing CGIAR Centers** (P2-2998) and **Contributing Science Programs** (P2-2929) were implemented only in the Contributors & Partners section of the result detail. Their own acceptance criteria, however, state: *"this behavior applies as the first popup when a result is being created."* The `reactive-toc-prefill` change also flags the popup as pending (out of scope there, tracked as **P2-3114**).

Today the Report-result popup (`aow-hlo-create-modal`) ignores the ToC entirely:
- **Centers** dropdown is bound to the full CLARISA list (`centersSE.centersList`), manual selection only — no ToC preselection, no ToC/Other split, no `from_toc` tag.
- **Science Programs** dropdown is bound to `allInitiatives()`, manual selection only — same gaps.

So a user reporting an indicator whose ToC node maps specific centers/SP must re-pick them by hand, and nothing is tagged `from_toc`. When they land on the C&P form after creation, the section re-derives the ToC preselection, creating an inconsistent two-step experience the AC intended to avoid.

A minor display defect is also visible: the Centers multiselect chip renders **"Center(s) selected (undefined)"**.

## What Changes

- In the Report-result popup, when the user opens it for an indicator, **derive the ToC-mapped Centers** from the indicator payload already present (`currentResultToReport().indicators[0].targets_by_center.centers`) and **preselect** them in a first dropdown, with an **"Other(s) Contributing CGIAR Centers"** dropdown enabled for the rest. Tag preselected items `from_toc: true`, Other items `from_toc: false`.
- Apply the equivalent split for **Science Programs**: a first dropdown with the ToC-derived SP preselected + an **"Other(s) Science Program(s)"** dropdown. (See design — the SP ToC source in the popup context is a data dependency to confirm.)
- Carry the `from_toc` tags into the create payload (`bilateral_project` unaffected; `contributing_center` and the SP contribution list gain `from_toc`) so the C&P form shows the same preselection after redirect, with no re-derivation drift.
- Fix the **"Center(s) selected (undefined)"** chip label.

## Capabilities

### New Capabilities
- `popup-toc-prefill`: on the Report-result creation popup, preselect the ToC-mapped Contributing CGIAR Centers and Science Programs derived from the selected indicator's ToC node, expose "Other(s)" dropdowns for the remainder, and persist the `from_toc` distinction into the created result so the C&P form is consistent on redirect.

### Modified Capabilities
<!-- none — the existing C&P specs cover the result-detail surface; the popup surface is new behavior. -->

## Impact

- `onecgiar-pr-client/.../aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.{ts,html}` — Centers & SP dropdowns, split logic, `from_toc` tagging, chip label fix.
- `onecgiar-pr-client/.../entity-aow/services/entity-aow.service.ts` — derive/expose ToC-mapped centers & SP for the popup; reset on close.
- Jest specs for the popup component + service.
- **Out of scope:** the C&P result-detail surface (already done — P2-2929/P2-2998), the W3/bilateral dropdown (P2-3001, SP-level list, node-independent by design), any backend change (assumed the indicator payload already carries `targets_by_center.centers`; SP source TBD in design).
- **Dependency/risk:** the ToC-mapped **Science Programs** source in the popup is not yet confirmed in the indicator payload (Centers are, via `targets_by_center.centers`). If unavailable, SP preselection needs a data source from backend (coordinate with Juanda, P2-3114 owner).
