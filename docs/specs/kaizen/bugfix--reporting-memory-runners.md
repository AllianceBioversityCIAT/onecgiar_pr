# Kaizen Entry — bugfix/reporting-memory-runners

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/reporting-memory-runners` |
| Date | 2026-11-26 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 started, parked `[~]`, never applied | tasks.md / execution.md |
| Reviewer FAIL rework attempts | 0 (no Reviewer spawned) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (no validation-report.md; absence accepted) | — |
| Tasks closed under `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |
| Escaped defects (§3) | 0 | — |
| Wasted work (MUDA) | 1 Implementer run (58 calls, ≈121k tokens) on a fix the owning team was already shipping in CI | execution.md — BRM-T-1 |

## Lessons

- **KZ-bugfix--reporting-memory-runners-1 — A CI-symptom bug was specified and executed without confirming whether the CI owner was already fixing it.** (Product, Medium)
  - Root cause: requirements recorded "only Cris edits `.github/workflows/*`" as a constraint but never asked him whether a CI-side fix was in flight; he was, and the app change became unwanted.
  - Evidence: requirements.md §1 Constraints; execution.md — BRM-T-1 "Why parked"; CI commits `fc5ae5dbd`, `8398d4edc` (2026-11-18/19).
  - Standardization: → P1

## Noted, not a lesson

- `qa-catalog.snapshot.spec.ts` failed locally on 2026-11-18 on the unchanged config — unverified on CI.
- `workerIdleMemoryLimit` had no effect on whole-app suites (acts only between suites) — useful if plan B is ever revived.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `AGENTS.md` §6 Cross-cutting constraints |
| Edit | "**CI symptoms** (runner OOM, timeouts, flaky jobs): CI workflows belong to the platform team. Before `/akili-execute` on such a spec, confirm with them that no CI-side fix is already in flight." |
| Severity | Medium |
| Status | pending |
