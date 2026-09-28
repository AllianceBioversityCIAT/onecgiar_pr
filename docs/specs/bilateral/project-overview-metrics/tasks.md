# Module Spec — `bilateral/project-overview-metrics` — Tasks

## 1. Scope of this task list

- **Module / feature:** `bilateral/project-overview-metrics`
- **Linked spec:** `docs/specs/bilateral/project-overview-metrics/requirements.md` + `design.md`
- **Sprint / target phase:** none assigned yet
- **Owner / driver:** Santiago Sanchez
- **Status:** code-complete — all 4 tasks executed (T-1/T-2/T-3 PASS, T-4 regression PASS); uncommitted, PR not opened pending user go-ahead; OQ-3 DB spot-check and real-browser verification still outstanding

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md`/`design.md` resolved for **this spec's scope** — `BIL-POM-OQ-1` (metric #3) is resolved as "deferred, out of scope"; `BIL-POM-OQ-3` (new-for-review rule) does not block coding, only the AC-2/AC-3 "done" mark (`BIL-POM-T-1` verifies it against real data).
- [ ] `BIL-POM-OQ-2` (Jira ticket) — owner to confirm before opening the PR; does not block starting tasks.
- [x] No CLARISA dependency introduced.
- [x] No conflicting in-flight spec found touching `result.repository.ts:getResultsByBilateralCenter` or `bilateral-projects-panel`.
- [x] No migration in this spec — `migration:check` unaffected.

---

## 3. Task list

### [x] `BIL-POM-T-1` — Add `is_replicated` to the bilateral center-results query

- **Type:** `server`
- **Description:** Add `r.is_replicated` to the `SELECT` list in `ResultRepository.getResultsByBilateralCenter` (no new join, no new WHERE clause, no new bind parameter — confirmed by `BIL-POM-P-2`). While here, run the `BIL-POM-OQ-3` verification: query a real center/phase on TEST and confirm `is_replicated=false AND status_id=5` rows match what a human would call "new for review" (spot-check against the ticket's own example center if reachable).
- **Implements:** `BIL-POM-R-1`, `BIL-POM-AC-1`, `BIL-POM-AC-2`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`
- **Depends on:** —
- **Blocks:** `BIL-POM-T-2`, `BIL-POM-T-3`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** call `getResultsByBilateralCenter` (or the controller endpoint) against a center/phase with at least one row where `is_replicated=1` and one where it's `0`/`NULL` in the DB; the response must carry `is_replicated` matching the DB value for each row, not a constant.
  - **Red run:** `npx jest --silent --reporters=summary --forceExit --testPathPattern="result.repository"` (add/extend a case asserting the mapped field; must fail before the SELECT change, pass after).
  - **Disqualifier:** if `is_replicated` is stored as `NULL` for a meaningful subset of active bilateral results (not just `0`/`1`), re-specify `BIL-POM-R-2`/`R-3` to define NULL handling before continuing to `BIL-POM-T-3`.
  - **Consumers:** `ResultsService.getBilateralCenterResults` (passthrough, no change needed), `BilateralApiService.GET_bilateralCenterResults` (client — response shape grows, see `BIL-POM-T-2`).
- **Definition of done:**
  - [ ] Code merged via the project commit convention. (uncommitted — per standing user instruction, no auto-commit; awaiting explicit go-ahead)
  - [x] Lint clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`).
  - [x] Repository test added/updated and green.
  - [x] No migration touched (confirmed — column already exists).
  - [x] `BIL-POM-OQ-3` spot-check result recorded in the PR description (follow-up note: no DB access in this session; needs a human spot-check before `BIL-POM-T-4`'s PR — see `execution.md`).

### [x] `BIL-POM-T-2` — Extend `BilateralCenterResult` with `is_replicated`

- **Type:** `client`
- **Description:** Add `is_replicated: boolean` to `BilateralCenterResult` (`bilateral-center-result.interface.ts`). Confirm the other declared consumer (`bilateral-results-list.component.ts`, per the interface's own docstring) still compiles under strict mode with the new required field.
- **Implements:** `BIL-POM-R-1`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-center-result.interface.ts`
- **Depends on:** `BIL-POM-T-1`
- **Blocks:** `BIL-POM-T-3`
- **Estimate:** S
- **Review:** `skip-eligible`
- **Verification:**
  - **Falsifier:** `npm run build` (Angular build, not just `tsc --noEmit` — per client `CLAUDE.md` §21.7, `tsc` alone does not catch template-level breakage) completes without new type errors in any file importing `BilateralCenterResult`.
  - **Red run:** n/a (no test gate — pure type addition; covered by the build check above).
  - **Disqualifier:** if any consumer destructures/mocks `BilateralCenterResult` with a fixture missing `is_replicated` and treats it as a compile error rather than a test-data gap, fix the fixture — do not make the field optional to dodge it (the server now always returns it, per `BIL-POM-T-1`).
  - **Consumers:** `bilateral-results-list.component.ts`, `bilateral-result-filter.ts`, `bilateral-overview.aggregate.ts`, `bilateral-projects-panel.component.ts` (per the interface's own docstring, §"Single home for `BilateralCenterResult`").
- **Definition of done:**
  - [ ] Code merged via the project commit convention. (uncommitted — per standing user instruction, no auto-commit; awaiting explicit go-ahead)
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] `npm run build` green with no new errors in listed consumers.

### [x] `BIL-POM-T-3` — Compute and render replicated / new-for-review counts per project

- **Type:** `client`
- **Description:** Add `replicatedCountByProject` and `newForReviewCountByProject` computed signals to `BilateralProjectsPanelComponent`, mirroring `resultsCountByProject`'s shape (`BIL-POM-P-4`). Add `getProjectReplicatedCount(project)` / `getProjectNewForReviewCount(project)` getters. Render two new badges in `bpp_card` (grid) and the corresponding `<td>` in the list-view table, each with an `aria-label` and a click handler reusing `navigateToProjectResults`'s query-param pattern (`BIL-POM-R-5`).
- **Implements:** `BIL-POM-R-2`, `BIL-POM-R-3`, `BIL-POM-R-4`, `BIL-POM-R-5`, `BIL-POM-R-6`, `BIL-POM-R-10`, `BIL-POM-AC-1`, `BIL-POM-AC-2`, `BIL-POM-AC-3`, `BIL-POM-AC-4`, `BIL-POM-AC-5`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.ts`, `.html`
- **Depends on:** `BIL-POM-T-2`
- **Blocks:** `BIL-POM-T-4`
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** given a fixture with project A having 3 rows (`is_replicated=true`) and 2 rows (`is_replicated=false, status_id=5`), and project B having 0 of either, the rendered card for A shows "3" and "2" respectively, and B shows "0" and "0" — not a shared/global count.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-projects-panel"` — add cases for both computed signals (including the `BIL-POM-AC-3` mutual-exclusivity case: one row with `is_replicated=true, status_id=5` counts only toward replicated) and for badge click navigation; must fail before this task's change, pass after.
  - **Disqualifier:** if the mutual-exclusivity fixture from `BIL-POM-AC-3` produces a result counted in *both* buckets, the computed-signal logic is wrong — fix before merging, do not ship with double-counting.
  - **Consumers:** none (both signals are new, private to this component; the two getter methods are template-only, no external caller).
- **Definition of done:**
  - [ ] Code merged via the project commit convention. (uncommitted — per standing user instruction, no auto-commit; awaiting explicit go-ahead)
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] Unit tests added/updated; `bilateral-projects-panel.component.spec.ts` green (45/45); client coverage thresholds (50/60/60/60) not regressed (touched suite has no coverage decrease — scoped run only, full-suite coverage not re-measured per "no full test suites" convention).
  - [x] Badges carry `aria-label` per `docs/ux-ui/design.md` §10.
  - [x] No new hex literals, no new `.pr-*` SCSS block — Tailwind utilities only (client `CLAUDE.md` §5 hard rule); reused existing `.bpp_results_badge`/`--has-results` classes verbatim.
  - [ ] **Verified in a real browser** — NOT done, no browser available in this session. Needs a human to run `npm start` on the Bilateral Home with mixed replicated/new/neither results, at desktop and mobile width, before `BIL-POM-T-4`'s PR (see `execution.md`).

### [~] `BIL-POM-T-4` — Regression pass + PR (regression PASS; PR blocked on user go-ahead — see execution.md)

- **Type:** `tests`
- **Description:** Run the full scoped test set for the three touched areas, confirm no unrelated spec broke, and open the PR.
- **Implements:** all of the above (closure task)
- **Files (expected):** none new
- **Depends on:** `BIL-POM-T-1`, `BIL-POM-T-2`, `BIL-POM-T-3`
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** `npm run test:changed` (client) and the server's scoped Jest run both report the three new/updated spec files passing, with no other spec flipping red that was green on the base branch.
  - **Red run:** n/a (no new behavior here — this task verifies, it does not introduce).
  - **Disqualifier:** if `npm run test:changed` reports specs outside `bilateral-projects-panel`/`bilateral-center-result` failing, investigate before opening the PR — do not exclude them from the run to get green (per the "no full test suites, but no cherry-picking either" convention — scope the run correctly, don't narrow it past correctness).
  - **Consumers:** n/a.
- **Definition of done:**
  - [x] Regression pass green: server scoped Jest (70/70) + client `--changedSince` dependency-graph run (29 suites / 905 tests, 0 failures) — see `execution.md`.
  - [ ] PR opened with commit message convention `<emoji> <type>(<scope>) [ticket]: <description>`, scope `bilateral-projects-panel` / `result.repository`. **Blocked** — no commit made yet, per standing user instruction (no auto-commit without explicit go-ahead).
  - [ ] CI green (lint, tests, build; `migration:check:ci` trivially passes — no migration in this spec). N/A until pushed.
  - [ ] PR description states plainly that metric #3 (W1/W2 contributor) is intentionally not included, linking `BIL-POM-OQ-1` / `design.md` §13. Content drafted in `execution.md`, not yet published.

---

## 4. Dependency graph

```
BIL-POM-T-1 (server: add is_replicated to SELECT)
   └── BIL-POM-T-2 (client: interface field)
         └── BIL-POM-T-3 (client: computed signals + template)
               └── BIL-POM-T-4 (regression pass + PR)
```

No parallel branches — the chain is short enough (4 tasks) that sequencing is simpler than coordinating parallel work.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BIL-POM-TEST-1` | unit (server) | `BIL-POM-R-1`, `BIL-POM-AC-1` | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `BIL-POM-TEST-2` | unit (client) | `BIL-POM-R-2`, `BIL-POM-R-3`, `BIL-POM-AC-1`, `BIL-POM-AC-2`, `BIL-POM-AC-3` | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts` |
| `BIL-POM-TEST-3` | unit (client) | `BIL-POM-R-4`, `BIL-POM-R-5` | same spec file — template rendering + click-navigation cases |
| `BIL-POM-TEST-4` | manual (browser) | `BIL-POM-R-6`, `BIL-POM-AC-4` | `BIL-POM-T-3` DoD — phase-switch check, no automated gate (see requirements §"Name the defect classes": phase-switch staleness is a UI-state defect Jest/jsdom cannot observe end-to-end against a live phase switcher; accepted as a manual gate) |

Server coverage stays above 5/20/35/40. Client coverage stays above 50/60/60/60.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build; `migration:check:ci` — no-op here).
- [ ] Manual QA on staging: at least one bilateral center with a mix of replicated / new / neither results, phase switch verified live.
- [ ] No bilateral/platform-report consumer to notify (internal endpoint only).
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: n/a (no new logs added; existing error rate for `bilateral-center-results` unaffected).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] File the follow-up spec `bilateral/project-overview-w1w2-contributor` if/when `BIL-POM-OQ-1` is resolved with product.
- [ ] No `docs/prd.md` Open Question resolved by this spec.

---

## 8. Roll-back plan

1. Revert the PR (single PR covers all 4 tasks — see dependency graph, no independent deploy units).
2. No migration to revert (`BIL-POM-T-1` only adds a SELECT column, no schema change).
3. No feature flag introduced — nothing to disable.
4. No bilateral/platform-report payload affected — nothing to compare against prior fixtures.
5. No downstream consumers to notify.

---

## Required cross-references

- `docs/specs/bilateral/project-overview-metrics/requirements.md`, `design.md` (same folder)
- `docs/prd.md` — G3, US-D1
- `docs/ux-ui/design.md` — §8, §10
- `docs/trd/trd.md` — bilateral module section
