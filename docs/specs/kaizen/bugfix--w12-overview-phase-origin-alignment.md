# Kaizen Retrospective: `bugfix--w12-overview-phase-origin-alignment`

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/bugfix/w12-overview-phase-origin-alignment/` (archived 2026-08-28) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Effective under pressure: 3/3 tasks + 3 hotfixes, live-verified outcome (11=11=11); 2 rework rounds; 1 owner-waived review; 2 Leader-inline exceptions (owner-directed); 2 worker sessions died on token limits |

## Metrics

| Metric | Target | Actual |
|---|---|---|
| Tasks / rounds | 3 / 1 each | 3 + 3 hotfixes / T-2 a2, T-3 a2, hotfix a2 (waived) |
| LOC (budget ~220) | ~220 | ~420 |
| Runtime failures | 0 | 2 session-limit deaths (scout, Implementer at completion); recovered without work loss |

## Lessons

### KZ-W12-1 (Product) — mocked-`query` repo specs cannot see placeholder/binding bugs
- **Root cause:** a `?` inside a SQL comment was consumed by mysql2 as a positional placeholder (comments are not skipped) → live 500, empty card. Every repo spec mocks `this.query`, so SQL-string bugs that only manifest at bind time are invisible to the whole unit suite; found only by an authenticated live probe.
- **Evidence:** archived `execution.md` "SQL-comment placeholder hotfix"; regression test now asserts `?`-count === params length.
- **Standardize (pending, spec branch):** one line in `onecgiar-pr-server/src/CLAUDE.md` (or AGENTS.md) SQL conventions: "Never put `?` (or `%` tokens) inside comments of parameterised queries — mysql2 binds positionally through comments; repo specs SHOULD assert placeholder-count === params."

### KZ-W12-2 (Methodology) — signal-reactivity gaps around plain-object service state are a recurring class
- **Root cause:** `reportingCurrentPhase` is a plain mutable object with a separate bump signal (`reportingPhaseVersion`); consumers that read the object without tracking the signal work until timing changes. This bit twice in one day (summaries cache; `loadBilateralRows` still has it) and the pattern already had in-code precedents (`result-creator`, `report-result-form`).
- **Evidence:** hotfix attempts 1–2 in the archived `execution.md`; Reviewer's cache-HIT finding.
- **Standardize (pending, spec branch):** one line in `onecgiar-pr-client/src/CLAUDE.md` signals guidance: "Anything deriving from `reportingCurrentPhase` (or any plain-object + version-signal pair) MUST also read the version signal in the same computed/effect."

## Noted, not a lesson
- The Bug Mode red→green discipline held under speed pressure — every predicate class had its own red; the one green-only case (mapper `others`) was labeled as such rather than dressed up.
- Owner-directed YOLO mode worked with guardrails intact: waivers and Leader-inline exceptions were **recorded, not silent**; scoped verification replaced full-suite reruns by explicit owner instruction.
- Parallel T-1 ∥ T-2 on disjoint files: clean, no collisions — the width-2 cap and file-disjointness test were sufficient.
- Diagnostic pattern that cracked the case: per-predicate DB breakdown + authenticated in-memory-JWT probe (secrets never printed). Candidate for a reusable debugging note if it recurs.

## Pending Items

| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | standardization | `onecgiar-pr-server/src/CLAUDE.md` (KZ-W12-1) | high | SQL-comment placeholder rule + placeholder-count assertion guidance. | pending |
| 2 | standardization | `onecgiar-pr-client/src/CLAUDE.md` (KZ-W12-2) | high | Plain-object + version-signal pairing rule. | pending |
| 3 | digest-update | follow-up proposals | medium | Candidates: `loadBilateralRows` phase-reactivity quick; meter/matrix `status_id != 4` + `result_level` join residuals (requirements-level); `?versionId=` empty-string edge (fix both controllers together); "Not started" slot always-0 for W1/W2 (OQ-2). | pending |
| 4 | guide-sync | `dashboard-lab/CLAUDE.md` | medium | Fold into the queued rewrite: versioned `summariesByCode` key (`code::versionId`), `summaryCacheKey` helper, phase-reactive computeds. | pending |
| 5 | trd-adr | none | — | No ADR overturned (predicate/param fixes). | n/a |
