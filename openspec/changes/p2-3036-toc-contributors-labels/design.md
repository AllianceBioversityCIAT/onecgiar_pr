## Context

The P25 **Contributors & Partners** section renders the ToC-alignment block from a single component tree:
- `rd-contributors-and-partners.component.html` — the ToC question (`app-pr-yes-or-not`), its info note (`app-alert-status`), Submitter, Contributing CGIAR Centers, etc.
- `multiple-wps-content.component.html` — the per-tab ToC detail: Level, HLO/Outcome, **Indicator**, **Contribution to indicator target** info note.

All user-facing copy in this tree is **hardcoded English** (no `term` pipe). The component tree is **excluded from Jest coverage**. The authoritative wording for 2026 lives in the Excel `PRMS_2026_Contributors_and_Partners_section_20260611_AJ.xlsx`.

Phase 1 changes only the copy of existing elements. No data binding, no `@if`, no service, no DTO is touched.

## Goals / Non-Goals

**Goals:**
- Replace four existing strings and add one inline help text so the section reads per the 2026 Excel.
- Keep the diff minimal and reviewable; match the existing hardcoded-string style of the file.
- Produce a before/after PDF for human validation of wording.

**Non-Goals:**
- No field removal/addition, no validation, no show/hide logic, no repositioning, no backend — all deferred to Phases 2/3.
- No migration to the `term` i18n pipe (would expand scope; the surrounding code is hardcoded).

## Decisions

**D1 — Keep strings hardcoded (don't introduce the `term` pipe).**
The whole `rd-contributors-and-partners` tree hardcodes its English copy and is P25-only. Introducing `TermKey`s for these five strings would be inconsistent with the file and expand scope. Rationale: "write code that reads like the surrounding code." Alternative (term pipe) rejected for Phase 1.

**D2 — ToC question label lives in two places; update both.**
The label appears as the `app-pr-yes-or-not [label]` in the HTML and is also re-built as a contributor string in `rd-contributors-and-partners.component.ts` (`...short_name} - Does this result align...`). Both must change to keep the contributor-row text consistent. Grep for the old phrase across the client to confirm no third occurrence (lesson L1 — twin components).

**D3 — New KPI help text via the existing `description` input.**
`app-pr-select` and `app-pr-field-header` both expose a `description` input rendered as inline grey help text under the label (`innerHTML`). The Excel "info note tooltip" for `KPI Statement/description` (row 12) will be added as `description="Maps to TOC: [KPI Statement – deliverable short name and indicator description]"` on the Indicator/KPI `app-pr-select`. This reuses the established pattern rather than introducing a new hover-tooltip widget. Alternative (PrimeNG `pTooltip` on an info icon) rejected for Phase 1 to stay minimal — can be revisited if the mockup demands a hover icon.

**D4 — Info notes keep their existing `app-alert-status` host; only `description` text changes.**
Both the ToC-question info note and the Contribution-Target info note already use `app-alert-status`; we swap only the text (preserving existing `<strong>`/`<br>` HTML conventions and `inlineStyles`).

## Risks / Trade-offs

- [Wording mismatch vs Excel] → Copy strings verbatim from the parsed Excel; verify each against the synthesis table before/after.
- [Hidden third occurrence of the old question text] → Mitigate with an exhaustive grep across `onecgiar-pr-client/src` before declaring done (L1).
- [D3 ambiguity: inline text vs hover tooltip] → Low impact; flagged as Open Question. Defaulting to inline `description` keeps Phase 1 reversible.
- [No unit tests possible] → Component excluded from coverage; rely on successful build + visual before/after PDF as the gate.

## Open Questions

- **OQ1 (D3):** Should the "Maps to TOC: …" help be an always-visible inline note (chosen default) or a hover tooltip on an info icon, per the final mockup? To confirm visually / with Ángel; does not block Phase 1 since it is reversible.
