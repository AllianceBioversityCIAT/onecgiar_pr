# Kaizen Entry — bugfix/result-detail-not-found-navigation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/result-detail-not-found-navigation` |
| Date | 2026-10-21 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`; every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 of 3 (client only) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-1 attempt 1 FAIL, attempt 2 PASS; T-2, T-3 PASS on attempt 1) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted) | — |
| Budget | 3 tasks as planned; 4 review rounds vs 3 budgeted (the T-1 rework) | execution.md Summary |
| Runtime issues | none | execution.md |

## Lessons

- **KZ-bugfix--result-detail-not-found-navigation-1 — A router-level guard test needs a real root outlet, or its hidden-outlet stub is inert.** (Product + Methodology, Medium)
  - Root cause: `tasks.md` RDN-T-1 specified "a parent stub renders its `<router-outlet>` only under a flag that is false". The Implementer mounted no root `<router-outlet>` (no fixture, no `RouterTestingHarness`), so no routed component was ever built and the guard received `null` whatever the flag was. The spec named the Disqualifier (inert stub) but not the harness that avoids it. The red run failed on a `TypeError`, which hid that the test was not reproducing the hidden outlet.
  - Evidence: execution.md — RDN-T-1 attempt 1 (Reviewer FAIL) and attempt 2 (rewritten on `RouterTestingHarness.create()`, parent spy = 1, section spy = 0, control case `sectionReady = true`); Summary line "a router-level guard test needs a root outlet".
  - Standardization: → P1

## Noted, not a lesson

- Plain `tsc -p tsconfig.app.json --noEmit` does not type-check templates (T-2 Falsifier 2 stayed green; only `ngc -p tsconfig.app.json --noEmit` went red). Same root cause family as `KZ-bugfix--lead-center-full-catalog-1` (the verification command is weaker than the Angular compiler). Recorded as a recurrence in P2 instead of a new lesson.
- Constitution check: execution.md has no `## Constitution Impact` note. The folder `result-detail/CLAUDE.md` was updated by the Leader in the task commit (a folder doc, outside the guides this run may touch). Root `AGENTS.md` / `CLAUDE.md` make no claim this spec changed (no route, module, guard contract or command moved), so no `guide-sync` or `factual-sweep` item.
- The magic number `2` for the IPSR module id (also `phases.service.ts:29-30`) was flagged ADVISORY; it is a code follow-up, not a process lesson.
- P-6 was settled by a product decision instead of the read-only environment check the task prescribed; the design's "not a pivot" branch absorbed it.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Tests / Disqualifier guidance) |
| Edit | For a router-level test of a guard or resolver, name the harness in the task: "mount the tree with `RouterTestingHarness.create()` (real root outlet). Assert the spy counts before leaving, e.g. parent constructor = 1 and the hidden section = 0. A router-level spec without a root `<router-outlet>` never builds a routed component, so the guard sees `null` whatever the flag is, and the test is inert." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bugfix--lead-center-full-catalog-1` (verification command weaker than the Angular compiler; its P1 targets `docs/specs/general-setup/task.md`) |
| Edit | Add `bugfix/result-detail-not-found-navigation` as a source (recurrence, second spec): `tsc -p tsconfig.app.json` does not type-check templates; the T-2 template-argument falsifier went red only under `npx ngc -p tsconfig.app.json --noEmit`. Extend the rule: "for a task that changes a template binding or a typed contract used from a template, Verification MUST run `ngc -p tsconfig.app.json --noEmit` (or `ng build`), not only `tsc` or Jest." |
| Severity | Medium |
| Status | pending |
