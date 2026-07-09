# Design: P2-3130 — ToC decoupling for unplanned (alignment = NO) Contributors & Partners

## Context

The 2026 Contributors & Partners section (`rd-contributors-and-partners`) gates Centers, Science Programs, and External Partners behind ToC-aware split dropdowns when `planned_result !== false` (P2-2998, P2-2929, P2-3066). P2-3114 applied the same split to the **planned** Report-result popup (`aow-hlo-create-modal`).

**Emerging results** enter via Entity Details → "Report Emerging results" (`app-report-result-form`) — a lightweight create form without C&P fields. Users land on result-detail and answer the ToC alignment question in C&P. When they select **No**, the result is unplanned and must not inherit ToC constraints.

**Assumption (documented):** "desacople" = when `isCP2026() && planned_result === false`, all three contributor fields use full catalogs with no ToC prefill, notes, or Other split. This matches Jira AC1–AC4 and the parent agent inference.

## Goals / Non-Goals

**Goals:**
- Introduce `isTocDecoupled` computed signal shared by C&P parent and `normal-selector` child.
- Gate ToC split UI, info notes, Other dropdowns, and prefill effects on `!isTocDecoupled`.
- Show legacy single-dropdown UX for Centers (already in `@else` branch), Science Programs (new block), and External Partners (`normal-selector` `@else`).
- Save with `from_toc: false` for all selections when decoupled.

**Non-Goals:**
- Changing planned (Yes) or 2025 behavior.
- Changing `aow-hlo-create-modal` (always planned-indicator context).
- Clearing user selections when toggling Yes → No (existing `onPlannedResultChange` clears ToC tabs only; center/SP selections persist — acceptable; user can edit freely in decoupled mode).
- Backend API changes.

## Decisions

1. **`isTocDecoupled` predicate:** `isCP2026() && partnersBody.result_toc_result.planned_result === false`. Strict equality — `null` keeps planned split until user answers.
2. **Centers:** Reuse existing `@else` branch (`centersSE.centersList` full list). Hide info note and Other dropdown via `!isTocDecoupled` on split branches.
3. **Science Programs:** New `@if (isCP2026() && isTocDecoupled())` block with `allScienceProgramsList()` — mirrors legacy 2025 single dropdown. Split branch gated with `!isTocDecoupled`.
4. **External Partners:** `normal-selector` — when decoupled, fall through to `@else` (full `institutionsWithoutCentersListPartners`). Skip `preselectPartnersEffect` when decoupled.
5. **Save:** Dedicated branch in `onSaveSection` before planned ToC merge — centers, institutions, SP all `from_toc: false`; no Other-bucket merge.
6. **Parity with P2-3114:** Planned popup unchanged; decoupling is C&P-only for alignment NO.

## Risks / Trade-offs

- [User toggles Yes → No with ToC-prefilled centers still selected] → Selections remain valid in full list; save tags `from_toc: false`. QA should verify no phantom sentinel chips.
- [Emerging result created without ever setting alignment] → `planned_result === null` shows planned split until answered — correct per AC1 (trigger is explicit NO).
- [Contributor share-request sub-blocks] → Out of scope; only submitter `result_toc_result` drives decoupling.

## Migration Plan

Frontend-only deploy with 2026 C&P. Rollback = revert commit.

## Open Questions

- None — Jira AC is explicit. Assumption above aligns with AC2–AC4.
