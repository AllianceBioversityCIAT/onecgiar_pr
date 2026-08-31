# Archive Summary — `changes/mass-reporting-flow`

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/mass-reporting-flow/` |
| Archive date | 2026-08-31 |
| Final status | **Done** — T-1..T-8 `[x]` (T-8: 9 PASS / 1 NOT-RUN accepted) + 6 verified post-completion addenda |
| Approval mode | pre-approved (owner mandate) — YOLO: 1 judgment pass fix-only, ≤1 Reviewer round, targeted jest only |
| Branch | `qa-development-2026` (spec branch; pin `master`) |

## Requirements delivered

Burn-down aids (Only-pending filter MRF-R-1, Remaining-work sort R-2, Next-pending R-3/R-3.1, session counter R-4), per-KPI Copy link + `?kpi=` composite deep link (R-5, C-8 id+AoW), Read more (R-5.1), grouped-header ratio on the shared zero-target rule (R-6/R-7, `buildRatio` single home), admin-manageable in-browser AI narrative (R-8/R-9/R-12: WebLLM, panel-owned consent as the ONLY door to `init`, two seeded global parameters + admin card), a11y (R-10), seed migration (AC-11, applied+verified on dev; revert by review per owner's no-delete condition).

## Post-completion addenda (all owner-driven, live-verified, committed)

1. `3366453bc` WebLLM sticky `interruptSignal` + non-idempotent `init` — streaming `complete()` + idempotent init.
2. `f2f5a97ea` Next pending + visible Copy link inherited by the grouped/flat table.
3. `beaf7e380` Grouped ↔ By-AOW design alignment + first-class jump between views.
4. `a90c6435b` Phantom `--pr-surface-ground` token (every skeleton transparent) + module-wide token guard test.
5. `3ef90900a` Not-yet-started≠loading gaps closed; stats card + group headers skeleton until final numbers.
6. `477e61696`/`a9cf7a696` parallel-session work landed with green tree (band stats card; pr-table sort).

## Evidence

- `execution.md` — full audit trail: per-task attempts/verdicts, model degradation note (sonnet weekly limit → opus Implementer / Fable Reviewer, author≠auditor kept), T-8 checklist, addenda verifications.
- `judgment.md` — 8 severe clusters fixed pre-execution, APPROVED.
- Test gates at archive: dashboard-lab folder 19 suites / 619 green; server 203/1849 green; lint clean; `migration:check` green.
- `test-report.md` / `validation-report.md` absent — accepted (owner mandate; execution.md + judgment.md carry the evidence).

## Accepted follow-ups

- T-8 row 10 NOT-RUN (reporting a real result on shared dev) — pinned by `dashboard-lab.mrf-burndown-session.spec.ts`.
- Prod ships `aiAssistant.enabled=false` — enabling AI narrative in prod is an env change + deploy (recorded in requirements §7).
- Zero-target rule scoped to Reporting-tab surfaces; Overview/toc-map divergence recorded (judgment C-5).
