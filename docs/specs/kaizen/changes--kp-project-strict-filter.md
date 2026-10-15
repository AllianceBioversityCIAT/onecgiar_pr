# Kaizen Entry — changes/kp-project-strict-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-project-strict-filter` |
| Date | 2026-10-14 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated in the spec; the user's standing preference is to run to the end |

**Branch Context:** the current branch is `qa-development-2026-ss` and the default branch is pinned to `master`, so this is a spec branch. Every item below is recorded as pending, and no shared file was edited.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-4 a1, T-5 a1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | — |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | n/a (no validation-report, accepted) | archive-summary.md §4 |
| Budget | ~700 → ~2,000 LOC including tests; tests ≈ 65% of the added lines | execution.md — Budget Tripwire |

## Lessons

- **KZ-changes--kp-project-strict-filter-1 — Single-valued fixtures for a multi-valued repository field let a display cap hide the matching label.** (Product, Medium)
  - **Root cause:** the T-4 linked-card spec used an item with one project label. Real CGSpace items carry several `cg.identifier.project` values, and 182744's matching label is the 4th. `slice(0, 3)` passed every test and failed on the first live look.
  - **Evidence:** execution.md — KPSF-T-4 Attempt 1 FAIL (live labels quoted); spec fixture ~L1638/L2040.
  - **Standardization:** → P1 (local).
- **KZ-changes--kp-project-strict-filter-2 — The browser acceptance checklist was built from the Falsifier list and missed an R-13 clause that only the scenario carried.** (Methodology, Low)
  - **Root cause:** the Leader's browser brief to the user listed the T-5 Falsifier outcomes. "AND choosing it proceeds to KP creation exactly as today" is in R-13 but not in the Falsifier, so it went unexercised until the Reviewer cross-checked "Implements: R-13 all clauses".
  - **Evidence:** execution.md — KPSF-T-5 Review attempt 1 FAIL.
  - **Standardization:** none local. Upstream: recommend that AKILI `/akili-execute` build manual/HITL acceptance checklists from every clause of the scenarios the task Implements, not from the Falsifier alone.

## Noted, not a lesson

- **Environment:**
  - Drive C: hit 0 GB free mid-T-2 (ENOSPC). Jest and eslint caches were redirected to `D:\kpsf-tmp`.
  - `npm run test:local` (`scripts/run-jest-local.js`) exits 1 on this Windows machine (`spawnSync('npx')`). The user's global instructions present it as the valid alternative; it currently is not.
- **Low RAM:** free RAM was 1.3–1.9 GB all run; scoped `--runInBand` / `--maxWorkers=1` worked.
- **Missing red run:** T-4 attempt 1 captured no red run; the Reviewer verified the assertions are non-tautological instead.
- **Local MEL/WorldFish:** they showed as "did not respond" locally because their discovery URLs are absent from the local `.env`. This was not a code defect; the live probe proved HTTP 200.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Verification / Falsifier guidance) |
| Edit | When a task renders or matches a multi-valued external field (repository metadata, tags), its fixtures MUST include one real multi-valued item whose relevant value is not first. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `changes/kp-project-strict-filter` as a recurrence. Client eslint again needed `ESLINT_USE_FLAT_CONFIG=false`, rediscovered by the T-3 Implementer. Raise the severity to High: this is the third spec. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add source `changes/kp-project-strict-filter` as a recurrence. Budget ~700 LOC vs ~2,000 actual; the overrun was almost entirely tests (the per-host / per-scope Falsifier matrix). Raise to Medium. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` W9 "Multi-repository DSpace discovery" |
| Edit | Bilateral browse sends two scoped searches (`projectScope=linked\|related`, with `projectCode` / `projectTitle` / `projectLeadCenter`). The server composes `(<query>) AND [NOT] (<project clause>)` on each adapter's `fields.project` (`cg.identifier.project` on CGSpace; `cg.contributor.project` on MEL/WorldFish) using `project-match.ts`. The `f.project` facet was removed; the response echoes `projectScope: { scope, applied }`. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | user's global `~/.claude/CLAUDE.md` § Pruebas, rule 7 (outside the repo; for the user) |
| Edit | Rule 7 says `npm run test:local` is the valid alternative to the manual flag. Proposed: "`npm run test:local` currently fails on Windows (`spawnSync npx`); use `npx jest --maxWorkers=1\|2 --testPathPattern=...` until fixed." |
| Severity | Low |
| Status | pending |
