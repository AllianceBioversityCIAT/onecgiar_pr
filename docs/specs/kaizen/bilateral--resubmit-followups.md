# Kaizen Entry — bilateral/resubmit-followups

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-followups` |
| Date | 2026-10-07 |
| Branch | `qa-development-2026-ss` (spec branch: `Default Branch: master`) |
| Archive Run | 1 |
| Approval Mode | `gated` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 (7 planned + T-8 by amendment) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-1, `init` guard on the wrong branch) | execution.md — RSF-T-1 attempt 1 |
| Live FAIL after Reviewer PASS | 1 (T-5, `Unknown column 'id'` → 500 on PRTest) | execution.md — T-7 Step 2b |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0. There were 2 user-approved spec amendments (contract doc for R-7; R-12/DD-9/T-8) | execution.md — "Spec amendment" blocks |
| PRODUCT_BUGs | 1 live (T-5), fixed in `d9073be80` | execution.md |
| Validation FAIL / WARN | n/a: no `/akili-validate`; the live T-7 run was the gate | — |
| Budget | 7 tasks / 1 round each budgeted → 8 tasks, +2 rounds (T-1, T-5) | design.md §11 |

## Lessons

- **KZ-bilateral--resubmit-followups-1 — A behaviour requirement's consumer-visible effects were not traced to the contract or to the spec's own deferred gaps.** (Product + Methodology, Medium)
  - Root cause: `RSF-R-7` changed what platforms observe (accepted contributors retired on resubmission). Requirements §7 and design §7 listed contract rows only for the GET shape correction and the new 400s. So (a) the contract still said "Accepted contributors are not removed", and (b) design §12's deferred gap "inactive role-2 entries in `obj_results_toc_result`" became routine because of R-7, in the same spec. Neither the reversion challenge nor the Reviewer cross-checked a deferred gap against the spec's other requirements.
  - Evidence: execution.md — "ADVISORY … spec gap" under RSF-T-6; "Spec amendment: RSF-T-6 contract doc"; "Spec amendment: RSF-R-12 / DD-9 / RSF-T-8"; T-7 Step 2b re-run ("SP06 as Contributor").
  - Standardization: → P2 (local), with upstream recommended (P3).
- **KZ-bilateral--resubmit-followups-2 — The live-check task did not name which branch the test environment deploys from.** (Product, Low)
  - Root cause: T-7 said "after PR 2 is deployed to PRTest" without naming the branch. PRTest deploys from `performance-refactor`, which was one commit behind `qa-development-2026-ss`, so a live re-check showed the old behaviour and cost a round trip.
  - Evidence: execution.md — "Step 5: RSF-T-8 live GET" (Lesson line).
  - Standardization: → P4.

## Noted, not a lesson

- **T-5 live FAIL** (mocked `query()` hid a wrong column name). This is a recurrence of `KZ-W12-1` (mocked-`query` repo specs cannot see SQL bugs), not a new lesson → P1.
- **T-1 attempt 1:** the guard went on the request branch, while the design said "update row". A single misread, caught by the Reviewer.
- **The `R-8` reader #3 (admin export) inventory row came from a scout claim** that could not be re-verified in-tree. It is recorded as inconclusive. If a later spec repeats an unverifiable scout row, promote this to a lesson.
- **Subagent hand-back noise:** one Implementer re-sent the same report about 8 times while its own scout ran. The Leader stopped it with TaskStop. This is harness friction.
- **Two sessions (RSF, RRC) shared one checkout.** It worked because files were path-scoped per commit. The Concurrency protocol already covers this.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-W12-1` (from `docs/specs/kaizen/bugfix--w12-overview-phase-origin-alignment.md`) |
| Edit | Recurrence +1 (`bilateral/resubmit-followups`, T-5): a wrong **identifier** (bare `id` instead of `result_country_subnational_id`) passed mocked-`query()` specs and a Reviewer, then returned a live 500. Widen the standard: raw SQL in a repository must have its column/table names checked against the entity metadata or migration DDL. A spec can pin them via `getMetadataArgsStorage()` (pattern in `result-country-subnational.repository.spec.ts`), and the Reviewer checks identifiers against the DDL. Severity raised to **High** (caused a live PRODUCT_BUG). |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (NFR / contract section) |
| Edit | Add: "For every requirement that changes what an external consumer observes, including behaviour and not only shape, name the contract change-log row it needs. For every gap deferred to §Open Gaps, state whether another requirement in this spec makes it more frequent; if it does, it is in scope." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology repository: `/akili-specify` reversion challenge (upstream; no local file) |
| Edit | Recommend upstreaming: the reversion challenge also cross-checks each deferred gap against the spec's own requirements ("does any requirement here amplify this gap?"). |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/infrastructure.md` (environments table) |
| Edit | Add: "PRTest (`prtest-back.ciat.cgiar.org`) deploys from the `performance-refactor` branch. Fast-forward it to the work branch before a live check; the Jenkins deploy takes about 30 min." |
| Severity | Low |
| Status | pending |
