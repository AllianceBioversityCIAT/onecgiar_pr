# Kaizen — `changes/reporting-entry-hub`

| Field | Value |
|---|---|
| Date | 2026-08-29 |
| Branch context | spec branch (`qa-development-2026` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-08-29-changes--reporting-entry-hub/` |

## Metrics

| Signal | Value |
|---|---|
| Judgment-day (spec stage) | 1 pass, fix-only: 3 both-judge severe + 4 verified single-judge severe, all fixed pre-execution |
| Reviewer FAIL rework | 3 of 5 tasks took 2 attempts (T-1 fixture gates; T-3 spec inconsistency + copy map; T-5 native `disabled`) — none hit the 3-attempt ceiling |
| HALT / FATAL_FAIL / Pivot | 0 |
| Budget tripwire | fired: ~650 est. non-test LOC vs 1 311 actual (template density + JSDoc, no scope growth); owner mandate carried execution through |
| Runtime failures | 1 Implementer lost to a provider session limit mid-T-5; resumer verified the complete partial work |
| Spec amendments during execution | 2 (REH-AC-4 wording, twice — Leader-adjudicated, swept) |
| Post-execution addenda | 10 user-driven polish rounds, each tested + committed |
| Open at archive | T-7 manual pass (agent-unreachable: Cognito rejects embedded-browser origin; credentials prohibited); T-6 deferred (budget) |

## Lessons

- **KZ-REH-1 — LOC budgets under-count state-rich Tailwind templates.** (Methodology/Product, Medium)
  - Root cause: design §14 estimated ~650 non-test LOC treating the hub as "a component"; a template with 8 UI states in Tailwind utilities plus documented server DTOs is ~2× that. The tripwire then fired mid-run on size, not scope — noise that a better estimate avoids.
  - Evidence: `execution.md` → "Budget tripwire — measured after REH-T-4".
  - Standardization → P1.
- **KZ-REH-2 — Native `disabled` keeps re-entering the codebase despite the spec naming the correct pattern.** (Product, High)
  - Root cause: the aria-disabled + `title` + handler-guard pattern was specified and implemented in the hub (T-3), yet the *same run's* T-5 re-introduced `[disabled]` on `program-overview` — the rule lived in one spec, not in the constitution, so each new surface re-decides it.
  - Evidence: `execution.md` → REH-T-5 attempt 1 Reviewer FAIL; `design.md` §6.3.
  - Standardization → P2.

## Noted, not a lesson

- Bigint-as-string / decimal-as-string fixtures bit again (T-1 attempt 1) — recurrence of `KZ-OPF-1`, not a new root cause → digest-update pending item below.
- The judgment-day one-pass + fix-only variant caught 7 severe spec defects for two judge spawns — worked as intended under the owner's practicality mandate; no methodology change proposed.
- Idle-without-report recovery (poke once) was needed twice for judges — already codified in `.agents/leader.md`.

## Pending Items

| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-REH-1) | `docs/specs/general-setup/design.md` §14 budget note | medium | Add: "Estimate template LOC separately — a Tailwind template budgets ~40–60 LOC per distinct UI state (loading/empty/error/etc.); counting a stateful component as one unit is the systematic under-estimate." | pending |
| 2 | standardization (KZ-REH-2) | `onecgiar-pr-client/src/CLAUDE.md` | high | Add: "Disabled actions: never the native `disabled` attribute on interactive controls — use `aria-disabled` + native `title` + a handler guard so the control stays keyboard-reachable (pattern: `reporting-entry-hub`)." | pending |
| 3 | digest-update | `docs/specs/kaizen-log.md` Active Lessons (KZ-OPF-1 row) | medium | Recurrence: decimal `allocation` string sort + numeric project-id fixtures in `changes/reporting-entry-hub` T-1; raise KZ-OPF-1 severity and extend wording to "bigint AND decimal columns arrive as strings; fixtures must mirror wire types". | pending |
| 4 | guide-sync | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` (queued rewrite) | medium | Add: `components/reporting-entry-hub/` (Where-to-report hub — W1/W2 + W3 lanes, `hub-copy.ts` string map); By-AOW view: tier sections via `plannedByAowSections`, context banner `plannedAowBanner`, `compactFilters` band mode with single-select AoW switcher; `onOpenAow` routes by `aows()` membership. | pending |
| 5 | guide-sync | `onecgiar-pr-server/src/CLAUDE.md` + `AGENTS.md` (endpoints/integrations list) | low | Add: "`api/results-framework-reporting/reporting-entry-hub/projects?programId=` — JWT; caller's centers from `role_by_user` (role 9) fanned out over `BilateralProjectsService.getProjectsByCenter`; cap 300, per-center `error` degradation." | pending |
| 6 | trd-adr | `docs/trd/trd.md` §2 module table (`result-framework-reporting` row) | low | Note the reporting-entry-hub read endpoint (additive; no ADR superseded). | pending |
| 7 | factual-sweep | root guides | — | Sweep ran: no falsified claims found (root `CLAUDE.md`/`AGENTS.md` statements about stack, modules and commands still hold). | done (no-op) |
| 8 | codegraph | — | — | Re-index (`codegraph sync`) after merge — new server service/DTO + client component. | pending |

Methodology upstream candidate (no local edit): KZ-REH-1's template-LOC budgeting rule belongs in the AKILI `/akili-specify` Step 2.4 guidance.
