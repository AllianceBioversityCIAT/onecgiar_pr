# Kaizen Entry — changes/portfolio-overview-revamp/global-filters

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/global-filters` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss (spec branch; default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated (the user said "continue until done") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 | tasks.md |
| Reviewer FAIL rework attempts | 4: T-1 ×1 (SQL text logged), T-6 ×1 (copy group name), T-4 ×2 (popover anchor, `aria-selected` clash, colour token; then the live defect) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0. One design deviation was accepted (`aria-checked`) | execution.md, T-4 |
| Defects reaching HITL | 1: the popover rendered empty (NG0201), and GLF-T-4 was reopened | execution.md, GLF-T-8 |
| Budget | LOC about 2× the estimate; 12 review rounds against ≤ 12 | execution.md, Budget tripwire |
| Validation FAIL / WARN | n/a. No validation-report; the T-8 HITL passed | execution.md, GLF-T-8 |

## Lessons

- **KZ-changes--portfolio-overview-revamp--global-filters-1 — A Brain directive mock must match the real directive's form (structural vs attribute), or a template that cannot render in a browser passes every spec.** (Product, High)
  - Root cause: `tests/mocks/spartanBrainMock.ts` declared `BrnCommandEmpty` as an attribute stub with no `TemplateRef`. `<p brnCommandEmpty>` therefore compiled and passed 18–20 jsdom specs and two Reviewer rounds, then threw `NG0201` in the browser and blanked every popover. The folder `CLAUDE.md` gotcha about the mock covers only missing host-directive **inputs** (NG0311), not the directive's form.
  - Evidence: execution.md — GLF-T-8 row "Dropdowns" and "GLF-T-4 attempt 3"; the user reported "los clicks no sirven en los dropdowns".
  - Standardization: → P1
- **KZ-changes--portfolio-overview-revamp--global-filters-2 — `returnErrorRepository({ debug: true })` logs the driver error, including the SQL text and binds, one layer below the service's code-only log.** (Product, Medium)
  - Root cause: the brief's exemplar (#8 `getPortfolioBilateralProjects`) shows the service-level pattern only. The repository helper's `debug: true` default was copied without anyone knowing it calls `_logger.error(error)`. Commit `65e70258f` had already fixed the same leak in `AoWBilateralRepository`, but the rule was never written anywhere an agent reads. A service spec that mocks the repository cannot see it.
  - Evidence: execution.md — GLF-T-1 attempt 1, the security Reviewer FAIL (`error.utils.ts:38-39`).
  - Standardization: → P2

## Noted, not a lesson

- T-6 attempt 1 (the copy group was named `filterNotes`) was the Leader's loose brief wording ("a clearly named place"), not an Implementer miss. It sits below the lesson bar, but it feeds the "brief must name the design's exact identifier" recurrence check.
- The window resize through Claude in Chrome had no effect (innerWidth stayed 2560). Same-origin iframes at fixed widths were a reliable substitute for the 375 / 768 / 1280 checks.
- design §6.4 assumed a 768 px breakpoint, but the project's `md` is 900 px. This is a premise that should have been looked up (`docs/ux-ui/design.md` §9). It was corrected at archive.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md`, Gotchas, the `spartanBrainMock` bullet |
| Edit | Append: "The mock must also match each Brain directive's **form**: a structural directive (`BrnCommandEmpty`, `*hlmPopoverPortal`) mocked as an attribute lets `<p brnCommandEmpty>` pass jsdom and throw NG0201 in the browser (global-filters, 2026-10-16)." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/src/CLAUDE.md` §11.7 Logging |
| Edit | Add: "In repositories call `returnErrorRepository({ …, debug: false })`. With `true` the handler logs the whole driver error, including the SQL text and bound params (`65e70258f`, global-filters T-1). Assert `debug: false` in the repository spec." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-changes--portfolio-overview-revamp--w3-projects-section-2 |
| Edit | Recurrence: test LOC again about 2× the estimate (≈3,060 lines added against ≈1,500; about 60 % specs). Add `changes/portfolio-overview-revamp/global-filters` as a source and raise the severity to High, because this time the overrun tripped the budget tripwire. |
| Severity | High |
| Status | pending |
