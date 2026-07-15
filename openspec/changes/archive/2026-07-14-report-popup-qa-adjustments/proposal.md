# Proposal: report-popup-qa-adjustments

## Why

QA (Santiago Sanchez, 2026-07-14, priority high per Angel) flagged four gaps in the Report-result popup (`aow-hlo-create-modal`): the P2-3114 work ported only part of the Contributors & Partners (C&P) behavior mandated by **P2-2998** (ToC Business Rules for Contributing CGIAR Centers) into the popup. P2-2998 AC4 explicitly states the empty-state behavior "applies as the first popup when a result is being created", and AC1 requires the reference centers to be derived from **both** the HLO/Outcome-level `Partners` fields **and** the KPI Targets centers — the popup currently uses only the latter.

Jira: **P2-3114** (popup prefill) and **P2-2998** (business rules), both under epic **P2-2928 TOC Improvements — Q2**. Scope classification: **full-stack** (three frontend-only fixes + one fix that requires a server payload addition).

## What Changes

1. **Spacing fix (frontend)** — In the popup's empty state for Science Programs, the "Contributing Science Programs/Accelerators" header renders with no control beneath it, visually stuck to the "Other(s) Science Program(s)/Accelerator(s)" header. Add the missing structure/spacing so the two blocks read as separate fields.
2. **Empty-state alerts (frontend)** — When the ToC returns no Science Programs, show the orange note `No Science Programs related to the established HLO/Outcomes were found`; when it returns no CGIAR Centers, show `No CGIAR Centers related to the established HLO/Outcomes were found` (P2-2998 AC4). The Other(s) dropdowns already auto-activate in the empty state; only the notes are missing. Reuse the exact strings from `rd-contributors-and-partners.component.ts`.
3. **ToC info notes (frontend)** — Add the blue informational notes above the popup's "Contributing CGIAR Centers" and "Contributing Science Programs/Accelerators" dropdowns ("The CGIAR Centers listed below were identified in your 2026 ToC…" / "The Programs/Accelerators listed below…"), for parity with the C&P section. Shown only when ToC-derived options exist.
4. **HLO-level Partners feed the Centers preselection (full-stack)** — Extend the popup's Centers preselection to the union of: HLO/Outcome-level ToC `Partners` (those that are CGIAR Centers) **∪** KPI Targets centers, deduplicated (P2-2998 AC1/AC2).
   - **Backend (flagged — needs explicit approval / hand-off per project rules):** the AoW toc-results payload (`results-framework-reporting.service.ts`) does not expose HLO-level partners today. Add them per node (e.g. `toc_partner_institution_ids`), following the P2-3114 pattern used for `contributing_synergy_program_initiative_ids` and reusing `TocResultsRepository.getTocPartnersByResultIds`.
   - **Frontend:** merge the new field into `preselectTocCenters()` in `aow-hlo-create-modal.component.ts` (match against CLARISA centers by `institutionId`, union + dedupe with `targets_by_center`).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `popup-toc-prefill`: (introduced by pending change `p2-3114-popup-toc-prefill-centers-sp`, not yet archived) Centers preselection source widens from "KPI Targets centers only" to "HLO-level ToC Partners ∪ KPI Targets centers, deduplicated"; the popup gains the P2-2998 AC4 empty-state notes and the ToC parity info notes; the SP empty state renders as two visually separate fields.

## Impact

- **Client:**
  - `onecgiar-pr-client/.../aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts` (`preselectTocCenters`, new note flags)
  - `.../aow-hlo-create-modal.component.html` (alerts, info notes, spacing/structure)
  - `.../aow-hlo-create-modal.component.scss` (spacing)
  - `.../aow-hlo-create-modal.component.spec.ts` (new cases; client coverage gates 50/60/60/60)
- **Server (⚠️ flagged, read-only for the AI — hand-off unless the user authorizes):**
  - `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` (expose HLO partners in the AoW toc-results payload)
  - Reuses existing `TocResultsRepository.getTocPartnersByResultIds` — no migration required.
- **SDD baseline:** behavior aligns `docs/system-design/design.md` form patterns (alert + field parity with `rd-contributors-and-partners`); no PRD scope change — this implements existing ACs of P2-2998/P2-3114.
- **No breaking changes.** Payload addition is additive; UI changes are contained to the popup.
