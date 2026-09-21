# Kaizen Entry — bugfix/bilateral-external-partners-not-saving

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-external-partners-not-saving` |
| Date | 2026-09-21 |
| Branch | qa-development-2026-ss (spec branch — Default Branch pin is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 (`BIL-T-1`) | tasks.md |
| Reviewer FAIL rework attempts | 1 (Task `BIL-T-1`) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | N/A — no `test-report.md` (Lite spec, no separate `/akili-test` run) | — |
| Judgment-day severe findings | N/A — not run | — |
| Validation FAIL / WARN | N/A — no `validation-report.md` (Lite spec, Reviewer audit only) | — |

## Lessons

- **KZ-bugfix--bilateral-external-partners-not-saving-1 — DOM-rendering falsifiers need an explicit check for a template-stubbed main spec before the Implementer writes the test.** (Product + Methodology, Medium)
  - Root cause: the task's Verification → Falsifier explicitly required "the error-banner template branch renders", but the Implementer (effort `medium`, attempt 1) added only signal-level assertions to `section-contributors.component.spec.ts`, which stubs the template with `overrideTemplate('<div></div>')` and is structurally incapable of proving a template branch renders. The folder's own `CLAUDE.md` already documents this exact trap by name (referencing a prior incident, P2-3520, "no hay assertions de DOM"), but the Leader's Step 2.2 brief pointed the Implementer at `design.md`/`requirements.md`/the exemplar signal code, not at that folder-local pitfalls section — so a documented trap was walked into anyway.
  - Evidence: `execution.md` — Task `BIL-T-1`, attempt 1 Reviewer FAIL ("Violated Rule: tasks.md § BIL-T-1 → Verification → Falsifier ... and the error-banner template branch renders"); `section-contributors/CLAUDE.md` § pitfalls table (pre-existing P2-3520 trap note, present before this spec).
  - Standardization: → P1 (Product) and → P2 (Methodology, upstream recommendation).

## Noted, not a lesson

- None.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` § 9 "Unit tests (Jest)" |
| Edit | Add one line: "Before asserting a template renders a node, check whether the component's main `*.spec.ts` stubs the template (`overrideTemplate`) — if so, put the DOM assertion in a sibling spec that renders the real template (e.g. a `*.readonly.spec.ts`) instead." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | Upstream — AKILI methodology repository (`/akili-execute` Step 2.2, Implementer brief composition) |
| Edit | Recommend adding to the Implementer brief checklist: "When the task's Falsifier requires proof of visible rendering, name any folder-local `CLAUDE.md`/pitfalls section explicitly in the brief pointer list — not just `design.md`/`requirements.md`/the exemplar file — since project-specific test-harness gotchas (stubbed templates, excluded coverage, etc.) live there and a generic pointer list silently skips them." |
| Severity | Medium |
| Status | pending |
