# Kaizen Entry — changes/kp-cgspace-search-retry

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-cgspace-search-retry` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | interactive |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 (`KCSR-T-1`) PASS attempt 2 | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 1 (T-1 attempt 1) | `execution.md` — Attempt 1 FAIL |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 0 (no `test-report.md`) | accepted at archive |
| Judgment-day severe findings | 0 (Lite, no JD) | `design.md` |
| Validation FAIL / WARN | n/a (no `validation-report.md`) | accepted at archive |
| `/akili-quick` escalation | refused → specify (not logged in `quick-log.md`) | session |

## Lessons

- **KZ-changes--kp-cgspace-search-retry-1 — A cancel test that only counts leftover calls does not prove the old result cannot paint.** (Product + Methodology, Medium)
  - Root cause: `KCSR-TEST-5` made query A throw on every call, so A never emitted a late success. Call-count `=== 1` plus B painted is true of both a correct `switchMap` and a leaking `mergeMap` that never received a success to apply. The clause “A’s late success must not set B’s items” was untested.
  - Evidence: `execution.md` — KCSR-T-1 Attempt 1 Reviewer FAIL (Violated Rule: `tasks.md` clause “Cancel — BUT must not apply A to B”; `design.md` `KCSR-DD-4` / `KCSR-AC-5`). Closed by `KCSR-TEST-5b`.
  - Standardization: → P1. Upstream the same one-liner to the AKILI tasks / Implementer template.

## Noted, not a lesson

- Budget 1 review round vs 2 actual — the FAIL above, not a second root cause.
- Load more `loadingMore` and first-success = 1 call were already-passing / same-pipe rows, recorded in `execution.md` as the DoD asked.
- Reviewer ADVISORY: trailing `flush()` on TEST-2. Sub-threshold.
- Owner confirmed Browse search error copy is fixed (no API `error.message` leak) before archive. MQAP toasts remain a different surface.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` §5 Test plan |
| Edit | After “Each acceptance criterion needs at least one test reference.” add: “A cancel / switchMap (or equivalent unsubscribe) test that only asserts the old call-count stayed 1 is not proof the old result cannot paint. Arm the cancelled request to succeed with a distinguishable payload so a leaking implementation fails.” |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | codegraph |
| Target | `.codegraph/` |
| Edit | Re-index (`codegraph sync`) after merge so the retry wrap in `kp-cgspace-browse` is visible. |
| Severity | Low |
| Status | pending |
