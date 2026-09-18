# Kaizen Entry — changes/project-multiselect-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-multiselect-filter` |
| Date | 2026-09-18 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 (PMF-T-1) PASS | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 1 (wave 1 browser evidence / synthetic key limits) | `execution.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 1 (row-derived options -> center catalog per phase year) | `execution.md` Pivot Record |
| PRODUCT_BUGs | 0 | n/a |
| Judgment-day severe findings | 0 | n/a |
| Validation FAIL / WARN | 0 | `execution.md` |
| `/akili-quick` escalation | 0 | n/a |

## Lessons

- **KZ-changes--project-multiselect-filter-1 — Center filter option domains must match organizational ownership, not raw row occurrences.** (Product, High)
  - Root cause: Initial design derived project options from all loaded rows. Because results include contributing results where other Centers led, foreign-center project codes appeared in the filter, while center projects with zero results were missing entirely.
  - Evidence: `execution.md` Pivot Record — AfricaRice rows showed 14 foreign projects out of 20. Fixed by fetching the center's catalog per selected phase year via `GET /api/bilateral/center/projects?year=...`.
  - Standardization: → P1.

- **KZ-changes--project-multiselect-filter-2 — Synthetic automation events cannot prove browser-native focus outlines and key activation.** (Methodology, Medium)
  - Root cause: Automated browser harnesses dispatch untrusted synthetic keyboard events which do not trigger native `:focus-visible` styling or Enter/Space click synthesis on standard HTML anchor/button triggers, leading to false-negative review verdicts on unmodified shipped controls.
  - Evidence: Reviewer Attempt 1 & 2 verdicts in `execution.md`. Adjudicated via human HITL verification.
  - Standardization: → P2.

## Noted, not a lesson

- `build:dev` and full test suites (1596 client tests, 2800 server tests) remained green throughout both wave 1 and wave 2.
- Backward compatibility on `GET /api/bilateral/center/projects` was rigorously verified across existing callers.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` — Section on filter design |
| Edit | Add: "When designing entity/filter controls in a specific organizational scope (e.g. Center, Initiative), derive options from the organizational catalog (e.g. Center Projects), not the result row dataset, so zero-result items remain selectable and contributing foreign items do not pollute the domain." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/reviewer.md` — Browser evidence review guidelines |
| Edit | Add: "Acknowledge harness limitations when evaluating keyboard focus: if an existing shipped control is reused without custom CSS outline suppression, do not fail automated review solely on lack of synthetic :focus-visible screenshot." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` — Bilateral APIs / Center Projects |
| Edit | Note: "GET /api/bilateral/center/projects accepts an optional query parameter `year` (number). When provided, it filters projects by `cp.reporting_year = :year`; when omitted, it defaults to the active reporting phase." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | codegraph |
| Target | `.codegraph/` |
| Edit | Re-index (`codegraph sync`) after merge so `BilateralProjectsService.getProjectsByCenter` year filtering and client-side `projectOptions` catalog union are indexed. |
| Severity | Low |
| Status | pending |
