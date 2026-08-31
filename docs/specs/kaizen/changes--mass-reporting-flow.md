# Kaizen — `changes/mass-reporting-flow`

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Branch context | spec branch (`qa-development-2026` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-08-31-changes--mass-reporting-flow/` |

## Metrics

| Signal | Value |
|---|---|
| Judgment-day (spec stage) | 1 pass, fix-only: 7 both-judge + 1 verified single-judge severe clusters, ALL fixed pre-execution (engine contract, state machine, init reachability, ratioOf collision, zero-target contradiction, migration gate, category naming, composite kpi id) |
| Reviewer FAIL rework | 4 of 8 tasks took exactly 1 rework round (T-2, T-3, T-6, T-7) — the owner's max-1 ceiling never breached |
| HALT / FATAL_FAIL / Pivot | 0 |
| Runtime failures | 3 workers lost to provider session/weekly limits (T-3 att.2, T-4, T-5); resumed via fresh-worker partial-diff audits; T-4/T-5 finished on a degraded model pair (opus Implementer / Fable Reviewer, author≠auditor kept, recorded) |
| T-8 manual pass | 9 PASS / 1 NOT-RUN (accepted); found 4 unit-green/browser-red defects fixed in the field |
| Post-completion field defects | 3 more after "done": WebLLM sticky interrupt, phantom CSS token, loading-gap recurrence — all live-verified fixes |
| Concurrency incidents | 2 silent overwrites of committed work by a parallel session on the SAME worktree (flat-cell controls; `[statsLoading]` binding) |

## Lessons

- **KZ-MRF-1 — "Not yet started" is not "not loading".** (Product, High)
  - Root cause: loading flags derived from "request in flight" (`loadingKeys.has(key)`, `loadingCodes().has(code)`) leave a pre-request gap that renders loaded-and-empty/partial. Hit 3× in ONE spec: the `?kpi=` consume race (T-8), `loadingAows`, and the grouped-view stats/headers. Where the fetch ALWAYS caches (error included), `!cache` is the safe loading definition.
  - Evidence: `execution.md` → "T-8 field fixes" + addendum 2026-08-31 (grouped view).
  - Standardization → P1.
- **KZ-MRF-2 — An undefined CSS custom property is a defect class no gate can see.** (Product, High)
  - Root cause: `var(--pr-surface-ground)` shipped referenced ~50 times with no definition — renders transparent with no build, runtime, lint or jsdom signal; every loading skeleton in the module was invisible. The gate had to be built: a static used-vs-defined sweep (`design-tokens.spec.ts`), which shipped in-spec for the reporting module.
  - Evidence: `execution.md` → addendum 2026-08-31 (phantom token); commit `a90c6435b`.
  - Standardization → P2.
- **KZ-MRF-3 — Two agent sessions on one worktree silently rebuild files from stale copies.** (Methodology, High)
  - Root cause: the constitution's concurrency convention (one AKILI session per checkout; extra sessions on their own `git worktree`) was not honored — a parallel session twice pasted a region from a pre-commit copy of a file, deleting committed work with no conflict marker (git only protects across branches, not across editors). Recovered both times only because this session re-read its own diffs before verifying.
  - Evidence: `execution.md` → addenda 2026-08-30 (concurrency note) and 2026-08-31 (`[statsLoading]` dropped mid-flight).
  - Standardization → P3 (+ upstream to the AKILI methodology repo).

## Noted, not a lesson

- WebLLM's sticky `interruptSignal` + non-idempotent `CreateWebWorkerMLCEngine` — a real library trap, but engine-specific; fixed (streaming `complete()`, idempotent `init`) and documented in the engine service + `execution.md`. Single cause, single home.
- Provider session/weekly limits killing workers mid-task — 2nd spec in a row (REH noted it once, MRF lost 3). The resume pattern (fresh worker audits the partial diff) worked every time → digest-update pending item below (severity raise, not a new lesson).
- The unit-green/browser-red family (4 in T-8 + the panel error) confirms the spec's own "manual rows for jsdom-blind classes" design — the gate design was right; the volume says budget MORE for the live pass, which the T-8 checklist already does.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-MRF-1) | `onecgiar-pr-client/src/CLAUDE.md` §21.1 Service shape | Add: "Loading flags: derive from **data absence** (`!cache.has(key)`), never from 'request in flight' — the gap between selection and the request's start otherwise renders as loaded-and-empty. Safe when the loader always caches, error included." | High | pending |
| 2 | standardization (KZ-MRF-2) | `onecgiar-pr-client/CLAUDE.md` §5 Theming | Add: "An undefined `var(--pr-*)` renders transparent with no error anywhere. Declare in `colors.scss` FIRST; `dashboard-lab/design-tokens.spec.ts` sweeps the reporting module — copy that guard when a new module grows its own token surface." | High | pending |
| 3 | standardization (KZ-MRF-3) | root `CLAUDE.md` Concurrency convention | Append: "Two sessions editing the same FILES in one worktree WILL silently clobber committed work (no conflict marker protects same-tree edits). Before committing shared files, `git diff HEAD` and check for regressions of recently committed regions." | High | pending |
| 4 | digest-update | `docs/specs/kaizen-log.md` Active Lessons | Provider-limit worker deaths: recurrence (REH ×1 → MRF ×3); raise severity of the resume-pattern row / add if absent | Medium | pending |
| 5 | guide-sync | — | None — module guides (`dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md`) were updated inside task/addendum commits as spec deliverables | — | n/a |
| 6 | factual-sweep | root guides | No falsified root-guide claims found this cycle | — | n/a |
| 7 | trd-adr | — | No TRD ADR overturned | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
