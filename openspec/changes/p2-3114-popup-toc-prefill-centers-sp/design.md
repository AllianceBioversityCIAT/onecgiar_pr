# Design: P2-3114 — ToC prefill for Centers & SP in the Report-result popup

## Context

The popup lives in `aow-hlo-create-modal.component.{ts,html}`; its state is held in `entity-aow.service.ts`. On open, `aow-hlo-table.openReportResultModal(item, indicatorId)` sets `currentResultToReport = { ...item, indicators: [selectedIndicator] }`. The selected indicator already carries `targets_by_center.centers: { center_id, target_value }[]` — the ToC-mapped centers for that node. `createResult()` builds the create payload and sends `contributing_center`, `contributors_result_toc_result` (selected SP entities), and `bilateral_project`.

The C&P surface (result detail) already implements the target behavior: two buckets per field — ToC-derived (`from_toc: true`, preselected) and Other (`from_toc: false`) — reconciled reactively and merged in `onSaveSection`. We mirror the *shape* of that contract in the popup, at a smaller scale (single-shot creation, no reactive reconciliation loop needed because the indicator/node is fixed for the popup session).

## Goals / Non-Goals

- **Goals:** preselect ToC-mapped Centers (and SP) on popup open; expose "Other(s)" dropdowns for the remainder; tag `from_toc`; carry tags into the create payload; fix the "(undefined)" chip label.
- **Non-Goals:** reactive re-derivation on node change (the popup targets a single fixed indicator), C&P surface changes, bilateral behavior, backend changes for Centers.

## Decisions

### D1 — Centers: derive from `targets_by_center.centers`
On popup open, map `currentResultToReport().indicators[0].targets_by_center.centers[].center_id` to the matching entries in `centersSE.centersList` (by code/id) to build the **ToC bucket** (preselected, `from_toc: true`). The main Centers dropdown shows the ToC bucket; an **"Other(s) Contributing CGIAR Centers"** dropdown (enabled via a sentinel "Other" option, matching the C&P UX) offers the remaining centers (`from_toc: false`). `createResult()` sends `contributing_center = [...tocCenters, ...otherCenters]` with `from_toc` on each, reusing the C&P payload shape so `handleContributingCenters` persists the flag.

### D2 — Science Programs: split with ToC bucket (data source TBD)
Mirror D1 for SP: a main dropdown preseleccts the ToC-derived SP + an **"Other(s) Science Program(s)"** dropdown for the rest. **Open dependency:** unlike Centers, the indicator payload does not clearly expose the ToC synergy SP. Options, in order of preference: (a) a field already present on the AoW `item`/indicator response (verify the raw GET); (b) reuse of the same source the C&P uses; (c) a backend addition (coordinate with Juanda). Until confirmed, the SP dropdown keeps today's manual behavior and the ToC-preselect for SP is gated behind the confirmed source — shipped separately if needed, so Centers is not blocked.

### D3 — `from_toc` end-to-end
Preselected (ToC) items → `from_toc: true`; Other-dropdown items → `from_toc: false`. This matches the C&P `onSaveSection` merge and the `handleContributingCenters` / SP persistence contract, so the C&P form on redirect buckets them identically (no drift).

### D4 — Fix "Center(s) selected (undefined)" chip
The multiselect chip label interpolates an undefined count/label. Bind the `selectedLabel`/count to the actual selected array length (or the item's display field), so the summary reads e.g. "2 Center(s) selected".

## Risks / Trade-offs

- **SP source (D2):** the main risk. Mitigated by shipping Centers first and gating SP preselect behind a confirmed data source; the popup remains functional (manual SP) if the source is missing.
- **Duplication with C&P:** the create payload already re-derives on the C&P form. Sending `from_toc` from the popup keeps the two surfaces consistent instead of divergent; not sending it would let the C&P silently re-bucket, which is the current inconsistent behavior we are removing.
- **CLARISA id/code mapping (D1):** `targets_by_center.centers` uses `center_id`; the dropdown options key on `code`. Confirm the join key when mapping.

## Migration / Rollout

Frontend-only (assuming Centers path). Behind the existing 2026 popup; no flag needed. If D2 needs backend, split into a follow-up task gated on Juanda's payload.

## Open Questions

- **Q1 (blocking SP only) — RESOLVED as a GAP:** the AoW `toc-results` response exposes no Science Program / synergy field on the node or indicator. SP preselect needs a backend source (Juanda).
- **Q2 — RESOLVED:** join key is `targets_by_center.centers[].center_acronym` → `CenterDto.acronym` (then take `.code`). `CenterDto = { code, financial_code, name, acronym, full_name }`.
- **Q3 — Binding inconsistency to fix first:** the Centers `<app-pr-multi-select>` uses `optionValue="code"`, so `createResultBody().contributing_center` holds an array of **code strings** — yet the chip `*ngFor` reads `center?.name` / `center.from_cgspace` (**objects**), and the create payload / `from_toc` tagging need objects too. This mismatch is the likely source of the "(undefined)" chip. Fix: drop `optionValue="code"` so the model holds full center objects (matching the C&P shape), and align the chip loop + `createResult()` payload accordingly.
