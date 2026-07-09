# Proposal: P2-3130 — ToC decoupling for Contributors & Partners when alignment = NO

## Why

P2-2998, P2-2929, and P2-3114 introduced a ToC-aware split for **Contributing CGIAR Centers**, **Science Programs**, and **External Partners**: preselect from the mapped ToC node, show informational notes, and expose an **"Other(s)"** secondary dropdown. That behavior is correct when the user answers **Yes** to the ToC alignment question (planned / mapped results).

For **emerging (unplanned) results** — reported via "Report Emerging results" and then declared **No** to *"Can this result be mapped to a planned TOC KPI or indicator?"* — the result is explicitly **not** linked to the ToC. Showing ToC-derived notes, prefill, filtering, and "Other" split dropdowns is contradictory and confusing (Jira P2-3130 AC2–AC3).

## What Changes

- When `planned_result === false` on a **2026** Contributors & Partners section, treat Centers / Science Programs / External Partners as **fully decoupled** from ToC logic (`isTocDecoupled`).
- **Hide** the ToC informational notes ("The CGIAR Centers / Programs listed below were identified in your 2026 ToC…").
- **Centers & Science Programs:** show a **single** multiselect with the **full** CLARISA catalog — no "Other(s)" sentinel, no secondary dropdown.
- **External Partners:** revert to the **standard** single full-list dropdown (pre-P2-3066 split behavior for this scenario only).
- **Disable** ToC prefill/reconciliation effects when decoupled.
- **Save payload:** tag all selections `from_toc: false` when decoupled (no ToC bucket merge).
- **Out of scope:** the planned-result Report popup (`aow-hlo-create-modal`, P2-3114) — that flow always maps to a ToC indicator and keeps the split. Emerging results use `report-result-form` → result-detail C&P.

## Capabilities

### New Capabilities
- `toc-decouple-unplanned-contributors`: When ToC alignment is NO on a 2026 C&P section, Contributors & Partners fields (Centers, Science Programs, External Partners) behave independently of ToC — full catalogs, no notes, no Other split, no prefill.

### Modified Capabilities
<!-- none — extends the C&P 2026 surface without changing planned (Yes) requirements -->

## Impact

- **Frontend-only.** No backend changes.
- `rd-contributors-and-partners.component.{ts,html}` — `isTocDecoupled` gate, decoupled SP UI, save payload branch.
- `normal-selector.component.{ts,html}` — decoupled External Partners (legacy full list).
- Jest specs for decoupled save payload and `isTocDecoupled` behavior.
- **Primary user path:** Entity Details → Report Emerging results → result-detail → Contributors & Partners → Alignment **No**.
- **Also applies** to any 2026 result where the submitter sets Alignment **No**, not only emerging-report entry.
