# Kaizen Entry — changes/emerging-result-cta-placement

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/emerging-result-cta-placement` |
| Date | 2026-09-05 |
| Branch | qa-development-2026 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 / 5 | tasks.md |
| Reviewer FAIL rework attempts | 0 post-fix (T-1/T-2 PASS attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| Judgment-day severe findings | 4 confirmed (C1–C4), fixed pre-execute; re-judge skipped | judgment.md |
| T-2 red-phase test failures | 7 (before green) | execution.md — ERC-T-2 |
| Execute-time test fixes | 3 (static path, stub inputs, import restore) | session / scoped run |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| PRODUCT_BUGs | 0 | — |

## Lessons

- **KZ-changes--emerging-result-cta-placement-1 — Static guard paths must reuse the walk root anchor.** (Product, Low)
  - Root cause: `innovation-link-surfaces.spec.ts` built `lab-report-form` with a shorter `join(__dirname, …, 'pages', …)` chain than the file's existing `APP` constant, producing `app/pages/pages/…` and ENOENT at runtime.
  - Evidence: scoped Jest run after T-5 — 1 failed suite until path fixed to `join(APP, 'pages', 'result-framework-reporting', …)`.
  - Standardization: → P1

- **KZ-changes--emerging-result-cta-placement-2 — New `@Input()` / `@Output()` on a child require stub updates in every parent spec that overrides the child.** (Product, Medium)
  - Root cause: `indicator-drawer` gained `emergingMode` / `emergingCategory` bindings to `lab-report-form`; `LabReportFormStub` in `indicator-drawer.component.spec.ts` was not updated until the scoped suite failed.
  - Evidence: execute session — drawer spec failures until stub gained the two inputs.
  - Standardization: → P2

- **KZ-changes--emerging-result-cta-placement-3 — New create/chrome gates must default fail-closed in design and code.** (Product, Medium)
  - Root cause: Judgment Day C3 — `canReportEmerging` was designed default `true`, contradicting sibling `canReport` and `ERC-R-5`; would expose emerging create on AVISA if a host forgot the binding.
  - Evidence: judgment.md C3; fix landed as `@Input() canReportEmerging = false` + unset-input Jest cases (ERC-T-1).
  - Standardization: → P3

## Noted, not a lesson

- Owner skipped Judgment Day re-judge after C1–C4 patch — accepted risk; execute proceeded without second judgment pass.
- T-3–T-5 ran without independent Reviewer after subagent quota block — T-1/T-2 still had Reviewer PASS.
- `ERC-TEST-7` collapsed-bar layout remains jsdom-blind HITL only.
- RFUX and ERC shared `lab-report-form` / `indicator-drawer` in one commit — coordination friction, not a single root cause.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | Under client test tasks, add: "Static file-walk guards must resolve paths from the same repo-root anchor the spec already defines (e.g. reuse the walk's `APP` constant); never hand-count `..` segments for a second path." |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` |
| Edit | Append: "When adding `@Input()`/`@Output()` to a component, grep parent `*.spec.ts` stub components for the same selector and update stubs in the same task — missing stub inputs fail at runtime, not compile time." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to component contract checklist: "Boolean gates that control create/report chrome default **false** unless the requirement explicitly allows fail-open; cite KZ-REH-2 (no native disabled) separately." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` |
| Edit | Already applied on spec branch in commit `b1ca9ef1f` — emerging path documents aside + hop; legacy modal note updated. |
| Severity | Low |
| Status | applied (2026-09-05, execute commit on spec branch) |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/.../indicator-drawer/CLAUDE.md`, `lab-report-form/CLAUDE.md` |
| Edit | Already applied on spec branch in commit `b1ca9ef1f` — `emerging` / `emergingMode` contracts documented. |
| Severity | Low |
| Status | applied (2026-09-05, execute commit on spec branch) |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/ux-ui/design.md` §8 (optional follow-up) |
| Edit | Promote three-button band cluster (Tour / Emerging / Where to report) from spec design §13 — deferred to design backlog per tasks.md §7. |
| Severity | Low |
| Status | deferred |
