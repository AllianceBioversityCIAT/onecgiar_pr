# Design: report-popup-qa-adjustments

## Context

The Report-result popup (`aow-hlo-create-modal`, AoW module) was extended under P2-3114 to preselect ToC-derived CGIAR Centers and Science Programs with a ToC/Other(s) split, mirroring the C&P section (`rd-contributors-and-partners`). QA found the port incomplete against P2-2998:

**Current data flow (Centers):**
1. AoW page loads toc-results via `results-framework-reporting.service.ts` (server), which enriches each indicator with `targets_by_center = { targets, centers[] }` (centers mapped in the KPI Targets) and each node with `contributing_synergy_program_initiative_ids` (P2-3114 addition).
2. `EntityAowService.currentResultToReport()` holds the selected node; the popup's `preselectTocCenters()` reads **only** `indicators[0].targets_by_center.centers`, matches by `acronym` against `CentersService.centersList`, tags `from_toc: true`.
3. The C&P section, by contrast, derives its reference set from `toc_partners ∪ toc_target_center_ids` (see spec `toc-centers-reactive-preload` and `rd-contributors-and-partners.component.ts:115`), matching by `institutionId`.

The HLO-level `toc_partners` never reach the popup because the AoW payload does not include them — the server-side query exists (`TocResultsRepository.getTocPartnersByResultIds`, returns `{ toc_result_id, code }` where `code` is the CLARISA institution code) but is only wired into the `/toc/toc-results` catalog endpoint used by C&P.

**Current template gaps (popup HTML):**
- SP empty state: the "Contributing Science Programs/Accelerators" header renders with no control under it (`@if (hasReferenceScience())` hides dropdown 1), immediately followed by the "Other(s)…" header — two labels stuck together.
- No empty-state orange notes (P2-2998 AC4 mandates them "as the first popup when a result is being created"). C&P already owns the canonical strings (`noCentersNote`, `noScienceProgramsNote`).
- No blue ToC parity notes above the Centers/SP dropdowns (C&P has them at `:118` and `:208`).

## Goals / Non-Goals

**Goals:**
- Popup Centers preselection = HLO-level ToC Partners (that are CGIAR Centers) ∪ KPI Targets centers, deduplicated (P2-2998 AC1/AC2).
- Popup shows the AC4 empty-state notes for Centers and SPs.
- Popup shows the ToC parity info notes when ToC-derived options exist.
- SP empty state renders as two visually separated fields.

**Non-Goals:**
- No changes to the C&P section (already compliant).
- No changes to the create payload contract (`contributing_center` / `contributors_result_toc_result` shapes stay as-is; new preselected centers simply flow through the existing `from_toc: true` path).
- No re-derivation changes on redirect to C&P.
- No handling of multiple simultaneously-selected HLOs in the popup (the popup is opened per indicator/node; the union rule applies to that node's sources).

## Decisions

1. **Server: expose HLO partners as `toc_partner_institution_ids: number[]` per AoW toc-result node**, populated in `results-framework-reporting.service.ts` next to the P2-3114 `contributing_synergy_program_initiative_ids` enrichment, reusing `TocResultsRepository.getTocPartnersByResultIds`.
   - *Why:* identical, proven pattern (commit `bad223a34`); one query, no migration, additive payload.
   - *Alternative considered:* client-side fetch of `/toc/toc-results` catalog from the popup — rejected: duplicates a heavy endpoint call on popup open and mixes two payload contracts.
   - ⚠️ Server code is read-only for the AI under this repo's SDD rules — this task is flagged for the user (or explicit authorization).
2. **Client: union by `institutionId` + `acronym`.** `preselectTocCenters()` builds two sets: (a) centers whose CLARISA `institutionId` ∈ `toc_partner_institution_ids` (same matching rule C&P uses — partners that are not CGIAR Centers simply don't match and are excluded, per the ticket) and (b) centers whose `acronym` ∈ `targets_by_center.centers[].center_acronym` (existing logic, untouched). Union deduped by `code`.
   - *Why:* minimal increment on working logic; preserves current behavior when the new field is absent (older payloads ⇒ empty array ⇒ no regression).
3. **Note strings (QA resolved by Slack, 2026-07-14): unified wording in BOTH surfaces.** Orange AC4 notes and the Centers blue note reuse C&P's exact strings (C&P Centers note already matches QA's wording). The **SP blue note** uses QA's wording — "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear." — in the popup **and** replacing C&P's current `contributingScienceInfoNote` (`rd-contributors-and-partners.component.ts:207`, "Programs/Accelerators… contributing Program/Accelerator…"). All rendered with the existing `app-alert-status` component (`status="warning"` / `status="info"`).
   - *Why:* QA mandated identical texts in both the C&P section and the creation popup. Context: QA checked production and did not see the C&P notes — they exist only in this branch (`isCP2026()` + `hasReference*()` conditions, template lines 96/291), not yet deployed; no missing-render bug.
4. **Empty-state visibility:** orange notes render when `!hasReferenceCenters()` / `!hasReferenceScience()`; blue notes render in the opposite case. The Other(s) dropdown auto-activation logic is already correct and stays untouched.
5. **Spacing fix via structure, not margin hacks:** in the SP empty state, keep the main header + orange note as one block, then the Other(s) block — the note itself separates the two headers; add SCSS gap only if visual QA still requires it.

**Existing consumers checked (behavior preserved):**
- `createResult()` payload builders read `contributingCenters()` / `selectedEntities()` — unchanged shapes, so the `from_toc` bucketing on redirect to C&P is unaffected.
- `dropdown1Options()` / `otherCentersList()` derive from `tocCenters` — the widened union flows through them with no code change.
- C&P consumes `toc_partners` from the `/toc/toc-results` catalog endpoint — untouched.
- `aow-hlo-table` / `aow-view-results-drawer` read other node fields — additive payload field is invisible to them.

## Risks / Trade-offs

- [Server hand-off delays the full fix] → Items 1–3 are frontend-only and can ship first; item 4's frontend merge is written defensively (`?? []`) so it ships dark and lights up when the payload field arrives.
- [Partner `code` vs CLARISA `institutionId` mismatch] → C&P already matches this way in production (`toc_partners ∪ …` by `institutionId`); reuse the same mapping. Verify with one real SP01 node via curl on prtest before closing.
- [String drift between popup and C&P] → strings copied verbatim; noted in both components' comments pointing at each other.
- [Duplicate centers when a partner is also a targets center] → dedupe by `code` in the union (AC2 explicitly requires strict dedup).

## Migration Plan

No migrations. Additive payload field; frontend tolerates its absence. Deploy server first (or together); no rollback concerns beyond normal revert.

## Open Questions

- None blocking. (If business later wants non-Center partners surfaced somewhere in the popup, that is a new requirement — the ticket restricts preselection to CGIAR Centers.)
