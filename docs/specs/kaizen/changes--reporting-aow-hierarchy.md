# Kaizen Retrospective — 3-Level Visual Hierarchy Refinement in Reporting AoW Table

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-aow-hierarchy` |
| Date | 2026-09-04 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

---

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md (`RAH-T-1`, `RAH-T-2`, `RAH-T-3`) |
| Reviewer FAIL rework attempts | 0 | execution.md (3/3 passed on attempt 1) |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | component unit tests |
| Judgment-day severe findings | 0 | design.md |
| Validation FAIL / WARN | 0 / 0 | execution.md |
| Post-execution refinements | 1 (HLO vs OUTPUT nomenclature) | execution.md §4 |

---

## Lessons

- **KZ-changes--reporting-aow-hierarchy-1 — Institutional ToC Nomenclature (HLO, OC, I-OC) Must Take Precedence Over Generic Agile Artifact Names.** (Product + Methodology, Low)
  - Root cause: Initial taxonomy badge generation defaulted to generic agile concept `OUTPUT 1.1`, whereas OneCGIAR Science Programs strictly use the formal acronym `HLO` (*High-Level Output*) and specific prefixes like `OC` and `I-OC`.
  - Evidence: User feedback screenshot, `execution.md §4`, `reporting-aow-table.component.ts:536`.
  - Standardization: → P1 (local) · upstream to AKILI domain requirements guidance.

---

## Noted, not a lesson

- **Indented visual scaffolding with accent tree line anchors nested items effectively:** Applying 24px responsive indentation (`pl-4 sm:pl-6`) with a left border (`border-l-4 border-indigo-500/40`) created instant visual grouping between Level 2 HLOs and Level 3 Indicators without causing horizontal overflow.
- **Strict event isolation protects nested interactive surfaces:** Using `emitAndStop` (`$event.stopPropagation()`) across all action buttons inside indicator rows guarantees that secondary interactions (Report, Copy link, Target details) never inadvertently fire the parent row click event.

---

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` → §2 Taxonomy guidance |
| Edit | Add: "When generating taxonomy chips, badges, or hierarchical prefixes, verify domain-specific nomenclature (e.g. CGIAR ToC acronyms `HLO`, `IO`, `OC`) against project domain glossary rather than defaulting to generic agile terms like `OUTPUT`." |
| Severity | Low |
| Status | pending |
| Upstream | AKILI methodology — domain vocabulary verification |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` |
| Edit | Add: "Documented 3-Level Card-in-Card visual hierarchy (AoW Outer Card, HLO Sub-Card with HLO 1.1 / OC / I-OC taxonomy pills, Level 3 Indented Indicator Scaffolding) and event isolation rules." |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Factual claims sweep passed; no assertions falsified by this cycle. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | No ADR overturned. Pure client presentation and card-in-card visual hierarchy refinement. |
| Severity | Low |
| Status | pending |
