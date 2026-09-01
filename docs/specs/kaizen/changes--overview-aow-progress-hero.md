# Kaizen — `changes/overview-aow-progress-hero`

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| Branch context | spec branch (`qa-development-2026` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-01-changes--overview-aow-progress-hero/` |

## Metrics

| Signal | Value |
|---|---|
| Judgment-day (spec stage) | 1 pass, fix-only: **11 severe clusters**, 5 corroborated by both judges, ALL fixed pre-execution |
| Reviewer FAIL rework | **1 of 6 tasks** took a second attempt (T-5) — T-1..T-4, T-6 passed first time; ceiling never approached |
| Leader adjudications pre-review | 2 (T-1 `stateOf` export; T-3 ToC-aware loading remainder returned before spawning the Reviewer) |
| HALT / FATAL_FAIL / Pivot | 0 |
| Runtime failures | 2 transient worker API/network drops (T-2, T-5 phase) — both resumed in place with context intact |
| Environment blocks | 1 (dev-DB unreachable, ETIMEDOUT) — T-6 parked `[~]` with the checklist, resumed on VPN restore |
| Live-pass field defects | 1 (row grid starved the identity column at real widths) |
| Budget | 6 tasks estimated / 6 actual · ~650 LOC estimated / in range · ≤1 round/task honoured |

## Lessons

- **KZ-OAH-1 — A mockup's canvas width is not the surface's real width.** (Product, High)
  - Root cause: `Main.dc.html` was authored at 1280px and the row grid's fixed tracks (`1fr 260px 120px 170px`) were transcribed literally into the template. In the real page the hero's row area is ~732px (rail + card padding + sidebar), so the identity column collapsed to 99px and the AoW name rendered "Acc…". Every automated gate passed — jsdom measures nothing, and the tracks were exactly what the design said.
  - Evidence: `execution.md` → OAH-T-6 row 7 (measured 1398px viewport → identity 242px after fix); design.md §6 grid row.
  - Standardization → P1: mockup-derived fixed tracks must be re-expressed as `minmax()` before they reach a task, and any px track transcribed from a mockup carries the mockup's canvas width in a comment.
- **KZ-OAH-2 — Returning owed scope beats spending the review round.** (Methodology, Medium)
  - Root cause: T-3's Implementer flagged its coarse `loadingAows()` binding as an inherited limitation; it was actually R-6 scope owed (the ToC-aware aggregate already existed at host:1997). Adjudicating and returning it BEFORE the Reviewer spawn kept the single-round mandate intact and still closed the clause — the same defect reaching the Reviewer would have consumed the only round and delayed the task by a full triad cycle.
  - Evidence: `execution.md` → OAH-T-3 "Remainder adjudicated pre-review".
  - Standardization → P2: a `Not Done / Assumptions` field naming a requirement clause is scope, not a caveat — adjudicate before review.
- **KZ-OAH-3 — Deleting dead code can delete a live invariant's only pin.** (Product, High)
  - Root cause: removing the unreferenced `percentOf` also removed its zero-total test, and the replacement comment asserted coverage that did not exist ("see honest at 1%" — a `total:137` fixture). The guard (`row.total ? … : 0`) stayed live in three functions with nothing failing if dropped. Caught only because the Reviewer chased the 644→643 count delta.
  - Evidence: `execution.md` → OAH-T-5 attempt 1 FAIL + scoped re-review mutation evidence (NaN / NaN / Infinity).
  - Standardization → P3: a dead-code removal that drops a test must name the surviving assertion that carries each invariant — and a test-count delta is always explained, never absorbed.

## Noted, not a lesson

- Blind dual judgment paid for itself again: 11 severe clusters in docs vs 1 field defect + 1 review round in execution. Two of the severes (routes-are-not-signals, the glossary's unpartitioned `target=0 ∧ achieved>0`) would each have cost a Pivot mid-execution. Recurrence of the same pattern as `changes/mass-reporting-flow` → no methodology change, the gate works.
- Concurrency with the parallel session on the same worktree (KZ-MRF-3) produced ZERO clobbers this spec: every commit was preceded by a scoped `git add` of named files plus a `git diff HEAD` glance. The mitigation works; the risk remains structural.
- Provider/network worker drops (2) resumed cleanly via SendMessage with context intact — 3rd spec in a row where the resume pattern held. Already noted in MRF's digest-update item; no new entry.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-OAH-1) | `onecgiar-pr-client/CLAUDE.md` §5 Styling | Add: "A px grid track transcribed from a mockup carries the mockup's canvas width in a comment, and any track feeding a column that holds text is `minmax(0,1fr)` / `minmax(min,max)` — a fixed track sized on a 1280px canvas starves the column at real content widths, and no automated gate can see it." | High | pending |
| 2 | standardization (KZ-OAH-2) | `.agents/leader.md` → Delegation Discipline | Add: "An Implementer's `Not Done / Assumptions` that names a requirement clause is owed scope: adjudicate and return it before spawning the Reviewer — spending the review round on scope the worker already flagged wastes the round and a full triad cycle." | Medium | pending |
| 3 | standardization (KZ-OAH-3) | `docs/specs/general-setup/task.md` | Add to the verification guidance: "A task that deletes code must name, per invariant the deleted tests pinned, the surviving assertion that carries it; any test-count delta is explained in the report, never absorbed." | High | pending |
| 4 | digest-update | `docs/specs/kaizen-log.md` Active Lessons | KZ-MRF-1 (`not-yet-started ≠ loading`) recurred here as T-3's coarse loading binding — raise recurrence count; the rule held once applied | Medium | pending |
| 5 | guide-sync | — | None — `program-overview/CLAUDE.md` and `dashboard-lab/CLAUDE.md` were updated inside OAH-T-5 as spec deliverables | — | n/a |
| 6 | factual-sweep | root guides | No falsified root-guide claims this cycle | — | n/a |
| 7 | trd-adr | — | No TRD ADR overturned (DD-2 supersedes a spec-level requirement clause, not an ADR) | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
