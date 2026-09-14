# Tasks — Portfolio Overview: partial-results banner and open-cycle detection

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/portfolio-overview-partial-counts` |
| Depth | Lite |
| Based on | `requirements.md` (REQ-1, REQ-2, REQ-3), `design.md` (D-1, D-2) |

## Coverage Map (scenario-level, closes before execution)

| Requirement · Scenario | Clause | Owning task |
|---|---|---|
| REQ-1-S1 (volume exceeds limit) | "every open-phase row present," "must NOT rely on unordered LIMIT" | TASK-1 |
| REQ-1-S2 (volume within limit, no regression) | "behavior unchanged … existing callers unaffected" | TASK-1 |
| REQ-2-S1 (correct open cycle shown) | "shows open cycle," "must NOT fall back … when an open phase actually exists" | TASK-2 |
| REQ-3-S1 (banner real counts) | "equals fetched count," "must NOT bind to rows().length" | TASK-2 |
| Manual prod-scale confirmation (defect class 3, requirements.md §8) | — | TASK-3 |

---

## TASK-1 — Server: deterministic ordering so open-phase rows survive `LIMIT` [x]

| Field | Value |
|---|---|
| Status | Complete (PASS, attempt 1) — see execution.md |
| Size | S |
| Dependencies | None |
| Requirements | REQ-1 (both scenarios) |
| Design refs | design.md §7 (Backend Module Design), D-1 |
| Skills | `nestjs-expert`, `systematic-debugging` (Bug Mode) |

**Scope**
- `onecgiar-pr-server/src/api/results/result.repository.ts`, method `AllResultsByRoleUserAndInitiativeFiltered` (~lines 695-871): add an `ORDER BY` clause immediately before the existing `LIMIT ? OFFSET ?` (~lines 836-851) that sorts open-phase rows (`phase_status = 1` / the version's open flag — confirm exact column/alias in the query before editing, per design.md §7) ahead of closed-phase rows, with a stable secondary key (e.g. row PK) for determinism.
- Do NOT change the WHERE clause, joins, or the separate `meta.total` `COUNT(1)` query (~lines 856-860).

**Tests**
1. **Regression test (mandatory, Bug Mode):** a repository/service-level test that seeds more historical rows than the `LIMIT` passed in the test (simulating prod-scale volume), including at least one open-phase (`phase_status = 1`) row placed such that an *unordered* `LIMIT` would exclude it (e.g. seeded with a low sort key so it would naturally fall outside a naive page). Assert the fixed query's returned page includes that open-phase row.
   - **Must fail on current code, pass after the fix** — run it against the unmodified repository method first to confirm it goes red, then apply the fix and confirm green.
   - **Disqualifier:** if the seeded row would already be included by an unordered `LIMIT` in this particular test's data layout (e.g. it happens to be inserted first), the test proves nothing — seed enough rows, and specifically place the open-phase row late enough (highest PK / most recent) that only a correct `ORDER BY` guarantees its inclusion.
2. Existing-behavior test: with total rows below the `LIMIT`, assert the returned set is identical (same rows, any order) to pre-fix behavior — proves REQ-1-S2 (no regression for other callers).

**Done criteria**
- Both tests green.
- `npx jest --silent --reporters=summary --forceExit` clean for the `results` module.
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` clean.

---

## TASK-2 — Client: banner shows real fetched/total counts; verify open-cycle detection follows [~]

| Field | Value |
|---|---|
| Status | Blocked — code PASS (Reviewer), manual browser check outstanding — see execution.md |
| Size | S |
| Dependencies | TASK-1 (logically — the client fix is independently testable via mocked API responses, but end-to-end correctness needs TASK-1's server fix) |
| Requirements | REQ-2, REQ-3 |
| Design refs | design.md §8 (Frontend / UX Component Architecture), D-2 |
| Skills | `angular-developer` |

**Scope**
- `onecgiar-pr-client/.../portfolio-overview/services/portfolio-overview.service.ts`: add a `fetchedCount` (or equivalently named) signal/value populated from the raw API response's item count at fetch time (before `apply()`'s phase filtering), alongside the existing `total()` (open-phase-filtered, unchanged, still feeds the "Total Portfolio Results" KPI tile). Leave `isPartial` comparison logic (`meta.total > items.length`) as-is.
- `onecgiar-pr-client/.../portfolio-overview/portfolio-overview.component.html` (line ~24): rebind the "Showing the first N results" banner text from `data.total()` to the new fetched-count value.

**Tests**
1. **Banner count test (REQ-3-S1):** unit test asserting the banner's bound value equals the mocked API response's fetched-item count, NOT `rows().length` after phase filtering — construct a mock response where these two numbers differ (e.g. fetched page has rows from both open and closed phases) and assert the banner uses the fetched count.
   - **Disqualifier:** a mock where fetched count and open-phase-filtered count happen to be equal does not distinguish the fix from the bug — the mock must make them differ.
2. **Open-cycle regression test (REQ-2-S1):** unit test on `apply()`/`setPhase()`/`closedPhase()` logic: given a mocked fetched page that DOES include open-phase (`phase_status = 1`) rows (simulating TASK-1's fix), assert the component shows the open cycle and does NOT set `closedPhase()`. Pair with a second case: given a mocked page with NO open-phase rows at all (genuinely nothing open), assert `closedPhase()` still correctly fires — this proves the fix doesn't remove the legitimate closed-phase fallback, only prevents it from firing when an open phase truly exists in the fetched data.

**Done criteria**
- Both tests green; `npx jest --silent --reporters=summary --no-coverage` clean for the touched spec files.
- `npx ng lint --quiet` clean.
- Manual browser check on `localhost:4200/portfolio-overview` (test backend): no visual regression, banner absent when not partial (current test-env behavior, per this spec's own diagnosis, already shows no banner — confirm it still doesn't).

---

## TASK-3 — Manual verification: re-run prod-vs-test comparison against the fix

| Field | Value |
|---|---|
| Status | Pending |
| Size | XS |
| Dependencies | TASK-1, TASK-2 (deployed to an environment reachable for this check — staging or prod, per release process) |
| Requirements | Defect class 3 (requirements.md §8 — no automated check reaches real prod data) |
| Design refs | proposal.md §3.3 (original Chrome evidence this task re-validates) |
| Skills | none (manual, browser-based) |

**Scope**
- After the fix is deployed to an environment with prod-scale historical row volume (staging with a prod-like dataset, or prod itself per the team's release process — this is NOT something to run against test/local, since test/local's smaller dataset does not exercise the defect at all, per this spec's own diagnosis):
  1. Open Results Center, confirm which phase is open (same check as the original diagnosis).
  2. Open Portfolio Overview, confirm the eyebrow shows that same open phase, no "Viewing a closed phase" banner, and the results total is consistent with (not ~16x smaller than) Results Center's count for that phase.

**Verification**
- **Pass:** Portfolio Overview's shown cycle and Results Center's open-phase filter agree, and no spurious "partial"/"closed phase" banner appears when the true open phase's data is fully within the page limit.
- **Disqualifier / inconclusive:** if the environment checked has fewer historical rows than the `LIMIT` (i.e., it can't reproduce the original bug even on unfixed code), this check proves nothing about the fix — it must be run somewhere the defect was actually observed to reproduce (prod, or a staging copy with comparable volume). Report "inconclusive — insufficient data volume to exercise the defect" rather than a pass in that case.

**Done criteria**
- Findings recorded in this task's status (pass / fail / inconclusive-with-reason) before the spec is archived.

---

## Task Dependency Graph

```
TASK-1 (server ordering) ──┐
                            ├──> TASK-3 (manual prod-vs-test re-verification)
TASK-2 (client banner) ────┘
```

No circular dependencies. TASK-1 and TASK-2 are independently implementable and testable in parallel (different packages); TASK-3 requires both deployed.

## Estimated Output

| Metric | Estimate |
|---|---|
| Tasks | 3 |
| Estimated LOC | ~40–70 (mostly test code; production diffs are a handful of lines each in `result.repository.ts`, `portfolio-overview.service.ts`, `portfolio-overview.component.html`) |
| PR Strategy | **Single PR.** Both code changes are small, tightly coupled (the client fix's correctness depends on the server fix), and under the ~400 LOC split threshold — splitting would add review overhead without reducing risk. |

## Recommended First Task

**TASK-1** — the server ordering fix is the root-cause fix; TASK-2's client-side regression test for REQ-2 is written against the *intended* fixed behavior and is easiest to reason about once TASK-1's contract (open-phase rows always present in the page) is settled.
