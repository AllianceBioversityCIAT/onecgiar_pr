# Kaizen Entry — changes/results-aow-column-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/results-aow-column-filter` · Prefix `RAC` |
| Date | 2026-09-04 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard |
| Outcome | Complete — 5/5 tasks PASS; live reconciliation SP01 8/8 keys, SP12 7/7 keys; column + Section filter + Overview scope deep link shipped |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 | tasks.md |
| Reviewer FAIL rework attempts | 3 (T-1 ×1 missing `DISTINCT`; T-2 ×1 fixed-key search + cell tokens; T-5 ×1 evidence arithmetic/attribution) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test` run) | — |
| Judgment-day severe findings | 1 (JI-1 population mismatch) — inline fallback, judges could not be spawned (3rd spec in a row) | judgment.md |
| Validation FAIL / WARN | n/a (no `validation-report.md`; T-5 live check = validation) | execution.md T-5 |
| `/akili-quick` escalations into this spec | 0 (one quick change spun *out* afterwards: `quick/results-filter-popover-polish`) | quick-log.md |
| Drift attributable | none (`docs/specs/audits/` holds no report) | — |
| Budget | ≈ 380 src + 550 test estimated → **≈ 940 src + 1 020 test actual (2.1×)**; tripwire fired after T-2, user continued | execution.md — Budget Tripwire |
| Concurrency | 1 foreign sweep commit (`a390717c9`) of this spec's in-progress T-5 record + 3 guides, non-`[SPEC:]` message; 1 unrelated foreign quick commit | execution.md T-5 wrapper |
| Advisory findings recorded (never reworked) | 11 across 5 tasks | execution.md |

## Lessons

- **KZ-changes--results-aow-column-filter-1 — A reconciliation table passes its own author unless each row carries an identity check tying its delta to the ids that explain it.** (Product + Methodology, Medium)
  - Root cause (5W1H): T-5's Disqualifier demanded "every key compared" and "INCONCLUSIVE if any pair differs", but named no per-row invariant. The Implementer read every key correctly, then attributed a W3-source id (`11513`) to the UNTAGGED row (Δ0) and summed a totals row to 4 while listing 5 ids — internally inconsistent evidence that satisfied every clause as written. The Reviewer caught it; a rework round and a DB read were spent recovering what one invariant would have forced up front.
  - Evidence: `execution.md` — T-5 Reviewer round 1, issues 1–2 (Violated Rule: tasks.md T-5 Disqualifier; `RAC-R-5`; `RAC-DD-6`); attempt 2 correction.
  - Standardization: → P1 (local task template) · upstream to AKILI (`/akili-specify` task Disqualifier guidance for count/reconciliation tasks).

## Noted, not a lesson

- **LOC budget under-count — recurrence of `KZ-REH-1`** (REH → AIS → KCR → RGS → **RAC**, fifth spec). New mode: the *source* side overran (940 vs 380), not only tests — a CTE extraction with TS re-aggregation and a five-state client join were each sized as "thin". → P2 `digest-update`.
- **Foreign session committed this spec's in-progress files — recurrence of `KZ-MRF-3`** (and the `KZ-BOR-3` "ships inside someone else's commit" mode): `a390717c9` swept the attempt-1 T-5 record and three guides under a `docs(results-aow-column-filter)` message with no `[SPEC:]` prefix. Explicit-pathspec discipline kept the code commits clean. → P3 `digest-update`.
- **Judgment-day judges could not be spawned (Orca pane timeout), third spec in a row** (`judgment.md` Mode row). Environment fault, not method; the inline fallback found the one SEVERE finding. If it recurs a fourth time, probe the harness once at `/akili-specify` start instead of retrying per spec.
- **Reviewer wrapper panes cannot answer `shutdown_request`** (tools `Read/Grep/Glob`) — second occurrence after `changes/aow-row-gesture-split`; `TaskStop` closes them. Sub-threshold; a wrapper-tools or Leader-persona line would end it.
- **Returning owed scope before review worked** (`KZ-OAH-2` applied): T-3's R-7 "Not Done" was closed by the same Implementer before the Reviewer spawned, and T-3 passed first round.
- **Advisories stayed advisories:** 11 recorded, 0 relayed into rework, 0 minted as tasks; the one that mattered to the owner (design polish) went out as a separate `/akili-quick`.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` — *Disqualifier* / *Input that fails* guidance |
| Edit | Add: "A count or reconciliation task's evidence table MUST carry, per row, the populations it compares and an identity check — the row's delta equals the number of ids attributed to it. A row whose delta and attributed ids disagree is INCONCLUSIVE, never PASS." |
| Severity | Medium |
| Status | pending |
| Upstream | recommend the same line for AKILI `/akili-specify` task template (Methodology) |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `changes/results-aow-column-filter` as a source (5th recurrence); raise severity to **High**; note "source LOC also overruns when a task extracts a SQL CTE into TS aggregation or adds a multi-state client join — size those at 3× the 'thin endpoint / simple join' figure". |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-MRF-3` (two sessions on one worktree) |
| Edit | Add `changes/results-aow-column-filter` as a source; note the `KZ-BOR-3` mode recurred — a foreign session committed this spec's in-progress `execution.md` and guides under a non-`[SPEC:]` message (`a390717c9`). |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` §2 module table, row **Results Framework Reporting** (`api/results-framework-reporting/`) |
| Edit | Append to the description: "Read-only `GET results-scope?programId&versionId` — per-result scope bucket `{ result_id, key, kind, codes }` computed by the same `queryResultScopeRows` CTE the Overview's `getScopeBuckets` aggregates (spec `changes/results-aow-column-filter`, RAC-DD-1/DD-2)." |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `.agents/model-routing.md` → Registry table, T1 Architect and T3 Auditor `Claude Code` column |
| Edit | The `opus` entries are below the session model in use (Claude Fable 5.1, `claude-fable-5-1`); update to the current floating alias once confirmed, keeping author ≠ auditor (Implementer stays `sonnet`). |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Swept (`Coming soon`, `Section filter`, `results-scope`, stack/command lines); no factual assertion falsified this cycle. |
| Severity | Low |
| Status | pending |
