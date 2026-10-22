# Kaizen Entry — bilateral/replicated-innovations-2026-pa/project-and-pa-assignment

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` |
| Date | 2026-10-21 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`; every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 of 5 (4 code incl. T-5 added in execute, 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-1 attempt 1, T-2 attempt 1) | execution.md |
| Leader-found rework after a PASS | 1 (T-5 reopened by the regression run) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| Added tasks | 1 (T-5, owner request after T-4 HITL; spec amended first) | execution.md Scope change |
| Spec amendments in execute | 2 (DD-1 one template to two; T-5 `PAA-R-7`/`AC-9`/`DD-6`) | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted) | — |
| Budget | 4 tasks planned, 5 done; review rounds T-1 2 (cap), T-2 2 vs 1, T-5 2 vs 1; LOC about +145 prod / +260 test vs ~90 / ~180 | execution.md |
| Runtime issues | 1 `build:dev` stopped at 0.5 GB free RAM (not a FAIL) | execution.md PAA-T-4 |

## Lessons

- **KZ-bilateral--replicated-innovations-2026-pa--project-and-pa-assignment-1 — A task that adds a member read by a component breaks the consumer specs whose mocks render it, and own-spec verification does not see it.** (Product + Methodology, Low)
  - Root cause: T-5's Definition of done said "existing selector cases green". The selector now reads `creationService.resultLeadCenterCode()`. `section-zero-dashboard.component.spec.ts` renders the inline selector with a hand-built `creationService` mock that lacks the signal. The task's Consumers line listed `getProjects` callers and `projects()` readers, not the specs that mock the service. The Implementer ran only its own pattern, and the Reviewer PASSed on the diff. The Leader's combined regression found 42 failures.
  - Evidence: execution.md — "PAA-T-5 reopened" (`Tests: 42 failed, 331 passed`, `resultLeadCenterCode is not a function`) and "attempt 2".
  - Standardization: → P1

## Noted, not a lesson

- **Second occurrence of the stubbed-template trap, already recorded.** T-2 attempt 1 asserted copy through a source read and a property check because `section-contributors.component.spec.ts` stubs the template. The sibling `section-contributors.readonly.spec.ts` renders it. `bugfix--bilateral-external-partners-not-saving.md` (KZ-1) records the same trap in the same folder, with pending items P1 and P2 not yet applied. Recorded as a recurrence, not a new lesson (see P2).
- **Manifest drift.** `family.md` said child #1 was `pending` after it was executed and shipped. `tasks.md` §7 carried "Update `family.md` child 1 status when done" as an unchecked item, and no gate checks it. The archive step is where it is caught and fixed. No process change proposed.
- T-1 attempt 1 FAIL was a spec-versus-code gap (Program field hidden until a project is picked, against `PAA-AC-1`). The Leader chose to fix the code and not the AC, which held.
- The per-file lint route that worked was `npx ng lint --quiet --lint-file-patterns <files>` (T-3). Related to the open scoped-lint item in `bilateral--replicated-innovations-2026-pa--center-overview-w3-scope.md` (see P3).
- T-5 was added because HITL on real data exposed a premise (page Center equals lead Center) that the proposal had accepted as `PAA-P-2`. Real-data HITL doing its job; no lesson.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` (append to its verification rules) |
| Edit | When a change adds or renames a member that a component reads from a service or parent, grep `*.spec.ts` for mocks of that dependency and run `--findRelatedTests` on the changed files, not only the task's own pattern. Hand-built mocks fail with `is not a function` in specs you did not touch. |
| Severity | Low |
| Status | pending |
| Upstream | Recommend the same line for the AKILI methodology Implementer persona template |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen/bugfix--bilateral-external-partners-not-saving.md` (pending items P1 and P2, KZ-bugfix--bilateral-external-partners-not-saving-1) |
| Edit | Record a second occurrence: `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` T-2 attempt 1 (`section-contributors.component.spec.ts` stubs the template; Reviewer FAIL). Apply the existing P1 line to `onecgiar-pr-client/CLAUDE.md` § 9 rather than adding a new one. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen/bilateral--replicated-innovations-2026-pa--center-overview-w3-scope.md` (P1, factual-sweep on the client Lint cell of `AGENTS.md`) |
| Edit | When applying P1, prefer the route this spec used: `npx ng lint --quiet --lint-file-patterns <files>` (works without `ESLINT_USE_FLAT_CONFIG=false`). Verify both commands before choosing the one written to `AGENTS.md`. |
| Severity | Low |
| Status | pending |

### Constitution sync

No `## Constitution Impact` block exists in `execution.md`. The spec changed only client components and two folder `CLAUDE.md` files, both edited in-spec. No root guide or `docs/trd/trd.md` claim was invalidated, so there are no `guide-sync`, `factual-sweep` (own) or `trd-adr` items.
