# Kaizen Retrospective — Reporting AoW & HLO JIRA-Style Hierarchy

- **Spec Path:** `docs/specs/changes/reporting-aow-jira-hierarchy/`
- **Archive Date:** 2026-09-03
- **Branch:** `qa-development-2026` (spec branch; pin `master`)
- **Outcome:** Clean Execution & Delivery — 3/3 Tasks Completed, 3/3 Reviewer PASS on attempt 1
- **Commit:** `aee9b8ea8`

---

## Metrics

| Metric | Planned | Actual | Ratio / Notes |
|---|---|---|---|
| Tasks | 3 | 3 | 100% — `RAJ-T-1`, `RAJ-T-2`, `RAJ-T-3` |
| Rework Attempts | 0 | 0 | 3/3 tasks passed on first review attempt |
| Review Rounds | 3 | 3 | All PASS on Attempt 1 |
| Unit Tests (Table) | ~100 | 114 | 100% PASS |
| Unit Tests (Band) | ~50 | 57 | 100% PASS |
| Unit Tests (Dashboard) | ~40 | 46 | 100% PASS (789 suite total) |
| Linter Errors | 0 | 0 | `ng lint` clean |
| Dev Build | PASS | PASS | 15.9s, 0 errors |

---

## Lessons

- **KZ-changes--reporting-aow-jira-hierarchy-1 — Template Refactors in Deep Component Trees Require Automated JIT Compilation Verification at Every Mutation.** (Product + Methodology, Low)
  - Root cause: Fine-tuning the AoW card header row layout omitted a closing tag before `</button>`, causing `NG5002: Unexpected closing tag "button"` in JIT template compilation. Running scoped Jest tests immediately catches Angular compiler errors before review hand-off.
  - Evidence: `execution.md` audit logs, `reporting-aow-table.component.html:416`.
  - Standardization: → P1 (local) · upstream to AKILI (`/akili-execute` verification checklist).

- **KZ-changes--reporting-aow-jira-hierarchy-2 — Adversarial Dual Review (Judgment Day) Hardens Responsive Layouts and Protects Public Event Contracts.** (Product + Methodology, Low)
  - Root cause: Judge Alpha and Judge Beta independently identified potential width starvation below 900px, PRMS design token alignment, and the strict necessity to preserve 100% of event signatures (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`). Resolving these in `design.md` prior to code generation enabled first-attempt PASS across all 3 implementation tasks.
  - Evidence: `judgment.md` Findings J1-01, J1-02, J2-01 and Round 2 PASS receipts.
  - Standardization: → Positive practice; reinforce Judgment Day dual review for complex UI components.

---

## Noted, not a lesson

- **In-card filter placement affirmed by user feedback:** While top-level toolbars are often standard for global views, having quick-filters contextualized directly inside the expanded Area of Work accordion card matches user mental models when reporting against specific AoWs.
- **Vertical breathing room requires explicit bottom padding on sibling components:** In multi-component layouts without explicit wrapper padding, cards can become flush against adjacent containers. Adding `pb-[16px]` to `reporting-program-band` resolved the visual collision cleanly.

---

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → §3 Verification guidance |
| Edit | Add: "When editing Angular component templates with nested control-flow blocks (`@if`, `@else`, `@switch`, `@for`), run `npx jest --testPathPattern=\"<component>\"` or `npx ng build --configuration development` to catch template parse errors before marking task complete." |
| Severity | Low |
| Status | pending |
| Upstream | AKILI methodology — `task.md` template, verification |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/AGENTS.md` (or module guide) |
| Edit | Add: "AoW headers adhere to 52px compact height with 3-zone layout (Identity max-w-[420px], centered progress bar `mx-auto`, right-aligned tabular metrics `ml-auto`). Indicator rows feature 3px left status stripes mapped to PRMS color tokens (`--pr-color-green-500`, `border-l-purple-500`, `--pr-color-primary-500`, `--pr-border-strong`)." |
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
| Edit | No ADR overturned. All changes operate at the component presentation and UX hierarchy layer. |
| Severity | Low |
| Status | pending |
