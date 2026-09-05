# Execution Log — `changes/my-work-board`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-board` · Prefix `MWB` |
| Approval Mode | `pre-approved` (Juan Cadavid, 2026-09-04) — continue gates auto-pass after PASS and are logged; HALT / Pivot / budget tripwire / FATAL_FAIL stop |
| Budget (design.md §1) | 6 tasks · ~1,350 LOC · ≤ 1 Reviewer round per task (YOLO: a second FAIL escalates) |
| Leader | Claude Fable 5.1 (T1) · Implementers `akili-implementer` (sonnet, T2) · Reviewers `akili-reviewer` (opus, T3) |
| Branch | `qa-development-2026` (shared worktree; explicit-path commits; other sessions commit concurrently) |
| Started | 2026-09-04 |
| Judgment Day | round 1 applied before execution (`./judgment.md`) |

## 2. Task Execution History

### `MWB-T-1` — Server: `include_completeness` flag on `roles/filter` — **PASS** (attempt 1) · 2026-09-04

- **Implementer:** `akili-implementer` (sonnet) · skills `nestjs-expert`, `tdd` · effort medium · 1 attempt.
- **Files:** `results-validation-module/completeness.ts` (+ `.spec.ts`, new), `results.service.ts` (fold in `findAllByRoleFiltered`, gated by `parseQueryBool(query.include_completeness)`), `results.service.spec.ts` (new, 4 cases), `results.controller.ts` (`@ApiQuery`).
- **Verification (Implementer):** `npx jest …completeness.spec.ts …results.service.spec.ts --silent --reporters=summary --forceExit && npx eslint … --quiet` → `Test Suites: 2 passed · Tests: 13 passed`, lint clean.
- **Reviewer (`akili-reviewer`, opus):** `STATUS: PASS` — "The opt-in `include_completeness` fold matches `MWB-R-8`, `MWB-DD-1`/`DD-2` and design §4.1/§5 exactly — guarded so the default path adds no key and issues zero validation calls, eligibility and cap enforced on real payload columns, per-item failure isolation with an id-only warn — and the two new suites prove the default-path contract independently of the new code."
- **ADVISORY (4R, recorded, not gating):** (a) `foldCompleteness([])` → `{0,0,[]}` would read as `n === m` → *ready*; **forward pointer to `MWB-T-4`**: ready variant requires `total > 0`, `total === 0` renders *Open to check completeness*. (b) chunk size 5 has no max-in-flight test (recorded; not minted as a task). (c) IPSR branch is defence-in-depth: the repository already excludes types 10/11. (d) two new spec files were outside the task's lint glob → Leader ran `prettier --write` + eslint on them inline (mechanical formatting, no logic), re-ran the suite green. (e) key-for-key live comparison happens in `MWB-T-6`.
- **Implementer assumptions:** IPSR id = `ResultTypeEnum.INNOVATION_USE_IPSR` (10), confirmed by the Reviewer against three call sites.
- **Requirements covered:** `MWB-R-8` (all clauses), `MWB-R-4` server half, `MWB-AC-8`, NFR compat/security/observability.
- **Gate:** auto-approved (pre-approved mode).

### `MWB-T-2` — Client foundation: SP-id service, row mapper, section map, view-model — **PASS** (attempt 1) · 2026-09-04

- **Implementer:** `akili-implementer` (sonnet) · skills `angular-developer`, `tdd` · effort medium · 1 attempt.
- **Files:** `result-framework-reporting/services/science-program-id.service.ts` (+ spec, new), `my-work-board/my-work-section-map.ts` (+ spec, new), `my-work-board/my-work.view-model.ts` (+ spec, new), `programme-results/services/programme-results.service.ts` (+ spec: `resultTypeId`, optional `completeness`, mapper exported, DI swap to the root resolver, private resolver removed).
- **Verification (Implementer):** `npx jest …/my-work-board …/programme-results/services …/result-framework-reporting/services --silent --reporters=summary --no-coverage` → `Test Suites: 5 passed · Tests: 122 passed`; `npx ng lint --quiet` → `All files pass linting.`
- **Reviewer (`akili-reviewer`, opus):** `STATUS: PASS` — "The four artefacts implement `MWB-R-2/3/5/6/11`, `MWB-AC-4/5` and design §5/§6.2/§6.6 exactly — the status→column table, fixed five-column order with a conditional `Other` rail, null-first/ratio-ascending/newest-tie Editing order, full §5 section map with both P22 and P25 keys, memoised `shareReplay` SP-id lookup proven at the HTTP boundary, and an additive `ProgrammeResultRow` that preserves an explicit `completeness: null`."
- **ADVISORY (4R, recorded):** (a) `shareReplay(1)` caches errors → **forward pointer to `MWB-T-3`**: `resolve()` must not memoise a failed emission (retry must re-issue). (b) ordering suite never distinguishes ratio vs raw `complete` comparator (recorded; T-3/T-4 may add a mixed-denominator row if they touch the suite). (c) `sectionLabel(unknown)` returns the raw key → **forward pointer to `MWB-T-4`**: filter `missing` through the map before labelling. (d) `''` initiative id → 0 (payload never carries it).
- **Implementer assumptions (accepted):** `badgeCount(columns, 'all')` returns `null` = "no update" → **contract for `MWB-T-3`**: badge signal keeps the last Mine value on `null`, never coalesces to 0; `filterByPhase` exact `phaseName` equality.
- **Requirements covered:** `MWB-R-2` (table + both scenarios, grouping half), `MWB-R-3` pure half, `MWB-R-5`, `MWB-R-6` mapping half, `MWB-R-11`, `MWB-AC-4` (map), `MWB-AC-5`.
- **Gate:** auto-approved (pre-approved mode).
