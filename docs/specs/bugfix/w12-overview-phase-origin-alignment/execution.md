# `bugfix/w12-overview-phase-origin-alignment` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/bugfix/w12-overview-phase-origin-alignment/` |
| **Approval mode** | gated — owner "arranca" (2026-08-28); Leader proceeds through PASS gates, stops at W12-T-3's owner verification |
| **Branch** | `qa-development-2026` @ base `6679944e9` (on top of agy's W3 fix `e9b9171cb`) |
| **Triad** | Leader: session model (T1) · Implementers: `akili-implementer` (T2) · Reviewers: `akili-reviewer` (T3, read-only) |
| **Budget (design §1)** | 3 tasks · ~220 LOC · 1 review round per task |
| **Pre-flight (design §13)** | **Owner-confirmed 2026-08-28: exactly ONE active reporting phase** → the server/client "current phase" resolution is deterministic; risk closed. |
| **Parallelism** | W12-T-1 ∥ W12-T-2 (disjoint files: `results.service.ts`+spec vs the summary chain + client) — width 2 |

## 2. Task Execution History

## W12-T-1 — Meter: W1/W2-origin filter + regression (server)

- **Status:** PASS (attempt 1) · 2026-08-28 · Implementer: `impl-w12-t1` · Reviewer: `rev-w12-t1`
- **Files:** `results.service.ts` (+5/−1: `filters` type widened to admit `string[]`, `fundingSource: ['Result']`), `result.spec.ts` (+9/−1; the repo's real ResultsService spec — `results.service.spec.ts` named in tasks.md does not exist; nominal deviation, fix spec naming at archive).
- **Bug Mode evidence:** RED pre-fix verbatim — `toHaveBeenCalledWith` received `{portfolioId: 3, versionId: 1}` missing `fundingSource` (1 failed / 93); GREEN post-fix 93/93. Exact-deep-equality assertion carries BOTH `fundingSource` and `versionId` → dropping either goes red.
- **Verification:** full server suite **197 suites / 1725 tests** green; eslint clean; `migration:check` 0 pending. Callers (`results.controller.ts:309`, `results-framework-reporting.controller.ts:65`) unaffected.
- **Reviewer:** **STATUS: PASS** — sole behavioural change; repo path verified (`addInGeneric` → `r.source IN ('Result')`); type widening provably no less safe (target param already declared string fields).
- **Forward pointer → W12-T-3 (owner check):** this endpoint ALSO feeds the RFR home cards (`mySciencePrograms`/`otherSciencePrograms`) and the SGP-02 fallback — an SP whose only results are bilateral now shows `totalResults: null` / empty `versions[]` on the home card too (in-scope under W12-R-1; metadata/progress/my-other bucketing verified unaffected). Spot-check a bilateral-only SP's home card at W12-AC-4.
