# Execution Log — KPI Count Reconciliation (`bugfix/kpi-count-reconciliation`)

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/kpi-count-reconciliation/` (`requirements.md`, `design.md`, `tasks.md`) |
| Approval Mode | `pre-approved` — continue/pause gates auto-pass on PASS; HALT / Pivot / tripwire always stop |
| Execution limits | ≤ 1 Reviewer round per task (second FAIL escalates) · budget 5 tasks / ~300 LOC (trip > 450) · targeted `npx jest <path>` only |
| Leader | Claude Fable 5.1 (T1; session model exceeds registry `opus` entry — registry flagged, no downgrade) |
| Implementer | `.claude/agents/akili-implementer.md` wrapper — **model override `opus`** for T-1..T-3 (arithmetic-exact fixture work under a 1-round Reviewer cap; wrapper default `sonnet` judged too risky for the red-value contract). Recorded as a routing deviation |
| Reviewer | `.claude/agents/akili-reviewer.md` wrapper (`opus`, read-only) — author ≠ auditor kept on every task |
| Pre-flight | `changes/aow-filter-popover` archived 2026-09-03 → no rebase needed. Working tree clean apart from untracked spec folder |
| Started | 2026-09-03 |

## Task Execution History

### `KCR-T-1` — Shared partition helper + red regression test — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort high, skills `angular-developer` + `tdd` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files | `…/dashboard-lab/reporting-burndown.ts` (+151: `partitionProgramKpis`, `summarisePartition`, types `PartitionIndicator`, `ProgramKpiAowSlice`, `ProgramKpiBucket`, `ProgramKpiPartition`, `ProgramKpiAowBundle`, `ProgramKpiBucketInput`; private `isCrosscutRow`, `dedupeById`) · `reporting-burndown.spec.ts` (+172, 8 `it`, pure append) · `dashboard-lab.kcr-reconciliation.spec.ts` (new, 446, 16 `it`) |
| Verification | `npx jest …/reporting-burndown.spec.ts …/dashboard-lab.kcr-reconciliation.spec.ts --silent` → helper suite PASS (26/26 in file); reconciliation suite FAIL **13/16** as required. `npx ng lint --quiet` clean. Other 23 dashboard-lab suites 809/809 green with the new spec excluded |
| Requirements covered | KCR-R-1, R-1.1, R-3, R-9, KCR-AC-1 (assertions), KCR-AC-6 (red confirmed) |

**Red values recorded (Expected = after fix · Received = today's code):** band Total KPIs 9 · **15**; popover planned 11 · 15; hero rich B `1/4` · **`1/3`**; thin rows A `0/3` · `0/4`; rail `1 of 7` · **`1 of 6`**; chip Intermediate `0/1` · **`0/2`**; table card B `1 of 4` · **`1 of 5`**; table card A `4 KPIs · 0 of 3` · `6 KPIs · 0 of 4`; By-AOW banner B `1 of 4` · **`1 of 5`**; hub Σ 9 · 10; ToC map `kind:'program'` branch absent · present (2 leaves); Σ table headers 9 · 11; band under Category filter invariant · drops 15 → 1 (KCR-R-4 violation). All six documented AC-6 values reproduced exactly. Three `it`s green by design (bucket cards already `0 of 1`; cross-cut rows still stamped — KCR-R-7 guard; reported predicate `achieved > 0` — the `progress_percentage` clause is dead code, so no fixture can make it bite).

**Decisions:** `crosscut` on an AoW slice is a **count**, not an array (design §6.1 "only increments `crosscut`"; Reviewer confirmed). Host ToC-map computed is `overviewTocMap` (brief said `tocMapModel`). Table figures read via the real `ReportingAowTableComponent.ratioOf()`/`countLabel()` because `ratioBase()` is private — the seam T-2 moves.

**Reviewer PASS summary:** ownership predicate, bucket dedupe, `aowByCode` map and zero-target/`achieved > 0` totals match design §6.1 exactly; fixtures hand-counted and anti-tautological (KCR-R-1.1 `is_aow: true` flip, `{ planned: 11, zeroTarget: 2, counted: 9, reported: 1 }`); every red re-derived from today's source at the consumer the spec names; no assertion removed; traceability present; no scope creep.

**ADVISORY (4R, Reviewer — recorded, no rework, no new task):**
- *Readability:* fixture docblock says `progress_percentage` is "a nonsense string on every row" but unreported rows carry `'0%'` (which KCR-R-9 requires). Comment inaccurate, fixture correct.
- *Reliability:* B's grouped-table count label (`4 KPIs`, today `6 KPIs`) is the one scenario clause left unasserted; A's is asserted per AC-5.
- *Resilience:* `aowByCode` last-wins on a duplicate AoW code (codes unique per program today).
- *Risk (low):* table figures read off a fresh component instance — sound while `ratioBase` is state-free; T-3's DOM test is the durable seam.
- *Docs:* folder guide still says `buildRatio` is the only home of the zero-target rule → same item as forward pointer (a), owned by KCR-T-5.

**Forward pointers:** (a) folder guide `…/dashboard-lab/CLAUDE.md` needs a `reporting-burndown.ts` line for the partition + `Verified:` re-stamp → **carried to KCR-T-5** (docs task). (b) The working tree also carries uncommitted edits to `results/…/result-header/*` from **another session** in this worktree (`/akili-quick` result-sidebar-code-type) — excluded from the KCR diff; that session committed them itself (`305331185`) before KCR-T-2 started, tree clean.

**Gate:** auto-approved (pre-approved mode) → continue to KCR-T-2.

