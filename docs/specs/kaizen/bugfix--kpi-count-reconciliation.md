# Kaizen Entry — bugfix/kpi-count-reconciliation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/kpi-count-reconciliation` · Prefix `KCR` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard, Bug Mode |
| Outcome | Complete — 5/5 `[x]`, regression spec red 13/16 → green 16/16, live SP01 identities hold |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 | tasks.md |
| Reviewer FAIL rework attempts | **0** (PASS ×4 on first attempt; T-5 manual, Leader-adjudicated) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — no `test-report.md` (accepted; TEST-1..5 ran inside tasks) | archive-summary §4 |
| Judgment-day severe findings | **6** (confirmed by both judges, applied pre-execution) + 8 warnings applied | judgment.md, tasks.md §9 |
| Validation FAIL / WARN | n/a — no `validation-report.md` (accepted; `KCR-AC-7` live PASS) | execution.md T-5 |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | source ≈300 LOC on estimate; **tests ≈900 LOC vs ≈190** (fixtures extended until bases diverged, per the T-4 disqualifier) → LOC trip (450) exceeded on test code only; Reviewer rounds 0/0/0/0 vs ≤1 | execution.md Summary, design.md §14 |
| Runtime failures | 1 Implementer spawn died on an account session limit before starting (T-5); retried on `sonnet`, completed | execution.md T-5 |
| Report truncation | 2 Reviewer reports cut by the teammate-result cap (T-1 before ADVISORY, T-2 before `STATUS`) → 2 resend round-trips; T-3/T-4 briefs asked for `STATUS` first + word cap → no truncation | execution.md T-1/T-2 |
| Concurrency | a second AKILI session in the same checkout: 1 non-compiling foreign commit of in-progress KCR files (`a1d82cf7e`, TS2451), 1 sweep of T-5 doc edits (`0c448f301`), browser tab and `sessionStorage` state left dirty | execution.md T-2, T-5 |

## Lessons

- **KZ-bugfix--kpi-count-reconciliation-1 — A Reviewer report must lead with `STATUS:` and stay under the result cap, or the verdict is the part that gets cut.** (Product + Methodology, Low)
  - Root cause: the harness truncates a teammate's final result at a fixed size; the Reviewer persona orders its report *audit detail → adjudications → STATUS → ADVISORY*, so the longest reports lost exactly the line the Leader needs, costing a resend round-trip each time (T-1 lost the ADVISORY, T-2 lost `STATUS`). Briefs that asked for `STATUS` first and ≤600–700 words (T-3, T-4) were never cut.
  - Evidence: execution.md — `KCR-T-1` (Reviewer tail resent), `KCR-T-2` (verdict resent); T-3/T-4 entries complete on first delivery.
  - Standardization: → P1 (local `.agents/reviewer.md`) · upstream to AKILI (`/akili-execute` §2.3 Reviewer contract).

## Noted, not a lesson

- **Test-LOC budgets ignore disqualifier-driven fixture growth** — recurrence of `KZ-REH-1` (see P2): the "extend the fixture until old and new bases diverge" rule is correct and produced discriminating tests, but it triples test LOC relative to the literal-move estimate. Size test LOC from the disqualifier rules, not from the count of literals.
- **Provider/session-limit worker deaths** — recurrence (REH ×1, MRF ×3, CVT/OPF ×1, KCR ×1): the T-5 spawn died at its first tool call; retrying on the wrapper's default model worked. Feeds the MRF P4 digest row (see P3).
- **Concurrent session in the same checkout** — recurrence of `KZ-MRF-3` with a new mode: the foreign session did not clobber files, it *committed* another session's half-edited files (non-compiling HEAD) under this spec's own commit prefix (see P4). Defence that worked: explicit-pathspec diffs and commits, `git log` + `tsc --noEmit` before every commit. Now also in the Leader's project memory.
- **zsh does not word-split an unquoted `$FILES` string** → `git diff -- $FILES` returned an empty diff once; quote each path or use an array. Tooling friction, Leader-side.
- **Brief named the wrong route**: `entity-details/SP01` is the Reporting tab; Overview is `…/SP01/overview`. The worker caught it via `routing-data.ts`; no cost. Verify routes against `routing-data.ts` when a brief cites URLs.
- **Shared browser state**: `pr.burndown.onlyPending` was persisted `'1'` from prior use and the tab had been navigated by the other session — the worker cleared/restored both. A live read-back step should always state and reset persisted filters first.
- **Four homes for the `excludes N zero-target KPI(s)` sentence** (band, chip, hub, table) — Reviewer advisory; single-home candidate in `reporting-burndown.ts` if a fifth surface appears.
- **Pre-existing plural bug** on the hero rail/row-bar titles (`excludes 1 zero-target KPIs`) — contradicts KCR-R-2.1 on a surface the spec listed as "(already)"; `/akili-quick` candidate, not this spec's defect.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch. Step 3 of `/akili-archive` found **no** `guide-sync` (the folder guide `dashboard-lab/CLAUDE.md` was updated inside T-5 as a spec deliverable — exempt), **no** falsified root-guide claim (`factual-sweep` empty), and **no** affected TRD ADR (`trd-adr` empty).

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/reviewer.md` → report format (append) |
| Edit | Add: "Report order is `STATUS:` line **first**, then the 1–2 sentence summary, then FAIL issues, then `ADVISORY` — and the whole report stays under ~600 words. The harness caps a teammate's returned result; a verdict below the cap is a verdict the Leader never receives." |
| Severity | Low |
| Status | pending |
| Upstream | AKILI methodology — `/akili-execute` §2.3 Reviewer contract |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `bugfix/kpi-count-reconciliation` as a source (recurrence: REH → AIS → KCR); note "a fixture-divergence disqualifier multiplies test LOC ×3–5 over the literal-move estimate — budget test LOC from the disqualifier rules". Keep Medium. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | MRF P4 / provider-limit resume-pattern row (no `KZ-id` yet — digest absent until apply on `master`) |
| Edit | Add `bugfix/kpi-count-reconciliation` as a source (spawn died before its first tool call; retry on the wrapper default model succeeded). Note: "retry once on a different model before asking for the Leader-inline fallback". |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-MRF-3` (two sessions on one worktree) |
| Edit | Add `bugfix/kpi-count-reconciliation` as a source; extend the row: "…or commits the other session's in-progress files under its own message (non-compiling HEAD). Diff and stage by explicit pathspec; run `git log -3` and `tsc --noEmit` before each commit." Severity stays High. |
| Severity | High |
| Status | pending |
